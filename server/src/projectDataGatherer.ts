/**
 * Project Data Gatherer – collects rich project context for Claude analysis.
 * Reads from filesystem (process.cwd() = project root).
 * Query-aware: loads admin/AI context when question relates to admin, navigation, UX, etc.
 */
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

export type Depth = 'quick' | 'deep' | 'full';
export type Scope = 'all' | 'client' | 'server';

export type GatherOptions = {
  depth?: Depth;
  scope?: Scope;
  /** When provided, enables query-aware loading (e.g. admin context for admin/navigation questions) */
  query?: string;
};

const ROOT = process.cwd();

// Line limits per file type – strategic for depth
const LIMITS = {
  quick: { schema: 200, routes: 80, adminRoutes: 80, app: 80, default: 80 },
  deep: { schema: 500, routes: 250, adminRoutes: 450, app: 200, default: 200 },
  full: { schema: undefined, routes: 400, adminRoutes: 700, app: 300, default: 300 },
} as const;

/** Keywords that trigger admin-context loading */
const ADMIN_KEYWORDS = [
  'אדמין', 'admin', 'ניווט', 'navigation', 'תפריט', 'menu', 'סיידבר', 'sidebar',
  'ממשק', 'UX', 'חוויה', 'דשבורד', 'dashboard', 'לוח בקרה',
  'הגדרות', 'settings', 'ניהול משתמשים', 'משפחות', 'תמיכה',
  'מדיה', 'media', 'העלאת קבצים', 'upload', 'ארכיון', 'archive',
  'תוכן', 'CMS', 'מסכים', 'דפים',
];

function needsAdminContext(query?: string): boolean {
  if (!query?.trim()) return false;
  const q = query.toLowerCase();
  return ADMIN_KEYWORDS.some((k) => q.includes(k.toLowerCase()));
}

async function safeRead(path: string, maxLines?: number): Promise<string> {
  try {
    const content = await readFile(join(ROOT, path), 'utf-8');
    if (maxLines && maxLines > 0) {
      const lines = content.split('\n');
      const truncated = lines.length > maxLines;
      const kept = lines.slice(0, maxLines).join('\n');
      return kept + (truncated ? `\n\n... [חתוך – ${lines.length - maxLines} שורות נוספות. הקובץ המלא: ${lines.length} שורות]` : '');
    }
    return content;
  } catch {
    return `[לא ניתן לקרוא: ${path}]`;
  }
}

async function buildDirTree(dir: string, prefix: string, depth: number, maxDepth: number): Promise<string> {
  if (depth >= maxDepth) return '';
  try {
    const entries = await readdir(join(ROOT, dir), { withFileTypes: true });
    const lines: string[] = [];
    const sorted = entries
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
      .sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1));

    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i];
      const isLast = i === sorted.length - 1;
      const branch = prefix + (isLast ? '└── ' : '├── ');
      lines.push(branch + e.name);
      if (e.isDirectory()) {
        const subPrefix = prefix + (isLast ? '    ' : '│   ');
        const sub = await buildDirTree(join(dir, e.name), subPrefix, depth + 1, maxDepth);
        if (sub) lines.push(sub);
      }
    }
    return lines.join('\n');
  } catch {
    return `[לא ניתן לסרוק: ${dir}]`;
  }
}

/** Extract route summary from adminRoutes for compact overview */
async function getAdminRoutesSummary(): Promise<string> {
  try {
    const content = await readFile(join(ROOT, 'server/src/adminRoutes.ts'), 'utf-8');
    const lines = content.split('\n');
    const routes: string[] = [];
    for (const line of lines) {
      const m = line.match(/adminRoutes\.(get|post|patch|delete|put)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (m) routes.push(`${m[1].toUpperCase()} ${m[2]}`);
    }
    return routes.length ? routes.join('\n') : '[לא נמצאו routes]';
  } catch {
    return '[לא ניתן לחלץ סיכום routes]';
  }
}

export async function gatherProjectData(
  depth: Depth,
  scope: Scope,
  opts?: GatherOptions
): Promise<string> {
  const query = opts?.query;
  const loadAdmin =
    (scope === 'all' || needsAdminContext(query)) && (depth === 'deep' || depth === 'full');
  const lim = LIMITS[depth];

  const sections: string[] = [];

  // ─── 0. Project Identity (always first) ──────────────────────────────────
  try {
    const { readFileSync, existsSync } = await import('fs');
    const { join: pathJoin } = await import('path');
    const identityPath = pathJoin(ROOT, 'docs/nexus/project-identity.md');
    if (existsSync(identityPath)) {
      sections.push('## PROJECT IDENTITY — READ THIS FIRST\n' + readFileSync(identityPath, 'utf-8'));
    }
  } catch { /* skip if unavailable */ }

  // ─── 1. package.json ─────────────────────────────────────────────────────
  const pkg = await safeRead('package.json');
  sections.push('# package.json\n' + pkg);

  // ─── 2. Directory structure ──────────────────────────────────────────────
  const treeDepth = depth === 'quick' ? 2 : 4;
  let treeDirs = ['client', 'server', 'shared', 'scripts', 'docs'];
  if (scope === 'client') treeDirs = ['client'];
  if (scope === 'server') treeDirs = ['server', 'shared', 'scripts'];

  let tree = '';
  for (const d of treeDirs) {
    try {
      tree += `## ${d}/\n` + (await buildDirTree(d, '', 0, treeDepth)) + '\n\n';
    } catch {
      tree += `## ${d}/\n[לא זמין]\n\n`;
    }
  }
  sections.push('# מבנה תיקיות\n' + tree);

  // ─── 3. Schema (full for full depth) ─────────────────────────────────────
  if (scope !== 'client') {
    const schema = await safeRead('shared/schemas/schema.ts', lim.schema);
    sections.push('# shared/schemas/schema.ts\n' + schema);
  }

  // ─── 4. .env.example ────────────────────────────────────────────────────
  const envExample = await safeRead('.env.example');
  sections.push('# .env.example\n' + envExample);

  if (depth === 'deep' || depth === 'full') {
    // ─── 5. Configs ───────────────────────────────────────────────────────
    const drizzle = await safeRead('drizzle.config.ts', 80);
    const vite = await safeRead('vite.config.ts', 80);
    sections.push('# drizzle.config.ts\n' + drizzle);
    if (scope !== 'server') sections.push('# vite.config.ts\n' + vite);

    // ─── 6. Routes (more lines for meaningful context) ──────────────────────
    if (scope !== 'client') {
      const routes = await safeRead('server/src/routes.ts', lim.routes);
      const adminRoutes = await safeRead('server/src/adminRoutes.ts', lim.adminRoutes);
      sections.push('# server/src/routes.ts\n' + routes);
      sections.push('# server/src/adminRoutes.ts\n' + adminRoutes);

      // Route summary for quick reference
      if (depth === 'full' || loadAdmin) {
        const routeSummary = await getAdminRoutesSummary();
        sections.push('# סיכום Admin API Endpoints\n' + routeSummary);
      }
    }

    // ─── 7. App & main ────────────────────────────────────────────────────
    if (scope !== 'server') {
      const app = await safeRead('client/src/App.tsx', lim.app);
      const main = await safeRead('client/src/main.tsx', 80);
      sections.push('# client/src/App.tsx\n' + app);
      sections.push('# client/src/main.tsx\n' + main);
    }

    // ─── 8. API client ────────────────────────────────────────────────────
    if (scope !== 'server') {
      const api = await safeRead('client/src/lib/api.ts', lim.default);
      sections.push('# client/src/lib/api.ts\n' + api);
    }
  }

  // ─── 9. Admin context (when relevant) ────────────────────────────────────
  if (loadAdmin && scope !== 'server' && (depth === 'deep' || depth === 'full')) {
    sections.push('\n# ═══ הקשר אדמין (Admin) ═══');

    const adminLayout = await safeRead('client/src/admin/AdminLayout.tsx', lim.default);
    const adminNavConfig = await safeRead('client/src/admin/adminNavConfig.ts');
    const adminShell = await safeRead('client/src/admin/AdminShell.tsx', 150);

    sections.push('\n## client/src/admin/AdminLayout.tsx\n' + adminLayout);
    sections.push('\n## client/src/admin/adminNavConfig.ts – מבנה הניווט והקטגוריות\n' + adminNavConfig);
    sections.push('\n## client/src/admin/AdminShell.tsx – ניתוב ורינדור דפים\n' + adminShell);

    const adminNavService = await safeRead('server/src/adminNavigationService.ts');
    sections.push('\n## server/src/adminNavigationService.ts – ניווט דינמי לפי תפקיד\n' + adminNavService);

    if (depth === 'full') {
      const adminBreadcrumbs = await safeRead('client/src/admin/components/AdminBreadcrumbs.tsx', 80);
      const adminNavSearch = await safeRead('client/src/admin/components/AdminNavSearch.tsx', 80);
      sections.push('\n## client/src/admin/components/AdminBreadcrumbs.tsx\n' + adminBreadcrumbs);
      sections.push('\n## client/src/admin/components/AdminNavSearch.tsx\n' + adminNavSearch);
    }
  }

  if (depth === 'full') {
    // ─── 10. Server index ──────────────────────────────────────────────────
    if (scope !== 'client') {
      const index = await safeRead('server/src/index.ts', 120);
      sections.push('\n# server/src/index.ts\n' + index);
    }
    // ─── 11. AI & project analyzer ─────────────────────────────────────────
    if (scope !== 'client') {
      const ai = await safeRead('server/src/multiProviderAI.ts', 150);
      const analyzer = await safeRead('server/src/projectAnalyzer.ts', 120);
      sections.push('\n# server/src/multiProviderAI.ts\n' + ai);
      sections.push('\n# server/src/projectAnalyzer.ts\n' + analyzer);
    }
  }

  return sections.join('\n\n---\n\n');
}
