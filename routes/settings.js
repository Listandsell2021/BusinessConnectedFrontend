const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const AdminLog = require('../models/AdminLog');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// @route   GET /api/settings
// @desc    Get system settings
// @access  Private (SuperAdmin only)
router.get('/', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    // Role check is handled by requireSuperadmin middleware

    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching settings'
    });
  }
});

// @route   PUT /api/settings
// @desc    Update system settings
// @access  Private (SuperAdmin only)
router.put('/',
  authenticateToken,
  requireSuperadmin,
  [
    body('pricing.moving.basic.perLeadPrice')
      .optional()
      .isFloat({ min: 1 })
      .withMessage('Moving basic per-lead price must be at least 1'),
    body('pricing.moving.exclusive.perLeadPrice')
      .optional()
      .isFloat({ min: 1 })
      .withMessage('Moving exclusive per-lead price must be at least 1'),
    body('pricing.cleaning.basic.perLeadPrice')
      .optional()
      .isFloat({ min: 1 })
      .withMessage('Cleaning basic per-lead price must be at least 1'),
    body('pricing.cleaning.exclusive.perLeadPrice')
      .optional()
      .isFloat({ min: 1 })
      .withMessage('Cleaning exclusive per-lead price must be at least 1'),
    body('leadDistribution.moving.basic.leadsPerWeek')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Moving basic leads per week must be between 1 and 50'),
    body('leadDistribution.moving.exclusive.leadsPerWeek')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Moving exclusive leads per week must be between 1 and 50'),
    body('leadDistribution.cleaning.basic.leadsPerWeek')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Cleaning basic leads per week must be between 1 and 50'),
    body('leadDistribution.cleaning.exclusive.leadsPerWeek')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Cleaning exclusive leads per week must be between 1 and 50'),
    body('system.currency')
      .optional()
      .isIn(['EUR', 'USD', 'GBP'])
      .withMessage('Currency must be EUR, USD, or GBP'),
    body('system.taxRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Tax rate must be between 0 and 100'),
    body('system.leadAssignmentMethod')
      .optional()
      .isIn(['round_robin', 'nearest', 'random'])
      .withMessage('Invalid lead assignment method'),
    body('system.autoAcceptTimeout')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('Auto accept timeout must be between 1 and 168 hours'),
    body('system.basicPartnerLeadLimit')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Basic partner lead limit must be between 1 and 10'),
    body('system.cancellationTimeLimit')
      .optional()
      .isInt({ min: 1, max: 72 })
      .withMessage('Cancellation time limit must be between 1 and 72 hours')
  ],
  async (req, res) => {
    try {
      // Role check is handled by requireSuperadmin middleware

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Get current settings and store old values for logging
      const settings = await Settings.getSettings();
      const oldSettings = JSON.parse(JSON.stringify(settings)); // Deep clone for comparison
      
      // Update fields if provided
      const updateData = { ...req.body };
      updateData.lastModifiedBy = req.user.id;

      // Merge the updates with existing settings
      Object.keys(updateData).forEach(key => {
        if (key === 'pricing' && updateData[key]) {
          // Deep merge pricing structure
          settings.pricing = {
            ...settings.pricing,
            moving: {
              ...settings.pricing.moving,
              ...updateData[key].moving
            },
            cleaning: {
              ...settings.pricing.cleaning,
              ...updateData[key].cleaning
            }
          };
        } else if (key === 'leadDistribution' && updateData[key]) {
          // Deep merge lead distribution structure  
          settings.leadDistribution = {
            ...settings.leadDistribution,
            moving: {
              ...settings.leadDistribution.moving,
              ...updateData[key].moving
            },
            cleaning: {
              ...settings.leadDistribution.cleaning,
              ...updateData[key].cleaning
            }
          };
        } else if (key === 'system' && updateData[key]) {
          settings.system = { ...settings.system, ...updateData[key] };
        } else if (key === 'email' && updateData[key]) {
          settings.email = { ...settings.email, ...updateData[key] };
        } else {
          settings[key] = updateData[key];
        }
      });

      await settings.save();

      // Log the admin action with detailed information
      const changedFields = [];
      const logDetails = {};
      
      // Determine what was changed for detailed logging
      if (updateData.pricing) {
        changedFields.push('pricing');
        logDetails.pricingChanges = updateData.pricing;
      }
      if (updateData.leadDistribution) {
        changedFields.push('leadDistribution');
        logDetails.leadDistributionChanges = updateData.leadDistribution;
      }
      if (updateData.system) {
        changedFields.push('system');
        logDetails.systemChanges = updateData.system;
      }
      if (updateData.email) {
        changedFields.push('email');
        logDetails.emailChanges = updateData.email;
      }

      // Log the action
      await AdminLog.logAction(req.user, 'SETTINGS_UPDATED', 'SETTINGS', {
        details: {
          changedFields,
          changes: logDetails,
          totalFieldsChanged: changedFields.length
        },
        oldValues: {
          pricing: oldSettings.pricing,
          leadDistribution: oldSettings.leadDistribution,
          system: oldSettings.system,
          email: oldSettings.email
        },
        newValues: {
          pricing: settings.pricing,
          leadDistribution: settings.leadDistribution,
          system: settings.system,
          email: settings.email
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      logger.info(`Settings updated by admin ${req.user.email} (ID: ${req.user.id})`, { 
        userId: req.user.id,
        adminEmail: req.user.email,
        updatedFields: changedFields,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: settings
      });
    } catch (error) {
      logger.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating settings'
      });
    }
  }
);

// @route   GET /api/settings/pricing
// @desc    Get only pricing settings (for partners)
// @access  Private
router.get('/pricing', authenticateToken, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      data: {
        pricing: settings.pricing,
        currency: settings.system.currency
      }
    });
  } catch (error) {
    logger.error('Error fetching pricing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pricing settings'
    });
  }
});

module.exports = router;