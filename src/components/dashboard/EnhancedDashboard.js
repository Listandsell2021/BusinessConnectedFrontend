import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI } from '../../lib/api/api';
import DashboardStats from './DashboardStats';
import RevenueChart from './RevenueChart';
import LeadsPieChart from './LeadsPieChart';
import PartnerPerformance from './PartnerPerformance';

const EnhancedDashboard = ({ onNavigate }) => {
  const { isGerman } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      refreshDashboard();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getOverview();

      if (response.data && response.data.success) {
        setDashboardData({ ...response.data.data, lastUpdated: new Date() });
      } else {
        setDashboardData({ lastUpdated: new Date() });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData({ lastUpdated: new Date() });
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = async () => {
    try {
      setRefreshing(true);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };


  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center space-y-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="relative"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <motion.div
              className="absolute inset-2 w-8 h-8 border-2 border-purple-500 border-b-transparent rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Dashboard wird geladen...' : 'Loading Dashboard...'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Bereite Ihre Daten vor...' : 'Preparing your data...'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header with Welcome and Refresh */}
      <motion.div
        className="text-center py-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <motion.h1
            className="text-4xl font-bold"
            style={{ color: 'var(--theme-text)' }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {isGerman ? `Willkommen zurück, ${user?.name || 'Admin'}!` : `Welcome back, ${user?.name || 'Admin'}!`}
          </motion.h1>

          {/* Refresh Button */}
          <motion.button
            onClick={refreshDashboard}
            disabled={refreshing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              refreshing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
            }`}
            style={{ backgroundColor: 'var(--theme-button-bg)', color: 'var(--theme-button-text)' }}
            whileHover={!refreshing ? { scale: 1.05 } : {}}
            whileTap={!refreshing ? { scale: 0.95 } : {}}
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : {}}
              transition={refreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
            >
              🔄
            </motion.span>
            <span>{isGerman ? 'Aktualisieren' : 'Refresh'}</span>
          </motion.button>
        </div>

        <p className="text-lg" style={{ color: 'var(--theme-muted)' }}>
          {isGerman
            ? 'Hier ist Ihre umfassende Business-Übersicht mit Echtzeit-Analysen.'
            : 'Here\'s your comprehensive business overview with real-time analytics.'}
        </p>

        {/* Last Updated */}
        {dashboardData?.lastUpdated && (
          <p className="text-sm mt-2" style={{ color: 'var(--theme-muted)' }}>
            {isGerman ? 'Zuletzt aktualisiert: ' : 'Last updated: '}
            {new Date(dashboardData.lastUpdated).toLocaleString()}
          </p>
        )}
      </motion.div>

      {/* KPI Stats */}
      <DashboardStats className="mb-8" onNavigate={onNavigate} />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Revenue Chart - Full width */}
        <div className="xl:col-span-2">
          <RevenueChart />
        </div>

        {/* Lead Distribution */}
        <div className="xl:col-span-1">
          <LeadsPieChart />
        </div>

        {/* Partner Performance */}
        <div className="xl:col-span-1">
          <PartnerPerformance />
        </div>
      </div>


      {/* Footer Info */}
      <motion.div
        className="text-center py-8 border-t"
        style={{ borderColor: 'var(--theme-border)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
          {isGerman
            ? 'Dashboard wird automatisch alle 5 Minuten aktualisiert. Letzte Aktualisierung: '
            : 'Dashboard automatically refreshes every 5 minutes. Last update: '}
          {dashboardData?.lastUpdated ? new Date(dashboardData.lastUpdated).toLocaleTimeString() : 'Just now'}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedDashboard;