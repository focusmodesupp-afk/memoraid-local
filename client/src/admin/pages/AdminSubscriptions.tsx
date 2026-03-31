import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { CreditCard, TrendingUp, Users, DollarSign, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type Sub = {
  id: string;
  familyName: string;
  subscriptionTier: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  currentPeriodEnd: string | null;
  createdAt: string;
};

type Stats = {
  total: number;
  active: number;
  free: number;
  mrr: number;
};

export default function AdminSubscriptions() {
  const [list, setList] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'free' | 'canceled'>('all');

  useEffect(() => {
    apiFetch<Sub[]>('/admin/subscriptions')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400">טוען...</div>;

  const filtered = list.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'active') return s.status === 'active';
    if (filter === 'free') return !s.subscriptionTier || s.subscriptionTier === 'free';
    if (filter === 'canceled') return s.status === 'canceled';
    return true;
  });

  const stats: Stats = {
    total: list.length,
    active: list.filter((s) => s.status === 'active').length,
    free: list.filter((s) => !s.subscriptionTier || s.subscriptionTier === 'free').length,
    mrr: list.filter((s) => s.status === 'active' && s.subscriptionTier === 'premium').length * 99,
  };

  function getStatusBadge(status: string | null) {
    if (!status || status === 'canceled') return <span className="flex items-center gap-1 text-slate-500"><XCircle className="w-4 h-4" />לא פעיל</span>;
    if (status === 'active') return <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-4 h-4" />פעיל</span>;
    if (status === 'trialing') return <span className="flex items-center gap-1 text-blue-400"><Clock className="w-4 h-4" />ניסיון</span>;
    if (status === 'past_due') return <span className="flex items-center gap-1 text-amber-400"><Clock className="w-4 h-4" />חוב</span>;
    return <span className="text-slate-500">{status}</span>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">מנויים</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">סה"כ משפחות</span>
          </div>
          <p className="text-3xl font-bold text-slate-100">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">מנויים פעילים</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{stats.active}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <span className="text-slate-400 text-sm">Free</span>
          </div>
          <p className="text-3xl font-bold text-slate-400">{stats.free}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400 text-sm">MRR משוער</span>
          </div>
          <p className="text-3xl font-bold text-purple-400">₪{stats.mrr}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'active', 'free', 'canceled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {f === 'all' ? 'הכל' : f === 'active' ? 'פעילים' : f === 'free' ? 'Free' : 'מבוטלים'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-right text-slate-400">
              <th className="px-4 py-3 font-medium">משפחה</th>
              <th className="px-4 py-3 font-medium">רמת מנוי</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3 font-medium">תוקף עד</th>
              <th className="px-4 py-3 font-medium">Stripe</th>
              <th className="px-4 py-3 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-4 py-2">
                  <Link href={`/admin/families/${s.id}`}>
                    <a className="text-blue-400 hover:underline">{s.familyName}</a>
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      s.subscriptionTier === 'premium'
                        ? 'bg-purple-600/20 text-purple-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {s.subscriptionTier ?? 'free'}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">{getStatusBadge(s.status)}</td>
                <td className="px-4 py-2 text-slate-400 text-xs">
                  {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('he-IL') : '—'}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500">
                  {s.stripeCustomerId ? s.stripeCustomerId.slice(0, 18) + '...' : '—'}
                </td>
                <td className="px-4 py-2">
                  {s.stripeCustomerId && (
                    <a
                      href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                    >
                      Stripe
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">אין תוצאות</p>
        )}
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• נתונים מסונכרנים עם Stripe webhooks</li>
          <li>• MRR = Monthly Recurring Revenue (הכנסה חודשית חוזרת)</li>
          <li>• ניתן לנהל מנויים ישירות מ-Stripe Dashboard</li>
        </ul>
      </div>
    </div>
  );
}
