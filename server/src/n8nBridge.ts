/**
 * n8nBridge.ts
 * Bridge between MEMORAID NEXUS and N8N workflow automation.
 *
 * Two modes:
 * 1. TRIGGER: MEMORAID triggers N8N workflows via webhook, N8N returns results
 * 2. RECEIVE: N8N pushes results to MEMORAID via webhook endpoint
 *
 * Set N8N_WEBHOOK_BASE_URL in .env (e.g. http://localhost:5678/webhook)
 */

import type { WebSource, WebIntelligenceResult } from './nexusWebIntelligence';
import { DEPT_RESEARCH_SOURCES, buildDeptSearchQueries } from './nexusDeptResearchConfig';

// ── Types ────────────────────────────────────────────────────────────────────

export type N8NWorkflowType =
  | 'github_research'
  | 'reddit_research'
  | 'youtube_research'
  | 'competitive_analysis'
  | 'full_research'
  | 'dept_research';

export type DeptResearchContext = {
  department: string;
  departmentRole: string;
  skills: string[];
  domainExpertise: string[];
};

export type PerDeptResearchResult = {
  perDeptSources: Map<string, WebSource[]>;
  gapDepartments: string[];
  totalSourcesFound: number;
};

export type N8NTriggerPayload = {
  briefId: string;
  ideaPrompt: string;
  departments?: string[];
  workflowType: N8NWorkflowType;
  callbackUrl: string;
};

export type N8NResultPayload = {
  briefId: string;
  workflowType: N8NWorkflowType;
  sources: WebSource[];
  metadata?: {
    executionId?: string;
    durationMs?: number;
    workflowName?: string;
  };
};

// ── Configuration ────────────────────────────────────────────────────────────

function getN8NConfig() {
  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.N8N_API_KEY;
  return {
    baseUrl,
    apiKey,
    isConfigured: !!baseUrl,
    timeout: Number(process.env.N8N_TIMEOUT_MS) || 60000,
  };
}

export function isN8NConfigured(): boolean {
  return getN8NConfig().isConfigured;
}

// ── Trigger N8N workflow ──────────────────────────────────────────────────────

export async function triggerN8NWorkflow(
  workflowType: N8NWorkflowType,
  briefId: string,
  ideaPrompt: string,
  departments?: string[],
): Promise<{ triggered: boolean; executionId?: string; error?: string }> {
  const config = getN8NConfig();
  if (!config.baseUrl) {
    return { triggered: false, error: 'N8N_WEBHOOK_BASE_URL not configured' };
  }

  const appBaseUrl = process.env.APP_URL || 'http://localhost:3001';
  const callbackUrl = `${appBaseUrl}/api/admin/nexus/briefs/${briefId}/n8n-callback`;

  const payload: N8NTriggerPayload = {
    briefId,
    ideaPrompt,
    departments,
    workflowType,
    callbackUrl,
  };

  try {
    const webhookUrl = `${config.baseUrl}/${workflowType}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeout);

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return { triggered: false, error: `N8N returned ${resp.status}: ${text.slice(0, 200)}` };
    }

    const data = await resp.json().catch(() => ({}));
    console.log(`[n8nBridge] Triggered ${workflowType} for brief ${briefId}`);
    return { triggered: true, executionId: data.executionId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[n8nBridge] Failed to trigger ${workflowType}:`, msg);
    return { triggered: false, error: msg };
  }
}

// ── Trigger full research (all workflows in parallel) ─────────────────────────

export async function triggerFullN8NResearch(
  briefId: string,
  ideaPrompt: string,
  departments?: string[],
): Promise<{ triggered: boolean; workflows: N8NWorkflowType[]; errors: string[] }> {
  const config = getN8NConfig();
  if (!config.baseUrl) {
    return { triggered: false, workflows: [], errors: ['N8N_WEBHOOK_BASE_URL not configured'] };
  }

  const workflowTypes: N8NWorkflowType[] = [
    'github_research',
    'reddit_research',
    'youtube_research',
    'competitive_analysis',
  ];

  const results = await Promise.allSettled(
    workflowTypes.map((wt) => triggerN8NWorkflow(wt, briefId, ideaPrompt, departments)),
  );

  const triggered: N8NWorkflowType[] = [];
  const errors: string[] = [];

  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.triggered) {
      triggered.push(workflowTypes[i]);
    } else {
      const err = r.status === 'fulfilled' ? r.value.error : String(r.reason);
      errors.push(`${workflowTypes[i]}: ${err}`);
    }
  });

  return { triggered: triggered.length > 0, workflows: triggered, errors };
}

// ── Process N8N callback results ──────────────────────────────────────────────

export function processN8NResults(payload: N8NResultPayload): WebSource[] {
  // Validate and normalize sources from N8N
  return (payload.sources ?? [])
    .filter((s) => s && s.title && (s.url || s.snippet))
    .map((s) => ({
      sourceType: s.sourceType ?? 'rss',
      url: s.url ?? '',
      title: s.title ?? 'Untitled',
      snippet: s.snippet ?? '',
      trustScore: Math.min(100, Math.max(0, s.trustScore ?? 50)),
      githubStars: s.githubStars,
      redditScore: s.redditScore,
      contributorCount: s.contributorCount,
      department: s.department,
      rawPayload: s.rawPayload ?? { source: 'n8n', workflowType: payload.workflowType },
    }));
}

// ── Hybrid: try N8N first, fall back to direct ────────────────────────────────

export async function gatherWebIntelligenceHybrid(
  briefId: string,
  ideaPrompt: string,
  departments?: string[],
  directFallback?: () => Promise<WebIntelligenceResult>,
): Promise<{ result: WebIntelligenceResult; source: 'n8n' | 'direct' }> {
  if (isN8NConfigured()) {
    try {
      // Call each N8N workflow directly in parallel (more reliable than orchestrator)
      const config = getN8NConfig();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
      const payload = JSON.stringify({ briefId, ideaPrompt, departments });

      const workflowTypes: N8NWorkflowType[] = [
        'github_research',
        'reddit_research',
        'youtube_research',
        'competitive_analysis',
      ];

      console.log(`[n8nBridge] Calling ${workflowTypes.length} N8N workflows in parallel for brief ${briefId}`);

      const results = await Promise.allSettled(
        workflowTypes.map(async (wt) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), config.timeout);
          try {
            const resp = await fetch(`${config.baseUrl}/${wt}`, {
              method: 'POST',
              headers,
              body: payload,
              signal: controller.signal,
            });
            clearTimeout(timer);
            if (!resp.ok) return { sources: [] };
            const data = await resp.json();
            return { sources: data.sources ?? [], workflowType: wt };
          } catch (err) {
            clearTimeout(timer);
            console.warn(`[n8nBridge] ${wt} failed:`, err instanceof Error ? err.message : err);
            return { sources: [] };
          }
        })
      );

      // Merge all sources from all workflows
      const allSources: WebSource[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.sources?.length > 0) {
          const processed = processN8NResults({
            briefId,
            workflowType: (r.value as any).workflowType ?? 'full_research',
            sources: r.value.sources,
          });
          allSources.push(...processed);
        }
      }

      if (allSources.length > 0) {
        // Deduplicate by URL
        const seen = new Set<string>();
        const unique = allSources.filter(s => {
          if (!s.url || seen.has(s.url)) return false;
          seen.add(s.url);
          return true;
        }).sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0));

        console.log(`[n8nBridge] Got ${unique.length} unique sources from N8N for brief ${briefId}`);
        const synthesizedContext = unique
          .slice(0, 10)
          .map((s) => `[${s.sourceType}] ${s.title} (trust: ${s.trustScore})`)
          .join('\n');

        return {
          result: { sources: unique, synthesizedContext },
          source: 'n8n',
        };
      }

      console.warn('[n8nBridge] N8N returned no usable sources from any workflow, falling back to direct');
    } catch (err) {
      console.warn('[n8nBridge] N8N unavailable, falling back to direct:', err instanceof Error ? err.message : err);
    }
  }

  // Fallback to direct web intelligence
  if (directFallback) {
    const result = await directFallback();
    return { result, source: 'direct' };
  }

  // Last resort: attempt dynamic import of direct intelligence as final fallback
  try {
    const { gatherWebIntelligence } = await import('./nexusWebIntelligence');
    console.warn('[n8nBridge] No directFallback provided, attempting dynamic fallback');
    const result = await gatherWebIntelligence(ideaPrompt, departments);
    return { result, source: 'direct' };
  } catch {
    console.error('[n8nBridge] All fallbacks failed, returning empty result');
    return { result: { sources: [], synthesizedContext: '' }, source: 'direct' };
  }
}

// ── Per-Department Deep Research (Phase 6) ───────────────────────────────────

/**
 * Run tasks with a concurrency limit using a worker-pool pattern.
 */
async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIdx = 0;

  async function worker(): Promise<void> {
    while (nextIdx < tasks.length) {
      const idx = nextIdx++;
      try {
        const value = await tasks[idx]();
        results[idx] = { status: 'fulfilled', value };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Call the N8N dept_research workflow for a single department.
 */
async function callDeptResearchN8N(
  briefId: string,
  ideaPrompt: string,
  ctx: DeptResearchContext,
): Promise<WebSource[]> {
  const config = getN8NConfig();
  if (!config.baseUrl) return [];

  const sourceConfig = DEPT_RESEARCH_SOURCES[ctx.department];
  const queries = buildDeptSearchQueries(
    ctx.department,
    ideaPrompt,
    ctx.skills,
    ctx.domainExpertise,
  );

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const timeout = Number(process.env.N8N_DEPT_TIMEOUT_MS) || 45000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(`${config.baseUrl}/dept_research`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        briefId,
        ideaPrompt,
        department: ctx.department,
        departmentRole: ctx.departmentRole,
        skills: ctx.skills,
        domainExpertise: ctx.domainExpertise,
        specialSources: sourceConfig ?? {
          subreddits: [],
          githubQualifiers: [],
          searchKeywords: [],
          perplexityFocusTemplate: queries.perplexityPrompt,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      console.warn(`[n8nBridge] dept_research for ${ctx.department} returned ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    const sources: WebSource[] = (data.sources ?? [])
      .filter((s: any) => s && s.title && (s.url || s.snippet))
      .map((s: any) => ({
        sourceType: s.sourceType ?? 'perplexity',
        url: s.url ?? '',
        title: s.title ?? 'Untitled',
        snippet: s.snippet ?? '',
        trustScore: Math.min(100, Math.max(0, s.trustScore ?? 50)),
        githubStars: s.githubStars,
        redditScore: s.redditScore,
        contributorCount: s.contributorCount,
        department: ctx.department,
        rawPayload: s.rawPayload ?? { source: 'n8n', workflowType: 'dept_research' },
      }));

    console.log(`[n8nBridge] dept_research for ${ctx.department}: ${sources.length} sources`);
    return sources;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[n8nBridge] dept_research for ${ctx.department} failed:`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Direct API fallback for per-department research (when N8N is not available).
 */
async function directDeptResearch(
  ideaPrompt: string,
  ctx: DeptResearchContext,
): Promise<WebSource[]> {
  try {
    const { fetchGitHubSources, fetchRedditSources, fetchPerplexitySingle } = await import('./nexusWebIntelligence');
    const queries = buildDeptSearchQueries(ctx.department, ideaPrompt, ctx.skills, ctx.domainExpertise);
    const sourceConfig = DEPT_RESEARCH_SOURCES[ctx.department];

    const tasks: Promise<WebSource[]>[] = [
      // GitHub with dept-specific query
      fetchGitHubSources(queries.githubQuery).then(sources =>
        sources.map(s => ({ ...s, department: ctx.department }))
      ),
    ];

    // Reddit — search top 2 dept subreddits
    const subreddits = sourceConfig?.subreddits?.slice(0, 2) ?? [];
    for (const sub of subreddits) {
      tasks.push(
        fetchRedditSources(queries.redditQuery, sub).then(sources =>
          sources.map(s => ({ ...s, department: ctx.department }))
        )
      );
    }

    // Perplexity — dept-focused query
    tasks.push(
      fetchPerplexitySingle(ctx.department, queries.perplexityPrompt).then(source => {
        if (!source) return [];
        return [{ ...source, department: ctx.department }];
      })
    );

    const results = await Promise.allSettled(tasks);
    const sources: WebSource[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') sources.push(...r.value);
    }
    return sources;
  } catch (err) {
    console.warn(`[n8nBridge] directDeptResearch for ${ctx.department} failed:`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Identify departments with insufficient quality sources.
 */
function identifyGaps(perDeptSources: Map<string, WebSource[]>): string[] {
  const QUALITY_THRESHOLD = 50;
  const MIN_QUALITY_SOURCES = 3;
  const gaps: string[] = [];
  for (const [dept, sources] of perDeptSources) {
    const quality = sources.filter(s => s.trustScore >= QUALITY_THRESHOLD);
    if (quality.length < MIN_QUALITY_SOURCES) {
      gaps.push(dept);
    }
  }
  return gaps;
}

/**
 * Trigger per-department research for all departments in parallel.
 * Tries N8N first, falls back to direct API if N8N is not configured.
 */
export async function triggerPerDeptResearch(
  briefId: string,
  ideaPrompt: string,
  deptContexts: DeptResearchContext[],
): Promise<PerDeptResearchResult> {
  if (process.env.NEXUS_DEPT_RESEARCH_ENABLED === 'false') {
    return { perDeptSources: new Map(), gapDepartments: [], totalSourcesFound: 0 };
  }

  const concurrency = Number(process.env.N8N_DEPT_CONCURRENCY) || 5;
  const useN8N = isN8NConfigured();

  console.log(`[n8nBridge] Per-dept research: ${deptContexts.length} depts, concurrency=${concurrency}, mode=${useN8N ? 'n8n' : 'direct'}`);

  const tasks = deptContexts.map((ctx) => () =>
    useN8N
      ? callDeptResearchN8N(briefId, ideaPrompt, ctx)
      : directDeptResearch(ideaPrompt, ctx)
  );

  const results = await withConcurrencyLimit(tasks, concurrency);

  const perDeptSources = new Map<string, WebSource[]>();
  let totalSourcesFound = 0;

  results.forEach((r, i) => {
    const dept = deptContexts[i].department;
    const sources = r.status === 'fulfilled' ? r.value : [];
    perDeptSources.set(dept, sources);
    totalSourcesFound += sources.length;
  });

  // Gap analysis
  const gapDepartments = identifyGaps(perDeptSources);
  if (gapDepartments.length > 0) {
    console.log(`[n8nBridge] Gap departments (< 3 quality sources): ${gapDepartments.join(', ')}`);
  }

  return { perDeptSources, gapDepartments, totalSourcesFound };
}

/**
 * Second-pass research for gap departments using broader queries.
 */
export async function triggerDeptGapResearch(
  briefId: string,
  ideaPrompt: string,
  gapDepts: DeptResearchContext[],
): Promise<Map<string, WebSource[]>> {
  const broadened: DeptResearchContext[] = gapDepts.map(ctx => ({
    ...ctx,
    // Broaden skills to generic terms for second pass
    skills: [...ctx.skills.slice(0, 2), 'best practices', 'overview'],
  }));

  const concurrency = Number(process.env.N8N_DEPT_CONCURRENCY) || 5;
  const tasks = broadened.map((ctx) => () => directDeptResearch(ideaPrompt, ctx));
  const results = await withConcurrencyLimit(tasks, concurrency);

  const gapSources = new Map<string, WebSource[]>();
  results.forEach((r, i) => {
    const dept = broadened[i].department;
    gapSources.set(dept, r.status === 'fulfilled' ? r.value : []);
  });

  return gapSources;
}

/**
 * Merge generic web intelligence with per-department sources.
 * Dept-specific sources get a +10 trust score bonus (capped at 100).
 * Returns a Map where each department has its own WebIntelligenceResult.
 */
export function mergeWebIntelligence(
  genericResult: WebIntelligenceResult,
  perDeptSources: Map<string, WebSource[]>,
): Map<string, WebIntelligenceResult> {
  const merged = new Map<string, WebIntelligenceResult>();

  for (const [dept, deptSources] of perDeptSources) {
    // Dept-specific sources get trust bonus
    const boosted = deptSources.map(s => ({
      ...s,
      trustScore: Math.min(100, s.trustScore + 10),
    }));

    // Combine: dept-specific first, then generic
    const combined = [...boosted, ...genericResult.sources];

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = combined.filter(s => {
      if (!s.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    }).sort((a, b) => b.trustScore - a.trustScore);

    // Build synthesized context
    const deptOnly = unique.filter(s => s.department === dept);
    const contextLines = [
      `## מחקר ממוקד למחלקת ${dept}\n`,
      ...deptOnly.slice(0, 5).map(s =>
        `- [${s.sourceType}] **${s.title.slice(0, 80)}** (trust: ${s.trustScore}/100)`
      ),
      '',
      genericResult.synthesizedContext,
    ];

    merged.set(dept, {
      sources: unique,
      synthesizedContext: contextLines.join('\n'),
    });
  }

  return merged;
}
