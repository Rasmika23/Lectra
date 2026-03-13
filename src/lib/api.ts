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
