import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
};

const ADMIN_BASE = '/admin';

type AdminAuthContextValue = {
  admin: AdminUser | null | undefined;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AdminUser>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null | undefined>(undefined);

  useEffect(() => {
    // תמיד אימות אמיתי – נתונים מ-Supabase. אין bypass.
    apiFetch<AdminUser>(`${ADMIN_BASE}/auth/me`)
      .then(setAdmin)
      .catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
    if (!admin) return;
    const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
    const id = setInterval(() => {
      apiFetch<AdminUser>(`${ADMIN_BASE}/auth/refresh`, { method: 'POST' })
        .then((u) => setAdmin(u))
        .catch(() => setAdmin(null));
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [admin]);

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    const user = await apiFetch<AdminUser>(`${ADMIN_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe: !!rememberMe }),
    });
    setAdmin(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch(`${ADMIN_BASE}/auth/logout`, { method: 'POST' });
    setAdmin(null);
  }, []);

  const value: AdminAuthContextValue = {
    admin,
    loading: admin === undefined,
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
