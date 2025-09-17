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
      leadAcceptTimeout: 24,
      basicPartnerLeadLimit: 3
    },
    email: {
      leadNotificationEnabled: true,
      partnerNotificationEnabled: true,
      adminNotificationEnabled: true,
      incomeInvoiceNotificationEnabled: true
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pricing');

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
    { id: 'notifications', label: isGerman ? 'Notifications' : 'Notifications' }
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
                {isGerman ? 'Lead-Annahmefrist (Stunden)' : 'Lead Accept Time Limit (hours)'}
              </label>
              <input
                type="number"
                value={settings.system.leadAcceptTimeout}
                onChange={(e) => updateNestedSetting('system.leadAcceptTimeout', parseInt(e.target.value))}
                min="1"
                max="168"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--theme-muted)' }}>
                {isGerman 
                  ? 'Wenn Lead nicht vor dieser Zeit angenommen wird, wird es vom Partner entfernt'
                  : 'If lead is not accepted before this time, it will be removed from the partner'
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

  const renderNotificationsTab = () => (
    <motion.div
      key="notifications"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <motion.div
        className="p-6 rounded-xl border space-y-4"
        style={{ 
          backgroundColor: 'var(--theme-card-bg)', 
          borderColor: 'var(--theme-border)' 
        }}
      >
        <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
          📧 {isGerman ? 'E-Mail-Benachrichtigungen' : 'Email Notifications'}
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.email.leadNotificationEnabled}
              onChange={(e) => updateNestedSetting('email.leadNotificationEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Lead-Benachrichtigungen aktiviert' : 'Lead notifications enabled'}
            </span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.email.partnerNotificationEnabled}
              onChange={(e) => updateNestedSetting('email.partnerNotificationEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Partner-Benachrichtigungen aktiviert' : 'Partner notifications enabled'}
            </span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.email.adminNotificationEnabled}
              onChange={(e) => updateNestedSetting('email.adminNotificationEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Admin-Benachrichtigungen aktiviert' : 'Admin notifications enabled'}
            </span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.email.incomeInvoiceNotificationEnabled}
              onChange={(e) => updateNestedSetting('email.incomeInvoiceNotificationEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Einkommen und Rechnungsbenachrichtigungen aktiviert' : 'Income and Invoices notifications enabled'}
            </span>
          </label>
        </div>
      </motion.div>
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
      case 'notifications':
        return renderNotificationsTab();
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