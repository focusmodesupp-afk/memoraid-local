import { FormEvent, useState } from 'react';
import { Link } from 'wouter';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'שגיאה בשליחת המייל. נסה שוב.');
    } finally {
      setLoading(false);
    }
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
            המייל נשלח בהצלחה!
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            שלחנו לך קישור לאיפוס סיסמה לכתובת <strong>{email}</strong>
            <br />
            בדוק את תיבת הדואר שלך (כולל ספאם).
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6">
            הקישור תקף ל-1 שעה.
          </p>
          <Link href="/login">
            <a className="inline-flex items-center gap-2 text-sm text-[hsl(var(--primary))] hover:underline">
              <ArrowRight className="w-4 h-4" />
              חזרה לכניסה
            </a>
          </Link>
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
          <Mail className="w-6 h-6 text-[hsl(var(--primary))]" />
        </div>
        <h1 className="text-xl font-semibold mb-2 text-[hsl(var(--foreground))] text-center">
          שכחת סיסמה?
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 text-center">
          הזן את כתובת המייל שלך ונשלח לך קישור לאיפוס הסיסמה.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">
              אימייל
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
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
            {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login">
            <a className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              <ArrowRight className="w-4 h-4" />
              חזרה לכניסה
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
