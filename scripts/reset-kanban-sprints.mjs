#!/usr/bin/env node
/**
 * Reset Kanban, Sprints, and Work Plans — keep only Nexus-generated data.
 * Deletes all dev_tasks, sprints, sprint_tasks NOT linked to Nexus briefs.
 * Safe: dry-run by default. Pass --execute to actually delete.
 *
 * Usage:
 *   node scripts/reset-kanban-sprints.mjs           # dry-run (shows counts)
 *   node scripts/reset-kanban-sprints.mjs --execute # actually deletes
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL required'); process.exit(1); }

const execute = process.argv.includes('--execute');
const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: false } : false });

async function run() {
  const client = await pool.connect();
  try {
    console.log(execute ? '🗑️  EXECUTE MODE — deleting data' : '🔍 DRY-RUN MODE — showing counts only\n   Pass --execute to actually delete\n');

    // ── Sprints: keep those linked to a Nexus brief (generated_sprint_id) ─────
    const { rows: nexusSprints } = await client.query(
      `SELECT generated_sprint_id FROM nexus_briefs WHERE generated_sprint_id IS NOT NULL`
    );
    const nexusSprintIds = nexusSprints.map(r => r.generated_sprint_id);

    const { rowCount: sprintsToDelete } = await client.query(
      nexusSprintIds.length > 0
        ? `SELECT id FROM sprints WHERE id NOT IN (${nexusSprintIds.map((_, i) => `$${i+1}`).join(',')}) AND id IS NOT NULL`
        : `SELECT id FROM sprints`,
      nexusSprintIds
    );
    console.log(`Sprints to delete: ${sprintsToDelete ?? 0} (keeping ${nexusSprintIds.length} Nexus sprints)`);

    // ── dev_tasks: keep ai_generated=true tasks (Nexus-created) ──────────────
    const { rowCount: tasksToDelete } = await client.query(
      `SELECT id FROM dev_tasks WHERE ai_generated IS NOT TRUE`
    );
    console.log(`dev_tasks to delete: ${tasksToDelete ?? 0} (keeping ai_generated=true tasks)`);

    // ── work plan items (if table exists) ────────────────────────────────────
    const { rows: tables } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('work_plan_items','workplan_items','work_plans')`
    );
    for (const t of tables) {
      const { rowCount: wpCount } = await client.query(`SELECT id FROM ${t.tablename}`);
      console.log(`${t.tablename} to delete: ${wpCount ?? 0}`);
    }

    if (!execute) {
      console.log('\nRun with --execute to perform the deletions.');
      return;
    }

    // ── Actually delete ───────────────────────────────────────────────────────
    // 1. Remove sprint_tasks for non-Nexus sprints
    if (nexusSprintIds.length > 0) {
      await client.query(
        `DELETE FROM sprint_tasks WHERE sprint_id NOT IN (${nexusSprintIds.map((_, i) => `$${i+1}`).join(',')})`,
        nexusSprintIds
      );
    } else {
      await client.query(`DELETE FROM sprint_tasks`);
    }

    // 2. Delete non-Nexus sprints
    if (nexusSprintIds.length > 0) {
      await client.query(
        `DELETE FROM sprints WHERE id NOT IN (${nexusSprintIds.map((_, i) => `$${i+1}`).join(',')})`,
        nexusSprintIds
      );
    } else {
      await client.query(`DELETE FROM sprints`);
    }

    // 3. Delete non-AI dev_tasks (and unlink from sprint_tasks first)
    await client.query(`DELETE FROM sprint_tasks WHERE task_id IN (SELECT id FROM dev_tasks WHERE ai_generated IS NOT TRUE)`);
    await client.query(`DELETE FROM dev_tasks WHERE ai_generated IS NOT TRUE`);

    // 4. Delete work plan items
    for (const t of tables) {
      await client.query(`DELETE FROM ${t.tablename}`);
      console.log(`  ✅ Cleared ${t.tablename}`);
    }

    console.log('\n✅ Kanban / Sprints / Work Plans reset. Nexus data preserved.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
