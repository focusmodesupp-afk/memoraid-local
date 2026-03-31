import { FormEvent, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setError('קישור לא תקין. אנא בקש קישור חדש.');
      setValidating(false);
      return;
    }
    setToken(t);
    validateToken(t);
  }, []);

  async function validateToken(t: string) {
    try {
      await apiFetch(`/auth/validate-reset-token?token=${encodeURIComponent(t)}`);
      setTokenValid(true);
    } catch (err: any) {
      setError(err.message || 'הקישור פג תוקף או לא תקין. אנא בקש קישור חדש.');
      setTokenValid(false);
    } finally {
      setValidating(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    setLoading(true);

    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'שגיאה באיפוס הסיסמה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(var(--primary))/0.16] to-[hsl(var(--background))]"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))] mx-auto mb-4"></div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">מאמת קישור...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(var(--primary))/0.16] to-[hsl(var(--background))]"
      >
        <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold mb-2 text-[hsl(var(--foreground))]">
            קישור לא תקין
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            {error}
          </p>
          <Link href="/forgot-password">
            <a className="inline-block px-4 py-2 rounded-md bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90">
              בקש קישור חדש
            </a>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(var(--primary))/0.16] to-[hsl(var(--background))]"
      >
        <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-semibold mb-2 text-[hsl(var(--foreground))]">
            הסיסמה שונתה בהצלחה!
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            עכשיו אתה יכול להתחבר עם הסיסמה החדשה.
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            מעביר אותך לדף הכניסה...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(var(--primary))/0.16] to-[hsl(var(--background))]"
    >
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary))]/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-[hsl(var(--primary))]" />
        </div>
        <h1 className="text-xl font-semibold mb-2 text-[hsl(var(--foreground))] text-center">
          איפוס סיסמה
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 text-center">
          הזן סיסמה חדשה לחשבון שלך.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">
              סיסמה חדשה
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="לפחות 6 תווים"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">
              אימות סיסמה
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="הזן שוב את הסיסמה"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[hsl(var(--primary))] text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'מאפס סיסמה...' : 'אפס סיסמה'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login">
            <a className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              חזרה לכניסה
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
