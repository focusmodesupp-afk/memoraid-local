/**
 * nexusEmployeeResearch.ts
 * Per-employee web research for NEXUS V2 Meeting Mode.
 *
 * Each employee gets research sources focused on their specific skills,
 * domain expertise, and role — not generic department-level research.
 */

import type { WebSource } from './nexusWebIntelligence';

export type EmployeeResearchContext = {
  employeeName: string;
  employeeRole: string;
  department: string;
  level: string;
  skills: string[];
  domainExpertise: string[];
  responsibilities?: string | null;
};

/**
 * Build search queries tailored to a specific employee's expertise.
 */
export function buildEmployeeSearchQueries(
  employee: EmployeeResearchContext,
  ideaPrompt: string,
): {
  githubQuery: string;
  redditQuery: string;
  perplexityPrompt: string;
} {
  // GitHub: idea + top 1 employee skill
  const STOP_WORDS = new Set(['for', 'the', 'a', 'an', 'in', 'on', 'of', 'to', 'and', 'or', 'with', 'is', 'at', 'by']);
  const ideaWords = ideaPrompt.split(/\s+/).filter(w => !STOP_WORDS.has(w.toLowerCase())).slice(0, 5).join(' ');
  const githubQuery = ideaWords; // Same as idea — GitHub doesn't benefit from role-specific terms

  // Reddit: idea + employee-specific keywords
  const roleKeywords = employee.skills.slice(0, 2).join(' ');
  const redditQuery = `${ideaPrompt.slice(0, 60)} ${roleKeywords}`.trim();

  // Perplexity: highly focused on employee's specific expertise
  const skillStr = employee.skills.length > 0 ? `Team skills: ${employee.skills.slice(0, 5).join(', ')}.` : '';
  const domainStr = employee.domainExpertise.length > 0 ? `Domain expertise: ${employee.domainExpertise.slice(0, 3).join(', ')}.` : '';
  const roleStr = employee.responsibilities ? `Role responsibilities: ${employee.responsibilities.slice(0, 200)}.` : '';

  const perplexityPrompt = `From the perspective of a ${employee.employeeRole} (${employee.level}), research: "${ideaPrompt}".
${skillStr}
${domainStr}
${roleStr}
Focus on what a ${employee.employeeRole} specifically needs to know. Be concise (max 400 words). Include URLs.`;

  return { githubQuery, redditQuery, perplexityPrompt };
}

/**
 * Get Reddit subreddits relevant to an employee's department + skills.
 */
function getEmployeeSubreddits(employee: EmployeeResearchContext): string[] {
  const DEPT_SUBREDDITS: Record<string, string[]> = {
    ceo: ['startups', 'Entrepreneur'],
    cto: ['softwarearchitecture', 'node', 'programming'],
    cpo: ['ProductManagement', 'UXDesign'],
    rd: ['MachineLearning', 'LocalLLaMA'],
    design: ['web_design', 'UI_Design', 'accessibility'],
    product: ['ProductManagement', 'scrum'],
    security: ['netsec', 'cybersecurity'],
    legal: ['gdpr', 'opensource'],
    marketing: ['marketing', 'SEO'],
    finance: ['SaaS', 'financialindependence'],
    hr: ['humanresources', 'remotework'],
    cs: ['customerservice', 'SaaS'],
    sales: ['sales', 'SaaS'],
    'ai-dev': ['MachineLearning', 'ClaudeAI'],
  };

  // Base subreddits from department
  const subs = DEPT_SUBREDDITS[employee.department] ?? [];

  // Add skill-specific subreddits for senior+ employees
  if (employee.level === 'clevel' || employee.level === 'manager' || employee.level === 'senior') {
    if (employee.skills.some(s => s.toLowerCase().includes('react'))) subs.push('reactjs');
    if (employee.skills.some(s => s.toLowerCase().includes('typescript'))) subs.push('typescript');
    if (employee.skills.some(s => s.toLowerCase().includes('postgres'))) subs.push('PostgreSQL');
    if (employee.skills.some(s => s.toLowerCase().includes('docker') || s.toLowerCase().includes('devops'))) subs.push('devops');
    if (employee.skills.some(s => s.toLowerCase().includes('figma'))) subs.push('FigmaDesign');
  }

  // Deduplicate
  return [...new Set(subs)].slice(0, 3);
}

/**
 * Fetch web sources via N8N employee_research webhook.
 * Returns empty array if N8N is not configured or fails.
 */
async function fetchEmployeeWebSourcesN8N(
  employee: EmployeeResearchContext,
  ideaPrompt: string,
  roundNumber: number,
): Promise<WebSource[]> {
  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) return [];

  const queries = buildEmployeeSearchQueries(employee, ideaPrompt);
  const subreddits = getEmployeeSubreddits(employee);

  const timeout = Number(process.env.N8N_DEPT_TIMEOUT_MS) || 45000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = process.env.N8N_API_KEY;
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const resp = await fetch(`${baseUrl}/employee_research`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        briefId: '',
        ideaPrompt,
        roundNumber,
        employeeName: employee.employeeName,
        employeeRole: employee.employeeRole,
        department: employee.department,
        level: employee.level,
        skills: employee.skills,
        domainExpertise: employee.domainExpertise,
        subreddits,
        perplexityPrompt: queries.perplexityPrompt,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) return [];
    const data = await resp.json();
    const sources: WebSource[] = (data.sources ?? [])
      .filter((s: any) => s && s.title && (s.url || s.snippet))
      .map((s: any) => ({
        sourceType: s.sourceType ?? 'perplexity',
        url: s.url ?? '',
        title: s.title ?? '',
        snippet: s.snippet ?? '',
        trustScore: Math.min(100, Math.max(0, s.trustScore ?? 50)),
        githubStars: s.githubStars,
        redditScore: s.redditScore,
        department: employee.department,
        rawPayload: s.rawPayload ?? { source: 'n8n', workflowType: 'employee_research' },
      }));
    return sources;
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/**
 * Fetch web sources for a specific employee — hybrid (N8N first, direct fallback).
 * Uses shared GitHub results (same for all) + employee-specific Reddit + Perplexity.
 */
export async function fetchEmployeeWebSources(
  employee: EmployeeResearchContext,
  ideaPrompt: string,
  sharedGitHubSources?: WebSource[],
  roundNumber?: number,
): Promise<WebSource[]> {
  // Try N8N first
  if (process.env.N8N_WEBHOOK_BASE_URL) {
    const n8nSources = await fetchEmployeeWebSourcesN8N(employee, ideaPrompt, roundNumber ?? 1);
    if (n8nSources.length > 0) return n8nSources;
    console.warn(`[EmployeeResearch] N8N returned 0 for ${employee.employeeName}, using direct fallback`);
  }

  const queries = buildEmployeeSearchQueries(employee, ideaPrompt);
  const allSources: WebSource[] = [];

  // GitHub: use shared results tagged with this employee
  if (sharedGitHubSources && sharedGitHubSources.length > 0) {
    allSources.push(...sharedGitHubSources.map(s => ({
      ...s,
      department: employee.department,
    })));
  }

  try {
    const { fetchRedditSources, fetchPerplexitySingle } = await import('./nexusWebIntelligence');

    // Reddit: employee-specific subreddits
    const subreddits = getEmployeeSubreddits(employee);
    for (const sub of subreddits.slice(0, 2)) {
      try {
        const results = await fetchRedditSources(queries.redditQuery, sub);
        allSources.push(...results.map(s => ({ ...s, department: employee.department })));
      } catch { /* non-fatal */ }
    }

    // Perplexity: employee-focused prompt
    try {
      const result = await fetchPerplexitySingle(employee.employeeRole, queries.perplexityPrompt);
      if (result) {
        allSources.push({ ...result, department: employee.department });
      }
    } catch { /* non-fatal */ }
  } catch (err) {
    console.warn(`[EmployeeResearch] Failed for ${employee.employeeName}:`, err instanceof Error ? err.message : err);
  }

  return allSources;
}
