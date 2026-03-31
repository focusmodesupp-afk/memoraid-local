import { useState, useEffect } from 'react';
import { PublicLayout } from '../components/ui/public-layout';
import { apiFetch } from '../lib/api';

type Plan = {
  slug: string;
  nameHe: string;
  descriptionHe: string | null;
  features: string[];
  priceMonthly: number | null;
  currency: string;
};

async function startCheckout(plan: string, couponCode?: string, familyId?: string) {
  try {
    const data = await apiFetch<{ url: string }>('/billing/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ plan, couponCode: couponCode || undefined, familyId: familyId || undefined }),
    });
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err: any) {
    alert(err?.message ?? 'שגיאה בתהליך התשלום. נסו שוב מאוחר יותר.');
  }
}

function formatPrice(amount: number | null, currency: string) {
  if (amount == null) return 'בהתאמה';
  const c = currency?.toLowerCase() || 'ils';
  if (c === 'ils') return `₪${(amount / 100).toFixed(0)} / לחודש`;
  return `${(amount / 100).toFixed(2)} ${c.toUpperCase()} / לחודש`;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Plan[]>('/billing/plans')
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <PublicLayout>
      {/* סקשן עליון – כותרת תמחור */}
      <section className="rounded-3xl bg-gradient-to-b from-[hsl(var(--primary))/0.16] to-[hsl(var(--background))] px-6 py-10 md:px-12 md:py-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.12] px-4 py-1.5 text-xs font-medium text-[hsl(var(--primary))] mb-4">
          <span>תמחור פשוט למשפחות</span>
        </div>
        <h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">
          התחילו בחינם. שדרגו כשתרצו.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          החבילות נבנו מתוך המציאות של המשפחות המטפלות – אפשר להתחיל בלי התחייבות, ולעבור למסלול מתקדם רק אם
          תרגישו שזה נכון לכם.
        </p>
      </section>

      {/* כרטיסי תמחור */}
      <section className="mt-10" aria-labelledby="pricing-cards">
        <div className="grid gap-4 md:grid-cols-3" dir="rtl">
          {loading ? (
            <p className="col-span-full text-center text-[hsl(var(--muted-foreground))]">טוען תמחור...</p>
          ) : plans.length > 0 ? (
            plans.map((p) => {
              const isPaid = p.priceMonthly != null && p.priceMonthly > 0;
              const isPremium = p.slug === 'premium';
              return (
                <article
                  key={p.slug}
                  className={`relative rounded-3xl px-5 py-6 text-right flex flex-col justify-between ${
                    isPremium ? 'bg-white shadow-md border-2 border-[hsl(var(--primary))]' : 'bg-white shadow-sm border border-[hsl(var(--border))]'
                  }`}
                >
                  {isPremium && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(var(--primary))] px-3 py-0.5 text-[10px] font-medium text-white shadow-sm">
                      חבילת פרימיום
                    </div>
                  )}
                  <div className={isPremium ? 'mt-2' : ''}>
                    <h2 className="text-sm font-semibold mb-1">{p.nameHe}</h2>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-1">{p.descriptionHe || ''}</p>
                    <p className="text-xs font-medium mb-2">
                      {p.priceMonthly == null || p.priceMonthly === 0 ? 'חינם / לנצח' : formatPrice(p.priceMonthly, p.currency)}
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      {(p.features || []).map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                  {isPaid ? (
                    <button
                      type="button"
                      onClick={() => startCheckout(p.slug)}
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
                    >
                      נסו 14 יום חינם
                    </button>
                  ) : p.slug === 'basic' || p.slug === 'אחראי' ? (
                    <a
                      href="/contact"
                      className="mt-4 inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-4 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                    >
                      דברו איתנו
                    </a>
                  ) : (
                    <a
                      href="/onboarding"
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
                    >
                      התחילו
                    </a>
                  )}
                </article>
              );
            })
          ) : (
            <>
              <article className="rounded-3xl bg-white shadow-sm border border-[hsl(var(--border))] px-5 py-6 text-right flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-semibold mb-1">אחראי</h2>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-3">החבילה הבסיסית למטפל/ת אחד שמוביל/ה את הכל.</p>
                  <p className="text-xs font-medium mb-1">בהתאמה</p>
                  <ul className="mt-2 space-y-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <li>• ניהול תרופות בסיסי</li>
                    <li>• ניהול משימות אישי</li>
                    <li>• ניהול תורים וביקורים</li>
                    <li>• גישה מדפדפן ומובייל</li>
                  </ul>
                </div>
                <a href="/contact" className="mt-4 inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-4 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]">
                  דברו איתנו
                </a>
              </article>
              <article className="relative rounded-3xl bg-white shadow-md border-2 border-[hsl(var(--primary))] px-5 py-6 text-right flex flex-col justify-between">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(var(--primary))] px-3 py-0.5 text-[10px] font-medium text-white shadow-sm">חבילת פרימיום</div>
                <div className="mt-2">
                  <h2 className="text-sm font-semibold mb-1">פרימיום</h2>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-1">למשפחות עם צרכים מורחבים</p>
                  <p className="text-xs font-medium mb-2">₪49 / לחודש</p>
                  <ul className="mt-1 space-y-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <li>• עד 3 מטופלים</li>
                    <li>• בני משפחה ללא הגבלה</li>
                    <li>• כל התכונות של חינם</li>
                    <li>• ייצוא דוחות PDF מתקדמים</li>
                    <li>• גרפים והיסטוריה מורחבת</li>
                    <li>• תזכורות מותאמות אישית</li>
                    <li>• אינטגרציה עם קופות חולים</li>
                    <li>• תמיכה מועדפת בטלפון</li>
                  </ul>
                </div>
                <button type="button" onClick={() => startCheckout('premium')} className="mt-4 inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[hsl(var(--primary))]/90">
                  נסו 14 יום חינם
                </button>
              </article>
              <article className="rounded-3xl bg-white shadow-sm border border-[hsl(var(--border))] px-5 py-6 text-right flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-semibold mb-1">משפחתי</h2>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-1">הכל מה שצריך למשפחה אחת</p>
                  <p className="text-xs font-medium mb-2">חינם / לנצח</p>
                  <ul className="mt-1 space-y-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <li>• מטופל אחד</li>
                    <li>• בני משפחה ללא הגבלה</li>
                    <li>• ניהול תרופות מלא</li>
                    <li>• מעקב מדדים רפואיים</li>
                    <li>• תזכורות שתייה</li>
                    <li>• ניהול תורים וביקורים</li>
                    <li>• לוח ניהול משימות</li>
                    <li>• התראות WhatsApp, SMS, Email</li>
                  </ul>
                </div>
                <a href="/onboarding" className="mt-4 inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[hsl(var(--primary))]/90">
                  התחילו
                </a>
              </article>
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

