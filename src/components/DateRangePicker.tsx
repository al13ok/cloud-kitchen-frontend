import { useEffect, useState, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface DateRangePickerProps {
  value?: [Date | null, Date | null];
  onChange?: (dates: [Date | null, Date | null]) => void;
  onClose?: () => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  value = [null, null], 
  onChange,
  onClose 
}) => {
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = useState<Date | null>(value[0]);
  const [endDate, setEndDate] = useState<Date | null>(value[1]);

  useEffect(() => {
    if (!startInputRef.current || !endInputRef.current) return;

    const startPicker = flatpickr(startInputRef.current, {
      dateFormat: 'Y-m-d',
      onChange: (selectedDates) => {
        const newStartDate = selectedDates[0] || null;
        setStartDate(newStartDate);
        if (onChange) {
          onChange([newStartDate, endDate]);
        }
      },
    });

    const endPicker = flatpickr(endInputRef.current, {
      dateFormat: 'Y-m-d',
      onChange: (selectedDates) => {
        const newEndDate = selectedDates[0] || null;
        setEndDate(newEndDate);
        if (onChange) {
          onChange([startDate, newEndDate]);
        }
      },
    });

    // Handle outside click to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't close if clicking on the date picker container
      if (target.closest('#date-range-picker')) {
        return;
      }
      
      // Don't close if clicking on flatpickr calendar elements
      if (target.closest('.flatpickr-calendar') || target.closest('.flatpickr-day') || target.closest('.flatpickr-month') || target.closest('.flatpickr-weekday') || target.closest('.flatpickr-current-month') || target.closest('.flatpickr-months') || target.closest('.flatpickr-prev-month') || target.closest('.flatpickr-next-month')) {
        return;
      }
      
      // Don't close if clicking on the select dropdown
      if (target.closest('select')) {
        return;
      }
      
      // Close if clicking outside all of the above
      if (onClose) {
        onClose();
      }
    };

    // Add a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      startPicker.destroy();
      endPicker.destroy();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onChange, onClose, startDate, endDate]);

  // Update local state when props change
  useEffect(() => {
    setStartDate(value[0]);
    setEndDate(value[1]);
  }, [value]);

  return (
    <div id="date-range-picker" className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
          </svg>
        </div>
        <input 
          ref={startInputRef}
          type="text" 
          value={startDate ? startDate.toISOString().split('T')[0] : ''}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 block w-32 ps-8 p-2 cursor-pointer" 
          placeholder="Start date" 
          readOnly
        />
      </div>
      <span className="text-gray-500 dark:text-gray-300 text-sm">to</span>
      <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
          </svg>
        </div>
        <input 
          ref={endInputRef}
          type="text" 
          value={endDate ? endDate.toISOString().split('T')[0] : ''}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 block w-32 ps-8 p-2 cursor-pointer" 
          placeholder="End date" 
          readOnly
        />
      </div>
    </div>
  );
};

export default DateRangePicker; 