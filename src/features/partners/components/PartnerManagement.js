import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useService } from '../../../contexts/ServiceContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { partnersAPI, settingsAPI, leadsAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Pagination from '../../../components/ui/Pagination';
import LeadDetailsDialog from '../../../components/ui/LeadDetailsDialog';
import { API_BASE_URL } from '../../../lib/config';

const PartnerManagement = ({ initialPartners = [] }) => {
  const router = useRouter();
  const { currentService, setHideServiceFilter } = useService();
  const { t, isGerman } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  
  const [partners, setPartners] = useState(initialPartners);
  const [totalPartners, setTotalPartners] = useState(0);
  const [partnerStats, setPartnerStats] = useState({
    total: 0,
    active: 0,
    basic: 0,
    exclusive: 0,
    pending: 0,
    rejectSuspended: 0
  });
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [currentView, setCurrentView] = useState('table'); // 'table' or 'details'
  const [partnerForDetails, setPartnerForDetails] = useState(null);
  const [leadForDetails, setLeadForDetails] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Initialize filter states from URL query params
  const getInitialFilters = () => {
    const urlFilter = router.query.filter;
    let initialType = 'all';
    let initialStatus = 'all';

    if (urlFilter === 'active') {
      initialStatus = 'active';
    } else if (urlFilter === 'exclusive') {
      initialType = 'exclusive';
    } else if (urlFilter === 'basic') {
      initialType = 'basic';
    }

    return {
      type: initialType,
      status: initialStatus,
      city: '',
      searchTerm: ''
    };
  };

  // Filter states
  const [filters, setFilters] = useState(getInitialFilters());

  // Date filter state (for registered date)
  const [dateFilter, setDateFilter] = useState({
    type: 'all', // 'all', 'single', 'range', 'week', 'month', 'year'
    singleDate: null,
    fromDate: null,
    toDate: null,
    week: null,
    month: null,
    year: null
  });

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: 'registeredAt',
    direction: 'desc'
  });

  // Handle URL filter parameters
  useEffect(() => {
    if (router.query.filter) {
      const urlFilter = router.query.filter;

      // Map dashboard filter values to partner filter values
      if (urlFilter === 'active') {
        setFilters(prev => ({ ...prev, status: 'active' }));
      } else if (urlFilter === 'exclusive') {
        setFilters(prev => ({ ...prev, type: 'exclusive', status: 'all' }));
      } else if (urlFilter === 'basic') {
        setFilters(prev => ({ ...prev, type: 'basic', status: 'all' }));
      }
    }
  }, [router.query.filter]);

  // Confirmation dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState({
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: null,
    type: 'warning' // 'warning', 'danger', 'info'
  });

  // Add Partner form states
  const [isSubmittingPartner, setIsSubmittingPartner] = useState(false);
  const [partnerFormData, setPartnerFormData] = useState({
    companyName: '',
    contactPerson: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    partnerType: 'basic',
    serviceType: '', // Changed from services array to single serviceType
    address: {
      street: '',
      city: '',
      zipCode: '', // Changed from postalCode to zipCode to match backend
      country: 'Germany'
    },
    preferences: {
      averageLeadsPerWeek: 5
    }
  });
  
  // Services data
  const [servicesData, setServicesData] = useState([]);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [partnerFormErrors, setPartnerFormErrors] = useState({});

  // Partner Details tabs and leads
  const [partnerDetailsTab, setPartnerDetailsTab] = useState('overview'); // 'overview', 'leads', or 'settings'
  const [partnerLeads, setPartnerLeads] = useState([]);
  const [partnerLeadsLoading, setPartnerLeadsLoading] = useState(false);
  const [partnerLeadsFilters, setPartnerLeadsFilters] = useState({
    search: '',
    status: 'all',
    city: ''
  });

  // Rejection dialog state
  const [rejectionDialog, setRejectionDialog] = useState({
    open: false,
    partnerId: null,
    partnerName: '',
    serviceType: '',
    reason: ''
  });

  // Export functionality
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Date filter state for partner leads
  const [partnerLeadsDateFilter, setPartnerLeadsDateFilter] = useState({
    type: 'all', // 'all', 'single', 'range', 'current_week', 'last_week', 'current_month', 'last_month'
    singleDate: null,
    fromDate: null,
    toDate: null
  });
  const [partnerLeadsStats, setPartnerLeadsStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    cancelled: 0,
    cancel_requested: 0
  });

  // Partner Leads Pagination
  const [partnerLeadsCurrentPage, setPartnerLeadsCurrentPage] = useState(1);
  const partnerLeadsPerPage = 8;
  const [adminSettings, setAdminSettings] = useState(null);
  const [weeklyLeadStats, setWeeklyLeadStats] = useState({
    currentWeek: 0,
    limit: 0
  });

  // Partner leads sorting state
  const [partnerLeadsSortConfig, setPartnerLeadsSortConfig] = useState({
    key: 'assignedAt',
    direction: 'desc'
  });

  // Partner Settings State
  const [partnerSettings, setPartnerSettings] = useState({
    customPricing: {
      perLeadPrice: null,
      leadsPerWeek: null
    }
  });
  const [globalSettings, setGlobalSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Status translation function
  const translateStatus = (status) => {
    const statusMaps = {
      de: {
        'pending': 'Ausstehend',
        'partial_assigned': 'Teilweise zugewiesen',
        'assigned': 'Zugewiesen',
        'accepted': 'Akzeptiert',
        'approved': 'Stornierung genehmigt',
        'cancel_requested': 'Stornierung angefragt',
        'cancellationRequested': 'Stornierung angefragt',
        'cancelled': 'Storniert',
        'rejected': 'Abgelehnt',
        'cancellation_rejected': 'Stornierung abgelehnt',
        'cancellation_approved': 'Stornierung genehmigt',
        'completed': 'Abgeschlossen'
      },
      en: {
        'pending': 'Pending',
        'partial_assigned': 'Partially Assigned',
        'assigned': 'Assigned',
        'accepted': 'Accepted',
        'approved': 'Cancellation Approved',
        'cancel_requested': 'Cancellation Requested',
        'cancellationRequested': 'Cancellation Requested',
        'cancelled': 'Cancelled',
        'rejected': 'Rejected',
        'cancellation_rejected': 'Cancellation Rejected',
        'cancellation_approved': 'Cancellation Approved',
        'completed': 'Completed'
      }
    };

    const currentLanguage = isGerman ? 'de' : 'en';
    return statusMaps[currentLanguage][status] || (isGerman ? 'Ausstehend' : 'Pending');
  };

  // Sortable header component
  const SortableHeader = ({ sortKey, children, className = "" }) => {
    const isActive = sortConfig.key === sortKey;
    const direction = isActive ? sortConfig.direction : null;
    
    return (
      <th 
        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-70 select-none ${className}`}
        style={{ color: 'var(--theme-muted)' }}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center space-x-2">
          <span>{children}</span>
          <div className="flex flex-col">
            <span className={`text-xs ${isActive && direction === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>
              ▲
            </span>
            <span className={`text-xs -mt-1 ${isActive && direction === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>
              ▼
            </span>
          </div>
        </div>
      </th>
    );
  };

  // Sortable header component for partner leads
  const PartnerLeadsSortableHeader = ({ sortKey, children, className = "" }) => {
    const isActive = partnerLeadsSortConfig.key === sortKey;
    const direction = isActive ? partnerLeadsSortConfig.direction : null;
    
    return (
      <th 
        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-70 select-none ${className}`}
        style={{ color: 'var(--theme-muted)' }}
        onClick={() => handlePartnerLeadsSort(sortKey)}
      >
        <div className="flex items-center space-x-2">
          <span>{children}</span>
          <div className="flex flex-col">
            <span className={`text-xs ${isActive && direction === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>
              ▲
            </span>
            <span className={`text-xs -mt-1 ${isActive && direction === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>
              ▼
            </span>
          </div>
        </div>
      </th>
    );
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle partner leads sorting
  const handlePartnerLeadsSort = (key) => {
    let direction = 'asc';
    if (partnerLeadsSortConfig.key === key && partnerLeadsSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setPartnerLeadsSortConfig({ key, direction });
    setPartnerLeadsCurrentPage(1); // Reset to page 1 when sorting changes
  };

  // Load partner stats from API (independent of pagination)
  const loadPartnerStats = async () => {
    if (!currentService) return;

    try {
      const response = await partnersAPI.getStats({ serviceType: currentService });
      const stats = response.data.data || response.data;

      setPartnerStats({
        total: stats.total || 0,
        active: stats.active || 0,
        basic: stats.basic || 0,
        exclusive: stats.exclusive || 0,
        pending: stats.pending || 0,
        rejectSuspended: stats.rejectSuspended || 0
      });
    } catch (error) {
      console.error('Error loading partner stats:', error);
      setPartnerStats({
        total: 0,
        active: 0,
        basic: 0,
        exclusive: 0,
        pending: 0,
        rejectSuspended: 0
      });
    }
  };

  // Load partners from API
  const loadPartners = async (pageOverride = null) => {
    const serviceToUse = currentService || 'moving';
    console.log('loadPartners called with currentService:', currentService, 'using:', serviceToUse);

    if (!serviceToUse) {
      console.warn('No service available, cannot load partners');
      return;
    }

    setLoading(true);
    try {
      // Prepare date parameters for API
      const dateParams = {};
      if (dateFilter.type === 'range' && dateFilter.fromDate && dateFilter.toDate) {
        dateParams.startDate = dateFilter.fromDate.toISOString().split('T')[0];
        dateParams.endDate = dateFilter.toDate.toISOString().split('T')[0];
      } else if (dateFilter.type === 'week' && dateFilter.week) {
        const selectedWeekDate = new Date(dateFilter.week);
        const startOfWeek = new Date(selectedWeekDate);
        startOfWeek.setDate(selectedWeekDate.getDate() - selectedWeekDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        dateParams.startDate = startOfWeek.toISOString().split('T')[0];
        dateParams.endDate = endOfWeek.toISOString().split('T')[0];
      } else if (dateFilter.type === 'month' && dateFilter.month) {
        const selectedMonthDate = new Date(dateFilter.month);
        const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
        const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);
        dateParams.startDate = startOfMonth.toISOString().split('T')[0];
        dateParams.endDate = endOfMonth.toISOString().split('T')[0];
      } else if (dateFilter.type === 'year' && dateFilter.year) {
        const selectedYearDate = new Date(dateFilter.year);
        const targetYear = selectedYearDate.getFullYear();
        dateParams.startDate = `${targetYear}-01-01`;
        dateParams.endDate = `${targetYear}-12-31`;
      } else if (dateFilter.type === 'single' && dateFilter.singleDate) {
        const singleDate = dateFilter.singleDate.toISOString().split('T')[0];
        dateParams.startDate = singleDate;
        dateParams.endDate = singleDate;
      }

      // Debug logging
      console.log('Date filter params being sent to API:', dateParams);
      console.log('Date filter state:', dateFilter);

      const response = await partnersAPI.getAll({
        serviceType: currentService,
        page: pageOverride !== null ? pageOverride : currentPage,
        limit: itemsPerPage,
        // Add filters to API call
        partnerType: filters.type !== 'all' ? filters.type : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        city: filters.city || undefined,
        search: filters.searchTerm || undefined,
        // Add date filter parameters
        ...dateParams,
        // Add sorting parameters
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction
      });
      
      const rawPartnersData = response.data.partners || [];
      const totalCount = response.data.pagination?.total || rawPartnersData.length;
      
      // Transform backend data structure to match frontend expectations
      const transformedPartners = rawPartnersData.map(partner => {
        // Get cities based on current service from preferences
        let cities = [];
        if (partner.preferences) {
          // Handle service-specific preferences
          const servicePreferences = currentService === 'moving' 
            ? partner.preferences.moving 
            : currentService === 'cleaning' 
            ? partner.preferences.cleaning 
            : null;

          if (servicePreferences?.serviceArea) {
            // Extract cities from the serviceArea Map structure
            Object.values(servicePreferences.serviceArea).forEach(area => {
              if (area.cities && typeof area.cities === 'object') {
                // If cities is a Map object, get the keys (city names)
                cities = cities.concat(Object.keys(area.cities));
              }
            });
          }
          
          // Also check for direct cities array in preferences (legacy support)
          if (cities.length === 0 && servicePreferences?.cities) {
            if (Array.isArray(servicePreferences.cities)) {
              cities = servicePreferences.cities;
            } else if (typeof servicePreferences.cities === 'object') {
              cities = Object.keys(servicePreferences.cities);
            }
          }
        }
        
        // Fallback to legacy structure if preferences don't exist or are empty
        if (cities.length === 0) {
          cities = partner.serviceAreas?.map(area => area.city) || partner.cities || [];
        }
        
        // Ensure cities is always an array and remove duplicates
        cities = Array.isArray(cities) ? [...new Set(cities)] : [];
        
        return {
          ...partner,
          id: partner._id || partner.id,
          partnerId: partner.partnerId || partner.id,
          name: partner.companyName || partner.name,
          email: partner.contactPerson?.email || partner.email,
          type: partner.partnerType || partner.type,
          services: partner.services || [currentService],
          cities: cities,
          // Show service-specific status instead of overall status
          status: partner.services?.find(s => s.serviceType === currentService)?.status || partner.status || 'pending',
          leadsCount: partner.metrics?.totalLeadsAccepted || 0,
          registeredAt: new Date(partner.registeredAt || partner.createdAt || partner.joinedAt),
          createdAt: new Date(partner.createdAt)
        };
      });
      
      setPartners(transformedPartners);
      setTotalPartners(totalCount);

    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  // Load services from API
  const loadServices = async () => {
    try {
      // Use imported API_BASE_URL from config
      const response = await fetch(`${API_BASE_URL}/services`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.services) {
          // Map the services to the format expected by the dropdown - same as registration
          setServicesData(data.services.map(service => ({
            id: service.type,
            name: service.name
          })));
        } else {
          throw new Error('Invalid API response format');
        }
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching service types:', error);
      // Fallback to default service types - same as registration
      setServicesData([
        { id: 'moving', name: 'Umzugsservice' },
        { id: 'cleaning', name: 'Reinigungsservice' }
      ]);
    }
  };

  useEffect(() => {
    // Use initial data first, then load fresh data
    if (initialPartners.length > 0) {
      setPartners(initialPartners);
    } else {
      loadPartners();
    }
    // Load stats independently
    loadPartnerStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentService, initialPartners]);

  // Reload partners when pagination changes (but not when filters change)
  useEffect(() => {
    console.log('Partner pagination useEffect - currentService:', currentService, 'currentPage:', currentPage);
    loadPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentService, currentPage]);

  // Reload partners when filters or sorting change (with pagination reset)
  useEffect(() => {
    console.log('Partner filters useEffect - currentService:', currentService);
    setCurrentPage(1); // Reset pagination for UI
    loadPartners(1); // Load with page 1 immediately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentService, filters.type, filters.status, filters.city, filters.searchTerm, sortConfig.key, sortConfig.direction, dateFilter.type, dateFilter.singleDate, dateFilter.fromDate, dateFilter.toDate, dateFilter.week, dateFilter.month, dateFilter.year]);

  // Load services on component mount
  useEffect(() => {
    loadServices();
  }, []);


  // Server-side filtering is handled by API, no need for client-side filtering

  const getTypeColor = (type) => {
    const colors = {
      exclusive: 'bg-purple-100 text-purple-800',
      basic: 'bg-blue-100 text-blue-800'
    };
    return colors[type] || colors.basic;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      rejected: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.pending;
  };

  const handleApprovePartner = async (partnerId, partnerName) => {
    // Get partner details to use their actual service type for the dialog
    const partner = partners.find(p => p.id === partnerId);
    const actualServiceType = partner?.serviceType || 'moving'; // Use partner's actual service type

    const serviceText = actualServiceType === 'moving'
      ? (isGerman ? 'Umzugsdienst' : 'Moving Service')
      : (isGerman ? 'Reinigungsdienst' : 'Cleaning Service');

    const confirmMessage = isGerman
      ? `Sind Sie sicher, dass Sie ${serviceText} für ${partnerName} genehmigen möchten? Es wird eine E-Mail mit dem temporären Passwort gesendet.`
      : `Are you sure you want to approve ${serviceText} for ${partnerName}? An email with a temporary password will be sent.`;

    showConfirmation({
      title: partnerName,
      message: confirmMessage,
      confirmText: isGerman ? 'Genehmigen' : 'Approve',
      cancelText: isGerman ? 'Abbrechen' : 'Cancel',
      type: 'success',
      onConfirm: async () => {
        try {
          // Use the actual service type we already determined
          const serviceTypeToApprove = actualServiceType;

          const adminLanguage = isGerman ? 'de' : 'en';
          const response = await partnersAPI.approveService(partnerId, serviceTypeToApprove, adminLanguage);

          // Check if response indicates success
          if (response.data?.success) {
            // Update local state immediately to show real-time changes
            setPartners(prevPartners =>
              prevPartners.map(p => {
                const isMatch = p.id === partnerId || p._id === partnerId || p.partnerId === partnerId;
                return isMatch
                  ? { ...p, status: 'active', approvedAt: new Date().toISOString() }
                  : p;
              })
            );

            const serviceText = actualServiceType === 'moving'
              ? (isGerman ? 'Umzugsdienst' : 'Moving Service')
              : (isGerman ? 'Reinigungsdienst' : 'Cleaning Service');
            const successMessage = isGerman
              ? `${serviceText} erfolgreich genehmigt`
              : `${serviceText} successfully approved`;
            toast.success(successMessage);
          } else {
            throw new Error('Unexpected response format');
          }
        } catch (error) {
          console.error('Error approving partner service:', error);
          toast.error(isGerman ? 'Fehler beim Genehmigen des Dienstes' : 'Error approving service');
          // Reload partners to ensure data consistency on error
          await Promise.all([loadPartners(), loadPartnerStats()]);
        }
      }
    });
  };

  const handleRejectPartner = async (partnerId, partnerName) => {
    // Get partner details to use their actual service type
    const partner = partners.find(p => p.id === partnerId);
    const serviceTypeToReject = partner?.serviceType || filters.serviceType || 'moving';

    // Show rejection reason dialog
    setRejectionDialog({
      open: true,
      partnerId,
      partnerName,
      serviceType: serviceTypeToReject,
      reason: ''
    });
  };

  const handleConfirmRejection = async () => {
    if (!rejectionDialog.reason.trim()) {
      toast.error('Grund für Ablehnung ist erforderlich');
      return;
    }

    try {
      const response = await partnersAPI.rejectService(
        rejectionDialog.partnerId,
        rejectionDialog.serviceType,
        rejectionDialog.reason.trim()
      );

      // Check if response indicates success
      if (response.data?.success) {
        // Update local state immediately to show real-time changes
        setPartners(prevPartners =>
          prevPartners.map(p =>
            p.id === rejectionDialog.partnerId
              ? { ...p, status: 'rejected', rejectedReason: rejectionDialog.reason.trim() }
              : p
          )
        );

        const serviceDisplayName = rejectionDialog.serviceType === 'moving'
          ? 'Umzugsdienst'
          : 'Reinigungsdienst';

        toast.success(`${serviceDisplayName} für ${rejectionDialog.partnerName} abgelehnt`);

        // Close dialog
        setRejectionDialog({
          open: false,
          partnerId: null,
          partnerName: '',
          serviceType: '',
          reason: ''
        });
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error rejecting partner service:', error);
      toast.error(isGerman ? 'Fehler beim Ablehnen des Dienstes' : 'Error rejecting service');
      // Reload partners to ensure data consistency on error
      await Promise.all([loadPartners(), loadPartnerStats()]);
    }
  };

  const handleSuspendPartner = async (partnerId, partnerName) => {
    const confirmMessage = isGerman
      ? 'Sind Sie sicher, dass Sie diesen Partner sperren möchten? Der Partner wird keine neuen Leads mehr erhalten.'
      : 'Are you sure you want to suspend this partner? They will no longer receive new leads.';

    showConfirmation({
      title: partnerName,
      message: confirmMessage,
      confirmText: isGerman ? 'Sperren' : 'Suspend',
      cancelText: isGerman ? 'Abbrechen' : 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          console.log('Suspending partner:', partnerId);
          setLoading(true);

          const response = await partnersAPI.updateStatus(partnerId, 'suspended');
          console.log('Suspend response:', response);

          // Force reload both partners and stats
          await Promise.all([loadPartners(), loadPartnerStats()]);

          toast.success(isGerman ? 'Partner erfolgreich gesperrt' : 'Partner suspended successfully');

        } catch (error) {
          console.error('Error suspending partner:', error);
          toast.error(isGerman ? 'Fehler beim Sperren des Partners' : 'Failed to suspend partner');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleRevertSuspension = async (partnerId, partnerName) => {
    const confirmMessage = isGerman
      ? 'Sind Sie sicher, dass Sie die Sperrung dieses Partners aufheben möchten? Der Partner wird wieder Leads erhalten können.'
      : 'Are you sure you want to remove the suspension for this partner? They will be able to receive leads again.';

    showConfirmation({
      title: partnerName,
      message: confirmMessage,
      confirmText: isGerman ? 'Sperrung aufheben' : 'Remove Suspension',
      cancelText: isGerman ? 'Abbrechen' : 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          console.log('Removing suspension for partner:', partnerId);
          setLoading(true);

          const response = await partnersAPI.updateStatus(partnerId, 'active');
          console.log('Remove suspension response:', response);

          // Force reload both partners and stats
          await Promise.all([loadPartners(), loadPartnerStats()]);

          toast.success(isGerman ? 'Sperrung erfolgreich aufgehoben' : 'Suspension removed successfully');

        } catch (error) {
          console.error('Error removing suspension:', error);
          toast.error(isGerman ? 'Fehler beim Aufheben der Sperrung' : 'Failed to remove suspension');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleChangePartnerType = async (partnerId, newType, currentType, partnerName) => {
    const confirmMessage = newType === 'exclusive' 
      ? (isGerman ? 'Sind Sie sicher, dass Sie diesen Partner von Basic zu Exklusiv ändern möchten?' : 'Are you sure you want to change this partner from Basic to Exclusive?')
      : (isGerman ? 'Sind Sie sicher, dass Sie diesen Partner von Exklusiv zu Basic ändern möchten?' : 'Are you sure you want to change this partner from Exclusive to Basic?');

    showConfirmation({
      title: partnerName,
      message: confirmMessage,
      confirmText: isGerman ? 'Ändern' : 'Change',
      cancelText: isGerman ? 'Abbrechen' : 'Cancel',
      type: 'info',
      onConfirm: async () => {
        try {
          await partnersAPI.updateType(partnerId, newType);
          await Promise.all([loadPartners(), loadPartnerStats()]); // Reload to get fresh data
          toast.success(isGerman ? 'Partner-Typ erfolgreich aktualisiert' : 'Partner type updated successfully');
        } catch (error) {
          console.error('Error updating partner type:', error);
          toast.error(isGerman ? 'Fehler beim Aktualisieren des Partner-Typs' : 'Failed to update partner type');
        }
      }
    });
  };

  // Handle view partner details
  const handleViewPartner = async (partner) => {
    try {
      setLoading(true);
      const response = await partnersAPI.getById(partner.id);
      
      const partnerData = response.data.success ? response.data.partner : response.data;
      
      // Transform the partner data
      const transformedPartner = {
        ...partnerData,
        id: partnerData._id || partnerData.id,
        name: partnerData.companyName || partnerData.name,
        email: partnerData.contactPerson?.email || partnerData.email,
        type: partnerData.partnerType || partnerData.type
      };
      
      setPartnerForDetails(transformedPartner);
      setCurrentView('details');
      setPartnerLeadsCurrentPage(1); // Reset pagination when viewing new partner
    } catch (error) {
      console.error('Error loading partner details:', error);
      toast.error('Failed to load partner details');
    } finally {
      setLoading(false);
    }
  };

  // Handle back to table view
  const handleBackToTable = () => {
    setCurrentView('table');
    setPartnerForDetails(null);
    setPartnerLeadsCurrentPage(1); // Reset pagination
  };

  // Export partners function
  const exportPartners = async (format) => {
    try {
      const exportParams = {
        partnerType: filters.type !== 'all' ? filters.type : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        city: filters.city || undefined,
        search: filters.searchTerm || undefined,
        serviceType: currentService || undefined
      };

      // Remove undefined values
      const cleanParams = Object.entries(exportParams)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

      console.log('Export partners params:', cleanParams);

      const response = await partnersAPI.export(format, cleanParams);

      console.log('Export response:', response);

      // Create download link
      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Set filename based on format
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `partners_export_${timestamp}.${format}`;
      link.download = filename;

      // Trigger download
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(downloadUrl);

      const formatName = format === 'xlsx' ? 'Excel' : 'PDF';
      toast.success(`${t('common.success')}: Partners Export (${formatName})`);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting partners:', error);
      console.error('Error details:', error.response);

      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You need superadmin privileges to export.');
      } else {
        toast.error(`Failed to export to ${format.toUpperCase()}: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  // Show confirmation dialog helper
  const showConfirmation = ({ title, message, confirmText, cancelText, onConfirm, type = 'warning' }) => {
    setConfirmDialogData({
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      type
    });
    setShowConfirmDialog(true);
  };

  // Handle dialog confirmation
  const handleDialogConfirm = () => {
    if (confirmDialogData.onConfirm) {
      confirmDialogData.onConfirm();
    }
    setShowConfirmDialog(false);
  };

  // Handle dialog cancel
  const handleDialogCancel = () => {
    setShowConfirmDialog(false);
  };

  // Add Partner form handlers
  const handlePartnerFormChange = (field, value) => {
    // Ensure we're working with a clean copy of the form data
    setPartnerFormData(prev => {
      // Create a deep copy to avoid any reference issues
      const newData = JSON.parse(JSON.stringify(prev));
      
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if (newData[parent]) {
          newData[parent][child] = value;
        }
      } else {
        newData[field] = value;
      }
      
      return newData;
    });
    
    // Clear error for this field
    if (partnerFormErrors[field]) {
      setPartnerFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleServiceSelect = (service) => {
    setPartnerFormData(prev => ({
      ...prev,
      serviceType: service
    }));
    setIsServiceDropdownOpen(false); // Close dropdown after selection

    // Clear service error when user selects a service
    if (partnerFormErrors.serviceType) {
      setPartnerFormErrors(prev => ({
        ...prev,
        serviceType: ''
      }));
    }
  };

  // Handle clicking outside the dropdown to close it
  const handleDropdownOutsideClick = (e) => {
    if (!e.target.closest('.service-dropdown-container')) {
      setIsServiceDropdownOpen(false);
    }
  };

  // Add click outside listener when dropdown is open
  React.useEffect(() => {
    if (isServiceDropdownOpen) {
      document.addEventListener('mousedown', handleDropdownOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleDropdownOutsideClick);
      };
    }
  }, [isServiceDropdownOpen]);

  const handleCityAdd = (serviceType, city) => {
    if (!city.trim()) return;
    
    setPartnerFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [serviceType]: {
          ...prev.preferences[serviceType],
          cities: [...prev.preferences[serviceType].cities, city.trim()]
        }
      }
    }));
  };

  const handleCityRemove = (serviceType, cityIndex) => {
    setPartnerFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [serviceType]: {
          ...prev.preferences[serviceType],
          cities: prev.preferences[serviceType].cities.filter((_, index) => index !== cityIndex)
        }
      }
    }));
  };

  const validatePartnerForm = () => {
    const errors = {};

    // Basic validation
    if (!partnerFormData.companyName.trim()) {
      errors.companyName = isGerman ? 'Firmenname ist erforderlich' : 'Company name is required';
    }

    if (!partnerFormData.contactPerson.firstName.trim()) {
      errors['contactPerson.firstName'] = isGerman ? 'Vorname ist erforderlich' : 'First name is required';
    }

    if (!partnerFormData.contactPerson.lastName.trim()) {
      errors['contactPerson.lastName'] = isGerman ? 'Nachname ist erforderlich' : 'Last name is required';
    }

    if (!partnerFormData.contactPerson.email.trim()) {
      errors['contactPerson.email'] = isGerman ? 'E-Mail ist erforderlich' : 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(partnerFormData.contactPerson.email)) {
      errors['contactPerson.email'] = isGerman ? 'Ungültige E-Mail-Adresse' : 'Invalid email address';
    }

    if (!partnerFormData.contactPerson.phone.trim()) {
      errors['contactPerson.phone'] = isGerman ? 'Telefonnummer ist erforderlich' : 'Phone number is required';
    }

    if (!partnerFormData.serviceType) {
      errors.serviceType = isGerman ? 'Service-Typ auswählen' : 'Please select a service type';
    }

    // Address validation
    if (!partnerFormData.address.street.trim()) {
      errors['address.street'] = isGerman ? 'Straße ist erforderlich' : 'Street is required';
    }
    if (!partnerFormData.address.city.trim()) {
      errors['address.city'] = isGerman ? 'Stadt ist erforderlich' : 'City is required';
    }
    if (!partnerFormData.address.zipCode.trim()) {
      errors['address.zipCode'] = isGerman ? 'PLZ ist erforderlich' : 'Zip code is required';
    }
    if (!partnerFormData.address.country.trim()) {
      errors['address.country'] = isGerman ? 'Land ist erforderlich' : 'Country is required';
    }

    setPartnerFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePartnerSubmit = async () => {
    if (!validatePartnerForm()) return;

    setIsSubmittingPartner(true);
    try {
      // Include admin language preference for email localization
      const adminLanguage = isGerman ? 'de' : 'en';
      const dataWithLanguage = {
        ...partnerFormData,
        adminLanguage
      };

      const response = await partnersAPI.create(dataWithLanguage);
      
      if (response.data.success) {
        toast.success(isGerman ? 'Partner erfolgreich erstellt' : 'Partner created successfully');
        setShowAddModal(false);
        
        // Reset form
        setPartnerFormData({
          companyName: '',
          contactPerson: {
            firstName: '',
            lastName: '',
            email: '',
            phone: ''
          },
          partnerType: 'basic',
          serviceType: '',
          address: {
            street: '',
            city: '',
            zipCode: '',
            country: 'Germany'
          },
          preferences: {
            averageLeadsPerWeek: 5
          }
        });
        setPartnerFormErrors({});
        
        // Reload partners and stats
        await Promise.all([loadPartners(), loadPartnerStats()]);
      }
    } catch (error) {
      console.error('Error creating partner:', error);
      
      // Handle error messages with proper German translation
      const errorMessage = error.response?.data?.message || 'Failed to create partner';
      let displayMessage = errorMessage;
      
      if (isGerman) {
        switch (errorMessage) {
          case 'Partner already exists':
            displayMessage = 'Partner existiert bereits';
            break;
          case 'Partner with this email already exists':
            displayMessage = 'Partner mit dieser E-Mail-Adresse existiert bereits';
            break;
          case 'Partner with this company name already exists':
            displayMessage = 'Partner mit diesem Firmennamen existiert bereits';
            break;
          case 'Failed to create partner':
            displayMessage = 'Fehler beim Erstellen des Partners';
            break;
          default:
            if (errorMessage.includes('email already exists')) {
              displayMessage = 'Partner mit dieser E-Mail-Adresse existiert bereits';
            } else if (errorMessage.includes('company name already exists')) {
              displayMessage = 'Partner mit diesem Firmennamen existiert bereits';
            } else {
              displayMessage = 'Fehler beim Erstellen des Partners';
            }
        }
      }
      
      toast.error(displayMessage);
    } finally {
      setIsSubmittingPartner(false);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setPartnerFormData({
      companyName: '',
      contactPerson: {
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
      },
      partnerType: 'basic',
      serviceType: '',
      address: {
        street: '',
        city: '',
        zipCode: '',
        country: 'Germany'
      },
      preferences: {
        averageLeadsPerWeek: 5
      }
    });
    setPartnerFormErrors({});
    setIsServiceDropdownOpen(false);
  };

  // Helper function to get date parameters for partner leads
  const getPartnerDateParams = (filter) => {
    const now = new Date();

    // Handle object structure with type property
    const filterType = typeof filter === 'object' ? filter.type : filter;

    switch (filterType) {
      case 'single':
        if (filter.singleDate) {
          const singleDate = filter.singleDate.toISOString().split('T')[0];
          return {
            startDate: singleDate,
            endDate: singleDate
          };
        }
        return {};
      case 'range':
        if (filter.fromDate && filter.toDate) {
          return {
            startDate: filter.fromDate.toISOString().split('T')[0],
            endDate: filter.toDate.toISOString().split('T')[0]
          };
        }
        return {};
      case 'current_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        endOfWeek.setHours(23, 59, 59, 999);
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfWeek.toISOString().split('T')[0]
        };
      case 'last_week':
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7); // Previous Sunday
        lastWeekStart.setHours(0, 0, 0, 0);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6); // Previous Saturday
        lastWeekEnd.setHours(23, 59, 59, 999);
        return {
          startDate: lastWeekStart.toISOString().split('T')[0],
          endDate: lastWeekEnd.toISOString().split('T')[0]
        };
      case 'current_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0]
        };
      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: lastMonthStart.toISOString().split('T')[0],
          endDate: lastMonthEnd.toISOString().split('T')[0]
        };
      default:
        return {};
    }
  };

  // Handle view lead (similar to Lead Management)
  const handleViewLead = async (lead) => {
    try {
      setLoading(true);
      // Import leadsAPI
      const { leadsAPI } = await import('../../../lib/api/api');
      const response = await leadsAPI.getById(lead._id || lead.id);

      // Handle the response structure from the updated backend
      const leadData = response.data.success ? response.data.lead : response.data;

      // Transform the lead data similar to Lead Management
      const transformedLead = {
        ...leadData,
        id: leadData._id || leadData.id,
        leadId: leadData.leadId || leadData.id,
        name: leadData.user ?
          `${leadData.user.firstName} ${leadData.user.lastName}`.trim() :
          (leadData.name || ''),
        email: leadData.user?.email || leadData.email || '',
        city: leadData.location?.city || leadData.city || '',
        // Use the partner-specific status from the lead object that was clicked
        status: lead.status || leadData.status || 'pending'
      };

      setLeadForDetails(transformedLead);
      setShowLeadDetails(true);
    } catch (error) {
      console.error('Error loading lead details:', error);
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  // Close lead details view
  const handleCloseLeadDetails = () => {
    setShowLeadDetails(false);
    setLeadForDetails(null);
  };

  // Helper function to render table row for lead details

  // Load partner metrics for Overview tab (simplified)
  const loadPartnerMetrics = async () => {
    if (!partnerForDetails || !partnerForDetails.id) return;

    try {
      // Simple API call to get all leads for this partner for current service
      const response = await partnersAPI.getLeads(partnerForDetails.id, {
        service: currentService,
        limit: 1000
      });

      const leads = response.data.leads || [];

      // Calculate metrics from all leads by checking specific partner's assignments
      const metrics = {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        cancelled: 0,
        cancel_requested: 0
      };

      leads.forEach((lead) => {
        if (!lead.partnerAssignments) {
          return;
        }

        // partnersAPI.getLeads returns a SINGLE OBJECT, not an array
        // because it already filters to this specific partner
        const assignment = lead.partnerAssignments;
        const status = assignment.status || 'pending';

        // Count this lead
        metrics.total++;

        // Count by status
        if (status === 'accepted') {
          metrics.accepted++;
        } else if (status === 'cancel_requested' || status === 'cancellationRequested') {
          metrics.cancel_requested++;
        } else if (status === 'cancelled' || status === 'cancellation_approved' || status === 'cancellationApproved') {
          metrics.cancelled++;
        } else if (status === 'rejected') {
          metrics.rejected++;
        } else if (status === 'pending') {
          metrics.pending++;
        }
      });

      console.log(`Partner metrics for ${partnerForDetails.companyName || partnerForDetails.id}:`, metrics);
      setPartnerLeadsStats(metrics);
    } catch (error) {
      console.error('Error loading partner metrics:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Metriken' : 'Error loading metrics');
      setPartnerLeadsStats({ total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0, cancel_requested: 0 });
    }
  };

  // Load partner leads
  const loadPartnerLeads = async () => {
    if (!partnerForDetails || !partnerForDetails.id) return;

    setPartnerLeadsLoading(true);
    try {
      // Get date range based on filter
      const dateParams = getPartnerDateParams(partnerLeadsDateFilter);

      // Try using leadsAPI.getAll first (same as partner view)
      let response;
      let leadsData = [];

      // Use partnersAPI.getLeads directly (more reliable for admin viewing partner leads)
      response = await partnersAPI.getLeads(partnerForDetails.id, {
        search: partnerLeadsFilters.search || undefined,
        status: partnerLeadsFilters.status !== 'all' ? partnerLeadsFilters.status : undefined,
        city: partnerLeadsFilters.city || undefined,
        service: currentService,
        limit: 1000,
        ...dateParams
      });
      leadsData = response.data.leads || [];
      console.log('Successfully loaded leads for partner:', partnerForDetails.id);

      console.log('Partner Details - Loading leads for partner:', partnerForDetails.id);
      console.log('Partner Details - Total leads from API:', leadsData.length);
      console.log('Partner Details - Sample lead data structure:', leadsData.length > 0 ? leadsData[0] : null);
      console.log('Partner Details - assignmentId check:', leadsData.length > 0 ? leadsData[0].assignmentId : null);
      console.log('Partner Details - partnerStatus check:', leadsData.length > 0 ? leadsData[0].partnerStatus : null);

      // Transform leads data - create separate row for EACH assignment
      const transformedLeads = [];

      leadsData.forEach(lead => {
        // Extract city display - same as LeadManagement
        let cityDisplay = lead.location?.city || lead.city || '';
        if (lead.serviceType === 'moving') {
          const pickupCity = lead.formData?.pickupAddress?.city ||
                           lead.pickupLocation?.city ||
                           lead.formData?.pickupCity ||
                           lead.pickupCity;
          const destinationCity = lead.formData?.destinationAddress?.city ||
                                 lead.destinationLocation?.city ||
                                 lead.formData?.destinationCity ||
                                 lead.destinationCity;

          if (pickupCity && destinationCity) {
            cityDisplay = `${pickupCity} → ${destinationCity}`;
          } else if (pickupCity) {
            cityDisplay = pickupCity;
          } else if (destinationCity) {
            cityDisplay = destinationCity;
          }
        }

        // Extract pickup date - same as LeadManagement
        let pickupDate = null;
        let dateDisplay = '';
        if (lead.formData?.pickupDate) {
          pickupDate = new Date(lead.formData.pickupDate);
          if (!isNaN(pickupDate.getTime())) {
            dateDisplay = pickupDate.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB');
          }
        }

        // Base lead data
        const baseLeadData = {
          ...lead,
          id: lead._id || lead.id,
          leadId: lead.leadId || lead.id,
          name: lead.user ? `${lead.user.firstName} ${lead.user.lastName}`.trim() : (lead.name || ''),
          email: lead.user?.email || lead.email || '',
          city: cityDisplay,
          pickupCity: lead.formData?.pickupAddress?.city || '',
          destinationCity: lead.formData?.destinationAddress?.city || '',
          dateDisplay: dateDisplay,
          pickupDate: pickupDate,
        };

        // Backend has already unwound partnerAssignments and provided fields at root level
        // Use assignmentId for uniqueness, partnerStatus for status display
        console.log('Transforming lead:', {
          leadId: lead.leadId,
          assignmentId: lead.assignmentId,
          partnerStatus: lead.partnerStatus,
          partnerAssignedAt: lead.partnerAssignedAt
        });

        transformedLeads.push({
          ...baseLeadData,
          assignmentId: lead.assignmentId, // Use _id from partnerAssignments for uniqueness
          status: lead.partnerStatus || 'pending', // Use partnerStatus from backend
          partnerStatus: lead.partnerStatus || 'pending',
          assignedAt: lead.partnerAssignedAt || lead.assignedAt,
          partnerAssignedAt: lead.partnerAssignedAt
        });
      });

      // Keep ALL assignments (including duplicates) - do NOT deduplicate
      setPartnerLeads(transformedLeads);

      // Calculate partner-specific stats from all assignments (including duplicates)
      const partnerSpecificStats = {
        total: transformedLeads.length,
        pending: transformedLeads.filter(lead => lead.status === 'pending').length,
        accepted: transformedLeads.filter(lead => lead.status === 'accepted').length,
        rejected: transformedLeads.filter(lead => lead.status === 'rejected').length,
        cancelled: transformedLeads.filter(lead =>
          lead.status === 'cancelled' ||
          lead.status === 'cancellation_approved'
        ).length,
        cancel_requested: transformedLeads.filter(lead =>
          lead.status === 'cancel_requested' ||
          lead.status === 'cancellationRequested'
        ).length
      };

      setPartnerLeadsStats(partnerSpecificStats);
    } catch (error) {
      console.error('Error loading partner leads:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Partner-Leads' : 'Error loading partner leads');
      setPartnerLeads([]);
      setPartnerLeadsStats({ total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0, cancel_requested: 0 });
    } finally {
      setPartnerLeadsLoading(false);
    }
  };

  // Load admin settings and calculate weekly lead stats
  const loadWeeklyLeadStats = async () => {
    if (!partnerForDetails) return;

    try {
      // Load admin settings
      const settingsResponse = await settingsAPI.get();

      if (settingsResponse.data.success) {
        const settings = settingsResponse.data.data;
        setAdminSettings(settings);

        // Get partner type and service type
        const partnerType = partnerForDetails.partnerType || partnerForDetails.type || 'basic';
        const serviceType = currentService;

        // Load partner data to check for custom settings
        const partnerResponse = await partnersAPI.getById(partnerForDetails.id);
        const partner = partnerResponse.data.partner;

        // Get lead limit from partner custom settings first, then fall back to admin settings
        const leadLimit = partner.customPricing?.leadsPerWeek ||
                         settings.leadDistribution?.[serviceType]?.[partnerType]?.leadsPerWeek || 0;

        // Get current week's leads for this partner and service
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const leadsResponse = await partnersAPI.getLeads(partnerForDetails.id, {
          service: serviceType,
          startDate: startOfWeek.toISOString(),
          endDate: new Date().toISOString()
        });

        const currentWeekLeads = leadsResponse.data?.leads?.length || 0;

        setWeeklyLeadStats({
          currentWeek: currentWeekLeads,
          limit: leadLimit
        });
      }
    } catch (error) {
      console.error('Error loading weekly lead stats:', error);
      setWeeklyLeadStats({ currentWeek: 0, limit: 0 });
    }
  };

  // Handle partner leads filter change
  const handlePartnerLeadsFilterChange = (field, value) => {
    setPartnerLeadsFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Load partner settings and global settings
  const loadPartnerSettings = async () => {
    if (!partnerForDetails?.id) return;

    setSettingsLoading(true);
    try {
      // Load global settings first
      const globalResponse = await settingsAPI.get();
      setGlobalSettings(globalResponse.data.data);

      // Load partner settings (including custom pricing if any)
      const partnerResponse = await partnersAPI.getById(partnerForDetails.id);
      const partner = partnerResponse.data.partner;

      setPartnerSettings({
        customPricing: {
          perLeadPrice: partner.customPricing?.perLeadPrice || null,
          leadsPerWeek: partner.customPricing?.leadsPerWeek || null
        }
      });
    } catch (error) {
      console.error('Error loading partner settings:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Einstellungen' : 'Error loading settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Save partner settings
  const savePartnerSettings = async () => {
    if (!partnerForDetails?.id) return;

    setSettingsSaving(true);
    try {
      await partnersAPI.updatePartnerSettings(partnerForDetails.id, {
        customPricing: {
          perLeadPrice: partnerSettings.customPricing.perLeadPrice || null,
          leadsPerWeek: partnerSettings.customPricing.leadsPerWeek || null
        }
      });

      toast.success(isGerman ? 'Einstellungen erfolgreich gespeichert' : 'Settings saved successfully');

      // Refresh weekly lead stats to reflect new custom limits
      loadWeeklyLeadStats();
    } catch (error) {
      console.error('Error saving partner settings:', error);
      toast.error(isGerman ? 'Fehler beim Speichern der Einstellungen' : 'Error saving settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Handle partner settings change
  const handlePartnerSettingsChange = (field, value) => {
    setPartnerSettings(prev => ({
      ...prev,
      customPricing: {
        ...prev.customPricing,
        [field]: value
      }
    }));
  };

  // Reset to default price
  const resetToDefaultPrice = () => {
    const defaultPrice = globalSettings?.pricing?.[partnerForDetails.serviceType]?.[partnerForDetails.partnerType]?.perLeadPrice || 25;
    handlePartnerSettingsChange('perLeadPrice', null); // Set to null to use default
  };

  // Reset to default leads per week
  const resetToDefaultLeadsPerWeek = () => {
    const defaultLeads = globalSettings?.leadDistribution?.[partnerForDetails.serviceType]?.[partnerForDetails.partnerType]?.leadsPerWeek || 3;
    handlePartnerSettingsChange('leadsPerWeek', null); // Set to null to use default
  };

  // Load partner metrics for Overview tab
  useEffect(() => {
    if (partnerForDetails && partnerDetailsTab === 'overview') {
      loadPartnerMetrics();
      loadWeeklyLeadStats();
    }
  }, [partnerDetailsTab, partnerForDetails, currentService]);

  // Load partner leads when Leads tab is active and filters change
  useEffect(() => {
    if (partnerForDetails && partnerDetailsTab === 'leads') {
      loadPartnerLeads();
      setPartnerLeadsCurrentPage(1); // Reset to page 1 when filters change
    }
  }, [partnerDetailsTab, partnerLeadsFilters, partnerLeadsDateFilter.type, partnerLeadsDateFilter.singleDate, partnerLeadsDateFilter.fromDate, partnerLeadsDateFilter.toDate, partnerForDetails, currentService]);

  // Load partner settings when settings tab is selected
  useEffect(() => {
    if (partnerForDetails && partnerDetailsTab === 'settings') {
      loadPartnerSettings();
    }
  }, [partnerDetailsTab, partnerForDetails]);

  // Hide service filter when viewing partner details
  useEffect(() => {
    if (currentView === 'details') {
      setHideServiceFilter(true);
    } else {
      setHideServiceFilter(false);
    }
    
    // Cleanup: show service filter when component unmounts
    return () => {
      setHideServiceFilter(false);
    };
  }, [currentView, setHideServiceFilter]);

  // Reset partner details tab when switching partners
  useEffect(() => {
    setPartnerDetailsTab('overview');
    setPartnerLeads([]);
    setPartnerLeadsStats({ total: 0, pending: 0, assigned: 0, accepted: 0, cancelled: 0 });
  }, [partnerForDetails]);

  // Server-side pagination: display partners directly from API
  const currentPartners = partners;

  // Pagination reset is now handled in the filter useEffect above
  // Weekly lead stats are now loaded in the Overview tab useEffect above

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Zugriff verweigert' : 'Access Denied'}
          </h3>
          <p style={{ color: 'var(--theme-muted)' }}>
            {isGerman ? 'Nur Super-Admins können Partner verwalten' : 'Only Super Admins can manage partners'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {currentView === 'table' ? (
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Partner-Verwaltung' : 'Partner Management'}
          </h2>
          {isSuperAdmin && (
            <div className="flex items-center space-x-3">
              {/* Export Dropdown */}
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
                  📊 {t('common.export')}
                  <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg z-50" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
                    <div className="py-2">
                      <button
                        onClick={() => exportPartners('xlsx')}
                        className="w-full px-4 py-2 text-left hover:bg-opacity-80 transition-colors flex items-center gap-3"
                        style={{ color: 'var(--theme-text)', backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-bg-secondary)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <span className="text-green-600">📊</span>
                        <div>
                          <div className="font-medium">Export to Excel</div>
                          <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>Download as .xlsx file</div>
                        </div>
                      </button>
                      <button
                        onClick={() => exportPartners('pdf')}
                        className="w-full px-4 py-2 text-left hover:bg-opacity-80 transition-colors flex items-center gap-3"
                        style={{ color: 'var(--theme-text)', backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-bg-secondary)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <span className="text-red-600">📄</span>
                        <div>
                          <div className="font-medium">Export to PDF</div>
                          <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>Download as .pdf file</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <motion.button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--theme-button-bg)',
                  color: 'var(--theme-button-text)'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ➕ {isGerman ? 'Partner hinzufügen' : 'Add Partner'}
              </motion.button>
            </div>
          )}
          {!isSuperAdmin && (
            <motion.button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--theme-button-bg)',
                color: 'var(--theme-button-text)'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ➕ {isGerman ? 'Partner hinzufügen' : 'Add Partner'}
            </motion.button>
          )}
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToTable}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--theme-text)' }}
          >
            ← {t('common.back')}
          </button>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Partner Details' : 'Partner Details'}
            </h2>
            {partnerForDetails && partnerForDetails.companyName && (
              <>
                <span className="text-2xl" style={{ color: 'var(--theme-muted)' }}>-</span>
                <h3 className="text-xl font-semibold" style={{ color: 'var(--theme-text)' }}>
                  {partnerForDetails.companyName}
                </h3>
              </>
            )}
          </div>
          {partnerForDetails && (
            <span className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-medium ${getStatusColor(partnerForDetails.status)}`}>
              {partnerForDetails.status}
            </span>
          )}
        </div>
      )}

      {/* Filters - only show when currentView is 'table' */}
      {currentView === 'table' && (
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
            placeholder={t('partners.searchPartners')}
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

        {/* Type Filter */}
        <div className="flex-1">
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
            <option value="all">{t('partners.allTypes')}</option>
            <option value="exclusive">{t('partners.exclusive')}</option>
            <option value="basic">{t('partners.basic')}</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex-1">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
            <option value="all">{t('partners.allStatus')}</option>
            <option value="active">{t('partners.active')}</option>
            <option value="pending">{t('partners.pending')}</option>
            <option value="suspended">{t('partners.suspended')}</option>
            <option value="rejected">{t('partners.rejected')}</option>
          </select>
        </div>

        {/* City Filter */}
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('partners.cityPlaceholder')}
            value={filters.city}
            onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          />
        </div>

        {/* Date Filter */}
        <div className="flex-1">
          <div className="space-y-2">
            <select
              value={dateFilter.type}
              onChange={(e) => setDateFilter(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)'
              }}
            >
              <option value="all">{isGerman ? 'Alle Daten' : 'All Dates'}</option>
              <option value="single">{isGerman ? 'Einzelnes Datum' : 'Single Date'}</option>
              <option value="range">{isGerman ? 'Datumsbereich' : 'Date Range'}</option>
              <option value="week">{isGerman ? 'Woche' : 'Week'}</option>
              <option value="month">{isGerman ? 'Monat' : 'Month'}</option>
              <option value="year">{isGerman ? 'Jahr' : 'Year'}</option>
            </select>

            {/* Single Date */}
            {dateFilter.type === 'single' && (
              <div className="mt-2">
                <DatePicker
                  selected={dateFilter.singleDate}
                  onChange={(date) => setDateFilter(prev => ({ ...prev, singleDate: date }))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText={isGerman ? 'Datum auswählen' : 'Select date'}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  wrapperClassName="w-full"
                  showPopperArrow={false}
                  popperPlacement="bottom-start"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
              </div>
            )}

            {/* Date Range */}
            {dateFilter.type === 'range' && (
              <div className="mt-2 space-y-2">
                <DatePicker
                  selected={dateFilter.fromDate}
                  onChange={(date) => setDateFilter(prev => ({ ...prev, fromDate: date }))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText={isGerman ? 'Von' : 'From'}
                  maxDate={dateFilter.toDate}
                  className="w-full px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  wrapperClassName="w-full"
                  showPopperArrow={false}
                  popperPlacement="bottom-start"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
                <DatePicker
                  selected={dateFilter.toDate}
                  onChange={(date) => setDateFilter(prev => ({ ...prev, toDate: date }))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText={isGerman ? 'Bis' : 'To'}
                  minDate={dateFilter.fromDate}
                  className="w-full px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  wrapperClassName="w-full"
                  showPopperArrow={false}
                  popperPlacement="bottom-start"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
              </div>
            )}

            {/* Week */}
            {dateFilter.type === 'week' && (
              <div className="mt-2">
                <DatePicker
                  selected={dateFilter.week}
                  onChange={(date) => setDateFilter(prev => ({ ...prev, week: date }))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText={isGerman ? 'Woche auswählen' : 'Select week'}
                  showWeekNumbers
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  wrapperClassName="w-full"
                  showPopperArrow={false}
                  popperPlacement="bottom-start"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
              </div>
            )}

            {/* Month */}
            {dateFilter.type === 'month' && (
              <div className="mt-2">
                <DatePicker
                  selected={dateFilter.month}
                  onChange={(date) => setDateFilter(prev => ({ ...prev, month: date }))}
                  dateFormat="MM/yyyy"
                  placeholderText={isGerman ? 'Monat auswählen' : 'Select month'}
                  showMonthYearPicker
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  wrapperClassName="w-full"
                  showPopperArrow={false}
                  popperPlacement="bottom-start"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
              </div>
            )}

            {/* Year */}
            {dateFilter.type === 'year' && (
              <div className="mt-2">
                <DatePicker
                  selected={dateFilter.year}
                  onChange={(date) => setDateFilter(prev => ({ ...prev, year: date }))}
                  dateFormat="yyyy"
                  placeholderText={isGerman ? 'Jahr auswählen' : 'Select year'}
                  showYearPicker
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  wrapperClassName="w-full"
                  showPopperArrow={false}
                  popperPlacement="bottom-start"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
              </div>
            )}
          </div>
        </div>

      </motion.div>
      )}

      {/* Statistics - only show when currentView is 'table' */}
      {currentView === 'table' && (
      <div className="flex flex-row gap-4 mb-6">
        {[
          {
            label: isGerman ? 'Gesamt Partner' : 'Total Partners',
            value: partnerStats.total,
            icon: '🏢',
            color: 'blue'
          },
          {
            label: isGerman ? 'Aktive Partner' : 'Active Partners',
            value: partnerStats.active,
            icon: '✅',
            color: 'green'
          },
          {
            label: isGerman ? 'Basic Partner' : 'Basic Partners',
            value: partnerStats.basic,
            icon: '🟢',
            color: 'emerald'
          },
          {
            label: isGerman ? 'Exklusive Partner' : 'Exclusive Partners',
            value: partnerStats.exclusive,
            icon: '🔥',
            color: 'purple'
          },
          {
            label: isGerman ? 'Ausstehende Anfragen' : 'Pending Requests',
            value: partnerStats.pending,
            icon: '⏳',
            color: 'yellow'
          },
          {
            label: isGerman ? 'Abgelehnt/Gesperrt' : 'Rejected/Suspended',
            value: partnerStats.rejectSuspended,
            icon: '🚫',
            color: 'red'
          }
        ].map((stat, index) => (
          <motion.div
            key={index}
            className="flex-1 p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>{stat.label}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>{stat.value}</p>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      {/* Partners Table - only show when currentView is 'table' */}
      {currentView === 'table' && (
      <motion.div
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: 'var(--theme-border)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div>
          <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
            <thead style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
              <tr>
                <SortableHeader sortKey="partnerId">
                  {isGerman ? 'Partner ID' : 'Partner ID'}
                </SortableHeader>
                <SortableHeader sortKey="companyName">
                  {isGerman ? 'Partner' : 'Partner'}
                </SortableHeader>
                <SortableHeader sortKey="partnerType">
                  {isGerman ? 'Typ' : 'Type'}
                </SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Kontakt' : 'Contact No.'}
                </th>
                <SortableHeader sortKey="status">
                  {isGerman ? 'Status' : 'Status'}
                </SortableHeader>
                <SortableHeader sortKey="metrics.totalLeadsAccepted">
                  {isGerman ? 'Leads' : 'Leads'}
                </SortableHeader>
                <SortableHeader sortKey="registeredAt">
                  {isGerman ? 'Registriert am' : 'Registered Date'}
                </SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Aktionen' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span style={{ color: 'var(--theme-text)' }}>
                        {t('common.loading')}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : currentPartners.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Keine Partner gefunden' : 'No partners found'}
                  </td>
                </tr>
              ) : (
                currentPartners.map((partner, index) => (
                  <motion.tr
                    key={partner.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-opacity-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                      {partner.partnerId || partner.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                          {partner.name}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                          {partner.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-medium ${getTypeColor(partner.type)}`}>
                        {partner.type}
                      </span>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        {partner.phone || partner.contactPerson?.phone || 'N/A'}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-medium ${getStatusColor(partner.status)}`}>
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                      {partner.leadsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                      {partner.registeredAt.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {/* View button - available to all users */}
                        <button
                          onClick={() => handleViewPartner(partner)}
                          className="text-xs px-3 py-1 rounded transition-colors"
                          style={{ 
                            backgroundColor: 'var(--theme-bg-secondary)',
                            color: 'var(--theme-text)',
                            border: '1px solid var(--theme-border)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'var(--theme-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'var(--theme-bg-secondary)';
                          }}
                          title={isGerman ? 'Details anzeigen' : 'View Details'}
                        >
                          👁️ {isGerman ? 'Anzeigen' : 'View'}
                        </button>
                        {partner.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprovePartner(partner.id, partner.name)}
                              disabled={loading}
                              className={`text-xs px-3 py-1 rounded font-medium transition-colors disabled:opacity-50 ${
                                loading
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              title={isGerman ? "Service genehmigen" : "Approve service"}
                            >
                              ✅ {isGerman ? 'Genehmigen' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleRejectPartner(partner.id, partner.name)}
                              disabled={loading}
                              className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
                              style={{ 
                                backgroundColor: 'var(--theme-bg-secondary)',
                                color: 'var(--theme-text)',
                                border: '1px solid var(--theme-border)'
                              }}
                              onMouseEnter={(e) => {
                                if (!loading) e.target.style.backgroundColor = 'var(--theme-hover)';
                              }}
                              onMouseLeave={(e) => {
                                if (!loading) e.target.style.backgroundColor = 'var(--theme-bg-secondary)';
                              }}
                              title={isGerman ? "Service ablehnen" : "Reject service"}
                            >
                              ❌ {isGerman ? 'Ablehnen' : 'Reject'}
                            </button>
                          </>
                        )}
                        {partner.status === 'active' && (
                          <>
                            <select
                              value={partner.type}
                              onChange={(e) => handleChangePartnerType(partner.id, e.target.value, partner.type, partner.name)}
                              disabled={loading}
                              className="text-xs px-3 py-1 rounded disabled:opacity-50"
                              style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)' }}
                            >
                              <option value="basic">{isGerman ? 'Standard' : 'Basic'}</option>
                              <option value="exclusive">{isGerman ? 'Exklusiv' : 'Exclusive'}</option>
                            </select>
                            <button
                              onClick={() => handleSuspendPartner(partner.id, partner.name)}
                              disabled={loading}
                              className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
                              style={{ 
                                backgroundColor: 'var(--theme-bg-secondary)',
                                color: 'var(--theme-text)',
                                border: '1px solid var(--theme-border)'
                              }}
                              onMouseEnter={(e) => {
                                if (!loading) e.target.style.backgroundColor = 'var(--theme-hover)';
                              }}
                              onMouseLeave={(e) => {
                                if (!loading) e.target.style.backgroundColor = 'var(--theme-bg-secondary)';
                              }}
                            >
                              🚫 {isGerman ? 'Sperren' : 'Suspend'}
                            </button>
                          </>
                        )}
                        {partner.status === 'suspended' && (
                          <button
                            onClick={() => handleRevertSuspension(partner.id, partner.name)}
                            disabled={loading}
                            className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
                            style={{ 
                              backgroundColor: 'var(--theme-bg-secondary)',
                              color: 'var(--theme-text)',
                              border: '1px solid var(--theme-border)'
                            }}
                            onMouseEnter={(e) => {
                              if (!loading) e.target.style.backgroundColor = 'var(--theme-hover)';
                            }}
                            onMouseLeave={(e) => {
                              if (!loading) e.target.style.backgroundColor = 'var(--theme-bg-secondary)';
                            }}
                          >
                            ↩️ {isGerman ? 'Sperrung aufheben' : 'Remove Suspension'}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      )}

      {/* Partner Details View */}
      {currentView === 'details' && partnerForDetails && (
        <motion.div
          className="mt-6 overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Tab Navigation */}
          <div className="flex border-b mb-6" style={{ borderColor: 'var(--theme-border)' }}>
            <button
              onClick={() => setPartnerDetailsTab('overview')}
              className={`px-6 py-3 font-medium transition-colors ${
                partnerDetailsTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                color: partnerDetailsTab === 'overview' ? '#3B82F6' : 'var(--theme-text-muted)',
                borderBottomColor: partnerDetailsTab === 'overview' ? '#3B82F6' : 'transparent'
              }}
            >
              {isGerman ? 'Übersicht' : 'Overview'}
            </button>
            <button
              onClick={() => setPartnerDetailsTab('leads')}
              className={`px-6 py-3 font-medium transition-colors ${
                partnerDetailsTab === 'leads'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                color: partnerDetailsTab === 'leads' ? '#3B82F6' : 'var(--theme-text-muted)',
                borderBottomColor: partnerDetailsTab === 'leads' ? '#3B82F6' : 'transparent'
              }}
            >
              {isGerman ? 'Leads' : 'Leads'}
            </button>
            <button
              onClick={() => setPartnerDetailsTab('settings')}
              className={`px-6 py-3 font-medium transition-colors ${
                partnerDetailsTab === 'settings'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                color: partnerDetailsTab === 'settings' ? '#3B82F6' : 'var(--theme-text-muted)',
                borderBottomColor: partnerDetailsTab === 'settings' ? '#3B82F6' : 'transparent'
              }}
            >
              {isGerman ? 'Einstellungen' : 'Settings'}
            </button>
          </div>
          {/* Tab Content */}
          {partnerDetailsTab === 'overview' && (
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Company Information */}
              <div>
                <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Firmeninformationen' : 'Company Information'}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)' }}>
                    <tbody>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Partner ID' : 'Partner ID'}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          <span className="font-mono">{partnerForDetails.partnerId || partnerForDetails.id}</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Firmenname' : 'Company Name'}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.name}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Partner-Typ' : 'Partner Type'}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          <span className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-medium ${getTypeColor(partnerForDetails.type)}`}>
                            {partnerForDetails.type}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Adresse' : 'Address'}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.address?.street || '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Stadt' : 'City'}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.address?.postalCode && partnerForDetails.address?.city ? 
                            `${partnerForDetails.address.postalCode} ${partnerForDetails.address.city}` : 
                            (partnerForDetails.address?.city || '-')
                          }
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Land' : 'Country'}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.address?.country || 'Germany'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column - Contact Information */}
              <div>
                <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Kontaktinformationen' : 'Contact Information'}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)' }}>
                    <tbody>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Ansprechpartner' : 'Contact Person'}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.contactPerson ? 
                            `${partnerForDetails.contactPerson.firstName} ${partnerForDetails.contactPerson.lastName}` : 
                            '-'
                          }
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {t('common.email')}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.email}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {t('common.phone')}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.contactPerson?.phone || '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Registriert am' : 'Registered At'}:
                        </td>
                        <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.registeredAt ? 
                            new Date(partnerForDetails.registeredAt).toLocaleString() : 
                            new Date(partnerForDetails.createdAt).toLocaleString()
                          }
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Metrics and Preferences */}
            {partnerForDetails.metrics && (
            <div className=" py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Performance Metrics */}
                <div>
                  <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Leistungsmetriken' : 'Performance Metrics'}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)' }}>
                      <tbody>
                        <tr>
                          <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                            {isGerman ? 'Leads gesamt' : 'Total Leads'}:
                          </td>
                          <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                            {partnerLeadsStats.total || 0}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                            {isGerman ? 'Akzeptiert gesamt' : 'Total Accepted'}:
                          </td>
                          <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                            {partnerLeadsStats.accepted || 0}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                            {isGerman ? 'Storniert gesamt' : 'Total Cancelled'}:
                          </td>
                          <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                            {partnerLeadsStats.cancelled || 0}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column - Preferences */}
                <div>
                  <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Einstellungen' : 'Preferences'}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)' }}>
                      <tbody>
                        <tr>
                          <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                            {isGerman ? 'Wöchentliche Leads' : 'Weekly Leads'}:
                          </td>
                          <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                            <div className="flex items-center space-x-2">
                              <span className={`font-semibold ${weeklyLeadStats.currentWeek >= weeklyLeadStats.limit ? 'text-red-500' : 'text-green-500'}`}>
                                {weeklyLeadStats.currentWeek} / {weeklyLeadStats.limit}
                              </span>
                              <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                                ({currentService === 'moving' ? (isGerman ? 'Umzug' : 'Moving') : (isGerman ? 'Reinigung' : 'Cleaning')} - {partnerForDetails?.partnerType || partnerForDetails?.type || 'basic'})
                              </span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                            {isGerman ? 'Verbleibendes Limit' : 'Remaining Limit'}:
                          </td>
                          <td className="px-6 py-3 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                            <span className={`font-semibold ${(weeklyLeadStats.limit - weeklyLeadStats.currentWeek) <= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                              {Math.max(0, weeklyLeadStats.limit - weeklyLeadStats.currentWeek)}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Service Area Preferences - Pickup and Destination for Moving Partners */}
            {partnerForDetails.serviceType === 'moving' && partnerForDetails.preferences && (
            <div className="py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pickup Preferences */}
                <div>
                  <h4 className="text-md font-medium mb-3 flex items-center" style={{ color: 'var(--theme-text)' }}>
                    📦 {isGerman ? 'Abholung-Einstellungen' : 'Pickup Preferences'}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)' }}>
                      <tbody>
                        {partnerForDetails.preferences.pickup?.serviceArea && Object.keys(partnerForDetails.preferences.pickup.serviceArea).length > 0 ? (
                          Object.entries(partnerForDetails.preferences.pickup.serviceArea).map(([country, config]) => (
                            <tr key={`pickup-${country}`}>
                              <td className="px-4 py-2 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                                🌍 {country}:
                              </td>
                              <td className="px-4 py-2 text-sm" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                                {config.type === 'cities' ? (
                                  <div>
                                    <span className="text-blue-500 font-medium">{isGerman ? 'Spezifische Städte' : 'Specific Cities'}</span>
                                    {Object.keys(config.cities || {}).length > 0 && (
                                      <div className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                                        {Object.entries(config.cities).map(([city, cityConfig]) => (
                                          <span
                                            key={city}
                                            className="inline-block px-2 py-1 rounded mr-1 mb-1 text-xs"
                                            style={{
                                              backgroundColor: 'var(--theme-bg-secondary)',
                                              color: 'var(--theme-text)',
                                              border: '1px solid var(--theme-border)'
                                            }}
                                          >
                                            {city} ({cityConfig.radius || 0}km)
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-green-500 font-medium">{isGerman ? 'Ganzes Land' : 'Whole Country'}</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="2" className="px-4 py-3 text-sm text-center" style={{ color: 'var(--theme-muted)' }}>
                              {isGerman ? 'Keine Abholung-Gebiete konfiguriert' : 'No pickup areas configured'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Destination Preferences */}
                <div>
                  <h4 className="text-md font-medium mb-3 flex items-center" style={{ color: 'var(--theme-text)' }}>
                    🎯 {isGerman ? 'Ziel-Einstellungen' : 'Destination Preferences'}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)' }}>
                      <tbody>
                        {partnerForDetails.preferences.destination?.serviceArea && Object.keys(partnerForDetails.preferences.destination.serviceArea).length > 0 ? (
                          Object.entries(partnerForDetails.preferences.destination.serviceArea).map(([country, config]) => (
                            <tr key={`destination-${country}`}>
                              <td className="px-4 py-2 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                                🌍 {country}:
                              </td>
                              <td className="px-4 py-2 text-sm" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                                {config.type === 'cities' ? (
                                  <div>
                                    <span className="text-blue-500 font-medium">{isGerman ? 'Spezifische Städte' : 'Specific Cities'}</span>
                                    {Object.keys(config.cities || {}).length > 0 && (
                                      <div className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                                        {Object.entries(config.cities).map(([city, cityConfig]) => (
                                          <span
                                            key={city}
                                            className="inline-block px-2 py-1 rounded mr-1 mb-1 text-xs"
                                            style={{
                                              backgroundColor: 'var(--theme-bg-secondary)',
                                              color: 'var(--theme-text)',
                                              border: '1px solid var(--theme-border)'
                                            }}
                                          >
                                            {city} ({cityConfig.radius || 0}km)
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-green-500 font-medium">{isGerman ? 'Ganzes Land' : 'Whole Country'}</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="2" className="px-4 py-3 text-sm text-center" style={{ color: 'var(--theme-muted)' }}>
                              {isGerman ? 'Keine Ziel-Gebiete konfiguriert' : 'No destination areas configured'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Cleaning Service Areas for Cleaning Partners */}
            {partnerForDetails.serviceType === 'cleaning' && partnerForDetails.preferences?.cleaning && (
            <div className="py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <div>
                <h4 className="text-md font-medium mb-3 flex items-center" style={{ color: 'var(--theme-text)' }}>
                  🧽 {isGerman ? 'Reinigungs-Einstellungen' : 'Cleaning Preferences'}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)' }}>
                    <tbody>
                      {partnerForDetails.preferences.cleaning?.serviceArea && Object.keys(partnerForDetails.preferences.cleaning.serviceArea).length > 0 ? (
                        Object.entries(partnerForDetails.preferences.cleaning.serviceArea).map(([country, config]) => (
                          <tr key={`cleaning-${country}`}>
                            <td className="px-4 py-2 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                              🌍 {country}:
                            </td>
                            <td className="px-4 py-2 text-sm" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                              {config.type === 'cities' ? (
                                <div>
                                  <span className="text-blue-500 font-medium">{isGerman ? 'Spezifische Städte' : 'Specific Cities'}</span>
                                  {Object.keys(config.cities || {}).length > 0 && (
                                    <div className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                                      {Object.entries(config.cities).map(([city, cityConfig]) => (
                                        <span
                                          key={city}
                                          className="inline-block px-2 py-1 rounded mr-1 mb-1 text-xs"
                                          style={{
                                            backgroundColor: 'var(--theme-bg-secondary)',
                                            color: 'var(--theme-text)',
                                            border: '1px solid var(--theme-border)'
                                          }}
                                        >
                                          {city} ({cityConfig.radius || 0}km)
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-green-500 font-medium">{isGerman ? 'Ganzes Land' : 'Whole Country'}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" className="px-4 py-2 text-sm text-center" style={{ color: 'var(--theme-muted)' }}>
                            {isGerman ? 'Keine Servicegebiete konfiguriert' : 'No service areas configured'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )}
          </div>
          )}

          {/* Leads Tab */}
          {partnerDetailsTab === 'leads' && (
            <div className="px-6 py-4">
              {/* Filters for Partner Leads */}
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
                    placeholder={isGerman ? 'Lead ID, Name, E-Mail suchen...' : 'Search Lead ID, Name, Email...'}
                    value={partnerLeadsFilters.search || ''}
                    onChange={(e) => handlePartnerLeadsFilterChange('search', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: 'var(--theme-input-bg)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)'
                    }}
                  />
                </div>

                {/* Status Filter */}
                <div className="flex-1">
                  <select
                    value={partnerLeadsFilters.status}
                    onChange={(e) => handlePartnerLeadsFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: 'var(--theme-input-bg)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)'
                    }}
                  >
                    <option value="all">{isGerman ? 'Status - Alle' : 'Status - All'}</option>
                    <option value="pending">{translateStatus('pending')}</option>
                    <option value="accepted">{translateStatus('accepted')}</option>
                    <option value="rejected">{translateStatus('rejected')}</option>
                    <option value="cancel_requested">{translateStatus('cancel_requested')}</option>
                    <option value="cancelled">{translateStatus('cancelled')}</option>
                  </select>
                </div>
                {/* City Filter */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={isGerman ? 'Stadt (Abholung/Ziel)...' : 'City (Pickup/Destination)...'}
                    value={partnerLeadsFilters.city || ''}
                    onChange={(e) => handlePartnerLeadsFilterChange('city', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: 'var(--theme-input-bg)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)'
                    }}
                  />
                </div>

                {/* Date Filter */}
                <div className="flex-1">
                  <div className="space-y-2">
                    <select
                      value={partnerLeadsDateFilter.type}
                      onChange={(e) => setPartnerLeadsDateFilter(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                    >
                      <option value="all">{isGerman ? 'Alle Daten' : 'All Dates'}</option>
                      <option value="single">{isGerman ? 'Einzelnes Datum' : 'Single Date'}</option>
                      <option value="range">{isGerman ? 'Datumsbereich' : 'Date Range'}</option>
                      <option value="current_week">{isGerman ? 'Aktuelle Woche' : 'Current Week'}</option>
                      <option value="last_week">{isGerman ? 'Letzte Woche' : 'Last Week'}</option>
                      <option value="current_month">{isGerman ? 'Aktueller Monat' : 'Current Month'}</option>
                      <option value="last_month">{isGerman ? 'Letzter Monat' : 'Last Month'}</option>
                    </select>

                    {/* Single Date */}
                    {partnerLeadsDateFilter.type === 'single' && (
                      <div className="mt-2">
                        <DatePicker
                          selected={partnerLeadsDateFilter.singleDate}
                          onChange={(date) => setPartnerLeadsDateFilter(prev => ({ ...prev, singleDate: date }))}
                          dateFormat="dd/MM/yyyy"
                          placeholderText={isGerman ? 'Datum auswählen' : 'Select date'}
                          className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                          wrapperClassName="w-full"
                          showPopperArrow={false}
                          popperPlacement="bottom-start"
                          style={{
                            backgroundColor: 'var(--theme-input-bg)',
                            borderColor: 'var(--theme-border)',
                            color: 'var(--theme-text)'
                          }}
                        />
                      </div>
                    )}

                    {/* Date Range */}
                    {partnerLeadsDateFilter.type === 'range' && (
                      <div className="mt-2 space-y-2">
                        <DatePicker
                          selected={partnerLeadsDateFilter.fromDate}
                          onChange={(date) => setPartnerLeadsDateFilter(prev => ({ ...prev, fromDate: date }))}
                          dateFormat="dd/MM/yyyy"
                          placeholderText={isGerman ? 'Von' : 'From'}
                          maxDate={partnerLeadsDateFilter.toDate}
                          className="w-full px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                          wrapperClassName="w-full"
                          showPopperArrow={false}
                          popperPlacement="bottom-start"
                          style={{
                            backgroundColor: 'var(--theme-input-bg)',
                            borderColor: 'var(--theme-border)',
                            color: 'var(--theme-text)'
                          }}
                        />
                        <DatePicker
                          selected={partnerLeadsDateFilter.toDate}
                          onChange={(date) => setPartnerLeadsDateFilter(prev => ({ ...prev, toDate: date }))}
                          dateFormat="dd/MM/yyyy"
                          placeholderText={isGerman ? 'Bis' : 'To'}
                          minDate={partnerLeadsDateFilter.fromDate}
                          className="w-full px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                          wrapperClassName="w-full"
                          showPopperArrow={false}
                          popperPlacement="bottom-start"
                          style={{
                            backgroundColor: 'var(--theme-input-bg)',
                            borderColor: 'var(--theme-border)',
                            color: 'var(--theme-text)'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Calculate paginated leads */}
              {(() => {
                const indexOfLastLead = partnerLeadsCurrentPage * partnerLeadsPerPage;
                const indexOfFirstLead = indexOfLastLead - partnerLeadsPerPage;
                window.paginatedPartnerLeads = partnerLeads.slice(indexOfFirstLead, indexOfLastLead);
              })()}

              {/* Statistics Display */}
              <div className="flex flex-wrap gap-4 mt-6 mb-6">
                {[
                  {
                    label: isGerman ? 'Gesamt Leads' : 'Total Leads',
                    value: partnerLeadsStats.total || 0,
                    icon: '📋',
                    color: 'blue'
                  },
                  {
                    label: translateStatus('pending'),
                    value: partnerLeadsStats.pending || 0,
                    icon: '⏳',
                    color: 'yellow'
                  },
                  {
                    label: translateStatus('accepted'),
                    value: partnerLeadsStats.accepted || 0,
                    icon: '✅',
                    color: 'green'
                  },
                  {
                    label: translateStatus('rejected'),
                    value: partnerLeadsStats.rejected || 0,
                    icon: '❌',
                    color: 'red'
                  },
                  {
                    label: isGerman ? 'Stornierungsanfragen' : 'Cancel Requests',
                    value: partnerLeadsStats.cancel_requested || 0,
                    icon: '🔄',
                    color: 'orange'
                  },
                  {
                    label: translateStatus('cancelled'),
                    value: partnerLeadsStats.cancelled || 0,
                    icon: '🚫',
                    color: 'gray'
                  }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    className="p-4 rounded-lg flex-1 min-w-[180px] border"
                    style={{ 
                      backgroundColor: 'var(--theme-card-bg)', 
                      borderColor: 'var(--theme-border)' 
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>{stat.label}</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>{stat.value}</p>
                      </div>
                      <div className="text-2xl">{stat.icon}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Partner Leads Table */}
              <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
                    <thead style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                      <tr>
                        <PartnerLeadsSortableHeader sortKey="leadId">
                          {isGerman ? 'Lead ID' : 'Lead ID'}
                        </PartnerLeadsSortableHeader>
                        <PartnerLeadsSortableHeader sortKey="customerName">
                          {isGerman ? 'Kundenname' : 'Customer Name'}
                        </PartnerLeadsSortableHeader>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                          {currentService === 'moving' 
                            ? (isGerman ? 'Abhol- → Zielort' : 'Pickup → Destination')
                            : (isGerman ? 'Stadt' : 'City')
                          }
                        </th>
                        <PartnerLeadsSortableHeader sortKey="status">
                          {isGerman ? 'Status' : 'Status'}
                        </PartnerLeadsSortableHeader>
                        <PartnerLeadsSortableHeader sortKey="assignedAt">
                          {isGerman ? 'Zugewiesen am' : 'Assigned Date'}
                        </PartnerLeadsSortableHeader>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Aktionen' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
                      {partnerLeadsLoading ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              <span style={{ color: 'var(--theme-text)' }}>
                                {isGerman ? 'Lade Leads...' : 'Loading leads...'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : partnerLeads.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                            {isGerman ? 'Keine Leads für diesen Partner gefunden' : 'No leads found for this partner'}
                          </td>
                        </tr>
                      ) : (
                        window.paginatedPartnerLeads.map((lead, index) => (
                          <motion.tr
                            key={lead.assignmentId || lead.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-opacity-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                              {lead.leadId || lead.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                                  {lead.name || (isGerman ? 'Unbekannt' : 'Unknown')}
                                </div>
                                {isSuperAdmin && lead.email && (
                                  <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                                    {lead.email}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                              {currentService === 'moving'
                                ? `${lead.fromLocation || lead.pickupLocation || (lead.formData?.pickupAddress?.city) || (lead.formData?.fromLocation) || (lead.formData?.pickup_location) || '-'} → ${lead.toLocation || lead.dropoffLocation || (lead.formData?.destinationAddress?.city) || (lead.formData?.toLocation) || (lead.formData?.destination_location) || '-'}`
                                : lead.formData?.serviceAddress?.city || lead.formData?.address?.city || lead.city || lead.location || (lead.formData && lead.formData.city) || (lead.formData && lead.formData.location) || '-'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                lead.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                lead.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                lead.status === 'cancelled' || lead.status === 'cancellation_approved' ? 'bg-red-100 text-red-800' :
                                lead.status === 'cancel_requested' || lead.status === 'cancellationRequested' ? 'bg-purple-100 text-purple-800' :
                                lead.status === 'cancellation_rejected' ? 'bg-red-100 text-red-800' :
                                lead.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {translateStatus(lead.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                              {(lead.partnerAssignedAt || lead.assignedAt) ? new Date(lead.partnerAssignedAt || lead.assignedAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleViewLead(lead)}
                                className="text-xs px-3 py-1 rounded transition-colors"
                                style={{
                                  backgroundColor: 'var(--theme-bg-secondary)',
                                  color: 'var(--theme-text)',
                                  border: '1px solid var(--theme-border)'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = 'var(--theme-hover)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'var(--theme-bg-secondary)';
                                }}
                                title={isGerman ? 'Details anzeigen' : 'View Details'}
                              >
                                👁️ {isGerman ? 'Ansehen' : 'View'}
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination for Partner Leads */}
              {partnerLeads.length > partnerLeadsPerPage && (
                <div className="mt-4">
                  <Pagination
                    currentPage={partnerLeadsCurrentPage}
                    totalItems={partnerLeads.length}
                    itemsPerPage={partnerLeadsPerPage}
                    onPageChange={setPartnerLeadsCurrentPage}
                  />
                </div>
              )}
            </div>
          )}

          {partnerDetailsTab === 'settings' && (
            <div className="px-6 py-4">
              {settingsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Einstellungen laden...' : 'Loading settings...'}
                    </p>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                        ⚙️ {isGerman ? 'Partner-spezifische Einstellungen' : 'Partner-specific Settings'}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman
                          ? 'Überschreiben Sie die globalen Einstellungen für diesen Partner'
                          : 'Override global settings for this partner'
                        }
                      </p>
                    </div>
                    <motion.button
                      onClick={savePartnerSettings}
                      disabled={settingsSaving}
                      className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                        settingsSaving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: 'var(--theme-button-bg)',
                        color: 'var(--theme-button-text)'
                      }}
                      whileHover={!settingsSaving ? { scale: 1.02 } : {}}
                      whileTap={!settingsSaving ? { scale: 0.98 } : {}}
                    >
                      {settingsSaving ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span>{isGerman ? 'Speichern...' : 'Saving...'}</span>
                        </div>
                      ) : (
                        <>💾 {isGerman ? 'Einstellungen speichern' : 'Save Settings'}</>
                      )}
                    </motion.button>
                  </div>

                  {/* Partner-specific Settings */}
                  <motion.div
                    className="p-6 rounded-xl border"
                    style={{
                      backgroundColor: 'var(--theme-card-bg)',
                      borderColor: 'var(--theme-border)'
                    }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="text-3xl">⚙️</div>
                      <div>
                        <h4 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                          {isGerman ? 'Partner-spezifische Einstellungen' : 'Partner-specific Settings'}
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman
                            ? 'Individuelle Einstellungen für diesen Partner überschreiben'
                            : 'Override global settings for this partner'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Per Lead Price */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                          {isGerman ? 'Preis pro Lead (€)' : 'Price per Lead (€)'}
                        </label>
                        <div className="flex items-center space-x-2">
                          <div
                            className="flex items-center border rounded-lg px-3 flex-1"
                            style={{
                              backgroundColor: 'var(--theme-input-bg)',
                              borderColor: 'var(--theme-border)',
                              height: '48px'
                            }}
                          >
                            <span
                              className="text-lg font-semibold mr-3 inline-flex items-center"
                              style={{ color: 'var(--theme-text)' }}
                            >
                              €
                            </span>
                            <input
                              type="number"
                              value={partnerSettings.customPricing.perLeadPrice || ''}
                              onChange={(e) => handlePartnerSettingsChange('perLeadPrice', e.target.value ? parseFloat(e.target.value) : null)}
                              min="1"
                              step="0.01"
                              placeholder={globalSettings ?
                                `Standard: €${globalSettings.pricing?.[partnerForDetails.serviceType]?.[partnerForDetails.partnerType]?.perLeadPrice || '25'}` :
                                'Standard: €25'
                              }
                              className="flex-1 h-full text-lg font-semibold focus:outline-none focus:ring-0"
                              style={{
                                backgroundColor: 'transparent',
                                color: 'var(--theme-text)',
                                border: 'none',
                                lineHeight: '1.1',
                                padding: 0
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={resetToDefaultPrice}
                            className="px-3 py-2 text-sm rounded-lg border transition-colors hover:opacity-80"
                            style={{
                              borderColor: 'var(--theme-border)',
                              color: 'var(--theme-text)',
                              backgroundColor: 'var(--theme-card-bg)',
                              height: '48px'
                            }}
                            title={isGerman ? 'Standard verwenden' : 'Use Default'}
                          >
                            🔄 {isGerman ? 'Standard' : 'Default'}
                          </button>
                        </div>
                        <p className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman
                            ? 'Leer lassen für Standardpreis'
                            : 'Leave empty for default price'
                          }
                        </p>
                      </div>

                      {/* Leads per Week */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                          {isGerman ? 'Leads pro Woche' : 'Leads per Week'}
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={partnerSettings.customPricing.leadsPerWeek || ''}
                            onChange={(e) => handlePartnerSettingsChange('leadsPerWeek', e.target.value ? parseInt(e.target.value) : null)}
                            min="1"
                            max="50"
                            placeholder={globalSettings ?
                              `Standard: ${globalSettings.leadDistribution?.[partnerForDetails.serviceType]?.[partnerForDetails.partnerType]?.leadsPerWeek || '3'}` :
                              'Standard: 3'
                            }
                            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                              backgroundColor: 'var(--theme-input-bg)',
                              borderColor: 'var(--theme-border)',
                              color: 'var(--theme-text)',
                              height: '48px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={resetToDefaultLeadsPerWeek}
                            className="px-3 py-2 text-sm rounded-lg border transition-colors hover:opacity-80"
                            style={{
                              borderColor: 'var(--theme-border)',
                              color: 'var(--theme-text)',
                              backgroundColor: 'var(--theme-card-bg)',
                              height: '48px'
                            }}
                            title={isGerman ? 'Standard verwenden' : 'Use Default'}
                          >
                            🔄 {isGerman ? 'Standard' : 'Default'}
                          </button>
                        </div>
                        <p className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman
                            ? 'Leer lassen für Standardverteilung'
                            : 'Leave empty for default distribution'
                          }
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Current Settings Summary */}
                  <motion.div
                    className="p-6 rounded-xl border"
                    style={{
                      backgroundColor: 'var(--theme-card-bg)',
                      borderColor: 'var(--theme-border)'
                    }}
                  >
                    <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
                      📊 {isGerman ? 'Aktuelle Einstellungen' : 'Current Settings'}
                    </h4>
                    <div className="flex flex-row gap-4">
                      <div className="flex-1 text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          €{partnerSettings.customPricing.perLeadPrice ||
                            (globalSettings?.pricing?.[partnerForDetails.serviceType]?.[partnerForDetails.partnerType]?.perLeadPrice) ||
                            '25'
                          }
                        </div>
                        <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Preis pro Lead' : 'Price per Lead'}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                          {partnerSettings.customPricing.perLeadPrice ?
                            (isGerman ? '(Individuell)' : '(Custom)') :
                            (isGerman ? '(Standard)' : '(Default)')
                          }
                        </div>
                      </div>
                      <div className="flex-1 text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          {partnerSettings.customPricing.leadsPerWeek ||
                            (globalSettings?.leadDistribution?.[partnerForDetails.serviceType]?.[partnerForDetails.partnerType]?.leadsPerWeek) ||
                            '3'
                          }
                        </div>
                        <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Leads pro Woche' : 'Leads per Week'}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                          {partnerSettings.customPricing.leadsPerWeek ?
                            (isGerman ? '(Individuell)' : '(Custom)') :
                            (isGerman ? '(Standard)' : '(Default)')
                          }
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {currentView === 'table' && (
        <Pagination
        currentPage={currentPage}
        totalItems={totalPartners}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        />
      )}

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-xl shadow-2xl drop-shadow-2xl p-6 w-full max-w-md border-2"
              style={{ 
                backgroundColor: 'var(--theme-bg)', 
                color: 'var(--theme-text)',
                borderColor: 'var(--theme-border)'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Dialog Header */}
              <div className="flex items-center gap-3 mb-4">
                {confirmDialogData.type === 'danger' && (
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-xl">⚠️</span>
                  </div>
                )}
                {confirmDialogData.type === 'warning' && (
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-xl">⚠️</span>
                  </div>
                )}
                {confirmDialogData.type === 'info' && (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">ℹ️</span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                    {confirmDialogData.title}
                  </h3>
                </div>
              </div>

              {/* Dialog Message */}
              <div className="mb-6">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-muted)' }}>
                  {confirmDialogData.message}
                </p>
              </div>

              {/* Dialog Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleDialogCancel}
                  className="px-4 py-2 rounded-lg font-medium transition-colors border"
                  style={{ 
                    borderColor: 'var(--theme-border)', 
                    color: 'var(--theme-text)',
                    backgroundColor: 'var(--theme-bg-secondary)'
                  }}
                >
                  {confirmDialogData.cancelText}
                </button>
                <button
                  onClick={handleDialogConfirm}
                  className="text-xs px-3 py-1 rounded transition-colors"
                  style={{ 
                    backgroundColor: 'var(--theme-bg-secondary)',
                    color: 'var(--theme-text)',
                    border: '1px solid var(--theme-border)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--theme-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--theme-bg-secondary)';
                  }}
                >
                  {confirmDialogData.type === 'danger' && confirmDialogData.confirmText.includes('Remove') && '↩️ '}
                  {confirmDialogData.type === 'danger' && confirmDialogData.confirmText.includes('Suspend') && !confirmDialogData.confirmText.includes('Remove') && '🚫 '}
                  {confirmDialogData.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Dialog */}
      <AnimatePresence>
        {rejectionDialog.open && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-full max-w-md border shadow-xl"
              style={{ 
                backgroundColor: 'var(--theme-bg)', 
                color: 'var(--theme-text)',
                borderColor: 'var(--theme-border)'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Dialog Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">❌</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                    Service ablehnen
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {rejectionDialog.partnerName} - {rejectionDialog.serviceType === 'moving'
                      ? 'Umzugsdienst'
                      : 'Reinigungsdienst'
                    }
                  </p>
                </div>
              </div>

              {/* Reason Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                  Grund für Ablehnung *
                </label>
                <textarea
                  value={rejectionDialog.reason}
                  onChange={(e) => setRejectionDialog(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Bitte geben Sie einen Grund für die Ablehnung an..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ 
                    backgroundColor: 'var(--theme-bg-secondary)',
                    color: 'var(--theme-text)',
                    borderColor: 'var(--theme-border)'
                  }}
                />
              </div>

              {/* Dialog Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setRejectionDialog(prev => ({ ...prev, open: false, reason: '' }))}
                  className="px-4 py-2 rounded-lg font-medium transition-colors border"
                  style={{ 
                    borderColor: 'var(--theme-border)', 
                    color: 'var(--theme-text)',
                    backgroundColor: 'var(--theme-bg-secondary)'
                  }}
                >
                  {isGerman ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmRejection}
                  className="text-xs px-3 py-1 rounded transition-colors"
                  style={{ 
                    backgroundColor: 'var(--theme-bg-secondary)',
                    color: 'var(--theme-text)',
                    border: '1px solid var(--theme-border)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--theme-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--theme-bg-secondary)';
                  }}
                  disabled={!rejectionDialog.reason.trim()}
                >
                  ❌ {isGerman ? 'Ablehnen' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Partner Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-xl shadow-2xl drop-shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2"
              style={{ 
                backgroundColor: 'var(--theme-bg-secondary)', 
                color: 'var(--theme-text)',
                borderColor: 'var(--theme-border)'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <div>
                  <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Neuen Partner hinzufügen' : 'Add New Partner'}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Partner wird automatisch als aktiv gesetzt' : 'Partner will be automatically set as active'}
                  </p>
                </div>
                <button
                  onClick={handleCloseAddModal}
                  className="p-2 rounded-full hover:bg-opacity-80 transition-all"
                  style={{ 
                    color: 'var(--theme-muted)', 
                    backgroundColor: 'var(--theme-bg)'
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={(e) => e.preventDefault()} autoComplete="off" noValidate>
                {/* Hidden dummy fields to prevent autofill */}
                <input type="text" name="dummy-username" autoComplete="username" style={{ display: 'none' }} tabIndex="-1" />
                <input type="password" name="dummy-password" autoComplete="current-password" style={{ display: 'none' }} tabIndex="-1" />
                <div className="space-y-4">
                {/* First Name and Last Name - Two Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label 
                      htmlFor="partner-firstName" 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      👤 {isGerman ? 'Vorname' : 'First Name'} *
                    </label>
                    <input
                      id="partner-firstName"
                      name="x-partner-fn-field"
                      type="text"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) => e.target.removeAttribute('readonly')}
                      value={partnerFormData.contactPerson.firstName}
                      onChange={(e) => handlePartnerFormChange('contactPerson.firstName', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors['contactPerson.firstName'] ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'Vorname eingeben' : 'Enter first name'}
                    />
                    {partnerFormErrors['contactPerson.firstName'] && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors['contactPerson.firstName']}</p>
                    )}
                  </div>

                  <div>
                    <label 
                      htmlFor="partner-lastName" 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      👤 {isGerman ? 'Nachname' : 'Last Name'} *
                    </label>
                    <input
                      id="partner-lastName"
                      name="partner-lastName"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={partnerFormData.contactPerson.lastName}
                      onChange={(e) => handlePartnerFormChange('contactPerson.lastName', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors['contactPerson.lastName'] ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'Nachname eingeben' : 'Enter last name'}
                    />
                    {partnerFormErrors['contactPerson.lastName'] && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors['contactPerson.lastName']}</p>
                    )}
                  </div>
                </div>

                {/* Email and Phone - Two Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label 
                      htmlFor="partner-email" 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      📧 E-Mail *
                    </label>
                    <input
                      id="partner-email"
                      name="x-partner-email-field"
                      type="text"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) => e.target.removeAttribute('readonly')}
                      value={partnerFormData.contactPerson.email}
                      onChange={(e) => handlePartnerFormChange('contactPerson.email', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors['contactPerson.email'] ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'E-Mail-Adresse eingeben' : 'Enter email address'}
                    />
                    {partnerFormErrors['contactPerson.email'] && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors['contactPerson.email']}</p>
                    )}
                  </div>

                  <div>
                    <label 
                      htmlFor="partner-phone" 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      📞 {isGerman ? 'Telefon' : 'Phone'} *
                    </label>
                    <input
                      id="partner-phone"
                      name="partner-phone"
                      type="tel"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={partnerFormData.contactPerson.phone}
                      onChange={(e) => handlePartnerFormChange('contactPerson.phone', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors['contactPerson.phone'] ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'Telefonnummer eingeben' : 'Enter phone number'}
                    />
                    {partnerFormErrors['contactPerson.phone'] && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors['contactPerson.phone']}</p>
                    )}
                  </div>
                </div>

                {/* Service Type and Company Name - Same Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Service Type - Dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                      🛠️ {isGerman ? 'Service-Typ' : 'Service Type'} *
                    </label>
                    <div className="service-dropdown-container relative">
                      <button
                        type="button"
                        onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                        className="w-full px-3 py-2 rounded-lg border text-left focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
                        style={{
                          backgroundColor: 'var(--theme-input-bg)',
                          borderColor: partnerFormErrors.serviceType ? '#ef4444' : 'var(--theme-border)',
                          color: 'var(--theme-text)'
                        }}
                      >
                        <span>
                          {!partnerFormData.serviceType
                            ? (isGerman ? 'Service-Typ auswählen' : 'Select service type')
                            : (() => {
                                const selectedService = servicesData.find(s => s.id === partnerFormData.serviceType);
                                return selectedService ? selectedService.name : partnerFormData.serviceType;
                              })()
                          }
                        </span>
                        <svg className={`w-5 h-5 transition-transform ${isServiceDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isServiceDropdownOpen && (
                        <div
                          className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-auto"
                          style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}
                        >
                          {(servicesData && servicesData.length > 0) ? servicesData.map((service) => (
                            <label key={service.id} className="flex items-center px-3 py-2 hover:bg-opacity-80 cursor-pointer" style={{ backgroundColor: 'transparent' }}>
                              <input
                                type="radio"
                                name="serviceType"
                                checked={partnerFormData.serviceType === service.id}
                                onChange={() => handleServiceSelect(service.id)}
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
                                {service.id === 'moving' ? '🚛' : '🧽'} {service.name}
                              </span>
                            </label>
                          )) : (
                            <div className="px-3 py-2 text-sm" style={{ color: 'var(--theme-muted)' }}>
                              {isGerman ? 'Services werden geladen...' : 'Loading services...'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {partnerFormErrors.serviceType && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors.serviceType}</p>
                    )}
                  </div>

                  {/* Company Name */}
                  <div>
                    <label
                      htmlFor="partner-company"
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      🏢 {isGerman ? 'Firmenname' : 'Company Name'} *
                    </label>
                    <input
                      id="partner-company"
                      name="partner-company"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={partnerFormData.companyName}
                      onChange={(e) => handlePartnerFormChange('companyName', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors.companyName ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'Firmenname eingeben' : 'Enter company name'}
                    />
                    {partnerFormErrors.companyName && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors.companyName}</p>
                    )}
                  </div>
                </div>

                {/* Address Fields - Two Rows */}
                {/* Street and City - Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="partner-street"
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      📍 {isGerman ? 'Straße' : 'Street'} *
                    </label>
                    <input
                      id="partner-street"
                      name="partner-street"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={partnerFormData.address.street}
                      onChange={(e) => handlePartnerFormChange('address.street', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors['address.street'] ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'Straße und Hausnummer' : 'Street and house number'}
                    />
                    {partnerFormErrors['address.street'] && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors['address.street']}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="partner-city"
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      🏘️ {isGerman ? 'Stadt' : 'City'} *
                    </label>
                    <input
                      id="partner-city"
                      name="partner-city"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={partnerFormData.address.city}
                      onChange={(e) => handlePartnerFormChange('address.city', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors['address.city'] ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'Stadt' : 'City'}
                    />
                    {partnerFormErrors['address.city'] && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors['address.city']}</p>
                    )}
                  </div>
                </div>

                {/* Zip Code and Country - Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="partner-zipCode"
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      📮 {isGerman ? 'PLZ' : 'Zip Code'} *
                    </label>
                    <input
                      id="partner-zipCode"
                      name="partner-zipCode"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={partnerFormData.address.zipCode}
                      onChange={(e) => handlePartnerFormChange('address.zipCode', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors['address.zipCode'] ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'PLZ' : 'Zip Code'}
                    />
                    {partnerFormErrors['address.zipCode'] && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors['address.zipCode']}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="partner-country"
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      🌍 {isGerman ? 'Land' : 'Country'} *
                    </label>
                    <input
                      id="partner-country"
                      name="partner-country"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={partnerFormData.address.country}
                      onChange={(e) => handlePartnerFormChange('address.country', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors['address.country'] ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'Land' : 'Country'}
                    />
                    {partnerFormErrors['address.country'] && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors['address.country']}</p>
                    )}
                  </div>
                </div>
              </div>
              </form>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                <button
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 rounded-lg font-medium transition-colors border"
                  style={{ 
                    borderColor: 'var(--theme-border)', 
                    color: 'var(--theme-text)',
                    backgroundColor: 'var(--theme-bg-secondary)'
                  }}
                >
                  {isGerman ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  onClick={handlePartnerSubmit}
                  disabled={isSubmittingPartner}
                  className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${
                    isSubmittingPartner
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmittingPartner ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {isGerman ? 'Wird erstellt...' : 'Creating...'}
                    </span>
                  ) : (
                    isGerman ? 'Partner erstellen' : 'Create Partner'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Details Modal - Using Shared Component */}
      <LeadDetailsDialog
        isOpen={showLeadDetails}
        leadData={leadForDetails}
        onClose={handleCloseLeadDetails}
        t={t}
        isGerman={isGerman}
        isPartner={!isSuperAdmin}
      />
    </div>
  );
};

export default PartnerManagement;