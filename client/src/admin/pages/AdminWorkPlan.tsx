import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Circle, Clock, ChevronDown, ChevronUp, Link as LinkIcon, Plus, Play, Target, TrendingUp, Repeat, Wrench, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { apiFetch } from '../../lib/api';
import CreateSprintModal from '../components/CreateSprintModal';

const ROADMAP = [
  { 
    phase: 'Phase 1 - MVP', 
    status: 'completed', 
    items: ['Auth & Login', 'משפחות ומשתמשים', 'מטופלים', 'משימות בסיסיות', 'Dashboard ראשוני'],
    sprintId: null
  },
  { 
    phase: 'Phase 2 - Multi-family', 
    status: 'completed', 
    items: ['תמיכה במשפחות מרובות', 'Family switcher', 'הרשאות לפי משפחה', 'Family invites', 'Member tiers'],
    sprintId: null
  },
  { 
    phase: 'Phase 3 - Admin System', 
    status: 'completed', 
    items: ['33 דפי Admin', 'Dashboard & Stats', 'Support tools', 'QA & Monitoring', 'Feature flags', 'Error tracking', 'CMS', 'Analytics'],
    sprintId: null
  },
  { 
    phase: 'Phase 4 - User Features', 
    status: 'completed', 
    items: ['Kanban board', 'Drag & drop', 'Forgot password', 'Change password', 'Profile page', 'Settings page', 'Notifications'],
    sprintId: null
  },
  { 
    phase: 'Phase 5 - Integrations', 
    status: 'completed', 
    items: ['Resend (Email)', 'Google Calendar', 'Outlook Calendar', 'Apple Calendar', 'Twilio (SMS)', 'WhatsApp'],
    sprintId: null
  },
  { 
    phase: 'Phase 5b - Plans & Checkout', 
    status: 'in_progress', 
    items: [
      'מיגרציה admin_plans + admin_coupon_meta',
      'Admin API: plans, coupons, promotions',
      'דף ניהול מסלולים ותמחור',
      'דף קודי קופון',
      'דף מבצעים',
      'עדכון Checkout (coupon, familyId)',
      'Stripe Webhooks לסנכרון מנויים',
      'עדכון עמוד Pricing'
    ],
    sprintId: 'auto-detect'
  },
  { 
    phase: 'Phase 6 - Testing & Quality', 
    status: 'pending', 
    items: ['E2E tests (Playwright)', 'Unit tests (Vitest)', 'Integration tests', 'Performance testing', 'Security audit'],
    sprintId: null
  },
  { 
    phase: 'Phase 7 - Optimization', 
    status: 'pending', 
    items: ['React Query לקאשינג', 'Virtual scrolling', 'Lazy loading', 'Code splitting', 'Image optimization'],
    sprintId: null
  },
  { 
    phase: 'Phase 8 - AI Enhanced', 
    status: 'pending', 
    items: ['AI task suggestions', 'Smart reminders', 'Questionnaire AI', 'Voice interface', 'Predictive analytics'],
    sprintId: null
  },
  { 
    phase: 'Phase 9 - Mobile', 
    status: 'pending', 
    items: ['React Native app', 'Push notifications', 'Offline mode', 'App stores (iOS/Android)', 'Biometric auth'],
    sprintId: null
  },
];

type Sprint = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  velocity: string | null;
  phaseId?: string | null;
};

type Phase = {
  id: string;
  name: string;
  description: string | null;
  goals: string[];
  status: string;
  position: number;
};

export default function AdminWorkPlan() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [creatingFromPhaseId, setCreatingFromPhaseId] = useState<string | null>(null);

  useEffect(() => {
    loadSprints();
    loadPhases();
  }, []);

  async function loadPhases() {
    try {
      const data = await apiFetch<Phase[]>('/admin/phases');
      setPhases(data);
    } catch {
      setPhases([]);
    }
  }

  async function loadSprints() {
    try {
      const data = await apiFetch<Sprint[]>('/admin/sprints');
      setSprints(data);
    } catch (err) {
      console.error(err);
      setSprints([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSprintCreated() {
    loadSprints();
  }

  const activeSprint = sprints.find(s => s.status === 'active');
  const upcomingSprints = sprints.filter(s => s.status === 'planning');
  const completedSprints = sprints.filter(s => s.status === 'completed');

  const displayPhases = phases.length > 0
    ? phases.map((p) => ({ id: p.id, phase: p.name, status: p.status, items: p.goals || [], phaseName: p.name }))
    : ROADMAP.map((r) => ({ ...r, id: null as string | null, phaseName: r.phase }));

  function getPhaseSprintId(phase: { id?: string | null; phaseName?: string; status: string }): string | null {
    if (phase.status !== 'in_progress') return null;
    if (phases.length === 0) return activeSprint?.id || null;
    const sprintByPhase = phase.id && sprints.find((s) => s.phaseId === phase.id);
    if (sprintByPhase) return sprintByPhase.id;
    const phaseLower = (phase.phaseName || phase.phase || '').toLowerCase();
    if (phaseLower.includes('plans') || phaseLower.includes('checkout')) {
      const match = sprints.find((s) => /plans|checkout/.test(s.name.toLowerCase()));
      if (match) return match.id;
    }
    if (phaseLower.includes('calendar')) {
      const match = sprints.find((s) => /calendar/.test(s.name.toLowerCase()));
      if (match) return match.id;
    }
    return null;
  }

  function isPhaseClickable(phase: { status: string; phaseName?: string; phase?: string; id?: string | null }): boolean {
    return phase.status === 'in_progress' && getPhaseSprintId(phase) !== null;
  }

  function getDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">תוכנית עבודה וניהול ספרינטים</h1>
          <p className="text-sm admin-muted mt-1">
            Roadmap מלא + ניהול ספרינטים בסגנון JIRA
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={activeSprint ? `/admin/dev/kanban?sprint=${activeSprint.id}` : '/admin/dev/kanban'}>
            <a className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Kanban פיתוח {activeSprint ? '(לספרינט הנוכחי)' : ''}
            </a>
          </Link>
        </div>
      </div>

      {/* Flow Info */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-900/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-indigo-200">
          <strong>זרימת עבודה:</strong> ① תוכנית עבודה (Roadmap) מגדירה מה בונים • ② ספרינט מגדיר חלון זמן ומטרה • ③ משימות ב-Kanban (Backlog → To Do → In Progress → Done) • ④ מוסיפים משימות לספרינט מעמוד הספרינט
        </p>
        <div className="flex gap-2 shrink-0">
          {phases.length === 0 && (
            <button
              onClick={async () => {
                try {
                  const j = await apiFetch<{ ok: boolean; message?: string; error?: string }>('/admin/phases/seed', { method: 'POST' });
                  alert(j.ok ? j.message : j.error || 'שגיאה');
                  if (j.ok) loadPhases();
                } catch (e) {
                  alert('שגיאה: ' + (e as Error).message);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm"
            >
              Seed Phases ל-DB
            </button>
          )}
          {!loading && !sprints.some((s) => s.name === 'Sprint 13: Plans & Checkout') && (
            <button
              onClick={async () => {
                try {
                  const base = import.meta.env.VITE_API_URL || '/api';
                  const r = await fetch(`${base}/health/seed-sprint1-plans`, { method: 'POST' });
                  const j = await r.json();
                  alert(j.ok ? j.message : j.error || 'שגיאה');
                  if (j.ok) loadSprints();
                } catch (e) {
                  alert('שגיאה: ' + (e as Error).message);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
            >
              הפעל Seed – Sprint 13 Plans
            </button>
          )}
        </div>
      </div>

      {/* Active Sprint - Highlighted Section */}
      {activeSprint && (
        <div className="rounded-xl border-2 border-blue-500/50 bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">{activeSprint.name}</h2>
                <p className="text-sm admin-muted mt-1">ספרינט פעיל כרגע</p>
              </div>
            </div>
            <div className="flex gap-2">
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
              <p className="text-sm admin-muted">{activeSprint.goal}</p>
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

      {/* Sprint Management Section */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Repeat className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">ניהול ספרינטים</h2>
              <p className="text-sm admin-muted">
                {sprints.length} ספרינטים | {activeSprint ? '1 פעיל' : 'אין ספרינט פעיל'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-2 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            ספרינט חדש
          </button>
        </div>

        {/* Sprint Lists */}
        <div className="space-y-4">
          {/* Upcoming Sprints */}
          {upcomingSprints.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Circle className="w-4 h-4 text-slate-500" />
                ספרינטים מתוכננים ({upcomingSprints.length})
              </h3>
              <div className="space-y-2">
                {upcomingSprints.map((sprint) => (
                  <Link key={sprint.id} href={`/admin/sprints/${sprint.id}`}>
                    <a className="block p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-200">{sprint.name}</h4>
                          {sprint.goal && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{sprint.goal}</p>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(sprint.startDate).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                          {' - '}
                          {new Date(sprint.endDate).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Completed Sprints */}
          {completedSprints.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                ספרינטים שהושלמו ({completedSprints.length})
              </h3>
              <div className="space-y-2">
                {completedSprints.slice(0, 3).map((sprint) => (
                  <Link key={sprint.id} href={`/admin/sprints/${sprint.id}`}>
                    <a className="block p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-200">{sprint.name}</h4>
                          {sprint.velocity && (
                            <p className="text-xs text-slate-500 mt-1">Velocity: {sprint.velocity}</p>
                          )}
                        </div>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                    </a>
                  </Link>
                ))}
                {completedSprints.length > 3 && (
                  <Link href="/admin/sprints?status=completed">
                    <a className="block text-center text-sm text-blue-400 hover:text-blue-300 py-2">
                      הצג עוד {completedSprints.length - 3} ספרינטים →
                    </a>
                  </Link>
                )}
              </div>
            </div>
          )}

          {sprints.length === 0 && !loading && (
            <div className="text-center py-8 text-slate-500">
              <Repeat className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="mb-2">אין ספרינטים עדיין</p>
              <Link href="/admin/sprints">
                <a className="text-blue-400 hover:text-blue-300 text-sm">
                  צור ספרינט ראשון →
                </a>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Roadmap Section */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">Roadmap - מפת דרכים</h2>
              <p className="text-sm admin-muted">{phases.length || 9} שלבים</p>
            </div>
          </div>
          {phases.length > 0 && (
            <button
              onClick={() => setShowMaintenance((v) => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-400 hover:bg-slate-700/50"
              title="תחזוקה"
            >
              <Wrench className="w-3.5 h-3.5" />
              תחזוקה
              {showMaintenance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {showMaintenance && phases.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-slate-800/80 border border-slate-600 flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 w-full mb-1">תחזוקה – פעולות חד־פעמיות</span>
            <button
              onClick={async () => {
                if (!confirm('לעדכן Phase 5 ל-pending? (הוא מסומן כהושלם בטעות)')) return;
                try {
                  const j = await apiFetch<{ ok: boolean; message?: string }>('/admin/phases/fix-phase5', { method: 'POST' });
                  alert(j.message || 'בוצע');
                  loadPhases();
                } catch (e) {
                  alert('שגיאה: ' + (e as Error).message);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white text-sm"
            >
              תקן Phase 5
            </button>
            <button
              onClick={async () => {
                if (!confirm('לאפס את כל ה-phases ולהכניס מחדש? (Phase 5 יהיה pending)')) return;
                try {
                  const j = await apiFetch<{ ok: boolean; message?: string }>('/admin/phases/reset', { method: 'POST' });
                  alert(j.message || 'בוצע');
                  loadPhases();
                } catch (e) {
                  alert('שגיאה: ' + (e as Error).message);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
            >
              איפוס Phases
            </button>
          </div>
        )}

        <div className="space-y-4">
          {displayPhases.map((phase, i) => {
            const sprintId = getPhaseSprintId(phase);
            const clickable = isPhaseClickable(phase);
            const phaseId = 'id' in phase ? phase.id : null;

            async function handleStatusChange(newStatus: string) {
              if (!phaseId) return;
              try {
                await apiFetch(`/admin/phases/${phaseId}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: newStatus }),
                });
                loadPhases();
              } catch (e) {
                alert('שגיאה: ' + (e as Error).message);
              }
            }

            if (clickable && sprintId) {
              return (
                <Link key={i} href={`/admin/sprints/${sprintId}`}>
                  <a className="block">
                    <div className="rounded-xl border p-6 transition-all border-blue-600/30 bg-blue-900/10 hover:border-blue-500/50 cursor-pointer">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="shrink-0 mt-1">
                          <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-100">{phase.phase}</h2>
                            <span className="text-xs text-blue-400 flex items-center gap-1">
                              לחץ לצפייה בספרינט
                              <LinkIcon className="w-3 h-3" />
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-sm text-blue-400">⏳ בביצוע</p>
                            {phaseId && sprintId && (
                              <Link href={`/admin/phases/${phaseId}/task-summary?sprintId=${sprintId}`} onClick={(e) => e.stopPropagation()}>
                                <a className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs">
                                  <Sparkles className="w-3 h-3" />
                                  נתח Phase עם AI
                                </a>
                              </Link>
                            )}
                            {phaseId && (
                              <span onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={phase.status}
                                  onChange={(e) => handleStatusChange(e.target.value)}
                                  className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300"
                                >
                                <option value="pending">מתוכנן</option>
                                <option value="in_progress">בביצוע</option>
                                <option value="completed">הושלם</option>
                                </select>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ul className="space-y-1 mr-9">
                        {phase.items.map((item, j) => (
                          <li key={j} className="text-sm admin-muted flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </a>
                </Link>
              );
            }

            const isPending = phase.status === 'pending';
            const canCreateSprint = isPending && phaseId;
            const isCreating = creatingFromPhaseId === phaseId;

            async function handleCreateSprintFromPhase(e: React.MouseEvent) {
              e.preventDefault();
              e.stopPropagation();
              if (!phaseId || isCreating) return;
              setCreatingFromPhaseId(phaseId);
              const now = new Date();
              const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
              try {
                await apiFetch('/admin/sprints', {
                  method: 'POST',
                  body: JSON.stringify({
                    name: phase.phase,
                    goal: Array.isArray(phase.items) && phase.items.length ? phase.items.slice(0, 3).join(', ') : null,
                    startDate: now.toISOString(),
                    endDate: twoWeeksLater.toISOString(),
                    phaseId,
                  }),
                });
                await loadSprints();
                await loadPhases();
              } catch (err) {
                console.error('Create sprint from phase failed:', err);
                alert('שגיאה: ' + (err as Error).message);
              } finally {
                setCreatingFromPhaseId(null);
              }
            }

            return (
              <div
                key={i}
                className={`rounded-xl border p-6 ${
                  phase.status === 'completed'
                    ? 'border-green-600/30 bg-green-900/10'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="shrink-0 mt-1">
                    {phase.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-slate-100">{phase.phase}</h2>
                      {phaseId && (
                        <select
                          value={phase.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300"
                        >
                          <option value="pending">מתוכנן</option>
                          <option value="in_progress">בביצוע</option>
                          <option value="completed">הושלם</option>
                        </select>
                      )}
                      {canCreateSprint && (
                        <button
                          type="button"
                          onClick={handleCreateSprintFromPhase}
                          disabled={isCreating}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isCreating ? 'יוצר...' : 'צור ספרינט מ-Phase'}
                        </button>
                      )}
                      {phaseId && (
                        <Link href={`/admin/phases/${phaseId}/task-summary${sprintId ? `?sprintId=${sprintId}` : ''}`}>
                          <a
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            נתח Phase עם AI
                          </a>
                        </Link>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${phase.status === 'completed' ? 'text-green-400' : 'text-slate-500'}`}>
                      {phase.status === 'completed' ? '✓ הושלם' : '○ מתוכנן'}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1 mr-9">
                  {phase.items.map((item, j) => (
                    <li key={j} className="text-sm admin-muted flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <CreateSprintModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSprintCreated}
      />
    </div>
  );
}
