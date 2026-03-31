import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { ShieldAlert, ArrowRightLeft, Link } from 'lucide-react';

type Stats = { families: number; users: number; patients: number; tasks: number };
type GrowthRow = { date: string; users: number; families: number; patients: number };
type CountRow = { status?: string; role?: string; count: number };
type MedicalQuickSummary = {
  criticalUnreadInsights: number;
  pendingReferrals: number;
  abnormalLabResults: number;
  abnormalVitalReadings: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [growth, setGrowth] = useState<GrowthRow[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<CountRow[]>([]);
  const [usersByRole, setUsersByRole] = useState<CountRow[]>([]);
  const [medicalSummary, setMedicalSummary] = useState<MedicalQuickSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const FALLBACK_STATS: Stats = { families: 0, users: 0, patients: 0, tasks: 0 };

  useEffect(() => {
    Promise.all([
      apiFetch<Stats>('/admin/stats').catch(() => FALLBACK_STATS),
      apiFetch<GrowthRow[]>('/admin/stats/growth?days=30').catch(() => []),
      apiFetch<CountRow[]>('/admin/stats/tasks-by-status').catch(() => []),
      apiFetch<CountRow[]>('/admin/stats/users-by-role').catch(() => []),
      apiFetch<{ summary: MedicalQuickSummary }>('/admin/medical-insights-summary').catch(() => null),
    ])
      .then(([s, g, t, u, med]) => {
        setStats(s ?? FALLBACK_STATS);
        setGrowth(g ?? []);
        setTasksByStatus(t ?? []);
        setUsersByRole(u ?? []);
        if (med?.summary) setMedicalSummary(med.summary);
      })
      .catch(() => setStats(FALLBACK_STATS))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-muted">טוען...</div>;
  if (!stats) return <div className="admin-muted">טוען...</div>;

  const cards = [
    { label: 'משפחות', value: stats.families, color: 'bg-blue-500/20 text-blue-400' },
    { label: 'משתמשים', value: stats.users, color: 'bg-green-500/20 text-green-400' },
    { label: 'מטופלים', value: stats.patients, color: 'bg-purple-500/20 text-purple-400' },
    { label: 'משימות', value: stats.tasks, color: 'bg-amber-500/20 text-amber-400' },
  ];

  const roleLabels: Record<string, string> = {
    manager: 'מנהל',
    caregiver: 'מטפל',
    viewer: 'צופה',
    guest: 'אורח',
  };
  const statusLabels: Record<string, string> = {
    scheduled: 'מתוזמן',
    todo: 'לעשות',
    in_progress: 'בביצוע',
    stuck: 'תקוע',
    postponed: 'נדחה',
    cancelled: 'בוטל',
    done: 'הושלם',
  };

  return (
    <div className="space-y-6">
      <h1 className="admin-page-title">לוח בקרה</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, color }) => (
          <div
            key={label}
            className={`admin-card p-6 ${color}`}
          >
            <p className="text-sm opacity-80">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-card p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">מגמות 30 יום</h2>
          {growth.length === 0 ? (
            <p className="admin-muted text-sm">אין נתונים</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {growth.slice(-14).map((r) => (
                <div
                  key={r.date}
                  className="flex justify-between text-sm py-1 border-b border-slate-700/50 last:border-0"
                >
                  <span className="admin-muted">
                    {new Date(r.date).toLocaleDateString('he-IL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                  </span>
                  <span className="flex gap-4">
                    <span className="text-green-400">{r.users} משתמשים</span>
                    <span className="text-blue-400">{r.families} משפחות</span>
                    <span className="text-purple-400">{r.patients} מטופלים</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">משימות לפי סטטוס</h2>
          {tasksByStatus.length === 0 ? (
            <p className="admin-muted text-sm">אין נתונים</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tasksByStatus.map((r) => (
                <span
                  key={r.status ?? ''}
                  className="px-3 py-1 rounded-lg bg-slate-700 text-slate-200 text-sm"
                >
                  {statusLabels[r.status ?? ''] ?? r.status}: {r.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {medicalSummary && (
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">מדדים רפואיים קריטיים</h2>
            <a href="/admin/medical-insights" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              <Link size={12} /> לדף המלא
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/20 text-center">
              <ShieldAlert size={20} className="mx-auto mb-1 text-red-400" />
              <p className="text-2xl font-bold text-red-400">{medicalSummary.criticalUnreadInsights}</p>
              <p className="text-xs text-slate-400 mt-1">תובנות קריטיות</p>
            </div>
            <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/20 text-center">
              <ArrowRightLeft size={20} className="mx-auto mb-1 text-amber-400" />
              <p className="text-2xl font-bold text-amber-400">{medicalSummary.pendingReferrals}</p>
              <p className="text-xs text-slate-400 mt-1">הפניות ממתינות</p>
            </div>
            <div className="rounded-lg p-3 bg-orange-500/10 border border-orange-500/20 text-center">
              <p className="text-2xl font-bold text-orange-400">{medicalSummary.abnormalLabResults}</p>
              <p className="text-xs text-slate-400 mt-1">תוצאות מעבדה חריגות</p>
            </div>
            <div className="rounded-lg p-3 bg-yellow-500/10 border border-yellow-500/20 text-center">
              <p className="text-2xl font-bold text-yellow-400">{medicalSummary.abnormalVitalReadings}</p>
              <p className="text-xs text-slate-400 mt-1">מדדים חיוניים חריגים</p>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">משתמשים לפי תפקיד</h2>
        {usersByRole.length === 0 ? (
          <p className="admin-muted text-sm">אין נתונים</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {usersByRole.map((r) => (
              <span
                key={r.role ?? ''}
                className="px-3 py-1 rounded-lg bg-slate-700 text-slate-200 text-sm"
              >
                {roleLabels[r.role ?? ''] ?? r.role}: {r.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
