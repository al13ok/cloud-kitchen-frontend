// Centralized URL Configuration
// All hard-coded URLs should be moved here and accessed via environment variables

export const URL_CONFIG = {
  // Website URLs
  CONVERIQO_BASE: process.env.NEXT_PUBLIC_CONVERIQO_URL || 'https://converiqo.ai',
  CONVERIQO_PRIVACY_POLICY: process.env.NEXT_PUBLIC_CONVERIQO_PRIVACY_URL || 'https://converiqo.ai/privacy-policy',
  
  // WhatsApp Bot API URL
  WHATSAPP_BOT_API: process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_URL || process.env.NEXT_PUBLIC_API_URL || '',
  
  // Business/Help Desk API URL
  BUSINESS_API: process.env.NEXT_PUBLIC_BUSINESS_API_URL || process.env.NEXT_PUBLIC_API_URL || '',
  
  // Mobiloitte API URL (for CRM and customization endpoints)
  MOBILOITTE_API: process.env.NEXT_PUBLIC_MOBILOITTE_API_URL || process.env.NEXT_PUBLIC_API_URL || '',
  
  // Appointment API URL (fallback - should use API_CONFIG from appointment/config/api.ts)
  APPOINTMENT_API: process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || '',
};

// Helper to get WhatsApp Bot API base URL
export const getWhatsAppBotApiUrl = (): string => {
  if (!URL_CONFIG.WHATSAPP_BOT_API) {
    throw new Error('NEXT_PUBLIC_WHATSAPP_BOT_API_URL or NEXT_PUBLIC_API_URL environment variable is not set');
  }
  return URL_CONFIG.WHATSAPP_BOT_API;
};

// Helper to get Business API base URL
export const getBusinessApiUrl = (): string => {
  if (!URL_CONFIG.BUSINESS_API) {
    throw new Error('NEXT_PUBLIC_BUSINESS_API_URL or NEXT_PUBLIC_API_URL environment variable is not set');
  }
  return URL_CONFIG.BUSINESS_API;
};

// Helper to get Mobiloitte API base URL
export const getMobiloitteApiUrl = (): string => {
  if (!URL_CONFIG.MOBILOITTE_API) {
    throw new Error('NEXT_PUBLIC_MOBILOITTE_API_URL or NEXT_PUBLIC_API_URL environment variable is not set');
  }
  return URL_CONFIG.MOBILOITTE_API;
};

export default URL_CONFIG;

