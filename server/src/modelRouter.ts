/**
 * modelRouter.ts
 * Intelligent model routing — selects the best AI model per use-case.
 * Instead of using the same model for everything, each step in the pipeline
 * gets the model best suited for its task.
 */

import type { AIProviderId } from './multiProviderAI';

// ── Use-Case Types ───────────────────────────────────────────────────────────

export type ModelUseCase =
  | 'webResearch'          // Perplexity — live internet access
  | 'departmentAnalysis'   // Deep analysis per department
  | 'smartTitle'           // Quick title generation
  | 'taskExtraction'       // JSON-structured task extraction
  | 'docGeneration'        // PRD, ERD, Blueprint, etc.
  | 'briefSummary'         // Brief assembly / summarization
  | 'qualityCheck'         // QA, second opinion
  | 'medicalAnalysis'      // Medical document analysis (vision)
  | 'codeAnalysis'         // Code review, architecture
  | 'analyzePhase'         // Phase breakdown
  | 'featurePlanning'      // Feature planning
  | 'projectHealthCheck'   // Project analysis
  | 'askQuestion'          // General Q&A
  | 'general';             // Fallback

// ── Model Routing Map ────────────────────────────────────────────────────────

type ModelRoute = {
  primary: AIProviderId;
  fallback: AIProviderId;
  reason: string;  // Why this model for this use case
};

const MODEL_ROUTING_MAP: Record<ModelUseCase, ModelRoute> = {
  webResearch: {
    primary: 'perplexity',
    fallback: 'gemini',
    reason: 'Perplexity has live internet access with citations',
  },
  departmentAnalysis: {
    primary: 'claude',
    fallback: 'gemini31',
    reason: 'Claude excels at deep, structured Hebrew analysis',
  },
  smartTitle: {
    primary: 'gemini',
    fallback: 'claude',
    reason: 'Gemini Flash is fast and cheap for short generation',
  },
  taskExtraction: {
    primary: 'claude',
    fallback: 'gemini31',
    reason: 'Claude is most accurate at structured JSON output',
  },
  docGeneration: {
    primary: 'claude',
    fallback: 'gemini31',
    reason: 'Claude produces the deepest technical documents',
  },
  briefSummary: {
    primary: 'gemini',
    fallback: 'openai',
    reason: 'Gemini Flash is fast and cheap for summarization',
  },
  qualityCheck: {
    primary: 'openai',
    fallback: 'claude',
    reason: 'GPT-4o provides diverse second opinion',
  },
  medicalAnalysis: {
    primary: 'claude',
    fallback: 'openai',
    reason: 'Claude has best vision + Hebrew support',
  },
  codeAnalysis: {
    primary: 'claude',
    fallback: 'gemini31',
    reason: 'Claude is strongest at code understanding',
  },
  analyzePhase: {
    primary: 'claude',
    fallback: 'gemini31',
    reason: 'Phase analysis needs deep reasoning',
  },
  featurePlanning: {
    primary: 'claude',
    fallback: 'gemini31',
    reason: 'Feature planning needs structured output',
  },
  projectHealthCheck: {
    primary: 'claude',
    fallback: 'openai',
    reason: 'Project analysis needs comprehensive view',
  },
  askQuestion: {
    primary: 'claude',
    fallback: 'gemini',
    reason: 'General Q&A — Claude first, Gemini as fast fallback',
  },
  general: {
    primary: 'claude',
    fallback: 'gemini',
    reason: 'Default routing',
  },
};

// ── API Key Availability Check ───────────────────────────────────────────────

function isProviderAvailable(provider: AIProviderId): boolean {
  switch (provider) {
    case 'claude': return !!(process.env.ANTHROPIC_API_KEY?.trim());
    case 'openai': return !!(process.env.OPENAI_API_KEY?.trim());
    case 'gemini': return !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
    case 'gemini31': return !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
    case 'perplexity': return !!(process.env.PERPLEXITY_API_KEY?.trim());
    default: return false;
  }
}

// ── Main Resolver ────────────────────────────────────────────────────────────

/**
 * Resolves the best model order for a given use case.
 *
 * Logic:
 * 1. Look up the routing map for the use case
 * 2. Build ordered list: [primary, fallback, ...remaining available]
 * 3. Filter out unavailable providers (no API key)
 * 4. If userPreferred is provided AND non-empty, respect it BUT reorder
 *    based on the routing map (primary first if in user list)
 *
 * @returns Ordered array of available providers, best-fit first
 */
export function resolveModel(
  useCase: ModelUseCase | string,
  userPreferred?: AIProviderId[],
): AIProviderId[] {
  const route = MODEL_ROUTING_MAP[useCase as ModelUseCase] ?? MODEL_ROUTING_MAP.general;
  const allProviders: AIProviderId[] = ['claude', 'openai', 'gemini', 'gemini31', 'perplexity'];

  // Get all available providers
  const available = allProviders.filter(isProviderAvailable);
  if (available.length === 0) return [];

  // If user provided preferred models, use them but reorder by routing map
  if (userPreferred && userPreferred.length > 0) {
    const userAvailable = userPreferred.filter((p) => available.includes(p));

    // Always include the routing primary if it's available (even if user didn't select it)
    // This ensures Perplexity is used for webResearch even if user only selected Claude+Gemini
    const result: AIProviderId[] = [];

    // 1. Routing primary (if available)
    if (available.includes(route.primary)) {
      result.push(route.primary);
    }

    // 2. User-selected models (excluding primary if already added)
    for (const p of userAvailable) {
      if (!result.includes(p)) result.push(p);
    }

    // 3. Routing fallback (if not already in list)
    if (available.includes(route.fallback) && !result.includes(route.fallback)) {
      result.push(route.fallback);
    }

    return result.length > 0 ? result : available;
  }

  // No user preference — use routing map order
  const result: AIProviderId[] = [];
  if (available.includes(route.primary)) result.push(route.primary);
  if (available.includes(route.fallback) && !result.includes(route.fallback)) result.push(route.fallback);
  for (const p of available) {
    if (!result.includes(p)) result.push(p);
  }

  return result;
}

/**
 * Get the routing info for a use case (for logging/display).
 */
export function getModelRoute(useCase: ModelUseCase | string): ModelRoute {
  return MODEL_ROUTING_MAP[useCase as ModelUseCase] ?? MODEL_ROUTING_MAP.general;
}

/**
 * Get all routing rules (for admin UI display).
 */
export function getAllModelRoutes(): Record<string, ModelRoute & { available: boolean }> {
  const result: Record<string, ModelRoute & { available: boolean }> = {};
  for (const [useCase, route] of Object.entries(MODEL_ROUTING_MAP)) {
    result[useCase] = {
      ...route,
      available: isProviderAvailable(route.primary),
    };
  }
  return result;
}
