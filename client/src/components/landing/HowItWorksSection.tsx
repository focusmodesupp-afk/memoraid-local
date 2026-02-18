import { ArrowLeft, Zap } from 'lucide-react';
import { useLocation } from 'wouter';

const STEPS = [
  {
    title: 'הקמת חשבון משפחתי',
    description: 'תוך 2 דקות יש לכם חשבון מאובטח. פשוט להירשם עם Google.',
  },
  {
    title: 'הוספת המטופל והתרופות',
    description: 'הזינו את פרטי המטופל, התרופות והמדדים שצריך לעקוב אחריהם.',
  },
  {
    title: 'הזמנת בני משפחה',
    description: 'שלחו הזמנה לכל מי שמעורב בטיפול - הם יקבלו גישה מיידית.',
  },
  {
    title: 'התחילו לקבל התראות',
    description: 'בחרו ערוץ - WhatsApp, SMS, Push או Email - וקבלו תזכורות אוטומטיות.',
  },
];

export function HowItWorksSection() {
  const [, navigate] = useLocation();

  return (
    <section
      className="mt-16 rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.08] to-[hsl(var(--background))] px-6 py-12 md:px-10 md:py-16"
      id="how-it-works"
    >
      <div className="text-center space-y-2 mb-10">
        <h2 className="text-2xl font-semibold">איך מתחילים?</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          ארבעה צעדים פשוטים - ותוך דקות אתם בפנים
        </p>
      </div>

      {/* מובייל/טאבלט: גריד 2 עמודות */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:hidden">
        {STEPS.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-4 rounded-2xl bg-[hsl(var(--card))] p-4 shadow-sm"
            data-testid={`step-${index}`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div className="text-right min-w-0">
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* דסקטופ: שורה אחת עם 4 שלבים + חצים ביניהם (מימין לשמאל RTL) */}
      <div className="hidden lg:flex lg:items-start lg:justify-center lg:gap-2" dir="rtl">
        {STEPS.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex flex-col items-center text-center min-w-[180px]" data-testid={`step-${index}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-sm font-semibold text-white">
                {index + 1}
              </div>
              <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {step.description}
              </p>
            </div>
            {index < STEPS.length - 1 && (
              <div className="flex shrink-0 items-center pt-5">
                <ArrowLeft className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-medium text-white shadow-md hover:opacity-90"
          data-testid="button-how-it-works-cta"
        >
          <Zap className="h-4 w-4" />
          <span>התחילו עכשיו - חינם</span>
        </button>
      </div>
    </section>
  );
}
