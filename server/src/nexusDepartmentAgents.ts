/**
 * nexusDepartmentAgents.ts
 * Defines all 10 Nexus department AI agents (CEO, CTO, CPO, R&D, Design, Product,
 * Security, Legal, Marketing, Finance/CFO) and runs them in parallel via multiProviderAI.
 */

import pg from 'pg';
import { callAI, type AIProviderId } from './multiProviderAI';
import type { WebIntelligenceResult } from './nexusWebIntelligence';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { getQAContextForDepartment } from './questionDiscovery';

// ── Nexus DB Config (loaded once per orchestration run) ───────────────────────
export type NexusDeptSetting = {
  department: string;
  systemPromptOverride: string | null;
  defaultModel: string | null;
  isActive: boolean;
};
export type NexusSkill = { id: string; name: string; labelHe: string; category: string };
export type NexusTeamMember = { department: string; name: string; roleHe: string; level: string; skills: string[] };

export type NexusConfig = {
  deptSettings: Record<string, NexusDeptSetting>;
  skills: NexusSkill[];
  teamMembers: NexusTeamMember[];
};

export async function loadNexusConfig(): Promise<NexusConfig> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return { deptSettings: {}, skills: [], teamMembers: [] };
  try {
    const useSsl = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');
    const pool = new pg.Pool({ connectionString: dbUrl, ssl: useSsl ? { rejectUnauthorized: false } : false, max: 2 });
    const [ds, sk, tm] = await Promise.all([
      pool.query(`SELECT department, system_prompt_override, default_model, is_active FROM nexus_dept_settings`),
      pool.query(`SELECT id, name, label_he, category FROM nexus_skills WHERE is_active = true ORDER BY category, name`),
      pool.query(`SELECT department, name, role_he, level, COALESCE(skills, '{}') AS skills FROM nexus_dept_team_members WHERE is_active = true ORDER BY department, order_index`),
    ]);
    await pool.end();
    const deptSettings: Record<string, NexusDeptSetting> = {};
    for (const r of ds.rows) {
      deptSettings[r.department] = {
        department: r.department,
        systemPromptOverride: r.system_prompt_override ?? null,
        defaultModel: r.default_model ?? null,
        isActive: r.is_active !== false,
      };
    }
    return {
      deptSettings,
      skills: sk.rows.map((r) => ({ id: r.id, name: r.name, labelHe: r.label_he, category: r.category })),
      teamMembers: tm.rows.map((r) => ({
        department: r.department, name: r.name, roleHe: r.role_he, level: r.level,
        skills: Array.isArray(r.skills) ? r.skills : [],
      })),
    };
  } catch {
    return { deptSettings: {}, skills: [], teamMembers: [] };
  }
}

export type DepartmentId =
  | 'ceo'
  | 'cto'
  | 'cpo'
  | 'rd'
  | 'design'
  | 'product'
  | 'security'
  | 'legal'
  | 'marketing'
  | 'finance'
  | 'hr'
  | 'cs'
  | 'sales';

export type DepartmentResult = {
  department: DepartmentId;
  output: string;
  promptSnapshot: string;
  modelUsed: string;
  tokensUsed: number;
  costUsd: number;
  error?: string;
  fallbackReason?: string;
};

type DepartmentConfig = {
  hebrewName: string;
  emoji: string;
  systemPrompt: string;
  outputSections: string[];
};

// ── Department Configs ─────────────────────────────────────────────────────────

const DEPARTMENT_CONFIGS: Record<DepartmentId, DepartmentConfig> = {
  ceo: {
    hebrewName: 'מנכ"ל (CEO)',
    emoji: '👔',
    systemPrompt: `אתה מנכ"ל ותיק של חברת SaaS בתחום הבריאות הדיגיטלית.
תפקידך: לבחון כל רעיון חדש מזווית עסקית מקיפה.
ענה בעברית. פלט: Markdown מובנה עם כותרות.
## כדאיות עסקית
## הזדמנות שוק
## ניתוח מתחרים
## סיכוני עסק
## החלטת CEO
כלול סעיף "### החלטה" עם: ✅ כן / ❌ לא / ⚠️ תלוי – ונימוק בשורה אחת.`,
    outputSections: ['כדאיות עסקית', 'הזדמנות שוק', 'ניתוח מתחרים', 'סיכוני עסק', 'החלטת CEO'],
  },

  cto: {
    hebrewName: 'מנמ"ר טכנולוגיה (CTO)',
    emoji: '⚙️',
    systemPrompt: `אתה CTO מנוסה עם עשור בפיתוח מערכות TypeScript/React/Node.js ו-PostgreSQL.
תפקידך: לבחון היתכנות טכנית ולהמליץ על ארכיטקטורה.
חשוב: קרא בעיון את הקוד הקיים המצורף לפני שאתה ממליץ – אל תסתור פטרנים קיימים.
ענה בעברית. פלט: Markdown מובנה.
## היתכנות טכנית
## ארכיטקטורה מוצעת (כולל דיאגרמת Mermaid)
## בחירות Tech Stack
## integration עם הקוד הקיים
## חוב טכני וסיכונים
## לוח זמנים מוערך
## מערכות תומכות נדרשות
**חובה** — כלול סעיף מפורט של כל המערכות החיצוניות הנדרשות:
- שרתים ותשתית: hosting, CDN, DB (ספק, תוכנית, עלות חודשית)
- שירותים חיצוניים: APIs שצריך מנוי (AI, email, SMS, storage)
- אבטחה: SSL, WAF, backups, monitoring
- CI/CD: GitHub Actions, Docker, deployment pipeline
- כלים נוספים: N8N, analytics, error tracking
- **טבלת עלויות חודשיות** לכל שירות`,
    outputSections: ['היתכנות טכנית', 'ארכיטקטורה', 'Tech Stack', 'Integration', 'חוב טכני', 'מערכות תומכות'],
  },

  cpo: {
    hebrewName: 'מנהל/ת מוצר ראשי/ת (CPO)',
    emoji: '🎯',
    systemPrompt: `אתה CPO עם ניסיון עמוק ב-product-market fit ב-SaaS לבריאות.
תפקידך: לבחון את ערך המוצר ואסטרטגיית UX.
ענה בעברית. פלט: Markdown מובנה.
## פרופיל משתמש ו-Jobs-to-be-Done
## ערך מוצע ייחודי (USP)
## UX Pattern מומלץ
## תעדוף פיצ'רים (MoSCoW – Must/Should/Could/Won't)
## KPIs ומדדי הצלחה`,
    outputSections: ['פרופיל משתמש', 'USP', 'UX Pattern', 'MoSCoW', 'KPIs'],
  },

  rd: {
    hebrewName: 'מחקר ופיתוח (R&D)',
    emoji: '🔬',
    systemPrompt: `אתה ראש מחלקת R&D עם עומק טכני גבוה.
תפקידך: לבצע מחקר טכני מעמיק – ספריות, repos ב-GitHub, גישות מימוש.
השתמש במקורות מהרשת שמצורפים כהכוונה, והוסף Trust Score לכל ספרייה.
ענה בעברית. פלט: Markdown מובנה.
## ספריות מומלצות (עם Trust Score וקישור)
## גישות מימוש (pros/cons לכל גישה)
## POC – הצעת Proof of Concept
## דוגמת קוד ראשונית
## תלויות ומגבלות
## קישורי מחקר נוספים`,
    outputSections: ['ספריות', 'גישות מימוש', 'POC', 'קוד', 'תלויות'],
  },

  design: {
    hebrewName: 'עיצוב UX/UI',
    emoji: '🎨',
    systemPrompt: `אתה Design Lead מתמחה ב-UX/UI עבור אפליקציות SaaS לבריאות, עם ידע עמוק ב-WCAG 2.1 AA ומגמות 2025.
ענה בעברית. פלט: Markdown מובנה.
## מגמות UX רלוונטיות 2025
## Design System המלצות (צבעים, רכיבים, טיפוגרפיה)
## Accessibility Checklist (WCAG 2.1 AA)
## Wireframe Conceptual (תאר טקסטואלית)
## RTL Considerations (ממשק עברית)
## Micro-interactions מוצעות`,
    outputSections: ['מגמות UX', 'Design System', 'Accessibility', 'Wireframe', 'RTL'],
  },

  product: {
    hebrewName: 'ניהול מוצר (Product)',
    emoji: '📋',
    systemPrompt: `אתה Product Manager מנוסה.
תפקידך: לתרגם רעיון לתכנון ספרינט ברור עם User Stories מוגדרות היטב.
ענה בעברית. פלט: Markdown מובנה.
## User Stories (פורמט: Given/When/Then)
## Acceptance Criteria לכל Story
## Sprint Breakdown מוצע (1-2 ספרינטים)
## Definition of Done
## סיכוני ניהול מוצר`,
    outputSections: ['User Stories', 'Acceptance Criteria', 'Sprint Breakdown', 'DoD'],
  },

  security: {
    hebrewName: 'אבטחת מידע (Security)',
    emoji: '🔒',
    systemPrompt: `אתה CISO עם מומחיות ב-AppSec, OWASP, GDPR ואבטחת מידע רפואי.
שים לב: הפרויקט עוסק בנתוני בריאות – יש להתייחס ל-HIPAA-adjacent requirements.
ענה בעברית. פלט: Markdown מובנה.
## Threat Model (מי, מה, איך)
## OWASP Top 10 – מיפוי לרעיון
## דרישות אבטחה חובה
## Privacy by Design
## Compliance Checklist (GDPR, HIPAA-adjacent)
## המלצות לבדיקות אבטחה (Pen Test, SAST)`,
    outputSections: ['Threat Model', 'OWASP', 'דרישות אבטחה', 'Privacy', 'Compliance'],
  },

  legal: {
    hebrewName: 'משפטי ורגולציה (Legal)',
    emoji: '⚖️',
    systemPrompt: `אתה יועץ משפטי מתמחה בחוק טכנולוגיה, רישיונות קוד פתוח ורגולציית פרטיות.
אזהרה: אם מקורות מהרשת מציינים תלות ברישיון GPL – דגל אותה כסיכון גבוה.
ענה בעברית. פלט: Markdown מובנה.
## ניתוח רישיונות קוד פתוח (MIT/Apache/GPL risks)
## GDPR – תהליכי נתונים נדרשים
## Terms of Service – השלכות
## סיכונים משפטיים
## המלצות Legal לפני פיתוח`,
    outputSections: ['רישיונות', 'GDPR', 'Terms of Service', 'סיכונים', 'המלצות'],
  },

  marketing: {
    hebrewName: 'שיווק וצמיחה (Marketing)',
    emoji: '📣',
    systemPrompt: `אתה CMO עם ניסיון ב-B2B SaaS growth marketing.
ענה בעברית. פלט: Markdown מובנה.
## ניתוח מתחרים שיווקי
## Positioning מוצע
## SEO Keywords רלוונטיים
## GTM Strategy (Go-to-Market)
## ערוצי הפצה מומלצים
## Messaging Framework`,
    outputSections: ['מתחרים', 'Positioning', 'SEO', 'GTM', 'ערוצי הפצה', 'Messaging'],
  },

  finance: {
    hebrewName: 'פיננסים ו-BI (CFO)',
    emoji: '💰',
    systemPrompt: `אתה CFO ראשי של חברת SaaS בתחום הבריאות הדיגיטלית עם ניסיון ב-Series A/B.
תפקידך: לבחון כל רעיון, פיצ'ר, או יוזמה מהזווית הפיננסית והעסקית המספרית.

**מודל עסקי ידוע:**
- מחיר: $15/user/month, ממוצע 25 users לארגון → $375/org/month = $4,500/org/year
- המרה trial→paid: 15%, Monthly Churn: 3%
- LTV: ~$12,500/org | CAC: ~$833/org | LTV:CAC = 15:1

**חשוב מאוד — מודל פיתוח AI (לא צוות אנושי!):**
הפיתוח נעשה ע"י AI (Claude Code), לא צוות אנושי. עלויות שונות לחלוטין:
- אין משכורות מפתחים — הפיתוח ע"י Claude Code AI
- עלות API tokens: Claude ~$3-15 per 1M tokens, Gemini ~$0.3-2.5
- עלות תשתית: Supabase DB ~$25/month, Vercel/hosting ~$20/month, Domain ~$12/year
- עלות כלים: N8N (self-hosted, חינם), GitHub (~$4/month)
- מהירות פיתוח: AI מפתח 5-10x מהר מצוות אנושי רגיל

**חובה — כלול טבלת השוואה:**
| פרמטר | פיתוח AI | פיתוח מסורתי (4 מפתחים) |
|--------|----------|------------------------|
| עלות חודשית | ~$100-300 (APIs+infra) | ~$40,000-60,000 (משכורות) |
| זמן פיתוח פיצ'ר | 1-3 ימים | 2-6 שבועות |
| Break-even | חודש 2-3 | חודש 14-18 |

**לכל רעיון עליך לספק:**
1. ניתוח עלות-תועלת מלא עם טבלאות מספריות (מודל AI!)
2. מודל הכנסות: ARR impact, upsell potential, pricing model
3. מבנה עלויות: API costs, infra, support, marketing (לא משכורות!)
4. Unit Economics: השפעה על LTV, CAC, Churn, NRR
5. Burn Rate & Runway: כמה runway נשרף, opportunity cost
6. Stage-Gate checkpoints: Gate 1/2/3 עם KPIs ותנאי kill
7. BI ומדידה: מטריקות לעקוב, cohort analysis, CFO dashboard
8. מערכות תומכות נדרשות: שרתים, APIs, שירותים — עלות חודשית

ענה בעברית. פלט: Markdown מובנה עם כותרות ברורות. כלול טבלאות מספריות.
כלול סעיף "### החלטת CFO" עם: ✅ ROI חיובי / ❌ לא כדאי / ⚠️ תלוי – עם break-even timeline ו-payback period.`,
    outputSections: [
      'ניתוח עלות-תועלת',
      'מודל הכנסות',
      'מבנה עלויות',
      'Unit Economics',
      'Burn Rate & Runway',
      'Stage-Gate Checkpoints',
      'BI ומדידה',
      'החלטת CFO',
    ],
  },

  hr: {
    hebrewName: 'משאבי אנוש (HR)',
    emoji: '👥',
    systemPrompt: `אתה VP HR / CHRO עם ניסיון בחברות SaaS בצמיחה.
תפקידך: לבחון כל רעיון מזווית משאבי אנוש — האם יש Capacity, מי צריך לגייס, מה הסיכון לצוות.
ענה בעברית. פלט: Markdown מובנה.
## Capacity Analysis — האם הצוות הנוכחי יכול?
## תפקידים חסרים שצריך לגייס
## לוח זמנים גיוס + Onboarding
## Internal Mobility — מי מהצוות הקיים יכול להתאים
## סיכוני Retention — האם מפתחי מפתח עלולים לעזוב
## מבנה צוות מומלץ לפרויקט
## Contractors / ספקים חיצוניים — השפעה על IP ו-NDA`,
    outputSections: ['Capacity Analysis', 'תפקידים חסרים', 'לוח זמנים גיוס', 'Internal Mobility', 'סיכוני Retention', 'מבנה צוות'],
  },

  cs: {
    hebrewName: 'הצלחת לקוחות (CS)',
    emoji: '🤝',
    systemPrompt: `אתה VP Customer Success עם ניסיון ב-SaaS בתחום הבריאות.
תפקידך: לבחון כל רעיון מזווית חוויית הלקוח — onboarding, churn prevention, NPS, support.
הלקוחות שלנו הם בני משפחה של חולי דמנציה/אלצהיימר — אנשים תחת לחץ רגשי כבד.
ענה בעברית. פלט: Markdown מובנה.
## השפעה על חוויית Onboarding — האם לקוח חדש יבין את זה מהר?
## השפעה על Churn — האם זה ימנע נטישה או יגרום לבלבול?
## User Feedback — מה לקוחות ביקשו שקשור לרעיון הזה?
## עומס Support צפוי — כמה תמיכה נוספת נדרשת?
## NPS Impact — השפעה צפויה על ציוני שביעות רצון
## Self-Service — האם אפשר לבנות את זה ככה שהלקוח לא יצטרך עזרה?
## Adoption Plan — איך נוודא שלקוחות קיימים ישתמשו בפיצ'ר החדש?`,
    outputSections: ['Onboarding Impact', 'Churn Prevention', 'User Feedback', 'Support Load', 'NPS Impact', 'Adoption Plan'],
  },

  sales: {
    hebrewName: 'מכירות ופיתוח עסקי (Sales)',
    emoji: '💼',
    systemPrompt: `אתה VP Sales / BD עם ניסיון במכירות B2C SaaS בתחום הבריאות.
תפקידך: לבחון כל רעיון מזווית מכירות — האם זה מוכר, מה המחיר, מה ה-cycle.
קהל יעד: משפחות עם קרוב חולה דמנציה בישראל, גיל 35-65.
ענה בעברית. פלט: Markdown מובנה.
## האם הפיצ'ר/רעיון הזה יעזור למכור? איך?
## השפעה על Sales Cycle — מקצר או מאריך?
## Pricing Impact — האם אפשר לגבות יותר? Upsell?
## Objection Handling — מה ההתנגדויות הצפויות וכיצד לטפל בהן?
## Channel Strategy — איזה ערוצי מכירה מתאימים?
## שיתופי פעולה — ארגוני דמנציה, בתי חולים, קופות חולים, עמותות
## מדדי מכירות: Conversion Rate צפוי, Pipeline Impact, Revenue Impact`,
    outputSections: ['Sales Impact', 'Sales Cycle', 'Pricing', 'Objection Handling', 'Channel Strategy', 'Partnerships', 'מדדי מכירות'],
  },
};

// ── Build the full agent prompt ────────────────────────────────────────────────
// ── Load department knowledge from DB ─────────────────────────────────────────
async function loadDeptKnowledge(department: string): Promise<string> {
  try {
    const res = await db.execute(sql`
      SELECT category, title, content FROM nexus_dept_knowledge
      WHERE department = ${department} AND is_active = true
      ORDER BY position, created_at
    `);
    const rows: any[] = (res as any).rows ?? [];
    if (rows.length === 0) return '';

    const sections = rows.map((r: any) =>
      `### ${r.title} (${r.category})\n${r.content}`
    );
    return `\n---\n\n## 📚 ידע פנימי של המחלקה\n${sections.join('\n\n')}\n`;
  } catch {
    return '';
  }
}

function buildAgentPrompt(opts: {
  department: DepartmentId;
  ideaPrompt: string;
  webIntelligence: WebIntelligenceResult;
  codebaseContext: string;
  contextNotes?: string | null;
  targetPlatforms?: string[] | null;
  nexusConfig?: NexusConfig;
  deptKnowledge?: string;
}): string {
  const { department, ideaPrompt, webIntelligence, codebaseContext, contextNotes, targetPlatforms, nexusConfig, deptKnowledge } = opts;
  const config = DEPARTMENT_CONFIGS[department];

  // ── Filter sources: dept-specific first, then general ──
  const deptSources = webIntelligence.sources.filter((s) => s.department === department);
  const generalSources = webIntelligence.sources.filter((s) => !s.department || s.department !== department);
  const topSources = [...deptSources, ...generalSources].slice(0, 10);

  const sourcesTable =
    topSources.length > 0
      ? [
          '| סוג | כותרת | Trust | מחלקה |',
          '|---|---|---|---|',
          ...topSources.map((s) => `| ${s.sourceType} | [${s.title.slice(0, 55)}](${s.url}) | ${s.trustScore}/100 | ${s.department ?? 'כללי'} |`),
        ].join('\n')
      : 'לא נמצאו מקורות.';

  // ── Skills block ──
  const skillsBlock = nexusConfig?.skills?.length
    ? `\n---\n\n## 🛠️ Skills רלוונטיים לפרויקט\n${nexusConfig.skills.map((s) => `- **${s.labelHe}** (\`${s.name}\`) — ${s.category}`).join('\n')}\n`
    : '';

  // ── Team members block (dept-specific) ──
  const deptTeam = nexusConfig?.teamMembers?.filter((m) => m.department === department) ?? [];
  const teamBlock = deptTeam.length > 0
    ? `\n---\n\n## 👥 צוות המחלקה שלך\n${deptTeam.map((m) => `- **${m.roleHe}** (${m.level})${m.skills.length ? ': ' + m.skills.slice(0, 4).join(', ') : ''}`).join('\n')}\nקח בחשבון את יכולות הצוות בהמלצותיך.\n`
    : '';

  const contextNotesBlock = contextNotes?.trim()
    ? `\n---\n\n## ⚡ הוראות מיוחדות ממנהל המוצר (קרא לפני הכל)\n${contextNotes.trim()}\n`
    : '';

  const platformsBlock =
    targetPlatforms && targetPlatforms.length > 0
      ? `\n---\n\n## 🖥️ פלטפורמות יעד\nהפיצ'ר/רעיון זה מיועד ל: **${targetPlatforms.join(', ')}**.\nהתחשב בפלטפורמות אלו בכל המלצה טכנית, UX ומוצרית.\n`
      : '';

  const knowledgeBlock = deptKnowledge?.trim() || '';

  return `# משימה: מחקר עבור הרעיון "${ideaPrompt}"
תאריך: ${new Date().toLocaleDateString('he-IL')}
${contextNotesBlock}${platformsBlock}${teamBlock}${skillsBlock}${knowledgeBlock}
---

## קוד הפרויקט הקיים (הקשר)
${codebaseContext.slice(0, 4000)}

---

${webIntelligence.synthesizedContext}

---

## מקורות מידע (ממוקדים למחלקת ${config.hebrewName})
${sourcesTable}

---

## הרעיון לחקור
${ideaPrompt}

---

כעת בצע את המחקר שלך לפי תפקידך כ-${config.hebrewName}:`;
}

// ── Run a single department agent ─────────────────────────────────────────────
export async function runDepartmentAgent(opts: {
  department: DepartmentId;
  ideaPrompt: string;
  webIntelligence: WebIntelligenceResult;
  codebaseContext: string;
  models: AIProviderId[];
  adminUserId?: string | null;
  contextNotes?: string | null;
  targetPlatforms?: string[] | null;
  nexusConfig?: NexusConfig;
  briefId?: string;
}): Promise<DepartmentResult> {
  const { department, models, adminUserId, nexusConfig } = opts;
  const config = DEPARTMENT_CONFIGS[department];
  const deptSetting = nexusConfig?.deptSettings?.[department];

  // Use system prompt override from DB if set, otherwise use hardcoded
  const systemPrompt = deptSetting?.systemPromptOverride?.trim() || config.systemPrompt;

  // User-selected models take priority; dept default is fallback only when no explicit selection
  const preferredModels: AIProviderId[] = models.length > 0
    ? models
    : deptSetting?.defaultModel
      ? [deptSetting.defaultModel as AIProviderId]
      : [];

  // Load department internal knowledge + Q&A context
  const [deptKnowledge, qaContext] = await Promise.all([
    loadDeptKnowledge(department),
    opts.briefId ? getQAContextForDepartment(opts.briefId, department) : Promise.resolve(''),
  ]);
  const userPrompt = buildAgentPrompt({ ...opts, deptKnowledge: (deptKnowledge || '') + (qaContext || '') });

  try {
    const result = await callAI(
      'departmentAnalysis',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        preferredModels: preferredModels.length > 0 ? preferredModels : undefined,
        adminUserId: adminUserId ?? undefined,
        maxTokens: 2000,
      }
    );

    return {
      department,
      output: result.content,
      promptSnapshot: userPrompt,
      modelUsed: result.model,
      tokensUsed: result.tokensIn + result.tokensOut,
      costUsd: result.costUsd,
      fallbackReason: result.fallbackReason,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      department,
      output: `> ❌ שגיאה בעת מחקר מחלקת ${config.hebrewName}: ${errorMsg}`,
      promptSnapshot: userPrompt,
      modelUsed: 'error',
      tokensUsed: 0,
      costUsd: 0,
      error: errorMsg,
    };
  }
}

// ── Run all department agents in parallel ──────────────────────────────────────
export async function runAllDepartmentAgents(opts: {
  departments: DepartmentId[];
  ideaPrompt: string;
  webIntelligence: WebIntelligenceResult;
  codebaseContext: string;
  models: AIProviderId[];
  adminUserId?: string | null;
  contextNotes?: string | null;
  targetPlatforms?: string[] | null;
  briefId?: string;
  onDepartmentStart?: (department: DepartmentId, hebrewName: string) => void;
  onDepartmentComplete?: (result: DepartmentResult) => void;
}): Promise<DepartmentResult[]> {
  const { departments, onDepartmentStart, onDepartmentComplete, ...agentOpts } = opts;

  // Load all DB config ONCE before running all agents
  const nexusConfig = await loadNexusConfig();

  // Filter out inactive departments
  const activeDepts = departments.filter((d) => nexusConfig.deptSettings[d]?.isActive !== false);

  const promises = activeDepts.map(async (department) => {
    onDepartmentStart?.(department, nexusConfig.deptSettings[department]?.isActive !== false
      ? (DEPARTMENT_CONFIGS[department]?.hebrewName ?? department)
      : department);
    const result = await runDepartmentAgent({ ...agentOpts, department, nexusConfig });
    onDepartmentComplete?.(result);
    return result;
  });

  const settled = await Promise.allSettled(promises);
  return settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    return {
      department: departments[i],
      output: `> ❌ כישלון בלתי צפוי: ${s.reason}`,
      modelUsed: 'error',
      tokensUsed: 0,
      costUsd: 0,
      error: String(s.reason),
    };
  });
}

// ── Utility: get department Hebrew name ───────────────────────────────────────
export function getDepartmentInfo(id: DepartmentId): { hebrewName: string; emoji: string } {
  const c = DEPARTMENT_CONFIGS[id];
  return { hebrewName: c.hebrewName, emoji: c.emoji };
}

// ── Utility: get full department config (for API exposure) ────────────────────
export function getDepartmentConfig(id: DepartmentId) {
  const c = DEPARTMENT_CONFIGS[id];
  return {
    id,
    hebrewName: c.hebrewName,
    emoji: c.emoji,
    systemPrompt: c.systemPrompt,
    outputSections: c.outputSections,
  };
}

export function getAllDepartmentConfigs() {
  return (Object.keys(DEPARTMENT_CONFIGS) as DepartmentId[]).map(getDepartmentConfig);
}

// ── All departments list (for API) ────────────────────────────────────────────
export const ALL_DEPARTMENTS: { id: DepartmentId; hebrewName: string; emoji: string; description: string }[] = [
  { id: 'ceo', hebrewName: 'מנכ"ל (CEO)', emoji: '👔', description: 'כדאיות עסקית, שוק, תחרות ו-ROI' },
  { id: 'cto', hebrewName: 'מנמ"ר טכנולוגיה (CTO)', emoji: '⚙️', description: 'היתכנות טכנית, ארכיטקטורה ו-tech stack' },
  { id: 'cpo', hebrewName: 'מנהל מוצר (CPO)', emoji: '🎯', description: 'אסטרטגיית מוצר, UX ותעדוף פיצ׳רים' },
  { id: 'rd', hebrewName: 'מחקר ופיתוח (R&D)', emoji: '🔬', description: 'ספריות, repos, גישות מימוש ו-POC' },
  { id: 'design', hebrewName: 'עיצוב UX/UI', emoji: '🎨', description: 'מגמות עיצוב, Design System ו-accessibility' },
  { id: 'product', hebrewName: 'ניהול מוצר (Product)', emoji: '📋', description: 'User Stories, Acceptance Criteria וספרינטים' },
  { id: 'security', hebrewName: 'אבטחת מידע (Security)', emoji: '🔒', description: 'OWASP, Threat Model ו-compliance' },
  { id: 'legal', hebrewName: 'משפטי ורגולציה (Legal)', emoji: '⚖️', description: 'רישיונות OSS, GDPR וסיכונים משפטיים' },
  { id: 'marketing', hebrewName: 'שיווק וצמיחה (Marketing)', emoji: '📣', description: 'GTM, SEO ו-positioning' },
  { id: 'finance', hebrewName: 'פיננסים ו-BI (CFO)', emoji: '💰', description: 'ROI, עלות-תועלת, unit economics, Stage-Gate' },
  { id: 'hr', hebrewName: 'משאבי אנוש (HR)', emoji: '👥', description: 'Capacity, גיוס, retention, מבנה צוות' },
  { id: 'cs', hebrewName: 'הצלחת לקוחות (CS)', emoji: '🤝', description: 'Onboarding, churn prevention, NPS, support' },
  { id: 'sales', hebrewName: 'מכירות ופיתוח עסקי (Sales)', emoji: '💼', description: 'Sales cycle, pricing, channels, partnerships' },
];
