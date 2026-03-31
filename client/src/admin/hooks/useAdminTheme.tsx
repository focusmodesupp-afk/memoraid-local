import React, { createContext, useContext, useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'memoraid_admin_theme';

export type AdminTheme = 'dark' | 'light';

type AdminThemeContextValue = {
  theme: AdminTheme;
  setTheme: (t: AdminTheme) => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function applyThemeToDOM(theme: AdminTheme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  document.documentElement.setAttribute('data-admin-theme', theme);
  document.body.setAttribute('data-admin-theme', theme);
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
  });

  function setTheme(t: AdminTheme) {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyThemeToDOM(t); // Apply immediately, don't wait for effect
  }

  useLayoutEffect(() => {
    applyThemeToDOM(theme);
    return () => {
      document.documentElement.removeAttribute('data-admin-theme');
      document.body.removeAttribute('data-admin-theme');
    };
  }, [theme]);

  return (
    <AdminThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error('useAdminTheme must be used within AdminThemeProvider');
  return ctx;
}
