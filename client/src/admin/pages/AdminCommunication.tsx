import React, { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Send, Users, Home, Globe } from 'lucide-react';

export default function AdminCommunication() {
  const [form, setForm] = useState({
    target: 'all',
    targetIds: '',
    title: '',
    body: '',
    type: 'system',
    priority: 'normal',
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; sent?: number } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const payload: any = {
        target: form.target,
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        priority: form.priority,
      };
      if (form.target !== 'all' && form.targetIds.trim()) {
        payload.targetIds = form.targetIds.split(',').map((s) => s.trim()).filter(Boolean);
      }
      const r = await apiFetch<{ ok: boolean; sent: number }>('/admin/communication/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(r);
      setForm((f) => ({ ...f, title: '', body: '' }));
    } catch (e) {
      console.error(e);
      setResult({ ok: false });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="admin-page-title">מרכז תקשורת</h1>

      <form onSubmit={handleSend} className="admin-card p-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">יעד שליחה</label>
          <div className="flex gap-3">
            {[
              { value: 'all', label: 'כל המשתמשים', icon: Globe },
              { value: 'users', label: 'משתמשים ספציפיים', icon: Users },
              { value: 'families', label: 'משפחות ספציפיות', icon: Home },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, target: value }))}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
                  form.target === value
                    ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                    : 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {form.target !== 'all' && (
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              {form.target === 'users' ? 'User IDs (מופרדים בפסיק)' : 'Family IDs (מופרדים בפסיק)'}
            </label>
            <input
              value={form.targetIds}
              onChange={(e) => setForm((f) => ({ ...f, targetIds: e.target.value }))}
              placeholder="uuid1, uuid2, uuid3..."
              className="admin-input px-4 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-300 mb-1">כותרת</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="כותרת ההודעה..."
            className="admin-input px-4 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">תוכן</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="תוכן ההודעה..."
            rows={5}
            className="admin-input px-4 py-2 text-sm resize-none"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">סוג</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="admin-input px-3 py-2 text-sm"
            >
              <option value="system">מערכת</option>
              <option value="task">משימה</option>
              <option value="reminder">תזכורת</option>
              <option value="announcement">הודעה</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">עדיפות</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="admin-input px-3 py-2 text-sm"
            >
              <option value="low">נמוכה</option>
              <option value="normal">רגילה</option>
              <option value="high">גבוהה</option>
              <option value="urgent">דחוף</option>
            </select>
          </div>
        </div>

        {result && (
          <div
            className={`rounded-lg p-4 ${
              result.ok ? 'bg-green-600/20 border border-green-600/50' : 'bg-red-600/20 border border-red-600/50'
            }`}
          >
            <p className={`text-sm font-medium ${result.ok ? 'text-green-300' : 'text-red-300'}`}>
              {result.ok ? `נשלח בהצלחה ל-${result.sent} משתמשים` : 'שליחה נכשלה'}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !form.title.trim() || !form.body.trim()}
          className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? 'שולח...' : 'שלח התראה'}
        </button>
      </form>

      <div className="admin-card p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">הנחיות שימוש</h2>
        <ul className="text-sm admin-muted space-y-2">
          <li>• <strong>כל המשתמשים</strong> – שולח לכל המשתמשים הפעילים במערכת</li>
          <li>• <strong>משתמשים ספציפיים</strong> – הזן User IDs מופרדים בפסיק</li>
          <li>• <strong>משפחות ספציפיות</strong> – הזן Family IDs, ההודעה תישלח לכל חברי המשפחות</li>
          <li>• ההתראות מופיעות בפעמון ובמרכז ההתראות של המשתמשים</li>
        </ul>
      </div>
    </div>
  );
}
