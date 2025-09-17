import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useService } from '../../../contexts/ServiceContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { leadsAPI, partnersAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';
import Pagination from '../../../components/ui/Pagination';
import LeadDetailsDialog from '../../../components/ui/LeadDetailsDialog';

const LeadManagement = ({ initialLeads = [], initialStats = {} }) => {
  const router = useRouter();
  const { currentService } = useService();
  const { t, isGerman } = useLanguage();
  const { user, isSuperAdmin, isPartner } = useAuth();
  
  const [leads, setLeads] = useState(initialLeads);
  const [totalLeads, setTotalLeads] = useState(0);
  // Removed totalCancelRequests state
  const [leadStats, setLeadStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    accepted: 0,
    cancelled: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [partnerTabs, setPartnerTabs] = useState({ basic: { partners: [], count: 0 }, exclusive: { partners: [], count: 0 } });
  const [showTabs, setShowTabs] = useState(true);
  const [defaultTab, setDefaultTab] = useState('basic');
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [assigningLead, setAssigningLead] = useState(false);
  
  // Partner filtering states for assignment modal
  const [partnerFilter, setPartnerFilter] = useState('basic'); // 'basic', 'exclusive', 'search'
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [allActivePartners, setAllActivePartners] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Cancel lead states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelLead, setSelectedCancelLead] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Partners for filtering
  const [allPartners, setAllPartners] = useState([]);
  const [currentView, setCurrentView] = useState('table'); // 'table' or 'details'
  const [leadForDetails, setLeadForDetails] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  
  // Add activeTab state for leads and cancelled requests tabs
  const [activeTab, setActiveTab] = useState('leads');
  const [selectedCancelRequest, setSelectedCancelRequest] = useState(null);
  const [selectedRejectLead, setSelectedRejectLead] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Cancelled requests state
  const [cancelledRequests, setCancelledRequests] = useState([]);
  const [totalCancelRequests, setTotalCancelRequests] = useState(0);
  const [cancelledCurrentPage, setCancelledCurrentPage] = useState(1);
  const [cancelledRequestStats, setCancelledRequestStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  
  // Partner search states
  const [partnerSearchText, setPartnerSearchText] = useState('');
  const [showPartnerSuggestions, setShowPartnerSuggestions] = useState(false);
  const [selectedPartnerFilters, setSelectedPartnerFilters] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Filter states
  const [filters, setFilters] = useState({
    status: 'all',
    city: '',
    partner: 'all',
    searchTerm: ''
  });

  // Date filter state
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
    key: 'createdAt',
    direction: 'desc'
  });

  // Filter partners based on selected tab and search query
  const filteredPartners = useMemo(() => {
    let sourcePartners = [];

    if (partnerFilter === 'search') {
      // Use all active partners for search
      sourcePartners = allActivePartners || [];
    } else if (partnerFilter === 'basic') {
      // Use suggested basic partners from API
      sourcePartners = partnerTabs.basic.partners || [];
    } else if (partnerFilter === 'exclusive') {
      // Use suggested exclusive partners from API
      sourcePartners = partnerTabs.exclusive.partners || [];
    } else {
      // Fallback to legacy availablePartners if needed
      sourcePartners = availablePartners || [];
    }

    // Apply search query if provided
    if (partnerSearchQuery.trim()) {
      const query = partnerSearchQuery.toLowerCase().trim();

      sourcePartners = sourcePartners.filter(partner => {
        return (
          partner.companyName?.toLowerCase().includes(query) ||
          partner.partnerId?.toLowerCase().includes(query) ||
          partner.contactPerson?.firstName?.toLowerCase().includes(query) ||
          partner.contactPerson?.lastName?.toLowerCase().includes(query) ||
          partner.contactPerson?.email?.toLowerCase().includes(query) ||
          `${partner.contactPerson?.firstName} ${partner.contactPerson?.lastName}`.toLowerCase().includes(query)
        );
      });
    }

    return sourcePartners;
  }, [partnerTabs, allActivePartners, availablePartners, partnerFilter, partnerSearchQuery]);

  // Translation functions using centralized translations
  const translateStatus = (status) => {
    // Map lead status values to translation keys
    const statusMap = {
      'pending': isGerman ? 'Ausstehend' : 'Pending',
      'partial_assigned': isGerman ? 'Teilweise zugewiesen' : 'Partial Assigned',
      'assigned': isGerman ? 'Zugewiesen' : 'Assigned',
      'accepted': isGerman ? 'Akzeptiert' : 'Accepted',
      'approved': isGerman ? 'Stornierung genehmigt' : 'Cancel Request Approved',
      'cancel_requested': isGerman ? 'Stornierung angefragt' : 'Cancel Requested',
      'cancellationRequested': isGerman ? 'Stornierung angefragt' : 'Cancel Requested',
      'cancelled': isGerman ? 'Storniert' : 'Cancelled',
      'rejected': isGerman ? 'Abgelehnt' : 'Rejected',
      'cancellation_rejected': isGerman ? 'Stornierung abgelehnt' : 'Cancel Request Rejected',
      'cancellation_approved': isGerman ? 'Stornierung genehmigt' : 'Cancel Request Approved',
      'completed': isGerman ? 'Abgeschlossen' : 'Completed'
    };
    return statusMap[status] || (isGerman ? 'Ausstehend' : 'Pending');
  };

  const translateService = (service) => {
    return t(`services.${service}`) || service;
  };

  // Format and translate form values
  const formatFormValue = (key, value) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    // Property type translations
    if (key === 'propertyType' || key === 'currentPropertyType' || key === 'futurePropertyType') {
      const propertyTypes = {
        'rental_apartment': isGerman ? 'Mietwohnung' : 'Rental Apartment',
        'own_apartment': isGerman ? 'Eigentumswohnung' : 'Own Apartment', 
        'own_house': isGerman ? 'Eigenhaus' : 'Own House',
        'own_home': isGerman ? 'Eigenheim' : 'Own Home',
        'rental_house': isGerman ? 'Miethaus' : 'Rental House',
        'office': isGerman ? 'Büro' : 'Office',
        'commercial': isGerman ? 'Gewerbe' : 'Commercial'
      };
      return propertyTypes[value] || value.replace(/_/g, ' ');
    }

    // Time preferences
    if (key === 'preferredContactTime' || key === 'timeFlexibility') {
      const timePrefs = {
        'morning_preferred': isGerman ? 'Morgens bevorzugt' : 'Morning Preferred',
        'afternoon_preferred': isGerman ? 'Nachmittags bevorzugt' : 'Afternoon Preferred',
        'evening_preferred': isGerman ? 'Abends bevorzugt' : 'Evening Preferred',
        'morning': isGerman ? 'Morgens' : 'Morning',
        'afternoon': isGerman ? 'Nachmittags' : 'Afternoon',
        'evening': isGerman ? 'Abends' : 'Evening',
        'anytime': isGerman ? 'Jederzeit' : 'Anytime',
        'flexible': isGerman ? 'Flexibel' : 'Flexible',
        'specific_time': isGerman ? 'Bestimmte Zeit' : 'Specific Time'
      };
      return timePrefs[value] || value.replace(/_/g, ' ');
    }

    // Move date flexibility
    if (key === 'moveDateType' || key === 'flexibility') {
      const flexibility = {
        'flexible': isGerman ? 'Flexibel' : 'Flexible',
        'fixed': isGerman ? 'Fest' : 'Fixed',
        'urgent': isGerman ? 'Dringend' : 'Urgent',
        'within_week': isGerman ? 'Innerhalb einer Woche' : 'Within a Week',
        'within_month': isGerman ? 'Innerhalb eines Monats' : 'Within a Month'
      };
      return flexibility[value] || value.replace(/_/g, ' ');
    }

    // Boolean values
    if (key === 'elevatorAvailable' || key === 'elevator') {
      return value === true || value === 'yes' || value === 'Yes' ? 
        (isGerman ? 'Ja' : 'Yes') : 
        (isGerman ? 'Nein' : 'No');
    }

    // Support needed (helper count)
    if (key === 'supportNeeded' || key === 'helpersNeeded') {
      if (value.includes('under_')) {
        const num = value.replace('under_', '');
        return isGerman ? `Unter ${num}` : `Under ${num}`;
      }
      if (value.includes('over_')) {
        const num = value.replace('over_', '');
        return isGerman ? `Über ${num}` : `Over ${num}`;
      }
      return value.replace(/_/g, ' ');
    }

    // Salutation
    if (key === 'salutation') {
      const salutations = {
        'mr': isGerman ? 'Herr' : 'Mr.',
        'mrs': isGerman ? 'Frau' : 'Mrs.',
        'ms': isGerman ? 'Frau' : 'Ms.',
        'dr': isGerman ? 'Dr.' : 'Dr.',
        'prof': isGerman ? 'Prof.' : 'Prof.'
      };
      return salutations[value.toLowerCase()] || value;
    }

    // Weekdays
    if (key === 'preferredWeekdays' || key.includes('weekday')) {
      const weekdays = {
        'monday': isGerman ? 'Montag' : 'Monday',
        'tuesday': isGerman ? 'Dienstag' : 'Tuesday', 
        'wednesday': isGerman ? 'Mittwoch' : 'Wednesday',
        'thursday': isGerman ? 'Donnerstag' : 'Thursday',
        'friday': isGerman ? 'Freitag' : 'Friday',
        'saturday': isGerman ? 'Samstag' : 'Saturday',
        'sunday': isGerman ? 'Sonntag' : 'Sunday'
      };
      if (Array.isArray(value)) {
        return value.map(day => weekdays[day] || day).join(', ');
      }
      return weekdays[value] || value;
    }

    // Service types
    if (key === 'serviceType') {
      const serviceTypes = {
        'moving': isGerman ? 'Umzug' : 'Moving',
        'cleaning': isGerman ? 'Reinigung' : 'Cleaning',
        'cancellation': isGerman ? 'Stornierung' : 'Cancellation'
      };
      return serviceTypes[value] || value;
    }
    
    // Move types
    if (key === 'moveType') {
      const moveTypes = {
        'private': isGerman ? 'Privat' : 'Private',
        'business': isGerman ? 'Geschäftlich' : 'Business',
        'long_distance': isGerman ? 'Fernumzug' : 'Long Distance',
        'special_transport': isGerman ? 'Spezialtransport' : 'Special Transport'
      };
      return moveTypes[value] || value;
    }
    
    // Arrays (join with commas)
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Default: replace underscores with spaces and capitalize
    if (typeof value === 'string') {
      return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return value;
  };

  // Handle view lead details
  const handleViewLead = async (lead) => {
    // Block view for partners if lead is not accepted
    if (isPartner) {
      const isAccepted = lead.status === 'accepted' || lead.partnerStatus === 'accepted';
      const isCancellationRequested = lead.status === 'cancellationRequested' ||
                                     lead.status === 'cancel_requested' ||
                                     lead.partnerStatus === 'cancellationRequested' ||
                                     lead.partnerStatus === 'cancel_requested';

      if (!isAccepted || isCancellationRequested) {
        if (isCancellationRequested) {
          toast.error(isGerman ? 'Details nicht verfügbar - Stornierung beantragt' : 'Details unavailable - Cancellation requested');
        } else {
          // Check if lead is rejected
          const isRejected = lead.status === 'rejected' || lead.partnerStatus === 'rejected';

          if (isRejected) {
            toast.error(isGerman ? 'Details nicht verfügbar - Lead abgelehnt' : 'Details unavailable - Lead rejected');
          } else {
            toast.error(isGerman ? 'Zuerst akzeptieren um Details zu sehen' : 'Accept first to see details');
          }
        }
        return;
      }
    }

    try {
      setLoading(true);
      const response = await leadsAPI.getById(lead.id);

      // Handle the response structure from the updated backend
      const leadData = response.data.success ? response.data.lead : response.data;

      // Add partner-specific status if partner is viewing
      const transformedLead = {
        ...leadData,
        // Pass partner status for proper view access control
        partnerStatus: lead.partnerStatus || leadData.partnerStatus,
        id: leadData._id || leadData.id,
        leadId: leadData.leadId || leadData.id,
        name: leadData.user ?
          `${leadData.user.firstName} ${leadData.user.lastName}`.trim() :
          (leadData.name || ''),
        email: leadData.user?.email || leadData.email || '',
        city: leadData.location?.city || leadData.city || '',
        status: leadData.status || 'pending',
        // Preserve partner assignment information
        assignedPartner: leadData.assignedPartner,
        assignedPartners: leadData.assignedPartners,
        acceptedPartner: leadData.acceptedPartner,
        partnerAssignments: leadData.partnerAssignments
      };
      
      setLeadForDetails(transformedLead);
      setShowLeadDetails(true);
    } catch (error) {
      console.error('Error loading lead details:', error);
      // Show a clearer message for access denied errors, avoid duplicates
      if (error.response?.status === 403 || error.response?.data?.message?.toLowerCase().includes('access denied')) {
        toast.error(isGerman ? 'Zuerst akzeptieren um Details zu sehen' : 'Accept first to see details');
      } else if (!error.response?.data?.message) {
        // Only show generic message if API interceptor didn't already show one
        toast.error('Failed to load lead details');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle back to table view
  const handleBackToTable = () => {
    setCurrentView('table');
    setLeadForDetails(null);
  };

  // Close lead details modal
  const handleCloseLeadDetails = () => {
    setShowLeadDetails(false);
    setLeadForDetails(null);
  };

  // Partner search functionality
  const handlePartnerSearchChange = (value) => {
    setPartnerSearchText(value);
    
    if (value.length >= 4) {
      setShowPartnerSuggestions(true);
    } else {
      setShowPartnerSuggestions(false);
    }
  };

  const getFilteredPartnerSuggestions = () => {
    if (partnerSearchText.length < 4) return [];
    
    return allPartners.filter(partner => {
      // Filter by company name search
      const matchesSearch = partner.companyName.toLowerCase().includes(partnerSearchText.toLowerCase());
      
      // Ensure partner is not already selected
      const notAlreadySelected = !selectedPartnerFilters.some(selected => selected._id === partner._id);
      
      // Ensure partner provides the current service
      const servicesCurrentService = partner.services && partner.services.includes(currentService);
      
      return matchesSearch && notAlreadySelected && servicesCurrentService;
    });
  };

  const handleSelectPartnerFilter = (partner) => {
    setSelectedPartnerFilters(prev => [...prev, partner]);
    setPartnerSearchText('');
    setShowPartnerSuggestions(false);
    
    // Update the main filter to include selected partners
    const partnerIds = [...selectedPartnerFilters, partner].map(p => p._id);
    setFilters(prev => ({ 
      ...prev, 
      partner: partnerIds.length > 0 ? 'multiple' : 'all'
    }));
  };

  const handleRemovePartnerFilter = (partnerId) => {
    const updatedPartners = selectedPartnerFilters.filter(partner => partner._id !== partnerId);
    setSelectedPartnerFilters(updatedPartners);
    
    // Update the main filter
    setFilters(prev => ({ 
      ...prev, 
      partner: updatedPartners.length > 0 ? 'multiple' : 'all'
    }));
  };

  const handleClearAllPartnerFilters = () => {
    setSelectedPartnerFilters([]);
    setFilters(prev => ({ ...prev, partner: 'all' }));
  };

  // Handle assign lead button click
  const handleAssignLead = async (lead) => {
    try {
      setSelectedLead(lead);
      setPartnersLoading(true);
      setShowAssignModal(true);
      setSelectedPartners([]);
      setPartnerSearchQuery(''); // Reset search query
      
      // Get available partners for this lead
      const response = await leadsAPI.getAvailablePartners(lead.id);
      const data = response.data;

      // Update state with new API response structure
      setPartnerTabs(data.partnerTabs || { basic: { partners: [], count: 0 }, exclusive: { partners: [], count: 0 } });
      setShowTabs(data.showTabs !== false);
      setDefaultTab(data.defaultTab || 'basic');
      setAvailablePartners(data.availablePartners || []);

      // Use allActivePartners for search fallback
      if (data.allActivePartners) {
        setAllActivePartners(data.allActivePartners);
      }

      // Set the appropriate tab based on API response
      if (data.showTabs && data.defaultTab) {
        setPartnerFilter(data.defaultTab);
      } else if (!data.showTabs) {
        // No tabs - go directly to search from all active partners
        setPartnerFilter('search');
      } else {
        setPartnerFilter('basic'); // Fallback
      }
      
      // No need to show toast error - the dialog already displays this information clearly
    } catch (error) {
      console.error('Error fetching available partners:', error);
      toast.error(error.response?.data?.message || 'Failed to load available partners');
    } finally {
      setPartnersLoading(false);
    }
  };

  // Fetch all active partners for search
  const fetchAllActivePartners = async () => {
    if (allActivePartners.length > 0) return; // Already fetched
    
    try {
      setSearchLoading(true);
      
      // Use the new partner search endpoint that's available to all authenticated users
      const response = await partnersAPI.search({
        status: 'active',
        limit: 1000,
        page: 1
      });
      
      const partners = response.data.partners || response.data || [];
      const filteredByService = partners.filter(partner => 
        partner.services && partner.services.includes(currentService || 'moving')
      );
      
      setAllActivePartners(filteredByService);
    } catch (error) {
      console.error('Error fetching all active partners:', error);
      
      // Fallback: Try the superadmin endpoint if user is superadmin
      try {
        if (isSuperAdmin) {
          const response = await partnersAPI.getAll({
            status: 'active',
            limit: 1000,
            page: 1
          });
          
          const partners = response.data.partners || response.data || [];
          const filteredByService = partners.filter(partner => 
            partner.services && partner.services.includes(currentService || 'moving')
          );
          
          setAllActivePartners(filteredByService);
        } else {
          // Last fallback: use availablePartners (limited search)
          setAllActivePartners(availablePartners || []);
        }
      } catch (fallbackError) {
        console.error('Fallback partner fetch also failed:', fallbackError);
        setAllActivePartners(availablePartners || []);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle partner filter tab change
  const handlePartnerFilterChange = (filter) => {
    setPartnerFilter(filter);
    setPartnerSearchQuery(''); // Clear search when switching tabs
    setSelectedPartners([]); // Clear selected partners when switching tabs
    if (filter === 'search' && allActivePartners.length === 0) {
      fetchAllActivePartners();
    }
  };

  // Handle search input change
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setPartnerSearchQuery(value);
  };

  // Handle partner selection
  const handlePartnerSelect = (partner) => {
    const isExclusive = partner.partnerType === 'exclusive';
    
    if (isExclusive) {
      // For exclusive partners, only allow single selection
      setSelectedPartners([partner._id]);
    } else {
      // For basic partners, allow multiple selection
      setSelectedPartners(prev => {
        if (prev.includes(partner._id)) {
          return prev.filter(id => id !== partner._id);
        } else {
          return [...prev, partner._id];
        }
      });
    }
  };

  // Handle lead assignment
  const handleConfirmAssignment = async () => {
    if (selectedPartners.length === 0) {
      toast.error('Please select at least one partner');
      return;
    }

    try {
      setAssigningLead(true);
      
      // For now, assign to the first selected partner (API supports single assignment)
      const partnerId = selectedPartners[0];
      const response = await leadsAPI.assign(selectedLead.id, partnerId);
      
      if (response.data.success) {
        toast.success('Lead assigned successfully');
        
        // Show capacity warning if exists
        if (response.data.warning) {
          toast.warning(response.data.warning, { duration: 4000 });
        }
        
        // Refresh leads data
        await loadLeads();
        
        // Close modal
        setShowAssignModal(false);
        setSelectedLead(null);
        setSelectedPartners([]);
      }
    } catch (error) {
      console.error('Error assigning lead:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign lead';
      toast.error(errorMessage);
      
      // Show business rule if available
      if (error.response?.data?.rule) {
        toast.error(error.response.data.rule, { duration: 5000 });
      }
    } finally {
      setAssigningLead(false);
    }
  };

  // Close assignment modal
  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedLead(null);
    setSelectedPartners([]);
    setAvailablePartners([]);
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

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };



  // Load leads from API when service changes or sorting changes
  const loadLeads = async () => {
    if (!currentService) return;
    
    setLoading(true);
    try {
      // Prepare date parameters for API
      const dateParams = {};
      if (dateFilter.type === 'range' && dateFilter.fromDate && dateFilter.toDate) {
        dateParams.startDate = dateFilter.fromDate.toISOString().split('T')[0];
        dateParams.endDate = dateFilter.toDate.toISOString().split('T')[0];
      } else if (dateFilter.type === 'single' && dateFilter.singleDate) {
        dateParams.startDate = dateFilter.singleDate.toISOString().split('T')[0];
        dateParams.endDate = dateFilter.singleDate.toISOString().split('T')[0];
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
      }

      // Prepare partner filter parameter
      let partnerParam;
      if (filters.partner === 'unassigned') {
        partnerParam = 'unassigned';
      } else if (filters.partner === 'multiple') {
        partnerParam = selectedPartnerFilters.map(p => p._id);
      } else if (filters.partner !== 'all') {
        partnerParam = filters.partner;
      }

      console.log('API call with filters:', filters, 'partnerParam:', partnerParam);
      console.log('Status filter value being sent to API:', filters.status !== 'all' ? filters.status : undefined);
      console.log('User type - isPartner:', isPartner, 'isSuperAdmin:', isSuperAdmin);

      let response;
      if (isPartner && user?.id) {
        // For partners, get only their assigned leads
        response = await partnersAPI.getLeads(user.id, {
          serviceType: currentService,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
          page: currentPage,
          limit: itemsPerPage,
          // Add filters to API call - for partners, use status parameter (mapped to partner assignment status on backend)
          status: filters.status !== 'all' ? filters.status : undefined,
          city: filters.city || undefined,
          search: filters.searchTerm || undefined,
          ...dateParams
        });
      } else {
        // For admins, get all leads
        const apiParams = {
          serviceType: currentService,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
          page: currentPage,
          limit: itemsPerPage,
          // Add filters to API call
          status: filters.status !== 'all' ? filters.status : undefined,
          city: filters.city || undefined,
          partner: partnerParam,
          assignedPartner: partnerParam,
          search: filters.searchTerm || undefined,
          ...dateParams
        };
        console.log('Admin API call parameters:', apiParams);
        response = await leadsAPI.getAll(apiParams);
      }
      
      const rawLeadsData = response.data.leads || [];
      const totalCount = response.data.pagination?.total || rawLeadsData.length;
      const stats = response.data.stats || {};

      console.log('API Response - Total leads returned:', rawLeadsData.length);
      console.log('API Response - Lead statuses:', rawLeadsData.map(lead => ({ id: lead.leadId || lead._id, status: lead.status })));
      console.log('API Response - Stats:', stats);
      
      // Transform backend data structure to match frontend expectations
      const transformedLeads = rawLeadsData.map(lead => {
        let cityDisplay = lead.location?.city || lead.city || '';
        
        // For moving leads, show both pickup and destination cities
        if (lead.serviceType === 'moving') {
          // Try multiple sources for location data
          const pickupCity = lead.formData?.pickupAddress?.city || 
                           lead.pickupLocation?.city || 
                           lead.formData?.pickupCity || 
                           lead.pickupCity;
          const destinationCity = lead.formData?.destinationAddress?.city || 
                                 lead.destinationLocation?.city || 
                                 lead.formData?.destinationCity || 
                                 lead.destinationCity;
          
          console.log('Lead data for debugging:', {
            leadId: lead.leadId || lead.id,
            serviceType: lead.serviceType,
            hasFormData: !!lead.formData,
            pickupCity,
            destinationCity,
            formDataKeys: lead.formData ? Object.keys(lead.formData) : []
          });
          
          if (pickupCity && destinationCity) {
            cityDisplay = `${pickupCity} → ${destinationCity}`;
          } else if (pickupCity) {
            cityDisplay = pickupCity;
          } else if (destinationCity) {
            cityDisplay = destinationCity;
          } else {
            // Fallback to show some indication of missing data
            cityDisplay = 'Location data missing';
          }
        }
        
        // For cleaning leads, show service location city
        if (lead.serviceType === 'cleaning') {
          if (lead.formData?.serviceAddress?.city) {
            cityDisplay = lead.formData.serviceAddress.city;
          } else if (lead.serviceLocation?.city) {
            cityDisplay = lead.serviceLocation.city;
          }
        }
        
        // Extract pickup date information for display
        let dateDisplay = '';
        let pickupDate = null;
        
        if (lead.formData) {
          // Check for fixed date
          if (lead.formData.fixedDate) {
            pickupDate = new Date(lead.formData.fixedDate);
            dateDisplay = pickupDate.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB');
          }
          // Check for flexible date range
          else if (lead.formData.flexibleDateRange) {
            const startDate = new Date(lead.formData.flexibleDateRange.startDate);
            const endDate = new Date(lead.formData.flexibleDateRange.endDate);
            dateDisplay = `${startDate.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')} - ${endDate.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}`;
            pickupDate = startDate; // Use start date for filtering
          }
          // Check for flexible period
          else if (lead.formData.flexiblePeriod) {
            dateDisplay = `${lead.formData.flexiblePeriod.month} ${lead.formData.flexiblePeriod.year}`;
          }
          // Check for moveDateType with corresponding dates
          else if (lead.formData.moveDateType === 'fixed' && lead.formData.moveDate) {
            pickupDate = new Date(lead.formData.moveDate);
            dateDisplay = pickupDate.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB');
          }
        }
        
        return {
          ...lead,
          id: lead._id || lead.id, // Use MongoDB _id for navigation
          leadId: lead.leadId || lead.id, // Keep leadId for display
          name: lead.user ? `${lead.user.firstName} ${lead.user.lastName}`.trim() : (lead.name || ''),
          email: lead.user?.email || lead.email || '',
          city: cityDisplay,
          pickupCity: lead.formData?.pickupAddress?.city || '',
          destinationCity: lead.formData?.destinationAddress?.city || '',
          dateDisplay: dateDisplay,
          pickupDate: pickupDate,
          status: lead.status || 'pending'
        };
      });
      
      setLeads(transformedLeads);
      setTotalLeads(totalCount);
      
      // Update stats from API response or calculate from total counts
      setLeadStats({
        total: totalCount,
        pending: stats.pending || 0,
        assigned: stats.assigned || 0,
        accepted: stats.accepted || 0,
        cancelled: stats.cancelled || 0,
        rejected: stats.rejected || 0
      });
    } catch (error) {
      console.error('Error loading leads:', error);
      // Show empty state when API fails
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Use initial data first, then load fresh data
    if (initialLeads.length > 0) {
      setLeads(initialLeads);
    } else {
      loadLeads();
    }
    // Load partners for filtering
    loadPartnersForFilter();
  }, [currentService]);

  // Load partners for filter dropdown
  const loadPartnersForFilter = async () => {
    if (!currentService) return;
    
    try {
      const response = await partnersAPI.getAll({
        status: 'active',
        serviceType: currentService,
        limit: 100 // Get all active partners
      });
      
      const partnersData = response.data.partners || [];
      setAllPartners(partnersData);
    } catch (error) {
      console.error('Error loading partners for filter:', error);
      setAllPartners([]);
    }
  };

  // Load cancelled requests
  const loadCancelledRequests = async () => {
    if (!currentService) return;

    setLoading(true);
    try {
      // Get all leads with partner assignments by fetching multiple pages
      let allLeads = [];
      let currentPage = 1;
      let hasMorePages = true;
      const maxLimit = 100; // Backend maximum allowed limit

      while (hasMorePages && currentPage <= 20) { // Safety limit of 20 pages max
        const response = await leadsAPI.getAll({
          serviceType: currentService,
          page: currentPage,
          limit: maxLimit,
          search: filters.searchTerm || undefined,
        });

        const pageLeads = response.data.leads || response.data || [];
        allLeads = allLeads.concat(pageLeads);

        // Check if we have more pages
        const pagination = response.data.pagination;
        if (pagination && pagination.totalPages && currentPage < pagination.totalPages) {
          currentPage++;
        } else {
          hasMorePages = false;
        }

        // If we got less than the limit, we've reached the end
        if (pageLeads.length < maxLimit) {
          hasMorePages = false;
        }
      }
      console.log('All leads for cancellation processing:', allLeads);

      // Extract individual cancellation requests from partner assignments
      const cancelRequests = [];

      try {
        allLeads.forEach(lead => {
        // Add safety checks for lead data
        if (!lead || !lead._id && !lead.id) {
          console.warn('Invalid lead data:', lead);
          return;
        }

        if (lead.partnerAssignments && Array.isArray(lead.partnerAssignments) && lead.partnerAssignments.length > 0) {
          lead.partnerAssignments.forEach(assignment => {
            // Add safety checks for assignment data
            if (!assignment || !assignment.partner) {
              console.warn('Invalid partner assignment:', assignment);
              return;
            }

            // Check if this partner assignment has or had a cancellation request
            if (assignment.cancellationRequestedAt || assignment.cancellationRequested === true) {
              // Determine the status of this cancellation request
              let requestStatus = 'pending';

              if (assignment.cancellationApproved === true) {
                requestStatus = 'cancellation_approved';
              } else if (assignment.cancellationRejected === true) {
                // Admin explicitly rejected the cancellation request
                requestStatus = 'cancellation_rejected';
              } else if (assignment.cancellationRequested === true && assignment.status === 'cancellationRequested') {
                // Still pending if cancellationRequested is true and not yet processed
                requestStatus = 'pending';
              } else if (assignment.cancellationRequestedAt && !assignment.cancellationApproved && !assignment.cancellationRejected) {
                // If we have a request date but no explicit approval/rejection, it might be pending or processed differently
                requestStatus = assignment.cancellationRequested === true ? 'pending' : 'rejected';
              }

              // Apply status filter
              if (filters.status !== 'all' && filters.status !== requestStatus) {
                return; // Skip this request if it doesn't match the status filter
              }

              // Apply city filter
              if (filters.city && filters.city !== 'all') {
                const leadCity = lead.formData?.pickupAddress?.city || lead.serviceLocation?.city || lead.city;
                if (leadCity !== filters.city) {
                  return; // Skip if city doesn't match
                }
              }

              // Apply partner filter
              if (filters.partner && filters.partner !== 'all') {
                const partnerIdToCheck = assignment.partner?._id || assignment.partner;
                if (filters.partner !== partnerIdToCheck) {
                  return; // Skip if partner doesn't match
                }
              }

              // Extract partner ID safely
              const partnerId = assignment.partner?._id || assignment.partner || 'unknown';
              const leadId = lead._id || lead.id;

              // Create a cancellation request entry
              const cancelRequest = {
                id: `${leadId}_${partnerId}`, // Unique ID for each request
                leadId: lead.leadId,
                leadObjectId: lead._id || lead.id,
                customerName: lead.user ? `${lead.user.firstName} ${lead.user.lastName}` : (lead.name || 'Unknown'),
                customerEmail: lead.user?.email || lead.email || '',
                serviceType: lead.serviceType,
                city: (() => {
                  if (lead.serviceType === 'moving') {
                    // For moving leads, show pickup → destination format
                    const pickupCity = lead.formData?.pickupAddress?.city ||
                                     lead.pickupLocation?.city ||
                                     lead.formData?.pickupCity ||
                                     lead.pickupCity;
                    const destinationCity = lead.formData?.destinationAddress?.city ||
                                          lead.destinationLocation?.city ||
                                          lead.formData?.destinationCity ||
                                          lead.destinationCity;

                    if (pickupCity && destinationCity) {
                      return `${pickupCity} → ${destinationCity}`;
                    } else if (pickupCity) {
                      return pickupCity;
                    } else if (destinationCity) {
                      return destinationCity;
                    }
                  }
                  // For non-moving services or fallback
                  return lead.serviceLocation?.city || lead.city || '';
                })(),
                reason: assignment.cancellationReason || 'No reason provided',
                rejectionReason: assignment.cancellationRejectionReason || null,
                status: requestStatus,
                createdAt: assignment.cancellationRequestedAt,
                requestedAt: assignment.cancellationRequestedAt,
                // Add status-specific dates
                approvedAt: assignment.cancellationApprovedAt,
                rejectedAt: assignment.cancellationRejectedAt,
                // Partner info
                partner: assignment.partner,
                partnerInfo: assignment.partnerInfo || assignment.partner,
                assignment: assignment // Keep full assignment for reference
              };

              cancelRequests.push(cancelRequest);
            }
          });
        }
        });
      } catch (processingError) {
        console.error('Error processing leads for cancellation requests:', processingError);
        // Continue with empty requests array
      }

      console.log('Processed cancellation requests:', cancelRequests);

      // Sort by request date (most recent first) with safe date handling
      cancelRequests.sort((a, b) => {
        const dateA = a.requestedAt ? new Date(a.requestedAt) : new Date(0);
        const dateB = b.requestedAt ? new Date(b.requestedAt) : new Date(0);
        return dateB - dateA;
      });

      // Apply pagination client-side
      const startIndex = (cancelledCurrentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedRequests = cancelRequests.slice(startIndex, endIndex);

      // Calculate stats
      const stats = {
        total: cancelRequests.length,
        pending: cancelRequests.filter(r => r.status === 'pending').length,
        approved: cancelRequests.filter(r => r.status === 'approved').length,
        rejected: cancelRequests.filter(r => r.status === 'rejected').length
      };

      setCancelledRequests(paginatedRequests);
      setTotalCancelRequests(cancelRequests.length);
      setCancelledRequestStats(stats);

    } catch (error) {
      console.error('Error loading cancelled requests:', error);
      setCancelledRequests([]);
      setTotalCancelRequests(0);
      setCancelledRequestStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Handle approve cancel request
  const handleApproveCancelRequest = async (requestId) => {
    try {
      await leadsAPI.approveCancelRequest(requestId);
      toast.success(t('leads.cancelRequestApproved'));
      await loadCancelledRequests();
    } catch (error) {
      console.error('Error approving cancel request:', error);
      toast.error(t('leads.errorApprovingRequest'));
    }
  };

  // Handle reject cancel request
  const handleRejectCancelRequest = (request) => {
    setSelectedCancelRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Confirm reject with reason
  const confirmRejectCancelRequest = async () => {
    if (!rejectionReason.trim()) {
      toast.error(isGerman ? 'Bitte geben Sie einen Ablehnungsgrund an' : 'Please provide a rejection reason');
      return;
    }

    setLoading(true);
    try {
      // Extract partner ID from the selected request and call the backend API
      const partnerId = selectedCancelRequest.assignment?.partner?._id ||
                       selectedCancelRequest.assignment?.partner ||
                       selectedCancelRequest.partner?._id ||
                       selectedCancelRequest.partner;

      // Call the backend API with leadObjectId, partnerId and reason
      await leadsAPI.rejectCancelRequest(selectedCancelRequest.leadObjectId, partnerId, rejectionReason);

      // Update the request status in the list
      setCancelledRequests(prev => prev.map(req =>
        req.id === selectedCancelRequest.id
          ? {
              ...req,
              status: 'rejected',
              rejectionReason: rejectionReason,
              rejectedAt: new Date().toISOString()
            }
          : req
      ));

      // Refresh cancelled requests to ensure consistency
      await loadCancelledRequests();

      toast.success(isGerman ? 'Stornierungsanfrage abgelehnt - Lead bleibt aktiv' : 'Cancel request rejected - Lead remains active');
      setShowRejectModal(false);
      setSelectedCancelRequest(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting cancel request:', error);

      // Show proper error message
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(
        isGerman
          ? `Fehler beim Ablehnen der Stornierungsanfrage: ${errorMessage}`
          : `Error rejecting cancel request: ${errorMessage}`
      );

      // Don't close modal on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
      if (showPartnerSuggestions && !event.target.closest('.partner-search-container')) {
        setShowPartnerSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu, showPartnerSuggestions]);

  // Remove client-side filtering since API handles all filtering

  // Reload leads when sorting, date filter, page, or filters change
  useEffect(() => {
    if (currentService && activeTab === 'leads') {
      loadLeads();
    }
  }, [sortConfig.key, sortConfig.direction, dateFilter.type, dateFilter.singleDate, dateFilter.fromDate, dateFilter.toDate, dateFilter.week, dateFilter.month, dateFilter.year, currentPage, filters.status, filters.city, filters.partner, filters.searchTerm, activeTab]);

  // Load cancelled requests when activeTab changes to 'cancelled' or filters change
  useEffect(() => {
    if (currentService && activeTab === 'cancelled') {
      loadCancelledRequests();
    }
  }, [activeTab, currentService, dateFilter.type, dateFilter.singleDate, dateFilter.fromDate, dateFilter.toDate, dateFilter.week, dateFilter.month, dateFilter.year, cancelledCurrentPage, filters.status, filters.city, filters.partner, filters.searchTerm]);

  // DEPRECATED: Client-side filtering is now handled server-side for multi-partner assignments
  // This function is kept for backward compatibility but should be removed eventually
  const applyFilters = () => {
    let filtered = [...leads];
    console.log('Applying filters:', filters, 'Total leads:', leads.length);

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }

    // Filter by city
    if (filters.city) {
      filtered = filtered.filter(lead => 
        lead.city.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Filter by partner
    if (filters.partner !== 'all') {
      console.log('Filtering by partner:', filters.partner);
      if (filters.partner === 'unassigned') {
        console.log('Looking for unassigned leads. All lead partners:', leads.map(l => ({ id: l.id, partner: l.partner, assignedPartner: l.assignedPartner })));
        filtered = filtered.filter(lead => {
          const isUnassigned = !lead.partner || 
                              lead.partner === null || 
                              lead.partner === '' || 
                              lead.partner === 'Unassigned' ||
                              lead.partner === 'unassigned' ||
                              (!lead.assignedPartner || 
                               lead.assignedPartner === null || 
                               lead.assignedPartner === '' || 
                               lead.assignedPartner === 'Unassigned');
          console.log(`Lead ${lead.id}: partner=${lead.partner}, assignedPartner=${lead.assignedPartner}, isUnassigned=${isUnassigned}`);
          return isUnassigned;
        });
      } else {
        filtered = filtered.filter(lead => lead.partner === filters.partner || lead.assignedPartner === filters.partner);
      }
      console.log('After partner filter:', filtered.length, 'leads');
    }

    // Search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        lead.id.toLowerCase().includes(term)
      );
    }

    // Date filtering (client-side for already loaded data)
    if (dateFilter.type !== 'all') {
      const now = new Date();
      
      filtered = filtered.filter(lead => {
        if (currentService === 'moving' && lead.formData) {
          // For moving leads, check if the selected date falls within the lead's date range
          const filterDate = dateFilter.singleDate || dateFilter.fromDate;
          const filterEndDate = dateFilter.toDate;
          
          // Check fixed date
          if (lead.formData.fixedDate) {
            const leadFixedDate = new Date(lead.formData.fixedDate);
            
            switch (dateFilter.type) {
              case 'single':
                if (dateFilter.singleDate) {
                  return leadFixedDate.toDateString() === dateFilter.singleDate.toDateString();
                }
                break;
              case 'range':
                if (dateFilter.fromDate && dateFilter.toDate) {
                  const fromDate = new Date(dateFilter.fromDate);
                  const toDate = new Date(dateFilter.toDate);
                  toDate.setHours(23, 59, 59, 999);
                  return leadFixedDate >= fromDate && leadFixedDate <= toDate;
                }
                break;
              case 'week':
                if (dateFilter.week) {
                  const selectedWeekDate = new Date(dateFilter.week);
                  const startOfWeek = new Date(selectedWeekDate);
                  startOfWeek.setDate(selectedWeekDate.getDate() - selectedWeekDate.getDay());
                  startOfWeek.setHours(0, 0, 0, 0);
                  const endOfWeek = new Date(startOfWeek);
                  endOfWeek.setDate(startOfWeek.getDate() + 6);
                  endOfWeek.setHours(23, 59, 59, 999);
                  return leadFixedDate >= startOfWeek && leadFixedDate <= endOfWeek;
                }
                break;
              case 'month':
                if (dateFilter.month) {
                  const selectedMonthDate = new Date(dateFilter.month);
                  const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
                  const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);
                  endOfMonth.setHours(23, 59, 59, 999);
                  return leadFixedDate >= startOfMonth && leadFixedDate <= endOfMonth;
                }
                break;
              case 'year':
                if (dateFilter.year) {
                  const selectedYearDate = new Date(dateFilter.year);
                  return leadFixedDate.getFullYear() === selectedYearDate.getFullYear();
                }
                break;
            }
          }
          
          // Check flexible date range
          else if (lead.formData.flexibleDateRange) {
            const leadStartDate = new Date(lead.formData.flexibleDateRange.startDate);
            const leadEndDate = new Date(lead.formData.flexibleDateRange.endDate);
            
            switch (dateFilter.type) {
              case 'single':
                if (dateFilter.singleDate) {
                  const filterSingleDate = new Date(dateFilter.singleDate);
                  // Check if filter date falls within the lead's flexible range
                  return filterSingleDate >= leadStartDate && filterSingleDate <= leadEndDate;
                }
                break;
              case 'range':
                if (dateFilter.fromDate && dateFilter.toDate) {
                  const fromDate = new Date(dateFilter.fromDate);
                  const toDate = new Date(dateFilter.toDate);
                  // Check if there's any overlap between filter range and lead range
                  return leadStartDate <= toDate && leadEndDate >= fromDate;
                }
                break;
              case 'week':
                if (dateFilter.week) {
                  const selectedWeekDate = new Date(dateFilter.week);
                  const startOfWeek = new Date(selectedWeekDate);
                  startOfWeek.setDate(selectedWeekDate.getDate() - selectedWeekDate.getDay());
                  startOfWeek.setHours(0, 0, 0, 0);
                  const endOfWeek = new Date(startOfWeek);
                  endOfWeek.setDate(startOfWeek.getDate() + 6);
                  endOfWeek.setHours(23, 59, 59, 999);
                  // Check if there's any overlap between filter week and lead range
                  return leadStartDate <= endOfWeek && leadEndDate >= startOfWeek;
                }
                break;
              case 'month':
                if (dateFilter.month) {
                  const selectedMonthDate = new Date(dateFilter.month);
                  const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
                  startOfMonth.setHours(0, 0, 0, 0);
                  const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);
                  endOfMonth.setHours(23, 59, 59, 999);
                  // Check if there's any overlap between filter month and lead range
                  return leadStartDate <= endOfMonth && leadEndDate >= startOfMonth;
                }
                break;
              case 'year':
                if (dateFilter.year) {
                  const selectedYearDate = new Date(dateFilter.year);
                  const startOfYear = new Date(selectedYearDate.getFullYear(), 0, 1);
                  startOfYear.setHours(0, 0, 0, 0);
                  const endOfYear = new Date(selectedYearDate.getFullYear(), 11, 31);
                  endOfYear.setHours(23, 59, 59, 999);
                  // Check if there's any overlap between filter year and lead range
                  return leadStartDate <= endOfYear && leadEndDate >= startOfYear;
                }
                break;
            }
          }
          
          // Fallback to pickup date if available
          else if (lead.pickupDate) {
            const leadDate = lead.pickupDate;
            
            switch (dateFilter.type) {
              case 'single':
                if (dateFilter.singleDate) {
                  return leadDate.toDateString() === dateFilter.singleDate.toDateString();
                }
                break;
              case 'range':
                if (dateFilter.fromDate && dateFilter.toDate) {
                  const fromDate = new Date(dateFilter.fromDate);
                  const toDate = new Date(dateFilter.toDate);
                  toDate.setHours(23, 59, 59, 999);
                  return leadDate >= fromDate && leadDate <= toDate;
                }
                break;
              case 'week':
                if (dateFilter.week) {
                  const selectedWeekDate = new Date(dateFilter.week);
                  const startOfWeek = new Date(selectedWeekDate);
                  startOfWeek.setDate(selectedWeekDate.getDate() - selectedWeekDate.getDay());
                  startOfWeek.setHours(0, 0, 0, 0);
                  const endOfWeek = new Date(startOfWeek);
                  endOfWeek.setDate(startOfWeek.getDate() + 6);
                  endOfWeek.setHours(23, 59, 59, 999);
                  return leadDate >= startOfWeek && leadDate <= endOfWeek;
                }
                break;
              case 'month':
                if (dateFilter.month) {
                  const selectedMonthDate = new Date(dateFilter.month);
                  const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
                  const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);
                  endOfMonth.setHours(23, 59, 59, 999);
                  return leadDate >= startOfMonth && leadDate <= endOfMonth;
                }
                break;
              case 'year':
                if (dateFilter.year) {
                  const selectedYearDate = new Date(dateFilter.year);
                  return leadDate.getFullYear() === selectedYearDate.getFullYear();
                }
                break;
            }
          }
        }
        
        // Return false if no matching date found for moving leads
        if (currentService === 'moving') {
          return false;
        }
        
        // For non-moving services or leads without pickup dates, use creation date
        const leadDate = new Date(lead.createdAt);
        
        switch (dateFilter.type) {
          case 'single':
            if (dateFilter.singleDate) {
              return leadDate.toDateString() === dateFilter.singleDate.toDateString();
            }
            break;
            
          case 'range':
            if (dateFilter.fromDate && dateFilter.toDate) {
              const fromDate = new Date(dateFilter.fromDate);
              const toDate = new Date(dateFilter.toDate);
              toDate.setHours(23, 59, 59, 999);
              return leadDate >= fromDate && leadDate <= toDate;
            }
            break;
            
          case 'week':
            if (dateFilter.week) {
              const selectedWeekDate = new Date(dateFilter.week);
              const startOfWeek = new Date(selectedWeekDate);
              startOfWeek.setDate(selectedWeekDate.getDate() - selectedWeekDate.getDay());
              startOfWeek.setHours(0, 0, 0, 0);
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              endOfWeek.setHours(23, 59, 59, 999);
              return leadDate >= startOfWeek && leadDate <= endOfWeek;
            }
            break;
            
          case 'month':
            if (dateFilter.month) {
              const selectedMonthDate = new Date(dateFilter.month);
              const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
              const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);
              endOfMonth.setHours(23, 59, 59, 999);
              return leadDate >= startOfMonth && leadDate <= endOfMonth;
            }
            break;
            
          case 'year':
            if (dateFilter.year) {
              const selectedYearDate = new Date(dateFilter.year);
              return leadDate.getFullYear() === selectedYearDate.getFullYear();
            }
            break;
        }
        
        return true;
      });
    }

    return filtered;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial_assigned: 'bg-blue-100 text-blue-800',
      assigned: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800',
      cancel_requested: 'bg-purple-100 text-purple-800',
      cancellationRequested: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
      cancellation_rejected: 'bg-red-100 text-red-800',
      cancellation_approved: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    const color = colors[status] || colors.pending;
    console.log('getStatusColor called with status:', status, 'returning color:', color);
    return color;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      partial_assigned: '🔸',
      assigned: '📋',
      accepted: '✅',
      approved: '✅',
      cancel_requested: '🔄',
      cancellationRequested: '🔄',
      cancelled: '❌',
      rejected: '❌',
      cancellation_rejected: '❌',
      cancellation_approved: '✅',
      completed: '🎉'
    };
    return icons[status] || icons.pending;
  };

  const handleAcceptLead = async (leadId, partnerId) => {
    setLoading(true);
    try {
      const response = await leadsAPI.accept(leadId);

      // Reload leads from backend to ensure consistency with new assignment structure
      await loadLeads();

      toast.success(isGerman ? 'Lead erfolgreich akzeptiert' : 'Lead accepted successfully');
    } catch (error) {
      console.error('Error accepting lead:', error);

      // Show proper error message instead of demo mode
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(
        isGerman
          ? `Fehler beim Akzeptieren des Leads: ${errorMessage}`
          : `Error accepting lead: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle reject lead - show modal
  const handleRejectLead = (lead) => {
    setSelectedRejectLead(lead);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Confirm reject lead with reason
  const confirmRejectLead = async () => {
    if (!rejectionReason.trim()) {
      toast.error(isGerman ? 'Bitte geben Sie einen Ablehnungsgrund an' : 'Please provide a rejection reason');
      return;
    }

    setLoading(true);
    try {
      await leadsAPI.reject(selectedRejectLead.id, rejectionReason.trim());

      // Remove the lead from the list since it's now rejected/cancelled
      setLeads(prev => prev.filter(lead => lead.id !== selectedRejectLead.id));

      // Refresh leads to ensure consistency
      await loadLeads();

      toast.success(isGerman ? 'Lead erfolgreich abgelehnt' : 'Lead rejected successfully');
      setShowRejectModal(false);
      setSelectedRejectLead(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting lead:', error);

      // Show proper error message
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(
        isGerman
          ? `Fehler beim Ablehnen des Leads: ${errorMessage}`
          : `Error rejecting lead: ${errorMessage}`
      );

      // Don't close modal on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel lead - show modal for reason
  const handleCancelLead = (lead) => {
    setSelectedCancelLead(lead);
    setShowCancelModal(true);
    setCancelReason('');
  };

  // Handle submitting cancel lead request
  const handleSubmitCancelLead = async () => {
    if (!cancelReason.trim()) {
      toast.error(isGerman ? 'Bitte geben Sie einen Grund ein' : 'Please provide a reason');
      return;
    }

    setLoading(true);
    try {
      await leadsAPI.cancelLead(selectedCancelLead.id, { reason: cancelReason });

      // Update lead status to show it has a cancellation request
      setLeads(prev => prev.map(lead =>
        lead.id === selectedCancelLead.id
          ? {
              ...lead,
              partnerStatus: 'cancel_requested',
              cancelReason: cancelReason,
              cancellationRequested: true,
              cancellationRequestedAt: new Date().toISOString()
            }
          : lead
      ));

      // Refresh leads to get updated data from server
      await loadLeads();

      toast.success(isGerman ? 'Stornierungsanfrage erfolgreich gesendet' : 'Cancel request sent successfully');
      setShowCancelModal(false);
      setSelectedCancelLead(null);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling lead:', error);

      // Show proper error message
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(
        isGerman
          ? `Fehler beim Senden der Stornierungsanfrage: ${errorMessage}`
          : `Error sending cancel request: ${errorMessage}`
      );

      // Don't close modal on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  // Handle accept cancel request
  const handleAcceptCancelRequest = async (request) => {
    setLoading(true);
    try {
      // Extract partner ID from the request and call the backend API
      const partnerId = request.assignment?.partner?._id || request.assignment?.partner || request.partner?._id || request.partner;

      console.log('Accepting cancel request for lead:', request.leadObjectId, 'partner:', partnerId);
      console.log('Full request object:', request);

      // Call the backend API with leadObjectId and partnerId
      await leadsAPI.approveCancelRequest(request.leadObjectId, partnerId);

      // Update the request status in the list and also update the main leads list
      setCancelledRequests(prev => prev.map(req =>
        req.id === request.id
          ? { ...req, status: 'approved', approvedAt: new Date().toISOString() }
          : req
      ));

      // Update the main leads list to mark the lead as cancelled
      setLeads(prev => prev.map(lead =>
        lead.id === request.leadId
          ? { ...lead, status: 'cancelled', cancellationApproved: true }
          : lead
      ));

      // Refresh both lists to ensure consistency
      await Promise.all([loadLeads(), loadCancelledRequests()]);

      toast.success(isGerman ? 'Stornierungsanfrage genehmigt - Lead wurde storniert' : 'Cancel request approved - Lead has been cancelled');
    } catch (error) {
      console.error('Error accepting cancel request:', error);

      // Show proper error message
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(
        isGerman
          ? `Fehler beim Genehmigen der Stornierungsanfrage: ${errorMessage}`
          : `Error approving cancel request: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };


  // Check if partner's cancellation request was rejected
  const isCancellationRequestRejected = (lead) => {
    if (!lead.partnerAssignments) return false;

    // Handle both array and single object formats
    if (Array.isArray(lead.partnerAssignments)) {
      // Find all assignments for this partner
      const partnerAssignments = lead.partnerAssignments.filter(
        assignment => (assignment.partner === user.id || assignment.partner?._id === user.id || assignment.partner?.toString() === user.id)
      );

      if (partnerAssignments.length === 0) return false;

      // Get the most recent assignment
      const mostRecentAssignment = partnerAssignments.reduce((latest, current) => {
        const latestDate = new Date(latest.assignedAt || 0);
        const currentDate = new Date(current.assignedAt || 0);
        return currentDate > latestDate ? current : latest;
      });

      return mostRecentAssignment?.cancellationRejected === true;
    } else {
      // Single object format
      const partnerAssignment = lead.partnerAssignments;
      if (partnerAssignment && (partnerAssignment.partner === user.id || partnerAssignment.partner?._id === user.id || partnerAssignment.partner?.toString() === user.id)) {
        return partnerAssignment.cancellationRejected === true;
      }
    }

    return false;
  };

  // Apply filters to leads using useMemo for performance
  const currentLeads = useMemo(() => {
    // Since API handles all filtering, return leads directly without client-side filtering
    // For partners, the backend now returns unwound assignments, so partnerAssignments is a single object
    // Backend now provides partner-specific status directly for partners
    return leads;
  }, [leads]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [totalLeads]);

  const exportLeads = async (format) => {
    try {
      const exportParams = {
        serviceType: currentService,
        status: filters.status !== 'all' ? filters.status : undefined,
        city: filters.city || undefined,
        assignedPartner: filters.partner === 'multiple' 
          ? selectedPartnerFilters.map(p => p._id) 
          : filters.partner !== 'all' ? filters.partner : undefined,
        search: filters.searchTerm || undefined
      };
      
      // Remove undefined values
      const cleanParams = Object.entries(exportParams)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      console.log('Export params:', cleanParams); // Debug log
      
      // Use the configured API service instead of direct fetch
      const response = await leadsAPI.export(format, cleanParams);
      
      console.log('Export response:', response); // Debug log
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename based on format
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `leads_export_${timestamp}.${format}`;
      link.download = filename;
      
      // Trigger download
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
      
      const formatName = format === 'xlsx' ? 'Excel' : 'PDF';
      toast.success(`${t('common.success')}: ${t('common.export')} (${formatName})`);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting leads:', error);
      console.error('Error details:', error.response); // Additional debug info
      
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You need superadmin privileges to export.');
      } else {
        toast.error(`Failed to export to ${format.toUpperCase()}: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  // Helper functions for lead details
  
  // Helper function to flatten nested objects for table display
  const flattenFormData = (data, prefix = '') => {
    const flattened = [];
    
    Object.entries(data).forEach(([key, value]) => {
      const label = prefix ? `${prefix} - ${key.replace(/([A-Z])/g, ' $1').trim()}` : key.replace(/([A-Z])/g, ' $1').trim();
      const formattedLabel = label.replace(/^\w/, c => c.toUpperCase());
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Handle nested objects - create separate rows for each property
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          const nestedLabel = `${formattedLabel} - ${nestedKey.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}`;
          flattened.push({
            key: `${key}.${nestedKey}`,
            label: nestedLabel,
            value: nestedValue
          });
        });
      } else {
        // Simple value
        flattened.push({
          key: key,
          label: formattedLabel,
          value: value
        });
      }
    });
    
    return flattened;
  };

  // Helper function to render complex data
  const renderValue = (value, depth = 0) => {
    // Safety checks
    if (value === null || value === undefined) return '-';
    if (React.isValidElement && React.isValidElement(value)) return value; // Don't process React elements
    if (depth > 2) return String(value).substring(0, 50) + '...'; // Prevent deep recursion
    
    if (typeof value === 'boolean') return value ? (isGerman ? 'Ja' : 'Yes') : (isGerman ? 'Nein' : 'No');
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.join(', ');
    
    if (typeof value === 'object') {
      try {
        // Handle address objects
        if (value.address && value.city) {
          return `${value.address}, ${value.postalCode || ''} ${value.city}, ${value.country || ''}`;
        }
        // Handle date objects
        if (value instanceof Date) {
          return value.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB');
        }
        // Handle date strings
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
          try {
            return new Date(value).toLocaleDateString(isGerman ? 'de-DE' : 'en-GB');
          } catch (e) {
            return value;
          }
        }
        // Handle other objects by showing key-value pairs in a compact inline format
        const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined);
        if (entries.length > 0 && entries.length <= 6) {
          return (
            <div className="space-y-1">
              {entries.map(([k, v]) => {
                const label = k.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
                const val = renderValue(v, depth + 1);
                return (
                  <div key={k} className="flex flex-wrap">
                    <span className="font-medium mr-2" style={{ color: 'var(--theme-muted)' }}>
                      {label}:
                    </span>
                    <span style={{ color: 'var(--theme-text)' }} className="break-words">
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }
        return isGerman ? '[Objekt]' : '[Object]';
      } catch (error) {
        console.warn('Error rendering value:', error);
        return isGerman ? '[Fehler beim Anzeigen]' : '[Display Error]';
      }
    }
    
    // Fallback: convert to string and truncate if too long
    const str = String(value);
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
  };

  // Helper function to render table row for lead details
  const TableRow = ({ label, value, isContactInfo = false }) => {
    // Hide contact info for partners unless lead is accepted and not in cancellation state
    const isAccepted = leadForDetails?.status === 'accepted';
    const isCancellationRequested = leadForDetails?.status === 'cancellationRequested' ||
                                   leadForDetails?.status === 'cancel_requested';
    const shouldBlockDetails = !isAccepted || isCancellationRequested;

    if (isContactInfo && isPartner && shouldBlockDetails) {
      // Different messages based on status
      const getMessage = () => {
        if (isCancellationRequested) {
          return isGerman ? 'Details nicht verfügbar - Stornierung beantragt' : 'Details unavailable - Cancellation requested';
        }
        return isGerman ? 'Details nach Akzeptanz verfügbar' : 'Details available after acceptance';
      };

      return (
        <tr>
          <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)', width: '140px', minWidth: '140px' }}>
            {label}:
          </td>
          <td className="px-3 py-2 text-sm" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
            {getMessage()}
          </td>
        </tr>
      );
    }

    return (
      <tr>
        <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)', width: '140px', minWidth: '140px' }}>
          {label}:
        </td>
        <td className="px-3 py-2 text-sm" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
          {typeof value === 'object' ? renderValue(value) : (value || '-')}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      {currentView === 'table' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
              {currentService === 'moving' ? 
                (isGerman ? 'Umzug-Lead-Verwaltung' : 'Move Lead Management') : 
                currentService === 'cleaning' ? 
                (isGerman ? 'Reinigungs-Lead-Verwaltung' : 'Cleaning Lead Management') :
                (isGerman ? 'Lead-Verwaltung' : 'Lead Management')}
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
                📊 {t('common.export')}
                <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg z-50" style={{ backgroundColor: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
                  <div className="py-2">
                    <button
                      onClick={() => exportLeads('xlsx')}
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
                      onClick={() => exportLeads('pdf')}
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
          )}
          </div>
          
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
          <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
            {t('leads.leadDetails')}
          </h2>
          {leadForDetails && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(leadForDetails.status)}`}>
              {translateStatus(leadForDetails.status)}
            </span>
          )}
        </div>
      )}

      {/* Tab Navigation - only show when currentView is 'table' and user is super admin */}
      {currentView === 'table' && isSuperAdmin && (
        <div className="flex border-b mb-6" style={{ borderColor: 'var(--theme-border)' }}>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'leads'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              color: activeTab === 'leads' ? '#3B82F6' : 'var(--theme-text-muted)',
              borderBottomColor: activeTab === 'leads' ? '#3B82F6' : 'transparent'
            }}
          >
            {isGerman ? 'Leads' : 'Leads'}
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'cancelled'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              color: activeTab === 'cancelled' ? '#3B82F6' : 'var(--theme-text-muted)',
              borderBottomColor: activeTab === 'cancelled' ? '#3B82F6' : 'transparent'
            }}
          >
            {isGerman ? 'Stornierte Anfragen' : 'Cancelled Requests'}
          </button>
        </div>
      )}

      {/* Filters - show for both leads and cancelled requests tabs */}
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
              placeholder={isGerman ? 'Suche nach ID, Name, E-Mail...' : 'Search by ID, name, email...'}
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

          {/* Status Filter */}
          <div className="flex-1">
            <select
              value={filters.status}
              onChange={(e) => {
                console.log('Status filter changed to:', e.target.value);
                setFilters(prev => ({ ...prev, status: e.target.value }));
              }}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)'
              }}
            >
              <option value="all">{isGerman ? 'Alle Status' : 'All Status'}</option>
              {activeTab === 'leads' ? (
                <>
                  <option value="pending">{isGerman ? 'Ausstehend' : 'Pending'}</option>
                  <option value="accepted">{isGerman ? 'Angenommen' : 'Accepted'}</option>
                  <option value="rejected">{isGerman ? 'Abgelehnt' : 'Rejected'}</option>
                  {isPartner && (
                    <>
                      <option value="cancel_requested">{isGerman ? 'Stornierung angefragt' : 'Cancel Request'}</option>
                      <option value="cancelled">{isGerman ? 'Storniert' : 'Cancelled'}</option>
                    </>
                  )}
                  {isSuperAdmin && (
                    <>
                      <option value="partial_assigned">{isGerman ? 'Teilweise zugewiesen' : 'Partial Assigned'}</option>
                      <option value="assigned">{isGerman ? 'Zugewiesen' : 'Assigned'}</option>
                    </>
                  )}
                </>
              ) : (
                <>
                  <option value="pending">{isGerman ? 'Ausstehend' : 'Pending'}</option>
                  <option value="approved">{isGerman ? 'Genehmigt' : 'Approved'}</option>
                  <option value="rejected">{isGerman ? 'Abgelehnt' : 'Rejected'}</option>
                </>
              )}
            </select>
          </div>

          {/* City Filter */}
          <div className="flex-1">
            <input
              type="text"
              placeholder={currentService === 'moving' 
                ? (isGerman ? 'Abhol- oder Zielort...' : 'Pickup or destination city...')
                : (isGerman ? 'Stadt...' : 'City...')
              }
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
          <div className="space-y-2 flex-1">
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
        </motion.div>
      )}


      {/* Statistics - only show when currentView is 'table' and user is partner or super admin */}
      {currentView === 'table' && activeTab === 'leads' && (isPartner || isSuperAdmin) && (
        <div className="flex flex-wrap gap-4 mt-6">
        {[
          { label: t('leads.totalLeads'), value: leadStats.total, icon: '📋', color: 'blue' },
          { label: translateStatus('pending'), value: leadStats.pending || 0, icon: '⏳', color: 'yellow' },
          ...(isSuperAdmin ? [{ label: translateStatus('assigned'), value: leadStats.assigned, icon: '👤', color: 'blue' }] : [])
        ].map((stat, index) => (
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
                <p className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>{stat.value}</p>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      {/* Leads Table - only show when currentView is 'table' and activeTab is 'leads' */}
      {currentView === 'table' && activeTab === 'leads' && (
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
                <SortableHeader sortKey="leadId">
                  {t('leads.leadId')}
                </SortableHeader>
                <SortableHeader sortKey="user.firstName">
                  {t('leads.customerName')}
                </SortableHeader>
                <SortableHeader sortKey="location.city">
                  {currentService === 'moving' 
                    ? (isGerman ? 'Abhol- → Zielort' : 'Pickup → Destination')
                    : t('common.city')
                  }
                </SortableHeader>
                <SortableHeader sortKey="status">
                  {t('common.status')}
                </SortableHeader>
                <SortableHeader sortKey="pickupDate">
                  {currentService === 'moving' 
                    ? (isGerman ? 'Umzugsdatum' : 'Pickup Date')
                    : t('common.date')
                  }
                </SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span style={{ color: 'var(--theme-text)' }}>
                        {t('common.loading')}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : currentLeads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                    {t('leads.noLeadsFound') || (isGerman ? 'Keine Leads gefunden' : 'No leads found')}
                  </td>
                </tr>
              ) : (
                currentLeads.map((lead, index) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-opacity-50"
                  style={{ backgroundColor: 'var(--theme-bg)' }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                    {lead.leadId || lead.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                        {lead.name}
                      </div>
                      {(() => {
                        // For super admin, always show email
                        if (isSuperAdmin) {
                          return (
                            <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                              {lead.email}
                            </div>
                          );
                        }

                        // For partners, check status
                        if (isPartner) {
                          const isAccepted = lead.partnerStatus === 'accepted' || lead.status === 'accepted';
                          const isCancellationRequested = lead.partnerStatus === 'cancellationRequested' ||
                                                         lead.partnerStatus === 'cancel_requested' ||
                                                         lead.status === 'cancellationRequested' ||
                                                         lead.status === 'cancel_requested';

                          if (isAccepted && !isCancellationRequested) {
                            return (
                              <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                                {lead.email}
                              </div>
                            );
                          } else if (isCancellationRequested) {
                            return (
                              <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                                {isGerman ? 'Details nicht verfügbar - Stornierung beantragt' : 'Details unavailable - Cancellation requested'}
                              </div>
                            );
                          } else {
                            // Check if lead is rejected
                            const isRejected = lead.partnerStatus === 'rejected' || lead.status === 'rejected';

                            return (
                              <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                                {isRejected
                                  ? (isGerman ? 'Lead abgelehnt' : 'Lead rejected')
                                  : (isGerman ? 'Details nach Akzeptanz' : 'Details after acceptance')
                                }
                              </div>
                            );
                          }
                        }

                        // Default case
                        return null;
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                    {lead.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const statusToShow = isPartner ? (lead.partnerStatus || lead.status) : lead.status;
                      console.log('Lead ID:', lead.leadId, 'Status to show:', statusToShow, 'partnerStatus:', lead.partnerStatus, 'status:', lead.status, 'isPartner:', isPartner, 'partnerAssignments:', lead.partnerAssignments, 'userId:', user.id);
                      return (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(statusToShow)}`}>
                          {translateStatus(statusToShow)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {lead.dateDisplay || new Date(lead.createdAt).toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {/* View button - available to all users */}
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
                        title={t('leads.viewDetails')}
                      >
                        👁️ {t('common.view')}
                      </button>
                      {isSuperAdmin && (lead.status === 'pending' || (lead.status === 'partial_assigned' && lead.assignmentInfo?.canAssignMore)) && (
                        <button
                          onClick={() => handleAssignLead(lead)}
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
                          👤 {t('leads.assignLead')}
                        </button>
                      )}
                      {isPartner && (
                        <>
                          {/* Show reject and accept buttons only for pending status */}
                          {lead.partnerStatus === 'pending' && (
                            <>
                              {/* Reject button */}
                              <button
                                onClick={() => handleRejectLead(lead)}
                                className="text-xs px-3 py-1 rounded-md transition-all duration-200 flex items-center gap-1 font-medium shadow-sm hover:shadow-md border"
                                style={{
                                  backgroundColor: '#f3f4f6',
                                  color: '#374151',
                                  borderColor: '#d1d5db'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#f87171';
                                  e.target.style.color = 'white';
                                  e.target.style.borderColor = '#ef4444';
                                  e.target.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#f3f4f6';
                                  e.target.style.color = '#374151';
                                  e.target.style.borderColor = '#d1d5db';
                                  e.target.style.transform = 'translateY(0)';
                                }}
                                title={isGerman ? 'Lead ablehnen (wird sofort entfernt)' : 'Reject lead (will be removed immediately)'}
                              >
                                ✖️ {isGerman ? 'Ablehnen' : 'Reject'}
                              </button>

                              {/* Accept button */}
                              <button
                                onClick={() => handleAcceptLead(lead.id, user.id)}
                                className="text-xs px-3 py-1 rounded transition-colors"
                                style={{
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: '1px solid #10b981'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#059669';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#10b981';
                                }}
                                title={isGerman ? 'Lead akzeptieren' : 'Accept lead'}
                              >
                                ✅ {isGerman ? 'Akzeptieren' : 'Accept'}
                              </button>
                            </>
                          )}

                          {/* Show cancel request button for accepted leads (but not if already requested or rejected) */}
                          {(lead.partnerStatus === 'accepted' || lead.status === 'accepted') &&
                           lead.partnerStatus !== 'cancel_requested' &&
                           !isCancellationRequestRejected(lead) && (
                            <button
                              onClick={() => handleCancelLead(lead)}
                              className="text-xs px-3 py-1 rounded-md transition-all duration-200 flex items-center gap-1 font-medium shadow-sm hover:shadow-md"
                              style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: '1px solid #dc2626'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#dc2626';
                                e.target.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#ef4444';
                                e.target.style.transform = 'translateY(0)';
                              }}
                              title={isGerman ? 'Stornierungsantrag stellen' : 'Request cancellation'}
                            >
                              ⚠️ {isGerman ? 'Stornierung anfordern' : 'Request Cancel'}
                            </button>
                          )}

                          {/* Show status for cancel requested leads */}
                          {lead.partnerStatus === 'cancel_requested' && (
                            <span className="text-xs px-3 py-1 rounded bg-purple-100 text-purple-800">
                              🔄 {isGerman ? 'Stornierung angefragt' : 'Cancel Pending'}
                            </span>
                          )}

                          {/* Show status for rejected cancellation requests */}
                          {isCancellationRequestRejected(lead) && (
                            <span
                              className="text-xs px-3 py-1 rounded bg-red-100 text-red-800 cursor-pointer"
                              onClick={() => {
                                toast.error(
                                  isGerman
                                    ? 'Ihre Stornierungsanfrage wurde abgelehnt. Sie können keine weitere Stornierung für diesen Lead anfordern.'
                                    : 'Your cancellation request was rejected. You cannot request another cancellation for this lead.',
                                  { duration: 4000 }
                                );
                              }}
                            >
                              ❌ {translateStatus('cancellation_rejected')}
                            </span>
                          )}
                        </>
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

      {/* Statistics - only show when currentView is 'table' and activeTab is 'cancelled' */}
      {currentView === 'table' && activeTab === 'cancelled' && (
        <div className="flex flex-wrap gap-4 mt-6">
        {[
          { label: isGerman ? 'Gesamt Anfragen' : 'Total Requests', value: cancelledRequestStats.total, icon: '📋', color: 'blue' },
          { label: isGerman ? 'Ausstehend' : 'Pending', value: cancelledRequestStats.pending, icon: '⏳', color: 'yellow' },
          { label: isGerman ? 'Genehmigt' : 'Approved', value: cancelledRequestStats.approved, icon: '✅', color: 'green' },
          { label: isGerman ? 'Abgelehnt' : 'Rejected', value: cancelledRequestStats.rejected, icon: '❌', color: 'red' }
        ].map((stat, index) => (
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
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  {stat.label}
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
                  {stat.value}
                </p>
              </div>
              <div className="text-2xl">
                {stat.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      {/* Cancelled Requests Table - only show when currentView is 'table' and activeTab is 'cancelled' */}
      {currentView === 'table' && activeTab === 'cancelled' && (
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>
                    {t('leads.leadId')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>
                    {t('leads.customerName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Partner' : 'Partner'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Abholung → Ziel' : 'Pickup → Destination'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Grund' : 'Reason'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>
                    {t('common.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>
                    {t('common.date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span style={{ color: 'var(--theme-text)' }}>
                          {t('common.loading')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : cancelledRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? 'Keine stornierten Anfragen gefunden' : 'No cancelled requests found'}
                    </td>
                  </tr>
                ) : (
                  cancelledRequests.map((request, index) => (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-opacity-50"
                      style={{ backgroundColor: 'var(--theme-bg)' }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                        {request.leadId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        <div>
                          <div className="font-medium">{request.customerName}</div>
                          <div className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{request.customerEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        <div>
                          <div className="font-medium">
                            {request.partnerInfo?.companyName || request.partner?.companyName || 'Unknown Partner'}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                            {request.partnerInfo?.contactPerson?.email || request.partner?.contactPerson?.email || ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        {request.city}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--theme-text)', width: '150px', maxWidth: '150px' }}>
                        <div
                          className="truncate cursor-help"
                          title={request.reason}
                          style={{
                            color: 'var(--theme-text)',
                            maxWidth: '130px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {request.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          getStatusColor(request.status)
                        }`}>
                          {translateStatus(request.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        {new Date(request.createdAt).toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              // Transform the cancelled request back to lead format for viewing
                              const leadForView = {
                                id: request.leadObjectId,
                                leadId: request.leadId,
                                name: request.customerName,
                                email: request.customerEmail,
                                city: request.city,
                                status: 'assigned' // Use the actual lead status, not the cancellation status
                              };
                              handleViewLead(leadForView);
                            }}
                            className="text-sm px-3 py-1 rounded transition-colors"
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
                            👁️ {t('common.view')}
                          </button>
                          {isSuperAdmin && request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAcceptCancelRequest(request)}
                                className="text-sm px-3 py-1 rounded transition-colors"
                                style={{ 
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: '1px solid #10b981'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#059669';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#10b981';
                                }}
                              >
                                {isGerman ? 'Akzeptieren' : 'Accept'}
                              </button>
                              <button
                                onClick={() => handleRejectCancelRequest(request)}
                                className="text-sm px-3 py-1 rounded transition-colors"
                                style={{ 
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: '1px solid #ef4444'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#dc2626';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#ef4444';
                                }}
                              >
                                {isGerman ? 'Ablehnen' : 'Reject'}
                              </button>
                            </>
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

      {/* Removed cancelled requests table */}
      {false && (
        <motion.div
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--theme-border)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
              <thead style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                <tr>
                  <SortableHeader sortKey="leadId">
                    {t('leads.leadId')}
                  </SortableHeader>
                  <SortableHeader sortKey="partnerName">
                    {t('leads.requestedBy')}
                  </SortableHeader>
                  <SortableHeader sortKey="customerName">
                    {t('leads.customerName')}
                  </SortableHeader>
                  <SortableHeader sortKey="serviceType">
                    {t('leads.service')}
                  </SortableHeader>
                  <SortableHeader sortKey="city">
                    {t('common.city')}
                  </SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                    {t('leads.cancelReason')}
                  </th>
                  <SortableHeader sortKey="status">
                    {t('common.status')}
                  </SortableHeader>
                  <SortableHeader sortKey="createdAt">
                    {t('leads.requestDate')}
                  </SortableHeader>
                  {isSuperAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                      {t('common.actions')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span style={{ color: 'var(--theme-text)' }}>
                          {t('common.loading')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : cancelledRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? 'Keine Stornierungsanfragen gefunden' : 'No cancel requests found'}
                    </td>
                  </tr>
                ) : (
                  cancelledRequests.map((request, index) => (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-opacity-50"
                      style={{ backgroundColor: 'var(--theme-bg)' }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                        {request.leadId || request.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                            {request.partnerName || request.partner?.companyName}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                            {request.partnerEmail || request.partner?.contactPerson?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                            {request.customerName || request.lead?.customerName}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                            {request.customerEmail || request.lead?.customerEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        {request.city || request.lead?.city}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--theme-text)' }}>
                        <div className="max-w-xs truncate" title={request.reason}>
                          {request.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status === 'pending' ? '⏳' : request.status === 'approved' ? '✅' : '❌'} 
                          {request.status === 'pending' ? (isGerman ? 'Ausstehend' : 'Pending') :
                           request.status === 'approved' ? (isGerman ? 'Genehmigt' : 'Approved') :
                           (isGerman ? 'Abgelehnt' : 'Rejected')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                        {new Date(request.createdAt).toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {request.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveCancelRequest(request.id)}
                                className="text-xs px-3 py-1 rounded transition-colors"
                                style={{ 
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: '1px solid #10b981'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#059669';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#10b981';
                                }}
                                title={t('leads.approveCancelRequest')}
                              >
                                ✅ {isGerman ? 'Genehmigen' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleRejectCancelRequest(request)}
                                className="text-xs px-3 py-1 rounded transition-colors"
                                style={{ 
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: '1px solid #ef4444'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#dc2626';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#ef4444';
                                }}
                                title={t('leads.rejectCancelRequest')}
                              >
                                ❌ {isGerman ? 'Ablehnen' : 'Reject'}
                              </button>
                            </div>
                          )}
                          {request.status !== 'pending' && (
                            <span className="text-gray-500 italic text-xs">
                              {request.status === 'approved' ? 
                                (isGerman ? 'Genehmigt' : 'Approved') : 
                                (isGerman ? 'Abgelehnt' : 'Rejected')
                              }
                            </span>
                          )}
                        </td>
                      )}
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Lead Details Modal */}
      <AnimatePresence>
        {showLeadDetails && leadForDetails && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-start justify-center z-[9999] p-4 pt-8 overflow-y-auto"
            style={{ paddingLeft: '10rem' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseLeadDetails}
          >
            <motion.div
              className="w-full max-w-6xl min-h-[80vh] max-h-none rounded-lg border my-8"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary)' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Back Button */}
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleCloseLeadDetails}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    style={{ color: 'var(--theme-text)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--theme-text)' }}>
                      {t('leads.leadDetails')}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                        {leadForDetails.leadId}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        leadForDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        leadForDetails.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        leadForDetails.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {leadForDetails.status === 'pending' ? (isGerman ? 'Ausstehend' : 'Pending') :
                         leadForDetails.status === 'accepted' ? (isGerman ? 'Akzeptiert' : 'Accepted') :
                         leadForDetails.status === 'rejected' ? (isGerman ? 'Abgelehnt' : 'Rejected') :
                         leadForDetails.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Details - 2 Column Layout */}
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column - Customer Information */}
                  <div>
                    <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                      {t('leads.customerInfo')}
                    </h4>
                    <div>
                      <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                        <tbody>
                          <TableRow
                            label={t('leads.leadId')}
                            value={leadForDetails.leadId}
                          />
                          <TableRow
                            label={t('common.name')}
                            value={leadForDetails.name}
                          />
                          <TableRow
                            label={t('common.email')}
                            value={leadForDetails.email}
                            isContactInfo={true}
                          />
                          {leadForDetails.user?.phone && (
                            <TableRow
                              label={t('common.phone')}
                              value={leadForDetails.user.phone}
                              isContactInfo={true}
                            />
                          )}
                          <TableRow
                            label={t('common.city')}
                            value={leadForDetails.city}
                          />
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column - Service & Additional Information */}
                  <div>
                    <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Service & Details' : 'Service & Details'}
                    </h4>
                    <div>
                      <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                        <tbody>
                          <TableRow
                            label={t('leads.service')}
                            value={
                              `${leadForDetails.serviceType === 'moving' ? '🚛' : '🧽'} ${t(`services.${leadForDetails.serviceType}`)}${leadForDetails.moveType ? ` - ${leadForDetails.moveType.replace('_', ' ')}` : ''}`
                            }
                          />
                          {leadForDetails.sourceDomain && (
                            <TableRow
                              label={t('leads.sourceDomain')}
                              value={leadForDetails.sourceDomain}
                            />
                          )}
                          {/* Partner Assignment Information */}
                          {(leadForDetails.assignedPartner || leadForDetails.assignedPartners || leadForDetails.acceptedPartner || leadForDetails.partnerAssignments) && (
                            <tr>
                              <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)', width: '140px', minWidth: '140px' }}>
                                {t('leads.assignedPartner')}:
                              </td>
                              <td className="px-3 py-2 text-sm" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                                <div className="space-y-1">
                                  {/* Show accepted partner first if available */}
                                  {leadForDetails.status === 'accepted' && leadForDetails.acceptedPartner ? (
                                    <div>
                                      {leadForDetails.acceptedPartner.companyName || leadForDetails.acceptedPartner}
                                    </div>
                                  ) : leadForDetails.assignedPartners && Array.isArray(leadForDetails.assignedPartners) && leadForDetails.assignedPartners.length > 0 ? (
                                    /* Show multiple assigned partners */
                                    <div className="space-y-1">
                                      {leadForDetails.assignedPartners.map((partner, index) => (
                                        <div key={partner._id || index}>
                                          {partner.companyName}
                                        </div>
                                      ))}
                                    </div>
                                  ) : leadForDetails.partnerAssignments && Array.isArray(leadForDetails.partnerAssignments) && leadForDetails.partnerAssignments.length > 0 ? (
                                    /* Show partner assignments from new schema */
                                    <div className="space-y-1">
                                      {leadForDetails.partnerAssignments.map((assignment, index) => (
                                        <div key={assignment.partner._id || index}>
                                          {assignment.partner.companyName || assignment.partner}
                                        </div>
                                      ))}
                                    </div>
                                  ) : leadForDetails.assignedPartner ? (
                                    /* Show single assigned partner (legacy support) */
                                    <div>
                                      {leadForDetails.assignedPartner.companyName || leadForDetails.assignedPartner}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 italic">
                                      {isGerman ? 'Nicht zugewiesen' : 'Unassigned'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignment Information - Admin Only */}
              {isSuperAdmin && leadForDetails.assignmentInfo && (
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                  <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Zuweisungsinformationen' : 'Assignment Information'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Aktive Zuweisungen:' : 'Active Assignments:'}
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                          {leadForDetails.assignmentInfo.activeAssignments} / {leadForDetails.assignmentInfo.maxAllowed}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Gesamt zugewiesen:' : 'Total Assigned:'}
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                          {leadForDetails.assignmentInfo.totalAssigned}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {leadForDetails.assignmentInfo.hasExclusivePartner && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          👑 {isGerman ? 'Exklusiver Partner' : 'Exclusive Partner'}
                        </span>
                      )}
                      {leadForDetails.assignmentInfo.canAssignMore && !leadForDetails.assignmentInfo.hasExclusivePartner && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ {isGerman ? 'Kann weitere zuweisen' : 'Can assign more'}
                        </span>
                      )}
                      {leadForDetails.assignmentInfo.isDatePassed && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ⏰ {isGerman ? 'Datum abgelaufen' : 'Date passed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Data and User Details - 2 Column Layout */}
              {((leadForDetails.formData && Object.keys(leadForDetails.formData).length > 0) || leadForDetails.user) && (
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Form Data */}
                    {leadForDetails.formData && Object.keys(leadForDetails.formData).length > 0 && (
                      <div>
                        <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                          {isGerman ? 'Formulardetails' : 'Form Details'}
                        </h4>
                        <div>
                          <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                            <tbody>
                              {Object.entries(leadForDetails.formData).map(([key, value]) => {
                                // Skip empty values and internal fields
                                if (value === null || value === undefined || value === '' || key.startsWith('_')) {
                                  return null;
                                }

                                // Format the label
                                const label = key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());

                                return (
                                  <TableRow
                                    key={key}
                                    label={label}
                                    value={formatFormValue(key, value)}
                                  />
                                );
                              }).filter(Boolean)}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* User Details & Timestamps */}
                    <div>
                      {leadForDetails.user && (
                        <>
                          <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                            {isGerman ? 'Zusätzliche Benutzerdetails' : 'Additional User Details'}
                          </h4>
                          <div className="mb-6">
                            <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                              <tbody>
                                {leadForDetails.user.salutation && (
                                  <TableRow
                                    label={isGerman ? 'Anrede' : 'Salutation'}
                                    value={leadForDetails.user.salutation}
                                    isContactInfo={true}
                                  />
                                )}
                                {leadForDetails.user.firstName && (
                                  <TableRow
                                    label={isGerman ? 'Vorname' : 'First Name'}
                                    value={leadForDetails.user.firstName}
                                    isContactInfo={true}
                                  />
                                )}
                                {leadForDetails.user.lastName && (
                                  <TableRow
                                    label={isGerman ? 'Nachname' : 'Last Name'}
                                    value={leadForDetails.user.lastName}
                                    isContactInfo={true}
                                  />
                                )}
                                {leadForDetails.user.preferredContactTime && (
                                  <TableRow
                                    label={isGerman ? 'Bevorzugte Kontaktzeit' : 'Preferred Contact Time'}
                                    value={leadForDetails.user.preferredContactTime}
                                    isContactInfo={true}
                                  />
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      {/* Timestamps */}
                      <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Zeitstempel' : 'Timestamps'}
                      </h4>
                      <div>
                        <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                          <tbody>
                            <TableRow
                              label={t('leads.createdAt')}
                              value={new Date(leadForDetails.createdAt).toLocaleString()}
                            />
                            {leadForDetails.assignedAt && (
                              <TableRow
                                label={isGerman ? 'Zugewiesen am' : 'Assigned At'}
                                value={new Date(leadForDetails.assignedAt).toLocaleString()}
                              />
                            )}
                            {leadForDetails.acceptedAt && (
                              <TableRow
                                label={isGerman ? 'Akzeptiert am' : 'Accepted At'}
                                value={new Date(leadForDetails.acceptedAt).toLocaleString()}
                              />
                            )}
                            {leadForDetails.updatedAt && leadForDetails.updatedAt !== leadForDetails.createdAt && (
                              <TableRow
                                label={isGerman ? 'Zuletzt aktualisiert' : 'Last Updated'}
                                value={new Date(leadForDetails.updatedAt).toLocaleString()}
                              />
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentView === 'table' && activeTab === 'leads' && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalLeads}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}

      {currentView === 'table' && activeTab === 'cancelled' && (
        <Pagination
          currentPage={cancelledCurrentPage}
          totalItems={totalCancelRequests}
          itemsPerPage={itemsPerPage}
          onPageChange={setCancelledCurrentPage}
        />
      )}

      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-xl shadow-2xl p-6 w-full max-w-md border"
              style={{ 
                backgroundColor: 'var(--theme-bg)', 
                color: 'var(--theme-text)',
                borderColor: 'var(--theme-border)'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">❌</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                    {selectedRejectLead
                      ? (isGerman ? 'Lead ablehnen' : 'Reject Lead')
                      : t('leads.rejectCancelRequest')
                    }
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {selectedRejectLead
                      ? `${selectedRejectLead.id} - ${selectedRejectLead.name || 'Unknown Customer'}`
                      : selectedCancelRequest?.leadId
                    }
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                  {t('leads.rejectionReason')} *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={isGerman ? 'Grund für die Ablehnung eingeben...' : 'Enter reason for rejection...'}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Dieser Grund wird dem Partner mitgeteilt' : 'This reason will be communicated to the partner'}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedCancelRequest(null);
                    setSelectedRejectLead(null);
                    setRejectionReason('');
                  }}
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
                  onClick={selectedRejectLead ? confirmRejectLead : confirmRejectCancelRequest}
                  disabled={!rejectionReason.trim()}
                  className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                    !rejectionReason.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isGerman ? 'Ablehnen' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partner Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border"
              style={{ 
                backgroundColor: 'var(--theme-bg-secondary)', 
                color: 'var(--theme-text)',
                borderColor: 'var(--theme-border)'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <div>
                  <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--theme-text)' }}>
                    {t('leads.assignLead')}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    Lead ID: {selectedLead?.leadId}
                  </p>
                </div>
                <button
                  onClick={handleCloseAssignModal}
                  className="p-2 rounded-full hover:bg-opacity-80 transition-all"
                  style={{ 
                    color: 'var(--theme-muted)', 
                    backgroundColor: 'var(--theme-bg-secondary)'
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Lead Information */}
              {selectedLead && (
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--theme-text)' }}>Lead Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }}>Customer:</strong> 
                      <span style={{ color: 'var(--theme-text)' }}> {selectedLead.name}</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }}>Location:</strong> 
                      <span style={{ color: 'var(--theme-text)' }}> {selectedLead.city}</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }}>Service:</strong> 
                      <span style={{ color: 'var(--theme-text)' }}> {translateService(selectedLead.serviceType || currentService)}</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }}>Status:</strong> 
                      <span style={{ color: 'var(--theme-text)' }}> {translateStatus(selectedLead.status)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggested Partners */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: 'var(--theme-text)' }}>
                    Suggested Partners ({filteredPartners.length})
                  </h3>

                  {/* Search Input */}
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Search partners..."
                      value={partnerSearchQuery}
                      onChange={handleSearchInputChange}
                      className="w-full px-4 py-2 pl-11 text-sm rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-4 w-4" style={{ color: 'var(--theme-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchLoading && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Partner Filter Tabs - Only show if there are suggested partners */}
                {showTabs && (
                  <div className="mb-4">
                    <div className="flex border-b" style={{ borderColor: 'var(--theme-border)' }}>
                      <button
                        onClick={() => handlePartnerFilterChange('basic')}
                        className={`px-6 py-3 font-medium transition-colors ${
                          partnerFilter === 'basic'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Basic ({partnerTabs.basic.count})
                      </button>
                      <button
                        onClick={() => handlePartnerFilterChange('exclusive')}
                        className={`px-6 py-3 font-medium transition-colors ${
                          partnerFilter === 'exclusive'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Exclusive ({partnerTabs.exclusive.count})
                      </button>
                    </div>
                  </div>
                )}

                {partnersLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="font-medium" style={{ color: 'var(--theme-text)' }}>Loading partners...</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--theme-muted)' }}>Finding the best matches for your lead</p>
                  </div>
                ) : !showTabs && !partnerSearchQuery.trim() ? (
                  // When no suggested partners and no search query, show message to search
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                      <svg className="w-8 h-8" style={{ color: 'var(--theme-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                      No suggested partners for this lead
                    </p>
                    <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                      Search for partners by company name, email, or partner ID above
                    </p>
                  </div>
                ) : filteredPartners.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                      <svg className="w-8 h-8" style={{ color: 'var(--theme-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <p className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                      No Search Results
                    </p>
                    <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                      No partners found matching &quot;{partnerSearchQuery}&quot;
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPartners.map((partner) => {
                      const isSelected = selectedPartners.includes(partner._id);
                      const isExclusive = partner.partnerType === 'exclusive';
                      
                      return (
                        <div
                          key={partner._id}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? 'border-blue-500 shadow-md' 
                              : 'hover:border-gray-400 hover:shadow-sm'
                          } ${isExclusive ? 'ring-2 ring-yellow-400' : ''}`}
                          style={{ 
                            backgroundColor: isSelected 
                              ? 'rgba(59, 130, 246, 0.1)' 
                              : 'var(--theme-bg-secondary)',
                            borderColor: isSelected 
                              ? '#3b82f6' 
                              : 'var(--theme-border)'
                          }}
                          onClick={() => handlePartnerSelect(partner)}
                        >
                          {/* Company Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-bold" style={{ color: 'var(--theme-text)' }}>
                                {partner.companyName || 'Unknown Company'}
                              </h4>
                              {partner.locationMatch && (
                                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
                                  📍 Match
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-muted)' }}>
                              ID: {partner.partnerId || 'N/A'}
                            </div>
                          </div>

                          {/* Partner Details */}
                          <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'var(--theme-bg)' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                                <span className="text-blue-600 text-xs">👤</span>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm mb-1" style={{ color: 'var(--theme-text)' }}>
                                  {partner.contactPerson?.firstName && partner.contactPerson?.lastName
                                    ? `${partner.contactPerson.firstName} ${partner.contactPerson.lastName}`
                                    : 'Contact not provided'}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                                  {partner.contactPerson?.email || 'Email not provided'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                              <div className="text-center">
                                <div className="font-bold text-sm" style={{ color: 'var(--theme-text)' }}>
                                  {partner.currentWeekLeads || 0}/{partner.weeklyLimit || 'N/A'}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>Weekly</div>
                              </div>
                              <div className="w-px h-6 bg-gray-200"></div>
                              <div className="text-center">
                                <div className="font-bold text-sm" style={{ color: 'var(--theme-text)' }}>
                                  {partner.acceptanceRate || 0}%
                                </div>
                                <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>Accept</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm space-y-1" style={{ color: 'var(--theme-text)' }}>
                  <div>
                    <span style={{ color: 'var(--theme-text)' }}>
                      Basic partners - multiple selection allowed
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--theme-text)' }}>
                      Exclusive partners - single selection
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleCloseAssignModal}
                    className="px-4 py-2 border rounded-lg font-medium hover:opacity-80"
                    style={{ 
                      borderColor: 'var(--theme-border)', 
                      color: 'var(--theme-text)',
                      backgroundColor: 'var(--theme-bg-secondary)'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAssignment}
                    disabled={selectedPartners.length === 0 || assigningLead}
                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                      selectedPartners.length === 0 || assigningLead
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:shadow-md'
                    }`}
                    style={{
                      backgroundColor: selectedPartners.length === 0 || assigningLead 
                        ? 'var(--theme-muted)' 
                        : '#3b82f6',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    {assigningLead ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Assigning...
                      </span>
                    ) : (
                      `Assign to ${selectedPartners.length} Partner${selectedPartners.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Lead Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-xl shadow-2xl p-6 w-full max-w-md border"
              style={{ 
                backgroundColor: 'var(--theme-bg-secondary)', 
                color: 'var(--theme-text)',
                borderColor: 'var(--theme-border)'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <div>
                  <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Lead stornieren' : 'Cancel Lead'}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    Lead ID: {selectedCancelLead?.leadId}
                  </p>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-2 rounded-full hover:bg-opacity-80 transition-all"
                  style={{ 
                    color: 'var(--theme-muted)', 
                    backgroundColor: 'var(--theme-bg-secondary)'
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Grund für Stornierung' : 'Reason for cancellation'}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full h-24 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ 
                    backgroundColor: 'var(--theme-bg)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                  placeholder={isGerman ? 'Bitte geben Sie einen Grund ein...' : 'Please provide a reason...'}
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'var(--theme-bg)',
                    color: 'var(--theme-text)',
                    border: '1px solid var(--theme-border)'
                  }}
                >
                  {isGerman ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  onClick={handleSubmitCancelLead}
                  disabled={!cancelReason.trim() || loading}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: cancelReason.trim() && !loading ? '#ef4444' : 'var(--theme-bg)',
                    color: cancelReason.trim() && !loading ? 'white' : 'var(--theme-muted)',
                    border: `1px solid ${cancelReason.trim() && !loading ? '#ef4444' : 'var(--theme-border)'}`,
                    cursor: cancelReason.trim() && !loading ? 'pointer' : 'not-allowed'
                  }}
                >
                  {loading ? (isGerman ? 'Wird gesendet...' : 'Sending...') : (isGerman ? 'Stornieren' : 'Cancel Lead')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LeadDetailsDialog Component */}
      <LeadDetailsDialog
        isOpen={showLeadDetails}
        leadData={leadForDetails}
        onClose={handleCloseLeadDetails}
        t={t}
        isGerman={isGerman}
        isPartner={isPartner}
      />

    </div>
  );
};

export default LeadManagement;