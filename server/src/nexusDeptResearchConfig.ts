/**
 * nexusDeptResearchConfig.ts
 * Per-department specialized research source configuration.
 * Maps each NEXUS department to focused search domains, keywords,
 * GitHub qualifiers, Reddit subreddits, and Perplexity prompt templates.
 *
 * Used by n8nBridge.ts to build department-specific research queries
 * for the per-agent deep research phase (Step 3.5).
 */

export type DeptSourceConfig = {
  department: string;
  searchKeywords: string[];
  subreddits: string[];
  specialDomains: string[];
  githubQualifiers: string[];
  perplexityFocusTemplate: string;
};

export const DEPT_RESEARCH_SOURCES: Record<string, DeptSourceConfig> = {
  ceo: {
    department: 'ceo',
    searchKeywords: ['market opportunity', 'competitor analysis', 'business model', 'startup funding', 'TAM SAM SOM'],
    subreddits: ['startups', 'Entrepreneur', 'business'],
    specialDomains: ['crunchbase.com', 'techcrunch.com', 'pitchbook.com'],
    githubQualifiers: ['topic:startup', 'stars:>1000'],
    perplexityFocusTemplate: 'Market size, competitive landscape, business model viability, and funding trends for: "{idea}". Focus on digital health / elderly care SaaS if relevant. Include market data and competitor names.',
  },
  cto: {
    department: 'cto',
    searchKeywords: ['architecture pattern', 'scalability', 'tech stack', 'system design', 'performance benchmark'],
    subreddits: ['softwarearchitecture', 'node', 'programming'],
    specialDomains: ['stackoverflow.com', 'architecturenotes.co', 'martinfowler.com'],
    githubQualifiers: ['topic:architecture', 'topic:typescript', 'stars:>500'],
    perplexityFocusTemplate: 'Technical architecture approaches, scalability patterns, and tech stack recommendations for: "{idea}". Focus on Node.js/TypeScript/React ecosystem. Compare approaches with pros/cons.',
  },
  cpo: {
    department: 'cpo',
    searchKeywords: ['product strategy', 'user persona', 'product-market fit', 'feature prioritization', 'UX research'],
    subreddits: ['ProductManagement', 'agile', 'UXDesign'],
    specialDomains: ['productboard.com', 'mindtheproduct.com', 'svpg.com'],
    githubQualifiers: ['topic:product-management', 'topic:ux-research'],
    perplexityFocusTemplate: 'Product strategy, user personas, and prioritization frameworks for: "{idea}". Focus on healthcare/elderly care user needs. Include UX patterns and competitor feature comparison.',
  },
  rd: {
    department: 'rd',
    searchKeywords: ['npm package', 'library comparison', 'benchmark', 'implementation approach', 'open source'],
    subreddits: ['MachineLearning', 'LocalLLaMA', 'artificial'],
    specialDomains: ['npmjs.com', 'bundlephobia.com', 'socket.dev'],
    githubQualifiers: ['topic:typescript', 'topic:react', 'stars:>100'],
    perplexityFocusTemplate: 'Best npm packages, libraries, and implementation approaches for: "{idea}". Include bundle sizes, GitHub stars, maintenance status, and TypeScript support. Compare alternatives with benchmarks.',
  },
  design: {
    department: 'design',
    searchKeywords: ['UX pattern', 'design system', 'WCAG accessibility', 'RTL design', 'component library'],
    subreddits: ['web_design', 'UI_Design', 'accessibility'],
    specialDomains: ['designsystem.digital.gov', 'a11yproject.com', 'inclusive-components.design'],
    githubQualifiers: ['topic:design-system', 'topic:accessibility', 'topic:tailwindcss'],
    perplexityFocusTemplate: 'UX/UI design patterns, accessibility (WCAG 2.1 AA), and design system components for: "{idea}". Focus on RTL Hebrew support, elderly/healthcare users, and shadcn/ui + Tailwind CSS patterns.',
  },
  product: {
    department: 'product',
    searchKeywords: ['user story', 'acceptance criteria', 'sprint planning', 'agile methodology', 'definition of done'],
    subreddits: ['ProductManagement', 'scrum', 'projectmanagement'],
    specialDomains: ['linearb.io', 'atlassian.com'],
    githubQualifiers: ['topic:agile', 'topic:scrum', 'topic:project-management'],
    perplexityFocusTemplate: 'Sprint planning approaches, user story templates, and agile best practices for implementing: "{idea}". Focus on small AI-driven teams. Include estimation techniques and definition of done criteria.',
  },
  security: {
    department: 'security',
    searchKeywords: ['OWASP', 'CVE vulnerability', 'threat model', 'HIPAA compliance', 'penetration testing'],
    subreddits: ['netsec', 'cybersecurity', 'privacy'],
    specialDomains: ['owasp.org', 'nvd.nist.gov', 'cve.mitre.org', 'portswigger.net'],
    githubQualifiers: ['topic:security', 'topic:owasp', 'topic:vulnerability'],
    perplexityFocusTemplate: 'Security threats, OWASP Top 10 vulnerabilities, and compliance requirements for: "{idea}". Focus on healthcare data (HIPAA-adjacent), GDPR, and Node.js/Express security. Include specific CVEs if applicable.',
  },
  legal: {
    department: 'legal',
    searchKeywords: ['open source license', 'GPL risk', 'GDPR compliance', 'data processing agreement', 'privacy policy'],
    subreddits: ['gdpr', 'legaladvice', 'opensource'],
    specialDomains: ['choosealicense.com', 'gdpr.eu', 'iapp.org', 'tldrlegal.com'],
    githubQualifiers: ['topic:license', 'topic:gdpr', 'topic:compliance'],
    perplexityFocusTemplate: 'Open source license risks (MIT/Apache/GPL), GDPR compliance requirements, and legal considerations for: "{idea}". Focus on healthcare data regulations, Israeli privacy law, and SaaS terms of service.',
  },
  marketing: {
    department: 'marketing',
    searchKeywords: ['SEO strategy', 'content marketing', 'GTM plan', 'digital health marketing', 'SaaS growth'],
    subreddits: ['marketing', 'SEO', 'content_marketing'],
    specialDomains: ['ahrefs.com', 'searchenginejournal.com', 'hubspot.com'],
    githubQualifiers: ['topic:seo', 'topic:marketing', 'topic:analytics'],
    perplexityFocusTemplate: 'Go-to-market strategy, SEO keywords, and marketing channels for: "{idea}". Focus on B2B healthcare SaaS, Israeli market, and content marketing in Hebrew. Include competitor positioning analysis.',
  },
  finance: {
    department: 'finance',
    searchKeywords: ['SaaS pricing', 'unit economics', 'ARR metrics', 'cost-benefit analysis', 'burn rate'],
    subreddits: ['SaaS', 'financialindependence', 'smallbusiness'],
    specialDomains: ['crunchbase.com', 'openviewpartners.com', 'saastr.com'],
    githubQualifiers: ['topic:pricing', 'topic:saas-metrics'],
    perplexityFocusTemplate: 'SaaS pricing models, unit economics, and financial projections for: "{idea}". Focus on B2B healthcare vertical, $15/user/month model, and AI development cost vs. traditional team. Include benchmark metrics.',
  },
  hr: {
    department: 'hr',
    searchKeywords: ['AI team structure', 'remote work', 'hiring plan', 'team capacity', 'skill assessment'],
    subreddits: ['humanresources', 'remotework', 'careerguidance'],
    specialDomains: ['levels.fyi', 'remote.co', 'builtin.com'],
    githubQualifiers: ['topic:hiring', 'topic:remote-work', 'topic:team-management'],
    perplexityFocusTemplate: 'Team structure, capacity planning, and hiring needs for: "{idea}". Focus on AI-augmented development teams (minimal human roles), required non-dev positions (PM/QA/DevOps/CS), and remote Israeli market.',
  },
  cs: {
    department: 'cs',
    searchKeywords: ['customer onboarding', 'churn prevention', 'NPS', 'support automation', 'self-service'],
    subreddits: ['customerservice', 'helpdesk', 'SaaS'],
    specialDomains: ['gainsight.com', 'intercom.com', 'zendesk.com'],
    githubQualifiers: ['topic:customer-success', 'topic:chatbot', 'topic:helpdesk'],
    perplexityFocusTemplate: 'Customer success strategies, onboarding flows, and churn prevention for: "{idea}". Focus on elderly care users (low tech literacy), Hebrew UX, and AI-powered support. Include NPS benchmarks for healthcare SaaS.',
  },
  sales: {
    department: 'sales',
    searchKeywords: ['sales enablement', 'pricing strategy', 'B2B sales cycle', 'channel partners', 'objection handling'],
    subreddits: ['sales', 'Entrepreneur', 'SaaS'],
    specialDomains: ['gong.io', 'hubspot.com', 'salesforce.com'],
    githubQualifiers: ['topic:sales', 'topic:crm', 'topic:saas'],
    perplexityFocusTemplate: 'Sales strategy, pricing impact, and channel partnerships for: "{idea}". Focus on B2B healthcare sales in Israel, care facility procurement cycles, and competitive positioning. Include objection handling frameworks.',
  },
};

// ai-dev is excluded from per-dept research — it runs after all depts

/**
 * Build department-focused search queries by combining ideaPrompt with
 * department-specific keywords and team member skills/expertise.
 */
export function buildDeptSearchQueries(
  department: string,
  ideaPrompt: string,
  teamSkills: string[],
  domainExpertise: string[],
): {
  githubQuery: string;
  redditQuery: string;
  perplexityPrompt: string;
} {
  const config = DEPT_RESEARCH_SOURCES[department];
  if (!config) {
    return {
      githubQuery: ideaPrompt,
      redditQuery: ideaPrompt,
      perplexityPrompt: `Research about: "${ideaPrompt}". Provide key findings, tools, and recommendations.`,
    };
  }

  // Pick top 2-3 most distinctive keywords to append
  const extraKeywords = config.searchKeywords.slice(0, 2).join(' ');

  // GitHub search returns 0 when combining idea + dept keyword — they're too unrelated.
  // Strategy: run the idea query as-is (max 5 words, no stop words). The dept differentiation
  // comes from Reddit (dept-specific subreddits) and Perplexity (dept-focused prompt).
  const STOP_WORDS = new Set(['for', 'the', 'a', 'an', 'in', 'on', 'of', 'to', 'and', 'or', 'with', 'is', 'at', 'by']);
  const githubQuery = ideaPrompt.split(/\s+/).filter(w => !STOP_WORDS.has(w.toLowerCase())).slice(0, 5).join(' ');

  // Build Reddit query — shorter, more conversational
  const redditQuery = `${ideaPrompt} ${extraKeywords}`.trim();

  // Build Perplexity prompt — most detailed, with team context
  const skillContext = teamSkills.length > 0
    ? `\nTeam skills: ${teamSkills.slice(0, 5).join(', ')}.`
    : '';
  const domainContext = domainExpertise.length > 0
    ? `\nDomain expertise: ${domainExpertise.slice(0, 3).join(', ')}.`
    : '';
  const perplexityPrompt = config.perplexityFocusTemplate.replace('{idea}', ideaPrompt)
    + skillContext
    + domainContext
    + '\nBe concise (max 400 words). Include URLs where possible.';

  return { githubQuery, redditQuery, perplexityPrompt };
}
