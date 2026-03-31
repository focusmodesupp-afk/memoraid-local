import React, { useState, useEffect } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import {
  ArrowRight,
  Calendar,
  Target,
  TrendingUp,
  Play,
  CheckCircle,
  Plus,
  Activity,
  BarChart3,
  ExternalLink,
  Sparkles,
  Pencil,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import TaskCard from '../components/TaskCard';
import { ProgressBar } from '../components/dashboard';
import EditSprintModal from '../components/EditSprintModal';
import AddTaskToSprintModal from '../components/AddTaskToSprintModal';
import { formatTaskForAI, copyToClipboard } from '../utils/aiPromptFormatter';

type Sprint = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  velocity: string | null;
  phaseId?: string | null;
  tasks: Array<{
    task: any;
    storyPoints: number | null;
    addedAt: string;
  }>;
};

type Metrics = {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalPoints: number;
  completedPoints: number;
  pointsCompletionRate: number;
};

export default function AdminSprintDetail() {
  const [, params] = useRoute('/admin/sprints/:id');
  const [, setLocation] = useLocation();
  const sprintId = params?.id;

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<'board' | 'metrics' | 'activity'>('board');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  useEffect(() => {
    if (sprintId) {
      loadSprint();
      loadMetrics();
    }
  }, [sprintId]);

  async function loadSprint() {
    if (!sprintId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<Sprint>(`/admin/sprints/${sprintId}`);
      setSprint(data);
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message ?? 'שגיאה בטעינת הספרינט');
    } finally {
      setLoading(false);
    }
  }

  async function loadMetrics() {
    if (!sprintId) return;
    try {
      const data = await apiFetch<Metrics>(`/admin/sprints/${sprintId}/metrics`);
      setMetrics(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleStartSprint() {
    if (!sprintId) return;
    try {
      await apiFetch(`/admin/sprints/${sprintId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });
      loadSprint();
    } catch (err) {
      console.error(err);
      alert('שגיאה בהפעלת ספרינט');
    }
  }

  async function handleCompleteSprint() {
    if (!sprintId) return;
    if (!confirm('לסיים את הספרינט? משימות שלא הושלמו יועברו ל-Backlog')) return;
    try {
      await apiFetch(`/admin/sprints/${sprintId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      loadSprint();
    } catch (err) {
      console.error(err);
      alert('שגיאה בסיום ספרינט');
    }
  }

  async function handleDeleteSprint() {
    if (!sprintId || !sprint) return;
    if (!confirm(`למחוק את הספרינט "${sprint.name}"? פעולה זו בלתי הפיכה.`)) return;
    try {
      await apiFetch(`/admin/sprints/${sprintId}`, { method: 'DELETE' });
      setLocation('/admin/sprints');
    } catch (err) {
      console.error(err);
      alert('שגיאה במחיקת ספרינט');
    }
  }

  async function handleStartDev(task: any) {
    try {
      const prompt = formatTaskForAI(task, {
        sprintName: sprint?.name,
        sprintId: sprintId || undefined,
      });
      await copyToClipboard(prompt);
      alert('✅ הועתק! הדבק בchat של Claude Code ← Claude יממש את המשימה 🚀');
    } catch (err) {
      console.error(err);
      alert('שגיאה בהעתקה');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">טוען ספרינט...</div>
      </div>
    );
  }

  if (!sprint) {
    const isSchemaError = loadError?.includes('db:push') || loadError?.includes('schema');
    return (
      <div className="text-center py-12 max-w-lg mx-auto">
        <p className="text-slate-400">
          {isSchemaError ? loadError : 'ספרינט לא נמצא'}
        </p>
        {isSchemaError && (
          <p className="text-amber-400/90 text-sm mt-2">
            הרץ בטרמינל: <code className="bg-slate-800 px-2 py-0.5 rounded">npm run db:push</code>
          </p>
        )}
        <Link href="/admin/sprints" className="text-blue-400 hover:text-blue-300 text-sm mt-4 inline-block">
          חזרה לרשימת ספרינטים
        </Link>
      </div>
    );
  }

  const getDaysRemaining = () => {
    const end = new Date(sprint.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getDuration = () => {
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/sprints" className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-300">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">{sprint.name}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {sprint.status === 'active' && `${getDaysRemaining()} ימים נותרו מתוך ${getDuration()}`}
            {sprint.status === 'planning' && 'בתכנון'}
            {sprint.status === 'completed' && 'הושלם'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDeleteSprint}
            className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm flex items-center gap-2"
            title="מחק ספרינט"
          >
            <Trash2 className="w-4 h-4" />
            מחק ספרינט
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            ערוך ספרינט
          </button>
          {sprint.phaseId && (
            <Link
              href={`/admin/phases/${sprint.phaseId}/task-summary?sprintId=${sprintId}`}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              צור משימות מ-AI
            </Link>
          )}
          <Link
            href={`/admin/dev/kanban?sprint=${sprintId}`}
            className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            פתח בקנבאן
          </Link>
          {sprint.status === 'planning' && (
            <button
              onClick={handleStartSprint}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              התחל ספרינט
            </button>
          )}
          {sprint.status === 'active' && (
            <button
              onClick={handleCompleteSprint}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-2 shadow-md transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              סיים ספרינט
            </button>
          )}
        </div>
      </div>

      {/* Goal */}
      {sprint.goal && (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-slate-200">מטרת הספרינט:</span>
          </div>
          <p className="text-slate-400">{sprint.goal}</p>
        </div>
      )}

      {/* Metrics Bar */}
      {metrics && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-bold text-slate-100">{metrics.totalTasks}</div>
            <div className="text-sm text-slate-400 mt-1">סה"כ משימות</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-bold text-green-400">{metrics.completedTasks}</div>
            <div className="text-sm text-slate-400 mt-1">הושלמו</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-bold text-blue-400">{metrics.completionRate}%</div>
            <div className="text-sm text-slate-400 mt-1">שיעור השלמה</div>
            <ProgressBar value={metrics.completionRate} height="sm" className="mt-2" color="bg-gradient-to-r from-blue-600 to-blue-400" />
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-bold text-purple-400">
              {metrics.completedPoints}/{metrics.totalPoints}
            </div>
            <div className="text-sm text-slate-400 mt-1">Story Points</div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {metrics && (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">התקדמות</span>
            <span className="text-sm text-slate-400">{metrics.completionRate}%</span>
          </div>
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-green-600 transition-all duration-500"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {[
          { id: 'board', label: 'לוח משימות', icon: BarChart3 },
          { id: 'metrics', label: 'מדדים', icon: TrendingUp },
          { id: 'activity', label: 'פעילות', icon: Activity },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === t.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'board' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">
              משימות בספרינט ({sprint.tasks.length})
            </h3>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              הוסף משימה
            </button>
          </div>

          {sprint.tasks.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-slate-700 bg-slate-800/50">
              <p className="text-slate-400">אין משימות בספרינט</p>
              <p className="text-sm text-slate-500 mt-1">הוסף משימות מהקנבאן</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sprint.tasks.map(({ task, storyPoints, taskOrder }, idx) => {
                const nexusCtx = (task as any).nexusContext ?? (task as any).nexus_context;
                const dept = nexusCtx?.sourceDepartment;
                const docCount = nexusCtx?.docReferences?.length ?? 0;
                const DEPT_COLORS: Record<string, string> = {
                  ceo: 'bg-yellow-600', cto: 'bg-blue-600', cpo: 'bg-purple-600',
                  rnd: 'bg-cyan-600', design: 'bg-pink-600', product: 'bg-green-600',
                  security: 'bg-red-600', legal: 'bg-amber-600', marketing: 'bg-orange-600', finance: 'bg-emerald-600',
                };
                const DEPT_LABELS: Record<string, string> = {
                  ceo: 'מנכ"ל', cto: 'CTO', cpo: 'CPO', rnd: 'R&D', design: 'עיצוב',
                  product: 'מוצר', security: 'אבטחה', legal: 'משפטי', marketing: 'שיווק', finance: 'פיננסים',
                };
                return (
                  <div key={task.id} className="relative">
                    {/* Task order number */}
                    <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                      #{taskOrder ?? idx + 1}
                    </div>
                    <TaskCard
                      task={task}
                      onClick={() => {}}
                      onStartDev={handleStartDev}
                      draggable={false}
                    />
                    {/* Bottom bar: dept + docs + SP */}
                    <div className="flex items-center gap-1.5 mt-1 px-2">
                      {dept && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${DEPT_COLORS[dept] ?? 'bg-slate-600'}`}>
                          {DEPT_LABELS[dept] ?? dept}
                        </span>
                      )}
                      {docCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">
                          📄 {docCount} docs
                        </span>
                      )}
                      {(task as any).aiGenerated && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-900 text-violet-300">Nexus</span>
                      )}
                      {task.estimateHours && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 mr-auto">
                          {task.estimateHours}h
                        </span>
                      )}
                      {storyPoints && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-700 text-white font-bold">
                          {storyPoints} SP
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'metrics' && (
        <div className="space-y-4">
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Burndown Chart</h3>
            <div className="text-center py-12 text-slate-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-slate-600" />
              <p>Burndown chart יתווסף בקרוב</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-3">
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">יומן פעילות</h3>
            <div className="text-center py-12 text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-2 text-slate-600" />
              <p>יומן פעילות יתווסף בקרוב</p>
            </div>
          </div>
        </div>
      )}

      <EditSprintModal
        open={showEditModal}
        sprint={sprint}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => { setShowEditModal(false); loadSprint(); }}
      />

      {sprintId && sprint && (
        <AddTaskToSprintModal
          open={showAddTaskModal}
          sprintId={sprintId}
          sprintName={sprint.name}
          existingTaskIds={sprint.tasks.map((t) => t.task.id)}
          onClose={() => setShowAddTaskModal(false)}
          onSuccess={() => { setShowAddTaskModal(false); loadSprint(); loadMetrics(); }}
        />
      )}
    </div>
  );
}
