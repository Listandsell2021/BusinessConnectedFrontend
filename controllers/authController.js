// Authentication Controller - MVC Architecture
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Partner = require('../models/Partner');
const OTP = require('../models/OTP');
const { logError, logActivity, ActivityLogger } = require('../middleware/logging');
const logger = require('../utils/logger');
const { generatePartnerDefaultPassword } = require('../utils/passwordGenerator');
const emailService = require('../services/emailService');
const NotificationService = require('../services/notificationService');

// Generate JWT tokens
const generateTokens = (user, role, selectedService = null) => {
  const payload = { 
    id: user._id, 
    role,
    email: user.contactPerson?.email || user.email 
  };
  
  // Add selectedService to payload for partners
  if (role === 'partner' && selectedService) {
    payload.selectedService = selectedService;
  }
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
  
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
  
  return { accessToken, refreshToken };
};

// @desc    Login user (Partner/Superadmin)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    let { email, password, selectedService } = req.body;

    // TEMPORARY FIX: Handle the missing dot issue for this specific email
    if (email === 'muskansetia24@gmail.com') {
      email = 'muskan.setia24@gmail.com';
      console.log('🔧 FIXED EMAIL: Converted muskansetia24@gmail.com to muskan.setia24@gmail.com');
    }

    // Check if user exists (try Partner first, then User)
    let user = null;
    let role = 'partner';

    if (selectedService) {
      // If service is selected, find the specific partner for that service
      user = await Partner.findOne({
        'contactPerson.email': email,
        serviceType: selectedService
      });
    } else {
      // If no service selected, find any partner with this email
      user = await Partner.findOne({ 'contactPerson.email': email });
    }

    if (!user) {
      user = await User.findOne({ email });
      role = user?.role || 'user';
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (role === 'partner') {
      // For partners with new single-service structure
      if (user.status !== 'active') {
        // Capitalize service name for display
        const serviceName = user.serviceType.charAt(0).toUpperCase() + user.serviceType.slice(1);
        
        return res.status(401).json({ 
          message: `Your ${serviceName} service is not active. Please contact admin for approval.`,
          messageDE: `Ihr ${serviceName}-Service ist nicht aktiv. Bitte wenden Sie sich an den Admin für die Genehmigung.`
        });
      }
    } else {
      // For non-partners (superadmin/users), use overall status
      if (!user.isActive && user.status !== 'active') {
        return res.status(401).json({ message: 'Account is not active' });
      }
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Log failed login attempt
      const actorType = role === 'partner' ? 'partner' : (role === 'superadmin' ? 'superadmin' : 'user');
      await logActivity(actorType, user, 'login_failed', { email }, req, 'failed', new Error('Invalid password'));
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // For partner login, validate service matches
    if (role === 'partner' && selectedService && user.serviceType !== selectedService) {
      await logActivity('partner', user, 'login_failed', { 
        email, 
        selectedService, 
        actualService: user.serviceType
      }, req, 'failed', new Error('Service mismatch'));
      
      return res.status(400).json({ 
        message: 'Invalid service selection',
        availableService: user.serviceType
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user, role, selectedService);

    // Log successful login using activity logger
    const actorType = role === 'partner' ? 'partner' : (role === 'superadmin' ? 'superadmin' : 'user');
    await logActivity(actorType, user, 'login_success', { email }, req);

    logger.info(`User logged in: ${email} (${role})`);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.companyName || user.fullName,
        email: user.contactPerson?.email || user.email,
        role,
        serviceType: user.serviceType || null, // Include partner service
        services: role === 'partner' ? [user.serviceType] : [] // Backward compatibility
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    await logError('login_failed', error, req, { serviceType: 'system' });
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// @desc    Register new partner
// @route   POST /api/auth/register-partner
// @access  Public
const registerPartner = async (req, res) => {
  try {
    const partnerData = req.body;

    // Check for existing services for this email and validate
    const duplicateServices = [];
    const validServices = [];
    
    for (const serviceType of partnerData.services) {
      const hasExisting = await Partner.hasExistingService(partnerData.contactPerson.email, serviceType);
      if (hasExisting) {
        duplicateServices.push(serviceType);
      } else {
        validServices.push(serviceType);
      }
    }

    if (duplicateServices.length > 0) {
      return res.status(400).json({ 
        message: `Services already registered: ${duplicateServices.join(', ')}. Cannot register duplicate services unless previously rejected.`,
        duplicateServices,
        availableServices: validServices
      });
    }

    if (validServices.length === 0) {
      return res.status(400).json({ 
        message: 'No new services to register',
        duplicateServices
      });
    }

    // Generate default password for partner
    const defaultPassword = generatePartnerDefaultPassword(
      partnerData.companyName,
      partnerData.contactPerson.phone
    );

    // Create separate partner documents for each service
    const createdPartners = [];
    
    for (const serviceType of validServices) {
      const partner = new Partner({
        ...partnerData,
        serviceType: serviceType,
        status: 'pending',
        password: defaultPassword
      });
      
      await partner.save();
      createdPartners.push(partner);
    }
    
    // Create detailed registration log for all created partners
    const registrationDetails = {
      partnerIds: createdPartners.map(p => p._id),
      partnerIdsGenerated: createdPartners.map(p => p.partnerId),
      companyName: createdPartners[0].companyName,
      contactPerson: {
        firstName: createdPartners[0].contactPerson.firstName,
        lastName: createdPartners[0].contactPerson.lastName,
        email: createdPartners[0].contactPerson.email,
        phone: createdPartners[0].contactPerson.phone
      },
      address: {
        street: createdPartners[0].address.street,
        city: createdPartners[0].address.city,
        postalCode: createdPartners[0].address.postalCode,
        country: createdPartners[0].address.country
      },
      services: createdPartners.map(p => p.serviceType),
      partnerType: createdPartners[0].partnerType,
      registrationTimestamp: createdPartners[0].registeredAt,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    // Log partner registration with all important details
    logger.info('NEW PARTNER REGISTRATION', {
      event: 'partner_registration',
      ...registrationDetails
    });
    
    // Log the generated password (in production, this should be sent via secure channel)
    logger.info(`Partners registered - Generated password for ${partnerData.contactPerson.email}`, {
      partnerIds: createdPartners.map(p => p._id),
      email: partnerData.contactPerson.email,
      services: createdPartners.map(p => p.serviceType),
      passwordGenerated: true,
      // DON'T log actual password in production
      ...(process.env.NODE_ENV === 'development' && { generatedPassword: defaultPassword })
    });

    // Note: Geocoding functionality removed - can be added later if needed

    logger.info(`New partners registered: ${partnerData.contactPerson.email}`, {
      partnerIds: createdPartners.map(p => p._id),
      companyName: createdPartners[0].companyName,
      servicesCount: createdPartners.length
    });

    // Return success response immediately after successful DB save
    res.status(201).json({
      success: true,
      message: `Partner registration successful for ${createdPartners.length} service(s). Awaiting admin approval.`,
      partners: createdPartners.map(partner => ({
        id: partner._id,
        partnerId: partner.partnerId,
        serviceType: partner.serviceType,
        status: partner.status
      })),
      summary: {
        companyName: createdPartners[0].companyName,
        email: createdPartners[0].contactPerson.email,
        services: createdPartners.map(p => p.serviceType),
        registrationComplete: true,
        emailSent: 'processing', // Indicate email is being sent in background
        geocodingStatus: 'not_required',
        nextSteps: 'Admin approval required before login access is granted'
      }
    });

    // Send registration confirmation email in background (don't block response)
    setImmediate(async () => {
      try {
        // Use the first partner for email template, but include all services
        const partnerForEmail = {
          ...createdPartners[0].toObject(),
          services: createdPartners.map(p => p.serviceType),
          language: req.body.language || 'en' // Add language preference from request
        };

        const emailResult = await emailService.sendPartnerRegistrationConfirmation(partnerForEmail);

        if (emailResult.success) {
          logger.info(`Registration confirmation email sent successfully to ${createdPartners[0].contactPerson.email}`, {
            partnerIds: createdPartners.map(p => p._id),
            services: createdPartners.map(p => p.serviceType),
            emailSent: true,
            messageId: emailResult.messageId
          });
        } else {
          logger.error(`Failed to send registration confirmation email to ${createdPartners[0].contactPerson.email}`, {
            partnerIds: createdPartners.map(p => p._id),
            emailError: emailResult.error
          });
        }
      } catch (emailError) {
        logger.error('Registration email sending failed:', {
          partnerIds: createdPartners.map(p => p._id),
          email: createdPartners[0].contactPerson.email,
          error: emailError.message
        });
      }
    });
  } catch (error) {
    await logError('partner_registration_failed', error, req, { serviceType: 'system' });
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Get user based on role
    let user;
    if (decoded.role === 'partner') {
      user = await Partner.findById(decoded.id);
    } else {
      user = await User.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens(user, decoded.role);

    res.json({
      success: true,
      tokens
    });
  } catch (error) {
    await logError('token_refresh_failed', error, req, { serviceType: 'system' });
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a real app, you'd blacklist the token
    // For now, just respond success
    logger.info(`User logged out: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    let user;
    if (req.user.role === 'partner') {
      user = await Partner.findById(req.user.id);
    } else {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.companyName || user.fullName,
        email: user.contactPerson?.email || user.email,
        role: req.user.role,
        ...(req.user.role === 'partner' && {
          companyName: user.companyName,
          partnerType: user.partnerType,
          status: user.status,
          services: user.services
        })
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get profile', error: error.message });
  }
};

// @desc    Request password reset with OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user or partner by email
    let user = await User.findOne({ email });
    let userType = 'user';
    
    if (!user) {
      user = await Partner.findOne({ 'contactPerson.email': email });
      userType = 'partner';
    }

    if (!user) {
      // Don't reveal whether user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset OTP has been sent.'
      });
    }

    // Delete any existing OTP for this user
    await OTP.deleteMany({ 
      email: email.toLowerCase(), 
      purpose: 'password_reset' 
    });

    // Generate 6-digit OTP
    const otpCode = OTP.generateOTP();
    
    // Create new OTP record (expires in 15 minutes)
    const otpRecord = new OTP({
      email: email.toLowerCase(),
      otp: otpCode,
      userType: userType,
      userId: user._id,
      purpose: 'password_reset',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    });

    await otpRecord.save();

    // Send OTP via email
    try {
      const emailResult = await emailService.sendPasswordResetOTP(
        user,
        otpCode,
        userType
      );

      if (emailResult.success) {
        logger.info(`Password reset OTP sent successfully to ${email}`, {
          userId: user._id,
          userType,
          otpId: otpRecord._id
        });
      } else {
        logger.error(`Failed to send password reset OTP to ${email}`, {
          userId: user._id,
          userType,
          error: emailResult.error
        });
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP email. Please try again.'
        });
      }
    } catch (emailError) {
      logger.error('Password reset OTP email sending failed:', {
        userId: user._id,
        userType,
        email,
        error: emailError.message
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    // Log password reset request
    await logActivity(
      userType, 
      user, 
      'password_reset_request', 
      { email }, 
      req
    );

    res.json({
      success: true,
      message: 'Password reset OTP has been sent to your email address.',
      otpId: otpRecord._id, // Frontend needs this to verify OTP
      expiresIn: 900 // 15 minutes in seconds
    });

  } catch (error) {
    await logError('forgot_password_failed', error, req, { serviceType: 'auth' });
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { otpId, otp } = req.body;

    if (!otpId || !otp) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP ID and OTP code are required' 
      });
    }

    // Find the OTP record
    const otpRecord = await OTP.findById(otpId);
    
    if (!otpRecord) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid OTP request' 
      });
    }

    // Verify OTP
    const verification = otpRecord.verifyOTP(otp);
    
    if (!verification.success) {
      await otpRecord.save(); // Save updated attempts count
      return res.status(400).json({
        success: false,
        message: verification.message,
        attemptsLeft: Math.max(0, 3 - otpRecord.attempts)
      });
    }

    // OTP verified successfully
    await otpRecord.save();

    logger.info(`OTP verified successfully for ${otpRecord.email}`, {
      otpId: otpRecord._id,
      userType: otpRecord.userType,
      userId: otpRecord.userId
    });

    res.json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      resetToken: otpRecord._id // Use OTP record ID as reset token for next step
    });

  } catch (error) {
    await logError('otp_verification_failed', error, req, { serviceType: 'auth' });
    res.status(500).json({ 
      success: false,
      message: 'Failed to verify OTP' 
    });
  }
};

// @desc    Reset password with verified OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Reset token and new password are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Find the verified OTP record
    const otpRecord = await OTP.findById(resetToken);
    
    if (!otpRecord || !otpRecord.verified || otpRecord.purpose !== 'password_reset') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token' 
      });
    }

    // Check if OTP is still valid (15 minutes from creation)
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ 
        success: false,
        message: 'Reset token has expired' 
      });
    }

    // Find the user
    let user;
    if (otpRecord.userType === 'partner') {
      user = await Partner.findById(otpRecord.userId);
    } else {
      user = await User.findById(otpRecord.userId);
    }

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const oldPasswordHash = user.password;

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete the used OTP record
    await OTP.findByIdAndDelete(resetToken);

    const userEmail = user.email || user.contactPerson?.email;
    const userDisplayName = user.companyName || user.fullName || user.contactPerson?.firstName;

    logger.info(`Password reset successful for user: ${userEmail}`, {
      userId: user._id,
      userType: otpRecord.userType,
      resetTokenUsed: resetToken
    });

    // Log password reset activity
    await logActivity(
      otpRecord.userType, 
      user, 
      'password_reset', 
      { 
        email: userEmail,
        resetMethod: 'otp'
      }, 
      req
    );

    // Send notification to partner portal (for partners only)
    if (otpRecord.userType === 'partner') {
      try {
        await NotificationService.createPasswordChangedNotification(
          user._id,
          newPassword // This will be the new password for the notification
        );
        logger.info(`Password change notification created for partner ${user._id}`);
      } catch (notificationError) {
        logger.error(`Failed to create password change notification for partner ${user._id}:`, notificationError);
        // Don't fail the password reset if notification creation fails
      }
    }

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
      userType: otpRecord.userType,
      notificationSent: otpRecord.userType === 'partner'
    });

  } catch (error) {
    await logError('password_reset_failed', error, req, { serviceType: 'auth' });
    res.status(500).json({ 
      success: false,
      message: 'Failed to reset password' 
    });
  }
};

// Partner Password Reset in Settings Portal
const partnerPasswordReset = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const partnerId = req.user.id;
    const userType = req.user.type;

    // Verify this is a partner request
    if (userType !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Partner authentication required.'
      });
    }

    // Find the partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, partner.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    partner.password = hashedNewPassword;
    await partner.save();

    const partnerEmail = partner.contactPerson.email;
    const partnerName = partner.contactPerson.firstName;
    const companyName = partner.companyName;

    logger.info(`Partner password reset successful: ${partnerEmail}`, {
      partnerId: partner._id,
      companyName: companyName,
      resetMethod: 'settings_portal'
    });

    // Log password change activity
    await logActivity(
      'partner',
      partner,
      'password_reset',
      {
        email: partnerEmail,
        resetMethod: 'settings_portal',
        companyName: companyName
      },
      req
    );

    // Send password change confirmation email
    try {
      await emailService.sendPasswordChangeConfirmation(
        partner,
        newPassword, // Send the new password in email
        'partner'
      );
      logger.info(`Password change confirmation email sent to ${partnerEmail}`);
    } catch (emailError) {
      logger.error(`Failed to send password change confirmation email to ${partnerEmail}:`, emailError);
      // Don't fail the password change if email fails
    }

    // Create notification for partner portal
    try {
      await NotificationService.createPasswordChangedNotification(
        partner._id,
        newPassword
      );
      logger.info(`Password change notification created for partner ${partner._id}`);
    } catch (notificationError) {
      logger.error(`Failed to create password change notification for partner ${partner._id}:`, notificationError);
      // Don't fail the password change if notification creation fails
    }

    res.json({
      success: true,
      message: 'Password has been changed successfully. A confirmation email has been sent.',
      emailSent: true,
      notificationCreated: true
    });

  } catch (error) {
    await logError('partner_password_reset_failed', error, req, { serviceType: 'auth' });
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Geocoding functionality removed - can be re-added when geocodingService is implemented

module.exports = {
  login,
  registerPartner,
  refreshToken,
  logout,
  getProfile,
  forgotPassword,
  verifyOTP,
  resetPassword,
  partnerPasswordReset
};