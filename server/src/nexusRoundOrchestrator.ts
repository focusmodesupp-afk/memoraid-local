/**
 * nexusRoundOrchestrator.ts
 * NEXUS V2 Meeting Mode — Multi-round research orchestrator.
 *
 * Runs 3 meeting rounds:
 *   Round 1: Senior Leadership (clevel) — strategic assessment
 *   Round 2: Team Leads (manager) — tactical breakdown
 *   Round 3: Individual Employees (senior/member/junior) — implementation details
 *
 * Each round follows its protocol (ERP/TBP/IPP) with structured Prompt Envelopes.
 * Between rounds, a synthesis step merges all findings.
 */

import type { Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import {
  nexusBriefs,
  nexusBriefRounds,
  nexusBriefRoundResults,
  nexusBriefWebSources,
} from '../../shared/schemas/schema';
import { buildPromptEnvelope, type PromptEnvelopeOpts } from './nexusPromptEnvelope';
import { fetchEmployeeWebSources, type EmployeeResearchContext } from './nexusEmployeeResearch';
import { loadNexusConfig, type NexusTeamMember } from './nexusDepartmentAgents';
import { gatherProjectData } from './projectDataGatherer';
import { callAI, type AIProviderId } from './multiProviderAI';
import { sseWrite } from './nexusBriefOrchestrator';
import type { WebSource } from './nexusWebIntelligence';

// ── Types ────────────────────────────────────────────────────────────────────

type RoundType = 'senior_leadership' | 'team_leads' | 'individual';
type LevelFilter = string[];

const ROUND_CONFIG: Record<number, { type: RoundType; levels: LevelFilter; protocol: 'ERP' | 'TBP' | 'IPP' }> = {
  1: { type: 'senior_leadership', levels: ['clevel'], protocol: 'ERP' },
  2: { type: 'team_leads', levels: ['manager'], protocol: 'TBP' },
  3: { type: 'individual', levels: ['senior', 'member', 'junior'], protocol: 'IPP' },
};

// ── Concurrency limiter ──────────────────────────────────────────────────────

async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIdx = 0;
  async function worker(): Promise<void> {
    while (nextIdx < tasks.length) {
      const idx = nextIdx++;
      try {
        results[idx] = { status: 'fulfilled', value: await tasks[idx]() };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

// ── Run a single employee agent ──────────────────────────────────────────────

async function runEmployeeAgent(opts: {
  employee: NexusTeamMember;
  briefId: string;
  roundId: string;
  ideaPrompt: string;
  codebaseContext: string;
  knownConstraints: string[];
  roundNumber: 1 | 2 | 3;
  protocol: 'ERP' | 'TBP' | 'IPP';
  previousSynthesis?: string | null;
  openQuestions?: Array<{ question: string; target?: string }>;
  contextNotes?: string | null;
  targetPlatforms?: string[] | null;
  deptKnowledge?: string;
  qaContext?: string;
  webSources?: WebSource[];
  model?: string;
  adminUserId?: string | null;
}): Promise<{
  output: string;
  outputJson: Record<string, unknown> | null;
  modelUsed: string;
  tokensUsed: number;
  costUsd: number;
  error?: string;
}> {
  const { employee, roundNumber, protocol } = opts;

  const envelope = buildPromptEnvelope({
    briefId: opts.briefId,
    ideaPrompt: opts.ideaPrompt,
    codebaseContext: opts.codebaseContext,
    knownConstraints: opts.knownConstraints,
    contextNotes: opts.contextNotes,
    targetPlatforms: opts.targetPlatforms,
    roundNumber,
    protocol,
    previousSynthesis: opts.previousSynthesis,
    openQuestions: opts.openQuestions,
    employee: {
      id: (employee as any).id,
      name: employee.name,
      roleHe: employee.roleHe,
      department: employee.department,
      level: employee.level,
      bio: employee.bio,
      skills: employee.skills,
      domainExpertise: employee.domainExpertise,
      methodology: employee.methodology,
      personality: employee.personality,
      certifications: employee.certifications,
      responsibilities: employee.responsibilities,
      education: employee.education,
      experienceYears: employee.experienceYears,
      background: employee.background,
    },
    webSources: opts.webSources,
    deptKnowledge: opts.deptKnowledge,
    qaContext: opts.qaContext,
  });

  try {
    // Auto-retry chain: try preferred model → claude → gpt-4o → gemini flash
    const FALLBACK_MODELS: AIProviderId[] = [
      'claude-sonnet-4-6' as AIProviderId,
      'gpt-4o' as AIProviderId,
      'gemini-2.5-flash' as AIProviderId,
    ];
    const preferredModels: AIProviderId[] = opts.model
      ? [opts.model as AIProviderId, ...FALLBACK_MODELS.filter(m => m !== opts.model)]
      : FALLBACK_MODELS;

    let result: any = null;
    let lastError = '';

    for (const model of preferredModels) {
      try {
        result = await callAI(
          'departmentAnalysis',
          [
            { role: 'system', content: envelope.systemPrompt },
            { role: 'user', content: envelope.userPrompt },
          ],
          {
            preferredModels: [model],
            adminUserId: opts.adminUserId ?? undefined,
            maxTokens: 3000,
          },
        );
        if (result?.content) break; // Success — stop retrying
      } catch (retryErr) {
        lastError = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.warn(`[RoundOrchestrator] ${employee.name} failed with ${model}: ${lastError.slice(0, 80)}. Trying next model...`);
        result = null;
      }
    }

    if (!result?.content) {
      return {
        output: `> Error: all models failed. Last error: ${lastError}`,
        outputJson: null,
        modelUsed: 'error',
        tokensUsed: 0,
        costUsd: 0,
        error: lastError || 'All models failed',
      };
    }

    // Try to parse JSON from response
    let outputJson: Record<string, unknown> | null = null;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        outputJson = JSON.parse(jsonMatch[0]);
      }
    } catch { /* response wasn't valid JSON, keep as text */ }

    return {
      output: result.content,
      outputJson,
      modelUsed: result.model,
      tokensUsed: result.tokensIn + result.tokensOut,
      costUsd: result.costUsd,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      output: `> Error: ${errorMsg}`,
      outputJson: null,
      modelUsed: 'error',
      tokensUsed: 0,
      costUsd: 0,
      error: errorMsg,
    };
  }
}

// ── Run a complete round ─────────────────────────────────────────────────────

export async function runMeetingRound(opts: {
  briefId: string;
  roundNumber: 1 | 2 | 3;
  models: string[];
  adminUserId?: string | null;
  sseRes: Response;
}): Promise<{ roundId: string; participantCount: number; completedCount: number; totalCost: number; totalTokens: number }> {
  const { briefId, roundNumber, models, adminUserId, sseRes } = opts;
  const config = ROUND_CONFIG[roundNumber];

  // Load brief
  const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, briefId));
  if (!brief) throw new Error('Brief not found');

  // Load team members for this round's levels
  const nexusConfig = await loadNexusConfig();
  const selectedDepts = brief.selectedDepartments ?? [];
  const participants = nexusConfig.teamMembers.filter(
    m => config.levels.includes(m.level) && selectedDepts.includes(m.department),
  );

  if (participants.length === 0) {
    throw new Error(`No participants found for round ${roundNumber} (levels: ${config.levels.join(',')})`);
  }

  // Create or reuse round record (prevent duplicates on re-run)
  const existingRounds = await db.select().from(nexusBriefRounds)
    .where(sql`brief_id = ${briefId} AND round_number = ${roundNumber}`);

  let round: typeof existingRounds[0];
  if (existingRounds.length > 0) {
    // Reuse existing round — clear old results
    round = existingRounds[0];
    await db.execute(sql`DELETE FROM nexus_brief_round_results WHERE round_id = ${round.id}`);
    await db.update(nexusBriefRounds).set({
      status: 'researching',
      participantCount: participants.length,
      completedCount: 0,
      startedAt: new Date(),
      completedAt: null,
    }).where(eq(nexusBriefRounds.id, round.id));
    console.log(`[RoundOrchestrator] Reusing existing round ${round.id.slice(0, 8)} for round ${roundNumber}`);
  } else {
    [round] = await db.insert(nexusBriefRounds).values({
      briefId,
      roundNumber,
      roundType: config.type,
      status: 'researching',
      participantCount: participants.length,
      startedAt: new Date(),
    }).returning();
  }

  sseWrite(sseRes, 'round_start', {
    roundNumber,
    roundType: config.type,
    participantCount: participants.length,
    participants: participants.map(p => ({ name: p.name, role: p.roleHe, department: p.department, level: p.level })),
  });

  // Update brief
  await db.update(nexusBriefs).set({
    currentRound: roundNumber,
    status: 'researching',
    updatedAt: new Date(),
  }).where(eq(nexusBriefs.id, briefId));

  // Gather context
  const codebaseContext = await gatherProjectData(
    (brief.codebaseDepth ?? 'deep') as 'quick' | 'deep' | 'full',
    (brief.codebaseScope ?? 'all') as 'all' | 'client' | 'server',
  );

  const knownConstraints = [
    'Hebrew RTL first',
    'Tailwind CSS only',
    'shadcn/ui components',
    'callAI() for all LLM calls',
    'pnpm package manager',
    'Drizzle ORM for DB',
  ];

  // Get previous synthesis
  let previousSynthesis: string | null = null;
  let openQuestions: Array<{ question: string; target?: string }> = [];
  if (roundNumber >= 2 && brief.round1Synthesis) {
    previousSynthesis = brief.round1Synthesis;
    // Extract open questions from synthesis
    try {
      const synth = JSON.parse(brief.round1Synthesis);
      openQuestions = (synth.open_questions_for_round2 ?? []).map((q: any) => ({
        question: typeof q === 'string' ? q : q.question,
        target: q.target_department ?? q.target,
      }));
    } catch { /* synthesis wasn't JSON */ }
  }
  if (roundNumber >= 3 && brief.round2Synthesis) {
    previousSynthesis = brief.round2Synthesis;
  }

  // Pre-fetch shared GitHub sources (same for all employees)
  let sharedGitHub: WebSource[] = [];
  try {
    const { fetchGitHubSources } = await import('./nexusWebIntelligence');
    sharedGitHub = await fetchGitHubSources(brief.ideaPrompt.split(/\s+/).slice(0, 5).join(' '));
  } catch { /* non-fatal */ }

  // Detect Hebrew and translate for search queries
  let searchPrompt = brief.ideaPrompt;
  if (/[\u0590-\u05FF]/.test(searchPrompt)) {
    try {
      const result = await callAI('general', [{
        role: 'user',
        content: `Translate to a short English search query (3-4 words only, no quotes):\n"${searchPrompt}"`,
      }], { temperature: 0, maxTokens: 50, preferredModels: ['claude-haiku-4-5-20251001' as AIProviderId] });
      const translated = result.content?.trim().replace(/[*"'`]/g, '').trim();
      if (translated && translated.length > 3) searchPrompt = translated;
    } catch { /* keep original */ }
  }

  // Run all participants in parallel with concurrency limit
  const concurrency = Number(process.env.NEXUS_ROUND_CONCURRENCY) || 5;
  let totalCost = 0;
  let totalTokens = 0;
  let completedCount = 0;

  const tasks = participants.map((employee) => async () => {
    sseWrite(sseRes, 'employee_start', {
      roundNumber,
      name: employee.name,
      role: employee.roleHe,
      department: employee.department,
      level: employee.level,
    });

    // Fetch per-employee web sources
    const empContext: EmployeeResearchContext = {
      employeeName: employee.name,
      employeeRole: employee.roleHe,
      department: employee.department,
      level: employee.level,
      skills: employee.skills,
      domainExpertise: employee.domainExpertise ?? [],
      responsibilities: employee.responsibilities,
    };
    const webSources = await fetchEmployeeWebSources(empContext, searchPrompt, sharedGitHub, roundNumber);

    // Load department knowledge
    let deptKnowledge = '';
    try {
      const rows = await db.execute(sql`
        SELECT title, content FROM nexus_dept_knowledge
        WHERE department = ${employee.department} AND is_active = true
        ORDER BY position
      `);
      deptKnowledge = (rows as any).rows?.map((r: any) => `### ${r.title}\n${r.content}`).join('\n\n') ?? '';
    } catch { /* non-fatal */ }

    // Run AI agent
    const result = await runEmployeeAgent({
      employee,
      briefId,
      roundId: round.id,
      ideaPrompt: brief.ideaPrompt,
      codebaseContext,
      knownConstraints,
      roundNumber,
      protocol: config.protocol,
      previousSynthesis,
      openQuestions,
      contextNotes: brief.contextNotes,
      targetPlatforms: brief.targetPlatforms,
      deptKnowledge,
      webSources,
      model: models[0],
      adminUserId,
    });

    // Save result to DB (upsert — delete old result for this employee in this round first)
    await db.execute(sql`DELETE FROM nexus_brief_round_results WHERE round_id = ${round.id} AND employee_name = ${employee.name}`);
    await db.insert(nexusBriefRoundResults).values({
      briefId,
      roundId: round.id,
      teamMemberId: (employee as any).id ?? null,
      department: employee.department,
      employeeName: employee.name,
      employeeRole: employee.roleHe,
      employeeLevel: employee.level,
      status: result.error ? 'error' : 'completed',
      output: result.output,
      outputJson: result.outputJson,
      modelUsed: result.modelUsed,
      tokensUsed: result.tokensUsed,
      costUsd: String(result.costUsd.toFixed(6)),
      errorMessage: result.error ?? null,
      webSourcesUsed: webSources.length,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    // Save web sources to DB
    if (webSources.length > 0) {
      try {
        await db.insert(nexusBriefWebSources).values(
          webSources.slice(0, 10).map(s => ({
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
            department: employee.department,
            teamMemberId: (employee as any).id ?? null,
            roundNumber,
          })),
        );
      } catch { /* non-fatal */ }
    }

    totalCost += result.costUsd;
    totalTokens += result.tokensUsed;
    completedCount++;

    sseWrite(sseRes, 'employee_done', {
      roundNumber,
      name: employee.name,
      role: employee.roleHe,
      department: employee.department,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      error: result.error ?? null,
      completedCount,
      totalParticipants: participants.length,
    });

    return result;
  });

  await withConcurrency(tasks, concurrency);

  // Update round record
  await db.update(nexusBriefRounds).set({
    status: 'completed',
    completedCount,
    completedAt: new Date(),
  }).where(eq(nexusBriefRounds.id, round.id));

  sseWrite(sseRes, 'round_done', {
    roundNumber,
    roundType: config.type,
    participantCount: participants.length,
    completedCount,
    totalCost,
    totalTokens,
  });

  return {
    roundId: round.id,
    participantCount: participants.length,
    completedCount,
    totalCost,
    totalTokens,
  };
}

// ── Synthesize a round ───────────────────────────────────────────────────────

export async function synthesizeRound(opts: {
  briefId: string;
  roundId: string;
  roundNumber: 1 | 2 | 3;
  adminUserId?: string | null;
}): Promise<{ synthesis: string; model: string; tokensUsed: number; costUsd: number }> {
  const { briefId, roundId, roundNumber, adminUserId } = opts;

  // Load all results for this round
  const results = await db.select().from(nexusBriefRoundResults)
    .where(eq(nexusBriefRoundResults.roundId, roundId));

  const successResults = results.filter(r => r.status === 'completed' && r.output);
  if (successResults.length === 0) throw new Error('No completed results to synthesize');

  // Load brief for context
  const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, briefId));
  if (!brief) throw new Error('Brief not found');

  // Build synthesis prompt
  const protocolName = roundNumber === 1 ? 'LSP' : 'Technical Synthesis';
  const participantOutputs = successResults.map(r =>
    `### ${r.employeeRole} (${r.department})\n${r.output?.slice(0, 2000) ?? ''}`
  ).join('\n\n---\n\n');

  const systemPrompt = roundNumber === 1
    ? `אתה מערכת סינתזה של NEXUS. תפקידך לאחד את ממצאי כל ההנהלה הבכירה למסמך אחד מובנה.
כללים:
- שמור על דעות מיעוט — אל תמחק אותן
- קונפליקטים מסומנים, לא נפתרים — האדמין מחליט
- כל סיכון מכל מנהל חייב להופיע ב-risk register
- שאלות פתוחות מועברות ל-Round 2
- consensus_score חייב לשקף את הנתונים האמיתיים`
    : `אתה מערכת סינתזה טכנית של NEXUS. תפקידך לאחד את כל האפיונים הטכניים למסמך אחד.
כללים:
- כל מערכת שהוזכרה חייבת לקבל בעלים טכני
- שינויים שוברים חייבים לכלול migration plan
- הערכות חייבות להיות טווחים, לא מספרים בודדים
- כל שאלה פתוחה מ-Round 1 חייבת להיות מטופלת או מועברת`;

  const userPrompt = `# סינתזה של Round ${roundNumber}

## הבקשה המקורית
${brief.ideaPrompt}

## ממצאי ${successResults.length} משתתפים

${participantOutputs}

---

## הנחיות
אחד את כל הממצאים למסמך אחד מובנה.
${roundNumber === 1 ? 'החזר JSON במבנה executive_synthesis.' : 'החזר JSON במבנה technical_synthesis.'}`;

  const result = await callAI('briefSummary', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], {
    maxTokens: 4000,
    adminUserId: adminUserId ?? undefined,
  });

  // Save synthesis to round
  await db.update(nexusBriefRounds).set({
    status: 'completed',
    synthesisOutput: result.content,
    synthesisModel: result.model,
    synthesisTokens: result.tokensIn + result.tokensOut,
    synthesisCostUsd: String(result.costUsd.toFixed(6)),
  }).where(eq(nexusBriefRounds.id, roundId));

  // Save synthesis to brief
  const synthField = roundNumber === 1 ? 'round1Synthesis'
    : roundNumber === 2 ? 'round2Synthesis'
    : 'round3Synthesis';
  await db.update(nexusBriefs).set({
    [synthField]: result.content,
    updatedAt: new Date(),
  }).where(eq(nexusBriefs.id, briefId));

  return {
    synthesis: result.content,
    model: result.model,
    tokensUsed: result.tokensIn + result.tokensOut,
    costUsd: result.costUsd,
  };
}
