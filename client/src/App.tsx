import { Link, Route, Router, Switch } from 'wouter';
import DashboardPage from './pages/Dashboard';
import PatientPage from './pages/Patient';
import TasksPage from './pages/Tasks';
import FamilyPage from './pages/Family';
import LoginPage from './pages/Login';
import OnboardingPage from './pages/Onboarding';
import LandingPage from './Landing';
import FeaturesPage from './pages/Features';
import ResourcesPage from './pages/Resources';
import AboutPage from './pages/About';
import ContactPage from './pages/Contact';
import PricingPage from './pages/Pricing';
import { I18nProvider, useI18n } from './i18n';

function AppShell() {
  const { lang, dir, t, setLang } = useI18n();

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[hsl(var(--background))] font-[system-ui] text-[hsl(var(--foreground))]"
    >
      {/* Header של המערכת הפנימית בלבד */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 backdrop-blur-sm">
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between px-4 py-3 gap-3 ${
            dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <h1 className="text-lg font-semibold tracking-tight">{t.appTitle}</h1>
          <div className="flex items-center gap-3">
            <nav className="hidden gap-4 text-sm text-[hsl(var(--muted-foreground))] md:flex">
              <Link href="/dashboard" className="hover:text-[hsl(var(--foreground))]">
                {t.navDashboard}
              </Link>
              <Link href="/patient" className="hover:text-[hsl(var(--foreground))]">
                {t.navPatient}
              </Link>
              <Link href="/tasks" className="hover:text-[hsl(var(--foreground))]">
                {t.navTasks}
              </Link>
              <Link href="/family" className="hover:text-[hsl(var(--foreground))]">
                {t.navFamily}
              </Link>
            </nav>
            <button
              type="button"
              onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
              className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background))]"
            >
              {lang === 'he' ? 'English' : 'עברית'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl px-4 py-4 gap-4">
        {/* תוכן פנימי – דשבורד, מטופל, משימות, משפחה */}
        <main className="flex-1">
          <Switch>
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/patient" component={PatientPage} />
            <Route path="/tasks" component={TasksPage} />
            <Route path="/family" component={FamilyPage} />
            {/* ברירת מחדל בתוך המערכת הפנימית */}
            <Route>
              <DashboardPage />
            </Route>
          </Switch>
        </main>

        {/* Sidebar – קבוע מימין למסך */}
        <aside className="hidden w-60 shrink-0 rounded-2xl bg-[hsl(var(--sidebar))] p-4 text-sm text-[hsl(var(--sidebar-foreground))] shadow-lg md:flex md:flex-col md:items-stretch">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--sidebar-foreground))]/80">
            {lang === 'he' ? 'תפריט ראשי' : 'Main menu'}
          </p>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
            >
              {lang === 'he' ? 'לוח בקרה יומי' : 'Daily dashboard'}
            </Link>
            <Link
              href="/patient"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
            >
              {lang === 'he' ? 'פרופיל מטופל' : 'Patient profile'}
            </Link>
            <Link
              href="/tasks"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
            >
              {lang === 'he' ? 'משימות טיפול' : 'Care tasks'}
            </Link>
            <Link
              href="/family"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
            >
              {lang === 'he' ? 'ניהול משפחה' : 'Family management'}
            </Link>
          </nav>

          {/* כפתור יציאה – חזרה לדף הנחיתה */}
          <div className="mt-auto pt-4 border-t border-white/10">
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-xs text-[hsl(var(--sidebar-foreground))]/80 hover:bg-white/10"
            >
              יציאה / דף ראשי
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <Router>
        <Switch>
          {/* דפי חוץ – בלי התפריט הפנימי */}
          <Route path="/" component={LandingPage} />
          <Route path="/features" component={FeaturesPage} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/resources" component={ResourcesPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/onboarding" component={OnboardingPage} />

          {/* כל שאר הנתיבים – נכנסים לתוך המערכת הפנימית עם Header + Sidebar */}
          <Route>
            <AppShell />
          </Route>
        </Switch>
      </Router>
    </I18nProvider>
  );
}

export default App;