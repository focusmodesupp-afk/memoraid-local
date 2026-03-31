import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import {
  Brain, Plus, X, ChevronDown, ChevronUp, Filter,
  AlertTriangle, CheckCircle2, Clock, FileText, Printer,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Memory = {
  id: string;
  title: string;
  content: string | null;
  occurredAt: string | null;
  careStage: string | null;
  tags: string[] | null;
  severity: number | null;
  isReportedToDoctor: boolean;
  createdAt: string;
};

type CareStage = 'genetic_awareness' | 'suspicion' | 'bridge' | 'certainty';

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<CareStage, { labelHe: string; labelEn: string; colorClass: string; borderClass: string; bgClass: string; descHe: string; descEn: string }> = {
  genetic_awareness: {
    labelHe: 'מודעות גנטית',
    labelEn: 'Genetic Awareness',
    colorClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-300 dark:border-blue-700',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    descHe: 'היסטוריה משפחתית, גורמי סיכון — המטופל עדיין תקין',
    descEn: 'Family history, risk factors — patient currently healthy',
  },
  suspicion: {
    labelHe: 'שלב החשד',
    labelEn: 'Suspicion Stage',
    colorClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-700',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    descHe: 'שינויים מורגשים, טרם אבחנה רשמית',
    descEn: 'Noticeable changes, no official diagnosis yet',
  },
  bridge: {
    labelHe: 'גשר לקשר',
    labelEn: 'Bridge to Connection',
    colorClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-300 dark:border-purple-700',
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    descHe: 'בירור נוירולוגי, בדיקות, החלטות קריטיות',
    descEn: 'Neurological evaluation, tests, critical decisions',
  },
  certainty: {
    labelHe: 'שלב הוודאות',
    labelEn: 'Certainty Stage',
    colorClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-300 dark:border-red-700',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    descHe: 'אבחנה רשמית — ניהול חיים עם המחלה',
    descEn: 'Official diagnosis — managing life with the disease',
  },
};

const ALL_STAGES: CareStage[] = ['genetic_awareness', 'suspicion', 'bridge', 'certainty'];

// ─── Observation categories ───────────────────────────────────────────────────

const OBS_CATEGORIES = [
  { id: 'repetitiveness', he: 'חזרתיות', en: 'Repetitiveness' },
  { id: 'confusion', he: 'בלבול', en: 'Confusion' },
  { id: 'name_forgetting', he: 'שכחת שמות', en: 'Forgetting names' },
  { id: 'disorientation', he: 'איבוד דרך', en: 'Disorientation' },
  { id: 'personality_change', he: 'שינוי אישיות', en: 'Personality change' },
  { id: 'decision_difficulty', he: 'קושי בהחלטות', en: 'Decision difficulty' },
  { id: 'language_issues', he: 'בעיות שפה', en: 'Language issues' },
  { id: 'hallucinations', he: 'הזיות', en: 'Hallucinations' },
  { id: 'mood_changes', he: 'שינוי במצב רוח', en: 'Mood changes' },
  { id: 'daily_tasks', he: 'קושי במטלות יום-יום', en: 'Daily task difficulty' },
];

// ─── Severity labels ──────────────────────────────────────────────────────────

const SEVERITY_LABELS: Record<number, { he: string; en: string; colorClass: string }> = {
  1: { he: 'שינוי קל', en: 'Mild change', colorClass: 'text-emerald-600' },
  2: { he: 'שינוי מורגש', en: 'Noticeable change', colorClass: 'text-yellow-600' },
  3: { he: 'שינוי משמעותי', en: 'Significant change', colorClass: 'text-amber-600' },
  4: { he: 'שינוי חמור', en: 'Severe change', colorClass: 'text-orange-600' },
  5: { he: 'שינוי קיצוני', en: 'Extreme change', colorClass: 'text-red-600' },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null, lang: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en', { dateStyle: 'medium' });
}

function groupByYear(list: Memory[]): Map<number, Memory[]> {
  const map = new Map<number, Memory[]>();
  for (const m of list) {
    const year = new Date(m.occurredAt ?? m.createdAt).getFullYear();
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(m);
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemoriesPage() {
  const { dir, lang } = useI18n();

  const [list, setList] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<CareStage | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [fTitle, setFTitle] = useState('');
  const [fContent, setFContent] = useState('');
  const [fOccurredAt, setFOccurredAt] = useState('');
  const [fStage, setFStage] = useState<CareStage>('suspicion');
  const [fTags, setFTags] = useState<string[]>([]);
  const [fSeverity, setFSeverity] = useState<number>(2);
  const [fReported, setFReported] = useState(false);

  useEffect(() => {
    apiFetch<Memory[]>('/memory-stories')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setFTitle(''); setFContent(''); setFOccurredAt('');
    setFStage('suspicion'); setFTags([]); setFSeverity(2); setFReported(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fTitle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<Memory>('/memory-stories', {
        method: 'POST',
        body: JSON.stringify({
          title: fTitle.trim(),
          content: fContent.trim() || null,
          occurredAt: fOccurredAt || null,
          careStage: fStage,
          tags: fTags.length > 0 ? fTags : null,
          severity: fSeverity,
          isReportedToDoctor: fReported,
        }),
      });
      setList((prev) => [created, ...prev]);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError((err as Error)?.message ?? (lang === 'he' ? 'שגיאה בשמירה — נסה שוב' : 'Save failed — try again'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleReported(m: Memory) {
    try {
      const updated = await apiFetch<Memory>(`/memory-stories/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isReportedToDoctor: !m.isReportedToDoctor }),
      });
      setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (_) {}
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/memory-stories/${id}`, { method: 'DELETE' });
      setList((prev) => prev.filter((m) => m.id !== id));
    } catch (_) {}
  }

  const filtered = filterStage === 'all' ? list : list.filter((m) => m.careStage === filterStage);
  const sorted = [...filtered].sort((a, b) =>
    new Date(a.occurredAt ?? a.createdAt).getTime() - new Date(b.occurredAt ?? b.createdAt).getTime()
  );
  const grouped = groupByYear(sorted);
  const unreportedCount = list.filter((m) => !m.isReportedToDoctor).length;

  if (loading) {
    return (
      <div dir={dir} className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {lang === 'he' ? 'טוען יומן תצפיות...' : 'Loading observations journal...'}
        </p>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-[hsl(var(--primary))]" />
            {lang === 'he' ? 'יומן תצפיות | מעקב ירידה קוגניטיבית' : 'Observations Journal | Cognitive Tracking'}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            {lang === 'he'
              ? 'תעדו שינויים קוגניטיביים לאורך זמן — הנתונים ישמשו את הרופא'
              : 'Document cognitive changes over time — data serves the doctor'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unreportedCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-3 h-3" />
              {unreportedCount} {lang === 'he' ? 'לא דווחו לרופא' : 'unreported'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
            aria-label={lang === 'he' ? 'סנן' : 'Filter'}
          >
            <Filter className="w-4 h-4" />
            {lang === 'he' ? 'סנן' : 'Filter'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
            aria-label={lang === 'he' ? 'הדפס לרופא' : 'Print for doctor'}
          >
            <Printer className="w-4 h-4" />
            {lang === 'he' ? 'הדפס לרופא' : 'Print for doctor'}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(true); resetForm(); }}
            className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            {lang === 'he' ? 'תצפית חדשה' : 'New observation'}
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      {showFilters && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-3">
            {lang === 'he' ? 'סנן לפי שלב' : 'Filter by stage'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterStage('all')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterStage === 'all' ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
            >
              {lang === 'he' ? 'הכל' : 'All'} ({list.length})
            </button>
            {ALL_STAGES.map((s) => {
              const cfg = STAGE_CONFIG[s];
              const count = list.filter((m) => m.careStage === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStage(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterStage === s ? `${cfg.bgClass} ${cfg.borderClass} ${cfg.colorClass}` : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                >
                  {lang === 'he' ? cfg.labelHe : cfg.labelEn} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── New observation form ── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-[hsl(var(--primary))]" />
              {lang === 'he' ? 'תצפית קוגניטיבית חדשה' : 'New cognitive observation'}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              aria-label={lang === 'he' ? 'סגור' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {lang === 'he' ? 'שלב בתהליך' : 'Stage in journey'} *
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ALL_STAGES.map((s) => {
                const cfg = STAGE_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFStage(s)}
                    className={`rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${fStage === s ? `${cfg.bgClass} ${cfg.borderClass} ${cfg.colorClass}` : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                  >
                    <div className="font-semibold">{lang === 'he' ? cfg.labelHe : cfg.labelEn}</div>
                    <div className={`mt-0.5 font-normal ${fStage === s ? 'opacity-80' : 'text-[hsl(var(--muted-foreground))]'}`}>
                      {lang === 'he' ? cfg.descHe : cfg.descEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title + Date */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="obs-title" className="block text-sm font-medium mb-1">
                {lang === 'he' ? 'כותרת קצרה' : 'Brief title'} *
              </label>
              <input
                id="obs-title"
                type="text"
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                placeholder={lang === 'he' ? 'למשל: שכח שם הנכד' : 'e.g. Forgot grandchild\'s name'}
                required
              />
            </div>
            <div>
              <label htmlFor="obs-date" className="block text-sm font-medium mb-1">
                {lang === 'he' ? 'מתי קרה זה?' : 'When did this happen?'}
              </label>
              <input
                id="obs-date"
                type="date"
                value={fOccurredAt}
                onChange={(e) => setFOccurredAt(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Observation categories */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {lang === 'he' ? 'סוג התצפית' : 'Observation type'}
              <span className="text-[hsl(var(--muted-foreground))] font-normal ms-1">
                ({lang === 'he' ? 'אפשר לבחור כמה' : 'multiple ok'})
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {OBS_CATEGORIES.map((cat) => {
                const selected = fTags.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFTags((prev) => selected ? prev.filter((t) => t !== cat.id) : [...prev, cat.id])}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${selected ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                  >
                    {lang === 'he' ? cat.he : cat.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {lang === 'he' ? 'עוצמת השינוי' : 'Change severity'}
              {' '}
              <span className={`font-normal ${SEVERITY_LABELS[fSeverity].colorClass}`}>
                — {lang === 'he' ? SEVERITY_LABELS[fSeverity].he : SEVERITY_LABELS[fSeverity].en}
              </span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'קל' : 'Mild'}</span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={fSeverity}
                onChange={(e) => setFSeverity(Number(e.target.value))}
                className="flex-1 accent-[hsl(var(--primary))]"
              />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'קיצוני' : 'Extreme'}</span>
            </div>
            <div className="flex justify-between mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`text-xs ${n === fSeverity ? SEVERITY_LABELS[n].colorClass + ' font-semibold' : 'text-[hsl(var(--muted-foreground))]'}`}>{n}</span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="obs-content" className="block text-sm font-medium mb-1">
              {lang === 'he' ? 'תיאור מפורט' : 'Detailed description'}
            </label>
            <textarea
              id="obs-content"
              value={fContent}
              onChange={(e) => setFContent(e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
              rows={4}
              placeholder={lang === 'he' ? 'מה בדיוק קרה? באיזה הקשר? מה הייתה התגובה?' : 'What exactly happened? In what context? What was the reaction?'}
            />
          </div>

          {/* Reported to doctor */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={fReported}
              onChange={(e) => setFReported(e.target.checked)}
              className="w-4 h-4 accent-[hsl(var(--primary))]"
            />
            <span className="text-sm">{lang === 'he' ? 'כבר דווח לרופא' : 'Already reported to doctor'}</span>
          </label>

          {error && (
            <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || !fTitle.trim()}
              className="rounded-lg bg-[hsl(var(--primary))] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'שמור תצפית' : 'Save observation')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm hover:bg-[hsl(var(--muted))]"
            >
              {lang === 'he' ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* ── Timeline ── */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-10 text-center space-y-3">
          <Brain className="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))] opacity-40" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {filterStage === 'all'
              ? (lang === 'he' ? 'אין עדיין תצפיות. כל תצפית שתתעדו תשמש בעתיד כנתון רפואי חשוב.' : 'No observations yet. Every observation you document will serve as important medical data.')
              : (lang === 'he' ? `אין תצפיות בשלב "${STAGE_CONFIG[filterStage].labelHe}"` : `No observations in "${STAGE_CONFIG[filterStage].labelEn}" stage`)}
          </p>
          {filterStage === 'all' && (
            <button
              type="button"
              onClick={() => { setShowForm(true); resetForm(); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              {lang === 'he' ? 'הוסף תצפית ראשונה' : 'Add first observation'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([year, entries]) => (
            <div key={year}>
              {/* Year separator */}
              <div className={`flex items-center gap-3 mb-4 ${dir === 'rtl' ? '' : ''}`}>
                <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] px-2">{year}</span>
                <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              </div>

              <div className="space-y-3">
                {entries.map((m) => {
                  const stage = (m.careStage as CareStage | null) ?? null;
                  const cfg = stage ? STAGE_CONFIG[stage] : null;
                  const sev = m.severity;
                  const sevLabel = sev && SEVERITY_LABELS[sev] ? SEVERITY_LABELS[sev] : null;
                  const isExpanded = expandedId === m.id;

                  return (
                    <article
                      key={m.id}
                      className={`rounded-xl border bg-[hsl(var(--card))] overflow-hidden transition-all ${cfg ? cfg.borderClass : 'border-[hsl(var(--border))]'}`}
                    >
                      <div
                        className="flex items-start gap-3 p-4 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedId(isExpanded ? null : m.id); }}
                        aria-expanded={isExpanded}
                      >
                        {/* Severity dot */}
                        <div className={`mt-1 w-3 h-3 shrink-0 rounded-full ${sev ? (sev >= 4 ? 'bg-red-500' : sev === 3 ? 'bg-amber-500' : sev === 2 ? 'bg-yellow-400' : 'bg-emerald-400') : 'bg-[hsl(var(--muted-foreground))]'}`} />

                        <div className="flex-1 min-w-0">
                          <div className={`flex flex-wrap items-center gap-2 mb-1 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                            {cfg && (
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.bgClass} ${cfg.borderClass} ${cfg.colorClass}`}>
                                {lang === 'he' ? cfg.labelHe : cfg.labelEn}
                              </span>
                            )}
                            {sevLabel && (
                              <span className={`text-xs font-medium ${sevLabel.colorClass}`}>
                                {lang === 'he' ? sevLabel.he : sevLabel.en}
                              </span>
                            )}
                            {m.isReportedToDoctor && (
                              <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" />
                                {lang === 'he' ? 'דווח לרופא' : 'Reported'}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm leading-snug">{m.title}</h3>
                          {m.tags && m.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {m.tags.map((tag) => {
                                const cat = OBS_CATEGORIES.find((c) => c.id === tag);
                                return cat ? (
                                  <span key={tag} className="rounded-full border border-[hsl(var(--border))] px-2 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                                    {lang === 'he' ? cat.he : cat.en}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                          <div className={`flex items-center gap-2 mt-1.5 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                            <Clock className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              {formatDate(m.occurredAt ?? m.createdAt, lang)}
                            </span>
                          </div>
                        </div>

                        {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))]" />}
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className={`border-t border-[hsl(var(--border))] px-4 pb-4 pt-3 space-y-3 ${cfg ? cfg.bgClass : ''}`}>
                          {m.content && (
                            <div>
                              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                                {lang === 'he' ? 'תיאור מפורט' : 'Description'}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                            </div>
                          )}
                          <div className={`flex flex-wrap items-center gap-2 pt-1 ${dir === 'rtl' ? 'justify-end' : ''}`}>
                            <button
                              type="button"
                              onClick={() => toggleReported(m)}
                              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${m.isReportedToDoctor ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                            >
                              {m.isReportedToDoctor
                                ? <><CheckCircle2 className="w-3.5 h-3.5" />{lang === 'he' ? 'דווח לרופא' : 'Reported to doctor'}</>
                                : <><AlertTriangle className="w-3.5 h-3.5" />{lang === 'he' ? 'סמן כדווח לרופא' : 'Mark as reported'}</>
                              }
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id)}
                              className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--destructive))]/30 px-3 py-1.5 text-xs font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              {lang === 'he' ? 'מחק' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary strip ── */}
      {list.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.3] p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="font-medium">{list.length}</span>
              <span className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'תצפיות סה"כ' : 'total observations'}</span>
            </div>
            {unreportedCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">{unreportedCount}</span>
                <span>{lang === 'he' ? 'ממתינות לדיווח לרופא' : 'awaiting doctor report'}</span>
              </div>
            )}
            {ALL_STAGES.map((s) => {
              const count = list.filter((m) => m.careStage === s).length;
              if (!count) return null;
              const cfg = STAGE_CONFIG[s];
              return (
                <div key={s} className={`flex items-center gap-1 text-xs ${cfg.colorClass}`}>
                  <span className="font-semibold">{count}</span>
                  <span>{lang === 'he' ? cfg.labelHe : cfg.labelEn}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
