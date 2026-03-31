import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export type Lang = 'he' | 'en';

type Messages = {
  appTitle: string;
  navDashboard: string;
  navPatient: string;
  navTasks: string;
  navFamily: string;
  navLogin: string;

  dashboardTitle: string;
  dashboardSubtitle: string;
  dashboardNewTask: string;
  dashboardNewAppointment: string;
  dashboardUploadDoc: string;
  kpiTasksToday: string;
  kpiNextVisit: string;
  kpiNewDocs: string;
  kpiActiveMembers: string;
  emptyUrgentTasks: string;
  emptyNextVisit: string;
  emptyRecentDocs: string;
  emptyPatient: string;
  emptyTeam: string;
  emptyActivity: string;
};

const messages: Record<Lang, Messages> = {
  he: {
    appTitle: 'MemorAId — טיפול משפחתי מתואם',
    navDashboard: 'לוח בקרה',
    navPatient: 'מטופל',
    navTasks: 'משימות',
    navFamily: 'משפחה',
    navLogin: 'כניסה / החלפת משתמש',

    dashboardTitle: 'לוח בקרה יומי',
    dashboardSubtitle: 'תמונת מצב של המשימות, הביקורים והמסמכים של היום.',
    dashboardNewTask: 'משימה חדשה',
    dashboardNewAppointment: 'תור חדש',
    dashboardUploadDoc: 'העלאת מסמך',
    kpiTasksToday: 'משימות היום',
    kpiNextVisit: 'ביקור קרוב',
    kpiNewDocs: 'מסמכים חדשים',
    kpiActiveMembers: 'חברי צוות פעילים',
    emptyUrgentTasks: 'עדיין אין משימות דחופות. זה זמן טוב להוסיף משימה ראשונה.',
    emptyNextVisit: 'עדיין לא נקבע ביקור. אפשר ליצור תור חדש ממש כאן.',
    emptyRecentDocs: 'מסמכים שיועלו יופיעו כאן לסקירה מהירה.',
    emptyPatient: 'עדיין לא הוגדר מטופל',
    emptyTeam: 'חברי צוות ומשפחה שיוזמנו יופיעו כאן עם תפקיד וצבע badge.',
    emptyActivity: 'כשהתחילו להתבצע משימות, תורים ומסמכים – ציר הזמן הקצר יוצג כאן.',
  },
  en: {
    appTitle: 'MemorAId — Coordinated Family Care',
    navDashboard: 'Dashboard',
    navPatient: 'Patient',
    navTasks: 'Tasks',
    navFamily: 'Family',
    navLogin: 'Login / Switch user',

    dashboardTitle: 'Daily Dashboard',
    dashboardSubtitle: 'Snapshot of today’s tasks, visits and documents.',
    dashboardNewTask: 'New task',
    dashboardNewAppointment: 'New appointment',
    dashboardUploadDoc: 'Upload document',
    kpiTasksToday: 'Tasks today',
    kpiNextVisit: 'Next visit',
    kpiNewDocs: 'New documents',
    kpiActiveMembers: 'Active team members',
    emptyUrgentTasks: 'No urgent tasks yet. Great time to add your first task.',
    emptyNextVisit: 'No upcoming visit. You can create one here.',
    emptyRecentDocs: 'Uploaded documents will appear here for quick review.',
    emptyPatient: 'Primary patient is not defined yet.',
    emptyTeam: 'Invited family members and caregivers will appear here with their roles.',
    emptyActivity: 'Once activity starts, a short timeline will appear here.',
  },
};

type I18nContextValue = {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  t: Messages;
  setLang: (lang: Lang) => void;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('he');

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir: lang === 'he' ? 'rtl' : 'ltr',
      t: messages[lang],
      setLang,
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

