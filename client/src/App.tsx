import React, { useEffect, useRef, useState } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { Menu, X, User, Bell, Settings, Key, LogOut, ChevronDown, Wifi,
  LayoutDashboard, UserRound, Activity, Droplets, FileText, Pill, CalendarDays,
  ClipboardList, BookHeart, ClipboardCheck, Inbox, LifeBuoy, Bot,
  Stethoscope, Scale, BarChart2, BookOpen, Clock, Users, FlaskConical,
  ArrowRightLeft, Heart, Brain, ChevronLeft, Briefcase
} from 'lucide-react';
import DashboardPage from './pages/Dashboard';
import PatientPage from './pages/Patient';
import TasksPage from './pages/Tasks';
import AvailabilityPage from './pages/Availability';
import FamilyPage from './pages/Family';
import FamilyPermissionsPage from './pages/FamilyPermissions';
import ProfilePage from './pages/Profile';
import NotificationsPage from './pages/Notifications';
import SettingsPage from './pages/Settings';
import ChangePasswordPage from './pages/ChangePassword';
import DoctorViewPage from './pages/DoctorView';
import DataStatsPage from './pages/DataStats';
import RightsCenterPage from './pages/RightsCenter';
import FamilyGuidePage from './pages/FamilyGuide';
import QuestionnairesPage from './pages/Questionnaires';
import MedicalDocumentsPage from './pages/MedicalDocuments';
import ProfessionalsPage from './pages/Professionals';
import MedicationsPage from './pages/Medications';
import MemoriesPage from './pages/Memories';
import VitalsPage from './pages/Vitals';
import LabResultsPage from './pages/LabResults';
import ReferralsPage from './pages/Referrals';
import AssessmentsPage from './pages/Assessments';
import HydrationPage from './pages/Hydration';
import AppointmentsPage from './pages/Appointments';
import InboxPage from './pages/Inbox';
import SupportPage from './pages/Support';
import AssistantPage from './pages/Assistant';
import LoginPage from './pages/Login';
import OnboardingPage from './pages/Onboarding';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import LandingPage from './Landing';
import FeaturesPage from './pages/Features';
import ResourcesPage from './pages/Resources';
import AboutPage from './pages/About';
import ContactPage from './pages/Contact';
import PricingPage from './pages/Pricing';
import AdminShell from './admin/AdminShell';
import ScrollToTop from './components/ScrollToTop';
import { I18nProvider, useI18n } from './i18n';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './hooks/useAuth';
import { useActiveFamily } from './hooks/useActiveFamily';
import { useNotificationBell } from './hooks/useNotificationBell';
import ErrorBoundary from './components/ErrorBoundary';

function AppShell() {
  const { lang, dir, setLang } = useI18n();
  const { user, loading, logout } = useAuth();
  const { families, activeFamilyId, activeFamily, setActiveFamily } = useActiveFamily();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      const redirect = encodeURIComponent(location || '/dashboard');
      navigate(`/login?redirect=${redirect}`);
    }
  }, [loading, user, location, navigate]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [familySwitcherOpen, setFamilySwitcherOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const familySwitcherRef = useRef<HTMLDivElement>(null);
  const { unreadCount, recent, refresh, markAsRead } = useNotificationBell();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(target)) setBellOpen(false);
      if (familySwitcherRef.current && !familySwitcherRef.current.contains(target)) setFamilySwitcherOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, bellOpen, familySwitcherOpen]);

  const roleLabel =
    lang === 'he'
      ? { manager: 'מנהל/ת משפחה', caregiver: 'מטפל/ת', viewer: 'צופה', guest: 'אורח' }[user?.role ?? 'viewer'] ?? user?.role
      : user?.role ?? '';

  async function handleLogout() {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  type NavItem = { href: string; he: string; en: string; Icon: React.ElementType };
  type NavGroup = { id: string; he: string; en: string; Icon: React.ElementType; items: NavItem[] };

  const NAV_GROUPS: NavGroup[] = [
    {
      id: 'main',
      he: 'ראשי',
      en: 'Main',
      Icon: LayoutDashboard,
      items: [
        { href: '/dashboard', he: 'לוח בקרה', en: 'Dashboard', Icon: LayoutDashboard },
      ],
    },
    {
      id: 'patient',
      he: 'מטופל',
      en: 'Patient',
      Icon: UserRound,
      items: [
        { href: '/patient', he: 'פרופיל מטופל', en: 'Patient Profile', Icon: UserRound },
        { href: '/vitals', he: 'מדדים', en: 'Vitals', Icon: Activity },
        { href: '/hydration', he: 'שתייה', en: 'Hydration', Icon: Droplets },
        { href: '/medications', he: 'תרופות', en: 'Medications', Icon: Pill },
        { href: '/appointments', he: 'ביקורי רופא', en: 'Doctor Visits', Icon: CalendarDays },
        { href: '/lab-results', he: 'בדיקות מעבדה', en: 'Lab Results', Icon: FlaskConical },
        { href: '/referrals', he: 'הפניות', en: 'Referrals', Icon: ArrowRightLeft },
        { href: '/assessments', he: 'הערכות', en: 'Assessments', Icon: Brain },
      ],
    },
    {
      id: 'care',
      he: 'ניהול טיפול',
      en: 'Care Management',
      Icon: ClipboardList,
      items: [
        { href: '/tasks', he: 'משימות', en: 'Tasks', Icon: ClipboardList },
        { href: '/availability', he: 'זמינויות', en: 'Availability', Icon: Clock },
        { href: '/questionnaires', he: 'שאלונים', en: 'Questionnaires', Icon: ClipboardCheck },
        { href: '/documents', he: 'מסמכים', en: 'Documents', Icon: FileText },
        { href: '/professionals', he: 'אנשי מקצוע', en: 'Professionals', Icon: Briefcase },
      ],
    },
    {
      id: 'family',
      he: 'משפחה',
      en: 'Family',
      Icon: Users,
      items: [
        { href: '/family', he: 'ניהול משפחה', en: 'Family Management', Icon: Users },
        { href: '/memories', he: 'זכרונות', en: 'Memories', Icon: BookHeart },
        { href: '/family-guide', he: 'מדריך', en: 'Family Guide', Icon: BookOpen },
      ],
    },
    {
      id: 'tools',
      he: 'כלים',
      en: 'Tools',
      Icon: Bot,
      items: [
        { href: '/assistant', he: 'עוזר AI', en: 'AI Assistant', Icon: Bot },
        { href: '/doctor-view', he: 'מבט רופא', en: 'Doctor View', Icon: Stethoscope },
        { href: '/rights', he: 'זכויות', en: 'Rights', Icon: Scale },
        { href: '/data', he: 'דוחות', en: 'Reports', Icon: BarChart2 },
      ],
    },
    {
      id: 'support',
      he: 'תמיכה',
      en: 'Support',
      Icon: LifeBuoy,
      items: [
        { href: '/inbox', he: 'הודעות', en: 'Inbox', Icon: Inbox },
        { href: '/support', he: 'תמיכה', en: 'Support', Icon: LifeBuoy },
      ],
    },
  ];

  const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => { defaults[g.id] = true; });
    return defaults;
  });

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-[hsl(var(--muted-foreground))] text-sm">טוען...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[hsl(var(--background))] font-[system-ui] text-[hsl(var(--foreground))]"
    >
      {/* Header – 3 אזורים: שמאל (לוגו) | אמצע (פעולות) | ימין (פרופיל) */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 backdrop-blur-sm">
        <div className="flex w-full items-center px-4 sm:px-5 py-2.5 gap-4" dir="ltr">
          {/* 1. שמאל – המבורגר (מובייל) + MemorAId */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background))] hover:text-[hsl(var(--foreground))]"
              aria-label={lang === 'he' ? 'תפריט' : 'Menu'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-[hsl(var(--primary))] tracking-tight truncate">MemorAId</h1>
          </div>

          {/* 2. אמצע – פעמון | מחובר/משפחה | EN – סגנון אחיד */}
          <div className={`flex items-center gap-2 flex-1 justify-center ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* כפתור פעמון */}
            <div className="relative shrink-0" ref={bellRef}>
              <button
                type="button"
                onClick={() => {
                  setBellOpen((o) => !o);
                  if (!bellOpen) refresh();
                }}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)] hover:text-[hsl(var(--foreground))]"
                aria-label={lang === 'he' ? 'התראות' : 'Notifications'}
                aria-expanded={bellOpen}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-[hsl(var(--destructive))] text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div
                  className={`absolute top-full mt-1 z-50 w-80 max-w-[90vw] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg overflow-hidden ${
                    dir === 'rtl' ? 'right-0' : 'left-0'
                  }`}
                  dir={dir}
                >
                  <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {lang === 'he' ? 'התראות' : 'Notifications'}
                    </span>
                    <Link href="/notifications" onClick={() => setBellOpen(false)}>
                      <span className="text-sm font-medium text-[hsl(var(--primary))] hover:underline">
                        {lang === 'he' ? 'מרכז התראות' : 'Notification center'}
                      </span>
                    </Link>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {recent.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-[hsl(var(--muted-foreground))] text-center">
                        {lang === 'he' ? 'אין התראות חדשות' : 'No new notifications'}
                      </p>
                    ) : (
                      recent.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (!n.readAt) markAsRead(n.id);
                            setBellOpen(false);
                            navigate('/notifications');
                          }}
                          className={`w-full px-4 py-3 text-start border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.3)] ${
                            !n.readAt ? 'bg-[hsl(var(--primary))/0.06)]' : ''
                          }`}
                        >
                          <div className="flex gap-2">
                            {!n.readAt && (
                              <span className="shrink-0 w-2 h-2 rounded-full bg-[hsl(var(--primary))] mt-1.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-[hsl(var(--foreground))] truncate">{n.title}</p>
                              {n.body && (
                                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">{n.body}</p>
                              )}
                              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                {new Date(n.createdAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
                    <Link href="/notifications" onClick={() => setBellOpen(false)}>
                      <span className="block text-center text-sm font-medium text-[hsl(var(--primary))] hover:underline">
                        {lang === 'he' ? 'לכל ההתראות' : 'View all notifications'}
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* כפתור שפה EN */}
            <button
              type="button"
              onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-semibold hover:opacity-90 shrink-0"
            >
              {lang === 'he' ? 'EN' : 'עברית'}
            </button>
          </div>

          {/* מחובר/משפחה – ליד הפרופיל (עם מתג משפחות כשמשתמש שייך למשפחות מרובות) */}
          <div className="relative hidden sm:block shrink-0" ref={familySwitcherRef}>
            {families.length > 1 ? (
              <button
                type="button"
                onClick={() => setFamilySwitcherOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-2.5 py-1.5 hover:bg-[hsl(var(--muted)/0.5)] ${
                  dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                }`}
                aria-expanded={familySwitcherOpen}
                aria-haspopup="listbox"
                title={lang === 'he' ? 'החלף משפחה' : 'Switch family'}
              >
                <Wifi className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
                <span className="text-xs font-medium text-[hsl(var(--foreground))] truncate max-w-[80px]">
                  {activeFamily?.familyName ?? user?.familyName ?? (lang === 'he' ? 'מחובר' : 'Connected')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] shrink-0 transition-transform ${familySwitcherOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <div
                className={`flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-2.5 py-1.5 ${
                  dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                }`}
                title={user?.familyName ? `${lang === 'he' ? 'משפחת' : 'Family'} ${user.familyName}` : (lang === 'he' ? 'מחובר' : 'Connected')}
              >
                <Wifi className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
                {user?.familyName ? (
                  <span className="text-xs font-medium text-[hsl(var(--foreground))] truncate max-w-[70px]">
                    {user.familyName}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-[hsl(var(--primary))]">
                    {lang === 'he' ? 'מחובר' : 'Connected'}
                  </span>
                )}
              </div>
            )}
            {familySwitcherOpen && families.length > 1 && (
              <div
                className={`absolute top-full mt-1 z-50 min-w-[140px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg py-1 ${
                  dir === 'rtl' ? 'right-0' : 'left-0'
                }`}
                role="listbox"
                dir={dir}
              >
                {families.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="option"
                    aria-selected={f.id === activeFamilyId}
                    onClick={async () => {
                      await setActiveFamily(f.id);
                      setFamilySwitcherOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-start text-sm hover:bg-[hsl(var(--muted)/0.5)] ${
                      f.id === activeFamilyId ? 'bg-[hsl(var(--primary))/0.1)] font-medium text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'
                    }`}
                  >
                    {f.familyName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. ימין – פרופיל (אבטאר + שם, בלי מעטפה) */}
          <div className="relative flex items-center shrink-0" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className={`flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-1.5 pl-2 pr-3 hover:bg-[hsl(var(--muted)/0.5)] ${
                dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
              }`}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-semibold text-[hsl(var(--muted-foreground))] overflow-hidden shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (user?.fullName ?? '')
                    .split(/\s+/)
                    .map((s) => s[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                )}
              </div>
              <div className={`hidden sm:block text-start ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                <p className="font-semibold text-sm text-[hsl(var(--foreground))] truncate max-w-[100px]">{user?.fullName}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{roleLabel}</p>
              </div>
            </button>

            {userMenuOpen && (
              <div
                className="absolute top-full mt-1 z-[70] right-0 w-72 min-w-[200px] max-w-[min(288px,90vw)] max-h-[min(70vh,400px)] overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg py-2"
                dir={dir}
                style={{ transformOrigin: 'top right' }}
              >
                <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-sm font-semibold text-[hsl(var(--muted-foreground))] overflow-hidden shrink-0">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (user?.fullName ?? '')
                          .split(/\s+/)
                          .map((s) => s[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[hsl(var(--foreground))]">{user?.fullName}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{roleLabel}</p>
                      <p className="text-sm text-[hsl(var(--foreground))] truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <nav className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))/0.5)]"
                  >
                    <User className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    {lang === 'he' ? 'הפרופיל שלי' : 'My Profile'}
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))/0.5)]"
                  >
                    <Bell className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    {lang === 'he' ? 'מרכז התראות' : 'Notification Center'}
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))/0.5)]"
                  >
                    <Settings className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    {lang === 'he' ? 'הגדרות' : 'Settings'}
                  </Link>
                  <Link
                    href="/change-password"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))/0.5)]"
                  >
                    <Key className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    {lang === 'he' ? 'שינוי סיסמא' : 'Change Password'}
                  </Link>
                </nav>
                <div className="border-t border-[hsl(var(--border))] pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/0.1)]"
                  >
                    <LogOut className="w-4 h-4" />
                    {lang === 'he' ? 'התנתקות' : 'Logout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* תפריט מובייל – overlay + פאנל */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-black/50"
            aria-label={lang === 'he' ? 'סגור תפריט' : 'Close menu'}
          />
          <div
            className={`absolute top-0 bottom-0 w-64 max-w-[85vw] bg-[hsl(var(--sidebar))] shadow-xl flex flex-col p-4 ${
              dir === 'rtl' ? 'right-0' : 'left-0'
            }`}
            dir={dir}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--sidebar-foreground))]/80">
                {lang === 'he' ? 'תפריט ראשי' : 'Main menu'}
              </span>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 rounded-lg text-[hsl(var(--sidebar-foreground))] hover:bg-white/10"
                aria-label={lang === 'he' ? 'סגור' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
              {NAV_GROUPS.map((group) => {
                const isGroupActive = group.items.some(
                  ({ href }) => location === href || (href !== '/dashboard' && location.startsWith(href))
                );
                const isExpanded = expandedGroups[group.id] ?? true;
                return (
                  <div key={group.id}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        isGroupActive ? 'text-white' : 'text-white/50'
                      } hover:text-white/80`}
                    >
                      <span>{lang === 'he' ? group.he : group.en}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="flex flex-col gap-0.5 mb-1">
                        {group.items.map(({ href, he, en, Icon }) => {
                          const isActive = location === href || (href !== '/dashboard' && location.startsWith(href));
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={closeMobileMenu}
                              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ms-2 ${
                                isActive
                                  ? 'bg-white/25 text-white font-semibold'
                                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              {lang === 'he' ? he : en}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            <p className="pt-4 border-t border-white/10 text-xs text-[hsl(var(--sidebar-foreground))]/70">
              {lang === 'he' ? 'פרופיל והתנתקות: לחץ על שמך בראש הדף' : 'Profile & logout: click your name at the top'}
            </p>
          </div>
        </div>
      )}

      <div
        className={`flex w-full px-4 sm:px-6 py-6 gap-6 items-start ${
          dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* תוכן פנימי – דשבורד, מטופל, משימות, משפחה */}
        <main className="flex-1 min-w-0 min-h-[calc(100vh-80px)]">
          <Switch>
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/patient" component={PatientPage} />
            <Route path="/doctor-view" component={DoctorViewPage} />
            <Route path="/data" component={DataStatsPage} />
            <Route path="/rights" component={RightsCenterPage} />
            <Route path="/family-guide" component={FamilyGuidePage} />
            <Route path="/questionnaires" component={QuestionnairesPage} />
            <Route path="/documents" component={MedicalDocumentsPage} />
            <Route path="/medical-documents" component={MedicalDocumentsPage} />
            <Route path="/professionals" component={ProfessionalsPage} />
            <Route path="/medications" component={MedicationsPage} />
            <Route path="/memories" component={MemoriesPage} />
            <Route path="/vitals" component={VitalsPage} />
            <Route path="/lab-results" component={LabResultsPage} />
            <Route path="/referrals" component={ReferralsPage} />
            <Route path="/assessments" component={AssessmentsPage} />
            <Route path="/hydration" component={HydrationPage} />
            <Route path="/appointments" component={AppointmentsPage} />
            <Route path="/inbox" component={InboxPage} />
            <Route path="/support" component={SupportPage} />
            <Route path="/assistant" component={AssistantPage} />
            <Route path="/tasks" component={TasksPage} />
            <Route path="/availability" component={AvailabilityPage} />
            <Route path="/family" component={FamilyPage} />
            <Route path="/family/permissions" component={FamilyPermissionsPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/notifications" component={NotificationsPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/change-password" component={ChangePasswordPage} />
            <Route>
              <DashboardPage />
            </Route>
          </Switch>
        </main>

        {/* Sidebar – קבוע מימין למסך */}
        <aside className="hidden w-60 shrink-0 rounded-2xl bg-[hsl(var(--sidebar))] p-3 text-sm text-[hsl(var(--sidebar-foreground))] shadow-lg md:flex md:flex-col md:items-stretch md:self-start sticky top-24 z-10 max-h-[calc(100vh-7rem)] overflow-y-auto">
          <nav className="space-y-0.5">
            {NAV_GROUPS.map((group) => {
              const isGroupActive = group.items.some(
                ({ href }) => location === href || (href !== '/dashboard' && location.startsWith(href))
              );
              const isExpanded = expandedGroups[group.id] ?? true;
              return (
                <div key={group.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all select-none ${
                      isGroupActive ? 'text-white' : 'text-white/45'
                    } hover:text-white/75`}
                  >
                    <span>{lang === 'he' ? group.he : group.en}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="mt-0.5 space-y-0.5">
                      {group.items.map(({ href, he, en, Icon }) => {
                        const isActive = location === href || (href !== '/dashboard' && location.startsWith(href));
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                              isActive
                                ? 'bg-white/25 text-white shadow-sm'
                                : 'text-white/75 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`} aria-hidden="true" />
                            {lang === 'he' ? he : en}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>
      </div>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
    <AuthProvider>
    <ToastProvider>
      <Router>
        <ScrollToTop />
        <Switch>
          {/* דפי חוץ – בלי התפריט הפנימי */}
          <Route path="/" component={LandingPage} />
          <Route path="/features" component={FeaturesPage} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/resources" component={ResourcesPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/onboarding" component={OnboardingPage} />

          {/* Admin – מרכז ניהול */}
          <Route path="/admin/login" component={AdminShell} />
          <Route path="/admin/data-center" component={AdminShell} />
          <Route path="/admin/communication" component={AdminShell} />
          <Route path="/admin/qa/control" component={AdminShell} />
          <Route path="/admin/qa/errors" component={AdminShell} />
          <Route path="/admin/settings/audit" component={AdminShell} />
          <Route path="/admin/settings/layer" component={AdminShell} />
          <Route path="/admin/sales/reports" component={AdminShell} />
          <Route path="/admin/content/cms" component={AdminShell} />
          <Route path="/admin/content/library" component={AdminShell} />
          <Route path="/admin/ai/project-analyze" component={AdminShell} />
          <Route path="/admin/ai" component={AdminShell} />
          <Route path="/admin/qa/runs" component={AdminShell} />
          <Route path="/admin/qa/data-quality" component={AdminShell} />
          <Route path="/admin/qa/flags" component={AdminShell} />
          <Route path="/admin/qa/versions" component={AdminShell} />
          <Route path="/admin/settings/okr" component={AdminShell} />
          <Route path="/admin/settings/work-plan" component={AdminShell} />
          <Route path="/admin/settings/planner" component={AdminShell} />
          <Route path="/admin/settings/strategies" component={AdminShell} />
          <Route path="/admin/pipelines/:id" component={AdminShell} />
      <Route path="/admin/pipelines" component={AdminShell} />
        <Route path="/admin/phases/:phaseId/task-summary" component={AdminShell} />
        <Route path="/admin/sprints/:id" component={AdminShell} />
        <Route path="/admin/sprints" component={AdminShell} />
        <Route path="/admin/dev/dashboard" component={AdminShell} />
        <Route path="/admin/dev/kanban" component={AdminShell} />
          <Route path="/admin/namespaces" component={AdminShell} />
          <Route path="/admin/integrations" component={AdminShell} />
          <Route path="/admin/analytics" component={AdminShell} />
          <Route path="/admin/backups" component={AdminShell} />
          <Route path="/admin/notifications" component={AdminShell} />
          <Route path="/admin/security" component={AdminShell} />
          <Route path="/admin/finance" component={AdminShell} />
          <Route path="/admin/families/:id" component={AdminShell} />
          <Route path="/admin/families" component={AdminShell} />
          <Route path="/admin/users/:id" component={AdminShell} />
          <Route path="/admin/users" component={AdminShell} />
          <Route path="/admin/logs" component={AdminShell} />
          <Route path="/admin/support" component={AdminShell} />
          <Route path="/admin/subscriptions" component={AdminShell} />
          <Route path="/admin/plans/coupons" component={AdminShell} />
          <Route path="/admin/plans/promotions" component={AdminShell} />
          <Route path="/admin/plans" component={AdminShell} />
          <Route path="/admin/nexus/settings" component={AdminShell} />
          <Route path="/admin/nexus/briefs/:id" component={AdminShell} />
          <Route path="/admin/nexus" component={AdminShell} />
          <Route path="/admin/medical-insights" component={AdminShell} />
          <Route path="/admin" component={AdminShell} />

          {/* כל שאר הנתיבים – נכנסים לתוך המערכת הפנימית עם Header + Sidebar */}
          <Route>
            <ErrorBoundary>
              <AppShell />
            </ErrorBoundary>
          </Route>
        </Switch>
      </Router>
    </ToastProvider>
    </AuthProvider>
    </I18nProvider>
  );
}

export default App;