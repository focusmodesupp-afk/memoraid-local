/**
 * Multi-Provider AI Orchestrator
 * Routes requests by useCase to the appropriate model.
 * Primary: Claude Sonnet | Fallback: GPT-4o | Tertiary: Gemini
 * Compatible with Supabase (PostgreSQL) - logs to ai_usage table.
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import { aiUsage } from '../../shared/schemas/schema';

export type AIUseCase =
  | 'analyzePhase'
  | 'generatePrompt'
  | 'summarizeCode'
  | 'classifyTask'
  | 'projectHealthCheck'
  | 'featurePlanning'
  | 'askQuestion'
  | 'webResearch'
  | 'departmentAnalysis'
  | 'smartTitle'
  | 'taskExtraction'
  | 'docGeneration'
  | 'briefSummary'
  | 'qualityCheck'
  | 'medicalAnalysis'
  | 'codeAnalysis'
  | 'general';

export type AIMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } };

/** Processed file from fileProcessor – for multimodal input */
export type ProcessedAttachment = {
  type: 'image' | 'pdf' | 'text' | 'metadata_only';
  filename: string;
  mimeType: string;
  content: string;
  mediaType?: string;
};

export type AIProviderId = 'claude' | 'openai' | 'gemini' | 'gemini31' | 'perplexity';

export type AIOptions = {
  temperature?: number;
  familyId?: string | null;
  userId?: string | null;
  phaseId?: string | null;
  sprintId?: string | null;
  /** Admin user ID when called from Admin AI (for usage analytics) */
  adminUserId?: string | null;
  /** When set: use only these providers, in order. No fallback to others. */
  preferredModels?: AIProviderId[];
  /** Attachments to inject into the last user message (vision/multimodal) */
  attachments?: ProcessedAttachment[];
};

export type AIResult = {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  responseTimeMs?: number;
  fallbackReason?: string;
};

// Claude models - use fixed version IDs (claude-3-5-sonnet-latest was deprecated)
const CLAUDE_SONNET = 'claude-sonnet-4-6';
const CLAUDE_HAIKU = 'claude-haiku-4-5';

// Pricing per 1M tokens (input / output) - Feb 2026
const PRICING: Record<string, { input: number; output: number }> = {
  [CLAUDE_SONNET]: { input: 3, output: 15 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  [CLAUDE_HAIKU]: { input: 1, output: 5 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-3.1-pro-preview': { input: 2, output: 12 },
  'perplexity-sonar': { input: 1, output: 1 },
};

function calcCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (tokensIn / 1_000_000) * p.input + (tokensOut / 1_000_000) * p.output;
}

async function logAICost(
  result: AIResult,
  useCase: string,
  opts: AIOptions
): Promise<void> {
  try {
    await db.insert(aiUsage).values({
      familyId: opts.familyId ?? null,
      userId: opts.userId ?? null,
      adminUserId: opts.adminUserId ?? null,
      model: result.model,
      tokensUsed: result.tokensIn + result.tokensOut,
      costUsd: String(result.costUsd.toFixed(6)),
      endpoint: useCase,
      responseTimeMs: result.responseTimeMs ?? null,
    });
  } catch (err) {
    console.error('[multiProviderAI] Failed to log cost:', err);
  }
}

function buildClaudeContent(
  text: string,
  attachments?: ProcessedAttachment[]
): string | ContentBlock[] {
  if (!attachments || attachments.length === 0) return text;
  const blocks: ContentBlock[] = [];
  if (text) blocks.push({ type: 'text', text });
  for (const a of attachments) {
    if (a.mimeType === 'application/pdf' && a.mediaType && a.content) {
      // PDFs use the 'document' block type in Claude's API (requires pdfs beta)
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: a.content },
      });
    } else if (a.type === 'image' && a.mediaType && a.content) {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: a.mediaType, data: a.content },
      });
    } else {
      blocks.push({ type: 'text', text: `\n\n[קובץ: ${a.filename}]\n${a.content}` });
    }
  }
  return blocks;
}

async function callClaude(
  messages: AIMessage[],
  model: string,
  temperature: number,
  attachments?: ProcessedAttachment[]
): Promise<AIResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const anthropic = new Anthropic({ apiKey: key });
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMsgs = messages
    .filter((m) => m.role !== 'system')
    .map((m, i, arr) => {
      const isLastUser = m.role === 'user' && i === arr.length - 1;
      const content = isLastUser ? buildClaudeContent(m.content, attachments) : m.content;
      return { role: m.role as 'user' | 'assistant', content };
    });

  if (chatMsgs.length === 0) return null;

  // Detect if any message contains a PDF document block
  // PDF documents require anthropic.beta.messages.create() with the pdfs beta
  const hasPdfDoc = chatMsgs.some(
    (m) =>
      Array.isArray(m.content) &&
      (m.content as ContentBlock[]).some((b) => b.type === 'document')
  );

  const claudeModel = model.startsWith('claude-') ? model : CLAUDE_SONNET;
  console.log(`[callClaude] calling model=${claudeModel}, msgs=${messages.length}, hasAttach=${!!attachments?.length}`);
  const baseParams = {
    model: claudeModel,
    max_tokens: 16000,
    temperature,
    system: systemMsg?.content,
    messages: chatMsgs,
  };

  // Use beta client for PDF document analysis, regular client for everything else
  const resp = hasPdfDoc
    ? await (anthropic.beta as any).messages.create({
        ...baseParams,
        betas: ['pdfs-2024-09-25'],
      })
    : await anthropic.messages.create(baseParams);

  const usage = resp.usage;
  const block = resp.content[0];
  const out = block && 'text' in block ? block.text : '';
  const tokensIn = usage.input_tokens;
  const tokensOut = usage.output_tokens;

  return {
    content: out,
    model: resp.model,
    tokensIn,
    tokensOut,
    costUsd: calcCost(resp.model, tokensIn, tokensOut),
  };
}

function buildOpenAIContent(text: string, attachments?: ProcessedAttachment[]): string | OpenAI.Chat.ChatCompletionContentPart[] {
  if (!attachments || attachments.length === 0) return text;
  const parts: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: 'text', text }];
  for (const a of attachments) {
    if ((a.type === 'image' || a.type === 'pdf') && a.mediaType && a.content) {
      parts.push({ type: 'image_url', image_url: { url: `data:${a.mediaType};base64,${a.content}` } });
    } else {
      parts.push({ type: 'text', text: `\n\n[קובץ: ${a.filename}]\n${a.content}` });
    }
  }
  return parts;
}

async function callOpenAI(
  messages: AIMessage[],
  temperature: number,
  attachments?: ProcessedAttachment[]
): Promise<AIResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const openai = new OpenAI({ apiKey: key });
  const formatted = messages
    .filter((m) => m.role !== 'system')
    .map((m, i, arr) => {
      const isLastUser = m.role === 'user' && i === arr.length - 1;
      const content = isLastUser ? buildOpenAIContent(m.content, attachments) : m.content;
      return {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content,
      };
    });
  const systemMsg = messages.find((m) => m.role === 'system');
  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = systemMsg
    ? [{ role: 'system', content: systemMsg.content }, ...formatted]
    : formatted;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: msgs,
    max_tokens: 16384,
    temperature,
  });

  const choice = resp.choices[0];
  const content = choice?.message?.content ?? '';
  const usage = resp.usage ?? { prompt_tokens: 0, completion_tokens: 0 };

  return {
    content,
    model: resp.model,
    tokensIn: usage.prompt_tokens,
    tokensOut: usage.completion_tokens,
    costUsd: calcCost('gpt-4o', usage.prompt_tokens, usage.completion_tokens),
  };
}

async function callGemini(
  messages: AIMessage[],
  temperature: number,
  attachments?: ProcessedAttachment[]
): Promise<AIResult | null> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!key?.trim()) return null;
  const ai = new GoogleGenAI({ apiKey: key });
  const systemMsg = messages.find((m) => m.role === 'system');
  const filtered = messages.filter((m) => m.role !== 'system');
  let userPart = filtered.map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n\n');
  if (attachments?.length) {
    const lastUser = filtered.filter((m) => m.role === 'user').pop();
    if (lastUser) {
      for (const a of attachments) {
        userPart += `\n\n[קובץ: ${a.filename}]\n${a.content}`;
      }
    }
  }
  const prompt = systemMsg
    ? `[System]\n${systemMsg.content}\n\n[User]\n${userPart}`
    : userPart;

  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      maxOutputTokens: 16384,
      temperature,
    },
  });

  const text = resp.text ?? '';
  const usage = (resp as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }).usageMetadata ?? {};
  const tokensIn = usage.promptTokenCount ?? 0;
  const tokensOut = usage.candidatesTokenCount ?? usage.totalTokenCount ?? 0;

  return {
    content: text,
    model: 'gemini-2.5-flash',
    tokensIn,
    tokensOut,
    costUsd: calcCost('gemini-2.5-flash', tokensIn, tokensOut),
  };
}

const GEMINI_31_MODEL = 'gemini-3.1-pro-preview';

async function callGemini31(
  messages: AIMessage[],
  temperature: number,
  attachments?: ProcessedAttachment[]
): Promise<AIResult | null> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!key?.trim()) return null;
  const ai = new GoogleGenAI({ apiKey: key });
  const systemMsg = messages.find((m) => m.role === 'system');
  const filtered = messages.filter((m) => m.role !== 'system');
  let userPart = filtered.map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n\n');
  if (attachments?.length) {
    const lastUser = filtered.filter((m) => m.role === 'user').pop();
    if (lastUser) {
      for (const a of attachments) {
        userPart += `\n\n[קובץ: ${a.filename}]\n${a.content}`;
      }
    }
  }
  const prompt = systemMsg
    ? `[System]\n${systemMsg.content}\n\n[User]\n${userPart}`
    : userPart;

  const resp = await ai.models.generateContent({
    model: GEMINI_31_MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: 16384,
      temperature,
    },
  });

  const text = resp.text ?? '';
  const usage = (resp as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }).usageMetadata ?? {};
  const tokensIn = usage.promptTokenCount ?? 0;
  const tokensOut = usage.candidatesTokenCount ?? usage.totalTokenCount ?? 0;

  return {
    content: text,
    model: GEMINI_31_MODEL,
    tokensIn,
    tokensOut,
    costUsd: calcCost(GEMINI_31_MODEL, tokensIn, tokensOut),
  };
}

async function callPerplexity(
  messages: AIMessage[],
  temperature: number,
  _attachments?: ProcessedAttachment[]
): Promise<AIResult | null> {
  const key = process.env.PERPLEXITY_API_KEY?.trim();
  if (!key) return null;
  const systemMsg = messages.find((m) => m.role === 'system');
  const userMsgs = messages.filter((m) => m.role !== 'system');
  const formatted = userMsgs.map((m) => ({ role: m.role as 'user' | 'assistant', content: typeof m.content === 'string' ? m.content : '' }));
  const apiMessages = systemMsg
    ? [{ role: 'system' as const, content: systemMsg.content }, ...formatted]
    : formatted;

  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: apiMessages,
      max_tokens: 8192,
      temperature,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Perplexity API: ${resp.status} ${txt.slice(0, 200)}`);
  }
  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage ?? {};
  const tokensIn = usage.prompt_tokens ?? 0;
  const tokensOut = usage.completion_tokens ?? 0;

  return {
    content,
    model: data.model ?? 'perplexity-sonar',
    tokensIn,
    tokensOut,
    costUsd: calcCost('perplexity-sonar', tokensIn, tokensOut),
  };
}

/** Returns true if error is quota/rate-limit (don't retry same provider). */
function isQuotaOrRateLimit(err: unknown): boolean {
  const msg = String(err);
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('Rate limit')
  );
}

/** Extract user-friendly Hebrew message from provider errors. */
function formatAIError(err: unknown, providerId: string): string {
  let msg = err instanceof Error ? err.message : String(err);
  const obj = err as { error?: { message?: string }; message?: string };
  if (obj?.error?.message) msg = obj.error.message;
  const display: Record<string, string> = { claude: 'Claude', openai: 'GPT-4o', gemini: 'Gemini', gemini31: 'Gemini 3.1', perplexity: 'Perplexity' };
  const label = display[providerId] ?? providerId;
  const keyHints: Record<string, string> = {
    claude: 'ANTHROPIC_API_KEY ב-.env (console.anthropic.com)',
    openai: 'OPENAI_API_KEY ב-.env (platform.openai.com)',
    gemini: 'GOOGLE_GENERATIVE_AI_API_KEY ב-.env (aistudio.google.com)',
    gemini31: 'GOOGLE_GENERATIVE_AI_API_KEY ב-.env (aistudio.google.com)',
    perplexity: 'PERPLEXITY_API_KEY ב-.env (perplexity.ai)',
  };
  const hint = keyHints[providerId] ?? 'מפתח API ב-.env';

  if (/authentication_error|invalid.*api.key|invalid.*key|401|401_authentication|missing_api_key/i.test(msg)) {
    return `מפתח ${label} חסר או שגוי. הוסף ${hint} או בחר מודל אחר (למשל Gemini).`;
  }
  if (/429|quota|rate limit/i.test(msg)) {
    return `מכסת ${label} הותשתה. בדוק חיובים ב-console.`;
  }
  if (/403|forbidden/i.test(msg)) {
    return `אין הרשאה ל-${label}. בדוק ${hint}`;
  }
  return msg || `שגיאה מ-${label}`;
}

const PROVIDER_FNS: Record<
  AIProviderId,
  (msgs: AIMessage[], temp: number, attachments?: ProcessedAttachment[]) => Promise<AIResult | null>
> = {
  claude: (msgs, temp, att) => callClaude(msgs, CLAUDE_SONNET, temp, att),
  openai: (msgs, temp, att) => callOpenAI(msgs, temp, att),
  gemini: (msgs, temp, att) => callGemini(msgs, temp, att),
  gemini31: (msgs, temp, att) => callGemini31(msgs, temp, att),
  perplexity: (msgs, temp, att) => callPerplexity(msgs, temp, att),
};

/** Returns models metadata for UI (available + descriptions). */
export function getAvailableModels(): Array<{ id: AIProviderId; label: string; desc: string; available: boolean }> {
  const hasGoogleKey = !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
  return [
    { id: 'claude', label: 'Claude Sonnet', desc: 'ניתוח מעמיק, תכנון פיצ׳רים, תשובות ארוכות – מומלץ לניתוח פרויקט', available: !!(process.env.ANTHROPIC_API_KEY?.trim()) },
    { id: 'openai', label: 'GPT-4o', desc: 'איכות גבוהה, מגוון רחב של משימות', available: !!(process.env.OPENAI_API_KEY?.trim()) },
    { id: 'gemini', label: 'Gemini 2.5 Flash', desc: 'מהיר וחסכוני – טוב לטיוטות ועריכה מהירה', available: hasGoogleKey },
    { id: 'gemini31', label: 'Gemini 3.1 Pro', desc: 'גרסה חדשה ומתקדמת – איכות גבוהה, ניתוח מעמיק, תכנון משופר', available: hasGoogleKey },
    { id: 'perplexity', label: 'Perplexity Sonar', desc: 'מחקר רשת בזמן אמת — מתחרים, טרנדים, best practices, חדשות ענף', available: !!(process.env.PERPLEXITY_API_KEY?.trim()) },
  ];
}

/**
 * Main entry: call AI with intelligent use-case routing.
 * The modelRouter selects the best model per use-case automatically.
 * User preferredModels are respected but reordered by routing intelligence.
 */
export async function callAI(
  useCase: AIUseCase,
  messages: AIMessage[],
  opts: AIOptions = {}
): Promise<AIResult> {
  const temperature = opts.temperature ?? 0.2;

  // Intelligent model routing: resolveModel picks the best model per use-case
  const { resolveModel, getModelRoute } = await import('./modelRouter');
  const providerOrder: AIProviderId[] = resolveModel(useCase, opts.preferredModels);
  const route = getModelRoute(useCase);
  console.log(`[callAI] useCase=${useCase} → route: ${route.primary}→${route.fallback} | resolved: [${providerOrder.join(', ')}] | reason: ${route.reason}`);

  const attachments = opts.attachments;
  const providerFns = providerOrder.map((name) => ({
    name,
    fn: () => PROVIDER_FNS[name](messages, temperature, attachments),
  }));

  const skipProviders = new Set<string>();
  let lastError: Error | null = null;
  let lastFailedProvider: string = '';
  const allProviders: AIProviderId[] = ['claude', 'openai', 'gemini', 'gemini31', 'perplexity'];
  const fallbackProviders = providerOrder.length > 0
    ? (allProviders.filter((p) => !providerOrder.includes(p)) as AIProviderId[])
    : [];

  const tryProviders = async (list: Array<{ name: AIProviderId; fn: () => Promise<AIResult | null> }>) => {
    for (const { name, fn } of list) {
      if (skipProviders.has(name)) continue;
      try {
        const result = await fn();
        if (result) return result;
        lastFailedProvider = name;
        lastError = new Error('missing_api_key');
        console.warn(`[multiProviderAI] ${name}: no API key configured — skipping`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        lastFailedProvider = name;
        console.error(`[multiProviderAI] ${name} failed:`, (err instanceof Error ? err.message : String(err)).slice(0, 200));
        if (isQuotaOrRateLimit(err)) skipProviders.add(name);
      }
    }
    return null;
  };

  const hasExplicitSelection = (opts.preferredModels?.length ?? 0) > 0;
  let firstFailedProvider: string | null = null;
  let firstFailReason: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await tryProviders(providerFns);
    if (r) {
      // Track fallback reason if a higher-priority provider failed before this one succeeded
      if (firstFailedProvider && r.model && !r.model.includes(firstFailedProvider)) {
        r.fallbackReason = `${firstFailedProvider}: ${firstFailReason ?? 'unknown error'}`;
      }
      await logAICost(r, useCase, opts);
      return r;
    }
    // Capture the first failure for fallback tracking
    if (!firstFailedProvider && lastFailedProvider) {
      firstFailedProvider = lastFailedProvider;
      firstFailReason = lastError?.message?.slice(0, 200) ?? null;
    }
    if (!hasExplicitSelection && fallbackProviders.length > 0) {
      const fallbackFns = fallbackProviders.map((name) => ({ name, fn: () => PROVIDER_FNS[name](messages, temperature, attachments) }));
      const r2 = await tryProviders(fallbackFns);
      if (r2) {
        if (firstFailedProvider) {
          r2.fallbackReason = `${firstFailedProvider}: ${firstFailReason ?? 'unknown error'}`;
        }
        await logAICost(r2, useCase, opts);
        return r2;
      }
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 500));
    }
  }

  const friendlyMsg = lastError ? formatAIError(lastError, lastFailedProvider) : '';
  if (friendlyMsg) throw new Error(friendlyMsg);
  const tried = opts.preferredModels?.length ? opts.preferredModels.join(', ') : 'כולם';
  throw lastError ?? new Error(`אף ספק AI לא זמין (נוסו: ${tried}). הגדר מפתחות ב-.env`);
}
