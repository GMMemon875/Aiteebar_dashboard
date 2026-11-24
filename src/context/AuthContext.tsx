import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  apiService,
  BackendUnavailableError,
  clearInMemoryTokens,
  isDemoMode,
  setDemoMode,
} from '../services/api';
import type { SystemHealth, User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  demoActive: boolean;
  backendOnline: boolean;
  health: SystemHealth | null;
  connectionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  enableDemoMode: () => Promise<void>;
  disableDemoMode: () => Promise<void>;
  refreshHealth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [demoActive, setDemoActive] = useState<boolean>(isDemoMode());
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      const h = await apiService.checkHealth();
      setHealth(h);
      setBackendOnline(h.status !== 'offline');
      setConnectionError(null);
    } catch (err) {
      setBackendOnline(false);
      setHealth(null);
      if (err instanceof BackendUnavailableError) {
        setConnectionError(err.message);
      } else {
        setConnectionError('Unable to verify backend health.');
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshHealth();
      if (active) setLoading(false);
    })();
    const timer = window.setInterval(refreshHealth, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshHealth]);

  const login = useCallback(async (email: string, password: string) => {
    setConnectionError(null);
    const res = await apiService.login(email, password);
    setUser(res.user);
    await refreshHealth();
  }, [refreshHealth]);

  const logout = useCallback(() => {
    clearInMemoryTokens();
    setDemoMode(false);
    setDemoActive(false);
    setUser(null);
  }, []);

  const enableDemoMode = useCallback(async () => {
    setDemoMode(true);
    setDemoActive(true);
    const res = await apiService.login('admin@aiteebar.local', 'demo');
    setUser(res.user);
    await refreshHealth();
  }, [refreshHealth]);

  const disableDemoMode = useCallback(async () => {
    clearInMemoryTokens();
    setDemoMode(false);
    setDemoActive(false);
    setUser(null);
    await refreshHealth();
  }, [refreshHealth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        demoActive,
        backendOnline,
        health,
        connectionError,
        login,
        logout,
        enableDemoMode,
        disableDemoMode,
        refreshHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
