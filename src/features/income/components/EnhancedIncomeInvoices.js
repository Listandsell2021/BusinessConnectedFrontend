import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useService } from '../../../contexts/ServiceContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { partnersAPI, invoicesAPI, leadsAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';
import Pagination from '../../../components/ui/Pagination';
import { formatDateGerman, formatDateLongGerman, getGermanMonthName } from '../../../lib/dateFormatter';
import DatePicker from 'react-datepicker';

const EnhancedIncomeInvoices = () => {
  const { currentService } = useService();
  const { t, isGerman } = useLanguage();
  const { user, isSuperAdmin, isPartner } = useAuth();

  // State Management
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerDetails, setPartnerDetails] = useState({
    unpaidLeads: [], // Leads without invoices
    invoicedLeads: [], // Leads in invoices but not paid
    invoices: [],
    paidLeads: [] // Leads in paid invoices
  });
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentView, setCurrentView] = useState('table'); // 'table' or 'details'
  const [activeDetailTab, setActiveDetailTab] = useState('unpaid');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [invoiceDetailData, setInvoiceDetailData] = useState(null);
  const [activeInvoiceTab, setActiveInvoiceTab] = useState('unpaid');
  const [invoiceTabData, setInvoiceTabData] = useState({
    paidLeads: [],
    unpaidLeads: [],
    invoiceInfo: null
  });
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Selected Leads for Invoice Generation
  const [selectedLeadsForInvoice, setSelectedLeadsForInvoice] = useState(new Set());

  // Cancel Request Dialog
  const [showCancelRequestDialog, setShowCancelRequestDialog] = useState(false);
  const [cancelRequestedLeads, setCancelRequestedLeads] = useState([]);
  const [rejectingCancelRequest, setRejectingCancelRequest] = useState(false);

  // Date Filters for Accepted Date
  const [dateFilters, setDateFilters] = useState({
    filterType: 'all', // 'all', 'single', 'range', 'week', 'month', 'year'
    singleDate: '',
    dateRange: { from: '', to: '' },
    week: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 8;

  // Always use monthly mode for invoice generation

  // Filters
  const [filters, setFilters] = useState({
    search: '', // Search by Partner ID, Company Name, Email
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    invoiceStatus: 'all' // 'pending', 'generated', 'all'
  });

  // Helper function to format Date to YYYY-MM-DD (respects local timezone)
  const formatDateString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load Partners with Invoice Status
  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch more partners to account for client-side filtering
      const params = {
        page: 1,
        limit: 100, // Fetch more to account for filtering
        serviceType: currentService,
        search: filters.search || undefined,
        month: filters.month,
        year: filters.year
      };

      // Get partners from API
      const partnersResponse = await partnersAPI.getAll(params);
      let partnersData = partnersResponse.data.partners || [];

      // Client-side filtering: only show 'active' or 'suspended' status
      // AND approvedAt date must be in selected month or before
      const endOfSelectedMonth = new Date(filters.year, filters.month, 0);
      partnersData = partnersData.filter(partner => {
        const isValidStatus = ['active', 'suspended'].includes(partner.status);
        const approvedAt = partner.approvedAt ? new Date(partner.approvedAt) : null;
        const isApprovedBeforeOrInMonth = !approvedAt || approvedAt <= endOfSelectedMonth;
        return isValidStatus && isApprovedBeforeOrInMonth;
      });

      // Get all invoices for the selected period once (instead of per-partner)
      let invoicesByPartner = {};
      let allInvoices = [];
      try {
        const periodParams = {
          startDate: new Date(filters.year, filters.month - 1, 1).toISOString(),
          endDate: new Date(filters.year, filters.month, 0, 23, 59, 59, 999).toISOString(),
          serviceType: currentService
          // No limit - fetch all invoices for the period
        };

        const allInvoicesResponse = await invoicesAPI.getAll(periodParams);
        allInvoices = allInvoicesResponse.data.invoices || [];

        // Create a map of partner ID to their last invoice
        invoicesByPartner = {};
        allInvoices.forEach(invoice => {
          const partnerId = invoice.partnerId?._id || invoice.partnerId;
          if (!invoicesByPartner[partnerId]) {
            invoicesByPartner[partnerId] = invoice;
          }
        });
      } catch (error) {
        console.error('Error fetching invoices for period:', error);
      }

      // Map partners with invoice status from the fetched data
      const partnersWithInvoiceStatus = partnersData.map((partner) => {
        const hasInvoice = !!invoicesByPartner[partner._id];
        const lastInvoice = invoicesByPartner[partner._id];

        return {
          ...partner,
          invoiceStatus: hasInvoice ? 'generated' : 'pending',
          lastInvoiceDate: lastInvoice?.createdAt || null,
          lastInvoiceId: lastInvoice?._id || null
        };
      });

      // Filter by invoice status if not 'all'
      let filteredPartners = partnersWithInvoiceStatus;
      if (filters.invoiceStatus !== 'all') {
        filteredPartners = partnersWithInvoiceStatus.filter(p => p.invoiceStatus === filters.invoiceStatus);
      }

      // Set total based on filtered results
      setTotalItems(filteredPartners.length);

      // Apply client-side pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedPartners = filteredPartners.slice(startIndex, endIndex);

      setPartners(paginatedPartners);

      // Calculate total revenue from already fetched invoices
      const monthlyRevenue = allInvoices.reduce((total, invoice) => total + (invoice.total || 0), 0);
      setTotalRevenue(monthlyRevenue);
    } catch (error) {
      console.error('Error loading partners:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Partner' : 'Error loading partners');
    } finally {
      setLoading(false);
    }
  }, [currentService, filters, currentPage, isGerman]);

  // Load Partner Details (Leads and Invoices)
  const loadPartnerDetails = async (partnerId) => {
    setDetailLoading(true);
    try {
      const periodStart = new Date(filters.year, filters.month - 1, 1);
      const periodEnd = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);

      // Get ALL partner's leads (no date filter - we'll filter by acceptedAt on frontend)
      // This ensures we capture leads that were assigned earlier but accepted in the selected month
      const leadsResponse = await partnersAPI.getLeads(partnerId, {
        // Don't pass date filters - we'll filter client-side by acceptedAt
        // Don't filter by status here - we'll filter client-side to include accepted and cancel_requested
      });

      console.log('=== API RESPONSE ===', {
        totalLeads: leadsResponse.data.leads?.length,
        leads: leadsResponse.data.leads?.map(lead => ({
          leadId: lead.leadId,
          hasPartnerAssignments: !!lead.partnerAssignments,
          partnerAssignmentsIsArray: Array.isArray(lead.partnerAssignments),
          partnerAssignmentsCount: lead.partnerAssignments?.length || 0,
          allAssignments: lead.partnerAssignments,
          paymentStatus: lead.paymentStatus
        }))
      });

      const allLeads = leadsResponse.data.leads || [];

      console.log('=== FILTERING LEADS ===', {
        partnerId,
        totalLeads: allLeads.length
      });

      // IMPORTANT: Create assignment items instead of just filtering leads
      // Since the same lead can be assigned multiple times to the same partner,
      // we need to create a separate item for each valid assignment
      // Valid statuses: ONLY 'accepted' and 'cancellationRequested'
      const assignmentItems = [];

      allLeads.forEach(lead => {
        // Handle both cases: partnerAssignments can be an object or an array
        let partnerAssignments = [];
        if (Array.isArray(lead.partnerAssignments)) {
          partnerAssignments = lead.partnerAssignments;
        } else if (lead.partnerAssignments && typeof lead.partnerAssignments === 'object') {
          // If it's a single object, convert to array
          partnerAssignments = [lead.partnerAssignments];
        }

        // Find ALL valid assignments for this partner (not just one)
        // Filter by acceptedAt date to ensure we only show leads accepted in the selected period
        const validAssignments = partnerAssignments.filter(assignment => {
          const matchesPartner = assignment.partner === partnerId ||
                                assignment.partner?._id === partnerId ||
                                assignment.partner?.$oid === partnerId;
          const hasValidStatus = assignment.status === 'accepted' ||
                                assignment.status === 'cancellationRequested';

          // Check if the acceptedAt date falls within the selected period
          let acceptedInPeriod = true;
          if (assignment.acceptedAt) {
            const acceptedDate = new Date(assignment.acceptedAt);
            acceptedInPeriod = acceptedDate >= periodStart && acceptedDate <= periodEnd;
          } else if (assignment.assignedAt) {
            // Fallback to assignedAt if acceptedAt is not available
            const assignedDate = new Date(assignment.assignedAt);
            acceptedInPeriod = assignedDate >= periodStart && assignedDate <= periodEnd;
          }

          return matchesPartner && hasValidStatus && acceptedInPeriod;
        });

        // Create an item for each valid assignment
        validAssignments.forEach(assignment => {
          assignmentItems.push({
            ...lead,
            // Store the specific assignment for this item
            currentAssignment: assignment,
            // Keep original partnerAssignments for reference
            partnerAssignments: partnerAssignments
          });
        });
      });

      console.log('=== AFTER FILTERING ===', {
        assignmentItemsCount: assignmentItems.length,
        assignmentItems: assignmentItems.map(item => ({
          leadId: item.leadId,
          assignmentId: item.currentAssignment._id,
          assignmentStatus: item.currentAssignment.status,
          leadPrice: item.currentAssignment.leadPrice,
          paymentStatus: item.currentAssignment.paymentStatus || 'unpaid',
          invoiceGenerated: item.currentAssignment.invoiceGenerated || false
        }))
      });

      console.log('=== TOTAL ASSIGNMENT ITEMS ===', {
        totalAssignmentItems: assignmentItems.length
      });

      // Get partner's invoices for the period
      const invoicesResponse = await invoicesAPI.getAll({
        partnerId,
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString()
      });

      const invoices = invoicesResponse.data.invoices || [];

      // Create a map of lead IDs that are in invoices and their payment status
      const leadsInInvoices = new Map();
      invoices.forEach(invoice => {
        invoice.items.forEach(item => {
          const leadId = item.leadId?._id || item.leadId;
          if (leadId) {
            leadsInInvoices.set(leadId.toString(), {
              invoiceStatus: invoice.status,
              invoiceId: invoice._id
            });
          }
        });
      });

      // Categorize leads based on invoice status
      const unpaidLeads = []; // Leads NOT in any invoice (and NOT cancelled)
      const invoicedLeads = []; // Leads in unpaid invoices
      const paidLeads = []; // Leads in paid invoices

      assignmentItems.forEach(item => {
        const leadIdStr = item._id.toString();
        const invoiceInfo = leadsInInvoices.get(leadIdStr);

        // Exclude leads with cancellation requests from unpaid leads
        const hasCancellationRequest = item.currentAssignment?.status === 'cancellationRequested';

        if (!invoiceInfo && !hasCancellationRequest) {
          // Lead is not in any invoice AND doesn't have cancellation request
          unpaidLeads.push(item);
        } else if (invoiceInfo?.invoiceStatus === 'paid') {
          // Lead is in a paid invoice
          paidLeads.push(item);
        } else if (invoiceInfo && !hasCancellationRequest) {
          // Lead is in an unpaid invoice (pending/generated) AND doesn't have cancellation request
          invoicedLeads.push(item);
        }
      });

      console.log('=== CATEGORIZED LEADS ===', {
        unpaidCount: unpaidLeads.length,
        invoicedCount: invoicedLeads.length,
        paidCount: paidLeads.length
      });

      setPartnerDetails({
        unpaidLeads,
        invoicedLeads,
        invoices,
        paidLeads
      });
    } catch (error) {
      console.error('Error loading partner details:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Partner-Details' : 'Error loading partner details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Effects
  // Reset to page 1 when filters or service change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.month, filters.year, filters.search, filters.invoiceStatus, currentService]);

  useEffect(() => {
    loadPartners();
  }, [currentPage, filters.month, filters.year, filters.search, filters.invoiceStatus, currentService, loadPartners]);


  // Filter Functions
  const resetFilters = () => {
    setFilters({
      search: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      invoiceStatus: 'all'
    });
    setCurrentPage(1);
  };

  // Filter leads by accepted date
  const filterLeadsByDate = (leads) => {
    if (dateFilters.filterType === 'all') {
      return leads;
    }

    return leads.filter(item => {
      const acceptedDate = new Date(item.currentAssignment?.acceptedAt || item.createdAt);

      // Single Date Filter
      if (dateFilters.filterType === 'single' && dateFilters.singleDate) {
        const filterDate = new Date(dateFilters.singleDate);
        return acceptedDate.toDateString() === filterDate.toDateString();
      }

      // Date Range Filter
      if (dateFilters.filterType === 'range') {
        if (dateFilters.dateRange.from && dateFilters.dateRange.to) {
          const fromDate = new Date(dateFilters.dateRange.from);
          const toDate = new Date(dateFilters.dateRange.to);
          fromDate.setHours(0, 0, 0, 0);
          toDate.setHours(23, 59, 59, 999);
          return acceptedDate >= fromDate && acceptedDate <= toDate;
        }
      }

      // Week Filter - Get Sunday to Saturday of the selected week
      if (dateFilters.filterType === 'week' && dateFilters.week) {
        const selectedDate = new Date(dateFilters.week);
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Calculate Sunday of the current week
        const weekStart = new Date(selectedDate);
        weekStart.setDate(selectedDate.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);

        // Calculate Saturday of the current week
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        return acceptedDate >= weekStart && acceptedDate <= weekEnd;
      }

      // Month Filter
      if (dateFilters.filterType === 'month') {
        return acceptedDate.getMonth() + 1 === dateFilters.month &&
               acceptedDate.getFullYear() === dateFilters.year;
      }

      // Year Filter
      if (dateFilters.filterType === 'year') {
        return acceptedDate.getFullYear() === dateFilters.year;
      }

      return true;
    });
  };

  // Lead Selection Functions
  const toggleLeadSelection = (leadId) => {
    console.log('🔍 TOGGLE LEAD SELECTION - leadId:', leadId);
    setSelectedLeadsForInvoice(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
        console.log('❌ DESELECTED:', leadId, 'New size:', newSet.size);
      } else {
        newSet.add(leadId);
        console.log('✅ SELECTED:', leadId, 'New size:', newSet.size);
      }
      console.log('📊 SELECTED LEADS TOTAL:', newSet.size);
      return newSet;
    });
  };

  const toggleSelectAllLeads = (leads) => {
    if (selectedLeadsForInvoice.size === leads.length) {
      // Deselect all
      setSelectedLeadsForInvoice(new Set());
    } else {
      // Select all
      const allLeadIds = new Set(leads.map(lead => lead._id.toString()));
      setSelectedLeadsForInvoice(allLeadIds);
    }
  };

  const clearLeadSelection = () => {
    setSelectedLeadsForInvoice(new Set());
  };

  // View Partner Details
  const viewPartnerDetails = (partner) => {
    console.log('viewPartnerDetails called with partner:', partner);
    setSelectedPartner(partner);
    setCurrentView('details');
    loadPartnerDetails(partner._id);
  };

  // Handle back to table view
  const handleBackToTable = () => {
    setCurrentView('table');
    setSelectedPartner(null);
    setPartnerDetails({ unpaidLeads: [], invoicedLeads: [], invoices: [], paidLeads: [] });
    clearLeadSelection();
  };

  // View Invoice Details
  const viewInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetail(true);
    setDetailLoading(true);
    setActiveInvoiceTab('unpaid');

    try {
      // Get detailed invoice information
      const response = await invoicesAPI.getById(invoice._id);
      const invoiceData = response.data.invoice;
      setInvoiceDetailData(invoiceData);

      // Load invoice leads data for the billing period
      const billingPeriod = {
        startDate: invoiceData.billingPeriod.from || invoiceData.billingPeriod.startDate,
        endDate: invoiceData.billingPeriod.to || invoiceData.billingPeriod.endDate
      };

      // Get all leads for this partner during the billing period
      const leadsResponse = await partnersAPI.getLeads(invoiceData.partnerId._id, {
        startDate: billingPeriod.startDate,
        endDate: billingPeriod.endDate
        // Don't filter by status - we'll filter client-side
      });

      const allLeads = leadsResponse.data.leads || [];

      // Create assignment items for invoice view
      const assignmentItems = [];

      allLeads.forEach(lead => {
        // Handle both cases: partnerAssignments can be an object or an array
        let partnerAssignments = [];
        if (Array.isArray(lead.partnerAssignments)) {
          partnerAssignments = lead.partnerAssignments;
        } else if (lead.partnerAssignments && typeof lead.partnerAssignments === 'object') {
          // If it's a single object, convert to array
          partnerAssignments = [lead.partnerAssignments];
        }

        // Find ALL valid assignments for this partner
        const validAssignments = partnerAssignments.filter(assignment => {
          const matchesPartner = assignment.partner === invoiceData.partnerId._id || assignment.partner?._id === invoiceData.partnerId._id;
          const hasValidStatus = assignment.status === 'accepted' ||
                                assignment.status === 'cancellationRequested';
          return matchesPartner && hasValidStatus;
        });

        // Create an item for each valid assignment
        validAssignments.forEach(assignment => {
          assignmentItems.push({
            ...lead,
            currentAssignment: assignment,
            partnerAssignments: partnerAssignments
          });
        });
      });

      const paidLeads = assignmentItems.filter(item => item.currentAssignment?.paymentStatus === 'paid');
      const unpaidLeads = assignmentItems.filter(item => item.currentAssignment?.paymentStatus !== 'paid');

      setInvoiceTabData({
        paidLeads,
        unpaidLeads,
        invoiceInfo: invoiceData
      });
    } catch (error) {
      console.error('Error loading invoice details:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Rechnungsdetails' : 'Error loading invoice details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Close Invoice Details
  const closeInvoiceDetails = () => {
    setShowInvoiceDetail(false);
    setSelectedInvoice(null);
    setInvoiceDetailData(null);
    setInvoiceTabData({
      paidLeads: [],
      unpaidLeads: [],
      invoiceInfo: null
    });
  };

  // Generate Invoice for Selected Unpaid Leads
  const generateInvoiceForPartner = async (partnerId) => {
    try {
      console.log('🎯 BUTTON CLICKED - generateInvoiceForPartner');
      console.log('📋 selectedLeadsForInvoice.size:', selectedLeadsForInvoice.size);
      console.log('📋 selectedLeadsForInvoice contents:', Array.from(selectedLeadsForInvoice));

      // Use filtered leads to match what's shown in the table
      const displayedUnpaidLeads = filterLeadsByDate(partnerDetails.unpaidLeads);
      console.log('📋 displayedUnpaidLeads count:', displayedUnpaidLeads.length);

      // Get selected leads only
      const selectedLeads = displayedUnpaidLeads.filter(item => {
        const itemId = item._id.toString();
        const isSelected = selectedLeadsForInvoice.has(itemId);
        console.log('🔎 Checking lead:', itemId, 'isSelected:', isSelected);
        return isSelected;
      });

      console.log('✅ selectedLeads count:', selectedLeads.length);

      if (selectedLeads.length === 0) {
        console.error('❌ No leads selected for invoice generation');
        toast.error(isGerman ? 'Bitte wählen Sie mindestens einen Lead aus' : 'Please select at least one lead');
        return;
      }

      console.log('✅ All selected leads are valid for invoice (no cancellation requests)');

      const startDate = new Date(filters.year, filters.month - 1, 1).toISOString();
      const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59, 999).toISOString();

      const invoiceData = {
        partnerId,
        serviceType: currentService,
        billingPeriod: {
          startDate: startDate,
          endDate: endDate
        },
        items: selectedLeads.map(item => ({
          leadId: item._id,
          description: `${currentService} Lead - ${item.leadId}`,
          amount: item.currentAssignment?.leadPrice || 30
        })),
        subtotal: selectedLeads.reduce((total, item) => total + (item.currentAssignment?.leadPrice || 30), 0),
        tax: selectedLeads.reduce((total, item) => total + (item.currentAssignment?.leadPrice || 30), 0) * 0.19,
        total: selectedLeads.reduce((total, item) => total + (item.currentAssignment?.leadPrice || 30), 0) * 1.19
      };

      console.log('🚀 FRONTEND DEBUG - Sending invoice data:', {
        selectedLeadsCount: selectedLeads.length,
        itemsCount: invoiceData.items.length,
        selectedLeadIds: invoiceData.items.map(item => item.leadId),
        invoiceData: JSON.stringify(invoiceData, null, 2)
      });

      const response = await invoicesAPI.create(invoiceData);
      console.log('✅ INVOICE CREATED:', response);
      toast.success(isGerman ? 'Rechnung erfolgreich erstellt' : 'Invoice created successfully');

      // Clear selections and reload data
      clearLeadSelection();
      loadPartners();
      if (selectedPartner) {
        loadPartnerDetails(selectedPartner._id);
      }
    } catch (error) {
      console.error('❌ INVOICE CREATION ERROR:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message || error.message,
        data: error.response?.data,
        invoiceData: JSON.stringify(invoiceData, null, 2)
      });

      const errorMessage = error.response?.data?.message || error.message;
      toast.error(isGerman ? `Fehler: ${errorMessage}` : `Error: ${errorMessage}`);
    }
  };

  // Reject Cancel Request and restore lead to accepted status
  const rejectCancelRequest = async (leadId) => {
    setRejectingCancelRequest(true);
    try {
      // Call API to reject the cancel request
      await leadsAPI.rejectCancelRequest(leadId);

      toast.success(isGerman ? 'Stornierungsanfrage abgelehnt' : 'Cancel request rejected');

      // Reload partner details
      if (selectedPartner) {
        await loadPartnerDetails(selectedPartner._id);
      }

      // Update the cancel requested leads list
      setCancelRequestedLeads(prev => prev.filter(lead => lead._id !== leadId));

      // If no more cancel requests, close the dialog
      if (cancelRequestedLeads.length <= 1) {
        setShowCancelRequestDialog(false);
      }
    } catch (error) {
      console.error('Error rejecting cancel request:', error);
      toast.error(isGerman ? 'Fehler beim Ablehnen der Stornierungsanfrage' : 'Error rejecting cancel request');
    } finally {
      setRejectingCancelRequest(false);
    }
  };

  // Reject all cancel requests
  const rejectAllCancelRequests = async () => {
    setRejectingCancelRequest(true);
    try {
      // Reject all cancel requests
      await Promise.all(
        cancelRequestedLeads.map(lead => leadsAPI.rejectCancelRequest(lead._id))
      );

      toast.success(isGerman ? 'Alle Stornierungsanfragen abgelehnt' : 'All cancel requests rejected');

      // Reload partner details
      if (selectedPartner) {
        await loadPartnerDetails(selectedPartner._id);
      }

      // Close dialog
      setShowCancelRequestDialog(false);
      setCancelRequestedLeads([]);
    } catch (error) {
      console.error('Error rejecting cancel requests:', error);
      toast.error(isGerman ? 'Fehler beim Ablehnen der Stornierungsanfragen' : 'Error rejecting cancel requests');
    } finally {
      setRejectingCancelRequest(false);
    }
  };

  // Download Invoice PDF
  const downloadInvoicePDF = async (invoiceId) => {
    try {
      // Pass the current language to the PDF generation
      const language = isGerman ? 'de' : 'en';
      const response = await invoicesAPI.generatePDF(invoiceId, language);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(isGerman ? 'PDF heruntergeladen' : 'PDF downloaded');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(isGerman ? 'Fehler beim Herunterladen der PDF' : 'Error downloading PDF');
    }
  };

  // Update Invoice Payment Status
  const updateInvoicePaymentStatus = async (invoiceId, status) => {
    try {
      // Update invoice status using dedicated endpoints
      if (status === 'paid') {
        await invoicesAPI.markPaid(invoiceId);
      } else {
        // Use the mark-unpaid endpoint
        await invoicesAPI.markUnpaid(invoiceId);
      }

      toast.success(isGerman
        ? `Rechnung als ${status === 'paid' ? 'bezahlt' : 'unbezahlt'} markiert`
        : `Invoice marked as ${status}`
      );

      // Reload data to reflect the changes
      loadPartners();
      if (selectedPartner) {
        loadPartnerDetails(selectedPartner._id);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error(isGerman ? 'Fehler beim Aktualisieren des Zahlungsstatus' : 'Error updating payment status');
    }
  };

  // Send Invoice Email to Partner
  const sendInvoiceEmail = async (invoice) => {
    try {
      const partnerEmail = invoice.partnerId.email;
      if (!partnerEmail) {
        toast.error(isGerman ? 'Partner E-Mail nicht gefunden' : 'Partner email not found');
        return;
      }

      // Generate email content
      const emailSubject = `${isGerman ? 'Rechnung' : 'Invoice'} ${invoice.invoiceNumber}`;
      const emailBody = `${isGerman ? 'Sehr geehrte Damen und Herren' : 'Dear Partner'},

${isGerman ? 'anbei erhalten Sie Ihre Rechnung' : 'Please find attached your invoice'} ${invoice.invoiceNumber}.

${isGerman ? 'Rechnungsdetails:' : 'Invoice Details:'}
- ${isGerman ? 'Rechnungsnummer:' : 'Invoice Number:'} ${invoice.invoiceNumber}
- ${isGerman ? 'Gesamtbetrag:' : 'Total Amount:'} ${formatCurrency(invoice.total)}
- ${isGerman ? 'Fälligkeitsdatum:' : 'Due Date:'} ${formatDate(invoice.dueAt)}

${isGerman ? 'Mit freundlichen Grüßen' : 'Best regards'},
${isGerman ? 'Ihr Business Connected Team' : 'Your Business Connected Team'}`;

      // For now, we'll create a mailto link - in production this would be an API call
      const mailtoLink = `mailto:${partnerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoLink);

      toast.success(isGerman ? 'E-Mail-Client geöffnet' : 'Email client opened');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(isGerman ? 'Fehler beim Senden der E-Mail' : 'Error sending email');
    }
  };

  // Utility Functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return formatDateGerman(new Date(date));
  };

  // Partner Details Component (Full Page View like Partner Management)
  const PartnerDetailsView = () => {
    if (!selectedPartner) return null;

    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToTable}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
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
              ← {isGerman ? 'Zurück' : 'Back'}
            </button>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
                {selectedPartner.companyName}
              </h2>
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Partner Details' : 'Partner Details'} - {filters.month}/{filters.year}
              </p>
            </div>
          </div>

          {/* Generate Invoice Button - Export Button Style */}
          {activeDetailTab === 'unpaid' && partnerDetails.unpaidLeads.length > 0 && (
            <>
              {console.log('📌 BUTTON RENDERED - unpaid leads:', partnerDetails.unpaidLeads.length, 'selected:', selectedLeadsForInvoice.size)}
              <motion.button
                onClick={() => {
                  console.log('🖱️ BUTTON CLICKED EVENT FIRED');
                  generateInvoiceForPartner(selectedPartner._id);
                }}
                disabled={selectedLeadsForInvoice.size === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: selectedLeadsForInvoice.size === 0 ? 'var(--theme-border)' : 'var(--theme-button-bg)',
                color: selectedLeadsForInvoice.size === 0 ? 'var(--theme-muted)' : 'var(--theme-button-text)',
                cursor: selectedLeadsForInvoice.size === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedLeadsForInvoice.size === 0 ? 0.5 : 1
              }}
              whileHover={selectedLeadsForInvoice.size > 0 ? { scale: 1.02 } : {}}
              whileTap={selectedLeadsForInvoice.size > 0 ? { scale: 0.98 } : {}}
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isGerman
                ? `Rechnung erstellen (${selectedLeadsForInvoice.size} ausgewählt)`
                : `Generate Invoice (${selectedLeadsForInvoice.size} selected)`
              }
            </motion.button>
            </>
          )}
        </div>

        {/* Tab Navigation with Filter on Right - Lead Management Style */}
        <div className="flex justify-between items-end border-b" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
          {/* Tabs on the left */}
          <div className="flex space-x-0">
            {[
              { id: 'unpaid', label: isGerman ? 'Unbezahlte Leads' : 'Unpaid Leads', count: partnerDetails.unpaidLeads.length },
              { id: 'invoiced', label: isGerman ? 'Rechnungen erstellt' : 'Invoice Created Leads', count: partnerDetails.invoicedLeads.length },
              { id: 'invoices', label: isGerman ? 'Rechnungen' : 'Invoices', count: partnerDetails.invoices.length },
              { id: 'paid', label: isGerman ? 'Bezahlte Leads' : 'Paid Leads', count: partnerDetails.paidLeads.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDetailTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeDetailTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{
                  backgroundColor: activeDetailTab === tab.id ? 'var(--theme-bg)' : 'transparent',
                  color: activeDetailTab === tab.id ? 'var(--theme-primary)' : 'var(--theme-muted)'
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Filter on the right */}
          {(activeDetailTab === 'unpaid' || activeDetailTab === 'invoiced') && (
            <div className="flex items-end gap-2 px-4 pb-3">
              <select
                value={dateFilters.filterType}
                onChange={(e) => setDateFilters(prev => ({ ...prev, filterType: e.target.value }))}
                className="px-3 py-2 rounded border text-sm font-medium transition-colors hover:border-blue-400 focus:border-blue-500"
                style={{
                  borderColor: 'var(--theme-border)',
                  backgroundColor: 'var(--theme-bg)',
                  color: 'var(--theme-text)',
                  width: '140px',
                  height: '38px',
                  cursor: 'pointer'
                }}
              >
                <option value="all">{isGerman ? 'Alle Daten' : 'All Dates'}</option>
                <option value="single">{isGerman ? 'Einzelnes Datum' : 'Single Date'}</option>
                <option value="range">{isGerman ? 'Datumsbereich' : 'Date Range'}</option>
                <option value="week">{isGerman ? 'Woche' : 'Week'}</option>
                <option value="month">{isGerman ? 'Monat' : 'Month'}</option>
                <option value="year">{isGerman ? 'Jahr' : 'Year'}</option>
              </select>

              {/* Single Date Filter */}
              {dateFilters.filterType === 'single' && (
                <DatePicker
                  selected={dateFilters.singleDate ? new Date(dateFilters.singleDate) : null}
                  onChange={(date) => setDateFilters(prev => ({ ...prev, singleDate: date ? formatDateString(date) : '' }))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText={isGerman ? 'Datum auswählen' : 'Select date'}
                  popperPlacement="top"
                  className="px-3 py-2 rounded border text-sm transition-colors"
                  style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', width: '160px', height: '38px', boxSizing: 'border-box' }}
                />
              )}

              {/* Date Range Filter */}
              {dateFilters.filterType === 'range' && (
                <>
                  <DatePicker
                    selected={dateFilters.dateRange.from ? new Date(dateFilters.dateRange.from) : null}
                    onChange={(date) => setDateFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, from: date ? formatDateString(date) : '' } }))}
                    maxDate={dateFilters.dateRange.to ? new Date(dateFilters.dateRange.to) : new Date()}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={isGerman ? 'Von' : 'From'}
                    popperPlacement="top"
                    className="px-3 py-2 rounded border text-sm transition-colors"
                    style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', width: '140px', height: '38px', boxSizing: 'border-box' }}
                  />
                  <DatePicker
                    selected={dateFilters.dateRange.to ? new Date(dateFilters.dateRange.to) : null}
                    onChange={(date) => setDateFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, to: date ? formatDateString(date) : '' } }))}
                    minDate={dateFilters.dateRange.from ? new Date(dateFilters.dateRange.from) : null}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={isGerman ? 'Bis' : 'To'}
                    popperPlacement="top"
                    className="px-3 py-2 rounded border text-sm transition-colors"
                    style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', width: '140px', height: '38px', boxSizing: 'border-box' }}
                  />
                </>
              )}

              {/* Week Filter */}
              {dateFilters.filterType === 'week' && (
                <DatePicker
                  selected={dateFilters.week ? new Date(dateFilters.week) : null}
                  onChange={(date) => setDateFilters(prev => ({ ...prev, week: date ? formatDateString(date) : '' }))}
                  dateFormat="dd/MM/yyyy"
                  showWeekNumbers
                  popperPlacement="top"
                  placeholderText={isGerman ? 'Woche auswählen' : 'Select week'}
                  className="px-3 py-2 rounded border text-sm transition-colors"
                  style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', width: '160px', height: '38px', boxSizing: 'border-box' }}
                />
              )}

              {/* Month Filter */}
              {dateFilters.filterType === 'month' && (
                <DatePicker
                  selected={dateFilters.month ? new Date(2024, dateFilters.month - 1, 1) : null}
                  onChange={(date) => setDateFilters(prev => ({ ...prev, month: date ? date.getMonth() + 1 : new Date().getMonth() + 1 }))}
                  dateFormat="MM/yyyy"
                  showMonthYearPicker
                  popperPlacement="top"
                  placeholderText={isGerman ? 'Monat auswählen' : 'Select month'}
                  className="px-3 py-2 rounded border text-sm transition-colors"
                  style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', width: '160px', height: '38px', boxSizing: 'border-box' }}
                />
              )}

              {/* Year Filter */}
              {dateFilters.filterType === 'year' && (
                <DatePicker
                  selected={dateFilters.year ? new Date(dateFilters.year, 0, 1) : null}
                  onChange={(date) => setDateFilters(prev => ({ ...prev, year: date ? date.getFullYear() : new Date().getFullYear() }))}
                  dateFormat="yyyy"
                  showYearPicker
                  popperPlacement="top"
                  placeholderText={isGerman ? 'Jahr auswählen' : 'Select year'}
                  className="px-3 py-2 rounded border text-sm transition-colors"
                  style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', width: '140px', height: '38px', boxSizing: 'border-box' }}
                />
              )}

              {/* Reset Button */}
              {dateFilters.filterType !== 'all' && (
                <button
                  onClick={() => setDateFilters({ filterType: 'all', singleDate: '', dateRange: { from: '', to: '' }, week: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })}
                  className="px-3 py-2 rounded text-sm font-medium transition-all duration-200 hover:shadow-md"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'white',
                    border: '1px solid var(--theme-primary)',
                    height: '38px'
                  }}
                  title={isGerman ? 'Filter zurücksetzen' : 'Clear filters'}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <motion.div
          className="overflow-hidden rounded-lg border border-t-0"
          style={{ borderColor: 'var(--theme-border)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="overflow-x-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Lade...' : 'Loading...'}
                </span>
              </div>
            ) : (
              <div style={{ backgroundColor: 'var(--theme-bg)' }}>

                {/* Main Table Content */}
                <div className="overflow-x-auto">
                  {activeDetailTab === 'unpaid' && (
                    <LeadsTable leads={filterLeadsByDate(partnerDetails.unpaidLeads)} type="unpaid" />
                  )}
                  {activeDetailTab === 'invoiced' && (
                    <LeadsTable leads={filterLeadsByDate(partnerDetails.invoicedLeads)} type="invoiced" />
                  )}
                  {activeDetailTab === 'invoices' && (
                    <InvoicesTable invoices={partnerDetails.invoices} onDownload={downloadInvoicePDF} onView={viewInvoiceDetails} />
                  )}
                  {activeDetailTab === 'paid' && (
                    <LeadsTable leads={partnerDetails.paidLeads} type="paid" />
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  // Leads Table Component
  const LeadsTable = ({ leads, type }) => {
    if (leads.length === 0) {
      return (
        <div className="text-center py-8" style={{ color: 'var(--theme-muted)' }}>
          {isGerman ? 'Keine Leads gefunden' : 'No leads found'}
        </div>
      );
    }

    // Check if we have any leads and what service type they are
    const hasSecurityLeads = leads.some(lead => lead.serviceType === 'security');
    const hasMovingLeads = leads.some(lead => lead.serviceType === 'moving');
    const hasCleaningLeads = leads.some(lead => lead.serviceType === 'cleaning');
    const isSecurityOnly = hasSecurityLeads && !hasMovingLeads && !hasCleaningLeads;
    const isMovingOnly = hasMovingLeads && !hasCleaningLeads && !hasSecurityLeads;
    const isCleaningOnly = hasCleaningLeads && !hasMovingLeads && !hasSecurityLeads;

    return (
      <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
        <thead style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
          <tr>
            {/* Checkbox column - only show for unpaid leads */}
            {type === 'unpaid' && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-12" style={{ color: 'var(--theme-muted)' }}>
                <input
                  type="checkbox"
                  checked={selectedLeadsForInvoice.size === leads.length && leads.length > 0}
                  onChange={() => toggleSelectAllLeads(leads)}
                  style={{
                    cursor: 'pointer',
                    width: '18px',
                    height: '18px'
                  }}
                  title={isGerman ? 'Alle auswählen' : 'Select all'}
                />
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Lead ID' : 'Lead ID'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Kunde' : 'Customer'}
            </th>
            {/* Show Pickup column only for moving leads */}
            {isMovingOnly && (
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Abholung' : 'Pickup'}
              </th>
            )}
            {/* Show single location column for security and cleaning, destination for moving */}
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
              {isSecurityOnly
                ? (isGerman ? 'Service-Ort' : 'Service Location')
                : isCleaningOnly
                ? (isGerman ? 'Service-Adresse' : 'Service Address')
                : (isGerman ? 'Ziel' : 'Destination')
              }
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Betrag' : 'Amount'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Akzeptiert am' : 'Accepted Date'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Gewünschtes Startdatum' : 'Desired Start Date'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
          {leads.map((item) => {
            // Each item now has currentAssignment which is the specific assignment for this row
            const partnerAssignment = item.currentAssignment;

            // Helper function to extract city and country from address
            const extractCityCountry = (address) => {
              if (!address) return 'N/A';

              if (typeof address === 'object') {
                // Handle address objects with city and country fields
                const city = address.city || address.location?.city || '';
                const country = address.country || address.location?.country || 'Germany';
                return city ? `${city}, ${country}` : country;
              }

              if (typeof address === 'string') {
                // Try to extract city and country from full address string
                const parts = address.split(',').map(part => part.trim());
                if (parts.length >= 2) {
                  // Assuming format: "Street, PostalCode City, Country" or similar
                  const lastPart = parts[parts.length - 1]; // Country
                  const secondLastPart = parts[parts.length - 2]; // PostalCode + City

                  // Extract city from "PostalCode City" format
                  const cityMatch = secondLastPart.match(/\d+\s+(.+)/);
                  const city = cityMatch ? cityMatch[1] : secondLastPart;

                  return `${city}, ${lastPart}`;
                }
                return address;
              }

              return 'N/A';
            };

            // Get location addresses based on service type
            let locationDisplay = 'N/A';

            if (item.serviceType === 'security') {
              // For security: show service location (city & postal code)
              const city = item.formData?.location?.city || item.city || '';
              const postalCode = item.formData?.location?.postalCode || item.postalCode || '';
              const country = item.formData?.location?.country || item.country || 'Germany';

              if (city || postalCode) {
                locationDisplay = `${city}${postalCode ? ` ${postalCode}` : ''}, ${country}`;
              }
            } else if (item.serviceType === 'moving') {
              // For moving: show destination/delivery location
              const deliveryLocation = item.deliveryLocation ||
                                     item.formData?.deliveryLocation ||
                                     item.formData?.destination;
              locationDisplay = extractCityCountry(deliveryLocation);
            } else if (item.serviceType === 'cleaning') {
              // For cleaning: only destination/service address, no pickup
              const serviceAddress = item.serviceLocation?.serviceAddress ||
                                    item.formData?.serviceAddress ||
                                    item.formData?.address;
              locationDisplay = extractCityCountry(serviceAddress);
            }

            return (
              <tr key={partnerAssignment?._id || `${item._id}-${Math.random()}`}>
                {/* Checkbox column - only show for unpaid leads */}
                {type === 'unpaid' && (
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedLeadsForInvoice.has(item._id.toString())}
                      onChange={() => toggleLeadSelection(item._id.toString())}
                      style={{
                        cursor: 'pointer',
                        width: '18px',
                        height: '18px'
                      }}
                    />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  {item.leadId || item._id.slice(-6)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                      {item.user?.firstName} {item.user?.lastName}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                      {item.user?.email}
                    </div>
                  </div>
                </td>
                {/* Show Pickup column only for moving services */}
                {isMovingOnly && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm" style={{ color: 'var(--theme-text)' }}>
                      {item.pickupLocation ? extractCityCountry(item.pickupLocation) : 'N/A'}
                    </div>
                  </td>
                )}
                {/* Show Location column (single for security, destination for moving, service address for cleaning) */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm" style={{ color: 'var(--theme-text)' }}>
                    {locationDisplay}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                  {formatCurrency(
                    partnerAssignment?.leadPrice ||
                    item.actualValue ||
                    item.estimatedValue ||
                    30 // Default fallback value
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                  {formatDate(partnerAssignment?.acceptedAt || item.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                  {item.formData?.desiredStartDate ? formatDate(item.formData.desiredStartDate) : 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // Invoices Table Component
  const InvoicesTable = ({ invoices, onDownload, onView }) => {
    if (invoices.length === 0) {
      return (
        <div className="text-center py-8" style={{ color: 'var(--theme-muted)' }}>
          {isGerman ? 'Keine Rechnungen gefunden' : 'No invoices found'}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
          <thead style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Rechnung ID' : 'Invoice ID'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Rechnungsperiode' : 'Billing Period'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Betrag' : 'Amount'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Erstellt' : 'Created'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Aktionen' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
            {invoices.map((invoice) => (
              <tr key={invoice._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  {invoice.invoiceNumber || `INV-${invoice._id.slice(-6)}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                  {invoice.billingPeriod ?
                    (() => {
                      const date = new Date(invoice.billingPeriod.from);
                      return `${getGermanMonthName(date.getMonth())} ${date.getFullYear()}`;
                    })() :
                    'N/A'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                  {formatCurrency(invoice.total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                  {formatDate(invoice.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {invoice.status === 'paid' ? (
                      <button
                        onClick={() => updateInvoicePaymentStatus(invoice._id, 'unpaid')}
                        className="text-xs px-3 py-1 rounded transition-colors"
                        style={{
                          backgroundColor: '#EF4444',
                          color: 'white',
                          border: '1px solid #EF4444'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#DC2626';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#EF4444';
                        }}
                        title={isGerman ? 'Als unbezahlt markieren' : 'Mark as Unpaid'}
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        {isGerman ? 'Unbezahlt' : 'Unpaid'}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateInvoicePaymentStatus(invoice._id, 'paid')}
                        className="text-xs px-3 py-1 rounded transition-colors"
                        style={{
                          backgroundColor: '#10B981',
                          color: 'white',
                          border: '1px solid #10B981'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#059669';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#10B981';
                        }}
                        title={isGerman ? 'Als bezahlt markieren' : 'Mark as Paid'}
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {isGerman ? 'Bezahlt' : 'Paid'}
                      </button>
                    )}
                    <button
                      onClick={() => onDownload(invoice._id)}
                      className="text-xs px-3 py-1 rounded transition-colors"
                      style={{
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        border: '1px solid #3B82F6'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#2563EB';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#3B82F6';
                      }}
                      title={isGerman ? 'PDF herunterladen' : 'Download PDF'}
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {isGerman ? 'PDF' : 'PDF'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Invoice Detail Sidebar Component
  const InvoiceDetailSidebar = () => {
    if (!showInvoiceDetail || !selectedInvoice || !invoiceDetailData) return null;

    return (
      <div className="fixed inset-0 z-[60] flex">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={closeInvoiceDetails}
        />

        {/* Sidebar */}
        <div className="relative ml-auto h-full w-2/3 bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: 'var(--theme-bg)' }}>
            <div>
              <h3 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Rechnung' : 'Invoice'} {invoiceDetailData.invoiceNumber}
              </h3>
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                {invoiceDetailData.partnerId.companyName} - {formatDate(invoiceDetailData.createdAt)}
              </p>
            </div>
            <button
              onClick={closeInvoiceDetails}
              className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              ×
            </button>
          </div>

          {/* Invoice Summary */}
          <div className="px-6 py-4" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(invoiceDetailData.total)}
                </div>
                <div className="text-sm text-gray-500">
                  {isGerman ? 'Gesamtbetrag' : 'Total Amount'}
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  invoiceDetailData.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {invoiceDetailData.status === 'paid' ? (
                    <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {invoiceDetailData.status === 'paid'
                    ? (isGerman ? 'Bezahlt' : 'Paid')
                    : (isGerman ? 'Ausstehend' : 'Pending')
                  }
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {invoiceDetailData.items.length}
                </div>
                <div className="text-sm text-gray-500">
                  {isGerman ? 'Positionen' : 'Items'}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {/* Tab Navigation */}
            <div className="px-6 py-4" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
              <div className="flex space-x-1 rounded-lg p-1 bg-gray-100">
                {[
                  { id: 'unpaid', label: isGerman ? 'Unbezahlte Leads' : 'Unpaid Leads', count: invoiceTabData.unpaidLeads.length },
                  { id: 'paid', label: isGerman ? 'Bezahlte Leads' : 'Paid Leads', count: invoiceTabData.paidLeads.length },
                  { id: 'invoice', label: isGerman ? 'Rechnungsdetails' : 'Invoice Details', count: null }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInvoiceTab(tab.id)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeInvoiceTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label} {tab.count !== null ? `(${tab.count})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Lade...' : 'Loading...'}
                  </span>
                </div>
              ) : (
                <div>
                  {activeInvoiceTab === 'unpaid' && (
                    <InvoiceLeadsTable leads={invoiceTabData.unpaidLeads} type="unpaid" />
                  )}
                  {activeInvoiceTab === 'paid' && (
                    <InvoiceLeadsTable leads={invoiceTabData.paidLeads} type="paid" />
                  )}
                  {activeInvoiceTab === 'invoice' && (
                    <InvoiceDetailsTable invoice={invoiceDetailData} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Invoice Leads Table Component (reuse but rename for clarity)
  const InvoiceLeadsTable = ({ leads, type }) => {
    if (leads.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {isGerman ? 'Keine Leads gefunden' : 'No leads found'}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isGerman ? 'Lead ID' : 'Lead ID'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isGerman ? 'Kunde' : 'Customer'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isGerman ? 'Service' : 'Service'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isGerman ? 'Betrag' : 'Amount'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isGerman ? 'Datum' : 'Date'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((item) => {
              // Each item now has currentAssignment
              const assignment = item.currentAssignment;

              return (
                <tr key={assignment?._id || `${item._id}-${Math.random()}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {item.leadId || item._id.slice(-6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.user?.firstName} {item.user?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.user?.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.serviceType === 'security' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {item.serviceType === 'security' ? (isGerman ? 'Umzug' : 'Moving') : (isGerman ? 'Reinigung' : 'Cleaning')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(assignment?.leadPrice || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(assignment?.acceptedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Invoice Details Table Component
  const InvoiceDetailsTable = ({ invoice }) => {
    // Create table data for invoice details
    const invoiceDetailsData = [
      {
        label: isGerman ? 'Rechnungsnummer' : 'Invoice Number',
        value: invoice.invoiceNumber
      },
      {
        label: isGerman ? 'Service Typ' : 'Service Type',
        value: invoice.serviceType.charAt(0).toUpperCase() + invoice.serviceType.slice(1)
      },
      {
        label: isGerman ? 'Partner' : 'Partner',
        value: invoice.partnerId.companyName
      },
      {
        label: isGerman ? 'Kontaktperson' : 'Contact Person',
        value: invoice.partnerId.contactPerson || 'N/A'
      },
      {
        label: isGerman ? 'E-Mail' : 'Email',
        value: invoice.partnerId.email || 'N/A'
      },
      {
        label: isGerman ? 'Telefon' : 'Phone',
        value: invoice.partnerId.phone || 'N/A'
      },
      {
        label: isGerman ? 'Erstellt am' : 'Created Date',
        value: formatDate(invoice.createdAt)
      },
      {
        label: isGerman ? 'Fällig am' : 'Due Date',
        value: formatDate(invoice.dueAt)
      },
      {
        label: isGerman ? 'Abrechnungszeitraum' : 'Billing Period',
        value: `${formatDate(invoice.billingPeriod.from || invoice.billingPeriod.startDate)} - ${formatDate(invoice.billingPeriod.to || invoice.billingPeriod.endDate)}`
      },
      {
        label: isGerman ? 'Zwischensumme' : 'Subtotal',
        value: formatCurrency(invoice.subtotal)
      },
      {
        label: isGerman ? 'MwSt. (19%)' : 'Tax (19%)',
        value: formatCurrency(invoice.tax || 0)
      },
      {
        label: isGerman ? 'Gesamtsumme' : 'Total Amount',
        value: formatCurrency(invoice.total)
      },
      {
        label: isGerman ? 'Status' : 'Status',
        value: (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            invoice.status === 'paid'
              ? 'bg-green-100 text-green-800'
              : invoice.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {invoice.status === 'paid'
              ? (isGerman ? 'Bezahlt' : 'Paid')
              : invoice.status === 'pending'
              ? (isGerman ? 'Ausstehend' : 'Pending')
              : (isGerman ? 'Storniert' : 'Cancelled')
            }
          </span>
        )
      }
    ];

    // Add payment information if paid
    if (invoice.status === 'paid' && invoice.paidAt) {
      invoiceDetailsData.push(
        {
          label: isGerman ? 'Bezahlt am' : 'Paid Date',
          value: formatDate(invoice.paidAt)
        }
      );

      if (invoice.paymentMethod) {
        invoiceDetailsData.push({
          label: isGerman ? 'Zahlungsmethode' : 'Payment Method',
          value: invoice.paymentMethod
        });
      }

      if (invoice.paymentReference) {
        invoiceDetailsData.push({
          label: isGerman ? 'Referenz' : 'Reference',
          value: invoice.paymentReference
        });
      }
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isGerman ? 'Feld' : 'Field'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isGerman ? 'Wert' : 'Value'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoiceDetailsData.map((row, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.label}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {typeof row.value === 'string' ? row.value : row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Invoice Items Section */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Rechnungspositionen' : 'Invoice Items'}
          </h4>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isGerman ? 'Lead ID' : 'Lead ID'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isGerman ? 'Kunde' : 'Customer'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isGerman ? 'Akzeptiert am' : 'Accepted Date'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isGerman ? 'Preis' : 'Price'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {item.leadId?.leadId || item.leadId?._id?.slice(-6) || `LEAD-${index + 1}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.leadId?.user?.firstName && item.leadId?.user?.lastName
                      ? `${item.leadId.user.firstName} ${item.leadId.user.lastName}`
                      : item.leadId?.user?.email || 'Customer'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.acceptedDate ? formatDate(item.acceptedDate) : formatDate(new Date())}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td colSpan="3" className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  {isGerman ? 'Zwischensumme:' : 'Subtotal:'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(invoice.subtotal)}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td colSpan="3" className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  {isGerman ? 'MwSt. (19%):' : 'Tax (19%):'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(invoice.tax || 0)}
                </td>
              </tr>
              <tr className="bg-blue-50 border-t-2 border-blue-300">
                <td colSpan="3" className="px-6 py-4 text-right text-lg font-bold text-blue-900">
                  {isGerman ? 'GESAMTSUMME:' : 'TOTAL TO PAY:'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-blue-900 text-right">
                  {formatCurrency(invoice.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={() => downloadInvoicePDF(invoice._id)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            style={{ backgroundColor: 'var(--theme-export-button)', color: 'white' }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'var(--theme-export-button)';
            }}
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {isGerman ? 'PDF herunterladen' : 'Download PDF'}
          </button>

          <button
            onClick={() => sendInvoiceEmail(invoice)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            style={{ backgroundColor: '#16A34A', color: 'white' }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#15803D';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#16A34A';
            }}
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isGerman ? 'E-Mail senden' : 'Send Email'}
          </button>

          {invoice.status === 'pending' && (
            <button
              onClick={() => {
                // Mark as paid functionality - would need API endpoint
                toast.info(isGerman ? 'Als bezahlt markieren - noch nicht implementiert' : 'Mark as paid - not yet implemented');
              }}
              className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
              style={{ backgroundColor: '#D97706', color: 'white' }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#B45309';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#D97706';
              }}
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isGerman ? 'Als bezahlt markieren' : 'Mark as Paid'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Conditional rendering based on currentView
  if (currentView === 'details') {
    return <PartnerDetailsView />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Partner-Rechnungsmanagement' : 'Partner Invoice Management'}
        </h2>
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
            placeholder={isGerman ? 'Partner ID, Firmenname oder E-Mail suchen...' : 'Search Partner ID, Company Name or Email...'}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-input"
          />
        </div>


        {/* Month Filter */}
        <div className="flex-1 min-w-[120px]">
          <select
            value={filters.month || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, month: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-input"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {getGermanMonthName(i)}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div className="flex-1 min-w-[100px]">
          <select
            value={filters.year}
            onChange={(e) => setFilters(prev => ({ ...prev, year: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-input"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        {/* Invoice Status Filter */}
        <div className="flex-1 min-w-[120px]">
          <select
            value={filters.invoiceStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, invoiceStatus: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-input"
          >
            <option value="all">{isGerman ? 'Alle Status' : 'All Status'}</option>
            <option value="pending">{isGerman ? 'Ausstehend' : 'Pending'}</option>
            <option value="generated">{isGerman ? 'Erstellt' : 'Generated'}</option>
          </select>
        </div>

        {/* Reset Button */}
        <div>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-lg transition-colors h-10 flex items-center"
            style={{
              backgroundColor: 'var(--theme-button-bg)',
              color: 'var(--theme-button-text)'
            }}
          >
            {isGerman ? 'Reset' : 'Reset'}
          </button>
        </div>
      </motion.div>

      {/* Total Revenue Display - Compact Header Style */}
      <motion.div
        className="mb-4 p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--theme-bg-secondary)',
          borderColor: 'var(--theme-border)'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Gesamtumsatz' : 'Total Revenue'}
              </div>
              <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                {filters.month && filters.year ? `${getGermanMonthName(filters.month - 1)} ${filters.year}` : 'N/A'}
              </div>
            </div>
          </div>
          <div className="text-2xl">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Partners Table */}
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--theme-border)' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
            <thead style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Partner ID' : 'Partner ID'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Firmenname' : 'Company Name'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'E-Mail' : 'Email'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Typ' : 'Type'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Kontakt' : 'Contact'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Letzte Rechnung' : 'Last Invoice'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Rechnungsstatus' : 'Invoice Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Aktion' : 'Action'}
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
                        {isGerman ? 'Lade...' : 'Loading...'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Keine Partner gefunden' : 'No partners found'}
                  </td>
                </tr>
              ) : (
                partners.map((partner, index) => (
                  <motion.tr
                    key={partner._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-opacity-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {partner.partnerId || partner._id.slice(-6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                      {typeof partner.companyName === 'object' ? partner.companyName?.companyName || partner.companyName?._id || 'N/A' : partner.companyName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                      {partner.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        partner.partnerType === 'exclusive'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {partner.partnerType === 'exclusive'
                          ? (isGerman ? 'Exklusiv' : 'Exclusive')
                          : (isGerman ? 'Basis' : 'Basic')
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                      {partner.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                      {formatDate(partner.lastInvoiceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        partner.invoiceStatus === 'generated'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {partner.invoiceStatus === 'generated'
                          ? (isGerman ? 'Erstellt' : 'Generated')
                          : (isGerman ? 'Ausstehend' : 'Pending')
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => viewPartnerDetails(partner)}
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
                        title={isGerman ? 'Partner Details ansehen' : 'View Partner Details'}
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {isGerman ? 'Ansehen' : 'View'}
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* Invoice Detail Sidebar */}
      <InvoiceDetailSidebar />

      {/* Cancel Request Dialog */}
      {showCancelRequestDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              color: 'var(--theme-text)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>
                <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {isGerman ? 'Stornierungsanfragen ausstehend' : 'Cancel Requests Pending'}
              </h3>
              <button
                onClick={() => setShowCancelRequestDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="mb-4" style={{ color: 'var(--theme-muted)' }}>
              {isGerman
                ? 'Die folgenden Leads haben ausstehende Stornierungsanfragen. Bitte lehnen Sie die Stornierungsanfragen ab, bevor Sie eine Rechnung erstellen.'
                : 'The following leads have pending cancel requests. Please reject the cancel requests before generating an invoice.'}
            </p>

            <div className="space-y-3 mb-6">
              {cancelRequestedLeads.map(lead => (
                <div
                  key={lead._id}
                  className="p-4 rounded-lg border flex justify-between items-center"
                  style={{
                    backgroundColor: 'var(--theme-bg-secondary)',
                    borderColor: 'var(--theme-border)'
                  }}
                >
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Lead ID:' : 'Lead ID:'} {lead.leadId}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? 'Service:' : 'Service:'} {lead.serviceType}
                    </div>
                    <div className="text-sm text-orange-600">
                      {isGerman ? 'Status: Stornierung angefordert' : 'Status: Cancel Requested'}
                    </div>
                  </div>
                  <button
                    onClick={() => rejectCancelRequest(lead._id)}
                    disabled={rejectingCancelRequest}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rejectingCancelRequest ? '...' : (isGerman ? 'Ablehnen' : 'Reject')}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={rejectAllCancelRequests}
                disabled={rejectingCancelRequest}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {rejectingCancelRequest
                  ? (isGerman ? 'Bearbeitung...' : 'Processing...')
                  : (isGerman ? 'Alle ablehnen' : 'Reject All')}
              </button>
              <button
                onClick={() => {
                  setShowCancelRequestDialog(false);
                  // Navigate to Lead Management - Cancelled Requests tab
                  window.location.href = '/dashboard?tab=leads&view=cancelled';
                }}
                className="flex-1 px-4 py-3 rounded-lg border hover:bg-gray-50 font-medium"
                style={{
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              >
                {isGerman ? 'Zur Stornierungsverwaltung' : 'Go to Cancel Management'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default EnhancedIncomeInvoices;