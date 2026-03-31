#!/usr/bin/env node
/**
 * Seed initial Nexus settings: Skills, Rules, Templates, DeptSettings.
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 * Usage: node scripts/seed-nexus-settings.mjs
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL required'); process.exit(1); }

const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: false } : false });

async function run() {
  const client = await pool.connect();
  try {
    // ── Skills ────────────────────────────────────────────────────────────────
    const skills = [
      { name: 'react',       labelHe: 'React + TypeScript',          color: '#61DAFB', category: 'tech',   description: 'ספריית ממשק משתמש — React 18 עם TypeScript ו-Vite' },
      { name: 'node-express',labelHe: 'Node.js + Express',           color: '#68A063', category: 'tech',   description: 'שרת backend — Node.js עם Express ו-TypeScript' },
      { name: 'postgresql',  labelHe: 'PostgreSQL + Drizzle ORM',    color: '#336791', category: 'tech',   description: 'מסד נתונים רלציוני — PostgreSQL עם Drizzle ORM ו-migrations' },
      { name: 'tailwind',    labelHe: 'Tailwind + shadcn/ui',        color: '#38BDF8', category: 'tech',   description: 'עיצוב UI — Tailwind CSS עם רכיבי shadcn/ui ו-Radix' },
      { name: 'ai-llm',      labelHe: 'AI / LLM (Claude, Gemini)',   color: '#A78BFA', category: 'ai',     description: 'אינטגרציות AI — Claude Sonnet/Haiku, Gemini Flash, multi-provider' },
      { name: 'healthcare',  labelHe: 'Healthcare & Medical Data',   color: '#EF4444', category: 'domain', description: 'תחום בריאות — מסמכים רפואיים, תרופות, תוצאות מעבדה, FHIR' },
      { name: 'security',    labelHe: 'Security & Privacy (HIPAA)',  color: '#F97316', category: 'domain', description: 'אבטחת מידע — HIPAA compliance, הצפנה, signed URLs, RBAC' },
      { name: 'ux-design',   labelHe: 'UX Design & Accessibility',   color: '#EC4899', category: 'design', description: 'חוויית משתמש — RTL, נגישות, mobile-first, onboarding flows' },
      { name: 'testing',     labelHe: 'Testing & QA',                color: '#22C55E', category: 'qa',     description: 'בדיקות — Vitest, integration tests, E2E, error boundaries' },
      { name: 'devops',      labelHe: 'DevOps & CI/CD',              color: '#EAB308', category: 'ops',    description: 'תשתית — Docker, Railway/Render, GitHub Actions, DB migrations' },
      { name: 'hebrew-rtl',  labelHe: 'Hebrew / RTL / i18n',        color: '#8B5CF6', category: 'tech',   description: 'ריבוי שפות — עברית RTL, i18n עם i18next, תמיכה בערבית' },
    ];

    let skillCount = 0;
    for (const s of skills) {
      const r = await client.query({
        text: `INSERT INTO nexus_skills (name, label_he, color, category, description)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (name) DO NOTHING`,
        values: [s.name, s.labelHe, s.color, s.category, s.description],
      });
      skillCount += r.rowCount ?? 0;
    }
    console.log(`  Skills: ${skillCount} inserted (${skills.length - skillCount} already existed)`);

    // ── Rules ─────────────────────────────────────────────────────────────────
    const rules = [
      {
        name: 'brief_approved_extract_tasks',
        description: 'כאשר ניירת מאושרת — חלץ משימות פיתוח אוטומטית',
        triggerType: 'brief_status_change',
        conditionJson: { status: 'approved' },
        actionType: 'auto_extract_tasks',
        actionPayload: { maxTasks: 15, autoSprint: false },
        priority: 10,
      },
      {
        name: 'research_done_notify_admin',
        description: 'כאשר מחקר הסתיים — שלח התראה לאדמין לאישור',
        triggerType: 'brief_status_change',
        conditionJson: { status: 'review' },
        actionType: 'notify_admin',
        actionPayload: { message: 'ניירת מחקר חדשה ממתינה לאישורך' },
        priority: 5,
      },
      {
        name: 'sprint_created_audit_log',
        description: 'כאשר Sprint נוצר מניירת Nexus — תעד ביומן ביקורת',
        triggerType: 'sprint_created',
        conditionJson: { source: 'nexus' },
        actionType: 'audit_log',
        actionPayload: { logLevel: 'info', message: 'Sprint נוצר מניירת Nexus' },
        priority: 1,
      },
    ];

    let ruleCount = 0;
    for (const r of rules) {
      const res = await client.query({
        text: `INSERT INTO nexus_rules (name, description, trigger_type, condition_json, action_type, action_payload, priority)
               SELECT $1::text, $2::text, $3::text, $4::jsonb, $5::text, $6::jsonb, $7::int
               WHERE NOT EXISTS (SELECT 1 FROM nexus_rules WHERE name = $1::text)`,
        values: [r.name, r.description, r.triggerType, JSON.stringify(r.conditionJson), r.actionType, JSON.stringify(r.actionPayload), r.priority],
      });
      ruleCount += res.rowCount ?? 0;
    }
    console.log(`  Rules: ${ruleCount} inserted (${rules.length - ruleCount} already existed)`);

    // ── Templates ─────────────────────────────────────────────────────────────
    const templates = [
      {
        name: 'full-research',
        nameHe: 'מחקר מלא — כל המחלקות',
        description: 'מחקר מקיף עם כל 9 מחלקות Nexus. מתאים לתכנון פיצ\'רים גדולים, ניתוח מעמיק, ו-sprints חדשים.',
        departments: ['ceo', 'cto', 'cpo', 'rd', 'design', 'product', 'security', 'legal', 'marketing'],
        models: ['claude-sonnet-4-6'],
        codebaseDepth: 'full',
        codebaseScope: 'all',
        isDefault: true,
      },
      {
        name: 'quick-review',
        nameHe: 'סקירה מהירה — הנהלה',
        description: 'סקירה ניהולית מהירה עם CEO, CTO ו-CPO בלבד. מתאים להחלטות מהירות ובדיקות היתכנות.',
        departments: ['ceo', 'cto', 'cpo'],
        models: ['claude-sonnet-4-6'],
        codebaseDepth: 'quick',
        codebaseScope: 'all',
        isDefault: false,
      },
      {
        name: 'security-audit',
        nameHe: 'ביקורת אבטחה ומשפט',
        description: 'ביקורת אבטחה מעמיקה עם מחלקות Security, Legal ו-CTO. מתאים לבדיקות HIPAA, privacy review, ו-penetration test planning.',
        departments: ['security', 'legal', 'cto'],
        models: ['claude-sonnet-4-6'],
        codebaseDepth: 'deep',
        codebaseScope: 'server',
        isDefault: false,
      },
      {
        name: 'feature-planning',
        nameHe: 'תכנון פיצ\'ר — פיתוח ועיצוב',
        description: 'תכנון פיצ\'ר חדש עם CTO, R&D, Design, Product ו-CPO. מתאים לתכנון UI/UX ואדריכלות טכנית.',
        departments: ['cto', 'rd', 'design', 'product', 'cpo'],
        models: ['claude-sonnet-4-6'],
        codebaseDepth: 'deep',
        codebaseScope: 'all',
        isDefault: false,
      },
    ];

    // Reset is_default before inserting
    await client.query({ text: `UPDATE nexus_templates SET is_default = false WHERE is_default = true`, values: [] });

    let tplCount = 0;
    for (const t of templates) {
      const res = await client.query({
        text: `INSERT INTO nexus_templates (name, name_he, description, departments, models, codebase_depth, codebase_scope, is_default)
               SELECT $1::text, $2::text, $3::text, $4::text[], $5::text[], $6::text, $7::text, $8::boolean
               WHERE NOT EXISTS (SELECT 1 FROM nexus_templates WHERE name = $1::text)`,
        values: [
          t.name, t.nameHe, t.description,
          t.departments, t.models,
          t.codebaseDepth, t.codebaseScope, t.isDefault,
        ],
      });
      tplCount += res.rowCount ?? 0;
    }
    console.log(`  Templates: ${tplCount} inserted (${templates.length - tplCount} already existed)`);

    // ── DeptSettings ──────────────────────────────────────────────────────────
    const outputSections = ['summary', 'findings', 'recommendations', 'risks', 'next_steps'];
    const depts = [
      { department: 'ceo',       labelHe: 'מנכ"ל',          emoji: '👔', defaultModel: 'claude-sonnet-4-6' },
      { department: 'cto',       labelHe: 'מנמ"ט / CTO',    emoji: '🖥️', defaultModel: 'claude-sonnet-4-6' },
      { department: 'cpo',       labelHe: 'מנהל מוצר / CPO',emoji: '📦', defaultModel: 'claude-sonnet-4-6' },
      { department: 'rd',        labelHe: 'מחקר ופיתוח',    emoji: '🔬', defaultModel: 'claude-sonnet-4-6' },
      { department: 'design',    labelHe: 'עיצוב ו-UX',     emoji: '🎨', defaultModel: 'claude-sonnet-4-6' },
      { department: 'product',   labelHe: 'פרודקט',          emoji: '🗺️', defaultModel: 'claude-sonnet-4-6' },
      { department: 'security',  labelHe: 'אבטחת מידע',     emoji: '🔒', defaultModel: 'claude-sonnet-4-6' },
      { department: 'legal',     labelHe: 'משפטי ורגולציה', emoji: '⚖️', defaultModel: 'claude-sonnet-4-6' },
      { department: 'marketing', labelHe: 'שיווק ומכירות',  emoji: '📣', defaultModel: 'claude-haiku-4-5'  },
    ];

    let deptCount = 0;
    for (const d of depts) {
      const res = await client.query({
        text: `INSERT INTO nexus_dept_settings (department, label_he, emoji, default_model, is_active, output_sections)
               VALUES ($1, $2, $3, $4, true, $5::jsonb)
               ON CONFLICT (department) DO NOTHING`,
        values: [d.department, d.labelHe, d.emoji, d.defaultModel, JSON.stringify(outputSections)],
      });
      deptCount += res.rowCount ?? 0;
    }
    console.log(`  DeptSettings: ${deptCount} inserted (${depts.length - deptCount} already existed)`);

    console.log('\n✅ Nexus settings seeded successfully');
    console.log('   → /admin/nexus/settings to verify');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
