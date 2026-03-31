import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type QualityCheck = {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  details: string;
  count?: number;
};

export default function AdminQADataQuality() {
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<any[]>('/admin/users?limit=500').catch(() => []),
      apiFetch<any[]>('/admin/families?limit=500').catch(() => []),
    ])
      .then(([users, families]) => {
        const results: QualityCheck[] = [];
        
        const usersNoName = users.filter((u) => !u.fullName || u.fullName.trim() === '');
        results.push({
          name: 'משתמשים ללא שם',
          status: usersNoName.length === 0 ? 'pass' : 'warn',
          details: usersNoName.length === 0 ? 'כל המשתמשים עם שם' : `${usersNoName.length} משתמשים ללא שם`,
          count: usersNoName.length,
        });

        const usersInactive = users.filter((u) => !u.isActive);
        results.push({
          name: 'משתמשים לא פעילים',
          status: usersInactive.length === 0 ? 'pass' : 'warn',
          details: `${usersInactive.length} משתמשים לא פעילים`,
          count: usersInactive.length,
        });

        const familiesNoSub = families.filter((f) => !f.subscriptionTier || f.subscriptionTier === 'free');
        results.push({
          name: 'משפחות ללא מנוי',
          status: familiesNoSub.length === families.length ? 'warn' : 'pass',
          details: `${familiesNoSub.length} מתוך ${families.length} משפחות`,
          count: familiesNoSub.length,
        });

        setChecks(results);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400">טוען...</div>;

  const passed = checks.filter((c) => c.status === 'pass').length;
  const warnings = checks.filter((c) => c.status === 'warn').length;
  const failed = checks.filter((c) => c.status === 'fail').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">איכות נתונים</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">תקין</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{passed}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-slate-400 text-sm">אזהרות</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{warnings}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-slate-400 text-sm">נכשלו</span>
          </div>
          <p className="text-3xl font-bold text-red-400">{failed}</p>
        </div>
      </div>

      <div className="space-y-3">
        {checks.map((c, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 ${
              c.status === 'pass'
                ? 'border-green-600/30 bg-green-900/10'
                : c.status === 'warn'
                ? 'border-amber-600/30 bg-amber-900/10'
                : 'border-red-600/30 bg-red-900/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {c.status === 'pass' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : c.status === 'warn' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-200">{c.name}</p>
                <p className="text-sm text-slate-400 mt-1">{c.details}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
