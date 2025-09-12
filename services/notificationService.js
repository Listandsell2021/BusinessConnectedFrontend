const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  
  // Create welcome notification when partner is approved
  static async createPartnerWelcomeNotification(partnerId, service) {
    try {
      const partner = await User.findById(partnerId);
      if (!partner) throw new Error('Partner not found');

      const serviceDisplayName = service === 'moving' ? 'Moving Services' : 'Cleaning Services';
      
      return await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'partner_welcome',
        title: 'Welcome to Leadform CRM!',
        message: `Welcome to Leadform CRM! You are now a verified ${serviceDisplayName} partner. Start receiving leads in your area!`,
        priority: 'high',
        metadata: {
          service: service
        }
      });
    } catch (error) {
      console.error('Error creating partner welcome notification:', error);
      throw error;
    }
  }

  // Create notification when lead is assigned to partner
  static async createLeadAssignedNotification(partnerId, leadId, leadData) {
    try {
      const { customerName, location, service, priority = 'high' } = leadData;
      const serviceAction = service === 'moving' ? 'moving' : 'cleaning';
      
      return await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'lead_assigned',
        title: 'New Lead Assigned',
        message: `New ${serviceAction} lead assigned to you - ${customerName} (${location})`,
        priority: priority,
        metadata: {
          leadId: leadId,
          service: service,
          customerName: customerName,
          location: location,
          actionUrl: `/leads/${leadId}`
        }
      });
    } catch (error) {
      console.error('Error creating lead assigned notification:', error);
      throw error;
    }
  }

  // Create notification when quote is accepted
  static async createQuoteAcceptedNotification(partnerId, leadId, amount) {
    try {
      return await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'quote_accepted',
        title: 'Quote Accepted!',
        message: `Your quote accepted - €${amount}`,
        priority: 'high',
        metadata: {
          leadId: leadId,
          amount: amount,
          actionUrl: `/leads/${leadId}`
        }
      });
    } catch (error) {
      console.error('Error creating quote accepted notification:', error);
      throw error;
    }
  }

  // Create notification when lead is updated
  static async createLeadUpdatedNotification(partnerId, leadId, updateMessage) {
    try {
      return await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'lead_updated',
        title: 'Lead Updated',
        message: `Lead status updated - ${updateMessage}`,
        priority: 'medium',
        metadata: {
          leadId: leadId,
          actionUrl: `/leads/${leadId}`
        }
      });
    } catch (error) {
      console.error('Error creating lead updated notification:', error);
      throw error;
    }
  }

  // Create notification when partner requests cancellation
  static async createCancelRequestSentNotification(partnerId, leadId, customerName) {
    try {
      return await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'cancel_request_sent',
        title: 'Cancellation Request Sent',
        message: `Cancellation request sent to admin for lead - ${customerName}`,
        priority: 'medium',
        metadata: {
          leadId: leadId,
          customerName: customerName,
          actionUrl: `/leads/${leadId}`
        }
      });
    } catch (error) {
      console.error('Error creating cancel request sent notification:', error);
      throw error;
    }
  }

  // Create notification when admin approves cancellation
  static async createCancelApprovedNotification(partnerId, leadId, customerName) {
    try {
      return await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'cancel_request_approved',
        title: 'Cancellation Approved',
        message: `Cancellation request approved by admin - Lead ${customerName} cancelled`,
        priority: 'high',
        metadata: {
          leadId: leadId,
          customerName: customerName
        }
      });
    } catch (error) {
      console.error('Error creating cancel approved notification:', error);
      throw error;
    }
  }

  // Create notification when admin rejects cancellation
  static async createCancelRejectedNotification(partnerId, leadId, customerName) {
    try {
      return await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'cancel_request_rejected',
        title: 'Cancellation Rejected',
        message: `Cancellation request rejected - Please contact lead: ${customerName}`,
        priority: 'high',
        metadata: {
          leadId: leadId,
          customerName: customerName,
          actionUrl: `/leads/${leadId}`
        }
      });
    } catch (error) {
      console.error('Error creating cancel rejected notification:', error);
      throw error;
    }
  }

  // Create notification for admin when partner requests cancellation
  static async createPartnerCancelRequestNotification(adminId, partnerId, leadId, leadData) {
    try {
      const partner = await User.findById(partnerId);
      const { customerName, location } = leadData;
      
      return await Notification.createNotification({
        recipient: adminId,
        recipientRole: 'superadmin',
        type: 'partner_cancel_request',
        title: 'Partner Cancellation Request',
        message: `Partner requested lead cancellation - ${customerName} (${location}) - Partner: ${partner.name}`,
        priority: 'high',
        metadata: {
          leadId: leadId,
          partnerId: partnerId,
          customerName: customerName,
          location: location,
          actionUrl: `/admin/leads/${leadId}/cancel-request`
        }
      });
    } catch (error) {
      console.error('Error creating partner cancel request notification:', error);
      throw error;
    }
  }

  // Create notification when lead expires
  static async createLeadExpiredNotification(partnerId, leadId, customerName) {
    try {
      return await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'lead_expired',
        title: 'Lead Expired',
        message: `Lead expired - ${customerName} (no response after 48h)`,
        priority: 'low',
        metadata: {
          leadId: leadId,
          customerName: customerName
        }
      });
    } catch (error) {
      console.error('Error creating lead expired notification:', error);
      throw error;
    }
  }

  // Get user notifications with filtering
  static async getUserNotifications(userId, options = {}) {
    try {
      return await Notification.getUserNotifications(userId, options);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Mark notifications as read
  static async markNotificationsAsRead(userId, notificationIds = null) {
    try {
      return await Notification.markAsRead(userId, notificationIds);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  // Get unread count
  static async getUnreadCount(userId) {
    try {
      return await Notification.getUnreadCount(userId);
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Create notification when password is changed
  static async createPasswordChangedNotification(partnerId, newPassword) {
    try {
      // Try Partner model first, then User model
      let partner = await require('../models/Partner').findById(partnerId);
      if (!partner) {
        partner = await User.findById(partnerId);
      }
      if (!partner) throw new Error('Partner not found');

      return await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'password_changed',
        title: 'Password Changed Successfully',
        message: `Your password has been reset successfully. Your new password is: ${newPassword}`,
        priority: 'high',
        metadata: {
          newPassword: newPassword,
          timestamp: new Date(),
          actionUrl: '/profile/security'
        }
      });
    } catch (error) {
      console.error('Error creating password changed notification:', error);
      throw error;
    }
  }

  // Send notification to all admins
  static async notifyAllAdmins(notificationData) {
    try {
      const admins = await User.find({ role: 'superadmin' });
      const notifications = [];
      
      for (const admin of admins) {
        const notification = await Notification.createNotification({
          ...notificationData,
          recipient: admin._id,
          recipientRole: 'superadmin'
        });
        notifications.push(notification);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error notifying all admins:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;