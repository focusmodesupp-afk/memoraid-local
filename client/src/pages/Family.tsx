import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { Users, Copy, RefreshCw, Shield, Eye, Edit3, Plus, X, MessageCircle, Mail, Brain, ChevronDown, Palette } from 'lucide-react';
import { FamilyPermissionsPanel } from '../components/FamilyPermissionsPanel';
import { FamilyHierarchyMap } from '../components/FamilyHierarchyMap';
import { PageHeader } from '../components/ui';
import { USER_COLOR_PALETTE } from '../../../shared/constants/userColors';

type FamilyMember = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  memberTier?: string;
  permissions: string[];
  joinedAt: string;
  familyRole?: string | null;
  familyRoles?: string[] | null;
  influenceAreas?: string[] | null;
  proximity?: string | null;
  availability?: { days?: string[]; notes?: string } | null;
  userColor?: string | null;
};

const CAREGIVING_ROLES: Array<{ id: string; labelHe: string; labelEn: string; descHe: string; descEn: string }> = [
  { id: 'medical_coordinator', labelHe: 'רכז רפואי', labelEn: 'Medical Coordinator', descHe: 'תורים, בדיקות, תוצאות, רופאים', descEn: 'Appointments, tests, results, doctors' },
  { id: 'financial_coordinator', labelHe: 'רכז פיננסי', labelEn: 'Financial Coordinator', descHe: 'חשבונות, ביטוחים, קצבאות, נכסים', descEn: 'Accounts, insurance, benefits, assets' },
  { id: 'daily_caregiver', labelHe: 'מטפל יומיומי', labelEn: 'Daily Caregiver', descHe: 'תרופות, שגרה, בטיחות, ארוחות', descEn: 'Medications, routine, safety, meals' },
  { id: 'emotional_support', labelHe: 'תומך רגשי', labelEn: 'Emotional Support', descHe: 'שיחות, מצב רוח, חברה', descEn: 'Conversations, mood, companionship' },
  { id: 'legal_manager', labelHe: 'מנהל משפטי', labelEn: 'Legal Manager', descHe: 'ייפוי כוח, צוואה, חוזים', descEn: 'Power of attorney, will, contracts' },
  { id: 'family_coordinator', labelHe: 'מתאם משפחתי', labelEn: 'Family Coordinator', descHe: 'תקשורת, ישיבות, תיאום כולל', descEn: 'Communication, meetings, coordination' },
];

const INFLUENCE_AREAS: Array<{ id: string; labelHe: string; labelEn: string }> = [
  { id: 'medical', labelHe: 'רפואי / בריאות', labelEn: 'Medical / Health' },
  { id: 'financial', labelHe: 'כספי / פיננסי', labelEn: 'Financial' },
  { id: 'emotional', labelHe: 'רגשי / נפשי', labelEn: 'Emotional' },
  { id: 'daily_life', labelHe: 'חיי יומיום', labelEn: 'Daily life' },
  { id: 'housing', labelHe: 'דיור / מגורים', labelEn: 'Housing' },
  { id: 'social', labelHe: 'חברתי / משפחתי', labelEn: 'Social / Family' },
];

type FamilyMemberWithColor = FamilyMember & { userColor?: string | null };

type PrimaryPatient = { id: string; fullName: string; photoUrl?: string | null } | null;

type FamilyData = {
  id: string;
  familyName: string;
  inviteCode: string;
  primaryPatient?: PrimaryPatient;
  members: FamilyMember[];
};

type FamilyInvite = {
  id: string;
  code: string;
  role: string;
  memberTier: string;
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
};

const INVITE_PRESETS: Array<{
  id: string;
  role: string;
  memberTier: string;
  permissions: string[];
  labelHe: string;
  labelEn: string;
}> = [
  {
    id: 'family_full',
    role: 'manager',
    memberTier: 'family',
    permissions: ['view_patient', 'edit_patient', 'view_tasks', 'edit_tasks', 'view_financial', 'edit_financial', 'view_insurance', 'edit_insurance', 'view_documents', 'manage_members'],
    labelHe: 'בן משפחה מלא',
    labelEn: 'Full family member',
  },
  {
    id: 'family_caregiver',
    role: 'caregiver',
    memberTier: 'family',
    permissions: ['view_patient', 'edit_patient', 'view_tasks', 'edit_tasks', 'view_financial', 'view_insurance', 'view_documents'],
    labelHe: 'בן משפחה מטפל',
    labelEn: 'Family caregiver',
  },
  {
    id: 'external_caregiver',
    role: 'caregiver',
    memberTier: 'supporter_friend',
    permissions: ['view_patient', 'view_tasks', 'edit_tasks', 'view_documents'],
    labelHe: 'חבר/מכר תומך',
    labelEn: 'Supporting friend',
  },
  {
    id: 'medical_caregiver',
    role: 'caregiver',
    memberTier: 'supporter_medical',
    permissions: ['view_patient', 'view_tasks', 'edit_tasks', 'view_documents'],
    labelHe: 'מטפל רפואי',
    labelEn: 'Medical caregiver',
  },
  {
    id: 'viewer_only',
    role: 'viewer',
    memberTier: 'supporter_friend',
    permissions: ['view_patient', 'view_tasks', 'view_documents'],
    labelHe: 'צופה בלבד',
    labelEn: 'Viewer only',
  },
];

const DESKTOP_BREAKPOINT = 768;

export default function FamilyPage() {
  const { dir, lang } = useI18n();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newInviteResult, setNewInviteResult] = useState<FamilyInvite | null>(null);
  const [manualShareOpen, setManualShareOpen] = useState(false);
  const [manualShareCode, setManualShareCode] = useState<string | null>(null);
  const [manualShareCopied, setManualShareCopied] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [sendEmailCode, setSendEmailCode] = useState<string | null>(null);
  const [sendEmailPresetLabel, setSendEmailPresetLabel] = useState<string | undefined>();
  const [sendEmailTo, setSendEmailTo] = useState('');
  const [sendEmailLoading, setSendEmailLoading] = useState(false);
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);

  const isManager = user?.role === 'manager';

  const [roleEditingUserId, setRoleEditingUserId] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleFormData, setRoleFormData] = useState<{ familyRoles: string[]; influenceAreas: string[]; proximity: string }>({
    familyRoles: [],
    influenceAreas: [],
    proximity: 'nearby',
  });

  function computeMemberScore(m: FamilyMember): number {
    let pts = 0;
    const roles = m.familyRoles?.length ? m.familyRoles : (m.familyRole ? [m.familyRole] : []);
    if (roles.length > 0) pts += 3;
    if (m.influenceAreas?.length) pts += 2;
    if (m.proximity) pts += 1;
    return Math.round((pts / 6) * 100);
  }

  function openRoleEdit(member: FamilyMember) {
    const roles = member.familyRoles?.length
      ? member.familyRoles
      : (member.familyRole ? [member.familyRole] : []);
    setRoleFormData({
      familyRoles: roles,
      influenceAreas: member.influenceAreas ?? [],
      proximity: member.proximity ?? 'nearby',
    });
    setRoleEditingUserId(member.userId);
  }

  async function saveRole(userId: string) {
    setSavingRole(true);
    try {
      await apiFetch(`/families/me/members/${userId}/caregiving-role`, {
        method: 'PATCH',
        body: JSON.stringify({
          familyRoles: roleFormData.familyRoles.length > 0 ? roleFormData.familyRoles : null,
          influenceAreas: roleFormData.influenceAreas.length > 0 ? roleFormData.influenceAreas : null,
          proximity: roleFormData.proximity || null,
        }),
      });
      setData((d) => {
        if (!d) return d;
        return {
          ...d,
          members: d.members.map((m) =>
            m.userId === userId
              ? {
                  ...m,
                  familyRoles: roleFormData.familyRoles.length > 0 ? roleFormData.familyRoles : null,
                  familyRole: roleFormData.familyRoles[0] ?? null,
                  influenceAreas: roleFormData.influenceAreas,
                  proximity: roleFormData.proximity,
                }
              : m
          ),
        };
      });
      setRoleEditingUserId(null);
    } catch (e: any) {
      setError(e.message ?? (lang === 'he' ? 'שגיאה בשמירת תפקיד' : 'Failed to save role'));
    } finally {
      setSavingRole(false);
    }
  }

  const buildInviteLink = (code: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/login?mode=register&code=${encodeURIComponent(code)}`;

  const buildInviteMessage = (code: string) =>
    lang === 'he'
      ? `היי, הוזמנת להתחבר למערכת ניהול MemorAId.

הנה פרטים להרשמה והתחברות למערכת:
קוד משפחה להרשמה/כניסה: ${code}
לינק להרשמה: ${buildInviteLink(code)}`
      : `Hi, you're invited to join MemorAId.

Here are your registration details:
Family code: ${code}
Registration link: ${buildInviteLink(code)}`;

  const openManualShare = (code: string) => {
    setManualShareCode(code);
    setManualShareOpen(true);
    setManualShareCopied(false);
  };

  const copyManualShareMessage = async () => {
    if (!manualShareCode) return;
    const msg = buildInviteMessage(manualShareCode);
    try {
      await navigator.clipboard.writeText(msg);
      setManualShareCopied(true);
      setTimeout(() => setManualShareCopied(false), 2000);
    } catch {
      setError(lang === 'he' ? 'לא ניתן להעתיק' : 'Copy failed');
    }
  };

  const openSendEmail = (code: string, presetLabel?: string) => {
    setSendEmailCode(code);
    setSendEmailPresetLabel(presetLabel);
    setSendEmailTo('');
    setSendEmailError(null);
    setSendEmailOpen(true);
  };

  const sendInviteByEmail = async () => {
    if (!sendEmailCode || !sendEmailTo.trim()) return;
    setSendEmailLoading(true);
    setSendEmailError(null);
    try {
      const res = await apiFetch<{ ok: boolean; error?: string }>('/families/me/invites/send', {
        method: 'POST',
        body: JSON.stringify({
          to: sendEmailTo.trim(),
          code: sendEmailCode,
          presetLabel: sendEmailPresetLabel,
        }),
      });
      if (res.ok) {
        setSendEmailOpen(false);
        setSendEmailCode(null);
        setSendEmailTo('');
      } else if (res.error === 'no_api_key') {
        setSendEmailError(
          lang === 'he'
            ? 'שליחת מייל תעבוד לאחר הגדרת שירות המייל. בינתיים העתק את ההודעה ושלח ידנית.'
            : 'Email sending will work after configuring the email service. For now, copy the message and send manually.'
        );
      } else {
        setSendEmailError(res.error ?? (lang === 'he' ? 'שגיאה בשליחה' : 'Send failed'));
      }
    } catch (e: any) {
      const body = e?.body;
      if (body?.error === 'no_api_key') {
        setSendEmailError(
          lang === 'he'
            ? 'שליחת מייל תעבוד לאחר הגדרת שירות המייל. בינתיים העתק את ההודעה ושלח ידנית.'
            : 'Email sending will work after configuring the email service. For now, copy the message and send manually.'
        );
      } else {
        setSendEmailError(e?.message ?? (lang === 'he' ? 'שגיאה בשליחה' : 'Send failed'));
      }
    } finally {
      setSendEmailLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<FamilyData>('/families/me');
      setData(res);
    } catch (e: any) {
      setError(e.message ?? 'שגיאה בטעינת המשפחה');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadInvites = useCallback(async () => {
    if (!isManager) return;
    try {
      const list = await apiFetch<FamilyInvite[]>('/families/me/invites');
      setInvites(Array.isArray(list) ? list : []);
    } catch {
      setInvites([]);
    }
  }, [isManager]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const createInvite = async (preset: (typeof INVITE_PRESETS)[0], expiresInDays?: number) => {
    setCreatingInvite(true);
    setNewInviteResult(null);
    try {
      const inv = await apiFetch<FamilyInvite>('/families/me/invites', {
        method: 'POST',
        body: JSON.stringify({
          role: preset.role,
          memberTier: preset.memberTier,
          permissions: preset.permissions,
          expiresInDays: expiresInDays ?? undefined,
        }),
      });
      setNewInviteResult(inv);
      loadInvites();
    } catch (e: any) {
      setError(e.message ?? 'שגיאה');
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setError(lang === 'he' ? 'לא ניתן להעתיק' : 'Copy failed');
    }
  };

  const openPermissions = () => {
    load();
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT;
    if (isDesktop) {
      setPermissionsOpen(true);
    } else {
      navigate('/family/permissions');
    }
  };

  const copyInviteCode = async () => {
    if (!data?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(data.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(lang === 'he' ? 'לא ניתן להעתיק' : 'Copy failed');
    }
  };

  const regenerateInviteCode = async () => {
    if (!isManager) return;
    setRegenerating(true);
    try {
      const { inviteCode } = await apiFetch<{ inviteCode: string }>('/families/me/invite/regenerate', {
        method: 'POST',
      });
      setData((d) => (d ? { ...d, inviteCode } : null));
    } catch (e: any) {
      setError(e.message ?? 'שגיאה ביצירת קוד חדש');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div dir={dir} className="flex items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
        {lang === 'he' ? 'טוען...' : 'Loading...'}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div dir={dir} className="p-6">
        <p className="text-[hsl(var(--destructive))]">{error}</p>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      <PageHeader
        title={lang === 'he' ? 'ניהול משפחה' : 'Family Management'}
        subtitle={lang === 'he' ? 'כאן יוצג פורטל הצוות וההזמנות' : 'Manage your team and invitations'}
      />

      {error && (
        <div
          className="mb-4 px-4 py-2 rounded-lg bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* קוד הזמנה */}
      <section className="section-card">
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[hsl(var(--primary))]" />
          {lang === 'he' ? 'קוד הזמנה למשפחה' : 'Family Invite Code'}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <code className="px-4 py-2 rounded-lg bg-[hsl(var(--muted))] font-mono text-lg font-bold">
            {data?.inviteCode || '—'}
          </code>
          <button
            type="button"
            onClick={copyInviteCode}
            disabled={!data?.inviteCode}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.5)] text-sm"
          >
            <Copy className="w-4 h-4" />
            {copied ? (lang === 'he' ? 'הועתק!' : 'Copied!') : (lang === 'he' ? 'העתק' : 'Copy')}
          </button>
          {isManager && (
            <button
              type="button"
              onClick={regenerateInviteCode}
              disabled={regenerating}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.5)] text-sm disabled:opacity-50"
            >
              <RefreshCw className={regenerating ? 'animate-spin' : ''} />
              {regenerating
                ? (lang === 'he' ? 'יוצר קוד חדש...' : 'Regenerating...')
                : (lang === 'he' ? 'קוד הזמנה חדש' : 'New invite code')}
            </button>
          )}
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
          {lang === 'he'
            ? 'קוד כללי – ברירת מחדל: צופה. לשיוך לפי הרשאות, צור קוד ספציפי למטה.'
            : 'General code – default: viewer. For permission-based invites, create a specific code below.'}
        </p>
        <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
            {lang === 'he'
              ? 'שליחה בעצמכם דרך הודעת טקסט לבני משפחה, חברים מכרים וכו׳.'
              : 'Share manually via text message to family, friends, etc.'}
          </p>
          <button
            type="button"
            onClick={() => data?.inviteCode && openManualShare(data.inviteCode)}
            disabled={!data?.inviteCode}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.5)] text-sm disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
            {lang === 'he' ? 'שליחה ידנית' : 'Manual share'}
          </button>
          {isManager && (
            <button
              type="button"
              onClick={() => data?.inviteCode && openSendEmail(data.inviteCode)}
              disabled={!data?.inviteCode}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.5)] text-sm disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {lang === 'he' ? 'שלח למייל' : 'Send to email'}
            </button>
          )}
        </div>
      </section>

      {/* קודי הזמנה ספציפיים */}
      {isManager && (
        <section className="card mb-6">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[hsl(var(--primary))]" />
            {lang === 'he' ? 'קוד הזמנה ספציפי' : 'Specific invite code'}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            {lang === 'he'
              ? 'צור קוד עם הרשאות מוגדרות. מי שיישתמש בקוד יקבל את ההרשאות שהגדרת.'
              : 'Create a code with defined permissions. Users who use it will get the permissions you set.'}
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {INVITE_PRESETS.map((preset) => (
              <div key={preset.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => createInvite(preset)}
                  disabled={creatingInvite}
                  className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] text-sm text-left disabled:opacity-50"
                >
                  {lang === 'he' ? preset.labelHe : preset.labelEn}
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => createInvite(preset, 7)}
                    disabled={creatingInvite}
                    className="text-xs px-2 py-0.5 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] disabled:opacity-50"
                  >
                    7 {lang === 'he' ? 'ימים' : 'days'}
                  </button>
                  <button
                    type="button"
                    onClick={() => createInvite(preset, 30)}
                    disabled={creatingInvite}
                    className="text-xs px-2 py-0.5 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] disabled:opacity-50"
                  >
                    30 {lang === 'he' ? 'ימים' : 'days'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {newInviteResult && (
            <div className="p-3 rounded-lg bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.3)] mb-4">
              <p className="text-sm font-medium mb-2">{lang === 'he' ? 'הקוד שנוצר:' : 'Created code:'}</p>
              <div className="flex items-center gap-2">
                <code className="px-3 py-2 rounded bg-[hsl(var(--muted))] font-mono font-bold">
                  {newInviteResult.code}
                </code>
                <button
                  type="button"
                  onClick={() => copyCode(newInviteResult.code)}
                  className="px-3 py-2 rounded-lg border hover:bg-[hsl(var(--muted)/0.5)] text-sm"
                >
                  {copiedCode === newInviteResult.code ? '✓' : (lang === 'he' ? 'העתק' : 'Copy')}
                </button>
                <button
                  type="button"
                  onClick={() => newInviteResult && openManualShare(newInviteResult.code)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
                >
                  <MessageCircle className="w-3 h-3" />
                  {lang === 'he' ? 'שליחה ידנית' : 'Share'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    newInviteResult &&
                    openSendEmail(
                      newInviteResult.code,
                      INVITE_PRESETS.find(
                        (p) => p.role === newInviteResult.role && p.memberTier === newInviteResult.memberTier
                      )?.[lang === 'he' ? 'labelHe' : 'labelEn']
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
                >
                  <Mail className="w-3 h-3" />
                  {lang === 'he' ? 'שלח למייל' : 'Email'}
                </button>
                <button
                  type="button"
                  onClick={() => setNewInviteResult(null)}
                  className="p-2 rounded hover:bg-[hsl(var(--muted)/0.5)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                {INVITE_PRESETS.find((p) => p.role === newInviteResult.role && p.memberTier === newInviteResult.memberTier)?.[lang === 'he' ? 'labelHe' : 'labelEn'] ??
                  newInviteResult.role}
              </p>
            </div>
          )}
          {invites.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
                {lang === 'he' ? 'קודים קיימים:' : 'Existing codes:'}
              </p>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                  >
                    <div>
                      <code className="font-mono font-semibold">{inv.code}</code>
                      <span className="mr-2 text-xs text-[hsl(var(--muted-foreground))]">
                        {inv.role} / {inv.memberTier}
                      </span>
                      {inv.expiresAt && (
                        <span className="text-xs text-[hsl(var(--warning))]">
                          {lang === 'he' ? 'פג תוקף:' : 'Expires:'}{' '}
                          {new Date(inv.expiresAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openManualShare(inv.code)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
                      >
                        <MessageCircle className="w-3 h-3" />
                        {lang === 'he' ? 'שליחה ידנית' : 'Share'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openSendEmail(
                            inv.code,
                            INVITE_PRESETS.find(
                              (p) => p.role === inv.role && p.memberTier === inv.memberTier
                            )?.[lang === 'he' ? 'labelHe' : 'labelEn']
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
                      >
                        <Mail className="w-3 h-3" />
                        {lang === 'he' ? 'שלח למייל' : 'Email'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyCode(inv.code)}
                        className="px-2 py-1 rounded text-sm hover:bg-[hsl(var(--muted)/0.5)]"
                      >
                        {copiedCode === inv.code ? '✓' : (lang === 'he' ? 'העתק' : 'Copy')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* הגדרות היררכיה משפחתית */}
      <section className="card">
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[hsl(var(--primary))]" />
          {lang === 'he' ? 'הגדרות היררכיה משפחתית' : 'Family Hierarchy Settings'}
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
          {lang === 'he'
            ? 'הרשאות נקבעות לכל חבר משפחה בנפרד. משתמש יכול להיות במספר משפחות עם הרשאות שונות.'
            : 'Permissions are set per family member. A user can belong to multiple families with different access levels.'}
        </p>
        <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-sm">
          <p className="font-medium text-[hsl(var(--foreground))] mb-1">
            {lang === 'he' ? 'בן משפחה לעומת מטפל חיצוני' : 'Family member vs External caregiver'}
          </p>
          <p className="text-[hsl(var(--muted-foreground))]">
            {lang === 'he'
              ? 'בני משפחה – גישה לעניינים פיננסיים וביטוחים. מטפל חיצוני – רואה משימות, מזין משימות חדשות, עורך משימות שהוא מנהל או שהועברו אליו. ללא פיננסי וביטוחים.'
              : 'Family members – access to financial & insurance. External caregiver – tasks only, no financial/insurance.'}
          </p>
        </div>

        <button
          type="button"
          onClick={openPermissions}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium hover:opacity-90 transition"
        >
          <Eye className="w-5 h-5" />
          <Edit3 className="w-5 h-5" />
          {lang === 'he' ? 'צפייה ועריכת הרשאות' : 'View & Edit Permissions'}
        </button>

        {/* ── Caregiving roles section ── */}
        {isManager && data && data.members.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-[hsl(var(--primary))]" />
              <h3 className="text-sm font-semibold">
                {lang === 'he' ? 'תפקידים טיפוליים | מפת השפעה' : 'Caregiving Roles | Influence Map'}
              </h3>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
              {lang === 'he'
                ? 'הגדירו מי אחראי על מה, ומי המתאים ביותר לפנות למטופל בכל נושא.'
                : 'Define who is responsible for what, and who is best to approach the patient on each topic.'}
            </p>
            <div className="space-y-3">
              {data.members.map((member) => {
                const isEditing = roleEditingUserId === member.userId;
                const memberRoles = member.familyRoles?.length
                  ? member.familyRoles
                  : (member.familyRole ? [member.familyRole] : []);
                const score = computeMemberScore(member);
                const avatarColor = member.userColor ?? '#6366f1';
                return (
                  <div key={member.userId} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
                    {/* ── compact card header – click to expand ── */}
                    <div
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isEditing ? 'bg-[hsl(var(--muted))]/30' : 'hover:bg-[hsl(var(--muted))]/40'}`}
                      onClick={() => isEditing ? setRoleEditingUserId(null) : openRoleEdit(member)}
                      role="button"
                      aria-expanded={isEditing}
                    >
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + role badges */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{member.fullName}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {memberRoles.length > 0 ? (
                            memberRoles.map((rid) => {
                              const ri = CAREGIVING_ROLES.find((r) => r.id === rid);
                              return ri ? (
                                <span
                                  key={rid}
                                  className="inline-flex items-center gap-0.5 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20 px-2 py-0.5 text-[10px] font-medium"
                                >
                                  {lang === 'he' ? ri.labelHe : ri.labelEn}
                                </span>
                              ) : null;
                            })
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-dashed border-[hsl(var(--border))] px-2 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                              {lang === 'he' ? 'תפקיד לא הוגדר' : 'Role not set'}
                            </span>
                          )}
                          <ChevronDown className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ms-0.5 transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Completion badge */}
                      <div className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        score >= 80
                          ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]'
                          : score >= 40
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      }`}>
                        {score}%
                      </div>
                    </div>

                    {isEditing && (
                      <div className="border-t border-[hsl(var(--border))] p-4 space-y-4 bg-[hsl(var(--muted))]/20">
                        {/* Role picker – multi-select */}
                        <div>
                          <label className="block text-xs font-medium mb-2">
                            {lang === 'he' ? 'תפקידים (ניתן לבחור כמה)' : 'Roles (select one or more)'}
                          </label>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {CAREGIVING_ROLES.map((r) => {
                              const selected = roleFormData.familyRoles.includes(r.id);
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => setRoleFormData((p) => ({
                                    ...p,
                                    familyRoles: selected
                                      ? p.familyRoles.filter((x) => x !== r.id)
                                      : [...p.familyRoles, r.id],
                                  }))}
                                  className={`rounded-lg border p-2 text-start text-xs transition-all relative ${selected ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/8 text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                                >
                                  {selected && (
                                    <span className="absolute top-1.5 end-1.5 w-3 h-3 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    </span>
                                  )}
                                  <div className="font-semibold pe-3">{lang === 'he' ? r.labelHe : r.labelEn}</div>
                                  <div className={`text-[10px] mt-0.5 ${selected ? 'opacity-80' : 'text-[hsl(var(--muted-foreground))]'}`}>
                                    {lang === 'he' ? r.descHe : r.descEn}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Influence areas */}
                        <div>
                          <label className="block text-xs font-medium mb-2">
                            {lang === 'he' ? 'תחומי השפעה על המטופל (ניתן לבחור כמה)' : 'Areas of influence (select multiple)'}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {INFLUENCE_AREAS.map((a) => {
                              const selected = roleFormData.influenceAreas.includes(a.id);
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => setRoleFormData((p) => ({
                                    ...p,
                                    influenceAreas: selected
                                      ? p.influenceAreas.filter((x) => x !== a.id)
                                      : [...p.influenceAreas, a.id],
                                  }))}
                                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${selected ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                                >
                                  {lang === 'he' ? a.labelHe : a.labelEn}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Proximity */}
                        <div>
                          <label className="block text-xs font-medium mb-2">
                            {lang === 'he' ? 'קרבה גיאוגרפית' : 'Geographic proximity'}
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { id: 'local', he: 'מקומי (עד 30 דק׳)', en: 'Local (< 30 min)' },
                              { id: 'nearby', he: 'קרוב (עד שעה)', en: 'Nearby (< 1h)' },
                              { id: 'remote', he: 'מרוחק', en: 'Remote' },
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setRoleFormData((prev) => ({ ...prev, proximity: p.id }))}
                                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${roleFormData.proximity === p.id ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/8 text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                              >
                                {lang === 'he' ? p.he : p.en}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => saveRole(member.userId)}
                            disabled={savingRole}
                            className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {savingRole ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'שמור' : 'Save')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRoleEditingUserId(null)}
                            className="rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-xs hover:bg-[hsl(var(--muted))]"
                          >
                            {lang === 'he' ? 'ביטול' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* מפת היררכיה ויזואלית */}
        <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
          <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-3">
            {lang === 'he' ? 'מפת היררכיה משפחתית' : 'Family hierarchy map'}
          </p>
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <FamilyHierarchyMap
              primaryPatient={data?.primaryPatient ?? null}
              members={data?.members ?? []}
            />
          </div>
        </div>

        {/* צבעי זיהוי */}
        <MemberColorSection
          members={(data?.members ?? []) as FamilyMemberWithColor[]}
          currentUserId={user?.id ?? ''}
          isManager={user?.role === 'manager'}
          onColorChange={(memberId, color) => {
            setData((prev) => prev ? {
              ...prev,
              members: prev.members.map((m) =>
                m.userId === memberId ? { ...m, userColor: color } : m
              ),
            } : prev);
          }}
        />
      </section>

      {/* Manual share modal */}
      {manualShareOpen && manualShareCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => { setManualShareOpen(false); setManualShareCode(null); }}
            className="absolute inset-0 bg-black/50"
            aria-label={lang === 'he' ? 'סגור' : 'Close'}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {lang === 'he' ? 'שליחה ידנית' : 'Manual share'}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
              {lang === 'he'
                ? 'העתק את ההודעה ושלח דרך וואטסאפ, SMS או כל אפליקציה.'
                : 'Copy the message and send via WhatsApp, SMS, or any app.'}
            </p>
            <pre className="p-4 rounded-lg bg-[hsl(var(--muted))] text-sm whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto mb-4 font-sans">
              {buildInviteMessage(manualShareCode)}
            </pre>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyManualShareMessage}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium hover:opacity-90"
              >
                <Copy className="w-4 h-4" />
                {manualShareCopied ? (lang === 'he' ? 'הועתק!' : 'Copied!') : (lang === 'he' ? 'העתק הודעה' : 'Copy message')}
              </button>
              <button
                type="button"
                onClick={() => { setManualShareOpen(false); setManualShareCode(null); }}
                className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
              >
                {lang === 'he' ? 'סגור' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send to email modal */}
      {sendEmailOpen && sendEmailCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => {
              setSendEmailOpen(false);
              setSendEmailCode(null);
              setSendEmailError(null);
            }}
            className="absolute inset-0 bg-black/50"
            aria-label={lang === 'he' ? 'סגור' : 'Close'}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {lang === 'he' ? 'שלח הזמנה למייל' : 'Send invite by email'}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
              {lang === 'he'
                ? 'הזן כתובת אימייל. ההזמנה תכלול קוד ולינק להרשמה.'
                : 'Enter email address. The invite will include the code and registration link.'}
            </p>
            <input
              type="email"
              value={sendEmailTo}
              onChange={(e) => setSendEmailTo(e.target.value)}
              placeholder={lang === 'he' ? 'דוגמה@example.com' : 'you@example.com'}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] mb-3 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            />
            {sendEmailError && (
              <p className="text-sm text-[hsl(var(--destructive))] mb-3">{sendEmailError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendInviteByEmail}
                disabled={sendEmailLoading || !sendEmailTo.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium hover:opacity-90 disabled:opacity-50"
              >
                {sendEmailLoading
                  ? (lang === 'he' ? 'שולח...' : 'Sending...')
                  : (lang === 'he' ? 'שלח' : 'Send')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSendEmailOpen(false);
                  setSendEmailCode(null);
                  setSendEmailError(null);
                }}
                className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
              >
                {lang === 'he' ? 'ביטול' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup – דסקטופ בלבד */}
      {permissionsOpen && data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setPermissionsOpen(false)}
            className="absolute inset-0 bg-black/50"
            aria-label={lang === 'he' ? 'סגור' : 'Close'}
          />
          <div className="relative w-full max-w-2xl h-[min(90vh,700px)] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl p-4 sm:p-6 overflow-hidden flex flex-col">
            <FamilyPermissionsPanel
              members={data.members}
              primaryPatient={data.primaryPatient}
              onClose={() => setPermissionsOpen(false)}
              onRefresh={load}
              isFullPage={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Member Color Section ───────────────────────────────────────────────────────

function MemberColorSection({
  members,
  currentUserId,
  isManager,
  onColorChange,
}: {
  members: FamilyMemberWithColor[];
  currentUserId: string;
  isManager: boolean;
  onColorChange: (memberId: string, color: string) => void;
}) {
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const takenColors = members.map((m) => m.userColor ?? '').filter(Boolean);

  async function handleColorClick(memberId: string, color: string) {
    setSavingFor(memberId);
    setErrorMsg(null);
    try {
      await apiFetch('/users/me/color', {
        method: 'PATCH',
        body: JSON.stringify({ color, targetUserId: memberId }),
      });
      onColorChange(memberId, color);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'שגיאה בשמירת הצבע');
    } finally {
      setSavingFor(null);
    }
  }

  return (
    <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4 text-[hsl(var(--primary))]" />
        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">צבעי זיהוי</p>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">— כל חבר עם צבע ייחודי בלוח המשימות</span>
      </div>

      {errorMsg && (
        <p className="text-xs text-[hsl(var(--destructive))] mb-3">{errorMsg}</p>
      )}

      <div className="space-y-3">
        {members.map((member) => {
          const canEdit = isManager || member.userId === currentUserId;
          const currentColor = member.userColor ?? '#6366f1';
          const initials = member.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

          return (
            <div key={member.userId} className="flex items-center gap-3 flex-wrap">
              {/* Avatar with current color */}
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: currentColor }}
              >
                {initials}
              </span>
              <span className="text-sm font-medium w-32 shrink-0 truncate">{member.fullName}</span>

              {canEdit ? (
                <div className="flex items-center gap-1 flex-wrap">
                  {USER_COLOR_PALETTE.map((color) => {
                    const isTaken = takenColors.some(
                      (c) => c.toLowerCase() === color.toLowerCase() && member.userColor?.toLowerCase() !== color.toLowerCase()
                    );
                    const isSelected = currentColor.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={isTaken || savingFor === member.userId}
                        onClick={() => handleColorClick(member.userId, color)}
                        title={isTaken ? 'צבע תפוס' : color}
                        className={`w-5 h-5 rounded-full transition-all ${
                          isSelected ? 'ring-2 ring-offset-1 ring-[hsl(var(--foreground))] scale-125' : ''
                        } ${isTaken ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}`}
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: currentColor }}
                  title={currentColor}
                />
              )}

              {savingFor === member.userId && (
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">שומר...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
