import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Settings, TrendingUp, CheckCircle, X, ArrowRight, Check, Trash2, XCircle } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiFetch } from '../../lib/api';
import TaskEditModal from '../components/TaskEditModal';
import ColumnManagement from '../components/ColumnManagement';
import TaskCard from '../components/TaskCard';
import { formatTaskForAI, copyToClipboard } from '../utils/aiPromptFormatter';

type DevTask = {
  id: string;
  title: string;
  description: string | null;
  columnId: string | null;
  priority: 'low' | 'medium' | 'high';
  category: string | null;
  assignee: string | null;
  labels: string[] | null;
  estimateHours: number | null;
  actualHours: number | null;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  sprintName?: string | null;
  phaseName?: string | null;
  riskLevel?: string | null;
  aiGenerated?: boolean | null;
};

type DevColumn = {
  id: string;
  name: string;
  position: number;
  color: string | null;
};

const CATEGORIES = [
  { value: 'all', label: 'הכל' },
  { value: 'plans', label: 'Plans & Checkout' },
  { value: 'email', label: 'Email' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'admin', label: 'Admin' },
  { value: 'testing', label: 'Testing' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'ai', label: 'AI' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'security', label: 'Security' },
  { value: 'performance', label: 'Performance' },
];

const PRIORITIES = [
  { value: 'all', label: 'כל העדיפויות' },
  { value: 'high', label: '🔴 High' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'low', label: '⚪ Low' },
];

export default function AdminDevKanban() {
  const [location, navigate] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const sprintIdFromUrl = urlParams.get('sprint');

  const [columns, setColumns] = useState<DevColumn[]>([]);
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<DevTask | null>(null);
  const [showColumnMgmt, setShowColumnMgmt] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColumn, setNewTaskColumn] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sprintName, setSprintName] = useState<string | null>(null);
  const [aiToast, setAiToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // ── Multi-select state ────────────────────────────────────────────────────
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const hasSelection = selectedTaskIds.size > 0;

  function toggleSelect(taskId: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedTaskIds(new Set());
    setConfirmBulkDelete(false);
  }

  function selectAll() {
    setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)));
  }

  async function handleBulkMove(columnId: string) {
    if (selectedTaskIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await Promise.all([...selectedTaskIds].map((id) =>
        apiFetch(`/admin/dev/tasks/${id}/move`, { method: 'POST', body: JSON.stringify({ columnId }) })
      ));
      setTasks((prev) => prev.map((t) => selectedTaskIds.has(t.id) ? { ...t, columnId } : t));
      clearSelection();
    } catch (err) {
      console.error(err);
      alert('שגיאה בהעברת משימות');
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedTaskIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await Promise.all([...selectedTaskIds].map((id) =>
        apiFetch(`/admin/dev/tasks/${id}`, { method: 'DELETE' })
      ));
      setTasks((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)));
      clearSelection();
    } catch (err) {
      console.error(err);
      alert('שגיאה במחיקת משימות');
    } finally {
      setBulkActionLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [sprintIdFromUrl]);

  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [noActiveSprint, setNoActiveSprint] = useState(false);

  async function loadData() {
    setLoading(true);
    setSprintName(null);
    setNoActiveSprint(false);
    try {
      // If no sprint specified, auto-detect active sprint
      let effectiveSprintId = sprintIdFromUrl;
      if (!effectiveSprintId) {
        try {
          const activeData = await apiFetch<{ sprint: { id: string; name: string } | null }>('/admin/sprints/active');
          if (activeData.sprint) {
            effectiveSprintId = activeData.sprint.id;
            setActiveSprintId(activeData.sprint.id);
            setSprintName(activeData.sprint.name);
          } else {
            setNoActiveSprint(true);
          }
        } catch {
          // No active sprint endpoint or error — fall through to show all
        }
      }

      const tasksUrl = effectiveSprintId
        ? `/admin/dev/tasks?sprint=${encodeURIComponent(effectiveSprintId)}`
        : '/admin/dev/tasks';
      const [columnsData, tasksData] = await Promise.all([
        apiFetch<DevColumn[]>('/admin/dev/columns'),
        apiFetch<DevTask[]>(tasksUrl),
      ]);
      setColumns(columnsData.sort((a, b) => a.position - b.position));
      setTasks(tasksData);
      if (columnsData.length > 0 && !newTaskColumn) {
        setNewTaskColumn(columnsData[0].id);
      }
      if (effectiveSprintId && !sprintName) {
        try {
          const sprintData = await apiFetch<{ name: string }>(`/admin/sprints/${effectiveSprintId}`);
          setSprintName(sprintData.name ?? null);
        } catch {
          setSprintName(null);
        }
      }
    } catch (err) {
      console.error(err);
      setColumns([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    try {
      const newTask = await apiFetch<DevTask>('/admin/dev/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          columnId: newTaskColumn,
          priority: 'medium',
        }),
      });
      if (sprintIdFromUrl) {
        await apiFetch(`/admin/sprints/${sprintIdFromUrl}/tasks`, {
          method: 'POST',
          body: JSON.stringify({ taskId: newTask.id }),
        });
      }
      await loadData();
      setNewTaskTitle('');
      setShowAddTask(false);
    } catch (err) {
      console.error(err);
      alert('שגיאה ביצירת משימה');
    }
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setDraggedTask(null);
    setDragOverColumn(null);
  }

  function handleDragOver(e: React.DragEvent, columnId: string) {
    e.preventDefault();
    setDragOverColumn(columnId);
  }

  async function handleDrop(e: React.DragEvent, newColumnId: string) {
    e.preventDefault();
    if (!draggedTask) return;

    const task = tasks.find((t) => t.id === draggedTask);
    if (!task || task.columnId === newColumnId) {
      setDraggedTask(null);
      setDragOverColumn(null);
      return;
    }

    try {
      await apiFetch(`/admin/dev/tasks/${draggedTask}/move`, {
        method: 'POST',
        body: JSON.stringify({ columnId: newColumnId }),
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === draggedTask ? { ...t, columnId: newColumnId } : t))
      );
    } catch (err) {
      console.error(err);
      alert('שגיאה בהעברת משימה');
    } finally {
      setDraggedTask(null);
      setDragOverColumn(null);
    }
  }

  function handleTaskUpdate(updatedTask: DevTask) {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  }

  function handleTaskDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function handleStartDev(task: DevTask) {
    try {
      const prompt = formatTaskForAI(task, {
        columnName: columns.find((c) => c.id === task.columnId)?.name,
        sprintId: sprintIdFromUrl || undefined,
      });
      await copyToClipboard(prompt);

      // Move to In Progress
      const inProgressColumn = columns.find((c) => c.name === 'In Progress');
      if (inProgressColumn && task.columnId !== inProgressColumn.id) {
        await apiFetch(`/admin/dev/tasks/${task.id}/move`, {
          method: 'POST',
          body: JSON.stringify({ columnId: inProgressColumn.id }),
        });
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, columnId: inProgressColumn.id } : t))
        );
      }

      setAiToast({
        show: true,
        message: '✅ הועתק! הדבק בchat של Claude Code ← Claude יממש את המשימה 🚀',
      });
      setTimeout(() => setAiToast({ show: false, message: '' }), 6000);
    } catch (err) {
      console.error(err);
      setAiToast({ show: true, message: '❌ שגיאה בהעתקה' });
      setTimeout(() => setAiToast({ show: false, message: '' }), 3000);
    }
  }

  const assignees = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))] as string[];

  const filteredTasks = tasks.filter((t) => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.assignee?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function getPriorityBadge(priority: string) {
    if (priority === 'high') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (priority === 'medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-slate-600/20 text-slate-400 border-slate-600/30';
  }

  function getCategoryColor(category: string | null) {
    if (!category) return 'bg-slate-500/20 text-slate-400';
    const colors: Record<string, string> = {
      email: 'bg-purple-500/20 text-purple-400',
      calendar: 'bg-blue-500/20 text-blue-400',
      admin: 'bg-green-500/20 text-green-400',
      testing: 'bg-amber-500/20 text-amber-400',
      optimization: 'bg-cyan-500/20 text-cyan-400',
      ai: 'bg-pink-500/20 text-pink-400',
      mobile: 'bg-indigo-500/20 text-indigo-400',
      security: 'bg-red-500/20 text-red-400',
      performance: 'bg-orange-500/20 text-orange-400',
    };
    return colors[category] || 'bg-slate-500/20 text-slate-400';
  }

  function getColumnColor(color: string | null) {
    const colors: Record<string, string> = {
      slate: 'text-slate-400',
      blue: 'text-blue-400',
      green: 'text-green-400',
      amber: 'text-amber-400',
      red: 'text-red-400',
      purple: 'text-purple-400',
      cyan: 'text-cyan-400',
      pink: 'text-pink-400',
    };
    return colors[color || 'slate'] || 'text-slate-400';
  }

  const stats = {
    total: tasks.length,
    high: tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low: tasks.filter((t) => t.priority === 'low').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* No Active Sprint Warning */}
      {noActiveSprint && !sprintIdFromUrl && (
        <div className="rounded-lg border border-amber-600/30 bg-amber-900/20 p-6 text-center">
          <div className="text-amber-400 text-lg font-bold mb-2">אין ספרינט פעיל</div>
          <p className="text-slate-400 text-sm mb-4">הפעל ספרינט מעמוד הספרינטים כדי לראות משימות בלוח Kanban</p>
          <Link
            href="/admin/sprints"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            עבור לספרינטים
          </Link>
        </div>
      )}

      {/* Active Sprint Banner (auto-detected) */}
      {activeSprintId && !sprintIdFromUrl && sprintName && (
        <div className="rounded-lg border border-green-600/30 bg-green-900/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-slate-200">
                ספרינט פעיל: <strong>{sprintName}</strong>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">מוצגות רק משימות מהספרינט הפעיל</p>
            </div>
          </div>
          <Link
            href={`/admin/sprints/${activeSprintId}`}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm"
          >
            פרטי ספרינט
          </Link>
        </div>
      )}

      {/* Sprint Context Banner (URL-specified) */}
      {sprintIdFromUrl && (
        <div className="rounded-lg border border-purple-600/30 bg-purple-900/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm font-medium text-slate-200">
                מציג משימות מספרינט{sprintName ? `: ${sprintName}` : ''}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">משימות אלו שייכות לספרינט הנוכחי (מסומנות בגבול סגול)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/sprints/${sprintIdFromUrl}`}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה לספרינט
            </Link>
            <button
              onClick={() => navigate('/admin/dev/kanban')}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Kanban - משימות פיתוח</h1>
          <p className="text-sm text-slate-400 mt-1">
            {stats.total} משימות | 🔴 {stats.high} | 🟡 {stats.medium} | ⚪ {stats.low}
            {sprintIdFromUrl && ' | מסונן לפי ספרינט'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowColumnMgmt(!showColumnMgmt)}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            עמודות
          </button>
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-2 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            משימה חדשה
          </button>
        </div>
      </div>

      {showColumnMgmt && (
        <ColumnManagement columns={columns} onColumnsChange={loadData} />
      )}

      {showAddTask && (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="כותרת המשימה..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
            />
            <select
              value={newTaskColumn}
              onChange={(e) => setNewTaskColumn(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim()}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              צור
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש משימות..."
            className="w-full pr-10 pl-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PRIORITIES.map((pri) => (
              <option key={pri.value} value={pri.value}>
                {pri.label}
              </option>
            ))}
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">כל המפתחים</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sprintIdFromUrl && tasks.length === 0 && !loading && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
          <p className="text-slate-300 font-medium">אין משימות בספרינט</p>
          <p className="text-sm text-slate-500 mt-2">
            הוסף משימות מהכפתור &quot;משימה חדשה&quot; למעלה (ייקשרו לספרינט אוטומטית) או מעמוד הספרינט
          </p>
          <Link
            href={`/admin/sprints/${sprintIdFromUrl}`}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            עבור לעמוד הספרינט
          </Link>
        </div>
      )}

      {/* ── Bulk action toolbar ─────────────────────────────────────── */}
      {hasSelection && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-500/30 bg-indigo-900/20">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{selectedTaskIds.size}</span>
          </div>
          <span className="text-sm text-indigo-300 flex-1">נבחרו {selectedTaskIds.size} משימות</span>
          {/* Move to column */}
          <select
            onChange={(e) => { if (e.target.value) { handleBulkMove(e.target.value); e.target.value = ''; } }}
            disabled={bulkActionLoading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-xs focus:outline-none disabled:opacity-50"
            defaultValue=""
          >
            <option value="" disabled>העבר לעמודה...</option>
            {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {/* Select all */}
          {selectedTaskIds.size < filteredTasks.length && (
            <button type="button" onClick={selectAll}
              className="text-xs text-indigo-300 hover:text-indigo-100 px-2 py-1 rounded hover:bg-indigo-800/40 transition-colors">
              בחר הכל ({filteredTasks.length})
            </button>
          )}
          {/* Delete */}
          {confirmBulkDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-300">מחק {selectedTaskIds.size} משימות?</span>
              <button type="button" onClick={handleBulkDelete} disabled={bulkActionLoading}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500 disabled:opacity-60">
                {bulkActionLoading ? '...' : 'מחק'}
              </button>
              <button type="button" onClick={() => setConfirmBulkDelete(false)}
                className="text-xs border border-slate-600 px-2 py-1 rounded hover:bg-slate-700 text-slate-300">
                בטל
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> מחק
            </button>
          )}
          {/* Clear selection */}
          <button type="button" onClick={clearSelection}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-700 transition-colors">
            <XCircle className="w-3.5 h-3.5" /> בטל בחירה
          </button>
        </div>
      )}

      <div
        className="grid gap-4 pb-4"
        style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(260px, 1fr))` }}
      >
        {columns.map((column) => {
          const columnTasks = filteredTasks.filter((t) => t.columnId === column.id);
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={`min-w-0 rounded-xl border transition-colors ${
                isOver ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-600 bg-slate-800/50'
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      column.color === 'blue'
                        ? 'bg-indigo-500'
                        : column.color === 'green'
                        ? 'bg-green-500'
                        : column.color === 'amber'
                        ? 'bg-amber-500'
                        : column.color === 'red'
                        ? 'bg-red-500'
                        : column.color === 'purple'
                        ? 'bg-purple-500'
                        : column.color === 'cyan'
                        ? 'bg-cyan-500'
                        : column.color === 'pink'
                        ? 'bg-pink-500'
                        : 'bg-slate-500'
                    }`}
                  />
                  <h3 className={`font-semibold ${getColumnColor(column.color)}`}>
                    {column.name}
                  </h3>
                  <span className="mr-auto text-sm text-slate-500">{columnTasks.length}</span>
                </div>
              </div>

              <div className="p-3 space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto">
                {columnTasks.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-8">אין משימות</p>
                )}
                {columnTasks
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={{ ...task, _displayIndex: idx + 1 } as any}
                    onClick={() => { if (hasSelection) toggleSelect(task.id); else setSelectedTask(task); }}
                    onStartDev={handleStartDev}
                    draggable={!hasSelection}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedTask === task.id}
                    highlightAsSprintTask={!!sprintIdFromUrl}
                    isSelected={selectedTaskIds.has(task.id)}
                    onSelect={toggleSelect}
                    selectionMode={hasSelection}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskEditModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onSave={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />

      {/* AI Toast Notification */}
      {aiToast.show && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-2xl flex items-center gap-3 max-w-md">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{aiToast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
