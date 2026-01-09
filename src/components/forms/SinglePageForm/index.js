import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Image from 'next/image';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useTheme } from '../../../contexts/ThemeContext';
import { securityServicesAPI } from '../../../lib/api/api';
import { toast } from 'react-hot-toast';
import { getFormConfig } from '../../../config/forms';
import Link from 'next/link';
import AddressAutocomplete from '../../../components/ui/AddressAutocomplete';
import { useRouter } from 'next/router';

const SinglePageForm = ({ formType }) => {
  const { mounted, isDark } = useTheme();
  const router = useRouter();
  const [formConfig, setFormConfig] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addressSelectedFromGoogle, setAddressSelectedFromGoogle] = useState(false);

  // Handle logo click to redirect to production home page
  const handleLogoClick = () => {
    window.location.href = 'https://business-connected.shop-template.de/';
  };

  // Load form configuration
  useEffect(() => {
    try {
      setLoading(true);
      const config = getFormConfig(formType);
      if (!config) {
        throw new Error(`Form configuration not found for type: ${formType}`);
      }
      setFormConfig(config);
      setFormData({});
      setError(null);
    } catch (err) {
      console.error('Error loading form config:', err);
      setError('Formular konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [formType]);

  const getLocalizedText = (textObj) => {
    if (typeof textObj === 'string') return textObj;
    return textObj?.de || '';
  };

  const handleChange = (fieldId, value) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [fieldId]: value
      };

      return updated;
    });

    // If address field is manually changed, mark it as not selected from Google
    if (fieldId === 'location_address' && formType === 'securityClient') {
      setAddressSelectedFromGoogle(false);
    }

    setErrors(prev => ({
      ...prev,
      [fieldId]: null
    }));
  };

  // Handle address selection from autocomplete
  const handleAddressSelect = (addressData) => {
    if (formType === 'securityClient') {
      setFormData(prev => ({
        ...prev,
        location_address: addressData.street || '',
        location_city: addressData.city || '',
        location_postalCode: addressData.zipCode || '',
        location_country: addressData.country || 'Deutschland'
      }));
      // Mark address as selected from Google Places
      setAddressSelectedFromGoogle(true);
      // Clear any previous error on this field
      setErrors(prev => ({
        ...prev,
        location_address: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    formConfig.steps?.forEach(step => {
      if (step.type === 'form' && step.fields) {
        step.fields.forEach(field => {
          // Skip hidden fields
          if (field.hidden) return;

          const value = formData[field.id];

          // Validation for different field types
          if (field.required) {
            if (field.type === 'checkbox' && field.options) {
              // Multi-select checkbox - must have at least one selected
              if (!value || !Array.isArray(value) || value.length === 0) {
                newErrors[field.id] = getLocalizedText(formConfig.validationMessages?.selectCheckbox);
              }
            } else if (field.type === 'checkbox') {
              // Single checkbox - must be checked
              if (!value) {
                newErrors[field.id] = getLocalizedText(formConfig.validationMessages?.required);
              }
            } else if (!value || (typeof value === 'string' && value.trim() === '')) {
              // Text, email, select, textarea, etc.
              newErrors[field.id] = getLocalizedText(formConfig.validationMessages?.required);
            }
          }

          // Special validation for address field - must be selected from Google Places
          if (field.id === 'location_address' && formType === 'securityClient' && value) {
            if (!addressSelectedFromGoogle) {
              newErrors[field.id] = 'Bitte wählen Sie eine Adresse aus der Google Maps Vorschlagsliste aus.';
            }
          }

          if (value && field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              newErrors[field.id] = getLocalizedText(formConfig.validationMessages?.email);
            }
          }

          if (value && field.type === 'tel') {
            const phoneRegex = /^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){6,}$/;
            if (!phoneRegex.test(value)) {
              newErrors[field.id] = getLocalizedText(formConfig.validationMessages?.phone);
            }
          }
        });
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    setIsSubmitting(true);
    try {
      let submitData = {
        ...formData,
        serviceType: 'security',
        formType: formType
      };

      // Transform data structure for client form
      if (formType === 'securityClient') {
        const { location_address, location_city, location_postalCode, location_country, location_display, desiredStartDate, ...rest } = submitData;

        submitData = {
          ...rest,
          lastName: '', // lastName is optional - send empty string
          desiredStartDate: desiredStartDate ? new Date(desiredStartDate) : new Date(),
          location: {
            address: location_address || '',
            city: location_city || '',
            postalCode: location_postalCode || '',
            country: location_country || 'Germany'
          },
          gdprConsent: true, // Always true since no checkbox shown
          dataProcessingConsent: true,
          marketingConsent: false
        };
      }

      // Transform data structure for company form
      if (formType === 'securityCompany') {
        const { firstName, lastName, email, phone, street, city, postalCode, country, ...rest } = submitData;
        submitData = {
          ...rest,
          contactPerson: {
            firstName: firstName || '',
            lastName: lastName || '',
            email: email || '',
            phone: phone || ''
          },
          address: {
            street: street || '',
            city: city || '',
            postalCode: postalCode || '',
            country: country || 'Germany'
          },
          gdprConsent: true, // Always true since no checkbox shown
          dataProcessingConsent: true,
          marketingConsent: false
        };
      }

      let response;
      if (formType === 'securityClient') {
        response = await securityServicesAPI.createSecurityClient(submitData);
      } else if (formType === 'securityCompany') {
        response = await securityServicesAPI.createSecurityCompany(submitData);
      }

      if (response?.data?.success) {
        toast.success('Formular erfolgreich eingereicht');
        // Redirect to thank you page
        window.location.href = '/thank-you';
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      toast.error(err.response?.data?.message || 'Fehler beim Einreichen des Formulars');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.p
            className="mt-4 text-lg text-slate-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Formular wird geladen...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (error || !formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="p-8 rounded-lg text-center max-w-md bg-slate-800/50 border border-slate-700">
          <p className="text-xl font-semibold text-white mb-4">⚠️</p>
          <p className="text-slate-300">{error || 'Formular konnte nicht geladen werden'}</p>
        </div>
      </div>
    );
  }

  const isClientForm = formType === 'securityClient';

  return (
    <>
      <Head>
        <title>{isClientForm ? 'Sicherheitsanfrage' : 'Unternehmen registrieren'}</title>
      </Head>

      <style>{`
        .security-form input[type="text"],
        .security-form input[type="email"],
        .security-form input[type="tel"],
        .security-form input[type="date"],
        .security-form input[type="number"],
        .security-form textarea,
        .security-form select {
          background-color: #0F172A !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }

        .security-form input[type="text"]::placeholder,
        .security-form input[type="email"]::placeholder,
        .security-form input[type="tel"]::placeholder,
        .security-form input[type="date"]::placeholder,
        .security-form input[type="number"]::placeholder,
        .security-form textarea::placeholder {
          color: #64748b !important;
        }

        .security-form input[type="text"]:focus,
        .security-form input[type="email"]:focus,
        .security-form input[type="tel"]:focus,
        .security-form input[type="date"]:focus,
        .security-form input[type="number"]:focus,
        .security-form textarea:focus,
        .security-form select:focus {
          border-color: #3b82f6 !important;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        {/* Header */}
        <header className="border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center relative">
              {/* Back Button - Left Absolute */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => window.history.back()}
                className="absolute left-0 flex items-center space-x-2 text-slate-400 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">Zurück</span>
              </motion.button>

              {/* Logo - Center */}
              <motion.button
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleLogoClick}
                className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <Image
                  src={isDark ? '/Business-Connect-logoblacktheme.svg' : '/business-connected-logo.svg'}
                  alt="BusinessConnected"
                  width={280}
                  height={80}
                  priority
                  className="h-10 w-auto"
                />
              </motion.button>

              {/* Right: Phone - Right Absolute */}
              <motion.a
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                href="tel:+491767568479"
                className="absolute right-0 flex items-center space-x-2 text-slate-400 hover:text-white transition text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+49 176 75768479</span>
              </motion.a>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="py-10 sm:py-12 text-center border-b border-slate-800"
        >
          <div className="mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            {/* Badge - Properly Centered */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-block mb-6 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30"
            >
              <span className="text-blue-400 text-sm font-medium">
                {getLocalizedText(formConfig?.heroBadge)}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
            >
              {getLocalizedText(formConfig?.heroTitle)}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-slate-300 text-base max-w-2xl mx-auto leading-relaxed"
            >
              {getLocalizedText(formConfig?.heroDescription)}
            </motion.p>
          </div>
        </motion.section>

        {/* Form Section */}
        <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 security-form">
          <div className="mx-auto max-w-3xl">
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onSubmit={handleSubmit}
              className="rounded-lg p-8 sm:p-12 bg-slate-900/90 border border-slate-700 shadow-2xl backdrop-blur-xl"
            >
              <div className="space-y-6">
                {formConfig.steps?.map((step, stepIndex) => (
                  step.type === 'form' && step.fields && (
                    <motion.div
                      key={stepIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + stepIndex * 0.1 }}
                      className="space-y-4"
                    >
                      {/* Step Title */}
                      {step.title && (
                        <div className="pb-3 border-b border-slate-700 mb-4">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {getLocalizedText(step.title)}
                          </h3>
                          {step.description && (
                            <p className="text-slate-400 text-xs">
                              {getLocalizedText(step.description)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Form Fields */}
                      <div className="space-y-5">
                        {/* Render fields in pairs for 2-column layout */}
                        {(() => {
                          const rows = [];
                          let currentRow = [];

                          step.fields.forEach(field => {
                            // Skip hidden fields
                            if (field.hidden) return;

                            if (field.gridCol === 'full') {
                              if (currentRow.length > 0) {
                                rows.push(currentRow);
                                currentRow = [];
                              }
                              rows.push([field]);
                            } else {
                              currentRow.push(field);
                              if (currentRow.length === 2) {
                                rows.push(currentRow);
                                currentRow = [];
                              }
                            }
                          });

                          if (currentRow.length > 0) {
                            rows.push(currentRow);
                          }

                          return rows.map((row, rowIdx) => (
                            <div
                              key={rowIdx}
                              className={row.length === 1 && row[0].gridCol === 'full' ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}
                            >
                              {row.map(field => {
                                // Check if field should be displayed based on conditional logic
                                if (field.conditionalDisplay) {
                                  const conditionMet = formData[field.conditionalField] === field.conditionalValue;
                                  if (!conditionMet) return null;
                                }

                                return (
                                <div key={field.id}>
                                  <label className="block text-xs font-medium text-white mb-2">
                                    {getLocalizedText(field.label)}
                                    {field.required && <span className="text-red-400 ml-1">*</span>}
                                  </label>

                                  {field.description && field.type === 'checkbox' && field.options && (
                                    <p className="text-slate-400 text-xs mb-2">{getLocalizedText(field.description)}</p>
                                  )}

                                  {field.type === 'textarea' ? (
                                    <textarea
                                      id={field.id}
                                      value={formData[field.id] || ''}
                                      onChange={(e) => handleChange(field.id, e.target.value)}
                                      placeholder={getLocalizedText(field.placeholder)}
                                      rows={field.rows || 4}
                                      className="w-full px-3 py-2 border rounded text-sm focus:outline-none transition"
                                    />
                                  ) : field.type === 'select' ? (
                                    <select
                                      id={field.id}
                                      value={formData[field.id] || ''}
                                      onChange={(e) => handleChange(field.id, e.target.value)}
                                      className="w-full px-3 py-2 border rounded text-sm focus:outline-none transition"
                                    >
                                      <option value="">{getLocalizedText(field.placeholder)}</option>
                                      {field.options?.map(opt => (
                                        <option key={opt.id} value={opt.id}>
                                          {getLocalizedText(opt.label)}
                                        </option>
                                      ))}
                                    </select>
                                  ) : field.type === 'checkbox' && field.options ? (
                                    // Multi-select checkboxes
                                    <div className="space-y-2">
                                      {field.options.map(opt => (
                                        <label key={opt.id} className="flex items-center space-x-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            value={opt.id}
                                            checked={(formData[field.id] || []).includes(opt.id)}
                                            onChange={(e) => {
                                              const currentValues = formData[field.id] || [];
                                              const newValues = e.target.checked
                                                ? [...currentValues, opt.id]
                                                : currentValues.filter(v => v !== opt.id);
                                              handleChange(field.id, newValues);
                                            }}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer"
                                          />
                                          <span className="text-slate-200 text-sm">{getLocalizedText(opt.label)}</span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : field.type === 'checkbox' ? (
                                    // Single checkbox
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        id={field.id}
                                        checked={formData[field.id] || false}
                                        onChange={(e) => handleChange(field.id, e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer"
                                      />
                                      <span className="text-slate-200 text-sm">{field.description ? getLocalizedText(field.description) : ''}</span>
                                    </label>
                                  ) : field.type === 'date' ? (
                                    // Date Picker
                                    <div className="relative">
                                      <DatePicker
                                        selected={formData[field.id] ? new Date(formData[field.id]) : null}
                                        onChange={(date) => handleChange(field.id, date ? date.toISOString().split('T')[0] : '')}
                                        placeholderText={getLocalizedText(field.placeholder)}
                                        dateFormat="dd/MM/yyyy"
                                        wrapperClassName="w-full"
                                        inputClassName="w-full px-3 py-2 border rounded text-sm focus:outline-none transition"
                                        minDate={new Date()}
                                      />
                                    </div>
                                  ) : field.id === 'location_address' && formType === 'securityClient' ? (
                                    // Address Autocomplete
                                    <AddressAutocomplete
                                      value={formData[field.id] || ''}
                                      onChange={(value) => handleChange(field.id, value)}
                                      onPlaceSelect={handleAddressSelect}
                                      placeholder={getLocalizedText(field.placeholder)}
                                      className="w-full px-3 py-2 border rounded text-sm focus:outline-none transition"
                                    />
                                  ) : (
                                    <input
                                      id={field.id}
                                      type={field.type || 'text'}
                                      value={formData[field.id] || ''}
                                      onChange={(e) => handleChange(field.id, e.target.value)}
                                      placeholder={getLocalizedText(field.placeholder)}
                                      min={field.min}
                                      max={field.max}
                                      className="w-full px-3 py-2 border rounded text-sm focus:outline-none transition"
                                    />
                                  )}

                                  {errors[field.id] && (
                                    <p className="mt-1 text-red-400 text-xs">{errors[field.id]}</p>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          ));
                        })()}
                      </div>
                    </motion.div>
                  )
                ))}
              </div>

              {/* Submit Button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-8 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm shadow-lg hover:shadow-xl"
              >
                {isSubmitting
                  ? 'Wird eingereicht...'
                  : 'Anfrage einreichen'}
              </motion.button>
            </motion.form>
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="border-t border-slate-800 py-6 px-4 sm:px-6 lg:px-8 bg-black/40"
        >
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            {/* Left: Copyright */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-slate-500 text-xs"
            >
              <p>© 2024 BusinessConnected. Alle Rechte vorbehalten.</p>
            </motion.div>

            {/* Right: Links */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="text-slate-500 text-xs flex gap-6"
            >
              <a href="https://business-connected.shop-template.de/impressum/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">Impressum</a>
              <span>/</span>
              <a href="https://business-connected.shop-template.de/datenschutz/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">Datenschutzerklärung</a>
              <span>/</span>
              <a href="https://business-connected.shop-template.de/datenschutz/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">AGB</a>
            </motion.div>
          </div>
        </motion.footer>
      </div>
    </>
  );
};

export default SinglePageForm;
