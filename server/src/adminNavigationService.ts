export type NavItemDTO = { path: string; label: string; icon: string };
export type NavSectionDTO = { id: string; label: string; items: NavItemDTO[] };

const FULL_NAV: NavSectionDTO[] = [
  {
    id: 'dashboard',
    label: 'לוח בקרה',
    items: [{ path: '/admin', label: 'דשבורד', icon: 'LayoutDashboard' }],
  },
  {
    id: 'users',
    label: 'משתמשים ומשפחות',
    items: [
      { path: '/admin/families', label: 'משפחות', icon: 'Home' },
      { path: '/admin/users', label: 'משתמשים', icon: 'Users' },
    ],
  },
  {
    id: 'support',
    label: 'תמיכה',
    items: [{ path: '/admin/support', label: 'חיפוש לקוחות', icon: 'Headphones' }],
  },
  {
    id: 'content',
    label: 'תוכן',
    items: [
      { path: '/admin/content/cms', label: 'CMS', icon: 'BookOpen' },
      { path: '/admin/content/library', label: 'ספריית מדיה', icon: 'Image' },
    ],
  },
  {
    id: 'sales',
    label: 'מכירות ופיננסים',
    items: [
      { path: '/admin/sales/reports', label: 'דוחות ואנליטיקה', icon: 'TrendingUp' },
      { path: '/admin/analytics', label: 'אנליטיקה', icon: 'BarChart3' },
      { path: '/admin/subscriptions', label: 'מנויים', icon: 'CreditCard' },
      { path: '/admin/plans', label: 'מסלולים וסליקות', icon: 'Package' },
      { path: '/admin/plans/coupons', label: 'קודי קופון', icon: 'Package' },
      { path: '/admin/plans/promotions', label: 'מבצעים', icon: 'Package' },
      { path: '/admin/finance', label: 'פיננסים', icon: 'DollarSign' },
    ],
  },
  {
    id: 'marketing',
    label: 'שיווק',
    items: [
      { path: '/admin/plans/coupons', label: 'קודי קופון ומבצעים', icon: 'Ticket' },
    ],
  },
  {
    id: 'medical',
    label: 'בריאות ורפואה',
    items: [
      { path: '/admin/medical-insights', label: 'תובנות רפואיות', icon: 'HeartPulse' },
    ],
  },
  {
    id: 'comms',
    label: 'תקשורת ו-AI',
    items: [
      { path: '/admin/communication', label: 'מרכז תקשורת', icon: 'MessageSquare' },
      { path: '/admin/notifications', label: 'ניהול התראות', icon: 'Bell' },
      { path: '/admin/nexus', label: 'Nexus — ניירות מחקר', icon: 'Cpu' },
      { path: '/admin/nexus/settings', label: 'Nexus — הגדרות', icon: 'Settings' },
      { path: '/admin/ai', label: 'AI ואינטגרציות', icon: 'Activity' },
      { path: '/admin/ai/project-analyze', label: 'ניתוח ותכנון (AI)', icon: 'Brain' },
      { path: '/admin/integrations', label: 'אינטגרציות', icon: 'Plug' },
    ],
  },
  {
    id: 'monitoring',
    label: 'ניטור ובקרה',
    items: [
      { path: '/admin/logs', label: 'יומן ביקורת', icon: 'FileText' },
      { path: '/admin/data-center', label: 'מרכז נתונים', icon: 'Database' },
      { path: '/admin/backups', label: 'גיבויים', icon: 'Database' },
      { path: '/admin/security', label: 'אבטחה', icon: 'Lock' },
    ],
  },
  {
    id: 'qa',
    label: 'בדיקות ו-QA',
    items: [
      { path: '/admin/qa/control', label: 'חדר בקרה', icon: 'Activity' },
      { path: '/admin/qa/runs', label: 'ריצות בדיקות', icon: 'Activity' },
      { path: '/admin/qa/errors', label: 'שגיאות', icon: 'AlertTriangle' },
      { path: '/admin/qa/data-quality', label: 'איכות נתונים', icon: 'CheckCircle' },
      { path: '/admin/qa/flags', label: 'Feature Flags', icon: 'Flag' },
      { path: '/admin/qa/versions', label: 'גרסאות', icon: 'Package' },
    ],
  },
  {
    id: 'dev',
    label: 'פיתוח (DevOps)',
    roles: ['super_admin'],
    items: [
      { path: '/admin/dev/dashboard', label: 'Dashboard פיתוח', icon: 'BarChart3' },
      { path: '/admin/dev/kanban', label: 'Kanban פיתוח', icon: 'LayoutGrid' },
      { path: '/admin/sprints', label: 'ספרינטים', icon: 'Repeat' },
      { path: '/admin/pipelines', label: 'Pipelines', icon: 'GitBranch' },
      { path: '/admin/settings/work-plan', label: 'תוכנית עבודה', icon: 'Calendar' },
      { path: '/admin/settings/okr', label: 'OKR', icon: 'Target' },
    ],
  },
  {
    id: 'settings',
    label: 'הגדרות',
    roles: ['super_admin'],
    items: [
      { path: '/admin/settings/audit', label: 'יומן ביקורת הגדרות', icon: 'FileText' },
      { path: '/admin/settings/layer', label: 'שכבת ניהול', icon: 'Shield' },
      { path: '/admin/settings/planner', label: 'מתכנן אוטומטי', icon: 'Zap' },
      { path: '/admin/settings/strategies', label: 'אסטרטגיות', icon: 'Workflow' },
      { path: '/admin/namespaces', label: 'מרחבי שמות', icon: 'Layers' },
    ],
  },
];

type SectionWithRoles = NavSectionDTO & { roles?: string[] };

export function getNavigationForRole(role: string): { sections: NavSectionDTO[] } {
  const allowed = (role === 'super_admin' ? 'super_admin' : 'support') as string;
  const sections: NavSectionDTO[] = [];

  for (const section of FULL_NAV as SectionWithRoles[]) {
    const sectionRoles = section.roles ?? ['super_admin', 'support'];
    if (sectionRoles.includes(allowed)) {
      sections.push({
        id: section.id,
        label: section.label,
        items: section.items,
      });
    }
  }

  return { sections };
}
