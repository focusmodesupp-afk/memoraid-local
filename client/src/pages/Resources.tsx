import { PublicLayout } from '../components/ui/public-layout';
import { Info, Building2, Heart, Users } from 'lucide-react';

export default function ResourcesPage() {
  return (
    <PublicLayout>
      {/* סקשן ראשון – כותרת מרכז המידע */}
      <section className="rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.08] to-[hsl(var(--background))] px-6 py-10 md:px-12 md:py-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.12] px-4 py-1.5 text-xs font-medium text-[hsl(var(--primary))] mb-4">
          <span>מרכז המידע למשפחות</span>
        </div>
        <h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">
          מידע ומשאבים למשפחות
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          כל מה שצריך לדעת על זכויות, מדריכים וטיפים למשפחות שמטפלות בהורה עם דמנציה – במקום אחד.
        </p>
      </section>

      {/* סקשן שני – הכנת זכויות (הגריד הראשון כמו בצילום) */}
      <section
        className="mt-10 rounded-3xl bg-[hsl(var(--muted))] px-5 py-8 shadow-sm md:px-8"
        aria-labelledby="rights-preparation-title"
      >
        <div className="flex flex-col items-stretch justify-between gap-6 md:flex-row md:items-start">
          {/* כותרת צד ימין */}
          <div className="md:w-1/3 text-right md:text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.08] px-3 py-1 text-[11px] font-medium text-[hsl(var(--primary))] mb-2">
              <Info className="h-3 w-3" />
              <span>הכנת זכויות</span>
            </div>
            <h2
              id="rights-preparation-title"
              className="text-lg font-semibold"
            >
              מידע שמסדר את הראש
            </h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] max-w-xs">
              להבין מה מגיע לכם, מאיפה מתחילים ואיזה מסמכים חשוב להכין לפני פנייה לביטוח לאומי, קופות חולים וגופים נוספים.
            </p>
          </div>

          {/* כרטיסים */}
          <div className="md:w-2/3">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">מפת זכויות</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  סקירה מרוכזת של סוגי הקצבאות, ההטבות והסייעות שניתן לבדוק עבור הורה עם דמנציה – בשפה פשוטה ולא משפטית.
                </p>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">מה לשאול את הרופא</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  רשימת שאלות מומלצת לפגישה הבאה עם רופא המשפחה או הגריאטר, כדי לוודא שלא שכחתם שום דבר חשוב.
                </p>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">טפסים שחשוב לשמור</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  אילו מסמכים רפואיים ושחרורים כדאי לסרוק ולשמור, כדי שלא תצטרכו לחפש אותם בכל פעם מחדש.
                </p>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">איך מתכוננים לוועדה</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  טיפים קצרים ליום הוועדה: מה להביא, על מה לשים דגש ואיך לתאר נכון את המצב היומיומי של ההורה.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* סקשן שלישי – ארגונים וגופי תמיכה בישראל */}
      <section
        className="mt-10 rounded-3xl bg-[hsl(var(--muted))] px-5 py-8 shadow-sm md:px-8"
        aria-labelledby="orgs-title"
      >
        <div className="flex flex-col items-stretch justify-between gap-6 md:flex-row md:items-start">
          {/* כותרת צד ימין */}
          <div className="md:w-1/3 text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.08] px-3 py-1 text-[11px] font-medium text-[hsl(var(--primary))] mb-2">
              <Building2 className="h-3 w-3" />
              <span>ארגונים וגופי תמיכה בישראל</span>
            </div>
            <h2 id="orgs-title" className="text-lg font-semibold">
              לא חייבים להישאר לבד
            </h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] max-w-xs">
              רשימה ראשונית של עמותות, קופות וארגונים שיכולים לעזור לכם – ליווי רגשי, ייעוץ זכויות ושירותים בקהילה.
            </p>
          </div>

          {/* כרטיסים */}
          <div className="md:w-2/3">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">קו חם למשפחות מטפלות</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-2">
                  מענה טלפוני ראשוני לשאלות על טיפול יומיומי, התמודדות רגשית וחיבור לגורמי טיפול בקהילה.
                </p>
                <div className="flex justify-end gap-2 text-[10px]">
                  <button className="rounded-full border border-[hsl(var(--border))] px-2 py-1 hover:bg-[hsl(var(--muted))]">
                    לאתר
                  </button>
                  <button className="rounded-full bg-[hsl(var(--primary))] px-2 py-1 text-white hover:bg-[hsl(var(--primary))]/90">
                    חיוג מהיר
                  </button>
                </div>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">עמותות ליווי למשפחות</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-2">
                  קבוצות תמיכה, מפגשי זום ותכנים דיגיטליים שמיועדים במיוחד לבני משפחה שמטפלים בהורה עם דמנציה.
                </p>
                <div className="flex justify-end gap-2 text-[10px]">
                  <button className="rounded-full border border-[hsl(var(--border))] px-2 py-1 hover:bg-[hsl(var(--muted))]">
                    לאתר
                  </button>
                  <button className="rounded-full bg-[hsl(var(--primary))] px-2 py-1 text-white hover:bg-[hsl(var(--primary))]/90">
                    פרטים
                  </button>
                </div>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">שירותי רווחה וקהילה</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-2">
                  קישורים למוקדי רווחה עירוניים, מרכזי יום ומעונות, כדי להבין אילו שירותים קיימים בסביבת המגורים שלכם.
                </p>
                <div className="flex justify-end gap-2 text-[10px]">
                  <button className="rounded-full border border-[hsl(var(--border))] px-2 py-1 hover:bg-[hsl(var(--muted))]">
                    רשימת ערים
                  </button>
                </div>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">קופות החולים</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-2">
                  ריכוז קישורים לשירותי גריאטריה, מוקדים טלפוניים וזימון תורים בקופות השונות.
                </p>
                <div className="flex justify-end gap-2 text-[10px]">
                  <button className="rounded-full border border-[hsl(var(--border))] px-2 py-1 hover:bg-[hsl(var(--muted))]">
                    כל הקופות
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* סקשן רביעי – טיפים למטפלים */}
      <section
        className="mt-10 rounded-3xl bg-[hsl(var(--muted))] px-5 py-8 shadow-sm md:px-8"
        aria-labelledby="tips-title"
      >
        <div className="flex flex-col items-stretch justify-between gap-6 md:flex-row md:items-start">
          {/* כותרת צד ימין */}
          <div className="md:w-1/3 text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.08] px-3 py-1 text-[11px] font-medium text-[hsl(var(--primary))] mb-2">
              <Heart className="h-3 w-3" />
              <span>טיפים למטפלים</span>
            </div>
            <h2 id="tips-title" className="text-lg font-semibold">
              גם לכם מגיע גב
            </h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] max-w-xs">
              עצות קטנות ליום‑יום שיכולות לעשות הבדל גדול – גם בשביל ההורה וגם בשבילכם.
            </p>
          </div>

          {/* כרטיסים */}
          <div className="md:w-2/3">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">שיחה משפחתית פתוחה</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  לייצר פעם בשבוע שיחה קצרה עם בני המשפחה, לעדכון על המצב וחלוקת משימות מחדש.
                </p>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">יומן רגשי קצר</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  לרשום לעצמכם פעם ביום משפט או שניים על מה שהיה קשה ומה דווקא עבד טוב.
                </p>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">זמן נשימה קבוע</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  לסמן ביומן שלכם 20 דקות קבועות ביום שמשויכות רק אליכם – הליכה, קפה, מוזיקה.
                </p>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">חלוקת תפקידים</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  להגדיר לכל בן משפחה אחריות קטנה אחת, כדי שלא הכל יהיה על אדם אחד.
                </p>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">לתת מקום לרגשות</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  זה בסדר להרגיש עייפות, כעס או אשמה – שיתוף באותן תחושות יכול לעזור לכולם.
                </p>
              </article>

              <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right">
                <h3 className="text-sm font-semibold mb-1">לא לשכוח לבקש עזרה</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  זה לא חולשה לפנות לחבר, שכן או איש מקצוע – זה חלק מהכוח שלכם כמשפחה.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* סקשן חמישי – זכויות נוספות בקצרה */}
      <section
        className="mt-10 rounded-3xl bg-[hsl(var(--background))] px-5 py-8 shadow-sm border border-[hsl(var(--border))] md:px-8"
        aria-labelledby="more-rights-title"
      >
        <div className="flex flex-col items-stretch justify-between gap-6 md:flex-row md:items-start">
          <div className="md:w-1/3 text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.08] px-3 py-1 text-[11px] font-medium text-[hsl(var(--primary))] mb-2">
              <span>זכויות נוספות בקצרה</span>
            </div>
            <h2 id="more-rights-title" className="text-lg font-semibold">
              שלא תפספסו שום הטבה
            </h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] max-w-xs">
              תקציר של נושאים שחשוב לעבור עליהם עם גורמי מקצוע – אפשר לסמן לעצמכם במה כבר טיפלתם.
            </p>
          </div>

          <div className="md:w-2/3">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                'פטור/הנחה בארנונה',
                'הנחות בתחבורה ציבורית',
                'סיוע במימון מטפל/ת',
                'זכויות במס הכנסה',
                'שירותי שיקום בקהילה',
                'סיוע בציוד עזר רפואי',
              ].map((item) => (
                <article
                  key={item}
                  className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3 text-right"
                >
                  <h3 className="text-sm font-semibold mb-1">{item}</h3>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                    בדקו מול הרשות המקומית, קופת החולים או יועץ זכויות אם אתם זכאים להטבה בתחום הזה.
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* סקשן שישי – קריאה לפעולה להצטרפות למשפחות */}
      <section className="mt-12 mb-10 rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.14] to-[hsl(var(--background))] px-6 py-10 text-center md:px-10 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/40 px-4 py-1.5 text-xs font-medium text-[hsl(var(--primary))] mb-3">
            <Users className="h-4 w-4" />
            <span>משפחות כמוכם כבר בפנים</span>
          </div>

          <h2 className="text-2xl font-bold mb-2">הצטרפו למשפחות שמשתפות פעולה סביב ההורה</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            אחרי שקראתם על הזכויות והמשאבים – אפשר לעשות את הצעד הבא ולהפוך את כל הידע הזה לתוכנית טיפול משפחתית מסודרת.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
            >
              פתחו קבוצה משפחתית
            </a>
            <a
              href="/features"
              className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-5 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            >
              ראו איך המערכת עוזרת
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

