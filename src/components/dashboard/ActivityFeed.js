import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

const ActivityFeed = ({ className = "" }) => {
  const { isGerman } = useLanguage();
  const [activities, setActivities] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityData();

    // Set up real-time updates
    const interval = setInterval(fetchActivityData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/activity');
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activity data:', error);
      setActivities(getMockActivityData());
    } finally {
      setLoading(false);
    }
  };

  const getMockActivityData = () => ([
    {
      id: 1,
      type: 'lead_created',
      title: isGerman ? 'Neuer Lead erstellt' : 'New lead created',
      description: isGerman ? 'Maria Schmidt - Tiefenreinigung München' : 'Maria Schmidt - Deep Cleaning Munich',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      priority: 'high',
      user: 'System',
      metadata: {
        leadValue: '€320',
        serviceType: 'cleaning',
        location: 'München'
      }
    },
    {
      id: 2,
      type: 'partner_joined',
      title: isGerman ? 'Neuer Partner registriert' : 'New partner registered',
      description: isGerman ? 'Berlin Moving Pro - Umzugsservice' : 'Berlin Moving Pro - Moving Service',
      timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
      priority: 'medium',
      user: 'Auto-Approval',
      metadata: {
        partnerType: 'basic',
        serviceType: 'moving'
      }
    },
    {
      id: 3,
      type: 'lead_accepted',
      title: isGerman ? 'Lead angenommen' : 'Lead accepted',
      description: isGerman ? 'Thomas Weber - Büroumzug von Hamburg Transport' : 'Thomas Weber - Office move by Hamburg Transport',
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      priority: 'high',
      user: 'Hamburg Transport Solutions',
      metadata: {
        leadValue: '€2,100',
        responseTime: '1.2h'
      }
    },
    {
      id: 4,
      type: 'revenue_generated',
      title: isGerman ? 'Umsatz generiert' : 'Revenue generated',
      description: isGerman ? 'Zahlung von €890 erhalten - Frankfurt Clean' : 'Payment of €890 received - Frankfurt Clean',
      timestamp: new Date(Date.now() - 2700000), // 45 minutes ago
      priority: 'medium',
      user: 'Frankfurt Clean & Shine',
      metadata: {
        amount: '€890',
        commission: '€89'
      }
    },
    {
      id: 5,
      type: 'system_alert',
      title: isGerman ? 'System-Warnung' : 'System alert',
      description: isGerman ? 'Partner-Antwortzeit überschritten' : 'Partner response time exceeded',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      priority: 'low',
      user: 'System Monitor',
      metadata: {
        partner: 'Stuttgart Cleaning Services',
        responseTime: '4.2h',
        threshold: '4h'
      }
    },
    {
      id: 6,
      type: 'lead_expired',
      title: isGerman ? 'Lead abgelaufen' : 'Lead expired',
      description: isGerman ? 'Klaus Fischer - Fernumzug (keine Antwort)' : 'Klaus Fischer - Long distance move (no response)',
      timestamp: new Date(Date.now() - 4200000), // 70 minutes ago
      priority: 'medium',
      user: 'Auto-Expiry',
      metadata: {
        leadValue: '€1,650',
        assignedPartners: 3
      }
    }
  ]);

  if (loading || !activities) {
    return (
      <div className={`p-6 rounded-2xl border ${className}`} style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'var(--theme-border)'
      }}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type) => {
    const icons = {
      lead_created: '🎯',
      partner_joined: '🤝',
      lead_accepted: '✅',
      revenue_generated: '💰',
      system_alert: '⚠️',
      lead_expired: '⏰',
      partner_updated: '📝',
      payment_received: '💳'
    };
    return icons[type] || '📋';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'from-red-500 to-pink-500',
      medium: 'from-yellow-500 to-orange-500',
      low: 'from-gray-500 to-gray-600'
    };
    return colors[priority] || colors.low;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) {
      return isGerman ? `vor ${days} Tag${days > 1 ? 'en' : ''}` : `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return isGerman ? `vor ${hours} Stunde${hours > 1 ? 'n' : ''}` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return isGerman ? `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}` : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return isGerman ? 'gerade eben' : 'just now';
    }
  };

  return (
    <motion.div
      className={`p-6 rounded-2xl border backdrop-blur-xl ${className}`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'var(--theme-border)'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center" style={{ color: 'var(--theme-text)' }}>
          <motion.span
            className="mr-2 text-2xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            📈
          </motion.span>
          {isGerman ? 'Live-Aktivitäten' : 'Live Activity Feed'}
        </h3>

        {/* Live indicator */}
        <div className="flex items-center space-x-2">
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs font-medium text-green-400">
            {isGerman ? 'Live' : 'Live'}
          </span>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            className="flex items-start space-x-4 p-4 rounded-lg border group cursor-pointer hover:shadow-md transition-all duration-200"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-border-light)'
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ x: 5 }}
          >
            {/* Activity Icon */}
            <div className="flex-shrink-0">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-r ${getPriorityColor(activity.priority)}`}
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
              >
                <span className="text-sm">{getActivityIcon(activity.type)}</span>
              </motion.div>
            </div>

            {/* Activity Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold truncate" style={{ color: 'var(--theme-text)' }}>
                  {activity.title}
                </h4>
                <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>

              <p className="text-sm mt-1 truncate" style={{ color: 'var(--theme-text-secondary)' }}>
                {activity.description}
              </p>

              {/* Metadata */}
              {activity.metadata && (
                <div className="flex items-center space-x-4 mt-2">
                  {activity.metadata.leadValue && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {activity.metadata.leadValue}
                    </span>
                  )}
                  {activity.metadata.serviceType && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {activity.metadata.serviceType === 'moving' ?
                        (isGerman ? 'Umzug' : 'Moving') :
                        (isGerman ? 'Reinigung' : 'Cleaning')
                      }
                    </span>
                  )}
                  {activity.metadata.responseTime && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                      ⚡ {activity.metadata.responseTime}
                    </span>
                  )}
                </div>
              )}

              {/* User */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'von' : 'by'} {activity.user}
                </span>
                {activity.priority === 'high' && (
                  <motion.span
                    className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {isGerman ? 'Hoch' : 'High'}
                  </motion.span>
                )}
              </div>
            </div>

            {/* Action Indicator */}
            <div className="flex-shrink-0">
              <motion.div
                className="w-1 h-8 rounded-full bg-current opacity-0 group-hover:opacity-75"
                style={{ color: 'var(--theme-button-bg)' }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <motion.div
        className="mt-6 text-center border-t pt-4"
        style={{ borderColor: 'var(--theme-border)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:shadow-lg"
          style={{ backgroundColor: 'var(--theme-button-bg)', color: 'var(--theme-button-text)' }}
        >
          {isGerman ? 'Alle Aktivitäten anzeigen' : 'View All Activities'}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ActivityFeed;