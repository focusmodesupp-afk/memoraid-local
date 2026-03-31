import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import { apiFetch } from '../../lib/api';
type FamilyDetail = {
  id: string;
  familyName: string;
  inviteCode: string | null;
  subscriptionTier: string | null;
  members: Array<{
    userId: string;
    fullName: string;
    email: string;
    role: string;
    memberTier: string | null;
    joinedAt: string;
  }>;
  patients: Array<{ id: string; fullName: string; isPrimary: boolean }>;
};

export default function AdminFamilyDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<FamilyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiFetch<FamilyDetail>(`/admin/families/${id}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-slate-400">טוען...</div>;
  if (!data) return <div className="text-red-400">משפחה לא נמצאה</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/families">
          <a className="text-slate-400 hover:text-slate-200">← חזרה</a>
        </Link>
        <h1 className="text-2xl font-bold text-slate-100">{data.familyName}</h1>
        <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-sm">
          {data.subscriptionTier ?? 'free'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">חברי משפחה</h2>
          <div className="space-y-3">
            {data.members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
              >
                <div>
                  <p className="font-medium text-slate-200">{m.fullName}</p>
                  <p className="text-sm text-slate-500">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">
                    {m.role}
                  </span>
                  <Link href={`/admin/users/${m.userId}`}>
                    <a className="text-blue-400 hover:underline text-sm">משתמש</a>
                  </Link>
                </div>
              </div>
            ))}
            {data.members.length === 0 && (
              <p className="text-slate-500 text-sm">אין חברים</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">מטופלים</h2>
          <div className="space-y-2">
            {data.patients.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
              >
                <span className="text-slate-200">{p.fullName}</span>
                {p.isPrimary && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    ראשי
                  </span>
                )}
              </div>
            ))}
            {data.patients.length === 0 && (
              <p className="text-slate-500 text-sm">אין מטופלים</p>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-slate-500">
        קוד הזמנה: <code className="font-mono bg-slate-800 px-2 py-1 rounded">{data.inviteCode ?? '—'}</code>
      </div>
    </div>
  );
}
