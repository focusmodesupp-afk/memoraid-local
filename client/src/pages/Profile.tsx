import React, { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { Link } from 'wouter';
import { User, Mail, Shield, Key, CheckCircle, Brain, ExternalLink } from 'lucide-react';

const CAREGIVING_ROLES: Array<{ id: string; labelHe: string; labelEn: string }> = [
  { id: 'medical_coordinator', labelHe: 'רכז רפואי', labelEn: 'Medical Coordinator' },
  { id: 'financial_coordinator', labelHe: 'רכז פיננסי', labelEn: 'Financial Coordinator' },
  { id: 'daily_caregiver', labelHe: 'מטפל יומיומי', labelEn: 'Daily Caregiver' },
  { id: 'emotional_support', labelHe: 'תומך רגשי', labelEn: 'Emotional Support' },
  { id: 'legal_manager', labelHe: 'מנהל משפטי', labelEn: 'Legal Manager' },
  { id: 'family_coordinator', labelHe: 'מתאם משפחתי', labelEn: 'Family Coordinator' },
];

const INFLUENCE_LABELS: Record<string, { he: string; en: string }> = {
  medical: { he: 'רפואי', en: 'Medical' },
  financial: { he: 'כספי', en: 'Financial' },
  emotional: { he: 'רגשי', en: 'Emotional' },
  daily_life: { he: 'חיי יומיום', en: 'Daily life' },
  housing: { he: 'דיור', en: 'Housing' },
  social: { he: 'חברתי', en: 'Social' },
};

type MemberRoleData = {
  familyRole?: string | null;
  familyRoles?: string[] | null;
  influenceAreas?: string[] | null;
  proximity?: string | null;
};

export default function ProfilePage() {
  const { dir, lang } = useI18n();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [memberRoleData, setMemberRoleData] = useState<MemberRoleData | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setAvatarUrl(user.avatarUrl ?? '');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    apiFetch('/families/me')
      .then((data: any) => {
        const me = (data?.members ?? []).find((m: any) => m.userId === user.id);
        if (me) setMemberRoleData({ familyRole: me.familyRole, familyRoles: me.familyRoles, influenceAreas: me.influenceAreas, proximity: me.proximity });
      })
      .catch(() => {});
  }, [user?.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: fullName.trim() || user?.fullName, avatarUrl: avatarUrl.trim() || null }),
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  const roleLabel =
    lang === 'he'
      ? { manager: 'מנהל/ת משפחה', caregiver: 'מטפל/ת', viewer: 'צופה', guest: 'אורח' }[user?.role ?? 'viewer'] ?? user?.role
      : { manager: 'Family manager', caregiver: 'Caregiver', viewer: 'Viewer', guest: 'Guest' }[user?.role ?? 'viewer'] ?? user?.role;

  const roleColor =
    { manager: 'badge-primary', caregiver: 'badge-success', viewer: 'badge-muted', guest: 'badge-muted' }[user?.role ?? 'viewer'] ?? 'badge-muted';

  const initials = (user?.fullName ?? '').split(/\s+/).map((s) => s[0]).join('').toUpperCase().slice(0, 2);

  const memberRoles = memberRoleData?.familyRoles?.length
    ? memberRoleData.familyRoles
    : (memberRoleData?.familyRole ? [memberRoleData.familyRole] : []);
  const memberScore = (() => {
    if (!memberRoleData) return 0;
    let pts = 0;
    if (memberRoles.length > 0) pts += 3;
    if (memberRoleData.influenceAreas?.length) pts += 2;
    if (memberRoleData.proximity) pts += 1;
    return Math.round((pts / 6) * 100);
  })();

  return (
    <div dir={dir} className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="page-title">{lang === 'he' ? 'הפרופיל שלי' : 'My Profile'}</h1>
        <p className="page-subtitle">{lang === 'he' ? 'פרטים אישיים והגדרות חשבון' : 'Personal details and account settings'}</p>
      </div>

      {/* Identity card */}
      <div className="section-card bg-gradient-to-l from-[hsl(var(--primary))]/5 to-[hsl(var(--card))] flex items-center gap-5 flex-wrap">
        <div className="relative shrink-0">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : initials || <User className="h-8 w-8" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))] truncate">{user?.fullName}</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">{user?.email}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`badge ${roleColor}`}>
              <Shield className="h-3 w-3" />
              {roleLabel}
            </span>
            {user?.familyName && (
              <span className="badge badge-muted">
                {lang === 'he' ? 'משפחת' : 'Family'} {user.familyName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="section-card space-y-4">
          <h3 className="section-title">{lang === 'he' ? 'עריכת פרטים' : 'Edit details'}</h3>

          {error && (
            <div className="rounded-lg bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-lg bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20 px-4 py-3 text-sm text-[hsl(var(--success))] flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {lang === 'he' ? 'השינויים נשמרו בהצלחה' : 'Changes saved successfully'}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-base">{lang === 'he' ? 'שם מלא' : 'Full name'}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-base"
                placeholder={lang === 'he' ? 'שם מלא' : 'Full name'}
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'קישור לתמונת פרופיל' : 'Profile image URL'}</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="input-base"
                placeholder="https://..."
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving
              ? (lang === 'he' ? 'שומר...' : 'Saving...')
              : (lang === 'he' ? 'שמור שינויים' : 'Save changes')}
          </button>
        </div>
      </form>

      {/* Account info (read-only) */}
      <div className="section-card space-y-0">
        <h3 className="section-title mb-3">{lang === 'he' ? 'פרטי חשבון' : 'Account info'}</h3>
        <div className="data-row">
          <span className="data-row-label flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {lang === 'he' ? 'אימייל' : 'Email'}
          </span>
          <span className="data-row-value">{user?.email}</span>
        </div>
        <div className="data-row">
          <span className="data-row-label flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {lang === 'he' ? 'תפקיד' : 'Role'}
          </span>
          <span className="data-row-value">{roleLabel}</span>
        </div>
        {user?.familyName && (
          <div className="data-row">
            <span className="data-row-label">{lang === 'he' ? 'משפחה' : 'Family'}</span>
            <span className="data-row-value">{user.familyName}</span>
          </div>
        )}
      </div>

      {/* Caregiving role section */}
      <div className="section-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[hsl(var(--primary))]" />
            <h3 className="section-title mb-0">{lang === 'he' ? 'תפקיד טיפולי' : 'Caregiving Role'}</h3>
          </div>
          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            memberScore >= 80
              ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]'
              : memberScore >= 40
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
          }`}>
            {memberScore}%
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${memberScore}%`,
              backgroundColor: memberScore >= 80 ? 'hsl(var(--success))' : memberScore >= 40 ? '#f59e0b' : 'hsl(var(--primary))',
            }}
          />
        </div>

        {memberRoles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {memberRoles.map((rid) => {
              const ri = CAREGIVING_ROLES.find((r) => r.id === rid);
              return ri ? (
                <span key={rid} className="rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20 px-2.5 py-1 text-xs font-medium">
                  {lang === 'he' ? ri.labelHe : ri.labelEn}
                </span>
              ) : null;
            })}
          </div>
        ) : (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {lang === 'he' ? 'טרם הוגדר תפקיד טיפולי' : 'No caregiving role assigned yet'}
          </p>
        )}

        {memberRoleData?.influenceAreas && memberRoleData.influenceAreas.length > 0 && (
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1.5">
              {lang === 'he' ? 'תחומי השפעה:' : 'Influence areas:'}
            </p>
            <div className="flex flex-wrap gap-1">
              {memberRoleData.influenceAreas.map((a) => (
                <span key={a} className="text-[10px] rounded border border-[hsl(var(--border))] px-2 py-0.5 text-[hsl(var(--muted-foreground))]">
                  {INFLUENCE_LABELS[a] ? (lang === 'he' ? INFLUENCE_LABELS[a].he : INFLUENCE_LABELS[a].en) : a}
                </span>
              ))}
            </div>
          </div>
        )}

        <Link href="/family">
          <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline cursor-pointer">
            <ExternalLink className="w-3 h-3" />
            {lang === 'he' ? 'עדכן תפקיד בדף המשפחה' : 'Update role on Family page'}
          </span>
        </Link>
      </div>

      {/* Quick links */}
      <div className="section-card">
        <h3 className="section-title mb-3">{lang === 'he' ? 'פעולות חשבון' : 'Account actions'}</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/change-password">
            <span className="btn-outline gap-2">
              <Key className="h-4 w-4" />
              {lang === 'he' ? 'שינוי סיסמא' : 'Change password'}
            </span>
          </Link>
          <Link href="/settings">
            <span className="btn-ghost gap-2">
              {lang === 'he' ? 'הגדרות' : 'Settings'}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
