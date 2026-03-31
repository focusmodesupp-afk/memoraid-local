import React, { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import {
  ArrowRight,
  Play,
  Pause,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  List,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  schedule: string | null;
  lastRun: string | null;
  config: any;
};

type PipelineRun = {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  recordsProcessed: number | null;
  recordsSuccess: number | null;
  recordsFailed: number | null;
  errorMessage: string | null;
};

type PipelineStage = {
  id: string;
  name: string;
  stageOrder: number;
  stageType: string;
  timeoutSeconds: number;
  retryCount: number;
};

export default function AdminPipelineDetail() {
  const [, params] = useRoute('/admin/pipelines/:id');
  const pipelineId = params?.id;

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'runs' | 'stages' | 'config'>('runs');

  useEffect(() => {
    if (pipelineId) {
      loadData();
    }
  }, [pipelineId]);

  async function loadData() {
    if (!pipelineId) return;
    setLoading(true);
    try {
      const [pipelineData, runsData, stagesData] = await Promise.all([
        apiFetch<Pipeline>(`/admin/pipelines/${pipelineId}`),
        apiFetch<PipelineRun[]>(`/admin/pipelines/${pipelineId}/runs?limit=20`),
        apiFetch<PipelineStage[]>(`/admin/pipelines/${pipelineId}/stages`),
      ]);
      setPipeline(pipelineData);
      setRuns(runsData);
      setStages(stagesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTrigger() {
    if (!pipelineId || !pipeline) return;
    if (!confirm(`להריץ את "${pipeline.name}"?`)) return;
    try {
      await apiFetch(`/admin/pipelines/${pipelineId}/trigger`, { method: 'POST' });
      alert('Pipeline הופעל!');
      loadData();
    } catch (err) {
      console.error(err);
      alert('שגיאה בהפעלה');
    }
  }

  function getRunStatusIcon(status: string) {
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status === 'failed') return <XCircle className="w-5 h-5 text-red-400" />;
    if (status === 'running') return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
    return <Clock className="w-5 h-5 admin-muted" />;
  }

  function getRunStatusBadge(status: string) {
    if (status === 'success') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (status === 'failed') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (status === 'running') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-slate-500/20 admin-muted border-slate-500/30';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="admin-muted">טוען Pipeline...</div>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="text-center py-12">
        <p className="admin-muted">Pipeline לא נמצא</p>
        <Link href="/admin/pipelines">
          <a className="text-blue-400 hover:underline text-sm mt-2 inline-block">
            חזרה לרשימת Pipelines
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/pipelines">
          <a className="p-2 rounded-lg hover:bg-slate-800 admin-muted hover:text-slate-300">
            <ArrowRight className="w-5 h-5" />
          </a>
        </Link>
        <div className="flex-1">
          <h1 className="admin-page-title">{pipeline.name}</h1>
          <p className="text-sm admin-muted mt-1">{pipeline.description || pipeline.type}</p>
        </div>
        <button
          onClick={handleTrigger}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          הרץ עכשיו
        </button>
      </div>

      {/* Info Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="admin-card p-4">
          <div className="text-sm admin-muted mb-1">סטטוס</div>
          <div className="text-lg font-semibold text-slate-100 capitalize">{pipeline.status}</div>
        </div>
        <div className="admin-card p-4">
          <div className="text-sm admin-muted mb-1">סוג</div>
          <div className="text-lg font-semibold text-slate-100">{pipeline.type}</div>
        </div>
        <div className="admin-card p-4">
          <div className="text-sm admin-muted mb-1">לוח זמנים</div>
          <div className="text-lg font-semibold text-slate-100">{pipeline.schedule || 'ידני'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {[
          { id: 'runs', label: 'ריצות', icon: Activity },
          { id: 'stages', label: 'שלבים', icon: List },
          { id: 'config', label: 'הגדרות', icon: Settings },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === t.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent admin-muted hover:text-slate-300'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'runs' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-100">היסטוריית ריצות ({runs.length})</h3>
          {runs.length === 0 ? (
            <div className="text-center py-12 admin-card rounded-xl">
              <p className="admin-muted">אין ריצות עדיין</p>
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="p-4 rounded-lg admin-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getRunStatusIcon(run.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-200">
                          {new Date(run.startedAt).toLocaleString('he-IL')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${getRunStatusBadge(run.status)}`}>
                          {run.status}
                        </span>
                      </div>
                      {run.durationMs && (
                        <p className="text-xs admin-muted">
                          משך: {(run.durationMs / 1000).toFixed(2)}s
                        </p>
                      )}
                    </div>
                  </div>
                  {run.recordsProcessed !== null && (
                    <div className="text-left">
                      <div className="text-sm text-slate-300">
                        {run.recordsProcessed} רשומות
                      </div>
                      <div className="text-xs admin-muted">
                        ✓ {run.recordsSuccess} | ✗ {run.recordsFailed}
                      </div>
                    </div>
                  )}
                </div>
                {run.errorMessage && (
                  <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30">
                    <p className="text-xs text-red-400">{run.errorMessage}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'stages' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-100">שלבי Pipeline ({stages.length})</h3>
          {stages.length === 0 ? (
            <div className="text-center py-12 admin-card rounded-xl">
              <p className="admin-muted">אין שלבים מוגדרים</p>
            </div>
          ) : (
            stages.map((stage, index) => (
              <div
                key={stage.id}
                className="p-4 rounded-lg admin-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-200">{stage.name}</h4>
                    <p className="text-xs admin-muted mt-1">
                      Type: {stage.stageType} | Timeout: {stage.timeoutSeconds}s | Retry: {stage.retryCount}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'config' && (
        <div className="space-y-4">
          <div className="admin-card p-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">הגדרות Pipeline</h3>
            <pre className="text-xs admin-muted bg-slate-900 p-4 rounded-lg overflow-auto">
              {JSON.stringify(pipeline.config || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
