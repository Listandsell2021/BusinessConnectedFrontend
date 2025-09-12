const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminName: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'SETTINGS_UPDATED',
      'PARTNER_ACTIVATED',
      'PARTNER_REJECTED',
      'PARTNER_DEACTIVATED',
      'PRICING_CHANGED',
      'LEAD_DISTRIBUTION_CHANGED',
      'SYSTEM_SETTINGS_CHANGED',
      'NOTIFICATION_SETTINGS_CHANGED'
    ]
  },
  targetType: {
    type: String,
    enum: ['SETTINGS', 'PARTNER', 'LEAD', 'USER'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Some actions don't have a specific target ID (like general settings)
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible object to store action-specific details
    required: false
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed, // Store previous values for audit trail
    required: false
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed, // Store new values for audit trail
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ action: 1, createdAt: -1 });
AdminLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

// Static method to log admin actions
AdminLogSchema.statics.logAction = async function(adminUser, action, targetType, details = {}) {
  try {
    const logEntry = new this({
      adminId: adminUser.id,
      adminName: adminUser.name || adminUser.email,
      adminEmail: adminUser.email,
      action,
      targetType,
      targetId: details.targetId || null,
      details: details.details || {},
      oldValues: details.oldValues || null,
      newValues: details.newValues || null,
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null
    });

    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw error to prevent disrupting main operation
  }
};

module.exports = mongoose.model('AdminLog', AdminLogSchema);