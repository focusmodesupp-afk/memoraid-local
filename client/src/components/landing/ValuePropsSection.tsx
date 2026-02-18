import { Clock, Users, Bell } from 'lucide-react';

const CARDS = [
  {
    id: 0,
    title: 'תוך דקות - לא שעות',
    text: 'הקמת חשבון והזנת התרופות הראשונות לוקחת פחות מ-5 דקות. בלי הדרכה, בלי סיבוכים.',
    icon: <Clock className="h-6 w-6 text-[hsl(var(--primary))]" />,
  },
  {
    id: 1,
    title: 'כל המשפחה בפנים',
    text: 'הזמינו את כל מי שמעורב בטיפול - אחים, מטפלת, בני דודים בחו״ל. כולם רואים את אותו המידע.',
    icon: <Users className="h-6 w-6 text-[hsl(var(--primary))]" />,
  },
  {
    id: 2,
    title: 'לא שוכחים כלום',
    text: 'תזכורות אוטומטיות לתרופות, תורים ומשימות. ישירות ל-WhatsApp, SMS או Email.',
    icon: <Bell className="h-6 w-6 text-[hsl(var(--primary))]" />,
  },
];

export function ValuePropsSection() {
  return (
    <section className="mt-16 space-y-8" id="value-props">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">למה זה עובד</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {CARDS.map((card) => (
          <article
            key={card.id}
            className="flex flex-col items-center rounded-2xl bg-[hsl(var(--card))] p-5 shadow-sm text-center transition hover:-translate-y-0.5 hover:shadow-md"
            data-testid={`card-value-${card.id}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.1] mb-3">
              {card.icon}
            </div>
            <h3 className="text-sm font-semibold">{card.title}</h3>
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              {card.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
