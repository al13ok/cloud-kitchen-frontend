"use client";
import React, { useState, useEffect, useRef } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";

interface DatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void;
  selectedDate?: string;
  minDate?: string;
  maxDate?: string;
  title?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  isOpen,
  onClose,
  onDateSelect,
  selectedDate,
  minDate,
  maxDate,
  title = "Select Date"
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleYearSelect = (selectedYear: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(selectedYear);
      return newDate;
    });
    setShowYearSelector(false);
  };

  const handleMonthSelect = (selectedMonth: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(selectedMonth);
      return newDate;
    });
    setShowMonthSelector(false);
  };

  const generateYearRange = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  // Close selectors when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowYearSelector(false);
        setShowMonthSelector(false);
      }
    };

    if (showYearSelector || showMonthSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showYearSelector, showMonthSelector]);

  const handleDateClick = (day: number) => {
    const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check if date is within valid range
    if (minDate && selectedDateStr < minDate) return;
    if (maxDate && selectedDateStr > maxDate) return;
    
    onDateSelect(selectedDateStr);
    // Removed onClose() - now only closes when Done button is clicked
  };

  const isDateDisabled = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return selectedDate === dateStr;
  };

  const isToday = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === todayStr;
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="w-8 h-8"></div>
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isDisabled = isDateDisabled(day);
      const isSelected = isDateSelected(day);
      const isTodayDate = isToday(day);
      const isHovered = hoveredDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      days.push(
        <button
          key={day}
          onClick={() => !isDisabled && handleDateClick(day)}
          onMouseEnter={() => setHoveredDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
          onMouseLeave={() => setHoveredDate(null)}
          disabled={isDisabled}
          className={`
            w-8 h-8 text-sm rounded-full transition-all duration-200 flex items-center justify-center
            ${isDisabled 
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
              : 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }
            ${isSelected 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : isTodayDate 
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold' 
                : 'text-gray-700 dark:text-gray-300'
            }
            ${isHovered && !isDisabled && !isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div ref={datePickerRef} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <FaChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowMonthSelector(!showMonthSelector);
                setShowYearSelector(false);
              }}
              className="px-2 py-1 text-base font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {monthNames[month]}
            </button>
            <button
              onClick={() => {
                setShowYearSelector(!showYearSelector);
                setShowMonthSelector(false);
              }}
              className="px-2 py-1 text-base font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {year}
            </button>
          </div>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <FaChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Month Selector */}
        {showMonthSelector && (
          <div className="absolute top-20 left-4 right-4 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
            <div className="grid grid-cols-3 gap-1">
              {monthNames.map((monthName, index) => (
                <button
                  key={index}
                  onClick={() => handleMonthSelect(index)}
                  className={`px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    index === month 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {monthName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Year Selector */}
        {showYearSelector && (
          <div className="absolute top-20 left-4 right-4 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-4 gap-1">
              {generateYearRange().map((yearOption) => (
                <button
                  key={yearOption}
                  onClick={() => handleYearSelect(yearOption)}
                  className={`px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    yearOption === year 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {yearOption}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
