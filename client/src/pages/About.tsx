import { PublicLayout } from '../components/ui/public-layout';
import { Heart, Target, Users, Shield, Compass, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* סקשן ראשון – נולדנו מתוך הצורך */}
      <section className="rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.16] to-[hsl(var(--background))] px-6 py-10 md:px-12 md:py-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.12] px-4 py-1.5 text-xs font-medium text-[hsl(var(--primary))] mb-4">
          <span>אודות MEMORAID</span>
        </div>
        <h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">
          נולדנו מתוך הצורך של משפחות
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          מאחורי MEMORAID עומדת משפחה שחוותה על בשרה כמה קשה לתאם טיפול בהורה עם דמנציה – התרופות, התורים,
          התיאומים בין אחים והדאגה שלא מפספסים שום דבר חשוב.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          החלטנו להפוך את הכאוס למשימה אחת מסודרת, עם כל הכלים שהיינו רוצים שיהיו לנו מהיום הראשון.
        </p>
      </section>

      {/* סקשן שני – החזון והמשימה שלנו */}
      <section className="mt-10 rounded-3xl bg-[hsl(var(--muted))] px-6 py-9 md:px-10 md:py-11">
        <div className="grid gap-8 md:grid-cols-3 md:items-start" dir="rtl">
          {/* עמודה – כותרת עליונה */}
          <div className="md:col-span-1 text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.12] px-3 py-1 text-[11px] font-medium text-[hsl(var(--primary))] mb-2">
              <Heart className="h-3 w-3" />
              <span>הסיפור שמאחורי המוצר</span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-xs">
              MEMORAID נבנה צעד‑אחר‑צעד יחד עם משפחות מטפלות, אנשי מקצוע וארגוני תמיכה – מתוך מטרה לתת תחושת
              שליטה ושקט בראש, לא רק עוד טופס למלא.
            </p>
          </div>

          {/* עמודה – החזון שלנו */}
          <div className="space-y-2 text-right">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[hsl(var(--primary))]">
              <Target className="h-4 w-4" />
              <span>החזון שלנו</span>
            </div>
            <h2 className="text-base font-semibold">עולם שבו אף משפחה לא נשארת לבד עם האחריות</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              אנחנו מאמינים שטיפול בהורה מזדקן הוא משימה משפחתית, לא של אדם אחד. החזון שלנו הוא ליצור מרחב אחד
              שבו כל בני המשפחה רואים את אותה תמונה, משתפים פעולה ויכולים לסמוך אחד על השני – גם כשחיים בעיר אחרת
              או אפילו במדינה אחרת.
            </p>
          </div>

          {/* עמודה – המשימה שלנו */}
          <div className="space-y-2 text-right">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[hsl(var(--primary))]">
              <Users className="h-4 w-4" />
              <span>המשימה שלנו</span>
            </div>
            <h2 className="text-base font-semibold">להפוך את היום‑יום למעט פחות כבד</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              במשימה שלנו אנחנו מודדים הצלחה לא רק במספר התזכורות שנשלחו, אלא בכמה רגעי שקט הצלחנו להחזיר לכם:
              לדעת שהתרופות נלקחו בזמן, שהפגישה הקרובה לרופא מתועדת, ושיש מי שחולק איתכם את האחריות.
            </p>
          </div>
        </div>
      </section>

      {/* סקשן שלישי – הערכים שמנחים אותנו */}
      <section className="mt-12 text-center" aria-labelledby="values-title">
        <h2 id="values-title" className="text-lg font-semibold mb-2">
          הערכים שמנחים אותנו
        </h2>
        <p className="mx-auto mb-6 max-w-2xl text-xs text-[hsl(var(--muted-foreground))]">
          בכל החלטת מוצר אנחנו שואלים את עצמנו האם זה משרת באמת את המשפחות המטפלות, ומוריד מהעומס במקום להוסיף עוד.
        </p>

        <div className="grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-5 text-right">
            <div className="mb-2 flex items-center gap-2 text-[hsl(var(--primary))]">
              <Users className="h-4 w-4" />
              <h3 className="text-sm font-semibold">משפחתיות</h3>
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
              לראות את כל מי שמעורב בטיפול – אחים, נכדים, בני זוג – כחלק מצוות אחד שפועל יחד.
            </p>
          </article>

          <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-5 text-right">
            <div className="mb-2 flex items-center gap-2 text-[hsl(var(--primary))]">
              <Sparkles className="h-4 w-4" />
              <h3 className="text-sm font-semibold">פשטות</h3>
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
              להסיר רעש ומסכים מיותרים, ולהשאיר רק את מה שהמשפחה באמת צריכה עכשיו.
            </p>
          </article>

          <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-5 text-right">
            <div className="mb-2 flex items-center gap-2 text-[hsl(var(--primary))]">
              <Shield className="h-4 w-4" />
              <h3 className="text-sm font-semibold">אמינות</h3>
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
              מידע רפואי ורגיש חייב להיות מוגן ומדויק – אנחנו מתייחסים אליו באחריות מלאה.
            </p>
          </article>

          <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-5 text-right">
            <div className="mb-2 flex items-center gap-2 text-[hsl(var(--primary))]">
              <Compass className="h-4 w-4" />
              <h3 className="text-sm font-semibold">אופטימיות זהירה</h3>
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
              גם בתוך מצבים מאתגרים אפשר למצוא רגעים טובים – המערכת אמורה לעזור לכם לזהות אותם.
            </p>
          </article>
        </div>
      </section>

      {/* סקשן רביעי – הדרך שלנו (טיימליין) */}
      <section className="mt-14" aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="text-lg font-semibold mb-3 text-center">
          הדרך שלנו
        </h2>
        <p className="mx-auto mb-6 max-w-2xl text-xs text-[hsl(var(--muted-foreground))] text-center">
          כמה תחנות משמעותיות בדרך – מהרגע שבו הבנו שיש פה צורך אמיתי, ועד למשפחות ראשונות שהצטרפו לפיילוט.
        </p>

        <div className="space-y-3" dir="rtl">
          {[
            { year: '2022', label: 'הרעיון נולד', text: 'המשפחה שלנו מתחילה לרכז מחברות, הודעות WhatsApp וטבלאות כדי לא לאבד מעקב אחרי הטיפול.' },
            { year: '2023', label: 'משרטטים את הפתרון', text: 'פגישות עם משפחות נוספות, אנשי מקצוע וארגונים – כדי לוודא שאנחנו פותרים בעיה אמיתית.' },
            { year: '2024', label: 'פיילוט ראשון למשפחות', text: 'השקה שקטה עם כמה עשרות משפחות, קבלת פידבק יומיומי ושיפור חוויית המשתמש.' },
            { year: '2025', label: 'פתיחת הפלטפורמה לציבור', text: 'הרחבת היכולות, שיפור מנוע התזכורות וחיבור לעוד גופי תמיכה ורפואה בקהילה.' },
          ].map((item) => (
            <div
              key={item.year}
              className="flex items-stretch gap-3 rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-3"
            >
              {/* שנה – מימין */}
              <div className="flex w-20 flex-col items-center justify-center rounded-xl bg-[hsl(var(--primary))/0.06] text-[hsl(var(--primary))] text-xs font-semibold text-center">
                <span>{item.year}</span>
                <span className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))] text-center">
                  {item.label}
                </span>
              </div>

              {/* טקסט – ממורכז מתחת לשנה */}
              <p className="flex-1 self-center text-xs text-[hsl(var(--muted-foreground))] leading-relaxed text-center">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* סקשן חמישי – מוכנים להצטרף? */}
      <section className="mt-14 mb-10 rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.14)] to-[hsl(var(--background))] px-6 py-10 text-center md:px-10 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/40 px-4 py-1.5 text-xs font-medium text-[hsl(var(--primary))] mb-3">
            <span>מוכנים להצטרף?</span>
          </div>

          <h2 className="text-2xl font-bold mb-2">המשפחה שלכם לא צריכה לעשות את זה לבד</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            MEMORAID נבנתה כדי להפוך את הדאגה היומיומית לתיאום מסודר בין כל מי שמעורב בטיפול. אפשר להתחיל בקטן,
            עם כמה משימות ותזכורות, ולהתרחב בהמשך.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
            >
              התחילו
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-5 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            >
              דברו איתנו
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

