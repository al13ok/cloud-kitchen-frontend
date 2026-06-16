import { BACKEND_URL } from './api';

export const getDomain = (email: string): string => {
  if (email === 'ai@Mobiloitte.com') return 'Mobiloitte';
  if (email === 'ai@user.com') return 'user';
  return 'domain_1';
};

export const getBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
  }
  return apiUrl;
};

// Add a function to test the connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(BACKEND_URL + "/health", { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};
