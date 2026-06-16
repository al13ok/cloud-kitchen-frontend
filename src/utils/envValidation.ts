// Environment variable validation utility
export interface EnvConfig {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_DUPLICATE_POLICY: 'deny' | 'replace' | 'version';
  NEXT_PUBLIC_UNAUTHORIZED_REDIRECT: string;
  NEXT_PUBLIC_DEFAULT_REDIRECT: string;
  NEXT_PUBLIC_ENABLE_FALLBACK_CONFIG: boolean;
  NEXT_PUBLIC_ENABLE_CSRF_PROTECTION: boolean;
  NEXT_PUBLIC_ENABLE_ROUTE_CACHING: boolean;
  NEXT_PUBLIC_NAVIGATION_CACHE_TTL: number;
  NEXT_PUBLIC_ROUTE_CACHE_TTL: number;
  NEXT_PUBLIC_ENABLE_DEBUG_LOGGING: boolean;
  NEXT_PUBLIC_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
}

// Required environment variables
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_API_URL',
] as const;

// Default values for optional environment variables
const DEFAULT_VALUES: Partial<EnvConfig> = {
  NEXT_PUBLIC_DUPLICATE_POLICY: 'replace',
  NEXT_PUBLIC_UNAUTHORIZED_REDIRECT: '/signin',
  NEXT_PUBLIC_DEFAULT_REDIRECT: '/',
  NEXT_PUBLIC_ENABLE_FALLBACK_CONFIG: true,
  NEXT_PUBLIC_ENABLE_CSRF_PROTECTION: true,
  NEXT_PUBLIC_ENABLE_ROUTE_CACHING: true,
  NEXT_PUBLIC_NAVIGATION_CACHE_TTL: 300000,
  NEXT_PUBLIC_ROUTE_CACHE_TTL: 60000,
  NEXT_PUBLIC_ENABLE_DEBUG_LOGGING: false,
  NEXT_PUBLIC_LOG_LEVEL: 'warn',
  NODE_ENV: 'development',
  PORT: '2101',
};

// Validate environment variables
export function validateEnvironment(): EnvConfig {
  const missingVars: string[] = [];
  
  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Return validated config with defaults
  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
    NEXT_PUBLIC_DUPLICATE_POLICY: (process.env.NEXT_PUBLIC_DUPLICATE_POLICY as 'deny' | 'replace' | 'version') || DEFAULT_VALUES.NEXT_PUBLIC_DUPLICATE_POLICY!,
    NEXT_PUBLIC_UNAUTHORIZED_REDIRECT: process.env.NEXT_PUBLIC_UNAUTHORIZED_REDIRECT || DEFAULT_VALUES.NEXT_PUBLIC_UNAUTHORIZED_REDIRECT!,
    NEXT_PUBLIC_DEFAULT_REDIRECT: process.env.NEXT_PUBLIC_DEFAULT_REDIRECT || DEFAULT_VALUES.NEXT_PUBLIC_DEFAULT_REDIRECT!,
    NEXT_PUBLIC_ENABLE_FALLBACK_CONFIG: process.env.NEXT_PUBLIC_ENABLE_FALLBACK_CONFIG === 'true',
    NEXT_PUBLIC_ENABLE_CSRF_PROTECTION: process.env.NEXT_PUBLIC_ENABLE_CSRF_PROTECTION !== 'false',
    NEXT_PUBLIC_ENABLE_ROUTE_CACHING: process.env.NEXT_PUBLIC_ENABLE_ROUTE_CACHING !== 'false',
    NEXT_PUBLIC_NAVIGATION_CACHE_TTL: parseInt(process.env.NEXT_PUBLIC_NAVIGATION_CACHE_TTL || DEFAULT_VALUES.NEXT_PUBLIC_NAVIGATION_CACHE_TTL!.toString()),
    NEXT_PUBLIC_ROUTE_CACHE_TTL: parseInt(process.env.NEXT_PUBLIC_ROUTE_CACHE_TTL || DEFAULT_VALUES.NEXT_PUBLIC_ROUTE_CACHE_TTL!.toString()),
    NEXT_PUBLIC_ENABLE_DEBUG_LOGGING: process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true',
    NEXT_PUBLIC_LOG_LEVEL: (process.env.NEXT_PUBLIC_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || DEFAULT_VALUES.NEXT_PUBLIC_LOG_LEVEL!,
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || DEFAULT_VALUES.NODE_ENV!,
    PORT: process.env.PORT || DEFAULT_VALUES.PORT!,
  };
}

// Get validated environment configuration
export const envConfig = validateEnvironment();

// Helper function to check if we're in development
export const isDevelopment = envConfig.NODE_ENV === 'development';

// Helper function to check if we're in production
export const isProduction = envConfig.NODE_ENV === 'production';

// Helper function to check if debug logging is enabled
export const isDebugLoggingEnabled = envConfig.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING || isDevelopment;
