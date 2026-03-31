import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Target, TrendingUp, Play, Pause, CheckCircle, Clock, Link as LinkIcon, Trash2, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiFetch } from '../../lib/api';
import CreateSprintModal from '../components/CreateSprintModal';

type Sprint = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  velocity: string | null;
  phaseId?: string | null;
  createdAt: string;
};

type Phase = {
  id: string;
  name: string;
};

export default function AdminSprints() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'planning' | 'active' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Map of sprintId → brief info for Nexus-generated sprints
  const [nexusBriefMap, setNexusBriefMap] = useState<Record<string, { id: string; title: string }>>({});

  useEffect(() => {
    loadSprints();
    loadPhases();
    // Load nexus brief links (non-blocking)
    apiFetch<{ briefs: any[] }>('/admin/nexus/briefs?limit=100').then((d) => {
      const map: Record<string, { id: string; title: string }> = {};
      for (const b of d.briefs ?? []) {
        if (b.generatedSprintId) map[b.generatedSprintId] = { id: b.id, title: b.title };
      }
      setNexusBriefMap(map);
    }).catch(() => {});
  }, [filter]);

  async function loadPhases() {
    try {
      const data = await apiFetch<Phase[]>('/admin/phases');
      setPhases(data);
    } catch {
      setPhases([]);
    }
  }

  async function loadSprints() {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const data = await apiFetch<Sprint[]>(`/admin/sprints${params}`);
      setSprints(data);
    } catch (err) {
      console.error(err);
      setSprints([]);
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status: string) {
    if (status === 'completed') return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status === 'active') return <Play className="w-5 h-5 text-blue-400 animate-pulse" />;
    return <Pause className="w-5 h-5 text-slate-500" />;
  }

  function getStatusBadge(status: string) {
    if (status === 'completed') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (status === 'active') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-slate-600/20 text-slate-400 border-slate-600/30';
  }

  function getStatusLabel(status: string) {
    if (status === 'completed') return 'הושלם';
    if (status === 'active') return 'פעיל';
    return 'בתכנון';
  }

  function getDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  const activeSprint = sprints.find(s => s.status === 'active');
  const planningSprints = sprints.filter(s => s.status === 'planning');
  const completedSprints = sprints.filter(s => s.status === 'completed');
  const getPhaseName = (phaseId: string) => phases.find(p => p.id === phaseId)?.name ?? null;
  const [, setLocation] = useLocation();

  async function handleDeleteSprint(e: React.MouseEvent, sprintId: string, sprintName: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`למחוק את הספרינט "${sprintName}"? פעולה זו בלתי הפיכה.`)) return;
    try {
      await apiFetch(`/admin/sprints/${sprintId}`, { method: 'DELETE' });
      loadSprints();
    } catch (err) {
      console.error(err);
      alert('שגיאה במחיקת ספרינט');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">טוען ספרינטים...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">ניהול ספרינטים</h1>
          <p className="text-sm text-slate-400 mt-1">
            {sprints.length} ספרינטים | {activeSprint ? '1 פעיל' : 'אין ספרינט פעיל'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-2 shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          ספרינט חדש
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'הכל', count: sprints.length },
          { value: 'active', label: 'פעיל', count: sprints.filter(s => s.status === 'active').length },
          { value: 'planning', label: 'בתכנון', count: planningSprints.length },
          { value: 'completed', label: 'הושלם', count: completedSprints.length },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === f.value
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Active Sprint - Highlighted */}
      {activeSprint && (
        <div className="rounded-xl border-2 border-blue-500/50 bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  {activeSprint.name}
                  {nexusBriefMap[activeSprint.id] && (
                    <span
                      onClick={() => setLocation(`/admin/nexus/briefs/${nexusBriefMap[activeSprint.id].id}`)}
                      className="cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600/50"
                    >
                      <Sparkles className="w-3 h-3" /> Nexus
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-slate-400">ספרינט פעיל</p>
                  {activeSprint.phaseId && getPhaseName(activeSprint.phaseId) && (
                    <button
                      type="button"
                      onClick={() => setLocation('/admin/settings/work-plan')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      Phase: {getPhaseName(activeSprint.phaseId)}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleDeleteSprint(e, activeSprint.id, activeSprint.name)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                title="מחק ספרינט"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <Link href={`/admin/sprints/${activeSprint.id}`}>
                <a className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm shadow-md transition-colors">
                  פתח ספרינט
                </a>
              </Link>
            </div>
          </div>

          {activeSprint.goal && (
            <div className="mb-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">מטרת הספרינט:</span>
              </div>
              <p className="text-sm text-slate-400">{activeSprint.goal}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-slate-900/50">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">תאריך התחלה</span>
              </div>
              <p className="text-sm font-medium text-slate-200">
                {new Date(activeSprint.startDate).toLocaleDateString('he-IL')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">תאריך סיום</span>
              </div>
              <p className="text-sm font-medium text-slate-200">
                {new Date(activeSprint.endDate).toLocaleDateString('he-IL')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">ימים נותרו</span>
              </div>
              <p className="text-sm font-medium text-slate-200">
                {getDaysRemaining(activeSprint.endDate)} ימים
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sprint List */}
      <div className="space-y-3">
        {sprints.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-slate-700 bg-slate-800/50">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-2">אין ספרינטים עדיין</p>
            <p className="text-sm text-slate-500">צור ספרינט ראשון כדי להתחיל</p>
          </div>
        ) : (
          sprints.map((sprint) => (
            <div key={sprint.id} className="group relative p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors">
              <Link href={`/admin/sprints/${sprint.id}`}>
                <a className="block -m-4 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(sprint.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-slate-100">{sprint.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs border ${getStatusBadge(sprint.status)}`}>
                          {getStatusLabel(sprint.status)}
                        </span>
                        {nexusBriefMap[sprint.id] && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLocation(`/admin/nexus/briefs/${nexusBriefMap[sprint.id].id}`); }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/40"
                          >
                            <Sparkles className="w-3 h-3" /> Nexus
                          </button>
                        )}
                        {sprint.phaseId && getPhaseName(sprint.phaseId) && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLocation('/admin/settings/work-plan'); }}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Phase: {getPhaseName(sprint.phaseId)}
                          </button>
                        )}
                      </div>
                      {sprint.goal && (
                        <p className="text-sm text-slate-400 line-clamp-1">{sprint.goal}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(sprint.startDate).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(sprint.endDate).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {sprint.status === 'active' && (
                      <div className="flex items-center gap-1 text-blue-400">
                        <Clock className="w-4 h-4" />
                        <span>{getDaysRemaining(sprint.endDate)} ימים</span>
                      </div>
                    )}
                  </div>
                </div>
                </a>
              </Link>
              <button
                type="button"
                onClick={(e) => handleDeleteSprint(e, sprint.id, sprint.name)}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="מחק ספרינט"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <CreateSprintModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadSprints}
      />
    </div>
  );
}
