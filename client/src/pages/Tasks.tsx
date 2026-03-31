import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, List, LayoutGrid, Clock, CheckCircle2, XCircle,
  Calendar, UserRound, Users, Brain, Tag, ChevronDown, ChevronUp,
  FileText, SlidersHorizontal, X, RefreshCw, AlertTriangle, Sparkles,
  Trash2, Check, ChevronRight,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useActiveFamily } from '../hooks/useActiveFamily';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import KanbanBoard from '../components/KanbanBoard';
import TaskModal, { TaskFormData } from '../components/TaskModal';
import { PageHeader } from '../components/ui';
import { Link } from 'wouter';

// ── Types ─────────────────────────────────────────────────────────────────────

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'requested' | 'pending' | 'in_progress' | 'completed' | 'cancelled'
        | 'todo' | 'done' | 'scheduled' | 'stuck' | 'postponed';
  priority: 'urgent' | 'low' | 'medium' | 'high';
  category: string | null;
  source: string | null;
  dueDate: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  patientId: string | null;
  patientName?: string | null;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
  assignedToColor?: string | null;
  coAssigneeIds?: string[];
  coAssignees?: { id: string; name: string; color: string }[];
  linkedDocumentIds?: string[] | null;
  createdByUserId?: string;
  createdByName?: string | null;
  createdAt: string;
  sourceEntityId?: string | null;
  sourceEntityType?: string | null;
  checklistTotal?: number;
  checklistDone?: number;
};

type FamilyMember = { userId: string; fullName: string; role: string; userColor?: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  todo: 'לביצוע', in_progress: 'בביצוע', scheduled: 'מתוזמן',
  done: 'הושלם', cancelled: 'בוטל', stuck: 'תקוע', postponed: 'נדחה', requested: 'ממתין לאישור',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'דחוף', high: 'גבוהה', medium: 'בינונית', low: 'נמוכה',
};

const CAT_LABELS: Record<string, string> = {
  medical: 'רפואי', personal: 'אישי', administrative: 'אדמין',
  shopping: 'קניות', transport: 'הסעה', other: 'אחר',
};

const STATUS_BADGE: Record<string, string> = {
  done: 'badge-success', in_progress: 'badge-primary', stuck: 'badge-destructive',
  cancelled: 'badge-destructive', postponed: 'badge-warning', scheduled: 'badge-primary',
  requested: 'badge-warning', todo: 'badge-muted',
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'badge-destructive', high: 'badge-destructive',
  medium: 'badge-warning', low: 'badge-muted',
};

const BULK_STATUSES = [
  { value: 'todo',        label: 'לביצוע' },
  { value: 'in_progress', label: 'בביצוע' },
  { value: 'done',        label: 'הושלם' },
  { value: 'stuck',       label: 'תקוע' },
  { value: 'postponed',   label: 'נדחה' },
  { value: 'cancelled',   label: 'בוטל' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { activeFamilyId } = useActiveFamily();
  const { user } = useAuth();
  const { lang } = useI18n();

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [deduplicating, setDeduplicating] = useState(false);
  const [dedupeResult, setDedupeResult] = useState<string | null>(null);

  // ── Bulk select state ──────────────────────────────────────────────────────
  // No separate "selectMode" — having selectedIds.size > 0 IS the select mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkMoving, setBulkMoving] = useState(false);
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);

  const hasSelection = selectedIds.size > 0;

  // ── Rich filter state ─────────────────────────────────────────────────────
  const [fStatus,   setFStatus]   = useState('');
  const [fPriority, setFPriority] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fAssignee, setFAssignee] = useState('');
  const [fSource,   setFSource]   = useState('');
  const [fTaskFor,  setFTaskFor]  = useState('');
  const [fMyTasks,  setFMyTasks]  = useState(false);
  const [fDueAfter, setFDueAfter] = useState('');
  const [fDueBefore,setFDueBefore]= useState('');

  const activeFilterCount = [fStatus, fPriority, fCategory, fAssignee, fSource, fTaskFor, fDueAfter, fDueBefore].filter(Boolean).length + (fMyTasks ? 1 : 0);

  useEffect(() => {
    if (!activeFamilyId) return;
    loadTasks();
    loadMembers();
  }, [activeFamilyId]);

  // Close bulk status menu on outside click
  useEffect(() => {
    if (!showBulkStatusMenu) return;
    const handler = () => setShowBulkStatusMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showBulkStatusMenu]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Task[]>('/tasks');
      setAllTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setAllTasks([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  async function loadMembers() {
    try {
      const res = await apiFetch<{ members?: FamilyMember[] }>('/families/me');
      if (res.members?.length) setMembers(res.members);
    } catch { /* ignored */ }
  }

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (fStatus    && t.status !== fStatus) return false;
      if (fPriority  && t.priority !== fPriority) return false;
      if (fCategory  && t.category !== fCategory) return false;
      if (fAssignee  && t.assignedToUserId !== fAssignee) return false;
      if (fSource    && t.source !== fSource) return false;
      if (fMyTasks   && t.assignedToUserId !== user?.id) return false;
      if (fDueAfter  && t.dueDate && new Date(t.dueDate) < new Date(fDueAfter)) return false;
      if (fDueBefore && t.dueDate && new Date(t.dueDate) > new Date(fDueBefore)) return false;
      if (fTaskFor) {
        const desc = t.description ?? '';
        if (fTaskFor === 'patient'   && !desc.includes('[למטופל]')) return false;
        if (fTaskFor === 'caregiver' && !desc.includes('[למטפל/משפחה]')) return false;
      }
      return true;
    });
  }, [allTasks, fStatus, fPriority, fCategory, fAssignee, fSource, fTaskFor, fMyTasks, fDueAfter, fDueBefore, user?.id]);

  const regularTasks   = filteredTasks.filter((t) => t.status !== 'requested');
  const requestedTasks = filteredTasks.filter((t) => t.status === 'requested');

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = allTasks.filter(t => t.status !== 'requested');
    const done = active.filter(t => t.status === 'done').length;
    const total = active.length;
    return {
      total, done,
      completePct: total > 0 ? Math.round((done / total) * 100) : 0,
      todo:     active.filter(t => t.status === 'todo').length,
      doing:    active.filter(t => t.status === 'in_progress').length,
      overdue:  active.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !['done','cancelled'].includes(t.status)).length,
      aiSource: active.filter(t => t.source === 'ai').length,
    };
  }, [allTasks]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleApprove(taskId: string) {
    setApprovingId(taskId);
    try {
      await apiFetch(`/tasks/${taskId}/approve`, { method: 'POST' });
      setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'todo' } : t));
    } catch { /* logged */ } finally { setApprovingId(null); }
  }

  async function handleDecline(taskId: string) {
    setDecliningId(taskId);
    try {
      await apiFetch(`/tasks/${taskId}/decline`, { method: 'POST' });
      setAllTasks(prev => prev.filter(t => t.id !== taskId));
    } catch { /* logged */ } finally { setDecliningId(null); }
  }

  async function handleTaskMove(taskId: string, newStatus: Task['status']) {
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
    } catch { loadTasks(); }
  }

  function handleTaskClick(task: Task) {
    // If any tasks are selected, clicking a task body toggles its selection
    if (hasSelection) { toggleSelect(task.id); return; }
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleSaveTask(data: TaskFormData, id?: string) {
    const body: Record<string, unknown> = {
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      status: data.status,
      category: data.category,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      assignedToUserId: data.assignedToUserId || null,
      coAssigneeIds: data.coAssigneeIds ?? [],
      linkedDocumentIds: data.linkedDocumentIds ?? [],
      taskFor: data.taskFor,
    };
    if (id) {
      const updated = await apiFetch<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
    } else {
      if (!activeFamilyId) throw new Error('No active family');
      const created = await apiFetch<Task>('/tasks', { method: 'POST', body: JSON.stringify({ familyId: activeFamilyId, ...body }) });
      setAllTasks(prev => [created, ...prev]);
    }
  }

  async function handleDeleteTask(id: string) {
    await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
    setAllTasks(prev => prev.filter(t => t.id !== id));
  }

  function openNewTask(defaultStatus?: string) {
    setEditingTask(defaultStatus ? ({ status: defaultStatus } as Task) : null);
    setModalOpen(true);
  }

  function clearFilters() {
    setFStatus(''); setFPriority(''); setFCategory(''); setFAssignee('');
    setFSource(''); setFTaskFor(''); setFMyTasks(false); setFDueAfter(''); setFDueBefore('');
  }

  async function handleDeduplicate() {
    setDeduplicating(true);
    setDedupeResult(null);
    try {
      const res = await apiFetch<{ deleted: number; message: string }>('/tasks/deduplicate', { method: 'POST' });
      setDedupeResult(res.message);
      if (res.deleted > 0) await loadTasks();
    } catch {
      setDedupeResult('שגיאה בניקוי כפילויות');
    } finally {
      setDeduplicating(false);
      setTimeout(() => setDedupeResult(null), 4000);
    }
  }

  // ── Bulk select helpers ────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(regularTasks.map((t) => t.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    setShowBulkStatusMenu(false);
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => apiFetch(`/tasks/${id}`, { method: 'DELETE' })));
      setAllTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      clearSelection();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleBulkMove(newStatus: string) {
    if (selectedIds.size === 0) return;
    setBulkMoving(true);
    setShowBulkStatusMenu(false);
    try {
      await Promise.all([...selectedIds].map((id) =>
        apiFetch(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })
      ));
      setAllTasks((prev) => prev.map((t) =>
        selectedIds.has(t.id) ? { ...t, status: newStatus as Task['status'] } : t
      ));
      clearSelection();
    } catch (err) {
      console.error('Bulk move failed:', err);
    } finally {
      setBulkMoving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[hsl(var(--muted-foreground))]">טוען משימות...</p>
      </div>
    );
  }

  const isManager = user?.role === 'manager';

  return (
    <div className="space-y-5">
      <TaskModal
        open={modalOpen}
        familyMembers={members}
        initialData={editingTask ? {
          id: editingTask.id,
          title: editingTask.title,
          description: editingTask.description ?? '',
          priority: editingTask.priority as TaskFormData['priority'],
          status: editingTask.status as TaskFormData['status'],
          category: (editingTask.category as TaskFormData['category']) ?? 'other',
          dueDate: editingTask.dueDate ?? '',
          assignedToUserId: editingTask.assignedToUserId ?? '',
          coAssigneeIds: editingTask.coAssigneeIds ?? [],
          linkedDocumentIds: editingTask.linkedDocumentIds ?? [],
          sourceEntityId: editingTask.sourceEntityId ?? undefined,
          sourceEntityType: editingTask.sourceEntityType ?? undefined,
          taskCreatedAt: editingTask.createdAt,
          sourceDocTitle: (() => {
            const desc = editingTask.description ?? '';
            const m = desc.match(/\[מקור:\s*(.+?)\]/);
            return m ? m[1].trim() : undefined;
          })(),
        } as any : undefined}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* ── Header ── */}
      <PageHeader
        title="לוח משימות"
        subtitle="ניהול, מעקב ושיוך משימות טיפול"
        actions={
          <div className="flex items-center gap-2">
            {requestedTasks.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/30 font-medium">
                <Clock className="w-3 h-3" />{requestedTasks.length} בקשות
              </span>
            )}
            <button type="button" onClick={loadTasks} className="btn-ghost h-8 w-8 p-0 justify-center" title="רענן">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDeduplicate}
              disabled={deduplicating}
              className="btn-ghost h-8 px-2.5 text-xs flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] disabled:opacity-50"
              title="נקה משימות כפולות"
            >
              {deduplicating
                ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />}
              נקה כפולות
            </button>
            <Link href="/availability">
              <span className="btn-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" /> יומן
              </span>
            </Link>
            <button type="button" onClick={() => openNewTask()} className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> משימה חדשה
            </button>
          </div>
        }
      />

      {/* ── Dedupe result toast ── */}
      {dedupeResult && (
        <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 px-4 py-2.5 flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
          <Check className="w-4 h-4 shrink-0" />
          {dedupeResult}
        </div>
      )}

      {/* ── Stats Bar ── */}
      {stats.total > 0 && (
        <div className="section-card space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">התקדמות כללית</span>
            <span className="text-[hsl(var(--muted-foreground))]">{stats.done}/{stats.total} הושלמו ({stats.completePct}%)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[hsl(var(--muted))]">
            <div className="h-2 rounded-full bg-[hsl(var(--success,#22c55e))] transition-all duration-500"
              style={{ width: `${stats.completePct}%` }} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {[
          { label: 'סה"כ',    value: stats.total,    color: 'text-[hsl(var(--foreground))]' },
          { label: 'לביצוע',  value: stats.todo,     color: 'text-[hsl(var(--primary))]' },
          { label: 'בביצוע',  value: stats.doing,    color: 'text-amber-500' },
          { label: 'הושלם',   value: stats.done,     color: 'text-green-600' },
          { label: 'באיחור',  value: stats.overdue,  color: 'text-[hsl(var(--destructive))]' },
          { label: 'מ-AI',    value: stats.aiSource, color: 'text-purple-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2.5 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{label}</p>
          </div>
        ))}
      </div>

      {/* ── AI Tasks notice ── */}
      {stats.aiSource > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 dark:bg-purple-900/20 dark:border-purple-800">
          <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
          <p className="text-xs text-purple-700 dark:text-purple-300 flex-1">
            <span className="font-semibold">{stats.aiSource}</span> משימות נוצרו מניתוח מסמכים רפואיים
          </p>
          <button type="button" onClick={() => setFSource('ai')}
            className="text-[11px] text-purple-600 hover:underline shrink-0">הצג</button>
        </div>
      )}

      {/* ── Requested tasks ── */}
      {requestedTasks.length > 0 && (
        <div className="section-card space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[hsl(var(--warning))]" />
            <h2 className="text-sm font-semibold">בקשות ממתינות לאישור ({requestedTasks.length})</h2>
          </div>
          <div className="space-y-2">
            {requestedTasks.map((task) => (
              <div key={task.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/5 px-3 py-2.5">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.description && <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1">{task.description}</p>}
                  <TaskMeta task={task} />
                </div>
                {isManager ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleApprove(task.id)} disabled={!!approvingId || !!decliningId}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/30 hover:bg-[hsl(var(--success))]/20 disabled:opacity-50 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />{approvingId === task.id ? 'מאשר...' : 'אשר'}
                    </button>
                    <button onClick={() => handleDecline(task.id)} disabled={!!approvingId || !!decliningId}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] border border-[hsl(var(--destructive))]/30 hover:bg-[hsl(var(--destructive))]/20 disabled:opacity-50 font-medium">
                      <XCircle className="w-3.5 h-3.5" />{decliningId === task.id ? 'דוחה...' : 'דחה'}
                    </button>
                  </div>
                ) : (
                  <span className="badge badge-muted text-[10px] shrink-0">ממתין לאישור</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar: view + filters ── */}
      <div className="section-compact space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex gap-1.5">
            {[{ v: 'kanban', icon: <LayoutGrid className="w-4 h-4" />, label: 'לוח' },
              { v: 'list',   icon: <List className="w-4 h-4" />,        label: 'רשימה' }].map(({ v, icon, label }) => (
              <button key={v} type="button" onClick={() => setView(v as typeof view)}
                className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 ${
                  view === v ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/80'
                }`}
              >{icon}{label}</button>
            ))}
          </div>

          {/* My tasks toggle */}
          <button type="button" onClick={() => setFMyTasks((v) => !v)}
            className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 border transition-colors ${
              fMyTasks ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
            }`}>
            <UserRound className="w-3.5 h-3.5" /> המשימות שלי
          </button>

          {/* Quick status filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {['', 'todo', 'in_progress', 'done', 'stuck'].map((s) => (
              <button key={s} type="button" onClick={() => setFStatus(s)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  fStatus === s ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/80'
                }`}>
                {!s ? 'הכל' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 mr-auto">
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-[hsl(var(--destructive))] hover:underline">
                <X className="w-3 h-3" /> נקה ({activeFilterCount})
              </button>
            )}
            <button type="button" onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                showFilters ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
              }`}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> פילטרים מתקדמים
              {activeFilterCount > 0 && <span className="rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-[10px] px-1.5 py-0.5 leading-none">{activeFilterCount}</span>}
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* ── Advanced filter panel ── */}
        {showFilters && (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label-base flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> עדיפות</label>
              <select className="input-base w-full" value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
                <option value="">הכל</option>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-base flex items-center gap-1"><Tag className="w-3 h-3" /> קטגוריה</label>
              <select className="input-base w-full" value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                <option value="">הכל</option>
                {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-base flex items-center gap-1"><UserRound className="w-3 h-3" /> משויך ל</label>
              <select className="input-base w-full" value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
                <option value="">הכל</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="label-base flex items-center gap-1"><Users className="w-3 h-3" /> מיועד ל</label>
              <select className="input-base w-full" value={fTaskFor} onChange={(e) => setFTaskFor(e.target.value)}>
                <option value="">הכל</option>
                <option value="patient">מטופל</option>
                <option value="caregiver">מטפל / משפחה</option>
              </select>
            </div>
            <div>
              <label className="label-base flex items-center gap-1"><Brain className="w-3 h-3" /> מקור</label>
              <select className="input-base w-full" value={fSource} onChange={(e) => setFSource(e.target.value)}>
                <option value="">הכל</option>
                <option value="ai">מ-AI (מסמך רפואי)</option>
                <option value="manual">ידני</option>
              </select>
            </div>
            <div>
              <label className="label-base flex items-center gap-1"><Calendar className="w-3 h-3" /> תאריך יעד מ</label>
              <input type="date" className="input-base w-full" value={fDueAfter} onChange={(e) => setFDueAfter(e.target.value)} />
            </div>
            <div>
              <label className="label-base flex items-center gap-1"><Calendar className="w-3 h-3" /> תאריך יעד עד</label>
              <input type="date" className="input-base w-full" value={fDueBefore} onChange={(e) => setFDueBefore(e.target.value)} />
            </div>
            <div>
              <label className="label-base">בחירה מהירה</label>
              <div className="flex flex-col gap-1 mt-1">
                <button type="button" onClick={() => { setFDueBefore(new Date().toISOString().slice(0, 10)); setFStatus(''); }}
                  className="text-xs text-right text-[hsl(var(--destructive))] hover:underline">⚠️ כל המשימות שפג תוקפן</button>
                <button type="button" onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const next7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
                  setFDueAfter(today); setFDueBefore(next7);
                }} className="text-xs text-right text-amber-600 hover:underline">📅 השבוע הקרוב</button>
                <button type="button" onClick={() => setFSource('ai')}
                  className="text-xs text-right text-purple-600 hover:underline">🧠 רק משימות מ-AI</button>
              </div>
            </div>
          </div>
        )}

        {filteredTasks.length !== allTasks.filter(t => t.status !== 'requested').length && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            מציג {regularTasks.length} מתוך {allTasks.filter(t => t.status !== 'requested').length} משימות
          </p>
        )}
      </div>

      {/* ── Selection hint when items are selected ── */}
      {hasSelection && (
        <div className="rounded-xl border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 px-4 py-2 flex items-center gap-3">
          <span className="text-sm text-[hsl(var(--primary))] flex-1">
            <strong>{selectedIds.size}</strong> נבחרו — לחץ על עיגול נוסף להוספה, או השתמש בפס הפעולות למטה
          </span>
          <div className="flex gap-2">
            {selectedIds.size < regularTasks.length && (
              <button type="button" onClick={selectAll}
                className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                בחר הכל ({regularTasks.length})
              </button>
            )}
            <button type="button" onClick={clearSelection}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> בטל בחירה
            </button>
          </div>
        </div>
      )}

      {/* ── Board / List ── */}
      {view === 'kanban' ? (
        <KanbanBoard
          tasks={regularTasks as any}
          onTaskMove={hasSelection ? undefined : handleTaskMove as any}
          onTaskClick={handleTaskClick as any}
          onAddTask={hasSelection ? undefined : (status) => openNewTask(status as string)}
          onDeleteTask={hasSelection ? undefined : handleDeleteTask}
          selectedIds={selectedIds}
          onSelectTask={toggleSelect}
        />
      ) : (
        // ── List view ──────────────────────────────────────────────────────────
        <div className="section-card overflow-hidden">
          {regularTasks.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {activeFilterCount > 0 ? 'אין תוצאות לפילטר הנבחר' : 'אין משימות'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] text-right bg-[hsl(var(--muted))]/30">
                    {/* Circle select-all header cell */}
                    <th className="px-3 py-2.5 w-10">
                      {hasSelection && (
                        <button
                          type="button"
                          onClick={selectedIds.size === regularTasks.length ? clearSelection : selectAll}
                          title={selectedIds.size === regularTasks.length ? 'בטל הכל' : 'בחר הכל'}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedIds.size === regularTasks.length
                              ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]'
                              : 'border-[hsl(var(--primary))]/60 bg-[hsl(var(--primary))]/10'
                          }`}
                        >
                          {selectedIds.size === regularTasks.length && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                      )}
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-[hsl(var(--muted-foreground))]">משימה</th>
                    <th className="px-3 py-2.5 font-semibold text-[hsl(var(--muted-foreground))]">מיועד ל</th>
                    <th className="px-3 py-2.5 font-semibold text-[hsl(var(--muted-foreground))]">משויך ל</th>
                    <th className="px-3 py-2.5 font-semibold text-[hsl(var(--muted-foreground))]">סטטוס</th>
                    <th className="px-3 py-2.5 font-semibold text-[hsl(var(--muted-foreground))]">עדיפות</th>
                    <th className="px-3 py-2.5 font-semibold text-[hsl(var(--muted-foreground))]">קטגוריה</th>
                    <th className="px-3 py-2.5 font-semibold text-[hsl(var(--muted-foreground))]">תאריך יעד</th>
                    <th className="px-3 py-2.5 font-semibold text-[hsl(var(--muted-foreground))]">מקור</th>
                  </tr>
                </thead>
                <tbody>
                  {regularTasks.map((task) => {
                    const isSelected = selectedIds.has(task.id);
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['done', 'cancelled'].includes(task.status);
                    const taskFor = task.description?.includes('[למטופל]') ? 'patient'
                      : task.description?.includes('[למטפל/משפחה]') ? 'caregiver' : null;
                    const sourceDoc = task.description?.match(/\[מקור: ([^\]]+)\]/)?.[1];
                    return (
                      <tr
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={`group border-b border-[hsl(var(--border))] transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[hsl(var(--primary))]/8 hover:bg-[hsl(var(--primary))]/12'
                            : 'hover:bg-[hsl(var(--muted))]/40'
                        }`}
                      >
                        {/* Circle checkbox cell */}
                        <td className="px-3 py-2.5" onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }}>
                          <button
                            type="button"
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))] opacity-100'
                                : 'border-[hsl(var(--muted-foreground))]/30 bg-transparent opacity-0 group-hover:opacity-100'
                            } ${hasSelection ? 'opacity-100' : ''}`}
                            title={isSelected ? 'בטל בחירה' : 'בחר'}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>
                        </td>

                        <td className="px-3 py-2.5">
                          <p className={`font-medium truncate max-w-[200px] ${isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>{task.title}</p>
                          {sourceDoc && (
                            <p className="text-[10px] text-[hsl(var(--primary))] flex items-center gap-0.5 mt-0.5">
                              <FileText className="w-2.5 h-2.5" />{sourceDoc}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {taskFor === 'patient'   && <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><UserRound className="w-3 h-3" />מטופל</span>}
                          {taskFor === 'caregiver' && <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><Users className="w-3 h-3" />מטפל</span>}
                          {!taskFor && <span className="text-[hsl(var(--muted-foreground))]">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[hsl(var(--muted-foreground))]">{task.assignedToName ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`badge text-[10px] ${STATUS_BADGE[task.status] ?? 'badge-muted'}`}>
                            {STATUS_LABELS[task.status] ?? task.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`badge text-[10px] ${PRIORITY_BADGE[task.priority] ?? 'badge-muted'}`}>
                            {PRIORITY_LABELS[task.priority] ?? task.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[hsl(var(--muted-foreground))]">
                          {task.category ? (CAT_LABELS[task.category] ?? task.category) : '—'}
                        </td>
                        <td className={`px-3 py-2.5 ${isOverdue ? 'text-[hsl(var(--destructive))] font-semibold' : 'text-[hsl(var(--muted-foreground))]'}`}>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('he-IL') : '—'}
                          {isOverdue && <span className="text-[10px] block">⚠️ באיחור</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {task.source === 'ai'
                            ? <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 text-[10px]"><Brain className="w-3 h-3" />AI</span>
                            : <span className="text-[hsl(var(--muted-foreground))] text-[10px]">ידני</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Floating bulk-action bar (appears when items are selected) ── */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(560px,92vw]">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl px-5 py-3.5 flex items-center gap-3">
            {/* Count badge */}
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{selectedIds.size}</span>
            </div>

            <div className="flex-1 min-w-0">
              {confirmBulkDelete ? (
                <p className="text-sm font-medium text-[hsl(var(--destructive))]">מחק {selectedIds.size} משימות לצמיתות?</p>
              ) : (
                <p className="text-sm font-medium">נבחרו {selectedIds.size} משימות</p>
              )}
            </div>

            {!confirmBulkDelete ? (
              <div className="flex items-center gap-2 shrink-0">
                {/* Move to status */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={bulkMoving}
                    onClick={(e) => { e.stopPropagation(); setShowBulkStatusMenu((v) => !v); }}
                    className="flex items-center gap-1.5 text-xs border border-[hsl(var(--border))] px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                  >
                    {bulkMoving
                      ? <><span className="w-3 h-3 border-2 border-[hsl(var(--muted-foreground))]/30 border-t-[hsl(var(--muted-foreground))] rounded-full animate-spin" />מעביר...</>
                      : <><ChevronRight className="w-3.5 h-3.5" />שנה סטטוס</>}
                  </button>
                  {showBulkStatusMenu && (
                    <div className="absolute bottom-full mb-2 left-0 w-40 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl overflow-hidden z-10">
                      {BULK_STATUSES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleBulkMove(s.value); }}
                          className="w-full text-right px-3 py-2 text-xs hover:bg-[hsl(var(--muted))] transition-colors"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cancel selection */}
                <button type="button" onClick={clearSelection}
                  className="text-xs text-[hsl(var(--muted-foreground))] px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                  ביטול
                </button>

                {/* Delete */}
                <button type="button" onClick={() => setConfirmBulkDelete(true)}
                  className="flex items-center gap-1.5 text-xs bg-[hsl(var(--destructive))] text-white px-4 py-1.5 rounded-lg hover:opacity-90 font-medium">
                  <Trash2 className="w-3.5 h-3.5" />
                  מחק ({selectedIds.size})
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setConfirmBulkDelete(false)} disabled={bulkDeleting}
                  className="text-xs text-[hsl(var(--muted-foreground))] px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50">
                  ביטול
                </button>
                <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting}
                  className="flex items-center gap-1.5 text-xs bg-[hsl(var(--destructive))] text-white px-4 py-1.5 rounded-lg hover:opacity-90 font-medium disabled:opacity-60">
                  {bulkDeleting
                    ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />מוחק...</>
                    : <><Trash2 className="w-3.5 h-3.5" />כן, מחק הכל</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: Task meta row ─────────────────────────────────────────────────────

function TaskMeta({ task }: { task: Task }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['done', 'cancelled'].includes(task.status);
  const startDate = task.scheduledStart || task.dueDate;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {task.assignedToName && (
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-0.5">
          <UserRound className="w-2.5 h-2.5" />{task.assignedToName}
        </span>
      )}
      {startDate && (
        <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
          <Calendar className="w-2.5 h-2.5" />
          {new Date(startDate).toLocaleDateString('he-IL')}
          {isOverdue && ' ⚠️'}
        </span>
      )}
      <span className={`badge text-[10px] ${task.priority === 'urgent' || task.priority === 'high' ? 'badge-destructive' : task.priority === 'medium' ? 'badge-warning' : 'badge-muted'}`}>
        {task.priority === 'urgent' ? 'דחוף' : task.priority === 'high' ? 'גבוהה' : task.priority === 'medium' ? 'בינונית' : 'נמוכה'}
      </span>
      {task.source === 'ai' && (
        <span className="badge badge-muted text-[10px] flex items-center gap-0.5 text-purple-600"><Brain className="w-2.5 h-2.5" />AI</span>
      )}
    </div>
  );
}
