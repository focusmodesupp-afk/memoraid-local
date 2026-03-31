import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Tag, Ticket, BarChart2, CheckCircle, XCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type Coupon = {
  id: string;
  stripePromotionCodeId: string;
  code?: string;
  active?: boolean;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  timesRedeemed?: number;
  maxRedemptions?: number;
  expiresAt?: string | null;
  source: string;
  campaignName?: string | null;
  notes?: string | null;
  stripeError?: string;
  createdAt: string;
};

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

const SOURCES = [
  { value: 'newsletter', label: 'ניוזלטר' },
  { value: 'social', label: 'סושיאל מדיה' },
  { value: 'partner', label: 'שותף' },
  { value: 'other', label: 'אחר' },
];

const EMPTY_FORM = {
  code: '',
  percentOff: '',
  amountOff: '',
  currency: 'ils',
  duration: 'once',
  durationInMonths: '',
  maxRedemptions: '',
  expiresAt: '',
  source: 'other',
  campaignName: '',
  notes: '',
};

type Tab = 'coupons' | 'promotions';

export default function AdminCoupons() {
  const [tab, setTab] = useState<Tab>('coupons');

  // ── Coupons state ──────────────────────────────────────────────
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [filterSource, setFilterSource] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── Promotions state ───────────────────────────────────────────
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [promosLoading, setPromosLoading] = useState(true);

  useEffect(() => { loadCoupons(); }, [filterSource]);
  useEffect(() => { loadPromos(); }, []);

  async function loadCoupons() {
    setCouponsLoading(true);
    try {
      const url = filterSource ? `/admin/coupons?source=${encodeURIComponent(filterSource)}` : '/admin/coupons';
      setCoupons(await apiFetch<Coupon[]>(url));
    } catch { setCoupons([]); }
    finally { setCouponsLoading(false); }
  }

  async function loadPromos() {
    setPromosLoading(true);
    try { setPromos(await apiFetch<Promotion[]>('/admin/promotions')); }
    catch { setPromos([]); }
    finally { setPromosLoading(false); }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function saveCoupon() {
    const percentOff = form.percentOff ? parseFloat(form.percentOff) : null;
    const amountOff = form.amountOff ? parseFloat(form.amountOff) * 100 : null;
    if (!form.code || (percentOff == null && amountOff == null)) {
      alert('נא למלא קוד ואחוז הנחה או סכום הנחה');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          percentOff: percentOff ?? undefined,
          amountOff: amountOff ?? undefined,
          currency: form.currency,
          duration: form.duration,
          durationInMonths: form.durationInMonths ? Number(form.durationInMonths) : undefined,
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
          expiresAt: form.expiresAt || undefined,
          source: form.source,
          campaignName: form.campaignName || undefined,
          notes: form.notes || undefined,
        }),
      });
      setShowForm(false);
      loadCoupons();
      loadPromos();
    } catch (e: any) {
      alert(e?.message ?? 'שגיאה ביצירת הקוד – בדוק שהקוד לא קיים כבר ב-Stripe');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCoupon(id: string) {
    if (!confirm('למחוק את קוד הקופון?')) return;
    try {
      await apiFetch(`/admin/coupons/${id}`, { method: 'DELETE' });
      loadCoupons();
      loadPromos();
    } catch (e: any) {
      alert(e?.message ?? 'שגיאה במחיקה');
    }
  }

  function getSourceLabel(v: string) {
    return SOURCES.find((s) => s.value === v)?.label ?? v;
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

  // ── Stats ──────────────────────────────────────────────────────
  const activeCoupons = coupons.filter((c) => c.active !== false).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.timesRedeemed ?? 0), 0);
  const activePromos = promos.filter((p) => p.valid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">קופונים ומבצעים</h1>
          <p className="text-sm text-slate-400 mt-1">ניהול קודי הנחה וקמפיינים שיווקיים</p>
        </div>
        {tab === 'coupons' && (
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            קוד קופון חדש
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400">קודי קופון</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">{coupons.length}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-400">קודים פעילים</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">{activeCoupons}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">סה״כ מימושים</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">{totalRedemptions}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">מבצעים פעילים (Stripe)</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">{activePromos}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        <button
          onClick={() => setTab('coupons')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'coupons'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            קודי קופון ({coupons.length})
          </span>
        </button>
        <button
          onClick={() => setTab('promotions')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'promotions'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            מבצעים Stripe ({promos.length})
          </span>
        </button>
      </div>

      {/* ── Tab: Coupons ── */}
      {tab === 'coupons' && (
        <div className="space-y-4">
          {/* Source filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterSource('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterSource ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              הכל
            </button>
            {SOURCES.map((s) => (
              <button
                key={s.value}
                onClick={() => setFilterSource(s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterSource === s.value ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={loadCoupons}
              className="ms-auto px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              רענן
            </button>
          </div>

          {couponsLoading ? (
            <div className="text-slate-400 py-8 text-center">טוען...</div>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-right text-slate-400">
                    <th className="px-4 py-3 font-medium">קוד</th>
                    <th className="px-4 py-3 font-medium">הנחה</th>
                    <th className="px-4 py-3 font-medium">משך</th>
                    <th className="px-4 py-3 font-medium">מקור / קמפיין</th>
                    <th className="px-4 py-3 font-medium">שימוש</th>
                    <th className="px-4 py-3 font-medium">תוקף</th>
                    <th className="px-4 py-3 font-medium">סטטוס</th>
                    <th className="px-4 py-3 font-medium">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 align-middle">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                        {c.code ?? c.stripePromotionCodeId}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium">
                        {c.percentOff != null
                          ? `${c.percentOff}%`
                          : c.amountOff != null
                          ? `${(c.amountOff / 100).toFixed(0)} ${(c.currency ?? 'ILS').toUpperCase()}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.stripeError ? (
                          <span className="text-red-400 text-xs">{c.stripeError}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-300">{getSourceLabel(c.source)}</div>
                        {c.campaignName && (
                          <div className="text-xs text-slate-500 truncate max-w-[120px]">{c.campaignName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <span className="font-medium text-slate-300">{c.timesRedeemed ?? 0}</span>
                        {c.maxRedemptions != null && (
                          <span className="text-slate-500"> / {c.maxRedemptions}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString('he-IL')
                          : <span className="text-slate-600">ללא הגבלה</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.active !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            פעיל
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-600/50 text-slate-400">
                            <XCircle className="w-3 h-3" />
                            לא פעיל
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteCoupon(c.id)}
                          aria-label="מחק קוד"
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coupons.length === 0 && (
                <p className="px-4 py-10 text-center text-slate-500">
                  אין קודי קופון. לחץ "קוד קופון חדש" כדי ליצור.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Promotions ── */}
      {tab === 'promotions' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-600/25 bg-amber-900/10 p-4 text-sm text-amber-200">
            מבצעים ב-Stripe הם Coupons. כדי ליצור מבצע חדש – עבור ללשונית <strong>קודי קופון</strong> וצור קוד חדש, הוא יופיע כאן אוטומטית.
          </div>

          <div className="flex justify-end">
            <button
              onClick={loadPromos}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              רענן
            </button>
          </div>

          {promosLoading ? (
            <div className="text-slate-400 py-8 text-center">טוען...</div>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-right text-slate-400">
                    <th className="px-4 py-3 font-medium">מזהה Stripe</th>
                    <th className="px-4 py-3 font-medium">שם</th>
                    <th className="px-4 py-3 font-medium">הנחה</th>
                    <th className="px-4 py-3 font-medium">משך</th>
                    <th className="px-4 py-3 font-medium">שימוש</th>
                    <th className="px-4 py-3 font-medium">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p) => (
                    <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.id}</td>
                      <td className="px-4 py-3 text-slate-300">{p.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-100 font-medium">{formatDiscount(p)}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDuration(p)}</td>
                      <td className="px-4 py-3 text-slate-400">
                        <span className="font-medium text-slate-300">{p.timesRedeemed}</span>
                        {p.maxRedemptions != null && (
                          <span className="text-slate-500"> / {p.maxRedemptions}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.valid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            פעיל
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-600/50 text-slate-400">
                            <XCircle className="w-3 h-3" />
                            לא פעיל
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {promos.length === 0 && (
                <p className="px-4 py-10 text-center text-slate-500">
                  אין Coupons ב-Stripe. צור קוד קופון בלשונית קודי קופון.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── New Coupon Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-100 mb-4">קוד קופון חדש</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">קוד *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="NEWSLETTER20"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">אחוז הנחה</label>
                  <input
                    type="number"
                    value={form.percentOff}
                    onChange={(e) => setForm((f) => ({ ...f, percentOff: e.target.value, amountOff: '' }))}
                    placeholder="20"
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">סכום הנחה (₪)</label>
                  <input
                    type="number"
                    value={form.amountOff}
                    onChange={(e) => setForm((f) => ({ ...f, amountOff: e.target.value, percentOff: '' }))}
                    placeholder="50"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">משך (Stripe)</label>
                <select
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                >
                  <option value="once">פעם אחת</option>
                  <option value="forever">לתמיד</option>
                  <option value="repeating">חוזר</option>
                </select>
              </div>
              {form.duration === 'repeating' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">חודשים</label>
                  <input
                    type="number"
                    value={form.durationInMonths}
                    onChange={(e) => setForm((f) => ({ ...f, durationInMonths: e.target.value }))}
                    placeholder="3"
                    min="1"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-1">מקסימום שימושים</label>
                <input
                  type="number"
                  value={form.maxRedemptions}
                  onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                  placeholder="100"
                  min="1"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">תוקף עד (תאריך)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">מקור</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">שם קמפיין</label>
                <input
                  type="text"
                  value={form.campaignName}
                  onChange={(e) => setForm((f) => ({ ...f, campaignName: e.target.value }))}
                  placeholder="ניוזלטר פברואר 2026"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
              >
                ביטול
              </button>
              <button
                onClick={saveCoupon}
                disabled={saving || !form.code || (!form.percentOff && !form.amountOff)}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50"
              >
                {saving ? 'יוצר...' : 'צור קוד'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
