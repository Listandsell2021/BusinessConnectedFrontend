import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useService } from '../../../contexts/ServiceContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { logsAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';
import Pagination from '../../../components/ui/Pagination';

const LogsModule = () => {
  const { currentService } = useService();
  const { t, isGerman } = useLanguage();
  const { user, isSuperAdmin, isPartner } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logStats, setLogStats] = useState({
    total: 0,
    today: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    successRate: 100
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Tab and Filter states
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'leads', 'partners', 'settings', 'system'
  const [filters, setFilters] = useState({
    actorType: 'all',
    action: 'all',
    dateRange: 'all',
    searchTerm: ''
  });

  // Filter logs by tab category
  const getTabFilteredLogs = (logs, tab) => {
    switch (tab) {
      case 'leads':
        return logs.filter(log =>
          (log.action.includes('lead_') && log.action !== 'lead_creation_failed') ||
          ['cancellation_requested'].includes(log.action)
        );
      case 'partners':
        return logs.filter(log =>
          log.action.includes('partner_') ||
          log.partnerName ||
          log.partnerId
        );
      case 'settings':
        return logs.filter(log =>
          [
            // Admin Settings Actions
            'settings_updated',           // System settings updated via admin panel
            'pricing_updated',            // Pricing changes for moving/cleaning services
            'lead_distribution_updated',  // Lead per week settings changes
            'system_settings_updated',    // Lead cancellation/timeout settings
            'notification_settings_updated', // Email notification toggles
            'password_reset_updated',     // Password reset settings

            // Partner Settings Actions
            'partner_contact_updated',    // Contact information changes
            'partner_company_updated',    // Company information updates
            'partner_address_updated',    // Address information changes
            'partner_service_preferences_updated', // Service preferences (moving settings, locations)
            'partner_notification_preferences_updated', // Notification preferences

            // General profile updates
            'partner_updated'             // General partner profile updates
          ].includes(log.action)
        );
      default:
        return logs;
    }
  };

  // Load logs from API
  const loadLogs = async () => {
    if (!currentService) return;
    
    setLoading(true);
    try {
      // Prepare date parameters for API
      const dateParams = {};
      const now = new Date();
      
      if (filters.dateRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        dateParams.startDate = today.toISOString();
        dateParams.endDate = tomorrow.toISOString();
      } else if (filters.dateRange === '7days') {
        const startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        dateParams.startDate = startDate.toISOString();
        dateParams.endDate = now.toISOString();
      } else if (filters.dateRange === '30days') {
        const startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        dateParams.startDate = startDate.toISOString();
        dateParams.endDate = now.toISOString();
      }

      const params = {
        serviceType: currentService,
        page: currentPage,
        limit: itemsPerPage,
        // Add filters to API call
        actorType: filters.actorType !== 'all' ? filters.actorType : undefined,
        action: filters.action !== 'all' ? filters.action : undefined,
        search: filters.searchTerm || undefined,
        ...dateParams
      };

      let response;
      if (isPartner) {
        // Partners get their own logs
        response = await logsAPI.getPartnerLogs(user.id, params);
      } else {
        // Superadmins get all logs
        response = await logsAPI.getAll(params);
      }
      
      const rawLogsData = response.data.logs || [];
      const totalCount = response.data.pagination?.total || rawLogsData.length;
      
      // Transform backend data structure to match frontend expectations
      const transformedLogs = rawLogsData.map(log => {
        // Enhanced action description for better readability
        const getActionDescription = (action, details, actor, leadId, partnerId) => {
          const actorName = actor?.name || actor?.email || 'Unknown';
          const partnerName = log.partnerId?.companyName || 'Unknown Partner';
          const leadIdDisplay = log.leadId?.leadId || leadId;

          switch (action) {
            case 'lead_created':
              return `${actorName} created lead ${leadIdDisplay}`;
            case 'lead_assigned':
              return `Lead ${leadIdDisplay} assigned to ${partnerName}`;
            case 'lead_accepted':
              return `${partnerName} accepted lead ${leadIdDisplay}`;
            case 'lead_rejected':
              return `${partnerName} rejected lead ${leadIdDisplay}`;
            case 'lead_cancelled':
              return `${partnerName} cancelled lead ${leadIdDisplay}`;
            case 'cancellation_requested':
              return `${partnerName} requested cancellation for lead ${leadIdDisplay}`;
            case 'partner_approved':
              return `${actorName} approved partner ${partnerName}`;
            case 'partner_rejected':
              return `${actorName} rejected partner ${partnerName}`;
            case 'partner_suspended':
              return `${actorName} suspended partner ${partnerName}`;
            case 'partner_reactivated':
              return `${actorName} reactivated partner ${partnerName}`;
            case 'login_success':
              return `${actorName} logged in successfully`;
            case 'login_failed':
              return `Failed login attempt for ${actor?.email || 'unknown'}`;
            case 'settings_updated':
              return `${actorName} updated system settings`;
            case 'pricing_updated':
              return `${actorName} updated pricing settings`;
            case 'lead_distribution_updated':
              return `${actorName} updated lead distribution settings`;
            case 'system_settings_updated':
              return `${actorName} updated system configuration`;
            case 'notification_settings_updated':
              return `${actorName} updated notification settings`;
            case 'password_reset_updated':
              return `${actorName} updated password reset settings`;
            case 'partner_contact_updated':
              return `${actorName} updated contact information`;
            case 'partner_company_updated':
              return `${actorName} updated company information`;
            case 'partner_address_updated':
              return `${actorName} updated address information`;
            case 'partner_service_preferences_updated':
              return `${actorName} updated service preferences`;
            case 'partner_notification_preferences_updated':
              return `${actorName} updated notification preferences`;
            case 'partner_lead_viewed':
              return `${partnerName} viewed lead ${leadIdDisplay}`;
            case 'partner_lead_contacted':
              return `${partnerName} contacted customer for lead ${leadIdDisplay}`;
            default:
              return log.message || action.replace(/_/g, ' ');
          }
        };

        return {
          ...log,
          id: log._id || log.id,
          timestamp: new Date(log.createdAt),
          role: log.actor?.type || 'system',
          userEmail: log.actor?.email,
          userName: log.actor?.name,
          leadId: log.leadId?.leadId || log.leadId,
          leadServiceType: log.leadId?.serviceType,
          leadCustomer: log.leadId ? `${log.leadId.user?.firstName || ''} ${log.leadId.user?.lastName || ''}`.trim() : null,
          partnerId: log.partnerId?._id || log.partnerId,
          partnerName: log.partnerId?.companyName,
          partnerEmail: log.partnerId?.contactPerson?.email,
          details: getActionDescription(log.action, log.details, log.actor, log.leadId, log.partnerId),
          originalMessage: log.message,
          fullData: log.details,
          sourceDomain: log.metadata?.domain,
          ipAddress: log.metadata?.ipAddress,
          status: log.status || 'success'
        };
      });
      
      setLogs(transformedLogs);
      setTotalLogs(totalCount);
      
      // Calculate comprehensive stats for current tab
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter logs by current tab
      const currentTabLogs = getTabFilteredLogs(transformedLogs, activeTab);

      const todayLogs = currentTabLogs.filter(l => new Date(l.timestamp) >= today);
      const failedActions = currentTabLogs.filter(l => l.status === 'failed');
      const successfulActions = currentTabLogs.filter(l => l.status === 'success');
      const pendingActions = currentTabLogs.filter(l => l.status === 'pending');

      // Calculate tab-specific stats
      let tabSpecificStats = {};
      if (activeTab === 'all') {
        const leadActions = getTabFilteredLogs(transformedLogs, 'leads');
        const partnerActions = getTabFilteredLogs(transformedLogs, 'partners');
        const settingsActions = getTabFilteredLogs(transformedLogs, 'settings');
        tabSpecificStats = {
          leadActions: leadActions.length,
          partnerActions: partnerActions.length,
          settingsActions: settingsActions.length
        };
      } else if (activeTab === 'leads') {
        const createdLeads = currentTabLogs.filter(l => l.action === 'lead_created');
        const assignedLeads = currentTabLogs.filter(l => l.action === 'lead_assigned');
        const acceptedLeads = currentTabLogs.filter(l => l.action === 'lead_accepted');
        const rejectedLeads = currentTabLogs.filter(l => l.action === 'lead_rejected');
        tabSpecificStats = {
          createdLeads: createdLeads.length,
          assignedLeads: assignedLeads.length,
          acceptedLeads: acceptedLeads.length,
          rejectedLeads: rejectedLeads.length
        };
      } else if (activeTab === 'partners') {
        const partnerRegistrations = currentTabLogs.filter(l => l.action === 'partner_registration');
        const partnerCreated = currentTabLogs.filter(l => l.action === 'partner_created');
        const partnerUpdated = currentTabLogs.filter(l => l.action === 'partner_updated');
        const statusUpdates = currentTabLogs.filter(l => l.action === 'partner_status_updated');
        const serviceStatusUpdates = currentTabLogs.filter(l => l.action === 'partner_service_status_updated');
        const typeUpdates = currentTabLogs.filter(l => l.action === 'partner_type_updated');
        const leadActions = currentTabLogs.filter(l => ['partner_lead_accepted', 'partner_lead_rejected', 'partner_lead_cancel_requested'].includes(l.action));
        tabSpecificStats = {
          partnerRegistrations: partnerRegistrations.length,
          partnerCreated: partnerCreated.length,
          partnerUpdated: partnerUpdated.length,
          statusUpdates: statusUpdates.length,
          serviceStatusUpdates: serviceStatusUpdates.length,
          typeUpdates: typeUpdates.length,
          leadActions: leadActions.length
        };
      } else if (activeTab === 'settings') {
        const adminSettings = currentTabLogs.filter(l => [
          'settings_updated', 'pricing_updated', 'lead_distribution_updated',
          'system_settings_updated', 'notification_settings_updated', 'password_reset_updated'
        ].includes(l.action));
        const partnerSettings = currentTabLogs.filter(l => [
          'partner_contact_updated', 'partner_company_updated', 'partner_address_updated',
          'partner_service_preferences_updated', 'partner_notification_preferences_updated', 'partner_updated'
        ].includes(l.action));
        tabSpecificStats = {
          adminSettings: adminSettings.length,
          partnerSettings: partnerSettings.length
        };
      }

      setLogStats({
        total: activeTab === 'all' ? totalCount : currentTabLogs.length,
        today: todayLogs.length,
        successful: successfulActions.length,
        failed: failedActions.length,
        pending: pendingActions.length,
        successRate: currentTabLogs.length > 0 ? Math.round((successfulActions.length / currentTabLogs.length) * 100) : 100,
        ...tabSpecificStats
      });
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Failed to load logs');
      setLogs([]);
      setLogStats({ total: 0, today: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load logs when component mounts or service changes
    if (currentService) {
      loadLogs();
    }
  }, [currentService]);

  // Reload logs when filters, pagination, or active tab change
  useEffect(() => {
    if (currentService) {
      loadLogs();
    }
  }, [currentPage, filters.actorType, filters.action, filters.dateRange, filters.searchTerm, activeTab]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  // Reset to first page when filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.actorType, filters.action, filters.dateRange, filters.searchTerm, activeTab]);

  // Filter logs by selected tab
  const currentLogs = getTabFilteredLogs(logs, activeTab);

  const getStatusColor = (status) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || colors.info;
  };

  const getRoleIcon = (role) => {
    const icons = {
      user: '👤',
      partner: '🏢',
      superadmin: '👑',
      system: '🤖'
    };
    return icons[role] || '📝';
  };

  const getActionColor = (action) => {
    const colors = {
      'lead_created': 'text-green-600',
      'lead_assigned': 'text-blue-600',
      'lead_accepted': 'text-green-600',
      'lead_cancelled': 'text-red-600',
      'email_sent': 'text-blue-600',
      'email_failed': 'text-red-600',
      'partner_approved': 'text-green-600',
      'settings_updated': 'text-yellow-600',
      'data_exported': 'text-purple-600',
      'login_success': 'text-green-600',
      'login_failed': 'text-red-600'
    };
    return colors[action] || 'text-gray-600';
  };

  const exportLogs = async (format = 'json') => {
    try {
      const exportParams = {
        serviceType: currentService,
        actorType: filters.actorType !== 'all' ? filters.actorType : undefined,
        action: filters.action !== 'all' ? filters.action : undefined,
        search: filters.searchTerm || undefined,
        startDate: filters.dateRange !== 'all' ? getDateRangeStart(filters.dateRange) : undefined,
        endDate: filters.dateRange !== 'all' ? new Date().toISOString() : undefined
      };
      
      // Show loading toast
      const loadingToast = toast.loading(isGerman ? 'Exportiere Logs...' : 'Exporting logs...');
      
      const response = await logsAPI.export(format, exportParams);
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `logs_export_${timestamp}.${format}`;
      link.download = filename;
      
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.dismiss(loadingToast);
      toast.success(isGerman ? `${format.toUpperCase()} erfolgreich exportiert` : `${format.toUpperCase()} export successful`);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error(isGerman ? 'Export fehlgeschlagen' : 'Export failed');
    }
  };

  const getDateRangeStart = (range) => {
    const now = new Date();
    switch (range) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString();
      case '7days':
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo.toISOString();
      case '30days':
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        return monthAgo.toISOString();
      default:
        return undefined;
    }
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleString(isGerman ? 'de-DE' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'System-Protokolle' : 'System Logs'}
        </h2>
        {isSuperAdmin && (
          <div className="relative export-menu-container">
            <motion.button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              style={{ 
                backgroundColor: 'var(--theme-button-bg)', 
                color: 'var(--theme-button-text)' 
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              📊 {isGerman ? 'Export' : 'Export'}
              <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>
            
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg z-50" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
                <div className="py-2">
                  <button
                    onClick={() => exportLogs('json')}
                    className="w-full px-4 py-2 text-left hover:bg-opacity-80 transition-colors flex items-center gap-3"
                    style={{ color: 'var(--theme-text)', backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-bg-secondary)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <span className="text-blue-600">📄</span>
                    <div>
                      <div className="font-medium">Export to JSON</div>
                      <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>Download as .json file</div>
                    </div>
                  </button>
                  <button
                    onClick={() => exportLogs('csv')}
                    className="w-full px-4 py-2 text-left hover:bg-opacity-80 transition-colors flex items-center gap-3"
                    style={{ color: 'var(--theme-text)', backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-bg-secondary)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <span className="text-green-600">📊</span>
                    <div>
                      <div className="font-medium">Export to CSV</div>
                      <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>Download as .csv file</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6" style={{ borderColor: 'var(--theme-border)' }}>
        {[
          { id: 'all', label: isGerman ? 'Alle Logs' : 'All Logs' },
          { id: 'leads', label: isGerman ? 'Leads' : 'Leads' },
          { id: 'partners', label: isGerman ? 'Partner' : 'Partners' },
          { id: 'settings', label: isGerman ? 'Einstellungen' : 'Settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              color: activeTab === tab.id ? '#3B82F6' : 'var(--theme-text-muted)',
              borderBottomColor: activeTab === tab.id ? '#3B82F6' : 'transparent'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        className="flex gap-3 p-4 rounded-lg mb-6"
        style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder={isGerman ? 'Suche nach Aktion, E-Mail, Lead ID...' : 'Search by action, email, lead ID...'}
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          />
        </div>

        {/* Actor Type Filter */}
        {isSuperAdmin && (
          <div className="flex-1">
            <select
              value={filters.actorType}
              onChange={(e) => setFilters(prev => ({ ...prev, actorType: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)'
              }}
            >
              <option value="all">{isGerman ? 'Alle Rollen' : 'All Roles'}</option>
              <option value="user">{isGerman ? 'Benutzer' : 'User'}</option>
              <option value="partner">{isGerman ? 'Partner' : 'Partner'}</option>
              <option value="superadmin">{isGerman ? 'Super-Admin' : 'Superadmin'}</option>
              <option value="system">{isGerman ? 'System' : 'System'}</option>
            </select>
          </div>
        )}

        {/* Action Filter */}
        <div className="flex-1">
          <select
            value={filters.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
            <option value="all">{isGerman ? 'Alle Aktionen' : 'All Actions'}</option>

            {activeTab === 'all' && (
              <>
                <optgroup label={isGerman ? 'Authentifizierung' : 'Authentication'}>
                  <option value="login_success">{isGerman ? 'Login erfolgreich' : 'Login Success'}</option>
                  <option value="login_failed">{isGerman ? 'Login fehlgeschlagen' : 'Login Failed'}</option>
                  <option value="logout">{isGerman ? 'Abmeldung' : 'Logout'}</option>
                  <option value="password_reset">{isGerman ? 'Passwort zurücksetzen' : 'Password Reset'}</option>
                </optgroup>

                <optgroup label={isGerman ? 'Benutzer' : 'Users'}>
                  <option value="user_registration">{isGerman ? 'Benutzer registriert' : 'User Registration'}</option>
                  <option value="user_created">{isGerman ? 'Benutzer erstellt' : 'User Created'}</option>
                  <option value="user_updated">{isGerman ? 'Benutzer aktualisiert' : 'User Updated'}</option>
                  <option value="user_role_changed">{isGerman ? 'Rolle geändert' : 'Role Changed'}</option>
                </optgroup>

                <optgroup label={isGerman ? 'Leads' : 'Leads'}>
                  <option value="lead_created">{isGerman ? 'Lead erstellt' : 'Lead Created'}</option>
                  <option value="lead_assigned">{isGerman ? 'Lead zugewiesen' : 'Lead Assigned'}</option>
                  <option value="lead_accepted">{isGerman ? 'Lead akzeptiert' : 'Lead Accepted'}</option>
                  <option value="lead_rejected">{isGerman ? 'Lead abgelehnt' : 'Lead Rejected'}</option>
                  <option value="lead_cancelled">{isGerman ? 'Lead storniert' : 'Lead Cancelled'}</option>
                  <option value="cancellation_requested">{isGerman ? 'Stornierung beantragt' : 'Cancellation Requested'}</option>
                </optgroup>

                <optgroup label={isGerman ? 'Partner' : 'Partners'}>
                  <option value="partner_created">{isGerman ? 'Partner erstellt' : 'Partner Created'}</option>
                  <option value="partner_approved">{isGerman ? 'Partner genehmigt' : 'Partner Approved'}</option>
                  <option value="partner_rejected">{isGerman ? 'Partner abgelehnt' : 'Partner Rejected'}</option>
                  <option value="partner_updated">{isGerman ? 'Partner aktualisiert' : 'Partner Updated'}</option>
                  <option value="partner_dashboard_accessed">{isGerman ? 'Dashboard aufgerufen' : 'Dashboard Accessed'}</option>
                </optgroup>

                <optgroup label={isGerman ? 'System' : 'System'}>
                  <option value="email_sent">{isGerman ? 'E-Mail gesendet' : 'Email Sent'}</option>
                  <option value="email_failed">{isGerman ? 'E-Mail fehlgeschlagen' : 'Email Failed'}</option>
                  <option value="data_exported">{isGerman ? 'Daten exportiert' : 'Data Exported'}</option>
                  <option value="system_settings_updated">{isGerman ? 'Systemeinstellungen' : 'System Settings'}</option>
                  <option value="webhook_received">{isGerman ? 'Webhook empfangen' : 'Webhook Received'}</option>
                </optgroup>
              </>
            )}

            {activeTab === 'leads' && (
              <optgroup label={isGerman ? 'Lead Aktionen' : 'Lead Actions'}>
                <option value="lead_created">{isGerman ? 'Lead erstellt' : 'Lead Created'}</option>
                <option value="lead_assigned">{isGerman ? 'Lead zugewiesen' : 'Lead Assigned'}</option>
                <option value="lead_accepted">{isGerman ? 'Lead akzeptiert' : 'Lead Accepted'}</option>
                <option value="lead_rejected">{isGerman ? 'Lead abgelehnt' : 'Lead Rejected'}</option>
                <option value="lead_cancelled">{isGerman ? 'Lead storniert' : 'Lead Cancelled'}</option>
                <option value="cancellation_requested">{isGerman ? 'Stornierung beantragt' : 'Cancellation Requested'}</option>
              </optgroup>
            )}

            {activeTab === 'partners' && (
              <>
                <optgroup label={isGerman ? 'Partner Verwaltung' : 'Partner Management'}>
                  <option value="partner_registration">{isGerman ? 'Partner Registrierung' : 'Partner Registration'}</option>
                  <option value="partner_created">{isGerman ? 'Partner erstellt' : 'Partner Created'}</option>
                  <option value="partner_updated">{isGerman ? 'Partner aktualisiert' : 'Partner Updated'}</option>
                  <option value="partner_status_updated">{isGerman ? 'Partner Status aktualisiert' : 'Partner Status Updated'}</option>
                  <option value="partner_type_updated">{isGerman ? 'Partner Typ aktualisiert' : 'Partner Type Updated'}</option>
                </optgroup>

                <optgroup label={isGerman ? 'Service Verwaltung' : 'Service Management'}>
                  <option value="partner_service_status_updated">{isGerman ? 'Service Status aktualisiert' : 'Service Status Updated'}</option>
                </optgroup>

                <optgroup label={isGerman ? 'Lead Aktionen' : 'Lead Actions'}>
                  <option value="partner_lead_accepted">{isGerman ? 'Lead akzeptiert' : 'Lead Accepted'}</option>
                  <option value="partner_lead_rejected">{isGerman ? 'Lead abgelehnt' : 'Lead Rejected'}</option>
                  <option value="partner_lead_cancel_requested">{isGerman ? 'Lead Stornierung beantragt' : 'Lead Cancel Requested'}</option>
                </optgroup>

                <optgroup label={isGerman ? 'System Aktionen' : 'System Actions'}>
                  <option value="migrate_cleaning_data">{isGerman ? 'Reinigungsdaten migriert' : 'Cleaning Data Migrated'}</option>
                  <option value="cleanup_cleaning_preferences">{isGerman ? 'Reinigungseinstellungen bereinigt' : 'Cleaning Preferences Cleanup'}</option>
                </optgroup>
              </>
            )}

            {activeTab === 'settings' && (
              <>
                <optgroup label={isGerman ? 'Admin Einstellungen' : 'Admin Settings'}>
                  <option value="settings_updated">{isGerman ? 'System Einstellungen' : 'System Settings'}</option>
                  <option value="pricing_updated">{isGerman ? 'Preiseinstellungen' : 'Pricing Settings'}</option>
                  <option value="lead_distribution_updated">{isGerman ? 'Lead-Verteilung' : 'Lead Distribution'}</option>
                  <option value="system_settings_updated">{isGerman ? 'System-Konfiguration' : 'System Configuration'}</option>
                  <option value="notification_settings_updated">{isGerman ? 'Benachrichtigungen' : 'Notifications'}</option>
                  <option value="password_reset_updated">{isGerman ? 'Passwort-Reset Einstellungen' : 'Password Reset Settings'}</option>
                </optgroup>

                <optgroup label={isGerman ? 'Partner Einstellungen' : 'Partner Settings'}>
                  <option value="partner_contact_updated">{isGerman ? 'Kontaktinformationen' : 'Contact Information'}</option>
                  <option value="partner_company_updated">{isGerman ? 'Unternehmensinformationen' : 'Company Information'}</option>
                  <option value="partner_address_updated">{isGerman ? 'Adressinformationen' : 'Address Information'}</option>
                  <option value="partner_service_preferences_updated">{isGerman ? 'Service-Einstellungen' : 'Service Preferences'}</option>
                  <option value="partner_notification_preferences_updated">{isGerman ? 'Benachrichtigungs-Einstellungen' : 'Notification Preferences'}</option>
                  <option value="partner_updated">{isGerman ? 'Allgemeine Profil-Updates' : 'General Profile Updates'}</option>
                </optgroup>

              </>
            )}
          </select>
        </div>


        {/* Date Filter */}
        <div className="flex-1">
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
            <option value="all">{isGerman ? 'Alle Zeiten' : 'All Time'}</option>
            <option value="today">{isGerman ? 'Heute' : 'Today'}</option>
            <option value="7days">{isGerman ? '7 Tage' : 'Last 7 days'}</option>
            <option value="30days">{isGerman ? '30 Tage' : 'Last 30 days'}</option>
            <option value="errors">{isGerman ? 'Nur Fehler' : 'Errors only'}</option>
          </select>
        </div>
      </motion.div>

      {/* Statistics */}
      <div className="flex flex-wrap gap-4 mt-6">
        {(() => {
          const baseStats = [
            {
              label: isGerman ? 'Gesamt' : 'Total',
              value: logStats.total,
              color: 'blue'
            },
            {
              label: isGerman ? 'Heute' : 'Today',
              value: logStats.today,
              color: 'yellow'
            }
          ];

          let tabSpecificStats = [];

          if (activeTab === 'all') {
            tabSpecificStats = [
              {
                label: isGerman ? 'Lead Aktionen' : 'Lead Actions',
                value: logStats.leadActions || 0,
                color: 'green'
              },
              {
                label: isGerman ? 'Partner Aktionen' : 'Partner Actions',
                value: logStats.partnerActions || 0,
                color: 'orange'
              },
              {
                label: isGerman ? 'System/Einstellungen' : 'System/Settings',
                value: logStats.settingsActions || 0,
                color: 'purple'
              }
            ];
          } else if (activeTab === 'leads') {
            tabSpecificStats = [
              {
                label: isGerman ? 'Erstellt' : 'Created',
                value: logStats.createdLeads || 0,
                color: 'green'
              },
              {
                label: isGerman ? 'Zugewiesen' : 'Assigned',
                value: logStats.assignedLeads || 0,
                color: 'blue'
              },
              {
                label: isGerman ? 'Akzeptiert' : 'Accepted',
                value: logStats.acceptedLeads || 0,
                color: 'emerald'
              },
              {
                label: isGerman ? 'Abgelehnt' : 'Rejected',
                value: logStats.rejectedLeads || 0,
                color: 'red'
              }
            ];
          } else if (activeTab === 'partners') {
            tabSpecificStats = [
              {
                label: isGerman ? 'Registrierungen' : 'Registrations',
                value: logStats.partnerRegistrations || 0,
                color: 'blue'
              },
              {
                label: isGerman ? 'Erstellt' : 'Created',
                value: logStats.partnerCreated || 0,
                color: 'green'
              },
              {
                label: isGerman ? 'Aktualisiert' : 'Updated',
                value: logStats.partnerUpdated || 0,
                color: 'purple'
              },
              {
                label: isGerman ? 'Status Änderungen' : 'Status Updates',
                value: logStats.statusUpdates || 0,
                color: 'orange'
              },
              {
                label: isGerman ? 'Service Updates' : 'Service Updates',
                value: logStats.serviceStatusUpdates || 0,
                color: 'emerald'
              },
              {
                label: isGerman ? 'Typ Änderungen' : 'Type Updates',
                value: logStats.typeUpdates || 0,
                color: 'yellow'
              },
              {
                label: isGerman ? 'Lead Aktionen' : 'Lead Actions',
                value: logStats.leadActions || 0,
                color: 'red'
              }
            ];
          } else if (activeTab === 'settings') {
            tabSpecificStats = [
              {
                label: isGerman ? 'Admin Einstellungen' : 'Admin Settings',
                value: logStats.adminSettings || 0,
                color: 'blue'
              },
              {
                label: isGerman ? 'Partner Einstellungen' : 'Partner Settings',
                value: logStats.partnerSettings || 0,
                color: 'green'
              },
              {
                label: isGerman ? 'Profil Updates' : 'Profile Updates',
                value: logStats.profileUpdates || 0,
                color: 'purple'
              },
              {
                label: isGerman ? 'Passwort Änderungen' : 'Password Changes',
                value: logStats.passwordChanges || 0,
                color: 'orange'
              }
            ];
          }

          const statusStats = [
            {
              label: isGerman ? 'Erfolgreich' : 'Successful',
              value: logStats.successful || 0,
              color: 'emerald'
            },
            {
              label: isGerman ? 'Fehlgeschlagen' : 'Failed',
              value: logStats.failed || 0,
              color: 'red'
            },
            {
              label: isGerman ? 'Erfolgsrate' : 'Success Rate',
              value: `${logStats.successRate}%`,
              color: 'emerald'
            }
          ];

          return [...baseStats, ...tabSpecificStats, ...statusStats];
        })().map((stat, index) => (
          <motion.div
            key={index}
            className="p-4 rounded-lg flex-1 min-w-[180px] border"
            style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>{stat.label}</p>
                <p className={`text-2xl font-bold ${
                  stat.color === 'blue' ? 'text-blue-600' :
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'yellow' ? 'text-yellow-600' :
                  stat.color === 'red' ? 'text-red-600' :
                  stat.color === 'orange' ? 'text-orange-600' :
                  stat.color === 'purple' ? 'text-purple-600' :
                  stat.color === 'emerald' ? 'text-emerald-600' :
                  ''
                }`}
                style={{ color: !stat.color ? 'var(--theme-text)' : undefined }}>
                  {stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Logs Table */}
      <motion.div
        className="overflow-hidden rounded-lg border mt-6"
        style={{ borderColor: 'var(--theme-border)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
            <thead style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Zeit' : 'Time'}
                </th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Akteur' : 'Actor'}
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Aktion' : 'Action'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Lead/Partner' : 'Lead/Partner'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Service' : 'Service'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Beschreibung' : 'Description'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Status' : 'Status'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Aktion' : 'Action'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? "8" : "7"} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Lade...' : 'Loading...'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? "8" : "7"} className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Keine Logs gefunden' : 'No logs found'}
                  </td>
                </tr>
              ) : (
                currentLogs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-opacity-50"
                >
                  {/* Timestamp */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                    <div className="flex flex-col">
                      <span className="font-medium">{log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="text-xs opacity-70">{log.timestamp.toLocaleDateString()}</span>
                    </div>
                  </td>

                  {/* Actor */}
                  {isSuperAdmin && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="mr-1">{getRoleIcon(log.role)}</span>
                          <span className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>
                            {log.role}
                          </span>
                        </div>
                        <span className="text-xs opacity-70 truncate max-w-32" title={log.userEmail}>
                          {log.userName || log.userEmail || log.partnerName || '-'}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Action */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>

                  {/* Lead/Partner Info */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      {log.leadId && (
                        <div className="flex items-center mb-1">
                          <span className="text-xs text-blue-600 mr-1">📋</span>
                          <span className="font-mono text-xs font-medium text-blue-600">
                            {log.leadId}
                          </span>
                        </div>
                      )}
                      {log.partnerName && (
                        <div className="flex items-center">
                          <span className="text-xs text-orange-600 mr-1">🏢</span>
                          <span className="text-xs text-orange-600 font-medium truncate max-w-24" title={log.partnerName}>
                            {log.partnerName}
                          </span>
                        </div>
                      )}
                      {log.leadCustomer && (
                        <div className="flex items-center">
                          <span className="text-xs text-green-600 mr-1">👤</span>
                          <span className="text-xs text-green-600 truncate max-w-24" title={log.leadCustomer}>
                            {log.leadCustomer}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Service Type */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {log.leadServiceType && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.leadServiceType === 'moving'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {log.leadServiceType === 'moving' ? '🚛' : '🧽'} {log.leadServiceType}
                      </span>
                    )}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 text-xs max-w-64" style={{ color: 'var(--theme-text)' }}>
                    <div className="truncate" title={log.details}>
                      {log.details}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'success' ? 'bg-green-100 text-green-800' :
                      log.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.status === 'success' ? '✅' : log.status === 'failed' ? '❌' : '⏳'}
                      {log.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedLog(log);
                        setShowLogModal(true);
                      }}
                      className="text-gray-600 hover:text-gray-900 text-xs px-2 py-1 rounded transition-colors"
                      style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
                      title={isGerman ? 'Details anzeigen' : 'View Details'}
                    >
                      👁️ {isGerman ? 'Details' : 'View'}
                    </button>
                  </td>
                </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalLogs}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* Log Details Modal */}
      <AnimatePresence>
        {showLogModal && selectedLog && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogModal(false)}
          >
            <motion.div
              className="max-w-2xl w-full p-6 rounded-lg"
              style={{ backgroundColor: 'var(--theme-bg)' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Log-Details' : 'Log Details'}
                </h3>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong style={{ color: 'var(--theme-text)' }} className="block text-sm">
                      {isGerman ? 'Log ID:' : 'Log ID:'}
                    </strong> 
                    <span className="font-mono text-sm" style={{ color: 'var(--theme-muted)' }}>
                      {selectedLog.id}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--theme-text)' }} className="block text-sm">
                      {isGerman ? 'Status:' : 'Status:'}
                    </strong> 
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLog.status)}`}>
                      <span className="mr-2">
                        {selectedLog.status === 'success' ? '✅' : selectedLog.status === 'failed' ? '❌' : '⚠️'}
                      </span>
                      {selectedLog.status}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--theme-text)' }} className="block text-sm">
                      {isGerman ? 'Zeitstempel:' : 'Timestamp:'}
                    </strong> 
                    <span style={{ color: 'var(--theme-muted)' }} className="text-sm">
                      {formatTimestamp(selectedLog.timestamp)}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--theme-text)' }} className="block text-sm">
                      {isGerman ? 'Aktion:' : 'Action:'}
                    </strong> 
                    <span className={`text-sm font-medium ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                </div>

                {/* Actor Information */}
                {selectedLog.userEmail && (
                  <div>
                    <strong style={{ color: 'var(--theme-text)' }} className="block text-sm mb-2">
                      {isGerman ? 'Akteur:' : 'Actor:'}
                    </strong>
                    <div className="grid grid-cols-2 gap-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                      <div>
                        <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Rolle:' : 'Role:'}
                        </span>
                        <div className="flex items-center mt-1">
                          <span className="mr-2">{getRoleIcon(selectedLog.role)}</span>
                          <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
                            {selectedLog.role}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'E-Mail:' : 'Email:'}
                        </span>
                        <div className="text-sm mt-1" style={{ color: 'var(--theme-text)' }}>
                          {selectedLog.userEmail}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Related Information */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedLog.leadId && (
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }} className="block text-sm">
                        {isGerman ? 'Lead ID:' : 'Lead ID:'}
                      </strong>
                      <div className="mt-2">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {selectedLog.leadId}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedLog.partnerName && (
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }} className="block text-sm">
                        {isGerman ? 'Partner:' : 'Partner:'}
                      </strong>
                      <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                        {selectedLog.partnerName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div>
                  <strong style={{ color: 'var(--theme-text)' }} className="block text-sm mb-2">
                    {isGerman ? 'Nachricht:' : 'Message:'}
                  </strong>
                  <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)' }}>
                    {selectedLog.details || selectedLog.message || 'No message available'}
                  </div>
                </div>

                {/* Technical Details */}
                {isSuperAdmin && (
                  <div>
                    <strong style={{ color: 'var(--theme-text)' }} className="block text-sm mb-2">
                      {isGerman ? 'Technische Details:' : 'Technical Details:'}
                    </strong>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {selectedLog.metadata?.ipAddress && (
                        <div>
                          <span style={{ color: 'var(--theme-muted)' }}>IP Address:</span>
                          <div className="font-mono mt-1" style={{ color: 'var(--theme-text)' }}>
                            {selectedLog.metadata.ipAddress}
                          </div>
                        </div>
                      )}
                      {selectedLog.sourceDomain && (
                        <div>
                          <span style={{ color: 'var(--theme-muted)' }}>Domain:</span>
                          <div className="mt-1" style={{ color: 'var(--theme-text)' }}>
                            {selectedLog.sourceDomain}
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedLog.metadata?.userAgent && (
                      <div className="mt-4">
                        <span style={{ color: 'var(--theme-muted)' }}>User Agent:</span>
                        <div className="mt-1 p-3 rounded border text-sm font-mono break-all select-text" style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)', borderColor: 'var(--theme-border)' }}>
                          {selectedLog.metadata.userAgent}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Full Data */}
                {selectedLog.fullData && isSuperAdmin && (
                  <div>
                    <strong style={{ color: 'var(--theme-text)' }} className="block text-sm mb-2">
                      {isGerman ? 'Vollständige Daten:' : 'Full Data:'}
                    </strong>
                    <pre 
                      className="p-3 rounded-lg text-xs overflow-auto max-h-64 border select-text"
                      style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)', borderColor: 'var(--theme-border)' }}
                    >
                      {JSON.stringify(selectedLog.fullData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogsModule;