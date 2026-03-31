import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import { Droplets, Plus, Trash2, Coffee, GlassWater } from 'lucide-react';

type HydrationEntry = {
  id: string;
  amount: number;
  unit: string;
  drinkType: string;
  notes?: string | null;
  loggedAt: string;
};

const DAILY_GOAL = 1500;

const QUICK_AMOUNTS = [100, 150, 200, 250, 330, 500];

const DRINK_TYPES_HE = [
  { value: 'water', label: 'מים' },
  { value: 'juice', label: 'מיץ' },
  { value: 'tea', label: 'תה' },
  { value: 'coffee', label: 'קפה' },
  { value: 'milk', label: 'חלב' },
  { value: 'soup', label: 'מרק' },
  { value: 'other', label: 'אחר' },
];
const DRINK_TYPES_EN = [
  { value: 'water', label: 'Water' },
  { value: 'juice', label: 'Juice' },
  { value: 'tea', label: 'Tea' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'milk', label: 'Milk' },
  { value: 'soup', label: 'Soup' },
  { value: 'other', label: 'Other' },
];

function DrinkIcon({ type }: { type: string }) {
  if (type === 'coffee' || type === 'tea') return <Coffee className="w-4 h-4" />;
  return <GlassWater className="w-4 h-4" />;
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

export default function HydrationPage() {
  const { dir, lang } = useI18n();
  const [entries, setEntries] = useState<HydrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingAmount, setAddingAmount] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customType, setCustomType] = useState('water');
  const [customNotes, setCustomNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<HydrationEntry[]>('/hydration')
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const todayEntries = entries.filter((e) => isToday(e.loggedAt));
  const todayTotal = todayEntries.reduce((sum, e) => sum + e.amount, 0);
  const progress = Math.min((todayTotal / DAILY_GOAL) * 100, 100);

  async function addEntry(amount: number, drinkType = 'water', notes?: string) {
    setError(null);
    setAddingAmount(amount);
    try {
      const created = await apiFetch<HydrationEntry>('/hydration', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          unit: 'ml',
          drinkType,
          notes: notes?.trim() || null,
          loggedAt: new Date().toISOString(),
        }),
      });
      setEntries((prev) => [created, ...prev]);
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed');
    } finally {
      setAddingAmount(null);
    }
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`/hydration/${id}`, { method: 'DELETE' });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(customAmount);
    if (!amount || amount <= 0) return;
    await addEntry(amount, customType, customNotes);
    setCustomAmount('');
    setCustomNotes('');
    setShowCustom(false);
  }

  const drinkTypes = lang === 'he' ? DRINK_TYPES_HE : DRINK_TYPES_EN;

  return (
    <div dir={dir} className="space-y-6">
      <PageHeader
        title={lang === 'he' ? 'מעקב שתייה' : 'Hydration Tracker'}
        subtitle={lang === 'he' ? `יעד יומי: ${DAILY_GOAL} מ"ל` : `Daily goal: ${DAILY_GOAL} ml`}
      />

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      {/* Progress circle + stats */}
      <div className="section-card flex flex-col items-center gap-4">
        {/* Circular progress */}
        <div className="relative w-36 h-36">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Droplets className="w-5 h-5 text-[hsl(var(--primary))] mb-0.5" />
            <span className="text-xl font-bold text-[hsl(var(--foreground))]">
              {todayTotal < 1000 ? `${todayTotal}` : `${(todayTotal / 1000).toFixed(1)}L`}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {todayTotal < 1000 ? 'מ"ל' : ''}
            </span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {lang === 'he'
              ? `${todayTotal} מ"ל מתוך ${DAILY_GOAL} מ"ל (${Math.round(progress)}%)`
              : `${todayTotal} ml of ${DAILY_GOAL} ml (${Math.round(progress)}%)`}
          </p>
          {progress >= 100 && (
            <p className="text-sm font-semibold text-[hsl(var(--success))] mt-1">
              {lang === 'he' ? '🎉 הגעת ליעד היומי!' : '🎉 Daily goal reached!'}
            </p>
          )}
        </div>

        {/* Quick add buttons */}
        <div className="w-full">
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 text-center">
            {lang === 'he' ? 'הוסף במהירות' : 'Quick add (ml)'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_AMOUNTS.map((ml) => (
              <button
                key={ml}
                type="button"
                onClick={() => addEntry(ml)}
                disabled={addingAmount !== null}
                className="btn-outline text-sm px-3 py-1.5 h-auto disabled:opacity-50"
              >
                {addingAmount === ml ? '...' : `+${ml}`}
              </button>
            ))}
          </div>
        </div>

        {/* Manual add */}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="btn-ghost gap-1.5 text-sm"
        >
          <Plus className="w-4 h-4" />
          {lang === 'he' ? 'כמות מותאמת אישית' : 'Custom amount'}
        </button>

        {showCustom && (
          <form onSubmit={handleCustomSubmit} className="w-full border-t border-[hsl(var(--border))] pt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-base">{lang === 'he' ? 'כמות (מ"ל)' : 'Amount (ml)'}</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="input-base"
                  placeholder="200"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="label-base">{lang === 'he' ? 'סוג משקה' : 'Drink type'}</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="input-base"
                >
                  {drinkTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label-base">{lang === 'he' ? 'הערות' : 'Notes'}</label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="input-base"
                  placeholder={lang === 'he' ? 'אופציונלי' : 'Optional'}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addingAmount !== null} className="btn-primary disabled:opacity-50">
                {lang === 'he' ? 'הוסף' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowCustom(false)} className="btn-ghost">
                {lang === 'he' ? 'ביטול' : 'Cancel'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Today's log */}
      <div className="section-card">
        <h3 className="section-title mb-3">
          {lang === 'he' ? `רשימת שתיות היום (${todayEntries.length})` : `Today's log (${todayEntries.length})`}
        </h3>
        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
        ) : todayEntries.length === 0 ? (
          <div className="empty-block">
            <Droplets className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
            <p className="font-medium">{lang === 'he' ? 'טרם הוסיפו שתיות היום' : 'No entries yet today'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--border))]">
            {todayEntries.map((e) => {
              const typeLabel = drinkTypes.find((t) => t.value === e.drinkType)?.label ?? e.drinkType;
              return (
                <li key={e.id} className="py-3">
                  <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className="w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center shrink-0">
                      <DrinkIcon type={e.drinkType} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-[hsl(var(--foreground))]">{typeLabel}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {new Date(e.loggedAt).toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en', { hour: '2-digit', minute: '2-digit' })}
                        {e.notes && ` · ${e.notes}`}
                      </p>
                    </div>
                    <span className="text-base font-bold text-[hsl(var(--primary))] shrink-0 me-2">
                      +{e.amount} <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">מ"ל</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteEntry(e.id)}
                      disabled={deletingId === e.id}
                      aria-label={lang === 'he' ? 'מחק' : 'Delete'}
                      className="btn-ghost h-8 w-8 p-0 justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
