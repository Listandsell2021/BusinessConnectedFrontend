const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientRole: {
    type: String,
    enum: ['partner', 'superadmin'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'partner_welcome',
      'lead_assigned',
      'quote_accepted', 
      'lead_updated',
      'lead_expired',
      'cancel_request_sent',
      'cancel_request_approved',
      'cancel_request_rejected',
      'partner_cancel_request',
      'service_rejected',
      'partner_suspended',
      'partner_type_changed'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // Additional data for specific notification types
  metadata: {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    service: {
      type: String,
      enum: ['moving', 'cleaning']
    },
    customerName: String,
    location: String,
    amount: Number,
    actionUrl: String // For clickable notifications
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    return await notification.save();
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  
  const query = { recipient: userId };
  if (unreadOnly) {
    query.isRead = false;
  }
  
  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('metadata.leadId', 'customerName email phone service location')
    .populate('metadata.partnerId', 'name email');
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = async function(userId, notificationIds = null) {
  const query = { recipient: userId };
  
  if (notificationIds) {
    query._id = { $in: notificationIds };
  }
  
  return await this.updateMany(query, { isRead: true });
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ recipient: userId, isRead: false });
};

module.exports = mongoose.model('Notification', notificationSchema);