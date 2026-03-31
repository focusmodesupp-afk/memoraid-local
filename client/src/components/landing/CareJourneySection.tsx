export function CareJourneySection() {
  const stages = [
    {
      emoji: '🧬',
      step: '01',
      titleHe: 'מודעות גנטית',
      titleEn: 'Genetic Awareness',
      descHe:
        'המטופל תקין, אך קיימת היסטוריה משפחתית של דמנציה או גורמי סיכון כמו סוכרת ומחלות לב. MEMORAID עוזרת לתעד ולהכין — כדי שהמידע לא יאבד בין הדורות.',
      descEn:
        'The patient is healthy, but family history of dementia or risk factors exist. MEMORAID helps document and prepare — so information is not lost between generations.',
      colorClass: 'text-blue-700',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      tagHe: 'היסטוריה משפחתית',
      tagEn: 'Family history',
    },
    {
      emoji: '🔍',
      step: '02',
      titleHe: 'שלב החשד',
      titleEn: 'Suspicion Stage',
      descHe:
        'בני המשפחה מתחילים להבחין בשינויים קטנים — חזרתיות, בלבול, שינוי התנהגות. טרם אבחנה רשמית. כאן מתחיל תיעוד היומן הקוגניטיבי שיהיה זהב עבור הרופא.',
      descEn:
        'Family members start noticing small changes — repetition, confusion, behavior changes. No official diagnosis yet. This is where the cognitive journal begins — gold for the doctor.',
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      tagHe: 'טרם אבחנה',
      tagEn: 'Pre-diagnosis',
    },
    {
      emoji: '🏥',
      step: '03',
      titleHe: 'גשר לקשר',
      titleEn: 'Bridge Stage',
      descHe:
        'מתחיל הבירור הנוירולוגי — בדיקות, תורים, ייפוי כוח, עורכי דין, פיננסים. MEMORAID מאחדת את כל המשימות הכאוטיות האלה ומחלקת אותן בחוכמה בין בני המשפחה.',
      descEn:
        'Neurological evaluation begins — tests, appointments, power of attorney, lawyers, finances. MEMORAID organizes all these chaotic tasks and distributes them smartly among family members.',
      colorClass: 'text-purple-700',
      bgClass: 'bg-purple-50',
      borderClass: 'border-purple-200',
      tagHe: 'בירור נוירולוגי',
      tagEn: 'Neurological evaluation',
    },
    {
      emoji: '📋',
      step: '04',
      titleHe: 'שלב הוודאות',
      titleEn: 'Certainty Stage',
      descHe:
        'יש אבחנה רשמית. המיקוד עובר לניהול שגרת חיים לצד המחלה — בטיחות, מיצוי זכויות, טיפול יומי, ומניעת שחיקה של המטפל. MEMORAID כאן לאורך כל הדרך.',
      descEn:
        'Official diagnosis received. Focus shifts to managing daily life alongside the disease — safety, rights, daily care, and caregiver burnout prevention. MEMORAID is here the whole way.',
      colorClass: 'text-red-700',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      tagHe: 'אבחנה רשמית',
      tagEn: 'Official diagnosis',
    },
  ];

  return (
    <section className="mt-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))]/8 px-4 py-1.5 text-xs text-[hsl(var(--primary))] font-medium">
          MEMORAID מלווה אתכם בכל שלב
        </div>
        <h2 className="text-xl font-bold md:text-2xl">
          ארבעה שלבים. מסע אחד. <span className="text-[hsl(var(--primary))]">תמיד לצידכם.</span>
        </h2>
        <p className="mx-auto max-w-xl text-sm text-[hsl(var(--muted-foreground))]">
          כל משפחה מתחילה את המסע בנקודה שונה. MEMORAID מזהה את השלב שלכם ומתאימה את עצמה — כלים, משימות, ומידע רלוונטי בדיוק למצב שלכם.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stages.map((s) => (
          <div
            key={s.step}
            className={`rounded-2xl border p-5 ${s.bgClass} ${s.borderClass} flex gap-4`}
          >
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-3xl">{s.emoji}</span>
              <span className={`text-[10px] font-bold ${s.colorClass} opacity-60`}>{s.step}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className={`text-sm font-bold ${s.colorClass}`}>{s.titleHe}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${s.borderClass} ${s.colorClass} bg-white/60`}>
                  {s.tagHe}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                {s.descHe}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 text-center">
        <p className="text-sm font-semibold text-[hsl(var(--primary))]">
          לא בטוחים באיזה שלב אתם?
        </p>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          בתחילת ההרשמה MEMORAID תשאל אתכם כמה שאלות קצרות ותזהה בעצמה את השלב המתאים לכם.
        </p>
      </div>
    </section>
  );
}
