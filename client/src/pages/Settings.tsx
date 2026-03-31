import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import {
  User,
  Link2,
  Globe,
  Bell,
  MessageCircle,
  Pill,
  Droplets,
  Calendar,
  CalendarCheck,
  TestTube,
  ChevronDown,
  Search,
  RefreshCw,
} from 'lucide-react';

type UserSettings = {
  userId: string;
  darkMode: boolean;
  weightUnit: string;
  volumeUnit: string;
  prescriptionReminder: boolean;
  missedDoseAlert: boolean;
  abnormalMeasurementsAlert: boolean;
  reminderChannel: string;
  pushChannel: string;
  dndStart: string | null;
  dndEnd: string | null;
  whatsappPhone: string | null;
  whatsappEnabled: boolean;
  whatsappMedication: boolean;
  whatsappVitals: boolean;
  whatsappDrink: boolean;
  whatsappAppointments: boolean;
  updatedAt: string;
};

function getTimezoneOffset(tz: string): string {
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' });
    const parts = formatter.formatToParts(d);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value ?? '';
  } catch {
    return '';
  }
}

function getAllTimezones(): { value: string; label: string }[] {
  const raw: string[] =
    typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
      ? (Intl as any).supportedValuesOf('timeZone')
      : [
          'Asia/Jerusalem',
          'UTC',
          'Europe/London',
          'Europe/Paris',
          'America/New_York',
          'America/Los_Angeles',
          'America/Chicago',
          'Australia/Sydney',
        ];
  return raw
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((value) => {
      const offset = getTimezoneOffset(value);
      const label = offset ? `${value} (${offset})` : value;
      return { value, label };
    });
}

const TIMEZONE_LIST = getAllTimezones();

const WEIGHT_OPTIONS = [
  { value: 'kg', labelHe: '(kg) קילוגרם', labelEn: 'Kilogram (kg)' },
  { value: 'lb', labelHe: '(lb) פאונד', labelEn: 'Pound (lb)' },
];

const VOLUME_OPTIONS = [
  { value: 'ml', labelHe: '(ml) מיליליטר', labelEn: 'Milliliter (ml)' },
  { value: 'L', labelHe: '(L) ליטר', labelEn: 'Liter (L)' },
];

function Toggle({
  checked,
  onToggle,
  disabled,
  dir,
}: {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  dir: 'rtl' | 'ltr';
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
      }`}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={dir === 'rtl' ? { right: checked ? '0.25rem' : '1.25rem' } : { left: checked ? '1.25rem' : '0.25rem' }}
      />
    </button>
  );
}

function TimezonePicker({
  value,
  onChange,
  dir,
  lang,
}: {
  value: string;
  onChange: (tz: string) => void;
  dir: 'rtl' | 'ltr';
  lang: 'he' | 'en';
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const displayValue = TIMEZONE_LIST.find((t) => t.value === value)?.label ?? value;
  const filtered = filter.trim()
    ? TIMEZONE_LIST.filter(
        (t) =>
          t.value.toLowerCase().includes(filter.toLowerCase()) ||
          t.label.toLowerCase().includes(filter.toLowerCase())
      )
    : TIMEZONE_LIST;

  return (
    <div className="relative" ref={containerRef} dir="ltr">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))] text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg overflow-hidden"
          style={dir === 'rtl' ? { right: 0 } : { left: 0 }}
        >
          <div className="p-2 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5">
              <Search className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={lang === 'he' ? 'חפש אזור זמן...' : 'Search time zone...'}
                className="flex-1 min-w-0 bg-transparent text-sm text-[hsl(var(--foreground))] outline-none"
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="py-4 px-3 text-sm text-[hsl(var(--muted-foreground))] text-center">
                {lang === 'he' ? 'לא נמצאו תוצאות' : 'No results found'}
              </div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    onChange(t.value);
                    setOpen(false);
                    setFilter('');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] focus:bg-[hsl(var(--accent))] focus:outline-none ${
                    t.value === value ? 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] font-medium' : 'text-[hsl(var(--foreground))]'
                  }`}
                >
                  {t.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { dir, lang } = useI18n();
  const { user, refreshUser } = useAuth();
  const [location] = useLocation();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<{ configured: boolean; connected: boolean } | null>(null);
  const [calendarSyncing, setCalendarSyncing] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<UserSettings>('/users/me/settings');
      setSettings(data);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadCalendarStatus = useCallback(async () => {
    try {
      const data = await apiFetch<{ configured: boolean; connected: boolean }>('/integrations/google/status');
      setCalendarStatus(data);
    } catch {
      setCalendarStatus({ configured: false, connected: false });
    }
  }, []);

  useEffect(() => {
    loadCalendarStatus();
  }, [loadCalendarStatus]);

  useEffect(() => {
    const search = location.split('?')[1] || '';
    if (search) {
      const params = new URLSearchParams(search);
      if (params.get('calendar_connected') === '1') {
        setError(null);
        loadCalendarStatus();
        window.history.replaceState(null, '', '/settings');
      }
      if (params.get('calendar_error')) {
        const err = params.get('calendar_error');
        setError(err === 'no_code' ? (lang === 'he' ? 'לא התקבל קוד הרשאה מ-Google' : 'No authorization code from Google') : err === 'oauth_failed' ? (lang === 'he' ? 'שגיאה בחיבור ל-Google' : 'Google connection failed') : String(err));
        window.history.replaceState(null, '', '/settings');
      }
    }
  }, [location, loadCalendarStatus, lang]);

  async function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    if (!settings) return;
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    try {
      await apiFetch('/users/me/settings', { method: 'PATCH', body: JSON.stringify({ [key]: value }) });
    } catch (e: any) {
      setError(e.message ?? 'שגיאה');
    }
  }

  async function saveAll() {
    if (!user || !settings) return;
    setError(null);
    setSaving(true);
    try {
      await apiFetch('/users/me/settings', { method: 'PATCH', body: JSON.stringify(settings) });
      await refreshUser();
    } catch (e: any) {
      setError(e.message ?? (lang === 'he' ? 'שגיאה בשמירה' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  }

  const roleLabel =
    lang === 'he'
      ? { manager: 'מנהל/ת משפחה', caregiver: 'מטפל/ת', viewer: 'צופה', guest: 'אורח' }[user?.role ?? 'viewer'] ?? user?.role
      : user?.role ?? '';

  if (loading || !user) {
    return (
      <div dir={dir} className="text-[hsl(var(--muted-foreground))] text-sm py-8">
        {lang === 'he' ? 'טוען...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div dir={dir} className="pb-24 space-y-6">
      <PageHeader
        title={lang === 'he' ? 'הגדרות' : 'Settings'}
        subtitle={lang === 'he' ? 'ניהול העדפות אישיות והגדרות מערכת' : 'Manage personal preferences and system settings'}
      />

      {error && (
        <div className="mb-4 rounded-lg bg-[hsl(var(--destructive))/0.1)] text-[hsl(var(--destructive))] px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* פרטים אישיים */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[hsl(var(--primary))]" />
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {lang === 'he' ? 'פרטים אישיים' : 'Personal details'}
              </h2>
            </div>
            <Link href="/profile">
              <button
                type="button"
                className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
              >
                {lang === 'he' ? 'עריכה' : 'Edit'}
              </button>
            </Link>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            {lang === 'he' ? 'פרטי המשתמש המחובר' : 'Logged-in user details'}
          </p>
          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-lg font-semibold text-[hsl(var(--muted-foreground))] overflow-hidden shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (user.fullName ?? '')
                  .split(/\s+/)
                  .map((s) => s[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              )}
            </div>
            <div>
              <p className="font-semibold text-[hsl(var(--foreground))]">{user.fullName}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">
              {lang === 'he' ? 'אימייל' : 'Email'}
            </label>
            <p className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] px-3 py-2 text-[hsl(var(--foreground))]">
              {user.email}
            </p>
          </div>
          <UserColorPicker />
        </div>

        {/* קיצורי דרך */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {lang === 'he' ? 'קיצורי דרך' : 'Shortcuts'}
            </h2>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            {lang === 'he' ? 'גישה מהירה לדפים' : 'Quick access to pages'}
          </p>
          <div className="space-y-2">
            <Link href="/patient">
              <button
                type="button"
                className="w-full flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-start hover:bg-[hsl(var(--muted)/0.3)]"
              >
                <User className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {lang === 'he' ? 'פרופיל מטופל' : 'Patient profile'}
                </span>
              </button>
            </Link>
            <Link href="/notifications">
              <button
                type="button"
                className="w-full flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-start hover:bg-[hsl(var(--muted)/0.3)]"
              >
                <Bell className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {lang === 'he' ? 'מרכז התראות' : 'Notification center'}
                </span>
              </button>
            </Link>
          </div>
        </div>

        {/* תצוגה ושפה */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {lang === 'he' ? 'תצוגה ושפה' : 'Display & language'}
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                {lang === 'he' ? 'שפה' : 'Language'}
              </label>
              <select
                value={user.locale ?? 'he'}
                onChange={(e) => {
                  const v = e.target.value as 'he' | 'en';
                  apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ locale: v }) }).then(() => refreshUser());
                }}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
              >
                <option value="he">עברית</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                {lang === 'he' ? 'אזור זמן' : 'Time zone'}
              </label>
              <TimezonePicker
                value={user.timezone ?? 'Asia/Jerusalem'}
                onChange={(v) => {
                  apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ timezone: v }) }).then(() => refreshUser());
                }}
                dir={dir}
                lang={lang}
              />
            </div>
            <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="font-medium text-[hsl(var(--foreground))]">
                  {lang === 'he' ? 'מצב כהה' : 'Dark mode'}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'החלף בין מצב בהיר לכהה' : 'Toggle between light and dark mode'}
                </p>
              </div>
              {settings && (
                <Toggle
                  checked={settings.darkMode}
                  onToggle={() => updateSetting('darkMode', !settings.darkMode)}
                  dir={dir}
                />
              )}
            </div>
          </div>
        </div>

        {/* יחידות מדידה */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            {lang === 'he' ? 'יחידות מדידה' : 'Units of measure'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                {lang === 'he' ? 'משקל' : 'Weight'}
              </label>
              <select
                value={settings?.weightUnit ?? 'kg'}
                onChange={(e) => updateSetting('weightUnit', e.target.value)}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
              >
                {WEIGHT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {lang === 'he' ? o.labelHe : o.labelEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                {lang === 'he' ? 'נפח נוזלים' : 'Liquid volume'}
              </label>
              <select
                value={settings?.volumeUnit ?? 'ml'}
                onChange={(e) => updateSetting('volumeUnit', e.target.value)}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
              >
                {VOLUME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {lang === 'he' ? o.labelHe : o.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* התראות – כרטיס רחב */}
      {settings && (
        <div className="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {lang === 'he' ? 'התראות' : 'Notifications'}
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                key: 'prescriptionReminder' as const,
                titleHe: 'תזכורת למילוי מרשם',
                titleEn: 'Prescription refill reminder',
                descHe: 'התראה כאשר נגמרות תרופות',
                descEn: 'Notification when medicines run out',
              },
              {
                key: 'missedDoseAlert' as const,
                titleHe: 'התראת מנה שהוחסרה',
                titleEn: 'Missed dose notification',
                descHe: 'התראה כאשר דילגו על מנת תרופה',
                descEn: 'Notification when a dose was skipped',
              },
              {
                key: 'abnormalMeasurementsAlert' as const,
                titleHe: 'התראות חריגות במדדים',
                titleEn: 'Abnormal measurement notifications',
                descHe: 'התראה כאשר מדדים חיוניים חריגים',
                descEn: 'Notification when vital signs are abnormal',
              },
            ].map(({ key, titleHe, titleEn, descHe, descEn }) => (
              <div
                key={key}
                className={`flex items-center justify-between gap-4 py-3 border-b border-[hsl(var(--border))] last:border-0 ${
                  dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div>
                  <p className="font-medium text-[hsl(var(--foreground))]">{lang === 'he' ? titleHe : titleEn}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{lang === 'he' ? descHe : descEn}</p>
                </div>
                <Toggle
                  checked={settings[key]}
                  onToggle={() => updateSetting(key, !settings[key])}
                  dir={dir}
                />
              </div>
            ))}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">
                  {lang === 'he' ? 'אל תפריע - התחלה' : 'Do not disturb - Start'}
                </label>
                <input
                  type="time"
                  value={settings.dndStart ?? ''}
                  onChange={(e) => updateSetting('dndStart', e.target.value || null)}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
                />
              </div>
              <div>
                <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">
                  {lang === 'he' ? 'אל תפריע - סיום' : 'Do not disturb - End'}
                </label>
                <input
                  type="time"
                  value={settings.dndEnd ?? ''}
                  onChange={(e) => updateSetting('dndEnd', e.target.value || null)}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* הגדרות WhatsApp */}
      {settings && (
        <div className="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {lang === 'he' ? 'הגדרות WhatsApp' : 'WhatsApp settings'}
            </h2>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            {lang === 'he'
              ? 'קבלו התראות ותזכורות ישירות ל-WhatsApp'
              : 'Receive notifications and reminders directly to WhatsApp'}
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="font-mono text-[hsl(var(--foreground))]">
              {settings.whatsappPhone ?? '+972509666936'}
            </span>
            {settings.whatsappEnabled && (
              <span className="rounded-full bg-[hsl(var(--primary))/0.2)] text-[hsl(var(--primary))] px-2 py-0.5 text-xs font-medium">
                {lang === 'he' ? 'פעיל' : 'Active'}
              </span>
            )}
          </div>
          {settings.whatsappEnabled && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {lang === 'he' ? 'WhatsApp מופעל/ת ותקבל/י התראות על:' : 'WhatsApp is enabled. You will receive notifications for:'}
            </p>
          )}
          {settings.whatsappEnabled && (
            <div className="space-y-2 mb-4">
              {[
                { key: 'whatsappMedication' as const, icon: Pill, labelHe: 'תזכורות לתרופות', labelEn: 'Medication reminders' },
                { key: 'whatsappVitals' as const, icon: TestTube, labelHe: 'מדידות סימנים חיוניים', labelEn: 'Vital signs measurements' },
                { key: 'whatsappDrink' as const, icon: Droplets, labelHe: 'תזכורות לשתייה', labelEn: 'Drink reminders' },
                { key: 'whatsappAppointments' as const, icon: Calendar, labelHe: 'תורים רפואיים', labelEn: 'Medical appointments' },
              ].map(({ key, icon: Icon, labelHe, labelEn }) => (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm text-[hsl(var(--foreground))]">{lang === 'he' ? labelHe : labelEn}</span>
                  </div>
                  <Toggle checked={settings[key]} onToggle={() => updateSetting(key, !settings[key])} dir={dir} />
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateSetting('whatsappEnabled', !settings.whatsappEnabled)}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.3)]"
            >
              {settings.whatsappEnabled
                ? (lang === 'he' ? 'השבת WhatsApp' : 'Disable WhatsApp')
                : (lang === 'he' ? 'הפעל WhatsApp' : 'Enable WhatsApp')}
            </button>
            {settings.whatsappEnabled && (
              <button
                type="button"
                className="rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                {lang === 'he' ? 'שלח הודעת בדיקה' : 'Send test message'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* חיבור Google Calendar */}
      <div className="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-[hsl(var(--primary))]" />
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {lang === 'he' ? 'חיבור יומן Google' : 'Google Calendar'}
          </h2>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          {lang === 'he'
            ? 'סנכרן משימות עם תאריך יעד ליומן Google שלך'
            : 'Sync tasks with due dates to your Google Calendar'}
        </p>
        <div className="space-y-3">
          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
            {calendarStatus?.connected ? (
                <span className="flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.2)] text-[hsl(var(--primary))] px-3 py-1 text-sm font-medium">
                  <CalendarCheck className="w-4 h-4" />
                  {lang === 'he' ? 'מחובר' : 'Connected'}
                </span>
            ) : (
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                {lang === 'he' ? 'לא מחובר' : 'Not connected'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {calendarStatus && !calendarStatus.configured && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] w-full mb-1">
                {lang === 'he' ? 'אינטגרציה זו טרם הוגדרה בשרת.' : 'This integration is not configured on the server.'}
              </p>
            )}
            {calendarStatus?.connected ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await apiFetch('/integrations/google/disconnect', { method: 'POST' });
                        loadCalendarStatus();
                      } catch (e: any) {
                        setError(e?.message ?? 'Failed');
                      }
                    }}
                    className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.3)]"
                  >
                    {lang === 'he' ? 'נתק' : 'Disconnect'}
                  </button>
                  <button
                    type="button"
                    disabled={calendarSyncing}
                    onClick={async () => {
                      setCalendarSyncing(true);
                      try {
                        await apiFetch<{ synced: number; errors: number }>('/integrations/google/sync', { method: 'POST' });
                        loadCalendarStatus();
                      } catch (e: any) {
                        setError(e?.message ?? 'Sync failed');
                      } finally {
                        setCalendarSyncing(false);
                      }
                    }}
                    className="rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${calendarSyncing ? 'animate-spin' : ''}`} />
                    {calendarSyncing ? (lang === 'he' ? 'מסנכרן...' : 'Syncing...') : lang === 'he' ? 'סנכרן עכשיו' : 'Sync now'}
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/api/integrations/google/oauth/start"
                    className="rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-2 text-sm font-medium hover:opacity-90 inline-flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    {lang === 'he' ? 'חבר Google Calendar' : 'Connect Google Calendar'}
                  </a>
                  <button
                    type="button"
                    onClick={() => loadCalendarStatus()}
                    className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.3)] inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {lang === 'he' ? 'רענן סטטוס' : 'Refresh status'}
                  </button>
                </>
              )}
          </div>
        </div>
      </div>

      {/* כפתור שמור הגדרות */}
      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-8 py-3 text-base font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (lang === 'he' ? 'שומר...' : 'Saving...') : lang === 'he' ? 'שמור הגדרות' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

// ── User Color Picker ──────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#64748b', '#a16207',
];

function UserColorPicker() {
  const [color, setColor] = useState('#6366f1');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ userColor?: string }>('/auth/me').then((u) => {
      if ((u as any)?.userColor) setColor((u as any).userColor);
    }).catch(() => {});
  }, []);

  async function save(c: string) {
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch('/users/me/color', { method: 'PATCH', body: JSON.stringify({ color: c }) });
      setColor(c);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignored */ } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-2">
        צבע זיהוי אישי (מוצג על קארטי משימות)
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => save(c)}
            disabled={saving}
            className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-[hsl(var(--foreground))] scale-110' : ''}`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onBlur={(e) => save(e.target.value)}
          className="w-7 h-7 rounded-full border-0 cursor-pointer p-0"
          title="צבע מותאם אישית"
        />
      </div>
      {saved && <p className="text-xs text-green-600 mt-1">הצבע עודכן!</p>}
    </div>
  );
}
