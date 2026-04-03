type DevTask = {
  id: string;
  title: string;
  description: string | null;
  priority?: string;
  category: string | null;
  assignee: string | null;
  labels?: string[] | null;
  estimateHours?: number | null;
  dueDate?: string | null;
  columnId?: string | null;
  environment?: string | null;
};

type NexusDoc = {
  doc_type: string;
  title: string | null;
  content: string;
};

type PromptContext = {
  sprintName?: string;
  sprintId?: string;
  columnName?: string;
  nexusDocs?: NexusDoc[];
  briefTitle?: string;
  taskOrder?: number;
  environment?: string;
  apiBaseUrl?: string;
};

const ENV_LABELS: Record<string, string> = {
  'user-frontend': '👤 User Frontend (client/src/)',
  'user-backend': '👤 User Backend (server/src/)',
  'admin-frontend': '🔧 Admin Frontend (client/src/admin/)',
  'admin-backend': '🔧 Admin Backend (server/src/)',
  'server': '⚙️ Server (server/src/)',
  'fullstack': '🔄 Fullstack (all layers)',
  // backward compat
  user: '👤 User (client/src/)',
  admin: '🔧 Admin (client/src/admin/)',
  both: '🔄 Both (user + admin)',
};

export function formatTaskForAI(task: DevTask, context?: PromptContext): string {
  const priorityLabel = task.priority === 'urgent' ? '🔴 Urgent'
    : task.priority === 'high' ? '🔴 High'
    : task.priority === 'medium' ? '🟡 Medium'
    : '⚪ Low';

  const env = task.environment ?? context?.environment ?? 'admin';
  const envLabel = ENV_LABELS[env] ?? env;
  const orderStr = context?.taskOrder ? `#${context.taskOrder}: ` : '';

  let prompt = `# 🎯 משימת פיתוח ${orderStr}${task.title}\n\n`;
  prompt += `**מזהה:** \`${task.id}\``;
  if (context?.sprintName) prompt += ` | **ספרינט:** ${context.sprintName}`;
  if (context?.sprintId) prompt += ` (\`${context.sprintId}\`)`;
  prompt += ` | **סביבה:** ${envLabel}`;
  prompt += ` | **עדיפות:** ${priorityLabel}`;
  if (task.estimateHours) prompt += ` | **הערכה:** ${task.estimateHours}h`;
  if (task.category) prompt += ` | **קטגוריה:** ${task.category}`;
  prompt += `\n\n`;

  // NEXUS research origin
  if (context?.briefTitle) {
    prompt += `> **מקור מחקר NEXUS:** ${context.briefTitle}\n\n`;
  }

  prompt += `---\n\n`;

  // Project identity — reference CLAUDE.md
  prompt += `## 📋 זהות הפרויקט\n`;
  prompt += `- **מוצר:** MemorAid — פלטפורמת SaaS לניהול טיפול בחולי דמנציה/אלצהיימר עבור משפחות\n`;
  prompt += `- **קהל יעד:** משפחות מטפלות, מטופלים, צוותים רפואיים — ישראל, עברית\n`;
  prompt += `- **חשוב:** קרא את \`CLAUDE.md\` בשורש הפרויקט לפני תחילת עבודה — מכיל conventions, DO/DON'T, ומבנה הפרויקט\n`;
  prompt += `- **זהות מוצר:** \`docs/nexus/project-identity.md\` — מכיל פרטי דומיין והקשר עסקי\n\n`;

  // Development context
  prompt += `## 🏗️ סביבת פיתוח\n`;
  prompt += `- **מודל:** Claude Code AI — כל הקוד נכתב ע"י AI\n`;
  prompt += `- **Stack:** TypeScript, React 18, Vite, Tailwind CSS, shadcn/ui, Express, Drizzle ORM, PostgreSQL\n`;
  prompt += `- **Design System:** \`client/src/admin/ADMIN_THEME_RULES.md\` — השתמש ב-CSS variables ומחלקות admin-*\n`;
  prompt += `- **Font:** Heebo | **RTL:** Hebrew-first | **Components:** shadcn/ui\n\n`;

  prompt += `---\n\n`;

  if (task.description) {
    prompt += `${task.description}\n\n`;
  }

  if (task.labels && task.labels.length > 0) {
    prompt += `**תגיות:** ${task.labels.join(', ')}\n\n`;
  }

  // NEXUS specification documents (if available)
  if (context?.nexusDocs && context.nexusDocs.length > 0) {
    prompt += `---\n\n`;
    prompt += `## 📚 מסמכי מפרט מ-NEXUS\n`;
    prompt += `המשימה מבוססת על מסמכי אפיון שנוצרו במחקר NEXUS:\n`;
    for (const doc of context.nexusDocs) {
      const docLabel = doc.doc_type.toUpperCase();
      const docTitle = doc.title || doc.doc_type;
      // Include first 500 chars of each doc for context
      const excerpt = doc.content.length > 500 ? doc.content.slice(0, 500) + '...' : doc.content;
      prompt += `\n### ${docLabel}: ${docTitle}\n`;
      prompt += `${excerpt}\n`;
    }
    prompt += `\n`;
  }

  // Design system quick reference
  prompt += `---\n\n`;
  prompt += `## 🎨 Design System (קיצור)\n`;
  prompt += `- צבעים: \`--admin-bg-main\` (#0f172a), \`--admin-bg-card\` (rgba(30,41,59,0.5)), \`--admin-primary\` (#818cf8)\n`;
  prompt += `- מחלקות: \`admin-card\`, \`admin-input\`, \`admin-page-title\`, \`admin-muted\`\n`;
  prompt += `- רכיבים: shadcn/ui (Button, Card, Dialog, Table, Tabs, Select, Input, Badge, Tooltip)\n`;
  prompt += `- **איסור:** \`dark:\` prefix, \`#fff\` ישיר\n\n`;

  // Bot status update
  prompt += `---\n\n`;
  prompt += `## ✅ עדכון סטטוס\n`;
  prompt += `כשתסיים את המשימה, הרץ:\n\n`;
  prompt += `\`\`\`bash\n`;

  const apiBase = context?.apiBaseUrl || 'http://localhost:5001/admin';
  prompt += `curl -X POST ${apiBase}/dev/tasks/${task.id}/bot-move \\\n`;
  prompt += `  -H "Authorization: Bearer $KANBAN_BOT_API_KEY" \\\n`;
  prompt += `  -H "Content-Type: application/json" \\\n`;
  prompt += `  -d '{"columnName": "Done"}'\n`;
  prompt += `\`\`\`\n\n`;
  prompt += `> **הערה:** ה-API key נמצא ב-\`.env\` תחת \`KANBAN_BOT_API_KEY\`\n`;

  return prompt;
}

function getCategoryEmoji(category: string | null): string {
  if (!category) return '📦';

  const emojis: Record<string, string> = {
    email: '📧',
    calendar: '📅',
    admin: '⚙️',
    testing: '🧪',
    optimization: '⚡',
    ai: '🤖',
    mobile: '📱',
    security: '🔒',
    performance: '🚀',
  };

  return emojis[category] || '📦';
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
