import React, { useState, useEffect } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { ArrowRight, Check, X, Pencil, Sparkles, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type ProposedTask = {
  title: string;
  description?: string;
  priority?: string;
  category?: string;
  estimateHours?: number;
  labels?: string[];
  storyPoints?: number;
};

type TaskWithStatus = ProposedTask & { status: 'approved' | 'rejected' | 'editing'; edited?: ProposedTask };

type Phase = {
  id: string;
  name: string;
  description?: string | null;
  goals?: string[];
  aiAnalysisResult?: { tasks?: ProposedTask[] } | null;
};

export default function AdminTaskDistributionSummary() {
  const [, params] = useRoute('/admin/phases/:phaseId/task-summary');
  const [, setLocation] = useLocation();
  const phaseId = params?.phaseId;
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const sprintId = new URLSearchParams(search).get('sprintId') || undefined;

  const [phase, setPhase] = useState<Phase | null>(null);
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (phaseId) loadPhase();
  }, [phaseId]);

  async function loadPhase() {
    if (!phaseId) return;
    setLoading(true);
    try {
      const phases = await apiFetch<Phase[]>('/admin/phases');
      const p = phases.find((x) => x.id === phaseId);
      setPhase(p || null);
      if (p?.aiAnalysisResult?.tasks?.length) {
        setTasks(
          p.aiAnalysisResult.tasks.map((t) => ({ ...t, status: 'approved' as const }))
        );
      } else {
        setTasks([]);
      }
    } catch {
      setPhase(null);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalyze() {
    if (!phaseId) return;
    setAnalyzing(true);
    try {
      const { tasks: analyzed } = await apiFetch<{ tasks: ProposedTask[] }>(
        `/admin/phases/${phaseId}/analyze`,
        { method: 'POST' }
      );
      setTasks(analyzed.map((t) => ({ ...t, status: 'approved' as const })));
      await loadPhase();
    } catch (err: any) {
      alert(err?.message ?? 'שגיאה בניתוח Phase');
    } finally {
      setAnalyzing(false);
    }
  }

  function setTaskStatus(idx: number, status: TaskWithStatus['status'], edited?: ProposedTask) {
    setTasks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], status, edited };
      return next;
    });
  }

  async function syncToKanban() {
    if (!sprintId) {
      alert('נדרש ספרינט. צור ספרינט מתוכנית העבודה והכנס למסך זה עם ?sprintId=...');
      return;
    }
    const approved = tasks
      .filter((t) => t.status === 'approved')
      .map((t) => (t.edited ? t.edited : t));
    if (approved.length === 0) {
      alert('אשר לפחות משימה אחת');
      return;
    }
    setSyncing(true);
    try {
      await apiFetch(`/admin/sprints/${sprintId}/tasks/bulk`, {
        method: 'POST',
        body: JSON.stringify({ tasks: approved, phaseId }),
      });
      setLocation(`/admin/dev/kanban?sprint=${sprintId}`);
    } catch (err: any) {
      alert(err?.message ?? 'שגיאה בסנכרון');
    } finally {
      setSyncing(false);
    }
  }

  if (loading || !phaseId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">טוען...</div>
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Phase לא נמצא</p>
        <Link href="/admin/settings/work-plan">
          <a className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">חזרה לתוכנית עבודה</a>
        </Link>
      </div>
    );
  }

  const approvedCount = tasks.filter((t) => t.status === 'approved').length;
  const totalHours = tasks
    .filter((t) => t.status === 'approved')
    .reduce((s, t) => s + ((t.edited ?? t).estimateHours ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/settings/work-plan">
          <a className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-300">
            <ArrowRight className="w-5 h-5" />
          </a>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">סיכום פיזור משימות – {phase.name}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {sprintId ? 'מוכן לסנכרון לספרינט' : 'הוסף ?sprintId=... לכתובת כדי לסנכרן'}
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <p className="text-slate-300 mb-4">אין משימות. הרץ ניתוח AI כדי לפרק את ה-Phase למשימות.</p>
          <button
            onClick={runAnalyze}
            disabled={analyzing}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                מנתח...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                נתח Phase עם AI
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-4 text-sm">
              <span className="text-slate-400">
                מאושרות: <strong className="text-green-400">{approvedCount}</strong> / {tasks.length}
              </span>
              <span className="text-slate-400">
                שעות מוערכות: <strong className="text-blue-400">{totalHours}</strong>
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={runAnalyze}
                disabled={analyzing}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                נתח מחדש
              </button>
              <button
                onClick={syncToKanban}
                disabled={!sprintId || approvedCount === 0 || syncing}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white flex items-center gap-2 disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                אשר וסנכרן ל-Kanban
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {tasks.map((t, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-4 ${
                  t.status === 'approved'
                    ? 'border-green-600/40 bg-green-900/10'
                    : t.status === 'rejected'
                    ? 'border-red-600/30 bg-red-900/5 opacity-60'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200">{(t.edited ?? t).title}</p>
                    {(t.edited ?? t).description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{(t.edited ?? t).description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(t.edited ?? t).priority && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {(t.edited ?? t).priority}
                        </span>
                      )}
                      {(t.edited ?? t).category && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {(t.edited ?? t).category}
                        </span>
                      )}
                      {((t.edited ?? t).estimateHours ?? 0) > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                          {(t.edited ?? t).estimateHours}h
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {t.status !== 'rejected' && (
                      <button
                        onClick={() => setTaskStatus(idx, 'rejected')}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400"
                        title="ביטול"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {t.status === 'rejected' && (
                      <button
                        onClick={() => setTaskStatus(idx, 'approved')}
                        className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400"
                        title="אישור"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {t.status === 'approved' && (
                      <button
                        onClick={() => setTaskStatus(idx, 'editing', { ...(t.edited ?? t) })}
                        className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-200"
                        title="עריכה"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {t.status === 'editing' && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">עריכה (בקרוב – כרגע לחץ אישור כדי לשמור)</p>
                    <button
                      onClick={() => setTaskStatus(idx, 'approved')}
                      className="px-3 py-1 rounded bg-green-600 text-white text-sm"
                    >
                      סיים עריכה
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {sprintId && (
        <Link href={`/admin/dev/kanban?sprint=${sprintId}`}>
          <a className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
            <ExternalLink className="w-4 h-4" />
            פתח Kanban
          </a>
        </Link>
      )}
    </div>
  );
}
