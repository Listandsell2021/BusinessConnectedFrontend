import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
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
  // Get active tab from URL query parameter
  const activeTab = router.query.tab || 'overview';

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
    router.push(`/dashboard?tab=${tabId}`, undefined, { shallow: true });
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  // Fetch recent leads for partners
  useEffect(() => {
    if (isPartner && user?.id && currentService) {
      fetchRecentLeads();
    } else if (!isPartner) {
      // For admins, show empty state
      setRecentLeadsData([]);
      setLoadingRecentLeads(false);
    }
  }, [isPartner, user?.id, currentService]);

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

  const getMockRecentLeads = () => {
    return [
      {
        id: 1,
        name: 'Maria Schmidt',
        email: 'maria.schmidt@email.com',
        phone: '+49 89 123456',
        service: isGerman ? 'Tiefenreinigung' : 'Deep Cleaning',
        serviceType: 'cleaning',
        location: 'München',
        address: 'Maximilianstraße 35',
        value: '€320',
        estimatedTime: '4 hours',
        status: 'new',
        time: '5 min ago',
        priority: 'high',
        avatar: '👩',
      },
      {
        id: 2,
        name: 'Hans Mueller',
        email: 'hans.mueller@email.com',
        phone: '+49 89 654321',
        service: isGerman ? 'Büroumzug' : 'Office Move',
        serviceType: 'moving',
        location: 'Berlin',
        address: 'Friedrichstraße 123',
        value: '€850',
        estimatedTime: '6 hours',
        status: 'qualified',
        time: '2 hours ago',
        priority: 'medium',
        avatar: '👨',
      }
    ];
  };

  const getServiceDisplayName = (lead) => {
    if (lead.serviceType === 'moving') {
      const moveType = lead.moveType || lead.formData?.movingType;
      if (moveType === 'business') return isGerman ? 'Büroumzug' : 'Office Move';
      if (moveType === 'long_distance') return isGerman ? 'Fernumzug' : 'Long Distance Move';
      if (moveType === 'special_transport') return isGerman ? 'Spezialtransport' : 'Special Transport';
      return isGerman ? 'Umzug' : 'Moving';
    }
    return isGerman ? 'Reinigung' : 'Cleaning';
  };

  const getLocationDisplay = (lead) => {
    if (lead.formData?.pickupAddress?.city) {
      return lead.formData.pickupAddress.city;
    }
    return lead.serviceLocation?.city || '';
  };

  const getAddressDisplay = (lead) => {
    if (lead.formData?.pickupAddress?.address) {
      return lead.formData.pickupAddress.address;
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
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Dashboard wird geladen...' : 'Loading Dashboard...'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
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
    router.push('/auth/login');
  };

  // Define menu items based on user role
  const getMenuItems = () => {
    const menuItems = [
      { id: 'overview', label: isGerman ? 'Dashboard' : 'Dashboard', icon: '📊', roles: ['superadmin', 'partner'] }
    ];
    
    if (isSuperAdmin) {
      menuItems.push(
        { id: 'leads', label: isGerman ? 'Lead-Verwaltung' : 'Lead Management', icon: '🎯', roles: ['superadmin'], description: isGerman ? 'Verwalten Sie alle Leads' : 'Manage all leads' },
        { id: 'partners', label: isGerman ? 'Partner-Verwaltung' : 'Partner Management', icon: '🤝', roles: ['superadmin'], description: isGerman ? 'Partner verwalten' : 'Manage partners' },
        { id: 'logs', label: isGerman ? 'System-Protokolle' : 'System Logs', icon: '📝', roles: ['superadmin'], description: isGerman ? 'System-Aktivitäten' : 'System activities' },
        { id: 'income', label: isGerman ? 'Umsätze & Rechnungen' : 'Income & Invoices', icon: '💎', roles: ['superadmin'], description: isGerman ? 'Finanzen verwalten' : 'Manage finances' },
        { id: 'settings', label: isGerman ? 'Einstellungen' : 'Settings', icon: '⚙️', roles: ['superadmin'], description: isGerman ? 'System-Einstellungen' : 'System settings' }
      );
    }
    
    if (isPartner) {
      menuItems.push(
        { id: 'leads', label: isGerman ? 'Meine Leads' : 'My Leads', icon: '🎯', roles: ['partner'], description: isGerman ? 'Ihre zugewiesenen Leads' : 'Your assigned leads' },
        { id: 'invoices', label: isGerman ? 'Meine Rechnungen' : 'My Invoices', icon: '🧾', roles: ['partner'], description: isGerman ? 'Ihre Rechnungen verwalten' : 'Manage your invoices' },
        { id: 'notifications', label: isGerman ? 'Benachrichtigungen' : 'Notifications', icon: '🔔', roles: ['partner'], description: isGerman ? 'Ihre Benachrichtigungen' : 'Your notifications' },
        { id: 'settings', label: isGerman ? 'Einstellungen' : 'Settings', icon: '⚙️', roles: ['partner'], description: isGerman ? 'Konto-Einstellungen' : 'Account settings' }
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
      name: 'Maria Schmidt',
      email: 'maria.schmidt@email.com',
      phone: '+49 89 123456',
      service: isGerman ? 'Tiefenreinigung' : 'Deep Cleaning',
      serviceType: 'cleaning',
      location: 'München',
      address: 'Maximilianstraße 35',
      value: '€320',
      estimatedTime: '4 hours',
      status: 'new',
      time: '5 min ago',
      priority: 'high',
      avatar: '👩',
      notes: isGerman ? '3-Zimmer Wohnung, Erstberatung gewünscht' : '3-room apartment, initial consultation wanted'
    },
    {
      id: 2,
      name: 'Thomas Weber',
      email: 'thomas.weber@company.de',
      phone: '+49 30 987654',
      service: isGerman ? 'Büroumzug' : 'Office Relocation',
      serviceType: 'moving',
      location: 'Berlin',
      address: 'Unter den Linden 77',
      value: '€2,100',
      estimatedTime: '2 days',
      status: 'quoted',
      time: '12 min ago',
      priority: 'high',
      avatar: '👨',
      notes: isGerman ? '50 Mitarbeiter, Umzug am Wochenende' : '50 employees, weekend move required'
    },
    {
      id: 3,
      name: 'Anna Müller',
      email: 'anna.mueller@gmail.com',
      phone: '+49 40 555123',
      service: isGerman ? 'Wohnungsreinigung' : 'Apartment Cleaning',
      serviceType: 'cleaning',
      location: 'Hamburg',
      address: 'Reeperbahn 154',
      value: '€180',
      estimatedTime: '3 hours',
      status: 'contacted',
      time: '25 min ago',
      priority: 'medium',
      avatar: '👱‍♀️',
      notes: isGerman ? 'Wöchentliche Reinigung gewünscht' : 'Weekly cleaning service wanted'
    },
    {
      id: 4,
      name: 'Klaus Fischer',
      email: 'k.fischer@web.de',
      phone: '+49 69 444789',
      service: isGerman ? 'Fernumzug' : 'Long Distance Move',
      serviceType: 'moving',
      location: 'Frankfurt',
      address: 'Römerplatz 9',
      value: '€1,650',
      estimatedTime: '1 day',
      status: 'qualified',
      time: '1 hour ago',
      priority: 'high',
      avatar: '👨‍💼',
      notes: isGerman ? 'Umzug nach Stuttgart, Verpackungsservice' : 'Move to Stuttgart, packing service needed'
    },
    {
      id: 5,
      name: 'Sarah Johnson',
      email: 'sarah.j@outlook.com',
      phone: '+49 89 777333',
      service: isGerman ? 'Fensterreinigung' : 'Window Cleaning',
      serviceType: 'cleaning',
      location: 'München',
      address: 'Marienplatz 12',
      value: '€95',
      estimatedTime: '2 hours',
      status: 'new',
      time: '2 hours ago',
      priority: 'low',
      avatar: '👩‍🦰',
      notes: isGerman ? 'Bürogebäude, monatlicher Service' : 'Office building, monthly service'
    },
    {
      id: 6,
      name: 'Michael Chen',
      email: 'michael.chen@tech.com',
      phone: '+49 30 888999',
      service: isGerman ? 'IT-Umzug' : 'IT Relocation',
      serviceType: 'moving',
      location: 'Berlin',
      address: 'Potsdamer Platz 1',
      value: '€2,800',
      estimatedTime: '3 days',
      status: 'quoted',
      time: '3 hours ago',
      priority: 'high',
      avatar: '👨‍💻',
      notes: isGerman ? 'Server-Raum, spezielle Handling erforderlich' : 'Server room, special handling required'
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
    const icons = {
      partner_welcome: '🎉',
      lead_assigned: '🎯',
      new_lead: '🎯',
      quote_accepted: '✅',
      review: '⭐',
      partner_joined: '🤝',
      lead_updated: '📝',
      lead_expired: '⏰',
      cancel_request_sent: '📤',
      cancel_request_approved: '✅',
      cancel_request_rejected: '❌',
      partner_cancel_request: '⚠️'
    };
    return icons[type] || '📋';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return isSuperAdmin ? <EnhancedDashboard /> : (
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
              >
                {isGerman ? `Willkommen zurück, ${user?.name || 'Partner'}!` : `Welcome back, ${user?.name || 'Partner'}!`}
              </motion.h1>
              <p className="text-lg" style={{ color: 'var(--theme-muted)' }}>
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
                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                            <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                              {notification.message}
                            </p>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                            {new Date(notification.createdAt).toLocaleString()}
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
                          <motion.span
                            className="text-2xl"
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                          >
                            {getNotificationIcon(notification.type)}
                          </motion.span>
                          <div className="flex-1">
                            <p className="text-lg font-medium" style={{ color: 'var(--theme-text)' }}>
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                                {new Date(notification.createdAt).toLocaleString()}
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
          } - ProvenHub
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
                    <Image src={isDark ? "/blackThemeLogo.svg" : "/logo.png"} alt="ProvenHub" width={140} height={40} priority />
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
                  <motion.span
                    className="text-2xl"
                    animate={activeTab === item.id ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {item.icon}
                  </motion.span>
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
                        {currentService === 'moving' ? '🚛' : '🧽'}
                      </motion.span>
                      <span className="text-sm font-medium">
                        {currentService === 'moving' 
                          ? (isGerman ? 'Umzugsservice' : 'Moving Service')
                          : (isGerman ? 'Reinigungsservice' : 'Cleaning Service')
                        }
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
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: 'var(--theme-button-bg)', color: 'var(--theme-button-text)' }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {user?.role === 'superadmin' ? '👑' : '👤'}
                    </motion.div>
                    <div className="text-sm text-right">
                      <p className="font-bold" style={{ color: 'var(--theme-text)' }}>
                        {user?.name || user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                        {user?.role === 'superadmin' ? (isGerman ? 'Super Admin' : 'Super Admin') : (isGerman ? 'Partner' : 'Partner')}
                      </p>
                    </div>
                  </div>
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