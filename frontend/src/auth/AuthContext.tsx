import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '../lib/api';

export interface AuthUser {
  user_id: string;
  primary_email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  locale: string;
  timezone: string;
}

interface AuthResponse {
  user: AuthUser;
  csrf_token: string;
}

interface SessionResponse {
  user: AuthUser | null;
  authenticated: boolean;
}

interface Credentials {
  email: string;
  password: string;
  display_name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  refreshMe: () => Promise<void>;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected authentication error';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await apiFetch<SessionResponse>('/api/auth/me');
      setUser(session.user);
      setError(null);
    } catch {
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (credentials: Credentials) => {
    setError(null);
    try {
      const response = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      });
      setUser(response.user);
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      throw caught;
    }
  }, []);

  const register = useCallback(async (credentials: Credentials) => {
    setError(null);
    try {
      const response = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          display_name: credentials.display_name ?? credentials.email.split('@')[0],
        }),
      });
      setUser(response.user);
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      throw caught;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    await apiFetch<void>('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    setError(null);
    try {
      await apiFetch<void>('/api/auth/account', { method: 'DELETE', body: JSON.stringify({ confirmation: 'ELIMINAR' }) });
      setUser(null);
    } catch (caught) {
      const message = errorMessage(caught); setError(message); throw caught;
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, error, refreshMe, login, register, logout, deleteAccount }),
    [user, isLoading, error, refreshMe, login, register, logout, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
