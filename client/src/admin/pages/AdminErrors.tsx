import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { AlertTriangle, CheckCircle, Info, RefreshCw, XCircle } from 'lucide-react';

type ErrorLog = {
  id: string;
  level: string;
  message: string;
  stackTrace: string | null;
  context: Record<string, unknown> | null;
  userId: string | null;
  familyId: string | null;
  url: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export default function AdminErrors() {
  const [list, setList] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ level: '', resolved: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (filters.level) params.set('level', filters.level);
    if (filters.resolved) params.set('resolved', filters.resolved);
    apiFetch<ErrorLog[]>(`/admin/qa/errors?${params}`)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), [filters.level, filters.resolved]);

  async function toggleResolved(id: string, resolved: boolean) {
    try {
      await apiFetch(`/admin/qa/errors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved }),
      });
      load();
    } catch (e) {
      console.error(e);
    }
  }

  const unresolvedCount = list.filter((e) => !e.resolved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">שגיאות מערכת</h1>
          <p className="text-sm text-slate-400 mt-1">
            {unresolvedCount > 0 ? (
              <span className="text-red-400 font-medium">{unresolvedCount} שגיאות לא פתורות</span>
            ) : (
              <span className="text-green-400">אין שגיאות פתוחות</span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </button>
      </div>

      {/* פילטרים */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <div className="w-40">
          <label className="block text-xs text-slate-500 mb-1">רמת חומרה</label>
          <select
            value={filters.level}
            onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm"
          >
            <option value="">הכל</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
        <div className="w-36">
          <label className="block text-xs text-slate-500 mb-1">סטטוס</label>
          <select
            value={filters.resolved}
            onChange={(e) => setFilters((f) => ({ ...f, resolved: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm"
          >
            <option value="">הכל</option>
            <option value="false">פתוח</option>
            <option value="true">פתור</option>
          </select>
        </div>
      </div>

      {/* רשימת שגיאות */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400">טוען...</div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-slate-300">אין שגיאות</p>
          </div>
        ) : (
          list.map((err) => (
            <div
              key={err.id}
              className={`rounded-xl border ${
                err.resolved ? 'border-slate-700 bg-slate-800/30' : 'border-red-600/30 bg-red-900/10'
              } overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {err.level === 'error' ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : err.level === 'warn' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-medium text-slate-200 break-words">{err.message}</p>
                      <button
                        onClick={() => toggleResolved(err.id, !err.resolved)}
                        className={`shrink-0 px-3 py-1 rounded text-xs font-medium ${
                          err.resolved
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {err.resolved ? 'פתור' : 'סמן כפתור'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
                      <span>{new Date(err.createdAt).toLocaleString('he-IL')}</span>
                      {err.url && <span className="truncate max-w-xs">{err.url}</span>}
                      {err.ipAddress && <span>{err.ipAddress}</span>}
                    </div>
                    {err.stackTrace && (
                      <button
                        onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        {expandedId === err.id ? 'הסתר Stack Trace' : 'הצג Stack Trace'}
                      </button>
                    )}
                    {expandedId === err.id && err.stackTrace && (
                      <pre className="mt-2 p-3 rounded bg-slate-900 text-slate-300 text-xs overflow-x-auto max-h-64 overflow-y-auto border border-slate-700">
                        {err.stackTrace}
                      </pre>
                    )}
                    {err.context && Object.keys(err.context).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                          Context
                        </summary>
                        <pre className="mt-1 p-2 rounded bg-slate-900 text-slate-400 text-xs overflow-x-auto">
                          {JSON.stringify(err.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
