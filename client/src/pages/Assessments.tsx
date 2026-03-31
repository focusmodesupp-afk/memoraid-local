import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import { ClipboardList, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

type AssessmentType = 'adl' | 'iadl' | 'mmse' | 'gds' | 'falls_risk' | 'pain' | 'nutrition' | 'frailty';

type Assessment = {
  id: string;
  assessmentType: AssessmentType;
  score: number;
  maxScore: number | null;
  details: Record<string, unknown> | null;
  interpretation: string | null;
  assessedAt: string;
  nextAssessmentDue: string | null;
  createdAt: string;
};

type Patient = { id: string; fullName: string };

// ─── Assessment definitions ───────────────────────────────────────────────────

type AssessmentDef = {
  labelHe: string;
  labelEn: string;
  descHe: string;
  descEn: string;
  maxScore: number;
  frequencyHe: string;
  frequencyEn: string;
  questions: Array<{ id: string; labelHe: string; labelEn: string; maxPoints: number; options: Array<{ value: number; labelHe: string; labelEn: string }> }>;
  interpret: (score: number) => { labelHe: string; labelEn: string; badge: string };
};

const ASSESSMENTS: Record<AssessmentType, AssessmentDef> = {
  adl: {
    labelHe: 'ADL — פעילויות יום-יום', labelEn: 'ADL — Activities of Daily Living',
    descHe: 'סולם קאץ׳: הערכת עצמאות בפעילויות בסיסיות', descEn: 'Katz Scale: independence in basic daily activities',
    maxScore: 6, frequencyHe: 'כל 3 חודשים', frequencyEn: 'Every 3 months',
    questions: [
      { id: 'bathing', labelHe: 'רחצה', labelEn: 'Bathing', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'זקוק לעזרה', labelEn: 'Needs help' }] },
      { id: 'dressing', labelHe: 'לבישה', labelEn: 'Dressing', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'זקוק לעזרה', labelEn: 'Needs help' }] },
      { id: 'toileting', labelHe: 'שירותים', labelEn: 'Toileting', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'זקוק לעזרה', labelEn: 'Needs help' }] },
      { id: 'transferring', labelHe: 'העברה', labelEn: 'Transferring', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'זקוק לעזרה', labelEn: 'Needs help' }] },
      { id: 'continence', labelHe: 'שליטת סוגרים', labelEn: 'Continence', maxPoints: 1, options: [{ value: 1, labelHe: 'שולט', labelEn: 'Continent' }, { value: 0, labelHe: 'לא שולט', labelEn: 'Incontinent' }] },
      { id: 'feeding', labelHe: 'אכילה', labelEn: 'Feeding', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'זקוק לעזרה', labelEn: 'Needs help' }] },
    ],
    interpret: (s) => s >= 5 ? { labelHe: 'עצמאי', labelEn: 'Independent', badge: 'badge-success' } : s >= 3 ? { labelHe: 'תלות חלקית', labelEn: 'Partial dependency', badge: 'badge-warning' } : { labelHe: 'תלות גבוהה', labelEn: 'High dependency', badge: 'badge-destructive' },
  },
  iadl: {
    labelHe: 'IADL — פעילויות יום-יום מורכבות', labelEn: 'IADL — Instrumental ADL',
    descHe: 'סולם לאוטון: פעילויות מורכבות יותר', descEn: 'Lawton Scale: complex daily activities',
    maxScore: 8, frequencyHe: 'כל 3 חודשים', frequencyEn: 'Every 3 months',
    questions: [
      { id: 'phone', labelHe: 'שימוש בטלפון', labelEn: 'Telephone', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'לא מסוגל', labelEn: 'Unable' }] },
      { id: 'shopping', labelHe: 'קניות', labelEn: 'Shopping', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'לא מסוגל', labelEn: 'Unable' }] },
      { id: 'cooking', labelHe: 'בישול', labelEn: 'Food preparation', maxPoints: 1, options: [{ value: 1, labelHe: 'מכין ארוחות', labelEn: 'Prepares meals' }, { value: 0, labelHe: 'לא מסוגל', labelEn: 'Unable' }] },
      { id: 'housekeeping', labelHe: 'ניקיון הבית', labelEn: 'Housekeeping', maxPoints: 1, options: [{ value: 1, labelHe: 'שומר על סדר', labelEn: 'Maintains order' }, { value: 0, labelHe: 'לא מסוגל', labelEn: 'Unable' }] },
      { id: 'laundry', labelHe: 'כביסה', labelEn: 'Laundry', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'לא מסוגל', labelEn: 'Unable' }] },
      { id: 'transport', labelHe: 'תחבורה', labelEn: 'Transportation', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'לא מסוגל', labelEn: 'Unable' }] },
      { id: 'medications', labelHe: 'תרופות', labelEn: 'Medications', maxPoints: 1, options: [{ value: 1, labelHe: 'עצמאי', labelEn: 'Independent' }, { value: 0, labelHe: 'לא מסוגל', labelEn: 'Unable' }] },
      { id: 'finances', labelHe: 'כספים', labelEn: 'Finances', maxPoints: 1, options: [{ value: 1, labelHe: 'מנהל עצמאי', labelEn: 'Manages independently' }, { value: 0, labelHe: 'לא מסוגל', labelEn: 'Unable' }] },
    ],
    interpret: (s) => s >= 6 ? { labelHe: 'עצמאי', labelEn: 'Independent', badge: 'badge-success' } : s >= 3 ? { labelHe: 'עצמאות חלקית', labelEn: 'Partial independence', badge: 'badge-warning' } : { labelHe: 'תלות גבוהה', labelEn: 'High dependency', badge: 'badge-destructive' },
  },
  mmse: {
    labelHe: 'MMSE — בדיקת מצב קוגניטיבי', labelEn: 'MMSE — Mini Mental State',
    descHe: 'הערכת תפקוד קוגניטיבי, 0–30 נקודות', descEn: 'Cognitive function assessment, 0–30 points',
    maxScore: 30, frequencyHe: 'כל 6 חודשים', frequencyEn: 'Every 6 months',
    questions: [
      { id: 'total_score', labelHe: 'ניקוד סה"כ (0–30)', labelEn: 'Total score (0–30)', maxPoints: 30, options: [] },
    ],
    interpret: (s) => s >= 24 ? { labelHe: 'תקין', labelEn: 'Normal', badge: 'badge-success' } : s >= 18 ? { labelHe: 'פגיעה קלה', labelEn: 'Mild impairment', badge: 'badge-warning' } : { labelHe: 'פגיעה בינונית-קשה', labelEn: 'Moderate-severe', badge: 'badge-destructive' },
  },
  gds: {
    labelHe: 'GDS — סולם דיכאון גריאטרי', labelEn: 'GDS — Geriatric Depression Scale',
    descHe: 'סינון דיכאון קצר, 0–15 נקודות', descEn: 'Short depression screening, 0–15 points',
    maxScore: 15, frequencyHe: 'כל 6 חודשים', frequencyEn: 'Every 6 months',
    questions: [
      { id: 'total_score', labelHe: 'ניקוד סה"כ (0–15)', labelEn: 'Total score (0–15)', maxPoints: 15, options: [] },
    ],
    interpret: (s) => s <= 5 ? { labelHe: 'תקין', labelEn: 'Normal', badge: 'badge-success' } : s <= 10 ? { labelHe: 'דיכאון קל', labelEn: 'Mild depression', badge: 'badge-warning' } : { labelHe: 'דיכאון קשה', labelEn: 'Severe depression', badge: 'badge-destructive' },
  },
  falls_risk: {
    labelHe: 'סיכון נפילה — מורס', labelEn: 'Falls Risk — Morse Scale',
    descHe: 'הערכת סיכון נפילה, 0–125 (ציון גבוה = סיכון גבוה)', descEn: 'Fall risk assessment, 0–125 (higher = higher risk)',
    maxScore: 125, frequencyHe: 'כל חודשיים', frequencyEn: 'Every 2 months',
    questions: [
      { id: 'total_score', labelHe: 'ניקוד סה"כ (0–125)', labelEn: 'Total score (0–125)', maxPoints: 125, options: [] },
    ],
    interpret: (s) => s < 25 ? { labelHe: 'סיכון נמוך', labelEn: 'Low risk', badge: 'badge-success' } : s < 51 ? { labelHe: 'סיכון בינוני', labelEn: 'Medium risk', badge: 'badge-warning' } : { labelHe: 'סיכון גבוה', labelEn: 'High risk', badge: 'badge-destructive' },
  },
  pain: {
    labelHe: 'הערכת כאב', labelEn: 'Pain Assessment',
    descHe: 'סולם כאב ויזואלי, 0–10', descEn: 'Visual analogue pain scale, 0–10',
    maxScore: 10, frequencyHe: 'שבועי', frequencyEn: 'Weekly',
    questions: [
      { id: 'total_score', labelHe: 'רמת כאב (0–10)', labelEn: 'Pain level (0–10)', maxPoints: 10, options: [] },
    ],
    interpret: (s) => s <= 3 ? { labelHe: 'כאב קל', labelEn: 'Mild pain', badge: 'badge-success' } : s <= 6 ? { labelHe: 'כאב בינוני', labelEn: 'Moderate pain', badge: 'badge-warning' } : { labelHe: 'כאב קשה', labelEn: 'Severe pain', badge: 'badge-destructive' },
  },
  nutrition: {
    labelHe: 'MNA — הערכת תזונה', labelEn: 'MNA — Mini Nutritional Assessment',
    descHe: 'הערכת מצב תזונתי, 0–30 נקודות', descEn: 'Nutritional status assessment, 0–30 points',
    maxScore: 30, frequencyHe: 'כל 3 חודשים', frequencyEn: 'Every 3 months',
    questions: [
      { id: 'total_score', labelHe: 'ניקוד סה"כ (0–30)', labelEn: 'Total score (0–30)', maxPoints: 30, options: [] },
    ],
    interpret: (s) => s >= 24 ? { labelHe: 'מצב תזונתי תקין', labelEn: 'Normal', badge: 'badge-success' } : s >= 17 ? { labelHe: 'בסיכון תזונתי', labelEn: 'At nutritional risk', badge: 'badge-warning' } : { labelHe: 'תת-תזונה', labelEn: 'Malnourished', badge: 'badge-destructive' },
  },
  frailty: {
    labelHe: 'הערכת שבריריות', labelEn: 'Frailty Assessment',
    descHe: 'מדד שבריריות קליני (CFS), 1–9', descEn: 'Clinical Frailty Scale (CFS), 1–9',
    maxScore: 9, frequencyHe: 'כל 6 חודשים', frequencyEn: 'Every 6 months',
    questions: [
      { id: 'total_score', labelHe: 'ניקוד CFS (1–9)', labelEn: 'CFS score (1–9)', maxPoints: 9, options: [] },
    ],
    interpret: (s) => s <= 3 ? { labelHe: 'עצמאי / פגיע', labelEn: 'Independent / Vulnerable', badge: 'badge-success' } : s <= 6 ? { labelHe: 'שבריר קל-בינוני', labelEn: 'Mildly-moderately frail', badge: 'badge-warning' } : { labelHe: 'שבריר קשה', labelEn: 'Severely frail', badge: 'badge-destructive' },
  },
};

const ASSESSMENT_TYPES = Object.keys(ASSESSMENTS) as AssessmentType[];

export default function AssessmentsPage() {
  const { dir, lang } = useI18n();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<AssessmentType>('adl');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [interpretation, setInterpretation] = useState('');
  const [nextDue, setNextDue] = useState('');

  useEffect(() => {
    apiFetch<Patient>('/patients/primary')
      .then((p) => {
        setPatient(p);
        return apiFetch<Assessment[]>(`/patients/${p.id}/assessments`);
      })
      .then(setAssessments)
      .catch(() => setAssessments([]))
      .finally(() => setLoading(false));
  }, []);

  function getTotalScore() {
    const def = ASSESSMENTS[selectedType];
    if (def.questions.length === 1 && def.questions[0].id === 'total_score') {
      return answers['total_score'] ?? 0;
    }
    return def.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return;
    const def = ASSESSMENTS[selectedType];
    const score = getTotalScore();
    if (score == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<Assessment>(`/patients/${patient.id}/assessments`, {
        method: 'POST',
        body: JSON.stringify({
          assessmentType: selectedType,
          score,
          maxScore: def.maxScore,
          details: answers,
          interpretation: interpretation.trim() || null,
          nextAssessmentDue: nextDue || null,
        }),
      });
      setAssessments((prev) => [created, ...prev]);
      setAnswers({});
      setInterpretation('');
      setNextDue('');
      setShowForm(false);
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Latest per type
  const latestByType = assessments.reduce<Partial<Record<AssessmentType, Assessment>>>((acc, a) => {
    if (!acc[a.assessmentType]) acc[a.assessmentType] = a;
    return acc;
  }, {});

  const def = ASSESSMENTS[selectedType];
  const previewScore = getTotalScore();
  const previewInterp = def.interpret(previewScore);

  return (
    <div dir={dir} className="space-y-6">
      <PageHeader
        title={lang === 'he' ? 'הערכות תפקוד' : 'Functional Assessments'}
        subtitle={lang === 'he' ? 'הערכות גריאטריות סטנדרטיות — ADL, IADL, קוגניציה, כאב ועוד' : 'Standard geriatric assessments — ADL, IADL, cognition, pain and more'}
        actions={
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />
            {lang === 'he' ? 'הערכה חדשה' : 'New assessment'}
          </button>
        }
      />

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ASSESSMENT_TYPES.map((type) => {
          const d = ASSESSMENTS[type];
          const latest = latestByType[type];
          const interp = latest ? d.interpret(latest.score) : null;
          return (
            <button
              key={type}
              type="button"
              onClick={() => { setSelectedType(type); setShowForm(true); setAnswers({}); }}
              className={`rounded-xl border p-3 text-start transition-all hover:shadow-sm ${latest ? 'border-[hsl(var(--border))] bg-[hsl(var(--card))]' : 'border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20'}`}
            >
              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] leading-tight">
                {lang === 'he' ? d.labelHe.split(' — ')[0] : d.labelEn.split(' — ')[0]}
              </p>
              {latest ? (
                <>
                  <p className="text-xl font-bold mt-1">
                    {latest.score}
                    <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ms-1">/ {d.maxScore}</span>
                  </p>
                  <span className={`badge mt-1 ${interp!.badge} text-xs`}>
                    {lang === 'he' ? interp!.labelHe : interp!.labelEn}
                  </span>
                </>
              ) : (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">{lang === 'he' ? 'לא הוערך' : 'Not assessed'}</p>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      {/* Assessment form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="section-card space-y-4">
          <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <h3 className="section-title">{lang === 'he' ? 'הערכה חדשה' : 'New assessment'}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0 justify-center" aria-label={lang === 'he' ? 'סגור' : 'Close'}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Type selector */}
          <div>
            <label className="label-base">{lang === 'he' ? 'סוג הערכה' : 'Assessment type'}</label>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value as AssessmentType); setAnswers({}); }}
              className="input-base"
            >
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>{lang === 'he' ? ASSESSMENTS[t].labelHe : ASSESSMENTS[t].labelEn}</option>
              ))}
            </select>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {lang === 'he' ? def.descHe : def.descEn} · {lang === 'he' ? def.frequencyHe : def.frequencyEn}
            </p>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            {def.questions.map((q) => (
              <div key={q.id}>
                <label className="label-base">{lang === 'he' ? q.labelHe : q.labelEn}</label>
                {q.options.length > 0 ? (
                  <div className={`flex gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    {q.options.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${answers[q.id] === opt.value ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                      >
                        {lang === 'he' ? opt.labelHe : opt.labelEn}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={q.maxPoints}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: Number(e.target.value) }))}
                    className="input-base w-32"
                    placeholder="0"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Score preview */}
          {previewScore > 0 && (
            <div className={`rounded-xl border p-3 ${previewInterp.badge.includes('success') ? 'border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/8' : previewInterp.badge.includes('warning') ? 'border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/8' : 'border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8'}`}>
              <p className="text-sm font-semibold">
                {lang === 'he' ? 'ניקוד' : 'Score'}: {previewScore} / {def.maxScore} &nbsp;·&nbsp;
                <span>{lang === 'he' ? previewInterp.labelHe : previewInterp.labelEn}</span>
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-base">{lang === 'he' ? 'פרשנות קלינית' : 'Clinical interpretation'}</label>
              <input
                type="text"
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                className="input-base"
                placeholder={lang === 'he' ? 'אופציונלי' : 'Optional'}
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'הערכה הבאה (תאריך)' : 'Next assessment (date)'}</label>
              <input
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'שמור הערכה' : 'Save assessment')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              {lang === 'he' ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* History */}
      <div className="section-card">
        <h3 className="section-title mb-3">{lang === 'he' ? 'היסטוריית הערכות' : 'Assessment history'}</h3>
        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
        ) : assessments.length === 0 ? (
          <div className="empty-block">
            <ClipboardList className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
            <p className="font-medium">{lang === 'he' ? 'אין הערכות עדיין' : 'No assessments yet'}</p>
            <p className="text-xs">{lang === 'he' ? 'לחץ על "הערכה חדשה" כדי להתחיל' : 'Click "New assessment" to get started'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--border))]">
            {assessments.map((a) => {
              const d = ASSESSMENTS[a.assessmentType];
              const interp = d ? d.interpret(a.score) : null;
              return (
                <li key={a.id} className="py-3">
                  <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <span className="font-semibold text-sm">{d ? (lang === 'he' ? d.labelHe.split(' — ')[0] : d.labelEn.split(' — ')[0]) : a.assessmentType}</span>
                        {interp && <span className={`badge ${interp.badge}`}>{lang === 'he' ? interp.labelHe : interp.labelEn}</span>}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {new Date(a.assessedAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}
                        {a.interpretation && ` · ${a.interpretation}`}
                        {a.nextAssessmentDue && ` · ${lang === 'he' ? 'הבא' : 'Next'}: ${new Date(a.nextAssessmentDue).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}`}
                      </p>
                    </div>
                    <span className="text-xl font-bold shrink-0">
                      {a.score}
                      {a.maxScore != null && <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ms-0.5">/ {a.maxScore}</span>}
                    </span>
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
