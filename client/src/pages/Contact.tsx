import { PublicLayout } from '../components/ui/public-layout';
import { Phone, Mail, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  return (
    <PublicLayout>
      {/* סקשן עליון – כותרת וצור קשר */}
      <section className="rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.14] to-[hsl(var(--background))] px-6 py-10 md:px-12 md:py-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.12] px-4 py-1.5 text-xs font-medium text-[hsl(var(--primary))] mb-4">
          <span>שאלות, רעיונות או צורך בעזרה?</span>
        </div>
        <h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">צור קשר</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          יש לכם משהו על הלב שקשור לטיפול בהורה? אנחנו כאן כדי לחשוב איתכם ביחד – בעברית, בנחת.
        </p>
      </section>

      {/* רשת כרטיסים + טופס */} 
      <section className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* צד שמאל – דרכי יצירת קשר ומידע כללי (ב‑RTL זה יופיע מימין) */}
        <div className="space-y-4" dir="rtl">
          {/* שלושת הכרטיסים העליונים */}
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-4 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.08] text-[hsl(var(--primary))]">
                <Phone className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold mb-1">טלפון</h2>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-1">איש צוות זמין לשיחה</p>
              <p className="text-xs font-medium">03-1234567</p>
            </article>

            <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-4 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.08] text-[hsl(var(--primary))]">
                <Mail className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold mb-1">אימייל</h2>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-1">לשאלות, הצעות ושיתופי פעולה</p>
              <p className="text-xs font-medium">support@memoraid.co.il</p>
            </article>

            <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-4 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                <MessageCircle className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold mb-1">WhatsApp</h2>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-1">להודעות קצרות ועדכונים חשובים</p>
              <p className="text-xs font-medium">050-1234567</p>
            </article>
          </div>

          {/* שעות פעילות */}
          <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-4 text-right">
            <h3 className="text-sm font-semibold mb-1">שעות פעילות</h3>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">ימים א׳–ה׳:</p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">09:00–13:00 • 16:00–18:00</p>
            <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
              מחוץ לשעות הפעילות ניתן להשאיר הודעה ונחזור אליכם בהקדם.
            </p>
          </article>

          {/* כתובת / משרדנו */}
          <article className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-4 py-4 text-right">
            <h3 className="text-sm font-semibold mb-1">משרדנו</h3>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">MEMORAID – תל אביב, ישראל</p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              פגישות פרונטליות בתיאום מראש בלבד. רוב הליווי מתבצע אונליין או בטלפון.
            </p>
          </article>

          {/* כרטיס לעסקים וארגונים */}
          <article className="rounded-2xl bg-[hsl(var(--primary))/0.06] border border-[hsl(var(--primary))/0.18] px-4 py-4 text-right text-[11px] text-[hsl(var(--muted-foreground))]">
            <p className="font-medium mb-1">לעסקים, ארגונים ועמותות</p>
            <p>
              נשמח לשיחה על הטמעת MEMORAID בארגון שלכם, חבילות למעסיקים ותמיכה במשפחות העובדים. כתבו לנו ל‑{' '}
              <span className="font-medium">partners@memoraid.co.il</span>.
            </p>
          </article>
        </div>

        {/* צד ימין – טופס צור קשר */}
        <div className="rounded-2xl bg-white shadow-sm border border-[hsl(var(--border))] px-5 py-5" dir="rtl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold">שלחו לנו הודעה</h2>
            <label className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
              <input type="checkbox" defaultChecked className="h-3 w-3 rounded border-[hsl(var(--border))]" />
              <span>אני מעוניין לקבל עדכונים על פיתוחים חדשים</span>
            </label>
          </div>

          <form className="space-y-3 text-right">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium">שם פרטי</label>
                <input
                  className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  placeholder="לדוגמה: יואב"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium">שם משפחה</label>
                <input
                  className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  placeholder="לדוגמה: כהן"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium">אימייל</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium">טלפון</label>
                <input
                  className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  placeholder="050-0000000"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium">איך נוכל לעזור?</label>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                placeholder="כמה מילים על ההורה, המשפחה והאתגר שבו תרצו שנתמקד..."
              />
            </div>

            <button
              type="button"
              className="mt-2 w-full rounded-full bg-[hsl(var(--primary))] py-2 text-xs font-medium text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
            >
              שליחת ההודעה
            </button>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
}

