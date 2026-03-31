#!/usr/bin/env node
/**
 * Nexus Web Feeds migration.
 * Creates nexus_web_feeds table and seeds all RSS, YouTube, Reddit, GitHub sources.
 * Safe to run multiple times (IF NOT EXISTS + ON CONFLICT DO NOTHING).
 *
 * Usage: node scripts/migrate-nexus-web-feeds.mjs
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
    // ── Create table ──────────────────────────────────────────────────────────
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
    console.log('✅ nexus_web_feeds table created');

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_nexus_web_feeds_url
        ON nexus_web_feeds(url)
    `);
    console.log('✅ Unique index on url created');

    // ── Seed data ─────────────────────────────────────────────────────────────
    // source_type: 'rss' | 'youtube' | 'reddit' | 'github'
    // departments: null = relevant to all departments
    const feeds = [
      // ── RSS: General Tech / Dev ──
      { source_type: 'rss', url: 'https://github.blog/feed/',                    label: 'GitHub Blog',            category: 'tech',       departments: null },
      { source_type: 'rss', url: 'https://changelog.com/feed',                   label: 'Changelog',              category: 'tech',       departments: null },
      { source_type: 'rss', url: 'https://simonwillison.net/atom/everything/',   label: 'Simon Willison',         category: 'tech',       departments: null },
      { source_type: 'rss', url: 'https://hnrss.org/frontpage',                  label: 'Hacker News',            category: 'tech',       departments: null },
      { source_type: 'rss', url: 'https://thenewstack.io/feed/',                 label: 'The New Stack',          category: 'tech',       departments: null },
      { source_type: 'rss', url: 'https://dev.to/feed',                          label: 'dev.to',                 category: 'tech',       departments: null },
      { source_type: 'rss', url: 'https://www.freecodecamp.org/news/rss/',       label: 'freeCodeCamp',           category: 'tech',       departments: null },
      { source_type: 'rss', url: 'https://blog.bitsrc.io/feed',                  label: 'Bits and Pieces',        category: 'tech',       departments: null },
      // ── RSS: Frontend ──
      { source_type: 'rss', url: 'https://css-tricks.com/feed/',                 label: 'CSS-Tricks',             category: 'frontend',   departments: ['cto', 'design'] },
      { source_type: 'rss', url: 'https://www.smashingmagazine.com/feed/',       label: 'Smashing Magazine',      category: 'frontend',   departments: ['cto', 'design'] },
      { source_type: 'rss', url: 'https://web.dev/feed.xml',                     label: 'web.dev (Google)',       category: 'frontend',   departments: ['cto', 'design'] },
      { source_type: 'rss', url: 'https://www.joshwcomeau.com/rss.xml',          label: 'Josh Comeau',            category: 'frontend',   departments: ['cto'] },
      { source_type: 'rss', url: 'https://kentcdodds.com/blog/rss.xml',          label: 'Kent C. Dodds',          category: 'frontend',   departments: ['cto'] },
      { source_type: 'rss', url: 'https://www.robinwieruch.de/index.xml',        label: 'Robin Wieruch',          category: 'frontend',   departments: ['cto'] },
      { source_type: 'rss', url: 'https://overreacted.io/rss.xml',               label: 'Dan Abramov',            category: 'frontend',   departments: ['cto'] },
      { source_type: 'rss', url: 'https://2ality.com/feeds/posts.atom',           label: '2ality (JS/TS)',         category: 'frontend',   departments: ['cto'] },
      { source_type: 'rss', url: 'https://lea.verou.me/feed.xml',                label: 'Lea Verou',              category: 'frontend',   departments: ['cto', 'design'] },
      { source_type: 'rss', url: 'https://nodejs.org/en/feed/blog.xml',          label: 'Node.js Blog',           category: 'backend',    departments: ['cto'] },
      // ── RSS: AI / LLM ──
      { source_type: 'rss', url: 'https://www.anthropic.com/rss.xml',            label: 'Anthropic',              category: 'ai',         departments: ['rd', 'cto'] },
      { source_type: 'rss', url: 'https://openai.com/blog/rss.xml',              label: 'OpenAI Blog',            category: 'ai',         departments: ['rd', 'cto'] },
      { source_type: 'rss', url: 'https://huggingface.co/blog/feed.xml',         label: 'HuggingFace Blog',       category: 'ai',         departments: ['rd'] },
      { source_type: 'rss', url: 'https://blog.langchain.dev/rss/',              label: 'LangChain Blog',         category: 'ai',         departments: ['rd'] },
      { source_type: 'rss', url: 'https://www.deeplearning.ai/the-batch/feed/', label: 'DeepLearning.AI',        category: 'ai',         departments: ['rd'] },
      // ── RSS: DevOps / Cloud ──
      { source_type: 'rss', url: 'https://kubernetes.io/feed.xml',               label: 'Kubernetes Blog',        category: 'devops',     departments: ['cto'] },
      { source_type: 'rss', url: 'https://www.docker.com/blog/feed/',            label: 'Docker Blog',            category: 'devops',     departments: ['cto'] },
      { source_type: 'rss', url: 'https://devops.com/feed/',                     label: 'DevOps.com',             category: 'devops',     departments: ['cto'] },
      // ── RSS: Security ──
      { source_type: 'rss', url: 'https://krebsonsecurity.com/feed/',            label: 'Krebs on Security',      category: 'security',   departments: ['security'] },
      { source_type: 'rss', url: 'https://www.troyhunt.com/rss/',                label: 'Troy Hunt',              category: 'security',   departments: ['security'] },
      { source_type: 'rss', url: 'https://nakedsecurity.sophos.com/feed/',       label: 'Sophos Naked Security',  category: 'security',   departments: ['security'] },
      { source_type: 'rss', url: 'https://portswigger.net/daily-swig/rss',       label: 'PortSwigger Daily Swig', category: 'security',   departments: ['security'] },
      // ── RSS: Design / UX ──
      { source_type: 'rss', url: 'https://www.nngroup.com/feed/rss/',            label: 'Nielsen Norman Group',   category: 'design',     departments: ['design', 'cpo'] },
      { source_type: 'rss', url: 'https://uxdesign.cc/feed',                     label: 'UX Collective',          category: 'design',     departments: ['design'] },
      { source_type: 'rss', url: 'https://medium.com/feed/figma-design',         label: 'Figma Design',           category: 'design',     departments: ['design'] },
      // ── RSS: Product ──
      { source_type: 'rss', url: 'https://www.producttalk.org/feed/',            label: 'Product Talk',           category: 'product',    departments: ['product', 'cpo'] },
      { source_type: 'rss', url: 'https://www.intercom.com/blog/feed',           label: 'Intercom Blog',          category: 'product',    departments: ['product', 'cpo'] },
      // ── RSS: Marketing / Growth ──
      { source_type: 'rss', url: 'https://blog.hubspot.com/marketing/rss.xml',   label: 'HubSpot Marketing',      category: 'marketing',  departments: ['marketing'] },
      { source_type: 'rss', url: 'https://moz.com/blog/feed',                    label: 'Moz Blog',               category: 'marketing',  departments: ['marketing'] },
      { source_type: 'rss', url: 'https://ahrefs.com/blog/feed/',                label: 'Ahrefs Blog',            category: 'marketing',  departments: ['marketing'] },
      // ── RSS: Healthcare Tech ──
      { source_type: 'rss', url: 'https://www.healthcareitnews.com/feed',        label: 'Healthcare IT News',     category: 'healthcare', departments: ['cpo', 'legal'] },
      { source_type: 'rss', url: 'https://hitconsultant.net/feed/',              label: 'HIT Consultant',         category: 'healthcare', departments: ['cpo', 'legal'] },

      // ── YouTube Channels (RSS) ──
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA', label: 'Fireship',              category: 'frontend',   departments: ['cto', 'rd'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbRP3c757lWg9M-U7TyEkXA', label: 'Theo (t3.gg)',          category: 'frontend',   departments: ['cto'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCFbNIlppjAuEX4znoulh0Cw', label: 'Web Dev Simplified',    category: 'frontend',   departments: ['cto'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC77-60K-VDloGjzkaf2UJRw', label: 'Jack Herrington',       category: 'frontend',   departments: ['cto'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCJZv4d5rbIKd4QHMPkcABCw', label: 'Kevin Powell (CSS)',    category: 'design',     departments: ['design', 'cto'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCswG6FSbgZjbm1Tg0vmIsAg', label: 'Matt Pocock (TS)',      category: 'frontend',   departments: ['cto'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCO1cgjhGzsSYb1rsB4bFe4Q', label: 'Academind',             category: 'tech',       departments: ['cto'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCoebwHSTvwalADTJhps0emA', label: 'Primeagen',             category: 'backend',    departments: ['cto'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCVls1GmFKf6WlTraIb_IaJg', label: 'Traversy Media',        category: 'frontend',   departments: ['cto'] },
      { source_type: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC8butISFwT-Wl7EV0hUK0BQ', label: 'freeCodeCamp',          category: 'tech',       departments: null },

      // ── Reddit Subreddits ──
      { source_type: 'reddit', url: 'startups',               label: 'r/startups',               category: 'business',   departments: ['ceo'] },
      { source_type: 'reddit', url: 'Entrepreneur',           label: 'r/Entrepreneur',            category: 'business',   departments: ['ceo'] },
      { source_type: 'reddit', url: 'business',               label: 'r/business',                category: 'business',   departments: ['ceo'] },
      { source_type: 'reddit', url: 'softwarearchitecture',   label: 'r/softwarearchitecture',    category: 'backend',    departments: ['cto'] },
      { source_type: 'reddit', url: 'node',                   label: 'r/node',                    category: 'backend',    departments: ['cto'] },
      { source_type: 'reddit', url: 'programming',            label: 'r/programming',             category: 'tech',       departments: ['cto'] },
      { source_type: 'reddit', url: 'reactjs',                label: 'r/reactjs',                 category: 'frontend',   departments: ['cto'] },
      { source_type: 'reddit', url: 'typescript',             label: 'r/typescript',              category: 'frontend',   departments: ['cto'] },
      { source_type: 'reddit', url: 'ProductManagement',      label: 'r/ProductManagement',       category: 'product',    departments: ['cpo', 'product'] },
      { source_type: 'reddit', url: 'agile',                  label: 'r/agile',                   category: 'product',    departments: ['product'] },
      { source_type: 'reddit', url: 'UXDesign',               label: 'r/UXDesign',                category: 'design',     departments: ['design', 'cpo'] },
      { source_type: 'reddit', url: 'MachineLearning',        label: 'r/MachineLearning',         category: 'ai',         departments: ['rd'] },
      { source_type: 'reddit', url: 'LocalLLaMA',             label: 'r/LocalLLaMA',              category: 'ai',         departments: ['rd'] },
      { source_type: 'reddit', url: 'artificial',             label: 'r/artificial',              category: 'ai',         departments: ['rd'] },
      { source_type: 'reddit', url: 'web_design',             label: 'r/web_design',              category: 'design',     departments: ['design'] },
      { source_type: 'reddit', url: 'UI_Design',              label: 'r/UI_Design',               category: 'design',     departments: ['design'] },
      { source_type: 'reddit', url: 'scrum',                  label: 'r/scrum',                   category: 'product',    departments: ['product'] },
      { source_type: 'reddit', url: 'projectmanagement',      label: 'r/projectmanagement',       category: 'product',    departments: ['product'] },
      { source_type: 'reddit', url: 'netsec',                 label: 'r/netsec',                  category: 'security',   departments: ['security'] },
      { source_type: 'reddit', url: 'cybersecurity',          label: 'r/cybersecurity',           category: 'security',   departments: ['security'] },
      { source_type: 'reddit', url: 'privacy',                label: 'r/privacy',                 category: 'security',   departments: ['security', 'legal'] },
      { source_type: 'reddit', url: 'gdpr',                   label: 'r/gdpr',                    category: 'legal',      departments: ['legal'] },
      { source_type: 'reddit', url: 'marketing',              label: 'r/marketing',               category: 'marketing',  departments: ['marketing'] },
      { source_type: 'reddit', url: 'SEO',                    label: 'r/SEO',                     category: 'marketing',  departments: ['marketing'] },
      { source_type: 'reddit', url: 'content_marketing',      label: 'r/content_marketing',       category: 'marketing',  departments: ['marketing'] },

      // ── GitHub Search Queries ──
      { source_type: 'github', url: 'healthcare app react typescript',       label: 'Healthcare React Apps',    category: 'healthcare', departments: ['cto', 'cpo'] },
      { source_type: 'github', url: 'medical records HIPAA',                 label: 'Medical Records / HIPAA',  category: 'security',   departments: ['security', 'legal'] },
      { source_type: 'github', url: 'family caregiver management app',       label: 'Caregiver Apps',           category: 'product',    departments: ['cpo', 'product'] },
      { source_type: 'github', url: 'AI LLM multi-agent orchestration',      label: 'Multi-Agent LLM',          category: 'ai',         departments: ['rd'] },
      { source_type: 'github', url: 'nextjs drizzle postgresql saas',        label: 'SaaS Stack (Next+Drizzle)', category: 'tech',      departments: ['cto'] },
      { source_type: 'github', url: 'GDPR compliance privacy nodejs',        label: 'GDPR Compliance Node.js',  category: 'legal',      departments: ['legal', 'security'] },
      { source_type: 'github', url: 'design system react tailwind',          label: 'React Design Systems',     category: 'design',     departments: ['design'] },
      { source_type: 'github', url: 'stripe subscription saas billing',      label: 'Stripe SaaS Billing',      category: 'business',   departments: ['ceo', 'cto'] },
    ];

    let inserted = 0;
    for (const f of feeds) {
      const res = await client.query({
        text: `INSERT INTO nexus_web_feeds (source_type, url, label, category, departments)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (url) DO NOTHING`,
        values: [f.source_type, f.url, f.label, f.category, f.departments],
      });
      inserted += res.rowCount ?? 0;
    }

    console.log(`\n✅ Nexus web feeds seeded:`);
    console.log(`   ${inserted} inserted, ${feeds.length - inserted} already existed`);
    console.log(`   Total defined: ${feeds.length}`);
    const byType = {};
    for (const f of feeds) byType[f.source_type] = (byType[f.source_type] ?? 0) + 1;
    for (const [t, c] of Object.entries(byType)) {
      console.log(`   ${t.toUpperCase().padEnd(10)} ${c} feeds`);
    }
    console.log('\n✅ Migration complete');
    console.log('→ /admin/nexus/settings → Web Sources tab');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
