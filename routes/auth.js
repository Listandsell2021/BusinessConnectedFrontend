// Authentication Routes - MVC Architecture
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  login,
  registerPartner,
  refreshToken,
  logout,
  getProfile,
  forgotPassword,
  verifyOTP,
  resetPassword,
  partnerPasswordReset
} = require('../controllers/authController');
const {
  validateLogin,
  validatePartner,
  handleValidationErrors
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { createAuditLog } = require('../middleware/logging');

// @route   POST /api/auth/login // @desc    Login user (Partner/Superadmin) // @access  Public
router.post('/login', validateLogin, handleValidationErrors, createAuditLog('login_success'), login);

// @route   POST /api/auth/register-partner // @desc    Register new partner // @access  Public
router.post('/register-partner', validatePartner, handleValidationErrors, createAuditLog('partner_registration'), registerPartner);

// @route   POST /api/auth/refresh// @desc    Refresh access token// @access  Public
router.post('/refresh', refreshToken);

// @route   POST /api/auth/logout// @desc    Logout user// @access  Private
router.post('/logout', authenticateToken, createAuditLog('logout'), logout);

// @route   GET /api/auth/profile// @desc    Get current user profile// @access  Private
router.get('/profile', authenticateToken, getProfile);

// @route   POST /api/auth/forgot-password
// @desc    Request password reset with OTP
// @access  Public
router.post('/forgot-password', 
  [body('email').isEmail().normalizeEmail()],
  handleValidationErrors,
  forgotPassword
);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post('/verify-otp',
  [
    body('otpId').notEmpty().withMessage('OTP ID is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  handleValidationErrors,
  verifyOTP
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with verified OTP
// @access  Public
router.post('/reset-password',
  [
    body('resetToken').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  ],
  handleValidationErrors,
  resetPassword
);

// @route   POST /api/auth/partner/reset-password
// @desc    Partner password reset from settings portal
// @access  Private (Partners only)
router.post('/partner/reset-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
  ],
  handleValidationErrors,
  createAuditLog('password_reset'),
  partnerPasswordReset
);

module.exports = router;