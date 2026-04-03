/**
 * nexusAdminRoutes.ts
 * Express router for Nexus Virtual Software House endpoints.
 * Mounted at /api/admin via index.ts.
 */

import { Router } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { db } from './db';
import {
  nexusBriefs,
  nexusBriefDepartments,
  nexusBriefWebSources,
} from '../../shared/schemas/schema';
import { sql } from 'drizzle-orm';
import { getAdminFromRequest } from './adminRoutes';
import { runNexusOrchestrator, sseWrite } from './nexusBriefOrchestrator';
import { ALL_DEPARTMENTS, getAllDepartmentConfigs, type DepartmentId } from './nexusDepartmentAgents';
import { getAvailableModels } from './multiProviderAI';
import { extractTasksFromBrief, saveExtractedTasks, createSprintFromBrief, createSprintsFromBrief } from './nexusTaskExtractor';
import { nexusSettingsRoutes } from './nexusSettingsRoutes';
import { gatherProjectData } from './projectDataGatherer';
import { processN8NResults, isN8NConfigured, type N8NResultPayload } from './n8nBridge';
import { generateQuestionsForBrief, autoAnswerQuestions, getAllBriefQuestions } from './questionDiscovery';
import { runMeetingRound, synthesizeRound } from './nexusRoundOrchestrator';
import { nexusBriefRounds, nexusBriefRoundResults } from '../../shared/schemas/schema';

// ── File upload (in-memory, no disk) ──────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
    ];
    const ext = file.originalname.toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith('.md') || ext.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error(`סוג קובץ לא נתמך: ${file.mimetype}`));
    }
  },
});

export const nexusAdminRoutes = Router();

// Mount settings sub-routes
nexusAdminRoutes.use('/', nexusSettingsRoutes);

// ── Rate limiter (same as AI endpoints) ───────────────────────────────────────
const nexusRunLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many Nexus research requests, try again later' },
});

// Separate, more permissive limiter for task extraction (doesn't run web intelligence)
const nexusExtractLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many extraction requests, wait a moment and try again' },
});

// ── Auth guard ─────────────────────────────────────────────────────────────────
async function requireAdmin(req: Parameters<typeof getAdminFromRequest>[0], res: import('express').Response, next: import('express').NextFunction) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  (req as unknown as { admin: typeof admin }).admin = admin;
  next();
}

// ── GET /nexus/departments ─────────────────────────────────────────────────────
nexusAdminRoutes.get('/nexus/departments', async (_req, res) => {
  res.json({ departments: ALL_DEPARTMENTS });
});

// ── GET /nexus/models ──────────────────────────────────────────────────────────
nexusAdminRoutes.get('/nexus/models', async (_req, res) => {
  const models = getAvailableModels();
  res.json({ models });
});

// ── POST /nexus/extract-text – extract text from uploaded files ────────────────
nexusAdminRoutes.post('/nexus/extract-text', requireAdmin, upload.array('files', 10), async (req, res) => {
  try {
    const files = (req as any).files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'אין קבצים' });

    const results: { filename: string; type: string; text: string; chars: number }[] = [];

    for (const file of files) {
      const ext = file.originalname.toLowerCase();
      let text = '';
      let type = 'unknown';

      try {
        if (file.mimetype === 'application/pdf' || ext.endsWith('.pdf')) {
          type = 'PDF';
          const pdfParse = (await import('pdf-parse')).default;
          const parsed = await pdfParse(file.buffer);
          text = parsed.text?.trim() ?? '';

        } else if (
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          ext.endsWith('.docx')
        ) {
          type = 'Word';
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          text = result.value?.trim() ?? '';

        } else if (file.mimetype === 'application/msword' || ext.endsWith('.doc')) {
          type = 'Word (legacy)';
          text = '[קובץ .doc ישן — המר ל-.docx לחילוץ טקסט מלא]';

        } else if (ext.endsWith('.md') || file.mimetype === 'text/markdown') {
          type = 'Markdown';
          text = file.buffer.toString('utf8').trim();

        } else if (file.mimetype.startsWith('text/') || ext.endsWith('.txt')) {
          type = 'Text';
          text = file.buffer.toString('utf8').trim();

        } else if (file.mimetype.startsWith('image/')) {
          type = 'Image';
          text = `[תמונה: ${file.originalname} — ${(file.size / 1024).toFixed(0)}KB — תוכן יוזרק כתמונה לAI]`;
        }
      } catch (parseErr: any) {
        text = `[שגיאה בחילוץ טקסט: ${parseErr.message}]`;
      }

      results.push({
        filename: file.originalname,
        type,
        text: text.slice(0, 50000), // max 50k chars per file
        chars: text.length,
      });
    }

    res.json({ files: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'שגיאה בעיבוד קבצים' });
  }
});

// ── POST /nexus/briefs – create a new brief (draft) ───────────────────────────
nexusAdminRoutes.post('/nexus/briefs', requireAdmin, async (req, res) => {
  try {
    const admin = (req as unknown as { admin: { id: string; fullName: string } }).admin;
    const { title, ideaPrompt, selectedDepartments, selectedModels, codebaseDepth, codebaseScope, contextNotes, targetPlatforms } = req.body as {
      title?: string;
      ideaPrompt: string;
      selectedDepartments?: string[];
      selectedModels?: string[];
      codebaseDepth?: string;
      codebaseScope?: string;
      contextNotes?: string;
      targetPlatforms?: string[];
    };

    if (!ideaPrompt?.trim()) {
      return res.status(400).json({ error: 'ideaPrompt is required' });
    }

    const autoTitle = title?.trim() || ideaPrompt.slice(0, 100);

    const [brief] = await db
      .insert(nexusBriefs)
      .values({
        title: autoTitle,
        ideaPrompt: ideaPrompt.trim(),
        selectedDepartments: selectedDepartments ?? [],
        selectedModels: selectedModels ?? [],
        codebaseDepth: codebaseDepth ?? 'deep',
        codebaseScope: codebaseScope ?? 'all',
        contextNotes: contextNotes?.trim() || null,
        targetPlatforms: targetPlatforms ?? [],
        adminUserId: admin.id === 'dev-bypass' ? null : admin.id,
        adminFullName: (admin as { fullName?: string }).fullName ?? null,
      })
      .returning();

    res.status(201).json({ brief });
  } catch (err) {
    console.error('[nexus] create brief error:', err);
    res.status(500).json({ error: 'Failed to create brief' });
  }
});

// ── GET /nexus/briefs – list briefs ───────────────────────────────────────────
nexusAdminRoutes.get('/nexus/briefs', requireAdmin, async (req, res) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query as Record<string, string>;

    const conditions = status ? [eq(nexusBriefs.status, status as 'draft' | 'researching' | 'review' | 'approved' | 'rejected' | 'in_progress' | 'done')] : [];

    const briefs = await db
      .select()
      .from(nexusBriefs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(nexusBriefs.createdAt))
      .limit(Math.min(Number(limit), 100))
      .offset(Number(offset));

    res.json({ briefs });
  } catch (err) {
    console.error('[nexus] list briefs error:', err);
    res.status(500).json({ error: 'Failed to list briefs' });
  }
});

// ── GET /nexus/briefs/:id – get single brief ──────────────────────────────────
nexusAdminRoutes.get('/nexus/briefs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    const departments = await db
      .select()
      .from(nexusBriefDepartments)
      .where(eq(nexusBriefDepartments.briefId, id))
      .orderBy(nexusBriefDepartments.createdAt);

    const webSources = await db
      .select()
      .from(nexusBriefWebSources)
      .where(eq(nexusBriefWebSources.briefId, id))
      .orderBy(desc(nexusBriefWebSources.trustScore));

    res.json({ brief, departments, webSources });
  } catch (err) {
    console.error('[nexus] get brief error:', err);
    res.status(500).json({ error: 'Failed to get brief' });
  }
});

// ── PATCH /nexus/briefs/:id – update brief ────────────────────────────────────
nexusAdminRoutes.patch('/nexus/briefs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, reviewNotes, assembledBrief, selectedDepartments, selectedModels, codebaseDepth, codebaseScope, contextNotes, targetPlatforms, researchMode } = req.body as Record<string, unknown>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes;
    if (assembledBrief !== undefined) updates.assembledBrief = assembledBrief;
    if (selectedDepartments !== undefined) updates.selectedDepartments = selectedDepartments;
    if (selectedModels !== undefined) updates.selectedModels = selectedModels;
    if (codebaseDepth !== undefined) updates.codebaseDepth = codebaseDepth;
    if (codebaseScope !== undefined) updates.codebaseScope = codebaseScope;
    if (contextNotes !== undefined) updates.contextNotes = contextNotes || null;
    if (targetPlatforms !== undefined) updates.targetPlatforms = targetPlatforms;
    if (researchMode !== undefined) updates.researchMode = researchMode;

    const [updated] = await db
      .update(nexusBriefs)
      .set(updates as Parameters<typeof db.update>[0] extends infer T ? T : never)
      .where(eq(nexusBriefs.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Brief not found' });
    res.json({ brief: updated });
  } catch (err) {
    console.error('[nexus] update brief error:', err);
    res.status(500).json({ error: 'Failed to update brief' });
  }
});

// ── DELETE /nexus/briefs/:id ──────────────────────────────────────────────────
nexusAdminRoutes.delete('/nexus/briefs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [brief] = await db.select({ status: nexusBriefs.status }).from(nexusBriefs).where(eq(nexusBriefs.id, id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });
    // Allow deletion from any status — super admin can force-delete with confirmed=true
    const { confirmed } = req.body ?? {};
    if (!['draft', 'rejected'].includes(brief.status) && !confirmed) {
      return res.status(400).json({ error: 'ניתן למחוק רק ניירות בסטטוס טיוטה או דחויות. שלח confirmed=true כדי למחוק בכח.', needsConfirm: true });
    }
    await db.delete(nexusBriefs).where(eq(nexusBriefs.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[nexus] delete brief error:', err);
    res.status(500).json({ error: 'Failed to delete brief' });
  }
});

// ── POST /nexus/briefs/:id/reset – unblock stuck brief ───────────────────────
nexusAdminRoutes.post('/nexus/briefs/:id/reset', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [brief] = await db.select({ status: nexusBriefs.status }).from(nexusBriefs).where(eq(nexusBriefs.id, id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });
    if (!['researching', 'review', 'rejected'].includes(brief.status)) {
      return res.status(400).json({ error: 'ניתן לאפס רק ניירות בסטטוס "חוקר", "בסקירה" או "דחויה"' });
    }
    const { contextNotes } = (req.body ?? {}) as { contextNotes?: string };
    const resetFields: Record<string, unknown> = { status: 'draft', updatedAt: new Date() };
    if (contextNotes !== undefined) resetFields.contextNotes = contextNotes || null;
    const [updated] = await db
      .update(nexusBriefs)
      .set(resetFields as Parameters<typeof db.update>[0] extends infer T ? T : never)
      .where(eq(nexusBriefs.id, id))
      .returning();
    res.json({ brief: updated });
  } catch (err) {
    console.error('[nexus] reset brief error:', err);
    res.status(500).json({ error: 'Failed to reset brief' });
  }
});

// ── POST /nexus/briefs/:id/run – trigger orchestrator ─────────────────────────
nexusAdminRoutes.post('/nexus/briefs/:id/run', nexusRunLimiter, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });
    if (brief.status === 'researching') {
      return res.status(400).json({ error: 'מחקר כבר פעיל' });
    }

    // Update settings if provided in body
    const { selectedDepartments, selectedModels, codebaseDepth, codebaseScope } = req.body as Record<string, unknown>;
    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (selectedDepartments) updateFields.selectedDepartments = selectedDepartments;
    if (selectedModels) updateFields.selectedModels = selectedModels;
    if (codebaseDepth) updateFields.codebaseDepth = codebaseDepth;
    if (codebaseScope) updateFields.codebaseScope = codebaseScope;

    const [updated] = await db.update(nexusBriefs).set(updateFields as Parameters<typeof db.update>[0] extends infer T ? T : never).where(eq(nexusBriefs.id, id)).returning();

    const admin = (req as unknown as { admin: { id: string } }).admin;
    // Redirect to SSE stream endpoint – client should connect to /stream
    res.json({
      ok: true,
      briefId: id,
      streamUrl: `/api/admin/nexus/briefs/${id}/stream`,
      departments: updated?.selectedDepartments ?? brief.selectedDepartments,
    });
  } catch (err) {
    console.error('[nexus] run error:', err);
    res.status(500).json({ error: 'Failed to start research' });
  }
});

// ── GET /nexus/briefs/:id/stream – SSE endpoint ───────────────────────────────
nexusAdminRoutes.get('/nexus/briefs/:id/stream', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, id));
    if (!brief) {
      res.status(404).json({ error: 'Brief not found' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Keepalive ping
    const keepalive = setInterval(() => {
      try {
        res.write(':keepalive\n\n');
      } catch {
        clearInterval(keepalive);
      }
    }, 15000);

    req.on('close', () => clearInterval(keepalive));

    const admin = (req as unknown as { admin: { id: string } }).admin;

    await runNexusOrchestrator({
      briefId: id,
      ideaPrompt: brief.ideaPrompt,
      departments: (brief.selectedDepartments ?? []) as DepartmentId[],
      models: brief.selectedModels ?? [],
      codebaseDepth: brief.codebaseDepth ?? 'deep',
      codebaseScope: brief.codebaseScope ?? 'all',
      adminUserId: admin.id === 'dev-bypass' ? null : admin.id,
      contextNotes: brief.contextNotes ?? null,
      targetPlatforms: brief.targetPlatforms ?? [],
      sseRes: res,
    });

    clearInterval(keepalive);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sseWrite(res, 'error', { message, retryable: false });
    res.end();
  }
});

// ── POST /nexus/briefs/:id/approve ────────────────────────────────────────────
nexusAdminRoutes.post('/nexus/briefs/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as unknown as { admin: { id: string } }).admin;

    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });
    if (brief.status !== 'review') {
      return res.status(400).json({ error: 'ניתן לאשר רק ניירות בסטטוס "בסקירה"' });
    }

    const approvedBy = admin.id === 'dev-bypass' ? null : admin.id;
    const [updated] = await db
      .update(nexusBriefs)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy,
        updatedAt: new Date(),
      })
      .where(eq(nexusBriefs.id, id))
      .returning();

    res.json({ brief: updated });

    // Trigger automation rules for brief_approved (non-blocking)
    import('./nexusRulesEngine').then(({ evaluateRules }) => {
      evaluateRules('brief_approved', {
        briefId: id,
        briefTitle: updated.title,
        adminUserId: approvedBy ?? undefined,
      }).catch(e => console.error('[nexus] rules evaluation error:', e));
    });
  } catch (err) {
    console.error('[nexus] approve error:', err);
    res.status(500).json({ error: 'Failed to approve brief' });
  }
});

// ── POST /nexus/briefs/:id/reject ─────────────────────────────────────────────
nexusAdminRoutes.post('/nexus/briefs/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body as { reviewNotes?: string };

    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    const [updated] = await db
      .update(nexusBriefs)
      .set({
        status: 'rejected',
        reviewNotes: reviewNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(nexusBriefs.id, id))
      .returning();

    res.json({ brief: updated });

    // Trigger automation rules for brief_rejected (non-blocking)
    import('./nexusRulesEngine').then(({ evaluateRules }) => {
      evaluateRules('brief_rejected', {
        briefId: id,
        briefTitle: updated.title,
      }).catch(e => console.error('[nexus] rules evaluation error:', e));
    });
  } catch (err) {
    console.error('[nexus] reject error:', err);
    res.status(500).json({ error: 'Failed to reject brief' });
  }
});

// ── GET /nexus/briefs/:id/departments ─────────────────────────────────────────
nexusAdminRoutes.get('/nexus/briefs/:id/departments', requireAdmin, async (req, res) => {
  try {
    const departments = await db
      .select()
      .from(nexusBriefDepartments)
      .where(eq(nexusBriefDepartments.briefId, req.params.id))
      .orderBy(nexusBriefDepartments.createdAt);
    res.json({ departments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get departments' });
  }
});

// ── POST /nexus/briefs/:id/retry-department ──────────────────────────────────
nexusAdminRoutes.post('/nexus/briefs/:id/retry-department', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { department, model } = req.body as { department: string; model: string };
    if (!department || !model) return res.status(400).json({ error: 'department and model are required' });

    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    const admin = (req as unknown as { admin: { id: string } }).admin;

    // Load web intelligence for this dept from DB
    const deptSources = await db
      .select()
      .from(nexusBriefWebSources)
      .where(eq(nexusBriefWebSources.briefId, id));
    const webIntelligence = {
      sources: deptSources.map((s) => ({
        sourceType: s.sourceType as 'github' | 'reddit' | 'rss' | 'perplexity',
        url: s.url ?? '',
        title: s.title ?? '',
        snippet: s.snippet ?? '',
        trustScore: s.trustScore ?? 0,
        githubStars: s.githubStars ?? undefined,
        redditScore: s.redditScore ?? undefined,
        contributorCount: s.contributorCount ?? undefined,
        department: s.department ?? undefined,
        rawPayload: (s.rawPayload ?? {}) as Record<string, unknown>,
      })),
      synthesizedContext: '',
    };

    // Run single department agent
    const { runDepartmentAgent, loadNexusConfig } = await import('./nexusDepartmentAgents');
    const { gatherProjectData } = await import('./projectDataGatherer');
    const nexusConfig = await loadNexusConfig();
    const codebaseContext = await gatherProjectData('quick', 'all');

    const result = await runDepartmentAgent({
      department: department as any,
      ideaPrompt: brief.ideaPrompt,
      webIntelligence,
      codebaseContext,
      models: [model as any],
      adminUserId: admin.id,
      contextNotes: brief.contextNotes,
      targetPlatforms: brief.targetPlatforms,
      nexusConfig,
      briefId: id,
    });

    // Update the department row in DB
    await db
      .update(nexusBriefDepartments)
      .set({
        status: result.error ? 'error' : 'completed',
        output: result.output,
        promptSnapshot: result.promptSnapshot ?? null,
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        costUsd: String(result.costUsd.toFixed(6)),
        errorMessage: result.error ?? null,
        completedAt: new Date(),
      })
      .where(
        sql`brief_id = ${id} AND department = ${department}`
      );

    // Update brief total cost and tokens
    await db.execute(sql`
      UPDATE nexus_briefs SET
        total_cost_usd = (SELECT COALESCE(SUM(cost_usd::numeric), 0)::text FROM nexus_brief_departments WHERE brief_id = ${id} AND status = 'completed'),
        total_tokens_used = (SELECT COALESCE(SUM(tokens_used), 0) FROM nexus_brief_departments WHERE brief_id = ${id} AND status = 'completed'),
        updated_at = NOW()
      WHERE id = ${id}
    `);

    res.json({
      ok: true,
      department,
      model: result.modelUsed,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      error: result.error ?? null,
    });
  } catch (err) {
    console.error('[nexus] retry-department error:', err);
    res.status(500).json({ error: 'Failed to retry department' });
  }
});

// ── GET /nexus/briefs/:id/sources ─────────────────────────────────────────────
nexusAdminRoutes.get('/nexus/briefs/:id/sources', requireAdmin, async (req, res) => {
  try {
    const sources = await db
      .select()
      .from(nexusBriefWebSources)
      .where(eq(nexusBriefWebSources.briefId, req.params.id))
      .orderBy(desc(nexusBriefWebSources.trustScore));
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get sources' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// NEXUS V2: Meeting Mode Endpoints
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /nexus/briefs/:id/start-meeting — Initialize meeting mode ──────────
nexusAdminRoutes.post('/nexus/briefs/:id/start-meeting', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    await db.update(nexusBriefs).set({
      status: 'researching',
      researchMode: 'meeting',
      currentRound: 0,
      researchStartedAt: new Date(),
      updatedAt: new Date(),
    } as any).where(eq(nexusBriefs.id, id));

    res.json({ ok: true, briefId: id, mode: 'meeting' });
  } catch (err) {
    console.error('[nexus] start-meeting error:', err);
    res.status(500).json({ error: 'Failed to start meeting mode' });
  }
});

// ── Meeting Round Endpoints ─────────────────────────────────────────────────

// ── POST /nexus/briefs/:id/run-round — Start a meeting round (SSE) ──────────
nexusAdminRoutes.post('/nexus/briefs/:id/run-round', nexusRunLimiter, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { roundNumber, models } = req.body as { roundNumber: number; models?: string[] };

  if (!roundNumber || ![1, 2, 3].includes(roundNumber)) {
    return res.status(400).json({ error: 'roundNumber must be 1, 2, or 3' });
  }

  const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, id));
  if (!brief) return res.status(404).json({ error: 'Brief not found' });

  // Validate round order
  if (roundNumber === 2 && !brief.round1Synthesis) {
    return res.status(400).json({ error: 'Round 1 must be completed and synthesized before Round 2' });
  }
  if (roundNumber === 3 && !brief.round2Synthesis) {
    return res.status(400).json({ error: 'Round 2 must be completed and synthesized before Round 3' });
  }

  const admin = await getAdminFromRequest(req);

  // Setup SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    const result = await runMeetingRound({
      briefId: id,
      roundNumber: roundNumber as 1 | 2 | 3,
      models: models ?? brief.selectedModels ?? [],
      adminUserId: admin?.id,
      sseRes: res,
    });

    sseWrite(res, 'done', {
      roundId: result.roundId,
      participantCount: result.participantCount,
      completedCount: result.completedCount,
      totalCost: result.totalCost,
      totalTokens: result.totalTokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sseWrite(res, 'error', { message, retryable: true });
  }

  res.end();
});

// ── GET /nexus/briefs/:id/rounds — List all rounds for a brief ──────────────
nexusAdminRoutes.get('/nexus/briefs/:id/rounds', requireAdmin, async (req, res) => {
  try {
    const rounds = await db.select().from(nexusBriefRounds)
      .where(eq(nexusBriefRounds.briefId, req.params.id))
      .orderBy(nexusBriefRounds.roundNumber);
    res.json({ rounds });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get rounds' });
  }
});

// ── GET /nexus/briefs/:id/rounds/:roundId — Round detail with results ───────
nexusAdminRoutes.get('/nexus/briefs/:id/rounds/:roundId', requireAdmin, async (req, res) => {
  try {
    const [round] = await db.select().from(nexusBriefRounds)
      .where(eq(nexusBriefRounds.id, req.params.roundId));
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const results = await db.select().from(nexusBriefRoundResults)
      .where(eq(nexusBriefRoundResults.roundId, req.params.roundId))
      .orderBy(nexusBriefRoundResults.department);

    res.json({ round, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get round details' });
  }
});

// ── POST /nexus/briefs/:id/rounds/:roundId/synthesize — Merge round results ─
nexusAdminRoutes.post('/nexus/briefs/:id/rounds/:roundId/synthesize', requireAdmin, async (req, res) => {
  try {
    const [round] = await db.select().from(nexusBriefRounds)
      .where(eq(nexusBriefRounds.id, req.params.roundId));
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const admin = await getAdminFromRequest(req);
    const result = await synthesizeRound({
      briefId: req.params.id,
      roundId: req.params.roundId,
      roundNumber: round.roundNumber as 1 | 2 | 3,
      adminUserId: admin?.id,
    });

    res.json({
      ok: true,
      synthesis: result.synthesis.slice(0, 500) + '...',
      model: result.model,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
    });
  } catch (err) {
    console.error('[nexus] synthesize error:', err);
    res.status(500).json({ error: 'Failed to synthesize round' });
  }
});

// ── POST /nexus/briefs/:id/rounds/:roundId/retry-employee — Retry one employee
nexusAdminRoutes.post('/nexus/briefs/:id/rounds/:roundId/retry-employee', requireAdmin, async (req, res) => {
  try {
    const { employeeName, model } = req.body as { employeeName: string; model: string };
    if (!employeeName || !model) return res.status(400).json({ error: 'employeeName and model required' });

    // Find the failed result
    const [failedResult] = await db.select().from(nexusBriefRoundResults)
      .where(
        sql`round_id = ${req.params.roundId} AND employee_name = ${employeeName} AND status = 'error'`
      );
    if (!failedResult) return res.status(404).json({ error: 'Failed employee result not found' });

    const [round] = await db.select().from(nexusBriefRounds)
      .where(eq(nexusBriefRounds.id, req.params.roundId));
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const [brief] = await db.select().from(nexusBriefs)
      .where(eq(nexusBriefs.id, req.params.id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    // Load the employee from team members
    const { loadNexusConfig } = await import('./nexusDepartmentAgents');
    const config = await loadNexusConfig();
    const employee = config.teamMembers.find(m => m.name === employeeName && m.department === failedResult.department);
    if (!employee) return res.status(404).json({ error: 'Employee not found in team' });

    // Re-run the employee agent
    const { buildPromptEnvelope } = await import('./nexusPromptEnvelope');
    const { fetchEmployeeWebSources } = await import('./nexusEmployeeResearch');
    const { gatherProjectData } = await import('./projectDataGatherer');
    const { callAI } = await import('./multiProviderAI');

    const codebaseContext = await gatherProjectData('quick', 'all');
    const ROUND_CONFIG: Record<number, 'ERP' | 'TBP' | 'IPP'> = { 1: 'ERP', 2: 'TBP', 3: 'IPP' };
    const protocol = ROUND_CONFIG[round.roundNumber] ?? 'ERP';

    const webSources = await fetchEmployeeWebSources(
      { employeeName, employeeRole: employee.roleHe, department: employee.department, level: employee.level, skills: employee.skills, domainExpertise: employee.domainExpertise ?? [] },
      brief.ideaPrompt,
    );

    const envelope = buildPromptEnvelope({
      briefId: req.params.id,
      ideaPrompt: brief.ideaPrompt,
      codebaseContext,
      knownConstraints: ['Hebrew RTL first', 'Tailwind CSS only', 'shadcn/ui components'],
      roundNumber: round.roundNumber as 1 | 2 | 3,
      protocol,
      previousSynthesis: round.roundNumber >= 2 ? brief.round1Synthesis : null,
      employee: {
        name: employee.name, roleHe: employee.roleHe, department: employee.department,
        level: employee.level, bio: employee.bio, skills: employee.skills,
        domainExpertise: employee.domainExpertise, methodology: employee.methodology,
        personality: employee.personality, certifications: employee.certifications,
        responsibilities: employee.responsibilities, education: employee.education,
        experienceYears: employee.experienceYears, background: employee.background,
      },
      webSources,
    });

    const admin = await getAdminFromRequest(req);
    const aiResult = await callAI('departmentAnalysis', [
      { role: 'system', content: envelope.systemPrompt },
      { role: 'user', content: envelope.userPrompt },
    ], { preferredModels: [model as any], adminUserId: admin?.id, maxTokens: 3000 });

    let outputJson: Record<string, unknown> | null = null;
    try {
      const m = aiResult.content.match(/\{[\s\S]*\}/);
      if (m) outputJson = JSON.parse(m[0]);
    } catch { /* not JSON */ }

    // Update the result
    await db.update(nexusBriefRoundResults).set({
      status: aiResult.content ? 'completed' : 'error',
      output: aiResult.content,
      outputJson,
      modelUsed: aiResult.model,
      tokensUsed: aiResult.tokensIn + aiResult.tokensOut,
      costUsd: String(aiResult.costUsd.toFixed(6)),
      errorMessage: null,
      completedAt: new Date(),
    }).where(eq(nexusBriefRoundResults.id, failedResult.id));

    res.json({
      ok: true,
      employee: employeeName,
      model: aiResult.model,
      tokensUsed: aiResult.tokensIn + aiResult.tokensOut,
      costUsd: aiResult.costUsd,
    });
  } catch (err) {
    console.error('[nexus] retry-employee error:', err);
    res.status(500).json({ error: 'Failed to retry employee' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// NEXUS V1: Task Extraction & Sprint Generation
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /nexus/briefs/:id/extract-tasks ──────────────────────────────────────
nexusAdminRoutes.post('/nexus/briefs/:id/extract-tasks', requireAdmin, nexusExtractLimiter, async (req, res) => {
  try {
    console.log(`[extract-tasks] Starting extraction for brief ${req.params.id}`);
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, req.params.id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });
    if (!brief.assembledBrief) return res.status(400).json({ error: 'Brief has no assembled content yet' });

    console.log(`[extract-tasks] Brief found: "${brief.title}", brief length=${brief.assembledBrief.length}`);
    const tasks = await extractTasksFromBrief(req.params.id, brief.assembledBrief, brief.ideaPrompt);
    console.log(`[extract-tasks] Extracted ${tasks.length} tasks`);
    await saveExtractedTasks(req.params.id, tasks);
    // Query back full data so client has all fields (priority, description, etc.)
    const fullTasksRes = await db.execute(sql`
      SELECT id, title, description, priority,
             estimate_hours AS "estimateHours",
             category,
             skill_tags AS "skillTags",
             source_department AS "sourceDepartment",
             accepted
      FROM nexus_extracted_tasks
      WHERE brief_id = ${req.params.id}
      ORDER BY position
    `);
    const fullTasks = (fullTasksRes as any).rows ?? [];
    console.log(`[extract-tasks] Returning ${fullTasks.length} tasks to client`);
    res.json({ tasks: fullTasks, count: fullTasks.length });
  } catch (err: any) {
    console.error(`[extract-tasks] Error:`, err.message);
    res.status(500).json({ error: err.message || 'Failed to extract tasks' });
  }
});

// ── GET /nexus/briefs/:id/extracted-tasks ─────────────────────────────────────
nexusAdminRoutes.get('/nexus/briefs/:id/extracted-tasks', requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM nexus_extracted_tasks WHERE brief_id = ${req.params.id} ORDER BY position
    `);
    res.json({ tasks: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get extracted tasks' });
  }
});

// ── PATCH /nexus/briefs/:id/extracted-tasks/:taskId ────────────────────────────
nexusAdminRoutes.patch('/nexus/briefs/:id/extracted-tasks/:taskId', requireAdmin, async (req, res) => {
  const { title, description, priority, estimateHours, category, skillTags, accepted } = req.body;
  try {
    await db.execute(sql`
      UPDATE nexus_extracted_tasks SET
        title           = COALESCE(${title ?? null}, title),
        description     = COALESCE(${description ?? null}, description),
        priority        = COALESCE(${priority ?? null}, priority),
        estimate_hours  = COALESCE(${estimateHours ?? null}, estimate_hours),
        category        = COALESCE(${category ?? null}, category),
        skill_tags      = COALESCE(${skillTags ?? null}, skill_tags),
        accepted        = COALESCE(${accepted ?? null}, accepted)
      WHERE id = ${req.params.taskId} AND brief_id = ${req.params.id}
    `);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ── POST /nexus/briefs/:id/generate-sprint ────────────────────────────────────
nexusAdminRoutes.post('/nexus/briefs/:id/generate-sprint', requireAdmin, nexusRunLimiter, async (req, res) => {
  try {
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, req.params.id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });
    if (!['approved', 'in_progress'].includes(brief.status)) return res.status(400).json({ error: 'Brief must be approved first' });

    const { sprintName, sprintGoal, phaseId, taskIds } = req.body;
    if (!sprintName || !taskIds?.length) {
      return res.status(400).json({ error: 'sprintName + taskIds required' });
    }

    const result = await createSprintFromBrief({
      briefId: req.params.id,
      briefTitle: brief.title,
      sprintName,
      sprintGoal: sprintGoal || `Sprint from Nexus brief: ${brief.title}`,
      phaseId: phaseId || null,
      taskIds,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[generate-sprint] ERROR:', err.message || err, err.stack?.split('\n').slice(0, 3).join(' '));
    res.status(500).json({ error: err.message || 'Failed to generate sprint' });
  }
});

// ── POST /nexus/briefs/:id/generate-sprints ─── Smart multi-sprint creation ──
nexusAdminRoutes.post('/nexus/briefs/:id/generate-sprints', requireAdmin, nexusRunLimiter, async (req, res) => {
  try {
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, req.params.id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });
    if (!['approved', 'in_progress'].includes(brief.status)) return res.status(400).json({ error: 'Brief must be approved first' });

    const { taskIds, tasksPerSprint, phaseId } = req.body;
    if (!taskIds?.length) return res.status(400).json({ error: 'taskIds required' });

    const result = await createSprintsFromBrief({
      briefId: req.params.id,
      briefTitle: brief.title,
      phaseId: phaseId || null,
      taskIds,
      tasksPerSprint: tasksPerSprint || 10,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[generate-sprints] ERROR:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate sprints' });
  }
});

// ── Question Discovery Endpoints ──────────────────────────────────────────────

// Generate questions for a brief (Step 0)
nexusAdminRoutes.post('/nexus/briefs/:id/generate-questions', requireAdmin, async (req, res) => {
  try {
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, req.params.id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    const result = await generateQuestionsForBrief(
      req.params.id,
      brief.ideaPrompt,
      (brief.selectedDepartments ?? []) as string[],
    );
    res.json(result);
  } catch (err: any) {
    console.error('[generate-questions] ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Auto-answer questions using AI
nexusAdminRoutes.post('/nexus/briefs/:id/auto-answer', requireAdmin, async (req, res) => {
  try {
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, req.params.id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    const codebaseContext = req.body.codebaseContext || '';
    const result = await autoAnswerQuestions(req.params.id, brief.ideaPrompt, codebaseContext);
    res.json(result);
  } catch (err: any) {
    console.error('[auto-answer] ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all questions for a brief
nexusAdminRoutes.get('/nexus/briefs/:id/questions', requireAdmin, async (req, res) => {
  try {
    const questions = await getAllBriefQuestions(req.params.id);
    res.json({ questions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a single question answer (manual edit/verify)
nexusAdminRoutes.patch('/nexus/briefs/:briefId/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    const { answer, verified, confidence } = req.body;
    await db.execute(sql`
      UPDATE nexus_brief_questions SET
        answer = COALESCE(${answer ?? null}, answer),
        verified = COALESCE(${verified ?? null}, verified),
        confidence = COALESCE(${confidence ?? null}, confidence),
        answer_source = CASE WHEN ${answer ?? null} IS NOT NULL THEN 'manual' ELSE answer_source END,
        updated_at = now()
      WHERE id = ${req.params.questionId} AND brief_id = ${req.params.briefId}
    `);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /nexus/briefs/:id/trigger-n8n ─── Trigger full N8N pipeline ──
nexusAdminRoutes.post('/nexus/briefs/:id/trigger-n8n', requireAdmin, async (req, res) => {
  try {
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, req.params.id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    const { triggerFullN8NResearch } = await import('./n8nBridge');
    const result = await triggerFullN8NResearch(
      req.params.id,
      brief.ideaPrompt,
      (brief.selectedDepartments ?? []) as string[],
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to trigger N8N' });
  }
});

// ── POST /nexus/briefs/:id/n8n-callback ─── Receive web intelligence from N8N ──
nexusAdminRoutes.post('/nexus/briefs/:id/n8n-callback', async (req, res) => {
  try {
    const briefId = req.params.id;
    const payload = req.body as N8NResultPayload;

    // Validate brief exists
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, briefId));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    // Process and validate sources from N8N
    const sources = processN8NResults({ ...payload, briefId });
    if (sources.length === 0) {
      return res.json({ saved: 0, message: 'No valid sources in payload' });
    }

    // Save sources to nexus_brief_web_sources
    let saved = 0;
    for (const s of sources) {
      try {
        await db.insert(nexusBriefWebSources).values({
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
        });
        saved++;
      } catch {
        // skip duplicates
      }
    }

    console.log(`[n8nCallback] Saved ${saved}/${sources.length} sources for brief ${briefId} from N8N ${payload.workflowType}`);
    res.json({ saved, total: sources.length, workflowType: payload.workflowType });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process N8N callback' });
  }
});

// ── GET /nexus/n8n-status ─── Check N8N configuration ──
nexusAdminRoutes.get('/nexus/n8n-status', requireAdmin, async (_req, res) => {
  res.json({
    configured: isN8NConfigured(),
    webhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL ?? null,
  });
});

// ── GET /nexus/dev-tasks/:taskId/context ─── Full NEXUS context for "צא לפיתוח" ──
nexusAdminRoutes.get('/nexus/dev-tasks/:taskId/context', requireAdmin, async (req, res) => {
  try {
    const taskRes = await db.execute(sql`
      SELECT id, title, description, nexus_context FROM dev_tasks WHERE id = ${req.params.taskId}
    `);
    const task = (taskRes as any).rows?.[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const ctx = task.nexus_context ?? {};
    let departmentFull: string | null = null;
    let webSourcesFull: any[] = [];
    let generatedDocs: any[] = [];

    if (ctx.briefId) {
      // Load full department analysis
      if (ctx.sourceDepartment) {
        const deptRes = await db.execute(sql`
          SELECT output FROM nexus_brief_departments
          WHERE brief_id = ${ctx.briefId} AND department = ${ctx.sourceDepartment}
          LIMIT 1
        `);
        departmentFull = (deptRes as any).rows?.[0]?.output ?? null;
      }

      // Load all web sources for the brief
      const wsRes = await db.execute(sql`
        SELECT id, source_type, url, title, snippet, trust_score
        FROM nexus_brief_web_sources
        WHERE brief_id = ${ctx.briefId}
        ORDER BY trust_score DESC NULLS LAST
      `);
      webSourcesFull = (wsRes as any).rows ?? [];

      // Load generated docs
      const docsRes = await db.execute(sql`
        SELECT doc_type, title, content FROM nexus_generated_docs
        WHERE brief_id = ${ctx.briefId}
        ORDER BY created_at
      `).catch(() => ({ rows: [] }));
      generatedDocs = ((docsRes as any).rows ?? []).map((d: any) => ({
        docType: d.doc_type,
        title: d.title,
        content: d.content,
      }));
    }

    res.json({
      task: { id: task.id, title: task.title, description: task.description },
      nexusContext: ctx,
      departmentAnalysis: departmentFull,
      webSources: webSourcesFull,
      generatedDocs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load task context' });
  }
});

// ── GET /nexus/phases ─────────────────────────────────────────────────────────
nexusAdminRoutes.get('/nexus/phases', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT id, name, status, order_index FROM phases ORDER BY order_index`);
    res.json(rows);
  } catch {
    res.json([]); // phases table may not exist in all envs
  }
});

// ── GET /nexus/dept-configs — full dept config including system prompts ────────
nexusAdminRoutes.get('/nexus/dept-configs', requireAdmin, async (_req, res) => {
  res.json({ departments: getAllDepartmentConfigs() });
});

// ── GET /nexus/codebase-preview — preview codebase context ────────────────────
nexusAdminRoutes.get('/nexus/codebase-preview', requireAdmin, async (req, res) => {
  try {
    const depth = (req.query.depth as string) || 'deep';
    const scope = (req.query.scope as string) || 'all';
    const data = await gatherProjectData({
      depth: depth as 'quick' | 'deep' | 'full',
      scope: scope as 'all' | 'client' | 'server',
    });
    const lines = data.split('\n').length;
    const chars = data.length;
    res.json({ preview: data.slice(0, 8000), lines, chars, truncated: data.length > 8000 });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to scan codebase' });
  }
});

// ── POST /nexus/briefs/:id/generate-doc — generate a specific document ─────────
nexusAdminRoutes.post('/nexus/briefs/:id/generate-doc', requireAdmin, async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const { docType } = req.body as { docType: string };
  if (!docType) return res.status(400).json({ error: 'docType required' });

  try {
    const [brief] = await db.select().from(nexusBriefs).where(eq(nexusBriefs.id, req.params.id));
    if (!brief) return res.status(404).json({ error: 'Brief not found' });
    if (!brief.assembledBrief) return res.status(400).json({ error: 'Brief not yet researched' });

    const { callAI } = await import('./multiProviderAI');

    const DOC_PROMPTS: Record<string, { title: string; systemPrompt: string }> = {
      prd: {
        title: 'PRD – Product Requirements Document',
        systemPrompt: `אתה Product Manager בכיר. כתוב PRD מקיף ומבנה בפורמט Markdown.
כלול: Executive Summary, Problem Statement, Goals & Non-Goals, User Personas, User Stories (Gherkin), Functional Requirements, Non-Functional Requirements, Success Metrics, Out of Scope.
כתוב בעברית עם מינוח טכני באנגלית. היה מדויק ומפורט.`,
      },
      erd: {
        title: 'ERD – Entity Relationship Diagram',
        systemPrompt: `אתה Database Architect. צור ERD מפורט בפורמט Mermaid erDiagram.
כלול את כל הישויות, שדות (עם types), ויחסים (one-to-many, many-to-many).
אחרי הדיאגרמה, כתוב הסבר של כל טבלה וסיבת קיומה. כלול גם migration SQL ראשוני.
כתוב בעברית עם שמות שדות באנגלית.`,
      },
      blueprint: {
        title: 'Blueprint – System Architecture',
        systemPrompt: `אתה Solutions Architect בכיר. כתוב Blueprint ארכיטקטורה מלא.
כלול: System Architecture Diagram (Mermaid), Component Breakdown, Data Flow Diagram, API Design (endpoints table), Infrastructure, Scalability Plan, Tech Stack Rationale.
כתוב בעברית עם מינוח טכני באנגלית.`,
      },
      cicd: {
        title: 'CI/CD Pipeline Specification',
        systemPrompt: `אתה DevOps Engineer מומחה. כתוב מפרט CI/CD מלא.
כלול: Pipeline Diagram (Mermaid), GitHub Actions workflow YAML, Environment Strategy (dev/staging/prod), Testing Strategy, Deployment Strategy (Blue/Green or Rolling), Monitoring & Alerting, Rollback Plan, Security Gates.
כתוב בעברית עם קוד YAML/bash באנגלית.`,
      },
      design: {
        title: 'Design Specification – UX/UI',
        systemPrompt: `אתה Design Lead מומחה. כתוב Design Spec מקיף.
כלול: Design System (Colors, Typography, Spacing, Components), Component Library List, User Flows (Mermaid flowchart), Wireframe Descriptions (כל מסך מתואר טקסטואלית), Responsive Breakpoints, RTL Guidelines, Accessibility Checklist (WCAG 2.1 AA), Animation Guidelines.
כתוב בעברית עם CSS variables באנגלית.`,
      },
      security: {
        title: 'Security Assessment Report',
        systemPrompt: `אתה CISO מומחה. כתוב Security Assessment Report מקיף.
כלול: Threat Model (STRIDE), Attack Surface Analysis, OWASP Top 10 Mapping, Data Classification, Encryption Requirements, Authentication & Authorization Design, API Security Checklist, Penetration Testing Plan, GDPR/HIPAA Compliance Checklist, Security Incident Response Plan.
כתוב בעברית עם מינוח אבטחה באנגלית.`,
      },
      marketing: {
        title: 'Marketing & GTM Strategy',
        systemPrompt: `אתה CMO מומחה ב-B2B SaaS. כתוב Marketing Strategy מקיף.
כלול: Market Analysis, ICP (Ideal Customer Profile), Competitive Positioning, Value Proposition, Messaging Framework, Go-to-Market Plan, Channel Strategy, Content Strategy, SEO Keywords & Strategy, Pricing Strategy, Launch Timeline, KPIs & Analytics Plan.
כתוב בעברית.`,
      },
      legal: {
        title: 'Legal & Compliance Summary',
        systemPrompt: `אתה יועץ משפטי מתמחה בטכנולוגיה. כתוב Legal Summary מקיף.
כלול: Open Source License Analysis (risks & obligations), GDPR Data Processing Agreement requirements, Terms of Service key clauses, Privacy Policy requirements, IP Protection recommendations, Data Retention Policy, Third-party API compliance, Risk Matrix.
כתוב בעברית.`,
      },
    };

    const docConfig = DOC_PROMPTS[docType];
    if (!docConfig) return res.status(400).json({ error: `Unknown docType: ${docType}` });

    const userPrompt = `להלן ניירת המחקר שנכתבה על ידי Nexus Virtual Software House:

---
${brief.assembledBrief.slice(0, 12000)}
---

בהתבסס על ניירת זו, כתוב ${docConfig.title} מפורט ומקצועי.`;

    const result = await callAI(
      'docGeneration',
      [
        { role: 'system', content: docConfig.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { adminUserId: admin.id, maxTokens: 4000 }
    );

    res.json({
      docType,
      title: docConfig.title,
      content: result.content,
      tokensUsed: result.tokensIn + result.tokensOut,
      costUsd: result.costUsd,
      model: result.model,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
