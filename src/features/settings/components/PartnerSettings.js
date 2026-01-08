import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useService } from '../../../contexts/ServiceContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { partnersAPI } from '../../../lib/api/api';

const PartnerSettings = () => {
  const { currentService } = useService();
  const { t, isGerman } = useLanguage();
  const { user, isPartner, isSuperAdmin } = useAuth();
  
  const [settings, setSettings] = useState({
    // Services
    services: [],

    // Lead Preferences
    cities: [],
    countries: [],
    radius: 50,
    avgLeadsPerWeek: 5,

    // Moving Service specific
    fromRadius: 50,
    toRadius: 50,

    // Lead Acceptance Settings
    requireManualAcceptance: true,

    // Contact Info
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });
  
  const [availableCities] = useState([
    'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 
    'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg'
  ]);
  
  const [availableCountries] = useState([
    'Germany', 'Austria', 'Switzerland', 'Netherlands', 'Belgium'
  ]);
  
  const [availableServices] = useState([
    { id: 'security', name: { en: 'Security Services', de: 'Sicherheitsservice' }, icon: '🛡️' }
  ]);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [passwordReset, setPasswordReset] = useState({
    showForm: false,
    step: 'request', // 'request', 'verify', 'reset'
    email: user?.email || '',
    otpId: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    loading: false,
    message: '',
    otpSent: false,
    resetToken: ''
  });

  useEffect(() => {
    // Load user settings from API
    const loadPartnerSettings = async () => {
      if (isPartner && user?.id) {
        try {
          const response = await partnersAPI.getMyProfile();
          const data = response.data || response;
          if (data.success && data.partner) {
            const partner = data.partner;
            setSettings({
              services: partner.services || user?.services || ['security'],
              cities: ['Berlin', 'Hamburg'],
              countries: ['Germany'],
              radius: 50,
              avgLeadsPerWeek: 5,
              fromRadius: 50,
              toRadius: 50,
              requireManualAcceptance: partner.leadAcceptance?.requireManualAcceptance ?? true,
              companyName: partner.companyName || user?.name || 'MoveIt Pro GmbH',
              contactPerson: partner.contactPerson?.firstName + ' ' + partner.contactPerson?.lastName || 'John Doe',
              phone: partner.contactPerson?.phone || '+49 30 12345678',
              email: partner.contactPerson?.email || user?.email || 'info@moveitpro.de',
              address: partner.address?.street + ', ' + partner.address?.postalCode + ' ' + partner.address?.city || 'Hauptstr. 123, 10117 Berlin'
            });
          }
        } catch (error) {
          console.error('Error loading partner profile:', error);
          // Fallback to default values
          setSettings({
            services: user?.services || ['security'],
            cities: ['Berlin', 'Hamburg'],
            countries: ['Germany'],
            radius: 50,
            avgLeadsPerWeek: 5,
            fromRadius: 50,
            toRadius: 50,
            requireManualAcceptance: true,
            companyName: user?.name || 'MoveIt Pro GmbH',
            contactPerson: 'John Doe',
            phone: '+49 30 12345678',
            email: user?.email || 'info@moveitpro.de',
            address: 'Hauptstr. 123, 10117 Berlin'
          });
        }
      }
    };

    loadPartnerSettings();
  }, [isPartner, user]);

  const handleCityChange = (city, checked) => {
    setSettings(prev => ({
      ...prev,
      cities: checked 
        ? [...prev.cities, city]
        : prev.cities.filter(c => c !== city)
    }));
  };

  const handleCountryChange = (country, checked) => {
    setSettings(prev => ({
      ...prev,
      countries: checked 
        ? [...prev.countries, country]
        : prev.countries.filter(c => c !== country)
    }));
  };

  const handleServiceChange = (serviceId, checked) => {
    setSettings(prev => {
      let newServices;
      if (checked) {
        newServices = [...prev.services, serviceId];
      } else {
        newServices = prev.services.filter(s => s !== serviceId);
        // Ensure at least one service is always selected
        if (newServices.length === 0) {
          newServices = ['security']; // Default to security if trying to unselect all
        }
      }
      return {
        ...prev,
        services: newServices
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Use the /my/settings endpoint for updating own settings
      const response = await fetch('/api/partners/my/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          leadAcceptance: {
            requireManualAcceptance: settings.requireManualAcceptance
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(isGerman ? 'Einstellungen erfolgreich gespeichert!' : 'Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error(result.message || (isGerman ? 'Fehler beim Speichern' : 'Error saving settings'));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage(isGerman ? 'Fehler beim Speichern der Einstellungen' : 'Error saving settings');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    setPasswordReset(prev => ({ ...prev, loading: true, message: '' }));

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: passwordReset.email
        })
      });

      const result = await response.json();

      if (result.success) {
        setPasswordReset(prev => ({
          ...prev,
          loading: false,
          step: 'verify',
          otpId: result.otpId,
          otpSent: true,
          message: isGerman ? 'OTP wurde an Ihre E-Mail gesendet' : 'OTP sent to your email'
        }));
      } else {
        setPasswordReset(prev => ({
          ...prev,
          loading: false,
          message: result.message || (isGerman ? 'Fehler beim Senden der OTP' : 'Error sending OTP')
        }));
      }
    } catch (error) {
      setPasswordReset(prev => ({
        ...prev,
        loading: false,
        message: isGerman ? 'Fehler beim Senden der OTP' : 'Error sending OTP'
      }));
    }
  };

  const handleOTPVerification = async () => {
    if (!passwordReset.otp || passwordReset.otp.length !== 6) {
      setPasswordReset(prev => ({
        ...prev,
        message: isGerman ? 'Bitte geben Sie eine gültige 6-stellige OTP ein' : 'Please enter a valid 6-digit OTP'
      }));
      return;
    }

    setPasswordReset(prev => ({ ...prev, loading: true, message: '' }));

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          otpId: passwordReset.otpId,
          otp: passwordReset.otp
        })
      });

      const result = await response.json();

      if (result.success) {
        setPasswordReset(prev => ({
          ...prev,
          loading: false,
          step: 'reset',
          resetToken: result.resetToken,
          message: isGerman ? 'OTP verifiziert. Neues Passwort eingeben' : 'OTP verified. Enter new password'
        }));
      } else {
        setPasswordReset(prev => ({
          ...prev,
          loading: false,
          message: result.message || (isGerman ? 'Ungültige OTP' : 'Invalid OTP')
        }));
      }
    } catch (error) {
      setPasswordReset(prev => ({
        ...prev,
        loading: false,
        message: isGerman ? 'Fehler bei der OTP-Verifizierung' : 'Error verifying OTP'
      }));
    }
  };

  const handlePasswordReset = async () => {
    if (passwordReset.newPassword !== passwordReset.confirmPassword) {
      setPasswordReset(prev => ({
        ...prev,
        message: isGerman ? 'Passwörter stimmen nicht überein' : 'Passwords do not match'
      }));
      return;
    }

    if (passwordReset.newPassword.length < 8) {
      setPasswordReset(prev => ({
        ...prev,
        message: isGerman ? 'Passwort muss mindestens 8 Zeichen lang sein' : 'Password must be at least 8 characters long'
      }));
      return;
    }

    setPasswordReset(prev => ({ ...prev, loading: true, message: '' }));

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resetToken: passwordReset.resetToken,
          newPassword: passwordReset.newPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        setPasswordReset({
          showForm: false,
          step: 'request',
          email: user?.email || '',
          otpId: '',
          otp: '',
          newPassword: '',
          confirmPassword: '',
          loading: false,
          message: '',
          otpSent: false,
          resetToken: ''
        });
        setMessage(isGerman ? 'Passwort erfolgreich geändert!' : 'Password changed successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setPasswordReset(prev => ({
          ...prev,
          loading: false,
          message: result.message || (isGerman ? 'Fehler beim Ändern des Passworts' : 'Error changing password')
        }));
      }
    } catch (error) {
      setPasswordReset(prev => ({
        ...prev,
        loading: false,
        message: isGerman ? 'Fehler beim Ändern des Passworts' : 'Error changing password'
      }));
    }
  };

  const togglePasswordForm = () => {
    setPasswordReset(prev => ({
      showForm: !prev.showForm,
      step: 'request',
      email: user?.email || '',
      otpId: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
      loading: false,
      message: '',
      otpSent: false,
      resetToken: ''
    }));
  };

  if (!isPartner && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Zugriff verweigert' : 'Access Denied'}
          </h3>
          <p style={{ color: 'var(--theme-muted)' }}>
            {isGerman ? 'Nur Partner können Einstellungen verwalten' : 'Only Partners can access settings'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Partner-Einstellungen' : 'Partner Settings'}
        </h2>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
          }`}
          style={{ 
            backgroundColor: 'var(--theme-button-bg)', 
            color: 'var(--theme-button-text)' 
          }}
          whileHover={!saving ? { scale: 1.02 } : {}}
          whileTap={!saving ? { scale: 0.98 } : {}}
        >
          {saving ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>{isGerman ? 'Speichern...' : 'Saving...'}</span>
            </div>
          ) : (
            <>💾 {isGerman ? 'Speichern' : 'Save Settings'}</>
          )}
        </motion.button>
      </div>

      {/* Success/Error Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('erfolg') || message.includes('success')
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Service Selection */}
      <motion.div
        className="p-6 rounded-lg"
        style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
          🎯 {isGerman ? 'Ihre Services' : 'Your Services'}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableServices.map((service) => (
            <label 
              key={service.id} 
              className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md"
              style={{ 
                borderColor: settings.services.includes(service.id) ? '#3B82F6' : 'var(--theme-border)',
                backgroundColor: settings.services.includes(service.id) ? 'rgba(59, 130, 246, 0.1)' : 'var(--theme-bg)'
              }}
            >
              <input
                type="checkbox"
                checked={settings.services.includes(service.id)}
                onChange={(e) => handleServiceChange(service.id, e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center space-x-3 flex-1">
                <span className="text-2xl">{service.icon}</span>
                <div>
                  <div className="font-medium" style={{ color: 'var(--theme-text)' }}>
                    {service.name[isGerman ? 'de' : 'en']}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman ? 'Leads für diesen Service erhalten' : 'Receive leads for this service'}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
        
        <p className="mt-4 text-sm" style={{ color: 'var(--theme-muted)' }}>
          {isGerman 
            ? `${settings.services.length} Service(s) ausgewählt. Mindestens ein Service muss ausgewählt sein.`
            : `${settings.services.length} service(s) selected. At least one service must be selected.`
          }
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lead Preferences */}
        <motion.div
          className="space-y-6 p-6 rounded-lg"
          style={{ backgroundColor: 'var(--theme-bg-secondary)' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
            📍 {isGerman ? 'Lead-Präferenzen' : 'Lead Preferences'}
          </h3>

          {/* Current Service Context */}
          <div className="p-4 rounded-lg border border-blue-200/30 bg-blue-50/10">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <div className="font-semibold" style={{ color: 'var(--theme-text)' }}>
                  {isGerman ? 'Sicherheitsservice' : 'Security Service'}
                </div>
                <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                  {isGerman
                    ? 'Einstellungen für diesen Service'
                    : 'Settings for this service'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Cities */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
              {isGerman
                ? 'Verfügbare Städte für Sicherheitsservice'
                : 'Available Cities for Security Service'
              }
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableCities.map((city) => (
                <label key={city} className="flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-opacity-50" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  <input
                    type="checkbox"
                    checked={settings.cities.includes(city)}
                    onChange={(e) => handleCityChange(city, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm" style={{ color: 'var(--theme-text)' }}>{city}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
              {isGerman
                ? `${settings.cities.length} Städte für Sicherheitsservice ausgewählt`
                : `${settings.cities.length} cities selected for security services`
              }
            </p>
          </div>

          {/* Countries */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Verfügbare Länder' : 'Available Countries'}
            </label>
            <div className="space-y-2">
              {availableCountries.map((country) => (
                <label key={country} className="flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-opacity-50" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  <input
                    type="checkbox"
                    checked={settings.countries.includes(country)}
                    onChange={(e) => handleCountryChange(country, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm" style={{ color: 'var(--theme-text)' }}>{country}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Average Leads Per Week - Service Specific */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
              {isGerman
                ? 'Gewünschte Sicherheits-Leads pro Woche'
                : 'Desired Security Leads Per Week'
              }
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={settings.avgLeadsPerWeek}
              onChange={(e) => setSettings(prev => ({ ...prev, avgLeadsPerWeek: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
              <span>1</span>
              <span className="font-medium">{settings.avgLeadsPerWeek} {isGerman ? 'Leads/Woche' : 'leads/week'}</span>
              <span>20</span>
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
              {isGerman
                ? 'Das CRM verwendet diese Einstellung für eine faire Sicherheits-Lead-Verteilung'
                : 'CRM uses this setting for fair security lead distribution'
              }
            </p>
          </div>
        </motion.div>

        {/* Contact & Notification Settings */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Lead Acceptance Settings - Moved to top for visibility */}
          <div className="p-6 rounded-lg border" style={{
            backgroundColor: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border)'
          }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
              ⚡ {isGerman ? 'Lead-Annahme' : 'Lead Acceptance'}
            </h3>

            <div className="space-y-4">
              <label className="flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md"
                style={{
                  borderColor: !settings.requireManualAcceptance ? '#3B82F6' : 'var(--theme-border)',
                  backgroundColor: !settings.requireManualAcceptance ? 'rgba(59, 130, 246, 0.1)' : 'var(--theme-bg)'
                }}
              >
                <input
                  type="checkbox"
                  checked={!settings.requireManualAcceptance}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    requireManualAcceptance: !e.target.checked
                  }))}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                    {isGerman
                      ? 'Leads automatisch akzeptieren'
                      : 'Automatically Accept Leads'}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman
                      ? 'Wenn aktiviert, werden Ihnen zugewiesene Leads automatisch akzeptiert. Sie müssen Leads nicht mehr manuell annehmen.'
                      : 'When enabled, leads assigned to you will be automatically accepted. You won\'t need to manually accept leads.'}
                  </div>
                  <div className="mt-2 text-xs px-3 py-2 rounded" style={{
                    backgroundColor: !settings.requireManualAcceptance ? '#DBEAFE' : '#FEF3C7',
                    color: !settings.requireManualAcceptance ? '#1E40AF' : '#92400E'
                  }}>
                    {!settings.requireManualAcceptance
                      ? (isGerman ? '✓ Aktiviert: Leads werden automatisch akzeptiert' : '✓ Enabled: Leads will be auto-accepted')
                      : (isGerman ? '✗ Deaktiviert: Manuelle Annahme erforderlich' : '✗ Disabled: Manual acceptance required')
                    }
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Contact Information */}
          <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
              🏢 {isGerman ? 'Kontaktinformationen' : 'Contact Information'}
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Firmenname' : 'Company Name'}
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Ansprechpartner' : 'Contact Person'}
              </label>
              <input
                type="text"
                value={settings.contactPerson}
                onChange={(e) => setSettings(prev => ({ ...prev, contactPerson: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Telefon' : 'Phone'}
              </label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'E-Mail' : 'Email'}
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Adresse' : 'Address'}
              </label>
              <textarea
                value={settings.address}
                onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
            </div>
          </div>

          {/* Password Reset Section */}
          <div className="p-6 rounded-lg border" style={{
            backgroundColor: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border)'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Passwort zurücksetzen' : 'Password Reset'}
              </h3>
              <button
                onClick={togglePasswordForm}
                className="px-3 py-1 rounded text-sm transition-colors"
                style={{
                  backgroundColor: passwordReset.showForm ? '#ef4444' : '#3b82f6',
                  color: 'white'
                }}
              >
                {passwordReset.showForm ?
                  (isGerman ? 'Abbrechen' : 'Cancel') :
                  (isGerman ? 'Ändern' : 'Change')
                }
              </button>
            </div>

            {passwordReset.showForm && (
              <div className="space-y-4 border-t pt-4" style={{ borderColor: 'var(--theme-border)' }}>
                {passwordReset.message && (
                  <div className={`p-3 rounded text-sm ${
                    passwordReset.message.includes('erfolg') || passwordReset.message.includes('success') || passwordReset.message.includes('sent') || passwordReset.message.includes('verified')
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {passwordReset.message}
                  </div>
                )}

                {passwordReset.step === 'request' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-2" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'E-Mail-Adresse' : 'Email Address'}
                      </label>
                      <input
                        type="email"
                        value={passwordReset.email}
                        onChange={(e) => setPasswordReset(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                        style={{
                          backgroundColor: 'var(--theme-input-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-text)'
                        }}
                        disabled={passwordReset.loading}
                      />
                    </div>
                    <button
                      onClick={handlePasswordResetRequest}
                      disabled={passwordReset.loading || !passwordReset.email}
                      className={`w-full px-4 py-2 rounded text-sm transition-colors ${
                        passwordReset.loading || !passwordReset.email ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white'
                      }}
                    >
                      {passwordReset.loading ? (
                        <span className="flex items-center justify-center">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          {isGerman ? 'Senden...' : 'Sending...'}
                        </span>
                      ) : (
                        isGerman ? 'OTP senden' : 'Send OTP'
                      )}
                    </button>
                  </div>
                )}

                {passwordReset.step === 'verify' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-2" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'OTP-Code eingeben' : 'Enter OTP Code'}
                      </label>
                      <input
                        type="text"
                        value={passwordReset.otp}
                        onChange={(e) => setPasswordReset(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        placeholder="000000"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 text-center text-lg tracking-widest"
                        style={{
                          backgroundColor: 'var(--theme-input-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-text)'
                        }}
                        disabled={passwordReset.loading}
                        maxLength="6"
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                        {isGerman ? 'Code aus E-Mail eingeben' : 'Enter code from email'}
                      </p>
                    </div>
                    <button
                      onClick={handleOTPVerification}
                      disabled={passwordReset.loading || passwordReset.otp.length !== 6}
                      className={`w-full px-4 py-2 rounded text-sm transition-colors ${
                        passwordReset.loading || passwordReset.otp.length !== 6 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white'
                      }}
                    >
                      {passwordReset.loading ? (
                        <span className="flex items-center justify-center">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          {isGerman ? 'Prüfen...' : 'Verifying...'}
                        </span>
                      ) : (
                        isGerman ? 'Code bestätigen' : 'Verify Code'
                      )}
                    </button>
                  </div>
                )}

                {passwordReset.step === 'reset' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-2" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Neues Passwort' : 'New Password'}
                      </label>
                      <input
                        type="password"
                        value={passwordReset.newPassword}
                        onChange={(e) => setPasswordReset(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder={isGerman ? 'Mindestens 8 Zeichen' : 'At least 8 characters'}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                        style={{
                          backgroundColor: 'var(--theme-input-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-text)'
                        }}
                        disabled={passwordReset.loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Passwort bestätigen' : 'Confirm Password'}
                      </label>
                      <input
                        type="password"
                        value={passwordReset.confirmPassword}
                        onChange={(e) => setPasswordReset(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder={isGerman ? 'Passwort wiederholen' : 'Repeat password'}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                        style={{
                          backgroundColor: 'var(--theme-input-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-text)'
                        }}
                        disabled={passwordReset.loading}
                      />
                    </div>
                    <button
                      onClick={handlePasswordReset}
                      disabled={passwordReset.loading || !passwordReset.newPassword || !passwordReset.confirmPassword}
                      className={`w-full px-4 py-2 rounded text-sm transition-colors ${
                        passwordReset.loading || !passwordReset.newPassword || !passwordReset.confirmPassword ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        backgroundColor: '#059669',
                        color: 'white'
                      }}
                    >
                      {passwordReset.loading ? (
                        <span className="flex items-center justify-center">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          {isGerman ? 'Ändern...' : 'Updating...'}
                        </span>
                      ) : (
                        isGerman ? 'Passwort aktualisieren' : 'Update Password'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PartnerSettings;