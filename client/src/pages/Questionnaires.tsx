import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { ClipboardList, ChevronLeft } from 'lucide-react';

type Question = { id: string; text: string; type: string };
type Questionnaire = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
};

export default function QuestionnairesPage() {
  const { dir, lang } = useI18n();
  const [list, setList] = useState<Questionnaire[]>([]);
  const [selected, setSelected] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Questionnaire[]>('/questionnaires')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(q: Questionnaire) {
    setSelected(q);
    setAnswers({});
    setMessage(null);
  }

  function handleAnswer(qId: string, value: string | number) {
    setAnswers((a) => ({ ...a, [qId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await apiFetch('/questionnaires/responses', {
        method: 'POST',
        body: JSON.stringify({
          questionnaireId: selected.id,
          answers,
        }),
      });
      setMessage(lang === 'he' ? 'התשובות נשמרו בהצלחה' : 'Responses saved successfully');
      setAnswers({});
      setTimeout(() => {
        setSelected(null);
      }, 1500);
    } catch (err) {
      setMessage((err as Error)?.message ?? 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div dir={dir} className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {lang === 'he' ? 'טוען שאלונים...' : 'Loading questionnaires...'}
        </p>
      </div>
    );
  }

  if (selected) {
    return (
      <div dir={dir} className="space-y-6 max-w-2xl">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="btn-ghost gap-2 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          {lang === 'he' ? 'חזרה לרשימה' : 'Back to list'}
        </button>
        <div className="section-card">
          <h2 className="page-title mb-1">{selected.title}</h2>
          {selected.description && (
            <p className="page-subtitle">{selected.description}</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {selected.questions.map((q, idx) => (
            <div key={q.id} className="section-card">
              <label className="label-base mb-3 block">
                <span className="text-[hsl(var(--muted-foreground))] font-normal ml-1">{idx + 1}.</span> {q.text}
              </label>
              {q.type === 'text' && (
                <textarea
                  value={String(answers[q.id] ?? '')}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  rows={2}
                  placeholder={lang === 'he' ? 'הזן תשובה...' : 'Enter your answer...'}
                />
              )}
              {q.type === 'number' && (
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value ? Number(e.target.value) : '')}
                  className="input-base w-24"
                />
              )}
              {q.type === 'scale' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleAnswer(q.id, n)}
                      className={`h-10 w-10 rounded-lg border text-sm font-bold transition-all ${
                        answers[q.id] === n
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-md scale-105'
                          : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] hover:scale-105'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
              message.includes('הצלחה') || message.includes('success')
                ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]'
                : 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]'
            }`}>
              {message}
            </div>
          )}
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting
              ? (lang === 'he' ? 'שומר...' : 'Saving...')
              : (lang === 'he' ? 'שלח תשובות' : 'Submit responses')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 shrink-0">
          <ClipboardList className="h-5 w-5 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h2 className="page-title">{lang === 'he' ? 'שאלונים וסקרים' : 'Questionnaires & Surveys'}</h2>
          <p className="page-subtitle">
            {lang === 'he'
              ? 'מילוי שאלונים קליניים ומדדים לקראת ביקור רופא'
              : 'Fill clinical questionnaires and metrics before doctor visits'}
          </p>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="section-card">
          <div className="empty-block">
            <ClipboardList className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
            <p>{lang === 'he' ? 'אין שאלונים זמינים כרגע' : 'No questionnaires available right now'}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handleSelect(q)}
              className="section-card text-right hover:shadow-md hover:border-[hsl(var(--primary))]/30 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 shrink-0 group-hover:bg-[hsl(var(--primary))]/20 transition-colors">
                  <ClipboardList className="h-4 w-4 text-[hsl(var(--primary))]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] mb-1">{q.title}</h3>
                  {q.description && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{q.description}</p>
                  )}
                  <p className="mt-2 text-xs font-semibold text-[hsl(var(--primary))]">
                    {lang === 'he' ? 'לחץ למילוי' : 'Click to fill'} →
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
