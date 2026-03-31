/**
 * AI Phase Analyzer - breaks a Phase into dev tasks using a structured template.
 * Uses multiProviderAI (Claude/OpenAI) with analyzePhase use case.
 * Optionally enriches with Perplexity web context when techStack is present.
 */
import { callAI } from './multiProviderAI';
import { getWebContext } from './perplexityService';

export type ProposedTask = {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  estimateHours?: number;
  labels?: string[];
  storyPoints?: number;
};

export type PhaseInput = {
  name: string;
  description?: string | null;
  goals?: string[];
  techStack?: string[];
  aiContext?: string | null;
};

const TASK_TEMPLATE = `Each task must have: title (required), description, priority (low|medium|high|urgent), category, estimateHours, labels (array), storyPoints (1-5).`;

export async function analyzePhaseToTasks(phase: PhaseInput): Promise<ProposedTask[]> {
  const goalsText = Array.isArray(phase.goals) ? phase.goals.join('\n- ') : '';
  const techText = Array.isArray(phase.techStack) ? phase.techStack.join(', ') : '';

  const systemPrompt = `You are a technical project manager. Break down a development Phase into concrete, implementable tasks.
Return ONLY valid JSON: an array of task objects. No markdown, no explanation.
Each task object: { "title": string, "description": string, "priority": "low"|"medium"|"high"|"urgent", "category": string, "estimateHours": number, "labels": string[], "storyPoints": number }
${TASK_TEMPLATE}
Order tasks by dependency (foundational first).`;

  let webContext = '';
  if (phase.techStack?.length && process.env.PERPLEXITY_API_KEY?.trim()) {
    const query = `What are current best practices for ${techText} in 2025? Keep under 500 words.`;
    webContext = await getWebContext(query);
  }

  const userPrompt = `Phase: ${phase.name}
${phase.description ? `Description: ${phase.description}\n` : ''}
Goals:
- ${goalsText || '(none)'}
${techText ? `Tech: ${techText}\n` : ''}
${webContext ? `Web research context:\n${webContext}\n\n` : ''}
${phase.aiContext ? `Additional context: ${phase.aiContext}\n` : ''}

Break this Phase into development tasks. Return a JSON array of task objects.`;

  const result = await callAI('analyzePhase', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { temperature: 0.3 });

  const parsed = parseAIResponse(result.content);
  return Array.isArray(parsed) ? parsed : [];
}

function parseAIResponse(content: string): ProposedTask[] {
  const trimmed = content.trim();
  let jsonStr = trimmed;
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (match) jsonStr = match[0];
  try {
    const arr = JSON.parse(jsonStr) as unknown[];
    return arr
      .filter((t): t is Record<string, unknown> => t !== null && typeof t === 'object')
      .map((t) => ({
        title: String(t.title ?? 'Untitled').slice(0, 255),
        description: t.description ? String(t.description).slice(0, 5000) : undefined,
        priority: ['low', 'medium', 'high', 'urgent'].includes(String(t.priority)) ? t.priority as ProposedTask['priority'] : 'medium',
        category: t.category ? String(t.category).slice(0, 64) : undefined,
        estimateHours: typeof t.estimateHours === 'number' ? Math.max(0, t.estimateHours) : undefined,
        labels: Array.isArray(t.labels) ? t.labels.map(String).slice(0, 10) : undefined,
        storyPoints: typeof t.storyPoints === 'number' ? Math.min(5, Math.max(1, t.storyPoints)) : undefined,
      }));
  } catch {
    return [];
  }
}
