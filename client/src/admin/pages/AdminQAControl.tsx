import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { CheckCircle, XCircle, AlertTriangle, Activity, TrendingUp } from 'lucide-react';

type QAStats = {
  totalErrors: number;
  unresolvedErrors: number;
  featureFlagsEnabled: number;
  featureFlagsTotal: number;
  latestVersion: string | null;
};

export default function AdminQAControl() {
  const [stats, setStats] = useState<QAStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<any[]>('/admin/qa/errors?limit=500').catch(() => []),
      apiFetch<any[]>('/admin/feature-flags').catch(() => []),
      apiFetch<any[]>('/admin/versions?limit=1').catch(() => []),
    ])
      .then(([errors, flags, versions]) => {
        setStats({
          totalErrors: errors.length,
          unresolvedErrors: errors.filter((e: any) => !e.resolved).length,
          featureFlagsEnabled: flags.filter((f: any) => f.enabled).length,
          featureFlagsTotal: flags.length,
          latestVersion: versions[0]?.version ?? null,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400">טוען...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">QA — חדר בקרה</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-slate-400 text-sm">שגיאות פתוחות</span>
          </div>
          <p className="text-3xl font-bold text-red-400">{stats?.unresolvedErrors ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">מתוך {stats?.totalErrors ?? 0} סה"כ</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">Feature Flags</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{stats?.featureFlagsEnabled ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">מתוך {stats?.featureFlagsTotal ?? 0} פעילים</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">גרסה אחרונה</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats?.latestVersion ?? '—'}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400 text-sm">סטטוס מערכת</span>
          </div>
          <p className="text-xl font-bold text-purple-400">
            {(stats?.unresolvedErrors ?? 0) === 0 ? 'תקין' : 'דורש טיפול'}
          </p>
        </div>
      </div>

      {/* קישורים מהירים */}
      <div className="grid gap-4 md:grid-cols-3">
        <a
          href="/admin/qa/errors"
          className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 hover:bg-slate-700/30 transition"
        >
          <h3 className="font-semibold text-slate-200 mb-2">שגיאות</h3>
          <p className="text-sm text-slate-400">מעקב אחר שגיאות מערכת ו-stack traces</p>
        </a>
        <a
          href="/admin/qa/flags"
          className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 hover:bg-slate-700/30 transition"
        >
          <h3 className="font-semibold text-slate-200 mb-2">Feature Flags</h3>
          <p className="text-sm text-slate-400">ניהול דגלים והפעלת תכונות</p>
        </a>
        <a
          href="/admin/qa/versions"
          className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 hover:bg-slate-700/30 transition"
        >
          <h3 className="font-semibold text-slate-200 mb-2">גרסאות</h3>
          <p className="text-sm text-slate-400">ניהול גרסאות אפליקציה</p>
        </a>
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• דפי QA נוספים (ריצות בדיקות, כיסוי קוד) יתווספו בהמשך</li>
          <li>• אינטגרציה עם Sentry/Datadog תתווסף לדף שגיאות</li>
          <li>• דוחות אוטומטיים יישלחו למייל בעת שגיאות קריטיות</li>
        </ul>
      </div>
    </div>
  );
}
