import { getWhatsAppBotApiUrl } from '@/config/urls';

// Error interface for validation errors with details
interface ValidationError extends Error {
  details?: Array<{ loc: string[]; msg: string; type: string }>;
  status?: number;
}

const getBackendUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
  }
  return apiUrl;
};

// Get survey public URL base from environment variable
const getSurveyPublicUrlBase = (): string => {
  return process.env.NEXT_PUBLIC_SURVEY_PUBLIC_URL || process.env.NEXT_PUBLIC_SURVEY_BASE_URL || '';
};

// Construct survey public link from environment variable and survey ID
export const getSurveyPublicLink = (surveyId: string): string => {
  const baseUrl = getSurveyPublicUrlBase();
  if (!baseUrl) {
    console.error('NEXT_PUBLIC_SURVEY_PUBLIC_URL or NEXT_PUBLIC_SURVEY_BASE_URL environment variable is not set. Please set it in your .env file.');
    // Fallback: construct from API URL if available (no hardcoded domain)
    const apiUrl = getBackendUrl();
    try {
      const url = new URL(apiUrl);
      // Construct survey URL from API domain (no hardcoded values)
      return `${url.protocol}//surveys.${url.hostname}/survey/${surveyId}`;
    } catch (error) {
      console.error('Failed to construct survey URL from API URL:', error);
      throw new Error('NEXT_PUBLIC_SURVEY_PUBLIC_URL or NEXT_PUBLIC_SURVEY_BASE_URL must be set in environment variables');
    }
  }
  // Ensure base URL doesn't end with a slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/survey/${surveyId}`;
};

// Export both the function and a constant for backward compatibility
export const BACKEND_URL = getBackendUrl();
export { getBackendUrl };



// Fetch with timeout helper to avoid hanging requests in prod/staging
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 10000, ...rest } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Validate URL before making request
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input);
    if (!url || url === 'undefined' || url.includes('undefined')) {
      clearTimeout(timeoutId);
      throw new Error(`Invalid URL: ${url}. Please check your NEXT_PUBLIC_API_URL environment variable.`);
    }

    const response = await fetch(input, { ...rest, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout: The request took longer than ${timeoutMs}ms to complete. Please check your network connection and try again.`);
    }

    // Handle network errors
    if (error instanceof TypeError) {
      if (error.message.includes('fetch')) {
        throw new Error(`The system is currently being updated. Please try again in a few moments.`);
      }
    }

    // Re-throw other errors
    throw error;
  }
}



// Test backend connectivity
export async function testBackendConnection() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}



// Check if privacy consent service is available
export async function isPrivacyServiceHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/privacy/consent`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    // Healthy only if the server responds successfully and not a 5xx
    return response.ok && response.status < 500;
  } catch {
    return false;
  }
}



const TOKEN_KEYS = ['jwtToken', 'access_token', 'accessToken', 'token', 'authToken'];

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
};

const getTokenFromLocalStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

const getTokenFromCookies = (): string | null => {
  for (const key of TOKEN_KEYS) {
    const token = getCookieValue(key);
    if (token) return token;
  }
  return null;
};

// Enhanced getAuthHeaders function to support all token types used in the application
export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    accept: 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = getTokenFromLocalStorage() || getTokenFromCookies();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Attach CSRF token if available
    try {
      const csrf = localStorage.getItem('XSRF-TOKEN') || getCookieValue('XSRF-TOKEN');
      if (csrf) {
        headers['X-CSRF-Token'] = csrf;
      }
    } catch (error) {
      console.warn('Failed to get CSRF token:', error);
    }
  }

  return headers;
}




// Helper function to handle API responses
async function handleApiResponse(response: Response, skipAuthClear: boolean = false) {
  if (response.status === 401) {
    // Only clear auth data if not explicitly skipped (e.g., for privacy consent)
    if (!skipAuthClear && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('userData');
      document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}



// File Management
export async function uploadFiles(domain: string, files: File[]) {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const headers: HeadersInit = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${BACKEND_URL}/domain/${domain}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return res.json();
}



// FAQ CSV Upload
export async function uploadFaqCsv(
  file: File | File[],
  domain: string = 'default',
  rebuildIndex: boolean = true
) {
  const formData = new FormData();

  // Support both single file and multiple files
  const files = Array.isArray(file) ? file : [file];
  files.forEach(f => {
    formData.append('files', f);
  });

  formData.append('domain', domain);
  formData.append('rebuild_index', rebuildIndex.toString());

  // Debug logging
  console.log('FAQ Upload Request:', {
    url: `${BACKEND_URL}/api/v1/faq/files/upload`,
    domain,
    rebuildIndex,
    fileCount: files.length,
    files: files.map(f => ({ name: f.name, type: f.type, size: f.size }))
  });

  // Check for auth token and add to headers
  const headers: HeadersInit = {
    'accept': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${BACKEND_URL}/api/v1/faq/files/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let message = `Upload failed: ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      console.error('FAQ Upload Error Response:', data);

      // Handle FastAPI validation errors
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          // FastAPI validation error format
          const errors = data.detail.map((err: { loc: string[]; msg: string }) =>
            `${err.loc.join('.')}: ${err.msg}`
          ).join(', ');
          message = `Validation error: ${errors}`;
        } else if (typeof data.detail === 'string') {
          message = data.detail;
        }
      } else if (data.message || data.error) {
        message = data.message || data.error;
      }
    } catch (error) {
      console.warn('Failed to parse error response:', error);
    }
    throw new Error(message);
  }

  return res.json();
}



// Fetch FAQ files
export async function fetchFaqFiles(domain: string) {
  // Use FAQ API endpoint - pass the domain as a query param
  const url = `${BACKEND_URL}/api/v1/faq/files?domain=${encodeURIComponent(domain)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
    },
  });



  if (!res.ok) {
    let message = `Failed to fetch FAQ files: ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data && (data.message || data.detail || data.error)) {
        message = data.message || data.detail || data.error;
      }
    } catch { }
    throw new Error(message);
  }



  return res.json();
}



export async function listFiles(domain: string, page = 1, pageSize = 10) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/files?page=${page}&page_size=${pageSize}`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res);
}



export async function deleteFaqCsv(filename: string, domain: string = 'default') {
  // Use FAQ API endpoint with filename in path and domain as query param
  const url = `${BACKEND_URL}/api/v1/faq/files/${encodeURIComponent(filename)}?domain=${encodeURIComponent(domain)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'accept': 'application/json' },
  });



  if (!res.ok) {
    let message = `Delete failed: ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data && (data.message || data.detail || data.error)) {
        message = data.message || data.detail || data.error;
      }
    } catch (error) {
      // If parsing JSON fails, we'll use the default message
      console.warn('Failed to parse error response:', error);
    }
    throw new Error(message);
  }



  return res.json();
}



export async function deleteFiles(domain: string, filenames: string[]) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/files`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filenames }),
  });
  return res.json();
}




// Query & Chat
export async function queryDomain(domain: string, data: unknown) {
  const res = await fetch(`${BACKEND_URL}/query/${domain}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}



// Session Management
export async function listSessions(domain: string) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/sessions`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}



export async function updateSessionTitle(domain: string, oldTitle: string, newTitle: string) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/session/title`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ old_title: oldTitle, new_title: newTitle }),
  });
  return res.json();
}



export async function deleteSession(domain: string, title: string) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/session/${title}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return res.json();
}



export async function getConversationDetails(domain: string, title: string) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/session/${title}`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}



export async function saveSession(domain: string, sessionId: string, title: string) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/save-session`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ session_id: sessionId, title }),
  });
  return res.json();
}



// System Prompt
export async function getSystemPrompt(domain: string) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/system-prompt`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}



export async function updateSystemPrompt(domain: string, prompt: string) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/system-prompt`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prompt }),
  });
  return res.json();
}



// User Type Analysis
export async function analyzeUserType(message: string) {
  const res = await fetch(`${BACKEND_URL}/analyze-user-type`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });
  return res.json();
}



// Health Check
export async function healthCheck() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      headers: getAuthHeaders(),
    });
    return handleApiResponse(res);
  } catch (error) {
    throw error;
  }
}



// User Authentication (Legacy - use loginWithDevice for new implementations)
export async function login({ identifier, password, device_type }: { identifier: string; password: string; device_type?: string }) {
  const body: { identifier: string; password: string; device_type?: string } = { identifier, password };
  if (device_type) body.device_type = device_type;

  const url = `${BACKEND_URL}/api/v1/login`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(body),
      // credentials: 'include', // Temporarily removed to test CORS
    });



    if (!res.ok) {
      let errorMsg = 'Login failed';
      try {
        const data = await res.json();
        if (data && (data.message || data.error || data.detail)) {
          errorMsg = data.message || data.error || data.detail;
        }
      } catch {
        errorMsg = `Login failed: ${res.status} ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }



    const responseData = await res.json();
    return responseData;
  } catch (error) {
    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect. Either your internet is offline or the server is temporarily unavailable. Please try again shortly.');
    }

    // Re-throw the original error
    throw error;
  }
}



export async function getConversation(domain: string, title: string) {
  const res = await fetch(`${BACKEND_URL}/domain/${domain}/session/${encodeURIComponent(title)}`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}



// Avatar Upload and Download
export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BACKEND_URL}/customize/upload-avatar/`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }

  return res.json();
}



export async function downloadAvatar() {
  const res = await fetch(`${BACKEND_URL}/customize/download-avatar/`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Download failed: ${res.statusText}`);
  }

  return res.json();
}



// Theme Colors
export async function getThemeColors() {
  const res = await fetch(`${BACKEND_URL}/customize/theme-colors/`, {
    method: 'GET',
    headers: { 'accept': 'application/json' },
  });
  return res.json();
}



// Chat UI Details
export async function getChatUIDetails(widgetId: string = 'Model') {
  const res = await fetch(`${BACKEND_URL}/customize/widget/${widgetId}`, {
    method: 'GET',
    headers: { 'accept': 'application/json' },
  });
  return res.json();
}



// Update Chat UI Details
export async function updateChatUIDetails(widgetId: string = 'Model', data: {
  Name: string;
  Welcome_message: string;
  image_link: string;
  theme: {
    color_1: string;
    color_2: string;
    color_3: string;
    color_4: string;
    color_5: string;
  };
}) {
  const res = await fetch(`${BACKEND_URL}/customize/update-widget/${widgetId}`, {
    method: 'PUT',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
  });
  return res.json();
}




// Privacy & Cookie Endpoints
export async function getPrivacyConsent() {
  try {
    // Check if the service is healthy before making the call
    const isHealthy = await isPrivacyServiceHealthy();
    if (!isHealthy) {
      console.warn('Privacy consent service is not healthy, skipping API call');
      throw new Error('Privacy consent service temporarily unavailable');
    }



    const res = await fetch(`${BACKEND_URL}/api/v1/privacy/consent`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    // Handle 500 errors specifically for privacy consent
    if (res.status === 500) {
      console.warn('Privacy consent API returned 500 error - server issue detected');
      throw new Error('Privacy consent service temporarily unavailable');
    }

    return handleApiResponse(res);
  } catch (error) {
    // Re-throw the error to be handled by the calling function
    throw error;
  }
}



export async function savePrivacyConsentApi(data: {
  cookie_policy_accepted: boolean;
  cache_policy_accepted: boolean;
  user_cookie_notification: boolean;
  user_cache_notification: boolean;
}) {
  const res = await fetch(`${BACKEND_URL}/api/v1/privacy/consent`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
    // credentials: 'include', // Temporarily removed to fix CORS issues
  });
  // Skip auth clearing for privacy consent - it's handled gracefully in cookieUtils
  return handleApiResponse(res, true);
}



export async function removePrivacyConsent() {
  const res = await fetch(`${BACKEND_URL}/api/v1/privacy/remove`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res);
}



export async function logPrivacyEventApi(event: {
  event_type: string;
  reason: string;
}) {
  const res = await fetch(`${BACKEND_URL}/api/v1/privacy/events`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(event),
    // credentials: 'include', // Temporarily removed to fix CORS issues

  });
  return handleApiResponse(res);
}



export async function getPrivacyStats() {
  const res = await fetch(`${BACKEND_URL}/api/v1/privacy/stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res);
}



export async function getPrivacyNotifications() {
  const res = await fetch(`${BACKEND_URL}/api/v1/privacy/notifications`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res);
}



export async function getCookieStatus() {
  const res = await fetch(`${BACKEND_URL}/api/v1/cookie-status`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res);
}



export async function clearCache() {
  const res = await fetch(`${BACKEND_URL}/api/v1/clear-cache`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res);
}



// ==================== SESSION MANAGEMENT ENDPOINTS ====================



/**
 * Get all active sessions for the current user
 */
export async function getUserSessions() {
  const res = await fetch(`${BACKEND_URL}/api/v1/sessions`, {
    method: 'GET',
    headers: getAuthHeaders(),
    // credentials: 'include', // Temporarily removed to fix CORS issues
  });
  return handleApiResponse(res);
}



/**
 * Refresh access token using refresh token
 */
export async function refreshToken() {
  const res = await fetch(`${BACKEND_URL}/api/v1/refresh`, {
    method: 'POST',
    headers: getAuthHeaders(),
    // credentials: 'include', // Temporarily removed to fix CORS issues
  });
  return handleApiResponse(res);
}



/**
 * Logout from current session only
 */
export async function logoutCurrentSession() {
  const res = await fetch(`${BACKEND_URL}/api/v1/logout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    // credentials: 'include', // Temporarily removed to fix CORS issues
  });
  return handleApiResponse(res);
}



/**
 * Logout from all sessions (all devices)
 */
export async function logoutAllSessions() {
  const res = await fetch(`${BACKEND_URL}/api/v1/logout-all`, {
    method: 'POST',
    headers: getAuthHeaders(),
    // credentials: 'include', // Temporarily removed to fix CORS issues
  });
  return handleApiResponse(res);
}



/**
 * Revoke a specific session by session_id
 */
export async function revokeSession(sessionId: string) {
  const formData = new FormData();
  formData.append('session_id', sessionId);



  const headers = getAuthHeaders();
  // Remove Content-Type to let browser set it for FormData
  delete (headers as Record<string, unknown>)['Content-Type'];



  const res = await fetch(`${BACKEND_URL}/api/v1/sessions/revoke`, {
    method: 'POST',
    headers,
    body: formData,
    // credentials: 'include', // Temporarily removed to fix CORS issues
  });
  return handleApiResponse(res);
}



/**
 * Get current user's presence and activity
 */
export async function getMyActivity() {
  const res = await fetch(`${BACKEND_URL}/api/v1/me/activity`, {
    method: 'GET',
    headers: getAuthHeaders(),
    // credentials: 'include', // Temporarily removed to fix CORS issues
  });
  return handleApiResponse(res);
}



/**
 * Get recent activity for all users (admin function)
 */
export async function getRecentActivity(limit: number = 50) {
  const res = await fetch(`${BACKEND_URL}/api/v1/recent-activity?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    // credentials: 'include', // Temporarily removed to fix CORS issues
  });
  return handleApiResponse(res);
}



/**
 * Get current session status and information
 */
export async function getSessionStatus() {
  const res = await fetch(`${BACKEND_URL}/api/v1/session-status`, {
    method: 'GET',
    headers: getAuthHeaders(),
    // credentials: 'include', // Temporarily removed to fix CORS issues
  });
  return handleApiResponse(res);
}



/**
 * Get specific user's latest session info
 */
export async function getUserLatestSession(userId: string) {
  const res = await fetch(`${BACKEND_URL}/api/v1/user_sessions/${userId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res);
}



/**
 * Enhanced login function with device type support
 */
export async function loginWithDevice({ identifier, password, device_type = 'Web' }: {
  identifier: string;
  password: string;
  device_type?: string
}) {
  const body = { identifier, password, device_type };

  const url = `${BACKEND_URL}/api/v1/login`;

  try {
    const start = performance.now?.() ?? Date.now();
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(body),
      // credentials: 'include', // Temporarily removed to fix CORS issues
      timeoutMs: 10000,
    });
    const end = performance.now?.() ?? Date.now();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Auth login latency: ${(end - start).toFixed(0)}ms, status ${res.status}`);
    }

    if (!res.ok) {
      let errorMsg = 'Login failed';
      try {
        const data = await res.json();
        if (data && (data.message || data.error || data.detail)) {
          errorMsg = data.message || data.error || data.detail;
        }
      } catch {
        errorMsg = `Login failed: ${res.status} ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }



    const responseData = await res.json();
    return responseData;
  } catch (error) {
    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect. Either your internet is offline or the server is temporarily unavailable. Please try again shortly.');
    }

    // Re-throw the original error
    throw error;
  }
}



// WhatsApp Bot Sessions
export async function getWhatsAppBotSessions() {
  try {
    const res = await fetch(`${getWhatsAppBotApiUrl()}/aiagent/sessions`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch WhatsApp bot sessions: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching WhatsApp bot sessions:', error);
    throw error;
  }
}



// Get individual WhatsApp session details
export async function getWhatsAppBotSession(sessionId: string) {
  try {
    // Remove '+' prefix if present (API expects session_id without '+' in URL)
    const cleanSessionId = sessionId.startsWith('+') ? sessionId.slice(1) : sessionId;
    const encodedSessionId = encodeURIComponent(cleanSessionId);
    const res = await fetch(`${getWhatsAppBotApiUrl()}/aiagent/session/${encodedSessionId}?prefer_source=mongodb`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch WhatsApp bot session: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format: expected an object');
    }

    // Ensure messages array exists (even if empty)
    if (!Array.isArray(data.messages)) {
      console.warn('WhatsApp session response missing messages array:', data);
      // Return data with empty messages array to prevent errors
      return {
        ...data,
        messages: []
      };
    }

    return data;
  } catch (error) {
    console.error('Error fetching WhatsApp bot session:', error);
    throw error;
  }
}



// Delete a WhatsApp session by session_id
export async function deleteWhatsAppBotSession(sessionId: string) {
  try {
    // Remove '+' prefix if present (API expects session_id without '+' in URL)
    const cleanSessionId = sessionId.startsWith('+') ? sessionId.slice(1) : sessionId;
    const encodedSessionId = encodeURIComponent(cleanSessionId);
    const res = await fetch(`${getWhatsAppBotApiUrl()}/aiagent/session/${encodedSessionId}`, {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to delete WhatsApp bot session: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error deleting WhatsApp bot session:', error);
    throw error;
  }
}



// Telegram Bot Sessions
async function getTelegramBotSessions(limit: number = 100, skip: number = 0) {
  const res = await fetch(`https://telegram-aiagent.mobiloitte.io/chat/sessions?limit=${limit}&skip=${skip}`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Telegram bot sessions: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export { getTelegramBotSessions };



// Get individual Telegram session details
async function getTelegramBotSession(sessionId: string) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const res = await fetch(`https://telegram-aiagent.mobiloitte.io/chat/session/${encodedSessionId}`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Telegram bot session: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export { getTelegramBotSession };

// Instagram API functions
export async function getInstagramUsers(limit: number = 100, days: number = 7) {
  const response = await fetchWithTimeout(
    `https://instabot-aiagent.mobiloitte.io/chat/users?limit=${limit}&days=${days}`,
    {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        ...getAuthHeaders(),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram users: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getInstagramChatHistory(userId: string, limit: number = 50) {
  const response = await fetchWithTimeout(
    `https://instabot-aiagent.mobiloitte.io/chat/history/${userId}?limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        ...getAuthHeaders(),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram chat history: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Instagram Feedback API functions
export async function getInstagramFeedback(limit: number = 50) {
  const response = await fetchWithTimeout(
    `https://instabot-aiagent.mobiloitte.io/feedback/get?limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        ...getAuthHeaders(),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram feedback: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getInstagramFeedbackStats() {
  const response = await fetchWithTimeout(
    `https://instabot-aiagent.mobiloitte.io/feedback/stats`,
    {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        ...getAuthHeaders(),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram feedback stats: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Survey Management
/**
 * Create a new survey
 */
export async function createSurvey(surveyData: import('../types/survey').CreateSurveyRequest): Promise<import('../types/survey').CreateSurveyResponse> {
  const url = `${BACKEND_URL}/api/v1/survey/create`;

  // Backend only expects title and description
  const transformed = {
    title: surveyData.title,
    description: surveyData.description ?? '',
  };

  console.log('📝 Creating survey at:', url);
  console.log('📝 Survey data:', transformed);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(transformed),
  });

  console.log('📝 Survey creation response status:', res.status, res.statusText);
  return handleApiResponse(res);
}

/**
 * Send survey via email
 */
export async function sendSurveyEmail(emailData: {
  survey_id: string;
  recipient_email: string;
  subject?: string;
  message?: string;
}): Promise<import('../types/survey').SendSurveyEmailResponse> {
  const url = `${BACKEND_URL}/api/v1/survey/send-email`;

  // Transform to backend expected format
  // Include message parameter to override backend template (without questions)
  const transformed: Record<string, unknown> = {
    recipient_email: emailData.recipient_email,
    survey_id: emailData.survey_id,
  };

  // If message is provided, include it to override backend template
  if (emailData.message) {
    transformed.message = emailData.message;
  }

  // If subject is provided, include it
  if (emailData.subject) {
    transformed.subject = emailData.subject;
  }

  console.log('📧 Sending survey email to:', url);
  console.log('📧 Email data:', transformed);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(transformed),
  });

  console.log('📧 Response status:', res.status, res.statusText);
  return handleApiResponse(res);
}

/**
 * Track survey email
 * POST /api/v1/survey/email/track
 */
export async function trackSurveyEmail(trackData: {
  survey_id: string;
  recipient_email: string;
}): Promise<{
  message: string;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/email/track`;

  console.log('📊 Tracking survey email at:', url);
  console.log('📊 Track data:', trackData);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(trackData),
  });

  console.log('📊 Track response status:', res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('📊 Error response body:', errorText);
    throw new Error(`Failed to track survey email: ${res.status} ${res.statusText}`);
  }

  return handleApiResponse(res);
}

/**
 * Save survey email body text
 * PUT /api/v1/survey/{survey_id}/email-body    
 */
export async function saveSurveyEmailBody(
  surveyId: string,
  bodyText: string
): Promise<{
  message: string;
  survey_id: string;
  body_text?: string;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/${surveyId}/email-body`;

  console.log('💾 Saving email body text at:', url);
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({ body_text: bodyText }),
  });

  console.log('💾 Save body response status:', res.status, res.statusText);
  return handleApiResponse(res);
}

/**
 * Get survey email body text
 * GET /api/v1/survey/{survey_id}/email-body
 */
export async function getSurveyEmailBody(
  surveyId: string
): Promise<{
  message: string;
  survey_id: string;
  body_text?: string;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/${surveyId}/email-body`;

  console.log('📥 Getting email body text from:', url);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
  });

  console.log('📥 Get body response status:', res.status, res.statusText);
  return handleApiResponse(res);
}

/**
 * Get all survey email tracking records
 * GET /api/v1/survey/email/tracking/all
 */
export async function getAllSurveyEmailTracking(): Promise<{
  total_tracking_records: number;
  tracking_records: Array<{
    tracking_id: string;
    survey_id: string;
    survey_title: string;
    recipient_email: string;
    send_count: number;
    sent_date: string;
  }>;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/email/tracking/all`;

  console.log('📊 Fetching survey email tracking from:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  console.log('📊 Tracking fetch response status:', res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('📊 Error response body:', errorText);
    throw new Error(`Failed to fetch survey email tracking: ${res.status} ${res.statusText}`);
  }

  return handleApiResponse(res);
}

/**
 * Fetch survey data by ID
 */
export async function getSurveyById(surveyId: string): Promise<import('../types/survey').SurveyDetails> {
  const url = `${BACKEND_URL}/api/v1/survey/${surveyId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleApiResponse(res);
}

/**
 * Submit survey response
 * Endpoint shape (backend):
 * POST /api/v1/survey/{survey_id}/submit?email={recipient_email}
 * Body: JSON with scores/comments or answers as applicable
 * Success: { message: string, response_id: string }
 */
export async function submitSurveyResponse(
  surveyId: string,
  email: string,
  payload: Record<string, unknown>
): Promise<{ message: string; response_id: string }> {
  const url = `${BACKEND_URL}/api/v1/survey/${encodeURIComponent(surveyId)}/submit?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleApiResponse(res);
}

/**
 * Check survey status and whether user can submit
 * GET /api/v1/survey/{survey_id}/status?email={email}
 * Returns: { survey_id, survey_status, message, can_submit, sent_at, submitted_at, expires_at }
 */
export async function checkSurveyStatus(
  surveyId: string,
  email?: string
): Promise<{
  survey_id: string;
  survey_status: string;
  message: string;
  can_submit: boolean;
  sent_at: string | null;
  submitted_at: string | null;
  expires_at: string | null;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/${encodeURIComponent(surveyId)}/status${email ? `?email=${encodeURIComponent(email)}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.detail || errorData.error || errorData.message || `Failed to check survey status: ${res.status} ${res.statusText}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to check survey status: ${res.status} ${res.statusText}`);
    }
  }

  return handleApiResponse(res);
}

// Employee Management
/**
 * Fetch all employees with pagination
 */
export async function getEmployees(page: number = 1, size: number = 100): Promise<unknown> {
  const url = `${BACKEND_URL}/api/v1/employees/?page=${page}&size=${size}`;

  console.log('👥 Fetching employees from:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      mode: 'cors',
    });

    console.log('👥 Response status:', res.status, res.statusText);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('👥 API Error Response:', errorText);
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }

    // Parse response....
    const data = await res.json();
    console.log('👥 Parsed response data:', data);

    return data;
  } catch (error) {
    console.error('👥 Error in getEmployees:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the backend API. Please ensure the backend server is running at ' + BACKEND_URL);
    }
    throw error;
  }
}

// Customer Management
/**
 * Fetch all customers with pagination
 */
export async function getCustomers(page: number = 1, size: number = 100): Promise<unknown> {
  const url = `${BACKEND_URL}/api/v1/customers/?page=${page}&size=${size}`;

  console.log('👤 Fetching customers from:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      mode: 'cors',
    });

    console.log('👤 Response status:', res.status, res.statusText);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('👤 API Error Response:', errorText);
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }

    // Parse response
    const data = await res.json();
    console.log('👤 Parsed response data:', data);

    return data;
  } catch (error) {
    console.error('👤 Error in getCustomers:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the backend API. Please ensure the backend server is running at ' + BACKEND_URL);
    }
    throw error;
  }
}

// ==================== SURVEY FEEDBACK ENDPOINTS ====================

/**
 * Fetch all survey feedback data
 */
export async function getAllSurveyFeedback(): Promise<{
  total_feedbacks: number;
  feedbacks: Array<{
    feedback_id: string;
    email: string;
    rating: number;
    comment: string;
    submitted_date: string;
    survey_id?: string;
  }>;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/feedback/all`;

  console.log('📤 Fetching survey feedback from:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  console.log('📤 Response status:', res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('📤 Error response body:', errorText);
    throw new Error(`Failed to fetch survey feedback: ${res.status} ${res.statusText}`);
  }

  return handleApiResponse(res);
}

/**
 * Fetch survey feedback by survey ID
 */
export async function getSurveyFeedbackById(surveyId: string): Promise<{
  total_feedbacks: number;
  feedbacks: Array<{
    feedback_id: string;
    email: string;
    rating: number;
    comment: string;
    submitted_date: string;
    survey_id?: string;
  }>;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/${encodeURIComponent(surveyId)}/feedback`;

  console.log('📤 Fetching survey feedback for survey:', surveyId, 'from:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  console.log('📤 Response status:', res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('📤 Error response body:', errorText);
    throw new Error(`Failed to fetch survey feedback: ${res.status} ${res.statusText}`);
  }

  return handleApiResponse(res);
}

/**
 * Submit survey feedback
 * POST /api/v1/survey/{survey_id}/feedback
 * Body: { email: string, rating: number, comment: string }
 */
export async function submitSurveyFeedback(
  surveyId: string,
  feedbackData: {
    email: string;
    rating: number | null; // Rating is optional
    comment: string | null;
    answers: Array<{ questionId: string; answer: string }>;
  }
): Promise<import('../types/survey').SurveyFeedbackResponse> {
  const url = `${BACKEND_URL}/api/v1/survey/${encodeURIComponent(surveyId)}/feedback`;

  console.log('📤 Submitting feedback to:', url);
  console.log('📤 Feedback data:', feedbackData);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(feedbackData),
  });

  console.log('📤 Response status:', res.status, res.statusText);
  console.log('📤 Response ok:', res.ok);

  // Handle validation errors (422) with detailed error information
  if (!res.ok) {
    const errorText = await res.text();
    console.error('📤 Error response body:', errorText);

    try {
      const errorData = JSON.parse(errorText);
      console.error('📤 Parsed error data:', errorData);

      // Create error object with details for 422 validation errors
      if (res.status === 422 && errorData.details) {
        const error: ValidationError = new Error(errorData.error || 'Validation error') as ValidationError;
        error.details = errorData.details;
        error.status = res.status;
        throw error;
      }

      // For other errors, check FastAPI error format (detail field) first, then other formats
      // FastAPI returns errors in the "detail" field
      const errorMessage = errorData.detail || errorData.error || errorData.message || `API request failed: ${res.status} ${res.statusText}`;
      throw new Error(errorMessage);
    } catch (error) {
      // If error is already thrown above (with details), re-throw it
      if (error instanceof Error && 'details' in error) {
        throw error;
      }
      // If error is already an Error instance, re-throw it
      if (error instanceof Error) {
        throw error;
      }
      // If JSON parsing failed or other error, throw generic error
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }
  }

  try {
    const result = await handleApiResponse(res);
    console.log('📤 Parsed response from handleApiResponse:', result);
    return result;
  } catch (error) {
    console.error('📤 Error in handleApiResponse:', error);
    throw error;
  }
}

/**
 * Fetch survey answers by user email
 */
export async function getSurveyAnswersByEmail(userEmail: string): Promise<{
  user_email: string;
  total_answers: number;
  answers: Array<{
    answer_id: string;
    survey_id: string;
    question_id: string;
    user_email: string;
    answer_text: string;
    submitted_at: string;
  }>;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/answers/${encodeURIComponent(userEmail)}`;

  console.log('📤 Fetching survey answers for:', userEmail, 'from:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('📤 Error fetching answers:', errorText);
    throw new Error(`Failed to fetch survey answers: ${res.status} ${res.statusText}`);
  }

  return handleApiResponse(res);
}

/**
 * Fetch survey answers by survey ID and email
 */
export async function getSurveyAnswersBySurveyIdAndEmail(surveyId: string, userEmail: string): Promise<{
  user_email: string;
  total_answers: number;
  answers: Array<{
    answer_id: string;
    survey_id: string;
    question_id: string;
    user_email: string;
    answer_text: string;
    submitted_at: string;
  }>;
}> {
  // Try to fetch by survey_id and email
  // First try: /api/v1/survey/{survey_id}/answers/{email}
  const url = `${BACKEND_URL}/api/v1/survey/${encodeURIComponent(surveyId)}/answers/${encodeURIComponent(userEmail)}`;

  console.log('📤 Fetching survey answers by survey_id and email:', surveyId, userEmail, 'from:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  // If that doesn't work, try fetching all answers for the email and filter by survey_id
  if (!res.ok) {
    console.log('📤 First attempt failed, trying alternative method...');
    const answersData = await getSurveyAnswersByEmail(userEmail);
    // Filter answers by survey_id
    const filteredAnswers = {
      ...answersData,
      answers: answersData.answers.filter((ans) => ans.survey_id === surveyId)
    };
    return filteredAnswers;
  }

  return handleApiResponse(res);
}

/**
 * Delete survey feedback by feedback ID
 */
export async function deleteSurveyFeedback(feedbackId: string): Promise<{
  message: string;
  feedback_id: string;
  survey_id: string;
  deleted_feedbacks_count: number;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/feedback/${encodeURIComponent(feedbackId)}/delete-survey`;

  console.log('🗑️ Deleting survey feedback:', feedbackId, 'from:', url);

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'accept': 'application/json',
    },
  });

  console.log('🗑️ Delete response status:', res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('🗑️ Error response body:', errorText);
    throw new Error(`Failed to delete survey feedback: ${res.status} ${res.statusText}`);
  }

  return handleApiResponse(res);
}

/**
 * Create a survey question
 * POST /api/v1/survey/questions
 * Body: { "question": "question text" }
 */
export async function createSurveyQuestion(question: string): Promise<{
  message: string;
  question_id: string;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/questions`;

  const requestBody = {
    question: question.trim(),
  };

  console.log('📝 Creating survey question at:', url);
  console.log('📝 Question data:', requestBody);

  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(requestBody),
  });

  console.log('📝 Question creation response status:', res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('📝 Error response body:', errorText);
    throw new Error(`Failed to create survey question: ${res.status} ${res.statusText}`);
  }

  return handleApiResponse(res);
}

/**
 * Get all survey questions
 * GET /api/v1/survey/questions/
 */
export async function getSurveyQuestions(surveyId?: string): Promise<{
  questions: Array<{
    question_id: string;
    survey_id?: string;
    question_text: string;
    question_type: 'text' | 'mcq';
    options?: string[];
    created_at?: string;
  }>;
  total: number;
}> {
  let url = `${BACKEND_URL}/api/v1/survey/questions/`;
  if (surveyId) {
    url += `?survey_id=${encodeURIComponent(surveyId)}`;
  }

  console.log('📋 Fetching survey questions from:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  console.log('📋 Questions fetch response status:', res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('📋 Error response body:', errorText);
    throw new Error(`Failed to fetch survey questions: ${res.status} ${res.statusText}`);
  }

  return handleApiResponse(res);
}

/**
 * Delete a survey question
 * DELETE /api/v1/survey/questions/{question_id}
 */
export async function deleteSurveyQuestion(questionId: string): Promise<{
  message: string;
  question_id: string;
}> {
  const url = `${BACKEND_URL}/api/v1/survey/questions/${encodeURIComponent(questionId)}`;

  console.log('🗑️ Deleting survey question:', questionId, 'from:', url);

  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  console.log('🗑️ Delete question response status:', res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('🗑️ Error response body:', errorText);
    throw new Error(`Failed to delete survey question: ${res.status} ${res.statusText}`);
  }

  return handleApiResponse(res);
}

// ==================== DEPARTMENT ENDPOINTS ====================

/**
 * Fetch all departments with their members
 */
export async function getDepartments(): Promise<unknown[]> {
  const url = `${BACKEND_URL}/api/departments`;

  console.log('🏢 Fetching departments from:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  console.log('🏢 Response status:', res.status, res.statusText);
  return handleApiResponse(res);
}

/**
 * Send survey email to all members of a department
 */
export async function sendSurveyEmailToDepartment(
  emailData: {
    survey_id: string;
    department: string;
    subject?: string;
    message?: string;
  }
): Promise<unknown> {
  const url = `${BACKEND_URL}/api/send-survey-email`;

  console.log('📧 Sending survey email to department:', url);
  console.log('📧 Department email data:', emailData);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(emailData),
  });

  console.log('📧 Response status:', res.status, res.statusText);
  return handleApiResponse(res);
}

// ==================== HELPDESK TICKET ENDPOINTS ====================

/**
 * Get employee tickets (backend filters by role automatically)
 * GET /api/v1/helpdesk/employee/tickets
 * Returns tickets filtered by user role:
 * - SUPER_ADMIN → all tickets
 * - HR → only HR issue_type tickets
 * - IT → only IT issue_type tickets
 * - ADMIN → only ADMIN tickets
 * - EMPLOYEE → only tickets created by the employee
 */
export async function getEmployeeTickets(): Promise<unknown[]> {
  const url = `${BACKEND_URL}/api/v1/helpdesk/employee/tickets`;

  console.log('🎫 Fetching employee tickets from:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('🎫 Response status:', res.status, res.statusText);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('🎫 Error response body:', errorText);

      // If 404 or empty response, return empty array (no tickets found)
      if (res.status === 404) {
        console.log('🎫 No tickets found (404)');
        return [];
      }

      throw new Error(`Failed to fetch employee tickets: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('🎫 Raw response data:', data);

    // Handle different response formats
    // Backend may return array directly or wrapped in data property
    if (Array.isArray(data)) {
      console.log('🎫 Response is array, length:', data.length);
      return data;
    } else if (data && typeof data === 'object') {
      // Check for common response wrapper formats
      if (Array.isArray(data.data)) {
        console.log('🎫 Response has data array, length:', data.data.length);
        return data.data;
      } else if (Array.isArray(data.tickets)) {
        console.log('🎫 Response has tickets array, length:', data.tickets.length);
        return data.tickets;
      } else if (Array.isArray(data.results)) {
        console.log('🎫 Response has results array, length:', data.results.length);
        return data.results;
      } else if (data.data === null || data.data === undefined) {
        // Backend returned { data: null } or { data: undefined }
        console.log('🎫 Response has null/undefined data');
        return [];
      }
    }

    // If no tickets found, return empty array
    console.warn('🎫 Unexpected response format:', data);
    return [];
  } catch (error) {
    console.error('🎫 Error fetching employee tickets:', error);
    // Return empty array on error to prevent UI from breaking
    return [];
  }
}