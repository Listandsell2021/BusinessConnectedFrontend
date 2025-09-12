const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');
const { createAuditLog } = require('../middleware/logging');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    };
    
    const notifications = await NotificationService.getUserNotifications(userId, options);
    
    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: notifications.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await NotificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
});

// @route   PUT /api/notifications/mark-read
// @desc    Mark notifications as read
// @access  Private
router.put('/mark-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body; // Optional: specific notification IDs
    
    await NotificationService.markNotificationsAsRead(userId, notificationIds);
    
    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark single notification as read
// @access  Private
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    await NotificationService.markNotificationsAsRead(userId, [notificationId]);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/test-welcome
// @desc    Test endpoint to create welcome notification (development only)
// @access  Private (Admin only)
router.post('/test-welcome', authenticateToken, async (req, res) => {
  try {
    // Only allow superadmin to use test endpoints
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    
    const { partnerId, service } = req.body;
    
    if (!partnerId || !service) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID and service are required'
      });
    }
    
    const notification = await NotificationService.createPartnerWelcomeNotification(partnerId, service);
    
    res.json({
      success: true,
      message: 'Test welcome notification created',
      notification
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/test-lead-assigned
// @desc    Test endpoint to create lead assignment notification
// @access  Private (Admin only)
router.post('/test-lead-assigned', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    
    const { partnerId, leadId, leadData } = req.body;
    
    const notification = await NotificationService.createLeadAssignedNotification(partnerId, leadId, leadData);
    
    res.json({
      success: true,
      message: 'Test lead assignment notification created',
      notification
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification',
      error: error.message
    });
  }
});

module.exports = router;