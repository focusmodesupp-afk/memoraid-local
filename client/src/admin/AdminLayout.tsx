import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, ChevronLeft, LogOut, Sun, Moon } from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useAdminTheme } from './hooks/useAdminTheme';
import { useAdminNavigation } from './hooks/useAdminNavigation';
import { getSectionIndexForPath } from './adminNavConfig';
import { AdminBreadcrumbs } from './components/AdminBreadcrumbs';
import { AdminNavSearch } from './components/AdminNavSearch';
import { AdminErrorBoundary } from './components/AdminErrorBoundary';

const NAV_STORAGE_KEY = 'admin-nav-open-sections';

function loadOpenSections(sectionCount: number, activeIdx: number): Record<number, boolean> {
  try {
    const raw = sessionStorage.getItem(NAV_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      const out: Record<number, boolean> = {};
      for (let i = 0; i < sectionCount; i++) {
        const key = String(i);
        out[i] = parsed[key] ?? i === activeIdx;
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  const out: Record<number, boolean> = {};
  for (let i = 0; i < sectionCount; i++) {
    out[i] = i === activeIdx;
  }
  return out;
}

function saveOpenSections(state: Record<number, boolean>) {
  try {
    sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { admin, logout } = useAdminAuth();
  const { theme, setTheme } = useAdminTheme();
  const sections = useAdminNavigation();
  const mainRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeSectionIdx = useMemo(() => getSectionIndexForPath(sections, location), [sections, location]);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>(() =>
    loadOpenSections(sections.length, activeSectionIdx)
  );

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      next[activeSectionIdx] = true;
      saveOpenSections(next);
      return next;
    });
  }, [activeSectionIdx]);

  function toggleSection(idx: number) {
    setOpenSections((prev) => {
      const next = { ...prev, [idx]: !prev[idx] };
      saveOpenSections(next);
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  if (!admin) return null;

  return (
    <div dir="rtl" data-admin-theme={theme} className="admin-theme-root min-h-screen flex bg-slate-900 text-slate-100">
      {/* Sidebar - Original dark design */}
      <aside
        className={`admin-sidebar ${
          sidebarOpen ? 'w-64' : 'w-16'
        } flex flex-col border-l border-slate-600 backdrop-blur-sm transition-all duration-200 shadow-lg`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-600">
          {sidebarOpen && (
            <div>
              <h2 className="font-bold text-indigo-400">MemorAid</h2>
              <p className="text-xs text-slate-400">מרכז ניהול</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        <AdminNavSearch sidebarOpen={sidebarOpen} sections={sections} />

        <nav className="flex-1 p-2 overflow-y-auto">
          {sidebarOpen &&
            sections.map((section, idx) => {
              const prevSection = idx > 0 ? sections[idx - 1] : null;
              const showDevDivider = section.group === 'dev' && prevSection?.group === 'product';
              return (
                <div key={section.id}>
                  {/* Divider between product admin and dev tools */}
                  {showDevDivider && (
                    <div className="my-3 mx-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-600/60" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
                          Dev Tools
                        </span>
                        <div className="flex-1 h-px bg-slate-600/60" />
                      </div>
                      <p className="text-[10px] text-slate-600 text-center mt-0.5">
                        כלים פנימיים לפיתוח ותפעול
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => toggleSection(idx)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      section.group === 'dev'
                        ? 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-400'
                        : 'text-slate-300 hover:bg-slate-700/80 hover:text-slate-200'
                    }`}
                  >
                    <ChevronDown className={`w-4 h-4 transition ${openSections[idx] !== false ? '' : '-rotate-90'}`} />
                    {section.label}
                  </button>
                  {openSections[idx] !== false && (
                    <div className="mr-4 mt-1 space-y-0.5">
                      {section.items.map(({ path, label, icon: Icon }) => (
                        <Link
                          key={path}
                          href={path}
                          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                            location === path || (path !== '/admin' && location.startsWith(path))
                              ? 'bg-indigo-500/20 text-indigo-400 border-r-2 border-indigo-500'
                              : section.group === 'dev'
                              ? 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-400'
                              : 'text-slate-400 hover:bg-slate-700/80 hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>

        <div className="p-2 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-slate-200 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && 'התנתקות'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main ref={mainRef} className="flex-1 overflow-auto">
        <header className="admin-header sticky top-0 z-10 px-6 py-3 border-b backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <AdminBreadcrumbs />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-slate-400">{admin.email}</span>
              <div className="flex items-center gap-0.5 p-1 rounded-lg bg-slate-700/80">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-slate-600 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  title="מצב בהיר"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-slate-600 text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  title="מצב כהה"
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs px-2 py-1 rounded-lg bg-slate-700/80 text-slate-300 border border-slate-600">
                {admin.role === 'super_admin' ? 'Super Admin' : 'Support'}
              </span>
            </div>
          </div>
        </header>
        <div className="admin-content p-6">
          <AdminErrorBoundary>{children}</AdminErrorBoundary>
        </div>
      </main>
    </div>
  );
}
