import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { invoicesAPI } from '../../lib/api/api';
import Pagination from '../ui/Pagination';
import { useRouter } from 'next/router';

const PartnerInvoices = () => {
  const { isGerman } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  // State Management
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const itemsPerPage = 10;

  // Search filter for invoice number
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startDate: '',
    endDate: ''
  });

  // Check for search parameter in URL on mount - MUST run before loadInvoices
  useEffect(() => {
    if (!router.isReady) return;

    const urlSearch = router.query.search;
    console.log('🔗 URL Search parameter:', urlSearch);
    if (urlSearch && urlSearch !== searchQuery) {
      console.log('🔄 Setting search query from URL:', urlSearch);
      setSearchQuery(urlSearch);
      // Clear all date filters to show the invoice regardless of date
      setFilters({
        status: 'all',
        month: '',
        year: '',
        startDate: '',
        endDate: ''
      });
    } else if (!urlSearch && searchQuery) {
      // Clear search query if URL parameter is removed
      console.log('🔄 Clearing search query (URL parameter removed)');
      setSearchQuery('');
    }
  }, [router.isReady, router.query.search]);

  // Statistics
  const [stats, setStats] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalInvoices: 0
  });

  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Load Partner Invoices - wrapped in useCallback to prevent infinite loop
  const loadInvoices = useCallback(async () => {
    // Wait for router to be ready before loading
    if (!router.isReady) {
      console.log('⏳ Router not ready yet, skipping load');
      return;
    }
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };

      // When searching, fetch all invoices (no pagination) to find the invoice
      if (searchQuery) {
        params.page = 1;
        params.limit = 100; // Fetch max allowed invoices for search (API limit is 100)
        // Note: search is done client-side, not sent to API
      }

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      // Add month/year filtering (priority over manual dates) - only if not searching
      if (!searchQuery && filters.month && filters.year) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();

        console.log('Date Filter Applied:', {
          month: filters.month,
          year: filters.year,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
      } else if (!searchQuery) {
        // Only use manual dates if month/year not set and not searching
        if (filters.startDate) {
          params.startDate = filters.startDate;
        }

        if (filters.endDate) {
          params.endDate = filters.endDate;
        }
      }

      const response = await invoicesAPI.getPartnerInvoices(user.id, params);
      const data = response.data;

      // Filter by search query client-side - use exact match or starts-with match
      let filteredInvoices = data.invoices || [];
      if (searchQuery && filteredInvoices.length > 0) {
        const searchLower = searchQuery.toLowerCase().trim();
        console.log('🔍 Search Query:', searchLower);
        console.log('🔍 Total invoices before filter:', filteredInvoices.length);

        // First try exact match
        let exactMatch = filteredInvoices.filter(inv =>
          inv.invoiceNumber.toLowerCase().trim() === searchLower
        );
        console.log('🔍 Exact matches:', exactMatch.length);

        if (exactMatch.length > 0) {
          filteredInvoices = exactMatch;
        } else {
          // If no exact match, try starts-with match
          let startsWithMatch = filteredInvoices.filter(inv =>
            inv.invoiceNumber.toLowerCase().trim().startsWith(searchLower)
          );
          console.log('🔍 Starts-with matches:', startsWithMatch.length);

          if (startsWithMatch.length > 0) {
            filteredInvoices = startsWithMatch;
          } else {
            // Finally, try contains match for partial search
            filteredInvoices = filteredInvoices.filter(inv =>
              inv.invoiceNumber.toLowerCase().trim().includes(searchLower)
            );
            console.log('🔍 Contains matches:', filteredInvoices.length);
          }
        }
        console.log('🔍 Final filtered invoices:', filteredInvoices.map(inv => inv.invoiceNumber));
      }

      setInvoices(filteredInvoices);
      setTotalInvoices(filteredInvoices.length);

      // Calculate statistics from filtered invoices
      const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const paidAmount = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
      const pendingAmount = filteredInvoices.filter(inv => inv.status === 'draft' || inv.status === 'sent' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0);

      setStats({
        totalAmount,
        paidAmount,
        pendingAmount,
        totalInvoices: filteredInvoices.length
      });

    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Rechnungen' : 'Error loading invoices');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, searchQuery, router.isReady, user.id, isGerman]);

  useEffect(() => {
    // Only load when router is ready
    if (!router.isReady) {
      console.log('⏳ Router not ready yet, skipping load');
      return;
    }

    // If there's a URL search parameter but searchQuery hasn't been set yet, wait
    const urlSearch = router.query.search;
    if (urlSearch && !searchQuery) {
      console.log('⏳ URL search parameter exists but not applied yet, waiting...');
      return;
    }

    console.log('📊 Loading invoices with:', { searchQuery, filters, currentPage });
    loadInvoices();
  }, [currentPage, filters, searchQuery, router.isReady, router.query.search, loadInvoices]);

  // Download Invoice PDF
  const downloadInvoice = async (invoiceId) => {
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
      toast.error(isGerman ? 'Fehler beim Herunterladen des PDF' : 'Error downloading PDF');
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
    return new Date(date).toLocaleDateString(isGerman ? 'de-DE' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50',
      sent: 'bg-blue-500/20 text-blue-300 border border-blue-500/50',
      paid: 'bg-green-500/20 text-green-300 border border-green-500/50',
      overdue: 'bg-red-500/20 text-red-300 border border-red-500/50',
      cancelled: 'bg-red-500/20 text-red-300 border border-red-500/50'
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: '⏳',
      sent: '📤',
      paid: '✅',
      overdue: '⚠️',
      cancelled: '❌'
    };
    return icons[status] || '📄';
  };

  const getStatusText = (status) => {
    const statusTexts = {
      draft: isGerman ? 'Ausstehend' : 'Pending',
      sent: isGerman ? 'Gesendet' : 'Sent',
      paid: isGerman ? 'Bezahlt' : 'Paid',
      overdue: isGerman ? 'Überfällig' : 'Overdue',
      cancelled: isGerman ? 'Storniert' : 'Cancelled'
    };
    return statusTexts[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Meine Rechnungen' : 'My Invoices'}
        </h2>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: isGerman ? 'Gesamt Rechnungen' : 'Total Invoices',
            value: totalInvoices,
            icon: '🧾',
            color: 'blue'
          },
          {
            label: isGerman ? 'Gesamtbetrag' : 'Total Amount',
            value: formatCurrency(stats.totalAmount),
            icon: '💰',
            color: 'green'
          },
          {
            label: isGerman ? 'Bezahlt' : 'Paid',
            value: formatCurrency(stats.paidAmount),
            icon: '✅',
            color: 'green'
          },
          {
            label: isGerman ? 'Ausstehend' : 'Pending',
            value: formatCurrency(stats.pendingAmount),
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
                <p className={`text-lg font-bold ${
                  stat.color === 'blue' ? 'text-blue-400' :
                  stat.color === 'green' ? 'text-green-400' :
                  stat.color === 'yellow' ? 'text-yellow-400' : ''
                }`}>
                  {stat.value}
                </p>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        className="flex flex-wrap gap-3 p-4 rounded-lg"
        style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Invoice Number Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchQuery(newValue);
              // Clear URL search parameter if search field is cleared
              if (!newValue && router.query.search) {
                router.push('/dashboard?tab=invoices', undefined, { shallow: true });
              }
            }}
            placeholder={isGerman ? 'Rechnungsnummer suchen...' : 'Search invoice number...'}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          />
        </div>

        {/* Status Filter */}
        <div className="flex-1 min-w-[120px]">
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
            <option value="draft">{isGerman ? 'Ausstehend' : 'Pending'}</option>
            <option value="sent">{isGerman ? 'Gesendet' : 'Sent'}</option>
            <option value="paid">{isGerman ? 'Bezahlt' : 'Paid'}</option>
            <option value="overdue">{isGerman ? 'Überfällig' : 'Overdue'}</option>
            <option value="cancelled">{isGerman ? 'Storniert' : 'Cancelled'}</option>
          </select>
        </div>

        {/* Month Filter */}
        <div className="flex-1 min-w-[120px]">
          <select
            value={filters.month || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value ? parseInt(e.target.value) : '' }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
            <option value="">{isGerman ? 'Alle Monate' : 'All Months'}</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString(isGerman ? 'de-DE' : 'en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div className="flex-1 min-w-[100px]">
          <select
            value={filters.year || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : '' }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
            <option value="">{isGerman ? 'Alle Jahre' : 'All Years'}</option>
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

        {/* Reset Button */}
        <div>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilters({
                status: 'all',
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                startDate: '',
                endDate: ''
              });
              // Clear URL search parameter
              if (router.query.search) {
                router.push('/dashboard?tab=invoices', undefined, { shallow: true });
              }
            }}
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

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--theme-border)' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--theme-bg)' }}>
            <thead style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Rechnungsnummer' : 'Invoice Number'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Zeitraum' : 'Period'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Betrag' : 'Amount'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Status' : 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Erstellt' : 'Created'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Fällig' : 'Due'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman ? 'Aktionen' : 'Actions'}
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
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Keine Rechnungen gefunden' : 'No invoices found'}
                  </td>
                </tr>
              ) : (
                invoices.map((invoice, index) => (
                  <motion.tr
                    key={invoice._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-opacity-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-400">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                      {formatDate(invoice.billingPeriod.from)} - {formatDate(invoice.billingPeriod.to)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-400">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)} <span className="ml-1">{getStatusText(invoice.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                      {formatDate(invoice.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-muted)' }}>
                      {invoice.dueAt ? formatDate(invoice.dueAt) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => downloadInvoice(invoice._id)}
                        className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        📄 {isGerman ? 'PDF' : 'PDF'}
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalInvoices}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default PartnerInvoices;