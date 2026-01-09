import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { settingsAPI } from '../../../lib/api/api';
import FormSettings from './FormSettings';
import PasswordStrengthIndicator from '../../../components/ui/PasswordStrengthIndicator';
import { validatePasswordStrength } from '../../../../utils/passwordGenerator';

const AdminSettings = () => {
  const { t, isGerman } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  
  const [settings, setSettings] = useState({
    pricing: {
      moving: {
        basic: {
          perLeadPrice: 25
        },
        exclusive: {
          perLeadPrice: 30
        }
      }
    },
    leadDistribution: {
      moving: {
        basic: {
          leadsPerWeek: 3
        },
        exclusive: {
          leadsPerWeek: 8
        }
      }
    },
    system: {
      currency: 'EUR',
      taxRate: 19,
      leadAssignmentMethod: 'round_robin',
      autoAcceptTimeout: 5,
      basicPartnerLeadLimit: 3
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pricing');

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

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.get();

      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error(isGerman ? 'Fehler beim Laden der Einstellungen' : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await settingsAPI.update(settings);
      
      if (response.data.success) {
        toast.success(isGerman ? 'Einstellungen erfolgreich gespeichert!' : 'Settings saved successfully!');
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      const message = error.response?.data?.message || (isGerman ? 'Fehler beim Speichern' : 'Error saving settings');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const updateNestedSetting = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
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
    // Validate password strength (12 chars + complexity)
    const validation = validatePasswordStrength(passwordReset.newPassword);
    if (!validation.isValid) {
      setPasswordReset(prev => ({
        ...prev,
        message: validation.messages[0]
      }));
      return;
    }

    if (passwordReset.newPassword !== passwordReset.confirmPassword) {
      setPasswordReset(prev => ({
        ...prev,
        message: isGerman ? 'Passwörter stimmen nicht überein' : 'Passwords do not match'
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
        toast.success(isGerman ? 'Passwort erfolgreich geändert!' : 'Password changed successfully!');
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

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Zugriff verweigert' : 'Access Denied'}
          </h3>
          <p style={{ color: 'var(--theme-muted)' }}>
            {isGerman ? 'Nur Super-Admins können Systemeinstellungen verwalten' : 'Only Super Admins can access system settings'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Einstellungen laden...' : 'Loading settings...'}
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'pricing', label: isGerman ? 'Pricing' : 'Pricing' },
    { id: 'leads', label: isGerman ? 'Lead-Verteilung' : 'Lead Distribution' },
    { id: 'system', label: isGerman ? 'System' : 'System' },
    { id: 'formSettings', label: isGerman ? 'Formular' : 'Form Settings' }
  ];

  const renderPricingTab = () => (
    <motion.div
      key="pricing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Modern Compact Pricing Card */}
      <motion.div
        className="p-5 rounded-xl border"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-border)'
        }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
      >
        <div className="flex items-center space-x-2 mb-4">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          <h3 className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Umzugsservice Preise' : 'Moving Service Pricing'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Partner */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
            <label className="block text-xs font-medium mb-2 text-gray-500">
              {isGerman ? 'BASIC PARTNER' : 'BASIC PARTNER'}
            </label>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-green-600">€</span>
              <input
                type="number"
                value={settings.pricing.moving.basic.perLeadPrice}
                onChange={(e) =>
                  updateNestedSetting(
                    'pricing.moving.basic.perLeadPrice',
                    parseFloat(e.target.value)
                  )
                }
                min="1"
                step="0.01"
                className="text-3xl font-bold ml-1 w-full focus:outline-none bg-transparent"
                style={{ color: 'var(--theme-text)' }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'pro Lead' : 'per lead'}
            </p>
          </div>

          {/* Exclusive Partner */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
            <label className="block text-xs font-medium mb-2 text-gray-500">
              {isGerman ? 'EXCLUSIVE PARTNER' : 'EXCLUSIVE PARTNER'}
            </label>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-green-700">€</span>
              <input
                type="number"
                value={settings.pricing.moving.exclusive.perLeadPrice}
                onChange={(e) =>
                  updateNestedSetting(
                    'pricing.moving.exclusive.perLeadPrice',
                    parseFloat(e.target.value)
                  )
                }
                min="1"
                step="0.01"
                className="text-3xl font-bold ml-1 w-full focus:outline-none bg-transparent"
                style={{ color: 'var(--theme-text)' }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'pro Lead' : 'per lead'}
            </p>
          </div>
        </div>

        <p className="text-xs mt-3" style={{ color: 'var(--theme-muted)' }}>
          {isGerman
            ? 'Betrag, den Partner pro zugewiesenem und akzeptiertem Moving-Lead zahlen'
            : 'Amount partners pay per assigned and accepted moving lead'}
        </p>
      </motion.div>
    </motion.div>
  );

  const renderLeadDistributionTab = () => (
    <motion.div
      key="leads"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Modern Compact Lead Distribution Card */}
      <motion.div
        className="p-5 rounded-xl border"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-border)'
        }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
      >
        <div className="flex items-center space-x-2 mb-4">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          <h3 className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Lead-Verteilung pro Woche' : 'Lead Distribution per Week'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Partner */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
            <label className="block text-xs font-medium mb-2 text-gray-500">
              {isGerman ? 'BASIC PARTNER' : 'BASIC PARTNER'}
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={settings.leadDistribution.moving.basic.leadsPerWeek}
                onChange={(e) =>
                  updateNestedSetting(
                    'leadDistribution.moving.basic.leadsPerWeek',
                    parseInt(e.target.value)
                  )
                }
                min="1"
                max="50"
                className="text-3xl font-bold w-full focus:outline-none bg-transparent"
                style={{ color: 'var(--theme-text)' }}
              />
              <span className="text-sm ml-2" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? '/Woche' : '/week'}
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Max. Leads' : 'Max. leads'}
            </p>
          </div>

          {/* Exclusive Partner */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
            <label className="block text-xs font-medium mb-2 text-gray-500">
              {isGerman ? 'EXCLUSIVE PARTNER' : 'EXCLUSIVE PARTNER'}
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={settings.leadDistribution.moving.exclusive.leadsPerWeek}
                onChange={(e) =>
                  updateNestedSetting(
                    'leadDistribution.moving.exclusive.leadsPerWeek',
                    parseInt(e.target.value)
                  )
                }
                min="1"
                max="50"
                className="text-3xl font-bold w-full focus:outline-none bg-transparent"
                style={{ color: 'var(--theme-text)' }}
              />
              <span className="text-sm ml-2" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? '/Woche' : '/week'}
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Max. Leads' : 'Max. leads'}
            </p>
          </div>
        </div>

        <p className="text-xs mt-3" style={{ color: 'var(--theme-muted)' }}>
          {isGerman
            ? 'Maximale Anzahl von Leads, die pro Woche an Partner zugewiesen werden'
            : 'Maximum number of leads assigned to partners per week'}
        </p>
      </motion.div>
    </motion.div>
  );

  const renderSystemTab = () => (
    <motion.div
      key="system"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Modern Compact Lead Settings Card */}
      <motion.div
        className="p-5 rounded-xl border"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-border)'
        }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
      >
        <div className="flex items-center space-x-2 mb-4">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Lead-Einstellungen' : 'Lead Settings'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cancellation Time Limit */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
            <label className="block text-xs font-medium mb-2 text-gray-500">
              {isGerman ? 'STORNIERUNGSFRIST' : 'CANCELLATION TIME LIMIT'}
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={settings.system.autoAcceptTimeout}
                onChange={(e) => updateNestedSetting('system.autoAcceptTimeout', parseInt(e.target.value))}
                min="1"
                max="72"
                className="text-3xl font-bold w-full focus:outline-none bg-transparent"
                style={{ color: 'var(--theme-text)' }}
              />
              <span className="text-sm ml-2" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Stunden' : 'hours'}
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--theme-muted)' }}>
              {isGerman
                ? 'Nach Annahme'
                : 'After acceptance'}
            </p>
          </div>

          {/* Basic Partner Lead Limit */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }}>
            <label className="block text-xs font-medium mb-2 text-gray-500">
              {isGerman ? 'BASIC PARTNER LIMIT' : 'BASIC PARTNER LIMIT'}
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={settings.system.basicPartnerLeadLimit}
                onChange={(e) => updateNestedSetting('system.basicPartnerLeadLimit', parseInt(e.target.value))}
                min="1"
                max="10"
                className="text-3xl font-bold w-full focus:outline-none bg-transparent"
                style={{ color: 'var(--theme-text)' }}
              />
              <span className="text-sm ml-2" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Partner' : 'partners'}
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--theme-muted)' }}>
              {isGerman
                ? 'Pro Lead'
                : 'Per lead'}
            </p>
          </div>
        </div>

        <p className="text-xs mt-3" style={{ color: 'var(--theme-muted)' }}>
          {isGerman
            ? 'Lead-Verwaltungseinstellungen für Stornierung und Zuweisungslimits'
            : 'Lead management settings for cancellation and assignment limits'}
        </p>
      </motion.div>
    </motion.div>
  );


  const renderSecurityTab = () => (
    <motion.div
      key="security"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Password Reset Section */}
      <div
        className="p-6 rounded-lg border"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-border)'
        }}
      >
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
                    placeholder={isGerman ? 'Mindestens 12 Zeichen' : 'At least 12 characters'}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                    style={{
                      backgroundColor: 'var(--theme-input-bg)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)'
                    }}
                    disabled={passwordReset.loading}
                  />
                  {/* Password Strength Indicator */}
                  <PasswordStrengthIndicator password={passwordReset.newPassword} isGerman={isGerman} />
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

      {/* Security Information */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-border)'
        }}
      >
        <h3 className="text-base font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Sicherheitshinweise' : 'Security Notes'}
        </h3>
        <div className="space-y-2 text-sm" style={{ color: 'var(--theme-muted)' }}>
          <div>{isGerman ? '• Passwörter müssen mindestens 8 Zeichen haben' : '• Passwords must be at least 8 characters'}</div>
          <div>{isGerman ? '• OTP-Codes sind 15 Minuten gültig' : '• OTP codes are valid for 15 minutes'}</div>
          <div>{isGerman ? '• Bestätigung erfolgt per E-Mail' : '• Confirmation sent via email'}</div>
        </div>
      </div>
    </motion.div>
  );

  const renderFormSettingsTab = () => (
    <motion.div
      key="formSettings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <FormSettings />
    </motion.div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pricing':
        return renderPricingTab();
      case 'leads':
        return renderLeadDistributionTab();
      case 'system':
        return renderSystemTab();
      case 'formSettings':
        return renderFormSettingsTab();
      default:
        return renderPricingTab();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--theme-text)' }}>
            <svg className="w-5 h-5 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            {isGerman ? 'Admin-Einstellungen' : 'Admin Settings'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--theme-muted)' }}>
            {isGerman ? 'Systemweite Einstellungen verwalten' : 'Manage system-wide settings'}
          </p>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
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
            <><svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {isGerman ? 'Einstellungen speichern' : 'Save Settings'}</>
          )}
        </motion.button>
      </div>

      {/* Navigation Tabs - Match Lead Management Style */}
      <div className="flex border-b mb-6" style={{ borderColor: 'var(--theme-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              color: activeTab === tab.id ? '#3B82F6' : 'var(--theme-text-muted)',
              borderBottomColor: activeTab === tab.id ? '#3B82F6' : 'transparent'
            }}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {renderTabContent()}
      </AnimatePresence>
    </div>
  );
};

export default AdminSettings;