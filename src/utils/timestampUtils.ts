/**
 * Utility functions for generating timestamps for file downloads
 */

/**
 * Generates a formatted timestamp string for use in filenames
 * Format: YYYY-MM-DD_HH-MM-SS
 * @returns {string} Formatted timestamp string
 */
export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Generates a filename with timestamp
 * @param {string} baseName - The base name of the file (without extension)
 * @param {string} extension - The file extension (with or without dot)
 * @returns {string} Filename with timestamp
 */
export function generateTimestampedFilename(baseName: string, extension: string): string {
  const timestamp = generateTimestamp();
  const cleanExtension = extension.startsWith('.') ? extension : `.${extension}`;
  return `${baseName}_${timestamp}${cleanExtension}`;
}

/**
 * Generates a contact-specific filename with timestamp
 * @param {string} contactName - The contact's name
 * @param {string} extension - The file extension
 * @returns {string} Contact filename with timestamp
 */
export function generateContactFilename(contactName: string, extension: string): string {
  const cleanName = contactName.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
  return generateTimestampedFilename(cleanName, extension);
}
