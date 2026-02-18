import { useI18n } from '../i18n';
import { useLocation } from 'wouter';

export default function DashboardPage() {
  const { t, dir } = useI18n();
  const [, navigate] = useLocation();

  return (
    <div dir={dir} className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t.dashboardTitle}</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{t.dashboardSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs md:text-sm">
          <button
            className="btn-primary"
            onClick={() => navigate('/tasks')}
          >
            {t.dashboardNewTask}
          </button>
          <button className="btn-outline">
            {t.dashboardNewAppointment}
          </button>
          <button className="btn-outline">
            {t.dashboardUploadDoc}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <section className="grid gap-3 md:grid-cols-4">
        <KpiCard label={t.kpiTasksToday} value="0 / 0" />
        <KpiCard label={t.kpiNextVisit} value="—" />
        <KpiCard label={t.kpiNewDocs} value="0" />
        <KpiCard label={t.kpiActiveMembers} value="0" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* מרכזי */}
        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {dir === 'rtl' ? '5 המשימות הדחופות ביותר' : 'Top 5 urgent tasks'}
              </h3>
              <span className="text-xs text-slate-500">
                {dir === 'rtl'
                  ? 'מבוסס על עדיפות ותאריך יעד'
                  : 'Based on priority and due date'}
              </span>
            </div>
            <EmptyState text={t.emptyUrgentTasks} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                {dir === 'rtl' ? 'הביקור הרפואי הבא' : 'Next medical visit'}
              </h3>
              <EmptyState text={t.emptyNextVisit} />
            </div>

            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                {dir === 'rtl' ? 'מסמכים אחרונים' : 'Recent documents'}
              </h3>
              <EmptyState text={t.emptyRecentDocs} />
            </div>
          </div>
        </div>

        {/* צד ימין – פרופיל + צוות + פעילות */}
        <aside className="space-y-4">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              {dir === 'rtl' ? 'מטופל מרכזי' : 'Primary patient'}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-base font-semibold text-slate-700">
                🧑‍🦳
              </div>
              <div>
                <p className="font-medium text-slate-900">{t.emptyPatient}</p>
                <p className="text-xs text-slate-600">
                  {dir === 'rtl'
                    ? 'בתפריט "פרופיל מטופל" ניתן להגדיר שם, גיל ותמונה.'
                    : 'Use the Patient Profile page to set name, age and photo.'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              {dir === 'rtl' ? 'הצוות המטפל' : 'Care team'}
            </h3>
            <EmptyState text={t.emptyTeam} />
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              {dir === 'rtl' ? 'פעילות אחרונה' : 'Recent activity'}
            </h3>
            <EmptyState text={t.emptyActivity} />
          </div>
        </aside>
      </section>
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
};

function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] opacity-80">{hint}</p>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{text}</p>
    </div>
  );
}

