import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useService } from '../../../contexts/ServiceContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { revenueAPI, invoicesAPI, partnersAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';
import Pagination from '../../../components/ui/Pagination';

const EnhancedIncomeInvoices = () => {
  const { currentService } = useService();
  const { t, isGerman } = useLanguage();
  const { user, isSuperAdmin, isPartner } = useAuth();
  
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [revenueData, setRevenueData] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Statistics
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalNetRevenue: 0,
    confirmedRevenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0
  });
  
  // Pagination
  const [revenueCurrentPage, setRevenueCurrentPage] = useState(1);
  const [invoicesCurrentPage, setInvoicesCurrentPage] = useState(1);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const itemsPerPage = 15;
  
  // Advanced Filters
  const [filters, setFilters] = useState({
    partnerId: 'all',
    city: '',
    search: '',
    dateType: 'month', // 'day', 'week', 'month', 'year', 'custom'
    specificDate: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    customStartDate: '',
    customEndDate: '',
    minAmount: '',
    maxAmount: ''
  });

  // Load Partners for Filter
  useEffect(() => {
    const loadPartners = async () => {
      if (isSuperAdmin) {
        try {
          const response = await partnersAPI.getAll({ 
            status: 'active', 
            limit: 100,
            serviceType: currentService 
          });
          setPartners(response.data.partners || []);
        } catch (error) {
          console.error('Error loading partners:', error);
        }
      }
    };
    loadPartners();
  }, [isSuperAdmin, currentService]);

  // Load Revenue Data
  const loadRevenueData = async () => {
    setLoading(true);
    try {
      const params = {
        page: revenueCurrentPage,
        limit: itemsPerPage,
        serviceType: currentService || undefined,
        partnerId: filters.partnerId !== 'all' ? filters.partnerId : undefined,
        city: filters.city || undefined,
        search: filters.search || undefined
      };

      // Date filtering logic
      if (filters.dateType === 'custom') {
        if (filters.customStartDate) params.startDate = filters.customStartDate;
        if (filters.customEndDate) params.customEndDate = filters.customEndDate;
      } else if (filters.dateType === 'day' && filters.specificDate) {
        params.startDate = filters.specificDate;
        params.endDate = filters.specificDate;
      } else if (filters.dateType === 'month') {
        params.month = filters.month;
        params.year = filters.year;
      } else if (filters.dateType === 'year') {
        params.year = filters.year;
      }

      // Amount filtering
      if (filters.minAmount) params.minAmount = filters.minAmount;
      if (filters.maxAmount) params.maxAmount = filters.maxAmount;

      let response;
      if (isPartner) {
        response = await revenueAPI.getPartnerRevenue(user.id, params);
      } else {
        response = await revenueAPI.getAll(params);
      }
      
      setRevenueData(response.data.revenue || []);
      setTotalRevenue(response.data.pagination?.total || 0);
      setRevenueStats(response.data.summary || revenueStats);
    } catch (error) {
      console.error('Error loading revenue data:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Umsätze' : 'Error loading revenue data');
    } finally {
      setLoading(false);
    }
  };

  // Load Invoices Data
  const loadInvoicesData = async () => {
    if (activeTab !== 'invoices') return;
    
    setLoading(true);
    try {
      const params = {
        page: invoicesCurrentPage,
        limit: itemsPerPage,
        serviceType: currentService || undefined,
        partnerId: filters.partnerId !== 'all' ? filters.partnerId : undefined
      };

      const response = await invoicesAPI.getAll(params);
      setInvoices(response.data.invoices || []);
      setTotalInvoices(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Rechnungen' : 'Error loading invoices');
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'revenue') {
      loadRevenueData();
    } else if (activeTab === 'invoices') {
      loadInvoicesData();
    }
  }, [activeTab, revenueCurrentPage, invoicesCurrentPage, filters, currentService]);


  // Export Functions
  const exportData = async (format) => {
    try {
      const exportParams = {
        serviceType: currentService || undefined,
        partnerId: filters.partnerId !== 'all' ? filters.partnerId : undefined,
        city: filters.city || undefined,
        search: filters.search || undefined
      };

      // Add date filters
      if (filters.dateType === 'custom') {
        if (filters.customStartDate) exportParams.startDate = filters.customStartDate;
        if (filters.customEndDate) exportParams.endDate = filters.customEndDate;
      } else if (filters.dateType === 'month') {
        exportParams.month = filters.month;
        exportParams.year = filters.year;
      } else if (filters.dateType === 'year') {
        exportParams.year = filters.year;
      }

      const response = await revenueAPI.export(format, exportParams);
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `revenue_export_${timestamp}.${format}`;
      link.download = filename;
      
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(isGerman ? `${format.toUpperCase()} erfolgreich exportiert` : `${format.toUpperCase()} export successful`);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error(isGerman ? 'Export fehlgeschlagen' : 'Export failed');
    }
  };

  // Filter Functions
  const resetFilters = () => {
    setFilters({
      partnerId: 'all',
      city: '',
      search: '',
      dateType: 'month',
      specificDate: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      customStartDate: '',
      customEndDate: '',
      minAmount: '',
      maxAmount: ''
    });
    setRevenueCurrentPage(1);
    setInvoicesCurrentPage(1);
  };

  // Utility Functions
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(isGerman ? 'de-DE' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const tabs = [
    { id: 'overview', label: isGerman ? 'Übersicht' : 'Overview', icon: '📊' },
    { id: 'revenue', label: isGerman ? 'Umsätze' : 'Revenue', icon: '💰' },
    { id: 'invoices', label: isGerman ? 'Rechnungen' : 'Invoices', icon: '🧾' }
  ];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Umsätze & Rechnungen' : 'Income & Invoices'}
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
                    onClick={() => exportData('csv')}
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
                  <button
                    onClick={() => exportData('json')}
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
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters - Lead Management Style */}
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
            placeholder={isGerman ? 'Suche nach Kunden, E-Mail, Lead ID...' : 'Search by customer, email, lead ID...'}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          />
        </div>

        {/* Partner Filter */}
        {isSuperAdmin && (
          <div className="flex-1">
            <select
              value={filters.partnerId}
              onChange={(e) => setFilters(prev => ({ ...prev, partnerId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)'
              }}
            >
              <option value="all">{isGerman ? 'Alle Partner' : 'All Partners'}</option>
              {partners.map(partner => (
                <option key={partner._id} value={partner._id}>
                  {partner.companyName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* City Filter */}
        <div className="flex-1">
          <input
            type="text"
            placeholder={isGerman ? 'Stadt' : 'City'}
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
          <select
            value={filters.dateType}
            onChange={(e) => setFilters(prev => ({ ...prev, dateType: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
            <option value="month">{isGerman ? 'Aktueller Monat' : 'Current Month'}</option>
            <option value="year">{isGerman ? 'Aktuelles Jahr' : 'Current Year'}</option>
            <option value="day">{isGerman ? 'Bestimmter Tag' : 'Specific Day'}</option>
            <option value="custom">{isGerman ? 'Benutzerdefiniert' : 'Custom Range'}</option>
          </select>
        </div>

        {/* Amount Range */}
        <div className="flex-1">
          <input
            type="number"
            placeholder={isGerman ? 'Min. Betrag' : 'Min. Amount'}
            value={filters.minAmount}
            onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          />
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

      {/* Tabs */}
      <div className="flex space-x-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id ? 'shadow-sm' : 'hover:opacity-75'
            }`}
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--theme-bg)' : 'transparent',
              color: 'var(--theme-text)'
            }}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Revenue Statistics */}
            <div className="flex flex-wrap gap-4">
              {[
                { 
                  label: isGerman ? 'Gesamtumsatz' : 'Total Revenue', 
                  value: formatCurrency(revenueStats.totalRevenue), 
                  icon: '💰', 
                  color: 'blue' 
                },
                { 
                  label: isGerman ? 'Provisionen' : 'Commission', 
                  value: formatCurrency(revenueStats.totalCommission), 
                  icon: '📊', 
                  color: 'yellow' 
                },
                { 
                  label: isGerman ? 'Netto-Umsatz' : 'Net Revenue', 
                  value: formatCurrency(revenueStats.totalNetRevenue), 
                  icon: '💎', 
                  color: 'green' 
                },
                { 
                  label: isGerman ? 'Bezahlt' : 'Paid', 
                  value: formatCurrency(revenueStats.paidRevenue), 
                  icon: '✅', 
                  color: 'green' 
                }
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
                      <p className={`text-2xl font-bold ${
                        stat.color === 'blue' ? 'text-blue-600' :
                        stat.color === 'green' ? 'text-green-600' :
                        stat.color === 'yellow' ? 'text-yellow-600' :
                        stat.color === 'red' ? 'text-red-600' :
                        ''
                      }`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className="text-2xl">{stat.icon}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Revenue */}
            <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Letzte Umsätze' : 'Recent Revenue'}
              </h3>
              <div className="space-y-3">
                {revenueData.slice(0, 5).map((rev) => (
                  <div key={rev._id} className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                            {rev.customer?.name || 'N/A'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                            {rev.customer?.city || 'N/A'} • {formatDate(rev.revenueDate)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rev.status)}`}>
                          {rev.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(rev.amount)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                        -{formatCurrency(rev.commission)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'revenue' && (
          <motion.div
            key="revenue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Revenue Statistics */}
            <div className="flex flex-wrap gap-4">
              {[
                { 
                  label: isGerman ? 'Gesamt Umsätze' : 'Total Revenue', 
                  value: formatCurrency(revenueStats.totalRevenue), 
                  icon: '💰', 
                  color: 'blue' 
                },
                { 
                  label: isGerman ? 'Bestätigt' : 'Confirmed', 
                  value: formatCurrency(revenueStats.confirmedRevenue), 
                  icon: '✅', 
                  color: 'green' 
                },
                { 
                  label: isGerman ? 'Ausstehend' : 'Pending', 
                  value: formatCurrency(revenueStats.pendingRevenue), 
                  icon: '⏳', 
                  color: 'yellow' 
                },
                { 
                  label: isGerman ? 'Provision' : 'Commission', 
                  value: formatCurrency(revenueStats.totalCommission), 
                  icon: '📊', 
                  color: 'blue' 
                }
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
                      <p className={`text-2xl font-bold ${
                        stat.color === 'blue' ? 'text-blue-600' :
                        stat.color === 'green' ? 'text-green-600' :
                        stat.color === 'yellow' ? 'text-yellow-600' :
                        stat.color === 'red' ? 'text-red-600' :
                        ''
                      }`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className="text-2xl">{stat.icon}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Revenue Table */}
            <div className="overflow-hidden rounded-lg border mt-6" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  <thead style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman ? 'Lead ID' : 'Lead ID'}
                      </th>
                      {isSuperAdmin && (
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Partner' : 'Partner'}
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman ? 'Kunde' : 'Customer'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman ? 'Betrag' : 'Amount'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman ? 'Provision' : 'Commission'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman ? 'Status' : 'Status'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman ? 'Datum' : 'Date'}
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
                              {isGerman ? 'Lade...' : 'Loading...'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : revenueData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                          {isGerman ? 'Keine Umsätze gefunden' : 'No revenue found'}
                        </td>
                      </tr>
                    ) : (
                      revenueData.map((rev, index) => (
                        <motion.tr
                          key={rev._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-opacity-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {rev.leadId?.leadId || rev._id.slice(-6)}
                          </td>
                          {isSuperAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                              {rev.partnerId?.companyName || 'N/A'}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                                {rev.customer?.name || 'N/A'}
                              </div>
                              <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                                {rev.customer?.city || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            {formatCurrency(rev.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                            {formatCurrency(rev.commission)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rev.status)}`}>
                              {rev.status === 'paid' ? '✅' : rev.status === 'confirmed' ? '🔵' : rev.status === 'pending' ? '⏳' : '❌'} {rev.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                            {formatDate(rev.revenueDate)}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              currentPage={revenueCurrentPage}
              totalItems={totalRevenue}
              itemsPerPage={itemsPerPage}
              onPageChange={setRevenueCurrentPage}
            />
          </motion.div>
        )}

        {activeTab === 'invoices' && (
          <motion.div
            key="invoices"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center py-12" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Rechnungsfunktionalität wird entwickelt...' : 'Invoice functionality is being developed...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedIncomeInvoices;