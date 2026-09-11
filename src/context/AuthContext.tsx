import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as authApi from '@/api/auth';
import { onUnauthorized } from '@/api/client';
import { clearStoredTokens, getStoredTokens, setStoredTokens } from '@/utils/storage';

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      const { accessToken } = await getStoredTokens();
      setIsAuthenticated(!!accessToken);
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    return onUnauthorized(() => setIsAuthenticated(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await setStoredTokens(res.accessToken, res.refreshToken);
    setIsAuthenticated(true);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    // Signup creates an auto-confirmed account but returns no session itself.
    await authApi.signup(email, password);
    const res = await authApi.login(email, password);
    await setStoredTokens(res.accessToken, res.refreshToken);
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort — clear local session regardless of server result
    }
    await clearStoredTokens();
    setIsAuthenticated(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isLoading, isAuthenticated, signIn, signUp, signOut }),
    [isLoading, isAuthenticated, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
