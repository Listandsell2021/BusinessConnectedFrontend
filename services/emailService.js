// Email Service - Notification System
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Ensure dotenv is loaded
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
    this.fromEmail = process.env.FROM_EMAIL || 'no-reply@leadform.com';
    this.companyName = process.env.COMPANY_NAME || 'ProvenHub';
    this.companyTeam = process.env.COMPANY_TEAM || 'ProvenHub Team';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'support@leadform.com';
  }

  createTransporter() {
    // Check if required environment variables are set
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  Email configuration incomplete. Missing SMTP_HOST, SMTP_USER, or SMTP_PASS');
      console.warn('Email functionality will not work until these are configured in .env file');
      return null;
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Additional options for better deliverability
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates if needed
      }
    });
  }

  // Send email with error handling
  async sendEmail(mailOptions) {
    try {
      // Check if transporter is properly configured
      if (!this.transporter) {
        console.error('❌ Email transporter not initialized - missing configuration');
        return {
          success: false,
          error: 'Email configuration missing. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env file.'
        };
      }

      if (!process.env.FROM_NAME || !process.env.FROM_EMAIL) {
        console.error('❌ FROM configuration missing:', {
          FROM_NAME: !!process.env.FROM_NAME,
          FROM_EMAIL: !!process.env.FROM_EMAIL
        });
        return {
          success: false,
          error: 'FROM_NAME and FROM_EMAIL must be configured in .env file.'
        };
      }
      
      const result = await this.transporter.sendMail({
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        ...mailOptions
      });
      
      logger.info(`Email sent successfully: ${mailOptions.to} - ${mailOptions.subject}`);
      
      // For Ethereal Email (demo), provide preview URL
      let previewUrl = null;
      if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
        previewUrl = nodemailer.getTestMessageUrl(result);
        console.log('📧 Email Preview URL:', previewUrl);
      }
      
      return { 
        success: true, 
        messageId: result.messageId,
        previewUrl: previewUrl
      };
    } catch (error) {
      logger.error('Email send failed:', {
        error: error.message,
        code: error.code,
        command: error.command,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      return { success: false, error: error.message };
    }
  }

  // Send lead confirmation to user
  async sendLeadConfirmation(lead) {
    const mailOptions = {
      to: lead.user.email,
      subject: `Your ${lead.serviceType} request has been received`,
      html: this.getLeadConfirmationTemplate(lead)
    };

    return this.sendEmail(mailOptions);
  }

  // Send lead assignment notification to partner
  async sendLeadAssignmentNotification(partner, lead) {
    // Check if email notifications are enabled (default to true if not specified)
    if (partner.notifications && partner.notifications.email === false) {
      return { success: true, message: 'Email notifications disabled' };
    }

    // Get partner email
    const partnerEmail = partner.contactPerson?.email || partner.email;
    if (!partnerEmail) {
      return { success: false, error: 'Partner email address not found' };
    }

    const mailOptions = {
      to: partnerEmail,
      subject: `New Lead Assignment - ${lead.serviceType}`,
      html: this.getLeadAssignmentTemplate(partner, lead)
    };

    return this.sendEmail(mailOptions);
  }

  // Send partner registration confirmation
  async sendPartnerRegistrationConfirmation(partner) {
    // Detect language preference
    const isGerman = this.detectLanguagePreference(partner);

    const subject = isGerman
      ? `Registrierung erhalten - Willkommen bei ${this.companyName}!`
      : `Registration Received - Welcome to ${this.companyName}!`;

    const mailOptions = {
      to: partner.contactPerson.email,
      subject: subject,
      html: this.getPartnerRegistrationTemplate(partner, isGerman)
    };

    return this.sendEmail(mailOptions);
  }

  // Send partner approval notification
  async sendPartnerApprovalNotification(partner, approved) {
    const subject = approved 
      ? 'Partner Application Approved' 
      : 'Partner Application Status Update';

    const mailOptions = {
      to: partner.contactPerson.email,
      subject,
      html: approved 
        ? this.getPartnerApprovedTemplate(partner)
        : this.getPartnerRejectedTemplate(partner)
    };

    return this.sendEmail(mailOptions);
  }

  // Send cancellation notification
  async sendCancellationNotification(lead, approved, reason) {
    const subject = approved 
      ? 'Cancellation Request Approved' 
      : 'Cancellation Request Update';

    const mailOptions = {
      to: lead.user.email,
      subject,
      html: this.getCancellationNotificationTemplate(lead, approved, reason)
    };

    return this.sendEmail(mailOptions);
  }

  // Send invoice to partner
  async sendInvoice(partner, invoice) {
    const mailOptions = {
      to: partner.contactPerson.email,
      subject: `Invoice ${invoice.invoiceNumber}`,
      html: this.getInvoiceTemplate(partner, invoice)
    };

    return this.sendEmail(mailOptions);
  }

  // Send password reset OTP
  async sendPasswordResetOTP(user, otpCode, userType) {
    const isPartner = userType === 'partner';
    const email = isPartner ? user.contactPerson.email : user.email;
    const name = isPartner ? user.contactPerson.firstName : (user.firstName || user.fullName);
    const companyName = isPartner ? user.companyName : null;

    // Detect language preference (German if user has German settings or German address)
    const isGerman = this.detectLanguagePreference(user);

    const mailOptions = {
      to: email,
      subject: isGerman ? 'Passwort zurücksetzen - Ihr OTP-Code' : 'Password Reset - Your OTP Code',
      html: this.getPasswordResetOTPTemplate(otpCode, name, companyName, isPartner, isGerman)
    };

    return this.sendEmail(mailOptions);
  }

  // Send password change confirmation
  async sendPasswordChangeConfirmation(user, newPassword, userType) {
    const isPartner = userType === 'partner';
    const email = isPartner ? user.contactPerson.email : user.email;
    const name = isPartner ? user.contactPerson.firstName : (user.firstName || user.fullName);
    const companyName = isPartner ? user.companyName : null;

    // Detect language preference
    const isGerman = this.detectLanguagePreference(user);

    const mailOptions = {
      to: email,
      subject: isGerman ? 'Passwort erfolgreich geändert' : 'Password Successfully Changed',
      html: this.getPasswordChangeConfirmationTemplate(name, companyName, newPassword, isPartner, isGerman)
    };

    return this.sendEmail(mailOptions);
  }

  // Helper method to detect language preference
  detectLanguagePreference(user) {
    // Priority 1: Check stored language preference from registration form
    if (user.language === 'de' || user.language === 'german') return true;
    if (user.language === 'en' || user.language === 'english') return false;

    // Priority 2: Check contact person language preference (for backwards compatibility)
    if (user.contactPerson && user.contactPerson.language === 'de') return true;
    if (user.contactPerson && user.contactPerson.language === 'en') return false;

    // Priority 3: Fallback to country-based detection (for older records without language preference)
    if (user.address && user.address.country === 'Germany') return true;

    return false; // Default to English
  }

  // Email Templates
  getLeadConfirmationTemplate(lead) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3d68ff; color: white; padding: 20px; text-align: center;">
          <h1>Request Received</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${lead.user.firstName} ${lead.user.lastName},</p>
          
          <p>Thank you for your ${lead.serviceType} service request. We have received your inquiry and are processing it now.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Request Details:</h3>
            <p><strong>Reference ID:</strong> ${lead.leadId}</p>
            <p><strong>Service:</strong> ${lead.serviceType}</p>
            <p><strong>Submitted:</strong> ${new Date(lead.createdAt).toLocaleDateString()}</p>
          </div>
          
          <p>We will connect you with up to 3 qualified service providers who will contact you soon with quotes.</p>
          
          <p>If you need to cancel or modify your request, please contact us with your reference ID.</p>
          
          <p>Best regards,<br>${this.companyTeam}</p>
        </div>
        <div style="background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px;">
          This is an automated message. Please do not reply to this email.
        </div>
      </div>
    `;
  }

  getLeadAssignmentTemplate(partner, lead) {
    // Get partner name safely
    const partnerName = partner.contactPerson?.firstName || partner.firstName || 'Partner';

    // Get customer name safely
    const customerName = lead.user?.firstName && lead.user?.lastName
      ? `${lead.user.firstName} ${lead.user.lastName}`
      : 'Customer';

    // Get location safely
    const location = lead.serviceLocation?.city || lead.location?.city || lead.city || 'Not specified';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>New Lead Assignment</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${partnerName},</p>

          <p>You have been assigned a new lead for ${lead.serviceType} services.</p>

          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3>Lead Information:</h3>
            <p><strong>Lead ID:</strong> ${lead.leadId}</p>
            <p><strong>Service:</strong> ${lead.serviceType}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Assigned:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Log into your dashboard to view full lead details</li>
              <li>Accept or decline the lead within 24 hours</li>
              <li>Contact the customer once you accept</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/partner/dashboard" 
               style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Lead Details
            </a>
          </div>
          
          <p>Best regards,<br>${this.companyTeam}</p>
        </div>
      </div>
    `;
  }

  getPartnerRegistrationTemplate(partner, isGerman = false) {
    // Handle both old and new partner model structures
    let services;
    if (Array.isArray(partner.services)) {
      // New structure: services is an array of service types
      services = partner.services.join(', ');
    } else if (partner.serviceType) {
      // Single service structure
      services = partner.serviceType;
    } else {
      // Fallback
      services = 'Not specified';
    }

    // Return language-specific template
    if (isGerman) {
      return this.getGermanRegistrationTemplate(partner, services);
    } else {
      return this.getEnglishRegistrationTemplate(partner, services);
    }
  }

  // English registration template
  getEnglishRegistrationTemplate(partner, services) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #3d68ff; color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Partner Registration Received</h1>
        </div>

        <div style="padding: 30px 20px;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>Dear ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</strong>
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Thank you for registering with ${this.companyName}! We have successfully received your partner application.
          </p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 0 0 20px 0; border-left: 4px solid #3d68ff;">
            <h3 style="margin: 0 0 15px 0; color: #3d68ff;">Registration Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Company:</td><td style="padding: 8px 0;">${partner.companyName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Contact:</td><td style="padding: 8px 0;">${partner.contactPerson.firstName} ${partner.contactPerson.lastName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${partner.contactPerson.email}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td style="padding: 8px 0;">${partner.contactPerson.phone}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Services:</td><td style="padding: 8px 0;">${services}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Address:</td><td style="padding: 8px 0;">${partner.address.street}, ${partner.address.city}${partner.address.postalCode ? ', ' + partner.address.postalCode : ''}${partner.address.country ? ', ' + partner.address.country : ''}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Date:</td><td style="padding: 8px 0;">${new Date().toLocaleDateString('en-GB')}</td></tr>
            </table>
          </div>

          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 0 0 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="margin: 0 0 15px 0; color: #856404;">What happens next?</h4>
            <p style="margin: 0; line-height: 1.6;">Our admin team will review your application carefully. Once approved, you'll receive login credentials and can start receiving leads.</p>
          </div>

          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 0 0 20px 0; border-left: 4px solid #17a2b8;">
            <p style="margin: 0; line-height: 1.6;"><strong>Important:</strong> Please do not attempt to login yet. You will receive another email once approved.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
              <p style="margin: 0; font-weight: bold; color: #155724; font-size: 18px;">✓ Registration Complete</p>
            </div>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
            Best regards,<br><strong>${this.companyTeam}</strong>
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6;">
          This is an automated message. Please do not reply to this email.
        </div>
      </div>
    `;
  }

  // German registration template
  getGermanRegistrationTemplate(partner, services) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #dc3545; color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Partnerregistrierung erhalten</h1>
        </div>

        <div style="padding: 30px 20px;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>Liebe/r ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</strong>
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Vielen Dank für Ihre Registrierung bei ${this.companyName}! Wir haben Ihre Partneranmeldung erfolgreich erhalten.
          </p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 0 0 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="margin: 0 0 15px 0; color: #dc3545;">Registrierungsdetails</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Unternehmen:</td><td style="padding: 8px 0;">${partner.companyName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Ansprechpartner:</td><td style="padding: 8px 0;">${partner.contactPerson.firstName} ${partner.contactPerson.lastName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">E-Mail:</td><td style="padding: 8px 0;">${partner.contactPerson.email}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Telefon:</td><td style="padding: 8px 0;">${partner.contactPerson.phone}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Dienstleistungen:</td><td style="padding: 8px 0;">${services}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Adresse:</td><td style="padding: 8px 0;">${partner.address.street}, ${partner.address.city}${partner.address.postalCode ? ', ' + partner.address.postalCode : ''}${partner.address.country ? ', ' + partner.address.country : ''}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Datum:</td><td style="padding: 8px 0;">${new Date().toLocaleDateString('de-DE')}</td></tr>
            </table>
          </div>

          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 0 0 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="margin: 0 0 15px 0; color: #856404;">Wie geht es weiter?</h4>
            <p style="margin: 0; line-height: 1.6;">Unser Admin-Team wird Ihre Bewerbung sorgfältig prüfen. Nach der Genehmigung erhalten Sie Anmeldedaten und können Leads empfangen.</p>
          </div>

          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 0 0 20px 0; border-left: 4px solid #17a2b8;">
            <p style="margin: 0; line-height: 1.6;"><strong>Wichtig:</strong> Bitte versuchen Sie noch nicht, sich anzumelden. Sie erhalten eine weitere E-Mail nach der Genehmigung.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
              <p style="margin: 0; font-weight: bold; color: #155724; font-size: 18px;">✓ Registrierung abgeschlossen</p>
            </div>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
            Mit freundlichen Grüßen,<br><strong>${this.companyTeam}</strong>
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6;">
          Dies ist eine automatisierte Nachricht. Bitte antworten Sie nicht auf diese E-Mail.
        </div>
      </div>
    `;
  }

  getPartnerApprovedTemplate(partner) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to ${this.companyName}!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${partner.contactPerson.firstName},</p>
          
          <p>Congratulations! Your partner application has been approved.</p>
          
          <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Account Details:</h3>
            <p><strong>Company:</strong> ${partner.companyName}</p>
            <p><strong>Partner Type:</strong> ${partner.partnerType}</p>
            <p><strong>Services:</strong> ${partner.services.map(s => s.serviceType || s).join(', ')}</p>
          </div>
          
          <p>You can now:</p>
          <ul>
            <li>Access your partner dashboard</li>
            <li>Set your service preferences</li>
            <li>Start receiving leads</li>
            <li>Manage your account settings</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/partner/login" 
               style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Access Dashboard
            </a>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Welcome aboard!<br>${this.companyTeam}</p>
        </div>
      </div>
    `;
  }

  getPartnerRejectedTemplate(partner) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>Application Status Update</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${partner.contactPerson.firstName},</p>
          
          <p>Thank you for your interest in becoming a partner with ${this.companyName}.</p>
          
          <p>After careful review, we are unable to approve your application at this time. This decision is based on our current partner requirements and capacity.</p>
          
          <p>We encourage you to reapply in the future when circumstances may have changed.</p>
          
          <p>Thank you for your understanding.</p>
          
          <p>Best regards,<br>${this.companyTeam}</p>
        </div>
      </div>
    `;
  }

  // Send service-specific approval notification with password
  async sendServiceApprovalNotification(partner, serviceType, password, adminLanguage = null) {
    const email = partner.contactPerson.email;
    // Use admin's language preference if provided, otherwise use partner's preference
    const isGerman = adminLanguage ? (adminLanguage === 'de') : this.detectLanguagePreference(partner);

    const subject = isGerman
      ? `${this.companyName} - ${serviceType === 'moving' ? 'Umzugsdienst' : 'Reinigungsdienst'} Genehmigt`
      : `${this.companyName} - ${serviceType === 'moving' ? 'Moving Service' : 'Cleaning Service'} Approved`;

    const mailOptions = {
      to: email,
      subject,
      html: this.getServiceApprovalTemplate(partner, serviceType, password, isGerman)
    };

    return this.sendEmail(mailOptions);
  }

  // Send service rejection notification
  async sendServiceRejectionNotification(partner, serviceType, reason) {
    const email = partner.contactPerson.email;
    const isGerman = this.detectLanguagePreference(partner);

    const subject = isGerman
      ? `${this.companyName} - ${serviceType === 'moving' ? 'Umzugsdienst' : 'Reinigungsdienst'} Abgelehnt`
      : `${this.companyName} - ${serviceType === 'moving' ? 'Moving Service' : 'Cleaning Service'} Rejected`;

    const mailOptions = {
      to: email,
      subject,
      html: this.getServiceRejectionTemplate(partner, serviceType, reason, isGerman)
    };

    return this.sendEmail(mailOptions);
  }

  // Service-specific approval template with password - German only
  getServiceApprovalTemplate(partner, serviceType, password, isGerman = false) {
    // Always return German template as requested
    return this.getGermanApprovalTemplate(partner, serviceType, password);
  }

  // German approval template
  getGermanApprovalTemplate(partner, serviceType, password) {
    const serviceDisplayNameDE = serviceType === 'moving' ? 'Umzugsdienste' : 'Reinigungsdienste';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #28a745; color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Service Genehmigt</h1>
        </div>

        <div style="padding: 30px 20px;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>Liebe/r ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</strong>
          </p>

          <div style="background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #155724; margin: 0 0 15px 0;">🎉 Großartige Neuigkeiten!</h3>
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #155724;">Ihr Antrag für <strong>${serviceDisplayNameDE}</strong> wurde genehmigt!</p>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #155724;">
              Sie können sich jetzt als <strong>${serviceDisplayNameDE}</strong>-Partner anmelden.
            </p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Konto-Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Unternehmen:</td><td style="padding: 8px 0;">${partner.companyName}</td></tr>
              <tr style="background: #e7f3ff;"><td style="padding: 12px 8px; font-weight: bold; color: #0056b3;">🎯 Genehmigter Service:</td><td style="padding: 12px 8px; font-weight: bold; color: #0056b3; font-size: 16px;">${serviceDisplayNameDE}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Partner-Typ:</td><td style="padding: 8px 0;">${partner.partnerType}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">E-Mail:</td><td style="padding: 8px 0;">${partner.contactPerson.email}</td></tr>
              <tr style="background: #fff3cd;"><td style="padding: 12px 8px; font-weight: bold; color: #856404;">🔑 Temporäres Passwort:</td><td style="padding: 12px 8px;">
                <span style="background: #007bff; color: white; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: bold;">${password}</span>
              </td></tr>
            </table>
          </div>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #007bff;">
            <h3 style="color: #0056b3; margin: 0 0 15px 0;">🚀 Anmeldung für ${serviceDisplayNameDE}:</h3>
            <div style="background: #fff; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #007bff;">
              <p style="margin: 0; font-weight: bold; color: #0056b3;">1. Gehen Sie zum Partner-Dashboard</p>
              <p style="margin: 5px 0 0 0; color: #333;">2. Wählen Sie "${serviceDisplayNameDE}" als Service</p>
              <p style="margin: 5px 0 0 0; color: #333;">3. Loggen Sie sich mit obigen Daten ein</p>
            </div>
            <h4 style="color: #0056b3; margin: 15px 0 10px 0;">Sie können dann:</h4>
            <ul style="padding-left: 20px; color: #333;">
              <li style="margin-bottom: 8px;">${serviceDisplayNameDE}-Leads in Ihrem Gebiet erhalten</li>
              <li style="margin-bottom: 8px;">Ihre Service-Präferenzen und Abdeckungsgebiete einstellen</li>
              <li style="margin-bottom: 8px;">Ihr Passwort in den Kontoeinstellungen ändern</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/auth/partner-login" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              🚀 Dashboard aufrufen
            </a>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-weight: bold;">
              <strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.
            </p>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
            Willkommen in der ${this.companyName} Familie! Bei Fragen wenden Sie sich an unser Support-Team.
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
            <strong>Mit freundlichen Grüßen,<br>${this.companyTeam}</strong>
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Dies ist eine automatische Nachricht. Bitte antworten Sie nicht auf diese E-Mail.
          </p>
        </div>
      </div>
    `;
  }

  // English approval template
  getEnglishApprovalTemplate(partner, serviceType, password) {
    const serviceDisplayName = serviceType === 'moving' ? 'Moving Services' : 'Cleaning Services';
    const serviceDisplayNameDE = serviceType === 'moving' ? 'Umzugsdienste' : 'Reinigungsdienste';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3d68ff; color: white; padding: 20px; text-align: center;">
          <h1>Service Approved / Service Genehmigt</h1>
        </div>
        
        <!-- Language Toggle Buttons -->
        <div style="text-align: center; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
          <p style="margin: 0 0 15px 0; color: #6c757d; font-size: 14px;">Choose your language / Wählen Sie Ihre Sprache:</p>
          <button id="btn-english" onclick="showLanguage('english')" 
                  style="background: #3d68ff; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🇬🇧 English
          </button>
          <button id="btn-german" onclick="showLanguage('german')" 
                  style="background: #6c757d; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🇩🇪 Deutsch
          </button>
        </div>

        <!-- English Content -->
        <div id="content-english" style="padding: 20px;">
          <p>Dear ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #155724; margin: 0 0 15px 0;">🎉 Great News!</h3>
            <p style="margin: 0; font-size: 16px;">Your <strong>${serviceDisplayName}</strong> application has been approved!</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Account Details</h3>
            <p><strong>Company:</strong> ${partner.companyName}</p>
            <p><strong>Approved Service:</strong> ${serviceDisplayName}</p>
            <p><strong>Partner Type:</strong> ${partner.partnerType}</p>
            <p><strong>Email:</strong> ${partner.contactPerson.email}</p>
            <p style="margin: 15px 0 0 0;"><strong>Temporary Password:</strong> 
              <span style="background: #007bff; color: white; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: bold;">${password}</span>
            </p>
          </div>

          <p>You can now:</p>
          <ul style="padding-left: 20px;">
            <li>Access your partner dashboard</li>
            <li>Start receiving ${serviceDisplayName.toLowerCase()} leads in your area</li>
            <li>Set your service preferences and coverage areas</li>
            <li>Change your password in account settings</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/partner/login" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              🚀 Access Dashboard
            </a>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>Important:</strong> Please change your password after first login for security.</p>
          </div>
          
          <p>Welcome to the ${this.companyName} family! If you have any questions, contact our support team.</p>
          <p>Best regards,<br><strong>${this.companyTeam}</strong></p>
        </div>

        <!-- German Content -->
        <div id="content-german" style="padding: 20px; display: none;">
          <p>Liebe/r ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #155724; margin: 0 0 15px 0;">🎉 Großartige Neuigkeiten!</h3>
            <p style="margin: 0; font-size: 16px;">Ihr Antrag für <strong>${serviceDisplayNameDE}</strong> wurde genehmigt!</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Konto-Details</h3>
            <p><strong>Unternehmen:</strong> ${partner.companyName}</p>
            <p><strong>Genehmigter Service:</strong> ${serviceDisplayNameDE}</p>
            <p><strong>Partner-Typ:</strong> ${partner.partnerType}</p>
            <p><strong>E-Mail:</strong> ${partner.contactPerson.email}</p>
            <p style="margin: 15px 0 0 0;"><strong>Temporäres Passwort:</strong> 
              <span style="background: #007bff; color: white; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: bold;">${password}</span>
            </p>
          </div>

          <p>Sie können jetzt:</p>
          <ul style="padding-left: 20px;">
            <li>Auf Ihr Partner-Dashboard zugreifen</li>
            <li>${serviceDisplayNameDE.toLowerCase()}-Leads in Ihrer Region erhalten</li>
            <li>Ihre Service-Präferenzen und Abdeckungsgebiete festlegen</li>
            <li>Ihr Passwort in den Kontoeinstellungen ändern</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/partner/login" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              🚀 Dashboard aufrufen
            </a>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach der ersten Anmeldung aus Sicherheitsgründen.</p>
          </div>
          
          <p>Willkommen in der ${this.companyName}-Familie! Bei Fragen wenden Sie sich an unser Support-Team.</p>
          <p>Mit freundlichen Grüßen,<br><strong>${this.companyTeam}</strong></p>
        </div>

        <script>
          function showLanguage(lang) {
            document.getElementById('content-english').style.display = lang === 'english' ? 'block' : 'none';
            document.getElementById('content-german').style.display = lang === 'german' ? 'block' : 'none';
            
            document.getElementById('btn-english').style.background = lang === 'english' ? '#3d68ff' : '#6c757d';
            document.getElementById('btn-german').style.background = lang === 'german' ? '#3d68ff' : '#6c757d';
          }
          
          // Show English by default
          showLanguage('english');
        </script>
      </div>
    `;
  }

  // Service-specific rejection template
  getServiceRejectionTemplate(partner, serviceType, reason) {
    const serviceDisplayNameDE = serviceType === 'moving' ? 'Umzugsdienste' : 'Reinigungsdienste';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #dc3545; color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Service-Antrag Update</h1>
        </div>

        <div style="padding: 30px 20px;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>Liebe/r ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</strong>
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Vielen Dank für Ihr Interesse, <strong>${serviceDisplayNameDE}</strong> über ${this.companyName} anzubieten.
          </p>

          <div style="background: #f8d7da; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">Nach sorgfältiger Prüfung können wir Ihren Antrag für <strong>${serviceDisplayNameDE}</strong> derzeit nicht genehmigen.</p>
            ${reason ? `<div style="margin: 15px 0 0 0; padding: 15px; background: #fff; border-radius: 6px; border: 1px solid #dc3545;">
              <p style="margin: 0; font-weight: bold; color: #721c24;">Grund:</p>
              <p style="margin: 8px 0 0 0; color: #721c24;">${reason}</p>
            </div>` : ''}
          </div>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; line-height: 1.6;">
              Diese Entscheidung betrifft keine anderen genehmigten Services, die Sie möglicherweise bei uns haben.
              Sie können sich in Zukunft erneut für ${serviceDisplayNameDE} bewerben, wenn sich die Umstände geändert haben.
            </p>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin: 25px 0;">
            Bei Fragen zu dieser Entscheidung wenden Sie sich bitte an unser Support-Team.
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 25px 0;">
            Vielen Dank für Ihr Verständnis.
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
            <strong>Mit freundlichen Grüßen,<br>${this.companyTeam}</strong>
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Dies ist eine automatische Nachricht. Bitte antworten Sie nicht auf diese E-Mail.
          </p>
        </div>
      </div>
    `;
  }

  // Send partner suspension notification
  async sendPartnerSuspensionNotification(partner, reason) {
    const email = partner.contactPerson.email;
    const isGerman = this.detectLanguagePreference(partner);
    
    const subject = isGerman 
      ? `${this.companyName} - Account gesperrt`
      : `${this.companyName} - Account Suspended`;

    await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject,
      html: this.getPartnerSuspensionTemplate(partner, reason)
    });

    console.log(`Partner suspension email sent to ${email}`);
  }

  // Send partner reactivation notification
  async sendPartnerReactivationNotification(partner) {
    const email = partner.contactPerson.email;
    const isGerman = this.detectLanguagePreference(partner);
    
    const subject = isGerman 
      ? `${this.companyName} - Account reaktiviert`
      : `${this.companyName} - Account Reactivated`;

    await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject,
      html: this.getPartnerReactivationTemplate(partner)
    });

    console.log(`Partner reactivation email sent to ${email}`);
  }

  // Send partner type change notification
  async sendPartnerTypeChangeNotification(partner, oldType, newType) {
    const email = partner.contactPerson.email;
    const isGerman = this.detectLanguagePreference(partner);
    
    const subject = isGerman 
      ? `${this.companyName} - Partner-Status geändert`
      : `${this.companyName} - Partner Status Changed`;

    await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject,
      html: this.getPartnerTypeChangeTemplate(partner, oldType, newType)
    });

    console.log(`Partner type change email sent to ${email}`);
  }

  // Partner suspension email template
  getPartnerSuspensionTemplate(partner, reason) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>Account Suspended / Account gesperrt</h1>
        </div>
        
        <!-- Language Toggle Buttons -->
        <div style="text-align: center; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
          <p style="margin: 0 0 15px 0; color: #6c757d; font-size: 14px;">Choose your language / Wählen Sie Ihre Sprache:</p>
          <button id="btn-english" onclick="showLanguage('english')" 
                  style="background: #3d68ff; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🇬🇧 English
          </button>
          <button id="btn-german" onclick="showLanguage('german')" 
                  style="background: #6c757d; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🇩🇪 Deutsch
          </button>
        </div>

        <!-- English Content -->
        <div id="content-english" style="padding: 20px;">
          <p>Dear ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</p>
          
          <div style="background: #f8d7da; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h3 style="color: #721c24; margin: 0 0 15px 0;">⚠️ Account Suspension Notice</h3>
            <p style="margin: 0;">Your ${this.companyName} partner account has been temporarily suspended.</p>
            ${reason ? `<p style="margin: 15px 0 0 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>

          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">What this means:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li>You will no longer receive new leads</li>
              <li>Your account access has been temporarily disabled</li>
              <li>Existing leads may be reassigned to other partners</li>
            </ul>
          </div>

          <p>If you believe this suspension was made in error or would like to discuss reactivation, please contact our support team immediately.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${this.supportEmail}" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              📧 Contact Support
            </a>
          </div>
          
          <p>We appreciate your understanding.</p>
          <p>Best regards,<br><strong>${this.companyTeam}</strong></p>
        </div>

        <!-- German Content -->
        <div id="content-german" style="padding: 20px; display: none;">
          <p>Liebe/r ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</p>
          
          <div style="background: #f8d7da; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h3 style="color: #721c24; margin: 0 0 15px 0;">⚠️ Kontosperrung</h3>
            <p style="margin: 0;">Ihr ${this.companyName} Partnerkonto wurde vorübergehend gesperrt.</p>
            ${reason ? `<p style="margin: 15px 0 0 0;"><strong>Grund:</strong> ${reason}</p>` : ''}
          </div>

          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Was das bedeutet:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li>Sie erhalten keine neuen Leads mehr</li>
              <li>Ihr Kontozugang wurde vorübergehend deaktiviert</li>
              <li>Bestehende Leads können anderen Partnern zugewiesen werden</li>
            </ul>
          </div>

          <p>Wenn Sie glauben, dass diese Sperrung irrtümlich erfolgt ist oder eine Reaktivierung besprechen möchten, wenden Sie sich bitte umgehend an unser Support-Team.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${this.supportEmail}" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              📧 Support kontaktieren
            </a>
          </div>
          
          <p>Vielen Dank für Ihr Verständnis.</p>
          <p>Mit freundlichen Grüßen,<br><strong>${this.companyTeam}</strong></p>
        </div>

        <script>
          function showLanguage(lang) {
            document.getElementById('content-english').style.display = lang === 'english' ? 'block' : 'none';
            document.getElementById('content-german').style.display = lang === 'german' ? 'block' : 'none';
            
            document.getElementById('btn-english').style.background = lang === 'english' ? '#3d68ff' : '#6c757d';
            document.getElementById('btn-german').style.background = lang === 'german' ? '#3d68ff' : '#6c757d';
          }
          
          // Show English by default
          showLanguage('english');
        </script>
      </div>
    `;
  }

  // Partner reactivation email template
  getPartnerReactivationTemplate(partner) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>Account Reactivated / Account reaktiviert</h1>
        </div>
        
        <!-- Language Toggle Buttons -->
        <div style="text-align: center; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
          <p style="margin: 0 0 15px 0; color: #6c757d; font-size: 14px;">Choose your language / Wählen Sie Ihre Sprache:</p>
          <button id="btn-english" onclick="showLanguage('english')" 
                  style="background: #3d68ff; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🇬🇧 English
          </button>
          <button id="btn-german" onclick="showLanguage('german')" 
                  style="background: #6c757d; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🇩🇪 Deutsch
          </button>
        </div>

        <!-- English Content -->
        <div id="content-english" style="padding: 20px;">
          <p>Dear ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #155724; margin: 0 0 15px 0;">🎉 Great News!</h3>
            <p style="margin: 0; font-size: 16px;">Your ${this.companyName} partner account has been <strong>reactivated</strong>!</p>
          </div>

          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 20px 0;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">You can now:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
              <li>Access your partner dashboard</li>
              <li>Start receiving new leads again</li>
              <li>Manage your service preferences</li>
              <li>View and respond to lead assignments</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/partner/login" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              🚀 Access Your Dashboard
            </a>
          </div>

          <p>Thank you for your patience during the suspension period. We look forward to continuing our partnership!</p>
          
          <p>Best regards,<br><strong>${this.companyTeam}</strong></p>
        </div>

        <!-- German Content -->
        <div id="content-german" style="padding: 20px; display: none;">
          <p>Liebe/r ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #155724; margin: 0 0 15px 0;">🎉 Großartige Neuigkeiten!</h3>
            <p style="margin: 0; font-size: 16px;">Ihr ${this.companyName} Partnerkonto wurde <strong>reaktiviert</strong>!</p>
          </div>

          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 20px 0;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">Sie können jetzt wieder:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
              <li>Auf Ihr Partner-Dashboard zugreifen</li>
              <li>Neue Leads erhalten</li>
              <li>Ihre Service-Einstellungen verwalten</li>
              <li>Lead-Zuweisungen einsehen und bearbeiten</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/partner/login" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              🚀 Dashboard aufrufen
            </a>
          </div>

          <p>Vielen Dank für Ihre Geduld während der Sperrzeit. Wir freuen uns darauf, unsere Partnerschaft fortzusetzen!</p>
          
          <p>Mit freundlichen Grüßen,<br><strong>${this.companyTeam}</strong></p>
        </div>

        <script>
          function showLanguage(lang) {
            document.getElementById('content-english').style.display = lang === 'english' ? 'block' : 'none';
            document.getElementById('content-german').style.display = lang === 'german' ? 'block' : 'none';
            
            document.getElementById('btn-english').style.background = lang === 'english' ? '#3d68ff' : '#6c757d';
            document.getElementById('btn-german').style.background = lang === 'german' ? '#3d68ff' : '#6c757d';
          }
          
          // Show English by default
          showLanguage('english');
        </script>
      </div>
    `;
  }

  // Partner type change email template
  getPartnerTypeChangeTemplate(partner, oldType, newType) {
    const upgradeToExclusive = newType === 'exclusive';
    const bgColor = upgradeToExclusive ? '#28a745' : '#ffc107';
    const headerText = upgradeToExclusive ? 'Upgraded to Exclusive' : 'Changed to Basic';
    const headerTextDE = upgradeToExclusive ? 'Auf Exklusiv aufgewertet' : 'Auf Basic geändert';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${bgColor}; color: white; padding: 20px; text-align: center;">
          <h1>Partner Status Updated / Partner-Status aktualisiert</h1>
        </div>
        
        <!-- Language Toggle Buttons -->
        <div style="text-align: center; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
          <p style="margin: 0 0 15px 0; color: #6c757d; font-size: 14px;">Choose your language / Wählen Sie Ihre Sprache:</p>
          <button id="btn-english" onclick="showLanguage('english')" 
                  style="background: #3d68ff; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🇬🇧 English
          </button>
          <button id="btn-german" onclick="showLanguage('german')" 
                  style="background: #6c757d; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🇩🇪 Deutsch
          </button>
        </div>

        <!-- English Content -->
        <div id="content-english" style="padding: 20px;">
          <p>Dear ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</p>
          
          <div style="background: ${upgradeToExclusive ? '#d4edda' : '#fff3cd'}; padding: 20px; border-radius: 8px; border-left: 4px solid ${bgColor}; margin: 20px 0;">
            <h3 style="color: ${upgradeToExclusive ? '#155724' : '#856404'}; margin: 0 0 15px 0;">
              ${upgradeToExclusive ? '🌟' : '📋'} ${headerText}
            </h3>
            <p style="margin: 0;">Your partner status has been changed from <strong>${oldType}</strong> to <strong>${newType}</strong>.</p>
          </div>

          ${upgradeToExclusive ? `
            <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 20px 0;">
              <h4 style="color: #0c5460; margin: 0 0 10px 0;">Exclusive Partner Benefits:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
                <li>Higher priority for lead assignments</li>
                <li>Exclusive access to premium leads</li>
                <li>Enhanced dashboard features</li>
                <li>Priority customer support</li>
                <li>Advanced analytics and reporting</li>
              </ul>
            </div>
          ` : `
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0;">Basic Partner Features:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #856404;">
                <li>Standard lead assignments</li>
                <li>Basic dashboard access</li>
                <li>Standard customer support</li>
                <li>Core reporting features</li>
              </ul>
            </div>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/partner/login" 
               style="background: ${bgColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              🚀 Access Your Dashboard
            </a>
          </div>

          <p>If you have any questions about your new partner status, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br><strong>${this.companyTeam}</strong></p>
        </div>

        <!-- German Content -->
        <div id="content-german" style="padding: 20px; display: none;">
          <p>Liebe/r ${partner.contactPerson.firstName} ${partner.contactPerson.lastName},</p>
          
          <div style="background: ${upgradeToExclusive ? '#d4edda' : '#fff3cd'}; padding: 20px; border-radius: 8px; border-left: 4px solid ${bgColor}; margin: 20px 0;">
            <h3 style="color: ${upgradeToExclusive ? '#155724' : '#856404'}; margin: 0 0 15px 0;">
              ${upgradeToExclusive ? '🌟' : '📋'} ${headerTextDE}
            </h3>
            <p style="margin: 0;">Ihr Partnerstatus wurde von <strong>${oldType}</strong> auf <strong>${newType}</strong> geändert.</p>
          </div>

          ${upgradeToExclusive ? `
            <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 20px 0;">
              <h4 style="color: #0c5460; margin: 0 0 10px 0;">Exklusiv-Partner Vorteile:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
                <li>Höhere Priorität bei Lead-Zuweisungen</li>
                <li>Exklusiver Zugang zu Premium-Leads</li>
                <li>Erweiterte Dashboard-Funktionen</li>
                <li>Prioritäts-Kundensupport</li>
                <li>Erweiterte Analysen und Berichte</li>
              </ul>
            </div>
          ` : `
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0;">Standard-Partner Funktionen:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #856404;">
                <li>Standard Lead-Zuweisungen</li>
                <li>Basis Dashboard-Zugang</li>
                <li>Standard Kundensupport</li>
                <li>Kern-Berichtsfunktionen</li>
              </ul>
            </div>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/partner/login" 
               style="background: ${bgColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              🚀 Dashboard aufrufen
            </a>
          </div>

          <p>Bei Fragen zu Ihrem neuen Partnerstatus wenden Sie sich bitte an unser Support-Team.</p>
          
          <p>Mit freundlichen Grüßen,<br><strong>${this.companyTeam}</strong></p>
        </div>

        <script>
          function showLanguage(lang) {
            document.getElementById('content-english').style.display = lang === 'english' ? 'block' : 'none';
            document.getElementById('content-german').style.display = lang === 'german' ? 'block' : 'none';
            
            document.getElementById('btn-english').style.background = lang === 'english' ? '#3d68ff' : '#6c757d';
            document.getElementById('btn-german').style.background = lang === 'german' ? '#3d68ff' : '#6c757d';
          }
          
          // Show English by default
          showLanguage('english');
        </script>
      </div>
    `;
  }

  getCancellationNotificationTemplate(lead, approved, reason) {
    const status = approved ? 'approved' : 'declined';
    const bgColor = approved ? '#28a745' : '#dc3545';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${bgColor}; color: white; padding: 20px; text-align: center;">
          <h1>Cancellation Request ${approved ? 'Approved' : 'Update'}</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${lead.user.firstName} ${lead.user.lastName},</p>
          
          <p>Your cancellation request for lead ${lead.leadId} has been ${status}.</p>
          
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          
          ${approved 
            ? '<p>Your request has been cancelled and you will not be contacted by service providers regarding this inquiry.</p>'
            : '<p>Your original request remains active and service providers may still contact you.</p>'
          }
          
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Best regards,<br>${this.companyTeam}</p>
        </div>
      </div>
    `;
  }

  getInvoiceTemplate(partner, invoice) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3d68ff; color: white; padding: 20px; text-align: center;">
          <h1>Invoice ${invoice.invoiceNumber}</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${partner.contactPerson.firstName},</p>
          
          <p>Please find attached your invoice for the period ${new Date(invoice.billingPeriod.from).toLocaleDateString()} to ${new Date(invoice.billingPeriod.to).toLocaleDateString()}.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Invoice Summary:</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Total Amount:</strong> €${invoice.total.toFixed(2)}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueAt).toLocaleDateString()}</p>
            <p><strong>Items:</strong> ${invoice.items.length} leads</p>
          </div>
          
          <p>Payment is due within 30 days of the invoice date.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/partner/invoices/${invoice._id}" 
               style="background: #3d68ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Full Invoice
            </a>
          </div>
          
          <p>Thank you for your business!</p>
          
          <p>Best regards,<br>${this.companyTeam} - Billing</p>
        </div>
      </div>
    `;
  }

  // Password Reset OTP Email Template
  getPasswordResetOTPTemplate(otpCode, name, companyName, isPartner, isGerman) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3d68ff; color: white; padding: 20px; text-align: center;">
          <h1>Password Reset / Passwort zurücksetzen</h1>
        </div>
        
        <!-- Language Notice -->
        <div style="text-align: center; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">🔐 This password reset email is available in English and German below</p>
          <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 14px;">🔐 Diese Passwort-Reset-E-Mail ist unten in englischer und deutscher Sprache verfügbar</p>
        </div>
        
        <div style="padding: 20px;">
          <!-- English Version -->
          <div style="border: 2px solid #3d68ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="background: #3d68ff; color: white; padding: 10px; margin: -20px -20px 15px -20px; border-radius: 6px 6px 0 0;">
              <h3 style="margin: 0; text-align: center;">🇬🇧 ENGLISH</h3>
            </div>
            <p>Dear ${name},</p>
            ${companyName ? `<p>Company: <strong>${companyName}</strong></p>` : ''}
            
            <p>You have requested a password reset for your ${this.companyName} ${isPartner ? 'partner' : 'user'} account.</p>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="margin: 0 0 15px 0; color: #856404;">⚠️ Security Notice</h3>
              <p style="margin: 0;">If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 30px 0; text-align: center; border: 2px solid #3d68ff;">
              <h3 style="margin: 0 0 15px 0; color: #3d68ff;">Your OTP Code</h3>
              <div style="font-size: 32px; font-weight: bold; color: #3d68ff; letter-spacing: 5px; font-family: 'Courier New', monospace; background: white; padding: 15px; border-radius: 8px; border: 2px dashed #3d68ff;">
                ${otpCode}
              </div>
              <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">This code expires in 15 minutes</p>
            </div>
            
            <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Instructions:</strong></p>
              <ol>
                <li>Copy the 6-digit OTP code above</li>
                <li>Return to the password reset page</li>
                <li>Enter the OTP code when prompted</li>
                <li>Create your new password</li>
              </ol>
            </div>
            
            <p style="color: #dc3545; font-weight: bold;">⏰ This OTP will expire in 15 minutes for security reasons.</p>
            
            <p>If you have trouble with the reset process, please contact our support team.</p>
            
            <p>Best regards,<br>${this.companyTeam} - Security</p>
          </div>
          
          
          <!-- German Version -->
          <div style="border: 2px solid #dc3545; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="background: #dc3545; color: white; padding: 10px; margin: -20px -20px 15px -20px; border-radius: 6px 6px 0 0;">
              <h3 style="margin: 0; text-align: center;">🇩🇪 DEUTSCH</h3>
            </div>
            <p>Liebe/r ${name},</p>
            ${companyName ? `<p>Unternehmen: <strong>${companyName}</strong></p>` : ''}
            
            <p>Sie haben eine Passwort-Zurücksetzung für Ihr ${this.companyName} ${isPartner ? 'Partner' : 'Benutzer'}-Konto angefordert.</p>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="margin: 0 0 15px 0; color: #856404;">⚠️ Sicherheitshinweis</h3>
              <p style="margin: 0;">Falls Sie diese Passwort-Zurücksetzung nicht angefordert haben, ignorieren Sie bitte diese E-Mail. Ihr Passwort bleibt unverändert.</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 30px 0; text-align: center; border: 2px solid #3d68ff;">
              <h3 style="margin: 0 0 15px 0; color: #3d68ff;">Ihr OTP-Code</h3>
              <div style="font-size: 32px; font-weight: bold; color: #3d68ff; letter-spacing: 5px; font-family: 'Courier New', monospace; background: white; padding: 15px; border-radius: 8px; border: 2px dashed #3d68ff;">
                ${otpCode}
              </div>
              <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">Dieser Code läuft in 15 Minuten ab</p>
            </div>
            
            <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Anweisungen:</strong></p>
              <ol>
                <li>Kopieren Sie den 6-stelligen OTP-Code oben</li>
                <li>Kehren Sie zur Passwort-Zurücksetzungsseite zurück</li>
                <li>Geben Sie den OTP-Code ein, wenn Sie dazu aufgefordert werden</li>
                <li>Erstellen Sie Ihr neues Passwort</li>
              </ol>
            </div>
            
            <p style="color: #dc3545; font-weight: bold;">⏰ Dieser OTP läuft aus Sicherheitsgründen in 15 Minuten ab.</p>
            
            <p>Bei Problemen mit dem Zurücksetzungsvorgang wenden Sie sich bitte an unser Support-Team.</p>
            
            <p>Mit freundlichen Grüßen,<br>${this.companyTeam} - Sicherheit</p>
          </div>
        </div>
        
        <div style="background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px;">
          This is an automated security message. Please do not reply to this email.<br>
          Dies ist eine automatisierte Sicherheitsnachricht. Bitte antworten Sie nicht auf diese E-Mail.
        </div>
      </div>
    `;
  }

  // Password Change Confirmation Email Template
  getPasswordChangeConfirmationTemplate(name, companyName, newPassword, isPartner, isGerman) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>Password Changed / Passwort geändert</h1>
        </div>
        
        <!-- Language Notice -->
        <div style="text-align: center; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">🔐 This password change confirmation is available in English and German below</p>
          <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 14px;">🔐 Diese Passwort-Änderungs-Bestätigung ist unten in englischer und deutscher Sprache verfügbar</p>
        </div>
        
        <script>
          function showLanguage(lang) {
            // Hide all language content
            document.getElementById('english-content').style.display = 'none';
            document.getElementById('german-content').style.display = 'none';
            
            // Reset button styles
            document.getElementById('btn-english').style.background = '#6c757d';
            document.getElementById('btn-english').style.fontWeight = 'normal';
            document.getElementById('btn-german').style.background = '#6c757d';
            document.getElementById('btn-german').style.fontWeight = 'normal';
            
            // Show selected language and highlight button
            if (lang === 'english') {
              document.getElementById('english-content').style.display = 'block';
              document.getElementById('btn-english').style.background = '#28a745';
              document.getElementById('btn-english').style.fontWeight = 'bold';
            } else {
              document.getElementById('german-content').style.display = 'block';
              document.getElementById('btn-german').style.background = '#28a745';
              document.getElementById('btn-german').style.fontWeight = 'bold';
            }
          }
          
          // Show default language
          window.onload = function() {
            showLanguage('${isGerman ? 'german' : 'english'}');
          }
        </script>
        
        <div style="padding: 20px;">
          <!-- English Version -->
          <div id="english-content" style="display: ${isGerman ? 'none' : 'block'};">
            <p>Dear ${name},</p>
            ${companyName ? `<p>Company: <strong>${companyName}</strong></p>` : ''}
            
            <p>Your password for your ${this.companyName} ${isPartner ? 'partner' : 'user'} account has been successfully changed.</p>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin: 0 0 10px 0; color: #155724;">✅ Password Updated Successfully</h3>
              <p style="margin: 0;">Your password change was completed at: <strong>${new Date().toLocaleString('en-GB')}</strong></p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
              <h3 style="margin: 0 0 15px 0; color: #495057;">🔑 Your New Password</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; border: 2px dashed #28a745; text-align: center;">
                <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #28a745;">${newPassword}</p>
              </div>
              <p style="margin: 15px 0 0 0; color: #6c757d; font-size: 14px;">Please save this password securely and consider changing it after your first login.</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Security Recommendations:</strong></p>
              <ul>
                <li>Change this password after your first login</li>
                <li>Use a strong, unique password</li>
                <li>Enable two-factor authentication if available</li>
                <li>Do not share your password with anyone</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}${isPartner ? '/partner/login' : '/login'}" 
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Your Account
              </a>
            </div>
            
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <p style="margin: 0; color: #721c24;"><strong>⚠️ Security Alert:</strong> If you did not request this password change, please contact our support team immediately.</p>
            </div>
            
            <p>Best regards,<br>${this.companyTeam} - Security</p>
          </div>
          
          <!-- German Version -->
          <div id="german-content" style="display: ${isGerman ? 'block' : 'none'};">
            <p>Liebe/r ${name},</p>
            ${companyName ? `<p>Unternehmen: <strong>${companyName}</strong></p>` : ''}
            
            <p>Ihr Passwort für Ihr ${this.companyName} ${isPartner ? 'Partner' : 'Benutzer'}-Konto wurde erfolgreich geändert.</p>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin: 0 0 10px 0; color: #155724;">✅ Passwort erfolgreich aktualisiert</h3>
              <p style="margin: 0;">Ihre Passwort-Änderung wurde abgeschlossen am: <strong>${new Date().toLocaleString('de-DE')}</strong></p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
              <h3 style="margin: 0 0 15px 0; color: #495057;">🔑 Ihr neues Passwort</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; border: 2px dashed #28a745; text-align: center;">
                <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #28a745;">${newPassword}</p>
              </div>
              <p style="margin: 15px 0 0 0; color: #6c757d; font-size: 14px;">Bitte speichern Sie dieses Passwort sicher und erwägen Sie, es nach Ihrer ersten Anmeldung zu ändern.</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Sicherheitsempfehlungen:</strong></p>
              <ul>
                <li>Ändern Sie dieses Passwort nach Ihrer ersten Anmeldung</li>
                <li>Verwenden Sie ein starkes, einzigartiges Passwort</li>
                <li>Aktivieren Sie die Zwei-Faktor-Authentifizierung, falls verfügbar</li>
                <li>Teilen Sie Ihr Passwort mit niemandem</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}${isPartner ? '/partner/login' : '/login'}" 
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Bei Ihrem Konto anmelden
              </a>
            </div>
            
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <p style="margin: 0; color: #721c24;"><strong>⚠️ Sicherheitswarnung:</strong> Falls Sie diese Passwort-Änderung nicht angefordert haben, kontaktieren Sie bitte sofort unser Support-Team.</p>
            </div>
            
            <p>Mit freundlichen Grüßen,<br>${this.companyTeam} - Sicherheit</p>
          </div>
        </div>
        
        <div style="background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px;">
          This is an automated security message. Please do not reply to this email.<br>
          Dies ist eine automatisierte Sicherheitsnachricht. Bitte antworten Sie nicht auf diese E-Mail.
        </div>
      </div>
    `;
  }
}

module.exports = new EmailService();