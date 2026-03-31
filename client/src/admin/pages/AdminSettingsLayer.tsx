import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Shield, UserPlus } from 'lucide-react';

type Admin = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function AdminSettingsLayer() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Admin[]>('/admin/settings/admins')
      .then(setAdmins)
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400">טוען...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">שכבת ניהול</h1>
        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          הוסף Admin
        </button>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-right text-slate-400">
              <th className="px-4 py-3 font-medium">אימייל</th>
              <th className="px-4 py-3 font-medium">שם</th>
              <th className="px-4 py-3 font-medium">תפקיד</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3 font-medium">כניסה אחרונה</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  אין מנהלים
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-2 text-slate-200">{a.email}</td>
                  <td className="px-4 py-2 text-slate-300">{a.fullName ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        a.role === 'super_admin' ? 'bg-purple-600/20 text-purple-400' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {a.role === 'super_admin' ? 'Super Admin' : 'Support'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        a.isActive ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {a.isActive ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 text-xs">
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString('he-IL') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-amber-400">הרשאות</h2>
        </div>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• <strong>Super Admin</strong> – גישה מלאה, impersonate, פעולות מסוכנות</li>
          <li>• <strong>Support</strong> – צפייה בנתונים, תמיכה בלקוחות, ללא עריכה קריטית</li>
          <li>• יצירת Admin חדש: <code className="text-xs bg-slate-900 px-1 py-0.5 rounded">node scripts/create-admin.mjs</code></li>
        </ul>
      </div>
    </div>
  );
}
