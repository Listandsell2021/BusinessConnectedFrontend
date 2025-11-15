import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useService } from '../../contexts/ServiceContext';
import { dashboardAPI } from '../../lib/api/api';
import Button from '../ui/Button';

const DashboardStats = ({ className = "", onNavigate }) => {
  const { isGerman } = useLanguage();
  const { currentService } = useService();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, [currentService]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats(currentService);

      console.log('🎯 Dashboard API Response:', response.data);
      console.log('🎯 Stats Data:', response.data?.data);
      console.log('🎯 Total Leads:', response.data?.data?.totalLeads);
      console.log('🎯 Accepted Leads:', response.data?.data?.acceptedLeads);
      console.log('🎯 Cancelled Leads:', response.data?.data?.cancelledLeads);

      if (response.data && response.data.success) {
        setStats(response.data.data);
      } else {
        setStats(getDefaultStats());
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Use default 0 values when API is not available
      setStats(getDefaultStats());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultStats = () => {
    return {
      totalLeads: 0,
      pendingLeads: 0,
      acceptedLeads: 0,
      cancelledLeads: 0,
      activePartners: 0,
      totalRevenue: 0,
      exclusivePartners: 0,
      basicPartners: 0,
      monthlyGrowth: {
        leads: 0,
        revenue: 0,
        partners: 0,
        accepted: 0,
        pending: 0,
        cancelled: 0,
        exclusive: 0,
        basic: 0
      },
      trends: {
        leads: 'neutral',
        revenue: 'neutral',
        partners: 'neutral',
        accepted: 'neutral',
        pending: 'neutral',
        cancelled: 'neutral',
        exclusive: 'neutral',
        basic: 'neutral'
      }
    };
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/4 animate-pulse"></div>
          <div className="flex flex-wrap gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 min-w-[240px] max-w-[280px] h-32 rounded-xl animate-pulse bg-gray-200"></div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/4 animate-pulse"></div>
          <div className="flex flex-wrap gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 min-w-[240px] max-w-[280px] h-32 rounded-xl animate-pulse bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-500 text-lg font-semibold mb-2">
            {isGerman ? 'Fehler beim Laden der Daten' : 'Error Loading Data'}
          </div>
          <div className="text-gray-600">
            {isGerman ? 'Dashboard-Statistiken konnten nicht geladen werden' : 'Unable to load dashboard statistics'}
          </div>
          <Button
            onClick={fetchDashboardStats}
            variant="info"
            size="md"
            className="mt-4"
          >
            {isGerman ? 'Erneut versuchen' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  // Lead-related cards (first row) - using real API data
  const leadCards = [
    {
      id: 'leads',
      title: isGerman ? 'Gesamte Leads' : 'Total Leads',
      value: stats.totalLeads?.toLocaleString() || '0',
      change: stats.monthlyGrowth?.leads ? `+${stats.monthlyGrowth.leads}%` : '+0%',
      trend: stats.trends?.leads || 'neutral',
      icon: '🎯',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: isGerman ? 'Diesen Monat' : 'This Month',
      navigateTo: { tab: 'leads' }
    },
    {
      id: 'pending',
      title: isGerman ? 'Wartende Leads' : 'Pending Leads',
      value: stats.pendingLeads?.toString() || '0',
      change: stats.monthlyGrowth?.pending || '0%',
      trend: stats.trends?.pending || 'neutral',
      icon: '⏳',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      description: isGerman ? 'In Bearbeitung' : 'Processing',
      navigateTo: { tab: 'leads', filter: 'pending' }
    },
    {
      id: 'accepted',
      title: isGerman ? 'Angenommene Leads' : 'Accepted Leads',
      value: stats.acceptedLeads?.toString() || '0',
      change: stats.monthlyGrowth?.accepted ? `+${stats.monthlyGrowth.accepted}%` : '+0%',
      trend: stats.trends?.accepted || 'neutral',
      icon: '✅',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      description: isGerman ? 'Bestätigt' : 'Confirmed',
      navigateTo: { tab: 'partners' }
    },
    {
      id: 'cancelled',
      title: isGerman ? 'Stornierte Leads' : 'Cancelled Leads',
      value: stats.cancelledLeads?.toString() || '0',
      change: stats.monthlyGrowth?.cancelled || '0%',
      trend: stats.trends?.cancelled || 'neutral',
      icon: '❌',
      gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      description: isGerman ? 'Storniert' : 'Cancelled',
      navigateTo: { tab: 'leads', filter: 'cancelled' }
    }
  ];

  // Partner-related cards (second row) - using real API data
  const partnerCards = [
    {
      id: 'partners',
      title: isGerman ? 'Aktive Partner' : 'Active Partners',
      value: stats.activePartners?.toString() || '0',
      change: stats.monthlyGrowth?.partners ? `+${stats.monthlyGrowth.partners}%` : '+0%',
      trend: stats.trends?.partners || 'neutral',
      icon: '🤝',
      gradient: 'linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%)',
      description: isGerman ? 'Registriert' : 'Registered',
      navigateTo: { tab: 'partners', filter: 'active' }
    },
    {
      id: 'revenue',
      title: isGerman ? 'Gesamtumsatz' : 'Total Revenue',
      value: stats.totalRevenue ? `€${stats.totalRevenue.toLocaleString()}` : '€0',
      change: stats.monthlyGrowth?.revenue ? `+${stats.monthlyGrowth.revenue}%` : '+0%',
      trend: stats.trends?.revenue || 'neutral',
      icon: '💎',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      description: isGerman ? 'Diesen Monat' : 'This Month',
      navigateTo: { tab: 'income' }
    },
    {
      id: 'exclusive',
      title: isGerman ? 'Exklusive Partner' : 'Exclusive Partners',
      value: stats.exclusivePartners?.toString() || '0',
      change: stats.monthlyGrowth?.exclusive || '+0%',
      trend: stats.trends?.exclusive || 'neutral',
      icon: '⭐',
      gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
      description: isGerman ? 'Premium' : 'Premium',
      navigateTo: { tab: 'partners', filter: 'exclusive' }
    },
    {
      id: 'basic',
      title: isGerman ? 'Basic Partner' : 'Basic Partners',
      value: stats.basicPartners?.toString() || '0',
      change: stats.monthlyGrowth?.basic || '+0%',
      trend: stats.trends?.basic || 'neutral',
      icon: '🔧',
      gradient: 'linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)',
      description: isGerman ? 'Standard' : 'Standard',
      navigateTo: { tab: 'partners', filter: 'basic' }
    }
  ];

  const StatCard = ({ stat, index }) => (
    <motion.div
      key={stat.id}
      className="relative p-6 rounded-2xl border backdrop-blur-xl overflow-hidden group cursor-pointer"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'var(--theme-border)',
        backgroundImage: stat.gradient
      }}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{
        scale: 1.05,
        y: -10,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        if (stat.navigateTo && onNavigate) {
          onNavigate(stat.navigateTo);
        }
      }}
    >
      {/* Animated Background Pattern */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '15px 15px'
        }}
        animate={{
          backgroundPosition: ['0px 0px', '15px 15px'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            className="text-3xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {stat.icon}
          </motion.div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-white/80">
            {stat.title}
          </h3>
          <motion.p
            className="text-3xl font-bold text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 300 }}
          >
            {stat.value}
          </motion.p>
          <p className="text-xs text-white/70">
            {stat.description}
          </p>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Lead-related cards - First row */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Lead-Statistiken' : 'Lead Statistics'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {leadCards.map((stat, index) => (
            <StatCard key={stat.id} stat={stat} index={index} />
          ))}
        </div>
      </div>

      {/* Partner-related cards - Second row */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
          {isGerman ? 'Partner-Statistiken' : 'Partner Statistics'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {partnerCards.map((stat, index) => (
            <StatCard key={stat.id} stat={stat} index={index + 4} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;