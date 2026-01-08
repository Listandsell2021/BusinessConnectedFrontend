import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from '../ui/Button';

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
      description: isGerman ? 'Sarah Mueller - Sicherheitsservice München' : 'Sarah Mueller - Security Service Munich',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      priority: 'high',
      user: 'System',
      metadata: {
        leadValue: '€520',
        serviceType: 'security',
        location: 'München'
      }
    },
    {
      id: 2,
      type: 'partner_joined',
      title: isGerman ? 'Neuer Partner registriert' : 'New partner registered',
      description: isGerman ? 'Berlin Security Pro - Sicherheitsservice' : 'Berlin Security Pro - Security Service',
      timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
      priority: 'medium',
      user: 'Auto-Approval',
      metadata: {
        partnerType: 'basic',
        serviceType: 'security'
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
      description: isGerman ? 'Zahlung von €890 erhalten - Frankfurt Security Pro' : 'Payment of €890 received - Frankfurt Security Pro',
      timestamp: new Date(Date.now() - 2700000), // 45 minutes ago
      priority: 'medium',
      user: 'Frankfurt Security Pro',
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
        partner: 'Stuttgart Security Solutions',
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
      lead_created: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
      partner_joined: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      lead_accepted: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      revenue_generated: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      system_alert: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      lead_expired: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      partner_updated: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      payment_received: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    };
    return icons[type] || (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    );
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
            className="mr-2"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
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
                  {activity.metadata.serviceType === 'security' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {isGerman ? 'Sicherheitsservice' : 'Security Service'}
                    </span>
                  )}
                  {activity.metadata.responseTime && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {activity.metadata.responseTime}
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
        <Button
          variant="primary"
          size="sm"
          className="text-sm font-medium"
        >
          {isGerman ? 'Alle Aktivitäten anzeigen' : 'View All Activities'}
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default ActivityFeed;