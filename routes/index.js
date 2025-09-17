const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const leadRoutes = require('./leads');
const partnerRoutes = require('./partners');
const serviceRoutes = require('./services');
const dashboardRoutes = require('./dashboard');
const logRoutes = require('./logs');
const invoiceRoutes = require('./invoices');
const revenueRoutes = require('./revenue');
const settingsRoutes = require('./settings');
const notificationRoutes = require('./notifications');
const cancelRequestRoutes = require('./cancelRequests');

// Define API routes
router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/partners', partnerRoutes);
router.use('/services', serviceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/logs', logRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/revenue', revenueRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/cancel-requests', cancelRequestRoutes);

// API health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Leadform CRM API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;