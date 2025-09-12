// Activity Logger Service - Comprehensive Logging for Partners and Superadmins
const Log = require('../models/Log');
const logger = require('../utils/logger');

class ActivityLogger {
  // Create a structured log entry
  static async logActivity({
    actorType,
    actorId,
    actorName,
    actorEmail,
    action,
    serviceType = 'system',
    leadId = null,
    partnerId = null,
    status = 'success',
    message,
    details = {},
    metadata = {},
    error = null,
    req = null
  }) {
    try {
      // Extract request metadata if req object is provided
      if (req) {
        metadata = {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          domain: req.get('host'),
          requestId: req.headers['x-request-id'],
          method: req.method,
          url: req.originalUrl,
          ...metadata
        };

        // Add request details if available
        if (req.params && Object.keys(req.params).length > 0) {
          details.params = req.params;
        }
        if (req.query && Object.keys(req.query).length > 0) {
          details.query = req.query;
        }
        if (req.body && Object.keys(req.body).length > 0 && req.method !== 'GET') {
          // Filter out sensitive data
          const filteredBody = { ...req.body };
          delete filteredBody.password;
          delete filteredBody.token;
          delete filteredBody.apiKey;
          details.body = filteredBody;
        }
      }

      const logEntry = await Log.createLog({
        actor: {
          type: actorType,
          id: actorId,
          name: actorName,
          email: actorEmail
        },
        action,
        serviceType,
        leadId,
        partnerId,
        status,
        message,
        details,
        metadata,
        error: error ? {
          message: error.message || error,
          stack: error.stack,
          code: error.code || error.statusCode
        } : null
      });

      // Also log to winston for file/console output
      const logLevel = status === 'failed' ? 'error' : 'info';
      logger[logLevel](`${actorType.toUpperCase()}: ${message}`, {
        action,
        actorId,
        leadId,
        partnerId,
        error: error?.message
      });

      return logEntry;
    } catch (logError) {
      logger.error('Failed to create activity log:', logError);
      throw logError;
    }
  }

  // Partner activity logging methods
  static async logPartnerActivity(partner, action, details = {}, req = null) {
    const messages = {
      'partner_dashboard_accessed': `Partner ${partner.companyName} accessed dashboard`,
      'partner_lead_viewed': `Partner ${partner.companyName} viewed lead ${details.leadId}`,
      'partner_lead_accepted': `Partner ${partner.companyName} accepted lead ${details.leadId}`,
      'partner_lead_rejected': `Partner ${partner.companyName} rejected lead ${details.leadId}`,
      'partner_lead_contacted': `Partner ${partner.companyName} contacted lead ${details.leadId}`,
      'partner_profile_updated': `Partner ${partner.companyName} updated profile`,
      'partner_invoice_downloaded': `Partner ${partner.companyName} downloaded invoice ${details.invoiceId}`,
      'settings_updated': `Partner ${partner.companyName} updated settings`,
      'login_success': `Partner ${partner.companyName} logged in successfully`,
      'login_failed': `Failed login attempt for partner ${partner.companyName}`,
      'logout': `Partner ${partner.companyName} logged out`
    };

    return this.logActivity({
      actorType: 'partner',
      actorId: partner._id || partner.id,
      actorName: partner.companyName,
      actorEmail: partner.contactPerson?.email || partner.email,
      action,
      serviceType: details.serviceType || 'system',
      leadId: details.leadId,
      partnerId: partner._id || partner.id,
      status: details.status || 'success',
      message: messages[action] || `Partner ${partner.companyName} performed ${action}`,
      details: {
        ...details,
        partnerType: partner.partnerType,
        partnerStatus: partner.status
      },
      req
    });
  }

  // Superadmin activity logging methods
  static async logSuperadminActivity(admin, action, details = {}, req = null) {
    const messages = {
      'partner_created': `Superadmin created new partner: ${details.partnerName}`,
      'partner_updated': `Superadmin updated partner: ${details.partnerName}`,
      'partner_approved': `Superadmin approved partner: ${details.partnerName}`,
      'partner_rejected': `Superadmin rejected partner: ${details.partnerName}`,
      'partner_deleted': `Superadmin deleted partner: ${details.partnerName}`,
      'lead_assigned': `Superadmin assigned lead ${details.leadId} to partner ${details.partnerName}`,
      'lead_reassigned': `Superadmin reassigned lead ${details.leadId} from ${details.fromPartner} to ${details.toPartner}`,
      'user_created': `Superadmin created new user: ${details.userName}`,
      'user_updated': `Superadmin updated user: ${details.userName}`,
      'user_deleted': `Superadmin deleted user: ${details.userName}`,
      'user_role_changed': `Superadmin changed role for user ${details.userName} from ${details.oldRole} to ${details.newRole}`,
      'invoice_generated': `Superadmin generated invoice for partner ${details.partnerName}`,
      'data_exported': `Superadmin exported ${details.exportType} data`,
      'system_settings_updated': `Superadmin updated system settings`,
      'service_config_updated': `Superadmin updated service configuration for ${details.serviceType}`,
      'login_success': `Superadmin ${admin.name || admin.email} logged in successfully`,
      'login_failed': `Failed login attempt for superadmin ${admin.email}`,
      'logout': `Superadmin ${admin.name || admin.email} logged out`
    };

    return this.logActivity({
      actorType: 'superadmin',
      actorId: admin._id || admin.id,
      actorName: admin.name || admin.firstName + ' ' + admin.lastName,
      actorEmail: admin.email,
      action,
      serviceType: details.serviceType || 'system',
      leadId: details.leadId,
      partnerId: details.partnerId,
      status: details.status || 'success',
      message: messages[action] || `Superadmin performed ${action}`,
      details,
      req
    });
  }

  // User activity logging methods
  static async logUserActivity(user, action, details = {}, req = null) {
    const messages = {
      'lead_created': `User ${user.firstName} ${user.lastName} created lead for ${details.serviceType}`,
      'cancellation_requested': `User ${user.firstName} ${user.lastName} requested cancellation for lead ${details.leadId}`,
      'user_registration': `New user registered: ${user.firstName} ${user.lastName}`,
      'user_profile_updated': `User ${user.firstName} ${user.lastName} updated profile`,
      'login_success': `User ${user.firstName} ${user.lastName} logged in successfully`,
      'login_failed': `Failed login attempt for user ${user.email}`
    };

    return this.logActivity({
      actorType: 'user',
      actorId: user._id || user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      actorEmail: user.email,
      action,
      serviceType: details.serviceType || 'system',
      leadId: details.leadId,
      status: details.status || 'success',
      message: messages[action] || `User performed ${action}`,
      details,
      req
    });
  }

  // System activity logging
  static async logSystemActivity(action, details = {}, req = null) {
    const messages = {
      'scheduled_job': `Scheduled job executed: ${details.jobName}`,
      'email_sent': `Email sent to ${details.recipient}: ${details.subject}`,
      'email_failed': `Failed to send email to ${details.recipient}: ${details.error}`,
      'webhook_received': `Webhook received from ${details.source}`,
      'webhook_failed': `Webhook processing failed: ${details.error}`,
      'error_logged': `System error occurred: ${details.error}`,
      'security_alert': `Security alert: ${details.alertType}`,
      'suspicious_activity_detected': `Suspicious activity detected: ${details.activity}`,
      'rate_limit_exceeded': `Rate limit exceeded for ${details.identifier}`,
      'database_cleanup': `Database cleanup completed: ${details.recordsProcessed} records`,
      'system_backup_created': `System backup created: ${details.backupSize}`
    };

    return this.logActivity({
      actorType: 'system',
      actorId: null,
      actorName: 'System',
      actorEmail: null,
      action,
      serviceType: details.serviceType || 'system',
      leadId: details.leadId,
      partnerId: details.partnerId,
      status: details.status || (action.includes('failed') ? 'failed' : 'success'),
      message: messages[action] || `System performed ${action}`,
      details,
      req
    });
  }

  // Bulk logging for migrations or batch operations
  static async logBulkActivity(activities) {
    try {
      const logEntries = activities.map(activity => ({
        actor: activity.actor,
        action: activity.action,
        serviceType: activity.serviceType || 'system',
        leadId: activity.leadId || null,
        partnerId: activity.partnerId || null,
        status: activity.status || 'success',
        message: activity.message,
        details: activity.details || {},
        metadata: activity.metadata || {},
        error: activity.error || null
      }));

      const result = await Log.insertMany(logEntries);
      logger.info(`Bulk logged ${result.length} activities`);
      return result;
    } catch (error) {
      logger.error('Failed to bulk log activities:', error);
      throw error;
    }
  }

  // Get activity summary for a specific actor
  static async getActivitySummary(actorType, actorId, period = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const pipeline = [
        {
          $match: {
            'actor.type': actorType,
            'actor.id': actorId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            lastActivity: { $max: '$createdAt' },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ];

      const summary = await Log.aggregate(pipeline);
      return {
        period: `${period} days`,
        totalActivities: summary.reduce((sum, item) => sum + item.count, 0),
        activities: summary
      };
    } catch (error) {
      logger.error('Failed to get activity summary:', error);
      throw error;
    }
  }
}

module.exports = ActivityLogger;