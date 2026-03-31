/**
 * Perplexity service - web-grounded AI for best practices, packages, real-time knowledge.
 * Uses Perplexity Sonar API. Logs to ai_usage.
 */
import { db } from './db';
import { aiUsage } from '../../shared/schemas/schema';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * Fetch web context for a query (best practices, latest packages, etc.).
 * Returns empty string if key not set or on error - caller should continue without it.
 */
export async function getWebContext(query: string): Promise<string> {
  const key = PERPLEXITY_API_KEY?.trim();
  if (!key) return '';

  try {
    const resp = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: query }],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      console.error('[perplexity] API error:', resp.status, await resp.text());
      return '';
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
    const model = data.model ?? 'sonar';
    const costUsd = (tokensIn / 1e6) * 1 + (tokensOut / 1e6) * 1;

    try {
      await db.insert(aiUsage).values({
        familyId: null,
        userId: null,
        model,
        tokensUsed: tokensIn + tokensOut,
        costUsd: String(costUsd.toFixed(6)),
        endpoint: 'webContext',
      });
    } catch (err) {
      console.error('[perplexity] Failed to log cost:', err);
    }

    return content.slice(0, 2000).trim();
  } catch (err) {
    console.error('[perplexity] getWebContext error:', err);
    return '';
  }
}
