#!/usr/bin/env node
/**
 * Nexus Team Members migration.
 * Creates nexus_dept_team_members table for sub-team hierarchy per department.
 * Safe to run multiple times (IF NOT EXISTS).
 *
 * Usage: node scripts/migrate-nexus-team-members.mjs
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS nexus_dept_team_members (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        department    TEXT NOT NULL,           -- ceo / cto / cpo / rd / design / product / security / legal / marketing
        name          TEXT NOT NULL,           -- שם התפקיד
        role_en       TEXT NOT NULL,           -- e.g. "senior-dev", "qa-lead"
        role_he       TEXT NOT NULL,           -- שם התפקיד בעברית
        emoji         TEXT NOT NULL DEFAULT '👤',
        level         TEXT NOT NULL DEFAULT 'member', -- clevel / manager / senior / member / junior
        responsibilities TEXT,               -- תחומי אחריות
        skills        TEXT[],                 -- מערך מיומנויות
        default_model TEXT,                  -- claude-sonnet-4-6 etc.
        system_prompt_override TEXT,         -- system prompt אישי (אופציונלי)
        is_active     BOOLEAN NOT NULL DEFAULT true,
        order_index   INTEGER NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    console.log('✅ nexus_dept_team_members table created');

    // Index for fast department lookup
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nexus_dept_team_members_dept
        ON nexus_dept_team_members (department, order_index)
    `);
    console.log('✅ Index created');

    // Seed default team members per department
    const members = [
      // CEO office
      { department: 'ceo', name: 'Chief Executive Officer', role_en: 'ceo', role_he: 'מנכ"ל', emoji: '👔', level: 'clevel', responsibilities: 'אסטרטגיה כוללת, החלטות עסקיות, חזון החברה', skills: ['strategy', 'business', 'leadership'], order_index: 0 },
      { department: 'ceo', name: 'Chief Operating Officer', role_en: 'coo', role_he: 'מנכ"ל תפעול', emoji: '⚡', level: 'clevel', responsibilities: 'תפעול שוטף, תהליכים, יעילות ארגונית', skills: ['operations', 'process', 'management'], order_index: 1 },
      { department: 'ceo', name: 'Business Analyst', role_en: 'business-analyst', role_he: 'אנליסט עסקי', emoji: '📊', level: 'senior', responsibilities: 'ניתוח שוק, ROI, מחקר תחרות', skills: ['analysis', 'market-research', 'data'], order_index: 2 },

      // CTO office
      { department: 'cto', name: 'Chief Technology Officer', role_en: 'cto', role_he: 'מנמ"ר טכנולוגיה', emoji: '⚙️', level: 'clevel', responsibilities: 'אדריכלות, תשתיות, tech stack, הנהגה טכנית', skills: ['architecture', 'typescript', 'devops'], order_index: 0 },
      { department: 'cto', name: 'Lead Backend Developer', role_en: 'lead-backend', role_he: 'מוביל Backend', emoji: '🖥️', level: 'manager', responsibilities: 'API design, DB schema, server performance', skills: ['node', 'postgresql', 'redis'], order_index: 1 },
      { department: 'cto', name: 'Lead Frontend Developer', role_en: 'lead-frontend', role_he: 'מוביל Frontend', emoji: '💻', level: 'manager', responsibilities: 'React architecture, component library, performance', skills: ['react', 'typescript', 'tailwind'], order_index: 2 },
      { department: 'cto', name: 'DevOps Engineer', role_en: 'devops', role_he: 'מהנדס DevOps', emoji: '🔧', level: 'senior', responsibilities: 'CI/CD, containerization, cloud infrastructure', skills: ['docker', 'github-actions', 'aws'], order_index: 3 },

      // CPO office
      { department: 'cpo', name: 'Chief Product Officer', role_en: 'cpo', role_he: 'מנהל מוצר ראשי', emoji: '🎯', level: 'clevel', responsibilities: 'אסטרטגיית מוצר, vision, roadmap ארוך-טווח', skills: ['product-strategy', 'vision', 'okr'], order_index: 0 },
      { department: 'cpo', name: 'Senior Product Manager', role_en: 'senior-pm', role_he: 'מנהל מוצר בכיר', emoji: '📌', level: 'senior', responsibilities: 'Feature prioritization, sprint planning, stakeholder management', skills: ['agile', 'scrum', 'jira'], order_index: 1 },
      { department: 'cpo', name: 'User Researcher', role_en: 'user-researcher', role_he: 'חוקר UX', emoji: '🔍', level: 'member', responsibilities: 'User interviews, usability testing, personas', skills: ['ux-research', 'analytics', 'surveys'], order_index: 2 },

      // R&D
      { department: 'rd', name: 'R&D Director', role_en: 'rd-director', role_he: 'מנהל R&D', emoji: '🔬', level: 'manager', responsibilities: 'מחקר טכני, ניסויים, POC, בחינת טכנולוגיות', skills: ['research', 'prototyping', 'ml'], order_index: 0 },
      { department: 'rd', name: 'Senior R&D Engineer', role_en: 'rd-senior', role_he: 'מהנדס R&D בכיר', emoji: '🧪', level: 'senior', responsibilities: 'Proof of concept, library evaluation, benchmarking', skills: ['node', 'python', 'ai-integration'], order_index: 1 },
      { department: 'rd', name: 'AI/ML Engineer', role_en: 'ai-engineer', role_he: 'מהנדס AI/ML', emoji: '🤖', level: 'senior', responsibilities: 'LLM integration, prompt engineering, AI pipelines', skills: ['claude', 'gemini', 'langchain', 'embeddings'], order_index: 2 },

      // Design
      { department: 'design', name: 'Design Lead', role_en: 'design-lead', role_he: 'מוביל עיצוב', emoji: '🎨', level: 'manager', responsibilities: 'Design system, brand identity, UX vision', skills: ['figma', 'design-system', 'accessibility'], order_index: 0 },
      { department: 'design', name: 'UX Designer', role_en: 'ux-designer', role_he: 'מעצב UX', emoji: '📐', level: 'senior', responsibilities: 'User flows, wireframes, prototyping, usability', skills: ['figma', 'user-flows', 'prototyping'], order_index: 1 },
      { department: 'design', name: 'UI Developer', role_en: 'ui-dev', role_he: 'מפתח UI', emoji: '✨', level: 'member', responsibilities: 'Component implementation, animations, RTL', skills: ['react', 'tailwind', 'framer-motion'], order_index: 2 },

      // Product Management
      { department: 'product', name: 'Product Manager', role_en: 'pm', role_he: 'מנהל מוצר', emoji: '📋', level: 'manager', responsibilities: 'Backlog management, sprint planning, roadmap', skills: ['agile', 'scrum', 'product-analytics'], order_index: 0 },
      { department: 'product', name: 'Scrum Master', role_en: 'scrum-master', role_he: 'Scrum Master', emoji: '🔄', level: 'senior', responsibilities: 'Sprint ceremonies, blockers removal, team velocity', skills: ['scrum', 'kanban', 'facilitation'], order_index: 1 },

      // Security
      { department: 'security', name: 'CISO', role_en: 'ciso', role_he: 'מנהל אבטחת מידע', emoji: '🔒', level: 'clevel', responsibilities: 'Security strategy, compliance, incident response', skills: ['owasp', 'gdpr', 'hipaa', 'pentesting'], order_index: 0 },
      { department: 'security', name: 'AppSec Engineer', role_en: 'appsec', role_he: 'מהנדס AppSec', emoji: '🛡️', level: 'senior', responsibilities: 'Code review, vulnerability scanning, SAST/DAST', skills: ['sast', 'owasp-zap', 'burp-suite'], order_index: 1 },

      // Legal
      { department: 'legal', name: 'General Counsel', role_en: 'general-counsel', role_he: 'יועץ משפטי ראשי', emoji: '⚖️', level: 'clevel', responsibilities: 'Legal strategy, contracts, IP protection', skills: ['gdpr', 'ip-law', 'contracts'], order_index: 0 },
      { department: 'legal', name: 'Compliance Officer', role_en: 'compliance', role_he: 'קצין ציות', emoji: '📜', level: 'senior', responsibilities: 'GDPR compliance, data processing, privacy policy', skills: ['gdpr', 'hipaa', 'iso27001'], order_index: 1 },

      // Marketing
      { department: 'marketing', name: 'CMO', role_en: 'cmo', role_he: 'מנהל שיווק ראשי', emoji: '📣', level: 'clevel', responsibilities: 'Marketing strategy, brand, growth', skills: ['growth', 'brand', 'gtm'], order_index: 0 },
      { department: 'marketing', name: 'Growth Hacker', role_en: 'growth', role_he: 'מנהל צמיחה', emoji: '📈', level: 'senior', responsibilities: 'SEO, paid ads, conversion optimization, analytics', skills: ['seo', 'paid-ads', 'analytics', 'a-b-testing'], order_index: 1 },
      { department: 'marketing', name: 'Content Strategist', role_en: 'content', role_he: 'אסטרטג תוכן', emoji: '✍️', level: 'member', responsibilities: 'Content marketing, blog, thought leadership', skills: ['content', 'copywriting', 'seo'], order_index: 2 },
    ];

    let inserted = 0;
    for (const m of members) {
      const res = await client.query({
        text: `INSERT INTO nexus_dept_team_members
               (department, name, role_en, role_he, emoji, level, responsibilities, skills, order_index)
               SELECT $1,$2,$3,$4,$5,$6,$7,$8::text[],$9
               WHERE NOT EXISTS (SELECT 1 FROM nexus_dept_team_members WHERE department=$1 AND role_en=$3)`,
        values: [m.department, m.name, m.role_en, m.role_he, m.emoji, m.level, m.responsibilities, m.skills, m.order_index],
      });
      inserted += res.rowCount ?? 0;
    }
    console.log(`✅ Team members: ${inserted} inserted (${members.length - inserted} already existed)`);
    console.log('\n✅ Nexus team members migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
