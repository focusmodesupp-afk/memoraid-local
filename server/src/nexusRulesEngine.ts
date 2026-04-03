/**
 * NEXUS Rules Engine — Evaluates and executes automation rules
 *
 * Trigger types: brief_approved, brief_rejected, research_done, task_created, sprint_created
 * Action types: auto_extract_tasks, notify_admin, auto_create_sprint, webhook, audit_log
 */

import { sql } from 'drizzle-orm';
import { db } from './db';

type RuleRow = {
  id: string;
  name: string;
  trigger_type: string;
  condition_json: Record<string, unknown>;
  action_type: string;
  action_payload: Record<string, unknown> | null;
  priority: number;
  is_active: boolean;
};

type RuleContext = {
  briefId: string;
  briefTitle?: string;
  adminUserId?: string;
  departmentCount?: number;
  taskCount?: number;
  sprintId?: string;
};

/**
 * Evaluate and execute all active rules matching a trigger type.
 * Called at key pipeline events (approve, research done, tasks extracted, sprint created).
 * Non-fatal — errors are logged but never stop the pipeline.
 */
export async function evaluateRules(triggerType: string, context: RuleContext): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM nexus_rules
      WHERE trigger_type = ${triggerType} AND is_active = true
      ORDER BY priority DESC
    `);
    const rules = (result as any).rows as RuleRow[] ?? [];

    if (rules.length === 0) return;

    console.log(`[NEXUS Rules] Evaluating ${rules.length} rules for trigger: ${triggerType} (brief: ${context.briefId})`);

    for (const rule of rules) {
      try {
        // Check conditions (if any)
        if (!evaluateCondition(rule.condition_json, context)) {
          console.log(`[NEXUS Rules] Skipping rule "${rule.name}" — condition not met`);
          continue;
        }

        // Execute action
        console.log(`[NEXUS Rules] Executing rule "${rule.name}" (action: ${rule.action_type})`);
        await executeAction(rule.action_type, rule.action_payload ?? {}, context);

      } catch (ruleErr) {
        // Individual rule failure is non-fatal
        console.error(`[NEXUS Rules] Rule "${rule.name}" failed:`, ruleErr);
      }
    }
  } catch (err) {
    // Rules engine failure is non-fatal — never blocks the pipeline
    console.error(`[NEXUS Rules] Failed to evaluate rules for ${triggerType}:`, err);
  }
}

/**
 * Evaluate a condition object against the current context.
 * Supports: minDepartments, minTasks, requireDepartments
 */
function evaluateCondition(condition: Record<string, unknown>, context: RuleContext): boolean {
  if (!condition || Object.keys(condition).length === 0) return true; // No condition = always match

  // Check minimum department count
  if (typeof condition.minDepartments === 'number' && context.departmentCount !== undefined) {
    if (context.departmentCount < condition.minDepartments) return false;
  }

  // Check minimum task count
  if (typeof condition.minTasks === 'number' && context.taskCount !== undefined) {
    if (context.taskCount < condition.minTasks) return false;
  }

  // Check required departments
  if (Array.isArray(condition.requireDepartments)) {
    // This would need brief's selectedDepartments — skip for now if not in context
  }

  return true;
}

/**
 * Execute a rule action.
 */
async function executeAction(
  actionType: string,
  payload: Record<string, unknown>,
  context: RuleContext
): Promise<void> {
  switch (actionType) {
    case 'auto_extract_tasks': {
      // Dynamically import to avoid circular dependency
      const { extractTasksFromBrief } = await import('./nexusTaskExtractor');
      const maxTasks = (payload.maxTasks as number) ?? 30;
      console.log(`[NEXUS Rules] Auto-extracting up to ${maxTasks} tasks from brief ${context.briefId}`);
      await extractTasksFromBrief(context.briefId, maxTasks);
      break;
    }

    case 'notify_admin': {
      const message = (payload.message as string) ?? `NEXUS: אירוע ${context.briefTitle ?? context.briefId}`;
      // For now, log the notification. In the future, push to admin notification system.
      console.log(`[NEXUS Rules] Notification: ${message}`);
      // If notification table exists, insert:
      try {
        await db.execute(sql`
          INSERT INTO admin_notifications (type, title, message, admin_user_id)
          VALUES ('nexus_rule', 'NEXUS Automation', ${message}, ${context.adminUserId ?? null})
        `);
      } catch {
        // admin_notifications table may not exist — non-fatal
        console.log(`[NEXUS Rules] Notification logged (no notification table)`);
      }
      break;
    }

    case 'auto_create_sprint': {
      const { createSprintFromBrief } = await import('./nexusTaskExtractor');
      console.log(`[NEXUS Rules] Auto-creating sprint from brief ${context.briefId}`);
      await createSprintFromBrief(context.briefId);
      break;
    }

    case 'webhook': {
      const url = payload.url as string;
      if (!url) { console.warn('[NEXUS Rules] Webhook action missing URL'); break; }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (payload.headers && typeof payload.headers === 'object') {
        Object.assign(headers, payload.headers);
      }
      console.log(`[NEXUS Rules] Calling webhook: ${url}`);
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event: 'nexus_rule',
            briefId: context.briefId,
            briefTitle: context.briefTitle,
            adminUserId: context.adminUserId,
            timestamp: new Date().toISOString(),
            ...((payload.extraData as object) ?? {}),
          }),
          signal: AbortSignal.timeout(10000),
        });
        console.log(`[NEXUS Rules] Webhook response: ${resp.status}`);
      } catch (e) {
        console.error(`[NEXUS Rules] Webhook failed:`, e);
      }
      break;
    }

    case 'audit_log': {
      console.log(`[NEXUS Rules] Audit: trigger=${payload.triggerType ?? 'unknown'}, brief=${context.briefId}`);
      try {
        await db.execute(sql`
          INSERT INTO nexus_audit_log (brief_id, event_type, details, admin_user_id, created_at)
          VALUES (${context.briefId}, ${'rule_executed'}, ${JSON.stringify(payload)}::jsonb, ${context.adminUserId ?? null}, now())
        `);
      } catch {
        // audit_log table may not exist — non-fatal
      }
      break;
    }

    default:
      console.warn(`[NEXUS Rules] Unknown action type: ${actionType}`);
  }
}
