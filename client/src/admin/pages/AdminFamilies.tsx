import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { apiFetch } from '../../lib/api';
import { Search } from 'lucide-react';

type Family = {
  id: string;
  familyName: string;
  inviteCode: string | null;
  subscriptionTier: string | null;
  createdAt: string;
};

export default function AdminFamilies() {
  const [list, setList] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch<Family[]>('/admin/families')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? list.filter(
        (f) =>
          f.familyName?.toLowerCase().includes(search.toLowerCase()) ||
          f.inviteCode?.toLowerCase().includes(search.toLowerCase()),
      )
    : list;

  if (loading) return <div className="admin-muted">טוען...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="admin-page-title">משפחות</h1>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 admin-muted" />
          <input
            type="text"
            placeholder="חיפוש משפחה או קוד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input w-64 pr-10 pl-3 py-2"
          />
        </div>
      </div>
      <div className="admin-table-card">
        <table className="w-full text-sm">
          <thead className="admin-table-th">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium">שם משפחה</th>
              <th className="px-4 py-3 font-medium">קוד הזמנה</th>
              <th className="px-4 py-3 font-medium">מנוי</th>
              <th className="px-4 py-3 font-medium">תאריך</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr
                key={f.id}
                className="border-t border-slate-700 hover:bg-slate-800/50"
              >
                <td className="px-4 py-3 text-slate-200 text-right">{f.familyName}</td>
                <td className="px-4 py-3 admin-muted font-mono text-right">{f.inviteCode ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {f.subscriptionTier ?? 'free'}
                  </span>
                </td>
                <td className="px-4 py-3 admin-muted text-right">
                  {new Date(f.createdAt).toLocaleDateString('he-IL')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/families/${f.id}`}>
                    <a className="text-blue-400 hover:underline">פרטים</a>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
