import {
  LayoutDashboard,
  Users,
  Home,
  FileText,
  Headphones,
  CreditCard,
  Flag,
  Package,
  Ticket,
  Database,
  AlertTriangle,
  MessageSquare,
  Activity,
  Shield,
  TrendingUp,
  BookOpen,
  Image,
  CheckCircle,
  Target,
  Calendar,
  Zap,
  DollarSign,
  Workflow,
  Layers,
  Plug,
  BarChart3,
  Lock,
  Bell,
  LayoutGrid,
  Repeat,
  GitBranch,
  Brain,
  HeartPulse,
  Cpu,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Home,
  FileText,
  Headphones,
  CreditCard,
  Flag,
  Package,
  Ticket,
  Database,
  AlertTriangle,
  MessageSquare,
  Activity,
  Shield,
  TrendingUp,
  BookOpen,
  Image,
  CheckCircle,
  Target,
  Calendar,
  Zap,
  DollarSign,
  Workflow,
  Layers,
  Plug,
  BarChart3,
  Lock,
  Bell,
  LayoutGrid,
  Repeat,
  GitBranch,
  Brain,
  HeartPulse,
  Cpu,
  Settings,
};

export type NavItem = { path: string; label: string; icon: LucideIcon };
export type NavSection = { id: string; label: string; items: NavItem[]; group?: 'product' | 'dev' };

/**
 * Sections split into two groups:
 *   "product" – product admin (users, support, subscriptions, content, monitoring)
 *   "dev"     – internal dev tooling (QA, sprints, pipelines, OKR, strategies)
 *
 * The AdminShell renders a divider + label between the two groups.
 */

export const SECTIONS: NavSection[] = [
  // ── Product Admin ──────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'לוח בקרה',
    group: 'product',
    items: [{ path: '/admin', label: 'דשבורד', icon: LayoutDashboard }],
  },
  {
    id: 'users',
    label: 'משתמשים ומשפחות',
    group: 'product',
    items: [
      { path: '/admin/families', label: 'משפחות', icon: Home },
      { path: '/admin/users', label: 'משתמשים', icon: Users },
    ],
  },
  {
    id: 'support',
    label: 'תמיכה',
    group: 'product',
    items: [{ path: '/admin/support', label: 'חיפוש לקוחות', icon: Headphones }],
  },
  {
    id: 'content',
    label: 'תוכן',
    group: 'product',
    items: [
      { path: '/admin/content/cms', label: 'CMS', icon: BookOpen },
      { path: '/admin/content/library', label: 'ספריית מדיה', icon: Image },
    ],
  },
  {
    id: 'sales',
    label: 'מכירות ופיננסים',
    group: 'product',
    items: [
      { path: '/admin/sales/reports', label: 'דוחות ואנליטיקה', icon: TrendingUp },
      { path: '/admin/analytics', label: 'אנליטיקה', icon: BarChart3 },
      { path: '/admin/subscriptions', label: 'מנויים', icon: CreditCard },
      { path: '/admin/plans', label: 'מסלולים וסליקות', icon: Package },
      { path: '/admin/finance', label: 'פיננסים', icon: DollarSign },
    ],
  },
  {
    id: 'marketing',
    label: 'שיווק',
    group: 'product',
    items: [
      { path: '/admin/plans/coupons', label: 'קודי קופון ומבצעים', icon: Ticket },
    ],
  },
  {
    id: 'medical',
    label: 'בריאות ורפואה',
    group: 'product',
    items: [
      { path: '/admin/medical-insights', label: 'תובנות רפואיות', icon: HeartPulse },
    ],
  },
  {
    id: 'comms',
    label: 'תקשורת ו-AI',
    group: 'product',
    items: [
      { path: '/admin/communication', label: 'מרכז תקשורת', icon: MessageSquare },
      { path: '/admin/notifications', label: 'ניהול התראות', icon: Bell },
      { path: '/admin/nexus', label: 'Nexus — ניירות מחקר', icon: Cpu },
      { path: '/admin/nexus/settings', label: 'Nexus — הגדרות', icon: Settings },
      { path: '/admin/ai', label: 'AI ואינטגרציות', icon: Activity },
      { path: '/admin/ai/project-analyze', label: 'ניתוח ותכנון (AI)', icon: Brain },
      { path: '/admin/integrations', label: 'אינטגרציות', icon: Plug },
    ],
  },
  {
    id: 'monitoring',
    label: 'ניטור ובקרה',
    group: 'product',
    items: [
      { path: '/admin/logs', label: 'יומן ביקורת', icon: FileText },
      { path: '/admin/data-center', label: 'מרכז נתונים', icon: Database },
      { path: '/admin/backups', label: 'גיבויים', icon: Database },
      { path: '/admin/security', label: 'אבטחה', icon: Lock },
    ],
  },

  // ── Dev Tools (internal) ───────────────────────────────────────
  {
    id: 'qa',
    label: 'בדיקות ו-QA',
    group: 'dev',
    items: [
      { path: '/admin/qa/control', label: 'חדר בקרה', icon: Activity },
      { path: '/admin/qa/runs', label: 'ריצות בדיקות', icon: Activity },
      { path: '/admin/qa/errors', label: 'שגיאות', icon: AlertTriangle },
      { path: '/admin/qa/data-quality', label: 'איכות נתונים', icon: CheckCircle },
      { path: '/admin/qa/flags', label: 'Feature Flags', icon: Flag },
      { path: '/admin/qa/versions', label: 'גרסאות', icon: Package },
    ],
  },
  {
    id: 'dev',
    label: 'פיתוח (DevOps)',
    group: 'dev',
    items: [
      { path: '/admin/dev/dashboard', label: 'Dashboard פיתוח', icon: BarChart3 },
      { path: '/admin/dev/kanban', label: 'Kanban פיתוח', icon: LayoutGrid },
      { path: '/admin/sprints', label: 'ספרינטים', icon: Repeat },
      { path: '/admin/pipelines', label: 'Pipelines', icon: GitBranch },
      { path: '/admin/settings/work-plan', label: 'תוכנית עבודה', icon: Calendar },
      { path: '/admin/settings/okr', label: 'OKR', icon: Target },
    ],
  },
  {
    id: 'settings',
    label: 'הגדרות מערכת',
    group: 'dev',
    items: [
      { path: '/admin/settings/audit', label: 'יומן ביקורת הגדרות', icon: FileText },
      { path: '/admin/settings/layer', label: 'שכבת ניהול', icon: Shield },
      { path: '/admin/settings/planner', label: 'מתכנן אוטומטי', icon: Zap },
      { path: '/admin/settings/strategies', label: 'אסטרטגיות', icon: Workflow },
      { path: '/admin/namespaces', label: 'מרחבי שמות', icon: Layers },
    ],
  },
];

export type Breadcrumb = { path: string; label: string };

export function getBreadcrumbs(path: string, detailLabel?: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ path: '/admin', label: 'לוח בקרה' }];
  if (path === '/admin' || path === '/admin/') {
    return crumbs;
  }

  if (path.includes('/phases/') && path.includes('task-summary')) {
    crumbs.push({ path: '/admin/sprints', label: 'ספרינטים' });
    crumbs.push({ path, label: detailLabel ?? 'סיכום משימות' });
    return crumbs;
  }

  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (path === item.path) {
        crumbs.push({ path: item.path, label: item.label });
        return crumbs;
      }
      if (item.path !== '/admin' && path.startsWith(item.path + '/')) {
        crumbs.push({ path: item.path, label: item.label });
        crumbs.push({ path, label: detailLabel ?? 'פרטים' });
        return crumbs;
      }
    }
  }
  return crumbs;
}

export function getSectionIndexForPath(sections: NavSection[], path: string): number {
  for (let i = 0; i < sections.length; i++) {
    const match = sections[i].items.some(
      (it) => path === it.path || (it.path !== '/admin' && path.startsWith(it.path))
    );
    if (match) return i;
  }
  return 0;
}

export function getAllNavItems(sections?: NavSection[]): NavItem[] {
  const s = sections ?? SECTIONS;
  return s.flatMap((sec) => sec.items);
}

export type NavSectionDTO = { id: string; label: string; items: { path: string; label: string; icon: string }[] };

export function dtoToNavSections(dto: NavSectionDTO[]): NavSection[] {
  return dto.map((sec) => ({
    id: sec.id,
    label: sec.label,
    items: sec.items.map((it) => ({
      path: it.path,
      label: it.label,
      icon: ICON_MAP[it.icon] ?? Package,
    })),
  }));
}
