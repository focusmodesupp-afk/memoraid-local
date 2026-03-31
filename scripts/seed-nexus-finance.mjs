#!/usr/bin/env node
/**
 * Seed Finance department — team members + web feeds.
 * Safe to run multiple times (WHERE NOT EXISTS / ON CONFLICT DO NOTHING).
 *
 * Usage: node scripts/seed-nexus-finance.mjs
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
    // ── Ensure nexus_dept_team_members table exists ────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS nexus_dept_team_members (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        department    TEXT NOT NULL,
        name          TEXT NOT NULL,
        role_en       TEXT NOT NULL,
        role_he       TEXT NOT NULL,
        emoji         TEXT NOT NULL DEFAULT '👤',
        level         TEXT NOT NULL DEFAULT 'member',
        responsibilities TEXT,
        skills        TEXT[],
        default_model TEXT,
        system_prompt_override TEXT,
        is_active     BOOLEAN NOT NULL DEFAULT true,
        order_index   INTEGER NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── Ensure nexus_web_feeds table exists ────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS nexus_web_feeds (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type TEXT NOT NULL,
        url         TEXT NOT NULL,
        label       TEXT NOT NULL,
        category    TEXT NOT NULL DEFAULT 'tech',
        departments TEXT[],
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_nexus_web_feeds_url ON nexus_web_feeds(url)
    `);

    // ── Team Members — Finance Department ─────────────────────────────────────
    const members = [
      {
        department: 'finance',
        name: 'Chief Financial Officer',
        role_en: 'cfo',
        role_he: 'מנהל כספים ראשי (CFO)',
        emoji: '💰',
        level: 'clevel',
        responsibilities: 'אסטרטגיה פיננסית, board reporting, fundraising, M&A, investor relations',
        skills: ['financial-strategy', 'fundraising', 'board-reporting', 'ma', 'unit-economics'],
        order_index: 0,
      },
      {
        department: 'finance',
        name: 'VP Finance',
        role_en: 'vp-finance',
        role_he: 'סמנכ"ל כספים',
        emoji: '📊',
        level: 'manager',
        responsibilities: 'תקציב, FP&A, financial controls, חשבונאות ניהולית',
        skills: ['fp-and-a', 'budgeting', 'financial-controls', 'saas-metrics'],
        order_index: 1,
      },
      {
        department: 'finance',
        name: 'FP&A Lead',
        role_en: 'fpa-lead',
        role_he: 'מוביל FP&A',
        emoji: '📈',
        level: 'senior',
        responsibilities: 'תחזיות פיננסיות, מודלים עסקיים, scenario planning, sensitivity analysis',
        skills: ['financial-modeling', 'forecasting', 'scenario-planning', 'excel', 'python'],
        order_index: 2,
      },
      {
        department: 'finance',
        name: 'Controller',
        role_en: 'controller',
        role_he: 'בקר פיננסי',
        emoji: '🧾',
        level: 'senior',
        responsibilities: 'חשבונאות, audit, compliance, GAAP, financial reporting',
        skills: ['accounting', 'gaap', 'audit', 'compliance', 'quickbooks'],
        order_index: 3,
      },
      {
        department: 'finance',
        name: 'BI Analyst',
        role_en: 'bi-analyst',
        role_he: 'אנליסט BI',
        emoji: '📉',
        level: 'senior',
        responsibilities: 'דשבורדים פיננסיים, cohort analysis, data models, revenue attribution',
        skills: ['sql', 'tableau', 'looker', 'dbt', 'cohort-analysis', 'revenue-analytics'],
        order_index: 4,
      },
      {
        department: 'finance',
        name: 'Revenue Operations Manager',
        role_en: 'revenue-ops',
        role_he: 'מנהל Revenue Operations',
        emoji: '💹',
        level: 'member',
        responsibilities: 'CRM data integrity, pipeline ops, revenue tracking, commission calculations',
        skills: ['salesforce', 'hubspot', 'revenue-tracking', 'pipeline-ops', 'clari'],
        order_index: 5,
      },
      {
        department: 'finance',
        name: 'Cost Accountant',
        role_en: 'cost-accountant',
        role_he: 'רואה חשבון עלויות',
        emoji: '🧮',
        level: 'member',
        responsibilities: 'COGS analysis, unit cost per feature, variance analysis, cost allocation',
        skills: ['cost-accounting', 'cogs', 'variance-analysis', 'cost-allocation'],
        order_index: 6,
      },
    ];

    let membersInserted = 0;
    for (const m of members) {
      const res = await client.query({
        text: `INSERT INTO nexus_dept_team_members
               (department, name, role_en, role_he, emoji, level, responsibilities, skills, order_index)
               SELECT $1,$2,$3,$4,$5,$6,$7,$8::text[],$9
               WHERE NOT EXISTS (SELECT 1 FROM nexus_dept_team_members WHERE department=$1 AND role_en=$3)`,
        values: [m.department, m.name, m.role_en, m.role_he, m.emoji, m.level, m.responsibilities, m.skills, m.order_index],
      });
      membersInserted += res.rowCount ?? 0;
    }
    console.log(`✅ Finance team members: ${membersInserted} inserted (${members.length - membersInserted} already existed)`);

    // ── Web Feeds — Finance ────────────────────────────────────────────────────
    const feeds = [
      // RSS — Business & Finance
      { source_type: 'rss', url: 'https://www.saastr.com/feed/',                      label: 'SaaStr',                   category: 'business',   departments: ['finance', 'ceo', 'marketing'] },
      { source_type: 'rss', url: 'https://review.firstround.com/feed',                label: 'First Round Review',        category: 'business',   departments: ['finance', 'ceo'] },
      { source_type: 'rss', url: 'https://openviewpartners.com/feed/',                label: 'OpenView Partners',         category: 'finance',    departments: ['finance'] },
      { source_type: 'rss', url: 'https://www.cfodive.com/feeds/news/',               label: 'CFO Dive',                  category: 'finance',    departments: ['finance'] },
      { source_type: 'rss', url: 'https://tomtunguz.com/index.xml',                   label: 'Tomasz Tunguz (VC/SaaS)',   category: 'finance',    departments: ['finance', 'ceo'] },
      { source_type: 'rss', url: 'https://neilpatel.com/blog/feed/',                  label: 'Neil Patel (Growth)',       category: 'marketing',  departments: ['finance', 'marketing'] },
      { source_type: 'rss', url: 'https://www.profitwell.com/recur/all/rss.xml',      label: 'ProfitWell (SaaS Metrics)', category: 'finance',    departments: ['finance'] },
      { source_type: 'rss', url: 'https://baremetrics.com/blog/feed',                 label: 'Baremetrics Blog',          category: 'finance',    departments: ['finance'] },
      { source_type: 'rss', url: 'https://chartmogul.com/blog/feed/',                 label: 'ChartMogul Blog',           category: 'finance',    departments: ['finance'] },
      // YouTube — Finance / Business
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCiNaM6xUJf6MLQF-v0x5rGg', label: 'Patrick Boyle (Finance)', category: 'finance', departments: ['finance'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCpFLjdKjxUVTaB7PNTz2MWg', label: 'Y Combinator',             category: 'business', departments: ['finance', 'ceo'] },
      // Reddit
      { source_type: 'reddit', url: 'CFO',             label: 'r/CFO',             category: 'finance',  departments: ['finance'] },
      { source_type: 'reddit', url: 'SaaS',            label: 'r/SaaS',            category: 'business', departments: ['finance', 'ceo', 'marketing'] },
      { source_type: 'reddit', url: 'ycombinator',     label: 'r/ycombinator',     category: 'business', departments: ['finance', 'ceo', 'rd'] },
      { source_type: 'reddit', url: 'Accounting',      label: 'r/Accounting',      category: 'finance',  departments: ['finance'] },
      { source_type: 'reddit', url: 'financialmodel',  label: 'r/financialmodel',  category: 'finance',  departments: ['finance'] },
      // GitHub search queries
      { source_type: 'github', url: 'SaaS financial modeling unit economics dashboard',  label: 'SaaS Financial Modeling', category: 'finance', departments: ['finance', 'ceo'] },
      { source_type: 'github', url: 'LTV CAC churn revenue analytics',                   label: 'LTV CAC Revenue Analytics', category: 'finance', departments: ['finance'] },
      { source_type: 'github', url: 'revenue operations metrics pipeline',               label: 'Revenue Operations',      category: 'finance', departments: ['finance', 'marketing'] },
    ];

    let feedsInserted = 0;
    for (const f of feeds) {
      const res = await client.query({
        text: `INSERT INTO nexus_web_feeds (source_type, url, label, category, departments)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (url) DO NOTHING`,
        values: [f.source_type, f.url, f.label, f.category, f.departments],
      });
      feedsInserted += res.rowCount ?? 0;
    }
    console.log(`✅ Finance web feeds: ${feedsInserted} inserted (${feeds.length - feedsInserted} already existed)`);

    // ── Insert Finance dept setting ────────────────────────────────────────────
    await client.query(`
      INSERT INTO nexus_dept_settings (department, label_he, emoji, default_model, is_active, output_sections)
      VALUES ('finance', 'פיננסים ו-BI', '💰', 'claude-sonnet-4-6', true,
              '["ניתוח עלות-תועלת","מודל הכנסות","מבנה עלויות","Unit Economics","Burn Rate & Runway","Stage-Gate Checkpoints","BI ומדידה","החלטת CFO"]'::jsonb)
      ON CONFLICT (department) DO UPDATE SET
        label_he = EXCLUDED.label_he,
        emoji    = EXCLUDED.emoji,
        default_model = EXCLUDED.default_model,
        output_sections = EXCLUDED.output_sections,
        updated_at = now()
    `);
    console.log('✅ Finance dept setting upserted');

    console.log('\n✅ Finance department seed complete!');
    console.log('→ /admin/nexus/settings → Agents → רואים 💰 CFO card');
    console.log('→ /admin/nexus/settings → מחלקות → Finance + 7 team members');
    console.log('→ ניירת חדשה → בחר Finance → קבל ניתוח CFO מלא');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
