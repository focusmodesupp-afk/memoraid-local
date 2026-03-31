import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import { apiFetch } from '../../lib/api';
import { useAdminAuth } from '../../hooks/useAdminAuth';

type UserDetail = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  memberships: Array<{
    familyId: string;
    familyName: string;
    role: string;
    memberTier: string | null;
    joinedAt: string;
  }>;
};

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { admin } = useAdminAuth();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toggling, setToggling] = useState(false);

  function refresh() {
    if (!id) return;
    apiFetch<UserDetail>(`/admin/users/${id}`).then(setData).catch(() => {});
  }

  useEffect(() => {
    if (!id) return;
    apiFetch<UserDetail>(`/admin/users/${id}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleImpersonate() {
    if (!data || admin?.role !== 'super_admin') return;
    setImpersonating(true);
    try {
      await apiFetch<{ redirectUrl: string }>(`/admin/users/${id}/impersonate`, { method: 'POST' });
      window.location.href = '/dashboard';
    } catch (err) {
      alert('Impersonation failed');
    } finally {
      setImpersonating(false);
    }
  }

  async function handleResetPassword() {
    if (!data || admin?.role !== 'super_admin') return;
    const newPassword = prompt('סיסמה חדשה (מינימום 6 תווים):');
    if (!newPassword || newPassword.length < 6) return;
    setResetting(true);
    try {
      await apiFetch(`/admin/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      alert('הסיסמה עודכנה בהצלחה');
    } catch (err) {
      alert('איפוס סיסמא נכשל');
    } finally {
      setResetting(false);
    }
  }

  async function handleToggleActive() {
    if (!data || admin?.role !== 'super_admin') return;
    setToggling(true);
    try {
      await apiFetch(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !data.isActive }),
      });
      setData((d) => (d ? { ...d, isActive: !d.isActive } : d));
    } catch (err) {
      alert('עדכון נכשל');
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <div className="text-slate-400">טוען...</div>;
  if (!data) return <div className="text-red-400">משתמש לא נמצא</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <a className="text-slate-400 hover:text-slate-200">← חזרה</a>
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">{data.fullName}</h1>
          <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-sm">
            {data.role}
          </span>
        </div>
        {admin?.role === 'super_admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleImpersonate}
              disabled={impersonating}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {impersonating ? 'מתחבר...' : 'התחבר כמשתמש'}
            </button>
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {resetting ? '...' : 'איפוס סיסמא'}
            </button>
            <button
              onClick={handleToggleActive}
              disabled={toggling}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                data?.isActive ? 'bg-red-600/80 hover:bg-red-600' : 'bg-green-600/80 hover:bg-green-600'
              } text-white`}
            >
              {toggling ? '...' : data?.isActive ? 'השבת משתמש' : 'הפעל משתמש'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <p className="text-slate-400">{data.email}</p>
        <p className="text-sm">
          סטטוס: <span className={data.isActive ? 'text-green-400' : 'text-red-400'}>{data.isActive ? 'פעיל' : 'לא פעיל'}</span>
        </p>
        {data.lastLoginAt && (
          <p className="text-sm text-slate-500">
            כניסה אחרונה: {new Date(data.lastLoginAt).toLocaleString('he-IL')}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">משפחות</h2>
        <div className="space-y-3">
          {data.memberships.map((m) => (
            <div
              key={m.familyId}
              className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
            >
              <Link href={`/admin/families/${m.familyId}`}>
                <a className="text-blue-400 hover:underline">{m.familyName}</a>
              </Link>
              <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">
                {m.role} {m.memberTier ? `· ${m.memberTier}` : ''}
              </span>
            </div>
          ))}
          {data.memberships.length === 0 && (
            <p className="text-slate-500 text-sm">אין שייכות למשפחות</p>
          )}
        </div>
      </div>
    </div>
  );
}
