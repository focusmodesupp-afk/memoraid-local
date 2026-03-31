/**
 * Google Gemini service - pre-processing, code summarization, document analysis.
 * Uses @google/genai. Compatible with Supabase - logs to ai_usage via multiProviderAI when applicable.
 * For summarizeCodeContext we log separately to ai_usage.
 */
import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import { aiUsage } from '../../shared/schemas/schema';

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

export type CodeFile = { path: string; content: string };

/**
 * Summarize code files to ~3000 tokens for pre-processing before Claude.
 * Use when Phase has many files - saves cost vs sending raw code to Claude.
 */
export async function summarizeCodeContext(files: CodeFile[]): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY not set');
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const combined = files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');

  const prompt = `Summarize the following codebase files. Focus on:
- Main patterns, structure, and conventions
- Key exports, types, and interfaces
- Existing implementations relevant to development tasks
- Any TODO/FIXME comments
Keep the summary under 3000 tokens. Use concise bullet points.
Respond in the same language as the code comments (Hebrew or English).

${combined}`;

  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.2,
    },
  });

  const text = resp.text ?? '';
  const usage = (resp as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }).usageMetadata;
  const tokensIn = usage?.promptTokenCount ?? 0;
  const tokensOut = usage?.candidatesTokenCount ?? usage?.totalTokenCount ?? 0;

  try {
    await db.insert(aiUsage).values({
      familyId: null,
      userId: null,
      model: 'gemini-2.5-flash',
      tokensUsed: tokensIn + tokensOut,
      costUsd: String(((tokensIn / 1e6) * 0.3 + (tokensOut / 1e6) * 2.5).toFixed(6)),
      endpoint: 'summarizeCode',
    });
  } catch (err) {
    console.error('[gemini] Failed to log cost:', err);
  }

  return text;
}
