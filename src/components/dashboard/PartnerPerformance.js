import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useLanguage } from '../../contexts/LanguageContext';
import { useService } from '../../contexts/ServiceContext';

const PartnerPerformance = ({ className = "" }) => {
  const router = useRouter();
  const { isGerman } = useLanguage();
  const { currentService } = useService();
  const [partnerData, setPartnerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('revenue');

  useEffect(() => {
    fetchPartnerData();
  }, [currentService]);

  const fetchPartnerData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/partners/performance?service=${currentService}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPartnerData(data);
    } catch (error) {
      console.error('Error fetching partner data:', error);
      setPartnerData([]);
    } finally {
      setLoading(false);
    }
  };

  const getMockPartnerData = () => {
    const allPartners = [
      {
        id: 1,
        companyName: 'Munich Moving Masters',
        serviceType: 'moving',
        totalRevenue: 15420,
        totalLeadsReceived: 42,
        totalLeadsAccepted: 34,
        totalLeadsCancelled: 5,
        rating: 4.9,
        status: 'active',
        partnerType: 'exclusive'
      },
      {
        id: 2,
        companyName: 'Berlin Cleaning Pro',
        serviceType: 'cleaning',
        totalRevenue: 12840,
        totalLeadsReceived: 35,
        totalLeadsAccepted: 28,
        totalLeadsCancelled: 3,
        rating: 4.7,
        status: 'active',
        partnerType: 'basic'
      },
      {
        id: 3,
        companyName: 'Hamburg Transport Solutions',
        serviceType: 'moving',
        totalRevenue: 11200,
        totalLeadsReceived: 31,
        totalLeadsAccepted: 25,
        totalLeadsCancelled: 2,
        rating: 4.8,
        status: 'active',
        partnerType: 'exclusive'
      },
      {
        id: 4,
        companyName: 'Frankfurt Clean & Shine',
        serviceType: 'cleaning',
        totalRevenue: 9650,
        totalLeadsReceived: 29,
        totalLeadsAccepted: 22,
        totalLeadsCancelled: 4,
        rating: 4.5,
        status: 'active',
        partnerType: 'basic'
      },
      {
        id: 5,
        companyName: 'Stuttgart Relocation Experts',
        serviceType: 'moving',
        totalRevenue: 8930,
        totalLeadsReceived: 26,
        totalLeadsAccepted: 19,
        totalLeadsCancelled: 3,
        rating: 4.6,
        status: 'active',
        partnerType: 'basic'
      },
      {
        id: 6,
        companyName: 'Cologne Cleaning Crew',
        serviceType: 'cleaning',
        totalRevenue: 8100,
        totalLeadsReceived: 24,
        totalLeadsAccepted: 18,
        totalLeadsCancelled: 2,
        rating: 4.4,
        status: 'active',
        partnerType: 'basic'
      }
    ];

    // Filter by current service
    return allPartners.filter(partner => partner.serviceType === currentService);
  };

  if (loading || !partnerData) {
    return (
      <div className={`p-6 rounded-2xl border ${className}`} style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'var(--theme-border)'
      }}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const sortOptions = [
    { id: 'revenue', label: isGerman ? 'Umsatz' : 'Revenue' },
    { id: 'acceptanceRate', label: isGerman ? 'Akzeptanzrate' : 'Acceptance Rate' },
    { id: 'rating', label: isGerman ? 'Bewertung' : 'Rating' },
    { id: 'leadsReceived', label: isGerman ? 'Erhaltene Leads' : 'Leads Received' }
  ];

  const sortedPartners = [...partnerData].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return b.totalRevenue - a.totalRevenue;
      case 'acceptanceRate':
        const aRate = (a.totalLeadsAccepted / a.totalLeadsReceived) * 100;
        const bRate = (b.totalLeadsAccepted / b.totalLeadsReceived) * 100;
        return bRate - aRate;
      case 'rating':
        return b.rating - a.rating;
      case 'leadsReceived':
        return b.totalLeadsReceived - a.totalLeadsReceived;
      default:
        return 0;
    }
  });

  const getServiceIcon = (serviceType) => {
    return serviceType === 'moving' ? '🚛' : '🧽';
  };

  const getPartnerTypeColor = (type) => {
    return type === 'exclusive' ? '#f59e0b' : '#6b7280';
  };

  return (
    <motion.div
      className={`p-6 rounded-2xl border backdrop-blur-xl ${className}`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'var(--theme-border)'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center" style={{ color: 'var(--theme-text)' }}>
          <motion.span
            className="mr-2 text-2xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            🏆
          </motion.span>
          {isGerman ? 'Partner-Performance' : 'Partner Performance'}
        </h3>

        {/* Sort Selector */}
        <div className="flex space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {isGerman ? 'Sortieren nach' : 'Sort by'} {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Partners List */}
      <div className="space-y-4">
        {sortedPartners.slice(0, 5).map((partner, index) => {
          return (
            <motion.div
              key={partner.id}
              className="p-4 rounded-xl border group cursor-pointer hover:shadow-lg transition-all duration-300"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-border-light)'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2, scale: 1.01 }}
            >
              <div className="flex items-center justify-between">
                {/* Partner Info */}
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className="text-2xl"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                    >
                      {getServiceIcon(partner.serviceType)}
                    </motion.div>
                    <div className="text-xs px-2 py-1 rounded-full text-white font-bold"
                         style={{ backgroundColor: getPartnerTypeColor(partner.partnerType) }}>
                      {partner.partnerType === 'exclusive' ? 'EXC' : 'BAS'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-lg" style={{ color: 'var(--theme-text)' }}>
                        {partner.companyName}
                      </h4>
                      <span className="text-sm px-2 py-1 rounded-full bg-green-100 text-green-700">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                        {partner.serviceType === 'moving' ?
                          (isGerman ? 'Umzugsservice' : 'Moving Service') :
                          (isGerman ? 'Reinigungsservice' : 'Cleaning Service')
                        }
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>⭐</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                          {partner.rating}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="flex items-center space-x-6">
                  {/* Revenue */}
                  <div className="text-center">
                    <div className="text-lg font-bold" style={{ color: 'var(--theme-text)' }}>
                      €{partner.totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? 'Umsatz' : 'Revenue'}
                    </div>
                  </div>

                  {/* Acceptance Rate */}
                  <div className="text-center">
                    <div className="text-lg font-bold" style={{ color: 'var(--theme-text)' }}>
                      {Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100)}%
                    </div>
                    <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                      {isGerman ? 'Akzeptanz' : 'Acceptance'}
                    </div>
                  </div>


                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--theme-muted)' }}>
                  <span>{isGerman ? 'Leads angenommen' : 'Leads accepted'}: {partner.totalLeadsAccepted}/{partner.totalLeadsReceived}</span>
                  <span>{Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{
                      background: Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100) >= 80 ?
                        'linear-gradient(90deg, #10b981, #059669)' :
                        Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100) >= 60 ?
                        'linear-gradient(90deg, #f59e0b, #d97706)' :
                        'linear-gradient(90deg, #ef4444, #dc2626)'
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100)}%` }}
                    transition={{ delay: index * 0.1, duration: 1 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* View All Button */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <button
          onClick={() => router.push('/dashboard?tab=partners')}
          className="px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:shadow-lg"
          style={{ backgroundColor: 'var(--theme-button-bg)', color: 'var(--theme-button-text)' }}
        >
          {isGerman ? 'Alle Partner anzeigen' : 'View All Partners'}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default PartnerPerformance;