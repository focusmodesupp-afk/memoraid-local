import { PublicLayout } from './components/ui/public-layout';
import { useLocation } from 'wouter';
import { Users, Sparkles, ChevronLeft, Heart } from 'lucide-react';
import { BeforeAfterSection } from './components/landing/BeforeAfter';
import { FitQuizSection } from './components/landing/FitQuiz';
import { NewFeaturesSection } from './components/landing/NewFeaturesSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { BenefitsSection } from './components/landing/BenefitsSection';
import { ValuePropsSection } from './components/landing/ValuePropsSection';
import { OurStorySection } from './components/landing/OurStorySection';
import { CareJourneySection } from './components/landing/CareJourneySection';

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="space-y-6 rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.12] via-[hsl(var(--background))] to-[hsl(var(--background))] px-6 py-10 md:px-12 md:py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--card))]/80 px-4 py-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          <Heart className="h-3 w-3 text-[hsl(var(--primary))]" />
          <span>נבנה ע״י משפחה מטפלת, למשפחות מטפלות</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
            כשדמנציה נכנסת למשפחה,
            <br />
            <span className="text-[hsl(var(--primary))]">אתם לא צריכים להתמודד לבד.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm md:text-base text-[hsl(var(--muted-foreground))]">
            MEMORAID עוזרת למשפחות לארגן את הטיפול בהורה עם דמנציה –{' '}
            <span className="font-semibold">
              בלי הבלבול, בלי החיכוכים, בלי לאבד את עצמכם בדרך.
            </span>
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 text-sm md:flex-row md:justify-center">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-medium text-white shadow-md hover:opacity-90"
            onClick={() => navigate('/login')}
            data-testid="button-hero-cta"
          >
            <Users className="h-4 w-4" />
            <span>התחילו בחינם</span>
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))]"
            onClick={() => {
              const el = document.getElementById('quiz');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            data-testid="button-hero-quiz"
          >
            <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span>בדקו אם מתאים לכם</span>
            <ChevronLeft className="h-3 w-3" />
          </button>
        </div>
      </section>

    
      {/* Problem / Solution – גרסה מקוצרת לעכשיו */}
      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">מכירים את זה?</h2>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <ProblemCard
            title="מישהו נתן לו את התרופה?"
            text="שאלה שחוזרת כל יום, כמה פעמים ביום."
          />
          <ProblemCard
            title="קבוצות WhatsApp עם מאות הודעות"
            text="ועדיין אף אחד לא יודע מה באמת קורה."
          />
          <ProblemCard
            title="ויכוחים על מי עושה מה"
            text="במקום להתמקד בטיפול עצמו."
          />
        </div>
        <div className="card border-[hsl(var(--primary))/0.2] bg-[hsl(var(--primary))/0.05]">
          <h3 className="text-sm font-semibold text-[hsl(var(--primary))]">
            MEMORAID עוזרת לארגן את הכאוס.
          </h3>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            מקום אחד. כל המידע. כל המשפחה. בלי בלבול.
          </p>
        </div>
      </section>
      {/* Care Journey – 4 שלבים (סקשן 3) */}
      <CareJourneySection />

      {/* Before / After – ההבדל ברור (סקשן 4) */}
      <BeforeAfterSection />

      {/* Fit Quiz – האם MEMORAID מתאימה לכם? (סקשן 4) */}
      <FitQuizSection />

      {/* New Features – לא רק ניהול תרופות (סקשן 5) */}
      <NewFeaturesSection />

      {/* How It Works – איך מתחילים? (סקשן 6) */}
      <HowItWorksSection />

      {/* Benefits – לכל מי שמעורב בטיפול (סקשן 7) */}
      <BenefitsSection />

      {/* Value Props – למה זה עובד (סקשן 8) */}
      <ValuePropsSection />

      {/* Our Story – למה MEMORAID קיים (סקשן 9) */}
      <OurStorySection />
    </PublicLayout>
  );
}

function ProblemCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="card border-[hsl(var(--destructive))/0.2] bg-[hsl(var(--destructive))/0.03]">
      <h3 className="text-sm font-semibold text-[hsl(var(--destructive))]">{title}</h3>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{text}</p>
    </div>
  );
}