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
  const [timePeriod, setTimePeriod] = useState('month'); // 'week', 'month', 'year'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    // Initialize to start of current week (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  useEffect(() => {
    fetchRevenueData();
  }, [currentService, timePeriod, selectedMonth, selectedYear, selectedWeekStart]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      let month = null;
      let year = null;
      let weekStart = null;

      if (timePeriod === 'month') {
        month = selectedMonth;
        year = selectedYear;
      } else if (timePeriod === 'year') {
        year = selectedYear;
      } else if (timePeriod === 'week') {
        weekStart = selectedWeekStart.toISOString();
      }

      console.log('Fetching revenue data:', { timePeriod, month, year, weekStart });

      // Always fetch ALL services for revenue chart (show Moving + Cleaning together)
      const response = await dashboardAPI.getSuperadminData('all', timePeriod, month, year, weekStart);

      console.log('Revenue API response:', response.data);

      if (response.data && response.data.success && response.data.data.charts.leadsPerDay) {
        const transformedData = transformRevenueData(response.data.data.charts.leadsPerDay, timePeriod);
        console.log('Transformed chart data:', transformedData);
        setChartData(transformedData);
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

  const transformRevenueData = (leadsPerDay, period) => {
    // Create a map of existing data
    const dataMap = new Map();
    leadsPerDay.forEach(day => {
      dataMap.set(day._id, day);
    });

    let labels = [];
    let movingData = [];
    let cleaningData = [];
    let totalData = [];

    if (period === 'week') {
      // Fill in all 7 days of the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(selectedWeekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        const dayData = dataMap.get(dateStr) || { movingRevenue: 0, cleaningRevenue: 0, totalRevenue: 0 };

        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        movingData.push(dayData.movingRevenue || 0);
        cleaningData.push(dayData.cleaningRevenue || 0);
        totalData.push(dayData.totalRevenue || 0);
      }
    } else if (period === 'year') {
      // Fill in all 12 months
      for (let m = 0; m < 12; m++) {
        const monthStr = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
        const monthData = dataMap.get(monthStr) || { movingRevenue: 0, cleaningRevenue: 0, totalRevenue: 0 };
        const date = new Date(selectedYear, m, 1);

        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
        movingData.push(monthData.movingRevenue || 0);
        cleaningData.push(monthData.cleaningRevenue || 0);
        totalData.push(monthData.totalRevenue || 0);
      }
    } else {
      // Month view - fill in all days of the month
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayData = dataMap.get(dateStr) || { movingRevenue: 0, cleaningRevenue: 0, totalRevenue: 0 };
        const date = new Date(selectedYear, selectedMonth - 1, d);

        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        movingData.push(dayData.movingRevenue || 0);
        cleaningData.push(dayData.cleaningRevenue || 0);
        totalData.push(dayData.totalRevenue || 0);
      }
    }

    return {
      labels,
      moving: movingData,
      cleaning: cleaningData,
      total: totalData
    };
  };

  const getMonthOptions = () => {
    const months = isGerman
      ? ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.map((name, index) => ({ value: index + 1, label: name }));
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y);
    }
    return years;
  };

  const navigatePeriod = (direction) => {
    if (timePeriod === 'week') {
      const newWeekStart = new Date(selectedWeekStart);
      newWeekStart.setDate(newWeekStart.getDate() + (direction * 7));
      setSelectedWeekStart(newWeekStart);
    } else if (timePeriod === 'month') {
      let newMonth = selectedMonth + direction;
      let newYear = selectedYear;

      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }

      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
    } else if (timePeriod === 'year') {
      setSelectedYear(selectedYear + direction);
    }
  };

  const getCurrentPeriodLabel = () => {
    if (timePeriod === 'week') {
      const weekEnd = new Date(selectedWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startStr = selectedWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    } else if (timePeriod === 'month') {
      const monthNames = isGerman
        ? ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    } else if (timePeriod === 'year') {
      return `${selectedYear}`;
    }
    return '';
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

  const maxValue = Math.max(...chartData.moving, ...chartData.cleaning) || 1;
  const getBarHeight = (value) => maxValue > 0 ? (value / maxValue) * 100 : 0;

  // Dynamic bar width based on time period
  const getBarWidth = () => {
    if (timePeriod === 'week') return 'w-8'; // 32px for week (7 bars)
    if (timePeriod === 'year') return 'w-4'; // 16px for year (12 bars)
    return 'w-2'; // 8px for month (30 bars)
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
          {isGerman ? 'Umsatzentwicklung' : 'Revenue Trends'}
        </h3>

        {/* Time Period Controls */}
        <div className="flex items-center space-x-4">
          {/* Period Navigation (for week, month and year views) */}
          {(timePeriod === 'week' || timePeriod === 'month' || timePeriod === 'year') && (
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={() => navigatePeriod(-1)}
                className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>

              <span className="text-sm font-medium min-w-[140px] text-center" style={{ color: 'var(--theme-text)' }}>
                {getCurrentPeriodLabel()}
              </span>

              <motion.button
                onClick={() => navigatePeriod(1)}
                className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>
          )}

          {/* Time Period Toggle Buttons */}
          {['week', 'month', 'year'].map((period) => (
            <motion.button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timePeriod === period
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                backgroundColor: timePeriod === period ? 'rgba(102, 126, 234, 0.8)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: timePeriod === period ? '#667eea' : 'transparent',
                borderWidth: '1px'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isGerman
                ? (period === 'week' ? 'Woche' : period === 'month' ? 'Monat' : 'Jahr')
                : (period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'Year')
              }
            </motion.button>
          ))}
        </div>
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
              className="flex-1 min-w-[40px] h-full flex flex-col"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Bars container */}
              <div className="w-full flex-1 flex items-end justify-center space-x-1">
                {/* Moving service bar */}
                <motion.div
                  className={`${getBarWidth()} rounded-t-lg relative group cursor-pointer`}
                  style={{
                    height: `${getBarHeight(chartData.moving[index])}%`,
                    minHeight: chartData.moving[index] > 0 ? '4px' : '0px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${getBarHeight(chartData.moving[index])}%` }}
                  transition={{ delay: index * 0.05, duration: 0.6 }}
                  whileHover={{ scale: 1.1 }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {isGerman ? 'Umzug' : 'Moving'}: €{chartData.moving[index].toFixed(2)}
                  </div>
                </motion.div>

                {/* Cleaning service bar */}
                <motion.div
                  className={`${getBarWidth()} rounded-t-lg relative group cursor-pointer`}
                  style={{
                    height: `${getBarHeight(chartData.cleaning[index])}%`,
                    minHeight: chartData.cleaning[index] > 0 ? '4px' : '0px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${getBarHeight(chartData.cleaning[index])}%` }}
                  transition={{ delay: index * 0.05 + 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.1 }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {isGerman ? 'Reinigung' : 'Cleaning'}: €{chartData.cleaning[index].toFixed(2)}
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