import React, { createContext, useContext, useState, useEffect } from 'react';
import notificationApi from '../lib/api/notificationApi';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();

  // Fetch notifications
  const fetchNotifications = async (options = {}) => {
    if (!isAuthenticated()) return;
    
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications(options);
      
      if (options.page === 1 || !options.page) {
        // Replace notifications for first page
        setNotifications(response.notifications);
      } else {
        // Append for pagination
        setNotifications(prev => [...prev, ...response.notifications]);
      }
      
      setError(null);
      return response;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!isAuthenticated()) return;
    
    try {
      const response = await notificationApi.getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  // Mark notifications as read
  const markAsRead = async (notificationIds = null) => {
    try {
      if (notificationIds && notificationIds.length > 0) {
        await notificationApi.markAsRead(notificationIds);
      } else {
        await notificationApi.markAllAsRead();
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          !notificationIds || notificationIds.includes(notification._id)
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Refresh unread count
      await fetchUnreadCount();
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      throw err;
    }
  };

  // Mark single notification as read
  const markSingleAsRead = async (notificationId) => {
    try {
      await notificationApi.markSingleAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Refresh unread count
      await fetchUnreadCount();
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  };

  // Add new notification (for real-time updates)
  const addNotification = (newNotification) => {
    setNotifications(prev => [newNotification, ...prev]);
    if (!newNotification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Refresh notifications and unread count
  const refresh = async () => {
    await Promise.all([
      fetchNotifications({ page: 1 }),
      fetchUnreadCount()
    ]);
  };

  // Filter notifications by role
  const getFilteredNotifications = () => {
    if (!user) return [];
    
    return notifications.filter(notification => {
      if (user.role === 'partner') {
        return notification.recipientRole === 'partner';
      }
      if (user.role === 'superadmin') {
        return true; // Admins see all notifications
      }
      return false;
    });
  };

  // Get unread notifications
  const getUnreadNotifications = () => {
    return getFilteredNotifications().filter(n => !n.isRead);
  };

  // Initialize notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated() && user) {
      refresh();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isAuthenticated()) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const value = {
    // State
    notifications: getFilteredNotifications(),
    unreadNotifications: getUnreadNotifications(),
    unreadCount,
    loading,
    error,

    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markSingleAsRead,
    addNotification,
    refresh,

    // Helpers
    hasUnreadNotifications: unreadCount > 0,
    totalCount: getFilteredNotifications().length
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};