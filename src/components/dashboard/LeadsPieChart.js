import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useService } from '../../contexts/ServiceContext';
import { dashboardAPI } from '../../lib/api/api';

const LeadsPieChart = ({ className = "" }) => {
  const { isGerman } = useLanguage();
  const { currentService } = useService();
  const [leadData, setLeadData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadData();
  }, [currentService]);

  const fetchLeadData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats(currentService);

      if (response.data && response.data.success) {
        setLeadData(transformLeadData(response.data.data));
      } else {
        setLeadData(getDefaultLeadData());
      }
    } catch (error) {
      console.error('Error fetching lead data:', error);
      setLeadData(getDefaultLeadData());
    } finally {
      setLoading(false);
    }
  };

  const transformLeadData = (stats) => {
    if (!stats) return getDefaultLeadData();

    const byStatus = [
      { status: 'pending', count: stats.pendingLeads || 0, color: '#3b82f6' },
      { status: 'accepted', count: stats.acceptedLeads || 0, color: '#10b981' },
      { status: 'cancelled', count: stats.cancelledLeads || 0, color: '#ef4444' }
    ];

    const byService = currentService === 'all' ? [
      { service: 'moving', count: Math.floor((stats.totalLeads || 0) * 0.6), color: '#667eea' },
      { service: 'cleaning', count: Math.floor((stats.totalLeads || 0) * 0.4), color: '#f093fb' }
    ] : [
      { service: currentService, count: stats.totalLeads || 0, color: currentService === 'moving' ? '#667eea' : '#f093fb' }
    ];

    return {
      byStatus,
      byService,
      total: stats.totalLeads || 0
    };
  };

  const getDefaultLeadData = () => ({
    byStatus: [
      { status: 'pending', count: 0, color: '#3b82f6' },
      { status: 'assigned', count: 0, color: '#8b5cf6' },
      { status: 'accepted', count: 0, color: '#10b981' },
      { status: 'cancelled', count: 0, color: '#f59e0b' },
      { status: 'rejected', count: 0, color: '#ef4444' }
    ],
    byService: [
      { service: 'moving', count: 0, color: '#667eea' },
      { service: 'cleaning', count: 0, color: '#f093fb' }
    ],
    total: 0
  });

  if (loading || !leadData) {
    return (
      <div className={`p-6 rounded-2xl border ${className}`} style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'var(--theme-border)'
      }}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const PieSlice = ({ data, startAngle, size, radius, centerX, centerY, index }) => {
    const angle = (data.count / leadData.total) * 360;
    const endAngle = startAngle + angle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const largeArcFlag = angle > 180 ? 1 : 0;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    // Calculate label position
    const midAngle = (startAngle + endAngle) / 2;
    const midAngleRad = (midAngle * Math.PI) / 180;
    const labelRadius = radius * 0.7;
    const labelX = centerX + labelRadius * Math.cos(midAngleRad);
    const labelY = centerY + labelRadius * Math.sin(midAngleRad);

    return (
      <g>
        <motion.path
          d={pathData}
          fill={data.color}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: index * 0.1, duration: 0.8 }}
        />
        {angle > 10 && (
          <motion.text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-bold fill-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.5 }}
          >
            {data.count}
          </motion.text>
        )}
      </g>
    );
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
      transition={{ delay: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center" style={{ color: 'var(--theme-text)' }}>
          <motion.span
            className="mr-2 text-2xl"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            📊
          </motion.span>
          {isGerman ? 'Lead-Verteilung' : 'Lead Distribution'}
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div>
          <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Nach Status' : 'By Status'}
          </h4>

          <div className="relative">
            <svg width="200" height="200" className="mx-auto">
              {leadData.byStatus.reduce((acc, data, index) => {
                const slice = (
                  <PieSlice
                    key={data.status}
                    data={data}
                    startAngle={acc.currentAngle}
                    radius={80}
                    centerX={100}
                    centerY={100}
                    index={index}
                  />
                );
                acc.slices.push(slice);
                acc.currentAngle += (data.count / leadData.total) * 360;
                return acc;
              }, { slices: [], currentAngle: 0 }).slices}
            </svg>
          </div>

          {/* Status Legend */}
          <div className="space-y-2 mt-4">
            {leadData.byStatus.map((data, index) => (
              <motion.div
                key={data.status}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: 'var(--theme-card-bg)' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: data.color }}
                  ></div>
                  <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                    {data.status === 'pending' ? (isGerman ? 'Wartend' : 'Pending') :
                     data.status === 'assigned' ? (isGerman ? 'Zugewiesen' : 'Assigned') :
                     data.status === 'accepted' ? (isGerman ? 'Angenommen' : 'Accepted') :
                     data.status === 'cancelled' ? (isGerman ? 'Storniert' : 'Cancelled') :
                     (isGerman ? 'Abgelehnt' : 'Rejected')}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>
                    {data.count}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                    {Math.round((data.count / leadData.total) * 100)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Service Distribution */}
        <div>
          <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Nach Service' : 'By Service'}
          </h4>

          <div className="relative">
            <svg width="200" height="200" className="mx-auto">
              {leadData.byService.reduce((acc, data, index) => {
                const slice = (
                  <PieSlice
                    key={data.service}
                    data={data}
                    startAngle={acc.currentAngle}
                    radius={80}
                    centerX={100}
                    centerY={100}
                    index={index}
                  />
                );
                acc.slices.push(slice);
                acc.currentAngle += (data.count / leadData.byService.reduce((sum, item) => sum + item.count, 0)) * 360;
                return acc;
              }, { slices: [], currentAngle: 0 }).slices}
            </svg>
          </div>

          {/* Service Legend */}
          <div className="space-y-2 mt-4">
            {leadData.byService.map((data, index) => (
              <motion.div
                key={data.service}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: 'var(--theme-card-bg)' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: data.color }}
                  ></div>
                  <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                    {data.service === 'moving' ? (isGerman ? 'Umzugsservice' : 'Moving Service') :
                     (isGerman ? 'Reinigungsservice' : 'Cleaning Service')}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>
                    {data.count}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                    {Math.round((data.count / leadData.byService.reduce((sum, item) => sum + item.count, 0)) * 100)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LeadsPieChart;