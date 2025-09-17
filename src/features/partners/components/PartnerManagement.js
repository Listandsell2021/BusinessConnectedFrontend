import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useService } from '../../../contexts/ServiceContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { partnersAPI, settingsAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Pagination from '../../../components/ui/Pagination';
import LeadDetailsDialog from '../../../components/ui/LeadDetailsDialog';

const PartnerManagement = ({ initialPartners = [] }) => {
  const { currentService, setHideServiceFilter } = useService();
  const { t, isGerman } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  
  const [partners, setPartners] = useState(initialPartners);
  const [totalPartners, setTotalPartners] = useState(0);
  const [partnerStats, setPartnerStats] = useState({
    total: 0,
    active: 0,
    exclusive: 0,
    pending: 0
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
  
  // Filter states
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    city: '',
    searchTerm: ''
  });

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });

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
    services: [],
    address: {
      street: '',
      city: '',
      postalCode: '',
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
  const [partnerDetailsTab, setPartnerDetailsTab] = useState('overview'); // 'overview' or 'leads'
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
  
  // Date filter state for partner leads
  const [partnerLeadsDateFilter, setPartnerLeadsDateFilter] = useState('current_week'); // 'all', 'current_week', 'last_week', 'current_month', 'last_month'
  const [partnerLeadsStats, setPartnerLeadsStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    cancelled: 0,
    cancel_requested: 0
  });
  const [adminSettings, setAdminSettings] = useState(null);
  const [weeklyLeadStats, setWeeklyLeadStats] = useState({
    currentWeek: 0,
    limit: 0
  });

  // Partner leads sorting state
  const [partnerLeadsSortConfig, setPartnerLeadsSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });

  // Status translation function
  const translateStatus = (status) => {
    const statusMap = {
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
    };
    return statusMap[status] || 'Ausstehend';
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
  };

  // Load partners from API
  const loadPartners = async () => {
    if (!currentService) return;
    
    setLoading(true);
    try {
      const response = await partnersAPI.getAll({
        serviceType: currentService,
        page: currentPage,
        limit: itemsPerPage,
        // Add filters to API call
        partnerType: filters.type !== 'all' ? filters.type : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        city: filters.city || undefined,
        search: filters.searchTerm || undefined,
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
          leadsCount: partner.metrics?.[`${currentService}LeadsReceived`] || 0,
          joinedAt: new Date(partner.createdAt || partner.registeredAt || partner.joinedAt)
        };
      });
      
      setPartners(transformedPartners);
      setTotalPartners(totalCount);
      
      // Update statistics from API response or calculate from data
      const stats = response.data.stats || {};
      setPartnerStats({
        total: totalCount,
        active: stats.active || transformedPartners.filter(p => p.status === 'active').length,
        exclusive: stats.exclusive || transformedPartners.filter(p => p.type === 'exclusive').length,
        pending: stats.pending || transformedPartners.filter(p => p.status === 'pending').length
      });
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
      setPartnerStats({ total: 0, active: 0, exclusive: 0, pending: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Load services from API
  const loadServices = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/services');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentService, initialPartners]);

  // Reload partners when filters, pagination, or sorting change
  useEffect(() => {
    if (currentService) {
      loadPartners();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentService, currentPage, filters.type, filters.status, filters.city, filters.searchTerm, sortConfig.key, sortConfig.direction]);

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
    // Get current service filter to determine which service to approve
    const currentService = filters.serviceType || 'moving'; // Default to moving if no filter

    const confirmMessage = `Sind Sie sicher, dass Sie ${currentService === 'moving' ? 'Umzugsdienst' : 'Reinigungsdienst'} für ${partnerName} genehmigen möchten? Es wird eine E-Mail mit dem temporären Passwort gesendet.`;

    showConfirmation({
      title: partnerName,
      message: confirmMessage,
      confirmText: 'Genehmigen',
      cancelText: 'Abbrechen',
      type: 'success',
      onConfirm: async () => {
        try {
          // Get partner details to use their actual service type
          const partner = partners.find(p => p.id === partnerId);
          const serviceTypeToApprove = partner?.serviceType || currentService;

          const response = await partnersAPI.approveService(partnerId, serviceTypeToApprove);

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

            toast.success(`${currentService === 'moving' ? 'Umzugsdienst' : 'Reinigungsdienst'} erfolgreich genehmigt`);
          } else {
            throw new Error('Unexpected response format');
          }
        } catch (error) {
          console.error('Error approving partner service:', error);
          toast.error('Fehler beim Genehmigen des Dienstes');
          // Reload partners to ensure data consistency on error
          await loadPartners();
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
      toast.error('Fehler beim Ablehnen des Dienstes');
      // Reload partners to ensure data consistency on error
      await loadPartners();
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
          await partnersAPI.updateStatus(partnerId, 'suspended');
          await loadPartners(); // Reload to get fresh data
          toast.success(isGerman ? 'Partner erfolgreich gesperrt' : 'Partner suspended successfully');
        } catch (error) {
          console.error('Error suspending partner:', error);
          toast.error(isGerman ? 'Fehler beim Sperren des Partners' : 'Failed to suspend partner');
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
          await partnersAPI.updateStatus(partnerId, 'active');
          await loadPartners(); // Reload to get fresh data
          toast.success(isGerman ? 'Sperrung erfolgreich aufgehoben' : 'Suspension removed successfully');
        } catch (error) {
          console.error('Error removing suspension:', error);
          toast.error(isGerman ? 'Fehler beim Aufheben der Sperrung' : 'Failed to remove suspension');
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
          await loadPartners(); // Reload to get fresh data
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

  const handleServiceToggle = (service) => {
    setPartnerFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
    
    // Clear service error when user selects a service
    if (partnerFormErrors.services) {
      setPartnerFormErrors(prev => ({
        ...prev,
        services: ''
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

    if (partnerFormData.services.length === 0) {
      errors.services = isGerman ? 'Mindestens eine Dienstleistung auswählen' : 'Please select at least one service';
    }

    // Address validation
    if (!partnerFormData.address.street.trim()) {
      errors['address.street'] = isGerman ? 'Adresse ist erforderlich' : 'Address is required';
    }
    if (!partnerFormData.address.city.trim()) {
      errors['address.city'] = isGerman ? 'PLZ und Stadt sind erforderlich' : 'Postcode and city are required';
    }

    setPartnerFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePartnerSubmit = async () => {
    if (!validatePartnerForm()) return;

    setIsSubmittingPartner(true);
    try {
      const response = await partnersAPI.create(partnerFormData);
      
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
          services: [],
          address: {
            street: '',
            city: '',
            postalCode: '',
            country: 'Germany'
          },
          preferences: {
            averageLeadsPerWeek: 5
          }
        });
        setPartnerFormErrors({});
        
        // Reload partners
        await loadPartners();
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
      services: [],
      address: {
        street: '',
        city: '',
        postalCode: '',
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
    
    switch (filter) {
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
        status: leadData.status || 'pending'
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

  // Load partner leads
  const loadPartnerLeads = async () => {
    if (!partnerForDetails || !partnerForDetails.id) return;

    setPartnerLeadsLoading(true);
    try {
      // Get date range based on filter
      const dateParams = getPartnerDateParams(partnerLeadsDateFilter);
      
      // Filter by current service only
      const response = await partnersAPI.getLeads(partnerForDetails.id, {
        search: partnerLeadsFilters.search || undefined,
        status: partnerLeadsFilters.status !== 'all' ? partnerLeadsFilters.status : undefined,
        city: partnerLeadsFilters.city || undefined,
        service: currentService, // Only show leads for the current selected service
        ...dateParams
      });

      const leadsData = response.data.leads || [];
      const stats = response.data.stats || {};
      
      // Transform leads data similar to LeadManagement
      const transformedLeads = leadsData.map(lead => {
        // Helper function to extract string from location object
        const getLocationString = (location) => {
          if (!location) return '';
          if (typeof location === 'string') return location;
          if (typeof location === 'object') {
            return location.city || location.address || location.name || '';
          }
          return '';
        };

        // Use the partner-specific status provided by the backend
        const partnerStatus = lead.partnerStatus || 'pending';

        return {
          ...lead,
          id: lead._id || lead.id,
          leadId: lead.leadId || lead.id,
          name: lead.user ?
            `${lead.user.firstName} ${lead.user.lastName}`.trim() :
            (lead.name || ''),
          email: lead.user?.email || lead.email || '',
          city: getLocationString(lead.location) || lead.city || '',
          fromLocation: getLocationString(lead.fromLocation) || '',
          toLocation: getLocationString(lead.toLocation) || '',
          pickupLocation: getLocationString(lead.pickupLocation) || getLocationString(lead.formData?.pickupAddress) || '',
          dropoffLocation: getLocationString(lead.dropoffLocation) || '',
          status: partnerStatus
        };
      });

      setPartnerLeads(transformedLeads);
      // Calculate partner-specific stats from transformed leads
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

        // Get lead limit from admin settings
        const leadLimit = settings.leadDistribution?.[serviceType]?.[partnerType]?.leadsPerWeek || 0;

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

  // Load partner leads when tab changes or filters change or service changes
  useEffect(() => {
    if (partnerForDetails && (partnerDetailsTab === 'leads' || partnerDetailsTab === 'overview')) {
      loadPartnerLeads();
    }
  }, [partnerDetailsTab, partnerLeadsFilters, partnerLeadsDateFilter, partnerForDetails, currentService]);

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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [totalPartners]);

  // Load weekly lead stats when partner details or service changes
  useEffect(() => {
    if (partnerForDetails && partnerDetailsTab === 'overview') {
      loadWeeklyLeadStats();
    }
  }, [partnerForDetails, currentService, partnerDetailsTab]);

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
            {isGerman ? 'Partner Details' : 'Partner Details'}
          </h2>
          {partnerForDetails && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(partnerForDetails.status)}`}>
              {partnerForDetails.status === 'active' ? '✅' : 
               partnerForDetails.status === 'pending' ? '⏳' : 
               partnerForDetails.status === 'suspended' ? '🚫' :
               partnerForDetails.status === 'rejected' ? '❌' : '❓'} {partnerForDetails.status}
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
            <option value="rejected">Abgelehnt</option>
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

      </motion.div>
      )}

      {/* Statistics - only show when currentView is 'table' */}
      {currentView === 'table' && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          }
        ].map((stat, index) => (
          <motion.div
            key={index}
            className="p-4 rounded-lg border"
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
                <SortableHeader sortKey="metrics.totalLeadsReceived">
                  {isGerman ? 'Leads' : 'Leads'}
                </SortableHeader>
                <SortableHeader sortKey="createdAt">
                  {isGerman ? 'Erstellt am' : 'Created Date'}
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
                      {partner.joinedAt.toLocaleDateString(isGerman ? 'de-DE' : 'en-GB')}
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
                              title="Service genehmigen"
                            >
                              ✅ Genehmigen
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
                              title="Service ablehnen"
                            >
                              ❌ Ablehnen
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
                                          <span key={city} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1 mb-1">
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
                                          <span key={city} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1 mb-1">
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
                      <tr>
                        <td className="px-4 py-2 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Länder' : 'Countries'}:
                        </td>
                        <td className="px-4 py-2 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.preferences.cleaning.countries?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {partnerForDetails.preferences.cleaning.countries.map(country => (
                                <span key={country} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                  {country}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--theme-muted)' }}>{isGerman ? 'Keine Länder konfiguriert' : 'No countries configured'}</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
                          {isGerman ? 'Städte' : 'Cities'}:
                        </td>
                        <td className="px-4 py-2 text-sm w-2/3" style={{ color: 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)' }}>
                          {partnerForDetails.preferences.cleaning.cities?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {partnerForDetails.preferences.cleaning.cities.map(city => (
                                <span key={city} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  {city}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--theme-muted)' }}>{isGerman ? 'Keine Städte konfiguriert' : 'No cities configured'}</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm font-medium w-1/3" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Radius' : 'Radius'}:
                        </td>
                        <td className="px-4 py-2 text-sm w-2/3" style={{ color: 'var(--theme-text)' }}>
                          <span className="font-medium">{partnerForDetails.preferences.cleaning.radius || 50}km</span>
                        </td>
                      </tr>
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
                    placeholder={isGerman ? 'Suchen...' : 'Search...'}
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
                    <option value="cancelled">{translateStatus('cancelled')}</option>
                    <option value="cancel_requested">{translateStatus('cancel_requested')}</option>
                  </select>
                </div>
                {/* City Filter */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={isGerman ? 'Stadt...' : 'City...'}
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
                  <select
                    value={partnerLeadsDateFilter}
                    onChange={(e) => setPartnerLeadsDateFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: 'var(--theme-input-bg)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)'
                    }}
                  >
                    <option value="all">{isGerman ? 'Alle Daten' : 'All Dates'}</option>
                    <option value="current_week">{isGerman ? 'Aktuelle Woche' : 'Current Week'}</option>
                    <option value="last_week">{isGerman ? 'Letzte Woche' : 'Last Week'}</option>
                    <option value="current_month">{isGerman ? 'Aktueller Monat' : 'Current Month'}</option>
                    <option value="last_month">{isGerman ? 'Letzter Monat' : 'Last Month'}</option>
                  </select>
                </div>
              </motion.div>

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
                        <p className="text-2xl font-bold text-yellow-600">
                          {stat.value}
                        </p>
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
                        <PartnerLeadsSortableHeader sortKey="createdAt">
                          {isGerman ? 'Datum' : 'Date'}
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
                        partnerLeads.map((lead, index) => (
                          <motion.tr
                            key={lead.id}
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
                                lead.status === 'cancel_requested' || lead.status === 'cancellationRequested' ? 'bg-orange-100 text-orange-800' :
                                lead.status === 'cancellation_rejected' ? 'bg-red-100 text-red-800' :
                                lead.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {translateStatus(lead.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                              {new Date(lead.createdAt).toLocaleDateString()}
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
                  ❌ Ablehnen
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

                {/* Service Type - Multi-select Dropdown */}
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
                        borderColor: partnerFormErrors.services ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                    >
                      <span>
                        {partnerFormData.services.length === 0
                          ? (isGerman ? 'Service-Typ auswählen' : 'Select service type')
                          : partnerFormData.services.length === 1
                          ? (() => {
                              const selectedService = servicesData.find(s => s.id === partnerFormData.services[0]);
                              return selectedService ? selectedService.name : partnerFormData.services[0];
                            })()
                          : `${partnerFormData.services.length} ${isGerman ? 'Services ausgewählt' : 'Services selected'}`
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
                              type="checkbox"
                              checked={partnerFormData.services.includes(service.id)}
                              onChange={() => handleServiceToggle(service.id)}
                              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                  {partnerFormErrors.services && (
                    <p className="text-red-500 text-sm mt-1">{partnerFormErrors.services}</p>
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

                {/* Address and Postcode City - Same Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label 
                      htmlFor="partner-address" 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      📍 {isGerman ? 'Adresse' : 'Address'} *
                    </label>
                    <input
                      id="partner-address"
                      name="partner-address"
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
                      htmlFor="partner-postcodeCity" 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      🏘️ {isGerman ? 'PLZ & Stadt' : 'Postcode & City'} *
                    </label>
                    <input
                      id="partner-postcodeCity"
                      name="partner-postcodeCity"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={partnerFormData.address.city}
                      onChange={(e) => {
                        const value = e.target.value;
                        handlePartnerFormChange('address.city', value);
                        // Also extract postal code if present
                        const postalCodeMatch = value.match(/^(\d{5})\s/);
                        if (postalCodeMatch) {
                          handlePartnerFormChange('address.postalCode', postalCodeMatch[1]);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: 'var(--theme-input-bg)',
                        borderColor: partnerFormErrors['address.city'] ? '#ef4444' : 'var(--theme-border)',
                        color: 'var(--theme-text)'
                      }}
                      placeholder={isGerman ? 'PLZ Stadt' : 'Postcode City'}
                    />
                    {partnerFormErrors['address.city'] && (
                      <p className="text-red-500 text-sm mt-1">{partnerFormErrors['address.city']}</p>
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