import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { BarChart3, PieChart, Users, ClipboardList } from 'lucide-react';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

type StatsData = {
  tasksTotal: number;
  patientsCount: number;
  tasksByStatus: { status: string; count: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#6366f1',
  todo: '#94a3b8',
  in_progress: '#22c55e',
  stuck: '#ef4444',
  postponed: '#f59e0b',
  cancelled: '#78716c',
  done: '#10b981',
};

export default function DataStatsPage() {
  const { dir, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<StatsData>('/stats/family')
      .then(setData)
      .catch((err) => {
        setError((err as Error)?.message ?? 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div dir={dir} className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {lang === 'he' ? 'טוען נתונים...' : 'Loading data...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div dir={dir} className="section-card border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5">
        <p className="text-sm text-[hsl(var(--warning))]">{error}</p>
      </div>
    );
  }

  const tasksByStatus = data?.tasksByStatus ?? [];
  const pieData = tasksByStatus.map((d) => ({
    name: d.status,
    value: d.count,
    fill: STATUS_COLORS[d.status] ?? '#64748b',
  }));

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 shrink-0">
          <BarChart3 className="h-5 w-5 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h2 className="page-title">{lang === 'he' ? 'דוחות ומגמות היסטוריות' : 'Historical Reports & Trends'}</h2>
          <p className="page-subtitle">
            {lang === 'he'
              ? 'ניתוח תקופתי של משימות, תרופות ופעילות – השוואה לאורך זמן'
              : 'Periodic analysis of tasks, medications and activity — compare over time'}
          </p>
        </div>
      </div>

      {/* Distinction banner */}
      <div className={`flex items-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-4 py-2.5 text-sm text-[hsl(var(--muted-foreground))] ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <BarChart3 className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
        <span>
          {lang === 'he'
            ? 'דף זה מציג מגמות לאורך זמן. '
            : 'This page shows trends over time. '}
        </span>
        <a href="/dashboard" className="font-medium text-[hsl(var(--primary))] hover:underline shrink-0">
          {lang === 'he' ? 'לסטטוס בזמן אמת ← לוח בקרה יומי' : 'For real-time status → Daily dashboard'}
        </a>
      </div>

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
            <ClipboardList className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          <span className="stat-value">{data?.tasksTotal ?? 0}</span>
          <span className="stat-label">{lang === 'he' ? 'סה"כ משימות' : 'Total tasks'}</span>
        </div>
        <div className="stat-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--accent))]/10">
            <Users className="w-5 h-5 text-[hsl(var(--accent))]" />
          </div>
          <span className="stat-value">{data?.patientsCount ?? 0}</span>
          <span className="stat-label">{lang === 'he' ? 'מטופלים' : 'Patients'}</span>
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="section-card">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[hsl(var(--primary))]" />
            {lang === 'he' ? 'משימות לפי סטטוס' : 'Tasks by status'}
          </h3>
          {pieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {lang === 'he' ? 'אין נתונים להצגה' : 'No data to display'}
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="section-card">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[hsl(var(--primary))]" />
            {lang === 'he' ? 'התפלגות משימות' : 'Tasks distribution'}
          </h3>
          {tasksByStatus.length === 0 ? (
            <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {lang === 'he' ? 'אין נתונים להצגה' : 'No data to display'}
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByStatus} layout="vertical" margin={{ right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="status"
                    width={80}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Table summary */}
      {tasksByStatus.length > 0 && (
        <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">
            {lang === 'he' ? 'סיכום' : 'Summary'}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="py-2 text-right font-medium">
                  {lang === 'he' ? 'סטטוס' : 'Status'}
                </th>
                <th className="py-2 text-right font-medium">
                  {lang === 'he' ? 'כמות' : 'Count'}
                </th>
              </tr>
            </thead>
            <tbody>
              {tasksByStatus.map((row) => (
                <tr key={row.status} className="border-b border-[hsl(var(--border))]/50">
                  <td className="py-2 text-right">{row.status}</td>
                  <td className="py-2 text-right font-medium">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
