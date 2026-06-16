// Utility functions for time conversion and formatting

/**
 * Convert UTC datetime string to IST (Indian Standard Time)
 * @param utcString - UTC datetime string (e.g., "2025-12-01T14:00:00")
 * @returns IST datetime string
 */
export const convertUTCToIST = (utcString: string): string => {
  if (!utcString) return '';
  
  try {
    const utcDate = new Date(utcString);
    // IST is UTC+5:30
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    return istDate.toISOString().replace('Z', '');
  } catch (error) {
    console.error('Error converting UTC to IST:', error);
    return utcString;
  }
};

/**
 * Format datetime string to 12-hour format with AM/PM
 * @param datetimeString - Datetime string (e.g., "2025-12-01T14:00:00")
 * @returns Formatted string (e.g., "Dec 1, 2025 2:00 PM")
 */
export const formatTo12Hour = (datetimeString: string): string => {
  if (!datetimeString) return '';
  
  try {
    const date = new Date(datetimeString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting to 12-hour:', error);
    return datetimeString;
  }
};

/**
 * Convert UTC to IST and format in 12-hour format
 * @param utcString - UTC datetime string
 * @returns IST datetime in 12-hour format
 */
export const convertUTCToIST12Hour = (utcString: string): string => {
  const istString = convertUTCToIST(utcString);
  return formatTo12Hour(istString);
};

/**
 * Format time only in 12-hour format
 * @param timeString - Time string (e.g., "14:00" or "2025-12-01T14:00:00")
 * @returns Time in 12-hour format (e.g., "2:00 PM")
 */
export const formatTime12Hour = (timeString: string): string => {
  if (!timeString) return '';
  
  try {
    // If it's just time (HH:MM), create a date with today's date
    let date: Date;
    if (timeString.includes('T')) {
      date = new Date(timeString);
    } else {
      // Assume it's HH:MM format
      const today = new Date();
      const [hours, minutes] = timeString.split(':').map(Number);
      date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    }
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time to 12-hour:', error);
    return timeString;
  }
};

/**
 * Convert IST datetime to UTC for API calls
 * @param istString - IST datetime string
 * @returns UTC datetime string
 */
export const convertISTToUTC = (istString: string): string => {
  if (!istString) return '';
  
  try {
    const istDate = new Date(istString);
    // Convert IST to UTC by subtracting 5:30
    const utcDate = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting IST to UTC:', error);
    return istString;
  }
};
