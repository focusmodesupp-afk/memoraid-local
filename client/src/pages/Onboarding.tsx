import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { apiFetch } from '../lib/api';
import {
  Users,
  UserPlus,
  Pill,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Heart,
  Brain,
} from 'lucide-react';

type Step = 'family' | 'stage' | 'patient' | 'medication' | 'done';

const STEPS: Step[] = ['family', 'stage', 'patient', 'medication', 'done'];

const STEP_META = [
  { key: 'family', icon: Users, title: 'יצירת קבוצה משפחתית', subtitle: 'הגדירו שם לקבוצה - כל בני המשפחה ישתפו אותו' },
  { key: 'stage', icon: Brain, title: 'באיזה שלב אתם?', subtitle: 'MEMORAID מתאימה את עצמה למצב שלכם' },
  { key: 'patient', icon: UserPlus, title: 'פרטי המטופל', subtitle: 'הוסיפו את הורה/בן משפחה שזקוק לטיפול' },
  { key: 'medication', icon: Pill, title: 'תרופה ראשונה', subtitle: 'הוסיפו תרופה אחת כדי להתחיל (אפשר להוסיף עוד אחר-כך)' },
  { key: 'done', icon: CheckCircle2, title: 'הכל מוכן!', subtitle: 'ברוכים הבאים ל-MEMORAID' },
];

type CareStage = 'genetic_awareness' | 'suspicion' | 'bridge' | 'certainty';

const CARE_STAGE_OPTIONS: Array<{ id: CareStage; title: string; desc: string; emoji: string }> = [
  {
    id: 'genetic_awareness',
    title: 'מודעות גנטית',
    desc: 'יש היסטוריה משפחתית של דמנציה/אלצהיימר אך המטופל תקין כיום. רוצים להתכונן.',
    emoji: '🧬',
  },
  {
    id: 'suspicion',
    title: 'שלב החשד',
    desc: 'אנחנו שמים לב לשינויים — חזרתיות, בלבול, שכחה — אבל עדיין אין אבחנה רשמית.',
    emoji: '🔍',
  },
  {
    id: 'bridge',
    title: 'גשר לקשר',
    desc: 'אנחנו בתהליך בירור נוירולוגי — בדיקות, תורים, MRI. מחכים לתשובות.',
    emoji: '🏥',
  },
  {
    id: 'certainty',
    title: 'שלב הוודאות',
    desc: 'יש אבחנה רשמית. מנהלים חיים לצד המחלה ומחפשים כיצד לטפל בצורה הטובה ביותר.',
    emoji: '📋',
  },
];

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [familyName, setFamilyName] = useState('');
  const [careStage, setCareStage] = useState<CareStage>('suspicion');
  const [patientName, setPatientName] = useState('');
  const [patientBirthYear, setPatientBirthYear] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [skipMed, setSkipMed] = useState(false);

  const currentStep = STEPS[stepIdx];

  async function handleNext() {
    setError(null);
    setSubmitting(true);
    try {
      if (currentStep === 'family') {
        if (!familyName.trim()) { setError('אנא הזינו שם לקבוצה המשפחתית'); setSubmitting(false); return; }
        await apiFetch('/family', { method: 'POST', body: JSON.stringify({ familyName: familyName.trim() }) }).catch(() => null);
        setStepIdx((i) => i + 1);
      } else if (currentStep === 'stage') {
        // Stage is already selected; just advance
        setStepIdx((i) => i + 1);
      } else if (currentStep === 'patient') {
        if (!patientName.trim()) { setError('אנא הזינו שם מטופל'); setSubmitting(false); return; }
        const nameParts = patientName.trim().split(/\s+/);
        const created = await apiFetch<{ id: string }>('/patients', {
          method: 'POST',
          body: JSON.stringify({
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' ') || '',
            birthYear: patientBirthYear ? parseInt(patientBirthYear) : undefined,
          }),
        }).catch(() => null);
        if (created?.id) {
          setPatientId(created.id);
          // Save the selected care stage immediately
          await apiFetch(`/patients/${created.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ careStage }),
          }).catch(() => null);
        }
        setStepIdx((i) => i + 1);
      } else if (currentStep === 'medication') {
        if (!skipMed && medName.trim()) {
          const resolvedId = patientId ?? (await apiFetch<{ id: string }>('/patients/primary').catch(() => null))?.id ?? null;
          if (resolvedId) {
            await apiFetch(`/patients/${resolvedId}/medications`, {
              method: 'POST',
              body: JSON.stringify({
                name: medName.trim(),
                dosage: medDosage.trim() || null,
                frequency: medFrequency.trim() || null,
              }),
            }).catch(() => null);
          }
        }
        setStepIdx((i) => i + 1);
      } else if (currentStep === 'done') {
        navigate('/dashboard');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }

  const progressPct = Math.round((stepIdx / (STEPS.length - 1)) * 100);
  const meta = STEP_META[stepIdx];
  const Icon = meta.icon;

  return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))] px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <Heart className="w-6 h-6 text-[hsl(var(--primary))]" />
        <span className="text-xl font-bold text-[hsl(var(--primary))]">MEMORAID</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg overflow-hidden">

        {/* Progress bar */}
        <div className="h-1.5 bg-[hsl(var(--muted))]">
          <div
            className="h-full bg-[hsl(var(--primary))] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pt-5 pb-1">
          {STEPS.map((s, i) => {
            const SMeta = STEP_META[i];
            const SMIcon = SMeta.icon;
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    done
                      ? 'bg-[hsl(var(--success))] text-white'
                      : active
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <SMIcon className="w-4 h-4" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-0.5 ${i < stepIdx ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--muted))]'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
              currentStep === 'done' ? 'bg-[hsl(var(--success))]/15' : 'bg-[hsl(var(--primary))]/10'
            }`}>
              <Icon className={`w-7 h-7 ${currentStep === 'done' ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--primary))]'}`} />
            </div>
            <h1 className="text-xl font-bold text-[hsl(var(--foreground))] mb-1">{meta.title}</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{meta.subtitle}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 px-4 py-2.5 text-sm text-[hsl(var(--destructive))]">
              {error}
            </div>
          )}

          {/* Step: family */}
          {currentStep === 'family' && (
            <div className="space-y-4">
              <div>
                <label className="label-base" htmlFor="family-name">שם הקבוצה המשפחתית</label>
                <input
                  id="family-name"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="input-base"
                  placeholder='לדוגמה: משפחת כהן'
                  autoFocus
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                  השם יופיע לכל בני המשפחה שתזמינו
                </p>
              </div>
            </div>
          )}

          {/* Step: stage */}
          {currentStep === 'stage' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-[hsl(var(--primary))]/6 border border-[hsl(var(--primary))]/20 px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] text-center leading-relaxed">
                הבחירה שלכם כאן תקבע אילו כלים, משימות והמלצות יוצגו לכם.<br />
                <span className="font-medium text-[hsl(var(--foreground))]">אפשר לשנות בכל עת מפרופיל המטופל.</span>
              </div>
              {CARE_STAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCareStage(opt.id)}
                  className={`w-full rounded-xl border p-4 text-right transition-all ${careStage === opt.id ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--muted))]'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{opt.emoji}</span>
                    <div className="flex-1 min-w-0 text-start">
                      <p className={`font-semibold text-sm ${careStage === opt.id ? 'text-[hsl(var(--primary))]' : ''}`}>{opt.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 leading-relaxed">{opt.desc}</p>
                    </div>
                    <div className={`mt-1 w-4 h-4 rounded-full border-2 shrink-0 transition-all ${careStage === opt.id ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]' : 'border-[hsl(var(--border))]'}`} />
                  </div>
                </button>
              ))}
              <p className="text-xs text-[hsl(var(--muted-foreground))] text-center pt-1">
                ניתן לשנות בכל עת מתוך פרופיל המטופל
              </p>
            </div>
          )}

          {/* Step: patient */}
          {currentStep === 'patient' && (
            <div className="space-y-4">
              <div>
                <label className="label-base" htmlFor="patient-name">שם מלא של המטופל/ת</label>
                <input
                  id="patient-name"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="input-base"
                  placeholder='לדוגמה: רחל כהן'
                  autoFocus
                />
              </div>
              <div>
                <label className="label-base" htmlFor="birth-year">שנת לידה (אופציונלי)</label>
                <input
                  id="birth-year"
                  type="number"
                  value={patientBirthYear}
                  onChange={(e) => setPatientBirthYear(e.target.value)}
                  className="input-base"
                  placeholder='לדוגמה: 1940'
                  min={1900}
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
          )}

          {/* Step: medication */}
          {currentStep === 'medication' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipMed}
                  onChange={(e) => setSkipMed(e.target.checked)}
                  className="rounded border-[hsl(var(--border))]"
                />
                <span className="text-sm text-[hsl(var(--foreground))]">דלג על שלב זה לעת עתה</span>
              </label>

              {!skipMed && (
                <>
                  <div>
                    <label className="label-base" htmlFor="med-name">שם התרופה</label>
                    <input
                      id="med-name"
                      type="text"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      className="input-base"
                      placeholder='לדוגמה: אריצפט 10mg'
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-base" htmlFor="med-dosage">מינון</label>
                      <input
                        id="med-dosage"
                        type="text"
                        value={medDosage}
                        onChange={(e) => setMedDosage(e.target.value)}
                        className="input-base"
                        placeholder='10mg'
                      />
                    </div>
                    <div>
                      <label className="label-base" htmlFor="med-freq">תדירות</label>
                      <input
                        id="med-freq"
                        type="text"
                        value={medFrequency}
                        onChange={(e) => setMedFrequency(e.target.value)}
                        className="input-base"
                        placeholder='פעם ביום'
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step: done */}
          {currentStep === 'done' && (
            <div className="text-center space-y-3">
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                הכל מוכן! הקבוצה שלכם פעילה.
                <br />
                עכשיו תוכלו להזמין בני משפחה נוספים מדף <strong>ניהול משפחה</strong>.
              </p>
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                  קבוצה משפחתית נוצרה
                </div>
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                  פרופיל מטופל הוגדר
                </div>
                {!skipMed && medName.trim() && (
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                    תרופה ראשונה נוספה
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {stepIdx > 0 && currentStep !== 'done' ? (
            <button
              type="button"
              onClick={handleBack}
              className="btn-ghost flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              חזרה
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="btn-primary flex items-center gap-1.5 min-w-[120px] justify-center"
          >
            {submitting ? (
              'שומר...'
            ) : currentStep === 'done' ? (
              <>
                למערכת
                <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
              </>
            ) : (
              <>
                המשך
                <ChevronLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Skip entire onboarding */}
      {currentStep !== 'done' && (
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:underline"
        >
          דלג על ההגדרה הראשונית ← עבור ישירות לדשבורד
        </button>
      )}
    </div>
  );
}
