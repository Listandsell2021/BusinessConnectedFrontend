// Log Model - Comprehensive Audit Trail
const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  // Who performed the action
  actor: {
    type: {
      type: String,
      enum: ['user', 'partner', 'superadmin', 'system'],
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'actor.type'
    },
    name: String,
    email: String
  },
  // What action was performed
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'lead_created', 'lead_creation_failed', 'cancellation_requested',
      'user_registration', 'user_profile_updated', 'user_password_changed',
      'partner_registration',
      // Partner actions
      'lead_accepted', 'lead_cancelled', 'lead_rejected', 'settings_updated',
      'partner_profile_updated', 'partner_dashboard_accessed', 'partner_invoice_downloaded',
      'partner_lead_viewed', 'partner_lead_contacted',
      // Superadmin actions
      'lead_assigned', 'lead_reassigned', 'partner_approved', 'partner_rejected',
      'partner_service_approved', 'partner_service_rejected', 'partner_service_status_updated',
      'partner_suspended', 'partner_reactivated', 'partner_type_changed', 
      'partner_created', 'partner_updated', 'partner_deleted',
      'invoice_generated', 'invoice_sent', 'data_exported', 'system_backup_created',
      'user_created', 'user_updated', 'user_deleted', 'user_role_changed',
      'service_config_updated', 'system_settings_updated',
      // Authentication actions
      'login_success', 'login_failed', 'user_login', 'logout', 'password_reset',
      'password_reset_request', 'account_locked', 'account_unlocked',
      'session_expired', 'token_refreshed',
      // System actions
      'email_sent', 'email_failed', 'email_bounced', 'sms_sent', 'sms_failed',
      'scheduled_job', 'error_logged', 'webhook_received', 'webhook_failed',
      'api_key_created', 'api_key_revoked', 'rate_limit_exceeded',
      'security_alert', 'suspicious_activity_detected',
      // Data operations
      'bulk_import', 'bulk_export', 'data_migration', 'database_cleanup',
      'file_upload', 'file_download', 'file_deleted'
    ]
  },
  // Which service (moving/cleaning/cancellation/partner/system)
  serviceType: {
    type: String,
    enum: ['moving', 'cleaning', 'cancellation', 'partner', 'system']
  },
  // Related entities
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  },
  // Action status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  // Detailed information
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Human readable message
  message: {
    type: String,
    required: true
  },
  // Request metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    domain: String,
    requestId: String
  },
  // Error information (if applicable)
  error: {
    message: String,
    stack: String,
    code: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
LogSchema.index({ 'actor.type': 1, 'actor.id': 1 });
LogSchema.index({ action: 1 });
LogSchema.index({ serviceType: 1 });
LogSchema.index({ leadId: 1 });
LogSchema.index({ partnerId: 1 });
LogSchema.index({ createdAt: -1 });
LogSchema.index({ status: 1 });

// Static method to create log entry
LogSchema.statics.createLog = function(logData) {
  return this.create(logData);
};

module.exports = mongoose.model('Log', LogSchema);