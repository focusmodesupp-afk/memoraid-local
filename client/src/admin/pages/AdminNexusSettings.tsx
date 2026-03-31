import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, ListChecks, Shield, Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronUp, Download, Users, Bot, Globe, ToggleLeft, ToggleRight, Rss, Youtube, Search } from 'lucide-react';
import { apiFetch } from '../../lib/api';

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Skill = { id: string; name: string; labelHe: string; color: string; category: string; description: string | null; isActive: boolean };
type Rule = { id: string; name: string; description: string | null; triggerType: string; conditionJson: Record<string, unknown>; actionType: string; actionPayload: Record<string, unknown>; priority: number; isActive: boolean };
type Template = { id: string; name: string; nameHe: string; description: string | null; departments: string[]; models: string[]; codebaseDepth: string; codebaseScope: string; isDefault: boolean; isActive: boolean };
type DeptSetting = { department: string; labelHe: string; emoji: string; systemPromptOverride: string | null; defaultModel: string | null; isActive: boolean };
type TeamMember = { id: string; department: string; name: string; roleEn: string; roleHe: string; emoji: string; level: string; responsibilities: string | null; skills: string[] | null; defaultModel: string | null; systemPromptOverride: string | null; isActive: boolean; orderIndex: number };

type Tab = 'departments' | 'skills' | 'rules' | 'templates' | 'agents' | 'websources';

type DeptConfig = { id: string; hebrewName: string; emoji: string; systemPrompt: string; outputSections: string[] };
type WebFeed = { id: string; sourceType: string; url: string; label: string; category: string; departments: string[] | null; isActive: boolean };

const LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  clevel:  { label: 'C-Level',  color: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' },
  manager: { label: 'מנהל',     color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  senior:  { label: 'בכיר',     color: 'bg-teal-500/20 text-teal-300 border border-teal-500/30' },
  member:  { label: 'חבר צוות', color: 'bg-slate-600/40 text-slate-300 border border-slate-600' },
  junior:  { label: 'זוטר',     color: 'bg-slate-700/40 text-slate-400 border border-slate-600' },
};

// ── Team Members Sub-Component ──────────────────────────────────────────────────
function DeptTeamMembers({ deptId }: { deptId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', roleEn: '', roleHe: '', emoji: '👤', level: 'member', responsibilities: '', skills: '', defaultModel: '', systemPromptOverride: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch<TeamMember[]>(`/admin/nexus/team-members?department=${deptId}`)
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [deptId]);

  const handleCreate = async () => {
    if (!form.name || !form.roleEn || !form.roleHe) { alert('שם, role_en, role_he נדרשים'); return; }
    setSaving(true);
    try {
      await apiFetch('/admin/nexus/team-members', {
        method: 'POST',
        body: JSON.stringify({
          department: deptId,
          name: form.name,
          roleEn: form.roleEn,
          roleHe: form.roleHe,
          emoji: form.emoji || '👤',
          level: form.level,
          responsibilities: form.responsibilities || null,
          skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
          defaultModel: form.defaultModel || null,
          systemPromptOverride: form.systemPromptOverride || null,
        }),
      });
      setShowForm(false);
      setForm({ name: '', roleEn: '', roleHe: '', emoji: '👤', level: 'member', responsibilities: '', skills: '', defaultModel: '', systemPromptOverride: '' });
      load();
    } catch { alert('שגיאה'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק?')) return;
    try { await apiFetch(`/admin/nexus/team-members/${id}`, { method: 'DELETE' }); load(); }
    catch { alert('שגיאה'); }
  };

  const handleToggleActive = async (m: TeamMember) => {
    try { await apiFetch(`/admin/nexus/team-members/${m.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !m.isActive }) }); load(); }
    catch { alert('שגיאה'); }
  };

  if (loading) return <div className="text-xs admin-muted p-2">טוען...</div>;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> צוות ({members.length})
        </h4>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30">
          <Plus className="w-3 h-3" /> הוסף חבר
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900/60 rounded-lg p-3 mb-3 border border-slate-700/50 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-0.5 block">שם תפקיד</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Senior Backend Developer" className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-indigo-500" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">אימוג'י</label>
              <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">Role EN</label>
              <input value={form.roleEn} onChange={(e) => setForm({ ...form, roleEn: e.target.value })}
                placeholder="senior-backend" className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-indigo-500" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">Role עברית</label>
              <input value={form.roleHe} onChange={(e) => setForm({ ...form, roleHe: e.target.value })}
                placeholder="מפתח Backend בכיר" className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-indigo-500" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">דרגה</label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-200 text-xs focus:outline-none">
                {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">Skills (מופרדות בפסיק)</label>
              <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="node, postgresql, redis" className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-indigo-500" dir="ltr" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="admin-btn-secondary text-xs py-1 px-2"><X className="w-3 h-3" /></button>
            <button onClick={handleCreate} disabled={saving} className="admin-btn-primary text-xs py-1 px-3 flex items-center gap-1">
              <Save className="w-3 h-3" /> {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {members.map((m) => {
          const lvl = LEVEL_LABELS[m.level] ?? LEVEL_LABELS.member;
          const isExpanded = expandedMember === m.id;
          return (
            <div key={m.id} className={`rounded-lg border ${m.isActive ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-700/30 bg-slate-900/20 opacity-60'}`}>
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={() => setExpandedMember(isExpanded ? null : m.id)}
              >
                <span className="text-base">{m.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200">{m.roleHe}</p>
                  <p className="text-xs admin-muted font-mono">{m.name}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${lvl.color}`}>{lvl.label}</span>
                <button onClick={(e) => { e.stopPropagation(); handleToggleActive(m); }} className={`text-xs px-1.5 py-0.5 rounded transition-colors ${m.isActive ? 'text-green-400 hover:text-red-400' : 'text-slate-500 hover:text-green-400'}`}>
                  {m.isActive ? '●' : '○'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
                {isExpanded ? <ChevronUp className="w-3 h-3 admin-muted" /> : <ChevronDown className="w-3 h-3 admin-muted" />}
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-slate-700/30 pt-2 space-y-1.5">
                  {m.responsibilities && <p className="text-xs text-slate-400"><span className="text-slate-500">אחריות:</span> {m.responsibilities}</p>}
                  {m.skills && m.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.skills.map((s) => <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono">{s}</span>)}
                    </div>
                  )}
                  {m.defaultModel && <p className="text-xs admin-muted font-mono">מודל: {m.defaultModel}</p>}
                  {m.systemPromptOverride && (
                    <pre className="text-xs admin-muted bg-slate-900/60 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-24">{m.systemPromptOverride.slice(0, 300)}</pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {members.length === 0 && <p className="text-xs admin-muted text-center py-3">אין חברי צוות — לחץ "הוסף חבר"</p>}
      </div>
    </div>
  );
}

const DEPT_IDS = ['ceo', 'cto', 'cpo', 'rd', 'design', 'product', 'security', 'legal', 'marketing', 'finance'];
const DEPT_DEFAULTS: Record<string, { label: string; emoji: string }> = {
  ceo: { label: 'מנכ"ל (CEO)', emoji: '👔' },
  cto: { label: 'מנמ"ר טכנולוגיה (CTO)', emoji: '⚙️' },
  cpo: { label: 'מנהל מוצר (CPO)', emoji: '🎯' },
  rd: { label: 'מחקר ופיתוח (R&D)', emoji: '🔬' },
  design: { label: 'עיצוב UX/UI', emoji: '🎨' },
  product: { label: 'מוצר', emoji: '📋' },
  security: { label: 'אבטחה', emoji: '🔒' },
  legal: { label: 'משפטי', emoji: '⚖️' },
  marketing: { label: 'שיווק', emoji: '📣' },
  finance: { label: 'פיננסים ו-BI (CFO)', emoji: '💰' },
};

const SMART_PRESETS: Record<string, string> = {
  rnd:       'claude-sonnet-4-6',
  security:  'claude-sonnet-4-6',
  legal:     'claude-sonnet-4-6',
  cto:       'claude-sonnet-4-6',
  ceo:       'claude-sonnet-4-6',
  cpo:       'claude-sonnet-4-6',
  product:   'claude-sonnet-4-6',
  marketing: 'claude-haiku-4-5',
  finance:   'claude-haiku-4-5',
  design:    'claude-haiku-4-5',
};

// ── Department Settings Tab ────────────────────────────────────────────────────
function DepartmentsTab() {
  const [settings, setSettings] = useState<DeptSetting[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<DeptSetting>>({});
  const [saving, setSaving] = useState(false);
  const [applyingPresets, setApplyingPresets] = useState(false);
  const [availableModels, setAvailableModels] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    apiFetch<DeptSetting[]>('/admin/nexus/dept-settings')
      .then((d) => setSettings(Array.isArray(d) ? d : []))
      .catch(() => {});
    apiFetch<{ models: { id: string; label: string; available: boolean }[] }>('/admin/nexus/models')
      .then((d) => setAvailableModels(Array.isArray(d?.models) ? d.models.filter((m) => m.available) : []))
      .catch(() => {});
  }, []);

  async function applySmartPresets() {
    setApplyingPresets(true);
    try {
      await Promise.all(
        Object.entries(SMART_PRESETS).map(([dept, model]) =>
          apiFetch(`/admin/nexus/dept-settings/${dept}`, {
            method: 'PUT',
            body: JSON.stringify({ defaultModel: model }),
          })
        )
      );
      const updated = await apiFetch<DeptSetting[]>('/admin/nexus/dept-settings');
      setSettings(Array.isArray(updated) ? updated : []);
    } catch {
      alert('שגיאה בהחלת הגדרות חכמות');
    } finally {
      setApplyingPresets(false);
    }
  }

  const getDeptSetting = (id: string): DeptSetting => {
    return settings.find((s) => s.department === id) ?? {
      department: id,
      labelHe: DEPT_DEFAULTS[id]?.label ?? id,
      emoji: DEPT_DEFAULTS[id]?.emoji ?? '🔹',
      systemPromptOverride: null,
      defaultModel: null,
      isActive: true,
    };
  };

  const startEdit = (id: string) => {
    setEditingDept(id);
    setForm(getDeptSetting(id));
    setExpanded(id);
  };

  const handleSave = async (deptId: string) => {
    setSaving(true);
    try {
      await apiFetch(`/admin/nexus/dept-settings/${deptId}`, {
        method: 'PUT',
        body: JSON.stringify({
          labelHe: form.labelHe,
          emoji: form.emoji,
          systemPromptOverride: form.systemPromptOverride || null,
          defaultModel: form.defaultModel || null,
          isActive: form.isActive ?? true,
        }),
      });
      const updated = await apiFetch<DeptSetting[]>('/admin/nexus/dept-settings');
      setSettings(Array.isArray(updated) ? updated : []);
      setEditingDept(null);
    } catch {
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Smart Presets button */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">הגדר מודל ייעודי לכל מחלקה</p>
        <button
          onClick={applySmartPresets}
          disabled={applyingPresets}
          className="px-4 py-2 rounded-lg bg-purple-600/30 hover:bg-purple-500/40 border border-purple-500/30 text-purple-300 text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {applyingPresets ? 'מחיל...' : 'הגדרות חכמות (Sonnet לטכני, Haiku לתוכן)'}
        </button>
      </div>

      {DEPT_IDS.map((id) => {
        const s = getDeptSetting(id);
        const isEditing = editingDept === id;
        const isExpanded = expanded === id;
        return (
          <div key={id} className="admin-card overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : id)}
              className="w-full flex items-center gap-3 p-4 text-right hover:bg-slate-800/40 transition-colors"
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="flex-1 text-base font-semibold text-slate-100">{s.labelHe}</span>
              {!s.isActive && <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">מושבת</span>}
              {s.systemPromptOverride && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Prompt מותאם</span>}
              {s.defaultModel && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">
                  {s.defaultModel.replace('claude-', '').replace('gpt-', '').replace('-latest', '')}
                </span>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-slate-700/50 space-y-3 pt-3">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">שם עברית</label>
                        <input value={form.labelHe ?? ''} onChange={(e) => setForm({ ...form, labelHe: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" dir="rtl" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">אימוג'י</label>
                        <input value={form.emoji ?? ''} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">System Prompt מותאם (אופציונלי)</label>
                      <textarea value={form.systemPromptOverride ?? ''} onChange={(e) => setForm({ ...form, systemPromptOverride: e.target.value })}
                        rows={4} placeholder="ריק = שימוש ב-prompt ברירת מחדל"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm font-mono resize-none focus:outline-none focus:border-indigo-500" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">מודל ברירת מחדל (אופציונלי)</label>
                      <select
                        value={form.defaultModel ?? ''}
                        onChange={(e) => setForm({ ...form, defaultModel: e.target.value || null })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">ברירת מחדל (לפי הבריף)</option>
                        {availableModels.length > 0 ? (
                          availableModels.map((m) => (
                            <option key={m.id} value={m.id}>{m.label} — {m.id}</option>
                          ))
                        ) : (
                          <>
                            <option value="claude-haiku-4-5">Claude Haiku — claude-haiku-4-5</option>
                            <option value="claude-sonnet-4-6">Claude Sonnet — claude-sonnet-4-6</option>
                            <option value="gpt-4o-mini">GPT-4o Mini — gpt-4o-mini</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id={`active-${id}`} checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                      <label htmlFor={`active-${id}`} className="text-sm text-slate-300">מחלקה פעילה</label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingDept(null)} className="admin-btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> ביטול</button>
                      <button onClick={() => handleSave(id)} disabled={saving} className="admin-btn-primary flex items-center gap-2">
                        <Save className="w-4 h-4" /> {saving ? 'שומר...' : 'שמור'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {s.systemPromptOverride && (
                      <pre className="text-xs text-slate-400 bg-slate-900/60 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono max-h-32">{s.systemPromptOverride.slice(0, 300)}{s.systemPromptOverride.length > 300 ? '...' : ''}</pre>
                    )}
                    {s.defaultModel && <p className="text-xs text-slate-400">מודל: <span className="font-mono text-slate-200">{s.defaultModel}</span></p>}
                    <button onClick={() => startEdit(id)} className="admin-btn-secondary flex items-center gap-2 text-sm"><Edit3 className="w-4 h-4" /> ערוך</button>
                    <DeptTeamMembers deptId={id} />
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Skills Tab ─────────────────────────────────────────────────────────────────
function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', labelHe: '', color: '#6366f1', category: 'tech', description: '' });
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch<Skill[]>('/admin/nexus/skills').then((d) => setSkills(Array.isArray(d) ? d : [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.labelHe) { alert('name + labelHe נדרשים'); return; }
    setSaving(true);
    try {
      await apiFetch('/admin/nexus/skills', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', labelHe: '', color: '#6366f1', category: 'tech', description: '' });
      setShowForm(false);
      load();
    } catch { alert('שגיאה ביצירה'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק?')) return;
    try { await apiFetch(`/admin/nexus/skills/${id}`, { method: 'DELETE' }); load(); }
    catch { alert('שגיאה במחיקה'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={() => downloadJson(skills, 'nexus-skills.json')} className="admin-btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> ייצא JSON
        </button>
        <button onClick={() => setShowForm(!showForm)} className="admin-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> הוסף Skill
        </button>
      </div>

      {showForm && (
        <div className="admin-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">שם (EN)</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="react" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">תווית עברית</label>
              <input value={form.labelHe} onChange={(e) => setForm({ ...form, labelHe: e.target.value })}
                placeholder="ריאקט" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">קטגוריה</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500">
                {['tech', 'design', 'security', 'data', 'business', 'legal'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">צבע</label>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 rounded-lg bg-slate-800 border border-slate-600 px-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="admin-btn-secondary"><X className="w-4 h-4" /></button>
            <button onClick={handleCreate} disabled={saving} className="admin-btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {skills.map((s) => (
          <div key={s.id} className="admin-card flex items-start gap-3 p-3">
            <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: s.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100">{s.labelHe}</p>
              <p className="text-xs admin-muted font-mono mb-1">{s.name} • {s.category}</p>
              {s.description && <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>}
            </div>
            <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {skills.length === 0 && <p className="col-span-2 text-sm admin-muted text-center py-8">אין Skills עדיין</p>}
      </div>
    </div>
  );
}

// ── Rules Tab ─────────────────────────────────────────────────────────────────
function RulesTab() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', triggerType: 'brief_approved', conditionJson: '{}', actionType: 'notify_admin', actionPayload: '{}', priority: 0 });
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch<Rule[]>('/admin/nexus/rules').then((d) => setRules(Array.isArray(d) ? d : [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name) { alert('שם נדרש'); return; }
    setSaving(true);
    try {
      await apiFetch('/admin/nexus/rules', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          conditionJson: JSON.parse(form.conditionJson || '{}'),
          actionPayload: JSON.parse(form.actionPayload || '{}'),
        }),
      });
      setShowForm(false);
      load();
    } catch (e: any) { alert(e.message ?? 'שגיאה'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק?')) return;
    try { await apiFetch(`/admin/nexus/rules/${id}`, { method: 'DELETE' }); load(); }
    catch { alert('שגיאה'); }
  };

  const handleToggleActive = async (rule: Rule) => {
    try {
      await apiFetch(`/admin/nexus/rules/${rule.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !rule.isActive }) });
      load();
    } catch { alert('שגיאה'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={() => downloadJson(rules, 'nexus-rules.json')} className="admin-btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> ייצא JSON
        </button>
        <button onClick={() => setShowForm(!showForm)} className="admin-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> הוסף Rule
        </button>
      </div>

      {showForm && (
        <div className="admin-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">שם</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Trigger Type</label>
              <select value={form.triggerType} onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none">
                {['brief_approved', 'brief_rejected', 'research_done', 'task_created', 'sprint_created'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Action Type</label>
              <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none">
                {['notify_admin', 'auto_extract_tasks', 'auto_create_sprint', 'webhook', 'log'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="admin-btn-secondary"><X className="w-4 h-4" /></button>
            <button onClick={handleCreate} disabled={saving} className="admin-btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="admin-card p-4">
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${r.isActive ? 'bg-green-500' : 'bg-slate-600'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100">{r.name}</p>
                <p className="text-xs admin-muted font-mono">{r.triggerType} → {r.actionType} {r.priority > 0 ? `(priority: ${r.priority})` : ''}</p>
                {r.description && <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">condition</p>
                    <pre className="text-xs font-mono text-slate-300 bg-slate-900/60 rounded px-2 py-1 overflow-x-auto">{JSON.stringify(r.conditionJson, null, 2)}</pre>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">action payload</p>
                    <pre className="text-xs font-mono text-slate-300 bg-slate-900/60 rounded px-2 py-1 overflow-x-auto">{JSON.stringify(r.actionPayload, null, 2)}</pre>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggleActive(r)} className={`text-xs px-2 py-1 rounded ${r.isActive ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-slate-600/20 text-slate-400 hover:bg-green-500/20 hover:text-green-400'} transition-colors`}>
                  {r.isActive ? 'פעיל' : 'מושבת'}
                </button>
                <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {rules.length === 0 && <p className="text-sm admin-muted text-center py-8">אין Rules עדיין</p>}
      </div>
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────────────────────
function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nameHe: '', description: '', departments: DEPT_IDS, models: [] as string[], codebaseDepth: 'deep', codebaseScope: 'all', isDefault: false });
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch<Template[]>('/admin/nexus/templates').then((d) => setTemplates(Array.isArray(d) ? d : [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.nameHe) { alert('name + nameHe נדרשים'); return; }
    setSaving(true);
    try {
      await apiFetch('/admin/nexus/templates', { method: 'POST', body: JSON.stringify({ ...form, departments: form.departments }) });
      setShowForm(false);
      load();
    } catch { alert('שגיאה'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק?')) return;
    try { await apiFetch(`/admin/nexus/templates/${id}`, { method: 'DELETE' }); load(); }
    catch { alert('שגיאה'); }
  };

  const toggleDept = (d: string) => setForm((prev) => ({
    ...prev,
    departments: prev.departments.includes(d) ? prev.departments.filter((x) => x !== d) : [...prev.departments, d],
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={() => downloadJson(templates, 'nexus-templates.json')} className="admin-btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> ייצא JSON
        </button>
        <button onClick={() => setShowForm(!showForm)} className="admin-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> תבנית חדשה
        </button>
      </div>

      {showForm && (
        <div className="admin-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">שם (EN)</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">שם עברית</label>
              <input value={form.nameHe} onChange={(e) => setForm({ ...form, nameHe: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" dir="rtl" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block">מחלקות בתבנית</label>
            <div className="flex flex-wrap gap-2">
              {DEPT_IDS.map((d) => (
                <button key={d} onClick={() => toggleDept(d)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${form.departments.includes(d) ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border border-slate-600 text-slate-400'}`}>
                  <span>{DEPT_DEFAULTS[d]?.emoji}</span> {DEPT_DEFAULTS[d]?.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="admin-btn-secondary"><X className="w-4 h-4" /></button>
            <button onClick={handleCreate} disabled={saving} className="admin-btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="admin-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-100">{t.nameHe}</h3>
                  {t.isDefault && <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">ברירת מחדל</span>}
                </div>
                <p className="text-xs admin-muted font-mono mt-0.5">{t.name}</p>
              </div>
              <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {t.description && <p className="text-xs text-slate-400 mb-2 leading-relaxed">{t.description}</p>}
            <div className="flex flex-wrap gap-1 mb-2">
              {t.departments.map((d) => (
                <span key={d} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  <span>{DEPT_DEFAULTS[d]?.emoji ?? '🔹'}</span> {DEPT_DEFAULTS[d]?.label.split(' ')[0] ?? d}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 font-mono">
              <span>depth: <span className="text-slate-300">{t.codebaseDepth}</span></span>
              <span>scope: <span className="text-slate-300">{t.codebaseScope}</span></span>
              {t.models?.length > 0 && <span>models: <span className="text-slate-300">{t.models.join(', ')}</span></span>}
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="text-sm admin-muted text-center py-8">אין תבניות עדיין</p>}
      </div>
    </div>
  );
}

// ── AgentsTab ─────────────────────────────────────────────────────────────────
const ALL_DEPT_META = [
  { id: 'ceo',      hebrewName: 'מנכ"ל', emoji: '👔' },
  { id: 'cto',      hebrewName: 'CTO',   emoji: '⚙️' },
  { id: 'cpo',      hebrewName: 'CPO',   emoji: '🎯' },
  { id: 'rd',       hebrewName: 'R&D',   emoji: '🔬' },
  { id: 'design',   hebrewName: 'עיצוב', emoji: '🎨' },
  { id: 'product',  hebrewName: 'מוצר',  emoji: '📋' },
  { id: 'security', hebrewName: 'אבטחה', emoji: '🔒' },
  { id: 'legal',    hebrewName: 'משפטי', emoji: '⚖️' },
  { id: 'marketing',hebrewName: 'שיווק',        emoji: '📣' },
  { id: 'finance',  hebrewName: 'CFO / פיננסים', emoji: '💰' },
];

function AgentsTab() {
  const [configs, setConfigs] = useState<Record<string, DeptConfig>>({});
  const [deptSettings, setDeptSettings] = useState<DeptSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ systemPromptOverride: '', defaultModel: '' });
  const [saving, setSaving] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ departments: DeptConfig[] }>('/admin/nexus/dept-configs'),
      apiFetch<DeptSetting[]>('/admin/nexus/dept-settings'),
    ]).then(([cfgRes, settingsRes]) => {
      const map: Record<string, DeptConfig> = {};
      for (const c of cfgRes.departments ?? []) map[c.id] = c;
      setConfigs(map);
      setDeptSettings(Array.isArray(settingsRes) ? settingsRes : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getSetting = (deptId: string) => deptSettings.find((s) => s.department === deptId);

  const openEdit = (deptId: string) => {
    const s = getSetting(deptId);
    setEditForm({ systemPromptOverride: s?.systemPromptOverride ?? '', defaultModel: s?.defaultModel ?? '' });
    setEditingDept(deptId);
  };

  const handleSave = async () => {
    if (!editingDept) return;
    setSaving(true);
    try {
      const meta = ALL_DEPT_META.find((d) => d.id === editingDept)!;
      const s = getSetting(editingDept);
      await apiFetch(`/admin/nexus/dept-settings/${editingDept}`, {
        method: 'PUT',
        body: JSON.stringify({
          labelHe: s?.labelHe ?? meta.hebrewName,
          emoji: s?.emoji ?? meta.emoji,
          systemPromptOverride: editForm.systemPromptOverride || null,
          defaultModel: editForm.defaultModel || null,
          isActive: s?.isActive ?? true,
          outputSections: null,
        }),
      });
      const updated = await apiFetch<DeptSetting[]>('/admin/nexus/dept-settings');
      setDeptSettings(Array.isArray(updated) ? updated : []);
      setEditingDept(null);
    } catch { alert('שגיאה בשמירה'); } finally { setSaving(false); }
  };

  if (loading) return <div className="text-sm admin-muted text-center py-12">טוען agents...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">AI Agents — מחלקות</h2>
          <p className="text-xs admin-muted mt-0.5">כל מחלקה מריצה agent עצמאי עם system prompt. ניתן לעקוף את prompt הברירת מחדל.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {ALL_DEPT_META.map((meta) => {
          const cfg = configs[meta.id];
          const s = getSetting(meta.id);
          const hasOverride = !!s?.systemPromptOverride;
          const isExpanded = expandedPrompt === meta.id;
          return (
            <div key={meta.id} className="admin-card space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{cfg?.emoji ?? meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-100">{cfg?.hebrewName ?? meta.hebrewName}</span>
                      {hasOverride && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">override פעיל</span>}
                      {s?.defaultModel && <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700 text-slate-300 font-mono">{s.defaultModel}</span>}
                    </div>
                    {cfg?.outputSections?.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {cfg.outputSections.map((sec) => (
                          <span key={sec} className="px-1.5 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{sec}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setExpandedPrompt(isExpanded ? null : meta.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    System Prompt
                  </button>
                  <button onClick={() => openEdit(meta.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> ערוך
                  </button>
                </div>
              </div>

              {/* System prompt viewer */}
              {isExpanded && cfg?.systemPrompt && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {hasOverride ? '✏️ Override (פעיל)' : '📄 System Prompt (ברירת מחדל)'}
                    </span>
                  </div>
                  <pre className="text-xs text-slate-300 bg-slate-900 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed border border-slate-700">
                    {hasOverride ? s!.systemPromptOverride : cfg.systemPrompt}
                  </pre>
                  {hasOverride && (
                    <details className="mt-2">
                      <summary className="text-xs admin-muted cursor-pointer hover:text-slate-300">הצג prompt מקורי</summary>
                      <pre className="text-xs text-slate-500 bg-slate-900/50 rounded p-2 mt-1 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap font-mono border border-slate-800">
                        {cfg.systemPrompt}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingDept && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-slate-100">
                {ALL_DEPT_META.find((d) => d.id === editingDept)?.emoji} עריכת Agent — {ALL_DEPT_META.find((d) => d.id === editingDept)?.hebrewName}
              </h3>
              <button onClick={() => setEditingDept(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">מודל ברירת מחדל</label>
                <input
                  value={editForm.defaultModel}
                  onChange={(e) => setEditForm((f) => ({ ...f, defaultModel: e.target.value }))}
                  placeholder="claude-sonnet-4-6"
                  className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">System Prompt Override <span className="text-slate-500">(ריק = ברירת מחדל)</span></label>
                <textarea
                  value={editForm.systemPromptOverride}
                  onChange={(e) => setEditForm((f) => ({ ...f, systemPromptOverride: e.target.value }))}
                  placeholder="השאר ריק להשתמש בprompt הקוד. הזן כאן לעקוף אותו."
                  rows={12}
                  className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm font-mono leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                />
                {configs[editingDept]?.systemPrompt && (
                  <div className="mt-2">
                    <details>
                      <summary className="text-xs admin-muted cursor-pointer hover:text-slate-300">הצג prompt המקורי לעיון</summary>
                      <pre className="text-xs text-slate-500 bg-slate-900/50 rounded p-2 mt-1 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap font-mono border border-slate-800">
                        {configs[editingDept].systemPrompt}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
              <button onClick={() => setEditingDept(null)} className="px-3 py-1.5 rounded text-sm text-slate-400 hover:text-slate-200">ביטול</button>
              {editForm.systemPromptOverride && <button onClick={() => setEditForm((f) => ({ ...f, systemPromptOverride: '' }))} className="px-3 py-1.5 rounded text-sm text-amber-400 hover:text-amber-300">נקה override</button>}
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
                {saving ? 'שומר...' : <><Save className="w-3.5 h-3.5" /> שמור</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WebSourcesTab ─────────────────────────────────────────────────────────────
const SOURCE_TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  rss:     { icon: <Rss className="w-4 h-4" />,     label: 'RSS',     color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  youtube: { icon: <Youtube className="w-4 h-4" />, label: 'YouTube', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  reddit:  { icon: <span className="text-sm">🤖</span>, label: 'Reddit', color: 'bg-orange-600/20 text-orange-400 border-orange-600/30' },
  github:  { icon: <span className="text-sm">🐙</span>, label: 'GitHub',  color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

const CATEGORY_COLORS: Record<string, string> = {
  tech: 'bg-blue-500/20 text-blue-300', ai: 'bg-purple-500/20 text-purple-300',
  security: 'bg-red-500/20 text-red-300', design: 'bg-pink-500/20 text-pink-300',
  product: 'bg-teal-500/20 text-teal-300', marketing: 'bg-amber-500/20 text-amber-300',
  healthcare: 'bg-emerald-500/20 text-emerald-300', devops: 'bg-cyan-500/20 text-cyan-300',
  frontend: 'bg-sky-500/20 text-sky-300', backend: 'bg-indigo-500/20 text-indigo-300',
  business: 'bg-yellow-500/20 text-yellow-300', legal: 'bg-slate-500/20 text-slate-300',
  youtube: 'bg-red-500/20 text-red-300',
};

function WebSourcesTab() {
  const [feeds, setFeeds] = useState<WebFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ sourceType: 'rss', url: '', label: '', category: 'tech', departments: '' });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch<WebFeed[]>('/admin/nexus/web-feeds')
      .then((d) => setFeeds(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleToggle = async (feed: WebFeed) => {
    setToggling(feed.id);
    try {
      await apiFetch(`/admin/nexus/web-feeds/${feed.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !feed.isActive }),
      });
      setFeeds((prev) => prev.map((f) => f.id === feed.id ? { ...f, isActive: !f.isActive } : f));
    } catch { alert('שגיאה'); } finally { setToggling(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק מקור זה?')) return;
    try {
      await apiFetch(`/admin/nexus/web-feeds/${id}`, { method: 'DELETE' });
      setFeeds((prev) => prev.filter((f) => f.id !== id));
    } catch { alert('שגיאה'); }
  };

  const handleAdd = async () => {
    if (!addForm.url || !addForm.label) { alert('URL ושם נדרשים'); return; }
    setSaving(true);
    try {
      const depts = addForm.departments.trim() ? addForm.departments.split(',').map((d) => d.trim()).filter(Boolean) : null;
      await apiFetch('/admin/nexus/web-feeds', {
        method: 'POST',
        body: JSON.stringify({ ...addForm, departments: depts }),
      });
      load();
      setShowAddModal(false);
      setAddForm({ sourceType: 'rss', url: '', label: '', category: 'tech', departments: '' });
    } catch { alert('שגיאה בשמירה'); } finally { setSaving(false); }
  };

  const filtered = feeds.filter((f) => {
    if (filterType !== 'all' && f.sourceType !== filterType) return false;
    if (filterDept !== 'all' && !(f.departments === null || f.departments?.includes(filterDept))) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!f.label.toLowerCase().includes(q) && !f.url.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = feeds.reduce((acc, f) => { acc[f.sourceType] = (acc[f.sourceType] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const activeCount = feeds.filter((f) => f.isActive).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">מקורות מידע ({feeds.length})</h2>
          <p className="text-xs admin-muted mt-0.5">{activeCount} פעילים — RSS, YouTube, Reddit, GitHub</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadJson(feeds, 'nexus-web-feeds.json')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-600 transition-colors">
            <Download className="w-3.5 h-3.5" /> ייצא JSON
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            <Plus className="w-3.5 h-3.5" /> הוסף מקור
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(counts).map(([type, count]) => {
          const meta = SOURCE_TYPE_META[type];
          return (
            <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${meta?.color ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
              {meta?.icon} {meta?.label ?? type}: {count}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Type filter */}
        <div className="flex gap-1 p-1 rounded-lg bg-slate-800 border border-slate-700">
          {['all', 'rss', 'youtube', 'reddit', 'github'].map((t) => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterType === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {t === 'all' ? 'הכל' : SOURCE_TYPE_META[t]?.label ?? t}
            </button>
          ))}
        </div>
        {/* Dept filter */}
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500">
          <option value="all">כל המחלקות</option>
          {ALL_DEPT_META.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.hebrewName}</option>)}
        </select>
        {/* Search */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש..." className="bg-transparent text-xs text-slate-300 outline-none flex-1 placeholder:text-slate-600" />
        </div>
      </div>

      {/* Feed list */}
      {loading ? (
        <div className="text-sm admin-muted text-center py-12">טוען מקורות...</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((feed) => {
            const meta = SOURCE_TYPE_META[feed.sourceType];
            return (
              <div key={feed.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${feed.isActive ? 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600' : 'bg-slate-800/20 border-slate-800 opacity-60'}`}>
                {/* Icon + type */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg border shrink-0 ${meta?.color ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                  {meta?.icon ?? <Globe className="w-4 h-4" />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-200">{feed.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${CATEGORY_COLORS[feed.category] ?? 'bg-slate-700 text-slate-300'}`}>{feed.category}</span>
                    {feed.departments ? (
                      feed.departments.map((d) => {
                        const dm = ALL_DEPT_META.find((x) => x.id === d);
                        return <span key={d} className="px-1.5 py-0.5 rounded text-xs bg-slate-700 text-slate-400">{dm?.emoji} {d}</span>;
                      })
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700/50 text-slate-500">כל המחלקות</span>
                    )}
                  </div>
                  <p className="text-xs admin-muted mt-0.5 truncate max-w-md">{feed.url}</p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(feed)}
                    disabled={toggling === feed.id}
                    title={feed.isActive ? 'השבת' : 'הפעל'}
                    className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                  >
                    {feed.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDelete(feed.id)} className="text-red-400/50 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm admin-muted text-center py-8">אין מקורות תואמים לסינון</p>}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-slate-100">הוסף מקור מידע</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">סוג</label>
                  <select value={addForm.sourceType} onChange={(e) => setAddForm((f) => ({ ...f, sourceType: e.target.value }))} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="rss">RSS</option>
                    <option value="youtube">YouTube</option>
                    <option value="reddit">Reddit (subreddit name)</option>
                    <option value="github">GitHub (search query)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">קטגוריה</label>
                  <select value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500">
                    {['tech','frontend','backend','ai','security','design','product','marketing','healthcare','devops','business','legal'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">URL / שם</label>
                <input value={addForm.url} onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))} placeholder={addForm.sourceType === 'reddit' ? 'reactjs (שם subreddit ללא r/)' : addForm.sourceType === 'github' ? 'react healthcare app' : 'https://...'} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">שם לתצוגה</label>
                <input value={addForm.label} onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))} placeholder="CSS-Tricks" className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">מחלקות <span className="text-slate-500">(אופציונלי, מופרד בפסיק)</span></label>
                <input value={addForm.departments} onChange={(e) => setAddForm((f) => ({ ...f, departments: e.target.value }))} placeholder="cto,rd (ריק = כל המחלקות)" className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1.5 rounded text-sm text-slate-400 hover:text-slate-200">ביטול</button>
              <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
                {saving ? 'שומר...' : <><Plus className="w-3.5 h-3.5" /> הוסף</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'departments', label: 'מחלקות',     icon: <Settings className="w-4 h-4" /> },
  { id: 'skills',      label: 'Skills',     icon: <Sparkles className="w-4 h-4" /> },
  { id: 'rules',       label: 'Rules',      icon: <Shield className="w-4 h-4" /> },
  { id: 'templates',   label: 'תבניות',     icon: <ListChecks className="w-4 h-4" /> },
  { id: 'agents',      label: 'Agents',     icon: <Bot className="w-4 h-4" /> },
  { id: 'websources',  label: 'Web Sources', icon: <Globe className="w-4 h-4" /> },
];

export default function AdminNexusSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('departments');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Nexus — הגדרות</h1>
        <p className="text-sm admin-muted mt-1">ניהול מחלקות, Skills, Rules, תבניות, AI Agents ומקורות מידע</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-slate-800 border border-slate-700 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'departments' && <DepartmentsTab />}
      {activeTab === 'skills' && <SkillsTab />}
      {activeTab === 'rules' && <RulesTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'agents' && <AgentsTab />}
      {activeTab === 'websources' && <WebSourcesTab />}
    </div>
  );
}
