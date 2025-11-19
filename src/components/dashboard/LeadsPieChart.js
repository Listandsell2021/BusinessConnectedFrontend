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

    // Include ALL status types, even if count is 0 - only filter for pie display
    const allByStatus = [
      { status: 'pending', count: stats.pendingLeads || 0, color: '#f59e0b' },
      { status: 'assigned', count: (stats.assignedLeads || 0) + (stats.partialAssignedLeads || 0), color: '#8b5cf6' }
    ];

    // For pie chart display, only show statuses with leads > 0
    const byStatusForDisplay = allByStatus.filter(item => item.count > 0);
    const totalStatusCount = allByStatus.reduce((sum, item) => sum + item.count, 0);

    // Only moving service is supported now
    const byService = [
      { service: 'moving', count: stats.movingLeads || 0, color: '#667eea' }
    ];

    // For display in pie, only show services with leads > 0
    const byServiceForDisplay = byService.filter(item => item.count > 0);

    return {
      byStatus: allByStatus, // All status types for legend
      byStatusForDisplay, // Only non-zero for pie chart
      byService, // All services for legend
      byServiceForDisplay, // Only non-zero for pie chart
      total: totalStatusCount,
      totalService: stats.totalLeads || 0
    };
  };

  const getDefaultLeadData = () => ({
    byStatus: [
      { status: 'pending', count: 0, color: '#f59e0b' },
      { status: 'assigned', count: 0, color: '#8b5cf6' }
    ],
    byStatusForDisplay: [],
    byService: [
      { service: 'moving', count: 0, color: '#667eea' }
    ],
    byServiceForDisplay: [],
    total: 0,
    totalService: 0
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

  const PieSlice = ({ data, startAngle, size, radius, centerX, centerY, index, total }) => {
    const angle = (data.count / total) * 360;
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
            className="text-sm font-bold fill-white"
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

      {/* Two-column layout: Legend on left, Pie chart on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: Status Details & Legend */}
        <div className="space-y-4">
          <h4 className="text-xl font-semibold mb-6" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Status Übersicht' : 'Status Overview'}
          </h4>

          {/* Total Leads Card */}
          <motion.div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderLeft: '4px solid #667eea'
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Gesamt Leads' : 'Total Leads'}
            </div>
            <div className="text-3xl font-bold mt-1" style={{ color: 'var(--theme-text)' }}>
              {leadData.total}
            </div>
          </motion.div>

          {/* Status Breakdown */}
          <div className="space-y-3">
            {leadData.byStatus.map((data, index) => (
              <motion.div
                key={data.status}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ backgroundColor: 'var(--theme-card-bg)' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded-lg"
                    style={{ backgroundColor: data.color }}
                  ></div>
                  <span className="text-base font-medium" style={{ color: 'var(--theme-text)' }}>
                    {data.status === 'pending' ? (isGerman ? 'Wartend' : 'Pending') :
                     data.status === 'assigned' ? (isGerman ? 'Zugewiesen' : 'Assigned') :
                     (isGerman ? 'Andere' : 'Other')}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>
                    {data.count}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                    {leadData.total > 0 ? Math.round((data.count / leadData.total) * 100) : 0}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Pie Chart */}
        <div className="flex items-center justify-center">
          {leadData.total > 0 ? (
            <svg width="280" height="280" className="mx-auto">
              {leadData.byStatusForDisplay.length === 1 ? (
                // Special case: single status gets full circle
                <motion.circle
                  cx={140}
                  cy={140}
                  r={110}
                  fill={leadData.byStatusForDisplay[0].color}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                />
              ) : (
                // Multiple statuses: render pie slices
                leadData.byStatusForDisplay.reduce((acc, data, index) => {
                  const slice = (
                    <PieSlice
                      key={data.status}
                      data={data}
                      startAngle={acc.currentAngle}
                      radius={110}
                      centerX={140}
                      centerY={140}
                      index={index}
                      total={leadData.total}
                    />
                  );
                  acc.slices.push(slice);
                  acc.currentAngle += (data.count / leadData.total) * 360;
                  return acc;
                }, { slices: [], currentAngle: 0 }).slices
              )}

              {/* Center label showing total */}
              <motion.text
                x={140}
                y={130}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-4xl font-bold fill-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {leadData.total}
              </motion.text>
              <motion.text
                x={140}
                y={160}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm fill-gray-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {isGerman ? 'Leads' : 'Leads'}
              </motion.text>
            </svg>
          ) : (
            // No data: show empty state
            <div className="w-[280px] h-[280px] flex items-center justify-center bg-gray-200 rounded-full">
              <div className="text-center">
                <div className="text-6xl mb-3">📊</div>
                <div className="text-base text-gray-600 font-medium">
                  {isGerman ? 'Keine Daten' : 'No Data'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LeadsPieChart;