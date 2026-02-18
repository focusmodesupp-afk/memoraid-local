import { ArrowLeft, Check, X } from 'lucide-react';

type ComparisonItem = {
  before: string;
  after: string;
};

const ITEMS: ComparisonItem[] = [
  {
    before: 'קבוצות WhatsApp מבלבלות עם מאות הודעות',
    after: 'כל המידע במקום אחד, מסודר וברור',
  },
  {
    before: '"מישהו נתן לה את התרופה?" - אי ודאות',
    after: 'תיעוד מיידי + התראות אוטומטיות',
  },
  {
    before: 'שיחות טלפון ארוכות לתיאום',
    after: 'כולם רואים את אותו המידע בזמן אמת',
  },
  {
    before: 'מחברות וניירות הולכים לאיבוד',
    after: 'היסטוריה מלאה בלחיצת כפתור',
  },
  {
    before: 'שכחת תרופה = לחץ ודאגה',
    after: 'תזכורות ב‑WhatsApp עד שמאשרים',
  },
  {
    before: 'הרופא שואל ואין תשובות',
    after: 'דוחות מפורטים להציג לרופא',
  },
];

export function BeforeAfterSection() {
  return (
    <section className="mt-16 space-y-8" id="before-after">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">ההבדל ברור</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          ככה נראה הטיפול לפני ואחרי MEMORAID
        </p>
      </div>

      {/* כותרות לפני / אחרי */}
      <div className="flex items-center justify-center gap-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--destructive))/0.08] px-4 py-1.5 text-xs font-medium text-[hsl(var(--destructive))]">
          <X className="h-3 w-3" />
          <span>לפני MEMORAID</span>
        </div>

        <div className="hidden items-center justify-center rounded-full bg-[hsl(var(--primary))/0.12] p-2 text-[hsl(var(--primary))] lg:flex">
          <ArrowLeft className="h-4 w-4" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.12] px-4 py-1.5 text-xs font-medium text-[hsl(var(--primary))]">
          <Check className="h-3 w-3" />
          <span>עם MEMORAID</span>
        </div>
      </div>

      {/* גריד ההשוואות */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {ITEMS.map((item, index) => (
          <article
            key={index}
            className="group flex flex-col gap-3 rounded-2xl bg-[hsl(var(--card))] p-4 shadow-sm ring-1 ring-[hsl(var(--border))] transition hover:-translate-y-0.5 hover:shadow-md"
            data-testid={`card-comparison-${index}`}
          >
            <div className="flex flex-col gap-2 rounded-xl bg-[hsl(var(--destructive))/0.04] p-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[hsl(var(--destructive))]">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--destructive))/0.1]">
                  <X className="h-3 w-3" />
                </span>
                <span>לפני MEMORAID</span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.before}</p>
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-[hsl(var(--primary))/0.06] p-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[hsl(var(--primary))]">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.15]">
                  <Check className="h-3 w-3" />
                </span>
                <span>עם MEMORAID</span>
              </div>
              <p className="text-xs text-[hsl(var(--foreground))]">{item.after}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

