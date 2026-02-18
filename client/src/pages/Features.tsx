import { PublicLayout } from '../components/ui/public-layout';
import { Pill, Check, MessageCircle, Brain, ClipboardList, Bell, Cloud, Monitor, Smartphone, Zap } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <PublicLayout>
      {/* אינטרו – סקשן ראשון בדף תכונות */}
      <section className="rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.08] to-[hsl(var(--background))] px-6 py-10 md:px-12 md:py-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.12] px-4 py-1.5 text-xs font-medium text-[hsl(var(--primary))] mb-4">
          <span>כלים למשפחות מטפלות</span>
        </div>
        <h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">
          הכל מה שצריך לטיפול בהורה עם דמנציה
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          MEMORAID עוזרת למשפחות לארגן את הטיפול - תרופות, תורים, משימות ותקשורת. הכל במקום אחד.
        </p>
      </section>

      {/* סקשן ראשון – ניהול תרופות חכם */}
      <section className="mt-10" aria-labelledby="feature-meds-title">
        <article
          className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm md:p-8"
          data-testid="card-feature-medication"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.1]">
                <Pill className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h2 id="feature-meds-title" className="text-lg font-semibold">
                  ניהול תרופות חכם
                </h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  לא עוד &quot;מישהו נתן לה את התרופה?&quot;
                </p>
              </div>
            </div>
          </div>

          <ul className="mt-6 space-y-3">
            {[
              'תזכורות אוטומטיות לפני כל מנה',
              'מעקב נטילה בזמן אמת',
              'היסטוריה מלאה של כל התרופות',
              'תיעוד תופעות לוואי',
              'מידע לרוקח/רופא לבדיקת אינטראקציות',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--foreground))]">
                <Check className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(var(--primary))]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {/* סקשן שני – יכולות מתקדמות */}
      <section className="mt-12" aria-labelledby="advanced-features-title">
        <div className="text-center mb-6">
          <h2 id="advanced-features-title" className="text-lg font-semibold">
            יכולות מתקדמות
          </h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            טכנולוגיה שמתאימה את עצמה למשפחות שמטפלות בהורה עם דמנציה.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* WhatsApp תזכורות */}
          <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <MessageCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">תזכורות WhatsApp חכמות</h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  תזכורות נשלחות ישירות לווטסאפ של בני המשפחה, בקצב שמתאים לעומס היומיומי שלכם.
                </p>
              </div>
            </div>
          </article>

          {/* מנוע AI למשימות */}
          <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.1]">
                <Brain className="h-4 w-4 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">מנוע AI למשימות טיפול</h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  המערכת מציעה משימות ומתזכרת על פי מצב המטופל, היסטוריית תרופות והעדפות המשפחה.
                </p>
              </div>
            </div>
          </article>

          {/* שאלונים קליניים ודוחות */}
          <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                <ClipboardList className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">שאלונים קליניים ודוחות</h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  מילוי מסודר של שאלונים ומדדים לקראת ביקור אצל רופא, כולל סיכום פשוט לקריאה.
                </p>
              </div>
            </div>
          </article>

          {/* 4 ערוצי התראה */}
          <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
                <Bell className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">4 ערוצי תזכורת</h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Push לאפליקציה, מייל, SMS ו‑WhatsApp – כדי שאף תזכורת לא תלך לאיבוד.
                </p>
              </div>
            </div>
          </article>

          {/* גישה מכל מקום */}
          <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm md:col-span-2">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.06]">
                <Cloud className="h-4 w-4 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">מכל מקום בעולם</h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  בני משפחה בארץ ובחו״ל רואים את אותו מצב עדכני של המטופל – בלי קבצים מפוזרים וצילומי מסך.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* סקשן שלישי – עובד על כל מכשיר */}
      <section className="mt-14 rounded-3xl bg-[hsl(var(--muted))] px-6 py-10 md:px-10 md:py-12 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold">עובד על כל מכשיר</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            לא משנה אם אתם מול מחשב, בטלפון בדרך לעבודה או על טאבלט אצל ההורה – המערכת תמיד איתכם.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-[hsl(var(--primary))]">
                <Cloud className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">דפדפן</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">עובד מכל מחשב בלי התקנות.</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-[hsl(var(--primary))]">
                <Monitor className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">מסך גדול</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">תצוגת דשבורד נוחה למשפחות.</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-[hsl(var(--primary))]">
                <Smartphone className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">סמארטפון</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">התראות בזמן אמת כשמשהו חשוב קורה.</p>
            </div>
          </div>
        </div>
      </section>

      {/* סקשן אחרון – קריאה לפעולה */}
      <section className="mt-12 mb-6 rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.08] to-[hsl(var(--background))] px-6 py-10 md:px-10 md:py-12 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.12] px-4 py-1.5 text-xs font-medium text-[hsl(var(--primary))] mb-3">
            <Zap className="h-4 w-4" />
            <span>מוכנים להתחיל?</span>
          </div>

          <h2 className="text-2xl font-bold mb-2">תנו למערכת לסנכרן את המשפחה</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            פתחו קבוצה משפחתית, הוסיפו את ההורה ותראו איך כל המשימות, התרופות והתזכורות מסתדרים במקום אחד.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
            >
              התחילו בחינם
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-5 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            >
              חזרו לדף הראשי
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
