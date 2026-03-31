import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type Version = {
  id: string;
  version: string;
  platform: string;
  releaseNotes: string | null;
  releasedAt: string | null;
  createdAt: string;
};

export default function AdminVersions() {
  const [list, setList] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('');
  const [form, setForm] = useState({ version: '', platform: 'web', releaseNotes: '' });

  function load() {
    setLoading(true);
    const q = platform ? `?platform=${encodeURIComponent(platform)}` : '';
    apiFetch<Version[]>(`/admin/versions${q}`)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), [platform]);

  async function create() {
    if (!form.version.trim()) return;
    try {
      await apiFetch('/admin/versions', {
        method: 'POST',
        body: JSON.stringify({
          version: form.version.trim(),
          platform: form.platform,
          releaseNotes: form.releaseNotes.trim() || undefined,
        }),
      });
      setForm({ version: '', platform: 'web', releaseNotes: '' });
      load();
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <div className="admin-muted">טוען...</div>;

  return (
    <div className="space-y-6">
      <h1 className="admin-page-title">גרסאות</h1>

      <div className="admin-card flex flex-wrap gap-3 items-end p-4">
        <div>
          <label className="block text-xs admin-muted mb-1">גרסה</label>
          <input
            value={form.version}
            onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
            placeholder="1.2.3"
            className="admin-input px-3 py-2 text-sm w-24"
          />
        </div>
        <div>
          <label className="block text-xs admin-muted mb-1">פלטפורמה</label>
          <select
            value={form.platform}
            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
            className="admin-input px-3 py-2 text-sm"
          >
            <option value="web">Web</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </select>
        </div>
        <div>
          <label className="block text-xs admin-muted mb-1">הערות שחרור</label>
          <input
            value={form.releaseNotes}
            onChange={(e) => setForm((f) => ({ ...f, releaseNotes: e.target.value }))}
            placeholder="תיאור (אופציונלי)"
            className="admin-input px-3 py-2 text-sm w-64"
          />
        </div>
        <button
          onClick={create}
          disabled={!form.version.trim()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50 hover:bg-blue-500"
        >
          הוסף
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <span className="admin-muted text-sm">סינון פלטפורמה:</span>
        {['', 'web', 'ios', 'android'].map((p) => (
          <button
            key={p || 'all'}
            onClick={() => setPlatform(p)}
            className={`px-3 py-1 rounded text-sm ${platform === p ? 'bg-blue-600 text-white' : 'bg-slate-700 admin-muted hover:bg-slate-600'}`}
          >
            {p || 'הכל'}
          </button>
        ))}
      </div>

      <div className="admin-table-card">
        <table className="w-full text-sm">
          <thead className="admin-table-th">
            <tr className="border-b border-slate-700 text-right">
              <th className="px-4 py-3 font-medium">גרסה</th>
              <th className="px-4 py-3 font-medium">פלטפורמה</th>
              <th className="px-4 py-3 font-medium">הערות</th>
              <th className="px-4 py-3 font-medium">תאריך</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-4 py-2 font-mono text-slate-200 text-right">{v.version}</td>
                <td className="px-4 py-2 text-right">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200">{v.platform}</span>
                </td>
                <td className="px-4 py-2 admin-muted max-w-xs truncate text-right">{v.releaseNotes ?? '—'}</td>
                <td className="px-4 py-2 admin-muted text-xs text-right">
                  {new Date(v.releasedAt ?? v.createdAt).toLocaleString('he-IL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="px-4 py-8 text-center admin-muted">אין גרסאות</p>}
      </div>
    </div>
  );
}
