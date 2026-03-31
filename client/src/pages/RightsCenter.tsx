import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { Scale, FileText, HelpCircle, CheckSquare, Stethoscope, AlertCircle, ExternalLink } from 'lucide-react';

type RightCategory = {
  id?: string;
  slug?: string;
  titleHe?: string;
  titleEn?: string;
  descriptionHe?: string;
  descriptionEn?: string;
};

export default function RightsCenterPage() {
  const { dir, lang } = useI18n();
  const [rightsCards, setRightsCards] = useState<RightCategory[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<RightCategory[]>('/rights')
      .then(setRightsCards)
      .catch(() => setRightsCards([]));
  }, []);

  const cards = rightsCards.length > 0 ? rightsCards : [
    { slug: 'rights-map', titleHe: 'מפת זכויות', titleEn: 'Rights map', descriptionHe: 'סקירה מרוכזת של סוגי הקצבאות, ההטבות והסייעות.', descriptionEn: 'Overview of benefits and allowances.' },
    { slug: 'questions-doctor', titleHe: 'מה לשאול את הרופא', titleEn: 'Questions for the doctor', descriptionHe: 'רשימת שאלות מומלצת לפגישה הבאה.', descriptionEn: 'Recommended questions for your next visit.' },
    { slug: 'important-forms', titleHe: 'טפסים שחשוב לשמור', titleEn: 'Important forms to keep', descriptionHe: 'מסמכים רפואיים ושחרורים.', descriptionEn: 'Medical documents and releases.' },
    { slug: 'committee-prep', titleHe: 'איך מתכוננים לוועדה', titleEn: 'Preparing for the committee', descriptionHe: 'טיפים ליום הוועדה.', descriptionEn: 'Tips for the committee day.' },
  ];

  const iconMap: Record<string, typeof Scale> = { 'rights-map': Scale, 'questions-doctor': Stethoscope, 'important-forms': FileText, 'committee-prep': HelpCircle };
  const details: Record<string, string[]> = {
    'rights-map': lang === 'he'
      ? ['מיפוי סוגי קצבאות (סיעוד, נכות, גמלת סיעוד).', 'בדיקת לאיזה גוף פונים (ביטוח לאומי, משרד הבריאות, קופת חולים).', 'מסמכים בסיסיים שיש להכין מראש.']
      : ['Map main benefit types.', 'Identify which authority is responsible.', 'List documents to prepare.'],
    'questions-doctor': lang === 'he'
      ? ['שאלות על האבחנה והמצב הקוגניטיבי.', 'שאלות על תרופות והשפעות לוואי.', 'מה חשוב שהמשפחה תעקוב אחרי הביקור.']
      : ['Diagnosis and cognitive status questions.', 'Medication and side‑effects.', 'What the family should monitor.'],
    'important-forms': lang === 'he'
      ? ['שחרור מבית חולים ומכתבי סיכום.', 'דו"חות בדיקות (MRI, CT, דם וכו\').', 'ייפוי כוח רפואי ואפוטרופסות (אם קיימים).']
      : ['Hospital discharge letters.', 'Test reports (MRI, CT, blood etc.).', 'Medical power of attorney if exists.'],
    'committee-prep': lang === 'he'
      ? ['מה להביא לוועדה (טפסים, חוות דעת).', 'איך לתאר את התפקוד היומיומי של המטופל.', 'מה קורה אחרי הוועדה ומה עושים אם נדחיתם.']
      : ['What to bring to the committee.', 'How to describe daily functioning.', 'What happens after and how to appeal.'],
  };

  const moreRights = lang === 'he'
    ? ['פטור/הנחה בארנונה', 'הנחות בתחבורה ציבורית', 'סיוע במימון מטפל/ת', 'זכויות במס הכנסה', 'שירותי שיקום בקהילה', 'סיוע בציוד עזר רפואי']
    : ['Property tax exemption', 'Public transport discounts', 'Caregiver funding', 'Tax benefits', 'Community rehab services', 'Medical equipment aid'];

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 shrink-0">
          <Scale className="h-5 w-5 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h2 className="page-title">{lang === 'he' ? 'מרכז זכויות' : 'Rights Center'}</h2>
          <p className="page-subtitle">
            {lang === 'he'
              ? 'מידע על זכויות, הטבות ומסמכים למשפחות מטפלות'
              : 'Information on rights, benefits and documents for caregiving families'}
          </p>
        </div>
      </div>

      {/* Maintenance notice */}
      <div className={`flex items-start gap-3 rounded-xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/8 px-4 py-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 text-sm">
          <span className="font-medium text-[hsl(var(--foreground))]">
            {lang === 'he'
              ? 'המידע עודכן לינואר 2026. '
              : 'Information last updated January 2026. '}
          </span>
          <span className="text-[hsl(var(--muted-foreground))]">
            {lang === 'he'
              ? 'זכויות וגמלאות עשויות להשתנות. בדקו תמיד מול הגורם הרשמי לפני נקיטת פעולה.'
              : 'Rights and benefits may change. Always verify with the official authority before taking action.'}
          </span>
          <a
            href="https://www.btl.gov.il"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 ms-1.5 font-medium text-[hsl(var(--primary))] hover:underline`}
          >
            {lang === 'he' ? 'אתר ביטוח לאומי' : 'National Insurance Institute'}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <section className="section-card">
        <div className="mb-4">
          <h3 className="section-title mb-1">{lang === 'he' ? 'הכנת זכויות' : 'Rights preparation'}</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {lang === 'he'
              ? 'להבין מה מגיע לכם, מאיפה מתחילים ואיזה מסמכים חשוב להכין.'
              : 'Understand your entitlements, where to start and which documents to prepare.'}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((r) => {
            const slug = r.slug ?? r.titleHe ?? r.titleEn ?? '';
            const title = lang === 'he' ? (r.titleHe ?? r.titleEn) : (r.titleEn ?? r.titleHe);
            const desc = lang === 'he' ? (r.descriptionHe ?? r.descriptionEn) : (r.descriptionEn ?? r.descriptionHe);
            const Icon = iconMap[slug] ?? Scale;
            const isOpen = expanded === slug;
            return (
              <article
                key={slug || title}
                className={`rounded-xl border bg-[hsl(var(--background))] p-4 transition-all ${
                  isOpen ? 'border-[hsl(var(--primary))]/40 shadow-md' : 'border-[hsl(var(--border))]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
                    <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm mb-1 text-[hsl(var(--foreground))]">{title}</h4>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{desc}</p>
                  </div>
                </div>
                {slug && details[slug] && (
                  <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]/50">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : slug)}
                      className="btn-outline h-8 px-3 text-xs w-full justify-center"
                    >
                      {isOpen
                        ? (lang === 'he' ? '▲ סגור מדריך' : '▲ Hide guide')
                        : (lang === 'he' ? '▼ פתח מדריך' : '▼ View guide')}
                    </button>
                    {isOpen && (
                      <ul className="mt-3 space-y-1.5">
                        {details[slug].map((line) => (
                          <li key={line} className="flex items-start gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                            <span className="text-[hsl(var(--primary))] mt-0.5 shrink-0">•</span>
                            {line}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-card">
        <h3 className="section-title mb-4">{lang === 'he' ? 'זכויות נוספות בקצרה' : 'More rights at a glance'}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {moreRights.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5"
            >
              <CheckSquare className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
              <span className="text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
          {lang === 'he'
            ? 'בדקו מול הרשות המקומית, קופת החולים או יועץ זכויות אם אתם זכאים להטבה.'
            : 'Check with your local authority, health fund or rights advisor for eligibility.'}
        </p>
      </section>

      {/* Report outdated info */}
      <div className={`flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <span className="text-[hsl(var(--muted-foreground))]">
          {lang === 'he'
            ? 'מצאת מידע שגוי או לא עדכני?'
            : 'Found outdated or incorrect information?'}
        </span>
        <a
          href="/support"
          className="font-medium text-[hsl(var(--primary))] hover:underline shrink-0"
        >
          {lang === 'he' ? 'דווח לצוות' : 'Report to team'}
        </a>
      </div>
    </div>
  );
}
