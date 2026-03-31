import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  X, ClipboardList, UserRound, Users, FileText, Calendar, Brain,
  Plus, Trash2, CheckSquare, Square, Loader2, Paperclip, ExternalLink,
  Link2, Upload, Clock, CalendarClock, AlertCircle,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';

export type TaskFormData = {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'scheduled' | 'done' | 'cancelled' | 'stuck' | 'postponed';
  category: 'medical' | 'personal' | 'administrative' | 'shopping' | 'transport' | 'other';
  dueDate: string;
  assignedToUserId?: string;
  coAssigneeIds?: string[];
  taskFor?: 'patient' | 'caregiver' | 'all';
  linkedDocumentIds?: string[];
};

type ChecklistItem = {
  id: string;
  taskId: string;
  text: string;
  isDone: boolean;
  position: number;
};

type MedicalDoc = {
  id: string;
  title: string;
  documentType: string | null;
  documentDate?: string | null;   // date on the medical document (doctor's date)
  createdAt?: string;             // when uploaded to the system
};
type FamilyMember = { userId: string; fullName: string; role: string; userColor?: string };

type Props = {
  open: boolean;
  initialData?: Partial<TaskFormData> & {
    id?: string;
    sourceDocTitle?: string;
    sourceEntityId?: string;      // ID of the medical document that generated this task
    sourceEntityType?: string;    // e.g. 'medical_document'
    taskCreatedAt?: string;       // when the task was created in the system
    assignedToName?: string;
  };
  onClose: () => void;
  onSave: (data: TaskFormData, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  familyMembers?: FamilyMember[];
};

const EMPTY: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  category: 'other',
  dueDate: '',
  assignedToUserId: '',
  coAssigneeIds: [],
  taskFor: 'all',
  linkedDocumentIds: [],
};

const PRIORITY_LABELS_HE = { urgent: 'דחוף 🔴', high: 'גבוהה 🟠', medium: 'בינונית 🟡', low: 'נמוכה 🟢' };
const STATUS_LABELS_HE = { todo: 'לביצוע', in_progress: 'בביצוע', scheduled: 'מתוזמן', done: 'הושלם', cancelled: 'בוטל', stuck: 'תקוע', postponed: 'נדחה' };
const CAT_LABELS_HE = { medical: 'רפואי 🏥', personal: 'אישי 👤', administrative: 'אדמין 📋', shopping: 'קניות 🛒', transport: 'הסעה 🚗', other: 'אחר' };

function UserAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold shrink-0"
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </span>
  );
}

export default function TaskModal({ open, initialData, onClose, onSave, onDelete, familyMembers: propMembers }: Props) {
  const { lang, dir } = useI18n();
  const [, navigate] = useLocation();
  const [form, setForm] = useState<TaskFormData>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>(propMembers ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Checklist
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [checklistsLoaded, setChecklistsLoaded] = useState(false);
  const [newCheckText, setNewCheckText] = useState('');
  const [addingCheck, setAddingCheck] = useState(false);

  // AI decompose
  const [decomposing, setDecomposing] = useState(false);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);

  // Documents
  const [docs, setDocs] = useState<MedicalDoc[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [docSearch, setDocSearch] = useState('');

  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (open) {
      setForm({
        title: initialData?.title ?? '',
        description: initialData?.description ?? '',
        priority: initialData?.priority ?? 'medium',
        status: initialData?.status ?? 'todo',
        category: initialData?.category ?? 'other',
        dueDate: initialData?.dueDate ? initialData.dueDate.slice(0, 10) : '',
        assignedToUserId: initialData?.assignedToUserId ?? '',
        coAssigneeIds: (initialData as any)?.coAssigneeIds ?? [],
        taskFor: initialData?.taskFor ?? 'all',
        linkedDocumentIds: (initialData as any)?.linkedDocumentIds ?? [],
      });
      setError(null);
      setConfirmDelete(false);
      setChecklists([]);
      setChecklistsLoaded(false);
      setNewCheckText('');
      setDecomposeError(null);
      setShowDocPicker(false);
      setDocSearch('');
    }
  }, [open, initialData]);

  // Load family members once
  useEffect(() => {
    if (!open || members.length > 0) return;
    apiFetch<{ members?: FamilyMember[] }>('/families/me')
      .then((r) => { if (r.members?.length) setMembers(r.members); })
      .catch(() => {});
  }, [open]);

  // Load checklists when editing
  const loadChecklists = useCallback(async () => {
    if (!initialData?.id || checklistsLoaded) return;
    try {
      const items = await apiFetch<ChecklistItem[]>(`/tasks/${initialData.id}/checklists`);
      setChecklists(items);
      setChecklistsLoaded(true);
    } catch { /* ignored */ }
  }, [initialData?.id, checklistsLoaded]);

  useEffect(() => {
    if (open && isEdit) loadChecklists();
  }, [open, isEdit, loadChecklists]);

  // Load medical docs (with dates for timeline display)
  useEffect(() => {
    if (!open || docsLoaded) return;
    apiFetch<any>('/medical-documents')
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setDocs(list.map((d: any) => ({
          id: d.id,
          title: d.title ?? 'מסמך ללא שם',
          documentType: d.documentType,
          documentDate: d.documentDate ?? null,
          createdAt: d.createdAt,
        })));
        setDocsLoaded(true);
      })
      .catch(() => {});
  }, [open, docsLoaded]);

  if (!open) return null;

  function set<K extends keyof TaskFormData>(key: K, val: TaskFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleCoAssignee(userId: string) {
    setForm((f) => {
      const current = (f.coAssigneeIds ?? []).filter((id) => id !== f.assignedToUserId);
      return {
        ...f,
        coAssigneeIds: current.includes(userId)
          ? current.filter((id) => id !== userId)
          : [...current, userId],
      };
    });
  }

  function toggleDoc(docId: string) {
    setForm((f) => {
      const current = f.linkedDocumentIds ?? [];
      return {
        ...f,
        linkedDocumentIds: current.includes(docId)
          ? current.filter((id) => id !== docId)
          : [...current, docId],
      };
    });
  }

  function removeDoc(docId: string) {
    setForm((f) => ({ ...f, linkedDocumentIds: (f.linkedDocumentIds ?? []).filter((id) => id !== docId) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(form, initialData?.id);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? (lang === 'he' ? 'שגיאה בשמירה' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(initialData.id);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'שגיאה במחיקה');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleAddChecklist() {
    if (!newCheckText.trim() || !initialData?.id) return;
    setAddingCheck(true);
    try {
      const item = await apiFetch<ChecklistItem>(`/tasks/${initialData.id}/checklists`, {
        method: 'POST',
        body: JSON.stringify({ text: newCheckText.trim(), position: checklists.length }),
      });
      setChecklists((prev) => [...prev, item]);
      setNewCheckText('');
    } catch { /* ignored */ } finally {
      setAddingCheck(false);
    }
  }

  async function handleToggleCheck(item: ChecklistItem) {
    if (!initialData?.id) return;
    try {
      const updated = await apiFetch<ChecklistItem>(`/tasks/${initialData.id}/checklists/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDone: !item.isDone }),
      });
      setChecklists((prev) => prev.map((c) => c.id === item.id ? updated : c));
    } catch { /* ignored */ }
  }

  async function handleDeleteCheck(itemId: string) {
    if (!initialData?.id) return;
    try {
      await apiFetch(`/tasks/${initialData.id}/checklists/${itemId}`, { method: 'DELETE' });
      setChecklists((prev) => prev.filter((c) => c.id !== itemId));
    } catch { /* ignored */ }
  }

  async function handleAIDecompose() {
    if (!initialData?.id) return;
    setDecomposing(true);
    setDecomposeError(null);
    try {
      const res = await apiFetch<{ items: ChecklistItem[] }>(`/tasks/${initialData.id}/ai-decompose`, { method: 'POST' });
      setChecklists((prev) => [...prev, ...res.items]);
    } catch (err: any) {
      setDecomposeError(err?.message ?? 'AI לא הצליח לפרק את המשימה');
    } finally {
      setDecomposing(false);
    }
  }

  function handleNavigateToDoc(docId: string) {
    onClose();
    navigate(`/medical-documents?docId=${docId}`);
  }

  const linkedDocIds = form.linkedDocumentIds ?? [];
  const coIds = form.coAssigneeIds ?? [];
  const checkDone = checklists.filter((c) => c.isDone).length;

  // Source document (the medical document that generated this task)
  const sourceEntityId = initialData?.sourceEntityId;
  const sourceDoc = docs.find((d) => d.id === sourceEntityId) ?? null;
  const sourceDocTitle = initialData?.sourceDocTitle ?? sourceDoc?.title ?? null;

  // Manual attachments (exclude source doc to avoid confusion)
  const manualLinkedIds = linkedDocIds.filter((id) => id !== sourceEntityId);
  const manualLinkedDocs = docs.filter((d) => manualLinkedIds.includes(d.id));

  // Picker: show all docs except the source doc
  const filteredDocs = docs.filter((d) =>
    d.id !== sourceEntityId &&
    (!docSearch || d.title.toLowerCase().includes(docSearch.toLowerCase()))
  );

  // Dates for timeline
  const fmtDate = (iso?: string | null) => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return iso.slice(0, 10); }
  };
  const docMedicalDate = fmtDate(sourceDoc?.documentDate);   // date on the doctor's document
  const docUploadedDate = fmtDate(sourceDoc?.createdAt);     // when uploaded to system
  const taskCreatedDate = fmtDate(initialData?.taskCreatedAt); // when task was created

  // Warn if there's a significant gap between doc medical date and task created date
  const dateDiffDays = (() => {
    if (!sourceDoc?.documentDate || !initialData?.taskCreatedAt) return null;
    const d1 = new Date(sourceDoc.documentDate).getTime();
    const d2 = new Date(initialData.taskCreatedAt).getTime();
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="סגור" />

      <div className="relative w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl overflow-hidden" dir={dir}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-base font-semibold">
              {isEdit ? 'עריכת משימה' : 'משימה חדשה'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {isEdit && onDelete && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))]"
                title="מחק משימה"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="px-5 py-3 bg-[hsl(var(--destructive))]/5 border-b border-[hsl(var(--destructive))]/20">
            <p className="text-sm font-medium text-[hsl(var(--destructive))] mb-2">האם למחוק את המשימה לצמיתות?</p>
            <div className="flex gap-2">
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[hsl(var(--destructive))] text-white text-xs font-medium disabled:opacity-60">
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {deleting ? 'מוחק...' : 'כן, מחק'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-md border border-[hsl(var(--border))] text-xs">
                ביטול
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* ── Source document & date timeline ── */}
          {sourceDocTitle && (
            <div className="rounded-xl border border-[hsl(var(--primary))]/25 bg-[hsl(var(--primary))]/5 overflow-hidden">
              {/* Source header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--primary))]/15">
                <div className="flex items-center gap-2 min-w-0">
                  <Link2 className="w-3.5 h-3.5 text-[hsl(var(--primary))] shrink-0" />
                  <span className="text-[11px] font-semibold text-[hsl(var(--primary))] uppercase tracking-wide">מסמך מקור</span>
                </div>
                {sourceEntityId && (
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate(`/medical-documents?docId=${sourceEntityId}`); }}
                    className="flex items-center gap-1 text-[11px] text-[hsl(var(--primary))] hover:underline shrink-0"
                    title="פתח מסמך"
                  >
                    פתח <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
              {/* Doc title */}
              <div className="px-3 pt-2 pb-1">
                <p className="text-sm font-medium text-[hsl(var(--foreground))] leading-snug">{sourceDocTitle}</p>
              </div>
              {/* 3-date timeline */}
              <div className="px-3 pb-3 space-y-1.5 mt-1.5">
                <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">ציר זמן</p>

                {/* 1. Medical document date (doctor's date) */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
                    <FileText className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">תאריך המסמך הרפואי <span className="text-[10px]">(כתיבת הרופא)</span></p>
                  </div>
                  <span className={`text-[11px] font-semibold shrink-0 ${docMedicalDate ? 'text-blue-700 dark:text-blue-300' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    {docMedicalDate ?? 'לא ידוע'}
                  </span>
                </div>

                {/* 2. Upload date (entered system) */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0">
                    <Upload className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">הועלה למערכת</p>
                  </div>
                  <span className={`text-[11px] font-semibold shrink-0 ${docUploadedDate ? 'text-green-700 dark:text-green-300' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    {docUploadedDate ?? 'לא ידוע'}
                  </span>
                </div>

                {/* 3. Task created date */}
                {taskCreatedDate && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 shrink-0">
                      <ClipboardList className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">המשימה נוצרה במערכת</p>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 shrink-0">{taskCreatedDate}</span>
                  </div>
                )}

                {/* Gap warning */}
                {dateDiffDays !== null && dateDiffDays > 7 && (
                  <div className="flex items-start gap-1.5 mt-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-2 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      שים לב: קיים הפרש של <strong>{dateDiffDays} ימים</strong> בין תאריך המסמך הרפואי לבין יצירת המשימה.
                      בדוק אם יש עדיין תוקף לדד ליין שנקבע.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="label-base">כותרת *</label>
            <input type="text" className="input-base w-full" value={form.title} onChange={(e) => set('title', e.target.value)} required autoFocus />
          </div>

          {/* Description */}
          <div>
            <label className="label-base">תיאור</label>
            <textarea rows={3} className="input-base w-full resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="פרטים נוספים..." />
          </div>

          {/* For who (taskFor) */}
          <div>
            <label className="label-base">המשימה מיועדת ל</label>
            <div className="flex gap-2 mt-1">
              {[
                { v: 'patient',   icon: <UserRound className="w-3.5 h-3.5" />, label: 'מטופל' },
                { v: 'caregiver', icon: <Users className="w-3.5 h-3.5" />,     label: 'מטפל / משפחה' },
                { v: 'all',       icon: null,                                   label: 'כולם' },
              ].map(({ v, icon, label }) => (
                <button
                  key={v} type="button"
                  onClick={() => set('taskFor', v as TaskFormData['taskFor'])}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    form.taskFor === v
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]/40'
                  }`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee section — primary + co-assignees as checkboxes */}
          <div>
            <label className="label-base">שיוך</label>
            <div className="mt-1 border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              {members.map((m, idx) => {
                const isPrimary = form.assignedToUserId === m.userId;
                const isCoAssignee = coIds.includes(m.userId) && !isPrimary;
                const color = m.userColor ?? '#6366f1';
                return (
                  <div
                    key={m.userId}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[hsl(var(--muted))]/30 transition-colors ${idx > 0 ? 'border-t border-[hsl(var(--border))]' : ''}`}
                    onClick={() => {
                      if (isPrimary) {
                        // Deselect primary → no assignee
                        set('assignedToUserId', '');
                      } else if (isCoAssignee) {
                        // Already co-assignee, promote to primary
                        setForm((f) => ({
                          ...f,
                          assignedToUserId: m.userId,
                          coAssigneeIds: (f.coAssigneeIds ?? []).filter((id) => id !== m.userId),
                        }));
                      } else {
                        // Not selected — if no primary, make primary; else make co-assignee
                        if (!form.assignedToUserId) {
                          set('assignedToUserId', m.userId);
                        } else {
                          toggleCoAssignee(m.userId);
                        }
                      }
                    }}
                  >
                    <UserAvatar name={m.fullName} color={color} />
                    <span className="text-sm flex-1">{m.fullName}
                      {m.role === 'manager' && <span className="text-[10px] text-[hsl(var(--muted-foreground))] mr-1">(מנהל)</span>}
                    </span>
                    {isPrimary && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]">ראשי</span>
                    )}
                    {isCoAssignee && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">נוסף</span>
                    )}
                    {!isPrimary && !isCoAssignee && (
                      <span className="w-4 h-4 rounded border border-[hsl(var(--border))] inline-block" />
                    )}
                  </div>
                );
              })}
              {members.length === 0 && (
                <p className="px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">טוען חברי משפחה...</p>
              )}
            </div>
            {(form.assignedToUserId || coIds.length > 0) && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, assignedToUserId: '', coAssigneeIds: [] }))}
                className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]">
                נקה שיוך
              </button>
            )}
          </div>

          {/* Priority + Status */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label-base">עדיפות</label>
              <select className="input-base w-full" value={form.priority} onChange={(e) => set('priority', e.target.value as TaskFormData['priority'])}>
                {(Object.entries(PRIORITY_LABELS_HE) as [TaskFormData['priority'], string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">סטטוס</label>
              <select className="input-base w-full" value={form.status} onChange={(e) => set('status', e.target.value as TaskFormData['status'])}>
                {(Object.entries(STATUS_LABELS_HE) as [TaskFormData['status'], string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label-base">קטגוריה</label>
            <select className="input-base w-full" value={form.category} onChange={(e) => set('category', e.target.value as TaskFormData['category'])}>
              {(Object.entries(CAT_LABELS_HE) as [TaskFormData['category'], string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* ── Due date — dedicated section with context ── */}
          <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))]">
              <CalendarClock className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="text-xs font-semibold">תאריכים ודד ליין</span>
            </div>
            <div className="px-3 py-3 space-y-2">
              {/* Task created at (read-only) */}
              {taskCreatedDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                    <Clock className="w-3.5 h-3.5" />
                    המשימה נפתחה במערכת
                  </span>
                  <span className="font-medium">{taskCreatedDate}</span>
                </div>
              )}

              {/* Due date — editable */}
              <div>
                <label className="text-xs font-medium text-[hsl(var(--foreground))] flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  דד ליין לביצוע
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal">(תאריך יעד לביצוע המשימה)</span>
                </label>
                <input
                  type="date"
                  className="input-base w-full"
                  value={form.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)}
                />
              </div>

              {/* Warning if due date has passed */}
              {form.dueDate && new Date(form.dueDate) < new Date() && form.status !== 'done' && form.status !== 'cancelled' && (
                <div className="flex items-center gap-1.5 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-2 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-700 dark:text-red-300">תאריך הדד ליין עבר!</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Documents section ── */}
          <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))]">
              <Paperclip className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="text-xs font-semibold">מסמכים</span>
            </div>

            <div className="px-3 py-3 space-y-3">
              {/* ── Sub-section A: manually attached docs ── */}
              <div>
                <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 mb-1.5 uppercase tracking-wide">
                  <Upload className="w-3 h-3" />
                  מסמכים מצורפים ידנית
                  <span className="font-normal normal-case">(לדוגמה: טופס 17, אישור ביטוח, מסמך נלווה)</span>
                </p>

                {/* Manual doc chips */}
                {manualLinkedDocs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {manualLinkedDocs.map((d) => (
                      <div key={d.id} className="flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-2 py-0.5 max-w-full">
                        <FileText className="w-3 h-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                        <span className="text-[11px] break-all leading-snug">{d.title}</span>
                        <button type="button" onClick={() => handleNavigateToDoc(d.id)} title="פתח מסמך"
                          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => removeDoc(d.id)}
                          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Picker toggle */}
                <button
                  type="button"
                  onClick={() => setShowDocPicker((v) => !v)}
                  className="w-full text-right text-xs border border-dashed border-[hsl(var(--border))] rounded-lg px-3 py-2 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]/40 hover:text-[hsl(var(--primary))] transition-colors"
                >
                  {showDocPicker ? '▲ סגור בחירת מסמכים' : `+ בחר מסמכים לצירוף${manualLinkedIds.length > 0 ? ` (${manualLinkedIds.length})` : ''}`}
                </button>

                {showDocPicker && (
                  <div className="mt-1 border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                    <div className="p-2 border-b border-[hsl(var(--border))]">
                      <input type="text" value={docSearch} onChange={(e) => setDocSearch(e.target.value)}
                        placeholder="חפש מסמך..." className="w-full text-xs bg-transparent outline-none px-2 py-1" />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {filteredDocs.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-[hsl(var(--muted-foreground))] text-center">אין מסמכים</p>
                      ) : (
                        filteredDocs.map((d, idx) => {
                          const selected = manualLinkedIds.includes(d.id);
                          return (
                            <div key={d.id} onClick={() => toggleDoc(d.id)}
                              className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[hsl(var(--muted))]/30 ${idx > 0 ? 'border-t border-[hsl(var(--border))]' : ''}`}>
                              {selected
                                ? <CheckSquare className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
                                : <Square className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />}
                              <FileText className="w-3 h-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                              <span className="text-xs flex-1 truncate">{d.title}</span>
                              {d.documentDate && (
                                <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0">
                                  {fmtDate(d.documentDate)}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Checklist section ── */}
          <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-[hsl(var(--muted))]/30">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span className="text-xs font-semibold">
                  צ'קליסט
                  {checklists.length > 0 && (
                    <span className="text-[hsl(var(--muted-foreground))] font-normal mr-1">
                      {checkDone}/{checklists.length}
                    </span>
                  )}
                </span>
              </div>
              {isEdit && (
                <button
                  type="button"
                  onClick={handleAIDecompose}
                  disabled={decomposing || !form.title.trim()}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 disabled:opacity-50 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                >
                  {decomposing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                  {decomposing ? 'מפרק...' : 'AI פורק'}
                </button>
              )}
            </div>

            {decomposeError && (
              <p className="px-3 py-1.5 text-[11px] text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/5">{decomposeError}</p>
            )}

            {checklists.length > 0 && (
              <div className="divide-y divide-[hsl(var(--border))]">
                {checklists.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2 group hover:bg-[hsl(var(--muted))]/20">
                    <button type="button" onClick={() => handleToggleCheck(item)}
                      className={`shrink-0 ${item.isDone ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                      {item.isDone ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <span className={`text-xs flex-1 ${item.isDone ? 'line-through text-[hsl(var(--muted-foreground))]' : ''}`}>{item.text}</span>
                    <button type="button" onClick={() => handleDeleteCheck(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isEdit ? (
              <div className="flex items-center gap-2 px-3 py-2 border-t border-[hsl(var(--border))]">
                <input
                  type="text"
                  value={newCheckText}
                  onChange={(e) => setNewCheckText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklist(); }}}
                  placeholder="הוסף פריט לצ'קליסט..."
                  className="flex-1 text-xs bg-transparent outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                />
                <button type="button" onClick={handleAddChecklist} disabled={!newCheckText.trim() || addingCheck}
                  className="h-6 w-6 flex items-center justify-center rounded text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 disabled:opacity-40">
                  {addingCheck ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
            ) : (
              <div className="px-3 py-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                שמור את המשימה תחילה כדי להוסיף צ'קליסט
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-[hsl(var(--destructive))] rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/5 px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-1 border-t border-[hsl(var(--border))]">
            <button type="button" onClick={onClose} className="btn-outline px-4 py-2 text-sm flex-1">ביטול</button>
            <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary px-4 py-2 text-sm flex-1 disabled:opacity-60">
              {saving ? 'שומר...' : isEdit ? 'שמור שינויים' : 'צור משימה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
