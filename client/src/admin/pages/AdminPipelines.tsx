import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Database,
  Mail,
  Bell,
  Trash2,
  BarChart3,
  Settings,
  Plus,
  TrendingUp,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiFetch } from '../../lib/api';

type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: 'active' | 'paused' | 'error';
  schedule: string | null;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
};

type PipelineStats = {
  totalPipelines: number;
  activePipelines: number;
  pausedPipelines: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  unresolvedAlerts: number;
};

const PIPELINE_TYPES = [
  { value: 'all', label: 'הכל', icon: Activity },
  { value: 'backup', label: 'גיבויים', icon: Database },
  { value: 'email', label: 'מיילים', icon: Mail },
  { value: 'notification', label: 'התראות', icon: Bell },
  { value: 'analytics', label: 'אנליטיקה', icon: BarChart3 },
  { value: 'monitoring', label: 'ניטור', icon: Activity },
  { value: 'integration', label: 'אינטגרציות', icon: RefreshCw },
  { value: 'cleanup', label: 'ניקוי', icon: Trash2 },
  { value: 'reporting', label: 'דוחות', icon: TrendingUp },
];

type NexusBrief = { id: string; title: string; status: string; createdAt: string; departmentsCompleted?: number; totalDepartments?: number };

export default function AdminPipelines() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [nexusBriefs, setNexusBriefs] = useState<NexusBrief[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadData();
    apiFetch<{ briefs: NexusBrief[] }>('/admin/nexus/briefs?limit=5')
      .then((d) => setNexusBriefs(d.briefs ?? []))
      .catch(() => {});
  }, [filter]);

  async function loadData() {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?type=${filter}` : '';
      const [pipelinesData, statsData] = await Promise.all([
        apiFetch<Pipeline[]>(`/admin/pipelines${params}`),
        apiFetch<PipelineStats>('/admin/pipelines/stats/overview'),
      ]);
      setPipelines(pipelinesData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleTrigger(id: string, name: string) {
    if (!confirm(`להריץ את Pipeline "${name}"?`)) return;
    try {
      await apiFetch(`/admin/pipelines/${id}/trigger`, { method: 'POST' });
      alert('Pipeline הופעל בהצלחה!');
      loadData();
    } catch (err) {
      console.error(err);
      alert('שגיאה בהפעלת Pipeline');
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await apiFetch(`/admin/pipelines/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
    } catch (err) {
      console.error(err);
      alert('שגיאה בעדכון סטטוס');
    }
  }

  function getTypeIcon(type: string) {
    const typeConfig = PIPELINE_TYPES.find(t => t.value === type);
    const Icon = typeConfig?.icon || Activity;
    return <Icon className="w-5 h-5" />;
  }

  function getStatusBadge(status: string) {
    if (status === 'active') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (status === 'paused') return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  }

  function getStatusLabel(status: string) {
    if (status === 'active') return 'פעיל';
    if (status === 'paused') return 'מושהה';
    return 'שגיאה';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="admin-muted">טוען Pipelines...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="admin-page-title">Pipelines - צינורות אוטומציה</h1>
          <p className="text-sm admin-muted mt-1">
            {stats?.totalPipelines || 0} pipelines | {stats?.activePipelines || 0} פעילים
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Pipeline חדש
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="admin-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm admin-muted">סה"כ Pipelines</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">{stats.totalPipelines}</div>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm admin-muted">ריצות מוצלחות</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{stats.successfulRuns}</div>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm admin-muted">ריצות כושלות</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{stats.failedRuns}</div>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <span className="text-sm admin-muted">התראות פתוחות</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats.unresolvedAlerts}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {PIPELINE_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => setFilter(type.value)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                filter === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Nexus Research Activities */}
      {nexusBriefs.length > 0 && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-900/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-semibold text-purple-300">Nexus — צינורות מחקר AI</h2>
            </div>
            <button
              onClick={() => setLocation('/admin/nexus')}
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
            >
              לכל הניירות <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {nexusBriefs.map((b) => {
              const statusColor =
                b.status === 'approved' ? 'text-green-400 bg-green-500/20 border-green-500/30' :
                b.status === 'researching' ? 'text-blue-400 bg-blue-500/20 border-blue-500/30 animate-pulse' :
                b.status === 'review' ? 'text-amber-400 bg-amber-500/20 border-amber-500/30' :
                'text-slate-400 bg-slate-600/20 border-slate-600/30';
              const statusLabel =
                b.status === 'approved' ? 'מאושר' :
                b.status === 'researching' ? 'בחקירה...' :
                b.status === 'review' ? 'בסקירה' :
                b.status === 'draft' ? 'טיוטה' : b.status;
              return (
                <button
                  key={b.id}
                  onClick={() => setLocation(`/admin/nexus/briefs/${b.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-purple-500/20 hover:border-purple-500/40 text-right transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-sm text-slate-200">{b.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs border ${statusColor}`}>{statusLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pipelines List */}
      <div className="space-y-3">
        {pipelines.length === 0 ? (
          <div className="text-center py-12 admin-card rounded-xl">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="admin-muted mb-2">אין Pipelines</p>
            <p className="text-sm admin-muted">צור Pipeline ראשון כדי להתחיל</p>
          </div>
        ) : (
          pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="admin-card p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-slate-900">
                    {getTypeIcon(pipeline.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-100">{pipeline.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs border ${getStatusBadge(pipeline.status)}`}>
                        {getStatusLabel(pipeline.status)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
                        {pipeline.type}
                      </span>
                    </div>
                    {pipeline.description && (
                      <p className="text-sm admin-muted mb-2">{pipeline.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs admin-muted">
                      {pipeline.schedule && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{pipeline.schedule}</span>
                        </div>
                      )}
                      {pipeline.lastRun && (
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          <span>ריצה אחרונה: {new Date(pipeline.lastRun).toLocaleString('he-IL')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleTrigger(pipeline.id, pipeline.name)}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                    title="הרץ עכשיו"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(pipeline.id, pipeline.status)}
                    className={`p-2 rounded-lg ${
                      pipeline.status === 'active'
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-green-600 hover:bg-green-500'
                    } text-white`}
                    title={pipeline.status === 'active' ? 'השהה' : 'הפעל'}
                  >
                    {pipeline.status === 'active' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <Link href={`/admin/pipelines/${pipeline.id}`}>
                    <a className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300">
                      <Settings className="w-4 h-4" />
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
