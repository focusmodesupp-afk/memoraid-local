import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { PageHeader, SmartSection, EmptyInline } from '../components/ui';
import { ClipboardList, CalendarDays, FileText, Users, Plus, ChevronLeft, ArrowRightLeft, Send, CheckCircle2, Brain, AlertTriangle, Scale, Stethoscope } from 'lucide-react';

type CareStage = 'genetic_awareness' | 'suspicion' | 'bridge' | 'certainty';

const STAGE_BANNERS: Record<CareStage, {
  titleHe: string; titleEn: string;
  descHe: string; descEn: string;
  colorClass: string; bgClass: string; borderClass: string;
  actionsHe: string[]; actionsEn: string[];
}> = {
  genetic_awareness: {
    titleHe: 'מודעות גנטית — שלב ההכנה', titleEn: 'Genetic Awareness — Preparation Stage',
    descHe: 'יש היסטוריה משפחתית. המטופל תקין כיום. עכשיו הזמן להתכונן.',
    descEn: 'Family history exists. Patient is healthy now. Time to prepare.',
    colorClass: 'text-blue-800', bgClass: 'bg-blue-50', borderClass: 'border-blue-200',
    actionsHe: ['תעדו היסטוריה רפואית משפחתית', 'הכינו ייפוי כוח נוטריוני', 'קבעו הערכה קוגניטיבית בסיסית'],
    actionsEn: ['Document family medical history', 'Prepare power of attorney', 'Schedule baseline cognitive assessment'],
  },
  suspicion: {
    titleHe: 'שלב החשד — תיעוד ומעקב', titleEn: 'Suspicion Stage — Document & Monitor',
    descHe: 'שמים לב לשינויים. חשוב לתעד כל תצפית — זה יהיה הנתון לרופא.',
    descEn: 'Noticing changes. Document every observation — this becomes data for the doctor.',
    colorClass: 'text-amber-800', bgClass: 'bg-amber-50', borderClass: 'border-amber-200',
    actionsHe: ['תעדו תצפיות ביומן הקוגניטיבי', 'קבעו תור לרופא משפחה', 'שתפו בני משפחה במה שאתם רואים'],
    actionsEn: ['Log observations in the cognitive journal', 'Schedule family doctor appointment', 'Share observations with family'],
  },
  bridge: {
    titleHe: 'גשר לקשר — תיאום ובירור', titleEn: 'Bridge to Connection — Coordinate & Clarify',
    descHe: 'בתהליך בירור נוירולוגי. חשוב לתאם ולתעד לפני כל ביקור.',
    descEn: 'In neurological evaluation. Coordinate and document before each visit.',
    colorClass: 'text-purple-800', bgClass: 'bg-purple-50', borderClass: 'border-purple-200',
    actionsHe: ['הכינו שאלות לנוירולוג', 'חתמו על ייפוי כוח — דחוף!', 'סכמו תצפיות לביקור הקרוב'],
    actionsEn: ['Prepare questions for neurologist', 'Sign power of attorney — urgent!', 'Summarize observations for next visit'],
  },
  certainty: {
    titleHe: 'שלב הוודאות — ניהול שגרה', titleEn: 'Certainty Stage — Routine Management',
    descHe: 'יש אבחנה. המיקוד עובר לניהול יומיומי, בטיחות, ומיצוי זכויות.',
    descEn: 'Diagnosis confirmed. Focus shifts to daily management, safety, and rights.',
    colorClass: 'text-red-800', bgClass: 'bg-red-50', borderClass: 'border-red-200',
    actionsHe: ['עקבו אחר נטילת תרופות יומית', 'בדקו זכאות לקצבת סיעוד', 'הערכת בטיחות בבית'],
    actionsEn: ['Track daily medication intake', 'Check nursing benefit eligibility', 'Home safety assessment'],
  },
};

type DashboardData = {
  date: string;
  kpis: {
    tasksToday: number;
    newDocuments: number;
    activeMembers: number;
    nextVisit: { doctorName: string; date: string } | null;
  };
  urgentTasks: Array<{ id: string; title: string; priority: string; status: string; dueDate: string | null }>;
  nextAppointment: { doctorName: string; date: string } | null;
  recentDocuments: unknown[];
};

type HandoverNote = {
  note: string;
  author: string;
  createdAt: string;
};

export default function DashboardPage() {
  const { t, dir, lang } = useI18n();
  const [, navigate] = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [careStage, setCareStage] = useState<CareStage | null>(null);

  // Shift handover state
  const [handoverText, setHandoverText] = useState('');
  const [handoverNotes, setHandoverNotes] = useState<HandoverNote[]>([]);
  const [sendingHandover, setSendingHandover] = useState(false);
  const [handoverSent, setHandoverSent] = useState(false);
  const handoverRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    apiFetch<DashboardData>('/dashboard')
      .then(setData)
      .catch(() => setData(null));

    apiFetch<HandoverNote[]>('/handover/notes')
      .then(setHandoverNotes)
      .catch(() => setHandoverNotes([]));

    apiFetch<{ id: string; careStage?: string }>('/patients/primary')
      .then((p) => { if (p?.careStage) setCareStage(p.careStage as CareStage); })
      .catch(() => null);
  }, []);

  async function sendHandover() {
    if (!handoverText.trim()) return;
    setSendingHandover(true);
    try {
      await apiFetch('/handover/notes', {
        method: 'POST',
        body: JSON.stringify({ note: handoverText.trim() }),
      }).catch(() => null);

      const newNote: HandoverNote = {
        note: handoverText.trim(),
        author: lang === 'he' ? 'אתה' : 'You',
        createdAt: new Date().toISOString(),
      };
      setHandoverNotes((prev) => [newNote, ...prev.slice(0, 4)]);
      setHandoverText('');
      setHandoverSent(true);
      setTimeout(() => setHandoverSent(false), 3000);
    } finally {
      setSendingHandover(false);
    }
  }

  const tasksToday = data?.kpis?.tasksToday ?? 0;
  const newDocuments = data?.kpis?.newDocuments ?? 0;
  const activeMembers = data?.kpis?.activeMembers ?? 0;
  const nextVisit = data?.kpis?.nextVisit ?? null;

  function formatVisitDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return lang === 'he' ? 'היום' : 'Today';
    if (diffDays === 1) return lang === 'he' ? 'מחר' : 'Tomorrow';
    if (diffDays < 7) return lang === 'he' ? `בעוד ${diffDays} ימים` : `In ${diffDays} days`;
    return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en', { day: 'numeric', month: 'short' });
  }

  const kpiCards = [
    {
      label: lang === 'he' ? 'משימות היום' : 'Tasks today',
      value: data ? `${tasksToday}` : '—',
      icon: ClipboardList,
      color: 'text-[hsl(var(--primary))]',
      bg: 'bg-[hsl(var(--primary))]/10',
      href: '/tasks',
    },
    {
      label: lang === 'he' ? 'ביקור הבא' : 'Next visit',
      value: nextVisit ? formatVisitDate(nextVisit.date) : '—',
      sub: nextVisit?.doctorName ?? null,
      icon: CalendarDays,
      color: 'text-[hsl(var(--info))]',
      bg: 'bg-[hsl(var(--info))]/10',
      href: '/appointments',
    },
    {
      label: lang === 'he' ? 'מסמכים (7 ימים)' : 'Docs (7 days)',
      value: data ? `${newDocuments}` : '—',
      icon: FileText,
      color: 'text-[hsl(var(--success))]',
      bg: 'bg-[hsl(var(--success))]/10',
      href: '/documents',
    },
    {
      label: lang === 'he' ? 'חברי משפחה' : 'Family members',
      value: data ? `${activeMembers}` : '—',
      icon: Users,
      color: 'text-[hsl(var(--accent))]',
      bg: 'bg-[hsl(var(--accent))]/10',
      href: '/family',
    },
  ];

  return (
    <div dir={dir} className="space-y-6">
      <PageHeader
        title={t.dashboardTitle}
        subtitle={
          <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <span>{t.dashboardSubtitle}</span>
            <Link href="/data">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--primary))] hover:underline shrink-0">
                {lang === 'he' ? 'דוחות ומגמות היסטוריות' : 'Historical reports & trends'}
                <ChevronLeft className={`h-3 w-3 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
              </span>
            </Link>
          </span>
        }
        actions={
          <>
            <button className="btn-primary gap-1.5" onClick={() => navigate('/tasks')}>
              <Plus className="h-4 w-4" />
              {t.dashboardNewTask}
            </button>
            <button className="btn-outline" onClick={() => navigate('/availability')}>
              {t.dashboardNewAppointment}
            </button>
          </>
        }
      />

      {/* Care stage context banner — or stage picker if not set */}
      {!careStage && (
        <CareStagePickerCard lang={lang} dir={dir} onSelect={async (stage) => {
          try {
            const primary = await apiFetch<{ id: string; careStage?: string }>('/patients/primary').catch(() => null);
            if (!primary?.id) {
              // No patient yet — go create one (stage selector is on that page)
              navigate('/patient');
              return;
            }
            await apiFetch(`/patients/${primary.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ careStage: stage }),
            });
            setCareStage(stage);
          } catch (e) {
            console.error('[careStage] failed to save:', e);
          }
        }} />
      )}
      {careStage && STAGE_BANNERS[careStage] && (() => {
        const banner = STAGE_BANNERS[careStage];
        return (
          <div className={`rounded-xl border p-4 ${banner.bgClass} ${banner.borderClass}`}>
            <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Brain className={`w-5 h-5 mt-0.5 shrink-0 ${banner.colorClass}`} />
              <div className="flex-1 min-w-0">
                <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <h3 className={`text-sm font-semibold ${banner.colorClass}`}>
                    {lang === 'he' ? banner.titleHe : banner.titleEn}
                  </h3>
                  <Link href="/patient">
                    <span className={`text-xs hover:underline cursor-pointer ${banner.colorClass} opacity-70`}>
                      {lang === 'he' ? '(שנה שלב)' : '(change stage)'}
                    </span>
                  </Link>
                </div>
                <p className={`text-xs mt-0.5 ${banner.colorClass} opacity-80`}>
                  {lang === 'he' ? banner.descHe : banner.descEn}
                </p>
                <ul className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 ${dir === 'rtl' ? 'justify-end' : ''}`}>
                  {(lang === 'he' ? banner.actionsHe : banner.actionsEn).map((action, i) => (
                    <li key={i} className={`flex items-center gap-1 text-xs ${banner.colorClass} opacity-90 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* KPI stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map(({ label, value, sub, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <div className="stat-card cursor-pointer hover:shadow-md transition-shadow group">
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="stat-value">{value}</span>
              <span className="stat-label group-hover:text-[hsl(var(--primary))] transition-colors">{label}</span>
              {sub && <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate w-full">{sub}</span>}
            </div>
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-5">
          <SmartSection
            title={lang === 'he' ? 'משימות דחופות' : 'Urgent tasks'}
            variant="card"
          >
            {(data?.urgentTasks ?? []).length === 0 ? (
              <EmptyInline text={t.emptyUrgentTasks} />
            ) : (
              <div className="space-y-2">
                {data!.urgentTasks.map((task) => (
                  <Link key={task.id} href="/tasks">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[hsl(var(--muted))]/50 cursor-pointer">
                      <span className={`inline-flex shrink-0 w-2 h-2 rounded-full ${
                        task.priority === 'urgent' ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--warning))]'
                      }`} />
                      <span className="text-sm text-[hsl(var(--foreground))] truncate flex-1">{task.title}</span>
                      {task.dueDate && (
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0">
                          {new Date(task.dueDate).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SmartSection>

          {/* Shift handover */}
          <div className="section-card space-y-3">
            <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--accent))]/15 flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4 text-[hsl(var(--accent))]" />
              </div>
              <div>
                <h3 className="section-title">
                  {lang === 'he' ? 'מסירת משמרת' : 'Shift handover'}
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {lang === 'he'
                    ? 'מה חשוב שהמטפל הבא יידע?'
                    : 'What should the next caregiver know?'}
                </p>
              </div>
            </div>

            <textarea
              ref={handoverRef}
              value={handoverText}
              onChange={(e) => setHandoverText(e.target.value)}
              rows={3}
              className="input-base resize-none text-sm w-full"
              placeholder={
                lang === 'he'
                  ? 'לדוגמה: אמא ישנה גרוע הלילה, לא אכלה ארוחת בוקר, לחץ דם 145/90 בבוקר...'
                  : 'e.g. Mom slept poorly, skipped breakfast, BP 145/90 this morning...'
              }
            />

            <div className={`flex items-center justify-between gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              {handoverSent ? (
                <span className="flex items-center gap-1.5 text-sm text-[hsl(var(--success))] font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {lang === 'he' ? 'נשלח לצוות!' : 'Sent to team!'}
                </span>
              ) : (
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'כל בני המשפחה יראו את ההערה' : 'All family members will see this note'}
                </span>
              )}
              <button
                type="button"
                onClick={sendHandover}
                disabled={sendingHandover || !handoverText.trim()}
                className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-40"
              >
                {sendingHandover ? (
                  lang === 'he' ? 'שולח...' : 'Sending...'
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {lang === 'he' ? 'שלח לצוות' : 'Send to team'}
                  </>
                )}
              </button>
            </div>

            {/* Recent handover notes */}
            {handoverNotes.length > 0 && (
              <div className="mt-2 space-y-2 border-t border-[hsl(var(--border))] pt-3">
                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'הערות קודמות' : 'Previous notes'}
                </p>
                {handoverNotes.slice(0, 3).map((n, i) => (
                  <div key={i} className="rounded-lg bg-[hsl(var(--muted))]/40 px-3 py-2">
                    <p className="text-sm text-[hsl(var(--foreground))]">{n.note}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {n.author} · {new Date(n.createdAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SmartSection
              title={lang === 'he' ? 'הביקור הבא' : 'Next visit'}
              variant="card"
            >
              <EmptyInline text={t.emptyNextVisit} />
            </SmartSection>

            <SmartSection
              title={lang === 'he' ? 'מסמכים אחרונים' : 'Recent documents'}
              variant="card"
            >
              <EmptyInline text={t.emptyRecentDocs} />
            </SmartSection>
          </div>
        </div>

        {/* Right sidebar column */}
        <aside className="space-y-4">
          {/* Patient quick link */}
          <div className="section-card">
            <p className="section-label mb-2">{lang === 'he' ? 'מטופל מרכזי' : 'Primary patient'}</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">{t.emptyPatient}</p>
            <Link href="/patient">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:underline">
                {lang === 'he' ? 'לפרופיל המטופל' : 'Patient profile'}
                <ChevronLeft className={`h-3.5 w-3.5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
              </span>
            </Link>
          </div>

          <SmartSection
            title={lang === 'he' ? 'הצוות המטפל' : 'Care team'}
            variant="card"
          >
            <EmptyInline text={t.emptyTeam} />
          </SmartSection>

          <SmartSection
            title={lang === 'he' ? 'פעילות אחרונה' : 'Recent activity'}
            variant="card"
          >
            <EmptyInline text={t.emptyActivity} />
          </SmartSection>
        </aside>
      </div>
    </div>
  );
}

// ─── Care stage picker card (shown when no stage is set) ────────────────────

const PICKER_STAGES = [
  { id: 'genetic_awareness' as CareStage, emoji: '🧬', titleHe: 'מודעות גנטית', titleEn: 'Genetic Awareness', descHe: 'יש היסטוריה משפחתית, המטופל עדיין תקין', descEn: 'Family history exists, patient still healthy' },
  { id: 'suspicion' as CareStage, emoji: '🔍', titleHe: 'שלב החשד', titleEn: 'Suspicion Stage', descHe: 'שמים לב לשינויים, טרם אבחנה', descEn: 'Noticing changes, no diagnosis yet' },
  { id: 'bridge' as CareStage, emoji: '🏥', titleHe: 'גשר לקשר', titleEn: 'Bridge Stage', descHe: 'בבירור נוירולוגי ובדיקות', descEn: 'In neurological evaluation & tests' },
  { id: 'certainty' as CareStage, emoji: '📋', titleHe: 'שלב הוודאות', titleEn: 'Certainty Stage', descHe: 'יש אבחנה רשמית', descEn: 'Official diagnosis received' },
];

function CareStagePickerCard({ lang, dir, onSelect }: { lang: string; dir: string; onSelect: (stage: CareStage) => void }) {
  const [saving, setSaving] = useState<CareStage | null>(null);

  async function pick(stage: CareStage) {
    setSaving(stage);
    await onSelect(stage);
    setSaving(null);
  }

  return (
    <div dir={dir} className="rounded-xl border-2 border-dashed border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/3 p-5">
      <div className={`flex items-center gap-2 mb-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Brain className="w-5 h-5 text-[hsl(var(--primary))]" />
        <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">
          {lang === 'he' ? 'באיזה שלב אתם? — נתאים את MEMORAID בשבילכם' : 'What stage are you in? — We\'ll tailor MEMORAID for you'}
        </h3>
      </div>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4 ms-7">
        {lang === 'he' ? 'בחרו את המצב המתאים ביותר למטופל שלכם כרגע' : 'Select the stage that best describes your patient\'s current situation'}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PICKER_STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={saving !== null}
            onClick={() => pick(s.id)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-4 text-center hover:border-[hsl(var(--primary))]/60 hover:bg-[hsl(var(--primary))]/5 transition-all disabled:opacity-60 group"
          >
            <span className="text-2xl">{saving === s.id ? '⏳' : s.emoji}</span>
            <span className="text-xs font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
              {lang === 'he' ? s.titleHe : s.titleEn}
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">
              {lang === 'he' ? s.descHe : s.descEn}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
