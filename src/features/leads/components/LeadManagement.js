import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useService } from '../../../contexts/ServiceContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { leadsAPI, partnersAPI, settingsAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';
import Pagination from '../../../components/ui/Pagination';
import LeadDetailsDialog from '../../../components/ui/LeadDetailsDialog';

const LeadManagement = ({ initialLeads = [], initialStats = {} }) => {
  const router = useRouter();
  const { currentService } = useService();
  const { t, isGerman } = useLanguage();
  const { user, isSuperAdmin, isPartner } = useAuth();
  
  const [leads, setLeads] = useState(initialLeads); // Paginated leads for table display
  const [allLeadsData, setAllLeadsData] = useState([]); // All leads data for filtering and stats
  const [totalLeads, setTotalLeads] = useState(0);
  // Removed totalCancelRequests state
  const [leadStats, setLeadStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    accepted: 0,
    cancelled: 0,
    rejected: 0,
    cancelRequests: 0
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
  const [adminSettings, setAdminSettings] = useState(null);
  
  // Cancel lead states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelLead, setSelectedCancelLead] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Partners for filtering
  const [allPartners, setAllPartners] = useState([]);
  const [currentView, setCurrentView] = useState('table'); // 'table' or 'details'
  const [leadForDetails, setLeadForDetails] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  
  // Initialize activeTab based on URL filter
  const getInitialActiveTab = () => {
    const urlFilter = router.query.filter;
    return urlFilter === 'cancelled' ? 'cancelRequests' : 'leads';
  };

  // Add activeTab state for leads and cancelled requests tabs
  const [activeTab, setActiveTab] = useState(getInitialActiveTab());
  const [selectedCancelRequest, setSelectedCancelRequest] = useState(null);
  const [selectedRejectLead, setSelectedRejectLead] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Partner Assignment Dialog state
  const [showPartnerAssignmentDialog, setShowPartnerAssignmentDialog] = useState(false);
  const [selectedLeadForPartners, setSelectedLeadForPartners] = useState(null);

  // Helper function to get current partner's assignment status
  const getPartnerAssignmentStatus = (lead) => {
    if (!isPartner || !user?.id) return null;

    // IMPORTANT: For duplicate lead rows, we've already set the correct status during transformation
    // Each row represents a specific assignment, so we use the row's status directly
    const status = lead.partnerStatus || lead.status || 'pending';

    // Also get the assignment object for cancellation info if available
    let currentPartnerAssignment = null;
    const assignments = Array.isArray(lead.partnerAssignments) ? lead.partnerAssignments : [];

    if (assignments.length > 0) {
      currentPartnerAssignment = assignments.find(assignment =>
        assignment.partner === user.id ||
        assignment.partner === user.id.toString() ||
        assignment.partner?._id === user.id ||
        assignment.partner?._id === user.id.toString()
      );
    }

    return {
      assignment: currentPartnerAssignment,
      status: status,
      isAccepted: status === 'accepted',
      isRejected: status === 'rejected',
      isCancellationRequested: status === 'cancellationRequested' ||
                              status === 'cancel_requested' ||
                              currentPartnerAssignment?.cancellationRequested === true
    };
  };
  
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
  
  // Initialize filter states from URL query params
  const getInitialFilters = () => {
    const urlFilter = router.query.filter;
    let initialStatus = 'all';

    if (urlFilter === 'pending') {
      initialStatus = 'pending';
    } else if (urlFilter === 'accepted') {
      initialStatus = 'accepted';
    }

    return {
      status: initialStatus,
      city: '',
      partner: 'all',
      searchTerm: ''
    };
  };

  // Filter states
  const [filters, setFilters] = useState(getInitialFilters());

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

  // Handle URL filter parameters - run this BEFORE data loading
  useEffect(() => {
    if (router.query.filter) {
      const urlFilter = router.query.filter;

      // Map dashboard filter values to lead status values
      if (urlFilter === 'pending') {
        setActiveTab('leads'); // Make sure we're on leads tab
        setFilters(prev => ({ ...prev, status: 'pending' }));
        setCurrentPage(1); // Reset to page 1
      } else if (urlFilter === 'accepted') {
        setActiveTab('leads'); // Make sure we're on leads tab
        setFilters(prev => ({ ...prev, status: 'accepted' }));
        setCurrentPage(1); // Reset to page 1
      } else if (urlFilter === 'cancelled') {
        // For cancelled, switch to cancel requests tab
        setActiveTab('cancelRequests');
      }
    } else if (router.query.tab === 'leads' && !router.query.filter) {
      // If navigating to leads tab without filter, reset to 'all'
      setActiveTab('leads');
      setFilters(prev => ({ ...prev, status: 'all' }));
    }
  }, [router.query.filter, router.query.tab]);

  // Filter partners based on selected tab and search query
  const filteredPartners = useMemo(() => {
    let sourcePartners = [];

    if (partnerFilter === 'search') {
      // For search, use allActivePartners to allow searching ALL partners, not just suggested ones
      // However, we'll enrich the data: if a partner exists in suggested partners, use that version (with correct stats)
      const combinedSuggestedPartners = [
        ...(partnerTabs.basic.partners || []),
        ...(partnerTabs.exclusive.partners || [])
      ];

      // Create a map of suggested partners by ID for quick lookup
      const suggestedPartnersMap = new Map();
      combinedSuggestedPartners.forEach(partner => {
        suggestedPartnersMap.set(partner._id?.toString() || partner.partnerId, partner);
      });

      // Use allActivePartners for search, but replace with suggested partner data if available
      sourcePartners = (allActivePartners || []).map(partner => {
        const partnerId = partner._id?.toString() || partner.partnerId;
        // If this partner is in suggested list, use the suggested version (has correct stats)
        return suggestedPartnersMap.get(partnerId) || partner;
      });

      console.log('Using search mode, sourcePartners count:', sourcePartners.length,
                  '(from allActive:', (allActivePartners || []).length,
                  ', enriched from suggested:', suggestedPartnersMap.size, ')');

      // Apply search query for search tab only
      if (partnerSearchQuery.trim()) {
        const query = partnerSearchQuery.toLowerCase().trim();

        sourcePartners = sourcePartners.filter(partner => {
          const companyMatch = partner.companyName?.toLowerCase().includes(query);
          const partnerIdMatch = partner.partnerId?.toLowerCase().includes(query);
          const firstNameMatch = partner.contactPerson?.firstName?.toLowerCase().includes(query);
          const lastNameMatch = partner.contactPerson?.lastName?.toLowerCase().includes(query);
          const emailMatch = partner.contactPerson?.email?.toLowerCase().includes(query);
          const fullNameMatch = `${partner.contactPerson?.firstName || ''} ${partner.contactPerson?.lastName || ''}`.toLowerCase().includes(query);

          const matches = companyMatch || partnerIdMatch || firstNameMatch || lastNameMatch || emailMatch || fullNameMatch;

          // Debug logging for search issues
          if (query.includes('abc') && partner.companyName?.toLowerCase().includes('abc')) {
            console.log('Search Debug:', {
              query,
              partner: partner.companyName,
              partnerId: partner.partnerId,
              companyMatch,
              matches
            });
          }

          return matches;
        });
      }
    } else if (partnerFilter === 'basic') {
      // Use suggested basic partners from API - NO search filtering
      sourcePartners = partnerTabs.basic.partners || [];
      console.log('Using basic tab, sourcePartners count:', sourcePartners.length);
    } else if (partnerFilter === 'exclusive') {
      // Use suggested exclusive partners from API - NO search filtering
      sourcePartners = partnerTabs.exclusive.partners || [];
      console.log('Using exclusive tab, sourcePartners count:', sourcePartners.length);
    } else {
      // Fallback to legacy availablePartners if needed
      sourcePartners = availablePartners || [];
      console.log('Using fallback, sourcePartners count:', sourcePartners.length);
    }

    // For search partners, filter by service type AND partner type based on selected tab
    if (partnerFilter === 'search' && selectedLead) {
      // First filter by service type to match the current lead
      sourcePartners = sourcePartners.filter(partner => {
        const hasServices = partner.services && Array.isArray(partner.services);
        const matchesService = hasServices && partner.services.includes(selectedLead.serviceType);
        const matchesServiceType = partner.serviceType === selectedLead.serviceType;

        console.log(`Service filtering for ${partner.companyName}:`, {
          leadServiceType: selectedLead.serviceType,
          partnerServices: partner.services,
          partnerServiceType: partner.serviceType,
          matchesService,
          matchesServiceType,
          shouldInclude: matchesService || matchesServiceType
        });

        return matchesService || matchesServiceType;
      });

      console.log(`After service filtering: ${sourcePartners.length} partners for service: ${selectedLead.serviceType}`);
    }

    // Apply partner type filtering for basic and exclusive tabs (including search mode)
    if (partnerFilter === 'basic' || partnerFilter === 'exclusive') {
      // Filter by partner type when using basic or exclusive tabs
      const targetPartnerType = partnerFilter; // 'basic' or 'exclusive'

      sourcePartners = sourcePartners.filter(partner => {
        const matchesPartnerType = partner.partnerType === targetPartnerType;

        console.log(`Partner type filtering for ${partner.companyName}:`, {
          partnerType: partner.partnerType,
          targetType: targetPartnerType,
          matches: matchesPartnerType
        });

        return matchesPartnerType;
      });

      console.log(`After partner type filtering (${targetPartnerType}): ${sourcePartners.length} partners`);
    }

    // Calculate weekly leads for all filtered partners if admin settings available
    if (selectedLead && adminSettings && (partnerFilter === 'search' || partnerFilter === 'basic' || partnerFilter === 'exclusive')) {
      sourcePartners = sourcePartners.map(partner => {
        // If partner already has averageLeadsPerWeek, use it
        if (partner.averageLeadsPerWeek !== undefined) {
          return partner;
        }

        // Apply the same priority logic as backend:
        // 1. Check customPricing.leadsPerWeek
        // 2. Fall back to admin settings leadDistribution[serviceType][partnerType].leadsPerWeek
        // 3. Use default fallback of 5
        let avgLeadsPerWeek = 5; // Default fallback

        // Debug PTRCLNMAK specifically
        if (partner.partnerId === 'PTRCLNMAK') {
          console.log('🔍 FRONTEND PTRCLNMAK DEBUG:', {
            companyName: partner.companyName,
            hasAverageLeadsPerWeek: partner.averageLeadsPerWeek !== undefined,
            backendValue: partner.averageLeadsPerWeek,
            customPricing: partner.customPricing,
            adminSettings: adminSettings?.leadDistribution?.cleaning?.basic
          });
        }

        if (partner.customPricing?.leadsPerWeek) {
          avgLeadsPerWeek = partner.customPricing.leadsPerWeek;
          console.log(`Partner ${partner.companyName} using custom pricing: ${avgLeadsPerWeek} leads/week`);
        } else if (adminSettings.leadDistribution && selectedLead.serviceType && partner.partnerType) {
          const defaultWeekly = adminSettings.leadDistribution[selectedLead.serviceType]?.[partner.partnerType]?.leadsPerWeek;

          // Debug logging to understand the issue
          if (partner.partnerId === 'PTRCLNMAK') {
            console.log('🔍 PTRCLNMAK ADMIN LOOKUP:', {
              adminSettingsExists: !!adminSettings.leadDistribution,
              serviceType: selectedLead.serviceType,
              partnerType: partner.partnerType,
              lookupPath: `${selectedLead.serviceType}.${partner.partnerType}.leadsPerWeek`,
              adminValue: defaultWeekly,
              fullPath: adminSettings.leadDistribution[selectedLead.serviceType]
            });
          }

          console.log(`Debug for ${partner.companyName}:`, {
            serviceType: selectedLead.serviceType,
            partnerType: partner.partnerType,
            adminSettings: adminSettings.leadDistribution,
            lookupPath: `${selectedLead.serviceType}.${partner.partnerType}.leadsPerWeek`,
            defaultWeekly: defaultWeekly,
            hasAdminSettings: !!adminSettings.leadDistribution,
            hasServiceType: !!selectedLead.serviceType,
            hasPartnerType: !!partner.partnerType
          });

          if (defaultWeekly) {
            avgLeadsPerWeek = defaultWeekly;
            console.log(`Partner ${partner.companyName} using admin settings: ${avgLeadsPerWeek} leads/week`);
          } else {
            console.log(`Partner ${partner.companyName} - no admin settings found, using default: ${avgLeadsPerWeek} leads/week`);
          }
        } else {
          console.log(`Partner ${partner.companyName} - conditions not met:`, {
            hasAdminSettings: !!adminSettings.leadDistribution,
            hasServiceType: !!selectedLead.serviceType,
            hasPartnerType: !!partner.partnerType
          });
        }

        return {
          ...partner,
          averageLeadsPerWeek: avgLeadsPerWeek
        };
      });

      console.log('Enhanced partners with weekly leads calculation:', sourcePartners.slice(0, 3));
    }

    return sourcePartners;
  }, [partnerTabs, allActivePartners, availablePartners, partnerFilter, partnerSearchQuery, selectedLead, adminSettings]);

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
      return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    if (!lead) {
      toast.error(isGerman ? 'Fehler: Lead nicht gefunden' : 'Error: Lead not found');
      return;
    }

    try {
      setLoading(true);
      // Use originalLeadId for duplicate rows, otherwise use regular id
      const leadIdToFetch = lead.originalLeadId || lead.id;
      const response = await leadsAPI.getById(leadIdToFetch);

      // Handle the response structure from the updated backend
      const leadData = response.data.success ? response.data.lead : response.data;

      // For partners with duplicate leads, always show the ACCEPTED assignment in the dialog
      let partnerStatusToShow = lead.partnerStatus || leadData.partnerStatus;

      if (isPartner && user?.id && leadData.partnerAssignments && Array.isArray(leadData.partnerAssignments)) {
        // Find the accepted assignment for this partner
        const acceptedAssignment = leadData.partnerAssignments.find(assignment =>
          (assignment.partner === user.id ||
           assignment.partner === user.id.toString() ||
           assignment.partner?._id === user.id ||
           assignment.partner?._id === user.id.toString()) &&
          assignment.status === 'accepted'
        );

        // If there's an accepted assignment, use that status
        if (acceptedAssignment) {
          partnerStatusToShow = 'accepted';
        }
      }

      // Add partner-specific status if partner is viewing
      const transformedLead = {
        ...leadData,
        // Pass partner status for proper view access control
        partnerStatus: partnerStatusToShow,
        id: leadData._id || leadData.id,
        leadId: leadData.leadId || leadData.id,
        name: leadData.user ?
          `${leadData.user.firstName} ${leadData.user.lastName}`.trim() :
          (leadData.name || ''),
        email: leadData.user?.email || leadData.email || '',
        city: leadData.location?.city || leadData.city || '',
        // Always use the actual lead status in details dialog, not cancel request status
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
      // Show appropriate error message
      if (error.response?.status === 403) {
        toast.error(isGerman ? 'Zugriff verweigert - Sie haben keine Berechtigung für diesen Lead' : 'Access denied - You do not have permission for this lead');
      } else if (!error.response?.data?.message) {
        toast.error(isGerman ? 'Fehler beim Laden der Lead-Details' : 'Failed to load lead details');
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
    const leadId = lead?.id || lead?._id;
    if (!lead || !leadId) {
      toast.error(isGerman ? 'Fehler: Lead nicht gefunden' : 'Error: Lead not found');
      return;
    }

    console.log('🔍 LEAD ASSIGNMENTS DEBUG on open:', {
      leadId: lead.id,
      leadNumber: lead.leadNumber,
      partnerAssignments: lead.partnerAssignments,
      assignmentCount: lead.partnerAssignments?.length || 0
    });

    try {
      setSelectedLead(lead);
      setPartnersLoading(true);
      setShowAssignModal(true);
      setSelectedPartners([]);
      setPartnerSearchQuery(''); // Reset search query

      // Get available partners for this lead
      console.log('Calling getAvailablePartners with leadId:', leadId);
      const response = await leadsAPI.getAvailablePartners(leadId);
      const data = response.data;

      console.log('API Response:', {
        success: data.success,
        basicCount: data.partnerTabs?.basic?.count,
        exclusiveCount: data.partnerTabs?.exclusive?.count,
        basicPartners: data.partnerTabs?.basic?.partners?.length,
        exclusivePartners: data.partnerTabs?.exclusive?.partners?.length
      });

      // Update state with new API response structure
      const partnerTabsData = data.partnerTabs || { basic: { partners: [], count: 0 }, exclusive: { partners: [], count: 0 } };
      setPartnerTabs(partnerTabsData);

      // Hide tabs if there are no suggested partners (both basic and exclusive counts are 0)
      const hasPartners = (partnerTabsData.basic?.count || 0) > 0 || (partnerTabsData.exclusive?.count || 0) > 0;
      setShowTabs(data.showTabs !== false && hasPartners);
      setDefaultTab(data.defaultTab || 'basic');
      setAvailablePartners(data.availablePartners || []);

      // Always fetch allActivePartners for search functionality
      // This is especially important when there are no suggested partners
      if (data.allActivePartners) {
        setAllActivePartners(data.allActivePartners);
      }

      // Always fetch allActivePartners to ensure search works even with 0 suggested partners
      console.log('Fetching all active partners for search functionality...');
      fetchAllActivePartners();

      // Fetch admin settings for weekly leads calculation
      fetchAdminSettings();

      // Set the appropriate tab based on API response
      if (data.showTabs && data.defaultTab) {
        setPartnerFilter(data.defaultTab);
      } else if (!data.showTabs) {
        // No tabs - go directly to search from all active partners
        setPartnerFilter('search');
      } else {
        setPartnerFilter('basic'); // Fallback
      }

      // Log debug info for the assignment modal
      console.log('Assignment modal data:', {
        leadId: lead.id,
        showTabs: data.showTabs,
        defaultTab: data.defaultTab,
        basicPartnersCount: data.partnerTabs?.basic?.count || 0,
        exclusivePartnersCount: data.partnerTabs?.exclusive?.count || 0,
        allActivePartnersCount: data.allActivePartners?.length || allActivePartners.length
      });
      
      // No need to show toast error - the dialog already displays this information clearly
    } catch (error) {
      console.error('Error fetching available partners:', error);
      toast.error(error.response?.data?.message || 'Failed to load available partners');
    } finally {
      setPartnersLoading(false);
    }
  };

  // Fetch admin settings for weekly leads calculation
  const fetchAdminSettings = async () => {
    if (adminSettings) return; // Already fetched

    try {
      console.log('Fetching admin settings for weekly leads calculation...');
      const response = await settingsAPI.get();
      console.log('Admin settings response:', response.data);
      setAdminSettings(response.data);
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      // Set empty settings as fallback
      setAdminSettings({ leadDistribution: {} });
    }
  };

  // Fetch all active partners for search
  const fetchAllActivePartners = async () => {
    if (allActivePartners.length > 0) return; // Already fetched

    try {
      setSearchLoading(true);
      console.log('Fetching all active partners for search...', { currentService });

      // Use the new partner search endpoint that's available to all authenticated users
      const response = await partnersAPI.search({
        status: 'active',
        limit: 1000,
        page: 1
      });

      console.log('Partner search response:', response.data);

      const partners = response.data.partners || response.data || [];

      // Debug: Log all partners to understand structure
      console.log('All partners from API:', partners.slice(0, 3));
      console.log('Current service for filtering:', currentService || 'moving');

      const filteredByService = partners.filter(partner => {
        // More flexible service filtering
        const hasServices = partner.services && Array.isArray(partner.services);
        const matchesService = hasServices && partner.services.includes(currentService || 'moving');

        // Also check serviceType field as fallback
        const matchesServiceType = partner.serviceType === (currentService || 'moving');

        // For moving service, also accept partners without specific service filtering
        const isMovingService = (currentService || 'moving') === 'moving';
        const isActivePartner = partner.status === 'active';

        const shouldInclude = matchesService || matchesServiceType || (isMovingService && isActivePartner);

        // Debug specific partners
        if (partner.companyName && partner.companyName.toLowerCase().includes('xyz')) {
          console.log('Debug xyz company partner:', {
            companyName: partner.companyName,
            services: partner.services,
            serviceType: partner.serviceType,
            status: partner.status,
            currentService: currentService || 'moving',
            hasServices,
            matchesService,
            matchesServiceType,
            shouldInclude
          });
        }

        return shouldInclude;
      });

      console.log('Filtered partners by service:', {
        totalPartners: partners.length,
        filteredCount: filteredByService.length,
        currentService: currentService || 'moving',
        samplePartner: filteredByService[0]
      });

      setAllActivePartners(filteredByService);
    } catch (error) {
      console.error('Error fetching all active partners:', error);
      
      // Fallback: Try the superadmin endpoint if user is superadmin
      try {
        if (isSuperAdmin) {
          console.log('Trying fallback: superadmin getAll endpoint...');
          const response = await partnersAPI.getAll({
            status: 'active',
            limit: 1000,
            page: 1
          });

          const partners = response.data.partners || response.data || [];
          console.log('Fallback partners from getAll:', partners.slice(0, 3));

          const filteredByService = partners.filter(partner => {
            // Use same improved filtering logic as above
            const hasServices = partner.services && Array.isArray(partner.services);
            const matchesService = hasServices && partner.services.includes(currentService || 'moving');
            const matchesServiceType = partner.serviceType === (currentService || 'moving');
            const isMovingService = (currentService || 'moving') === 'moving';
            const isActivePartner = partner.status === 'active';

            return matchesService || matchesServiceType || (isMovingService && isActivePartner);
          });

          console.log('Fallback filtered partners count:', filteredByService.length);
          setAllActivePartners(filteredByService);
        } else {
          // Last fallback: use availablePartners (limited search)
          console.log('Using availablePartners as fallback...');
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
    // Don't clear search query when switching to search tab
    if (filter !== 'search') {
      setPartnerSearchQuery(''); // Clear search when switching to Basic/Exclusive tabs
    }
    setSelectedPartners([]); // Clear selected partners when switching tabs
    if (filter === 'search' && allActivePartners.length === 0) {
      fetchAllActivePartners();
    }
  };

  // Handle search input change
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setPartnerSearchQuery(value);

    // Fetch all active partners when user starts typing for search functionality
    if (value.trim().length > 0) {
      // Fetch all active partners if not already loaded
      if (allActivePartners.length === 0) {
        fetchAllActivePartners();
      }
      // Auto-switch to search tab when user starts typing
      setPartnerFilter('search');
    } else {
      // Switch back to default tab when search is cleared
      setPartnerFilter(defaultTab);
    }
  };

  // Handle partner selection with mutual exclusion logic
  const handlePartnerSelect = (partner) => {
    const isExclusive = partner.partnerType === 'exclusive';

    setSelectedPartners(prev => {
      if (isExclusive) {
        // If selecting an exclusive partner, clear all previous selections
        // and only allow this exclusive partner (single selection only)
        if (prev.includes(partner._id)) {
          // If already selected, deselect it
          return [];
        } else {
          // Select only this exclusive partner, clear all others
          return [partner._id];
        }
      } else {
        // For basic partners
        // First check if any exclusive partners are currently selected
        const hasExclusiveSelected = prev.some(selectedId => {
          // Find the partner by ID to check its type
          const selectedPartner = [...(partnerTabs.basic.partners || []), ...(partnerTabs.exclusive.partners || []), ...(allActivePartners || [])]
            .find(p => p._id === selectedId);
          return selectedPartner && selectedPartner.partnerType === 'exclusive';
        });

        if (hasExclusiveSelected) {
          // If exclusive partner is already selected, clear all and select this basic partner
          return [partner._id];
        } else {
          // Normal basic partner multiple selection
          if (prev.includes(partner._id)) {
            return prev.filter(id => id !== partner._id);
          } else {
            return [...prev, partner._id];
          }
        }
      }
    });
  };

  // Handle lead assignment
  const handleConfirmAssignment = async () => {
    // Prevent multiple simultaneous assignment attempts
    if (assigningLead) {
      return;
    }

    if (selectedPartners.length === 0) {
      toast.error('Please select at least one partner');
      return;
    }

    try {
      setAssigningLead(true);

      // For now, assign to the first selected partner (API supports single assignment)
      const partnerId = selectedPartners[0];
      const response = await leadsAPI.assign(selectedLead.id, partnerId);

      console.log('Assignment response:', response.data); // Debug log

      if (response.data.success) {
        // Dismiss any previous error toasts before showing success
        toast.dismiss();

        // Show success message
        toast.success(isGerman ? 'Lead erfolgreich zugewiesen' : 'Lead assigned successfully');

        // Show capacity info if exists
        if (response.data.capacityInfo) {
          // Translate the capacity message
          let capacityMessage = response.data.capacityInfo;
          const isOverCapacity = capacityMessage.includes('at/over capacity');

          if (isGerman) {
            // Parse the numbers from the message
            const match = capacityMessage.match(/(\d+)\/(\d+)/);
            if (match) {
              if (isOverCapacity) {
                capacityMessage = `Partner ist bei/über Kapazität: ${match[1]}/${match[2]} Leads diese Woche`;
              } else {
                capacityMessage = `Partner-Kapazität: ${match[1]}/${match[2]} Leads diese Woche`;
              }
            }
          }

          // Show capacity info with appropriate styling
          toast(capacityMessage, {
            duration: 6000,
            icon: isOverCapacity ? '⚠️' : 'ℹ️',
            style: isOverCapacity ? {
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #f59e0b'
            } : {
              background: '#dbeafe',
              color: '#1e40af',
              border: '1px solid #3b82f6'
            }
          });
        }

        // Close modal first for immediate feedback
        setShowAssignModal(false);
        setSelectedLead(null);
        setSelectedPartners([]);

        // Refresh leads data immediately - wrap in try-catch to prevent error toast after success
        try {
          await loadLeads();
        } catch (loadError) {
          console.error('Error reloading leads:', loadError);
          // Silently fail - assignment was successful, just reload failed
        }
      }
    } catch (error) {
      console.error('Error assigning lead:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign lead';
      toast.error(errorMessage);

      // Show business rule if available
      if (error.response?.data?.rule) {
        toast.error(error.response.data.rule, { duration: 5000 });
      }

      // Close modal and clear state
      setShowAssignModal(false);
      setSelectedLead(null);
      setSelectedPartners([]);
      setAvailablePartners([]);
      // Don't reload on error since no changes were made on the server
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
    const serviceToUse = currentService || 'moving';
    console.log('loadLeads called with currentService:', currentService, 'using:', serviceToUse);

    if (!serviceToUse) {
      console.warn('No service available, cannot load leads');
      return;
    }
    
    setLoading(true);
    try {
      // Prepare date parameters for API
      // Note: For complex date filtering (especially single date vs date ranges),
      // we rely more on client-side filtering to handle edge cases properly
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
      }
      // For single date filtering, we skip server-side filtering and rely on client-side
      // This allows us to properly handle cases where a single date falls within a lead's date range

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
      console.log('Date filter type:', dateFilter.type, 'dateParams:', dateParams);
      console.log('Status filter value being sent to API:', filters.status !== 'all' ? filters.status : undefined);
      console.log('User type - isPartner:', isPartner, 'isSuperAdmin:', isSuperAdmin);

      // Fetch ALL pages to get complete data for stats calculation
      let allLeadsData = [];
      let totalCount = 0;
      let currentPageForFetch = 1;
      let hasMorePages = true;

      console.log('Starting to fetch all pages for complete stats...');

      while (hasMorePages) {
        let response;

        if (isPartner && user?.id) {
          // For partners, use regular leads API with partner filter
          console.log('Partner API call - user.id:', user.id, 'serviceType:', serviceToUse, 'page:', currentPageForFetch);
          response = await leadsAPI.getAll({
            serviceType: serviceToUse,
            page: currentPageForFetch,
            limit: 100, // Maximum allowed limit
            partner: user.id, // Filter by partner ID
            status: filters.status !== 'all' ? filters.status : undefined,
            city: filters.city || undefined,
            search: filters.searchTerm || undefined,
            ...dateParams
          });
          console.log('Partner API response:', response);
        } else {
          // For admins, get all leads page by page
          const apiParams = {
            serviceType: serviceToUse,
            page: currentPageForFetch,
            limit: 100, // Maximum allowed limit
            // Add filters to API call
            status: filters.status !== 'all' ? filters.status : undefined,
            city: filters.city || undefined,
            partner: partnerParam,
            assignedPartner: partnerParam,
            search: filters.searchTerm || undefined,
            ...dateParams
          };
          console.log(`Admin API call parameters (page ${currentPageForFetch}):`, apiParams);
          response = await leadsAPI.getAll(apiParams);
        }

        const pageLeads = response.data.leads || [];
        const pagination = response.data.pagination;

        allLeadsData = [...allLeadsData, ...pageLeads];
        totalCount = pagination?.total || allLeadsData.length;

        console.log(`Fetched page ${currentPageForFetch}: ${pageLeads.length} leads. Total so far: ${allLeadsData.length}`);

        // Check if we have more pages
        if (pagination && pagination.totalPages && currentPageForFetch < pagination.totalPages) {
          currentPageForFetch++;
        } else {
          hasMorePages = false;
        }
      }

      console.log('API Response - All leads fetched:', allLeadsData.length);
      console.log('API Response - Total count from pagination:', totalCount);
      console.log('API Response - First lead sample:', allLeadsData[0]);
      console.log('API Response - isPartner:', isPartner, 'user.id:', user?.id);

      // Transform ALL leads data with full transformation for both display and stats
      const allTransformedLeads = allLeadsData.map(lead => {
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
          // Check for flexible period with startDate/endDate
          else if (lead.formData.flexiblePeriod && lead.formData.flexiblePeriod.startDate && lead.formData.flexiblePeriod.endDate) {
            const startDate = new Date(lead.formData.flexiblePeriod.startDate);
            const endDate = new Date(lead.formData.flexiblePeriod.endDate);
            dateDisplay = `${startDate.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')} - ${endDate.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}`;
            pickupDate = startDate; // Use start date for filtering
          }
          // Check for flexible period with month/year format
          else if (lead.formData.flexiblePeriod && lead.formData.flexiblePeriod.month && lead.formData.flexiblePeriod.year) {
            dateDisplay = `${lead.formData.flexiblePeriod.month} ${lead.formData.flexiblePeriod.year}`;
          }
          // Check for moveDateType with corresponding dates
          else if (lead.formData.moveDateType === 'fixed' && (lead.formData.moveDate || lead.formData.desiredMoveDate)) {
            pickupDate = new Date(lead.formData.moveDate || lead.formData.desiredMoveDate);
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

        // For partners, create separate row for EACH assignment
        if (isPartner && user?.id && lead.partnerAssignments && Array.isArray(lead.partnerAssignments)) {
          const partnerAssignments = lead.partnerAssignments.filter(pa =>
            pa.partner === user.id || pa.partner?._id === user.id || pa.partner?.toString() === user.id
          );

          // Always use _id for API calls, not the potentially modified id
          const dbId = lead._id || baseLeadData.id;

          return partnerAssignments.map((assignment, index) => {
            // Use the assignment's _id from database, or create one if missing (fallback)
            const assignmentId = assignment._id || `${dbId}_${assignment.assignedAt || index}`;

            return {
              ...baseLeadData,
              // Store original database _id for API calls
              originalLeadId: dbId,
              // Use unique assignment ID for each row (for React keys and tracking)
              id: assignmentId,
              // Store the assignment data
              currentAssignment: assignment,
              assignmentId: assignmentId,  // Explicit assignment ID field
              status: assignment.status || 'pending',
              partnerStatus: assignment.status || 'pending',
              assignedAt: assignment.assignedAt
            };
          });
        }

        // For admins or leads without assignments
        return [{
          ...baseLeadData,
          status: lead.status || 'pending',
          partnerStatus: lead.status || 'pending'
        }];
      }).flat(); // Flatten because each lead now returns an array

      // Store ALL leads data for filtering and stats
      console.log('Transformed leads sample:', allTransformedLeads[0]);
      console.log('All transformed leads count:', allTransformedLeads.length);
      setAllLeadsData(allTransformedLeads);

      // Now get the current page data with proper server-side pagination
      let currentPageResponse;
      if (isPartner && user?.id) {
        console.log('Partner current page API call - user.id:', user.id, 'page:', currentPage, 'limit:', itemsPerPage);
        currentPageResponse = await leadsAPI.getAll({
          serviceType: serviceToUse,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
          page: currentPage,
          limit: itemsPerPage,
          partner: user.id, // Filter by partner ID
          status: filters.status !== 'all' ? filters.status : undefined,
          city: filters.city || undefined,
          search: filters.searchTerm || undefined,
          ...dateParams
        });
        console.log('Partner current page API response:', currentPageResponse);
      } else {
        const currentPageParams = {
          serviceType: serviceToUse,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
          page: currentPage,
          limit: itemsPerPage,
          status: filters.status !== 'all' ? filters.status : undefined,
          city: filters.city || undefined,
          partner: partnerParam,
          assignedPartner: partnerParam,
          search: filters.searchTerm || undefined,
          ...dateParams
        };
        currentPageResponse = await leadsAPI.getAll(currentPageParams);
      }

      // Transform current page data for display
      const currentPageLeads = currentPageResponse.data.leads || [];
      const currentPageTransformed = currentPageLeads.map(lead => {
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

        if (lead.serviceType === 'cleaning') {
          if (lead.formData?.serviceAddress?.city) {
            cityDisplay = lead.formData.serviceAddress.city;
          } else if (lead.serviceLocation?.city) {
            cityDisplay = lead.serviceLocation.city;
          }
        }

        // Date display logic (simplified for current page)
        let dateDisplay = '';
        let pickupDate = null;
        if (lead.formData?.fixedDate) {
          pickupDate = new Date(lead.formData.fixedDate);
          dateDisplay = pickupDate.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB');
        }

        // Base lead data for current page
        const baseLeadData = {
          ...lead,
          id: lead._id || lead.id,
          leadId: lead.leadId || lead.id,
          name: lead.user ? `${lead.user.firstName} ${lead.user.lastName}`.trim() : (lead.name || ''),
          email: lead.user?.email || lead.email || '',
          city: cityDisplay,
          dateDisplay: dateDisplay,
          pickupDate: pickupDate,
        };

        // For partners, create separate row for EACH assignment
        if (isPartner && user?.id && lead.partnerAssignments && Array.isArray(lead.partnerAssignments)) {
          const partnerAssignments = lead.partnerAssignments.filter(pa =>
            pa.partner === user.id || pa.partner?._id === user.id || pa.partner?.toString() === user.id
          );

          // Always use _id for API calls, not the potentially modified id
          const dbId = lead._id || baseLeadData.id;

          return partnerAssignments.map((assignment, index) => {
            // Use the assignment's _id from database, or create one if missing (fallback)
            const assignmentId = assignment._id || `${dbId}_${assignment.assignedAt || index}`;

            return {
              ...baseLeadData,
              // Store original database _id for API calls
              originalLeadId: dbId,
              // Use unique assignment ID for each row (for React keys and tracking)
              id: assignmentId,
              // Store the assignment data
              currentAssignment: assignment,
              assignmentId: assignmentId,  // Explicit assignment ID field
              status: assignment.status || 'pending',
              partnerStatus: assignment.status || 'pending',
              assignedAt: assignment.assignedAt
            };
          });
        }

        // For admins or leads without assignments
        return [{
          ...baseLeadData,
          status: lead.status || 'pending',
          partnerStatus: lead.status || 'pending'
        }];
      }).flat(); // Flatten because each lead now returns an array

      // For partners with duplicate assignments, we need to slice to show exactly itemsPerPage rows
      // Calculate which rows to show for this page
      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const pageLeadsToShow = isPartner && user?.id
        ? allTransformedLeads.slice(startIdx, endIdx)  // Use all transformed data and slice for exact page
        : currentPageTransformed; // For admins, use server-paginated data

      // Store paginated leads for table display
      console.log('Setting leads for table display - page:', currentPage, 'count:', pageLeadsToShow.length);
      console.log('Current page transformed leads:', pageLeadsToShow.map(l => l.leadId));
      console.log('Partner status debug:', pageLeadsToShow.map(l => ({ leadId: l.leadId, partnerStatus: l.partnerStatus, status: l.status })));
      setLeads(pageLeadsToShow);
      // Use allTransformedLeads.length for total (includes duplicates for partners)
      setTotalLeads(allTransformedLeads.length);

      // Calculate stats from ALL leads data (not just paginated)
      const calculatedStats = {
        total: allTransformedLeads.length,
        pending: 0,
        assigned: 0,
        accepted: 0,
        cancelled: 0,
        rejected: 0,
        cancelRequests: 0
      };

      allTransformedLeads.forEach(lead => {
        // For partners, use partnerStatus; for admins, use general status
        const statusToCount = isPartner ? (lead.partnerStatus || lead.status) : lead.status;

        // Count cancel requests - for partners, only count PENDING cancellation requests
        if (isPartner && user?.id) {
          // For partners, only count their pending cancellation requests
          if (lead.partnerAssignments) {
            const partnerAssignment = lead.partnerAssignments.find(pa =>
              pa.partner === user.id || pa.partner?._id === user.id || pa.partner?.toString() === user.id
            );
            if (partnerAssignment && partnerAssignment.cancellationRequested &&
                !partnerAssignment.cancellationApproved && !partnerAssignment.cancellationRejected) {
              calculatedStats.cancelRequests++;
            }
          }
        } else {
          // For admins, use the original logic
          if (statusToCount === 'cancel_requested' || statusToCount === 'cancellationRequested' ||
              (lead.partnerAssignments && lead.partnerAssignments.some(pa => pa.cancellationRequested))) {
            calculatedStats.cancelRequests++;
          }
        }

        switch (statusToCount) {
          case 'pending':
            calculatedStats.pending++;
            break;
          case 'assigned':
          case 'partial_assigned':
            calculatedStats.assigned++;
            break;
          case 'accepted':
            calculatedStats.accepted++;
            break;
          case 'cancelled':
            calculatedStats.cancelled++;
            break;
          case 'rejected':
            calculatedStats.rejected++;
            break;
        }
      });

      console.log('Calculated stats from all leads:', calculatedStats);
      setLeadStats(calculatedStats);
    } catch (error) {
      console.error('Error loading leads:', error);
      // Show empty state when API fails
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    // Use initial data on first mount only
    if (initialLeads.length > 0 && leads.length === 0) {
      setLeads(initialLeads);
    }
  }, [initialLeads]);

  // Load partners for filtering on service change
  useEffect(() => {
    loadPartnersForFilter();
  }, [currentService]);

  // Load leads when filters or service changes - but NOT when on cancelRequests tab
  useEffect(() => {
    if (activeTab === 'leads') {
      loadLeads();
    }
  }, [currentService, filters.status, filters.city, filters.partner, filters.searchTerm, dateFilter.type, activeTab]);

  // Load partners for filter dropdown
  const loadPartnersForFilter = async () => {
    const serviceToUse = currentService || 'moving';
    console.log('loadPartnersForFilter called with currentService:', currentService, 'using:', serviceToUse);

    if (!serviceToUse) {
      console.warn('No service available, cannot load partners');
      return;
    }
    
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
    const serviceToUse = currentService || 'moving';
    console.log('loadCancelledRequests called with currentService:', currentService, 'using:', serviceToUse, 'isPartner:', isPartner, 'userId:', user?.id);

    if (!serviceToUse) {
      console.warn('No service available, cannot load cancelled requests');
      return;
    }

    setLoading(true);
    try {
      // Get all leads with partner assignments by fetching multiple pages
      let allLeads = [];
      let currentPage = 1;
      let hasMorePages = true;
      const maxLimit = 100; // Backend maximum allowed limit

      while (hasMorePages && currentPage <= 20) { // Safety limit of 20 pages max
        let response;

        if (isPartner && user?.id) {
          // For partners, get only their assigned leads
          response = await partnersAPI.getLeads(user.id, {
            serviceType: serviceToUse,
            page: currentPage,
            limit: maxLimit,
            search: filters.searchTerm || undefined,
          });
        } else {
          // For admins, get all leads
          response = await leadsAPI.getAll({
            serviceType: serviceToUse,
            page: currentPage,
            limit: maxLimit,
            search: filters.searchTerm || undefined,
          });
        }

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
            const hasCancellationRequest =
              assignment.cancellationRequestedAt ||
              assignment.cancellationRequested === true ||
              assignment.status === 'cancellationRequested' ||
              assignment.status === 'cancel_requested';

            // Debug logging for MOVE-1993
            if (lead.leadId === 'MOVE-1993') {
              console.log('MOVE-1993 Partner Assignment:', {
                partner: assignment.partner,
                status: assignment.status,
                cancellationRequested: assignment.cancellationRequested,
                cancellationRequestedAt: assignment.cancellationRequestedAt,
                cancellationApproved: assignment.cancellationApproved,
                cancellationRejected: assignment.cancellationRejected,
                hasCancellationRequest: hasCancellationRequest
              });
            }

            if (hasCancellationRequest) {
              // Determine the status of this cancellation request
              let requestStatus = 'pending';

              if (assignment.cancellationApproved === true) {
                requestStatus = 'cancellation_approved';
              } else if (assignment.cancellationRejected === true) {
                // Admin explicitly rejected the cancellation request
                requestStatus = 'cancellation_rejected';
              } else {
                // If there's a cancellation request and it's not approved/rejected, it's pending
                requestStatus = 'pending';
              }

              // Skip applying lead status filter to cancellation requests
              // Cancellation requests have their own status (pending/approved/rejected)
              // which is separate from lead status (pending/assigned/accepted/etc)
              // The filters.status is meant for filtering leads, not cancellation requests

              // Apply city filter
              if (filters.city && filters.city !== 'all') {
                // For moving leads, check both pickup and destination cities
                if (lead.serviceType === 'moving') {
                  const pickupCity = lead.formData?.pickupAddress?.city ||
                                   lead.pickupLocation?.city ||
                                   lead.formData?.pickupCity ||
                                   lead.pickupCity;
                  const destinationCity = lead.formData?.destinationAddress?.city ||
                                        lead.destinationLocation?.city ||
                                        lead.formData?.destinationCity ||
                                        lead.destinationCity;

                  // Apply case-insensitive matching and trim whitespace
                  const filterCity = filters.city.trim().toLowerCase();
                  const pickupCityNormalized = pickupCity ? pickupCity.trim().toLowerCase() : '';
                  const destinationCityNormalized = destinationCity ? destinationCity.trim().toLowerCase() : '';

                  // Match if either pickup or destination city matches the filter
                  const cityMatches = pickupCityNormalized === filterCity || destinationCityNormalized === filterCity;
                  if (!cityMatches) {
                    return; // Skip if neither city matches
                  }
                } else {
                  // For other service types, check service location
                  const leadCity = lead.formData?.serviceAddress?.city || lead.serviceLocation?.city || lead.city;
                  const filterCity = filters.city.trim().toLowerCase();
                  const leadCityNormalized = leadCity ? leadCity.trim().toLowerCase() : '';
                  if (leadCityNormalized !== filterCity) {
                    return; // Skip if city doesn't match
                  }
                }
              }

              // Apply partner filter
              if (filters.partner && filters.partner !== 'all') {
                const partnerIdToCheck = assignment.partner?._id || assignment.partner;
                if (filters.partner !== partnerIdToCheck) {
                  return; // Skip if partner doesn't match
                }
              }

              // Apply date filter (same logic as main leads tab)
              if (dateFilter.type !== 'all') {
                // Extract pickup date from lead data (similar to main leads)
                let pickupDate = null;
                let pickupStartDate = null;
                let pickupEndDate = null;

                if (lead.formData?.pickupDate || lead.pickupDate) {
                  pickupDate = lead.formData?.pickupDate || lead.pickupDate;
                } else if (lead.formData?.pickupStartDate && lead.formData?.pickupEndDate) {
                  pickupStartDate = lead.formData.pickupStartDate;
                  pickupEndDate = lead.formData.pickupEndDate;
                } else if (lead.formData?.flexiblePeriod && lead.formData.flexiblePeriod.includes(' - ')) {
                  const [start, end] = lead.formData.flexiblePeriod.split(' - ');
                  pickupStartDate = start;
                  pickupEndDate = end;
                }

                // Apply date filtering logic (same as main leads)
                let dateMatches = false;
                if (pickupDate) {
                  dateMatches = isDateInRange(pickupDate, dateFilter.type, dateFilter);
                } else if (pickupStartDate && pickupEndDate) {
                  dateMatches = isDateRangeOverlapping(pickupStartDate, pickupEndDate, dateFilter.type, dateFilter);
                } else {
                  // Fallback to creation date
                  dateMatches = isDateInRange(lead.createdAt, dateFilter.type, dateFilter);
                }

                if (!dateMatches) {
                  return; // Skip if date doesn't match
                }
              }

              // Extract partner ID safely
              const partnerId = assignment.partner?._id || assignment.partner || 'unknown';
              const leadId = lead._id || lead.id;

              // Extract pickup date for display (same logic as filtering)
              let pickupDate = null;
              let pickupStartDate = null;
              let pickupEndDate = null;
              let pickupDateDisplay = '';

              if (lead.formData?.pickupDate || lead.pickupDate) {
                pickupDate = lead.formData?.pickupDate || lead.pickupDate;
                pickupDateDisplay = pickupDate;
              } else if (lead.formData?.pickupStartDate && lead.formData?.pickupEndDate) {
                pickupStartDate = lead.formData.pickupStartDate;
                pickupEndDate = lead.formData.pickupEndDate;
                pickupDateDisplay = `${pickupStartDate} - ${pickupEndDate}`;
              } else if (lead.formData?.flexiblePeriod && lead.formData.flexiblePeriod.includes(' - ')) {
                pickupDateDisplay = lead.formData.flexiblePeriod;
                const [start, end] = lead.formData.flexiblePeriod.split(' - ');
                pickupStartDate = start;
                pickupEndDate = end;
              } else {
                // Fallback to creation date if no pickup date
                pickupDateDisplay = lead.createdAt;
              }

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
                // Add pickup date information
                pickupDate: pickupDate,
                pickupStartDate: pickupStartDate,
                pickupEndDate: pickupEndDate,
                pickupDateDisplay: pickupDateDisplay,
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

      // Calculate stats on filtered data (before pagination)
      const stats = {
        total: cancelRequests.length,
        pending: cancelRequests.filter(r => r.status === 'pending').length,
        approved: cancelRequests.filter(r => r.status === 'cancellation_approved').length,
        rejected: cancelRequests.filter(r => r.status === 'cancellation_rejected').length
      };

      // Apply pagination client-side
      const startIndex = (cancelledCurrentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedRequests = cancelRequests.slice(startIndex, endIndex);

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
    console.log('useEffect triggered - currentService:', currentService, 'activeTab:', activeTab);
    if (activeTab === 'leads') {
      loadLeads();
    }
  }, [currentService, sortConfig.key, sortConfig.direction, dateFilter.type, dateFilter.singleDate, dateFilter.fromDate, dateFilter.toDate, dateFilter.week, dateFilter.month, dateFilter.year, currentPage, filters.status, filters.city, filters.partner, filters.searchTerm, activeTab]);

  // Load cancelled requests when activeTab changes to 'cancelled' or filters change
  useEffect(() => {
    console.log('Cancelled requests useEffect - currentService:', currentService, 'activeTab:', activeTab);
    if (activeTab === 'cancelRequests') {
      loadCancelledRequests();
    }
  }, [activeTab, currentService, dateFilter.type, dateFilter.singleDate, dateFilter.fromDate, dateFilter.toDate, dateFilter.week, dateFilter.month, dateFilter.year, cancelledCurrentPage, filters.status, filters.city, filters.partner, filters.searchTerm]);

  // Load cancelled requests for stats when on leads tab
  useEffect(() => {
    if (activeTab === 'leads' && (isPartner || isSuperAdmin)) {
      loadCancelledRequests();
    }
  }, [activeTab, currentService, isPartner, isSuperAdmin]);

  // DEPRECATED: Client-side filtering is now handled server-side for multi-partner assignments
  // This function is kept for backward compatibility but should be removed eventually
  const applyFilters = () => {
    let filtered = [...allLeadsData];
    console.log('Applying filters:', filters, 'Total leads:', allLeadsData.length);

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
        (lead.leadId && lead.leadId.toLowerCase().includes(term))
      );
    }

    // Date filtering (client-side for already loaded data)
    if (dateFilter.type !== 'all') {
      // Check if we actually have a date selected for the filter type
      const hasDateSelected =
        (dateFilter.type === 'single' && dateFilter.singleDate) ||
        (dateFilter.type === 'range' && dateFilter.fromDate && dateFilter.toDate) ||
        (dateFilter.type === 'week' && dateFilter.week) ||
        (dateFilter.type === 'month' && dateFilter.month) ||
        (dateFilter.type === 'year' && dateFilter.year);

      if (!hasDateSelected) {
        console.log('Date filter type is set but no date selected - showing all leads');
        // If no date is actually selected, don't filter by date
        return filtered;
      }

      console.log('Client-side date filtering. Filter type:', dateFilter.type, 'Total leads before filtering:', filtered.length);

      filtered = filtered.filter(lead => {
        // Helper function to check if a date falls within the filter range
        const isDateInRange = (leadDate, filterType, filterData) => {
          if (!leadDate) return false;

          const date = new Date(leadDate);
          date.setHours(0, 0, 0, 0); // Normalize to start of day

          switch (filterType) {
            case 'single':
              if (filterData.singleDate) {
                const filterDate = new Date(filterData.singleDate);
                filterDate.setHours(0, 0, 0, 0);
                return date.getTime() === filterDate.getTime();
              }
              break;

            case 'range':
              if (filterData.fromDate && filterData.toDate) {
                const fromDate = new Date(filterData.fromDate);
                const toDate = new Date(filterData.toDate);
                fromDate.setHours(0, 0, 0, 0);
                toDate.setHours(23, 59, 59, 999);
                return date >= fromDate && date <= toDate;
              }
              break;

            case 'week':
              if (filterData.week) {
                const selectedWeekDate = new Date(filterData.week);
                const startOfWeek = new Date(selectedWeekDate);
                startOfWeek.setDate(selectedWeekDate.getDate() - selectedWeekDate.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                return date >= startOfWeek && date <= endOfWeek;
              }
              break;

            case 'month':
              if (filterData.month) {
                const selectedMonthDate = new Date(filterData.month);
                const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
                const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);
                startOfMonth.setHours(0, 0, 0, 0);
                endOfMonth.setHours(23, 59, 59, 999);
                return date >= startOfMonth && date <= endOfMonth;
              }
              break;

            case 'year':
              if (filterData.year) {
                const selectedYearDate = new Date(filterData.year);
                return date.getFullYear() === selectedYearDate.getFullYear();
              }
              break;
          }
          return false;
        };

        // Helper function to check if date range overlaps with filter range
        const isDateRangeOverlapping = (startDate, endDate, filterType, filterData) => {
          if (!startDate || !endDate) return false;

          const leadStart = new Date(startDate);
          const leadEnd = new Date(endDate);
          leadStart.setHours(0, 0, 0, 0);
          leadEnd.setHours(23, 59, 59, 999);

          switch (filterType) {
            case 'single':
              if (filterData.singleDate) {
                const filterDate = new Date(filterData.singleDate);
                filterDate.setHours(0, 0, 0, 0);
                const filterEndDate = new Date(filterDate);
                filterEndDate.setHours(23, 59, 59, 999);
                return leadStart <= filterEndDate && leadEnd >= filterDate;
              }
              break;

            case 'range':
              if (filterData.fromDate && filterData.toDate) {
                const filterStart = new Date(filterData.fromDate);
                const filterEnd = new Date(filterData.toDate);
                filterStart.setHours(0, 0, 0, 0);
                filterEnd.setHours(23, 59, 59, 999);
                return leadStart <= filterEnd && leadEnd >= filterStart;
              }
              break;

            case 'week':
              if (filterData.week) {
                const selectedWeekDate = new Date(filterData.week);
                const startOfWeek = new Date(selectedWeekDate);
                startOfWeek.setDate(selectedWeekDate.getDate() - selectedWeekDate.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                return leadStart <= endOfWeek && leadEnd >= startOfWeek;
              }
              break;

            case 'month':
              if (filterData.month) {
                const selectedMonthDate = new Date(filterData.month);
                const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
                const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);
                startOfMonth.setHours(0, 0, 0, 0);
                endOfMonth.setHours(23, 59, 59, 999);
                return leadStart <= endOfMonth && leadEnd >= startOfMonth;
              }
              break;

            case 'year':
              if (filterData.year) {
                const selectedYearDate = new Date(filterData.year);
                const targetYear = selectedYearDate.getFullYear();
                const startOfYear = new Date(targetYear, 0, 1);
                const endOfYear = new Date(targetYear, 11, 31);
                startOfYear.setHours(0, 0, 0, 0);
                endOfYear.setHours(23, 59, 59, 999);
                return leadStart <= endOfYear && leadEnd >= startOfYear;
              }
              break;
          }
          return false;
        };

        // Extract pickup date from lead data
        let pickupDate = null;
        let pickupStartDate = null;
        let pickupEndDate = null;

        if (lead.formData) {
          // Check for fixed date (single pickup date)
          if (lead.formData.fixedDate) {
            pickupDate = lead.formData.fixedDate;
          }
          // Check for flexible date range (pickup date range)
          else if (lead.formData.flexibleDateRange && lead.formData.flexibleDateRange.startDate && lead.formData.flexibleDateRange.endDate) {
            pickupStartDate = lead.formData.flexibleDateRange.startDate;
            pickupEndDate = lead.formData.flexibleDateRange.endDate;
          }
          // Check for flexible period with startDate/endDate
          else if (lead.formData.flexiblePeriod && lead.formData.flexiblePeriod.startDate && lead.formData.flexiblePeriod.endDate) {
            pickupStartDate = lead.formData.flexiblePeriod.startDate;
            pickupEndDate = lead.formData.flexiblePeriod.endDate;
          }
          // Check for move date (alternative format)
          else if (lead.formData.moveDateType === 'fixed' && (lead.formData.moveDate || lead.formData.desiredMoveDate)) {
            pickupDate = lead.formData.moveDate || lead.formData.desiredMoveDate;
          }
        }

        // Use the pickupDate from the processed lead data if available
        if (!pickupDate && !pickupStartDate && lead.pickupDate) {
          pickupDate = lead.pickupDate;
        }

        // Apply date filtering logic
        let result = false;
        if (pickupDate) {
          // Single pickup date - check if it matches the filter
          result = isDateInRange(pickupDate, dateFilter.type, dateFilter);
          console.log(`Lead ${lead.id}: Single pickup date ${pickupDate} -> ${result}`);
        } else if (pickupStartDate && pickupEndDate) {
          // Pickup date range - check if filter overlaps with the range
          result = isDateRangeOverlapping(pickupStartDate, pickupEndDate, dateFilter.type, dateFilter);
          console.log(`Lead ${lead.id}: Pickup range ${pickupStartDate} to ${pickupEndDate} -> ${result}`);
        } else {
          // Fallback to creation date for leads without pickup dates
          result = isDateInRange(lead.createdAt, dateFilter.type, dateFilter);
          console.log(`Lead ${lead.id}: Using creation date ${lead.createdAt} -> ${result}`);
        }
        return result;
      });

      console.log('Client-side date filtering complete. Leads after filtering:', filtered.length);
    }

    return filtered;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
      partial_assigned: 'bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
      assigned: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      accepted: 'bg-green-100 text-green-800 border border-green-400 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      approved: 'bg-green-100 text-green-800 border border-green-400 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      cancel_requested: 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
      cancellationRequested: 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
      cancelled: 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
      rejected: 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
      cancellation_rejected: 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
      cancellation_approved: 'bg-green-100 text-green-800 border border-green-400 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      completed: 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700'
    };
    return colors[status] || colors.pending;
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

  const handleAcceptLead = async (leadId, partnerId, _id = null) => {
    if (!leadId || !user?.id) {
      toast.error(isGerman ? 'Fehler: Ungültige Parameter' : 'Error: Invalid parameters');
      return;
    }

    console.log('🔵 handleAcceptLead called with:', { leadId, partnerId, userId: user?.id, _id });
    console.log('🔵 _id value:', _id, 'Type:', typeof _id, 'Is null?', _id === null, 'Is undefined?', _id === undefined);

    setLoading(true);
    try {
      console.log('🔵 Calling leadsAPI.accept with leadId:', leadId, '_id:', _id);
      const response = await leadsAPI.accept(leadId, _id);
      console.log('🔵 Accept API response:', response);

      // Reload leads from backend to ensure consistency with new assignment structure
      await loadLeads();

      toast.success(isGerman ? 'Lead erfolgreich akzeptiert' : 'Lead accepted successfully');

      // Find the accepted lead and open view dialog
      // Check both original and modified IDs for duplicate rows
      const acceptedLead = response.data?.lead || leads.find(l =>
        l.id === leadId || l.originalLeadId === leadId
      );
      if (acceptedLead) {
        // Set status to accepted for view access
        const leadForView = {
          ...acceptedLead,
          id: leadId, // Use original ID for viewing
          originalLeadId: leadId,
          status: 'accepted',
          partnerStatus: 'accepted'
        };
        handleViewLead(leadForView);
      }
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
    if (!lead || !lead.id) {
      toast.error(isGerman ? 'Fehler: Lead nicht gefunden' : 'Error: Lead not found');
      return;
    }
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

    console.log('confirmRejectLead called with:', {
      selectedRejectLead,
      originalLeadId: selectedRejectLead.originalLeadId,
      id: selectedRejectLead.id,
      rejectionReason
    });

    setLoading(true);
    try {
      const leadIdToReject = selectedRejectLead.originalLeadId || selectedRejectLead.id;
      const assignmentId = selectedRejectLead.currentAssignment?._id;
      console.log('Rejecting lead with ID:', leadIdToReject, 'assignment _id:', assignmentId);
      await leadsAPI.reject(leadIdToReject, rejectionReason.trim(), assignmentId);

      // Remove all duplicate rows with the same original lead ID
      setLeads(prev => prev.filter(lead =>
        (lead.originalLeadId || lead.id) !== leadIdToReject
      ));

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
    if (!lead || !user?.id) {
      toast.error(isGerman ? 'Fehler: Ungültige Parameter' : 'Error: Invalid parameters');
      return;
    }
    setSelectedCancelLead(lead);
    setShowCancelModal(true);
    setCancelReason('');
  };

  // Handle showing partner assignments dialog
  const handleShowPartnerAssignments = (lead) => {
    setSelectedLeadForPartners(lead);
    setShowPartnerAssignmentDialog(true);
  };

  // Handle navigating to partner details
  const handleNavigateToPartner = (partnerId) => {
    // Close the dialog
    setShowPartnerAssignmentDialog(false);

    // Navigate to partner management with the partner ID
    router.push(`/dashboard?tab=partners&partnerId=${partnerId}&view=leads`);
  };

  // Handle submitting cancel lead request
  const handleSubmitCancelLead = async () => {
    if (!cancelReason.trim()) {
      toast.error(isGerman ? 'Bitte geben Sie einen Grund ein' : 'Please provide a reason');
      return;
    }

    setLoading(true);
    try {
      const leadIdToCancel = selectedCancelLead.originalLeadId || selectedCancelLead.id;
      await leadsAPI.cancelLead(leadIdToCancel, { reason: cancelReason });

      // Update all duplicate rows with the same original lead ID
      setLeads(prev => prev.map(lead => {
        const leadOriginalId = lead.originalLeadId || lead.id;
        const selectedOriginalId = selectedCancelLead.originalLeadId || selectedCancelLead.id;

        if (leadOriginalId === selectedOriginalId) {
          return {
            ...lead,
            partnerStatus: 'cancel_requested',
            cancelReason: cancelReason,
            cancellationRequested: true,
            cancellationRequestedAt: new Date().toISOString()
          };
        }
        return lead;
      }));

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
    if (!lead.partnerAssignments || !user?.id) return false;

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
    // Apply client-side filtering (especially important for single date filtering)
    // Server-side filtering is used for performance, but client-side handles complex date logic
    console.log('useMemo currentLeads - applying filters to', allLeadsData.length, 'all leads');
    const filtered = applyFilters();
    console.log('useMemo currentLeads - after filtering:', filtered.length, 'leads');
    return filtered;
  }, [allLeadsData, filters, dateFilter]);

  // Calculate filtered stats based on currentLeads
  const filteredStats = useMemo(() => {
    const stats = {
      total: currentLeads.length,
      pending: 0,
      assigned: 0,
      accepted: 0,
      cancelled: 0
    };

    currentLeads.forEach(lead => {
      switch (lead.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'assigned':
        case 'partial_assigned':
          stats.assigned++;
          break;
        case 'accepted':
          stats.accepted++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }
    });

    return stats;
  }, [currentLeads]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [totalLeads]);

  // Partner-specific export function with partner statuses
  const exportPartnerLeads = async (format) => {
    try {
      let exportParams;
      let response;

      if (activeTab === 'cancelled') {
        // Export cancelled requests
        exportParams = {
          serviceType: currentService,
          status: filters.status !== 'all' ? filters.status : undefined,
          city: filters.city || undefined,
          search: filters.searchTerm || undefined
        };

        // Remove undefined values
        const cleanParams = Object.entries(exportParams)
          .filter(([_, value]) => value !== undefined)
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        console.log('Export partner cancel requests params:', cleanParams);
        response = await leadsAPI.exportCancelRequests(format, cleanParams);
      } else {
        // Export leads with partner-specific parameters
        exportParams = {
          serviceType: currentService,
          partnerView: true, // Flag to indicate partner export
          status: filters.status !== 'all' ? filters.status : undefined,
          city: filters.city || undefined,
          search: filters.searchTerm || undefined
        };

        // Remove undefined values
        const cleanParams = Object.entries(exportParams)
          .filter(([_, value]) => value !== undefined)
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        console.log('Export partner leads params:', cleanParams);
        response = await leadsAPI.export(format, cleanParams);
      }

      console.log('Export partner response:', response);

      // Create download link
      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Set filename based on format and active tab
      const timestamp = new Date().toISOString().split('T')[0];
      const dataType = activeTab === 'cancelled' ? 'partner_cancel_requests' : 'partner_leads';
      const filename = `${dataType}_export_${timestamp}.${format}`;
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
      console.error('Error exporting partner leads:', error);
      console.error('Error details:', error.response);

      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You need proper privileges to export.');
      } else {
        toast.error(`Failed to export to ${format.toUpperCase()}: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const exportLeads = async (format) => {
    try {
      let exportParams;
      let response;

      if (activeTab === 'cancelled') {
        // Export cancelled requests
        exportParams = {
          serviceType: currentService,
          status: filters.status !== 'all' ? filters.status : undefined,
          city: filters.city || undefined,
          search: filters.searchTerm || undefined
        };

        // Remove undefined values
        const cleanParams = Object.entries(exportParams)
          .filter(([_, value]) => value !== undefined)
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        console.log('Export cancel requests params:', cleanParams); // Debug log
        response = await leadsAPI.exportCancelRequests(format, cleanParams);
      } else {
        // Export leads (original functionality)
        exportParams = {
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

        console.log('Export leads params:', cleanParams); // Debug log
        response = await leadsAPI.export(format, cleanParams);
      }
      
      console.log('Export response:', response); // Debug log
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename based on format and active tab
      const timestamp = new Date().toISOString().split('T')[0];
      const dataType = activeTab === 'cancelled' ? 'cancel_requests' : 'leads';
      const filename = `${dataType}_export_${timestamp}.${format}`;
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
          {(isSuperAdmin || isPartner) && (
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
                      onClick={() => isPartner ? exportPartnerLeads('xlsx') : exportLeads('xlsx')}
                      className="w-full px-4 py-2 text-left hover:bg-opacity-80 transition-colors flex items-center gap-3"
                      style={{ color: 'var(--theme-text)', backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-bg-secondary)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <span className="text-green-600">📊</span>
                      <div>
                        <div className="font-medium">{isGerman ? 'Excel-Export' : 'Export to Excel'}</div>
                        <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>{isGerman ? '.xlsx Datei' : 'Download as .xlsx file'}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => isPartner ? exportPartnerLeads('pdf') : exportLeads('pdf')}
                      className="w-full px-4 py-2 text-left hover:bg-opacity-80 transition-colors flex items-center gap-3"
                      style={{ color: 'var(--theme-text)', backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-bg-secondary)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <span className="text-red-600">📄</span>
                      <div>
                        <div className="font-medium">{isGerman ? 'PDF-Export' : 'Export to PDF'}</div>
                        <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>{isGerman ? '.pdf Datei' : 'Download as .pdf file'}</div>
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
          className="grid grid-cols-4 gap-3 p-4 rounded-lg mb-6"
          style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Search */}
          <div className="min-w-0">
            <input
              type="text"
              placeholder={isGerman ? 'Suche nach ID, Name, E-Mail...' : 'Search by ID, name, email...'}
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 box-border theme-input"
              style={{
                minWidth: '100%',
                height: '42px'
              }}
            />
          </div>

          {/* Status Filter */}
          <div className="min-w-0">
            <select
              value={filters.status}
              onChange={(e) => {
                console.log('Status filter changed to:', e.target.value);
                setFilters(prev => ({ ...prev, status: e.target.value }));
              }}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 box-border theme-input"
              style={{
                minWidth: '100%',
                height: '42px'
              }}
            >
              <option value="all">{isGerman ? 'Alle Status' : 'All Status'}</option>
              {activeTab === 'leads' ? (
                isPartner ? (
                  // Partner-specific status options
                  <>
                    <option value="pending">{isGerman ? 'Ausstehend' : 'Pending'}</option>
                    <option value="accepted">{isGerman ? 'Akzeptiert' : 'Accepted'}</option>
                    <option value="rejected">{isGerman ? 'Abgelehnt' : 'Rejected'}</option>
                    <option value="cancel_requested">{isGerman ? 'Stornierung angefragt' : 'Cancel Requested'}</option>
                    <option value="cancelled">{isGerman ? 'Storniert' : 'Cancelled'}</option>
                  </>
                ) : (
                  // Admin status options (unchanged)
                  <>
                    <option value="pending">{isGerman ? 'Ausstehend' : 'Pending'}</option>
                    <option value="assigned">{isGerman ? 'Zugewiesen' : 'Assigned'}</option>
                    <option value="partial_assigned">{isGerman ? 'Teilweise zugewiesen' : 'Partial Assigned'}</option>
                  </>
                )
              ) : (
                <>
                  <option value="pending">{isGerman ? 'Ausstehend' : 'Pending'}</option>
                  <option value="cancel_request_approved">{isGerman ? 'Stornierung genehmigt' : 'Cancel Request Approved'}</option>
                  <option value="cancel_request_rejected">{isGerman ? 'Stornierung abgelehnt' : 'Cancel Request Rejected'}</option>
                </>
              )}
            </select>
          </div>

          {/* City Filter */}
          <div className="min-w-0">
            <input
              type="text"
              placeholder={currentService === 'moving'
                ? (isGerman ? 'Abhol- oder Zielort...' : 'Pickup or destination city...')
                : (isGerman ? 'Stadt...' : 'City...')
              }
              value={filters.city}
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 box-border theme-input"
              style={{
                minWidth: '100%',
                height: '42px'
              }}
            />
          </div>


          {/* Date Filter */}
          <div className="space-y-2 min-w-0">
            <select
              value={dateFilter.type}
              onChange={(e) => setDateFilter(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 box-border theme-input"
              style={{
                minWidth: '100%',
                height: '42px'
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
        {(isPartner ? [
          // Partner-specific stats
          { label: t('leads.totalLeads'), value: leadStats.total, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ), color: 'blue' },
          { label: translateStatus('pending'), value: leadStats.pending || 0, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), color: 'yellow' },
          { label: translateStatus('accepted'), value: leadStats.accepted || 0, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), color: 'green' },
          { label: translateStatus('rejected'), value: leadStats.rejected || 0, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), color: 'red' },
          { label: isGerman ? 'Stornierungsanfragen' : 'Cancel Requests', value: cancelledRequestStats.total || leadStats.cancelRequests || 0, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ), color: 'orange' },
          { label: translateStatus('cancelled'), value: leadStats.cancelled || 0, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ), color: 'gray' }
        ] : [
          // Admin-specific stats (original: All, Pending, Assigned only)
          { label: t('leads.totalLeads'), value: leadStats.total, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ), color: 'blue' },
          { label: translateStatus('pending'), value: leadStats.pending || 0, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), color: 'yellow' },
          { label: translateStatus('assigned'), value: leadStats.assigned || 0, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          ), color: 'indigo' }
        ]).map((stat, index) => (
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
                  stat.color === 'gray' ? 'text-gray-600' :
                  stat.color === 'indigo' ? 'text-indigo-600' :
                  ''
                }`}>{stat.value}</p>
                <div className={`${
                  stat.color === 'blue' ? 'text-blue-600' :
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'yellow' ? 'text-yellow-600' :
                  stat.color === 'red' ? 'text-red-600' :
                  stat.color === 'orange' ? 'text-orange-600' :
                  stat.color === 'gray' ? 'text-gray-600' :
                  stat.color === 'indigo' ? 'text-indigo-600' :
                  ''
                }`}>{stat.icon}</div>
              </div>
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
                {!isPartner && (
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Partner' : 'Partners'}
                  </th>
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
                  <td colSpan={isPartner ? "6" : "7"} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span style={{ color: 'var(--theme-text)' }}>
                        {t('common.loading')}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <>
                  {console.log('Rendering no leads found - leads array:', leads, 'isPartner:', isPartner, 'loading:', loading)}
                  <tr>
                    <td colSpan={isPartner ? "6" : "7"} className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                      {t('leads.noLeadsFound') || (isGerman ? 'Keine Leads gefunden' : 'No leads found')}
                    </td>
                  </tr>
                </>

              ) : (
                leads.map((lead, index) => (
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
                      const statusColorClass = getStatusColor(statusToShow);

                      return (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColorClass}`}>
                          {translateStatus(statusToShow)}
                        </span>
                      );
                    })()}
                  </td>
                  {!isPartner && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(() => {
                        const statusToShow = lead.status;
                        const activePartnerCount = lead.partnerAssignments?.filter(
                          a => a.status !== 'rejected' && a.status !== 'cancelled'
                        ).length || 0;

                        const showPartnerCount = (statusToShow === 'partial_assigned' || statusToShow === 'assigned') && activePartnerCount > 0;

                        if (!showPartnerCount) {
                          return <span style={{ color: 'var(--theme-muted)' }}>-</span>;
                        }

                        // Determine partner count badge color based on partner type
                        const hasExclusive = lead.partnerAssignments?.some(
                          a => (a.status !== 'rejected' && a.status !== 'cancelled') &&
                               (a.partnerType === 'exclusive' || a.partner?.partnerType === 'exclusive')
                        );
                        const countBadgeColor = hasExclusive
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';

                        return (
                          <button
                            onClick={() => handleShowPartnerAssignments(lead)}
                            className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${countBadgeColor}`}
                            title={isGerman ? 'Partner anzeigen' : 'Show partners'}
                          >
                            {activePartnerCount}
                          </button>
                        );
                      })()}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {lead.dateDisplay || new Date(lead.createdAt).toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {/* View button - available to admin users only (partners have conditional view buttons) */}
                      {!isPartner && (
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
                      )}
                      {isSuperAdmin && (lead.status === 'pending' || lead.status === 'partial_assigned') && (
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
                      {isPartner && (() => {
                        const partnerStatus = getPartnerAssignmentStatus(lead);

                        // Debug logging
                        console.log('Button rendering - Lead:', lead.leadId || lead.id, 'Status:', partnerStatus?.status);

                        switch(partnerStatus?.status) {
                          case 'pending':
                            // Pending: Show Reject and Accept buttons
                            return (
                              <>
                                <button
                                  onClick={() => {
                                    console.log('Reject button clicked - Lead:', {
                                      id: lead.id,
                                      originalLeadId: lead.originalLeadId,
                                      leadId: lead.leadId
                                    });
                                    handleRejectLead(lead);
                                  }}
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
                                  title={isGerman ? 'Lead ablehnen' : 'Reject lead'}
                                >
                                  ✖️ {isGerman ? 'Ablehnen' : 'Reject'}
                                </button>
                                <button
                                  onClick={() => {
                                    console.log('Accept button clicked - Lead:', {
                                      id: lead.id,
                                      originalLeadId: lead.originalLeadId,
                                      idToUse: lead.originalLeadId || lead.id,
                                      leadId: lead.leadId,
                                      currentAssignment: lead.currentAssignment,
                                      assignmentId: lead.currentAssignment?._id
                                    });
                                    handleAcceptLead(lead.originalLeadId || lead.id, user?.id, lead.currentAssignment?._id);
                                  }}
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
                            );

                          case 'accepted':
                            // Accepted: Show View and optionally Cancel Request buttons
                            return (
                              <>
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
                                >
                                  👁️ {isGerman ? 'Anzeigen' : 'View'}
                                </button>
                                {!partnerStatus?.isCancellationRequested && !isCancellationRequestRejected(lead) && (
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
                              </>
                            );

                          case 'rejected':
                            // Rejected: Show only status badge, no View button
                            return (
                              <span className="text-xs px-3 py-1 rounded bg-red-100 text-red-800">
                                ❌ {isGerman ? 'Abgelehnt' : 'Rejected'}
                              </span>
                            );

                          case 'cancellationRequested':
                          case 'cancel_requested':
                            // Cancellation Requested: Show only status badges, no View button
                            return (
                              <>
                                {partnerStatus?.isCancellationRequested && lead.status !== 'cancelled' && (
                                  <span className="text-xs px-3 py-1 rounded bg-purple-100 text-purple-800">
                                    🔄 {isGerman ? 'Stornierung angefragt' : 'Cancel Pending'}
                                  </span>
                                )}
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
                            );

                          default:
                            // Other status: Show only status text, no View button
                            return (
                              <span className="text-xs px-3 py-1 rounded" style={{ color: 'var(--theme-muted)' }}>
                                {isGerman ? 'Keine Aktion verfügbar' : 'No action available'}
                              </span>
                            );
                        }
                      })()}
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
          { label: isGerman ? 'Gesamt Anfragen' : 'Total Requests', value: cancelledRequestStats.total, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ), color: 'blue' },
          { label: isGerman ? 'Ausstehend' : 'Pending', value: cancelledRequestStats.pending, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), color: 'yellow' },
          { label: isGerman ? 'Genehmigt' : 'Approved', value: cancelledRequestStats.approved, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), color: 'green' },
          { label: isGerman ? 'Abgelehnt' : 'Rejected', value: cancelledRequestStats.rejected, icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), color: 'red' }
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
              <div style={{ color: 'var(--theme-text)' }}>
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
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-0" style={{ color: 'var(--theme-text)' }}>
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
                        {request.pickupDateDisplay ? new Date(request.pickupDateDisplay).toLocaleDateString(isGerman ? 'de-DE' : 'en-GB') : new Date(request.createdAt).toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}
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
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-0" style={{ color: 'var(--theme-muted)' }}>
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
                          request.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
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
                        <td className="px-3 py-4 text-sm font-medium min-w-0">
                          {request.status === 'pending' && (
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 w-full">
                              <button
                                onClick={() => handleApproveCancelRequest(request.id)}
                                className="text-xs px-2 py-1 rounded transition-colors flex-shrink-0 w-full sm:w-auto whitespace-nowrap"
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
                                ✅ {isGerman ? 'Genehmigen' : 'Accept'}
                              </button>
                              <button
                                onClick={() => handleRejectCancelRequest(request)}
                                className="text-xs px-2 py-1 rounded transition-colors flex-shrink-0 w-full sm:w-auto whitespace-nowrap"
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
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full">
                              <span className="text-gray-500 italic text-xs flex-shrink-0">
                                {request.status === 'approved' ?
                                  (isGerman ? 'Genehmigt' : 'Approved') :
                                  (isGerman ? 'Abgelehnt' : 'Rejected')
                                }
                              </span>
                              {/* Action buttons to reverse decision */}
                              {request.status === 'approved' ? (
                                <button
                                  onClick={() => handleRejectCancelRequest(request)}
                                  className="text-xs px-2 py-1 rounded transition-colors flex-shrink-0 w-full sm:w-auto whitespace-nowrap"
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
                                  title={isGerman ? 'Genehmigung zurücknehmen' : 'Reverse Approval'}
                                >
                                  ❌ {isGerman ? 'Ablehnen' : 'Reject'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApproveCancelRequest(request.id)}
                                  className="text-xs px-2 py-1 rounded transition-colors flex-shrink-0 w-full sm:w-auto whitespace-nowrap"
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
                                  title={isGerman ? 'Ablehnung zurücknehmen' : 'Reverse Rejection'}
                                >
                                  ✅ {isGerman ? 'Genehmigen' : 'Accept'}
                                </button>
                              )}
                            </div>
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
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-md flex items-center justify-center z-50 p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseAssignModal}
          >
            <motion.div
              className="rounded-xl shadow-2xl w-full max-w-4xl min-h-0 overflow-hidden border-2 flex flex-col mx-6"
              style={{
                backgroundColor: 'var(--theme-bg-secondary)',
                color: 'var(--theme-text)',
                borderColor: 'var(--theme-border)',
                height: '700px',
                boxSizing: 'border-box'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 pb-3 px-6 pt-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
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

              {/* Scrollable Content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pr-10">
              {/* Lead Information */}
              {selectedLead && (
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--theme-text)' }}>{isGerman ? 'Lead-Details' : 'Lead Details'}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }}>{isGerman ? 'Kunde:' : 'Customer:'}</strong>
                      <span style={{ color: 'var(--theme-text)' }}> {selectedLead.name}</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }}>{isGerman ? 'Standort:' : 'Location:'}</strong>
                      <span style={{ color: 'var(--theme-text)' }}> {selectedLead.city}</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }}>{isGerman ? 'Dienst:' : 'Service:'}</strong>
                      <span style={{ color: 'var(--theme-text)' }}> {translateService(selectedLead.serviceType || currentService)}</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--theme-text)' }}>{isGerman ? 'Status:' : 'Status:'}</strong>
                      <span style={{ color: 'var(--theme-text)' }}> {translateStatus(selectedLead.status)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggested Partners */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Vorgeschlagene Partner' : 'Suggested Partners'} ({filteredPartners.length})
                  </h3>

                  {/* Search Input */}
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder={isGerman ? 'Partner suchen...' : 'Search partners...'}
                      value={partnerSearchQuery}
                      onChange={handleSearchInputChange}
                      className="w-full px-4 py-2 pl-12 text-sm rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                    />
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
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

                {/* Partner Filter Tabs - Show suggested partners tabs and searched partners tab */}
                {(showTabs || partnerSearchQuery.trim()) && (
                  <div className="mb-4">
                    <div className="flex border-b" style={{ borderColor: 'var(--theme-border)' }}>
                      {/* Show Basic and Exclusive tabs only if there are suggested partners */}
                      {showTabs && (
                        <>
                          <button
                            onClick={() => handlePartnerFilterChange('basic')}
                            className={`px-6 py-3 font-medium transition-colors ${
                              partnerFilter === 'basic'
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'hover:opacity-80'
                            }`}
                            style={partnerFilter !== 'basic' ? { color: 'var(--theme-text)', opacity: 0.6 } : {}}
                          >
                            {isGerman ? 'Basis' : 'Basic'} ({partnerTabs.basic.count})
                          </button>
                          <button
                            onClick={() => handlePartnerFilterChange('exclusive')}
                            className={`px-6 py-3 font-medium transition-colors ${
                              partnerFilter === 'exclusive'
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'hover:opacity-80'
                            }`}
                            style={partnerFilter !== 'exclusive' ? { color: 'var(--theme-text)', opacity: 0.6 } : {}}
                          >
                            {isGerman ? 'Exklusiv' : 'Exclusive'} ({partnerTabs.exclusive.count})
                          </button>
                        </>
                      )}

                      {/* Show Searched Partners tab when there's a search query */}
                      {partnerSearchQuery.trim() && (
                        <button
                          onClick={() => handlePartnerFilterChange('search')}
                          className={`px-6 py-3 font-medium transition-colors ${
                            partnerFilter === 'search'
                              ? 'border-b-2 border-blue-500 text-blue-600'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {isGerman ? 'Gesuchte Partner' : 'Searched Partners'} ({filteredPartners.length})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {partnersLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="font-medium" style={{ color: 'var(--theme-text)' }}>{isGerman ? 'Partner werden geladen...' : 'Loading partners...'}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--theme-muted)' }}>{isGerman ? 'Die besten Partner für Ihren Lead werden gesucht' : 'Finding the best matches for your lead'}</p>
                  </div>
                ) : !showTabs && !partnerSearchQuery.trim() ? (
                  // When no suggested partners and no search query, show message to search
                  <div className="text-center h-[300px] flex flex-col justify-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                      <svg className="w-8 h-8" style={{ color: 'var(--theme-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Keine vorgeschlagenen Partner für diesen Lead' : 'No suggested partners for this lead'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? 'Suchen Sie nach Partnern nach Firmenname, E-Mail oder Partner-ID oben' : 'Search for partners by company name, email, or partner ID above'}
                    </p>
                  </div>
                ) : filteredPartners.length === 0 ? (
                  <div className="text-center h-[300px] flex flex-col justify-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                      <svg className="w-8 h-8" style={{ color: 'var(--theme-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <p className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Keine Suchergebnisse' : 'No Search Results'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? `Keine Partner gefunden für "${partnerSearchQuery}"` : `No partners found matching "${partnerSearchQuery}"`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 h-[300px] overflow-y-auto pr-2">
                    {filteredPartners.map((partner) => {
                      const isSelected = selectedPartners.includes(partner._id);
                      const isExclusive = partner.partnerType === 'exclusive';
                      const isAtCapacity = partner.hasCapacity === false; // Check backend capacity status

                      // Check if partner has existing assignment for this lead
                      // Try multiple comparison methods as the assignment might use different ID formats
                      const hasExistingAssignment = selectedLead?.partnerAssignments?.some(assignment => {
                        const statusMatch = ['accepted', 'pending', 'cancel requested'].includes(assignment.status);

                        // Helper to check if values are valid for comparison (not null, undefined, or empty string)
                        const isValidValue = (val) => val !== null && val !== undefined && val !== '';

                        // Check both assignment.partnerId and assignment.partner (if it's an object)
                        // Only compare if both values are valid (not undefined/null)
                        const idMatch =
                          (isValidValue(assignment.partnerId) && isValidValue(partner._id) && assignment.partnerId === partner._id) ||
                          (isValidValue(assignment.partnerId) && isValidValue(partner.partnerId) && assignment.partnerId === partner.partnerId) ||
                          (isValidValue(assignment.partnerId) && isValidValue(partner._id) && String(assignment.partnerId) === String(partner._id)) ||
                          (isValidValue(assignment.partnerId) && isValidValue(partner.partnerId) && String(assignment.partnerId) === String(partner.partnerId)) ||
                          // Also check if assignment.partner exists as an object
                          (isValidValue(assignment.partner?._id) && isValidValue(partner._id) && assignment.partner._id === partner._id) ||
                          (isValidValue(assignment.partner?._id) && isValidValue(partner.partnerId) && assignment.partner._id === partner.partnerId) ||
                          (isValidValue(assignment.partner?.partnerId) && isValidValue(partner.partnerId) && assignment.partner.partnerId === partner.partnerId) ||
                          (isValidValue(assignment.partner?.partnerId) && isValidValue(partner._id) && assignment.partner.partnerId === partner._id) ||
                          (isValidValue(assignment.partner?._id) && isValidValue(partner._id) && String(assignment.partner._id) === String(partner._id)) ||
                          (isValidValue(assignment.partner?._id) && isValidValue(partner.partnerId) && String(assignment.partner._id) === String(partner.partnerId));

                        return idMatch && statusMatch;
                      });

                      // Enhanced debug logging for ALL partners - showing actual assignments
                      console.log(`🔍 CHECKING PARTNER: ${partner.companyName || partner.partnerId}`, {
                        partnerName: partner.companyName,
                        partnerId: partner.partnerId,
                        partner_id: partner._id,
                        hasExistingAssignment,
                        leadId: selectedLead?.leadId,
                        actualAssignments: selectedLead?.partnerAssignments?.map(assignment => ({
                          status: assignment.status,
                          assignmentPartnerId: assignment.partnerId,
                          assignmentPartner: {
                            _id: assignment.partner?._id,
                            partnerId: assignment.partner?.partnerId,
                            companyName: typeof assignment.partner?.companyName === 'object'
                              ? assignment.partner?.companyName?.companyName
                              : assignment.partner?.companyName
                          },
                          matches: {
                            partnerId_vs_partner_id: assignment.partnerId === partner._id,
                            partnerId_vs_partnerId: assignment.partnerId === partner.partnerId,
                            partner_id_vs_partner_id: assignment.partner?._id === partner._id,
                            partner_id_vs_partnerId: assignment.partner?._id === partner.partnerId,
                            partner_partnerId_vs_partner_id: assignment.partner?.partnerId === partner._id,
                            partner_partnerId_vs_partnerId: assignment.partner?.partnerId === partner.partnerId
                          }
                        }))
                      });

                      // Also log all partners to see data structure
                      if (partner.companyName) {
                        console.log(`Partner ${partner.companyName}:`, {
                          hasExistingAssignment,
                          partnerId: partner.partnerId,
                          _id: partner._id
                        });
                      }

                      // Debug logging for partner data
                      console.log('Partner weekly data:', {
                        companyName: partner.companyName,
                        currentWeekLeads: partner.currentWeekLeads,
                        averageLeadsPerWeek: partner.averageLeadsPerWeek,
                        weeklyLimit: partner.weeklyLimit,
                        customPricing: partner.customPricing,
                        hasExistingAssignment
                      });

                      return (
                        <div
                          key={partner._id}
                          className={`p-4 rounded-lg border transition-all duration-200 ${
                            hasExistingAssignment
                              ? 'opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'border-blue-500 shadow-md cursor-pointer'
                                : 'hover:border-gray-400 hover:shadow-sm cursor-pointer'
                          } ${isExclusive ? 'ring-2 ring-yellow-400' : ''} ${
                            isAtCapacity ? 'ring-2 ring-orange-400' : ''
                          } ${hasExistingAssignment ? 'ring-2 ring-gray-400' : ''}`}
                          style={{
                            backgroundColor: hasExistingAssignment
                              ? 'rgba(107, 114, 128, 0.1)' // Gray background for existing assignment
                              : isSelected
                                ? 'rgba(59, 130, 246, 0.1)'
                                : isAtCapacity
                                  ? 'rgba(249, 115, 22, 0.1)' // Light orange background for no capacity
                                  : 'var(--theme-bg-secondary)',
                            borderColor: hasExistingAssignment
                              ? '#6b7280' // Gray border for existing assignment
                              : isSelected
                                ? '#3b82f6'
                                : isAtCapacity
                                  ? '#f97316' // Orange border for no capacity
                                  : 'var(--theme-border)'
                          }}
                          onClick={() => !hasExistingAssignment && handlePartnerSelect(partner)}
                        >
                          {/* Company Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-bold" style={{ color: 'var(--theme-text)' }}>
                                {partner.companyName || 'Unknown Company'}
                              </h4>
                              {partnerFilter === 'search' && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  partner.partnerType === 'exclusive'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                }`}>
                                  {partner.partnerType === 'exclusive' ? 'exclusive' : 'basic'}
                                </span>
                              )}
                              {partner.locationMatch && (
                                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
                                  📍 Match
                                </span>
                              )}
                              {isAtCapacity && (
                                <span className="px-2 py-1 bg-orange-500 text-white rounded-full text-xs font-medium">
                                  AT CAPACITY
                                </span>
                              )}
                              {hasExistingAssignment && (
                                <span className="px-2 py-1 bg-gray-500 text-white rounded-full text-xs font-medium">
                                  ALREADY ASSIGNED
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
                                <div className="text-xs" style={{ color: 'var(--theme-text)', opacity: 0.8 }}>
                                  {partner.contactPerson?.email || 'Email not provided'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                              <div className="text-center">
                                <div className={`font-bold text-sm ${isAtCapacity ? 'text-orange-600' : ''}`}
                                     style={{ color: isAtCapacity ? '#ea580c' : 'var(--theme-text)' }}>
                                  {partner.currentWeekLeads || 0}/{(() => {
                                    const customValue = partner.customPricing?.leadsPerWeek;
                                    const adminValue = adminSettings?.leadDistribution?.[selectedLead?.serviceType]?.[partner.partnerType]?.leadsPerWeek;

                                    // Temporary fix: Use known admin settings if adminValue is undefined
                                    let fallbackValue;
                                    if (selectedLead?.serviceType === 'moving') {
                                      fallbackValue = partner.partnerType === 'exclusive' ? 5 : 3; // moving: exclusive=5, basic=3
                                    } else {
                                      fallbackValue = partner.partnerType === 'exclusive' ? 8 : 5; // cleaning: exclusive=8, basic=5
                                    }

                                    // Only use averageLeadsPerWeek if it's a valid positive number
                                    const hasValidAverageLeads = partner.averageLeadsPerWeek && partner.averageLeadsPerWeek > 0;

                                    // Proper fallback logic with temporary admin settings
                                    let finalValue;
                                    if (hasValidAverageLeads) {
                                      finalValue = partner.averageLeadsPerWeek;
                                    } else if (customValue) {
                                      finalValue = customValue;
                                    } else if (adminValue) {
                                      finalValue = adminValue;
                                    } else {
                                      // Use fallback admin settings values
                                      finalValue = fallbackValue;
                                    }

                                    // Debug logging for all partners in search results
                                    if (partner.companyName === 'Alpha') {
                                      console.log(`🔍 ${partner.companyName} capacity calc:`, {
                                        averageLeadsPerWeek: partner.averageLeadsPerWeek,
                                        hasValidAverageLeads,
                                        customValue,
                                        adminValue,
                                        serviceType: selectedLead?.serviceType,
                                        partnerType: partner.partnerType,
                                        adminSettingsPath: `${selectedLead?.serviceType}.${partner.partnerType}.leadsPerWeek`,
                                        adminSettingsAvailable: !!adminSettings,
                                        adminSettingsStructure: adminSettings?.leadDistribution,
                                        finalValue
                                      });
                                    }

                                    return finalValue;
                                  })()}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
                                  {isAtCapacity ? 'At Capacity' : 'Weekly'}
                                </div>
                              </div>
                              <div className="w-px h-6" style={{ backgroundColor: 'var(--theme-border)' }}></div>
                              <div className="text-center">
                                <div className="font-bold text-sm" style={{ color: 'var(--theme-text)' }}>
                                  {partner.acceptanceRate || 0}%
                                </div>
                                <div className="text-xs" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Accept</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </div>

              {/* Action Buttons */}
                <div className="flex justify-between items-center space-x-3 pb-8 pt-4 px-6">
                  <div className="text-sm space-y-1 mb-4" style={{ color: 'var(--theme-text)' }}>
                    <div>
                      <span style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Basis-Partner - Mehrfachauswahl erlaubt' : 'Basic partners - multiple selection allowed'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Exklusive Partner - Einzelauswahl' : 'Exclusive partners - single selection'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-3 mb-4">
                    <button
                    onClick={handleCloseAssignModal}
                    className="px-4 py-2 border rounded-lg font-medium hover:opacity-80"
                    style={{
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)',
                      backgroundColor: 'var(--theme-bg-secondary)'
                    }}
                  >
                    {isGerman ? 'Abbrechen' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleConfirmAssignment}
                    disabled={selectedPartners.length === 0 || assigningLead}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      selectedPartners.length === 0 || assigningLead
                        ? 'cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    style={selectedPartners.length === 0 || assigningLead ? {
                      backgroundColor: 'var(--theme-bg)',
                      color: 'var(--theme-text)',
                      opacity: 0.5,
                      border: '1px solid var(--theme-border)'
                    } : {}}
                  >
                    {assigningLead ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isGerman ? 'Wird zugewiesen...' : 'Assigning...'}
                      </span>
                    ) : (
                      isGerman
                        ? `Zu ${selectedPartners.length} Partner${selectedPartners.length !== 1 ? 'n' : ''} zuweisen`
                        : `Assign to ${selectedPartners.length} Partner${selectedPartners.length !== 1 ? 's' : ''}`
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

      {/* Partner Assignment Dialog */}
      <AnimatePresence>
        {showPartnerAssignmentDialog && selectedLeadForPartners && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-md"
            onClick={() => setShowPartnerAssignmentDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border-2"
              style={{
                backgroundColor: 'var(--theme-bg-secondary)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)'
              }}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--theme-border)' }}>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Zugewiesene Partner' : 'Assigned Partners'}
                </h3>
                <button
                  onClick={() => setShowPartnerAssignmentDialog(false)}
                  className="p-2 rounded-lg transition-colors hover:bg-opacity-80"
                  style={{ color: 'var(--theme-muted)', backgroundColor: 'var(--theme-bg)' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Lead Info */}
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  <div className="text-sm" style={{ color: 'var(--theme-text)' }}>
                    <span className="font-medium">{isGerman ? 'Lead-ID:' : 'Lead ID:'}</span>{' '}
                    {selectedLeadForPartners.leadId}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--theme-text)' }}>
                    <span className="font-medium">{isGerman ? 'Service:' : 'Service:'}</span>{' '}
                    {selectedLeadForPartners.serviceType === 'moving'
                      ? (isGerman ? 'Umzug' : 'Moving')
                      : (isGerman ? 'Reinigung' : 'Cleaning')}
                  </div>
                </div>

                {/* Partner Assignments */}
                <div className="space-y-3">
                  {selectedLeadForPartners.partnerAssignments
                    ?.filter(assignment =>
                      assignment.status !== 'rejected' &&
                      assignment.status !== 'cancelled'
                    )
                    .map((assignment, index) => {
                      const partner = assignment.partner;
                      const statusColors = {
                        pending: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
                        accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                        cancellationRequested: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      };
                      const statusLabels = {
                        pending: isGerman ? 'Ausstehend' : 'Pending',
                        accepted: isGerman ? 'Akzeptiert' : 'Accepted',
                        cancellationRequested: isGerman ? 'Stornierung angefordert' : 'Cancel Requested'
                      };

                      return (
                        <div
                          key={index}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                          style={{
                            borderColor: 'var(--theme-border)',
                            backgroundColor: 'var(--theme-card-bg)'
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <button
                                onClick={() => handleNavigateToPartner(partner._id || partner)}
                                className="hover:underline font-medium text-sm"
                                style={{ color: 'var(--theme-button-bg)' }}
                              >
                                {partner.partnerId || (typeof partner === 'object' ? (partner._id || 'N/A') : partner)}
                              </button>
                              {partner.companyName && (
                                <div className="text-sm font-medium mt-1" style={{ color: 'var(--theme-text)' }}>
                                  {typeof partner.companyName === 'object' ? partner.companyName?.companyName || partner.companyName?._id || 'N/A' : partner.companyName}
                                </div>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[assignment.status] || 'bg-gray-100 text-gray-800'}`}>
                              {statusLabels[assignment.status] || assignment.status}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm" style={{ color: 'var(--theme-text)' }}>
                            {/* Partner Type Badge */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                (assignment.partnerType === 'exclusive' || partner.partnerType === 'exclusive')
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {(assignment.partnerType === 'exclusive' || partner.partnerType === 'exclusive')
                                  ? (isGerman ? 'exclusive' : 'exclusive')
                                  : (isGerman ? 'basic' : 'basic')}
                              </span>
                            </div>

                            {partner.contactPerson?.email && (
                              <div>
                                <span className="font-medium">{isGerman ? 'E-Mail:' : 'Email:'}</span>{' '}
                                {partner.contactPerson.email}
                              </div>
                            )}
                            {assignment.price && (
                              <div>
                                <span className="font-medium">{isGerman ? 'Preis:' : 'Price:'}</span>{' '}
                                €{assignment.price}
                              </div>
                            )}
                            {assignment.assignedAt && (
                              <div className="text-xs mt-2" style={{ color: 'var(--theme-muted)' }}>
                                {isGerman ? 'Zugewiesen am:' : 'Assigned at:'}{' '}
                                {new Date(assignment.assignedAt).toLocaleString(isGerman ? 'de-DE' : 'en-US')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {(!selectedLeadForPartners.partnerAssignments ||
                  selectedLeadForPartners.partnerAssignments.filter(a => a.status !== 'rejected' && a.status !== 'cancelled').length === 0) && (
                  <div className="text-center py-8" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Keine aktiven Partner-Zuweisungen' : 'No active partner assignments'}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: 'var(--theme-border)' }}>
                <button
                  onClick={() => setShowPartnerAssignmentDialog(false)}
                  className="px-4 py-2 rounded-lg transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--theme-button-bg)',
                    color: 'var(--theme-button-text)'
                  }}
                >
                  {isGerman ? 'Schließen' : 'Close'}
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