import { Heart, Users, Shield, CheckCircle } from 'lucide-react';

const BENEFITS = [
  {
    id: 'primary',
    title: 'למטפל הראשי',
    subtitle: 'מי שנושא את רוב העומס',
    icon: <Heart className="h-6 w-6 text-[hsl(var(--primary))]" />,
    borderClass: 'border-[hsl(var(--primary))/0.2]',
    items: [
      'לא לבד - כל המשפחה רואה ועוזרת',
      'פחות לזכור - המערכת מזכירה במקומכם',
      'תיעוד אוטומטי - הכל נשמר להיסטוריה',
    ],
  },
  {
    id: 'family',
    title: 'לאחים ובני משפחה',
    subtitle: 'גם מי שגר רחוק או בחו״ל',
    icon: <Users className="h-6 w-6 text-[hsl(var(--accent))]" />,
    borderClass: 'border-[hsl(var(--accent))/0.2]',
    items: [
      'להיות חלק - לא רק לשאול "מה נשמע"',
      'לראות מה קורה - עדכונים בזמן אמת',
      'לעזור באמת - לקחת משימות ותורים',
    ],
  },
  {
    id: 'patient',
    title: 'להורה',
    subtitle: 'כי בסוף - הכל בשבילו',
    icon: <Shield className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />,
    borderClass: 'border-[hsl(var(--border))]',
    items: [
      'טיפול עקבי - לא שוכחים תרופות',
      'פחות מתח בבית - פחות ויכוחים',
      'היסטוריה לרופא - מידע מדויק לביקורים',
    ],
  },
];

export function BenefitsSection() {
  return (
    <section className="mt-16 space-y-8 rounded-3xl bg-[hsl(var(--card))/0.5] px-6 py-12 md:px-10 md:py-16" id="benefits">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">לכל מי שמעורב בטיפול</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
          כי טיפול טוב בהורה מתחיל בתקשורת טובה בין כל המעורבים
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((card) => (
          <article
            key={card.id}
            className={`flex flex-col rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.borderClass}`}
            data-testid={`card-benefit-${card.id}`}
          >
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.08]">
                {card.icon}
              </div>
            </div>
            <h3 className="text-center text-sm font-semibold">{card.title}</h3>
            <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {card.subtitle}
            </p>
            <ul className="mt-4 space-y-2">
              {card.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[hsl(var(--foreground))]">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(var(--primary))]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
