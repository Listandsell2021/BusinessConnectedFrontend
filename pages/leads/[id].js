import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { leadsAPI } from '../../src/lib/api/api';
import { toast } from 'react-hot-toast';

const LeadDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { t, isGerman } = useLanguage();
  const { user, isSuperAdmin, isPartner } = useAuth();
  
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      loadLead();
    }
  }, [id]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const response = await leadsAPI.getById(id);
      
      // Transform the lead data similar to LeadManagement component
      const transformedLead = {
        ...response.data.lead,
        id: response.data.lead._id || response.data.lead.id,
        name: response.data.lead.user ? 
          `${response.data.lead.user.firstName} ${response.data.lead.user.lastName}`.trim() : 
          (response.data.lead.name || ''),
        email: response.data.lead.user?.email || response.data.lead.email || '',
        city: response.data.lead.location?.city || response.data.lead.city || '',
        status: response.data.lead.status || 'pending'
      };
      
      setLead(transformedLead);
    } catch (error) {
      console.error('Error loading lead:', error);
      setError(error.response?.data?.message || 'Failed to load lead details');
      toast.error(error.response?.data?.message || 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      pending: '⏳',
      assigned: '📤',
      accepted: '✅',
      completed: '🎉',
      cancelled: '❌'
    };
    return statusIcons[status] || '❓';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const translateStatus = (status) => {
    const statusMap = {
      'pending': 'common.pending',
      'assigned': 'leads.assignedLeads',
      'accepted': 'common.approved',
      'completed': 'leads.completedLeads',
      'cancelled': 'common.rejected'
    };
    return t(statusMap[status] || 'common.pending');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span style={{ color: 'var(--theme-text)' }}>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
            {t('common.error')}
          </h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Lead nicht gefunden' : 'Lead not found'}
          </h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  // Helper function to render complex data
  const renderValue = (value, depth = 0) => {
    // Safety checks
    if (value === null || value === undefined) return '-';
    if (React.isValidElement(value)) return value; // Don't process React elements
    if (depth > 2) return String(value).substring(0, 50) + '...'; // Prevent deep recursion
    
    if (typeof value === 'boolean') return value ? (isGerman ? 'Ja' : 'Yes') : (isGerman ? 'Nein' : 'No');
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
      // Format service names properly
      console.log('Processing array value:', value);
      const formattedValues = value.map(item => {
        if (typeof item === 'string') {
          // Convert snake_case to readable text
          const formatted = item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          console.log(`Formatted '${item}' -> '${formatted}'`);
          return formatted;
        }
        return String(item);
      });
      const result = formattedValues.join(', ');
      console.log('Final formatted result:', result);
      return result;
    }
    
    if (typeof value === 'object') {
      try {
        // Handle address objects
        if (value.address && value.city) {
          return `${value.address}, ${value.postalCode || ''} ${value.city}, ${value.country || ''}`;
        }
        // Handle date objects
        if (value instanceof Date) {
          return value.toLocaleDateString(isGerman ? 'de-DE' : 'en-US');
        }
        // Handle date strings
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
          try {
            return new Date(value).toLocaleDateString(isGerman ? 'de-DE' : 'en-US');
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

  // Helper function to render table row
  const TableRow = ({ label, value, isContactInfo = false }) => {
    // Hide contact info for partners until lead is accepted
    if (isContactInfo && isPartner && lead.status !== 'accepted') {
      return (
        <tr>
          <td className="px-6 py-3 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
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
          {React.isValidElement(value) ? value : (typeof value === 'object' && value !== null ? renderValue(value) : (value || '-'))}
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--theme-bg)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              style={{ color: 'var(--theme-text)' }}
            >
              ← {t('common.back')}
            </button>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--theme-text)' }}>
              {t('leads.leadDetails')}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lead.status)}`}>
              {getStatusIcon(lead.status)} {translateStatus(lead.status)}
            </span>
          </div>
        </div>

        {/* Lead Information Table */}
        <motion.div
          className="overflow-hidden rounded-lg border mb-6"
          style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--theme-text)' }}>
              {t('leads.customerInfo')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
              <tbody>
                <TableRow 
                  label={t('leads.leadId')}
                  value={<span className="font-mono">{lead.leadId || lead.id}</span>}
                />
                <TableRow 
                  label={t('common.name')}
                  value={lead.name}
                />
                <TableRow 
                  label={t('common.email')}
                  value={lead.email}
                  isContactInfo={true}
                />
                {lead.user?.phone && (
                  <TableRow 
                    label={t('common.phone')}
                    value={lead.user.phone}
                    isContactInfo={true}
                  />
                )}
                <TableRow 
                  label={lead.serviceType === 'moving' 
                    ? (isGerman ? 'Abhol- → Zielort' : 'Pickup → Destination')
                    : t('common.city')
                  }
                  value={lead.city}
                />
                <TableRow 
                  label={t('leads.service')}
                  value={
                    <span>
                      {lead.serviceType === 'moving' ? '🚛' : '🧽'} {t(`services.${lead.serviceType}`)}
                      {lead.moveType && ` - ${lead.moveType.replace('_', ' ')}`}
                    </span>
                  }
                />
                {lead.estimatedValue && (
                  <TableRow 
                    label={isGerman ? 'Geschätzter Wert' : 'Estimated Value'}
                    value={`€${lead.estimatedValue}`}
                  />
                )}
                {lead.sourceDomain && (
                  <TableRow 
                    label={t('leads.sourceDomain')}
                    value={lead.sourceDomain}
                  />
                )}
                {lead.assignedPartner && (
                  <TableRow 
                    label={t('leads.assignedPartner')}
                    value={lead.assignedPartner.companyName || lead.assignedPartner}
                  />
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Form Data Table */}
        {lead.formData && Object.keys(lead.formData).length > 0 && (
          <motion.div
            className="overflow-hidden rounded-lg border mb-6"
            style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Formulardetails' : 'Form Details'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                <tbody>
                  {Object.entries(lead.formData).map(([key, value]) => {
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
                        value={value}
                      />
                    );
                  }).filter(Boolean)}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* User Details Table (if available) */}
        {lead.user && (
          <motion.div
            className="overflow-hidden rounded-lg border mb-6"
            style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Zusätzliche Benutzerdetails' : 'Additional User Details'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                <tbody>
                  {lead.user.salutation && (
                    <TableRow 
                      label={isGerman ? 'Anrede' : 'Salutation'}
                      value={lead.user.salutation}
                      isContactInfo={true}
                    />
                  )}
                  {lead.user.firstName && (
                    <TableRow 
                      label={isGerman ? 'Vorname' : 'First Name'}
                      value={lead.user.firstName}
                      isContactInfo={true}
                    />
                  )}
                  {lead.user.lastName && (
                    <TableRow 
                      label={isGerman ? 'Nachname' : 'Last Name'}
                      value={lead.user.lastName}
                      isContactInfo={true}
                    />
                  )}
                  {lead.user.preferredContactTime && (
                    <TableRow 
                      label={isGerman ? 'Bevorzugte Kontaktzeit' : 'Preferred Contact Time'}
                      value={lead.user.preferredContactTime}
                      isContactInfo={true}
                    />
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Timestamps Table */}
        <motion.div
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Zeitstempel' : 'Timestamps'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
              <tbody>
                <TableRow 
                  label={t('leads.createdAt')}
                  value={new Date(lead.createdAt).toLocaleString()}
                />
                {lead.assignedAt && (
                  <TableRow 
                    label={isGerman ? 'Zugewiesen am' : 'Assigned At'}
                    value={new Date(lead.assignedAt).toLocaleString()}
                  />
                )}
                {lead.acceptedAt && (
                  <TableRow 
                    label={isGerman ? 'Akzeptiert am' : 'Accepted At'}
                    value={new Date(lead.acceptedAt).toLocaleString()}
                  />
                )}
                {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
                  <TableRow 
                    label={isGerman ? 'Zuletzt aktualisiert' : 'Last Updated'}
                    value={new Date(lead.updatedAt).toLocaleString()}
                  />
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LeadDetailPage;