import React, { useState, useEffect } from 'react';

interface DateAvailability {
  date: string; // YYYY-MM-DD format
  status: 'available' | 'full' | 'not_assigned';
  slots?: number;
  capacity?: number;
}

interface VisualCalendarProps {
  onDateSelect: (date: string) => void;
  availableDates?: DateAvailability[];
  selectedDate?: string;
  serviceName?: string;
  compact?: boolean; // renders a denser, shorter calendar
}

export const VisualCalendar: React.FC<VisualCalendarProps> = ({
  onDateSelect,
  availableDates = [],
  selectedDate,
  serviceName,
  compact = true
}) => {
  // Derive initial month from selectedDate or first available date; fallback to today
  const initialMonth = (() => {
    const fromSelected = selectedDate ? new Date(selectedDate) : null;
    const fromAvailable = availableDates && availableDates.length > 0 ? new Date(availableDates[0].date) : null;
    const base = fromSelected || fromAvailable || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  })();
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(false);

  // Keep current month in sync when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [selectedDate]);

  const getDateStatus = (day: { isPast: boolean; isCurrentMonth: boolean; availability?: { status: string } }) => {
    if (day.isPast) return 'past';
    if (!day.isCurrentMonth) return 'other-month';
    if (day.availability) {
      return day.availability.status;
    }
    return 'not_assigned';
  };

  const getDateColor = (day: { isPast: boolean; isCurrentMonth: boolean; availability?: { status: string } }) => {
    const status = getDateStatus(day);
    
    if (day.isPast) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    
    if (!day.isCurrentMonth) {
      return 'bg-gray-50 text-gray-300 cursor-not-allowed';
    }
    
    switch (status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300 cursor-pointer';
      case 'full':
        return 'bg-red-100 text-red-800 border-red-300 cursor-not-allowed opacity-75';
      case 'not_assigned':
        return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50';
      default:
        return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50';
    }
  };

  const getDateIcon = (day: { isPast: boolean; isCurrentMonth: boolean; availability?: { status: string } }) => {
    const status = getDateStatus(day);
    
    if (day.isPast) return '❌';
    if (!day.isCurrentMonth) return '';
    
    switch (status) {
      case 'available':
        return '●';
      case 'full':
        return '●';
      case 'not_assigned':
        return '';
      default:
        return '';
    }
  };

  const handleDateClick = (day: { isPast: boolean; isCurrentMonth: boolean; availability?: { status: string }; date: Date }) => {
    const status = getDateStatus(day);
    if (day.isPast || !day.isCurrentMonth) return;
    // Only allow clicking on available dates (not not_assigned or full)
    if (status !== 'available') return;
    setLoading(true);
    onDateSelect(day.date.toISOString().split('T')[0]);
    
    // Reset loading after a short delay
    setTimeout(() => setLoading(false), 1000);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-3xl shadow-2xl ${compact ? 'p-2' : 'p-6'} w-full max-w-2xl mx-auto`}>
      {/* Modern Header */}
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-6'}`}>
        <button
          onClick={() => navigateMonth('prev')}
          className={`group ${compact ? 'p-1' : 'p-3'} hover:bg-blue-100/50 rounded-2xl transition-all duration-300 hover:scale-110 disabled:opacity-50`}
          disabled={loading}
        >
          <span className={`${compact ? 'text-base' : 'text-xl'} font-bold text-gray-600 group-hover:text-blue-600`}>‹</span>
        </button>
        <div className="text-center">
          <h3 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-gray-800`}>
            {monthNames[currentMonth.getMonth()]}
          </h3>
          <p className="text-sm text-gray-500 font-medium">{currentMonth.getFullYear()}</p>
        </div>
        <button
          onClick={() => navigateMonth('next')}
          className={`group ${compact ? 'p-1' : 'p-3'} hover:bg-blue-100/50 rounded-2xl transition-all duration-300 hover:scale-110 disabled:opacity-50`}
          disabled={loading}
        >
          <span className={`${compact ? 'text-base' : 'text-xl'} font-bold text-gray-600 group-hover:text-blue-600`}>›</span>
        </button>
      </div>

      {/* Modern Legend */}
      <div className={`${compact ? 'mb-2 p-1' : 'mb-6 p-4'} bg-blue-50 rounded-2xl border border-blue-100`}>
        <div className={`${compact ? 'text-[11px] mb-1' : 'text-sm mb-3'} font-semibold text-gray-700 flex items-center`}>
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          Availability Status
        </div>
        <div className={`grid grid-cols-2 ${compact ? 'gap-1.5 text-[10px]' : 'gap-3 text-xs'}`}>
          <div className="flex items-center gap-2">
            <span className={`${compact ? 'w-3 h-3 text-[10px]' : 'w-4 h-4 text-xs'} bg-green-500 rounded-full flex items-center justify-center text-white font-bold`}>●</span>
            <span className="font-medium text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${compact ? 'w-3 h-3 text-[10px]' : 'w-4 h-4 text-xs'} bg-red-500 rounded-full flex items-center justify-center text-white font-bold`}>●</span>
            <span className="font-medium text-gray-700">Full Capacity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} bg-white border border-gray-300 rounded`}></span>
            <span className="font-medium text-gray-700">No Schedule</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${compact ? 'w-3 h-3 text-[10px]' : 'w-4 h-4 text-xs'} bg-gray-500 rounded-full flex items-center justify-center text-white`}>❌</span>
            <span className="font-medium text-gray-700">Past/Unavailable</span>
          </div>
        </div>
      </div>

      {/* Modern Calendar Grid */}
      <div className={`grid grid-cols-7 ${compact ? 'gap-1' : 'gap-2'}`}>
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className={`${compact ? 'p-1 text-[11px]' : 'p-3 text-sm'} text-center font-bold text-gray-600 bg-blue-50 rounded-lg`}>
            {day}
          </div>
        ))}
        
        {/* Calendar days with proper alignment */}
        {(() => {
          const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
          const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
          const cells = [];
          
          // Add empty cells for alignment
          for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push(<div key={`empty-${i}`} className={compact ? 'p-0.5' : 'p-2'}></div>);
          }
          
          // Add calendar days
          for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
            // Use local date formatting to avoid timezone issues
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;
            
            // Find availability for this date
            const availability = availableDates.find(d => d.date === dateStr);
            
            const day = {
              date: dateStr,
              displayDate: dayNum,
              isCurrentMonth: true,
              isToday,
              isPast,
              availability
            };
            
            const status = getDateStatus(day);
            
            // Only allow clicking on available dates (not not_assigned or full)
            const isClickable = !day.isPast && day.isCurrentMonth && status === 'available' && !loading;
            
            cells.push(
              <button
                key={dayNum}
                onClick={() => isClickable && handleDateClick({...day, date: new Date(day.date)})}
                disabled={!isClickable}
                className={`
                  group relative ${compact ? 'p-1 text-[11px] rounded-lg' : 'p-3 text-sm rounded-2xl'} border-2 transition-all duration-300
                  ${isClickable ? 'transform hover:scale-105' : ''}
                  ${getDateColor(day)}
                  ${selectedDate === day.date ? 'ring-4 ring-blue-500/30 ring-offset-2 shadow-lg' : ''}
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className={`flex flex-col items-center ${compact ? 'space-y-0' : 'space-y-1'}`}>
                  <span className={`${compact ? 'text-sm' : 'text-lg'} font-bold`}>{day.displayDate}</span>
                  <span className={`${compact ? 'text-[9px]' : 'text-xs'}`}>
                    {day.isPast ? '❌' : getDateIcon(day)}
                  </span>
                </div>
                {isClickable && (
                  <div className={`absolute inset-0 ${compact ? 'rounded-lg' : 'rounded-2xl'} bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                )}
              </button>
            );
          }
          
          return cells;
        })()}
      </div>

      {/* Service info */}
      {serviceName && (
        <div className={`${compact ? 'mt-2 p-2' : 'mt-4 p-2'} bg-blue-50 rounded-lg`}>
          <div className="text-xs text-blue-700">
            Showing availability for: <span className="font-medium">{serviceName}</span>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className={`${compact ? 'mt-2' : 'mt-4'} flex items-center justify-center`}>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default VisualCalendar;
