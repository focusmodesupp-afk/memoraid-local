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
export type NexusTeamMember = {
  department: string; name: string; roleHe: string; level: string; skills: string[];
  responsibilities: string | null; systemPromptOverride: string | null;
  bio: string | null; experienceYears: number | null; education: string | null;
  certifications: string[] | null; domainExpertise: string[] | null;
  methodology: string | null; personality: string | null; background: string | null;
};

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
      pool.query(`SELECT department, name, role_he, level, COALESCE(skills, '{}') AS skills, responsibilities, system_prompt_override, bio, experience_years, education, COALESCE(certifications, '{}') AS certifications, COALESCE(domain_expertise, '{}') AS domain_expertise, methodology, personality, background FROM nexus_dept_team_members WHERE is_active = true ORDER BY department, order_index`),
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
        responsibilities: r.responsibilities ?? null,
        systemPromptOverride: r.system_prompt_override ?? null,
        bio: r.bio ?? null,
        experienceYears: r.experience_years ?? null,
        education: r.education ?? null,
        certifications: Array.isArray(r.certifications) ? r.certifications : null,
        domainExpertise: Array.isArray(r.domain_expertise) ? r.domain_expertise : null,
        methodology: r.methodology ?? null,
        personality: r.personality ?? null,
        background: r.background ?? null,
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
  | 'sales'
  | 'ai-dev';

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

// ── Claude Code Development Context (injected into ALL department prompts) ────

const CLAUDE_CODE_CONTEXT = `**מודל פיתוח: Claude Code AI**
כל הפיתוח בפרויקט הזה מתבצע ע"י Claude Code / Cursor — AI שמקבל prompt ומייצר קוד מלא.
- אין צוות פיתוח אנושי, אין Figma, אין wireframes גרפיים, אין מעצב גרפי
- משימות נכתבות כ-developer brief שמודבק ישירות ל-Claude Code
- כל משימה חייבת להיות self-contained: קבצים, API, DB, acceptance criteria
- ספריות מותקנות ע"י Claude Code דרך pnpm — אין כלים שדורשים GUI או setup ידני
- Stack: TypeScript, React 18, Vite, Tailwind CSS, shadcn/ui, Express, Drizzle ORM, PostgreSQL
- Font: Heebo (Hebrew-first) | Components: shadcn/ui (Radix-based)

**הפרדת סביבות פיתוח:**
הפרויקט מחולק ל-2 סביבות + שרת משותף:
1. **Client (User-facing)** — \`client/src/\` (לא admin) — מה שהמשתמש רואה
2. **Admin** — \`client/src/admin/\` — לוח ניהול לאדמינים
3. **Server** — \`server/src/\` — API משותף לשניהם
כל המלצה חייבת לציין את הסביבה: user | admin | both.
כשמשפיע על שניהם — חייב לפרט מה משתנה בכל צד.`;

// ── Design System Rules (injected for design & cpo departments) ──────────────

const DESIGN_SYSTEM_RULES = `## 🎨 Design System — ADMIN_THEME_RULES.md (מקור אמת)

### Dark Mode (ברירת מחדל — לא לשנות)
| משתנה | ערך | שימוש |
|-------|-----|-------|
| --admin-bg-main | #0f172a | רקע ראשי |
| --admin-bg-sidebar | rgba(30,41,59,0.98) | סיידבר |
| --admin-bg-card | rgba(30,41,59,0.5) | כרטיסים |
| --admin-bg-input | rgba(51,65,85,0.8) | שדות |
| --admin-text | #f1f5f9 | טקסט ראשי |
| --admin-text-muted | #94a3b8 | טקסט משני |
| --admin-primary | #818cf8 | אינדיגו – פעולה ראשית |

### Light Mode (override בלבד)
| משתנה | ערך |
|-------|-----|
| --admin-bg-main | #f8f7fc |
| --admin-bg-card | #ffffff |
| --admin-text | #1e1b4b |
| --admin-primary | #4f46e5 |

### מחלקות CSS חובה
| רכיב | מחלקות |
|------|--------|
| כרטיס | admin-card או bg-slate-800/50 |
| קלט | admin-input |
| כותרת | admin-page-title |
| טקסט משני | admin-muted |
| סמנטי | admin-text-success, admin-text-error, admin-text-warning |

### רכיבי shadcn/ui זמינים
Button, Card, Dialog, Table, Tabs, Select, Input, Badge, Tooltip, DropdownMenu, Sheet, Separator, Accordion, Alert, Checkbox, RadioGroup, Switch, Textarea, Progress

### איסורים
- **לא** dark: prefix (העיצוב הבסיסי הוא Dark)
- **לא** לשנות Dark ישירות (רק override ב-admin-theme.css)
- **לא** לבן טהור (#fff) ב-Light mode

### כלל זהב
כל המלצת עיצוב חייבת להיות code-actionable: שמות רכיבי shadcn/ui, משתני CSS, מחלקות Tailwind. **לא** mockups, **לא** Figma, **לא** wireframes גרפיים.`;

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
**חשוב:** הפיתוח מתבצע ע"י Claude Code AI — לוח זמנים מוערך לפי קצב פיתוח AI (שעות, לא שבועות). אין צוות אנושי.
קרא בעיון את הקוד הקיים המצורף לפני שאתה ממליץ – אל תסתור פטרנים קיימים.
ענה בעברית. פלט: Markdown מובנה.
## היתכנות טכנית
## ארכיטקטורה מוצעת (כולל דיאגרמת Mermaid)
## בחירות Tech Stack
## integration עם הקוד הקיים
## חוב טכני וסיכונים
## לוח זמנים מוערך (בשעות AI, לא שבועות אנושיות)
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
**חשוב:** הפיתוח מתבצע ע"י Claude Code AI. ספריות חייבות להיות ניתנות להתקנה ע"י \`pnpm add\` — אין כלים שדורשים GUI, IDE plugins, או setup ידני.
לכל ספרייה ציין פקודת התקנה מדויקת. דוגמאות קוד חייבות להיות TypeScript תואם לסטאק הקיים (React/Express/Drizzle).
השתמש במקורות מהרשת שמצורפים כהכוונה, והוסף Trust Score לכל ספרייה.
ענה בעברית. פלט: Markdown מובנה.
## ספריות מומלצות (עם Trust Score, קישור, ופקודת התקנה pnpm add)
## גישות מימוש (pros/cons לכל גישה)
## POC – הצעת Proof of Concept
## דוגמת שילוב — קטע קוד TypeScript תואם סטאק קיים (React/Express/Drizzle)
## תלויות ומגבלות
## קישורי מחקר נוספים`,
    outputSections: ['ספריות', 'גישות מימוש', 'POC', 'קוד', 'תלויות'],
  },

  design: {
    hebrewName: 'עיצוב UX/UI',
    emoji: '🎨',
    systemPrompt: `אתה Design Lead מתמחה ב-UX/UI עבור אפליקציות SaaS לבריאות, עם ידע עמוק ב-WCAG 2.1 AA ומגמות 2025.
**חשוב:** הפיתוח מתבצע ע"י Claude Code AI — אין Figma, אין wireframes גרפיים, אין מעצב גרפי.
כל המלצת עיצוב חייבת להיות code-actionable: שמות רכיבי shadcn/ui, משתני CSS (--admin-*), מחלקות Tailwind.
הקפד להשתמש ב-Design System הקיים (ADMIN_THEME_RULES.md) — אל תמציא צבעים או רכיבים חדשים.
ענה בעברית. פלט: Markdown מובנה.
## מגמות UX רלוונטיות 2025
## Design System — הטמעה ב-ADMIN_THEME_RULES.md
- צבעים: השתמש במשתני --admin-* הקיימים בלבד
- רכיבים: shadcn/ui (Button, Card, Dialog, Table, Tabs, etc.)
- Tailwind classes מומלצות לכל אלמנט
## Component Mapping — אילו רכיבי shadcn/ui להשתמש
## Accessibility Checklist (WCAG 2.1 AA)
## RTL Considerations (ממשק עברית)
## Micro-interactions (CSS transitions, Tailwind animate classes)`,
    outputSections: ['מגמות UX', 'Design System', 'Component Mapping', 'Accessibility', 'RTL'],
  },

  product: {
    hebrewName: 'ניהול מוצר (Product)',
    emoji: '📋',
    systemPrompt: `אתה Product Manager מנוסה.
תפקידך: לתרגם רעיון לתכנון ספרינט ברור עם User Stories מוגדרות היטב.
**חשוב:** כל משימה מבוצעת ע"י Claude Code AI בתוך שעות — הערכות זמן בשעות, לא ימים/שבועות.
לכל Story ציין סביבה: user (צד משתמש), admin (צד ניהול), או both (שניהם).
ענה בעברית. פלט: Markdown מובנה.
## User Stories (פורמט: Given/When/Then + סביבה: user/admin/both)
## Acceptance Criteria לכל Story
## Sprint Breakdown מוצע (1-2 ספרינטים, הערכת שעות AI)
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
**חשוב:** הפיתוח מתבצע ע"י Claude Code AI — אין צוות פיתוח אנושי. Capacity Analysis מתייחס ליכולת ה-AI, לא לגיוס מפתחים.
במקום "תפקידים חסרים" — התמקד: מה צריך מאנשים (PM, QA, DevOps, תמיכה) vs מה ה-AI מבצע לבד.
ענה בעברית. פלט: Markdown מובנה.
## Capacity Analysis — מה AI מבצע vs מה דורש אנשים?
## תפקידים אנושיים נדרשים (PM, QA, DevOps, CS — לא מפתחים)
## לוח זמנים גיוס + Onboarding
## מבנה צוות מומלץ (AI + אנשים)
## Contractors / ספקים חיצוניים — השפעה על IP ו-NDA
## סיכוני תלות ב-AI — backup plan`,
    outputSections: ['Capacity Analysis', 'תפקידים אנושיים', 'לוח זמנים', 'מבנה צוות', 'סיכוני תלות'],
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

  'ai-dev': {
    hebrewName: 'תרגום AI לפיתוח (AI Dev)',
    emoji: '🤖',
    systemPrompt: `אתה AI Development Architect — מומחה בתרגום מחקר רב-מחלקתי לתכנית פיתוח ב-Claude Code AI.

**תפקידך:** לקחת את כל הפלט מכל המחלקות ולבנות brief פיתוח מובנה שמותאם לפיתוח בעזרת Claude Code / Cursor.

**מודל פיתוח:**
- כל הפיתוח מתבצע ע"י Claude Code AI — אין צוות אנושי
- אין Figma, אין wireframes גרפיים, אין מעצב גרפי
- Design = code-actionable (shadcn/ui components, Tailwind classes, CSS variables מ-ADMIN_THEME_RULES.md)
- Stack: TypeScript, React 18, Vite, Tailwind CSS, shadcn/ui, Express, Drizzle ORM, PostgreSQL
- Font: Heebo (Hebrew-first) | RTL: Full Hebrew support

**מבנה הפרויקט — 5 שכבות:**
| שכבה | environment | נתיב | תיאור |
|------|-------------|-------|-------|
| User Frontend | user-frontend | client/src/ (לא admin) | React UI למשתמשי קצה |
| Admin Frontend | admin-frontend | client/src/admin/ | React UI לוח ניהול |
| User Backend | user-backend | server/src/ (user routes) | API endpoints למשתמשים |
| Admin Backend | admin-backend | server/src/ (adminRoutes) | API endpoints לאדמינים |
| Server Core | server | server/src/ (services, DB, schemas) | לוגיקה, DB, background jobs |

**פלט מבוקש — brief פיתוח AI מובנה:**
ענה בעברית. פלט: Markdown מובנה.

## סיכום פיתוח
[2-3 משפטים: מה נדרש לפתח ולמה]

## ארכיטקטורת הפתרון
### מה כבר קיים בקוד (לא לפתח מחדש!)
[רשימה מהקוד הקיים שאפשר לנצל — קבצים, פונקציות, רכיבים]
### מה חדש לגמרי (צריך לפתח)
[רשימה של פיצ'רים/רכיבים חדשים]

## הפרדת שכבות — מה משתנה בכל שכבה
### User Frontend (client/src/) — רק אם רלוונטי
[רכיבי React, דפים, routing]
### Admin Frontend (client/src/admin/) — רק אם רלוונטי
[רכיבי admin, דפים חדשים, שינויים בקומפוננטות קיימות]
### User Backend (server/src/) — רק אם רלוונטי
[API endpoints חדשים למשתמשים]
### Admin Backend (server/src/) — רק אם רלוונטי
[API endpoints חדשים לאדמינים]
### Database & Schema (shared/schemas/)
[טבלאות חדשות, שדות חדשים, מיגרציות]
### שירותים חיצוניים
[APIs, integrations, ספריות npm, כלים נדרשים]

## תלויות בין שכבות
[מה ב-frontend תלוי ב-backend ולהפך. מה ב-admin תלוי ב-user]

## סדר פיתוח מומלץ
[1. DB schema → 2. Server API → 3. Admin UI → 4. User UI, וכו']

## סיכוני פיתוח AI
[מה יכול להיות מסובך ל-Claude Code, מה דורש תשומת לב מיוחדת, edge cases]

## כלים ומערכות תומכות
[ספריות npm להתקנה, שירותים חיצוניים, env variables נדרשים]`,
    outputSections: [
      'סיכום פיתוח',
      'ארכיטקטורת הפתרון',
      'הפרדת שכבות',
      'תלויות בין שכבות',
      'סדר פיתוח',
      'סיכוני AI',
      'כלים ומערכות',
    ],
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

  // Filter out very low trust sources before presenting to agent
  const qualitySources = topSources.filter(s => s.trustScore >= 20);
  const highTrust = qualitySources.filter(s => s.trustScore >= 50).length;
  const lowTrust = qualitySources.filter(s => s.trustScore < 30).length;

  let sourcesTable =
    qualitySources.length > 0
      ? [
          '| סוג | כותרת | Trust | מחלקה |',
          '|---|---|---|---|',
          ...qualitySources.map((s) => {
            const tier = s.trustScore >= 70 ? '🟢' : s.trustScore >= 40 ? '🟡' : '🔴';
            return `| ${tier} ${s.sourceType} | [${s.title.slice(0, 55)}](${s.url}) | ${s.trustScore}/100 | ${s.department ?? 'כללי'} |`;
          }),
        ].join('\n')
      : 'לא נמצאו מקורות.';

  if (lowTrust > highTrust && qualitySources.length > 0) {
    sourcesTable += '\n\n> ⚠️ **שים לב:** רוב המקורות הם ברמת אמינות נמוכה. השתמש בשיקול דעת מקצועי ואל תסתמך על מקורות חלשים.';
  }

  // ── Skills block ──
  const skillsBlock = nexusConfig?.skills?.length
    ? `\n---\n\n## 🛠️ Skills רלוונטיים לפרויקט\n${nexusConfig.skills.map((s) => `- **${s.labelHe}** (\`${s.name}\`) — ${s.category}`).join('\n')}\n`
    : '';

  // ── Team members block (dept-specific, full CV) ──
  const deptTeam = nexusConfig?.teamMembers?.filter((m) => m.department === department) ?? [];
  const teamBlock = deptTeam.length > 0
    ? `\n---\n\n## 👥 צוות המחלקה שלך (${deptTeam.length} חברים)\n${deptTeam.map((m) => {
        let line = `### ${m.roleHe} (${m.level})`;
        if (m.experienceYears) line += ` — ${m.experienceYears} שנות ניסיון`;
        if (m.bio) line += `\n${m.bio}`;
        if (m.education) line += `\n- **השכלה:** ${m.education}`;
        if (m.background) line += `\n- **רקע:** ${m.background.slice(0, 300)}`;
        if (m.skills.length) line += `\n- **מומחיויות:** ${m.skills.join(', ')}`;
        if (m.domainExpertise?.length) line += `\n- **תחומי דומיין:** ${m.domainExpertise.join(', ')}`;
        if (m.responsibilities) line += `\n- **אחריות:** ${m.responsibilities}`;
        if (m.methodology) line += `\n- **גישת עבודה:** ${m.methodology}`;
        if (m.personality) line += ` | **סגנון:** ${m.personality}`;
        if (m.certifications?.length) line += `\n- **הסמכות:** ${m.certifications.join(', ')}`;
        return line;
      }).join('\n\n')}\n\n> קח בחשבון את הרקע, הניסיון, המומחיויות וגישת העבודה של כל חבר צוות בהמלצותיך. התאם את ההצעות ליכולות ולניסיון הקיימים.\n`
    : '';

  const contextNotesBlock = contextNotes?.trim()
    ? `\n---\n\n## ⚡ הוראות מיוחדות ממנהל המוצר (קרא לפני הכל)\n${contextNotes.trim()}\n`
    : '';

  const platformsBlock =
    targetPlatforms && targetPlatforms.length > 0
      ? `\n---\n\n## 🖥️ פלטפורמות יעד\nהפיצ'ר/רעיון זה מיועד ל: **${targetPlatforms.join(', ')}**.\nהתחשב בפלטפורמות אלו בכל המלצה טכנית, UX ומוצרית.\n`
      : '';

  const knowledgeBlock = deptKnowledge?.trim() || '';

  // Inject design system rules for design/cpo departments
  const designSystemBlock = (department === 'design' || department === 'cpo')
    ? `\n---\n\n${DESIGN_SYSTEM_RULES}\n`
    : '';

  const prompt = `# משימה: מחקר עבור הרעיון "${ideaPrompt}"
תאריך: ${new Date().toLocaleDateString('he-IL')}
${contextNotesBlock}${platformsBlock}${teamBlock}${skillsBlock}${knowledgeBlock}
---

${CLAUDE_CODE_CONTEXT}
${designSystemBlock}
---

## קוד הפרויקט הקיים (הקשר)
${codebaseContext.slice(0, 4000)}

---

${webIntelligence.synthesizedContext}

---

## מקורות מידע (ממוקדים למחלקת ${config.hebrewName})
${sourcesTable}

---

## כללי ציטוט מקורות (חובה!)
- כל טענה עובדתית חייבת לציין מקור: [שם המקור](URL) או "שיקול מקצועי"
- אל תשתמש במקורות עם Trust Score מתחת ל-40 אלא אם אין חלופה טובה יותר
- אם מקור לא רלוונטי ל-MemorAid / בריאות דיגיטלית / טיפול בקשישים — התעלם ממנו
- ציין סעיף "Known Unknowns" — מה לא הצלחת למצוא מידע עליו
- העדף מקורות עם Trust Score גבוה (70+) על פני נמוך
- אל תמציא מידע — אם אין מקור, כתוב "שיקול מקצועי"

---

## הרעיון לחקור
${ideaPrompt}

---

כעת בצע את המחקר שלך לפי תפקידך כ-${config.hebrewName}:`;

  // Warn if prompt is very large (rough token estimate: ~3.5 chars per token for Hebrew)
  const estimatedTokens = Math.round(prompt.length / 3.5);
  if (estimatedTokens > 12000) {
    console.warn(`[NEXUS] Prompt for ${department} is very large: ~${estimatedTokens} tokens (${prompt.length} chars). Risk of context window overflow.`);
  }

  return prompt;
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
  perDeptWebIntelligence?: Map<string, WebIntelligenceResult>;
  onDepartmentStart?: (department: DepartmentId, hebrewName: string) => void;
  onDepartmentComplete?: (result: DepartmentResult) => void;
}): Promise<DepartmentResult[]> {
  const { departments, onDepartmentStart, onDepartmentComplete, perDeptWebIntelligence, ...agentOpts } = opts;

  // Load all DB config ONCE before running all agents
  const nexusConfig = await loadNexusConfig();

  // Filter out inactive departments
  const activeDepts = departments.filter((d) => nexusConfig.deptSettings[d]?.isActive !== false);

  const promises = activeDepts.map(async (department) => {
    onDepartmentStart?.(department, nexusConfig.deptSettings[department]?.isActive !== false
      ? (DEPARTMENT_CONFIGS[department]?.hebrewName ?? department)
      : department);
    // Use per-department web intelligence if available, otherwise fall back to generic
    const deptWebIntel = perDeptWebIntelligence?.get(department) ?? agentOpts.webIntelligence;
    const result = await runDepartmentAgent({ ...agentOpts, webIntelligence: deptWebIntel, department, nexusConfig });
    onDepartmentComplete?.(result);
    return result;
  });

  const settled = await Promise.allSettled(promises);
  return settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    return {
      department: activeDepts[i],
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
  { id: 'ai-dev', hebrewName: 'תרגום AI לפיתוח (AI Dev)', emoji: '🤖', description: 'תרגום מחקר לתכנית פיתוח Claude Code — רץ אחרון' },
];

// ── AI Dev Translation — runs AFTER all departments, receives their outputs ──
export async function runAIDevTranslation(opts: {
  departmentResults: DepartmentResult[];
  ideaPrompt: string;
  codebaseContext: string;
  models: AIProviderId[];
  adminUserId?: string | null;
  nexusConfig?: NexusConfig;
  briefId?: string;
}): Promise<DepartmentResult> {
  const config = DEPARTMENT_CONFIGS['ai-dev'];
  const systemPrompt = opts.nexusConfig?.deptSettings?.['ai-dev']?.systemPromptOverride?.trim()
    || config.systemPrompt;

  // Build user prompt from all department outputs
  const deptOutputs = opts.departmentResults
    .filter(r => !r.error && r.department !== 'ai-dev')
    .map(r => {
      const info = getDepartmentInfo(r.department);
      return `## ${info.emoji} ${info.hebrewName}\n${r.output}`;
    })
    .join('\n\n---\n\n');

  // Load additional context for AI-Dev: Q&A answers + skills + department knowledge
  let qaBlock = '';
  let aiDevKnowledge = '';
  let skillsBlock = '';
  try {
    // Aggregate Q&A from ALL departments (not just ai-dev)
    if (opts.briefId) {
      const allDepts = opts.departmentResults.map(r => r.department).filter(d => d !== 'ai-dev');
      const qaChunks = await Promise.all(
        allDepts.map(d => getQAContextForDepartment(opts.briefId!, d).catch(() => ''))
      );
      const nonEmpty = qaChunks.filter(q => q.trim());
      if (nonEmpty.length > 0) {
        qaBlock = `\n---\n\n## שאלות ותשובות שנאספו מכל המחלקות\n${nonEmpty.join('\n\n')}\n`;
      }
    }
    // Load AI-Dev department knowledge
    aiDevKnowledge = await loadDeptKnowledge('ai-dev').catch(() => '');
    // Load skills taxonomy
    if (opts.nexusConfig?.skills?.length) {
      skillsBlock = `\n---\n\n## Skills רלוונטיים לפרויקט\n${opts.nexusConfig.skills
        .filter(s => s.isActive !== false)
        .map(s => `- **${s.labelHe ?? s.name}** (\`${s.name}\`) — ${s.category}`)
        .join('\n')}\n`;
    }
  } catch {
    // Non-fatal — AI-Dev can still work without these
  }

  const userPrompt = `# הרעיון לפיתוח: ${opts.ideaPrompt}

---

## קוד הפרויקט הקיים (הקשר)
${opts.codebaseContext.slice(0, 4000)}
${aiDevKnowledge ? `\n---\n\n${aiDevKnowledge}` : ''}${qaBlock}${skillsBlock}

---

## ממצאי כל המחלקות (${opts.departmentResults.filter(r => !r.error).length} מחלקות)

${deptOutputs}

---

כעת בצע את התרגום שלך: קח את כל ממצאי המחלקות למעלה ובנה brief פיתוח מובנה עבור Claude Code AI.
שים לב במיוחד ל:
1. הפרדה ברורה בין שכבות (user-frontend, admin-frontend, user-backend, admin-backend, server)
2. מה כבר קיים בקוד ומה חדש
3. סדר פיתוח מומלץ (DB → API → UI)
4. סיכונים ספציפיים לפיתוח ע"י AI
5. התייחס לתשובות ה-Q&A שנאספו למעלה — הן מכילות מידע קריטי מהאדמין`;

  const preferredModels: AIProviderId[] = opts.models.length > 0
    ? opts.models
    : opts.nexusConfig?.deptSettings?.['ai-dev']?.defaultModel
      ? [opts.nexusConfig.deptSettings['ai-dev'].defaultModel as AIProviderId]
      : [];

  try {
    const result = await callAI(
      'departmentAnalysis',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        preferredModels: preferredModels.length > 0 ? preferredModels : undefined,
        adminUserId: opts.adminUserId ?? undefined,
        maxTokens: 3000,
      }
    );

    return {
      department: 'ai-dev' as DepartmentId,
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
      department: 'ai-dev' as DepartmentId,
      output: `> ❌ שגיאה בתרגום AI: ${errorMsg}`,
      promptSnapshot: userPrompt,
      modelUsed: 'error',
      tokensUsed: 0,
      costUsd: 0,
      error: errorMsg,
    };
  }
}
