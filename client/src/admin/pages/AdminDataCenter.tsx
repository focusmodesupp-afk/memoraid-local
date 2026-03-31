import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Database, Download, HardDrive, RefreshCw } from 'lucide-react';

type DBStats = {
  tables: { table: string; count: number }[];
  dbSizeBytes: number;
};

export default function AdminDataCenter() {
  const [stats, setStats] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  function loadStats() {
    setLoading(true);
    apiFetch<DBStats>('/admin/data-center/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => loadStats(), []);

  async function handleExport(entity: string, format: 'json' | 'csv') {
    setExporting(entity);
    try {
      const res = await fetch(`/api/admin/data-center/export/${entity}?format=${format}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}_export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(null);
    }
  }

  const dbSizeMB = stats ? (stats.dbSizeBytes / 1024 / 1024).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">מרכז נתונים</h1>
        <button
          onClick={loadStats}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </button>
      </div>

      {/* DB Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">גודל מסד נתונים</span>
          </div>
          <p className="text-3xl font-bold text-slate-100">{dbSizeMB} MB</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">טבלאות</span>
          </div>
          <p className="text-3xl font-bold text-slate-100">{stats?.tables.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400 text-sm">סה"כ רשומות</span>
          </div>
          <p className="text-3xl font-bold text-slate-100">
            {stats?.tables.reduce((sum, t) => sum + t.count, 0).toLocaleString() ?? 0}
          </p>
        </div>
      </div>

      {/* טבלאות */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200">טבלאות מסד נתונים</h2>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-400">טוען...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-right text-slate-400">
                  <th className="px-6 py-3 font-medium">טבלה</th>
                  <th className="px-6 py-3 font-medium">רשומות</th>
                </tr>
              </thead>
              <tbody>
                {stats?.tables
                  .sort((a, b) => b.count - a.count)
                  .map((t) => (
                    <tr key={t.table} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-6 py-3 font-mono text-slate-200">{t.table}</td>
                      <td className="px-6 py-3 text-slate-300">{t.count.toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ייצוא נתונים */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">ייצוא נתונים</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {['families', 'users', 'tasks'].map((entity) => (
            <div key={entity} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <p className="font-medium text-slate-200 mb-3 capitalize">{entity}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport(entity, 'json')}
                  disabled={exporting === entity}
                  className="flex-1 px-3 py-2 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  JSON
                </button>
                <button
                  onClick={() => handleExport(entity, 'csv')}
                  disabled={exporting === entity}
                  className="flex-1 px-3 py-2 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          ייצוא מוגבל ל-1000 רשומות לישות • לייצוא מלא השתמש בכלי DB חיצוני
        </p>
      </div>

      {/* גיבוי */}
      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">גיבוי ושחזור</h2>
        <p className="text-sm text-slate-400 mb-4">
          לגיבוי מלא של מסד הנתונים, השתמש ב-pg_dump או בכלי הגיבוי של ספק ה-DB (Neon, Supabase, וכו').
        </p>
        <code className="block text-xs bg-slate-900 text-slate-300 p-3 rounded font-mono">
          pg_dump $DATABASE_URL {'>'} backup_$(date +%Y%m%d).sql
        </code>
      </div>
    </div>
  );
}
