import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import {
  BellIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  UserPlusIcon,
  PencilIcon,
  ClockIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../src/contexts/AuthContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useService } from '../src/contexts/ServiceContext';
import { useNotification } from '../src/contexts/NotificationContext';
import ThemeToggle from '../src/components/ui/ThemeToggle';
import LanguageToggle from '../src/components/ui/LanguageToggle';
import ServiceSelector from '../src/components/ui/ServiceSelector';
import { LeadManagement } from '../src/features/leads';
import { PartnerManagement } from '../src/features/partners';
import { LogsModule } from '../src/features/logs';
import { IncomeInvoices } from '../src/features/income';
import { PartnerSettings, AdminSettings } from '../src/features/settings';
import PartnerInvoices from '../src/components/partner/PartnerInvoices';
import EnhancedDashboard from '../src/components/dashboard/EnhancedDashboard';
import { partnersAPI, invoicesAPI, leadsAPI } from '../src/lib/api/api';

export default function Dashboard({ initialData = {} }) {
  const router = useRouter();
  const { user, isAuthenticated, logout, loading, isSuperAdmin, isPartner } = useAuth();
  const { t, isGerman } = useLanguage();
  const { mounted, isDark } = useTheme();
  const { currentService } = useService();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markSingleAsRead,
    loading: notificationsLoading
  } = useNotification();

  // State for active tab
  const [activeTab, setActiveTab] = useState('overview');

  // Update active tab when route changes
  useEffect(() => {
    if (router.isReady) {
      const newTab = router.query.tab || 'overview';
      setActiveTab(newTab);
    }
  }, [router.isReady, router.query.tab]);

  // State for dynamic recent leads
  const [recentLeadsData, setRecentLeadsData] = useState([]);
  const [loadingRecentLeads, setLoadingRecentLeads] = useState(true);

  // State for dynamic partner stats
  const [partnerStats, setPartnerStats] = useState({
    totalLeads: 0,
    accepted: 0,
    rejectedCancelled: 0,
    totalPaidInvoices: 0,
    pendingInvoices: 0
  });
  const [loadingPartnerStats, setLoadingPartnerStats] = useState(true);
  
  // Function to handle tab changes and update URL
  const handleTabChange = (tabId) => {
    router.push(`/dashboard?tab=${tabId}`);
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Helper function to get translated user display name
  const getDisplayName = () => {
    // Get base name from user object
    const baseName = user?.name ||
                     (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null) ||
                     user?.email?.split('@')[0] ||
                     (isGerman ? 'Benutzer' : 'User');

    // Check if name contains "admin" and "user" (case-insensitive) for German translation
    const nameLower = String(baseName).toLowerCase();
    if (isGerman && nameLower.includes('admin') && nameLower.includes('user')) {
      return 'Admin-Benutzer';
    }
    return baseName;
  };

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push('/partner-login');
    }
  }, [isAuthenticated, loading, router]);

  // Fetch recent leads for partners - moved before useEffect
  const fetchRecentLeads = async () => {
    try {
      setLoadingRecentLeads(true);
      console.log('Fetching recent leads for partner:', user.id, 'service:', currentService);

      const response = await leadsAPI.getAll({
        serviceType: currentService,
        partner: user.id, // Filter by partner ID
        page: 1,
        limit: 100, // Get more leads to sort by assignedAt properly
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      console.log('Recent leads API response:', response);
      const leads = response.data.leads || [];
      console.log('Extracted leads:', leads);

      // Filter leads that have partner assignments for this partner
      const partnerLeads = leads.filter(lead => {
        return lead.partnerAssignments?.some(pa =>
          pa.partner === user.id || pa.partner?._id === user.id || pa.partner?.toString() === user.id
        );
      });

      // Transform and sort by assignedAt date
      const transformedLeads = partnerLeads.map(lead => {
        const partnerAssignment = lead.partnerAssignments?.find(pa =>
          pa.partner === user.id || pa.partner?._id === user.id || pa.partner?.toString() === user.id
        );

        return {
          id: lead._id,
          leadId: lead.leadId,
          name: lead.user ? `${lead.user.firstName} ${lead.user.lastName}`.trim() : 'Unknown',
          email: lead.user?.email || 'No email',
          phone: lead.user?.phone || 'No phone',
          service: getServiceDisplayName(lead),
          serviceType: lead.serviceType,
          location: getLocationDisplay(lead) || 'Unknown location',
          address: getAddressDisplay(lead),
          value: partnerAssignment?.leadPrice ? `€${partnerAssignment.leadPrice}` : '€-',
          estimatedTime: '2-4 hours',
          status: getPartnerStatusForDisplay(partnerAssignment?.status),
          time: getTimeAgo(partnerAssignment?.assignedAt || lead.createdAt), // Use assignedAt from partner assignment
          priority: 'medium',
          avatar: '👤', // Default avatar for all leads
          assignedAt: partnerAssignment?.assignedAt || lead.createdAt, // Keep original date for sorting
          partnerAssignment: partnerAssignment // Keep reference for debugging
        };
      }).sort((a, b) => {
        // Sort by assignedAt date, most recent first
        const dateA = new Date(a.assignedAt);
        const dateB = new Date(b.assignedAt);
        return dateB - dateA;
      }).slice(0, 5); // Take only the latest 5

      console.log('Filtered partner leads:', partnerLeads.length);
      console.log('Transformed and sorted leads for recent display:', transformedLeads);
      console.log('Leads sorted by assignedAt:', transformedLeads.map(l => ({
        leadId: l.leadId,
        assignedAt: l.assignedAt,
        status: l.status
      })));
      setRecentLeadsData(transformedLeads);
    } catch (error) {
      console.error('Error fetching recent leads:', error);
      setRecentLeadsData([]);
    } finally {
      setLoadingRecentLeads(false);
    }
  };

  useEffect(() => {
    if (isPartner && user?.id && currentService) {
      fetchRecentLeads();
    } else if (!isPartner) {
      // For admins, show empty state
      setRecentLeadsData([]);
      setLoadingRecentLeads(false);
    }
  }, [isPartner, user?.id, currentService, fetchRecentLeads]);

  const fetchPartnerStats = useCallback(async () => {
    try {
      setLoadingPartnerStats(true);
      console.log('Fetching partner stats for:', user.id, 'service:', currentService);

      // Fetch partner leads using same API as Lead Management
      const leadsResponse = await leadsAPI.getAll({
        serviceType: currentService,
        partner: user.id, // Filter by partner ID
        page: 1,
        limit: 100 // Maximum allowed limit for stats
      });

      const leads = leadsResponse.data.leads || [];
      console.log('=== PARTNER STATS DEBUG ===');
      console.log('All partner leads for stats:', leads);
      console.log('Number of leads found:', leads.length);
      console.log('Sample lead structure:', leads[0]);
      console.log('Sample partnerAssignments:', leads[0]?.partnerAssignments);

      // Calculate lead stats
      let totalLeads = 0;
      let accepted = 0;
      let rejectedCancelled = 0;

      leads.forEach((lead, index) => {
        console.log(`Lead ${index + 1}:`, {
          leadId: lead.leadId,
          hasPartnerAssignments: !!lead.partnerAssignments,
          partnerAssignments: lead.partnerAssignments
        });

        if (lead.partnerAssignments) {
          // Use filter() instead of find() to get ALL assignments for this partner
          // (handles duplicate assignments to same lead)
          const partnerAssignments = lead.partnerAssignments.filter(pa =>
            pa.partner === user.id || pa.partner?._id === user.id || pa.partner?.toString() === user.id
          );

          console.log(`  Partner assignments for ${user.id} in lead ${lead.leadId}:`, partnerAssignments.length);

          if (partnerAssignments.length > 0) {
            // Count EACH assignment separately (not just the lead)
            partnerAssignments.forEach((assignment, idx) => {
              totalLeads++;
              console.log(`  ✅ [${idx + 1}/${partnerAssignments.length}] Counting assignment for lead ${lead.leadId}, status: ${assignment.status}, _id: ${assignment._id}`);

              if (assignment.status === 'accepted') {
                accepted++;
                console.log(`    → Accepted count: ${accepted}`);
              } else if (assignment.status === 'rejected' || assignment.status === 'cancelled') {
                rejectedCancelled++;
                console.log(`    → Rejected/Cancelled count: ${rejectedCancelled}`);
              }
            });
          } else {
            console.log(`  ❌ No matching partner assignments for ${user.id}`);
          }
        }
      });

      console.log('=== FINAL COUNTS ===');
      console.log('Total leads:', totalLeads);
      console.log('Accepted:', accepted);
      console.log('Rejected/Cancelled:', rejectedCancelled);

      // Fetch partner invoices - try/catch to handle potential errors
      let invoices = [];
      let totalPaidAmount = 0;
      let pendingAmount = 0;

      try {
        console.log('Fetching invoices for partner:', user.id);
        // Get current month date range to match Invoice Management
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        const invoicesResponse = await invoicesAPI.getPartnerInvoices(user.id, {
          limit: 100, // Maximum allowed limit for invoices
          startDate,
          endDate
        });

        invoices = invoicesResponse.data.invoices || invoicesResponse.data || [];
        console.log('Partner invoices for stats:', invoices);

        // Calculate invoice amounts
        invoices.forEach(invoice => {
          if (invoice.status === 'paid') {
            totalPaidAmount += invoice.amount || 0;
          } else if (invoice.status === 'pending' || invoice.status === 'sent') {
            pendingAmount += invoice.amount || 0;
          }
        });

      } catch (invoiceError) {
        console.error('Error fetching partner invoices:', invoiceError);
        // Continue with 0 invoice amounts if invoice fetch fails
      }

      setPartnerStats({
        totalLeads,
        accepted,
        rejectedCancelled,
        totalPaidInvoices: totalPaidAmount,
        pendingInvoices: pendingAmount
      });

      console.log('Calculated partner stats:', {
        totalLeads,
        accepted,
        rejectedCancelled,
        totalPaidAmount,
        pendingAmount
      });

    } catch (error) {
      console.error('Error fetching partner stats:', error);
      setPartnerStats({
        totalLeads: 0,
        accepted: 0,
        rejectedCancelled: 0,
        totalPaidInvoices: 0,
        pendingInvoices: 0
      });
    } finally {
      setLoadingPartnerStats(false);
    }
  }, [user?.id, currentService]); // Add dependencies

  // Fetch partner stats for dashboard cards
  useEffect(() => {
    console.log('Stats useEffect triggered:', { isPartner, userId: user?.id, currentService });
    if (isPartner && user?.id && currentService) {
      console.log('Calling fetchPartnerStats...');
      fetchPartnerStats();
    } else {
      console.log('Skipping fetchPartnerStats - conditions not met');
    }
  }, [isPartner, user?.id, currentService, fetchPartnerStats]);

  const getMockRecentLeads = () => {
    return [
      {
        id: 1,
        name: 'Thomas Weber',
        email: 'thomas.weber@company.de',
        phone: '+49 89 456789',
        service: isGerman ? 'Sicherheitsanfrage' : 'Security Request',
        serviceType: 'securityClient',
        location: 'München',
        address: 'Bürogebäude Sicherheit...',
        value: '€-',
        estimatedTime: '-',
        status: 'new',
        time: '10 min ago',
        priority: 'high',
        avatar: '👨',
      },
      {
        id: 2,
        name: 'SafeGuard GmbH',
        email: 'info@safeguard.de',
        phone: '+49 89 987654',
        service: isGerman ? 'Sicherheitsunternehmen' : 'Security Company',
        serviceType: 'securityCompany',
        location: 'Berlin',
        address: 'Alexanderstraße 12, Berlin',
        value: '€-',
        estimatedTime: '-',
        status: 'new',
        time: '1 hour ago',
        priority: 'medium',
        avatar: '🏢',
      }
    ];
  };

  const getServiceDisplayName = (lead) => {
    // Handle security services
    if (lead.formType === 'securityClient' || lead.serviceType === 'securityClient') {
      return isGerman ? 'Sicherheitsanfrage' : 'Security Request';
    }
    if (lead.formType === 'securityCompany' || lead.serviceType === 'securityCompany') {
      return isGerman ? 'Sicherheitsunternehmen' : 'Security Company';
    }

    // Default to security (this is a security portal only)
    return isGerman ? 'Sicherheitsservice' : 'Security Service';
  };

  const getLocationDisplay = (lead) => {
    // Handle security client
    if (lead.formType === 'securityClient' || lead.serviceType === 'securityClient') {
      return lead.formData?.location || lead.formData?.city || 'Unknown location';
    }

    // Handle security company
    if (lead.formType === 'securityCompany' || lead.serviceType === 'securityCompany') {
      return lead.formData?.city || 'Unknown location';
    }

    return 'Unknown location';
  };

  const getAddressDisplay = (lead) => {
    // Handle security client
    if (lead.formType === 'securityClient' || lead.serviceType === 'securityClient') {
      return lead.formData?.description ? `${lead.formData.description.substring(0, 50)}...` : '';
    }

    // Handle security company
    if (lead.formType === 'securityCompany' || lead.serviceType === 'securityCompany') {
      const street = lead.formData?.street || '';
      const city = lead.formData?.city || '';
      return street && city ? `${street}, ${city}` : street || city || '';
    }

    return '';
  };

  const getPartnerStatusForDisplay = (partnerStatus) => {
    // Map partner assignment statuses to dashboard display statuses
    if (partnerStatus === 'pending') return 'new';
    if (partnerStatus === 'accepted') return 'qualified';
    if (partnerStatus === 'rejected') return 'contacted';
    return 'new';
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };


  if (!mounted || loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          backgroundColor: 'var(--theme-bg)',
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)'
        }}
      >
        <motion.div
          className="flex flex-col items-center space-y-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="relative"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <motion.div
              className="absolute inset-2 w-8 h-8 border-2 border-purple-500 border-b-transparent rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme-text)' }} suppressHydrationWarning>
              {isGerman ? 'Dashboard wird geladen...' : 'Loading Dashboard...'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--theme-muted)' }} suppressHydrationWarning>
              {isGerman ? 'Bereite deine Daten vor...' : 'Preparing your data...'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/partner-login');
  };

  // SVG Icons for menu items
  const MenuIcons = {
    dashboard: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    leads: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    partners: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    logs: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    income: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    settings: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    invoices: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
      </svg>
    ),
    notifications: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )
  };

  // Define menu items based on user role
  const getMenuItems = () => {
    const menuItems = [
      { id: 'overview', label: isGerman ? 'Dashboard' : 'Dashboard', icon: MenuIcons.dashboard, roles: ['superadmin', 'partner'] }
    ];

    if (isSuperAdmin) {
      menuItems.push(
        { id: 'leads', label: isGerman ? 'Lead-Verwaltung' : 'Lead Management', icon: MenuIcons.leads, roles: ['superadmin'], description: isGerman ? 'Verwalten Sie alle Leads' : 'Manage all leads' },
        { id: 'partners', label: isGerman ? 'Partner-Verwaltung' : 'Partner Management', icon: MenuIcons.partners, roles: ['superadmin'], description: isGerman ? 'Partner verwalten' : 'Manage partners' },
        { id: 'logs', label: isGerman ? 'System-Protokolle' : 'System Logs', icon: MenuIcons.logs, roles: ['superadmin'], description: isGerman ? 'System-Aktivitäten' : 'System activities' },
        { id: 'income', label: isGerman ? 'Umsätze & Rechnungen' : 'Income & Invoices', icon: MenuIcons.income, roles: ['superadmin'], description: isGerman ? 'Finanzen verwalten' : 'Manage finances' },
        { id: 'settings', label: isGerman ? 'Einstellungen' : 'Settings', icon: MenuIcons.settings, roles: ['superadmin'], description: isGerman ? 'System-Einstellungen' : 'System settings' }
      );
    }

    if (isPartner) {
      menuItems.push(
        { id: 'leads', label: isGerman ? 'Meine Leads' : 'My Leads', icon: MenuIcons.leads, roles: ['partner'], description: isGerman ? 'Ihre zugewiesenen Leads' : 'Your assigned leads' },
        { id: 'invoices', label: isGerman ? 'Meine Rechnungen' : 'My Invoices', icon: MenuIcons.invoices, roles: ['partner'], description: isGerman ? 'Ihre Rechnungen verwalten' : 'Manage your invoices' },
        { id: 'notifications', label: isGerman ? 'Benachrichtigungen' : 'Notifications', icon: MenuIcons.notifications, roles: ['partner'], description: isGerman ? 'Ihre Benachrichtigungen' : 'Your notifications' },
        { id: 'settings', label: isGerman ? 'Einstellungen' : 'Settings', icon: MenuIcons.settings, roles: ['partner'], description: isGerman ? 'Konto-Einstellungen' : 'Account settings' }
      );
    }

    return menuItems;
  };

  const dashboardStats = isPartner ? [
    {
      id: 'total_leads',
      title: isGerman ? 'Gesamt Leads' : 'Total Leads',
      value: partnerStats.totalLeads.toString(),
      previousValue: '0',
      change: partnerStats.totalLeads > 0 ? `+${partnerStats.totalLeads}` : '0',
      trend: partnerStats.totalLeads > 0 ? 'up' : 'neutral',
      icon: '📊',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: isGerman ? 'Alle Leads' : 'All leads',
      details: isGerman ? 'Gesamt zugewiesen' : 'Total assigned'
    },
    {
      id: 'accepted',
      title: isGerman ? 'Akzeptiert' : 'Accepted',
      value: partnerStats.accepted.toString(),
      previousValue: '0',
      change: partnerStats.accepted > 0 ? `+${partnerStats.accepted}` : '0',
      trend: partnerStats.accepted > 0 ? 'up' : 'neutral',
      icon: '✅',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      description: isGerman ? 'Leads angenommen' : 'Leads accepted',
      details: isGerman ? 'Erfolgreich' : 'Successful'
    },
    {
      id: 'rejected_cancelled',
      title: isGerman ? 'Abgelehnt/Storniert' : 'Rejected/Cancelled',
      value: partnerStats.rejectedCancelled.toString(),
      previousValue: '0',
      change: partnerStats.rejectedCancelled > 0 ? `+${partnerStats.rejectedCancelled}` : '0',
      trend: partnerStats.rejectedCancelled > 0 ? 'down' : 'neutral',
      icon: '❌',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      description: isGerman ? 'Kombiniert' : 'Combined',
      details: isGerman ? 'Nicht erfolgreich' : 'Unsuccessful'
    },
    {
      id: 'paid_invoices',
      title: isGerman ? 'Bezahlte Rechnungen' : 'Total Paid Invoices',
      value: `€${partnerStats.totalPaidInvoices.toFixed(2)}`,
      previousValue: '€0.00',
      change: partnerStats.totalPaidInvoices > 0 ? `+€${partnerStats.totalPaidInvoices.toFixed(2)}` : '€0.00',
      trend: partnerStats.totalPaidInvoices > 0 ? 'up' : 'neutral',
      icon: '💰',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      description: isGerman ? 'Gesamtbetrag' : 'Total amount',
      details: isGerman ? 'Bezahlt' : 'Paid'
    },
    {
      id: 'pending_invoices',
      title: isGerman ? 'Ausstehende Rechnungen' : 'Pending Invoices',
      value: `€${partnerStats.pendingInvoices.toFixed(2)}`,
      previousValue: '€0.00',
      change: partnerStats.pendingInvoices > 0 ? `+€${partnerStats.pendingInvoices.toFixed(2)}` : '€0.00',
      trend: partnerStats.pendingInvoices > 0 ? 'up' : 'neutral',
      icon: '⏳',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      description: isGerman ? 'Ausstehend' : 'Outstanding',
      details: isGerman ? 'Zu bezahlen' : 'To be paid'
    }
  ] : [
    {
      id: 'leads',
      title: isGerman ? 'Neue Leads' : 'New Leads',
      value: '47',
      previousValue: '38',
      change: '+23%',
      trend: 'up',
      icon: '📈',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: isGerman ? 'Diese Woche' : 'This week',
      details: isGerman ? 'vs. letzte Woche' : 'vs. last week'
    },
    {
      id: 'revenue',
      title: isGerman ? 'Umsatz' : 'Revenue',
      value: '€12,840',
      previousValue: '€11,165',
      change: '+15%',
      trend: 'up',
      icon: '💎',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      description: isGerman ? 'Diesen Monat' : 'This month',
      details: isGerman ? 'vs. letzter Monat' : 'vs. last month'
    },
    {
      id: 'conversion',
      title: isGerman ? 'Conversion Rate' : 'Conversion Rate',
      value: '24.3%',
      previousValue: '19.1%',
      change: '+5.2%',
      trend: 'up',
      icon: '🎯',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      description: isGerman ? 'Durchschnitt' : 'Average',
      details: isGerman ? 'Monatsvergleich' : 'Monthly comparison'
    },
    {
      id: 'satisfaction',
      title: isGerman ? 'Zufriedenheit' : 'Satisfaction',
      value: '4.9',
      previousValue: '4.6',
      change: '+0.3',
      trend: 'up',
      icon: '⭐',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      description: isGerman ? 'Bewertung' : 'Rating',
      details: isGerman ? 'Kundenfeedback' : 'Customer feedback'
    },
    {
      id: 'partners',
      title: isGerman ? 'Aktive Partner' : 'Active Partners',
      value: '23',
      previousValue: '19',
      change: '+21%',
      trend: 'up',
      icon: '🤝',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      description: isGerman ? 'Registriert' : 'Registered',
      details: isGerman ? 'Neue Partner' : 'New partners'
    },
    {
      id: 'completion',
      title: isGerman ? 'Abschlussrate' : 'Completion Rate',
      value: '87%',
      previousValue: '82%',
      change: '+5%',
      trend: 'up',
      icon: '✅',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      description: isGerman ? 'Erfolg' : 'Success',
      details: isGerman ? 'Lead-Conversion' : 'Lead conversion'
    }
  ];

  const allRecentLeads = [
    {
      id: 1,
      name: 'Thomas Weber',
      email: 'thomas.weber@company.de',
      phone: '+49 89 456789',
      service: isGerman ? 'Sicherheitsanfrage' : 'Security Request',
      serviceType: 'securityClient',
      location: 'München',
      address: 'Bürogebäude Sicherheit...',
      value: '€-',
      estimatedTime: '-',
      status: 'new',
      time: '10 min ago',
      priority: 'high',
      avatar: '👨',
      notes: isGerman ? '24-Stunden Sicherheitscoverage für Bürogebäude' : '24-hour security coverage for office building'
    },
    {
      id: 2,
      name: 'SafeGuard GmbH',
      email: 'info@safeguard.de',
      phone: '+49 89 987654',
      service: isGerman ? 'Sicherheitsunternehmen' : 'Security Company',
      serviceType: 'securityCompany',
      location: 'Berlin',
      address: 'Alexanderstraße 12, Berlin',
      value: '€-',
      estimatedTime: '-',
      status: 'new',
      time: '1 hour ago',
      priority: 'medium',
      avatar: '🏢',
      notes: isGerman ? 'Lizenziertes Sicherheitsunternehmen mit 50+ Personal' : 'Licensed security company with 50+ staff'
    },
    {
      id: 3,
      name: 'Dr. Klaus Hoffmann',
      email: 'k.hoffmann@universität.de',
      phone: '+49 40 555123',
      service: isGerman ? 'Sicherheitsanfrage' : 'Security Request',
      serviceType: 'securityClient',
      location: 'Hamburg',
      address: 'Universitätscampus...',
      value: '€-',
      estimatedTime: '-',
      status: 'new',
      time: '25 min ago',
      priority: 'medium',
      avatar: '👨‍🔬',
      notes: isGerman ? 'Campussicherheit, 24/7 Überwachung' : 'Campus security, 24/7 monitoring'
    },
    {
      id: 4,
      name: 'ProSecure Solutions',
      email: 'contact@prosecure.de',
      phone: '+49 69 444789',
      service: isGerman ? 'Sicherheitsunternehmen' : 'Security Company',
      serviceType: 'securityCompany',
      location: 'Frankfurt',
      address: 'Römerplatz 9, Frankfurt',
      value: '€-',
      estimatedTime: '-',
      status: 'new',
      time: '1 hour ago',
      priority: 'high',
      avatar: '🏢',
      notes: isGerman ? 'Spezialist für Objektschutz und VIP-Schutz' : 'Specialist in property and VIP protection'
    },
    {
      id: 5,
      name: 'Angela Meier',
      email: 'a.meier@retail.com',
      phone: '+49 89 777333',
      service: isGerman ? 'Sicherheitsanfrage' : 'Security Request',
      serviceType: 'securityClient',
      location: 'München',
      address: 'Einzelhandelsstandort...',
      value: '€-',
      estimatedTime: '-',
      status: 'new',
      time: '2 hours ago',
      priority: 'medium',
      avatar: '👩‍💼',
      notes: isGerman ? 'Verkaufsfläche mit Diebstahlschutz' : 'Retail space with theft prevention'
    },
    {
      id: 6,
      name: 'SecureNet GmbH',
      email: 'sales@securenet.de',
      phone: '+49 30 888999',
      service: isGerman ? 'Sicherheitsunternehmen' : 'Security Company',
      serviceType: 'securityCompany',
      location: 'Berlin',
      address: 'Potsdamer Platz 1, Berlin',
      value: '€-',
      estimatedTime: '-',
      status: 'new',
      time: '3 hours ago',
      priority: 'medium',
      avatar: '🏢',
      notes: isGerman ? 'Full-Service-Sicherheitsdienstleistungen' : 'Full-service security services'
    }
  ];

  // Use dynamic data for partners, mock data for admins
  const recentLeads = recentLeadsData;

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25',
      quoted: 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25',
      contacted: 'bg-purple-500 text-white shadow-lg shadow-purple-500/25',
      qualified: 'bg-green-500 text-white shadow-lg shadow-green-500/25'
    };
    return colors[status] || 'bg-gray-500 text-white shadow-lg shadow-gray-500/25';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      high: '🔥',
      medium: '⚡',
      low: '📋'
    };
    return icons[priority] || '📋';
  };

  const getNotificationIcon = (type) => {
    const iconClass = "w-5 h-5";
    const iconStyle = { color: 'var(--theme-text)' };

    const icons = {
      partner_welcome: <SparklesIcon className={iconClass} style={iconStyle} />,
      lead_assigned: <BellIcon className={iconClass} style={iconStyle} />,
      new_lead: <BellIcon className={iconClass} style={iconStyle} />,
      quote_accepted: <CheckCircleIcon className={iconClass} style={iconStyle} />,
      review: <StarIcon className={iconClass} style={iconStyle} />,
      partner_joined: <UserPlusIcon className={iconClass} style={iconStyle} />,
      lead_updated: <PencilIcon className={iconClass} style={iconStyle} />,
      lead_expired: <ClockIcon className={iconClass} style={iconStyle} />,
      cancel_request_sent: <PaperAirplaneIcon className={iconClass} style={iconStyle} />,
      cancel_request_approved: <CheckCircleIcon className={iconClass} style={iconStyle} />,
      cancel_request_rejected: <XCircleIcon className={iconClass} style={iconStyle} />,
      partner_cancel_request: <ExclamationTriangleIcon className={iconClass} style={iconStyle} />
    };
    return icons[type] || <DocumentTextIcon className={iconClass} style={iconStyle} />;
  };

  const handleCardNavigation = (navigateData) => {
    const { tab, filter } = navigateData;

    // Build query params if filter is provided
    const queryParams = filter ? `?filter=${filter}` : '';

    // Navigate to the tab with optional filter
    router.push(`/dashboard?tab=${tab}${filter ? `&filter=${filter}` : ''}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return isSuperAdmin ? <EnhancedDashboard onNavigate={handleCardNavigation} /> : (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Welcome Header */}
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.h1
                className="text-4xl font-bold mb-4"
                style={{ color: 'var(--theme-text)' }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                suppressHydrationWarning
              >
                {isGerman ? `Willkommen, ${getDisplayName()}!` : `Welcome, ${getDisplayName()}!`}
              </motion.h1>
              <p className="text-lg" style={{ color: 'var(--theme-muted)' }} suppressHydrationWarning>
                {isGerman
                  ? `Hier ist deine Business-Übersicht für heute.`
                  : `Here's your business overview for today.`}
              </p>
            </motion.div>

            {/* Stats Grid */}
            <div className={`grid gap-6 ${isPartner ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'}`}>
              {dashboardStats.map((stat, index) => (
                <motion.div
                  key={stat.id}
                  className="relative p-6 rounded-2xl border backdrop-blur-xl overflow-hidden group cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'var(--theme-border)',
                    backgroundImage: stat.gradient
                  }}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{
                    scale: 1.05,
                    y: -10,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Animated Background Pattern */}
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                      backgroundSize: '15px 15px'
                    }}
                    animate={{
                      backgroundPosition: ['0px 0px', '15px 15px'],
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <motion.div
                        className="text-3xl"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        {stat.icon}
                      </motion.div>
                      <div className="text-right">
                        <motion.div
                          className="text-xs px-3 py-1 rounded-full bg-white/20 text-white font-bold"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {stat.change}
                        </motion.div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-white/80">
                        {stat.title}
                      </h3>
                      <motion.p
                        className="text-3xl font-bold text-white"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 300 }}
                      >
                        {stat.value}
                      </motion.p>
                      <p className="text-xs text-white/70">
                        {stat.details}
                      </p>
                    </div>
                  </div>

                  {/* Hover Glow Effect */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Recent Leads Table */}
              <motion.div
                className="xl:col-span-2 p-8 rounded-2xl border backdrop-blur-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'var(--theme-border)'
                }}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? '🎯 Aktuelle Leads' : '🎯 Recent Leads'}
                  </h3>
                  <motion.button
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'var(--theme-button-bg)', color: 'var(--theme-button-text)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTabChange('leads')}
                  >
                    {isGerman ? 'Alle anzeigen' : 'View all'}
                  </motion.button>
                </div>

                <div className="space-y-4">
                  {loadingRecentLeads ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-sm" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman ? 'Lade Leads...' : 'Loading leads...'}
                      </p>
                    </div>
                  ) : recentLeads.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📭</div>
                      <p className="text-lg font-medium" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Keine aktuellen Leads' : 'No Recent Leads'}
                      </p>
                      <p className="text-sm mt-2" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman ? 'Neue Leads werden hier angezeigt' : 'New leads will appear here'}
                      </p>
                    </div>
                  ) : (
                    recentLeads.slice(0, 5).map((lead, index) => (
                    <motion.div
                      key={lead.id}
                      className="flex items-center justify-between p-4 rounded-xl hover:shadow-lg transition-all duration-300 border group cursor-pointer"
                      style={{
                        backgroundColor: 'var(--theme-card-bg)',
                        borderColor: 'var(--theme-border-light)'
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                    >
                      <div className="flex items-center space-x-4">
                        <motion.div
                          className="text-2xl"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                        >
                          {lead.avatar}
                        </motion.div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-lg" style={{ color: 'var(--theme-text)' }}>
                              {lead.name}
                            </p>
                            <span className="text-lg">{getPriorityIcon(lead.priority)}</span>
                          </div>
                          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                            {lead.service} • {lead.location}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                            {lead.email} • {lead.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-bold text-xl" style={{ color: 'var(--theme-text)' }}>
                          {lead.value}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                          {lead.time}
                        </p>
                      </div>
                    </motion.div>
                    ))
                  )}
                </div>
              </motion.div>

              {/* Activity & Notifications */}
              <motion.div
                className="space-y-8"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                {/* Notifications */}
                <motion.div
                  className="p-6 rounded-2xl border backdrop-blur-xl"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderColor: 'var(--theme-border)'
                  }}
                >
                  <h3 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--theme-text)' }}>
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="mr-2"
                    >
                      🔔
                    </motion.span>
                    {isGerman ? 'Benachrichtigungen' : 'Notifications'}
                  </h3>
                  <div className="space-y-3">
                    {notifications.slice(0, 4).map((notification, index) => (
                      <motion.div
                        key={notification._id}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:shadow-md transition-all duration-200 border cursor-pointer group"
                        style={{
                          backgroundColor: 'var(--theme-card-bg)',
                          borderColor: 'var(--theme-border-light)'
                        }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        whileHover={{ x: 5 }}
                      >
                        <motion.div
                          className={`w-3 h-3 rounded-full mt-2 ${!notification.isRead ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-300'}`}
                          animate={!notification.isRead ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                              {isGerman && notification.message_de ? notification.message_de : notification.message}
                            </p>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                            {new Date(notification.createdAt).toLocaleString('de-DE')}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                  className="p-6 rounded-2xl border backdrop-blur-xl"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderColor: 'var(--theme-border)'
                  }}
                >
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
                    ⚡ {isGerman ? 'Schnellaktionen' : 'Quick Actions'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: '📊', label: isGerman ? 'Berichte' : 'Reports', action: isPartner ? 'invoices' : 'income' },
                      { icon: '⚙️', label: isGerman ? 'Einstellungen' : 'Settings', action: 'settings' }
                    ].map((action, index) => (
                      <motion.button
                        key={action.label}
                        className="p-4 rounded-xl border font-medium text-sm transition-all duration-200 hover:shadow-lg group"
                        style={{
                          backgroundColor: 'var(--theme-card-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-text)'
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => action.action !== 'support' && handleTabChange(action.action)}
                      >
                        <motion.div
                          className="text-2xl mb-2"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
                        >
                          {action.icon}
                        </motion.div>
                        {action.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        );
      case 'leads':
        return <LeadManagement initialLeads={initialData.leads || []} initialStats={initialData.leadStats || {}} />;
      case 'invoices':
        return <PartnerInvoices />;
      case 'notifications':
        return (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Notifications Header */}
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.h1 
                className="text-4xl font-bold mb-4"
                style={{ color: 'var(--theme-text)' }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                🔔 {isGerman ? 'Benachrichtigungen' : 'Notifications'}
              </motion.h1>
              <p className="text-lg" style={{ color: 'var(--theme-muted)' }}>
                {isGerman 
                  ? 'Bleiben Sie über wichtige Updates und Aktivitäten auf dem Laufenden.' 
                  : 'Stay updated with important alerts and activities.'}
              </p>
            </motion.div>

            {/* Notifications List */}
            <motion.div
              className="max-w-4xl mx-auto p-8 rounded-2xl border backdrop-blur-xl"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'var(--theme-border)'
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {/* Filter buttons */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Alle Benachrichtigungen' : 'All Notifications'}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <motion.button
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'var(--theme-button-bg)', color: 'var(--theme-button-text)' }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          markAsRead();
                        }}
                      >
                        {isGerman ? 'Alle als gelesen markieren' : 'Mark all as read'}
                      </motion.button>
                    </div>
                  </div>

                  {/* Notifications */}
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification._id}
                      className="flex items-start space-x-4 p-6 rounded-xl hover:shadow-lg transition-all duration-300 border group cursor-pointer"
                      style={{ 
                        backgroundColor: !notification.isRead ? 'rgba(59, 130, 246, 0.05)' : 'var(--theme-card-bg)',
                        borderColor: !notification.isRead ? 'rgba(59, 130, 246, 0.3)' : 'var(--theme-border-light)'
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                      onClick={() => {
                        markSingleAsRead(notification._id);
                      }}
                    >
                      <motion.div
                        className={`w-4 h-4 rounded-full mt-2 ${!notification.isRead ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-300'}`}
                        animate={!notification.isRead ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <motion.div
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg"
                            style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                          >
                            {getNotificationIcon(notification.type)}
                          </motion.div>
                          <div className="flex-1">
                            <p className="text-lg font-medium" style={{ color: 'var(--theme-text)' }}>
                              {isGerman && notification.message_de ? notification.message_de : notification.message}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                                {new Date(notification.createdAt).toLocaleString('de-DE')}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                notification.priority === 'high' ? 'bg-red-100 text-red-700' :
                                notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {notification.priority === 'high' ? (isGerman ? 'Hoch' : 'High') :
                                 notification.priority === 'medium' ? (isGerman ? 'Mittel' : 'Medium') :
                                 (isGerman ? 'Niedrig' : 'Low')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {!notification.isRead && (
                          <motion.span
                            className="inline-block w-3 h-3 bg-blue-500 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <motion.div
                    className="text-6xl mb-4"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    🔔
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Keine Benachrichtigungen' : 'No Notifications'}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Sie haben derzeit keine Benachrichtigungen.' : 'You currently have no notifications.'}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        );
      case 'partners':
        return <PartnerManagement initialPartners={initialData.partners || []} />;
      case 'logs':
        return <LogsModule />;
      case 'income':
        return <IncomeInvoices />;
      case 'settings':
        return isSuperAdmin ? <AdminSettings /> : <PartnerSettings />;
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <>
      <Head>
        <title>
          {activeTab === 'overview' 
            ? (isGerman ? 'CRM Dashboard' : 'CRM Dashboard')
            : getMenuItems().find(item => item.id === activeTab)?.label || 'Dashboard'
          } - Business Connected
        </title>
        <meta name="description" content="Advanced CRM system for managing leads, partners, and business operations with stunning UI" />
      </Head>

      <div 
        className="min-h-screen flex transition-all duration-500"
        style={{ 
          backgroundColor: 'var(--theme-bg)',
          color: 'var(--theme-text)'
        }}
      >
        {/* Left Sidebar */}
        <motion.div
          className={`fixed left-0 top-0 h-full z-40 border-r backdrop-blur-2xl transition-all duration-300 flex flex-col ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'var(--theme-border)',
            backgroundImage: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(236, 72, 153, 0.05) 50%, rgba(168, 85, 247, 0.08) 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        >
          {/* Sidebar Header */}
          <div className="p-6 border-b" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Link href="/" className="flex items-center">
                    <Image src={isDark ? '/Business-Connect-logoblacktheme.svg' : '/business-connected-logo.svg'} alt="Business Connected" width={160} height={52} priority />
                  </Link>
                </motion.div>
              )}
              <motion.button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-opacity-50 transition-colors"
                style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.span
                  animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {sidebarCollapsed ? '→' : '←'}
                </motion.span>
              </motion.button>
            </div>
          </div>


          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2">
            {getMenuItems().map((item, index) => (
              <motion.button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 group ${
                  activeTab === item.id ? 'shadow-lg' : 'hover:shadow-md'
                }`}
                style={{
                  backgroundColor: activeTab === item.id ? 'var(--theme-button-bg)' : 'transparent',
                  color: activeTab === item.id ? 'var(--theme-button-text)' : 'var(--theme-text)'
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ x: 5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  <motion.div
                    className="flex-shrink-0"
                    animate={activeTab === item.id ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {item.icon}
                  </motion.div>
                  {/* Notification count badge for notifications tab */}
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <motion.span
                        className="text-xs font-bold text-white"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        {unreadCount}
                      </motion.span>
                    </motion.div>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <motion.div
                    className="flex-1 text-left"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <div className="font-bold text-sm">{item.label}</div>
                    {item.description && (
                      <div className="text-xs mt-1 opacity-75">{item.description}</div>
                    )}
                  </motion.div>
                )}
                {activeTab === item.id && (
                  <motion.div
                    className="w-1 h-8 rounded-full bg-current opacity-75"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                )}
              </motion.button>
            ))}
          </nav>

          {/* Sidebar Footer - Logout at Bottom */}
          <div className="p-4 mt-auto">
            <motion.button
              onClick={handleLogout}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:shadow-md transition-all duration-200 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-lg">🚪</span>
              {!sidebarCollapsed && (
                <span className="font-medium text-sm">
                  {isGerman ? 'Abmelden' : 'Logout'}
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div 
          className={`flex-1 flex flex-col transition-all duration-300 ${
            sidebarCollapsed ? 'ml-20' : 'ml-72'
          }`}
        >
          {/* Top Header */}
          <motion.header 
            className="sticky top-0 z-30 backdrop-blur-2xl border-b shadow-xl"
            style={{ 
              borderColor: 'var(--theme-border)',
              backgroundColor: 'rgba(var(--theme-bg-rgb), 0.9)',
              backgroundImage: 'linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, transparent 50%)',
              boxShadow: '0 10px 25px -12px rgba(0, 0, 0, 0.1)'
            }}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="px-6 py-4">
              <div className="flex items-center justify-end">
                {/* Header Actions - User Info + Filters */}
                <motion.div 
                  className="flex items-center space-x-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {/* Service Display for Partners */}
                  {isPartner && (
                    <motion.div 
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg border"
                      style={{ 
                        backgroundColor: 'var(--theme-card-bg)', 
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.span
                        className="text-lg"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        🛡️
                      </motion.span>
                      <span className="text-sm font-medium">
                        {isGerman ? 'Sicherheitsservice' : 'Security Service'}
                      </span>
                    </motion.div>
                  )}

                  {/* Service Filter - Only for Super Admins and not on settings tab */}
                  {isSuperAdmin && activeTab !== 'settings' && (
                    <div className="flex items-center space-x-2">
                      <ServiceSelector />
                    </div>
                  )}
                  
                  {/* Language & Theme Toggles */}
                  <div className="flex items-center space-x-3">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                  
                  {/* User Profile Info */}
                  <motion.div
                    className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{
                      backgroundColor: 'var(--theme-bg-secondary)',
                      border: '1px solid var(--theme-border)'
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ y: -2 }}
                  >
                    {/* Avatar with gradient */}
                    <motion.div
                      className="relative w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
                      style={{
                        background: user?.role === 'superadmin'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                      }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <div className="absolute inset-0 bg-black/10"></div>
                      {user?.role === 'superadmin' ? (
                        <svg className="w-6 h-6 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      {/* Online indicator */}
                      <motion.div
                        className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2"
                        style={{ borderColor: 'var(--theme-bg-secondary)' }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>

                    {/* User Info */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate max-w-[180px]" style={{ color: 'var(--theme-text)' }} title={user?.companyName || getDisplayName()}>
                          {user?.companyName || getDisplayName()}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          user?.role === 'superadmin'
                            ? isDark
                              ? 'bg-purple-500 text-white'
                              : 'bg-purple-600 text-white'
                            : isDark
                              ? 'bg-pink-500 text-white'
                              : 'bg-pink-600 text-white'
                        }`}>
                          {user?.role === 'superadmin' ? (isGerman ? 'Admin' : 'Admin') : (isGerman ? 'Partner' : 'Partner')}
                        </span>
                      </div>
                      {user?.email && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-70" style={{ color: 'var(--theme-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs font-medium truncate max-w-[180px] opacity-80" style={{ color: 'var(--theme-text)' }} title={user.email}>
                            {user.email}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-y-auto" style={{ 
            backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.03) 0%, transparent 50%)'
          }}>
            <AnimatePresence mode="wait">
              {renderTabContent()}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
}

// Server-side props to provide initial data (simplified for now)
export async function getServerSideProps(context) {
  // For now, return empty initial data to avoid API issues
  // This will be populated when backend APIs are ready
  return {
    props: {
      initialData: {
        leads: [],
        partners: [],
        logs: [],
        revenue: [],
        invoices: [],
        leadStats: {}
      },
    },
  };
}