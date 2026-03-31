import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { TrendingUp, DollarSign, Users as UsersIcon, Calendar } from 'lucide-react';

type SalesStats = {
  totalFamilies: number;
  paidFamilies: number;
  monthlyRevenue: number;
  conversionRate: number;
};

export default function AdminSalesReports() {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any[]>('/admin/subscriptions')
      .then((subs) => {
        const paid = subs.filter((s) => s.subscriptionTier && s.subscriptionTier !== 'free');
        setStats({
          totalFamilies: subs.length,
          paidFamilies: paid.length,
          monthlyRevenue: paid.length * 99,
          conversionRate: subs.length > 0 ? (paid.length / subs.length) * 100 : 0,
        });
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400">טוען...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">דוחות מכירות</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <UsersIcon className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">סה"כ משפחות</span>
          </div>
          <p className="text-3xl font-bold text-slate-100">{stats?.totalFamilies ?? 0}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">משפחות משלמות</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{stats?.paidFamilies ?? 0}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400 text-sm">הכנסה חודשית (הערכה)</span>
          </div>
          <p className="text-3xl font-bold text-purple-400">₪{stats?.monthlyRevenue.toLocaleString() ?? 0}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <span className="text-slate-400 text-sm">שיעור המרה</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{stats?.conversionRate.toFixed(1) ?? 0}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">דוחות נוספים</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="/admin/subscriptions"
            className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 hover:bg-slate-700/30 transition"
          >
            <h3 className="font-medium text-slate-200 mb-1">מנויים</h3>
            <p className="text-xs text-slate-400">רשימת מנויים, Stripe, ביטולים</p>
          </a>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 opacity-50">
            <h3 className="font-medium text-slate-200 mb-1">פיננסים</h3>
            <p className="text-xs text-slate-400">הכנסות, הוצאות, OKR (בקרוב)</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• נתוני הכנסה הם הערכה בסיסית — לנתונים מדויקים השתמש ב-Stripe Dashboard</li>
          <li>• דוחות מתקדמים (cohort analysis, churn, LTV) יתווספו בהמשך</li>
          <li>• אינטגרציה עם Stripe Webhooks תאפשר מעקב real-time</li>
        </ul>
      </div>
    </div>
  );
}
