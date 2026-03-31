import { db } from './db';
import { sql } from 'drizzle-orm';
import { callAI } from './multiProviderAI';

export type ExtractedTask = {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimateHours: number;
  category: string;
  skillTags: string[];
  sourceDepartment: string;
  contextJson?: {
    webSourceIds?: string[];
    departmentId?: string;
    docReferences?: Array<{ docType: string; sectionHint?: string }>;
  };
};

const EXTRACT_SYSTEM_PROMPT = `You are a senior engineering manager. Extract concrete, implementation-ready development tasks from a research brief and specification documents.

CRITICAL: Write ALL task titles and descriptions in HEBREW (עברית). Do NOT use English for titles or descriptions.
skillTags and category values stay in English (they are technical identifiers).

Rules:
- Extract 40-80 actionable tasks — be VERY thorough. A real project needs MANY tasks. Cover ALL departments in the brief
- Each task must be actionable and specific (not vague)
- Estimate hours realistically (1-40h per task, split if larger)
- Priority: urgent=critical blocker, high=sprint goal, medium=important, low=nice-to-have
- Categories (English): feature, bug, refactor, infrastructure, design, documentation, security, research
- skillTags (English): pick from [react, nodejs, postgresql, ai-integration, security-review, legal-review, design-system, devops, api-design, mobile, testing]
- sourceDepartment: which department's analysis this task comes from (use English dept name: ceo, cto, cpo, product, rnd, design, security, legal, marketing, finance)
- Cover tasks from ALL sections: Product, R&D, Design, CTO, CEO, Marketing, Legal, Security, Finance
- Do NOT skip legal, security, marketing or finance tasks

CRITICAL — DESCRIPTION FORMAT:
Each description MUST be a complete developer brief in Markdown. A developer (Claude Code AI) must be able to implement the task FROM THE DESCRIPTION ALONE, without reading any other document.
Use this exact structure:

## מה לעשות
[3-6 שורות המסבירות בדיוק מה ליישם ולמה]

## קבצים לגעת
- \`server/src/xxx.ts\` — [מה לשנות/להוסיף]
- \`client/src/xxx.tsx\` — [מה לשנות/להוסיף]
(use REAL file paths from the Blueprint/Architecture if available, otherwise infer from project structure)

## API
[HTTP method + path if needed]
Body: { ... }
Response: { ... }
(omit section if no API change)

## DB
טבלה: xxx | שדות: id UUID, name TEXT, ...
(omit section if no DB change, use ERD if available)

## Acceptance Criteria
- [ ] [קריטריון ספציפי שניתן לבדוק]
- [ ] [קריטריון נוסף]

## מקורות
- [GitHub repo / Reddit thread / blog post / YouTube video relevant to this task]
(include URLs from the web sources list if they are directly relevant to this task's implementation)
(omit if no relevant sources)

## תלויות
- מצריך: [שם משימה אחרת] (אם יש)
(omit if no dependencies)

Pull REAL file paths, table names, API endpoints, and field names from the Blueprint, ERD, and PRD documents. Be specific and concrete. Do NOT write generic placeholders.

CRITICAL JSON RULES:
- Respond with ONLY a valid JSON array. No markdown fences. No text before or after.
- In the "description" field, use \\n (two chars: backslash + n) for line breaks — NEVER use actual newlines inside JSON string values.
- All special chars in JSON strings must be escaped: \\n for newline, \\" for quote, \\\\ for backslash.

[
  {
    "title": "כותרת המשימה בעברית",
    "description": "## מה לעשות\\nתיאור מפורט...\\n\\n## קבצים לגעת\\n- server/src/xxx.ts — הוסף endpoint\\n\\n## Acceptance Criteria\\n- [ ] קריטריון 1",
    "priority": "high",
    "estimateHours": 8,
    "category": "feature",
    "skillTags": ["react", "nodejs"],
    "sourceDepartment": "product"
  }
]`;

export async function extractTasksFromBrief(
  briefId: string,
  assembledBrief: string,
  ideaPrompt: string,
): Promise<ExtractedTask[]> {
  // Load generated specification docs if they exist (PRD, ERD, Blueprint, etc.)
  let docsContext = '';
  try {
    const docsRes = await db.execute(sql`
      SELECT doc_type, title, content FROM nexus_generated_docs
      WHERE brief_id = ${briefId}
      ORDER BY created_at
    `);
    const docs: any[] = (docsRes as any).rows ?? [];
    if (docs.length > 0) {
      const docParts = docs.map((d: any) =>
        `### ${d.title || d.doc_type}\n${(d.content ?? '').slice(0, 3500)}`
      );
      docsContext = '\n\n---\n\n## מסמכי מפרט שנוצרו:\n\n' + docParts.join('\n\n---\n\n');
      console.log(`[TaskExtractor] Found ${docs.length} generated docs for brief ${briefId}`);
    }
  } catch (e) {
    console.error('[TaskExtractor] Failed to load generated docs:', e);
  }

  // Load web sources for context (top 30 by trust score)
  let webSourcesContext = '';
  let webSourceRows: any[] = [];
  try {
    const wsRes = await db.execute(sql`
      SELECT id, source_type, url, title, trust_score, snippet
      FROM nexus_brief_web_sources
      WHERE brief_id = ${briefId}
      ORDER BY trust_score DESC NULLS LAST
      LIMIT 30
    `);
    webSourceRows = (wsRes as any).rows ?? [];
    if (webSourceRows.length > 0) {
      const lines = webSourceRows.map((s: any) =>
        `- [${s.source_type}] ${s.title || 'Untitled'} (trust: ${s.trust_score ?? 0}) ${s.url || ''}`
      );
      webSourcesContext = '\n\n---\n\n## מקורות מחקר רשת:\n\n' + lines.join('\n');
    }
  } catch (e) {
    console.error('[TaskExtractor] Failed to load web sources:', e);
  }

  // Load department IDs for context linking
  let deptRows: any[] = [];
  try {
    const deptRes = await db.execute(sql`
      SELECT id, department FROM nexus_brief_departments
      WHERE brief_id = ${briefId} AND status = 'completed'
    `);
    deptRows = (deptRes as any).rows ?? [];
  } catch (e) {
    console.error('[TaskExtractor] Failed to load departments:', e);
  }

  const briefSlice = assembledBrief.slice(0, docsContext.length > 2000 ? 22000 : 32000);
  const prompt = `Idea: ${ideaPrompt}

Research Brief:
${briefSlice}${docsContext.slice(0, 13000)}${webSourcesContext.slice(0, 3000)}

Extract actionable development tasks from this brief, specification documents, and web sources above.
When a task relates to a specific web source (GitHub repo, Reddit thread, blog post), include the URL in the task description under the ## מקורות section.`;

  const result = await callAI(
    'taskExtraction',
    [
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    { adminUserId: null }
  );

  let tasks: ExtractedTask[] = [];
  try {
    const text = result.content ?? '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      // Sanitize: replace literal newlines inside JSON string values with \\n
      const sanitized = jsonMatch[0].replace(
        /"((?:[^"\\]|\\.)*)"/g,
        (_match, inner) => '"' + inner.replace(/\n/g, '\\n').replace(/\r/g, '') + '"'
      );
      tasks = JSON.parse(sanitized);
    }
  } catch (e) {
    // First parse failed — try more aggressive sanitization
    console.warn('[TaskExtractor] First JSON parse failed, trying aggressive sanitization');
    try {
      const text = result.content ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        let raw = jsonMatch[0];
        // Remove control chars except \n \r \t
        raw = raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
        // Fix unescaped newlines in strings
        raw = raw.replace(/"((?:[^"\\]|\\.)*)"/g, (_m, inner) =>
          '"' + inner.replace(/\n/g, '\\n').replace(/\r/g, '').replace(/\t/g, '\\t') + '"'
        );
        // Fix trailing commas before ] or }
        raw = raw.replace(/,\s*([\]}])/g, '$1');
        tasks = JSON.parse(raw);
      }
    } catch (e2) {
      // Last resort: try to extract individual task objects
      console.warn('[TaskExtractor] Aggressive parse failed, trying object-by-object extraction');
      try {
        const text = result.content ?? '';
        const objectMatches = text.match(/\{[^{}]*"title"\s*:\s*"[^"]+[^{}]*\}/g) ?? [];
        for (const objStr of objectMatches) {
          try {
            const sanitized = objStr.replace(
              /"((?:[^"\\]|\\.)*)"/g,
              (_m, inner) => '"' + inner.replace(/\n/g, '\\n').replace(/\r/g, '') + '"'
            );
            const obj = JSON.parse(sanitized);
            if (obj.title && obj.description) tasks.push(obj);
          } catch { /* skip malformed object */ }
        }
        console.log(`[TaskExtractor] Object-by-object extraction recovered ${tasks.length} tasks`);
      } catch {
        console.error('[TaskExtractor] All JSON parse attempts failed');
        tasks = [];
      }
    }
  }

  const filtered = tasks.filter(
    (t) => t && typeof t.title === 'string' && t.title.length > 3,
  );

  // Post-process: build contextJson for each task by matching web sources and departments
  const deptMap = new Map(deptRows.map((d: any) => [d.department, d.id]));
  const docTypes = (docsContext.match(/### (\S+)/g) ?? []).map((m: string) => m.replace('### ', ''));

  for (const task of filtered) {
    const taskText = `${task.title} ${task.description}`.toLowerCase();

    // Match web sources by keyword overlap
    const matchedSourceIds = webSourceRows
      .filter((s: any) => {
        const sourceText = `${s.title || ''} ${s.url || ''}`.toLowerCase();
        const keywords = sourceText.split(/[\s\-_\/\.]+/).filter((w: string) => w.length > 3);
        return keywords.some((kw: string) => taskText.includes(kw));
      })
      .map((s: any) => s.id as string);

    // Match department
    const deptId = task.sourceDepartment ? deptMap.get(task.sourceDepartment) : undefined;

    task.contextJson = {
      webSourceIds: matchedSourceIds.length > 0 ? matchedSourceIds : undefined,
      departmentId: deptId ?? undefined,
      docReferences: docTypes.length > 0
        ? docTypes.map((dt: string) => ({ docType: dt }))
        : undefined,
    };
  }

  return filtered;
}

export async function saveExtractedTasks(
  briefId: string,
  tasks: ExtractedTask[],
): Promise<{ id: string; title: string }[]> {
  // Delete previous extractions for this brief
  await db.execute(sql`DELETE FROM nexus_extracted_tasks WHERE brief_id = ${briefId}`);

  if (tasks.length === 0) return [];

  const rows: { id: string; title: string }[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    // Convert JS array to PostgreSQL array literal string, then cast with ::text[]
    const skillTagsStr = '{' + (t.skillTags ?? []).join(',') + '}';
    const contextJsonStr = t.contextJson ? JSON.stringify(t.contextJson) : null;
    const res = await db.execute(sql`
      INSERT INTO nexus_extracted_tasks
        (brief_id, title, description, priority, estimate_hours, category, skill_tags, source_department, position, context_json)
      VALUES (
        ${briefId},
        ${t.title},
        ${t.description ?? ''},
        ${t.priority ?? 'medium'},
        ${t.estimateHours ?? 4},
        ${t.category ?? 'feature'},
        ${skillTagsStr}::text[],
        ${t.sourceDepartment ?? 'product'},
        ${i},
        ${contextJsonStr}::jsonb
      )
      RETURNING id, title
    `);
    const row = (res as any).rows?.[0] ?? (res as any)[0];
    if (row) rows.push(row);
  }
  return rows;
}

export async function createSprintFromBrief(opts: {
  briefId: string;
  briefTitle: string;
  sprintName: string;
  sprintGoal: string;
  phaseId?: string | null;
  taskIds: string[];
}): Promise<{ sprintId: string; tasksCreated: number }> {
  const { briefId, briefTitle, sprintName, sprintGoal, phaseId, taskIds } = opts;

  // Get accepted extracted tasks
  const taskIdsLiteral = '{' + taskIds.join(',') + '}';
  const extractRes = await db.execute(sql`
    SELECT * FROM nexus_extracted_tasks
    WHERE brief_id = ${briefId}
      AND id = ANY(${taskIdsLiteral}::uuid[])
      AND accepted = true
    ORDER BY position
  `);
  const extractedRows: any[] = (extractRes as any).rows ?? [];

  if (extractedRows.length === 0) {
    throw new Error('No accepted tasks found for sprint creation');
  }

  // Load NEXUS context data for enrichment (with catch guards for missing tables)
  const [webSourcesRes, deptOutputsRes, genDocsRes] = await Promise.all([
    db.execute(sql`SELECT id, source_type, url, title, trust_score FROM nexus_brief_web_sources WHERE brief_id = ${briefId} ORDER BY trust_score DESC NULLS LAST`).catch(() => ({ rows: [] })),
    db.execute(sql`SELECT id, department, output FROM nexus_brief_departments WHERE brief_id = ${briefId} AND status IN ('done', 'completed')`).catch(() => ({ rows: [] })),
    db.execute(sql`SELECT doc_type, title FROM nexus_generated_docs WHERE brief_id = ${briefId} ORDER BY created_at`).catch(() => ({ rows: [] })),
  ]);
  const webSourceMap = new Map(((webSourcesRes as any).rows ?? []).map((s: any) => [s.id, s]));
  const deptOutputMap = new Map(((deptOutputsRes as any).rows ?? []).map((d: any) => [d.department, d]));
  const docRefs: Array<{ docType: string; title: string }> = ((genDocsRes as any).rows ?? []).map((d: any) => ({ docType: d.doc_type, title: d.title }));

  // Create sprint
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks

  const sprintRes = await db.execute(sql`
    INSERT INTO sprints (name, goal, status, start_date, end_date, phase_id)
    VALUES (${sprintName}, ${sprintGoal}, 'planning',
            ${startDate.toISOString().split('T')[0]},
            ${endDate.toISOString().split('T')[0]},
            ${phaseId ?? null})
    RETURNING id
  `);
  const sprint = (sprintRes as any).rows?.[0] ?? (sprintRes as any)[0];
  const sprintId = sprint?.id;

  // Get or create Backlog column
  const colRes = await db.execute(sql`SELECT id FROM dev_columns WHERE name ILIKE 'backlog' LIMIT 1`);
  let backlogCol = (colRes as any).rows?.[0] ?? (colRes as any)[0];
  if (!backlogCol) {
    const newColRes = await db.execute(sql`
      INSERT INTO dev_columns (name, position, color)
      VALUES ('Backlog', 0, '#64748b')
      RETURNING id
    `);
    backlogCol = (newColRes as any).rows?.[0] ?? (newColRes as any)[0];
  }
  const columnId = backlogCol?.id;

  // Create dev_tasks and link to sprint
  let tasksCreated = 0;
  for (const et of extractedRows) {
    // Convert skill_tags (JS array from DB) to PostgreSQL array literal
    const rawTags = et.skill_tags;
    const tagsArr: string[] = Array.isArray(rawTags)
      ? rawTags
      : typeof rawTags === 'string' && rawTags.startsWith('{')
        ? rawTags.slice(1, -1).split(',').filter(Boolean)
        : [];
    const labelsStr = '{' + tagsArr.join(',') + '}';

    // Build nexus_context JSONB for the dev_task
    const contextData = et.context_json ?? {};
    const resolvedWebSources = (contextData.webSourceIds ?? [])
      .map((wsId: string) => webSourceMap.get(wsId))
      .filter(Boolean)
      .map((s: any) => ({ id: s.id, sourceType: s.source_type, url: s.url, title: s.title, trustScore: s.trust_score }));
    const deptInfo = deptOutputMap.get(et.source_department);
    const nexusCtx = {
      briefId,
      briefTitle,
      sourceDepartment: et.source_department ?? null,
      webSources: resolvedWebSources.length > 0 ? resolvedWebSources : undefined,
      departmentExcerpt: deptInfo?.output ? (deptInfo.output as string).slice(0, 500) : undefined,
      docReferences: docRefs.length > 0 ? docRefs : undefined,
    };
    const nexusCtxStr = JSON.stringify(nexusCtx);

    const devTaskRes = await db.execute(sql`
      INSERT INTO dev_tasks
        (title, description, priority, column_id, category, estimate_hours, labels, ai_generated, nexus_context)
      VALUES (
        ${et.title},
        ${et.description ?? ''},
        ${et.priority ?? 'medium'},
        ${columnId},
        ${et.category ?? 'feature'},
        ${et.estimate_hours ?? 4},
        ${labelsStr}::text[],
        true,
        ${nexusCtxStr}::jsonb
      )
      RETURNING id
    `);
    const devTask = (devTaskRes as any).rows?.[0] ?? (devTaskRes as any)[0];
    if (devTask?.id) {
      await db.execute(sql`
        INSERT INTO sprint_tasks (sprint_id, task_id) VALUES (${sprintId}, ${devTask.id})
        ON CONFLICT DO NOTHING
      `);
      // Update extracted task with dev_task_id
      await db.execute(sql`
        UPDATE nexus_extracted_tasks
        SET dev_task_id = ${devTask.id}, sprint_id = ${sprintId}
        WHERE id = ${et.id}
      `);
      tasksCreated++;
    }
  }

  // Update brief
  await db.execute(sql`
    UPDATE nexus_briefs
    SET generated_sprint_id = ${sprintId}, phase_id = ${phaseId ?? null}, status = 'in_progress', updated_at = now()
    WHERE id = ${briefId}
  `);

  return { sprintId, tasksCreated };
}

// ── Smart multi-sprint creation ──────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export async function createSprintsFromBrief(opts: {
  briefId: string;
  briefTitle: string;
  phaseId?: string | null;
  taskIds: string[];
  tasksPerSprint?: number;
}): Promise<{ sprints: Array<{ sprintId: string; name: string; taskCount: number; totalHours: number; sprintOrder: number }>; totalTasks: number }> {
  const { briefId, briefTitle, phaseId, taskIds, tasksPerSprint = 10 } = opts;

  // Load accepted tasks
  const taskIdsLiteral = '{' + taskIds.join(',') + '}';
  const extractRes = await db.execute(sql`
    SELECT * FROM nexus_extracted_tasks
    WHERE brief_id = ${briefId}
      AND id = ANY(${taskIdsLiteral}::uuid[])
      AND accepted = true
    ORDER BY position
  `);
  const allTasks: any[] = (extractRes as any).rows ?? [];
  if (allTasks.length === 0) throw new Error('No accepted tasks found');

  // Sort by priority
  allTasks.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));

  // Split into sprint chunks
  const sprintChunks: any[][] = [];
  for (let i = 0; i < allTasks.length; i += tasksPerSprint) {
    sprintChunks.push(allTasks.slice(i, i + tasksPerSprint));
  }

  // Load NEXUS context
  const [webSourcesRes, deptOutputsRes, genDocsRes] = await Promise.all([
    db.execute(sql`SELECT id, source_type, url, title, trust_score FROM nexus_brief_web_sources WHERE brief_id = ${briefId} ORDER BY trust_score DESC NULLS LAST`).catch(() => ({ rows: [] })),
    db.execute(sql`SELECT id, department, output FROM nexus_brief_departments WHERE brief_id = ${briefId} AND status IN ('done', 'completed')`).catch(() => ({ rows: [] })),
    db.execute(sql`SELECT doc_type, title FROM nexus_generated_docs WHERE brief_id = ${briefId} ORDER BY created_at`).catch(() => ({ rows: [] })),
  ]);
  const webSourceMap = new Map(((webSourcesRes as any).rows ?? []).map((s: any) => [s.id, s]));
  const deptOutputMap = new Map(((deptOutputsRes as any).rows ?? []).map((d: any) => [d.department, d]));
  const docRefs = ((genDocsRes as any).rows ?? []).map((d: any) => ({ docType: d.doc_type, title: d.title }));

  // Get or create Backlog column
  const colRes = await db.execute(sql`SELECT id FROM dev_columns WHERE name ILIKE 'backlog' LIMIT 1`);
  let backlogCol = (colRes as any).rows?.[0];
  if (!backlogCol) {
    const newColRes = await db.execute(sql`INSERT INTO dev_columns (name, position, color) VALUES ('Backlog', 0, '#64748b') RETURNING id`);
    backlogCol = (newColRes as any).rows?.[0];
  }
  const columnId = backlogCol?.id;

  const results: Array<{ sprintId: string; name: string; taskCount: number; totalHours: number; sprintOrder: number }> = [];
  let firstSprintId: string | null = null;

  for (let si = 0; si < sprintChunks.length; si++) {
    const chunk = sprintChunks[si];
    const sprintOrder = si + 1;
    const priorities = [...new Set(chunk.map((t: any) => t.priority))];
    const sprintName = `${briefTitle} — Sprint ${sprintOrder}`;
    const totalHours = chunk.reduce((sum: number, t: any) => sum + (t.estimate_hours ?? 4), 0);
    const workDays = Math.ceil(totalHours / 6);
    const durationDays = Math.max(14, Math.ceil(workDays / 5) * 7); // At least 2 weeks

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (si * 14)); // Each sprint starts 2 weeks after previous
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const sprintGoal = `Sprint ${sprintOrder}: ${priorities.join(', ')} priority — ${chunk.length} tasks, ~${totalHours}h estimated`;

    const sprintRes = await db.execute(sql`
      INSERT INTO sprints (name, goal, status, start_date, end_date, phase_id, sprint_order, brief_id)
      VALUES (${sprintName}, ${sprintGoal}, 'planning',
              ${startDate.toISOString().split('T')[0]},
              ${endDate.toISOString().split('T')[0]},
              ${phaseId ?? null}, ${sprintOrder}, ${briefId})
      RETURNING id
    `);
    const sprintId = (sprintRes as any).rows?.[0]?.id;
    if (!firstSprintId) firstSprintId = sprintId;

    // Create dev_tasks for this sprint
    let taskOrder = 0;
    for (const et of chunk) {
      taskOrder++;
      const tagsArr = Array.isArray(et.skill_tags) ? et.skill_tags
        : typeof et.skill_tags === 'string' && et.skill_tags.startsWith('{')
          ? et.skill_tags.slice(1, -1).split(',').filter(Boolean) : [];
      const labelsStr = '{' + tagsArr.join(',') + '}';

      // Build nexus context
      const contextData = et.context_json ?? {};
      const resolvedWebSources = (contextData.webSourceIds ?? [])
        .map((wsId: string) => webSourceMap.get(wsId)).filter(Boolean)
        .map((s: any) => ({ id: s.id, sourceType: s.source_type, url: s.url, title: s.title, trustScore: s.trust_score }));
      const deptInfo = deptOutputMap.get(et.source_department);
      const nexusCtx = JSON.stringify({
        briefId, briefTitle, sourceDepartment: et.source_department ?? null,
        webSources: resolvedWebSources.length > 0 ? resolvedWebSources : undefined,
        departmentExcerpt: deptInfo?.output ? (deptInfo.output as string).slice(0, 500) : undefined,
        docReferences: docRefs.length > 0 ? docRefs : undefined,
      });

      const devTaskRes = await db.execute(sql`
        INSERT INTO dev_tasks (title, description, priority, column_id, category, estimate_hours, labels, ai_generated, nexus_context)
        VALUES (${et.title}, ${et.description ?? ''}, ${et.priority ?? 'medium'}, ${columnId},
                ${et.category ?? 'feature'}, ${et.estimate_hours ?? 4}, ${labelsStr}::text[], true, ${nexusCtx}::jsonb)
        RETURNING id
      `);
      const devTaskId = (devTaskRes as any).rows?.[0]?.id;
      if (devTaskId) {
        await db.execute(sql`
          INSERT INTO sprint_tasks (sprint_id, task_id, task_order) VALUES (${sprintId}, ${devTaskId}, ${taskOrder})
          ON CONFLICT DO NOTHING
        `);
        await db.execute(sql`
          UPDATE nexus_extracted_tasks SET dev_task_id = ${devTaskId}, sprint_id = ${sprintId} WHERE id = ${et.id}
        `);
      }
    }

    results.push({ sprintId, name: sprintName, taskCount: chunk.length, totalHours, sprintOrder });
  }

  // Update brief
  await db.execute(sql`
    UPDATE nexus_briefs
    SET generated_sprint_id = ${firstSprintId}, phase_id = ${phaseId ?? null}, status = 'in_progress', updated_at = now()
    WHERE id = ${briefId}
  `);

  return { sprints: results, totalTasks: allTasks.length };
}
