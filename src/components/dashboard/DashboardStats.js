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

  useEffect(() => {
    fetchDashboardStats();
  }, [currentService]);

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
          <div className="h-6 rounded w-1/4 animate-pulse" style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-auto min-h-[180px] rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}></div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-6 rounded w-1/4 animate-pulse" style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-auto min-h-[180px] rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}></div>
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
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: isGerman ? 'Diesen Monat' : 'This Month',
      navigateTo: { tab: 'leads' }
    }
    // Pending Leads - Hidden
    // {
    //   id: 'pending',
    //   title: isGerman ? 'Wartende Leads' : 'Pending Leads',
    //   value: stats.pendingLeads?.toString() || '0',
    //   change: stats.monthlyGrowth?.pending || '0%',
    //   trend: stats.trends?.pending || 'neutral',
    //   icon: (
    //     <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
    //       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    //     </svg>
    //   ),
    //   gradient: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
    //   description: isGerman ? 'In Bearbeitung' : 'Processing',
    //   navigateTo: { tab: 'leads', filter: 'pending' }
    // },
    // Accepted Leads - Hidden
    // {
    //   id: 'accepted',
    //   title: isGerman ? 'Angenommene Leads' : 'Accepted Leads',
    //   value: stats.acceptedLeads?.toString() || '0',
    //   change: stats.monthlyGrowth?.accepted ? `+${stats.monthlyGrowth.accepted}%` : '+0%',
    //   trend: stats.trends?.accepted || 'neutral',
    //   icon: (
    //     <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
    //       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    //     </svg>
    //   ),
    //   gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    //   description: isGerman ? 'Bestätigt' : 'Confirmed',
    //   navigateTo: { tab: 'partners' }
    // },
    // Cancelled Leads - Hidden
    // {
    //   id: 'cancelled',
    //   title: isGerman ? 'Stornierte Leads' : 'Cancelled Leads',
    //   value: stats.cancelledLeads?.toString() || '0',
    //   change: stats.monthlyGrowth?.cancelled || '0%',
    //   trend: stats.trends?.cancelled || 'neutral',
    //   icon: (
    //     <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
    //       <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
    //     </svg>
    //   ),
    //   gradient: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
    //   description: isGerman ? 'Storniert' : 'Cancelled',
    //   navigateTo: { tab: 'leads', filter: 'cancelled' }
    // }
  ];

  // Partner-related cards (second row) - using real API data
  const partnerCards = [
    {
      id: 'partners',
      title: isGerman ? 'Aktive Partner' : 'Active Partners',
      value: stats.activePartners?.toString() || '0',
      change: stats.monthlyGrowth?.partners ? `+${stats.monthlyGrowth.partners}%` : '+0%',
      trend: stats.trends?.partners || 'neutral',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)',
      description: isGerman ? 'Registriert' : 'Registered',
      navigateTo: { tab: 'partners', filter: 'active' }
    },
    {
      id: 'revenue',
      title: isGerman ? 'Gesamtumsatz' : 'Total Revenue',
      value: stats.totalRevenue ? `€${stats.totalRevenue.toLocaleString()}` : '€0',
      change: stats.monthlyGrowth?.revenue ? `+${stats.monthlyGrowth.revenue}%` : '+0%',
      trend: stats.trends?.revenue || 'neutral',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)',
      description: isGerman ? 'Diesen Monat' : 'This Month',
      navigateTo: { tab: 'income' }
    },
    {
      id: 'exclusive',
      title: isGerman ? 'Exklusive Partner' : 'Exclusive Partners',
      value: stats.exclusivePartners?.toString() || '0',
      change: stats.monthlyGrowth?.exclusive || '+0%',
      trend: stats.trends?.exclusive || 'neutral',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
      description: isGerman ? 'Premium' : 'Premium',
      navigateTo: { tab: 'partners', filter: 'exclusive' }
    },
    {
      id: 'basic',
      title: isGerman ? 'Basis-Partner' : 'Basic Partners',
      value: stats.basicPartners?.toString() || '0',
      change: stats.monthlyGrowth?.basic || '+0%',
      trend: stats.trends?.basic || 'neutral',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
      description: isGerman ? 'Standard' : 'Standard',
      navigateTo: { tab: 'partners', filter: 'basic' }
    }
  ];

  const StatCard = ({ stat, index }) => {
    return (
      <div
        className="relative p-6 rounded-2xl border h-auto min-h-[180px] cursor-pointer"
        style={{
          backgroundImage: stat.gradient,
          borderColor: 'var(--theme-border)',
        }}
        onClick={() => {
          if (stat.navigateTo && onNavigate) {
            onNavigate(stat.navigateTo);
          }
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20 rounded-2xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white">
              {stat.icon}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">
              {stat.title}
            </h3>
            <p className="text-3xl font-bold text-white">
              {stat.value}
            </p>
            <p className="text-xs text-white/90">
              {stat.description}
            </p>
          </div>
        </div>
      </div>
    );
  };

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

      {/* Partner-related cards - Second row - Hidden
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
      */}
    </div>
  );
};

export default DashboardStats;