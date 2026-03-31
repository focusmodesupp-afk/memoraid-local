import React, { useState, useEffect } from 'react';
import { Package, Plus, Pencil, RefreshCw, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type Plan = {
  id: string;
  slug: string;
  nameHe: string;
  descriptionHe: string | null;
  features: string[];
  displayOrder: number;
  isActive: boolean;
  stripeProductId: string | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  stripeProduct?: { id: string; name: string };
  stripePrices?: Array<{ id: string; unitAmount: number | null; currency: string; recurring?: { interval: string } }>;
  stripeError?: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    slug: '',
    nameHe: '',
    descriptionHe: '',
    features: '' as string,
    displayOrder: '0',
    stripeProductId: '',
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<Plan[]>('/admin/plans');
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({
      slug: '',
      nameHe: '',
      descriptionHe: '',
      features: '',
      displayOrder: '0',
      stripeProductId: '',
      stripePriceIdMonthly: '',
      stripePriceIdYearly: '',
    });
    setShowForm(true);
  }

  function openEdit(p: Plan) {
    setEditing(p);
    setForm({
      slug: p.slug,
      nameHe: p.nameHe,
      descriptionHe: p.descriptionHe || '',
      features: Array.isArray(p.features) ? p.features.join('\n') : '',
      displayOrder: String(p.displayOrder),
      stripeProductId: p.stripeProductId || '',
      stripePriceIdMonthly: p.stripePriceIdMonthly || '',
      stripePriceIdYearly: p.stripePriceIdYearly || '',
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.slug || !form.nameHe) return;
    const features = form.features
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      if (editing) {
        await apiFetch(`/admin/plans/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            nameHe: form.nameHe,
            descriptionHe: form.descriptionHe || null,
            features,
            displayOrder: Number(form.displayOrder) || 0,
            stripePriceIdMonthly: form.stripePriceIdMonthly || null,
            stripePriceIdYearly: form.stripePriceIdYearly || null,
          }),
        });
      } else {
        await apiFetch('/admin/plans', {
          method: 'POST',
          body: JSON.stringify({
            slug: form.slug,
            nameHe: form.nameHe,
            descriptionHe: form.descriptionHe || null,
            features,
            displayOrder: Number(form.displayOrder) || 0,
            stripeProductId: form.stripeProductId || null,
            stripePriceIdMonthly: form.stripePriceIdMonthly || null,
            stripePriceIdYearly: form.stripePriceIdYearly || null,
          }),
        });
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e?.message ?? 'שגיאה');
    }
  }

  function formatPrice(unitAmount: number | null, currency: string) {
    if (unitAmount == null) return '—';
    const c = currency?.toUpperCase() || 'ILS';
    if (c === 'ILS') return `₪${(unitAmount / 100).toFixed(0)}`;
    return `${(unitAmount / 100).toFixed(2)} ${c}`;
  }

  if (loading) return <div className="text-slate-400">טוען...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">ניהול מסלולים ותמחור</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          מסלול חדש
        </button>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-right text-slate-400">
              <th className="px-4 py-3 font-medium">שם</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">מחיר חודשי</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => {
              const monthlyPrice = p.stripePrices?.find((pr) => pr.recurring?.interval === 'month') ?? p.stripePrices?.[0];
              return (
                <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{p.nameHe}</div>
                    {p.descriptionHe && <div className="text-xs text-slate-500 line-clamp-1">{p.descriptionHe}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{p.slug}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {monthlyPrice ? formatPrice(monthlyPrice.unitAmount, monthlyPrice.currency) : p.stripeError ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                      {p.isActive ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    {p.stripeProductId && (
                      <a
                        href={`https://dashboard.stripe.com/products/${p.stripeProductId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                      >
                        Stripe
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-slate-200">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {plans.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">
            אין מסלולים. צור מסלול חדש או סנכרן מ-Stripe.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          רענן
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-4">{editing ? 'עריכת מסלול' : 'מסלול חדש'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Slug (מזהה אנגלי) *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="premium"
                  disabled={!!editing}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">שם בעברית *</label>
                <input
                  type="text"
                  value={form.nameHe}
                  onChange={(e) => setForm((f) => ({ ...f, nameHe: e.target.value }))}
                  placeholder="פרימיום"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">תיאור</label>
                <input
                  type="text"
                  value={form.descriptionHe}
                  onChange={(e) => setForm((f) => ({ ...f, descriptionHe: e.target.value }))}
                  placeholder="למשפחות עם צרכים מורחבים"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">תכונות (שורה לכל תכונה)</label>
                <textarea
                  value={form.features}
                  onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
                  rows={4}
                  placeholder="תכונה 1&#10;תכונה 2"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
              {!editing && (
                <>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Stripe Product ID</label>
                    <input
                      type="text"
                      value={form.stripeProductId}
                      onChange={(e) => setForm((f) => ({ ...f, stripeProductId: e.target.value }))}
                      placeholder="prod_xxx"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Stripe Price ID (חודשי)</label>
                    <input
                      type="text"
                      value={form.stripePriceIdMonthly}
                      onChange={(e) => setForm((f) => ({ ...f, stripePriceIdMonthly: e.target.value }))}
                      placeholder="price_xxx"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Stripe Price ID (שנתי)</label>
                    <input
                      type="text"
                      value={form.stripePriceIdYearly}
                      onChange={(e) => setForm((f) => ({ ...f, stripePriceIdYearly: e.target.value }))}
                      placeholder="price_xxx"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                    />
                  </div>
                </>
              )}
              {editing && (
                <>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Stripe Price ID (חודשי)</label>
                    <input
                      type="text"
                      value={form.stripePriceIdMonthly}
                      onChange={(e) => setForm((f) => ({ ...f, stripePriceIdMonthly: e.target.value }))}
                      placeholder="price_xxx"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Stripe Price ID (שנתי)</label>
                    <input
                      type="text"
                      value={form.stripePriceIdYearly}
                      onChange={(e) => setForm((f) => ({ ...f, stripePriceIdYearly: e.target.value }))}
                      placeholder="price_xxx"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-1">סדר תצוגה</label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
              >
                ביטול
              </button>
              <button
                onClick={save}
                disabled={!form.slug || !form.nameHe}
                className="px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
