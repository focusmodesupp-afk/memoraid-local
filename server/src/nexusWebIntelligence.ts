/**
 * nexusWebIntelligence.ts
 * Gathers real-time web intelligence from GitHub, Reddit, RSS, and Perplexity.
 * Used by the Nexus Brief orchestrator as the first stage of research.
 *
 * Feeds are loaded from the `nexus_web_feeds` DB table (managed via /admin/nexus/settings).
 * Falls back to hardcoded arrays if DB is unavailable or empty.
 */
import pg from 'pg';

export type WebSource = {
  sourceType: 'github' | 'reddit' | 'rss' | 'perplexity';
  url: string;
  title: string;
  snippet: string;
  trustScore: number;
  githubStars?: number;
  redditScore?: number;
  contributorCount?: number;
  department?: string;          // which dept this source is most relevant for
  rawPayload: Record<string, unknown>;
};

export type WebIntelligenceResult = {
  sources: WebSource[];
  synthesizedContext: string;
};

// ── Trust Score Formula ────────────────────────────────────────────────────────
// log10(stars+1)*20 + log10(redditScore+1)*15 – (contributors>15 ? 5 : 0), max 100
function computeTrustScore(opts: {
  githubStars?: number;
  redditScore?: number;
  contributorCount?: number;
}): number {
  const { githubStars = 0, redditScore = 0, contributorCount } = opts;
  let score = 0;
  score += Math.log10(githubStars + 1) * 20;
  score += Math.log10(redditScore + 1) * 15;
  if (contributorCount !== undefined && contributorCount > 15) score -= 5;
  return Math.min(100, Math.round(score));
}

// ── Fetch with timeout ─────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── GitHub Trending / Search ───────────────────────────────────────────────────
export async function fetchGitHubSources(query: string): Promise<WebSource[]> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'MemorAId-Nexus/1.0',
    };
    if (token) headers['Authorization'] = `token ${token}`;

    const encoded = encodeURIComponent(query);
    const res = await fetchWithTimeout(
      `https://api.github.com/search/repositories?q=${encoded}&sort=stars&per_page=5`,
      { headers }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: unknown[] };
    if (!Array.isArray(data.items)) return [];

    const sources: WebSource[] = [];
    for (const item of data.items.slice(0, 5)) {
      const repo = item as Record<string, unknown>;
      const fullName = String(repo.full_name ?? '');
      const stars = Number(repo.stargazers_count ?? 0);

      let contributors: number | undefined;
      try {
        const cRes = await fetchWithTimeout(
          `https://api.github.com/repos/${fullName}/contributors?per_page=20&anon=false`,
          { headers }
        );
        if (cRes.ok) {
          const cData = (await cRes.json()) as unknown[];
          contributors = Array.isArray(cData) ? cData.length : undefined;
        }
      } catch {
        // ignore
      }

      const trustScore = computeTrustScore({ githubStars: stars, contributorCount: contributors });

      sources.push({
        sourceType: 'github',
        url: String(repo.html_url ?? `https://github.com/${fullName}`),
        title: fullName,
        snippet: String(repo.description ?? '').slice(0, 200),
        trustScore,
        githubStars: stars,
        contributorCount: contributors,
        rawPayload: { ...repo, language: String(repo.language ?? ''), topics: Array.isArray(repo.topics) ? repo.topics : [] },
      });
    }
    return sources;
  } catch {
    return [];
  }
}

// ── Reddit Posts (general search) ─────────────────────────────────────────────
export async function fetchRedditSources(query: string, subreddit?: string): Promise<WebSource[]> {
  try {
    const encoded = encodeURIComponent(query);
    const base = subreddit
      ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encoded}&restrict_sr=1&sort=relevance&limit=5&t=year`
      : `https://www.reddit.com/search.json?q=${encoded}&sort=relevance&limit=5&t=year`;

    const res = await fetchWithTimeout(base, {
      headers: {
        'User-Agent': 'MemorAId-Nexus/1.0',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { children?: unknown[] } };
    const posts = data?.data?.children;
    if (!Array.isArray(posts)) return [];

    return posts.slice(0, 5).map((child) => {
      const post = (child as Record<string, unknown>).data as Record<string, unknown>;
      const score = Number(post.score ?? 0);
      const upvoteRatio = Number(post.upvote_ratio ?? 0);
      const redditScore = Math.round(score * upvoteRatio);
      const trustScore = computeTrustScore({ redditScore });
      return {
        sourceType: 'reddit' as const,
        url: `https://reddit.com${String(post.permalink ?? '')}`,
        title: String(post.title ?? '').slice(0, 200),
        snippet: String(post.selftext ?? '').slice(0, 300) || `r/${String(post.subreddit ?? subreddit ?? '')} | ${score} upvotes`,
        trustScore,
        redditScore,
        rawPayload: post,
      };
    });
  } catch {
    return [];
  }
}

// ── Per-Department Reddit Subreddits ───────────────────────────────────────────
const DEPT_REDDIT_SUBREDDITS: Record<string, string[]> = {
  ceo:       ['startups', 'Entrepreneur', 'business'],
  cto:       ['softwarearchitecture', 'node', 'programming'],
  cpo:       ['ProductManagement', 'agile', 'UXDesign'],
  rd:        ['MachineLearning', 'LocalLLaMA', 'artificial'],
  design:    ['web_design', 'UI_Design', 'accessibility'],
  product:   ['ProductManagement', 'scrum', 'projectmanagement'],
  security:  ['netsec', 'cybersecurity', 'privacy'],
  legal:     ['gdpr', 'legaladvice', 'privacylegal'],
  marketing: ['marketing', 'SEO', 'content_marketing'],
  finance:   ['personalfinance', 'financialindependence', 'smallbusiness'],
  hr:        ['humanresources', 'remotework', 'careerguidance'],
  cs:        ['customerservice', 'helpdesk', 'cscareerquestions'],
  sales:     ['sales', 'Entrepreneur', 'SaaS'],
  'ai-dev':  ['MachineLearning', 'LocalLLaMA', 'ClaudeAI'],
};

async function fetchDeptRedditSources(dept: string, query: string): Promise<WebSource[]> {
  const subreddits = DEPT_REDDIT_SUBREDDITS[dept] ?? [];
  if (subreddits.length === 0) return [];

  // Search up to 2 subreddits per department for richer community intelligence
  const toSearch = subreddits.slice(0, 2);
  const allResults: WebSource[] = [];
  for (const subreddit of toSearch) {
    try {
      const results = await fetchRedditSources(query, subreddit);
      allResults.push(...results.map((s) => ({ ...s, department: dept })));
    } catch {
      // Individual subreddit failure is non-fatal
    }
  }
  return allResults;
}

// ── DB Feed Loader ─────────────────────────────────────────────────────────────
// Loads active feeds from nexus_web_feeds table. Falls back to hardcoded arrays.
type DbFeed = {
  id: string;
  sourceType: string;
  url: string;
  label: string;
  category: string;
  departments: string[] | null;
  isActive: boolean;
};

async function loadFeedsFromDb(): Promise<DbFeed[]> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return [];
    const useSsl = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');
    const pool = new pg.Pool({ connectionString: dbUrl, ssl: useSsl ? { rejectUnauthorized: false } : false, max: 2 });
    const { rows } = await pool.query(
      `SELECT id, source_type, url, label, category, departments, is_active
       FROM nexus_web_feeds WHERE is_active = true ORDER BY source_type, label`
    );
    await pool.end();
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      sourceType: String(r.source_type),
      url: String(r.url),
      label: String(r.label),
      category: String(r.category),
      departments: Array.isArray(r.departments) ? r.departments as string[] : null,
      isActive: Boolean(r.is_active),
    }));
  } catch {
    return [];
  }
}

// ── RSS Feeds ──────────────────────────────────────────────────────────────────
// 40+ feeds across tech, AI/LLM, security, design, product, marketing, healthcare
// Used as fallback when DB is empty or unavailable.
const RSS_FEEDS: Array<{ url: string; category: string; label: string }> = [
  // ── Tech / Dev ──
  { url: 'https://github.blog/feed/',                    category: 'tech',       label: 'GitHub Blog' },
  { url: 'https://changelog.com/feed',                   category: 'tech',       label: 'Changelog' },
  { url: 'https://simonwillison.net/atom/everything/',   category: 'tech',       label: 'Simon Willison' },
  { url: 'https://css-tricks.com/feed/',                 category: 'frontend',   label: 'CSS-Tricks' },
  { url: 'https://www.smashingmagazine.com/feed/',       category: 'frontend',   label: 'Smashing Magazine' },
  { url: 'https://dev.to/feed',                          category: 'tech',       label: 'dev.to' },
  { url: 'https://hnrss.org/frontpage',                  category: 'tech',       label: 'Hacker News' },
  { url: 'https://thenewstack.io/feed/',                 category: 'tech',       label: 'The New Stack' },
  { url: 'https://www.joshwcomeau.com/rss.xml',          category: 'frontend',   label: 'Josh Comeau' },
  { url: 'https://kentcdodds.com/blog/rss.xml',          category: 'frontend',   label: 'Kent C. Dodds' },
  { url: 'https://www.robinwieruch.de/index.xml',        category: 'frontend',   label: 'Robin Wieruch' },
  { url: 'https://overreacted.io/rss.xml',               category: 'frontend',   label: 'Dan Abramov' },
  { url: 'https://2ality.com/feeds/posts.atom',          category: 'tech',       label: '2ality (JS/TS)' },
  { url: 'https://lea.verou.me/feed.xml',                category: 'frontend',   label: 'Lea Verou' },
  { url: 'https://web.dev/feed.xml',                     category: 'frontend',   label: 'web.dev (Google)' },
  { url: 'https://nodejs.org/en/feed/blog.xml',          category: 'backend',    label: 'Node.js Blog' },
  { url: 'https://blog.bitsrc.io/feed',                  category: 'tech',       label: 'Bits and Pieces' },
  { url: 'https://www.freecodecamp.org/news/rss/',       category: 'tech',       label: 'freeCodeCamp' },
  // ── YouTube RSS (Dev Creators) ──
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA', category: 'youtube', label: 'Fireship' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbRP3c757lWg9M-U7TyEkXA', category: 'youtube', label: 'Theo (t3.gg)' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCFbNIlppjAuEX4znoulh0Cw', category: 'youtube', label: 'Web Dev Simplified' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC77-60K-VDloGjzkaf2UJRw', category: 'youtube', label: 'Jack Herrington' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCJZv4d5rbIKd4QHMPkcABCw', category: 'youtube', label: 'Kevin Powell (CSS)' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCswG6FSbgZjbm1Tg0vmIsAg', category: 'youtube', label: 'Matt Pocock (TS)' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCO1cgjhGzsSYb1rsB4bFe4Q', category: 'youtube', label: 'Academind' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCoebwHSTvwalADTJhps0emA', category: 'youtube', label: 'Primeagen' },
  // ── AI / LLM ──
  { url: 'https://www.anthropic.com/rss.xml',            category: 'ai',         label: 'Anthropic' },
  { url: 'https://openai.com/blog/rss.xml',              category: 'ai',         label: 'OpenAI Blog' },
  { url: 'https://huggingface.co/blog/feed.xml',         category: 'ai',         label: 'HuggingFace Blog' },
  { url: 'https://blog.langchain.dev/rss/',              category: 'ai',         label: 'LangChain Blog' },
  { url: 'https://www.deeplearning.ai/the-batch/feed/',  category: 'ai',         label: 'DeepLearning.AI' },
  // ── DevOps / Cloud ──
  { url: 'https://kubernetes.io/feed.xml',               category: 'devops',     label: 'Kubernetes Blog' },
  { url: 'https://www.docker.com/blog/feed/',            category: 'devops',     label: 'Docker Blog' },
  { url: 'https://devops.com/feed/',                     category: 'devops',     label: 'DevOps.com' },
  // ── Security ──
  { url: 'https://krebsonsecurity.com/feed/',            category: 'security',   label: 'Krebs on Security' },
  { url: 'https://www.troyhunt.com/rss/',                category: 'security',   label: 'Troy Hunt' },
  { url: 'https://nakedsecurity.sophos.com/feed/',       category: 'security',   label: 'Sophos Naked Security' },
  { url: 'https://portswigger.net/daily-swig/rss',       category: 'security',   label: 'PortSwigger Daily Swig' },
  // ── Design / UX ──
  { url: 'https://www.nngroup.com/feed/rss/',            category: 'design',     label: 'Nielsen Norman Group' },
  { url: 'https://uxdesign.cc/feed',                     category: 'design',     label: 'UX Collective' },
  { url: 'https://medium.com/feed/figma-design',         category: 'design',     label: 'Figma Design' },
  // ── Product ──
  { url: 'https://www.producttalk.org/feed/',            category: 'product',    label: 'Product Talk' },
  { url: 'https://www.intercom.com/blog/feed',           category: 'product',    label: 'Intercom Blog' },
  // ── Marketing / Growth ──
  { url: 'https://blog.hubspot.com/marketing/rss.xml',   category: 'marketing',  label: 'HubSpot Marketing' },
  { url: 'https://moz.com/blog/feed',                    category: 'marketing',  label: 'Moz Blog' },
  { url: 'https://ahrefs.com/blog/feed/',                category: 'marketing',  label: 'Ahrefs Blog' },
  // ── Healthcare Tech ──
  { url: 'https://www.healthcareitnews.com/feed',        category: 'healthcare', label: 'Healthcare IT News' },
  { url: 'https://hitconsultant.net/feed/',              category: 'healthcare', label: 'HIT Consultant' },
];

// Category → department relevance map (for tagging sources)
const CATEGORY_DEPT_MAP: Record<string, string> = {
  frontend: 'cto',
  backend: 'cto',
  devops: 'cto',
  ai: 'rd',
  security: 'security',
  design: 'design',
  product: 'product',
  marketing: 'marketing',
  healthcare: 'cpo',
  youtube: 'rd',
  tech: 'cto',
};

async function fetchRssSources(
  query: string,
  feedList: Array<{ url: string; category: string; label: string }> = RSS_FEEDS,
  youtubeFeedList: Array<{ url: string; label: string }> = [],
  limitPerFeed = 2
): Promise<WebSource[]> {
  const sources: WebSource[] = [];
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Merge YouTube into the feed list for unified processing
  const allFeeds = [
    ...feedList,
    ...youtubeFeedList.map((yt) => ({ url: yt.url, category: 'youtube', label: yt.label })),
  ];

  // Shuffle and sample feeds to avoid too many concurrent requests (pick up to 20)
  const feedSample = [...allFeeds].sort(() => Math.random() - 0.5).slice(0, 20);

  await Promise.all(
    feedSample.map(async ({ url: feedUrl, category, label }) => {
      try {
        const res = await fetchWithTimeout(feedUrl, {
          headers: { 'User-Agent': 'MemorAId-Nexus/1.0' },
        }, 8000);
        if (!res.ok) return;
        const xml = await res.text();

        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g);
        let feedCount = 0;
        for (const match of itemMatches) {
          if (feedCount >= limitPerFeed) break;
          const item = match[1] ?? match[2];
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title[^>]*>(.*?)<\/title>/))?.[1] ?? '';
          const link = (item.match(/<link[^>]*href=["'](.*?)["']/) || item.match(/<link[^>]*>(https?[^<]+)<\/link>/) || item.match(/<link>(.*?)<\/link>/) || item.match(/<guid[^>]*>(.*?)<\/guid>/))?.[1] ?? '';
          const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/) || item.match(/<summary[^>]*>(.*?)<\/summary>/) || item.match(/<media:description>(.*?)<\/media:description>/))?.[1] ?? '';
          const author = (item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/) || item.match(/<dc:creator>(.*?)<\/dc:creator>/) || item.match(/<author>[\s\S]*?<name>(.*?)<\/name>/))?.[1] ?? '';

          const combined = `${title} ${desc}`.toLowerCase();
          // More lenient for YouTube (title-only match is enough)
          const relevant = queryTerms.some((t) => combined.includes(t));
          if (!relevant) continue;

          const cleanDesc = desc.replace(/<[^>]+>/g, '').trim().slice(0, 300);
          const cleanTitle = title.replace(/<[^>]+>/g, '').trim().slice(0, 200);
          if (!cleanTitle) continue;

          sources.push({
            sourceType: 'rss',
            url: link.trim() || feedUrl,
            title: `[${label}] ${cleanTitle}`,
            snippet: cleanDesc || `פוסט מ-${label}`,
            trustScore: category === 'youtube' ? 50 : 40,
            department: CATEGORY_DEPT_MAP[category],
            rawPayload: { feed: feedUrl, site: label, category, author: author.trim() || undefined },
          });
          feedCount++;
        }
      } catch {
        // ignore per-feed failures
      }
    })
  );

  return sources.slice(0, 12);
}

// ── Perplexity Context ─────────────────────────────────────────────────────────
export async function fetchPerplexitySingle(query: string, focusPrompt: string): Promise<WebSource | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout(
      'https://api.perplexity.ai/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: focusPrompt }],
          max_tokens: 600,
        }),
      },
      15000
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; citations?: string[] };
    const content = data?.choices?.[0]?.message?.content ?? '';
    if (!content) return null;

    const citations: string[] = (data.citations ?? []).filter((u) => typeof u === 'string' && u.startsWith('http'));

    return {
      sourceType: 'perplexity',
      url: citations[0] ?? 'https://www.perplexity.ai',
      title: `Perplexity – ${query.slice(0, 60)}`,
      snippet: content.slice(0, 500),
      trustScore: 75,
      rawPayload: { content, query, citations, focusPrompt },
    };
  } catch {
    return null;
  }
}

// Multi-query Perplexity: 5 focused research queries in parallel
async function fetchPerplexitySource(query: string): Promise<WebSource | null> {
  // For backward compat — returns first result. Full results via fetchPerplexityMulti.
  return fetchPerplexitySingle(query,
    `Latest open-source libraries, emerging tools, industry trends, and key risks for: "${query}". Focus on 2024-2025 developments. Be concise (max 400 words).`
  );
}

async function fetchPerplexityMulti(query: string): Promise<WebSource[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return [];

  const focusQueries = [
    `Best open-source libraries and tools for: "${query}". Include GitHub links, star counts, and pros/cons. Focus on 2024-2025.`,
    `Best practices, design patterns, and architecture approaches for: "${query}". Include real-world examples.`,
    `Common risks, challenges, pitfalls, and anti-patterns when implementing: "${query}". How to avoid them.`,
    `Top competitors and alternative solutions for: "${query}". Compare features, pricing, and market position.`,
    `Healthcare compliance, HIPAA, GDPR, and accessibility considerations for: "${query}". Specific requirements and checklists.`,
  ];

  console.log(`[WebIntel] Running ${focusQueries.length} Perplexity queries for: "${query.slice(0, 60)}..."`);

  const results = await Promise.allSettled(
    focusQueries.map((fp) => fetchPerplexitySingle(query, fp))
  );

  const sources: WebSource[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      sources.push(r.value);
      // Also add individual citations as separate sources
      const citations = (r.value.rawPayload as any)?.citations ?? [];
      for (const cite of (citations as string[]).slice(0, 2)) {
        if (cite && cite.startsWith('http')) {
          sources.push({
            sourceType: 'perplexity',
            url: cite,
            title: `Citation: ${new URL(cite).hostname} — ${cite.split('/').pop()?.slice(0, 60) ?? ''}`,
            snippet: '',
            trustScore: 60,
            rawPayload: { citedBy: 'perplexity-multi', parentQuery: query },
          });
        }
      }
    }
  }

  console.log(`[WebIntel] Perplexity multi-query returned ${sources.length} sources`);
  return sources;
}

// ── Synthesize context string for AI agents ────────────────────────────────────
function synthesizeContext(sources: WebSource[]): string {
  if (sources.length === 0) return 'לא נמצאו מקורות רלוונטיים מהרשת.';

  const lines: string[] = ['## אינטליגנציה מהרשת\n'];

  const byType: Record<string, WebSource[]> = {};
  for (const s of sources) {
    (byType[s.sourceType] ??= []).push(s);
  }

  if (byType.perplexity?.length) {
    lines.push('### ניתוח Perplexity (web-grounded)');
    for (const s of byType.perplexity) lines.push(s.snippet);
    lines.push('');
  }

  if (byType.github?.length) {
    lines.push('### GitHub – Repos רלוונטיים');
    for (const s of byType.github) {
      lines.push(`- **[${s.title}](${s.url})** | Trust: ${s.trustScore}/100 | ${s.snippet}`);
    }
    lines.push('');
  }

  if (byType.reddit?.length) {
    lines.push('### Reddit – דיונים קהילתיים');
    for (const s of byType.reddit) {
      const deptTag = s.department ? ` (${s.department})` : '';
      lines.push(`- **[${s.title}](${s.url})** | Trust: ${s.trustScore}/100${deptTag}`);
      if (s.snippet) lines.push(`  > ${s.snippet.slice(0, 200)}`);
    }
    lines.push('');
  }

  if (byType.rss?.length) {
    // Group RSS by category
    const byCategory: Record<string, WebSource[]> = {};
    for (const s of byType.rss) {
      const cat = String(s.rawPayload.category ?? 'tech');
      (byCategory[cat] ??= []).push(s);
    }
    lines.push('### עדכוני RSS – בלוגים, יוצרי תוכן וחדשות טכנולוגיה');
    for (const [cat, catSources] of Object.entries(byCategory)) {
      lines.push(`\n**${cat}:**`);
      for (const s of catSources) {
        lines.push(`- **[${s.title}](${s.url})** – ${s.snippet.slice(0, 150)}`);
      }
    }
  }

  return lines.join('\n');
}

// ── Main Export ────────────────────────────────────────────────────────────────
export async function gatherWebIntelligence(
  ideaPrompt: string,
  departments?: string[]
): Promise<WebIntelligenceResult> {
  // Load feeds from DB (with fallback to hardcoded)
  const dbFeeds = await loadFeedsFromDb();

  // Override RSS_FEEDS_ACTIVE and subreddits from DB if available
  let activeFeedList = RSS_FEEDS; // fallback
  let activeYouTubeFeeds: Array<{ url: string; label: string }> = [];
  let activeRedditSubreddits: Record<string, string[]> = { ...DEPT_REDDIT_SUBREDDITS }; // fallback
  let activeGithubQueries: string[] = []; // extra dept-specific queries from DB

  if (dbFeeds.length > 0) {
    // RSS from DB
    const dbRss = dbFeeds.filter((f) => f.sourceType === 'rss');
    if (dbRss.length > 0) {
      activeFeedList = dbRss.map((f) => ({ url: f.url, category: f.category, label: f.label }));
    }
    // YouTube from DB
    const dbYoutube = dbFeeds.filter((f) => f.sourceType === 'youtube');
    activeYouTubeFeeds = dbYoutube.map((f) => ({ url: f.url, label: f.label }));

    // Reddit subreddits from DB — build per-dept map
    const dbReddit = dbFeeds.filter((f) => f.sourceType === 'reddit');
    if (dbReddit.length > 0) {
      const subredditMap: Record<string, string[]> = {};
      for (const f of dbReddit) {
        const depts = f.departments ?? Object.keys(DEPT_REDDIT_SUBREDDITS);
        for (const d of depts) {
          (subredditMap[d] ??= []).push(f.url);
        }
      }
      activeRedditSubreddits = subredditMap;
    }

    // GitHub search queries from DB
    const dbGithub = dbFeeds.filter((f) => f.sourceType === 'github');
    activeGithubQueries = dbGithub.map((f) => f.url);
  }

  // Build per-department Reddit fetches (searches up to 2 subreddits per dept)
  const deptRedditFetches = departments
    ? departments
        .filter((d) => activeRedditSubreddits[d]?.length)
        .map((d) => fetchDeptRedditSources(d, ideaPrompt))
    : [];

  // Additional GitHub searches from DB (up to 2 extra, relevant to ideaPrompt)
  const extraGithubFetches = activeGithubQueries
    .slice(0, 2)
    .map((q) => fetchGitHubSources(q));

  // Run all fetchers in parallel (using multi-query Perplexity for deeper research)
  const [githubSources, redditSources, rssSources, perplexityMultiSources, ...rest] =
    await Promise.all([
      fetchGitHubSources(ideaPrompt),
      fetchRedditSources(ideaPrompt),
      fetchRssSources(ideaPrompt, activeFeedList, activeYouTubeFeeds),
      fetchPerplexityMulti(ideaPrompt),
      ...deptRedditFetches,
      ...extraGithubFetches,
    ]);

  // Split rest: dept reddit results (departments.length) then extra github
  const deptCount = departments?.length ?? 0;
  const deptRedditSources: WebSource[] = (rest.slice(0, deptCount) as WebSource[][]).flat();
  const extraGithubSources: WebSource[] = (rest.slice(deptCount) as WebSource[][]).flat();

  const sources: WebSource[] = [
    ...githubSources,
    ...extraGithubSources,
    ...redditSources,
    ...rssSources,
    ...deptRedditSources,
    ...perplexityMultiSources,
  ].sort((a, b) => b.trustScore - a.trustScore);

  return {
    sources,
    synthesizedContext: synthesizeContext(sources),
  };
}
