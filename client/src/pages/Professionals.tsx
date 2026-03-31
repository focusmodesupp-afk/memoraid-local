import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  Briefcase, Plus, Search, X, Pencil, Trash2, Phone, Mail,
  Globe, MapPin, FileText, Calendar, Building2, ChevronRight,
  Loader2, Brain, Printer,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useI18n } from '../i18n';

type Professional = {
  id: string;
  familyId: string;
  name: string;
  category: string;
  specialty: string | null;
  clinicOrCompany: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  linkedDocumentIds: string[];
  lastInteractionDate: string | null;
  source: string;
  createdAt: string;
};

type ProfFormData = Omit<Professional, 'id' | 'familyId' | 'source' | 'linkedDocumentIds' | 'createdAt'>;

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  medical:   { label: 'רפואי',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',   icon: '🏥' },
  legal:     { label: 'משפטי',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: '⚖️' },
  financial: { label: 'פיננסי',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: '💰' },
  welfare:   { label: 'רווחה',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: '🤝' },
  other:     { label: 'אחר',     color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',        icon: '👤' },
};

const EMPTY_FORM: ProfFormData = {
  name: '',
  category: 'medical',
  specialty: null,
  clinicOrCompany: null,
  phone: null,
  fax: null,
  email: null,
  address: null,
  website: null,
  notes: null,
  lastInteractionDate: null,
};

export default function ProfessionalsPage() {
  const { dir } = useI18n();
  const [, navigate] = useLocation();
  const [list, setList] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadProfessionals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Professional[]>('/professionals');
      setList(data);
    } catch { setList([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProfessionals(); }, [loadProfessionals]);

  const filtered = useMemo(() => {
    let base = tab === 'all' ? list : list.filter((p) => p.category === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.specialty?.toLowerCase().includes(q) ||
        p.clinicOrCompany?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    return base;
  }, [list, tab, search]);

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(pro: Professional) {
    setEditingId(pro.id);
    setForm({
      name: pro.name,
      category: pro.category,
      specialty: pro.specialty,
      clinicOrCompany: pro.clinicOrCompany,
      phone: pro.phone,
      fax: pro.fax,
      email: pro.email,
      address: pro.address,
      website: pro.website,
      notes: pro.notes,
      lastInteractionDate: pro.lastInteractionDate,
    });
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        const updated = await apiFetch<Professional>(`/professionals/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        setList((prev) => prev.map((p) => p.id === editingId ? updated : p));
      } else {
        const created = await apiFetch<Professional>('/professionals', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setList((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setSaveError(err?.message ?? 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`/professionals/${id}`, { method: 'DELETE' });
      setList((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
      if (editingId === id) setModalOpen(false);
    } catch { /* ignored */ }
    finally { setDeletingId(null); }
  }

  function setField<K extends keyof ProfFormData>(k: K, v: ProfFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const tabs = [
    { id: 'all', label: 'הכל' },
    ...Object.entries(CATEGORY_CONFIG).map(([id, { label, icon }]) => ({ id, label: `${icon} ${label}` })),
  ];

  return (
    <div dir={dir} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 shrink-0">
            <Briefcase className="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h2 className="page-title">אנשי מקצוע</h2>
            <p className="page-subtitle">רכז רופאים, עורכי דין, יועצים ועוד — AI מחלץ מהמסמכים אוטומטית</p>
          </div>
        </div>
        <button type="button" onClick={openNew} className="btn-primary gap-2 shrink-0">
          <Plus className="w-4 h-4" /> הוסף איש מקצוע
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-[hsl(var(--border))] pb-0">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`whitespace-nowrap flex items-center gap-1 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            {label}
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              ({id === 'all' ? list.length : list.filter((p) => p.category === id).length})
            </span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חפש לפי שם, התמחות, מרפאה..."
          className="input-base w-full pr-10"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="section-card">
          <div className="empty-block">
            <Briefcase className="h-12 w-12 text-[hsl(var(--muted-foreground))]/40" />
            <p className="font-medium">{list.length === 0 ? 'אין עדיין אנשי מקצוע' : 'לא נמצאו תוצאות'}</p>
            {list.length === 0 && (
              <p className="text-xs text-center max-w-xs">
                הוסף ידנית, או העלה מסמך רפואי — AI יזהה ויוסיף רופאים אוטומטית
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pro) => {
            const cat = CATEGORY_CONFIG[pro.category] ?? CATEGORY_CONFIG.other;
            return (
              <div
                key={pro.id}
                className="section-card p-4 cursor-pointer hover:border-[hsl(var(--primary))]/40 transition-colors relative group"
                onClick={() => openEdit(pro)}
              >
                {/* Source badge */}
                {pro.source === 'ai_extracted' && (
                  <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 font-medium dark:bg-purple-900/30 dark:text-purple-300">
                    <Brain className="w-2.5 h-2.5" /> AI
                  </span>
                )}

                <div className="flex items-start gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-xl shrink-0 bg-[hsl(var(--muted))]">
                    {cat.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{pro.name}</p>
                    {pro.specialty && <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{pro.specialty}</p>}
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
                </div>

                <div className="space-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {pro.clinicOrCompany && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3 h-3 shrink-0" /><span className="truncate">{pro.clinicOrCompany}</span>
                    </div>
                  )}
                  {pro.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 shrink-0" /><span dir="ltr">{pro.phone}</span>
                    </div>
                  )}
                  {pro.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{pro.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[hsl(var(--border))]">
                  {pro.lastInteractionDate && (
                    <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      <Calendar className="w-3 h-3" />
                      {new Date(pro.lastInteractionDate).toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  {pro.linkedDocumentIds?.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] mr-auto">
                      <FileText className="w-3 h-3" />{pro.linkedDocumentIds.length} מסמכים
                    </div>
                  )}
                  {/* Delete btn */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(pro.id); }}
                    className="mr-auto opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-opacity"
                    title="מחק"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Confirm delete overlay */}
                {confirmDeleteId === pro.id && (
                  <div
                    className="absolute inset-0 z-10 rounded-xl flex flex-col items-center justify-center gap-2 bg-[hsl(var(--card))]/95 border border-[hsl(var(--destructive))]/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-sm font-medium text-[hsl(var(--destructive))]">למחוק לצמיתות?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleDelete(pro.id)} disabled={deletingId === pro.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[hsl(var(--destructive))] text-white text-xs font-medium disabled:opacity-60">
                        {deletingId === pro.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        מחק
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 rounded-md border border-[hsl(var(--border))] text-xs">ביטול</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl overflow-hidden" dir={dir}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h2 className="text-base font-semibold">
                  {editingId ? 'עריכת פרופיל' : 'איש מקצוע חדש'}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {editingId && (
                  <button type="button" onClick={() => setConfirmDeleteId(editingId)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button type="button" onClick={() => setModalOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Confirm delete in modal */}
            {confirmDeleteId === editingId && editingId && (
              <div className="px-5 py-3 bg-[hsl(var(--destructive))]/5 border-b border-[hsl(var(--destructive))]/20">
                <p className="text-sm font-medium text-[hsl(var(--destructive))] mb-2">למחוק איש מקצוע זה לצמיתות?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleDelete(editingId)} disabled={deletingId === editingId}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[hsl(var(--destructive))] text-white text-xs font-medium disabled:opacity-60">
                    {deletingId === editingId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    כן, מחק
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 rounded-md border border-[hsl(var(--border))] text-xs">ביטול</button>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Name + Category */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-base">שם *</label>
                  <input type="text" required className="input-base w-full" value={form.name}
                    onChange={(e) => setField('name', e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label-base">קטגוריה</label>
                  <select className="input-base w-full" value={form.category} onChange={(e) => setField('category', e.target.value)}>
                    {Object.entries(CATEGORY_CONFIG).map(([k, { label, icon }]) => (
                      <option key={k} value={k}>{icon} {label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Specialty + Clinic */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-base">תחום / התמחות</label>
                  <input type="text" className="input-base w-full" value={form.specialty ?? ''}
                    onChange={(e) => setField('specialty', e.target.value || null)} placeholder="קרדיולוג, עו&quot;ד, יועץ..." />
                </div>
                <div>
                  <label className="label-base">מרפאה / חברה</label>
                  <input type="text" className="input-base w-full" value={form.clinicOrCompany ?? ''}
                    onChange={(e) => setField('clinicOrCompany', e.target.value || null)} />
                </div>
              </div>

              {/* Phone + Fax */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-base flex items-center gap-1"><Phone className="w-3 h-3" /> טלפון</label>
                  <input type="tel" className="input-base w-full" value={form.phone ?? ''}
                    onChange={(e) => setField('phone', e.target.value || null)} dir="ltr" />
                </div>
                <div>
                  <label className="label-base flex items-center gap-1"><Printer className="w-3 h-3" /> פקס</label>
                  <input type="tel" className="input-base w-full" value={form.fax ?? ''}
                    onChange={(e) => setField('fax', e.target.value || null)} dir="ltr" />
                </div>
              </div>

              {/* Email + Website */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-base flex items-center gap-1"><Mail className="w-3 h-3" /> אימייל</label>
                  <input type="email" className="input-base w-full" value={form.email ?? ''}
                    onChange={(e) => setField('email', e.target.value || null)} dir="ltr" />
                </div>
                <div>
                  <label className="label-base flex items-center gap-1"><Globe className="w-3 h-3" /> אתר</label>
                  <input type="url" className="input-base w-full" value={form.website ?? ''}
                    onChange={(e) => setField('website', e.target.value || null)} dir="ltr" placeholder="https://..." />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="label-base flex items-center gap-1"><MapPin className="w-3 h-3" /> כתובת</label>
                <input type="text" className="input-base w-full" value={form.address ?? ''}
                  onChange={(e) => setField('address', e.target.value || null)} />
              </div>

              {/* Last interaction date */}
              <div>
                <label className="label-base flex items-center gap-1"><Calendar className="w-3 h-3" /> אינטראקציה אחרונה</label>
                <input type="date" className="input-base w-full" value={form.lastInteractionDate ?? ''}
                  onChange={(e) => setField('lastInteractionDate', e.target.value || null)} />
              </div>

              {/* Notes */}
              <div>
                <label className="label-base">הערות</label>
                <textarea rows={3} className="input-base w-full resize-none" value={form.notes ?? ''}
                  onChange={(e) => setField('notes', e.target.value || null)} placeholder="מידע נוסף..." />
              </div>

              {/* Linked documents info */}
              {editingId && list.find((p) => p.id === editingId)?.linkedDocumentIds?.length ? (
                <div className="rounded-lg border border-[hsl(var(--border))] px-3 py-2">
                  <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                    מסמכים קשורים
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(list.find((p) => p.id === editingId)?.linkedDocumentIds ?? []).map((docId) => (
                      <button
                        key={docId}
                        type="button"
                        onClick={() => { setModalOpen(false); navigate(`/medical-documents?docId=${docId}`); }}
                        className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 px-2 py-0.5 text-[11px] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10"
                      >
                        <FileText className="w-3 h-3" />
                        {docId.slice(0, 8)}…
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {saveError && (
                <p className="text-xs text-[hsl(var(--destructive))] rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/5 px-3 py-2">
                  {saveError}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1 border-t border-[hsl(var(--border))]">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-outline px-4 py-2 text-sm flex-1">ביטול</button>
                <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary px-4 py-2 text-sm flex-1 disabled:opacity-60">
                  {saving ? 'שומר...' : editingId ? 'שמור שינויים' : 'הוסף'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
