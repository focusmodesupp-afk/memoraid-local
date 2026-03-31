import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  Zap,
  Calendar,
  BarChart3,
  Activity,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import {
  StatCard,
  DataBlock,
  CollapsibleSection,
  ProgressBar,
} from '../components/dashboard';

type DashboardStats = {
  totalTasks: number;
  inProgress: number;
  completed: number;
  blocked: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  totalEstimateHours: number;
  completedHours: number;
  avgCompletionTime: number;
  activeSprint: {
    id: string;
    name: string;
    daysRemaining: number;
    progress: number;
  } | null;
  teamMembers: Array<{
    name: string;
    tasksInProgress: number;
    tasksCompleted: number;
  }>;
  recentActivity: Array<{
    taskTitle: string;
    action: string;
    time: string;
  }>;
};

export default function AdminDevDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [nexusStats, setNexusStats] = useState<{ active: number; aiTasks: number; lastBrief: { title: string; createdAt: string } | null }>({
    active: 0,
    aiTasks: 0,
    lastBrief: null,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [columns, tasks, sprints] = await Promise.all([
        apiFetch<any[]>('/admin/dev/columns'),
        apiFetch<any[]>('/admin/dev/tasks'),
        apiFetch<any[]>('/admin/sprints'),
      ]);

      // Nexus stats (non-blocking)
      apiFetch<{ briefs: any[] }>('/admin/nexus/briefs?limit=50').then((d) => {
        const briefs = d.briefs ?? [];
        const active = briefs.filter((b: any) => ['researching', 'review'].includes(b.status)).length;
        const approved = briefs.filter((b: any) => b.status === 'approved');
        const lastBrief = approved.length > 0 ? { title: approved[0].title, createdAt: approved[0].createdAt } : null;
        const aiTasks = tasks.filter((t: any) => t.aiGenerated).length;
        setNexusStats({ active, aiTasks, lastBrief });
      }).catch(() => {});

      const inProgressCol = columns.find((c) => c.name === 'In Progress');
      const doneCol = columns.find((c) => c.name === 'Done');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const activeSprint = sprints.find((s) => s.status === 'active');

      const dashboardStats: DashboardStats = {
        totalTasks: tasks.length,
        inProgress: tasks.filter((t) => t.columnId === inProgressCol?.id).length,
        completed: tasks.filter((t) => t.columnId === doneCol?.id).length,
        blocked: tasks.filter((t) => t.priority === 'high' && t.columnId !== doneCol?.id).length,
        overdue: tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.columnId !== doneCol?.id).length,
        dueToday: tasks.filter((t) => {
          if (!t.dueDate || t.columnId === doneCol?.id) return false;
          const due = new Date(t.dueDate);
          return due >= today && due < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        }).length,
        dueThisWeek: tasks.filter((t) => {
          if (!t.dueDate || t.columnId === doneCol?.id) return false;
          const due = new Date(t.dueDate);
          return due >= today && due < weekFromNow;
        }).length,
        totalEstimateHours: tasks.reduce((sum, t) => sum + (t.estimateHours || 0), 0),
        completedHours: tasks.filter((t) => t.columnId === doneCol?.id).reduce((sum, t) => sum + (t.estimateHours || 0), 0),
        avgCompletionTime: 0,
        activeSprint: activeSprint
          ? {
              id: activeSprint.id,
              name: activeSprint.name,
              daysRemaining: Math.ceil((new Date(activeSprint.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
              progress: tasks.length > 0 ? Math.round((tasks.filter((t) => t.columnId === doneCol?.id).length / tasks.length) * 100) : 0,
            }
          : null,
        teamMembers: [],
        recentActivity: [],
      };

      setStats(dashboardStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="admin-muted">טוען נתונים...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 admin-muted">
        שגיאה בטעינת נתונים
      </div>
    );
  }

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completed / stats.totalTasks) * 100) : 0;
  const hoursCompletionRate = stats.totalEstimateHours > 0 ? Math.round((stats.completedHours / stats.totalEstimateHours) * 100) : 0;
  const completedPercent = stats.totalTasks > 0 ? (stats.completed / stats.totalTasks) * 100 : 0;
  const inProgressPercent = stats.totalTasks > 0 ? (stats.inProgress / stats.totalTasks) * 100 : 0;
  const overduePercent = stats.totalTasks > 0 ? (stats.overdue / stats.totalTasks) * 100 : 0;
  const mediumCount = Math.floor(stats.totalTasks * 0.4);
  const lowCount = stats.totalTasks - stats.blocked - mediumCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard - ניהול פיתוח</h1>
          <p className="text-sm admin-muted mt-1">מבט כולל על התקדמות הפרויקט</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/dev/kanban">
            <a className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              קנבאן
            </a>
          </Link>
          <Link href="/admin/settings/work-plan">
            <a className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-2 shadow-md transition-colors">
              <Target className="w-4 h-4" />
              תוכנית עבודה
            </a>
          </Link>
        </div>
      </div>

      {/* Tier 1: Sprint Banner */}
      {stats.activeSprint && (
        <Link href={`/admin/sprints/${stats.activeSprint.id}`}>
          <a className="block rounded-xl border-2 border-blue-500/50 bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-6 hover:border-blue-400/70 transition-all">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-3 rounded-lg bg-indigo-500 shrink-0">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-100">{stats.activeSprint.name}</h3>
                  <p className="text-sm admin-muted mt-1">
                    {stats.activeSprint.daysRemaining} ימים נותרו | {stats.activeSprint.progress}% הושלם
                  </p>
                  <div className="mt-2 max-w-xs">
                    <ProgressBar
                      value={stats.activeSprint.progress}
                      height="sm"
                      color="bg-gradient-to-r from-indigo-500 to-purple-400"
                    />
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-400 shrink-0" />
            </div>
          </a>
        </Link>
      )}

      {/* Tier 1: KPI Cards - Responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label='סה"כ משימות'
          value={stats.totalTasks}
          subtext={`${completionRate}% הושלמו`}
          variant="default"
        />
        <StatCard
          icon={Zap}
          label="בביצוע"
          value={stats.inProgress}
          subtext="פעילות נוכחית"
          variant="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="הושלמו"
          value={stats.completed}
          subtext={`מהסה"כ ${stats.totalTasks} משימות`}
          variant="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="באיחור"
          value={stats.overdue}
          subtext={stats.overdue > 0 ? 'דורש טיפול מיידי' : 'אין משימות באיחור'}
          variant="red"
        />
      </div>

      {/* Nexus Integration Banner */}
      <Link href="/admin/nexus">
        <a className="block admin-card hover:border-purple-500/50 transition-all cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-600/20 border border-purple-500/30 shrink-0">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Nexus – בית תוכנה AI
                {nexusStats.active > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-amber-900">
                    {nexusStats.active} פעילות
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-4 mt-1 text-sm admin-muted">
                <span>✨ {nexusStats.aiTasks} משימות AI בקנבאן</span>
                {nexusStats.lastBrief && (
                  <span className="truncate">ניירת אחרונה: {nexusStats.lastBrief.title}</span>
                )}
                {nexusStats.aiTasks === 0 && !nexusStats.lastBrief && (
                  <span>אין ניירות פעילות — צור ניירת חדשה</span>
                )}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-purple-400 shrink-0" />
          </div>
        </a>
      </Link>

      {/* Tier 1: Task Progress + Hours – קומפקטי, רוחב לפי תוכן */}
      <div className="flex flex-col md:flex-row md:flex-wrap gap-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden w-full max-w-md">
          <div className="px-5 py-3 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-100">התקדמות משימות</h3>
              <span className="text-xl font-bold text-blue-400">{completionRate}%</span>
            </div>
            <ProgressBar value={completionRate} height="md" color="bg-gradient-to-r from-blue-600 to-blue-400" />
          </div>
          <div className="divide-y divide-slate-700/50">
            <div className="py-2.5 px-5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm text-slate-400">הושלמו</span>
                <span className="text-sm font-bold text-green-400">
                  {stats.completed} / {stats.totalTasks}
                </span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all"
                  style={{ width: `${completedPercent}%` }}
                />
              </div>
            </div>
            <div className="py-2.5 px-5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm text-slate-400">בביצוע</span>
                <span className="text-sm font-bold text-blue-400">{stats.inProgress}</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all"
                  style={{ width: `${inProgressPercent}%` }}
                />
              </div>
            </div>
            <div className="py-2.5 px-5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm text-slate-400">באיחור</span>
                <span className="text-sm font-bold text-red-400">{stats.overdue}</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                  style={{ width: `${overduePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <DataBlock
          title="מעקב שעות"
          subtitle='אמדן שעות לפי סטטוס'
          icon={Clock}
          headerValue={`${hoursCompletionRate}%`}
          headerValueColor="text-purple-400"
          headerProgressPercent={hoursCompletionRate}
          compact
          metrics={[
            { label: 'סה"כ אומדן', value: `${stats.totalEstimateHours}h`, valueColor: 'text-slate-100' },
            { label: 'הושלמו', value: `${stats.completedHours}h`, valueColor: 'text-green-400' },
            { label: 'נותרו', value: `${stats.totalEstimateHours - stats.completedHours}h`, valueColor: 'text-blue-400' },
          ]}
        />
      </div>

      {/* Tier 2: Quick Actions */}
      <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-100 px-1">פעולות מהירות</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/admin/dev/kanban?filter=overdue">
              <a className="block rounded-xl border border-red-600/30 bg-red-900/10 p-4 hover:border-red-500/50 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="font-bold text-slate-100">באיחור</span>
                </div>
                <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
                <p className="text-xs admin-muted mt-1">משימות לדחוף →</p>
              </a>
            </Link>
            <Link href="/admin/dev/kanban?filter=today">
              <a className="block rounded-xl border border-amber-600/30 bg-amber-900/10 p-4 hover:border-amber-500/50 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-slate-100">יעד היום</span>
                </div>
                <p className="text-2xl font-bold text-amber-400">{stats.dueToday}</p>
                <p className="text-xs admin-muted mt-1">משימות להיום →</p>
              </a>
            </Link>
            <Link href="/admin/dev/kanban?filter=high">
              <a className="block rounded-xl border border-blue-600/30 bg-blue-900/10 p-4 hover:border-blue-500/50 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <span className="font-bold text-slate-100">עדיפות גבוהה</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">{stats.blocked}</p>
                <p className="text-xs admin-muted mt-1">דורש תשומת לב →</p>
              </a>
            </Link>
          </div>
        </div>

      {/* Tier 3: Collapsible - Priority, Velocity, Status */}
      <CollapsibleSection title="פרטים נוספים" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DataBlock
            title="התפלגות עדיפויות"
            icon={Target}
            compact
            metrics={[
              { label: 'High', value: stats.blocked, valueColor: 'text-red-400', indicatorColor: 'bg-red-500' },
              { label: 'Medium', value: mediumCount, valueColor: 'text-amber-400', indicatorColor: 'bg-amber-500' },
              { label: 'Low', value: lowCount, valueColor: 'text-slate-400', indicatorColor: 'bg-slate-500' },
            ]}
          />
          <DataBlock
            title="יעדים"
            icon={Calendar}
            compact
            metrics={[
              { label: 'יעד היום', sublabel: 'משימות להשלמה היום', value: stats.dueToday, valueColor: 'text-amber-400' },
              { label: 'יעד השבוע', sublabel: 'משימות להשלמה השבוע', value: stats.dueThisWeek, valueColor: 'text-blue-400' },
            ]}
          />
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 w-full lg:max-w-md">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Velocity
            </h3>
            <p className="text-sm admin-muted">מדדי מהירות ביצוע – בקרוב</p>
            <p className="text-xs admin-muted mt-2">נתונים יוצגו כאשר יהיו מספיק משימות היסטוריות.</p>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            סטטוס כללי
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-900/50">
              <p className="text-2xl font-bold text-slate-100">{completionRate}%</p>
              <p className="text-xs admin-muted mt-1">השלמת משימות</p>
              <ProgressBar value={completionRate} height="sm" className="mt-2" color="bg-gradient-to-r from-blue-600 to-blue-400" />
            </div>
            <div className="p-4 rounded-lg bg-slate-900/50">
              <p className="text-2xl font-bold text-slate-100">{hoursCompletionRate}%</p>
              <p className="text-xs admin-muted mt-1">השלמת שעות</p>
              <ProgressBar value={hoursCompletionRate} height="sm" className="mt-2" color="bg-gradient-to-r from-purple-600 to-purple-400" />
            </div>
            <div className="p-4 rounded-lg bg-slate-900/50">
              <p className="text-2xl font-bold text-slate-100">{stats.dueThisWeek}</p>
              <p className="text-xs admin-muted mt-1">יעד השבוע</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-900/50">
              <p className="text-2xl font-bold text-slate-100">{stats.inProgress}</p>
              <p className="text-xs admin-muted mt-1">פעילות נוכחית</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
