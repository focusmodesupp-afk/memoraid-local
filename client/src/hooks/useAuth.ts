import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  familyId: string;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // טוען את המשתמש המחובר אם יש סשן
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await apiFetch<AuthUser>('/auth/me');
        if (!cancelled) {
          setState({ user, loading: false, error: null });
        }
      } catch {
        if (!cancelled) {
          setState({ user: null, loading: false, error: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function register(
    input:
      | {
          mode: 'create';
          familyName: string;
          fullName: string;
          email: string;
          password: string;
        }
      | {
          mode: 'join';
          inviteCode: string;
          fullName: string;
          email: string;
          password: string;
        },
  ) {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const user = await apiFetch<AuthUser>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setState({ user, loading: false, error: null });
      return user;
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message ?? 'שגיאת הרשמה' }));
      throw err;
    }
  }

  async function login(input: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const user = await apiFetch<AuthUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setState({ user, loading: false, error: null });
      return user;
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message ?? 'שגיאת התחברות' }));
      throw err;
    }
  }

  async function logout() {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
      setState({ user: null, loading: false, error: null });
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message ?? 'שגיאת התנתקות' }));
      throw err;
    }
  }

  return {
    ...state,
    register,
    login,
    logout,
  };
}

