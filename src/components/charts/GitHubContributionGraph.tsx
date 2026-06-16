"use client";
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ContributionData {
  date: string;
  count: number;
  level: number; // 0-4 for intensity levels
}

interface GitHubContributionGraphProps {
  data: ContributionData[];
  title?: string;
  className?: string;
  showTooltip?: boolean;
  onBlockClick?: (date: string, count: number) => void;
}

const GitHubContributionGraph: React.FC<GitHubContributionGraphProps> = ({
  data,
  title = "Session Activity",
  className = "",
  showTooltip = true,
  onBlockClick
}) => {
  // Generate the last 365 days of data with proper error handling
  const generateYearData = useMemo(() => {
    try {
      const today = new Date();
      const yearAgo = new Date(today);
      yearAgo.setDate(yearAgo.getDate() - 364);
      
      const yearData: ContributionData[] = [];
      const dataMap = new Map(data.map(d => [d.date, d]));
      
      // Generate exactly 365 days to ensure complete graph
      for (let i = 0; i < 365; i++) {
        const date = new Date(yearAgo);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const existingData = dataMap.get(dateStr);
        const count = existingData?.count || 0;
        
        // Calculate intensity level (0-4) with better distribution
        let level = 0;
        if (count > 0) {
          if (count === 1) level = 1;
          else if (count <= 3) level = 2;
          else if (count <= 6) level = 3;
          else level = 4;
        }
        
        yearData.push({
          date: dateStr,
          count,
          level
        });
      }
      
      return yearData;
    } catch (error) {
      console.error('Error generating year data:', error);
      return [];
    }
  }, [data]);

  // Group data by weeks (53 weeks for a year) with proper error handling
  const weeksData = useMemo(() => {
    try {
      if (!generateYearData || generateYearData.length === 0) {
        return [];
      }

      const weeks: ContributionData[][] = [];
      
      // Find the first Sunday in the data
      let firstSundayIndex = -1;
      for (let i = 0; i < generateYearData.length; i++) {
        const date = new Date(generateYearData[i].date);
        if (date.getDay() === 0) {
          firstSundayIndex = i;
          break;
        }
      }
      
      // Process all days to create complete weeks
      let currentWeek: ContributionData[] = [];
      
      // Find the first Sunday or start from the beginning
      let startIndex = 0;
      if (firstSundayIndex !== -1) {
        startIndex = firstSundayIndex;
      }
      
      // Add empty days before the first day if needed
      const firstDate = new Date(generateYearData[startIndex].date);
      const firstDayOfWeek = firstDate.getDay();
      
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({
          date: '',
          count: 0,
          level: 0
        });
      }
      
      // Process all days
      for (let i = startIndex; i < generateYearData.length; i++) {
        currentWeek.push(generateYearData[i]);
        
        if (currentWeek.length === 7) {
          weeks.push([...currentWeek]);
          currentWeek = [];
        }
      }
      
      // Add remaining days as last week
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({
            date: '',
            count: 0,
            level: 0
          });
        }
        weeks.push([...currentWeek]);
      }
      
      // Ensure we have exactly 53 weeks for a complete year
      while (weeks.length < 53) {
        const emptyWeek: ContributionData[] = Array(7).fill(null).map(() => ({
          date: '',
          count: 0,
          level: 0
        }));
        weeks.push(emptyWeek);
      }
      
      // Ensure each week has exactly 7 days
      weeks.forEach((week, index) => {
        while (week.length < 7) {
          week.push({
            date: '',
            count: 0,
            level: 0
          });
        }
        // Remove excess days if more than 7
        if (week.length > 7) {
          weeks[index] = week.slice(0, 7);
        }
      });
      
      // Debug: Log the weeks structure
      console.log('Weeks data structure:', {
        totalWeeks: weeks.length,
        totalDays: weeks.reduce((sum, week) => sum + week.length, 0),
        weeks: weeks.map((week, index) => ({
          weekIndex: index,
          days: week.map(day => ({
            date: day.date,
            count: day.count,
            dayOfWeek: day.date ? new Date(day.date).getDay() : 'empty',
            isValidDate: day.date ? !isNaN(new Date(day.date).getTime()) : false
          }))
        }))
      });
      
      return weeks;
    } catch (error) {
      console.error('Error grouping weeks data:', error);
      return [];
    }
  }, [generateYearData]);

  // Get color based on intensity level
  const getBlockColor = (level: number) => {
    const colors = [
      '#f6f8fa', // Level 0 - No activity (better contrast)
      '#c6e48b', // Level 1 - Low activity
      '#7bc96f', // Level 2 - Medium activity
      '#239a3b', // Level 3 - High activity
      '#196127'  // Level 4 - Very high activity
    ];
    return colors[level] || colors[0];
  };

  // Get hover color (slightly darker)
  const getHoverColor = (level: number) => {
    const colors = [
      '#d1d5da', // Level 0
      '#b3d9a3', // Level 1
      '#6bc96f', // Level 2
      '#1e8e3e', // Level 3
      '#155d27'  // Level 4
    ];
    return colors[level] || colors[0];
  };

  // Format date for tooltip with validation
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateStr);
      return 'Invalid Date';
    }
    
    // Check if date is in the future
    const today = new Date();
    if (date > today) {
      console.warn('Future date detected:', dateStr);
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get month labels for the top with proper positioning
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Track which months we've already labeled
    const labeledMonths = new Set<string>();
    let lastMonth = -1;
    
    weeksData.forEach((week, weekIndex) => {
      // Find the first non-empty day in the week
      let firstValidDay = null;
      for (const day of week) {
        if (day.date) {
          firstValidDay = day;
          break;
        }
      }
      
      if (firstValidDay) {
        const firstDay = new Date(firstValidDay.date);
        const currentMonth = firstDay.getMonth();
        const month = months[currentMonth];
        const monthKey = `${firstDay.getFullYear()}-${currentMonth}`;
        
        // Add label if this is a new month and it's the first week of the month
        if (currentMonth !== lastMonth && firstDay.getDate() <= 7) {
          labels.push({ month, weekIndex });
          labeledMonths.add(monthKey);
          lastMonth = currentMonth;
        }
      }
    });
    
    // Debug: Log month labels
    console.log('Month labels:', labels.map(label => ({
      month: label.month,
      weekIndex: label.weekIndex,
      position: label.weekIndex * 20
    })));
    
    return labels;
  }, [weeksData]);

  // Get day labels for the left side (complete week)
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Add loading and error states
  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-400 mb-2">📊</div>
            <p className="text-gray-500">No session data available</p>
            <p className="text-sm text-gray-400">Data will appear here once sessions are recorded</p>
          </div>
        </div>
      </div>
    );
  }

  if (weeksData.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading session data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <span>Less</span>
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className="w-5 h-5 rounded-sm border border-gray-200"
                style={{ backgroundColor: getBlockColor(level) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block" style={{ minWidth: `${weeksData.length * 20 + 80}px` }}>
          {/* Month labels */}
          <div className="relative mb-3 ml-12">
            {monthLabels.map(({ month, weekIndex }) => (
              <div
                key={`${month}-${weekIndex}`}
                className="text-sm text-gray-500 font-medium absolute"
                style={{ 
                  left: `${weekIndex * 20}px`,
                  transform: 'translateX(-8px)',
                  minWidth: '20px',
                  textAlign: 'center'
                }}
              >
                {month}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col mr-4 text-sm text-gray-500 font-medium">
              {dayLabels.map(day => (
                <div key={day} className="h-5 flex items-center mb-0.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Contribution blocks */}
            <div className="flex">
              {weeksData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col">
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const dayData = week[dayIndex];
                    
                    // Handle empty days (padding for incomplete weeks)
                    if (!dayData || !dayData.date) {
                      return (
                        <div 
                          key={dayIndex} 
                          className="w-5 h-5 m-0.5 rounded-sm border border-gray-200"
                          style={{ backgroundColor: '#f6f8fa' }}
                          title="No data for this day"
                        />
                      );
                    }

                    return (
                      <motion.div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`w-5 h-5 m-0.5 rounded-sm relative group border border-gray-200 transition-all duration-200 ${
                          dayData.count > 0 ? 'cursor-pointer hover:border-gray-400' : 'cursor-default'
                        }`}
                        style={{ backgroundColor: getBlockColor(dayData.level) }}
                        whileHover={dayData.count > 0 ? { 
                          scale: 1.15,
                          backgroundColor: getHoverColor(dayData.level),
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                        } : {}}
                        onClick={() => dayData.count > 0 && onBlockClick?.(dayData.date, dayData.count)}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ 
                          duration: 0.4,
                          delay: (weekIndex * 7 + dayIndex) * 0.005
                        }}
                      >
                        {showTooltip && dayData.date && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20 shadow-lg">
                            <div className="font-semibold">
                              {dayData.count} {dayData.count === 1 ? 'session' : 'sessions'}
                            </div>
                            <div className="text-gray-300">
                              {formatDate(dayData.date)}
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <span className="font-semibold text-lg text-gray-900">
                {generateYearData.filter(d => d.count > 0).length}
              </span> 
              <span className="ml-1">days with activity in the last year</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div>
              Total: <span className="font-semibold text-lg text-gray-900">
                {generateYearData.reduce((sum, d) => sum + d.count, 0)}
              </span> sessions
            </div>
            <div>
              Avg: <span className="font-semibold text-lg text-gray-900">
                {Math.round(generateYearData.reduce((sum, d) => sum + d.count, 0) / Math.max(generateYearData.filter(d => d.count > 0).length, 1) * 10) / 10}
              </span> per day
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubContributionGraph;
