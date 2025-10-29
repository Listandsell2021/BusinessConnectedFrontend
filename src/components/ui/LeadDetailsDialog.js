import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LeadDetailsDialog = ({
  isOpen,
  leadData,
  onClose,
  t,
  isGerman,
  isPartner = false
}) => {
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

  const TableRow = ({ label, value, isContactInfo = false }) => {
    // Hide contact info for partners until lead is accepted
    if (isContactInfo && isPartner && leadData?.partnerStatus !== 'accepted') {
      return (
        <tr>
          <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)', width: '140px', minWidth: '140px' }}>
            {label}:
          </td>
          <td className="px-3 py-2 text-sm" style={{ color: 'var(--theme-muted)', borderBottom: '1px solid var(--theme-border)' }}>
            {isGerman ? 'Details nach Akzeptanz verfügbar' : 'Details available after acceptance'}
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

  if (!isOpen || !leadData) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        style={{ paddingLeft: '10rem', paddingTop: '2rem' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="rounded-lg border flex flex-col overflow-hidden"
          style={{
            borderColor: 'var(--theme-border)',
            backgroundColor: 'var(--theme-bg-secondary)',
            width: '1126px',
            height: '80vh',
            maxHeight: '800px',
            marginTop: '50px'
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Back Button */}
          <div className="px-4 py-3 border-b flex items-center justify-between bg-opacity-100" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
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
                    {leadData.leadId}
                  </span>
                  {(() => {
                    // For partners, show partner-specific status; for admins, show general lead status
                    const displayStatus = isPartner ? (leadData.partnerStatus || leadData.status) : leadData.status;

                    return (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        displayStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        displayStatus === 'accepted' ? 'bg-green-100 text-green-800' :
                        displayStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                        displayStatus === 'partial_assigned' ? 'bg-blue-100 text-blue-800' :
                        displayStatus === 'assigned' ? 'bg-blue-100 text-blue-800' :
                        displayStatus === 'cancelled' || displayStatus === 'cancellation_approved' ? 'bg-red-100 text-red-800' :
                        displayStatus === 'cancellationRequested' || displayStatus === 'cancel_requested' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {displayStatus === 'pending' ? (isGerman ? 'Ausstehend' : 'Pending') :
                         displayStatus === 'accepted' ? (isGerman ? 'Akzeptiert' : 'Accepted') :
                         displayStatus === 'rejected' ? (isGerman ? 'Abgelehnt' : 'Rejected') :
                         displayStatus === 'partial_assigned' ? (isGerman ? 'Teilweise zugewiesen' : 'Partially Assigned') :
                         displayStatus === 'assigned' ? (isGerman ? 'Zugewiesen' : 'Assigned') :
                         displayStatus === 'cancelled' || displayStatus === 'cancellation_approved' ? (isGerman ? 'Storniert' : 'Cancelled') :
                         displayStatus === 'cancellationRequested' || displayStatus === 'cancel_requested' ? (isGerman ? 'Stornierung angefragt' : 'Cancellation Requested') :
                         displayStatus}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
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
                        value={leadData.leadId}
                      />
                      <TableRow
                        label={t('common.name')}
                        value={leadData.name}
                      />
                      <TableRow
                        label={t('common.email')}
                        value={leadData.email}
                        isContactInfo={true}
                      />
                      {leadData.user?.phone && (
                        <TableRow
                          label={t('common.phone')}
                          value={leadData.user.phone}
                          isContactInfo={true}
                        />
                      )}
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
                          `${leadData.serviceType === 'moving' ? '🚛' : '🧽'} ${t(`services.${leadData.serviceType}`)}${leadData.moveType ? ` - ${leadData.moveType.replace('_', ' ')}` : ''}`
                        }
                      />
                      {leadData.sourceDomain && (
                        <TableRow
                          label={t('leads.sourceDomain')}
                          value={leadData.sourceDomain}
                        />
                      )}
                      {leadData.assignedPartner && (
                        <TableRow
                          label={t('leads.assignedPartner')}
                          value={
                            typeof leadData.assignedPartner === 'object'
                              ? (typeof leadData.assignedPartner.companyName === 'object'
                                  ? leadData.assignedPartner.companyName?.companyName || leadData.assignedPartner.companyName?._id || 'N/A'
                                  : leadData.assignedPartner.companyName || leadData.assignedPartner._id || 'N/A')
                              : leadData.assignedPartner
                          }
                        />
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Form Data and User Details - 2 Column Layout */}
          {((leadData.formData && Object.keys(leadData.formData).length > 0) || leadData.user) && (
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Form Data */}
                {leadData.formData && Object.keys(leadData.formData).length > 0 && (
                  <div>
                    <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Formulardetails' : 'Form Details'}
                    </h4>
                    <div>
                      <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                        <tbody>
                          {Object.entries(leadData.formData).map(([key, value]) => {
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
                  {leadData.user && (
                    <>
                      <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Zusätzliche Benutzerdetails' : 'Additional User Details'}
                      </h4>
                      <div className="mb-6">
                        <table className="w-full" style={{ backgroundColor: 'var(--theme-bg)', tableLayout: 'fixed' }}>
                          <tbody>
                            {leadData.user.salutation && (
                              <TableRow
                                label={isGerman ? 'Anrede' : 'Salutation'}
                                value={leadData.user.salutation}
                                isContactInfo={true}
                              />
                            )}
                            {leadData.user.firstName && (
                              <TableRow
                                label={isGerman ? 'Vorname' : 'First Name'}
                                value={leadData.user.firstName}
                                isContactInfo={true}
                              />
                            )}
                            {leadData.user.lastName && (
                              <TableRow
                                label={isGerman ? 'Nachname' : 'Last Name'}
                                value={leadData.user.lastName}
                                isContactInfo={true}
                              />
                            )}
                            {leadData.user.preferredContactTime && (
                              <TableRow
                                label={isGerman ? 'Bevorzugte Kontaktzeit' : 'Preferred Contact Time'}
                                value={leadData.user.preferredContactTime}
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
                          value={new Date(leadData.createdAt).toLocaleString()}
                        />
                        {leadData.assignedAt && (
                          <TableRow
                            label={isGerman ? 'Zugewiesen am' : 'Assigned At'}
                            value={new Date(leadData.assignedAt).toLocaleString()}
                          />
                        )}
                        {leadData.acceptedAt && (
                          <TableRow
                            label={isGerman ? 'Akzeptiert am' : 'Accepted At'}
                            value={new Date(leadData.acceptedAt).toLocaleString()}
                          />
                        )}
                        {leadData.updatedAt && leadData.updatedAt !== leadData.createdAt && (
                          <TableRow
                            label={isGerman ? 'Zuletzt aktualisiert' : 'Last Updated'}
                            value={new Date(leadData.updatedAt).toLocaleString()}
                          />
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LeadDetailsDialog;