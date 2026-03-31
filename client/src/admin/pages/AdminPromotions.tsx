import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { apiFetch } from '../../lib/api';

type Promotion = {
  id: string;
  name: string | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string;
  durationInMonths: number | null;
  valid: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
};

export default function AdminPromotions() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<Promotion[]>('/admin/promotions');
      setPromos(data);
    } catch {
      setPromos([]);
    } finally {
      setLoading(false);
    }
  }

  function formatDiscount(p: Promotion) {
    if (p.percentOff != null) return `${p.percentOff}% הנחה`;
    if (p.amountOff != null) return `${(p.amountOff / 100).toFixed(0)} ${(p.currency ?? 'ILS').toUpperCase()} הנחה`;
    return '—';
  }

  function formatDuration(p: Promotion) {
    if (p.duration === 'once') return 'פעם אחת';
    if (p.duration === 'forever') return 'לתמיד';
    if (p.duration === 'repeating' && p.durationInMonths) return `${p.durationInMonths} חודשים`;
    return p.duration;
  }

  if (loading) return <div className="text-slate-400">טוען...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">מבצעים</h1>
      </div>

      <div className="rounded-xl border border-amber-600/30 bg-amber-900/10 p-4">
        <p className="text-sm text-amber-200">
          מבצעים ב-Stripe הם Coupons. ליצירת מבצע חדש (20% הנחה, 1+1 כ־50% וכו׳) –{' '}
          <Link href="/admin/plans/coupons">
            <a className="text-amber-400 underline">עבור לדף קודי קופון</a>
          </Link>
          {' '}או צור Coupon ישירות ב-Stripe Dashboard.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-right text-slate-400">
              <th className="px-4 py-3 font-medium">מזהה</th>
              <th className="px-4 py-3 font-medium">הנחה</th>
              <th className="px-4 py-3 font-medium">משך</th>
              <th className="px-4 py-3 font-medium">שימוש</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-4 py-3 font-mono text-slate-400">{p.id}</td>
                <td className="px-4 py-3 text-slate-100 font-medium">{formatDiscount(p)}</td>
                <td className="px-4 py-3 text-slate-400">{formatDuration(p)}</td>
                <td className="px-4 py-3 text-slate-400">
                  {p.timesRedeemed}
                  {p.maxRedemptions != null ? ` / ${p.maxRedemptions}` : ''}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${p.valid ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                    {p.valid ? 'פעיל' : 'לא פעיל'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {promos.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">
            אין Coupons ב-Stripe. צור קוד קופון בדף קודי קופון.
          </p>
        )}
      </div>
    </div>
  );
}
