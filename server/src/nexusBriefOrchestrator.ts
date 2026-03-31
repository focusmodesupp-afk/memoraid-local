/**
 * nexusBriefOrchestrator.ts
 * Orchestrates the full Nexus research pipeline with SSE streaming.
 * Flow: codebase → web intelligence → department agents → brief assembly
 */

import type { Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import {
  nexusBriefs,
  nexusBriefDepartments,
  nexusBriefWebSources,
} from '../../shared/schemas/schema';
import { gatherWebIntelligence, type WebSource } from './nexusWebIntelligence';
import { gatherWebIntelligenceHybrid, isN8NConfigured } from './n8nBridge';
import {
  runAllDepartmentAgents,
  getDepartmentInfo,
  type DepartmentId,
  type DepartmentResult,
} from './nexusDepartmentAgents';
import { gatherProjectData } from './projectDataGatherer';
import { callAI, type AIProviderId } from './multiProviderAI';

/**
 * Learning: save high-trust web sources discovered in this brief back to nexus_web_feeds.
 * Sources with trustScore >= 65 that don't already exist in the feeds table are added
 * as inactive (is_active=false) so admin can review and enable them.
 */
async function learnFromSources(sources: WebSource[]): Promise<void> {
  const highTrust = sources.filter(
    (s) => s.trustScore >= 65 && s.url && s.url !== 'https://www.perplexity.ai' && s.sourceType !== 'perplexity'
  );
  if (highTrust.length === 0) return;
  try {
    for (const s of highTrust) {
      await db.execute(sql`
        INSERT INTO nexus_web_feeds (source_type, url, label, category, departments, is_active)
        VALUES (
          ${s.sourceType},
          ${s.url},
          ${s.title.slice(0, 120)},
          ${(s.rawPayload?.category as string) ?? s.sourceType},
          ${s.department ? JSON.stringify([s.department]) : null}::jsonb,
          false
        )
        ON CONFLICT (url) DO NOTHING
      `);
    }
  } catch {
    // non-fatal: learning is best-effort
  }
}

async function generateSmartTitle(ideaPrompt: string): Promise<string> {
  try {
    const result = await callAI(
      'smartTitle',
      [{
        role: 'user',
        content: `צור כותרת קצרה (3-6 מילים בעברית) לתיאור הרעיון הבא לניירת מחקר פנימית של מוצר.
הכותרת צריכה להיות ספציפית ומזהה כך שמנהל מוצר יבין מייד מה הנושא.
אל תתחיל ב"ניירת" או "מחקר".
רעיון: "${ideaPrompt.slice(0, 500)}"
ענה רק בכותרת, ללא הסברים.`,
      }],
      { temperature: 0.3, adminUserId: null },
    );
    const text = result.content?.trim();
    return text && text.length > 0 && text.length < 120 ? text : ideaPrompt.slice(0, 80);
  } catch {
    return ideaPrompt.slice(0, 80);
  }
}

// ── SSE helper ─────────────────────────────────────────────────────────────────
export function sseWrite(res: Response, event: string, data: unknown): void {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
      (res as unknown as { flush: () => void }).flush();
    }
  } catch {
    // connection may have been closed
  }
}

// ── Brief assembly ─────────────────────────────────────────────────────────────
export function assembleBrief(opts: {
  ideaPrompt: string;
  models: string[];
  departments: DepartmentId[];
  departmentResults: DepartmentResult[];
  sourceCount: number;
  targetPlatforms?: string[] | null;
}): string {
  const { ideaPrompt, models, departments, departmentResults, sourceCount, targetPlatforms } = opts;
  const now = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalTokens = departmentResults.reduce((acc, r) => acc + r.tokensUsed, 0);
  const totalCost = departmentResults.reduce((acc, r) => acc + r.costUsd, 0);
  const successCount = departmentResults.filter((r) => !r.error).length;

  const lines: string[] = [
    `# ניירת Nexus – ${ideaPrompt}`,
    '',
    '---',
    '',
    '## מטא-נתונים',
    `| שדה | ערך |`,
    `|---|---|`,
    `| תאריך | ${now} |`,
    `| מודלים | ${models.join(', ') || 'ברירת מחדל'} |`,
    `| פלטפורמות יעד | ${targetPlatforms && targetPlatforms.length > 0 ? targetPlatforms.join(', ') : 'לא הוגדרו'} |`,
    `| מחלקות שחקרו | ${successCount}/${departments.length} |`,
    `| מקורות רשת | ${sourceCount} |`,
    `| סה"כ tokens | ${totalTokens.toLocaleString()} |`,
    `| עלות מוערכת | $${totalCost.toFixed(4)} |`,
    '',
    '---',
    '',
    '## תקציר מנהלים',
    '',
    `הניירת הבאה מסכמת מחקר רב-מחלקתי שנערך על-ידי Nexus Virtual Software House בנושא: **${ideaPrompt}**.`,
    `${successCount} מחלקות ביצעו מחקר עצמאי תוך שימוש ב-${sourceCount} מקורות מהרשת.`,
    '',
    '**נושאים שנחקרו:**',
    ...departments.map((d) => {
      const info = getDepartmentInfo(d);
      return `- ${info.emoji} **${info.hebrewName}**`;
    }),
    '',
    '---',
    '',
    '## ממצאי מחלקות',
    '',
  ];

  for (const result of departmentResults) {
    const info = getDepartmentInfo(result.department);
    lines.push(`## ${info.emoji} ${info.hebrewName}`);
    lines.push('');
    if (result.error) {
      lines.push(`> ⚠️ **שגיאה:** ${result.error}`);
    } else {
      lines.push(result.output);
    }
    lines.push('');
    lines.push(`*מודל: ${result.modelUsed} | tokens: ${result.tokensUsed.toLocaleString()} | עלות: $${result.costUsd.toFixed(4)}*`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push('## סיכום והמלצות לפיתוח');
  lines.push('');
  lines.push('> **הוראות לאדמין:** עיין בממצאי כל מחלקה, אשר שינויים הנדרשים, ולחץ "אשר ניירת" להמשך תהליך הפיתוח.');
  lines.push('');

  return lines.join('\n');
}

// ── Main Orchestrator ──────────────────────────────────────────────────────────
export async function runNexusOrchestrator(opts: {
  briefId: string;
  ideaPrompt: string;
  departments: DepartmentId[];
  models: string[];
  codebaseDepth: string;
  codebaseScope: string;
  adminUserId?: string | null;
  contextNotes?: string | null;
  targetPlatforms?: string[] | null;
  sseRes: Response;
}): Promise<void> {
  const {
    briefId,
    ideaPrompt,
    departments,
    models,
    codebaseDepth,
    codebaseScope,
    adminUserId,
    contextNotes,
    targetPlatforms,
    sseRes,
  } = opts;

  const startMs = Date.now();
  let totalCost = 0;
  let totalTokens = 0;

  try {
    // ── Step 1: Mark researching + clear previous results ──────────────────
    await db
      .update(nexusBriefs)
      .set({ status: 'researching', researchStartedAt: new Date(), updatedAt: new Date() })
      .where(eq(nexusBriefs.id, briefId));

    // Delete previous department results and web sources to avoid duplication
    await db.delete(nexusBriefDepartments).where(eq(nexusBriefDepartments.briefId, briefId));
    await db.delete(nexusBriefWebSources).where(eq(nexusBriefWebSources.briefId, briefId));

    sseWrite(sseRes, 'start', {
      briefId,
      departments,
      totalDepts: departments.length,
    });

    // ── Step 2: Gather codebase context ─────────────────────────────────────
    let codebaseContext = '';
    let linesScanned = 0;
    try {
      const projectData = await gatherProjectData({
        depth: codebaseDepth as 'quick' | 'deep' | 'full',
        scope: codebaseScope as 'all' | 'client' | 'server',
      });
      const isExistingProject = (contextNotes ?? '').startsWith('[EXISTING_PROJECT]');
      const existingProjectPrefix = isExistingProject
        ? `⚠️ CRITICAL CONTEXT: This is an EXISTING production codebase — NOT a greenfield project.
- Work WITHIN the existing architecture and file structure shown below
- Reference REAL file paths, function names, table names from the codebase
- Suggest modifications to existing files, not rewrites or new frameworks
- Every task must integrate with the existing code patterns

`
        : '';
      if (isExistingProject) console.log('[Nexus] Existing project mode — injecting codebase context prefix');
      codebaseContext = existingProjectPrefix + projectData;
      linesScanned = projectData.split('\n').length;
    } catch {
      codebaseContext = 'לא ניתן לקרוא את קוד הפרויקט.';
    }
    sseWrite(sseRes, 'codebase_ready', { linesScanned, depth: codebaseDepth, scope: codebaseScope });

    // ── Step 3: Web intelligence (N8N hybrid or direct) ────────────────────
    sseWrite(sseRes, 'web_intelligence_start', { query: ideaPrompt, n8n: isN8NConfigured() });
    const { result: webIntelligence, source: wiSource } = await gatherWebIntelligenceHybrid(
      briefId,
      ideaPrompt,
      departments,
      () => gatherWebIntelligence(ideaPrompt, departments),
    );
    if (wiSource === 'n8n') {
      sseWrite(sseRes, 'web_intelligence_source', { source: 'n8n' });
    }

    // Emit per-source events for real-time display
    for (const s of webIntelligence.sources) {
      sseWrite(sseRes, 'web_source_found', {
        sourceType: s.sourceType,
        title: s.title.slice(0, 80),
        trustScore: s.trustScore,
      });
    }

    // Save web sources to DB (fire and forget errors)
    if (webIntelligence.sources.length > 0) {
      try {
        await db.insert(nexusBriefWebSources).values(
          webIntelligence.sources.map((s) => ({
            briefId,
            sourceType: s.sourceType,
            url: s.url,
            title: s.title,
            snippet: s.snippet,
            trustScore: s.trustScore,
            githubStars: s.githubStars ?? null,
            redditScore: s.redditScore ?? null,
            contributorCount: s.contributorCount ?? null,
            rawPayload: s.rawPayload,
          }))
        );
      } catch {
        // non-fatal
      }
    }

    sseWrite(sseRes, 'web_intelligence_done', {
      sourceCount: webIntelligence.sources.length,
      topSources: [],
    });

    // ── Step 4: Department agents ────────────────────────────────────────────
    const departmentResults = await runAllDepartmentAgents({
      departments,
      ideaPrompt,
      webIntelligence,
      codebaseContext,
      models: models as AIProviderId[],
      adminUserId,
      contextNotes,
      targetPlatforms,
      briefId,
      onDepartmentStart: (department, hebrewName) => {
        sseWrite(sseRes, 'department_start', { department, hebrewName });
      },
      onDepartmentComplete: async (result) => {
        totalCost += result.costUsd;
        totalTokens += result.tokensUsed;

        // Save department result to DB
        try {
          await db.insert(nexusBriefDepartments).values({
            briefId,
            department: result.department,
            status: result.error ? 'error' : 'done',
            output: result.output,
            promptSnapshot: result.promptSnapshot ?? null,
            modelUsed: result.modelUsed,
            tokensUsed: result.tokensUsed,
            costUsd: String(result.costUsd.toFixed(6)),
            errorMessage: result.error ?? result.fallbackReason ?? null,
            startedAt: new Date(),
            completedAt: new Date(),
          });
        } catch {
          // non-fatal
        }

        if (result.error) {
          sseWrite(sseRes, 'department_error', {
            department: result.department,
            error: result.error,
          });
        } else {
          sseWrite(sseRes, 'department_done', {
            department: result.department,
            tokensUsed: result.tokensUsed,
            costUsd: result.costUsd,
            outputPreview: result.output.slice(0, 200),
            modelUsed: result.modelUsed,
            fallbackReason: result.fallbackReason ?? null,
          });
        }
      },
    });

    // ── Step 5: Assemble brief ───────────────────────────────────────────────
    sseWrite(sseRes, 'assembly_start', {});

    const assembledBrief = assembleBrief({
      ideaPrompt,
      models,
      departments,
      departmentResults,
      sourceCount: webIntelligence.sources.length,
      targetPlatforms,
    });

    // Generate a concise smart title using AI
    const smartTitle = await generateSmartTitle(ideaPrompt);

    await db
      .update(nexusBriefs)
      .set({
        status: 'review',
        title: smartTitle,
        assembledBrief,
        researchCompletedAt: new Date(),
        totalCostUsd: String(totalCost.toFixed(6)),
        totalTokensUsed: totalTokens,
        updatedAt: new Date(),
      })
      .where(eq(nexusBriefs.id, briefId));

    sseWrite(sseRes, 'assembly_done', {
      briefId,
      assembledLength: assembledBrief.length,
    });

    // ── Step 6: Learn from high-trust sources (background, non-blocking) ────
    void learnFromSources(webIntelligence.sources);

    // ── Step 7: Done ─────────────────────────────────────────────────────────
    sseWrite(sseRes, 'done', {
      totalCostUsd: totalCost,
      totalTokens,
      durationMs: Date.now() - startMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[NexusOrchestrator] Fatal error:', message);

    // Reset brief to draft so admin can retry
    try {
      await db
        .update(nexusBriefs)
        .set({ status: 'draft', updatedAt: new Date() })
        .where(eq(nexusBriefs.id, briefId));
    } catch {
      // ignore
    }

    sseWrite(sseRes, 'error', { message, retryable: true });
  }
}
