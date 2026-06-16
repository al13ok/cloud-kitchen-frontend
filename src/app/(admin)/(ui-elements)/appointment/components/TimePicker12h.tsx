import React, { useState, useEffect } from 'react';

interface TimePicker12hProps {
  value: string; // Format: "HH:MM" (24-hour)
  onChange: (value: string) => void;
  className?: string;
}

export const TimePicker12h: React.FC<TimePicker12hProps> = ({ 
  value, 
  onChange, 
  className = "" 
}) => {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

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
    const parsed = parse24Hour(value);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
  }, [value]);

  // Update parent when internal state changes
  useEffect(() => {
    const time24 = format24Hour(hour, minute, period);
    onChange(time24);
  }, [hour, minute, period, onChange]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Hour Selector */}
      <div className="flex flex-col">
        <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-center font-semibold text-lg min-w-[60px]">
          {hour.toString().padStart(2, '0')}
        </div>
        <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg mt-1 bg-white">
          {hours.map(h => (
            <div
              key={h}
              onClick={() => setHour(h)}
              className={`px-3 py-1 text-center cursor-pointer hover:bg-gray-100 ${
                hour === h ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
              }`}
            >
              {h.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="text-2xl font-bold text-gray-400">:</div>

      {/* Minute Selector */}
      <div className="flex flex-col">
        <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-center font-semibold text-lg min-w-[60px]">
          {minute.toString().padStart(2, '0')}
        </div>
        <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg mt-1 bg-white">
          {minutes.map(m => (
            <div
              key={m}
              onClick={() => setMinute(m)}
              className={`px-3 py-1 text-center cursor-pointer hover:bg-gray-100 ${
                minute === m ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
              }`}
            >
              {m.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      {/* AM/PM Selector */}
      <div className="flex flex-col">
        <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-center font-semibold text-lg min-w-[60px]">
          {period}
        </div>
        <div className="border border-gray-200 rounded-lg mt-1 bg-white">
          <div
            onClick={() => setPeriod('AM')}
            className={`px-3 py-1 text-center cursor-pointer hover:bg-gray-100 ${
              period === 'AM' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
            }`}
          >
            AM
          </div>
          <div
            onClick={() => setPeriod('PM')}
            className={`px-3 py-1 text-center cursor-pointer hover:bg-gray-100 ${
              period === 'PM' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
            }`}
          >
            PM
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimePicker12h;
