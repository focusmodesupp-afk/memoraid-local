/**
 * Entity factories for NEXUS integration tests.
 *
 * Each factory inserts a row into the real test DB and returns the created entity.
 * All factories use sensible defaults with overrides for test-specific data.
 */

import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

type DB = NodePgDatabase<any>;

// ── Admin User ──────────────────────────────────────────────────────────────

export type TestAdmin = {
  id: string;
  email: string;
  role: string;
};

export async function createTestAdmin(
  db: DB,
  overrides: Partial<{ email: string; fullName: string; role: string }> = {}
): Promise<TestAdmin> {
  const email = overrides.email ?? `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const fullName = overrides.fullName ?? 'Test Admin';
  const role = overrides.role ?? 'super_admin';

  const result = await db.execute(
    sql`INSERT INTO admin_users (email, full_name, role, password_hash, created_at)
        VALUES (${email}, ${fullName}, ${role}, 'test-hash', NOW())
        RETURNING id, email, role`
  );
  const row = (result as any).rows[0];
  return { id: row.id, email: row.email, role: row.role };
}

// ── Brief ───────────────────────────────────────────────────────────────────

export type TestBrief = {
  id: string;
  title: string;
  briefState: string;
  status: string;
};

export async function createTestBrief(
  db: DB,
  adminId: string,
  overrides: Partial<{
    title: string;
    ideaPrompt: string;
    briefState: string;
    status: string;
    selectedDepartments: string[];
    assembledBrief: string | null;
    currentRound: number;
  }> = {}
): Promise<TestBrief> {
  const title = overrides.title ?? 'Test Brief';
  const ideaPrompt = overrides.ideaPrompt ?? 'A test idea for integration tests';
  const briefState = overrides.briefState ?? 'draft';
  const status = overrides.status ?? 'draft';
  const depts = overrides.selectedDepartments ?? ['ceo', 'cto'];
  const assembled = overrides.assembledBrief ?? null;
  const currentRound = overrides.currentRound ?? 0;

  const result = await db.execute(
    sql`INSERT INTO nexus_briefs (
          title, idea_prompt, status, brief_state, selected_departments,
          assembled_brief, current_round, admin_user_id, created_at, updated_at
        )
        VALUES (
          ${title}, ${ideaPrompt}, ${status}, ${briefState},
          ${sql.raw(`ARRAY[${depts.map(d => `'${d}'`).join(',')}]::text[]`)},
          ${assembled}, ${currentRound}, ${adminId}, NOW(), NOW()
        )
        RETURNING id, title, brief_state AS "briefState", status`
  );
  const row = (result as any).rows[0];
  return { id: row.id, title: row.title, briefState: row.briefState, status: row.status };
}

// ── Brief Round ─────────────────────────────────────────────────────────────

export type TestRound = {
  id: string;
  briefId: string;
  roundNumber: number;
  status: string;
};

export async function createTestRound(
  db: DB,
  briefId: string,
  overrides: Partial<{
    roundNumber: number;
    roundType: string;
    status: string;
    synthesisOutput: string | null;
    synthesisStatus: string;
  }> = {}
): Promise<TestRound> {
  const roundNumber = overrides.roundNumber ?? 1;
  const roundType = overrides.roundType ?? 'meeting';
  const status = overrides.status ?? 'completed';
  const synthesisOutput = overrides.synthesisOutput ?? 'Test synthesis output for round';
  const synthesisStatus = overrides.synthesisStatus ?? 'approved';

  const result = await db.execute(
    sql`INSERT INTO nexus_brief_rounds (
          brief_id, round_number, round_type, status,
          synthesis_output, synthesis_status, created_at
        )
        VALUES (${briefId}, ${roundNumber}, ${roundType}, ${status},
                ${synthesisOutput}, ${synthesisStatus}, NOW())
        RETURNING id, brief_id AS "briefId", round_number AS "roundNumber", status`
  );
  const row = (result as any).rows[0];
  return { id: row.id, briefId: row.briefId, roundNumber: row.roundNumber, status: row.status };
}

// ── Decision Review ─────────────────────────────────────────────────────────

export type TestReview = {
  id: string;
  briefId: string;
  roundId: string;
  status: string;
};

export async function createTestReview(
  db: DB,
  briefId: string,
  roundId: string,
  overrides: Partial<{
    roundNumber: number;
    gateType: string;
    status: string;
    adminUserId: string;
  }> = {}
): Promise<TestReview> {
  const roundNumber = overrides.roundNumber ?? 1;
  const gateType = overrides.gateType ?? 'progression_decision';
  const status = overrides.status ?? 'pending';

  const result = await db.execute(
    sql`INSERT INTO nexus_decision_reviews (
          brief_id, round_id, round_number, gate_type, status,
          admin_user_id, created_at
        )
        VALUES (${briefId}, ${roundId}, ${roundNumber}, ${gateType}, ${status},
                ${overrides.adminUserId ?? null}, NOW())
        RETURNING id, brief_id AS "briefId", round_id AS "roundId", status`
  );
  const row = (result as any).rows[0];
  return { id: row.id, briefId: row.briefId, roundId: row.roundId, status: row.status };
}

// ── Decision Item ───────────────────────────────────────────────────────────

export type TestItem = {
  id: string;
  reviewId: string;
  itemTitle: string;
  decision: string | null;
};

export async function createTestDecisionItem(
  db: DB,
  reviewId: string,
  briefId: string,
  overrides: Partial<{
    parentItemId: string | null;
    itemIndex: number;
    itemTitle: string;
    itemSummary: string;
    sourceDepartment: string;
    decision: string | null;
    routedTo: string | null;
  }> = {}
): Promise<TestItem> {
  const itemIndex = overrides.itemIndex ?? 0;
  const itemTitle = overrides.itemTitle ?? 'Test Finding';
  const itemSummary = overrides.itemSummary ?? 'Test finding summary';
  const sourceDepartment = overrides.sourceDepartment ?? 'cto';

  const result = await db.execute(
    sql`INSERT INTO nexus_decision_items (
          review_id, brief_id, parent_item_id, item_index,
          item_title, item_summary, source_department,
          decision, routed_to, created_at
        )
        VALUES (${reviewId}, ${briefId}, ${overrides.parentItemId ?? null}, ${itemIndex},
                ${itemTitle}, ${itemSummary}, ${sourceDepartment},
                ${overrides.decision ?? null}, ${overrides.routedTo ?? null}, NOW())
        RETURNING id, review_id AS "reviewId", item_title AS "itemTitle", decision`
  );
  const row = (result as any).rows[0];
  return { id: row.id, reviewId: row.reviewId, itemTitle: row.itemTitle, decision: row.decision };
}

// ── Brief Department ────────────────────────────────────────────────────────

export async function createTestDepartment(
  db: DB,
  briefId: string,
  overrides: Partial<{
    department: string;
    status: string;
    output: string;
  }> = {}
): Promise<{ id: string }> {
  const department = overrides.department ?? 'cto';
  const status = overrides.status ?? 'completed';
  const output = overrides.output ?? 'Test department analysis output';

  const result = await db.execute(
    sql`INSERT INTO nexus_brief_departments (
          brief_id, department, status, output, created_at
        )
        VALUES (${briefId}, ${department}, ${status}, ${output}, NOW())
        RETURNING id`
  );
  return { id: (result as any).rows[0].id };
}

// ── Brief Web Source ────────────────────────────────────────────────────────

export async function createTestWebSource(
  db: DB,
  briefId: string,
  overrides: Partial<{
    sourceType: string;
    url: string;
    title: string;
    trustScore: number;
  }> = {}
): Promise<{ id: string }> {
  const sourceType = overrides.sourceType ?? 'github';
  const url = overrides.url ?? `https://github.com/test/repo-${Date.now()}`;
  const title = overrides.title ?? 'Test Source';

  const result = await db.execute(
    sql`INSERT INTO nexus_brief_web_sources (
          brief_id, source_type, url, title, trust_score, created_at
        )
        VALUES (${briefId}, ${sourceType}, ${url}, ${title},
                ${overrides.trustScore ?? 75}, NOW())
        RETURNING id`
  );
  return { id: (result as any).rows[0].id };
}

// ── Brief Question ──────────────────────────────────────────────────────────

export async function createTestQuestion(
  db: DB,
  briefId: string,
  overrides: Partial<{
    department: string;
    gate: string;
    question: string;
    answer: string | null;
  }> = {}
): Promise<{ id: string }> {
  const result = await db.execute(
    sql`INSERT INTO nexus_brief_questions (
          brief_id, department, gate, question, answer, created_at, updated_at
        )
        VALUES (${briefId}, ${overrides.department ?? 'ceo'}, ${overrides.gate ?? 'gate0'},
                ${overrides.question ?? 'Test question?'}, ${overrides.answer ?? null},
                NOW(), NOW())
        RETURNING id`
  );
  return { id: (result as any).rows[0].id };
}

// ── Extracted Task ──────────────────────────────────────────────────────────

export async function createTestExtractedTask(
  db: DB,
  briefId: string,
  overrides: Partial<{
    title: string;
    description: string;
    priority: string;
    sourceDepartment: string;
  }> = {}
): Promise<{ id: string }> {
  const result = await db.execute(
    sql`INSERT INTO nexus_extracted_tasks (
          brief_id, title, description, priority, source_department, created_at
        )
        VALUES (${briefId}, ${overrides.title ?? 'Test Task'},
                ${overrides.description ?? 'Test task description'},
                ${overrides.priority ?? 'medium'},
                ${overrides.sourceDepartment ?? 'cto'}, NOW())
        RETURNING id`
  );
  return { id: (result as any).rows[0].id };
}

// ── Composite: Full Brief with Children ─────────────────────────────────────

/**
 * Create a brief with all common child entities for reset/cleanup testing.
 */
export async function createFullBrief(
  db: DB,
  adminId: string,
  overrides: Partial<{ briefState: string; withRound: boolean }> = {}
) {
  const brief = await createTestBrief(db, adminId, {
    briefState: overrides.briefState ?? 'awaiting_round_1_review',
    assembledBrief: 'Full assembled brief content for testing',
  });

  const dept1 = await createTestDepartment(db, brief.id, { department: 'ceo' });
  const dept2 = await createTestDepartment(db, brief.id, { department: 'cto' });
  const ws1 = await createTestWebSource(db, brief.id);
  const q1 = await createTestQuestion(db, brief.id);
  const task1 = await createTestExtractedTask(db, brief.id);

  let round = null;
  if (overrides.withRound !== false) {
    round = await createTestRound(db, brief.id);
  }

  return { brief, departments: [dept1, dept2], webSources: [ws1], questions: [q1], tasks: [task1], round };
}
