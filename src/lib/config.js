/**
 * Dynamic configuration for API base URL
 * Automatically detects environment and constructs appropriate URLs
 */

const getApiBaseUrl = () => {
  // For server-side rendering (Node.js environment)
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';
  }

  // For client-side (browser environment)
  // If NEXT_PUBLIC_API_URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Auto-detect based on current window location
  const { protocol, hostname, port } = window.location;

  // Development environment detection
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Default to port 5000 for API in development
    const apiPort = process.env.NEXT_PUBLIC_API_PORT || '5000';
    return `${protocol}//${hostname}:${apiPort}/api`;
  }

  // Staging/Production environment
  if (hostname === 'leadform.listandsell.de') {
    return 'https://api.leadform.listandsell.de/api';
  }

  // Fallback: construct based on current domain for other production environments
  const apiUrl = `${protocol}//${hostname}${port && port !== '80' && port !== '443' ? `:${port}` : ''}/api`;

  return apiUrl;
};

export const API_BASE_URL = getApiBaseUrl();

export const config = {
  apiBaseUrl: API_BASE_URL,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

export default config;