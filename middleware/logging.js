// Logging Middleware - Audit Trail
const Log = require('../models/Log');
const logger = require('../utils/logger');
const ActivityLogger = require('../services/activityLogger');

// Create audit log entry
const createAuditLog = (action, serviceType = 'system') => {
  return async (req, res, next) => {
    try {
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to capture response
      res.json = function(data) {
        // Create log after successful response
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setImmediate(async () => {
            try {
              await Log.createLog({
                actor: {
                  type: req.user?.role || 'system',
                  id: req.user?.id || null,
                  name: req.user?.name || 'System',
                  email: req.user?.email || null
                },
                action,
                serviceType,
                leadId: req.params.leadId || req.body.leadId || null,
                partnerId: req.params.partnerId || req.body.partnerId || null,
                status: 'success',
                message: `${action.replace('_', ' ')} completed successfully`,
                details: {
                  method: req.method,
                  url: req.originalUrl,
                  body: req.method !== 'GET' ? req.body : undefined,
                  params: req.params,
                  query: req.query
                },
                metadata: {
                  ipAddress: req.ip,
                  userAgent: req.get('User-Agent'),
                  domain: req.get('host'),
                  requestId: req.headers['x-request-id']
                }
              });
            } catch (logError) {
              logger.error('Failed to create audit log:', logError);
            }
          });
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Logging middleware error:', error);
      next();
    }
  };
};

// Log failed actions
const logError = async (action, error, req, additionalData = {}) => {
  try {
    // Handle cases where error might be null or undefined
    const safeError = error || { message: 'Unknown error', stack: 'No stack trace available' };
    
    await Log.createLog({
      actor: {
        type: req.user?.role || 'system',
        id: req.user?.id || null,
        name: req.user?.name || 'System',
        email: req.user?.email || null
      },
      action,
      serviceType: additionalData.serviceType || 'system',
      leadId: additionalData.leadId || null,
      partnerId: additionalData.partnerId || null,
      status: 'failed',
      message: `${action.replace('_', ' ')} failed: ${safeError.message}`,
      details: {
        method: req.method,
        url: req.originalUrl,
        ...additionalData
      },
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        domain: req.get('host'),
        requestId: req.headers['x-request-id']
      },
      error: {
        message: safeError.message,
        stack: safeError.stack,
        code: safeError.code || null
      }
    });
  } catch (logError) {
    logger.error('Failed to log error:', logError);
  }
};

// Enhanced logging helper for controllers
const logActivity = async (actorType, actor, action, details = {}, req = null, status = 'success', error = null) => {
  try {
    switch (actorType) {
      case 'partner':
        return await ActivityLogger.logPartnerActivity(actor, action, { ...details, status }, req);
      case 'superadmin':
        return await ActivityLogger.logSuperadminActivity(actor, action, { ...details, status }, req);
      case 'user':
        return await ActivityLogger.logUserActivity(actor, action, { ...details, status }, req);
      case 'system':
        return await ActivityLogger.logSystemActivity(action, { ...details, status, error }, req);
      default:
        return await ActivityLogger.logActivity({
          actorType,
          actorId: actor?._id || actor?.id,
          actorName: actor?.name || actor?.companyName || 'Unknown',
          actorEmail: actor?.email,
          action,
          status,
          message: `${actorType} performed ${action}`,
          details,
          error,
          req
        });
    }
  } catch (logError) {
    logger.error('Failed to log activity:', logError);
  }
};

module.exports = {
  createAuditLog,
  logError,
  logActivity,
  ActivityLogger
};