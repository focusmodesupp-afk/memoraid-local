import { Brain, ClipboardList, Bell, MessageCircle, Sparkles } from 'lucide-react';

type FeatureCard = {
  title: string;
  badge?: string;
  icon: JSX.Element;
  description: string;
  highlights: string[];
};

const FEATURES: FeatureCard[] = [
  {
    title: 'התראות WhatsApp אינטראקטיביות',
    badge: 'חדש!',
    icon: <MessageCircle className="h-5 w-5 text-[#25D366]" />,
    description:
      "קבלו תזכורות ישירות ל‑WhatsApp עם כפתורי פעולה. לחצו 'לקחתי' והכל מתעדכן אוטומטית.",
    highlights: ['כפתורים אינטראקטיביים', 'תיעוד אוטומטי', 'בלי להיכנס לאפליקציה'],
  },
  {
    title: 'ניתוח מסמכים עם AI',
    badge: 'AI',
    icon: <Brain className="h-5 w-5 text-[hsl(var(--primary))]" />,
    description:
      'העלו מסמכים רפואיים והבינה המלאכותית תחלץ את המידע החשוב ותסווג אוטומטית.',
    highlights: ['זיהוי אוטומטי', '8 סוגי מסמכים', 'חילוץ מידע חכם'],
  },
  {
    title: 'שאלונים קליניים מקצועיים',
    badge: '5 שאלונים',
    icon: <ClipboardList className="h-5 w-5 text-[hsl(var(--accent))]" />,
    description:
      'שאלוני הערכה מקצועיים כמו AD8, Zarit ו‑NPI‑Q עם ציון אוטומטי והמלצות מותאמות.',
    highlights: ['ציון אוטומטי', 'המלצות מותאמות', 'יצירת משימות מהתוצאות'],
  },
  {
    title: '4 ערוצי התראות',
    icon: <Bell className="h-5 w-5 text-[hsl(var(--primary))]" />,
    description:
      'בחרו איך לקבל התראות – Push, Email, SMS או WhatsApp. כל ערוץ עובד בנפרד או ביחד.',
    highlights: ['Push notifications', 'אימייל מעוצב', 'SMS', 'WhatsApp'],
  },
];

export function NewFeaturesSection() {
  return (
    <section className="mt-16 space-y-8" id="features">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))/0.1] px-4 py-1 text-xs font-medium text-[hsl(var(--accent))]">
          <Sparkles className="h-3 w-3" />
          <span>יכולות חדשות</span>
        </div>
        <h2 className="text-2xl font-semibold">לא רק ניהול תרופות</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          MEMORAID התפתחה למערכת מקיפה עם כלים מתקדמים שלא תמצאו בשום מקום אחר.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FEATURES.map((feature, index) => (
          <article
            key={feature.title}
            className="group flex flex-col justify-between rounded-2xl bg-[hsl(var(--card))] p-4 shadow-sm ring-1 ring-[hsl(var(--border))] transition hover:-translate-y-0.5 hover:shadow-md"
            data-testid={`card-new-feature-${index}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.06]">
                  {feature.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {feature.description}
                  </p>
                </div>
              </div>
              {feature.badge && (
                <span className="rounded-full bg-[hsl(var(--secondary))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                  {feature.badge}
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {feature.highlights.map((h) => (
                <span
                  key={h}
                  className="rounded-full bg-[hsl(var(--muted))/0.7] px-2 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]"
                >
                  {h}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* ועוד המון יכולות */}
      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[hsl(var(--card))] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] shadow-sm"
        data-testid="card-more-features"
      >
        <span className="font-medium text-[hsl(var(--foreground))]">ועוד המון יכולות:</span>
        <div className="flex flex-wrap gap-1.5">
          {['לוח ניהול משימות', 'תזכורות שתייה', 'מעקב ביקורי רופא', 'תיעוד קוגניטיבי', 'דוחות מפורטים'].map(
            (label) => (
              <span
                key={label}
                className="rounded-full bg-[hsl(var(--muted))/0.7] px-2 py-0.5 text-[10px]"
              >
                {label}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}

