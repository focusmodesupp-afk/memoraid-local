/**
 * nexusIdeaExtractor.ts
 * Extracts structured ideas from NEXUS brief department outputs.
 * Ideas are saved to nexus_ideas table for the Idea Bank.
 */

import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import { nexusIdeas, nexusBriefs, nexusBriefDepartments } from '../../shared/schemas/schema';
import { callAI } from './multiProviderAI';

export type ExtractedIdea = {
  title: string;
  description: string;
  category: string;
  priority: string;
  estimatedHours?: number;
  affectedEnvironment?: string;
  affectedFiles?: string[];
  sourceDepartment: string;
  tags?: string[];
  businessValue?: string;
};

/**
 * Extract ideas from a brief's department outputs using AI.
 */
export async function extractIdeasFromBrief(
  briefId: string,
  adminUserId?: string | null,
): Promise<{ ideas: ExtractedIdea[]; saved: number }> {
  // Load brief + department outputs
  const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, briefId));
  if (!brief) throw new Error('Brief not found');

  const depts = await db.select().from(nexusBriefDepartments)
    .where(eq(nexusBriefDepartments.briefId, briefId));

  const successDepts = depts.filter(d => d.status === 'completed' && d.output);
  if (successDepts.length === 0) throw new Error('No completed department outputs');

  // Build department summaries
  const deptSummaries = successDepts
    .map(d => `### ${d.department}\n${d.output?.slice(0, 1500) ?? ''}`)
    .join('\n\n---\n\n');

  // AI extraction
  const result = await callAI('taskExtraction', [
    {
      role: 'system',
      content: `אתה מומחה חילוץ רעיונות מתוך ניירות מחקר.
תפקידך לזהות רעיונות מוצריים, שיפורים, ופיצ'רים שהוצעו על ידי מחלקות שונות.

כללים:
- כל רעיון חייב להיות ייחודי — אל תכפיל
- כל רעיון חייב לכלול: כותרת, תיאור, קטגוריה, עדיפות, שעות משוערות
- סדר לפי עדיפות (critical → high → medium → low → future)
- מקסימום 15 רעיונות
- עדיפות נקבעת לפי: דחיפות × השפעה × היתכנות
- החזר JSON בלבד`,
    },
    {
      role: 'user',
      content: `חלץ רעיונות מוצריים מתוך ממצאי ${successDepts.length} מחלקות לנושא: "${brief.ideaPrompt}"

${deptSummaries.slice(0, 12000)}

---

החזר JSON array:
[{
  "title": "כותרת קצרה בעברית",
  "description": "תיאור מפורט — מה הרעיון, למי הוא מיועד, מה הערך העסקי",
  "category": "feature|improvement|research|infrastructure|ux|security",
  "priority": "critical|high|medium|low|future",
  "estimatedHours": 8-80,
  "affectedEnvironment": "user-frontend|admin-frontend|server|fullstack",
  "affectedFiles": ["client/src/pages/...", "server/src/..."],
  "sourceDepartment": "ceo|cto|design|...",
  "tags": ["healthcare", "ux", "ai", ...],
  "businessValue": "משפט אחד על הערך העסקי"
}]`,
    },
  ], { maxTokens: 4000, adminUserId: adminUserId ?? undefined });

  // Parse ideas
  let ideas: ExtractedIdea[] = [];
  try {
    const jsonMatch = result.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      ideas = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.warn('[IdeaExtractor] Failed to parse AI response as JSON');
  }

  if (ideas.length === 0) return { ideas: [], saved: 0 };

  // Save to DB
  let saved = 0;
  for (const idea of ideas) {
    try {
      await db.insert(nexusIdeas).values({
        title: idea.title?.slice(0, 500) ?? 'רעיון ללא כותרת',
        description: idea.description ?? '',
        category: idea.category ?? 'feature',
        sourceType: 'brief',
        sourceBriefId: briefId,
        sourceDepartment: idea.sourceDepartment ?? null,
        priority: idea.priority ?? 'medium',
        estimatedHours: idea.estimatedHours ?? null,
        affectedEnvironment: idea.affectedEnvironment ?? null,
        affectedFiles: idea.affectedFiles ?? [],
        tags: idea.tags ?? [],
        briefIdCreatedFrom: briefId,
        createdBy: adminUserId ?? null,
        status: 'new',
        score: idea.priority === 'critical' ? 10 : idea.priority === 'high' ? 5 : 0,
      });
      saved++;
    } catch (err) {
      console.warn('[IdeaExtractor] Failed to save idea:', idea.title, err);
    }
  }

  console.log(`[IdeaExtractor] Extracted ${ideas.length} ideas, saved ${saved} for brief ${briefId}`);
  return { ideas, saved };
}

/**
 * Extract ideas from a single employee's research output (Meeting Mode).
 */
export async function extractIdeasFromEmployeeOutput(
  briefId: string,
  employeeName: string,
  department: string,
  roundNumber: number,
  output: string,
  adminUserId?: string | null,
): Promise<number> {
  if (!output || output.length < 100) return 0;

  try {
    const result = await callAI('general', [
      {
        role: 'user',
        content: `מתוך הטקסט הבא של ${employeeName} (${department}), חלץ רעיונות מוצריים אם יש.
החזר JSON array (ריק אם אין רעיונות): [{"title":"...","description":"...","category":"feature","priority":"medium","businessValue":"..."}]

טקסט:
${output.slice(0, 3000)}`,
      },
    ], { maxTokens: 1000, preferredModels: ['claude-haiku-4-5-20251001' as any] });

    let ideas: any[] = [];
    try {
      const m = result.content.match(/\[[\s\S]*\]/);
      if (m) ideas = JSON.parse(m[0]);
    } catch { return 0; }

    let saved = 0;
    for (const idea of ideas.slice(0, 5)) {
      try {
        await db.insert(nexusIdeas).values({
          title: idea.title?.slice(0, 500) ?? '',
          description: idea.description ?? '',
          category: idea.category ?? 'feature',
          sourceType: 'employee',
          sourceBriefId: briefId,
          sourceDepartment: department,
          sourceEmployeeName: employeeName,
          sourceRound: roundNumber,
          priority: idea.priority ?? 'medium',
          tags: idea.tags ?? [],
          briefIdCreatedFrom: briefId,
          createdBy: adminUserId ?? null,
          status: 'new',
        });
        saved++;
      } catch { /* non-fatal */ }
    }
    return saved;
  } catch {
    return 0;
  }
}
