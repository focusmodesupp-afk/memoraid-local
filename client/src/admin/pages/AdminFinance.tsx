import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Plus, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type FinanceEntry = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  name: string;
  amount: number;
  currency: string;
  recurrence: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type Summary = {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  year: number;
  entriesByCategory: Record<string, { income: number; expense: number }>;
};

const CATEGORIES = [
  'מנויים',
  'cursor',
  'neon',
  'resend',
  'stripe',
  'hosting',
  'gemini',
  'twilio',
  'slack',
  'אחר',
];

export default function AdminFinance() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '',
    name: '',
    amount: '',
    recurrence: 'monthly',
    notes: '',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        apiFetch<FinanceEntry[]>('/admin/finance/entries'),
        apiFetch<Summary>('/admin/finance/summary').catch(() => null),
      ]);
      setEntries(entriesRes);
      setSummary(summaryRes);
    } catch {
      setEntries([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({
      type: 'expense',
      category: '',
      name: '',
      amount: '',
      recurrence: 'monthly',
      notes: '',
    });
    setShowForm(true);
  }

  function openEdit(entry: FinanceEntry) {
    setEditing(entry);
    setForm({
      type: entry.type,
      category: entry.category,
      name: entry.name,
      amount: String(entry.amount),
      recurrence: entry.recurrence,
      notes: entry.notes || '',
    });
    setShowForm(true);
  }

  async function save() {
    const amount = parseFloat(form.amount);
    if (!form.category || !form.name || isNaN(amount)) return;
    try {
      if (editing) {
        await apiFetch(`/admin/finance/entries/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            type: form.type,
            category: form.category,
            name: form.name,
            amount,
            recurrence: form.recurrence,
            notes: form.notes || undefined,
          }),
        });
      } else {
        await apiFetch('/admin/finance/entries', {
          method: 'POST',
          body: JSON.stringify({
            type: form.type,
            category: form.category,
            name: form.name,
            amount,
            currency: 'ILS',
            recurrence: form.recurrence,
            notes: form.notes || undefined,
          }),
        });
      }
      setShowForm(false);
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function remove(id: string) {
    if (!confirm('למחוק רשומה זו?')) return;
    try {
      await apiFetch(`/admin/finance/entries/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      console.error(e);
    }
  }

  const breakdown = summary?.entriesByCategory
    ? Object.entries(summary.entriesByCategory).flatMap(([cat, v]) => [
        ...(v.income > 0 ? [{ category: cat, amount: v.income, type: 'income' as const }] : []),
        ...(v.expense > 0 ? [{ category: cat, amount: -v.expense, type: 'expense' as const }] : []),
      ])
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">פיננסים</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הוסף הכנסה/הוצאה
        </button>
      </div>

      {loading ? (
        <p className="admin-muted">טוען...</p>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-slate-400 text-sm">הכנסות חודשיות</span>
              </div>
              <p className="text-3xl font-bold text-green-400">
                ₪{(summary?.totalIncome ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                <span className="text-slate-400 text-sm">הוצאות חודשיות</span>
              </div>
              <p className="text-3xl font-bold text-red-400">
                ₪{(summary?.totalExpense ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                <span className="text-slate-400 text-sm">רווח נקי</span>
              </div>
              <p
                className={`text-3xl font-bold ${
                  (summary?.netProfit ?? 0) >= 0 ? 'text-purple-400' : 'text-red-400'
                }`}
              >
                ₪{(summary?.netProfit ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span className="text-slate-400 text-sm">רישומים</span>
              </div>
              <p className="text-3xl font-bold text-blue-400">{entries.length}</p>
            </div>
          </div>

          {showForm && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                {editing ? 'עריכת רשומה' : 'הוספת הכנסה/הוצאה'}
              </h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm admin-muted mb-1">סוג</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}
                    className="admin-input w-full px-3 py-2 rounded-lg"
                  >
                    <option value="income">הכנסה</option>
                    <option value="expense">הוצאה</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm admin-muted mb-1">קטגוריה</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="admin-input w-full px-3 py-2 rounded-lg"
                  >
                    <option value="">בחר</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm admin-muted mb-1">שם/תיאור</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="למשל: Cursor Pro"
                    className="admin-input w-full px-3 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm admin-muted mb-1">סכום (₪)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="admin-input w-full px-3 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm admin-muted mb-1">חד פעמי/חודשי</label>
                  <select
                    value={form.recurrence}
                    onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                    className="admin-input w-full px-3 py-2 rounded-lg"
                  >
                    <option value="monthly">חודשי</option>
                    <option value="one_time">חד פעמי</option>
                    <option value="yearly">שנתי</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm admin-muted mb-1">הערות</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="אופציונלי"
                    className="admin-input w-full px-3 py-2 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={save}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                >
                  שמור
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-200">פירוט הכנסות והוצאות</h2>
            </div>
            {entries.length === 0 ? (
              <div className="p-8 text-center admin-muted">
                אין רשומות. הוסף מהכפתור למעלה או עדכן עלות Cursor באינטגרציות.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-right bg-slate-800/50">
                    <th className="px-6 py-3 font-medium text-slate-400">קטגוריה</th>
                    <th className="px-6 py-3 font-medium text-slate-400">שם</th>
                    <th className="px-6 py-3 font-medium text-slate-400">סוג</th>
                    <th className="px-6 py-3 font-medium text-slate-400">סכום</th>
                    <th className="px-6 py-3 font-medium text-slate-400">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((item) => (
                    <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-6 py-3 text-slate-200">{item.category}</td>
                      <td className="px-6 py-3 text-slate-200">{item.name}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            item.type === 'income' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                          }`}
                        >
                          {item.type === 'income' ? 'הכנסה' : 'הוצאה'}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-3 font-mono ${
                          item.type === 'income' ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '-'}₪{Math.abs(item.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                            title="עריכה"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => remove(item.id)}
                            className="p-1.5 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400"
                            title="מחיקה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
            <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• עדכן עלות Cursor באינטגרציות – כפתור "עדכן עלות"</li>
              <li>• הוסף מערכות נוספות (Neon, Resend, Hosting וכו') מכאן או מאינטגרציות</li>
              <li>• נתוני מנויים – יובאו מ-Stripe בעתיד</li>
              <li>• אינטגרציה עם מערכת הנהלת חשבונות (בעתיד)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
