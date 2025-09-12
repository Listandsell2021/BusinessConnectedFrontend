// Logs Routes - Audit Trail Management
const express = require('express');
const router = express.Router();
const {
  getAllLogs,
  getPartnerLogs,
  getLeadTimeline,
  getLogAnalytics,
  exportLogs
} = require('../controllers/logController');
const {
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');
const {
  authenticateToken,
  requireSuperadmin,
  requirePartnerOrAdmin
} = require('../middleware/auth');

// @route   GET /api/logs// @desc    Get system logs (Superadmin)// @access  Private (Superadmin)
router.get('/', authenticateToken, requireSuperadmin, validatePagination, 
  handleValidationErrors, getAllLogs);

// @route   GET /api/logs/partner/:partnerId// @desc    Get partner-specific logs// @access  Private (Partner/Superadmin)
router.get('/partner/:partnerId', authenticateToken, requirePartnerOrAdmin,validateObjectId('partnerId'), 
  validatePagination, handleValidationErrors,getPartnerLogs);

// @route   GET /api/logs/lead/:leadId// @desc    Get lead timeline/history// @access  Private (Superadmin)
router.get('/lead/:leadId', authenticateToken, requireSuperadmin,validateObjectId('leadId'), 
  handleValidationErrors,getLeadTimeline);

// @route   GET /api/logs/analytics// @desc    Get log analytics/summary// @access  Private (Superadmin)
router.get('/analytics', authenticateToken, requireSuperadmin,getLogAnalytics);

// @route   GET /api/logs/export/:format// @desc    Export logs to various formats (json/csv)// @access  Private (Superadmin)
router.get('/export/:format', authenticateToken, requireSuperadmin, exportLogs);

module.exports = router;