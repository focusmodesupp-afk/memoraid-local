import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import { Bell, Settings, MessageCircle, Mail, MessageSquare, Smartphone } from 'lucide-react';

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationPrefs = {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  minSeverity: string;
  updatedAt: string;
};

const SEVERITY_OPTIONS_HE = [
  { value: 'info', label: 'מידע (הכל)' },
  { value: 'warning', label: 'אזהרה' },
  { value: 'critical', label: 'קריטי' },
];
const SEVERITY_OPTIONS_EN = [
  { value: 'info', label: 'Info (All)' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export default function NotificationsPage() {
  const { dir, lang } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState<'alerts' | 'settings'>('alerts');
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<Notification[]>('/notifications');
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    setPrefsLoading(true);
    try {
      const data = await apiFetch<NotificationPrefs>('/notifications/preferences');
      setPrefs(data);
    } catch {
      setPrefs(null);
    } finally {
      setPrefsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (tab === 'settings') loadPrefs();
  }, [tab, loadPrefs]);

  async function markRead(id: string) {
    try {
      await apiFetch('/notifications/' + id + '/read', { method: 'PATCH' });
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch {}
  }

  async function markAllRead() {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      setList((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {}
  }

  async function updatePrefs(partial: Partial<NotificationPrefs>) {
    if (!prefs) return;
    setPrefsSaving(true);
    try {
      const updated = await apiFetch<NotificationPrefs>('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(partial),
      });
      setPrefs(updated);
    } finally {
      setPrefsSaving(false);
    }
  }

  const filteredList = list.filter((n) => {
    if (unreadOnly && n.readAt) return false;
    if (severityFilter !== 'all' && n.type !== severityFilter) return false;
    return true;
  });

  const unreadCount = list.filter((n) => !n.readAt).length;
  const severityOptions = lang === 'he' ? SEVERITY_OPTIONS_HE : SEVERITY_OPTIONS_EN;

  return (
    <div dir={dir} className="space-y-6">
      <PageHeader
        title={lang === 'he' ? 'מרכז התראות' : 'Notification Center'}
        subtitle={`${lang === 'he' ? 'ניהול התראות עבור' : 'Manage notifications for'} ${user?.fullName ?? ''}`}
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] w-fit">
        <button
          type="button"
          data-testid="tab-notifications"
          onClick={() => setTab('alerts')}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'alerts'
              ? 'bg-[hsl(var(--background))] text-[hsl(var(--primary))] shadow-sm'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
          }`}
        >
          <Bell className="w-4 h-4" />
          {lang === 'he' ? 'התראות' : 'Notifications'}
          {unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] rounded-full bg-[hsl(var(--destructive))] text-[10px] font-bold text-white flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'settings'
              ? 'bg-[hsl(var(--background))] text-[hsl(var(--primary))] shadow-sm'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
          }`}
        >
          <Settings className="w-4 h-4" />
          {lang === 'he' ? 'הגדרות' : 'Settings'}
        </button>
      </div>

      {tab === 'alerts' && (
        <>
          {/* Filter + mark all */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <div className={`flex flex-wrap items-center justify-between gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex flex-wrap items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(e) => setUnreadOnly(e.target.checked)}
                    className="rounded border-[hsl(var(--border))]"
                  />
                  <span className="text-sm text-[hsl(var(--foreground))]">
                    {lang === 'he' ? 'הצג רק לא נקראו' : 'Show unread only'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {lang === 'he' ? 'חומרה:' : 'Severity:'}
                  </span>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
                  >
                    <option value="all">{lang === 'he' ? 'הכל' : 'All'}</option>
                    {severityOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  data-testid="button-mark-all-read"
                  onClick={markAllRead}
                  className="btn-outline text-sm h-8 px-3"
                >
                  {lang === 'he' ? 'סמן הכל כנקרא' : 'Mark all read'}
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] min-h-[280px] flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-50" />
                </div>
                <p className="font-medium text-[hsl(var(--foreground))] mb-1">
                  {lang === 'he' ? 'אין התראות להצגה' : 'No notifications to display'}
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'התראות חדשות יופיעו כאן' : 'New notifications will appear here'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {filteredList.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 ${!n.readAt ? 'bg-[hsl(var(--primary))]/5' : ''}`}
                  >
                    <div className={`flex items-start justify-between gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-start gap-2 min-w-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        {!n.readAt && (
                          <span className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] shrink-0 mt-1.5" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-[hsl(var(--foreground))]">{n.title}</p>
                          {n.body && (
                            <p className="text-sm mt-0.5 text-[hsl(var(--muted-foreground))]">{n.body}</p>
                          )}
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                            {new Date(n.createdAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                      {!n.readAt && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="shrink-0 text-xs font-medium text-[hsl(var(--primary))] hover:underline"
                        >
                          {lang === 'he' ? 'סמן כנקרא' : 'Mark read'}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {tab === 'settings' && (
        <div className="space-y-6">
          {prefsLoading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
          ) : prefs ? (
            <>
              {/* ערוצי התראות */}
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
                <div className={`flex items-center gap-2 mb-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <MessageCircle className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {lang === 'he' ? 'ערוצי התראות' : 'Notification channels'}
                  </h2>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {lang === 'he' ? 'בחר באילו ערוצים תרצה לקבל התראות' : 'Choose which channels you want to receive notifications on'}
                </p>
                <div className="space-y-4">
                  {[
                    { key: 'pushEnabled' as const, icon: Bell, title: lang === 'he' ? 'Push' : 'Push notifications', desc: lang === 'he' ? 'קבל התראות ישירות לדפדפן' : 'Receive notifications in the browser' },
                    { key: 'emailEnabled' as const, icon: Mail, title: lang === 'he' ? 'אימייל' : 'Email', desc: lang === 'he' ? 'קבל סיכום התראות למייל' : 'Receive a summary by email' },
                    { key: 'whatsappEnabled' as const, icon: MessageSquare, title: 'WhatsApp', desc: lang === 'he' ? 'קבל התראות דחופות בוואטסאפ' : 'Receive urgent notifications via WhatsApp' },
                    { key: 'smsEnabled' as const, icon: Smartphone, title: 'SMS', desc: lang === 'he' ? 'קבל התראות קריטיות ב-SMS' : 'Receive critical notifications via SMS' },
                  ].map(({ key, icon: Icon, title, desc }) => (
                    <div key={key} className={`flex items-center justify-between gap-4 py-2 border-b border-[hsl(var(--border))] last:border-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-3 min-w-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Icon className="w-5 h-5 text-[hsl(var(--muted-foreground))] shrink-0" />
                        <div>
                          <p className="font-medium text-[hsl(var(--foreground))]">{title}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{desc}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={prefs[key]}
                        onClick={() => updatePrefs({ [key]: !prefs[key] })}
                        disabled={prefsSaving}
                        aria-label={title}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${prefs[key] ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'}`}
                      >
                        <span
                          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                          style={dir === 'rtl' ? { right: prefs[key] ? '0.25rem' : '1.25rem' } : { left: prefs[key] ? '1.25rem' : '0.25rem' }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* שעות שקט */}
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
                  {lang === 'he' ? 'שעות שקט' : 'Quiet hours'}
                </h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {lang === 'he' ? 'לא לשלוח התראות בשעות אלו (למעט קריטיות)' : 'Do not send notifications during these hours (except critical)'}
                </p>
                <div className={`flex items-center justify-between gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {lang === 'he' ? 'הפעל שעות שקט' : 'Enable quiet hours'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs.quietHoursEnabled}
                    onClick={() => updatePrefs({ quietHoursEnabled: !prefs.quietHoursEnabled })}
                    disabled={prefsSaving}
                    aria-label={lang === 'he' ? 'שעות שקט' : 'Quiet hours'}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${prefs.quietHoursEnabled ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'}`}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={dir === 'rtl' ? { right: prefs.quietHoursEnabled ? '0.25rem' : '1.25rem' } : { left: prefs.quietHoursEnabled ? '1.25rem' : '0.25rem' }}
                    />
                  </button>
                </div>
              </div>

              {/* סף חומרה */}
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
                  {lang === 'he' ? 'סף חומרה מינימלי' : 'Minimum severity threshold'}
                </h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {lang === 'he' ? 'קבל התראות רק מרמה זו ומעלה' : 'Only receive notifications from this level and above'}
                </p>
                <select
                  value={prefs.minSeverity}
                  onChange={(e) => updatePrefs({ minSeverity: e.target.value })}
                  className="w-full max-w-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[hsl(var(--foreground))]"
                >
                  {severityOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
