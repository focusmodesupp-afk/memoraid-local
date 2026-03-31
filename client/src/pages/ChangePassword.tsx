import React, { FormEvent, useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { Key } from 'lucide-react';

export default function ChangePasswordPage() {
  const { dir, lang } = useI18n();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError(lang === 'he' ? 'הסיסמה החדשה והאישור אינן תואמות.' : 'New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError(lang === 'he' ? 'סיסמה חדשה חייבת 6 תווים לפחות.' : 'New password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message ?? (lang === 'he' ? 'שגיאה בשינוי סיסמה' : 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div dir={dir} className="max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6 flex items-center gap-2">
        <Key className="w-5 h-5" />
        {lang === 'he' ? 'שינוי סיסמה' : 'Change Password'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.1)] rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-[hsl(var(--success))] bg-[hsl(var(--success))/0.1)] rounded-lg px-3 py-2">
            {lang === 'he' ? 'הסיסמה עודכנה בהצלחה.' : 'Password updated successfully.'}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
            {lang === 'he' ? 'סיסמה נוכחית' : 'Current password'}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
            {lang === 'he' ? 'סיסמה חדשה' : 'New password'}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
            {lang === 'he' ? 'אישור סיסמה חדשה' : 'Confirm new password'}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-2 font-medium disabled:opacity-50"
        >
          {saving ? (lang === 'he' ? 'מעדכן...' : 'Updating...') : lang === 'he' ? 'עדכן סיסמה' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
