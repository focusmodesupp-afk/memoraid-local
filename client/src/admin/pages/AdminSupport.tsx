import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiFetch } from '../../lib/api';
import { Search, Pencil, RefreshCw } from 'lucide-react';

type Customer = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  familyId: string | null;
  familyName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  manager: 'מנהל',
  caregiver: 'מטפל',
  viewer: 'צופה',
  guest: 'אורח',
};

export default function AdminSupport() {
  const [, navigate] = useLocation();
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: '',
  });

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '200');
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.role) params.set('role', filters.role);
    if (filters.isActive) params.set('isActive', filters.isActive);
    apiFetch<Customer[]>(`/admin/users?${params}`)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [filters.role, filters.isActive]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="admin-page-title">חיפוש לקוחות</h1>

      {/* סרגל פילטר רחב */}
      <form
        onSubmit={handleSearch}
        className="admin-card flex flex-wrap gap-4 items-end"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs admin-muted mb-1">חיפוש (שם, אימייל, משפחה)</label>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="הקלד לחיפוש..."
            className="admin-input text-sm py-2"
          />
        </div>
        <div className="w-40">
          <label className="block text-xs admin-muted mb-1">תפקיד</label>
          <select
            value={filters.role}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
            className="admin-input text-sm py-2"
          >
            <option value="">הכל</option>
            <option value="manager">מנהל</option>
            <option value="caregiver">מטפל</option>
            <option value="viewer">צופה</option>
            <option value="guest">אורח</option>
          </select>
        </div>
        <div className="w-36">
          <label className="block text-xs admin-muted mb-1">סטטוס</label>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}
            className="admin-input text-sm py-2"
          >
            <option value="">הכל</option>
            <option value="true">פעיל</option>
            <option value="false">לא פעיל</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2 shadow-md transition-colors"
        >
          <Search className="w-4 h-4" />
          חפש
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="admin-btn-secondary text-sm py-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </button>
      </form>

      {/* רשימת לקוחות */}
      <div className="admin-table-card">
        {loading ? (
          <div className="px-6 py-12 text-center admin-muted">טוען...</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="admin-table-th">
                <tr>
                  <th className="px-4 py-3 font-medium text-right">שם מלא</th>
                  <th className="px-4 py-3 font-medium text-right">אימייל</th>
                  <th className="px-4 py-3 font-medium text-right">תפקיד</th>
                  <th className="px-4 py-3 font-medium text-right">משפחה</th>
                  <th className="px-4 py-3 font-medium text-right">סטטוס</th>
                  <th className="px-4 py-3 font-medium text-right">כניסה אחרונה</th>
                  <th className="px-4 py-3 font-medium text-right">נרשם</th>
                  <th className="px-4 py-3 font-medium text-right w-24">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center admin-muted">
                      לא נמצאו לקוחות
                    </td>
                  </tr>
                ) : (
                  list.map((u) => (
                    <tr key={u.id} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-2 font-medium text-slate-200 text-right">{u.fullName}</td>
                      <td className="px-4 py-2 text-slate-300 text-right">{u.email}</td>
                      <td className="px-4 py-2 text-right">
                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-xs">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {u.familyName ? (
                          <button
                            onClick={() => navigate(`/admin/families/${u.familyId}`)}
                            className="text-blue-400 hover:underline"
                          >
                            {u.familyName}
                          </button>
                        ) : (
                          <span className="admin-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            u.isActive ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 admin-muted'
                          }`}
                        >
                          {u.isActive ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </td>
                      <td className="px-4 py-2 admin-muted text-xs text-right">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString('he-IL', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-2 admin-muted text-xs text-right">
                        {new Date(u.createdAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                          className="px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          עריכה
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs admin-muted">
        מציג {list.length} לקוחות • לחץ על משפחה למעבר לפרטי משפחה | לחץ עריכה למעבר לפרטי משתמש
      </p>
    </div>
  );
}
