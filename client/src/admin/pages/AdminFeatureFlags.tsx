import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type Flag = {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
};

export default function AdminFeatureFlags() {
  const [list, setList] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');

  function load() {
    setLoading(true);
    apiFetch<Flag[]>('/admin/feature-flags')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), []);

  async function toggle(key: string, enabled: boolean) {
    try {
      await apiFetch(`/admin/feature-flags/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function create() {
    if (!newKey.trim()) return;
    try {
      await apiFetch('/admin/feature-flags', {
        method: 'POST',
        body: JSON.stringify({ key: newKey.trim(), description: newDesc.trim() || undefined }),
      });
      setNewKey('');
      setNewDesc('');
      load();
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <div className="admin-muted">טוען...</div>;

  return (
    <div className="space-y-6">
      <h1 className="admin-page-title">Feature Flags</h1>

      <div className="admin-card flex flex-wrap gap-3 items-end p-4">
        <div>
          <label className="block text-xs admin-muted mb-1">מפתח חדש</label>
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="feature_name"
            className="admin-input px-3 py-2 text-sm w-48"
          />
        </div>
        <div>
          <label className="block text-xs admin-muted mb-1">תיאור</label>
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="תיאור (אופציונלי)"
            className="admin-input px-3 py-2 text-sm w-56"
          />
        </div>
        <button
          onClick={create}
          disabled={!newKey.trim()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50 hover:bg-blue-500"
        >
          הוסף
        </button>
      </div>

      <div className="admin-table-card">
        <table className="w-full text-sm">
          <thead className="admin-table-th">
            <tr className="border-b border-slate-700 text-right">
              <th className="px-4 py-3 font-medium">מפתח</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3 font-medium">תיאור</th>
              <th className="px-4 py-3 font-medium">עודכן</th>
            </tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-4 py-2 font-mono text-slate-200 text-right">{f.key}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => toggle(f.key, !f.enabled)}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      f.enabled ? 'bg-green-600/30 text-green-400' : 'bg-slate-700 admin-muted'
                    }`}
                  >
                    {f.enabled ? 'פעיל' : 'כבוי'}
                  </button>
                </td>
                <td className="px-4 py-2 admin-muted text-right">{f.description ?? '—'}</td>
                <td className="px-4 py-2 admin-muted text-xs text-right">{new Date(f.updatedAt).toLocaleString('he-IL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="px-4 py-8 text-center admin-muted">אין דגלים</p>}
      </div>
    </div>
  );
}
