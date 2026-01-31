/**
 * Authentication hook for SonicMirror
 * Handles authentication state, login, logout, and token management
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getTokens,
  getTokensFromUrl,
  clearTokens,
  spotifyApi,
  SpotifyProfile,
} from '../lib/api';
import config from '../lib/config';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: SpotifyProfile | null;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

/**
 * Hook for managing authentication state
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // First, check for tokens in URL (after OAuth redirect)
    const urlTokens = getTokensFromUrl();
    
    // Get tokens from URL or storage
    const tokens = urlTokens || getTokens();

    if (!tokens) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
      return false;
    }

    // Verify token by fetching profile
    const { data: profile, error } = await spotifyApi.getProfile();

    if (error || !profile) {
      // Token might be invalid, clear it
      clearTokens();
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error || 'Failed to verify authentication',
      });
      return false;
    }

    setState({
      isAuthenticated: true,
      isLoading: false,
      user: profile,
      error: null,
    });

    return true;
  }, []);

  /**
   * Redirect to Spotify login
   */
  const login = useCallback(() => {
    window.location.href = config.spotify.loginUrl;
  }, []);

  /**
   * Logout and clear tokens
   */
  const logout = useCallback(() => {
    clearTokens();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
    router.push('/');
  }, [router]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    login,
    logout,
    checkAuth,
  };
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo = '/login'): AuthState & { logout: () => void } {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push(redirectTo);
    }
  }, [auth.isLoading, auth.isAuthenticated, router, redirectTo]);

  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user,
    error: auth.error,
    logout: auth.logout,
  };
}

export default useAuth;
