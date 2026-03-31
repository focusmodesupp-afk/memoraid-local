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

// ── Types ────────────────────────────────────────────────────────────────────

export type N8NWorkflowType =
  | 'github_research'
  | 'reddit_research'
  | 'youtube_research'
  | 'competitive_analysis'
  | 'full_research';

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
      // Trigger N8N full_research workflow (synchronous — waits for response)
      const config = getN8NConfig();
      const webhookUrl = `${config.baseUrl}/full_research`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout);

      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ briefId, ideaPrompt, departments }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (resp.ok) {
        const data = await resp.json();
        const sources = processN8NResults({
          briefId,
          workflowType: 'full_research',
          sources: data.sources ?? [],
          metadata: data.metadata,
        });

        if (sources.length > 0) {
          console.log(`[n8nBridge] Got ${sources.length} sources from N8N for brief ${briefId}`);
          const synthesizedContext = sources
            .slice(0, 10)
            .map((s) => `[${s.sourceType}] ${s.title} (trust: ${s.trustScore})`)
            .join('\n');

          return {
            result: { sources, synthesizedContext },
            source: 'n8n',
          };
        }
      }
      console.warn('[n8nBridge] N8N returned no usable sources, falling back to direct');
    } catch (err) {
      console.warn('[n8nBridge] N8N unavailable, falling back to direct:', err instanceof Error ? err.message : err);
    }
  }

  // Fallback to direct web intelligence
  if (directFallback) {
    const result = await directFallback();
    return { result, source: 'direct' };
  }

  return { result: { sources: [], synthesizedContext: '' }, source: 'direct' };
}
