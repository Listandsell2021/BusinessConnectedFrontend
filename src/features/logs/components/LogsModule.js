import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useService } from '../../../contexts/ServiceContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { logsAPI, adminLogsAPI } from '../../../lib/api/api';
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
    leadActions: 0,
    partnerActions: 0,
    settingsActions: 0
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tab and Filter states
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'leads', 'partners', 'settings', 'system'

  // Independent Pagination for each tab
  const [tabPagination, setTabPagination] = useState({
    all: 1,
    leads: 1,
    partners: 1,
    settings: 1
  });
  const itemsPerPage = 10;

  // Get current page for active tab
  const currentPage = tabPagination[activeTab] || 1;

  // Set page for current active tab
  const setCurrentPage = (page) => {
    setTabPagination(prev => ({
      ...prev,
      [activeTab]: page
    }));
  };
  const [filters, setFilters] = useState({
    actorType: 'all',
    action: 'all',
    dateRange: 'all'
  });

  // Filter logs by tab category
  const getTabFilteredLogs = (logs, tab) => {
    switch (tab) {
      case 'leads':
        return logs.filter(log =>
          log.action.includes('lead_') ||
          log.action.includes('cancellation_')
        );
      case 'partners':
        return logs.filter(log =>
          log.action.includes('partner_') ||
          log.action === 'lead_assigned' ||
          log.action === 'lead_reassigned'
        );
      case 'settings':
        return logs.filter(log =>
          log.action.includes('settings_') ||
          log.action.includes('pricing_') ||
          log.action.includes('system_') ||
          log.action.includes('config_')
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
        ...dateParams
      };

      let response;
      if (isPartner) {
        // Partners get their own logs (keep using old API for now since adminLogs is admin-only)
        response = await logsAPI.getPartnerLogs(user.id, params);
      } else {
        // Superadmins get all logs using the logs API (not admin-logs)
        response = await logsAPI.getAll(params);
      }
      
      const rawLogsData = response.data.logs || [];
      const totalCount = response.data.pagination?.total || rawLogsData.length;
      
      // Transform backend data structure to match frontend expectations
      const transformedLogs = rawLogsData.map(log => {
        // Enhanced action description for better readability
        const getActionDescription = (action, message, actor, leadId, partnerInfo) => {
          const actorName = actor?.name || actor?.email || (isGerman ? 'Unbekannt' : 'Unknown');
          const partnerName = partnerInfo?.companyName || (isGerman ? 'Unbekannter Partner' : 'Unknown Partner');
          const leadIdDisplay = leadId?.leadId || leadId || (isGerman ? 'Unbekannter Lead' : 'Unknown Lead');

          // Always generate description based on current language preference
          // This ensures proper localization regardless of what's stored in DB
          switch (action) {
            case 'lead_created':
              return isGerman
                ? `Lead ${leadIdDisplay} erstellt von ${actorName}`
                : `${actorName} created lead ${leadIdDisplay}`;
            case 'lead_assigned':
              return isGerman
                ? `Lead ${leadIdDisplay} zugewiesen an ${partnerName} von ${actorName}`
                : `${actorName} assigned lead ${leadIdDisplay} to ${partnerName}`;
            case 'lead_reassigned':
              return isGerman
                ? `Lead ${leadIdDisplay} neu zugewiesen an ${partnerName} von ${actorName}`
                : `${actorName} reassigned lead ${leadIdDisplay} to ${partnerName}`;
            case 'lead_accepted':
              return isGerman
                ? `Lead ${leadIdDisplay} akzeptiert von ${partnerName}`
                : `${partnerName} accepted lead ${leadIdDisplay}`;
            case 'lead_rejected':
              return isGerman
                ? `Lead ${leadIdDisplay} abgelehnt von ${partnerName}`
                : `${partnerName} rejected lead ${leadIdDisplay}`;
            case 'lead_cancelled':
              return isGerman
                ? `Lead ${leadIdDisplay} storniert von ${actorName}`
                : `${actorName} cancelled lead ${leadIdDisplay}`;
            case 'cancellation_requested':
              return isGerman
                ? `Stornierung beantragt für Lead ${leadIdDisplay} von ${actorName}`
                : `${actorName} requested cancellation for lead ${leadIdDisplay}`;
            case 'partner_registration':
              return isGerman
                ? `${partnerName} hat sich für Service registriert`
                : `${partnerName} registered for service`;
            case 'partner_created':
              return isGerman
                ? `Partner erstellt von ${actorName}: ${partnerName}`
                : `Partner created by ${actorName}: ${partnerName}`;
            case 'partner_approved':
              return isGerman
                ? `Partner ${partnerName} genehmigt von ${actorName}`
                : `${actorName} approved partner ${partnerName}`;
            case 'partner_rejected':
              return isGerman
                ? `Partner ${partnerName} abgelehnt von ${actorName}`
                : `${actorName} rejected partner ${partnerName}`;
            case 'partner_suspended':
              return isGerman
                ? `Partner ${partnerName} gesperrt von ${actorName}`
                : `${actorName} suspended partner ${partnerName}`;
            case 'partner_updated':
              return isGerman
                ? `${partnerName} hat Profil aktualisiert`
                : `${partnerName} updated profile`;
            case 'partner_type_updated':
              return isGerman
                ? `Partner-Typ geändert von ${actorName}: ${partnerName}`
                : `Partner type changed by ${actorName}: ${partnerName}`;
            case 'email_sent':
              return isGerman
                ? `E-Mail erfolgreich gesendet`
                : `Email sent successfully`;
            case 'email_failed':
              return isGerman
                ? `E-Mail-Zustellung fehlgeschlagen`
                : `Email delivery failed`;
            case 'settings_updated':
              return isGerman
                ? `Einstellungen aktualisiert von ${actorName}`
                : `${actorName} updated settings`;
            case 'partner_reactivated':
              return isGerman
                ? `Partner ${partnerName} reaktiviert von ${actorName}`
                : `${actorName} reactivated partner ${partnerName}`;
            case 'partner_suspend_cancel':
              return isGerman
                ? `Sperrung aufgehoben für Partner: ${partnerName}`
                : `Suspension cancelled for partner: ${partnerName}`;
            case 'partner_status_updated':
              return isGerman
                ? `Partner-Status geändert von ${actorName}: ${partnerName}`
                : `Partner status changed by ${actorName}: ${partnerName}`;
            case 'partner_service_status_updated':
              return isGerman
                ? `Service-Status aktualisiert für ${partnerName}`
                : `Service status updated for ${partnerName}`;
            case 'partner_service_approved':
              return isGerman
                ? `Service genehmigt für ${partnerName}`
                : `Service approved for ${partnerName}`;
            case 'partner_service_rejected':
              return isGerman
                ? `Service abgelehnt für ${partnerName}`
                : `Service rejected for ${partnerName}`;
            case 'partner_deleted':
              return isGerman
                ? `Partner ${partnerName} gelöscht von ${actorName}`
                : `Partner ${partnerName} deleted by ${actorName}`;
            case 'partner_dashboard_accessed':
              return isGerman
                ? `${partnerName} hat Dashboard aufgerufen`
                : `${partnerName} accessed dashboard`;
            case 'partner_lead_viewed':
              return isGerman
                ? `${partnerName} hat Lead ${leadIdDisplay} angesehen`
                : `${partnerName} viewed lead ${leadIdDisplay}`;
            case 'partner_lead_contacted':
              return isGerman
                ? `${partnerName} hat Lead ${leadIdDisplay} kontaktiert`
                : `${partnerName} contacted lead ${leadIdDisplay}`;
            case 'partner_invoice_downloaded':
              return isGerman
                ? `${partnerName} hat Rechnung heruntergeladen`
                : `${partnerName} downloaded invoice`;
            case 'user_created':
              return isGerman
                ? `Benutzer erstellt von ${actorName}`
                : `User created by ${actorName}`;
            case 'user_updated':
              return isGerman
                ? `Benutzer aktualisiert von ${actorName}`
                : `User updated by ${actorName}`;
            case 'user_deleted':
              return isGerman
                ? `Benutzer gelöscht von ${actorName}`
                : `User deleted by ${actorName}`;
            case 'user_role_changed':
              return isGerman
                ? `Benutzerrolle geändert von ${actorName}`
                : `User role changed by ${actorName}`;
            case 'login_success':
              return isGerman
                ? `${actorName} hat sich erfolgreich angemeldet`
                : `${actorName} logged in successfully`;
            case 'login_failed':
              return isGerman
                ? `Fehlgeschlagener Anmeldeversuch für ${actorName}`
                : `Failed login attempt for ${actorName}`;
            case 'logout':
              return isGerman
                ? `${actorName} hat sich abgemeldet`
                : `${actorName} logged out`;
            case 'password_reset':
              return isGerman
                ? `Passwort zurückgesetzt für ${actorName}`
                : `Password reset for ${actorName}`;
            case 'password_reset_request':
              return isGerman
                ? `Passwort-Reset beantragt von ${actorName}`
                : `Password reset requested by ${actorName}`;
            case 'invoice_generated':
              return isGerman
                ? `Rechnung erstellt für ${partnerName}`
                : `Invoice generated for ${partnerName}`;
            case 'invoice_sent':
              return isGerman
                ? `Rechnung gesendet an ${partnerName}`
                : `Invoice sent to ${partnerName}`;
            case 'data_exported':
              return isGerman
                ? `Daten exportiert von ${actorName}`
                : `Data exported by ${actorName}`;
            case 'system_settings_updated':
              return isGerman
                ? `Systemeinstellungen aktualisiert von ${actorName}`
                : `System settings updated by ${actorName}`;
            case 'service_config_updated':
              return isGerman
                ? `Service-Konfiguration aktualisiert von ${actorName}`
                : `Service configuration updated by ${actorName}`;
            case 'webhook_received':
              return isGerman
                ? `Webhook empfangen`
                : `Webhook received`;
            case 'webhook_failed':
              return isGerman
                ? `Webhook-Verarbeitung fehlgeschlagen`
                : `Webhook processing failed`;
            case 'scheduled_job':
              return isGerman
                ? `Geplanter Job ausgeführt`
                : `Scheduled job executed`;
            case 'security_alert':
              return isGerman
                ? `Sicherheitswarnung`
                : `Security alert`;
            case 'suspicious_activity_detected':
              return isGerman
                ? `Verdächtige Aktivität erkannt`
                : `Suspicious activity detected`;
            case 'rate_limit_exceeded':
              return isGerman
                ? `Rate-Limit überschritten`
                : `Rate limit exceeded`;
            case 'database_cleanup':
              return isGerman
                ? `Datenbank-Bereinigung abgeschlossen`
                : `Database cleanup completed`;
            case 'system_backup_created':
              return isGerman
                ? `System-Backup erstellt`
                : `System backup created`;
            default:
              // Generate a basic German translation for unknown actions
              if (isGerman) {
                const germanWords = {
                  'lead': 'Lead',
                  'partner': 'Partner',
                  'user': 'Benutzer',
                  'created': 'erstellt',
                  'updated': 'aktualisiert',
                  'deleted': 'gelöscht',
                  'approved': 'genehmigt',
                  'rejected': 'abgelehnt',
                  'assigned': 'zugewiesen',
                  'cancelled': 'storniert',
                  'sent': 'gesendet',
                  'failed': 'fehlgeschlagen',
                  'settings': 'Einstellungen',
                  'system': 'System',
                  'service': 'Service',
                  'status': 'Status',
                  'type': 'Typ'
                };

                return action.split('_').map(word => germanWords[word] || word).join(' ');
              }
              return action.replace(/_/g, ' ').toLowerCase();
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
          leadServiceType: log.serviceType,
          leadCustomer: log.leadId ? `${log.leadId.user?.firstName || ''} ${log.leadId.user?.lastName || ''}`.trim() : null,
          partnerId: log.partnerId?._id || log.partnerId,
          partnerName: log.partnerId?.companyName,
          partnerEmail: log.partnerId?.contactPerson?.email,
          // Always generate description based on current language (for proper translations)
          // If DB has the message in the selected language, use it; otherwise generate
          details: isGerman
            ? (log.message_de && log.message_de.trim() !== '')
              ? log.message_de
              : getActionDescription(log.action, null, log.actor, log.leadId, log.partnerId)
            : (log.message && log.message.trim() !== '')
              ? log.message
              : getActionDescription(log.action, null, log.actor, log.leadId, log.partnerId),
          originalMessage: log.message,
          originalMessage_de: log.message_de,
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
        const leadActions = currentTabLogs.filter(l => ['lead_assigned', 'lead_reassigned', 'partner_lead_accepted', 'partner_lead_rejected', 'partner_lead_cancel_requested'].includes(l.action));
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
        leadActions: currentTabLogs.filter(l => l.action?.includes('lead_') || l.action?.includes('cancellation_')).length,
        partnerActions: currentTabLogs.filter(l => l.action?.includes('partner_')).length,
        settingsActions: currentTabLogs.filter(l => l.action?.includes('settings_') || l.action?.includes('system_')).length,
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

  // Reload logs when filters, pagination, active tab, or language change
  useEffect(() => {
    if (currentService) {
      loadLogs();
    }
  }, [currentPage, filters.actorType, filters.action, filters.dateRange, activeTab, isGerman]);

  // Export functionality removed per user request

  // Reset to first page when filters change (but NOT when tab changes)
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.actorType, filters.action, filters.dateRange]);

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
    const iconMap = {
      user: (
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      partner: (
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      superadmin: (
        <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      ),
      system: (
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    };
    return iconMap[role] || (
      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getActionColor = (action) => {
    const colors = {
      'lead_created': 'text-green-500',
      'lead_assigned': 'text-blue-500',
      'lead_accepted': 'text-emerald-500',
      'lead_rejected': 'text-red-500',
      'lead_cancelled': 'text-red-500',
      'cancellation_requested': 'text-orange-500',
      'partner_created': 'text-green-500',
      'partner_approved': 'text-green-500',
      'partner_rejected': 'text-red-500',
      'partner_type_updated': 'text-purple-500',
      'partner_updated': 'text-purple-500',
      'email_sent': 'text-blue-500',
      'email_failed': 'text-red-500',
      'settings_updated': 'text-yellow-500',
      'data_exported': 'text-purple-500'
    };
    return colors[action] || 'text-gray-400';
  };

  const getRoleLabel = (role) => {
    if (!isGerman) return role;

    const labels = {
      'superadmin': 'Administrator',
      'admin': 'Administrator',
      'partner': 'Partner',
      'user': 'Benutzer',
      'system': 'System'
    };
    return labels[role] || role;
  };

  const getActionLabel = (action) => {
    if (!isGerman) {
      return action.replace(/_/g, ' ').toUpperCase();
    }

    const labels = {
      'lead_created': 'LEAD ERSTELLT',
      'lead_assigned': 'LEAD ZUGEWIESEN',
      'lead_reassigned': 'LEAD NEU ZUGEWIESEN',
      'lead_accepted': 'LEAD AKZEPTIERT',
      'lead_rejected': 'LEAD ABGELEHNT',
      'lead_cancelled': 'LEAD STORNIERT',
      'cancellation_requested': 'STORNIERUNG BEANTRAGT',
      'partner_registration': 'PARTNER REGISTRIERUNG',
      'partner_created': 'PARTNER ERSTELLT',
      'partner_approved': 'PARTNER GENEHMIGT',
      'partner_rejected': 'PARTNER ABGELEHNT',
      'partner_suspended': 'PARTNER GESPERRT',
      'partner_updated': 'PARTNER AKTUALISIERT',
      'partner_type_updated': 'PARTNER TYP GEÄNDERT',
      'partner_status_updated': 'PARTNER STATUS GEÄNDERT',
      'partner_service_status_updated': 'SERVICE STATUS GEÄNDERT',
      'email_sent': 'E-MAIL GESENDET',
      'email_failed': 'E-MAIL FEHLGESCHLAGEN',
      'settings_updated': 'EINSTELLUNGEN AKTUALISIERT',
      'data_exported': 'DATEN EXPORTIERT',
      'password_reset': 'PASSWORT ZURÜCKGESETZT'
    };
    return labels[action] || action.replace(/_/g, ' ').toUpperCase();
  };

  // Export functionality removed per user request

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
        {/* Export functionality removed per user request */}
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
              <option value="superadmin">{isGerman ? 'Admin' : 'Admin'}</option>
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
                  <option value="password_reset">{isGerman ? 'Passwort zurücksetzen' : 'Password Reset'}</option>
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
                  <option value="partner_registration">{isGerman ? 'Partner Registrierung' : 'Partner Registration'}</option>
                  <option value="partner_created">{isGerman ? 'Partner erstellt' : 'Partner Created'}</option>
                  <option value="partner_approved">{isGerman ? 'Partner genehmigt' : 'Partner Approved'}</option>
                  <option value="partner_rejected">{isGerman ? 'Partner abgelehnt' : 'Partner Rejected'}</option>
                  <option value="partner_type_updated">{isGerman ? 'Partner Typ geändert' : 'Partner Type Changed'}</option>
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
                  <option value="lead_assigned">{isGerman ? 'Lead zugewiesen' : 'Lead Assigned'}</option>
                  <option value="lead_reassigned">{isGerman ? 'Lead neu zugewiesen' : 'Lead Reassigned'}</option>
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
              color: 'blue',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              )
            },
            {
              label: isGerman ? 'Heute' : 'Today',
              value: logStats.today,
              color: 'yellow',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )
            }
          ];

          let tabSpecificStats = [];

          if (activeTab === 'all') {
            tabSpecificStats = [
              {
                label: isGerman ? 'Lead Aktionen' : 'Lead Actions',
                value: logStats.leadActions || 0,
                color: 'green',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )
              },
              {
                label: isGerman ? 'Partner Aktionen' : 'Partner Actions',
                value: logStats.partnerActions || 0,
                color: 'orange',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )
              },
              {
                label: isGerman ? 'System/Einstellungen' : 'System/Settings',
                value: logStats.settingsActions || 0,
                color: 'purple',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )
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

          // Status stats removed per user request

          return [...baseStats, ...tabSpecificStats];
        })().map((stat, index) => (
          <motion.div
            key={index}
            className="p-4 rounded-lg flex-1 min-w-[180px] border"
            style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
          >
            <div>
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>{stat.label}</p>
              <div className="flex items-center justify-between mt-1">
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
                {stat.icon && (
                  <div className={`${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'yellow' ? 'text-yellow-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    stat.color === 'orange' ? 'text-orange-600' :
                    stat.color === 'purple' ? 'text-purple-600' :
                    stat.color === 'emerald' ? 'text-emerald-600' :
                    ''
                  }`} style={{ color: !stat.color ? 'var(--theme-text)' : undefined }}>
                    {stat.icon}
                  </div>
                )}
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
                  {isGerman ? 'Beschreibung' : 'Description'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Details' : 'Details'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? "6" : "5"} className="px-6 py-12 text-center">
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
                  <td colSpan={isSuperAdmin ? "6" : "5"} className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
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
                            {getRoleLabel(log.role)}
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
                      {getActionLabel(log.action)}
                    </span>
                  </td>

                  {/* Lead/Partner Info */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      {log.leadId && (
                        <div className="flex items-center mb-1">
                          <svg className="w-3 h-3 text-blue-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="font-mono text-xs font-medium text-blue-600">
                            {log.leadId}
                          </span>
                        </div>
                      )}
                      {log.partnerName && (
                        <div className="flex items-center">
                          <svg className="w-3 h-3 text-orange-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-xs text-orange-600 font-medium truncate max-w-24" title={log.partnerName}>
                            {log.partnerName}
                          </span>
                        </div>
                      )}
                      {log.leadCustomer && (
                        <div className="flex items-center">
                          <svg className="w-3 h-3 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-xs text-green-600 truncate max-w-24" title={log.leadCustomer}>
                            {log.leadCustomer}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Description with fixed width and tooltip */}
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--theme-text)', maxWidth: '300px' }}>
                    <div
                      className="truncate cursor-pointer"
                      title={log.details}
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {log.details}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedLog(log);
                        setShowLogModal(true);
                      }}
                      className="text-xs px-3 py-1.5 rounded transition-colors font-medium"
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: '#3B82F6'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                      }}
                      title={isGerman ? 'Details anzeigen' : 'View Details'}
                    >
                      👁️ {isGerman ? 'Anzeigen' : 'View'}
                    </button>
                  </td>
                </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Only show pagination if there are logs */}
      {currentLogs.length > 0 && totalLogs > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalLogs}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Log Details Modal */}
      <AnimatePresence>
        {showLogModal && selectedLog && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50"
            style={{ paddingLeft: '10rem', paddingTop: '2rem' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogModal(false)}
          >
            <motion.div
              className="rounded-lg border flex flex-col overflow-hidden"
              style={{
                borderColor: 'var(--theme-border)',
                backgroundColor: 'var(--theme-bg)',
                width: '600px',
                height: '80vh',
                maxHeight: '700px',
                marginTop: '50px'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--theme-border)' }}>
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

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6">
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
                  {/* Status section removed per user request */}
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
                            {getRoleLabel(selectedLog.role)}
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
                    {isGerman
                      ? (selectedLog.originalMessage_de && selectedLog.originalMessage_de.trim() !== ''
                          ? selectedLog.originalMessage_de
                          : selectedLog.details)
                      : (selectedLog.originalMessage && selectedLog.originalMessage.trim() !== ''
                          ? selectedLog.originalMessage
                          : selectedLog.details)
                    }
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
                          <span style={{ color: 'var(--theme-muted)' }}>{isGerman ? 'IP-Adresse:' : 'IP Address:'}</span>
                          <div className="font-mono mt-1" style={{ color: 'var(--theme-text)' }}>
                            {selectedLog.metadata.ipAddress}
                          </div>
                        </div>
                      )}
                      {selectedLog.sourceDomain && (
                        <div>
                          <span style={{ color: 'var(--theme-muted)' }}>{isGerman ? 'Domäne:' : 'Domain:'}</span>
                          <div className="mt-1" style={{ color: 'var(--theme-text)' }}>
                            {selectedLog.sourceDomain}
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedLog.metadata?.userAgent && (
                      <div className="mt-4">
                        <span style={{ color: 'var(--theme-muted)' }}>{isGerman ? 'Browser-Agent:' : 'User Agent:'}</span>
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogsModule;