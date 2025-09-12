// Lead Routes - Dynamic Lead Management
const express = require('express');
const router = express.Router();
const {
  createLead,
  getAllLeads,
  getPartnerLeads,
  getLeadById,
  getAvailablePartners,
  assignLead,
  acceptLead,
  requestCancellation,
  rejectLead,
  getLeadStats,
  updateLeadStatus,
  exportLeadsToExcel,
  exportLeadsToPDF
} = require('../controllers/leadController');
const {
  validateLeadForm,
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');
const { sanitizeInput, validateLeadData } = require('../middleware/sanitization');
const {
  authenticateToken,
  requireSuperadmin,
  requirePartnerOrAdmin,
  requireOwnershipOrAdmin
} = require('../middleware/auth');
const { createAuditLog } = require('../middleware/logging');

// @route   POST /api/leads/create
// @desc    Create new lead from user form
// @access  Public
router.post('/create', 
  sanitizeInput,
  validateLeadData,
  handleValidationErrors, 
  createAuditLog('lead_created'), 
  createLead
);

// @route   GET /api/leads/stats
// @desc    Get leads statistics
// @access  Private (Superadmin/Partner)
router.get('/stats', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  getLeadStats
);

// @route   GET /api/leads
// @desc    Get all leads (Superadmin) or partner leads (Partner)
// @access  Private (Superadmin/Partner)
router.get('/', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  validatePagination, 
  handleValidationErrors, 
  getAllLeads
);

// @route   GET /api/leads/export/xlsx
// @desc    Export leads to Excel format
// @access  Private (Superadmin)
router.get('/export/xlsx', 
  authenticateToken, 
  requireSuperadmin, 
  createAuditLog('data_exported'), 
  exportLeadsToExcel
);

// @route   GET /api/leads/export/pdf
// @desc    Export leads to PDF format
// @access  Private (Superadmin)
router.get('/export/pdf', 
  authenticateToken, 
  requireSuperadmin, 
  createAuditLog('data_exported'), 
  exportLeadsToPDF
);

// @route   GET /api/leads/:leadId
// @desc    Get lead by ID
// @access  Private (Superadmin/Partner)
router.get('/:leadId', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  validateObjectId('leadId'), 
  handleValidationErrors, 
  getLeadById
);

// @route   GET /api/leads/partner/:partnerId
// @desc    Get leads assigned to partner
// @access  Private (Partner/Superadmin)
router.get('/partner/:partnerId', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  validateObjectId('partnerId'), 
  validatePagination, 
  handleValidationErrors, 
  requireOwnershipOrAdmin('partnerId'), 
  getPartnerLeads
);

// @route   GET /api/leads/:leadId/available-partners
// @desc    Get available partners for lead assignment
// @access  Private (Superadmin)
router.get('/:leadId/available-partners', 
  authenticateToken, 
  requireSuperadmin, 
  validateObjectId('leadId'), 
  handleValidationErrors, 
  getAvailablePartners
);

// @route   PUT /api/leads/:leadId/assign
// @desc    Assign lead to partner
// @access  Private (Superadmin)
router.put('/:leadId/assign', 
  authenticateToken, 
  requireSuperadmin, 
  validateObjectId('leadId'), 
  handleValidationErrors, 
  createAuditLog('lead_assigned'), 
  assignLead
);

// @route   PUT /api/leads/:leadId/accept
// @desc    Accept lead (Partner)
// @access  Private (Partner)
router.put('/:leadId/accept', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  validateObjectId('leadId'), 
  handleValidationErrors, 
  createAuditLog('lead_accepted'), 
  acceptLead
);

// @route   PUT /api/leads/:leadId/cancel
// @desc    Request lead cancellation
// @access  Public (User) or Private (Partner)
router.put('/:leadId/cancel', 
  validateObjectId('leadId'), 
  handleValidationErrors, 
  createAuditLog('cancellation_requested'), 
  requestCancellation
);

// @route   POST /api/leads/:leadId/reject
// @desc    Reject lead by partner
// @access  Private (Partner)
router.post('/:leadId/reject', 
  authenticateToken,
  requirePartnerOrAdmin,
  validateObjectId('leadId'), 
  handleValidationErrors, 
  createAuditLog('lead_rejected'), 
  rejectLead
);

// @route   POST /api/leads
// @desc    Alias for create lead (backward compatibility)
// @access  Public
router.post('/', 
  sanitizeInput,
  validateLeadData,
  handleValidationErrors, 
  createAuditLog('lead_created'), 
  createLead
);

// @route   PATCH /api/leads/:leadId/status
// @desc    Update lead status
// @access  Private (Superadmin/Partner)
router.patch('/:leadId/status', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  validateObjectId('leadId'), 
  handleValidationErrors, 
  createAuditLog('lead_status_updated'), 
  updateLeadStatus
);

module.exports = router;