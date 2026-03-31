import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import {
  BookOpen, Brain, Scale, DollarSign, Stethoscope, Shield,
  Heart, AlertTriangle, CheckSquare, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

type CareStage = 'genetic_awareness' | 'suspicion' | 'bridge' | 'certainty';

// ─── Resource data ────────────────────────────────────────────────────────────

type ResourceSection = {
  icon: React.ComponentType<{ className?: string }>;
  titleHe: string;
  titleEn: string;
  colorClass: string;
  bgClass: string;
  items: Array<{
    titleHe: string; titleEn: string;
    descHe: string; descEn: string;
    urgentHe?: string; urgentEn?: string;
    stages: CareStage[];
  }>;
};

const RESOURCES: ResourceSection[] = [
  {
    icon: Brain,
    titleHe: 'רפואי וקוגניטיבי',
    titleEn: 'Medical & Cognitive',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    items: [
      {
        titleHe: 'הערכה קוגניטיבית בסיסית (Baseline)',
        titleEn: 'Baseline Cognitive Assessment',
        descHe: 'ביצוע מבחן MMSE או MoCA בשלב בריאות מלאה יוצר נקודת ייחוס שתסייע להשוואה בעתיד.',
        descEn: 'Performing MMSE or MoCA while healthy creates a reference point for future comparison.',
        stages: ['genetic_awareness'],
      },
      {
        titleHe: 'שאלות לקחת לרופא משפחה',
        titleEn: 'Questions to take to the family doctor',
        descHe: '1. "יש לנו היסטוריה משפחתית של אלצהיימר — מה מומלץ לעשות מניעתית?" 2. "האם כדאי לבצע הערכה קוגניטיבית בסיסית?"',
        descEn: '1. "We have a family history of Alzheimer\'s — what preventive steps are recommended?" 2. "Should we do a baseline cognitive assessment?"',
        stages: ['genetic_awareness', 'suspicion'],
      },
      {
        titleHe: 'תיעוד שינויים לרופא',
        titleEn: 'Documenting changes for the doctor',
        descHe: 'רשמו: מתי, מה בדיוק, כמה פעמים, באיזה הקשר. "חזר על אותה שאלה 4 פעמים בתוך שעה" — זה נתון רפואי.',
        descEn: 'Record: when, what exactly, how many times, in what context. "Repeated the same question 4 times in an hour" — that\'s medical data.',
        stages: ['suspicion', 'bridge'],
      },
      {
        titleHe: 'שאלות לנוירולוג — הביקור הראשון',
        titleEn: 'Questions for the neurologist — first visit',
        descHe: '1. מהי האבחנה המדויקת? 2. אילו בדיקות נדרשות? 3. מה הפרוגנוזה? 4. אילו תרופות קיימות? 5. אילו שינויים מחכים לנו?',
        descEn: '1. What is the exact diagnosis? 2. What tests are needed? 3. What is the prognosis? 4. What medications exist? 5. What changes should we expect?',
        urgentHe: 'הכינו את השאלות הללו לפני הביקור',
        urgentEn: 'Prepare these questions before the visit',
        stages: ['bridge', 'certainty'],
      },
      {
        titleHe: 'ניהול תרופות וסימנים לשינוי',
        titleEn: 'Medication management and change signs',
        descHe: 'תעדו כל תרופה עם מינון ושעת מתן. שינוי בהתנהגות אחרי שינוי תרופה — לדווח מיד לרופא.',
        descEn: 'Document every medication with dosage and administration time. Behavioral change after medication change — report immediately.',
        stages: ['certainty'],
      },
    ],
  },
  {
    icon: Scale,
    titleHe: 'משפטי',
    titleEn: 'Legal',
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-50',
    items: [
      {
        titleHe: 'ייפוי כוח נוטריוני — עכשיו!',
        titleEn: 'Notarial Power of Attorney — Now!',
        descHe: 'ייפוי כוח מתמשך (ע"פ חוק 2017) חייב להיחתם בזמן שהמטופל עדיין כשיר. אחרי האבחנה — ייתכן שיהיה מאוחר.',
        descEn: 'Enduring Power of Attorney (2017 law) must be signed while the patient is still competent. After diagnosis — it may be too late.',
        urgentHe: 'זהו אחד הדברים הדחופים ביותר לעשות',
        urgentEn: 'This is one of the most urgent things to do',
        stages: ['genetic_awareness', 'suspicion', 'bridge'],
      },
      {
        titleHe: 'צוואה ומסמכי עיזבון',
        titleEn: 'Will and estate documents',
        descHe: 'כחלק מהכנת העתיד: עדכון צוואה, קביעת מוטבים, ארגון חשבונות וביטוחים.',
        descEn: 'As part of future preparation: update will, designate beneficiaries, organize accounts and insurance.',
        stages: ['genetic_awareness', 'suspicion'],
      },
      {
        titleHe: 'אפוטרופסות — אחרי האבחנה',
        titleEn: 'Guardianship — after diagnosis',
        descHe: 'אם לא נחתם ייפוי כוח, ניתן לפנות לבית משפט לענייני משפחה לבקשת אפוטרופסות. תהליך ארוך — כדאי להתחיל מוקדם.',
        descEn: 'If no power of attorney was signed, you can apply to family court for guardianship. Long process — start early.',
        stages: ['bridge', 'certainty'],
      },
    ],
  },
  {
    icon: DollarSign,
    titleHe: 'פיננסי וזכויות',
    titleEn: 'Financial & Rights',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    items: [
      {
        titleHe: 'סקירת ביטוחים',
        titleEn: 'Insurance review',
        descHe: 'בדקו: ביטוח חיים, ביטוח סיעודי, ביטוח בריאות משלים. לעיתים אפשר לשדרג לפני שהמחלה מאובחנת.',
        descEn: 'Check: life insurance, long-term care insurance, supplemental health. Often upgradeable before diagnosis.',
        stages: ['genetic_awareness', 'suspicion'],
      },
      {
        titleHe: 'קצבת סיעוד — ביטוח לאומי',
        titleEn: 'Nursing benefit — National Insurance',
        descHe: 'מגיע למטופלים הזקוקים לעזרה בפעולות יומיום. יש להגיש בקשה + וועדה רפואית. בדקו זכאות ב-Bituach.gov.il.',
        descEn: 'Entitled to patients needing help with daily activities. Apply + medical committee. Check eligibility at Bituach.gov.il.',
        stages: ['bridge', 'certainty'],
      },
      {
        titleHe: 'הטבות מס לנכה',
        titleEn: 'Tax benefits for disability',
        descHe: 'נקודות זיכוי במס הכנסה, פטור מארנונה, הנחות בתחבורה ציבורית. פנו לאגף שיקום בביטוח לאומי.',
        descEn: 'Income tax credits, property tax exemption, public transport discounts. Contact the National Insurance rehabilitation department.',
        stages: ['certainty'],
      },
      {
        titleHe: 'הכנה פיננסית ארוכת טווח',
        titleEn: 'Long-term financial preparation',
        descHe: 'העריכו עלויות טיפול עתידיות. בדקו חסכונות, נכסים, קצבת זקנה. ייעוץ פיננסי מומחה מקל על קבלת החלטות.',
        descEn: 'Estimate future care costs. Review savings, assets, pension. Expert financial advice eases decision-making.',
        stages: ['genetic_awareness'],
      },
    ],
  },
  {
    icon: Heart,
    titleHe: 'תמיכה ורגש',
    titleEn: 'Support & Emotional',
    colorClass: 'text-rose-700',
    bgClass: 'bg-rose-50',
    items: [
      {
        titleHe: 'שחיקת מטפל — סכנה ממשית',
        titleEn: 'Caregiver burnout — a real danger',
        descHe: 'שחיקת מטפל פוגעת גם במטפל וגם במטופל. זיהוי מוקדם: שינויי שינה, עצבנות, ירידה בסבלנות. פנו לעזרה לפני שהגעתם לקצה.',
        descEn: 'Caregiver burnout harms both caregiver and patient. Early signs: sleep changes, irritability, decreased patience. Seek help before reaching the edge.',
        stages: ['bridge', 'certainty'],
      },
      {
        titleHe: 'שיחה עם הורה על השינויים',
        titleEn: 'Talking to the parent about changes',
        descHe: 'מומלץ: שיחה פרטית, בזמן רגוע, "שמתי לב ש... ורציתי לשתף אותך". הימנעו מ"אתה תמיד שוכח".',
        descEn: 'Recommended: private conversation, calm moment, "I noticed that... and wanted to share with you." Avoid "you always forget."',
        stages: ['suspicion', 'bridge'],
      },
      {
        titleHe: 'קבוצות תמיכה למשפחות',
        titleEn: 'Support groups for families',
        descHe: 'עמותת עמדא (עמותת מתמודדים עם דמנציה ואלצהיימר) מפעילה קבוצות תמיכה פיזיות ווירטואליות. amda.org.il',
        descEn: 'The Alzheimer\'s Association Israel runs physical and virtual support groups. alzil.org',
        stages: ['suspicion', 'bridge', 'certainty'],
      },
      {
        titleHe: 'תכנון "הפסקות" לבני המשפחה',
        titleEn: 'Planning "breaks" for family members',
        descHe: 'תשלובת שכולה רגשית: מי נח מתי? מי "לוקח את המשמרת"? לתכנן מראש ולא לנסות להמשיך "עד שיפסיק".',
        descEn: 'Who rests when? Who "takes the shift"? Plan ahead rather than continuing "until it stops."',
        stages: ['certainty'],
      },
    ],
  },
  {
    icon: Shield,
    titleHe: 'בטיחות',
    titleEn: 'Safety',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    items: [
      {
        titleHe: 'הערכת בטיחות בבית',
        titleEn: 'Home safety assessment',
        descHe: 'בדקו: פסי אחיזה בשירותים ואמבטיה, סרגלי בטיחות במדרגות, תאורה נאותה, מניעת גישה לגז/כיריים, מנעולים ותרופות.',
        descEn: 'Check: grab bars in bathroom, stair safety rails, adequate lighting, prevent access to gas/stove, locks, and medications.',
        stages: ['bridge', 'certainty'],
      },
      {
        titleHe: 'שוטטות ואיבוד דרך',
        titleEn: 'Wandering and getting lost',
        descHe: 'שוטטות שכיחה בשלבים מתקדמים. מומלץ: צמיד זיהוי, GPS נייד, מנעול על הדלת, הרשמה לתוכנית "בטוח בדרכו" של משטרת ישראל.',
        descEn: 'Wandering is common in advanced stages. Recommended: ID bracelet, portable GPS, door lock, register with police wandering prevention program.',
        stages: ['certainty'],
      },
    ],
  },
];

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<CareStage, { labelHe: string; labelEn: string; colorClass: string; borderClass: string; bgClass: string }> = {
  genetic_awareness: { labelHe: 'מודעות גנטית', labelEn: 'Genetic Awareness', colorClass: 'text-blue-700', borderClass: 'border-blue-300', bgClass: 'bg-blue-50' },
  suspicion: { labelHe: 'שלב החשד', labelEn: 'Suspicion Stage', colorClass: 'text-amber-700', borderClass: 'border-amber-300', bgClass: 'bg-amber-50' },
  bridge: { labelHe: 'גשר לקשר', labelEn: 'Bridge to Connection', colorClass: 'text-purple-700', borderClass: 'border-purple-300', bgClass: 'bg-purple-50' },
  certainty: { labelHe: 'שלב הוודאות', labelEn: 'Certainty Stage', colorClass: 'text-red-700', borderClass: 'border-red-300', bgClass: 'bg-red-50' },
};

const ALL_STAGES: CareStage[] = ['genetic_awareness', 'suspicion', 'bridge', 'certainty'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FamilyGuidePage() {
  const { dir, lang } = useI18n();
  const [patientStage, setPatientStage] = useState<CareStage | null>(null);
  const [filterStage, setFilterStage] = useState<CareStage | 'all'>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ id: string; careStage?: string }>('/patients/primary')
      .then((p) => {
        if (p?.careStage) {
          const stage = p.careStage as CareStage;
          setPatientStage(stage);
          setFilterStage(stage);
        }
      })
      .catch(() => null);
  }, []);

  const activeFilter = filterStage === 'all' ? null : filterStage;

  const filteredResources = RESOURCES.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      !activeFilter || item.stages.includes(activeFilter)
    ),
  })).filter((s) => s.items.length > 0);

  return (
    <div dir={dir} className="space-y-6">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 shrink-0">
          <BookOpen className="h-5 w-5 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {lang === 'he' ? 'ספריית משאבים | לפי שלב' : 'Resource Library | By Stage'}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            {lang === 'he'
              ? 'מדריכים פרקטיים בתחומי רפואה, משפטי, פיננסי, בטיחות ורגש — מותאמים לשלב שלכם'
              : 'Practical guides in medical, legal, financial, safety and emotional areas — tailored to your stage'}
          </p>
        </div>
      </div>

      {/* Stage filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterStage('all')}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${filterStage === 'all' ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
        >
          {lang === 'he' ? 'הכל' : 'All topics'}
        </button>
        {ALL_STAGES.map((s) => {
          const cfg = STAGE_CONFIG[s];
          const isCurrent = s === patientStage;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStage(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${filterStage === s ? `${cfg.bgClass} ${cfg.borderClass} ${cfg.colorClass}` : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
            >
              {lang === 'he' ? cfg.labelHe : cfg.labelEn}
              {isCurrent && <span className="ms-1 text-[10px] opacity-60">{lang === 'he' ? '(השלב שלכם)' : '(your stage)'}</span>}
            </button>
          );
        })}
      </div>

      {/* Current stage highlight */}
      {patientStage && filterStage === patientStage && (
        <div className={`rounded-xl border p-3 ${STAGE_CONFIG[patientStage].bgClass} ${STAGE_CONFIG[patientStage].borderClass}`}>
          <p className={`text-xs font-medium ${STAGE_CONFIG[patientStage].colorClass}`}>
            <Brain className="w-3.5 h-3.5 inline me-1" />
            {lang === 'he'
              ? `מציג משאבים מותאמים לשלב שלכם: ${STAGE_CONFIG[patientStage].labelHe}`
              : `Showing resources tailored to your stage: ${STAGE_CONFIG[patientStage].labelEn}`}
          </p>
        </div>
      )}

      {/* Resource sections */}
      {filteredResources.map((section) => {
        const Icon = section.icon;
        const key = section.titleHe;
        const isExpanded = expandedSection === key || expandedSection === null;
        return (
          <section key={key} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSection(isExpanded && expandedSection === key ? null : key)}
              className="w-full flex items-center gap-3 p-4 hover:bg-[hsl(var(--muted))]/30 transition-colors text-start"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${section.bgClass}`}>
                <Icon className={`w-5 h-5 ${section.colorClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{lang === 'he' ? section.titleHe : section.titleEn}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{section.items.length} {lang === 'he' ? 'פריטים' : 'items'}</p>
              </div>
              {expandedSection === key
                ? <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                : <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
              }
            </button>

            {(expandedSection === key || expandedSection === null) && (
              <div className="border-t border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
                {section.items.map((item) => (
                  <div key={item.titleHe} className="p-4 space-y-2">
                    <div className={`flex items-start gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <h4 className="font-semibold text-sm flex-1">
                        {lang === 'he' ? item.titleHe : item.titleEn}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {item.stages.map((s) => {
                          const cfg = STAGE_CONFIG[s];
                          return (
                            <span key={s} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.bgClass} ${cfg.borderClass} ${cfg.colorClass}`}>
                              {lang === 'he' ? cfg.labelHe : cfg.labelEn}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                      {lang === 'he' ? item.descHe : item.descEn}
                    </p>
                    {(item.urgentHe || item.urgentEn) && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <p className="text-xs font-medium text-amber-700">
                          {lang === 'he' ? item.urgentHe : item.urgentEn}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {filteredResources.length === 0 && (
        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-10 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {lang === 'he' ? 'אין משאבים לסינון שנבחר' : 'No resources for the selected filter'}
          </p>
        </div>
      )}
    </div>
  );
}
