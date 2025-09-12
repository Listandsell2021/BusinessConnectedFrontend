const express = require('express');
const router = express.Router();
const {
  getAllRevenue,
  getPartnerRevenue,
  createRevenue,
  updateRevenueStatus,
  getRevenueAnalytics,
  exportRevenue
} = require('../controllers/revenueController');

const { authenticateToken, requireSuperadmin } = require('../middleware/auth');

// @route   GET /api/revenue
// @desc    Get all revenue (Superadmin only)
// @access  Private (Superadmin)
router.get('/', authenticateToken, requireSuperadmin, getAllRevenue);

// @route   GET /api/revenue/analytics
// @desc    Get revenue analytics
// @access  Private (Superadmin)
router.get('/analytics', authenticateToken, requireSuperadmin, getRevenueAnalytics);

// @route   GET /api/revenue/export
// @desc    Export revenue data
// @access  Private (Superadmin)
router.get('/export', authenticateToken, requireSuperadmin, exportRevenue);

// @route   GET /api/revenue/partner/:partnerId
// @desc    Get partner revenue
// @access  Private (Partner/Superadmin)
router.get('/partner/:partnerId', authenticateToken, getPartnerRevenue);

// @route   POST /api/revenue
// @desc    Create revenue entry
// @access  Private (Superadmin)
router.post('/', authenticateToken, requireSuperadmin, createRevenue);

// @route   PUT /api/revenue/:revenueId/status
// @desc    Update revenue status
// @access  Private (Superadmin)
router.put('/:revenueId/status', authenticateToken, requireSuperadmin, updateRevenueStatus);

module.exports = router;