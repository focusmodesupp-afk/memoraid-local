import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type AuditEntry = {
  id: string;
  adminUserId: string | null;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

export default function AdminLogs() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: '', from: '', to: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.action) params.set('action', filter.action);
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    params.set('limit', '100');
    apiFetch<AuditEntry[]>(`/admin/audit?${params}`)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [filter.action, filter.from, filter.to]);

  if (loading) return <div className="text-slate-400">טוען...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">יומן ביקורת</h1>

      <div className="flex flex-wrap gap-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">פעולה</label>
          <select
            value={filter.action}
            onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}
            className="rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm"
          >
            <option value="">הכל</option>
            <option value="admin_login">כניסת Admin</option>
            <option value="impersonate">התחזות למשתמש</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">מ-תאריך</label>
          <input
            type="date"
            value={filter.from}
            onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))}
            className="rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">עד תאריך</label>
          <input
            type="date"
            value={filter.to}
            onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))}
            className="rounded-lg border border-slate-600 bg-slate-700 text-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800 text-slate-400 text-right">
              <tr>
                <th className="px-4 py-3 font-medium">תאריך</th>
                <th className="px-4 py-3 font-medium">פעולה</th>
                <th className="px-4 py-3 font-medium">ישות</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    אין רשומות
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-slate-300">
                      {new Date(e.createdAt).toLocaleString('he-IL')}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          e.action === 'impersonate' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-300">
                      {e.entityType && e.entityId ? `${e.entityType}: ${e.entityId.slice(0, 8)}...` : '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-500 font-mono text-xs">{e.ipAddress ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
