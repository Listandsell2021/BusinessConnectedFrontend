import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useLanguage } from '../../contexts/LanguageContext';
import { useService } from '../../contexts/ServiceContext';
import { dashboardAPI, partnersAPI } from '../../lib/api/api';

const PartnerPerformance = ({ className = "" }) => {
  const router = useRouter();
  const { isGerman } = useLanguage();
  const { currentService } = useService();
  const [partnerData, setPartnerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('registered');

  const fetchPartnerData = async () => {
    try {
      setLoading(true);
      // Use partners API to get real partner data
      const filters = { status: 'active', limit: 10 };
      if (currentService && currentService !== 'all') {
        filters.serviceType = currentService;
      }

      const response = await partnersAPI.getAll(filters);

      if (response.data && response.data.success && response.data.partners && response.data.partners.length > 0) {
        setPartnerData(response.data.partners.map(partner => ({
          ...partner,
          id: partner._id || partner.id,
          totalRevenue: partner.metrics?.totalRevenue || 0,
          totalLeadsReceived: partner.metrics?.totalLeadsReceived || 0,
          totalLeadsAccepted: partner.metrics?.totalLeadsAccepted || 0,
          totalLeadsCancelled: partner.metrics?.totalLeadsCancelled || 0,
          rating: partner.metrics?.rating || 4.5,
          registeredAt: partner.registeredAt || partner.createdAt
        })));
      } else {
        // If no partners from API, show empty array
        setPartnerData([]);
      }
    } catch (error) {
      console.error('Error fetching partner data:', error);
      // Show empty array on error
      setPartnerData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerData();
  }, [currentService]);

  if (loading) {
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
  }

  const sortOptions = [
    { id: 'registered', label: isGerman ? 'Registriert' : 'Registered' },
    { id: 'revenue', label: isGerman ? 'Umsatz' : 'Revenue' },
    { id: 'acceptanceRate', label: isGerman ? 'Akzeptanzrate' : 'Acceptance Rate' }
  ];

  const sortedPartners = partnerData ? [...partnerData].sort((a, b) => {
    switch (sortBy) {
      case 'registered':
        // Sort by registration date (newest first)
        const aDate = new Date(a.registeredAt || a.createdAt || 0);
        const bDate = new Date(b.registeredAt || b.createdAt || 0);
        return bDate - aDate;
      case 'revenue':
        return (b.totalRevenue || 0) - (a.totalRevenue || 0);
      case 'acceptanceRate':
        const aReceived = a.totalLeadsReceived || 1;
        const bReceived = b.totalLeadsReceived || 1;
        const aRate = ((a.totalLeadsAccepted || 0) / aReceived) * 100;
        const bRate = ((b.totalLeadsAccepted || 0) / bReceived) * 100;
        return bRate - aRate;
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'leadsReceived':
        return (b.totalLeadsReceived || 0) - (a.totalLeadsReceived || 0);
      default:
        return 0;
    }
  }) : [];

  const getServiceIcon = (serviceType) => {
    return serviceType === 'security' ? '🚛' : '🧽';
  };

  const getPartnerTypeColor = (type) => {
    return {
      bg: type === 'exclusive' ? '#F3E8FF' : '#D8EAFE',
      text: type === 'exclusive' ? '#6B21A8' : '#1E40AF'
    };
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
      <div className="flex items-center justify-between mb-6 gap-8">
        <h3 className="text-xl font-bold flex items-center" style={{ color: 'var(--theme-text)' }}>
          <motion.span
            className="mr-2 text-2xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            🏆
          </motion.span>
          {isGerman ? 'Partnerleistung' : 'Partner Performance'}
        </h3>

        {/* Sort Selector */}
        <div className="flex-shrink-0">
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
        {sortedPartners && sortedPartners.length > 0 ? sortedPartners.slice(0, 3).map((partner, index) => {
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
              onClick={() => router.push(`/dashboard?tab=partners&partnerId=${partner.id}`)}
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
                    <div className="text-xs px-4 py-1 rounded-full font-medium"
                         style={{
                           backgroundColor: getPartnerTypeColor(partner.partnerType).bg,
                           color: getPartnerTypeColor(partner.partnerType).text
                         }}>
                      {partner.partnerType === 'exclusive' ?
                        (isGerman ? 'Exklusiv' : 'Exclusive') :
                        (isGerman ? 'Standard' : 'Basic')
                      }
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-lg" style={{ color: 'var(--theme-text)' }}>
                        {typeof partner.companyName === 'object' ? partner.companyName?.companyName || partner.companyName?._id || 'N/A' : partner.companyName || 'N/A'}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                        {partner.contactPerson?.email || partner.email || 'N/A'}
                      </span>
                      {sortBy !== 'registered' && (
                        <span className="text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          #{index + 1}
                        </span>
                      )}
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
                      {partner.totalLeadsReceived > 0 ? Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100) : 0}%
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
                  <span>{partner.totalLeadsReceived > 0 ? Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{
                      background: partner.totalLeadsReceived > 0 && Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100) >= 80 ?
                        'linear-gradient(90deg, #10b981, #059669)' :
                        partner.totalLeadsReceived > 0 && Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100) >= 60 ?
                        'linear-gradient(90deg, #f59e0b, #d97706)' :
                        'linear-gradient(90deg, #ef4444, #dc2626)'
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${partner.totalLeadsReceived > 0 ? Math.round((partner.totalLeadsAccepted / partner.totalLeadsReceived) * 100) : 0}%` }}
                    transition={{ delay: index * 0.1, duration: 1 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        }) : (
          /* No Partners Available */
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🏢</div>
            <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Keine Partner verfügbar' : 'No Partners Available'}
            </h4>
            <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Derzeit sind keine Partner für diesen Service registriert.' : 'No partners are currently registered for this service.'}
            </p>
          </div>
        )}
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