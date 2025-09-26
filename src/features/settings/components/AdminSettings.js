import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { settingsAPI } from '../../../lib/api/api';

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
      },
      cleaning: {
        basic: {
          perLeadPrice: 15
        },
        exclusive: {
          perLeadPrice: 20
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
      },
      cleaning: {
        basic: {
          leadsPerWeek: 5
        },
        exclusive: {
          leadsPerWeek: 12
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

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

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
          <div className="text-6xl mb-4">🔒</div>
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
    { id: 'security', label: isGerman ? 'Sicherheit' : 'Security' }
  ];

  const renderPricingTab = () => (
    <motion.div
      key="pricing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Moving Service Pricing */}
        <motion.div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-border)'
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="text-3xl">🚛</div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Umzugsservice' : 'Moving Service'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Preis pro Lead' : 'Price per lead'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Basic Partner Pricing */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Basic Partner (€)' : 'Basic Partners (€)'}
              </label>
              <div
                className="flex items-center border rounded-lg px-3"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  height: '48px'
                }}
              >
                <span
                  className="text-lg font-semibold mr-3 inline-flex items-center"
                  style={{ color: 'var(--theme-text)' }}
                >
                  €
                </span>
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
                  className="flex-1 h-full text-lg font-semibold focus:outline-none focus:ring-0"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--theme-text)',
                    border: 'none',
                    lineHeight: '1.1',
                    padding: 0
                  }}
                />
              </div>
            </div>

            {/* Exclusive Partner Pricing */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Exclusive Partner (€)' : 'Exclusive Partners (€)'}
              </label>
              <div
                className="flex items-center border rounded-lg px-3"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  height: '48px'
                }}
              >
                <span
                  className="text-lg font-semibold mr-3 inline-flex items-center"
                  style={{ color: 'var(--theme-text)' }}
                >
                  €
                </span>
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
                  className="flex-1 h-full text-lg font-semibold focus:outline-none focus:ring-0"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--theme-text)',
                    border: 'none',
                    lineHeight: '1.1',
                    padding: 0
                  }}
                />
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman
                  ? 'Betrag, den Partner pro zugewiesenem und akzeptiertem Moving-Lead zahlen'
                  : 'Amount partners pay per assigned and accepted moving lead'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Cleaning Service Pricing */}
        <motion.div
          className="p-6 rounded-xl border"
          style={{ 
            backgroundColor: 'var(--theme-card-bg)', 
            borderColor: 'var(--theme-border)' 
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="text-3xl">🧽</div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Reinigungsservice' : 'Cleaning Service'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Preis pro Lead' : 'Price per lead'}
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Basic Partner Pricing */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Basic Partner (€)' : 'Basic Partners (€)'}
              </label>
              <div
                className="flex items-center border rounded-lg px-3"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  height: '48px'
                }}
              >
                <span
                  className="text-lg font-semibold mr-3 inline-flex items-center"
                  style={{ color: 'var(--theme-text)' }}
                >
                  €
                </span>
                <input
                  type="number"
                  value={settings.pricing.cleaning.basic.perLeadPrice}
                  onChange={(e) =>
                    updateNestedSetting(
                      'pricing.cleaning.basic.perLeadPrice',
                      parseFloat(e.target.value)
                    )
                  }
                  min="1"
                  step="0.01"
                  className="flex-1 h-full text-lg font-semibold focus:outline-none focus:ring-0"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--theme-text)',
                    border: 'none',
                    lineHeight: '1.1',
                    padding: 0
                  }}
                />
              </div>
            </div>

            {/* Exclusive Partner Pricing */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Exclusive Partner (€)' : 'Exclusive Partners (€)'}
              </label>
              <div
                className="flex items-center border rounded-lg px-3"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  height: '48px'
                }}
              >
                <span
                  className="text-lg font-semibold mr-3 inline-flex items-center"
                  style={{ color: 'var(--theme-text)' }}
                >
                  €
                </span>
                <input
                  type="number"
                  value={settings.pricing.cleaning.exclusive.perLeadPrice}
                  onChange={(e) =>
                    updateNestedSetting(
                      'pricing.cleaning.exclusive.perLeadPrice',
                      parseFloat(e.target.value)
                    )
                  }
                  min="1"
                  step="0.01"
                  className="flex-1 h-full text-lg font-semibold focus:outline-none focus:ring-0"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--theme-text)',
                    border: 'none',
                    lineHeight: '1.1',
                    padding: 0
                  }}
                />
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman
                  ? 'Betrag, den Partner pro zugewiesenem und akzeptiertem Reinigungs-Lead zahlen'
                  : 'Amount partners pay per assigned and accepted cleaning lead'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pricing Summary */}
      <motion.div
        className="p-6 rounded-xl border mt-8"
        style={{ 
          backgroundColor: 'var(--theme-card-bg)', 
          borderColor: 'var(--theme-border)' 
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
          💎 {isGerman ? 'Umsatzübersicht' : 'Revenue Overview'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="text-2xl font-bold text-green-600 mb-2">
              €{settings.pricing.moving.basic.perLeadPrice}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Umzug Basic' : 'Moving Basic'}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="text-2xl font-bold text-green-700 mb-2">
              €{settings.pricing.moving.exclusive.perLeadPrice}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Umzug Exclusive' : 'Moving Exclusive'}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="text-2xl font-bold text-blue-600 mb-2">
              €{settings.pricing.cleaning.basic.perLeadPrice}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Reinigung Basic' : 'Cleaning Basic'}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="text-2xl font-bold text-blue-700 mb-2">
              €{settings.pricing.cleaning.exclusive.perLeadPrice}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Reinigung Exclusive' : 'Cleaning Exclusive'}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderLeadDistributionTab = () => (
    <motion.div
      key="leads"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Moving Service Lead Distribution */}
        <motion.div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-border)'
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-3xl">🚛</div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Umzugsservice' : 'Moving Service'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Leads pro Woche' : 'Leads per week'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Basic Partner' : 'Basic Partners'}
              </label>
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
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman
                  ? 'Maximale Leads pro Woche für Basic Partner'
                  : 'Maximum leads per week for basic partners'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Exclusive Partner' : 'Exclusive Partners'}
              </label>
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
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman
                  ? 'Maximale Leads pro Woche für Exclusive Partner'
                  : 'Maximum leads per week for exclusive partners'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Cleaning Service Lead Distribution */}
        <motion.div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-border)'
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-3xl">🧽</div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Reinigungsservice' : 'Cleaning Service'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                {isGerman ? 'Leads pro Woche' : 'Leads per week'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Basic Partner' : 'Basic Partners'}
              </label>
              <input
                type="number"
                value={settings.leadDistribution.cleaning.basic.leadsPerWeek}
                onChange={(e) =>
                  updateNestedSetting(
                    'leadDistribution.cleaning.basic.leadsPerWeek',
                    parseInt(e.target.value)
                  )
                }
                min="1"
                max="50"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman
                  ? 'Maximale Leads pro Woche für Basic Partner'
                  : 'Maximum leads per week for basic partners'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Exclusive Partner' : 'Exclusive Partners'}
              </label>
              <input
                type="number"
                value={settings.leadDistribution.cleaning.exclusive.leadsPerWeek}
                onChange={(e) =>
                  updateNestedSetting(
                    'leadDistribution.cleaning.exclusive.leadsPerWeek',
                    parseInt(e.target.value)
                  )
                }
                min="1"
                max="50"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman
                  ? 'Maximale Leads pro Woche für Exclusive Partner'
                  : 'Maximum leads per week for exclusive partners'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Lead Distribution Summary */}
      <motion.div
        className="p-6 rounded-xl border mt-8"
        style={{ 
          backgroundColor: 'var(--theme-card-bg)', 
          borderColor: 'var(--theme-border)' 
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
          📊 {isGerman ? 'Lead-Verteilungsübersicht' : 'Lead Distribution Overview'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {settings.leadDistribution.moving.basic.leadsPerWeek}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Umzug Basic' : 'Moving Basic'}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {settings.leadDistribution.moving.exclusive.leadsPerWeek}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Umzug Exclusive' : 'Moving Exclusive'}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {settings.leadDistribution.cleaning.basic.leadsPerWeek}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Reinigung Basic' : 'Cleaning Basic'}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <div className="text-2xl font-bold text-blue-700 mb-1">
              {settings.leadDistribution.cleaning.exclusive.leadsPerWeek}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Reinigung Exclusive' : 'Cleaning Exclusive'}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderSystemTab = () => (
    <motion.div
      key="system"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Lead Settings */}
        <motion.div
          className="p-6 rounded-xl border"
          style={{ 
            backgroundColor: 'var(--theme-card-bg)', 
            borderColor: 'var(--theme-border)' 
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--theme-text)' }}>
            🎯 {isGerman ? 'Lead-Einstellungen' : 'Lead Settings'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Lead-Stornierungsfrist nach Annahme (Stunden)' : 'Lead Cancellation Time Limit After Acceptance (hours)'}
              </label>
              <input
                type="number"
                value={settings.system.autoAcceptTimeout}
                onChange={(e) => updateNestedSetting('system.autoAcceptTimeout', parseInt(e.target.value))}
                min="1"
                max="72"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman 
                  ? 'Zeitlimit nach Annahme, in dem ein Lead storniert werden kann'
                  : 'Time limit after acceptance during which a lead can be cancelled'
                }
              </p>
            </div>


            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                {isGerman ? 'Pro Lead Zuweisungslimit zu Basic Partner' : 'Per Lead Assignment Limit to Basic Partner'}
              </label>
              <input
                type="number"
                value={settings.system.basicPartnerLeadLimit}
                onChange={(e) => updateNestedSetting('system.basicPartnerLeadLimit', parseInt(e.target.value))}
                min="1"
                max="10"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman 
                  ? 'Anzahl der Basic Partner, an die derselbe Lead gesendet werden kann'
                  : 'Number of basic partners that can receive the same lead'
                }
              </p>
            </div>
          </div>
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pricing':
        return renderPricingTab();
      case 'leads':
        return renderLeadDistributionTab();
      case 'system':
        return renderSystemTab();
      case 'security':
        return renderSecurityTab();
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
            👑 {isGerman ? 'Admin-Einstellungen' : 'Admin Settings'}
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
            <>💾 {isGerman ? 'Einstellungen speichern' : 'Save Settings'}</>
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