#!/usr/bin/env node
/**
 * Seed COMPLETE Nexus team hierarchy — all departments fully staffed.
 * Safe to run multiple times (WHERE NOT EXISTS on role_en per department).
 * Usage: node scripts/seed-nexus-full-teams.mjs
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL required'); process.exit(1); }
const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: false } : false });

const members = [
  // ── CEO OFFICE ──────────────────────────────────────────────────────────────
  { department: 'ceo', name: 'Chief Executive Officer',       role_en: 'ceo',              role_he: 'מנכ"ל',                   emoji: '👔', level: 'clevel',  responsibilities: 'חזון, אסטרטגיה כוללת, החלטות עסקיות, יחסי משקיעים',              skills: ['strategy','leadership','vision','investor-relations'], order_index: 0 },
  { department: 'ceo', name: 'Chief Operating Officer',       role_en: 'coo',              role_he: 'מנכ"ל תפעול (COO)',        emoji: '⚡', level: 'clevel',  responsibilities: 'תפעול שוטף, OKRs, תהליכים ארגוניים, יעילות',                    skills: ['operations','okr','process','management'], order_index: 1 },
  { department: 'ceo', name: 'Chief Financial Officer',       role_en: 'cfo',              role_he: 'מנהל כספים (CFO)',         emoji: '💰', level: 'clevel',  responsibilities: 'תקציב, תזרים מזומנים, P&L, תכנון פיננסי',                       skills: ['finance','budgeting','pl','forecasting'], order_index: 2 },
  { department: 'ceo', name: 'Business Analyst',              role_en: 'business-analyst', role_he: 'אנליסט עסקי',              emoji: '📊', level: 'senior',  responsibilities: 'ניתוח שוק, ROI, מחקר תחרות, business cases',                    skills: ['analysis','market-research','excel','sql'], order_index: 3 },
  { department: 'ceo', name: 'Executive Assistant',           role_en: 'exec-assistant',   role_he: 'עוזר/ת מנכ"ל',            emoji: '🗂️', level: 'member',  responsibilities: 'תיאום, לוחות זמנים, דוחות הנהלה',                              skills: ['coordination','reporting','communication'], order_index: 4 },

  // ── CTO OFFICE ──────────────────────────────────────────────────────────────
  { department: 'cto', name: 'Chief Technology Officer',      role_en: 'cto',              role_he: 'מנמ"ר טכנולוגיה (CTO)',   emoji: '⚙️', level: 'clevel',  responsibilities: 'ארכיטקטורה, tech stack, הנהגה טכנית, tech debt',               skills: ['architecture','typescript','node','postgresql','devops'], order_index: 0 },
  { department: 'cto', name: 'VP Engineering',                role_en: 'vp-engineering',   role_he: 'סמנכ"ל הנדסה',           emoji: '🏗️', level: 'clevel',  responsibilities: 'ניהול צוותי פיתוח, hiring, team health, velocity',              skills: ['engineering-management','hiring','agile','metrics'], order_index: 1 },
  { department: 'cto', name: 'Lead Backend Developer',        role_en: 'lead-backend',     role_he: 'מוביל Backend',            emoji: '🖥️', level: 'manager', responsibilities: 'API design, DB schema, performance, code reviews',              skills: ['node','express','postgresql','redis','api-design'], order_index: 2 },
  { department: 'cto', name: 'Lead Frontend Developer',       role_en: 'lead-frontend',    role_he: 'מוביל Frontend',           emoji: '💻', level: 'manager', responsibilities: 'React architecture, component library, state management',        skills: ['react','typescript','vite','tailwind','zustand'], order_index: 3 },
  { department: 'cto', name: 'Senior Full Stack Developer',   role_en: 'senior-fullstack',  role_he: 'מפתח Full Stack בכיר',   emoji: '🧑‍💻', level: 'senior', responsibilities: 'Feature development, architecture decisions, mentoring',          skills: ['react','node','postgresql','typescript','rest-api'], order_index: 4 },
  { department: 'cto', name: 'Senior Backend Developer',      role_en: 'senior-backend',   role_he: 'מפתח Backend בכיר',       emoji: '🔙', level: 'senior',  responsibilities: 'Server-side logic, DB optimization, integrations',              skills: ['node','postgresql','redis','drizzle','websockets'], order_index: 5 },
  { department: 'cto', name: 'Senior Frontend Developer',     role_en: 'senior-frontend',  role_he: 'מפתח Frontend בכיר',      emoji: '🔲', level: 'senior',  responsibilities: 'UI implementation, performance optimization, accessibility',    skills: ['react','typescript','css','performance','a11y'], order_index: 6 },
  { department: 'cto', name: 'Mobile Developer',              role_en: 'mobile-dev',       role_he: 'מפתח Mobile',              emoji: '📱', level: 'senior',  responsibilities: 'React Native / PWA, iOS & Android, push notifications',         skills: ['react-native','pwa','ios','android','expo'], order_index: 7 },
  { department: 'cto', name: 'Full Stack Developer',          role_en: 'fullstack-mid',    role_he: 'מפתח Full Stack',          emoji: '⚡', level: 'member',  responsibilities: 'Feature development, bug fixes, testing',                      skills: ['react','node','typescript','git'], order_index: 8 },
  { department: 'cto', name: 'Junior Developer',              role_en: 'junior-dev',       role_he: 'מפתח זוטר',               emoji: '🌱', level: 'junior',  responsibilities: 'Feature implementation under guidance, bug fixes',              skills: ['javascript','react','git','html-css'], order_index: 9 },
  { department: 'cto', name: 'DevOps / Platform Engineer',    role_en: 'devops',           role_he: 'מהנדס DevOps',             emoji: '🔧', level: 'senior',  responsibilities: 'CI/CD, Docker, cloud, monitoring, deployment',                  skills: ['docker','github-actions','aws','nginx','monitoring'], order_index: 10 },
  { department: 'cto', name: 'Database Administrator',        role_en: 'dba',              role_he: 'מנהל מסד נתונים (DBA)',    emoji: '🗄️', level: 'senior',  responsibilities: 'Query optimization, indexing, backups, migrations',             skills: ['postgresql','sql','performance','drizzle','backup'], order_index: 11 },

  // ── CPO OFFICE ──────────────────────────────────────────────────────────────
  { department: 'cpo', name: 'Chief Product Officer',         role_en: 'cpo',              role_he: 'מנהל מוצר ראשי (CPO)',    emoji: '🎯', level: 'clevel',  responsibilities: 'אסטרטגיית מוצר, product vision, roadmap ארוך-טווח',            skills: ['product-strategy','vision','okr','roadmap'], order_index: 0 },
  { department: 'cpo', name: 'Senior Product Manager',        role_en: 'senior-pm',        role_he: 'מנהל מוצר בכיר',          emoji: '📌', level: 'senior',  responsibilities: 'Feature prioritization, sprint planning, stakeholders',         skills: ['agile','scrum','jira','figma','analytics'], order_index: 1 },
  { department: 'cpo', name: 'Product Manager',               role_en: 'pm',               role_he: 'מנהל/ת מוצר',             emoji: '📋', level: 'member',  responsibilities: 'User stories, backlog, acceptance criteria, daily standups',    skills: ['agile','jira','product-analytics','communication'], order_index: 2 },
  { department: 'cpo', name: 'User Researcher',               role_en: 'user-researcher',  role_he: 'חוקר/ת חוויית משתמש',     emoji: '🔍', level: 'member',  responsibilities: 'User interviews, usability testing, personas, surveys',         skills: ['ux-research','analytics','surveys','hotjar'], order_index: 3 },
  { department: 'cpo', name: 'Product Analyst',               role_en: 'product-analyst',  role_he: 'אנליסט מוצר',             emoji: '📈', level: 'member',  responsibilities: 'Data analysis, A/B tests, funnel analysis, dashboards',         skills: ['sql','mixpanel','amplitude','python','excel'], order_index: 4 },
  { department: 'cpo', name: 'Business Intelligence Analyst', role_en: 'bi-analyst',       role_he: 'אנליסט BI',               emoji: '🔮', level: 'senior',  responsibilities: 'KPI dashboards, data warehouse, reporting',                    skills: ['sql','tableau','dbt','bi','data-warehouse'], order_index: 5 },

  // ── R&D ─────────────────────────────────────────────────────────────────────
  { department: 'rd',  name: 'R&D Director',                  role_en: 'rd-director',      role_he: 'מנהל R&D',                emoji: '🔬', level: 'manager', responsibilities: 'מחקר טכני, ניסויים, POC, בחינת טכנולוגיות',                     skills: ['research','prototyping','ml','innovation'], order_index: 0 },
  { department: 'rd',  name: 'Senior R&D Engineer',           role_en: 'rd-senior',        role_he: 'מהנדס R&D בכיר',          emoji: '🧪', level: 'senior',  responsibilities: 'POC, library evaluation, benchmarking, architecture experiments',skills: ['node','python','benchmarking','prototyping'], order_index: 1 },
  { department: 'rd',  name: 'AI/ML Engineer',                role_en: 'ai-engineer',      role_he: 'מהנדס AI/ML',             emoji: '🤖', level: 'senior',  responsibilities: 'LLM integration, prompt engineering, AI pipelines, embeddings', skills: ['claude','gemini','openai','langchain','embeddings','rag'], order_index: 2 },
  { department: 'rd',  name: 'NLP Research Engineer',         role_en: 'nlp-engineer',     role_he: 'מהנדס NLP',               emoji: '🧠', level: 'senior',  responsibilities: 'Natural language processing, text classification, named entity recognition', skills: ['nlp','transformers','spacy','bert','python'], order_index: 3 },
  { department: 'rd',  name: 'Data Engineer',                 role_en: 'data-engineer',    role_he: 'מהנדס נתונים',            emoji: '🔗', level: 'member',  responsibilities: 'Data pipelines, ETL, data quality, streaming',                 skills: ['python','airflow','spark','kafka','sql'], order_index: 4 },
  { department: 'rd',  name: 'Research Intern',               role_en: 'research-intern',  role_he: 'סטאז\'יר מחקר',           emoji: '📚', level: 'junior',  responsibilities: 'Literature review, experiments, data collection',              skills: ['python','jupyter','research','ml-basics'], order_index: 5 },

  // ── DESIGN ──────────────────────────────────────────────────────────────────
  { department: 'design', name: 'Design Lead',                role_en: 'design-lead',      role_he: 'מוביל/ת עיצוב',           emoji: '🎨', level: 'manager', responsibilities: 'Design system, brand identity, UX vision, design ops',          skills: ['figma','design-system','accessibility','branding'], order_index: 0 },
  { department: 'design', name: 'Senior UX Designer',         role_en: 'ux-designer',      role_he: 'מעצב/ת UX בכיר/ה',        emoji: '📐', level: 'senior',  responsibilities: 'User flows, wireframes, prototyping, usability testing',        skills: ['figma','user-flows','prototyping','wireframes'], order_index: 1 },
  { department: 'design', name: 'UI Designer',                role_en: 'ui-designer',      role_he: 'מעצב/ת UI',               emoji: '🖌️', level: 'member',  responsibilities: 'Visual design, component design, icon design, animations',     skills: ['figma','illustration','css','animations'], order_index: 2 },
  { department: 'design', name: 'UI Developer (Frontend)',     role_en: 'ui-dev',           role_he: 'מפתח/ת UI',               emoji: '✨', level: 'member',  responsibilities: 'Component implementation, Tailwind, RTL, animations',           skills: ['react','tailwind','framer-motion','css','rtl'], order_index: 3 },
  { department: 'design', name: 'Motion Designer',            role_en: 'motion-designer',  role_he: 'מעצב/ת אנימציה',          emoji: '🎬', level: 'member',  responsibilities: 'Micro-interactions, loading states, animated illustrations',    skills: ['figma','lottie','framer-motion','after-effects'], order_index: 4 },
  { department: 'design', name: 'Design Researcher',          role_en: 'design-researcher',role_he: 'חוקר/ת עיצוב',            emoji: '🔭', level: 'member',  responsibilities: 'Design thinking, user interviews, competitive analysis, trends',skills: ['design-thinking','ux-research','usability'], order_index: 5 },

  // ── PRODUCT MANAGEMENT ──────────────────────────────────────────────────────
  { department: 'product', name: 'Head of Product',           role_en: 'head-of-product',  role_he: 'ראש מחלקת מוצר',          emoji: '🗺️', level: 'manager', responsibilities: 'Sprint management, product roadmap execution, stakeholders',    skills: ['agile','scrum','roadmap','stakeholder-mgmt'], order_index: 0 },
  { department: 'product', name: 'Senior Product Manager',    role_en: 'senior-pm-prod',   role_he: 'מנהל מוצר בכיר',          emoji: '📌', level: 'senior',  responsibilities: 'Feature specs, PRD writing, acceptance criteria, releases',     skills: ['product-specs','jira','user-stories','okr'], order_index: 1 },
  { department: 'product', name: 'Scrum Master',              role_en: 'scrum-master',     role_he: 'Scrum Master',             emoji: '🔄', level: 'senior',  responsibilities: 'Sprint ceremonies, blockers removal, team velocity, retrospectives', skills: ['scrum','kanban','facilitation','jira','metrics'], order_index: 2 },
  { department: 'product', name: 'Project Manager',           role_en: 'project-manager',  role_he: 'מנהל פרויקטים (PM)',       emoji: '📅', level: 'senior',  responsibilities: 'Timeline management, resource allocation, risk management, client communication', skills: ['project-management','gantt','risk-mgmt','jira','stakeholders'], order_index: 3 },
  { department: 'product', name: 'QA Engineer',               role_en: 'qa-engineer',      role_he: 'מהנדס/ת QA',              emoji: '🧪', level: 'member',  responsibilities: 'Test planning, manual testing, bug reporting, regression testing', skills: ['testing','selenium','postman','jira','test-cases'], order_index: 4 },
  { department: 'product', name: 'Senior QA Engineer',        role_en: 'senior-qa',        role_he: 'מהנדס/ת QA בכיר/ה',       emoji: '🎯', level: 'senior',  responsibilities: 'E2E automation, performance testing, test strategy, CI integration', skills: ['playwright','cypress','vitest','k6','ci-cd'], order_index: 5 },
  { department: 'product', name: 'Technical Writer',          role_en: 'tech-writer',      role_he: 'כותב/ת טכני/ת',           emoji: '✍️', level: 'member',  responsibilities: 'API docs, user guides, release notes, changelog',              skills: ['markdown','openapi','docs','writing'], order_index: 6 },

  // ── SECURITY ────────────────────────────────────────────────────────────────
  { department: 'security', name: 'Chief Information Security Officer', role_en: 'ciso', role_he: 'מנהל אבטחת מידע (CISO)', emoji: '🔐', level: 'clevel',  responsibilities: 'Security strategy, compliance, incident response, security culture', skills: ['owasp','gdpr','hipaa','iso27001','pentesting'], order_index: 0 },
  { department: 'security', name: 'Application Security Engineer',      role_en: 'appsec',           role_he: 'מהנדס AppSec',            emoji: '🛡️', level: 'senior',  responsibilities: 'SAST/DAST, code review, vulnerability scanning, threat modeling', skills: ['owasp-zap','burp-suite','sast','dast','threat-modeling'], order_index: 1 },
  { department: 'security', name: 'Penetration Tester',                 role_en: 'pentester',        role_he: 'בוחן חדירה',              emoji: '🔓', level: 'senior',  responsibilities: 'Pen testing, red team exercises, vulnerability assessment',     skills: ['metasploit','burp','nmap','kali','ethical-hacking'], order_index: 2 },
  { department: 'security', name: 'Cloud Security Engineer',            role_en: 'cloud-security',   role_he: 'מהנדס אבטחת ענן',         emoji: '☁️', level: 'senior',  responsibilities: 'AWS/GCP security, IAM, secret management, network security',   skills: ['aws-security','iam','vault','cloudtrail','siem'], order_index: 3 },
  { department: 'security', name: 'Compliance Officer',                 role_en: 'compliance',       role_he: 'קצין ציות',               emoji: '📜', level: 'senior',  responsibilities: 'GDPR, HIPAA, SOC2, privacy by design, audit trails',           skills: ['gdpr','hipaa','soc2','iso27001','privacy'], order_index: 4 },
  { department: 'security', name: 'Security Analyst',                   role_en: 'security-analyst', role_he: 'אנליסט אבטחה',            emoji: '🔍', level: 'member',  responsibilities: 'Log analysis, SIEM monitoring, incident detection, alerts',    skills: ['siem','splunk','elk','incident-response','monitoring'], order_index: 5 },

  // ── LEGAL ───────────────────────────────────────────────────────────────────
  { department: 'legal', name: 'General Counsel',             role_en: 'general-counsel',  role_he: 'יועץ משפטי ראשי',         emoji: '⚖️', level: 'clevel',  responsibilities: 'Legal strategy, contracts, IP, corporate governance',           skills: ['gdpr','ip-law','contracts','corporate-law'], order_index: 0 },
  { department: 'legal', name: 'Data Privacy Lawyer',         role_en: 'privacy-lawyer',   role_he: 'עורך/ת דין פרטיות',       emoji: '🔏', level: 'senior',  responsibilities: 'GDPR DPA, data subject rights, consent management',            skills: ['gdpr','data-privacy','dpia','cookie-law'], order_index: 1 },
  { department: 'legal', name: 'IP & Licensing Lawyer',       role_en: 'ip-lawyer',        role_he: 'עורך/ת דין IP ורישיונות', emoji: '📄', level: 'senior',  responsibilities: 'Open source licenses, SaaS contracts, IP protection, patents', skills: ['ip-law','oss-licensing','mit','gpl','saas-contracts'], order_index: 2 },
  { department: 'legal', name: 'Compliance Officer',          role_en: 'legal-compliance', role_he: 'קצין ציות (Legal)',        emoji: '✅', level: 'senior',  responsibilities: 'Regulatory compliance, SOC2, HIPAA, audit support',            skills: ['compliance','hipaa','soc2','audit','regulatory'], order_index: 3 },
  { department: 'legal', name: 'Paralegal',                   role_en: 'paralegal',        role_he: 'סייע/ת משפטי/ת',          emoji: '📑', level: 'member',  responsibilities: 'Document preparation, legal research, contract management',    skills: ['legal-research','contracts','documentation'], order_index: 4 },

  // ── MARKETING ───────────────────────────────────────────────────────────────
  { department: 'marketing', name: 'Chief Marketing Officer', role_en: 'cmo',              role_he: 'מנהל שיווק ראשי (CMO)',   emoji: '📣', level: 'clevel',  responsibilities: 'Marketing strategy, brand, growth, budget, team leadership',   skills: ['growth','brand','gtm','budget','leadership'], order_index: 0 },
  { department: 'marketing', name: 'VP Marketing',            role_en: 'vp-marketing',     role_he: 'סמנכ"ל שיווק',           emoji: '🚀', level: 'clevel',  responsibilities: 'Campaign management, demand gen, partner marketing',           skills: ['demand-gen','partnerships','campaigns','analytics'], order_index: 1 },
  { department: 'marketing', name: 'Growth Manager',          role_en: 'growth',           role_he: 'מנהל/ת צמיחה',            emoji: '📈', level: 'senior',  responsibilities: 'SEO, paid ads, conversion optimization, viral loops',          skills: ['seo','google-ads','a-b-testing','analytics','cro'], order_index: 2 },
  { department: 'marketing', name: 'Content Strategist',      role_en: 'content',          role_he: 'אסטרטג/ית תוכן',          emoji: '✍️', level: 'senior',  responsibilities: 'Content marketing, blog, thought leadership, content calendar',skills: ['content','copywriting','seo','editorial'], order_index: 3 },
  { department: 'marketing', name: 'Social Media Manager',    role_en: 'social-media',     role_he: 'מנהל/ת מדיה חברתית',     emoji: '📲', level: 'member',  responsibilities: 'Twitter/X, LinkedIn, Instagram, community building',           skills: ['social-media','community','content-creation','hootsuite'], order_index: 4 },
  { department: 'marketing', name: 'Developer Relations (DevRel)', role_en: 'devrel',      role_he: 'מנהל/ת DevRel',           emoji: '🤝', level: 'senior',  responsibilities: 'Developer community, open source advocacy, technical content, hackathons', skills: ['developer-advocacy','github','technical-writing','public-speaking'], order_index: 5 },
  { department: 'marketing', name: 'Content Creator / Influencer Manager', role_en: 'creator-manager', role_he: 'מנהל/ת יוצרי תוכן', emoji: '🎥', level: 'member', responsibilities: 'YouTube, TikTok, dev influencers outreach, sponsored content, tutorials', skills: ['youtube','video-production','influencer-marketing','content-creation'], order_index: 6 },
  { department: 'marketing', name: 'SEO Specialist',          role_en: 'seo-specialist',   role_he: 'מומחה/ית SEO',            emoji: '🔎', level: 'member',  responsibilities: 'Keyword research, technical SEO, backlink building, SERP analysis', skills: ['seo','ahrefs','semrush','google-search-console','schema-markup'], order_index: 7 },
  { department: 'marketing', name: 'Performance Marketing Manager', role_en: 'perf-marketing', role_he: 'מנהל/ת שיווק ביצועים', emoji: '🎯', level: 'member', responsibilities: 'Google Ads, Meta Ads, LinkedIn Ads, ROAS optimization, attribution', skills: ['google-ads','meta-ads','linkedin-ads','roas','attribution'], order_index: 8 },
  { department: 'marketing', name: 'Brand Designer',          role_en: 'brand-designer',   role_he: 'מעצב/ת מיתוג',            emoji: '🎨', level: 'member',  responsibilities: 'Brand identity, marketing materials, landing pages, ads creatives', skills: ['figma','brand-design','landing-pages','canva'], order_index: 9 },
  { department: 'marketing', name: 'Community Manager',       role_en: 'community-manager',role_he: 'מנהל/ת קהילה',            emoji: '👥', level: 'member',  responsibilities: 'Discord, Slack community, user forums, NPS, feedback loops',   skills: ['community','discord','intercom','nps','feedback'], order_index: 10 },
];

async function run() {
  const client = await pool.connect();
  try {
    let inserted = 0;
    let skipped = 0;

    for (const m of members) {
      const res = await client.query({
        text: `INSERT INTO nexus_dept_team_members
               (department, name, role_en, role_he, emoji, level, responsibilities, skills, order_index)
               SELECT $1,$2,$3,$4,$5,$6,$7,$8::text[],$9
               WHERE NOT EXISTS (
                 SELECT 1 FROM nexus_dept_team_members WHERE department=$1 AND role_en=$3
               )`,
        values: [m.department, m.name, m.role_en, m.role_he, m.emoji, m.level, m.responsibilities, m.skills, m.order_index],
      });
      if ((res.rowCount ?? 0) > 0) inserted++;
      else skipped++;
    }

    console.log(`\n✅ Team members seeded:`);
    console.log(`   ${inserted} inserted, ${skipped} already existed`);
    console.log(`   Total defined: ${members.length}`);

    // Summary per department
    const depts = [...new Set(members.map(m => m.department))];
    for (const dept of depts) {
      const count = members.filter(m => m.department === dept).length;
      console.log(`   ${dept.toUpperCase().padEnd(12)} ${count} members`);
    }

    console.log('\n→ /admin/nexus/settings → מחלקות → פתח כל מחלקה לצוות המלא');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
