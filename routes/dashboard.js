// Dashboard Routes - MVC Architecture
const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin, requirePartnerOrAdmin } = require('../middleware/auth');
const { getSuperadminDashboard, getPartnerDashboard } = require('../controllers/dashboardController');

// @route   GET /api/dashboard/superadmin
// @desc    Get Superadmin dashboard data
// @access  Private (Superadmin)
router.get('/superadmin', authenticateToken, requireSuperadmin, getSuperadminDashboard);

// @route   GET /api/dashboard/partner/:partnerId
// @desc    Get Partner dashboard data
// @access  Private (Partner/Superadmin)
router.get('/partner/:partnerId', authenticateToken, requirePartnerOrAdmin, getPartnerDashboard);

module.exports = router;