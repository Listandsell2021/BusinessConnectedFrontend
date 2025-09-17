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
    cancelled: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availablePartners, setAvailablePartners] = useState([]);
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
  
  // Add activeTab state for leads and cancelled requests tabs
  const [activeTab, setActiveTab] = useState('leads');
  const [selectedCancelRequest, setSelectedCancelRequest] = useState(null);
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
    if (partnerFilter === 'search') {
      // Search mode: search through all active partners of selected service
      if (!partnerSearchQuery.trim()) {
        return []; // Show empty when no search query
      }
      const query = partnerSearchQuery.toLowerCase().trim();
      
      // Use allActivePartners if available (for superadmin) or fall back to availablePartners
      const searchSource = allActivePartners.length > 0 ? allActivePartners : availablePartners;
      
      return searchSource.filter(partner => {
        return (
          partner.companyName?.toLowerCase().includes(query) ||
          partner.partnerId?.toLowerCase().includes(query) ||
          partner.contactPerson?.firstName?.toLowerCase().includes(query) ||
          partner.contactPerson?.lastName?.toLowerCase().includes(query) ||
          partner.contactPerson?.email?.toLowerCase().includes(query) ||
          `${partner.contactPerson?.firstName} ${partner.contactPerson?.lastName}`.toLowerCase().includes(query)
        );
      });
    } else {
      // Basic or Exclusive mode: filter available partners by type
      const sourcePartners = availablePartners || [];
      return sourcePartners.filter(partner => partner.partnerType === partnerFilter);
    }
  }, [availablePartners, allActivePartners, partnerFilter, partnerSearchQuery]);

  // Translation functions using centralized translations
  const translateStatus = (status) => {
    // Map lead status values to translation keys
    const statusMap = {
      'pending': 'common.pending',
      'assigned': isPartner ? 'common.pending' : 'leads.assignedLeads', // Show "Pending" for partners instead of "Assigned"
      'accepted': 'common.approved',
      'completed': 'leads.completedLeads',
      'cancelled': 'common.rejected'
    };
    return t(statusMap[status] || 'common.pending');
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
    try {
      setLoading(true);
      const response = await leadsAPI.getById(lead.id);
      
      // Handle the response structure from the updated backend
      const leadData = response.data.success ? response.data.lead : response.data;
      
      // Transform the lead data similar to the detail page
      const transformedLead = {
        ...leadData,
        id: leadData._id || leadData.id,
        leadId: leadData.leadId || leadData.id,
        name: leadData.user ? 
          `${leadData.user.firstName} ${leadData.user.lastName}`.trim() : 
          (leadData.name || ''),
        email: leadData.user?.email || leadData.email || '',
        city: leadData.location?.city || leadData.city || '',
        status: leadData.status || 'pending'
      };
      
      setLeadForDetails(transformedLead);
      setCurrentView('details');
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
      setPartnerFilter('all'); // Reset to 'all' tab
      setPartnerSearchQuery(''); // Reset search query
      
      // Get available partners for this lead
      const response = await leadsAPI.getAvailablePartners(lead.id);
      setAvailablePartners(response.data.availablePartners || []);
      
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

      console.log('API call with partner filter:', filters.partner, 'partnerParam:', partnerParam);

      let response;
      if (isPartner && user?.id) {
        // For partners, get only their assigned leads
        response = await partnersAPI.getLeads(user.id, {
          serviceType: currentService,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
          page: currentPage,
          limit: itemsPerPage,
          // Add filters to API call
          status: filters.status !== 'all' ? filters.status : undefined,
          city: filters.city || undefined,
          search: filters.searchTerm || undefined,
          ...dateParams
        });
      } else {
        // For admins, get all leads
        response = await leadsAPI.getAll({
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
        });
      }
      
      const rawLeadsData = response.data.leads || [];
      const totalCount = response.data.pagination?.total || rawLeadsData.length;
      const stats = response.data.stats || {};
      
      // Transform backend data structure to match frontend expectations
      const transformedLeads = rawLeadsData.map(lead => {
        let cityDisplay = lead.location?.city || lead.city || '';
        
        // For moving leads, show both pickup and destination cities
        if (lead.serviceType === 'moving' && lead.formData) {
          const pickupCity = lead.formData.pickupAddress?.city;
          const destinationCity = lead.formData.destinationAddress?.city;
          
          if (pickupCity && destinationCity) {
            cityDisplay = `${pickupCity} → ${destinationCity}`;
          } else if (pickupCity) {
            cityDisplay = pickupCity;
          } else if (destinationCity) {
            cityDisplay = destinationCity;
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
        cancelled: stats.cancelled || 0
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
      // Prepare date parameters for API (same logic but for request date)
      const dateParams = {};
      if (dateFilter.type === 'range' && dateFilter.fromDate && dateFilter.toDate) {
        dateParams.requestStartDate = dateFilter.fromDate.toISOString().split('T')[0];
        dateParams.requestEndDate = dateFilter.toDate.toISOString().split('T')[0];
      } else if (dateFilter.type === 'single' && dateFilter.singleDate) {
        dateParams.requestStartDate = dateFilter.singleDate.toISOString().split('T')[0];
        dateParams.requestEndDate = dateFilter.singleDate.toISOString().split('T')[0];
      } else if (dateFilter.type === 'week' && dateFilter.week) {
        const selectedWeekDate = new Date(dateFilter.week);
        const startOfWeek = new Date(selectedWeekDate);
        startOfWeek.setDate(selectedWeekDate.getDate() - selectedWeekDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        dateParams.requestStartDate = startOfWeek.toISOString().split('T')[0];
        dateParams.requestEndDate = endOfWeek.toISOString().split('T')[0];
      } else if (dateFilter.type === 'month' && dateFilter.month) {
        const selectedMonthDate = new Date(dateFilter.month);
        const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
        const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);
        dateParams.requestStartDate = startOfMonth.toISOString().split('T')[0];
        dateParams.requestEndDate = endOfMonth.toISOString().split('T')[0];
      } else if (dateFilter.type === 'year' && dateFilter.year) {
        const selectedYearDate = new Date(dateFilter.year);
        const targetYear = selectedYearDate.getFullYear();
        dateParams.requestStartDate = `${targetYear}-01-01`;
        dateParams.requestEndDate = `${targetYear}-12-31`;
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

      console.log('Cancelled requests API call with filters:', filters, 'partnerParam:', partnerParam);

      // Use the same leads API but filter for cancel-request status
      const response = await leadsAPI.getAll({
        serviceType: currentService,
        page: cancelledCurrentPage,
        limit: itemsPerPage,
        // Force status to be cancel-request to get cancelled requests
        status: 'cancel-request',
        // Use cancelRequestStatus for filtering pending/approved/rejected
        cancelRequestStatus: filters.status !== 'all' ? filters.status : undefined,
        city: filters.city || undefined,
        partner: partnerParam,
        assignedPartner: partnerParam,
        search: filters.searchTerm || undefined,
        ...dateParams
      });
      
      const rawRequestsData = response.data.leads || [];
      const totalCount = response.data.pagination?.total || rawRequestsData.length;
      const stats = response.data.stats || {};
      
      // Transform leads data to cancelled requests format
      const transformedRequests = rawRequestsData.map(lead => ({
        id: lead.id,
        leadId: lead.leadId,
        customerName: lead.user ? `${lead.user.firstName} ${lead.user.lastName}` : lead.name,
        customerEmail: lead.user?.email || lead.email,
        serviceType: lead.serviceType,
        city: lead.location?.city || lead.city,
        reason: lead.cancelReason || 'No reason provided',
        status: lead.cancelRequestStatus || 'pending', // pending, accepted, rejected
        createdAt: lead.cancelRequestDate || lead.createdAt,
        partner: lead.assignedPartner
      }));
      
      setCancelledRequests(transformedRequests);
      setTotalCancelRequests(totalCount);
      setCancelledRequestStats({
        total: totalCount,
        pending: stats.cancelRequestsPending || 0,
        approved: stats.cancelRequestsApproved || 0,
        rejected: stats.cancelRequestsRejected || 0
      });
    } catch (error) {
      console.error('Error loading cancelled requests:', error);
      // For demo purposes, set empty data
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
      // Use leads API to update cancel request status to rejected with reason
      await leadsAPI.updateLeadStatus(selectedCancelRequest.id, {
        cancelRequestStatus: 'rejected',
        cancelRejectionReason: rejectionReason
      });
      
      // Update the request status in the list
      setCancelledRequests(prev => prev.map(req => 
        req.id === selectedCancelRequest.id 
          ? { ...req, status: 'rejected', rejectionReason: rejectionReason }
          : req
      ));
      
      toast.success(isGerman ? 'Stornierungsanfrage abgelehnt' : 'Cancel request rejected');
      setShowRejectModal(false);
      setSelectedCancelRequest(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting cancel request:', error);
      
      // For demo purposes, still update the UI optimistically
      setCancelledRequests(prev => prev.map(req => 
        req.id === selectedCancelRequest.id 
          ? { ...req, status: 'rejected', rejectionReason: rejectionReason }
          : req
      ));
      
      toast.success((isGerman ? 'Stornierungsanfrage abgelehnt' : 'Cancel request rejected') + ' (' + (isGerman ? 'Demo-Modus' : 'Demo mode') + ')');
      setShowRejectModal(false);
      setSelectedCancelRequest(null);
      setRejectionReason('');
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
      assigned: 'bg-blue-100 text-blue-800', 
      accepted: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      assigned: '📋',
      accepted: '✅',
      cancelled: '❌',
      completed: '🎉'
    };
    return icons[status] || icons.pending;
  };

  const handleAcceptLead = async (leadId, partnerId) => {
    setLoading(true);
    try {
      await leadsAPI.accept(leadId);
      
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: 'accepted', acceptedPartner: { id: partnerId } }
          : lead
      ));
      
      toast.success(isGerman ? 'Lead erfolgreich akzeptiert' : 'Lead accepted successfully');
    } catch (error) {
      console.error('Error accepting lead:', error);
      
      // For demo purposes, still update the UI optimistically
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: 'accepted', acceptedPartner: { id: partnerId } }
          : lead
      ));
      
      toast.success((isGerman ? 'Lead akzeptiert' : 'Lead accepted') + ' (' + (isGerman ? 'Demo-Modus' : 'Demo mode') + ')');
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
      
      // Update lead status to cancel-request
      setLeads(prev => prev.map(lead => 
        lead.id === selectedCancelLead.id 
          ? { ...lead, status: 'cancel-request', cancelReason: cancelReason }
          : lead
      ));
      
      toast.success(isGerman ? 'Stornierungsanfrage gesendet' : 'Cancel request sent');
      setShowCancelModal(false);
      setSelectedCancelLead(null);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling lead:', error);
      
      // For demo purposes, still update the UI optimistically
      setLeads(prev => prev.map(lead => 
        lead.id === selectedCancelLead.id 
          ? { ...lead, status: 'cancel-request', cancelReason: cancelReason }
          : lead
      ));
      
      toast.success((isGerman ? 'Stornierungsanfrage gesendet' : 'Cancel request sent') + ' (' + (isGerman ? 'Demo-Modus' : 'Demo mode') + ')');
      setShowCancelModal(false);
      setSelectedCancelLead(null);
      setCancelReason('');
    } finally {
      setLoading(false);
    }
  };

  // Handle accept cancel request
  const handleAcceptCancelRequest = async (request) => {
    setLoading(true);
    try {
      // Use leads API to update cancel request status to accepted
      await leadsAPI.updateLeadStatus(request.id, {
        cancelRequestStatus: 'accepted'
      });
      
      // Update the request status in the list
      setCancelledRequests(prev => prev.map(req => 
        req.id === request.id 
          ? { ...req, status: 'accepted' }
          : req
      ));
      
      toast.success(isGerman ? 'Stornierungsanfrage akzeptiert' : 'Cancel request accepted');
    } catch (error) {
      console.error('Error accepting cancel request:', error);
      
      // For demo purposes, still update the UI optimistically
      setCancelledRequests(prev => prev.map(req => 
        req.id === request.id 
          ? { ...req, status: 'accepted' }
          : req
      ));
      
      toast.success((isGerman ? 'Stornierungsanfrage akzeptiert' : 'Cancel request accepted') + ' (' + (isGerman ? 'Demo-Modus' : 'Demo mode') + ')');
    } finally {
      setLoading(false);
    }
  };


  // Apply filters to leads using useMemo for performance
  const currentLeads = useMemo(() => {
    // Since API handles all filtering, return leads directly without client-side filtering
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
        // Handle other objects by showing key-value pairs in a simple table
        const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined);
        if (entries.length > 0 && entries.length <= 6) {
          return (
            <div className="rounded-md p-3 mt-1" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
              <table className="w-full text-sm">
                <tbody>
                  {entries.map(([k, v]) => {
                    const label = k.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
                    const val = renderValue(v, depth + 1);
                    return (
                      <tr key={k}>
                        <td className="py-1 pr-3 font-medium" style={{ color: 'var(--theme-muted)', minWidth: '120px' }}>
                          {label}:
                        </td>
                        <td className="py-1" style={{ color: 'var(--theme-text)' }}>
                          {val}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
    // Hide contact info for partners until lead is accepted
    if (isContactInfo && isPartner && leadForDetails?.status !== 'accepted') {
      return (
        <tr>
          <td className="px-6 py-3 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)', width: '200px', minWidth: '200px' }}>
            {label}:
          </td>
          <td className="px-6 py-3 text-sm" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
            {isGerman ? 'Details nach Akzeptanz verfügbar' : 'Details available after acceptance'}
          </td>
        </tr>
      );
    }

    return (
      <tr>
        <td className="px-6 py-3 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)', width: '200px', minWidth: '200px' }}>
          {label}:
        </td>
        <td className="px-6 py-3 text-sm" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
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
              {isGerman ? 'Lead-Verwaltung' : 'Lead Management'}
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
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
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
                  {isSuperAdmin && <option value="assigned">{isGerman ? 'Zugewiesen' : 'Assigned'}</option>}
                  <option value="accepted">{isGerman ? 'Akzeptiert' : 'Accepted'}</option>
                  <option value="cancelled">{isGerman ? 'Storniert' : 'Cancelled'}</option>
                  <option value="cancel-request">{isGerman ? 'Stornierungsanfrage' : 'Cancel Request'}</option>
                </>
              ) : (
                <>
                  <option value="pending">{isGerman ? 'Ausstehend' : 'Pending'}</option>
                  <option value="accepted">{isGerman ? 'Genehmigt' : 'Approved'}</option>
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

          {/* Partner Filter */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isGerman ? 'Partner suchen...' : 'Search partner...'}
              value={partnerSearchText}
              onChange={(e) => {
                setPartnerSearchText(e.target.value);
                setShowPartnerSuggestions(true);
                // Clear filter if input is empty
                if (e.target.value === '') {
                  setFilters(prev => ({ ...prev, partner: 'all' }));
                }
              }}
              onFocus={() => {
                setShowPartnerSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowPartnerSuggestions(false), 200);
              }}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)'
              }}
            />
            
            {/* Partner Suggestions Dropdown - styled like select dropdown */}
            {showPartnerSuggestions && (
              <div
                className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
              >
                {/* All Partners Option */}
                <div
                  className="px-3 py-2 cursor-pointer text-sm"
                  style={{ 
                    color: 'var(--theme-text)',
                    backgroundColor: 'var(--theme-input-bg)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#3B82F6';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--theme-input-bg)';
                    e.target.style.color = 'var(--theme-text)';
                  }}
                  onClick={() => {
                    setPartnerSearchText('');
                    setFilters(prev => ({ ...prev, partner: 'all' }));
                    setShowPartnerSuggestions(false);
                  }}
                >
                  {isGerman ? 'Alle Partner' : 'All Partners'}
                </div>
                
                {/* Unassigned Option - only show for leads tab */}
                {activeTab === 'leads' && (
                  <div
                    className="px-3 py-2 cursor-pointer text-sm"
                    style={{ 
                      color: 'var(--theme-text)',
                      backgroundColor: 'var(--theme-input-bg)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#3B82F6';
                      e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'var(--theme-input-bg)';
                      e.target.style.color = 'var(--theme-text)';
                    }}
                    onClick={() => {
                      setPartnerSearchText(isGerman ? 'Nicht zugewiesen' : 'Unassigned');
                      setFilters(prev => ({ ...prev, partner: 'unassigned' }));
                      setShowPartnerSuggestions(false);
                    }}
                  >
                    {isGerman ? 'Nicht zugewiesen' : 'Unassigned'}
                  </div>
                )}
                
                {/* Partner Suggestions - only show after 4 characters */}
                {partnerSearchText.length >= 4 && allPartners
                  .filter(partner => 
                    partner.companyName.toLowerCase().includes(partnerSearchText.toLowerCase())
                  )
                  .map(partner => (
                    <div
                      key={partner._id}
                      className="px-3 py-2 cursor-pointer text-sm"
                      style={{ 
                        color: 'var(--theme-text)',
                        backgroundColor: 'var(--theme-input-bg)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#3B82F6';
                        e.target.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'var(--theme-input-bg)';
                        e.target.style.color = 'var(--theme-text)';
                      }}
                      onClick={() => {
                        setPartnerSearchText(partner.companyName);
                        setFilters(prev => ({ ...prev, partner: partner._id }));
                        setShowPartnerSuggestions(false);
                      }}
                    >
                      {partner.companyName}
                    </div>
                  ))}
                
                {/* No results message */}
                {partnerSearchText.length >= 4 && 
                 allPartners.filter(partner => 
                   partner.companyName.toLowerCase().includes(partnerSearchText.toLowerCase())
                 ).length === 0 && (
                  <div className="px-3 py-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                    {isGerman ? 'Keine Partner gefunden' : 'No partners found'}
                  </div>
                )}
              </div>
            )}
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
          { label: translateStatus('pending'), value: isPartner ? (leadStats.pending || 0) + (leadStats.assigned || 0) : leadStats.pending, icon: '⏳', color: 'yellow' },
          ...(isSuperAdmin ? [{ label: translateStatus('assigned'), value: leadStats.assigned, icon: '👤', color: 'blue' }] : []),
          { label: translateStatus('accepted'), value: leadStats.accepted, icon: '✅', color: 'green' },
          { label: translateStatus('cancelled'), value: leadStats.cancelled || 0, icon: '❌', color: 'red' }
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
                {isSuperAdmin && (
                  <SortableHeader sortKey="assignedPartner">
                    {t('leads.assignedPartner')}
                  </SortableHeader>
                )}
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
                      {(isPartner && lead.status === 'accepted') || isSuperAdmin ? (
                        <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                          {lead.email}
                        </div>
                      ) : (
                        <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Details nach Akzeptanz' : 'Details after acceptance'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                    {lead.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(lead.status)}`}>
                      {translateStatus(lead.status)}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                      {lead.status === 'accepted' && lead.acceptedPartner ? (
                        // Show only the accepted partner when accepted
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ {lead.acceptedPartner.companyName}
                          </span>
                        </div>
                      ) : lead.assignedPartners && Array.isArray(lead.assignedPartners) && lead.assignedPartners.length > 0 ? (
                        // Show multiple assigned partners
                        <div className="flex flex-wrap gap-1">
                          {lead.assignedPartners.slice(0, 2).map((partner, index) => (
                            <span
                              key={partner._id || index}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                partner.partnerType === 'exclusive'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {partner.partnerType === 'exclusive' && '👑'} {partner.companyName}
                            </span>
                          ))}
                          {lead.assignedPartners.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              +{lead.assignedPartners.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : lead.assignedPartner?.companyName || lead.partnerName ? (
                        // Show single assigned partner (legacy support)
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {lead.assignedPartner?.companyName || lead.partnerName}
                          </span>
                        </div>
                      ) : (
                        // Unassigned
                        <span className="text-gray-500 italic">
                          {isGerman ? 'Nicht zugewiesen' : 'Unassigned'}
                        </span>
                      )}
                    </td>
                  )}
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
                      {isSuperAdmin && lead.status === 'pending' && (
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
                      {isPartner && lead.status === 'assigned' && (
                        <>
                          {/* Cancel Lead button */}
                          <button
                            onClick={() => handleCancelLead(lead)}
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
                            ❌ {isGerman ? 'Stornieren' : 'Cancel Lead'}
                          </button>
                          {/* Accept Lead button */}
                          <button
                            onClick={() => handleAcceptLead(lead.id, user.id)}
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
                            ✅ {t('leads.acceptLead')}
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
                    {t('common.city')}
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
                    <td colSpan="7" className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
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
                        {request.serviceType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        {request.city}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--theme-text)' }}>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {request.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status === 'pending' ? (isGerman ? 'Ausstehend' : 'Pending') :
                           request.status === 'accepted' ? (isGerman ? 'Akzeptiert' : 'Accepted') :
                           request.status === 'rejected' ? (isGerman ? 'Abgelehnt' : 'Rejected') :
                           request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                        {new Date(request.createdAt).toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedCancelRequest(request)}
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
                    <td colSpan="8" className="px-6 py-12 text-center">
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

      {/* Conditional rendering for table vs lead details */}
      {currentView === 'details' && leadForDetails && (
        <motion.div
          className="mt-6 overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >

          {/* Lead Details - 2 Column Layout */}
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Customer Information */}
              <div>
                <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                  {t('leads.customerInfo')}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
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
                <div className="overflow-x-auto">
                  <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
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
                      {leadForDetails.assignedPartner && (
                        <TableRow 
                          label={t('leads.assignedPartner')}
                          value={leadForDetails.assignedPartner.companyName || leadForDetails.assignedPartner}
                        />
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Form Data and User Details - 2 Column Layout */}
          {((leadForDetails.formData && Object.keys(leadForDetails.formData).length > 0) || leadForDetails.user) && (
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Form Data */}
                {leadForDetails.formData && Object.keys(leadForDetails.formData).length > 0 && (
                  <div>
                    <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Formulardetails' : 'Form Details'}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
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
                      <div className="overflow-x-auto mb-6">
                        <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
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
      )}

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
                    {t('leads.rejectCancelRequest')}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {selectedCancelRequest?.leadId}
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
                  onClick={confirmRejectCancelRequest}
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
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
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

              {/* Available Partners */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: 'var(--theme-text)' }}>
                    Available Partners ({filteredPartners.length})
                  </h3>
                </div>

                {/* Partner Filter Tabs */}
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
                      Basic ({availablePartners.filter(p => p.partnerType === 'basic').length})
                    </button>
                    <button
                      onClick={() => handlePartnerFilterChange('exclusive')}
                      className={`px-6 py-3 font-medium transition-colors ${
                        partnerFilter === 'exclusive'
                          ? 'border-b-2 border-blue-500 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Exclusive ({availablePartners.filter(p => p.partnerType === 'exclusive').length})
                    </button>
                    <button
                      onClick={() => handlePartnerFilterChange('search')}
                      className={`px-6 py-3 font-medium transition-colors ${
                        partnerFilter === 'search'
                          ? 'border-b-2 border-green-500 text-green-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      disabled={searchLoading}
                    >
                      🔍 Search {searchLoading ? '...' : ''}
                    </button>
                  </div>

                  {/* Search Input - only show in search tab */}
                  {partnerFilter === 'search' && (
                    <div className="mt-4 mb-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search partners..."
                          value={partnerSearchQuery}
                          onChange={handleSearchInputChange}
                          className="w-full px-4 py-2 pl-10 text-sm rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--theme-input-bg)',
                            borderColor: 'var(--theme-border)',
                            color: 'var(--theme-text)'
                          }}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
                      {partnerSearchQuery.trim() && (
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                            {searchLoading ? 'Searching...' : (
                              `${filteredPartners.length} result${filteredPartners.length !== 1 ? 's' : ''} found${
                                allActivePartners.length === 0 && filteredPartners.length > 0 
                                  ? ' (limited to available partners)' 
                                  : ''
                              }`
                            )}
                          </p>
                          {partnerSearchQuery.trim() && (
                            <button
                              onClick={() => setPartnerSearchQuery('')}
                              className="text-xs px-2 py-1 rounded transition-colors hover:bg-gray-100"
                              style={{ color: 'var(--theme-muted)' }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {partnersLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="font-medium" style={{ color: 'var(--theme-text)' }}>Loading partners...</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--theme-muted)' }}>Finding the best matches for your lead</p>
                  </div>
                ) : filteredPartners.length === 0 ? (
                  <div className="text-center py-12">
                    {partnerFilter === 'search' && !partnerSearchQuery.trim() ? (
                      // Search empty state - minimal design
                      <div className="py-8">
                        <div className="text-center">
                          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--theme-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                          </svg>
                          <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                            Start typing to search all active partners
                          </p>
                        </div>
                      </div>
                    ) : (
                      // No results state  
                      <div>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                          <svg className="w-8 h-8" style={{ color: 'var(--theme-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                        </div>
                        <p className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                          {partnerFilter === 'search' && partnerSearchQuery.trim() 
                            ? 'No Search Results'
                            : `No ${partnerFilter === 'basic' ? 'Basic' : 'Exclusive'} Partners`}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                          {partnerFilter === 'search' && partnerSearchQuery.trim()
                            ? `No partners found matching "${partnerSearchQuery}"`
                            : `No ${partnerFilter} partners match this lead's requirements`}
                        </p>
                      </div>
                    )}
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
                                  {partner.currentWeekLeads || 0}/{partner.averageLeadsPerWeek || 'N/A'}
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

    </div>
  );
};

export default LeadManagement;