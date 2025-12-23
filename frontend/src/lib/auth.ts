/**
 * Authentication utilities for token management and storage
 */

const TOKEN_KEY = 'blog_system_token';
const ROLE_KEY = 'blog_system_role';

/**
 * Store authentication token and role in localStorage
 */
export function storeAuth(token: string, role: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
  }
}

/**
 * Get stored authentication token
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * Get stored user role
 */
export function getRole(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ROLE_KEY);
  }
  return null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Clear authentication data (logout)
 */
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
}

/**
 * Get redirect path based on role
 */
export function getRedirectPath(role: string): string {
  switch (role) {
    case 'creator':
      return '/creator/dashboard';
    case 'reviewer':
      return '/reviewer/dashboard';
    default:
      return '/';
  }
}
