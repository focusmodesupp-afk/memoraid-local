import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { Edit3, Check, X, Eye, ArrowLeft, User, Shield, RefreshCw } from 'lucide-react';
import { FamilyHierarchyMap } from './FamilyHierarchyMap';

type FamilyMember = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  memberTier?: string;
  permissions: string[];
  joinedAt: string;
};

type PrimaryPatient = { id: string; fullName: string; photoUrl?: string | null } | null;

const ROLES = [
  { value: 'manager', labelHe: 'מנהל/ת משפחה', labelEn: 'Family Manager' },
  { value: 'caregiver', labelHe: 'מטפל/ת', labelEn: 'Caregiver' },
  { value: 'viewer', labelHe: 'צופה', labelEn: 'Viewer' },
  { value: 'guest', labelHe: 'אורח/ת', labelEn: 'Guest' },
];

const PERMISSIONS = [
  { key: 'view_patient', labelHe: 'צפייה בפרופיל מטופל', labelEn: 'View patient' },
  { key: 'edit_patient', labelHe: 'עריכת פרופיל מטופל', labelEn: 'Edit patient' },
  { key: 'view_tasks', labelHe: 'צפייה במשימות', labelEn: 'View tasks' },
  { key: 'edit_tasks', labelHe: 'עריכת משימות', labelEn: 'Edit tasks' },
  { key: 'view_financial', labelHe: 'צפייה בפיננסי', labelEn: 'View financial' },
  { key: 'edit_financial', labelHe: 'עריכת פיננסי', labelEn: 'Edit financial' },
  { key: 'view_insurance', labelHe: 'צפייה בביטוחים', labelEn: 'View insurance' },
  { key: 'edit_insurance', labelHe: 'עריכת ביטוחים', labelEn: 'Edit insurance' },
  { key: 'view_documents', labelHe: 'צפייה במסמכים', labelEn: 'View documents' },
  { key: 'manage_members', labelHe: 'ניהול חברי משפחה', labelEn: 'Manage members' },
];

const PRESETS = [
  { id: 'family_full', labelHe: 'בן משפחה מלא', labelEn: 'Full family', role: 'manager' as const, perms: PERMISSIONS.map((p) => p.key) },
  { id: 'family_caregiver', labelHe: 'בן משפחה מטפל', labelEn: 'Family caregiver', role: 'caregiver' as const, perms: ['view_patient', 'edit_patient', 'view_tasks', 'edit_tasks', 'view_financial', 'view_insurance', 'view_documents'] },
  { id: 'external_caregiver', labelHe: 'מטפל חיצוני', labelEn: 'External caregiver', role: 'caregiver' as const, perms: ['view_patient', 'view_tasks', 'edit_tasks', 'view_documents'] },
  { id: 'viewer_only', labelHe: 'צופה בלבד', labelEn: 'Viewer only', role: 'viewer' as const, perms: ['view_patient', 'view_tasks', 'view_documents'] },
];

const MEMBER_TIERS = [
  { value: 'family', labelHe: 'בן משפחה', labelEn: 'Family member' },
  { value: 'supporter_friend', labelHe: 'חבר/מכר תומך', labelEn: 'Supporting friend' },
  { value: 'supporter_medical', labelHe: 'מטפל רפואי', labelEn: 'Medical caregiver' },
];

type Props = {
  members: FamilyMember[];
  primaryPatient?: PrimaryPatient;
  onClose?: () => void;
  onRefresh: () => void;
  isFullPage?: boolean;
};

export function FamilyPermissionsPanel({ members, primaryPatient, onClose, onRefresh, isFullPage }: Props) {
  const { dir, lang } = useI18n();
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const [mode, setMode] = useState<'view' | 'edit'>(isManager ? 'edit' : 'view');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editMemberTier, setEditMemberTier] = useState('');
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setEditRole(preset.role);
    setEditPerms([...preset.perms]);
  };

  const startEdit = (m: FamilyMember) => {
    setEditingId(m.userId);
    setEditRole(m.role);
    setEditMemberTier(m.memberTier ?? 'family');
    setEditPerms([...(m.permissions ?? [])]);
  };

  const cancelEdit = () => setEditingId(null);

  const saveMember = async () => {
    if (!editingId || !isManager) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/families/me/members/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: editRole, permissions: editPerms, memberTier: editMemberTier }),
      });
      onRefresh();
      setEditingId(null);
    } catch (e: any) {
      setError(e.message ?? 'שגיאה');
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (key: string) => {
    setEditPerms((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
  };

  const getPermLabel = (key: string) => PERMISSIONS.find((p) => p.key === key)?.[lang === 'he' ? 'labelHe' : 'labelEn'] ?? key;
  const getRoleLabel = (role: string) => ROLES.find((r) => r.value === role)?.[lang === 'he' ? 'labelHe' : 'labelEn'] ?? role;

  const roleOrder = ['manager', 'caregiver', 'viewer', 'guest'];
  const sortedMembers = [...members].sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
  );

  const content = (
    <div className="flex flex-col h-full" dir={dir}>
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          {isFullPage && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)]"
              aria-label={lang === 'he' ? 'חזרה' : 'Back'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-[hsl(var(--primary))]" />
            {lang === 'he' ? 'צפייה ועריכת הרשאות' : 'View & Edit Permissions'}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)]"
            aria-label={lang === 'he' ? 'רענן' : 'Refresh'}
            title={lang === 'he' ? 'רענן רשימה' : 'Refresh list'}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          {!isFullPage && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)]"
              aria-label={lang === 'he' ? 'סגור' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4 shrink-0">
        <button
          type="button"
          onClick={() => setMode('view')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            mode === 'view'
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]'
          }`}
        >
          <Eye className="w-4 h-4" />
          {lang === 'he' ? 'צפייה' : 'View'}
        </button>
        {isManager && (
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              mode === 'edit'
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                : 'border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            {lang === 'he' ? 'עריכה' : 'Edit'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {mode === 'view' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-4">
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-3">
                {lang === 'he' ? 'מפת היררכיה' : 'Hierarchy map'}
              </p>
              <FamilyHierarchyMap
                primaryPatient={primaryPatient ?? null}
                members={members}
                onMemberClick={isManager ? (m) => { setMode('edit'); startEdit(m); } : undefined}
              />
            </div>
            {sortedMembers.map((m) => (
              <div
                key={m.userId}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                    <User className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {m.fullName}
                      {m.userId === user?.id && (
                        <span className="mr-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                          ({lang === 'he' ? 'אני' : 'me'})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{m.email}</p>
                  </div>
                  <span
                    className={`mr-auto px-3 py-1 rounded-lg text-xs font-medium ${
                      m.role === 'manager'
                        ? 'bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))]'
                        : m.role === 'caregiver'
                          ? 'bg-[hsl(var(--info)/0.2)] text-[hsl(var(--info))]'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    {getRoleLabel(m.role)}
                  </span>
                  {m.memberTier && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {MEMBER_TIERS.find((t) => t.value === m.memberTier)?.[lang === 'he' ? 'labelHe' : 'labelEn'] ?? m.memberTier}
                    </span>
                  )}
                </div>
                <div className="border-t border-[hsl(var(--border))] pt-3">
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
                    {lang === 'he' ? 'הרשאות' : 'Permissions'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(m.permissions?.length ?? 0) > 0 ? (
                      (m.permissions ?? []).map((key) => (
                        <span
                          key={key}
                          className="inline-flex px-2.5 py-1 rounded-lg bg-[hsl(var(--muted)/0.5)] text-xs"
                        >
                          {getPermLabel(key)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {m.role === 'manager'
                          ? (lang === 'he' ? 'הרשאות מלאות' : 'Full permissions')
                          : (lang === 'he' ? 'לפי תפקיד' : 'By role')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-4">
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-3">
                {lang === 'he' ? 'מפת היררכיה – ניתן גם ללחוץ על משתמש' : 'Hierarchy map – you can also click a user'}
              </p>
              <FamilyHierarchyMap
                primaryPatient={primaryPatient ?? null}
                members={members}
                onMemberClick={(m) => startEdit(m)}
              />
            </div>
            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2">
              {lang === 'he' ? 'רשימת משתמשים – לחץ ערוך לעריכת הרשאות' : 'User list – click Edit to change permissions'}
            </p>
            {sortedMembers.map((m) => (
              <div
                key={m.userId}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
              >
                {editingId === m.userId ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{m.fullName}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveMember}
                          disabled={saving}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm"
                        >
                          <Check className="w-4 h-4" />
                          {lang === 'he' ? 'שמור' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm"
                        >
                          <X className="w-4 h-4" />
                          {lang === 'he' ? 'ביטול' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
                        {lang === 'he' ? 'Preset' : 'Preset'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {PRESETS.map((pr) => (
                          <button
                            key={pr.id}
                            type="button"
                            onClick={() => applyPreset(pr)}
                            className="px-3 py-1.5 rounded-lg border hover:bg-[hsl(var(--muted)/0.5)] text-xs"
                          >
                            {lang === 'he' ? pr.labelHe : pr.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">{lang === 'he' ? 'סוג במפה' : 'Type in map'}</label>
                      <select
                        value={editMemberTier}
                        onChange={(e) => setEditMemberTier(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 rounded-lg border"
                      >
                        {MEMBER_TIERS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {lang === 'he' ? t.labelHe : t.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">{lang === 'he' ? 'תפקיד' : 'Role'}</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 rounded-lg border"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {lang === 'he' ? r.labelHe : r.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium">{lang === 'he' ? 'הרשאות' : 'Permissions'}</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer text-[hsl(var(--primary))] font-medium">
                          <input
                            type="checkbox"
                            checked={editPerms.length === PERMISSIONS.length}
                            onChange={() => {
                              if (editPerms.length === PERMISSIONS.length) {
                                setEditPerms([]);
                              } else {
                                setEditPerms(PERMISSIONS.map((p) => p.key));
                              }
                            }}
                            className="rounded"
                          />
                          {lang === 'he' ? 'הכל' : 'All'}
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PERMISSIONS.map((p) => (
                          <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editPerms.includes(p.key)}
                              onChange={() => togglePerm(p.key)}
                              className="rounded"
                            />
                            {getPermLabel(p.key)}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {m.fullName}
                        {m.userId === user?.id && (
                          <span className="mr-2 text-xs text-[hsl(var(--muted-foreground))]">({lang === 'he' ? 'אני' : 'me'})</span>
                        )}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{m.email}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                        m.role === 'manager' ? 'bg-[hsl(var(--primary)/0.2)]' : 'bg-[hsl(var(--muted))]'
                      }`}>
                        {getRoleLabel(m.role)}
                      </span>
                    </div>
                    {isManager && m.userId !== user?.id && (
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 text-sm font-medium"
                      >
                        <Edit3 className="w-4 h-4" />
                        {lang === 'he' ? 'ערוך הרשאות' : 'Edit'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return content;
}
