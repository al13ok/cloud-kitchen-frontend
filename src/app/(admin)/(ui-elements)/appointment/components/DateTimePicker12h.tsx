import React, { useState, useEffect, useRef, useCallback } from 'react';
import DatePicker from '@/components/ui/DatePicker';

interface DateTimePicker12hProps {
  value: string; // Format: "YYYY-MM-DDTHH:MM" (24-hour)
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const DateTimePicker12h: React.FC<DateTimePicker12hProps> = ({ 
  value, 
  onChange, 
  className = "",
  placeholder = "dd/mm/yyyy, --:--"
}) => {
  const [date, setDate] = useState('');
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [showTimePicker, setShowTimePicker] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openMenu, setOpenMenu] = useState<'hour' | 'minute' | 'period' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  
  // Update the ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Convert 24-hour format to 12-hour format
  const parse24Hour = (time24: string) => {
    if (!time24) return { hour: 12, minute: 0, period: 'AM' as const };
    
    const [h, m] = time24.split(':').map(Number);
    if (h === 0) return { hour: 12, minute: m, period: 'AM' as const };
    if (h < 12) return { hour: h, minute: m, period: 'AM' as const };
    if (h === 12) return { hour: 12, minute: m, period: 'PM' as const };
    return { hour: h - 12, minute: m, period: 'PM' as const };
  };

  // Convert 12-hour format to 24-hour format
  const format24Hour = (h: number, m: number, p: 'AM' | 'PM') => {
    let hour24 = h;
    if (p === 'AM' && h === 12) hour24 = 0;
    if (p === 'PM' && h !== 12) hour24 = h + 12;
    
    return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Initialize state from value prop
  useEffect(() => {
    if (value) {
      const [datePart, timePart] = value.split('T');
      setDate(datePart || '');
      
      if (timePart) {
        const parsed = parse24Hour(timePart);
        setHour(parsed.hour);
        setMinute(parsed.minute);
        setPeriod(parsed.period);
      }
    }
  }, [value]);

  // Update parent when internal state changes
  const updateParent = useCallback(() => {
    if (date) {
      const time24 = format24Hour(hour, minute, period);
      const datetime24 = `${date}T${time24}`;
      // Only call onChange if the value has actually changed
      if (datetime24 !== value) {
        onChangeRef.current(datetime24);
      }
    }
  }, [date, hour, minute, period, value]);

  useEffect(() => {
    updateParent();
  }, [updateParent]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  // Use 5‑minute steps to keep lists compact and within viewport
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/** Shared style for compact, professional controls */}
      {/** Using small pill buttons with subtle hover/focus states */}
      {/** Keep sizes consistent across all three selectors */}
      {(() => null)()}
      {/* Date input with custom picker for universal support */}
      <div className="flex items-center gap-2">
        <input
          readOnly
          onClick={() => setShowDatePicker(true)}
          value={date ? `${date.split('-').reverse().join('/')}` : ''}
          placeholder={placeholder}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 w-full cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <button
          type="button"
          aria-label="Pick time"
          title="Pick time"
          onClick={() => setShowTimePicker(v => !v)}
          className="p-2 rounded-xl border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
        </button>
      </div>

      {showDatePicker && (
        <DatePicker
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onDateSelect={(d: string) => { setDate(d); setShowDatePicker(false); }}
          selectedDate={date}
          title="Select date"
        />
      )}
      
      {/* Time Picker - Compact Version (togglable) */}
      {showTimePicker && (
      <div ref={containerRef} className="mt-2 w-full flex items-end justify-start gap-4 flex-nowrap whitespace-nowrap">
        {/* Hour Selector */}
        <div className="flex flex-col relative">
          <label className="text-[11px] text-gray-500 mb-1">Hour</label>
          <button
            type="button"
            onClick={()=>setOpenMenu(openMenu==='hour'?null:'hour')}
            className="w-[64px] h-[28px] border border-gray-300 rounded-lg px-2 text-xs bg-white text-gray-900 text-left leading-none shadow-sm hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
          >
            {hour.toString().padStart(2,'0')}
          </button>
          {openMenu==='hour' && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {hours.map(h => (
                <div key={h} onClick={()=>{setHour(h); setOpenMenu(null);}} className={`px-2 py-2 cursor-pointer text-sm ${hour===h? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-800 hover:bg-gray-50'}`}>
                  {h.toString().padStart(2,'0')}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Removed separator on request */}
        <div className="hidden">:</div>

        {/* Minute Selector (5‑min steps) */}
        <div className="flex flex-col relative">
          <label className="text-[11px] text-gray-500 mb-1">Minute</label>
          <button
            type="button"
            onClick={()=>setOpenMenu(openMenu==='minute'?null:'minute')}
            className="w-[64px] h-[28px] border border-gray-300 rounded-lg px-2 text-xs bg-white text-gray-900 text-left leading-none shadow-sm hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
          >
            {minute.toString().padStart(2,'0')}
          </button>
          {openMenu==='minute' && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {minutes.map(m => (
                <div key={m} onClick={()=>{setMinute(m); setOpenMenu(null);}} className={`px-2 py-2 cursor-pointer text-sm ${minute===m? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-800 hover:bg-gray-50'}`}>
                  {m.toString().padStart(2,'0')}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AM/PM Selector */}
        <div className="flex flex-col relative">
          <label className="text-[11px] text-gray-500 mb-1">Period</label>
          <button
            type="button"
            onClick={()=>setOpenMenu(openMenu==='period'?null:'period')}
            className="w-[64px] h-[28px] border border-gray-300 rounded-lg px-2 text-xs bg-white text-gray-900 text-left leading-none shadow-sm hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
          >
            {period}
          </button>
          {openMenu==='period' && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {(['AM','PM'] as const).map(p => (
                <div key={p} onClick={()=>{setPeriod(p); setOpenMenu(null);}} className={`px-2 py-2 cursor-pointer text-sm ${period===p? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-800 hover:bg-gray-50'}`}>
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default DateTimePicker12h;
