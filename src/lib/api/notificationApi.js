import api from './api';

// Notification API endpoints
const notificationApi = {
  // Get user notifications with pagination and filtering
  getNotifications: async (options = {}) => {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    
    try {
      const response = await api.get('/notifications', {
        params: {
          page,
          limit,
          unreadOnly
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Get unread notification count
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/mark-read');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Mark specific notifications as read
  markAsRead: async (notificationIds) => {
    try {
      const response = await api.put('/notifications/mark-read', {
        notificationIds
      });
      return response.data;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  },

  // Mark single notification as read
  markSingleAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Test endpoints (for development)
  createTestWelcomeNotification: async (partnerId, service) => {
    try {
      const response = await api.post('/notifications/test-welcome', {
        partnerId,
        service
      });
      return response.data;
    } catch (error) {
      console.error('Error creating test welcome notification:', error);
      throw error;
    }
  },

  createTestLeadAssignedNotification: async (partnerId, leadId, leadData) => {
    try {
      const response = await api.post('/notifications/test-lead-assigned', {
        partnerId,
        leadId,
        leadData
      });
      return response.data;
    } catch (error) {
      console.error('Error creating test lead assignment notification:', error);
      throw error;
    }
  }
};

export default notificationApi;