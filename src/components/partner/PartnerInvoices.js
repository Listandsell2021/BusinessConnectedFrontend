import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { invoicesAPI } from '../../lib/api/api';
import Pagination from '../ui/Pagination';

const PartnerInvoices = () => {
  const { isGerman } = useLanguage();
  const { user } = useAuth();

  // State Management
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const itemsPerPage = 10;

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startDate: '',
    endDate: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalInvoices: 0
  });

  // Load Partner Invoices
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      // Add month/year filtering (priority over manual dates)
      if (filters.month && filters.year) {
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
      } else {
        // Only use manual dates if month/year not set
        if (filters.startDate) {
          params.startDate = filters.startDate;
        }

        if (filters.endDate) {
          params.endDate = filters.endDate;
        }
      }

      const response = await invoicesAPI.getPartnerInvoices(user.id, params);
      const data = response.data;

      setInvoices(data.invoices || []);
      setTotalInvoices(data.pagination?.total || 0);

      // Calculate statistics
      const totalAmount = data.invoices.reduce((sum, inv) => sum + inv.total, 0);
      const paidAmount = data.invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
      const pendingAmount = data.invoices.filter(inv => inv.status === 'draft' || inv.status === 'sent' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0);

      setStats({
        totalAmount,
        paidAmount,
        pendingAmount,
        totalInvoices: data.invoices.length
      });

    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Rechnungen' : 'Error loading invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [currentPage, filters]);

  // Download Invoice PDF
  const downloadInvoice = async (invoiceId) => {
    try {
      const response = await invoicesAPI.generatePDF(invoiceId);

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
      draft: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800'
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
                  stat.color === 'blue' ? 'text-blue-600' :
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'yellow' ? 'text-yellow-600' : ''
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
        className="flex gap-3 p-4 rounded-lg"
        style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
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
            onChange={(e) => setFilters(prev => ({ ...prev, month: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
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
            value={filters.year}
            onChange={(e) => setFilters(prev => ({ ...prev, year: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
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

        {/* Reset Button */}
        <div>
          <button
            onClick={() => setFilters({
              status: 'all',
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              startDate: '',
              endDate: ''
            })}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--theme-text)' }}>
                      {formatDate(invoice.billingPeriod.from)} - {formatDate(invoice.billingPeriod.to)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
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
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
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