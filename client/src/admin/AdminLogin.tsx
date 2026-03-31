import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAdminAuth } from './AdminAuthContext';

const REMEMBER_KEY = 'admin_remember_email';
const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSavedEmail(): string {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return '';
    const { email, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(REMEMBER_KEY);
      return '';
    }
    return email ?? '';
  } catch {
    return '';
  }
}

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState(() => getSavedEmail() || 'yoav@memoraid.co');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!getSavedEmail());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/admin/health/tables', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({})))
      .then((d: { ok?: boolean; fix?: string; error?: string }) => {
        if (d?.ok) setDbOk(true);
        else {
          setDbOk(false);
          setTableError(d?.fix || d?.error || 'שגיאה במסד הנתונים');
        }
      })
      .catch(() => {
        setDbOk(false);
        setTableError('השרת לא מגיב – ודא ש-npm run dev רץ והשרת על פורט 3001');
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, expiresAt: Date.now() + REMEMBER_TTL_MS }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const redirect = params.get('redirect');
      const target = redirect && redirect.startsWith('/admin') ? redirect : '/admin';
      navigate(target);
    } catch (err: any) {
      const msg = err?.message ?? 'Login failed';
      const friendly = /fetch|network|failed to fetch/i.test(msg)
        ? 'השרת לא מגיב – ודא ש-npm run dev רץ'
        : msg;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white"
    >
      <div className="w-full max-w-sm p-8 rounded-xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-600 shadow-2xl backdrop-blur-sm">
        <h1 className="text-xl font-bold mb-1">MemorAid Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">מרכז ניהול מערכת</p>

        {tableError && (
          <div className="rounded-lg bg-amber-500/20 border border-amber-500/50 px-3 py-3 mb-4">
            <p className="text-sm text-amber-200 font-medium">
              {dbOk === false && tableError.includes('לא מגיב')
                ? 'השרת לא זמין'
                : 'בעיה במסד הנתונים'}
            </p>
            <p className="text-xs text-amber-300/90 mt-1 font-mono break-all">{tableError}</p>
            {dbOk === false && (
              <p className="text-xs text-amber-300/80 mt-2">
                הרץ: npm run fix:login
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="yoav@memoraid.co"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">סיסמה</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pl-10 rounded-lg bg-slate-100 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 left-2 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <input
              id="admin-remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
            <label htmlFor="admin-remember" className="text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              זכור אותי ל-30 יום
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/20 border border-red-500/50 px-3 py-2">
              <p className="text-sm text-red-300 font-medium">{error}</p>
              {(error.includes('missing') || error.includes('Admin tables') || error.includes('Internal Server Error') || error.includes('500')) && (
                <p className="text-xs text-red-400/80 mt-1 font-mono">הרץ: npm run fix:login</p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium shadow-md disabled:opacity-50 transition-colors"
          >
            {loading ? 'נכנס...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}
