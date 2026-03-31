/**
 * questionDiscovery.ts
 * Question Discovery Layer — Step 0 in the NEXUS pipeline.
 * Selects relevant questions per brief, uses AI to find answers,
 * and produces a Q&A context that enriches department analysis.
 */

import { db } from './db';
import { sql } from 'drizzle-orm';
import { callAI } from './multiProviderAI';

export type BriefQuestion = {
  id: string;
  briefId: string;
  department: string;
  gate: string;
  role: string | null;
  question: string;
  answer: string | null;
  answerSource: string | null;
  sourceUrl: string | null;
  confidence: number;
  verified: boolean;
  position: number;
};

// ── Generate questions for a brief ──────────────────────────────────────────

export async function generateQuestionsForBrief(
  briefId: string,
  ideaPrompt: string,
  departments?: string[],
): Promise<{ generated: number; questions: BriefQuestion[] }> {
  // Load all active question templates
  const templatesRes = await db.execute(sql`
    SELECT * FROM nexus_question_templates
    WHERE is_active = true
    ORDER BY department, gate, position
  `);
  const templates: any[] = (templatesRes as any).rows ?? [];

  if (templates.length === 0) {
    return { generated: 0, questions: [] };
  }

  // Filter templates by selected departments (if specified)
  const filtered = departments?.length
    ? templates.filter((t: any) => departments.includes(t.department))
    : templates;

  // Use AI to select the most relevant questions for this specific idea
  const templateSummary = filtered.map((t: any, i: number) =>
    `${i}|${t.department}|${t.gate}|${t.question}`
  ).join('\n');

  let selectedIndices: number[] = [];
  try {
    const selectionResult = await callAI(
      'smartTitle', // Use cheap model for selection
      [{
        role: 'user',
        content: `Given this project idea: "${ideaPrompt.slice(0, 500)}"

Select the most relevant questions from this list. Return ONLY a JSON array of indices (numbers).
Select 30-60 questions that are MOST relevant to this specific idea.

Questions:
${templateSummary.slice(0, 8000)}

Return format: [0, 2, 5, 8, ...]`,
      }],
      { temperature: 0.1 },
    );
    const match = selectionResult.content.match(/\[[\d,\s]*\]/);
    if (match) {
      selectedIndices = JSON.parse(match[0]);
    }
  } catch {
    // Fallback: use all priority 0 (must-ask) questions
    selectedIndices = filtered
      .map((_: any, i: number) => i)
      .filter((i: number) => filtered[i].priority === 0);
  }

  // If AI selection failed or too few, add all must-ask questions
  if (selectedIndices.length < 20) {
    const mustAsk = filtered
      .map((_: any, i: number) => i)
      .filter((i: number) => filtered[i].priority === 0);
    selectedIndices = [...new Set([...selectedIndices, ...mustAsk])];
  }

  // Delete previous questions for this brief
  await db.execute(sql`DELETE FROM nexus_brief_questions WHERE brief_id = ${briefId}`);

  // Insert selected questions
  const questions: BriefQuestion[] = [];
  for (let pos = 0; pos < selectedIndices.length; pos++) {
    const idx = selectedIndices[pos];
    if (idx < 0 || idx >= filtered.length) continue;
    const t = filtered[idx];

    const res = await db.execute(sql`
      INSERT INTO nexus_brief_questions
        (brief_id, department, gate, role, question, answer_source, confidence, position)
      VALUES (${briefId}, ${t.department}, ${t.gate}, ${t.role ?? null},
              ${t.question}, ${t.answer_strategy}, 0, ${pos})
      RETURNING *
    `);
    const row = (res as any).rows?.[0];
    if (row) questions.push(row);
  }

  console.log(`[QuestionDiscovery] Generated ${questions.length} questions for brief ${briefId}`);
  return { generated: questions.length, questions };
}

// ── Auto-answer questions using AI ──────────────────────────────────────────

export async function autoAnswerQuestions(
  briefId: string,
  ideaPrompt: string,
  codebaseContext?: string,
): Promise<{ answered: number; total: number }> {
  // Load unanswered questions
  const qRes = await db.execute(sql`
    SELECT * FROM nexus_brief_questions
    WHERE brief_id = ${briefId} AND (answer IS NULL OR answer = '')
    ORDER BY position
  `);
  const questions: any[] = (qRes as any).rows ?? [];
  if (questions.length === 0) return { answered: 0, total: 0 };

  // Group by answer_source strategy
  const byStrategy: Record<string, any[]> = {};
  for (const q of questions) {
    const strategy = q.answer_source ?? 'ai_research';
    (byStrategy[strategy] ??= []).push(q);
  }

  let answered = 0;

  // Strategy: codebase_scan — answer from codebase context
  if (byStrategy.codebase_scan?.length && codebaseContext) {
    const codeQuestions = byStrategy.codebase_scan;
    const questionList = codeQuestions.map((q: any, i: number) => `${i + 1}. ${q.question}`).join('\n');

    try {
      const result = await callAI(
        'codeAnalysis',
        [
          { role: 'system', content: 'You are analyzing a codebase to answer questions. Answer each question based ONLY on the code context provided. If the answer is not in the code, say "לא נמצא בקוד". Answer in Hebrew. Return JSON array: [{ "index": 1, "answer": "...", "confidence": 0-100 }]' },
          { role: 'user', content: `Codebase:\n${(codebaseContext ?? '').slice(0, 6000)}\n\nQuestions:\n${questionList}` },
        ],
        { temperature: 0.1 },
      );

      const match = result.content.match(/\[[\s\S]*\]/);
      if (match) {
        const answers = JSON.parse(match[0]);
        for (const a of answers) {
          const q = codeQuestions[a.index - 1];
          if (q && a.answer && a.answer !== 'לא נמצא בקוד') {
            await db.execute(sql`
              UPDATE nexus_brief_questions
              SET answer = ${a.answer}, confidence = ${a.confidence ?? 60}, answer_source = 'codebase', updated_at = now()
              WHERE id = ${q.id}
            `);
            answered++;
          }
        }
      }
    } catch (e) {
      console.error('[QuestionDiscovery] codebase_scan failed:', e);
    }
  }

  // Strategy: ai_research — answer using Claude/Gemini general knowledge
  if (byStrategy.ai_research?.length) {
    const aiQuestions = byStrategy.ai_research;
    const questionList = aiQuestions.map((q: any, i: number) => `${i + 1}. [${q.department}] ${q.question}`).join('\n');

    try {
      const result = await callAI(
        'departmentAnalysis',
        [
          { role: 'system', content: `You are a senior consultant answering questions about a software project. The project is MEMORAID — a family care coordination platform for dementia patients, built with TypeScript/React/Node/PostgreSQL. Answer each question concisely (2-4 sentences). Answer in Hebrew. Return JSON array: [{ "index": 1, "answer": "...", "confidence": 0-100 }]` },
          { role: 'user', content: `Project idea: ${ideaPrompt.slice(0, 500)}\n\nQuestions:\n${questionList}` },
        ],
        { temperature: 0.2 },
      );

      const match = result.content.match(/\[[\s\S]*\]/);
      if (match) {
        const sanitized = match[0].replace(/"((?:[^"\\]|\\.)*)"/g,
          (_m: string, inner: string) => '"' + inner.replace(/\n/g, '\\n').replace(/\r/g, '') + '"'
        );
        const answers = JSON.parse(sanitized);
        for (const a of answers) {
          const q = aiQuestions[a.index - 1];
          if (q && a.answer) {
            await db.execute(sql`
              UPDATE nexus_brief_questions
              SET answer = ${a.answer}, confidence = ${a.confidence ?? 50}, answer_source = 'ai', updated_at = now()
              WHERE id = ${q.id}
            `);
            answered++;
          }
        }
      }
    } catch (e) {
      console.error('[QuestionDiscovery] ai_research failed:', e);
    }
  }

  // Strategy: perplexity — answer using web research
  if (byStrategy.perplexity?.length) {
    const webQuestions = byStrategy.perplexity;
    const questionList = webQuestions.map((q: any) => q.question).join('; ');

    try {
      const result = await callAI(
        'webResearch',
        [
          { role: 'user', content: `Research these questions about the project "${ideaPrompt.slice(0, 200)}":\n${questionList}\n\nAnswer each concisely in Hebrew. Return JSON array: [{ "index": 1, "answer": "...", "confidence": 0-100, "sourceUrl": "..." }]` },
        ],
        { temperature: 0.2 },
      );

      const match = result.content.match(/\[[\s\S]*\]/);
      if (match) {
        const sanitized = match[0].replace(/"((?:[^"\\]|\\.)*)"/g,
          (_m: string, inner: string) => '"' + inner.replace(/\n/g, '\\n').replace(/\r/g, '') + '"'
        );
        const answers = JSON.parse(sanitized);
        for (const a of answers) {
          const q = webQuestions[a.index - 1];
          if (q && a.answer) {
            await db.execute(sql`
              UPDATE nexus_brief_questions
              SET answer = ${a.answer}, confidence = ${a.confidence ?? 65},
                  answer_source = 'perplexity', source_url = ${a.sourceUrl ?? null}, updated_at = now()
              WHERE id = ${q.id}
            `);
            answered++;
          }
        }
      }
    } catch (e) {
      console.error('[QuestionDiscovery] perplexity failed:', e);
    }
  }

  console.log(`[QuestionDiscovery] Auto-answered ${answered}/${questions.length} questions for brief ${briefId}`);
  return { answered, total: questions.length };
}

// ── Get Q&A context for department prompts ──────────────────────────────────

export async function getQAContextForDepartment(
  briefId: string,
  department: string,
): Promise<string> {
  const res = await db.execute(sql`
    SELECT question, answer, confidence, answer_source, gate
    FROM nexus_brief_questions
    WHERE brief_id = ${briefId}
      AND department = ${department}
      AND answer IS NOT NULL AND answer != ''
    ORDER BY gate, position
  `);
  const rows: any[] = (res as any).rows ?? [];
  if (rows.length === 0) return '';

  const lines = rows.map((r: any) =>
    `**ש:** ${r.question}\n**ת:** ${r.answer} *(מקור: ${r.answer_source}, ביטחון: ${r.confidence}%)*`
  );

  return `\n---\n\n## 🔍 שאלות עומק ותשובות (${rows.length} שאלות)\n\n${lines.join('\n\n')}\n`;
}

// ── Get all Q&A for brief (for display) ──────────────────────────────────────

export async function getAllBriefQuestions(briefId: string): Promise<BriefQuestion[]> {
  const res = await db.execute(sql`
    SELECT * FROM nexus_brief_questions
    WHERE brief_id = ${briefId}
    ORDER BY gate, department, position
  `);
  return (res as any).rows ?? [];
}
