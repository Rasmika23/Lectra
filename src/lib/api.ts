/**
 * @file api.ts
 * @description Centralized utility functions for API requests, including JWT authentication handling.
 */

/**
 * Returns the Authorization header object with the JWT token from localStorage.
 * Use this in all authenticated fetch() calls.
 */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = localStorage.getItem('jwtToken');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Enhanced fetch wrapper that automatically adds Auth headers and handles 401/403 errors.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = authHeaders((options.headers as Record<string, string>) || {});
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Dispatch a custom event for the App to handle (e.g., logout)
    window.dispatchEvent(new CustomEvent('auth-failure', { 
      detail: { status: response.status } 
    }));
    throw new Error('Authentication failed');
  }

  return response;
}
