import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Plug, CheckCircle, XCircle, ExternalLink, DollarSign, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type Integration = {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  icon: string;
};

const INTEGRATIONS: Integration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'תשלומים ומנויים',
    status: 'connected',
    lastSync: '2026-02-20 10:30',
    icon: '💳',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'AI לשאלונים והצעות משימות',
    status: 'connected',
    lastSync: '2026-02-20 12:15',
    icon: '🤖',
  },
  {
    id: 'resend',
    name: 'Resend',
    description: 'שליחת מיילים טרנזקציוניים',
    status: 'connected',
    lastSync: '2026-02-20 11:00',
    icon: '📧',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS ותזכורות טלפוניות',
    status: 'disconnected',
    icon: '📱',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'סנכרון משימות ליומן',
    status: 'disconnected',
    icon: '📅',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'התראות לצוות תמיכה',
    status: 'error',
    lastSync: '2026-02-19 08:00',
    icon: '💬',
  },
];

type FinanceEntry = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  name: string;
  amount: number;
  currency: string;
  recurrence: string;
  notes?: string;
  updatedAt: string;
};

const SYSTEM_CATEGORIES = ['cursor', 'neon', 'resend', 'stripe', 'hosting', 'gemini', 'twilio', 'slack'];

export default function AdminIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [integrationStatus, setIntegrationStatus] = useState<{ googleCalendar?: boolean } | null>(null);
  const [expenses, setExpenses] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursorAmount, setCursorAmount] = useState('');
  const [updating, setUpdating] = useState(false);

  const integrationsWithStatus = integrations.map((i) => {
    if (i.id === 'google-calendar' && integrationStatus) {
      return {
        ...i,
        status: integrationStatus.googleCalendar ? ('connected' as const) : ('disconnected' as const),
      };
    }
    return i;
  });
  const connected = integrationsWithStatus.filter((i) => i.status === 'connected').length;
  const total = integrationsWithStatus.length;

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    apiFetch<{ googleCalendar?: boolean }>('/admin/integrations/status')
      .then(setIntegrationStatus)
      .catch(() => setIntegrationStatus(null));
  }, []);

  async function loadExpenses() {
    setLoading(true);
    try {
      const entries = await apiFetch<FinanceEntry[]>('/admin/finance/entries?type=expense');
      setExpenses(entries);
      const cursor = entries.find((e) => e.category.toLowerCase() === 'cursor');
      if (cursor) setCursorAmount(String(cursor.amount));
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateCursorCost() {
    const amount = parseFloat(cursorAmount);
    if (isNaN(amount) || amount < 0) return;
    setUpdating(true);
    try {
      const existing = expenses.find((e) => e.category.toLowerCase() === 'cursor');
      if (existing) {
        await apiFetch(`/admin/finance/entries/${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ amount }),
        });
      } else {
        await apiFetch('/admin/finance/entries', {
          method: 'POST',
          body: JSON.stringify({
            type: 'expense',
            category: 'cursor',
            name: 'Cursor – עלות פיתוח',
            amount,
            recurrence: 'monthly',
            notes: 'עלות Cursor AI – עדכון ידני',
          }),
        });
      }
      await loadExpenses();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  }

  const systemCosts = expenses.filter((e) =>
    SYSTEM_CATEGORIES.includes(e.category.toLowerCase())
  );
  const cursorEntry = systemCosts.find((e) => e.category.toLowerCase() === 'cursor');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">אינטגרציות</h1>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="flex items-center gap-3 mb-2">
          <Plug className="w-5 h-5 text-blue-400" />
          <span className="text-slate-400 text-sm">סטטוס אינטגרציות</span>
        </div>
        <p className="text-3xl font-bold text-slate-100">
          {connected} / {total}
        </p>
        <p className="text-sm text-slate-500 mt-1">אינטגרציות פעילות</p>
      </div>

      <div className="grid gap-4">
        {integrationsWithStatus.map((integration) => (
          <div key={integration.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="text-4xl">{integration.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-slate-100">{integration.name}</h2>
                    {integration.status === 'connected' && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    {integration.status === 'disconnected' && (
                      <XCircle className="w-5 h-5 text-slate-500" />
                    )}
                    {integration.status === 'error' && (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{integration.description}</p>
                  {integration.lastSync && (
                    <p className="text-xs text-slate-500">סנכרון אחרון: {integration.lastSync}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {integration.status === 'connected' && (
                  <button className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm">
                    הגדרות
                  </button>
                )}
                {integration.status === 'disconnected' && (
                  <button className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm">
                    חבר
                  </button>
                )}
                {integration.status === 'error' && (
                  <button className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm">
                    תקן
                  </button>
                )}
                <button className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* עלויות פיתוח ומערכות */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            עלויות פיתוח ומערכות
          </h2>
          <Link href="/admin/finance">
            <a className="text-sm text-blue-400 hover:text-blue-300">ניהול מלא בפיננסים →</a>
          </Link>
        </div>
        <p className="text-sm admin-muted mb-4">
          עדכן את עלות Cursor ומערכות אחרות. הנתונים נשמרים ומוצגים בדף פיננסים.
        </p>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-700">
            <div>
              <label className="block text-sm admin-muted mb-1">Cursor – עלות חודשית (₪)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={cursorEntry ? String(cursorEntry.amount) : 'הזן סכום'}
                value={cursorAmount}
                onChange={(e) => setCursorAmount(e.target.value)}
                className="admin-input w-32 px-3 py-2 rounded-lg"
              />
            </div>
            <button
              onClick={updateCursorCost}
              disabled={updating || !cursorAmount}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'מעדכן...' : 'עדכן עלות'}
            </button>
          </div>

          {loading ? (
            <p className="text-sm admin-muted">טוען...</p>
          ) : systemCosts.length > 0 ? (
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 text-right">
                    <th className="px-4 py-2 font-medium text-slate-400">מערכת</th>
                    <th className="px-4 py-2 font-medium text-slate-400">סכום</th>
                    <th className="px-4 py-2 font-medium text-slate-400">עדכון</th>
                  </tr>
                </thead>
                <tbody>
                  {systemCosts.map((e) => (
                    <tr key={e.id} className="border-t border-slate-700/50">
                      <td className="px-4 py-2 text-slate-200">{e.name}</td>
                      <td className="px-4 py-2 text-red-400 font-mono">₪{e.amount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs">
                        {new Date(e.updatedAt).toLocaleDateString('he-IL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm admin-muted">אין עדיין רשומות. לחץ "עדכן עלות" עבור Cursor או הוסף בדף פיננסים.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• כל אינטגרציה דורשת API keys/credentials בקובץ .env</li>
          <li>• Webhooks מוגדרים לעדכונים בזמן אמת (Stripe, Twilio)</li>
          <li>• ניתן להוסיף אינטגרציות נוספות דרך plugins</li>
          <li>• עלויות Cursor ומערכות – עדכון ידני. לניהול מלא: פיננסים</li>
        </ul>
      </div>
    </div>
  );
}
