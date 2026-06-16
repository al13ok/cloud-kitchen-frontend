/**
 * Time utility functions for session analytics and time formatting
 */

/**
 * Format time for display (e.g., "1h 30m" or "45s")
 * @param seconds - Time in seconds
 * @param format - Optional format ('short' or 'long')
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function formatTimeForDisplay(seconds: number, _format?: string): string {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * Convert seconds to minutes
 */
export function convertToMinutes(seconds: number): number {
  return Math.round((seconds / 60) * 100) / 100; // Round to 2 decimal places
}

/**
 * Format timestamp to readable date/time
 * @param timestamp - Date string or Date object
 * @param format - Optional format ('datetime', 'date', 'time')
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function formatTimestamp(timestamp: string | Date, _format?: string): string {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid Date';
  }
}

/**
 * Safely parse a date value from backend API responses.
 * Handles various formats:
 * - MongoDB Extended JSON format: { $date: string | number }
 * - ISO string: "2024-01-01T00:00:00.000Z"
 * - Timestamp number: 1704067200000
 * - Date object: Date instance
 * 
 * @param dateValue - Unknown date value from API response
 * @param fallback - Optional fallback date (defaults to current date)
 * @returns ISO string representation of the date
 */
export function safeParseDate(
  dateValue: unknown,
  fallback?: Date
): string {
  // Handle null or undefined
  if (dateValue == null) {
    return (fallback || new Date()).toISOString();
  }

  // Handle MongoDB Extended JSON format: { $date: ... }
  if (typeof dateValue === 'object' && dateValue !== null && '$date' in dateValue) {
    const mongoDate = dateValue as { $date: unknown };
    const innerValue = mongoDate.$date;
    
    if (typeof innerValue === 'string' || typeof innerValue === 'number') {
      try {
        const date = new Date(innerValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (error) {
        console.warn('Error parsing MongoDB date format:', error);
      }
    }
    // If $date value is invalid, fall through to fallback
  }
  
  // Handle string dates
  if (typeof dateValue === 'string') {
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (error) {
      console.warn('Error parsing string date:', error);
    }
  }
  
  // Handle number timestamps
  if (typeof dateValue === 'number') {
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (error) {
      console.warn('Error parsing number date:', error);
    }
  }
  
  // Handle Date objects
  if (dateValue instanceof Date) {
    if (!isNaN(dateValue.getTime())) {
      return dateValue.toISOString();
    }
  }
  
  // Fallback to provided fallback or current date
  return (fallback || new Date()).toISOString();
}

