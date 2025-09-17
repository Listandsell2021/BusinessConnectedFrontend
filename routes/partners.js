// Partner Routes - Partner Management
const express = require('express');
const router = express.Router();
const {
  getAllPartners,
  getPartner,
  getPartnerById,
  updatePartner,
  updatePartnerStatus,
  updatePartnerServiceStatus,
  updatePartnerType,
  getPartnerMetrics,
  createPartner,
  getPartnerLeads,
  acceptLead,
  cancelLeadBeforeAccept,
  cancelLeadAfterAccept,
  migrateCleaningServiceData,
  cleanupCleaningPreferences
} = require('../controllers/partnerController');
const {
  validatePartner,
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');
const {
  authenticateToken,
  requireSuperadmin,
  requirePartnerOrAdmin,
  requireOwnershipOrAdmin
} = require('../middleware/auth');
const { createAuditLog } = require('../middleware/logging');

// @route   GET /api/partners/search
// @desc    Search active partners for assignment (Available to all authenticated users)
// @access  Private (All authenticated users)
router.get('/search', 
  authenticateToken, 
  getAllPartners
);

// @route   GET /api/partners
// @desc    Get all partners (Superadmin)
// @access  Private (Superadmin)
router.get('/', 
  authenticateToken, 
  requireSuperadmin, 
  validatePagination, 
  handleValidationErrors, 
  getAllPartners
);

// @route   POST /api/partners
// @desc    Create new partner (Superadmin)
// @access  Private (Superadmin)
router.post('/', 
  authenticateToken, 
  requireSuperadmin, 
  validatePartner, 
  handleValidationErrors, 
  createAuditLog('partner_created'), 
  createPartner
);

// @route   GET /api/partners/:partnerId
// @desc    Get partner by ID
// @access  Private (Partner/Superadmin)
router.get('/:partnerId', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  validateObjectId('partnerId'), 
  handleValidationErrors, 
  requireOwnershipOrAdmin('partnerId'), 
  getPartnerById
);

// @route   PUT /api/partners/:partnerId
// @desc    Update partner information
// @access  Private (Partner/Superadmin)
router.put('/:partnerId', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  validateObjectId('partnerId'), 
  handleValidationErrors, 
  requireOwnershipOrAdmin('partnerId'), 
  createAuditLog('partner_updated'), 
  updatePartner
);

// @route   PUT /api/partners/:partnerId/services/:serviceType/status
// @desc    Approve/Reject specific service for partner
// @access  Private (Superadmin)
router.put('/:partnerId/services/:serviceType/status', 
  authenticateToken, 
  requireSuperadmin, 
  validateObjectId('partnerId'), 
  handleValidationErrors, 
  createAuditLog('partner_service_status_updated'), 
  updatePartnerServiceStatus
);

// @route   PUT /api/partners/:partnerId/status
// @desc    Approve/Reject all services for partner (legacy)
// @access  Private (Superadmin)
router.put('/:partnerId/status', 
  authenticateToken, 
  requireSuperadmin, 
  validateObjectId('partnerId'), 
  handleValidationErrors, 
  createAuditLog('partner_status_updated'), 
  updatePartnerStatus
);

// @route   PUT /api/partners/:partnerId/type
// @desc    Update partner type (Basic/Exclusive)
// @access  Private (Superadmin)
router.put('/:partnerId/type', 
  authenticateToken, 
  requireSuperadmin, 
  validateObjectId('partnerId'), 
  handleValidationErrors, 
  createAuditLog('partner_type_updated'), 
  updatePartnerType
);


// @route   GET /api/partners/:partnerId/metrics
// @desc    Get partner performance metrics
// @access  Private (Partner/Superadmin)
router.get('/:partnerId/metrics', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  validateObjectId('partnerId'), 
  handleValidationErrors, 
  requireOwnershipOrAdmin('partnerId'), 
  getPartnerMetrics
);

// @route   GET /api/partners/:partnerId/leads
// @desc    Get leads assigned to specific partner
// @access  Private (Partner/Superadmin)
router.get('/:partnerId/leads', 
  authenticateToken, 
  requirePartnerOrAdmin, 
  validateObjectId('partnerId'), 
  handleValidationErrors, 
  requireOwnershipOrAdmin('partnerId'), 
  validatePagination,
  getPartnerLeads
);

// @route   PUT /api/partners/:partnerId/leads/:leadId/accept
// @desc    Accept a lead assignment
// @access  Private (Partner)
router.put('/:partnerId/leads/:leadId/accept',
  authenticateToken,
  requirePartnerOrAdmin,
  validateObjectId('partnerId'),
  validateObjectId('leadId'),
  handleValidationErrors,
  requireOwnershipOrAdmin('partnerId'),
  createAuditLog('partner_lead_accepted'),
  acceptLead
);

// @route   PUT /api/partners/:partnerId/leads/:leadId/cancel-before-accept
// @desc    Cancel a lead before accepting (immediate rejection)
// @access  Private (Partner)
router.put('/:partnerId/leads/:leadId/cancel-before-accept',
  authenticateToken,
  requirePartnerOrAdmin,
  validateObjectId('partnerId'),
  validateObjectId('leadId'),
  handleValidationErrors,
  requireOwnershipOrAdmin('partnerId'),
  createAuditLog('partner_lead_rejected'),
  cancelLeadBeforeAccept
);

// @route   PUT /api/partners/:partnerId/leads/:leadId/cancel-after-accept
// @desc    Request cancellation of an accepted lead
// @access  Private (Partner)
router.put('/:partnerId/leads/:leadId/cancel-after-accept',
  authenticateToken,
  requirePartnerOrAdmin,
  validateObjectId('partnerId'),
  validateObjectId('leadId'),
  handleValidationErrors,
  requireOwnershipOrAdmin('partnerId'),
  createAuditLog('partner_lead_cancel_requested'),
  cancelLeadAfterAccept
);

// @route   POST /api/partners/migrate-cleaning-data
// @desc    Migrate cleaning service data to new serviceArea format (Admin only)
// @access  Private (SuperAdmin)
router.post('/migrate-cleaning-data',
  authenticateToken,
  requireSuperadmin,
  createAuditLog('migrate_cleaning_data'),
  migrateCleaningServiceData
);

// @route   POST /api/partners/cleanup-cleaning-preferences
// @desc    Remove legacy keys from cleaning service preferences (Admin only)
// @access  Private (SuperAdmin)
router.post('/cleanup-cleaning-preferences',
  authenticateToken,
  requireSuperadmin,
  createAuditLog('cleanup_cleaning_preferences'),
  cleanupCleaningPreferences
);

module.exports = router;