// Invoice Routes - Income & Billing Management
const express = require('express');
const router = express.Router();
const {
  getAllInvoices,
  getPartnerInvoices,
  generateInvoice,
  generateBulkInvoices,
  getBillingReadyPartners,
  getIncomeSummary,
  updateInvoiceStatus,
  getInvoiceById,
  getRevenueSummary,
  downloadInvoice
} = require('../controllers/invoiceController');
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
const { createAuditLog } = require('../middleware/logging');

// @route   GET /api/invoices
// @desc    Get all invoices (Superadmin)
// @access  Private (Superadmin)
router.get('/', 
  authenticateToken, 
  requireSuperadmin, 
  validatePagination, 
  handleValidationErrors,
  getAllInvoices
);

// @route   GET /api/invoices/partner/:partnerId// @desc    Get partner invoice// @access  Private (Partner/Superadmin)
router.get('/partner/:partnerId', authenticateToken, requirePartnerOrAdmin,validateObjectId('partnerId'), 
  validatePagination, handleValidationErrors,getPartnerInvoices);

// @route   POST /api/invoices/generate// @desc    Generate invoice for partner// @access  Private (Superadmin)
router.post('/generate', authenticateToken, requireSuperadmin, createAuditLog('invoice_generated'),generateInvoice);

// @route   PUT /api/invoices/:invoiceId/statu// @desc    Update invoice status// @access  Private (Superadmin)
router.put('/:invoiceId/status', authenticateToken, requireSuperadmin,validateObjectId('invoiceId'), 
  handleValidationErrors, createAuditLog('invoice_status_updated'),updateInvoiceStatus);

// @route   GET /api/invoices/:invoiceId// @desc    Get invoice by ID// @access  Private (Partner/Superadmin)
router.get('/:invoiceId', authenticateToken, requirePartnerOrAdmin,validateObjectId('invoiceId'), 
  handleValidationErrors,getInvoiceById);

// @route   GET /api/invoices/revenue/summary// @desc    Get revenue summary// @access  Private (Superadmin)
router.get('/revenue/summary', authenticateToken, requireSuperadmin,getRevenueSummary);

// @route   POST /api/invoices/generate-bulk
// @desc    Generate invoices for all eligible partners
// @access  Private (Superadmin)
router.post('/generate-bulk',
  authenticateToken,
  requireSuperadmin,
  createAuditLog('bulk_invoices_generated'),
  generateBulkInvoices
);

// @route   GET /api/invoices/billing-ready
// @desc    Get billing-ready partners for a period
// @access  Private (Superadmin)
router.get('/billing-ready',
  authenticateToken,
  requireSuperadmin,
  getBillingReadyPartners
);

// @route   GET /api/invoices/income-summary
// @desc    Get income summary for a period
// @access  Private (Superadmin)
router.get('/income-summary',
  authenticateToken,
  requireSuperadmin,
  getIncomeSummary
);

// @route   GET /api/invoices/:invoiceId/download
// @desc    Download invoice PDF
// @access  Private (Partner/Superadmin)
router.get('/:invoiceId/download',
  authenticateToken,
  requirePartnerOrAdmin,
  validateObjectId('invoiceId'),
  handleValidationErrors,
  createAuditLog('invoice_downloaded'),
  downloadInvoice
);

module.exports = router;