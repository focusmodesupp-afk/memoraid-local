import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  familyId: string;
  primaryFamilyId?: string | null;
  effectiveFamilyId?: string;
  familyName?: string | null;
  families?: { id: string; familyName: string }[];
  avatarUrl?: string | null;
  timezone?: string | null;
  locale?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<AuthUser | undefined>;
  register: (
    input:
      | { mode: 'create'; familyName: string; fullName: string; email: string; password: string }
      | { mode: 'join'; inviteCode: string; fullName: string; email: string; password: string },
  ) => Promise<AuthUser>;
  login: (input: { email: string; password: string; rememberMe?: boolean }) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single initialization – one request for the entire app lifetime
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await apiFetch<AuthUser>('/auth/me');
        if (!cancelled) {
          setUser(u);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function refreshUser() {
    try {
      const u = await apiFetch<AuthUser>('/auth/me');
      setUser(u);
      setError(null);
      return u;
    } catch {
      setUser(null);
      return undefined;
    }
  }

  async function register(
    input:
      | { mode: 'create'; familyName: string; fullName: string; email: string; password: string }
      | { mode: 'join'; inviteCode: string; fullName: string; email: string; password: string },
  ) {
    setLoading(true);
    setError(null);
    try {
      const u = await apiFetch<AuthUser>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setUser(u);
      setLoading(false);
      return u;
    } catch (err: any) {
      setLoading(false);
      setError(err.message ?? 'שגיאת הרשמה');
      throw err;
    }
  }

  async function login(input: { email: string; password: string; rememberMe?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ id: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      const u = await apiFetch<AuthUser>('/auth/me');
      setUser(u);
      setLoading(false);
      return u;
    } catch (err: any) {
      setLoading(false);
      setError(err.message ?? 'שגיאת התחברות');
      throw err;
    }
  }

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
      if (typeof window !== 'undefined') localStorage.removeItem('mr_active_family');
      setUser(null);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message ?? 'שגיאת התנתקות');
      throw err;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, refreshUser, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
