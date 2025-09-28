import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useService } from '../../contexts/ServiceContext';
import { dashboardAPI } from '../../lib/api/api';

const RevenueChart = ({ className = "" }) => {
  const { isGerman } = useLanguage();
  const { currentService } = useService();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchRevenueData();
  }, [currentService]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getSuperadminData(currentService);

      if (response.data && response.data.success && response.data.data.charts.leadsPerDay) {
        setChartData(transformRevenueData(response.data.data.charts.leadsPerDay));
      } else {
        setChartData(getDefaultRevenueData());
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setChartData(getDefaultRevenueData());
    } finally {
      setLoading(false);
    }
  };

  const transformRevenueData = (leadsPerDay) => {
    if (!leadsPerDay || leadsPerDay.length === 0) {
      return getDefaultRevenueData();
    }

    return {
      labels: leadsPerDay.map(day => new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      moving: leadsPerDay.map(day => day.movingRevenue || 0),
      cleaning: leadsPerDay.map(day => day.cleaningRevenue || 0),
      total: leadsPerDay.map(day => day.totalRevenue || 0)
    };
  };

  const getDefaultRevenueData = () => {
    return {
      labels: ['No Data'],
      moving: [0],
      cleaning: [0],
      total: [0]
    };
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-2xl border ${className}`} style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'var(--theme-border)'
      }}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className={`p-6 rounded-2xl border ${className}`} style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'var(--theme-border)'
      }}>
        <div className="text-center py-8">
          <div className="text-red-500 text-lg font-semibold mb-2">
            {isGerman ? 'Fehler beim Laden der Umsatzdaten' : 'Error Loading Revenue Data'}
          </div>
          <button
            onClick={fetchRevenueData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isGerman ? 'Erneut versuchen' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.moving, ...chartData.cleaning);
  const getBarHeight = (value) => (value / maxValue) * 100;

  return (
    <motion.div
      className={`p-6 rounded-2xl border backdrop-blur-xl ${className}`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'var(--theme-border)'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center" style={{ color: 'var(--theme-text)' }}>
          <motion.span
            className="mr-2 text-2xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            💰
          </motion.span>
          {isGerman ? 'Umsatzentwicklung (Alle Daten)' : 'Revenue Trends (All Data)'}
        </h3>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 h-full flex flex-col justify-between text-xs text-gray-400 w-12">
          <span>€{Math.round(maxValue)}</span>
          <span>€{Math.round(maxValue * 0.75)}</span>
          <span>€{Math.round(maxValue * 0.5)}</span>
          <span>€{Math.round(maxValue * 0.25)}</span>
          <span>€0</span>
        </div>

        {/* Chart bars */}
        <div className="ml-16 h-full flex items-end space-x-1 overflow-x-auto">
          {chartData.labels.map((label, index) => (
            <motion.div
              key={index}
              className="flex-1 min-w-[40px] flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Bars container */}
              <div className="w-full h-full flex items-end space-x-1">
                {/* Moving service bar */}
                <motion.div
                  className="flex-1 rounded-t-lg relative group cursor-pointer"
                  style={{
                    height: `${getBarHeight(chartData.moving[index])}%`,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${getBarHeight(chartData.moving[index])}%` }}
                  transition={{ delay: index * 0.05, duration: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {isGerman ? 'Umzug' : 'Moving'}: €{chartData.moving[index]}
                  </div>
                </motion.div>

                {/* Cleaning service bar */}
                <motion.div
                  className="flex-1 rounded-t-lg relative group cursor-pointer"
                  style={{
                    height: `${getBarHeight(chartData.cleaning[index])}%`,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${getBarHeight(chartData.cleaning[index])}%` }}
                  transition={{ delay: index * 0.05 + 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {isGerman ? 'Reinigung' : 'Cleaning'}: €{chartData.cleaning[index]}
                  </div>
                </motion.div>
              </div>

              {/* X-axis label */}
              <div className="mt-2 text-xs text-gray-400 text-center">
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}></div>
          <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Umzugsservice' : 'Moving Service'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          }}></div>
          <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Reinigungsservice' : 'Cleaning Service'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default RevenueChart;