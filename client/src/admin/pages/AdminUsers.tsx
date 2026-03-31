import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { apiFetch } from '../../lib/api';
import { Search } from 'lucide-react';

type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function AdminUsers() {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch<User[]>('/admin/users')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? list.filter(
        (u) =>
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.fullName?.toLowerCase().includes(search.toLowerCase()),
      )
    : list;

  if (loading) return <div className="admin-muted">טוען...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="admin-page-title">משתמשים</h1>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 admin-muted" />
          <input
            type="text"
            placeholder="חיפוש אימייל או שם..."
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
              <th className="px-4 py-3 font-medium">שם</th>
              <th className="px-4 py-3 font-medium">אימייל</th>
              <th className="px-4 py-3 font-medium">תפקיד</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3 font-medium">כניסה אחרונה</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.id}
                className="border-t border-slate-700 hover:bg-slate-800/50"
              >
                <td className="px-4 py-3 text-slate-200 text-right">{u.fullName}</td>
                <td className="px-4 py-3 admin-muted text-right">{u.email}</td>
                <td className="px-4 py-3 text-right">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={u.isActive ? 'text-green-400' : 'text-red-400'}>
                    {u.isActive ? 'פעיל' : 'לא פעיל'}
                  </span>
                </td>
                <td className="px-4 py-3 admin-muted text-right">
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleString('he-IL')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/users/${u.id}`}>
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
