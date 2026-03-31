import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __adminDir = path.dirname(fileURLToPath(import.meta.url));
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { and, desc, eq, gte, gt, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { db } from './db';
import {
  adminUsers,
  adminSessions,
  auditLog,
  families,
  familyMembers,
  users,
  patients,
  tasks,
  sessions,
  featureFlags,
  appVersions,
  errorLogs,
  notifications,
  contentPages,
  mediaLibrary,
  aiUsage,
  devColumns,
  devTasks,
  devComments,
  devPhases,
  sprints,
  sprintTasks,
  sprintActivities,
  pipelines,
  pipelineRuns,
  pipelineStages,
  pipelineAlerts,
  adminFinanceEntries,
  adminPlans,
  adminCouponMeta,
  adminAiAnalyses,
  aiAnalysisAttachments,
  vitals,
  labResults,
  referrals,
  patientDiagnoses,
  patientHealthInsights,
  medications,
} from '../../shared/schemas/schema';
import { stripe } from './stripe';
import { analyzePhaseToTasks, type ProposedTask } from './aiPhaseAnalyzer';
import { getNavigationForRole } from './adminNavigationService';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { runProjectAnalysis, runFeaturePlanning, runAskQuestion, runSynthesis } from './projectAnalyzer';
import { getAvailableModels } from './multiProviderAI';
import {
  getDashboardKpis,
  getCostsByModel,
  getModelLeaderboard,
  getAdminAnalysis,
  getAiDevCorrelation,
  getInsights,
  getUsageByModel,
  getExportData,
  parseDateRange,
} from './aiIntelligenceService';
import { storageService } from './services/fileStorage';
import { processFileByUrl, type ProcessedFile } from './services/fileProcessor';

export const adminRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const aiPostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many AI requests, try again later' },
});

const ADMIN_SESSION_COOKIE = 'mr_admin_session';
const SESSION_TTL = 60 * 60 * 8; // 8 hours

export async function getAdminFromRequest(req: Request) {
  // Dev Bypass – only when env + header + non-production
  if (
    process.env.DEV_SKIP_AUTH === '1' &&
    process.env.NODE_ENV !== 'production' &&
    req.headers['x-dev-bypass'] === '1'
  ) {
    return {
      id: 'dev-bypass',
      email: 'dev@local',
      fullName: 'Dev Bypass',
      role: 'super_admin',
    };
  }

  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (!token || typeof token !== 'string' || !token.trim()) return null;

  const now = new Date();
  const rows = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      role: adminUsers.role,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(
      and(
        eq(adminSessions.id, token),
        gt(adminSessions.expiresAt, now),
        eq(adminUsers.isActive, true),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

const MOCK_DEV_ADMIN = { id: 'dev-bypass', email: 'dev@local', fullName: 'Dev Bypass', role: 'super_admin' };

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  getAdminFromRequest(req)
    .then((admin) => {
      if (!admin) {
        res.status(401).json({ error: 'Admin login required' });
        return;
      }
      (req as any).adminUser = admin;
      next();
    })
    .catch((err: any) => {
      if (
        process.env.DEV_SKIP_AUTH === '1' &&
        process.env.NODE_ENV !== 'production' &&
        req.headers['x-dev-bypass'] === '1'
      ) {
        (req as any).adminUser = MOCK_DEV_ADMIN;
        return next();
      }
      console.error('getAdminFromRequest error:', err?.message ?? err);
      const raw = err?.message ?? '';
      const msg =
        err?.code === '42P01'
          ? 'Admin tables missing - run: npm run fix:login'
          : /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection refused/i.test(raw)
            ? 'אין חיבור למסד הנתונים – בדוק DATABASE_URL ב-.env'
            : 'Auth check failed';
      const status = err?.code === '42P01' ? 503 : 500;
      res.status(status).json({ error: msg });
    });
}

function requireSuperAdmin(req: Request, res: Response, next: () => void) {
  const admin = (req as any).adminUser;
  if (!admin || admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Super admin only' });
    return;
  }
  next();
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin Auth
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/health', (_req, res) => {
  res.json({ ok: true, admin: true });
});

// health/tables moved to index.ts (before adminRoutes) – doesn't depend on admin module

adminRoutes.post('/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.email, String(email).trim()), eq(adminUsers.isActive, true)))
      .limit(1);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(String(password), admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const sessionTtl = rememberMe ? 60 * 60 * 24 * 30 : SESSION_TTL; // 30 days or 8 hours
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + sessionTtl * 1000);
    await db.insert(adminSessions).values({
      id: token,
      adminUserId: admin.id,
      expiresAt: expires,
    });
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, admin.id));

    const cookieParts = [
      `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
      `Max-Age=${sessionTtl}`,
    ];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));
    res.json({
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
    });
  } catch (err: any) {
    const raw = String(err?.message ?? err ?? '');
    const code = err?.code;
    // #region agent log
    try { fs.appendFileSync(path.resolve(__adminDir, '../../debug-34d146.log'), JSON.stringify({hypothesisId:'H3',location:'auth/login',message:'DB error',data:{code,msg:raw.slice(0,200)},timestamp:Date.now()})+'\n'); } catch(_){}
    // #endregion
    console.error('Admin login error [code=%s]:', code, raw);
    if (process.env.NODE_ENV !== 'production') console.error('Admin login stack:', err?.stack);
    let msg: string;
    if (err?.code === '42P01') {
      msg = 'Admin tables missing – run: npm run fix:login';
    } else if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection refused/i.test(raw)) {
      msg = 'אין חיבור למסד הנתונים – בדוק DATABASE_URL ב-.env';
    } else if (/prepared statement|pgbouncer|transaction mode|invalid connection|password authentication failed/i.test(raw)) {
      msg = 'שגיאת חיבור ל-DB. אם הסיסמה מכילה @ – קודד ב-URL: @ → %40';
    } else {
      msg = raw || 'Login failed';
    }
    const status = err?.code === '42P01' ? 503 : 500;
    res.status(status).json({ error: msg });
  }
});

adminRoutes.post('/auth/logout', async (req, res) => {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.id, token));
  }
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
  res.json({ ok: true });
});

adminRoutes.post('/auth/refresh', async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin login required' });
  }
  const oldToken = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (oldToken) {
    await db.delete(adminSessions).where(eq(adminSessions.id, oldToken));
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL * 1000);
  await db.insert(adminSessions).values({
    id: token,
    adminUserId: admin.id,
    expiresAt: expires,
  });
  const cookieParts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL}`,
  ];
  if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  res.json(admin);
});

adminRoutes.get('/auth/me', requireAdmin, (req, res) => {
  res.json((req as any).adminUser);
});

adminRoutes.get('/navigation-menu', requireAdmin, (req, res) => {
  const admin = (req as any).adminUser;
  const { sections } = getNavigationForRole(admin.role ?? 'support');
  res.json({ sections });
});

// ──────────────────────────────────────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const [[f], [u], [p], [t]] = await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(families),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(users),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(patients),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(tasks),
    ]);

    res.json({
      families: Number(f?.count ?? 0),
      users: Number(u?.count ?? 0),
      patients: Number(p?.count ?? 0),
      tasks: Number(t?.count ?? 0),
    });
  } catch (err) {
    console.error('stats error:', (err as any)?.message ?? err);
    res.json({ families: 0, users: 0, patients: 0, tasks: 0 });
  }
});

adminRoutes.get('/stats/growth', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const growth = await db.execute(sql`
      WITH dates AS (
        SELECT generate_series(
          date_trunc('day', ${start}::timestamptz),
          date_trunc('day', NOW()),
          '1 day'::interval
        )::date AS d
      ),
      u AS (
        SELECT date_trunc('day', created_at)::date AS d, count(*) AS cnt
        FROM users WHERE created_at >= ${start} GROUP BY 1
      ),
      fam AS (
        SELECT date_trunc('day', created_at)::date AS d, count(*) AS cnt
        FROM families WHERE created_at >= ${start} GROUP BY 1
      ),
      pat AS (
        SELECT date_trunc('day', created_at)::date AS d, count(*) AS cnt
        FROM patients WHERE created_at >= ${start} GROUP BY 1
      )
      SELECT
        dates.d AS date,
        COALESCE(u.cnt, 0)::int AS users,
        COALESCE(fam.cnt, 0)::int AS families,
        COALESCE(pat.cnt, 0)::int AS patients
      FROM dates
      LEFT JOIN u ON dates.d = u.d
      LEFT JOIN fam ON dates.d = fam.d
      LEFT JOIN pat ON dates.d = pat.d
      ORDER BY dates.d
    `);
    res.json(growth.rows);
  } catch (err) {
    console.error('stats/growth error:', (err as any)?.message ?? err);
    res.json([]);
  }
});

adminRoutes.get('/stats/tasks-by-status', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT status AS status, count(*)::int AS count
      FROM tasks
      GROUP BY status
      ORDER BY count DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error('stats/tasks-by-status error:', (err as any)?.message ?? err);
    res.json([]);
  }
});

adminRoutes.get('/stats/users-by-role', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT role AS role, count(*)::int AS count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error('stats/users-by-role error:', (err as any)?.message ?? err);
    res.json([]);
  }
});

adminRoutes.get('/integrations/status', requireAdmin, (_req, res) => {
  res.json({
    googleCalendar: !!(
      process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
    ),
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Families
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/families', requireAdmin, async (req, res) => {
  try {
    const search = (req.query.search as string)?.trim() ?? '';
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;

    const searchCond = search
      ? or(
          ilike(families.familyName, `%${search}%`),
          ilike(families.inviteCode, `%${search}%`),
        )
      : undefined;

    const list = await db
      .select({
        id: families.id,
        familyName: families.familyName,
        inviteCode: families.inviteCode,
        subscriptionTier: families.subscriptionTier,
        createdAt: families.createdAt,
      })
      .from(families)
      .where(searchCond)
      .orderBy(desc(families.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch families' });
  }
});

adminRoutes.get('/families/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [fam] = await db.select().from(families).where(eq(families.id, id)).limit(1);
    if (!fam) return res.status(404).json({ error: 'Family not found' });

    const members = await db
      .select({
        userId: familyMembers.userId,
        role: familyMembers.role,
        memberTier: familyMembers.memberTier,
        joinedAt: familyMembers.joinedAt,
        fullName: users.fullName,
        email: users.email,
      })
      .from(familyMembers)
      .innerJoin(users, eq(familyMembers.userId, users.id))
      .where(eq(familyMembers.familyId, id));

    const patientsList = await db
      .select({ id: patients.id, fullName: patients.fullName, isPrimary: patients.isPrimary })
      .from(patients)
      .where(eq(patients.familyId, id));

    res.json({
      ...fam,
      members,
      patients: patientsList,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch family' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/users', requireAdmin, async (req, res) => {
  try {
    const search = (req.query.search as string)?.trim() ?? '';
    const roleFilter = req.query.role as string;
    const isActiveFilter = req.query.isActive as string;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.fullName, `%${search}%`),
          ilike(families.familyName, `%${search}%`),
        )!,
      );
    }
    if (roleFilter && ['manager', 'caregiver', 'viewer', 'guest'].includes(roleFilter)) {
      conditions.push(eq(users.role, roleFilter));
    }
    if (isActiveFilter === 'true') conditions.push(eq(users.isActive, true));
    else if (isActiveFilter === 'false') conditions.push(eq(users.isActive, false));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        familyId: users.familyId,
        familyName: families.familyName,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(families, eq(users.familyId, families.id))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

adminRoutes.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id } = req.params;
    if (admin.role !== 'super_admin') return res.status(403).json({ error: 'Super admin only' });

    const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!u) return res.status(404).json({ error: 'User not found' });

    const body = req.body ?? {};
    const update = {};
    if (body.isActive !== undefined) (update as any).isActive = Boolean(body.isActive);
    if (body.role !== undefined && ['manager', 'caregiver', 'viewer', 'guest'].includes(body.role)) (update as any).role = body.role;

    if (Object.keys(update).length === 0) return res.json(u);

    const [updated] = await db.update(users).set(update as any).where(eq(users.id, id)).returning();
    try {
      await logAudit(req, admin.id, 'user_update', 'user', id, { isActive: u.isActive, role: u.role }, update as object, id);
    } catch (_) {}
    const { passwordHash: _ph, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

adminRoutes.post('/users/:id/reset-password', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { newPassword } = req.body ?? {};
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'newPassword required (min 6 chars)' });
    }

    const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!u) return res.status(404).json({ error: 'User not found' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, id));
    try {
      await logAudit(req, admin.id, 'user_reset_password', 'user', id, undefined, undefined, id);
    } catch (_) {}
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reset password failed' });
  }
});

adminRoutes.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!u) return res.status(404).json({ error: 'User not found' });

    const memberships = await db
      .select({
        familyId: familyMembers.familyId,
        role: familyMembers.role,
        memberTier: familyMembers.memberTier,
        joinedAt: familyMembers.joinedAt,
        familyName: families.familyName,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(eq(familyMembers.userId, id));

    const { passwordHash: _ph, ...safeUser } = u;
    res.json({ ...safeUser, memberships });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Impersonation (super_admin only)
// ──────────────────────────────────────────────────────────────────────────────

async function logAudit(
  req: Request,
  adminId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  oldVal?: object,
  newVal?: object,
  affectedUserId?: string
) {
  try {
    await db.insert(auditLog).values({
      adminUserId: adminId,
      userId: affectedUserId ?? null,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      oldValue: oldVal ?? null,
      newValue: newVal ?? null,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? null,
    });
  } catch (e) {
    console.error('audit log failed:', e);
  }
}

adminRoutes.post('/users/:id/impersonate', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id: userId } = req.params;
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    await logAudit(req, admin.id, 'impersonate', 'user', userId, undefined, { email: targetUser.email }, userId);

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 2 * 1000); // 2 hours
    await db.insert(sessions).values({
      id: token,
      userId: targetUser.id,
      expiresAt: expires,
    });

    const SESSION_COOKIE = 'mr_session';
    const cookieParts = [
      `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
      'Max-Age=7200',
    ];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));
    res.json({
      ok: true,
      message: 'Redirect to app',
      redirectUrl: '/dashboard',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impersonation failed' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Subscriptions (Phase 3 – מקור: families.subscriptionTier, Stripe)
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/subscriptions', requireAdmin, async (req, res) => {
  try {
    const list = await db
      .select({
        id: families.id,
        familyName: families.familyName,
        subscriptionTier: families.subscriptionTier,
        stripeCustomerId: families.stripeCustomerId,
        stripeSubscriptionId: families.stripeSubscriptionId,
        createdAt: families.createdAt,
      })
      .from(families)
      .orderBy(desc(families.createdAt))
      .limit(200);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

adminRoutes.get('/subscriptions/:familyId', requireAdmin, async (req, res) => {
  try {
    const { familyId } = req.params;
    const [f] = await db
      .select({
        id: families.id,
        familyName: families.familyName,
        subscriptionTier: families.subscriptionTier,
        stripeCustomerId: families.stripeCustomerId,
        stripeSubscriptionId: families.stripeSubscriptionId,
      })
      .from(families)
      .where(eq(families.id, familyId))
      .limit(1);
    if (!f) return res.status(404).json({ error: 'Family not found' });
    res.json(f);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Plans – ניהול מסלולים ותמחור (admin_plans + Stripe)
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/plans', requireAdmin, async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(adminPlans)
      .orderBy(adminPlans.displayOrder, adminPlans.createdAt);
    const result: Array<Record<string, unknown>> = [];
    for (const p of plans) {
      const item: Record<string, unknown> = {
        id: p.id,
        slug: p.slug,
        nameHe: p.nameHe,
        descriptionHe: p.descriptionHe,
        features: p.features ?? [],
        displayOrder: p.displayOrder,
        isActive: p.isActive,
        stripeProductId: p.stripeProductId,
        stripePriceIdMonthly: p.stripePriceIdMonthly,
        stripePriceIdYearly: p.stripePriceIdYearly,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
      if (stripe && p.stripeProductId) {
        try {
          const product = await stripe.products.retrieve(p.stripeProductId);
          const prices = await stripe.prices.list({ product: p.stripeProductId, active: true });
          item.stripeProduct = { id: product.id, name: product.name };
          item.stripePrices = prices.data.map((pr) => ({
            id: pr.id,
            unitAmount: pr.unit_amount,
            currency: pr.currency,
            recurring: pr.recurring,
          }));
        } catch (_) {
          item.stripeError = 'Product not found in Stripe';
        }
      }
      result.push(item);
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

adminRoutes.get('/plans/sync', requireAdmin, async (_req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const products = await stripe.products.list({ active: true });
    const existing = await db.select({ stripeProductId: adminPlans.stripeProductId }).from(adminPlans);
    const existingIds = new Set((existing.map((e) => e.stripeProductId)).filter(Boolean));
    const suggested: Array<Record<string, unknown>> = [];
    for (const prod of products.data) {
      if (existingIds.has(prod.id)) continue;
      const prices = await stripe.prices.list({ product: prod.id, active: true });
      suggested.push({
        stripeProductId: prod.id,
        name: prod.name,
        prices: prices.data.map((p) => ({ id: p.id, unitAmount: p.unit_amount, currency: p.currency, recurring: p.recurring })),
      });
    }
    res.json({ suggested, count: suggested.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to sync from Stripe' });
  }
});

adminRoutes.post('/plans', requireAdmin, async (req, res) => {
  try {
    const body = req.body ?? {};
    const {
      slug,
      nameHe,
      descriptionHe,
      features,
      displayOrder,
      stripeProductId,
      stripePriceIdMonthly,
      stripePriceIdYearly,
    } = body;
    if (!slug || !nameHe) return res.status(400).json({ error: 'slug and nameHe required' });
    const [plan] = await db
      .insert(adminPlans)
      .values({
        slug: String(slug).toLowerCase().replace(/\s+/g, '_'),
        nameHe: String(nameHe),
        descriptionHe: descriptionHe ? String(descriptionHe) : null,
        features: Array.isArray(features) ? features : [],
        displayOrder: Number(displayOrder) || 0,
        stripeProductId: stripeProductId || null,
        stripePriceIdMonthly: stripePriceIdMonthly || null,
        stripePriceIdYearly: stripePriceIdYearly || null,
      })
      .returning();
    res.status(201).json(plan);
  } catch (err: any) {
    if (err?.code === '23505') return res.status(400).json({ error: 'Plan with this slug already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

adminRoutes.patch('/plans/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (body.nameHe !== undefined) updates.nameHe = String(body.nameHe);
    if (body.descriptionHe !== undefined) updates.descriptionHe = body.descriptionHe == null ? null : String(body.descriptionHe);
    if (body.features !== undefined) updates.features = Array.isArray(body.features) ? body.features : [];
    if (body.displayOrder !== undefined) updates.displayOrder = Number(body.displayOrder) ?? 0;
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
    if (body.stripePriceIdMonthly !== undefined) updates.stripePriceIdMonthly = body.stripePriceIdMonthly || null;
    if (body.stripePriceIdYearly !== undefined) updates.stripePriceIdYearly = body.stripePriceIdYearly || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    (updates as any).updatedAt = new Date();
    const [plan] = await db.update(adminPlans).set(updates as any).where(eq(adminPlans.id, id)).returning();
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Coupons – קודי קופון (Stripe Coupons + Promotion Codes + admin_coupon_meta)
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/coupons', requireAdmin, async (req, res) => {
  try {
    const source = req.query.source as string | undefined;
    const metaList = await db
      .select()
      .from(adminCouponMeta)
      .where(source ? eq(adminCouponMeta.source, source) : undefined)
      .orderBy(desc(adminCouponMeta.createdAt));
    const result: Array<Record<string, unknown>> = [];
    for (const m of metaList) {
      const item: Record<string, unknown> = {
        id: m.id,
        stripePromotionCodeId: m.stripePromotionCodeId,
        source: m.source,
        campaignName: m.campaignName,
        notes: m.notes,
        createdAt: m.createdAt,
      };
      if (stripe) {
        try {
          const pc = await stripe.promotionCodes.retrieve(m.stripePromotionCodeId);
          if (pc) {
            const coupon = pc.coupon as any;
            item.code = pc.code;
            item.active = pc.active;
            item.percentOff = coupon?.percent_off;
            item.amountOff = coupon?.amount_off;
            item.currency = coupon?.currency;
            item.timesRedeemed = pc.times_redeemed;
            item.maxRedemptions = pc.max_redemptions;
            item.expiresAt = pc.expires_at ? new Date(pc.expires_at * 1000) : null;
          }
        } catch (_) {
          item.stripeError = 'Promotion code not found';
        }
      }
      result.push(item);
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

adminRoutes.post('/coupons', requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const body = req.body ?? {};
    const { code, percentOff, amountOff, currency, duration, durationInMonths, maxRedemptions, expiresAt, source, campaignName, notes } = body;
    if (!code || (percentOff == null && amountOff == null)) {
      return res.status(400).json({ error: 'code and (percentOff or amountOff) required' });
    }
    const couponParams: Record<string, unknown> = {
      duration: duration || 'once',
      ...(percentOff != null && { percent_off: Number(percentOff) }),
      ...(amountOff != null && { amount_off: Number(amountOff), currency: (currency || 'ils').toLowerCase() }),
      ...(duration === 'repeating' && durationInMonths && { duration_in_months: Number(durationInMonths) }),
    };
    const coupon = await stripe.coupons.create(couponParams as any);
    const promoParams: Record<string, unknown> = {
      coupon: coupon.id,
      code: String(code).toUpperCase().replace(/\s/g, ''),
      ...(maxRedemptions != null && { max_redemptions: Number(maxRedemptions) }),
      ...(expiresAt && { expires_at: Math.floor(new Date(expiresAt).getTime() / 1000) }),
    };
    const promotionCode = await stripe.promotionCodes.create(promoParams as any);
    const [meta] = await db
      .insert(adminCouponMeta)
      .values({
        stripePromotionCodeId: promotionCode.id,
        source: ['newsletter', 'social', 'partner', 'other'].includes(source) ? source : 'other',
        campaignName: campaignName || null,
        notes: notes || null,
      })
      .returning();
    res.status(201).json({
      id: meta.id,
      stripePromotionCodeId: promotionCode.id,
      code: promotionCode.code,
      source: meta.source,
      campaignName: meta.campaignName,
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off,
      currency: coupon.currency,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message ?? 'Failed to create coupon' });
  }
});

adminRoutes.patch('/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const [meta] = await db.select().from(adminCouponMeta).where(eq(adminCouponMeta.id, id)).limit(1);
    if (!meta) return res.status(404).json({ error: 'Coupon meta not found' });
    const updates: Record<string, unknown> = {};
    if (body.source !== undefined) updates.source = ['newsletter', 'social', 'partner', 'other'].includes(body.source) ? body.source : meta.source;
    if (body.campaignName !== undefined) updates.campaignName = body.campaignName ?? null;
    if (body.notes !== undefined) updates.notes = body.notes ?? null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const [updated] = await db.update(adminCouponMeta).set(updates).where(eq(adminCouponMeta.id, id)).returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

adminRoutes.delete('/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [meta] = await db.select().from(adminCouponMeta).where(eq(adminCouponMeta.id, id)).limit(1);
    if (!meta) return res.status(404).json({ error: 'Coupon meta not found' });
    await db.delete(adminCouponMeta).where(eq(adminCouponMeta.id, id));
    if (stripe) {
      try {
        await stripe.promotionCodes.update(meta.stripePromotionCodeId, { active: false });
      } catch (_) {
        // Promotion code might already be invalid
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// GET /admin/promotions – list Stripe coupons (for display as "מבצעים")
adminRoutes.get('/promotions', requireAdmin, async (_req, res) => {
  try {
    if (!stripe) return res.json([]);
    const coupons = await stripe.coupons.list({ limit: 100 });
    const result = coupons.data.map((c) => ({
      id: c.id,
      name: c.name,
      percentOff: c.percent_off,
      amountOff: c.amount_off,
      currency: c.currency,
      duration: c.duration,
      durationInMonths: c.duration_in_months,
      valid: c.valid,
      timesRedeemed: c.times_redeemed,
      maxRedemptions: c.max_redemptions,
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Logs & Audit
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/logs', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const conditions = [];
    if (from) conditions.push(gte(auditLog.createdAt, new Date(from)));
    if (to) conditions.push(lte(auditLog.createdAt, new Date(to)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select()
      .from(auditLog)
      .where(where as any)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(list);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

adminRoutes.get('/audit', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    const action = req.query.action as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const conditions = [];
    if (action) conditions.push(eq(auditLog.action, action));
    if (from) conditions.push(gte(auditLog.createdAt, new Date(from)));
    if (to) conditions.push(lte(auditLog.createdAt, new Date(to)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select()
      .from(auditLog)
      .where(where as any)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(list);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Feature flags
adminRoutes.get('/feature-flags', async (req, res) => {
  try {
    const list = await db.select().from(featureFlags).orderBy(featureFlags.key);
    res.json(list);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

adminRoutes.patch('/feature-flags/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { enabled, description } = req.body;
    const [row] = await db
      .update(featureFlags)
      .set({
        enabled: typeof enabled === 'boolean' ? enabled : undefined,
        description: typeof description === 'string' ? description : undefined,
        updatedAt: new Date(),
      } as any)
      .where(eq(featureFlags.key, key))
      .returning();
    if (!row) return res.status(404).json({ error: 'Feature flag not found' });
    res.json(row);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(404).json({ error: 'Feature flag not found' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

adminRoutes.post('/feature-flags', async (req, res) => {
  try {
    const { key, enabled, description } = req.body;
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key required' });
    const [row] = await db
      .insert(featureFlags)
      .values({
        key: key.trim(),
        enabled: Boolean(enabled),
        description: typeof description === 'string' ? description : undefined,
      })
      .returning();
    res.status(201).json(row);
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: 'Feature flag already exists' });
    if (err?.code === '42P01') return res.status(503).json({ error: 'Feature flags table not available' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create feature flag' });
  }
});

// Data Center - DB stats
adminRoutes.get('/data-center/stats', requireAdmin, async (_req, res) => {
  try {
    const tables = ['families', 'users', 'patients', 'tasks', 'family_members', 'sessions', 'notifications'];
    const counts = await Promise.all(
      tables.map(async (t) => {
        try {
          const [row] = await db.execute(sql`SELECT count(*)::int AS cnt FROM ${sql.identifier(t)}`);
          return { table: t, count: (row as any)?.cnt ?? 0 };
        } catch {
          return { table: t, count: 0 };
        }
      }),
    );
    const dbSize = await db.execute(sql`SELECT pg_database_size(current_database())::bigint AS size`);
    const sizeBytes = (dbSize.rows[0] as any)?.size ?? 0;
    res.json({ tables: counts, dbSizeBytes: Number(sizeBytes) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch DB stats' });
  }
});

// Data Center - Export
adminRoutes.get('/data-center/export/:entity', requireAdmin, async (req, res) => {
  try {
    const { entity } = req.params;
    const format = (req.query.format as string) ?? 'json';
    const from = req.query.from as string;
    const to = req.query.to as string;

    let data: any[] = [];
    if (entity === 'families') {
      data = await db.select().from(families).limit(1000);
    } else if (entity === 'users') {
      data = await db.select().from(users).limit(1000);
    } else if (entity === 'tasks') {
      let q = db.select().from(tasks).limit(1000);
      if (from) q = q.where(gte(tasks.createdAt, new Date(from))) as any;
      if (to) q = q.where(lte(tasks.createdAt, new Date(to))) as any;
      data = await q;
    } else {
      return res.status(400).json({ error: 'Invalid entity' });
    }

    if (format === 'csv') {
      if (data.length === 0) return res.send('');
      const keys = Object.keys(data[0]);
      const csv = [
        keys.join(','),
        ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${entity}_export.csv"`);
      return res.send(csv);
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// QA - Error logs
adminRoutes.get('/qa/errors', requireAdmin, async (req, res) => {
  try {
    const level = req.query.level as string;
    const resolved = req.query.resolved as string;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const conditions = [];
    if (level && ['error', 'warn', 'info'].includes(level)) conditions.push(eq(errorLogs.level, level));
    if (resolved === 'true') conditions.push(eq(errorLogs.resolved, true));
    else if (resolved === 'false') conditions.push(eq(errorLogs.resolved, false));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select()
      .from(errorLogs)
      .where(where as any)
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(list);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

adminRoutes.patch('/qa/errors/:id', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { resolved } = req.body;
    if (typeof resolved !== 'boolean') return res.status(400).json({ error: 'resolved (boolean) required' });
    const [row] = await db
      .update(errorLogs)
      .set({
        resolved,
        resolvedBy: resolved ? admin.id : null,
        resolvedAt: resolved ? new Date() : null,
      })
      .where(eq(errorLogs.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: 'Error log not found' });
    res.json(row);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(404).json({ error: 'Error log not found' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update error log' });
  }
});

// Communication - Send notification to users/families
adminRoutes.post('/communication/send', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { target, targetIds, title, body, type, priority } = req.body;
    if (!target || !['all', 'users', 'families'].includes(target)) {
      return res.status(400).json({ error: 'target required (all|users|families)' });
    }
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });

    let userIds: string[] = [];
    if (target === 'all') {
      const allUsers = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));
      userIds = allUsers.map((u) => u.id);
    } else if (target === 'users' && Array.isArray(targetIds)) {
      userIds = targetIds;
    } else if (target === 'families' && Array.isArray(targetIds)) {
      const members = await db
        .select({ userId: familyMembers.userId })
        .from(familyMembers)
        .where(sql`${familyMembers.familyId} = ANY(${targetIds})`);
      userIds = members.map((m) => m.userId);
    }

    if (userIds.length === 0) return res.status(400).json({ error: 'No recipients found' });

    const values = userIds.map((uid) => ({
      userId: uid,
      title: String(title),
      body: String(body),
      type: type ?? 'system',
      priority: priority ?? 'normal',
    }));
    await db.insert(notifications).values(values);
    res.json({ ok: true, sent: userIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// Settings - Admin users list
adminRoutes.get('/settings/admins', requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
    res.json(list.map(({ passwordHash: _ph, ...a }) => a));
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// Settings - Create admin user
adminRoutes.post('/settings/admins', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hash = await bcrypt.hash(String(password), 10);
    const [row] = await db
      .insert(adminUsers)
      .values({
        email: String(email).trim().toLowerCase(),
        passwordHash: hash,
        fullName: fullName ? String(fullName).trim() : null,
        role: ['super_admin', 'admin'].includes(role) ? role : 'admin',
        isActive: true,
      })
      .returning();
    res.status(201).json({ id: row.id, email: row.email, fullName: row.fullName, role: row.role });
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: 'כתובת האימייל כבר קיימת' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Content - Pages (CMS)
adminRoutes.get('/content/pages', requireAdmin, async (req, res) => {
  try {
    const locale = req.query.locale as string;
    const published = req.query.published as string;
    const conditions = [];
    if (locale) conditions.push(eq(contentPages.locale, locale));
    if (published === 'true') conditions.push(eq(contentPages.published, true));
    else if (published === 'false') conditions.push(eq(contentPages.published, false));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const list = await db.select().from(contentPages).where(where as any).orderBy(desc(contentPages.updatedAt));
    res.json(list);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

adminRoutes.post('/content/pages', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { slug, title, content, metaDescription, published, locale } = req.body;
    if (!slug || !title) return res.status(400).json({ error: 'slug and title required' });
    const [row] = await db
      .insert(contentPages)
      .values({
        slug: String(slug).trim(),
        title: String(title).trim(),
        content: content ?? '',
        metaDescription: metaDescription ?? null,
        published: Boolean(published),
        locale: locale ?? 'he',
        updatedBy: admin.id,
      })
      .returning();
    res.status(201).json(row);
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    if (err?.code === '42P01') return res.status(503).json({ error: 'Content pages table not available' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

adminRoutes.patch('/content/pages/:id', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { title, content, metaDescription, published } = req.body;
    const update: any = { updatedBy: admin.id, updatedAt: new Date() };
    if (title) update.title = String(title).trim();
    if (content !== undefined) update.content = content;
    if (metaDescription !== undefined) update.metaDescription = metaDescription;
    if (typeof published === 'boolean') update.published = published;
    const [row] = await db.update(contentPages).set(update).where(eq(contentPages.id, id)).returning();
    if (!row) return res.status(404).json({ error: 'Page not found' });
    res.json(row);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(404).json({ error: 'Page not found' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Content - Media library
adminRoutes.get('/content/media', requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt)).limit(200);
    res.json(list);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// AI - Provider status + models for Admin UI
adminRoutes.get('/ai/providers', requireAdmin, (_req, res) => {
  const models = getAvailableModels();
  res.json({
    anthropic: !!(process.env.ANTHROPIC_API_KEY?.trim()),
    openai: !!(process.env.OPENAI_API_KEY?.trim()),
    google: !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()),
    perplexity: !!(process.env.PERPLEXITY_API_KEY?.trim()),
    resend: !!(process.env.RESEND_API_KEY?.trim()),
    models,
  });
});

// AI - Usage stats
adminRoutes.get('/ai/usage', requireAdmin, async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const usage = await db
      .select()
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, start))
      .orderBy(desc(aiUsage.createdAt))
      .limit(500);

    const totalTokens = usage.reduce((sum, u) => sum + (u.tokensUsed ?? 0), 0);
    const totalCost = usage.reduce((sum, u) => sum + parseFloat(u.costUsd ?? '0'), 0);
    const byModel = usage.reduce((acc, u) => {
      acc[u.model] = (acc[u.model] || 0) + (u.tokensUsed ?? 0);
      return acc;
    }, {} as Record<string, number>);

    res.json({ usage, totalTokens, totalCost, byModel });
  } catch (err: any) {
    if (err?.code === '42P01') return res.json({ usage: [], totalTokens: 0, totalCost: 0, byModel: {} });
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch AI usage' });
  }
});

// AI Intelligence Hub – KPIs, costs, leaderboard, insights (no rate limit)
const getIntelligenceRange = (req: Request) =>
  parseDateRange(
    Number(req.query.days) || 30,
    req.query.dateFrom as string,
    req.query.dateTo as string
  );

adminRoutes.get('/ai/intelligence/dashboard', requireAdmin, async (req, res) => {
  try {
    const kpis = await getDashboardKpis(getIntelligenceRange(req));
    res.json(kpis);
  } catch (err: any) {
    console.error('[ai/intelligence/dashboard]', err?.message ?? err);
    return res.json({ totalCost: 0, totalTokens: 0, totalCalls: 0, totalAnalyses: 0 });
  }
});

adminRoutes.get('/ai/intelligence/costs', requireAdmin, async (req, res) => {
  try {
    const byEndpoint = req.query.byEndpoint === 'true';
    const byAdmin = req.query.byAdmin === 'true';
    const costs = await getCostsByModel(getIntelligenceRange(req), { byEndpoint, byAdmin });
    res.json(costs);
  } catch (err: any) {
    console.error('[ai/intelligence/costs]', err?.message ?? err);
    return res.json([]);
  }
});

adminRoutes.get('/ai/intelligence/leaderboard', requireAdmin, async (req, res) => {
  try {
    const leaderboard = await getModelLeaderboard(getIntelligenceRange(req));
    res.json(leaderboard);
  } catch (err: any) {
    console.error('[ai/intelligence/leaderboard]', err?.message ?? err);
    return res.json([]);
  }
});

adminRoutes.get('/ai/intelligence/admin-analysis', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const adminUserId = admin?.role === 'super_admin' ? (req.query.adminId as string) || undefined : admin?.id;
    const data = await getAdminAnalysis(getIntelligenceRange(req), adminUserId ?? undefined);
    res.json(data);
  } catch (err: any) {
    console.error('[ai/intelligence/admin-analysis]', err?.message ?? err);
    return res.json([]);
  }
});

adminRoutes.get('/ai/intelligence/ai-dev-correlation', requireAdmin, async (req, res) => {
  try {
    const data = await getAiDevCorrelation(getIntelligenceRange(req));
    res.json(data);
  } catch (err: any) {
    console.error('[ai/intelligence/ai-dev-correlation]', err?.message ?? err);
    return res.json({ analysesCount: 0, aiGeneratedTasksCount: 0, completedTasksCount: 0, completionRate: 0 });
  }
});

adminRoutes.get('/ai/intelligence/insights', requireAdmin, async (req, res) => {
  try {
    const insights = await getInsights(getIntelligenceRange(req));
    res.json(insights);
  } catch (err: any) {
    console.error('[ai/intelligence/insights]', err?.message ?? err);
    return res.json([]);
  }
});

adminRoutes.get('/ai/intelligence/usage-by-model', requireAdmin, async (req, res) => {
  try {
    const data = await getUsageByModel(getIntelligenceRange(req));
    res.json(data);
  } catch (err: any) {
    console.error('[ai/intelligence/usage-by-model]', err?.message ?? err);
    return res.json([]);
  }
});

adminRoutes.get('/ai/intelligence/export', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    if (admin?.role !== 'super_admin') return res.status(403).json({ error: 'Super admin only' });
    const rows = await getExportData(getIntelligenceRange(req));
    const header = 'id,model,tokens_used,cost_usd,endpoint,created_at\n';
    const csv = header + rows.map((r) =>
      `${r.id},${r.model},${r.tokensUsed ?? 0},${r.costUsd ?? '0'},${(r.endpoint ?? '').replace(/,/g, ';')},${r.createdAt?.toISOString() ?? ''}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ai-usage-export.csv"');
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    console.error('[ai/intelligence/export]', err);
    res.status(500).json({ error: err?.message ?? 'שגיאה' });
  }
});

// AI - Serve attachment file (protected)
adminRoutes.get('/ai/attachments/:mediaId/serve', requireAdmin, async (req, res) => {
  try {
    const { mediaId } = req.params;
    const [media] = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, mediaId)).limit(1);
    if (!media) return res.status(404).json({ error: 'לא נמצא' });
    const buffer = await storageService.getBuffer(media.url);
    res.setHeader('Content-Type', media.mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(media.originalName)}"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('[ai/attachments/serve]', err);
    res.status(500).json({ error: err?.message ?? 'שגיאה' });
  }
});

// AI - Upload attachment for analysis (multipart)
adminRoutes.post('/ai/upload-attachment', aiPostLimiter, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'לא נבחר קובץ. העלה קובץ בשדה file.' });
    }
    const { buffer, originalname, mimetype, size } = file;
    const { filename, url } = await storageService.save(buffer, originalname, mimetype);
    const processed = await processFileForAI(buffer, mimetype, originalname);
    const [media] = await db
      .insert(mediaLibrary)
      .values({
        filename,
        originalName: originalname,
        mimeType: mimetype,
        sizeBytes: size,
        url,
        uploadedBy: admin?.id ?? null,
      })
      .returning();
    res.json({
      mediaId: media.id,
      url: `/api/admin/ai/attachments/${media.id}/serve`,
      originalName: originalname,
      mimeType: mimetype,
      sizeBytes: size,
      type: processed.type,
    });
  } catch (err: any) {
    console.error('[ai/upload-attachment]', err);
    res.status(500).json({ error: err?.message ?? 'העלאת הקובץ נכשלה' });
  }
});

async function loadAttachmentsFromMediaIds(mediaIds: string[]): Promise<ProcessedFile[]> {
  if (!mediaIds?.length) return [];
  const ids = mediaIds.slice(0, 5).filter((id) => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) return [];
  const list = await db.select().from(mediaLibrary).where(inArray(mediaLibrary.id, ids));
  const results: ProcessedFile[] = [];
  for (const m of list) {
    try {
      const processed = await processFileByUrl(m.url, m.mimeType ?? 'application/octet-stream', m.originalName);
      results.push(processed);
    } catch (err) {
      console.error('[loadAttachments]', m.id, err);
    }
  }
  return results;
}

// AI - Create admin_ai_analyses table if missing (no FK to avoid schema issues)
adminRoutes.post('/ai/create-tables', requireAdmin, async (_req, res) => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "admin_ai_analyses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "type" varchar(32) NOT NULL,
        "query" text,
        "report" text NOT NULL,
        "depth" varchar(16),
        "scope" varchar(16),
        "model" varchar(64),
        "tokens_used" integer DEFAULT 0,
        "cost_usd" varchar(24) DEFAULT '0',
        "admin_user_id" uuid,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`ALTER TABLE "admin_ai_analyses" ADD COLUMN IF NOT EXISTS "attached_file_ids" uuid[] DEFAULT '{}'`);
    await db.execute(sql`ALTER TABLE "admin_ai_analyses" ADD COLUMN IF NOT EXISTS "admin_full_name" varchar(255)`);
    await db.execute(sql`ALTER TABLE "admin_ai_analyses" ADD COLUMN IF NOT EXISTS "analysis_metadata" jsonb DEFAULT '{}'`);
    await db.execute(sql`ALTER TABLE "admin_ai_analyses" ADD COLUMN IF NOT EXISTS "output_quality" integer`);
    await db.execute(sql`ALTER TABLE "admin_ai_analyses" ADD COLUMN IF NOT EXISTS "dev_quality" integer`);
    await db.execute(sql`ALTER TABLE "admin_ai_analyses" ADD COLUMN IF NOT EXISTS "process_speed" varchar(16)`);
    await db.execute(sql`ALTER TABLE "admin_ai_analyses" ADD COLUMN IF NOT EXISTS "rated_at" timestamp with time zone`);
    await db.execute(sql`ALTER TABLE "admin_ai_analyses" ADD COLUMN IF NOT EXISTS "rated_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS "ai_analysis_attachments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "analysis_id" uuid NOT NULL REFERENCES "admin_ai_analyses"("id") ON DELETE CASCADE,
      "media_id" uuid REFERENCES "media_library"("id") ON DELETE SET NULL,
      "file_role" varchar(64) DEFAULT 'context',
      "processing_method" varchar(64) DEFAULT 'vision',
      "tokens_used" integer DEFAULT 0,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "admin_ai_analyses_type_idx" ON "admin_ai_analyses"("type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "admin_ai_analyses_admin_user_idx" ON "admin_ai_analyses"("admin_user_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "admin_ai_analyses_created_at_idx" ON "admin_ai_analyses"("created_at")`);
    res.json({ ok: true, message: 'טבלת admin_ai_analyses נוצרה בהצלחה' });
  } catch (err: any) {
    console.error('[ai/create-tables]', err);
    res.status(500).json({ error: err?.message ?? 'יצירת הטבלה נכשלה' });
  }
});

// AI - Project analysis – saves to archive
adminRoutes.post('/ai/project-analyze', aiPostLimiter, requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { depth = 'deep', scope = 'all', models, attachmentIds, focus } = req.body ?? {};
    const validDepth = ['quick', 'deep', 'full'].includes(String(depth)) ? depth : 'deep';
    const validScope = ['all', 'client', 'server'].includes(String(scope)) ? scope : 'all';
    const validModels = Array.isArray(models) ? models.filter((m: string) => ['claude', 'openai', 'gemini', 'gemini31', 'perplexity'].includes(m)).slice(0, 2) : undefined;
    const mediaIds = Array.isArray(attachmentIds) ? attachmentIds.filter((x: unknown) => typeof x === 'string') : [];
    const attachments = await loadAttachmentsFromMediaIds(mediaIds);

    const response = await runProjectAnalysis({
      depth: validDepth,
      scope: validScope,
      models: validModels,
      attachments,
      focus: typeof focus === 'string' ? focus : undefined,
      adminUserId: admin?.id ?? null,
    });

    const baseValues = {
      type: 'project_analysis' as const,
      depth: validDepth,
      scope: validScope,
      adminUserId: admin?.id ?? null,
      adminFullName: admin?.fullName ?? null,
      attachedFileIds: mediaIds,
    };

    if ('multiple' in response) {
      const saved = await Promise.all(
        response.multiple.map((r) =>
          db.insert(adminAiAnalyses).values({
            ...baseValues,
            report: r.report,
            model: r.model,
            tokensUsed: r.tokensUsed,
            costUsd: String(r.costUsd.toFixed(6)),
          }).returning()
        )
      );
      for (let i = 0; i < saved.length; i++) {
        const aid = saved[i][0]?.id;
        if (aid && mediaIds.length) {
          await db.insert(aiAnalysisAttachments).values(mediaIds.map((mid) => ({ analysisId: aid, mediaId: mid })));
        }
      }
      return res.json({ results: response.multiple.map((r, i) => ({ ...r, id: saved[i][0]?.id })) });
    }

    const [saved] = await db.insert(adminAiAnalyses).values({
      ...baseValues,
      report: response.single.report,
      model: response.single.model,
      tokensUsed: response.single.tokensUsed,
      costUsd: String(response.single.costUsd.toFixed(6)),
    }).returning();

    if (saved?.id && mediaIds.length) {
      await db.insert(aiAnalysisAttachments).values(mediaIds.map((mid) => ({ analysisId: saved.id, mediaId: mid })));
    }

    res.json({
      id: saved.id,
      report: response.single.report,
      model: response.single.model,
      tokensUsed: response.single.tokensUsed,
      costUsd: response.single.costUsd,
    });
  } catch (err: any) {
    console.error('[ai/project-analyze]', err);
    const msg = err?.message ?? 'ניתוח הפרויקט נכשל';
    res.status(500).json({ error: msg });
  }
});

// AI - Feature planning (PRD, ERD, costs, security)
adminRoutes.post('/ai/feature-planning', aiPostLimiter, requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { query, depth = 'deep', scope = 'all', models, attachmentIds } = req.body ?? {};
    const validDepth = ['quick', 'deep', 'full'].includes(String(depth)) ? depth : 'deep';
    const validScope = ['all', 'client', 'server'].includes(String(scope)) ? scope : 'all';
    const validModels = Array.isArray(models) ? models.filter((m: string) => ['claude', 'openai', 'gemini', 'gemini31', 'perplexity'].includes(m)).slice(0, 2) : undefined;
    const queryStr = typeof query === 'string' ? query : '';
    const mediaIds = Array.isArray(attachmentIds) ? attachmentIds.filter((x: unknown) => typeof x === 'string') : [];
    const attachments = await loadAttachmentsFromMediaIds(mediaIds);

    const response = await runFeaturePlanning({
      query: queryStr,
      depth: validDepth,
      scope: validScope,
      models: validModels,
      attachments,
      adminUserId: admin?.id ?? null,
    });

    const baseValues = {
      type: 'feature_planning' as const,
      query: queryStr || null,
      depth: validDepth,
      scope: validScope,
      adminUserId: admin?.id ?? null,
      adminFullName: admin?.fullName ?? null,
      attachedFileIds: mediaIds,
    };

    if ('multiple' in response) {
      const saved = await Promise.all(
        response.multiple.map((r) =>
          db.insert(adminAiAnalyses).values({
            ...baseValues,
            report: r.report,
            model: r.model,
            tokensUsed: r.tokensUsed,
            costUsd: String(r.costUsd.toFixed(6)),
          }).returning()
        )
      );
      for (let i = 0; i < saved.length; i++) {
        const aid = saved[i][0]?.id;
        if (aid && mediaIds.length) {
          await db.insert(aiAnalysisAttachments).values(mediaIds.map((mid) => ({ analysisId: aid, mediaId: mid })));
        }
      }
      return res.json({ results: response.multiple.map((r, i) => ({ ...r, id: saved[i][0]?.id })) });
    }

    const [saved] = await db.insert(adminAiAnalyses).values({
      ...baseValues,
      report: response.single.report,
      model: response.single.model,
      tokensUsed: response.single.tokensUsed,
      costUsd: String(response.single.costUsd.toFixed(6)),
    }).returning();

    if (saved?.id && mediaIds.length) {
      await db.insert(aiAnalysisAttachments).values(mediaIds.map((mid) => ({ analysisId: saved.id, mediaId: mid })));
    }

    res.json({
      id: saved.id,
      report: response.single.report,
      model: response.single.model,
      tokensUsed: response.single.tokensUsed,
      costUsd: response.single.costUsd,
    });
  } catch (err: any) {
    console.error('[ai/feature-planning]', err);
    const msg = err?.message ?? 'תכנון הפיצ\'ר נכשל';
    res.status(500).json({ error: msg });
  }
});

// AI - Ask question
adminRoutes.post('/ai/ask-question', aiPostLimiter, requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { query, depth = 'deep', scope = 'all', models, attachmentIds } = req.body ?? {};
    const validDepth = ['quick', 'deep', 'full'].includes(String(depth)) ? depth : 'deep';
    const validScope = ['all', 'client', 'server'].includes(String(scope)) ? scope : 'all';
    const validModels = Array.isArray(models) ? models.filter((m: string) => ['claude', 'openai', 'gemini', 'gemini31', 'perplexity'].includes(m)).slice(0, 2) : undefined;
    const question = typeof query === 'string' ? query.trim() : '';
    if (!question) return res.status(400).json({ error: 'שאלה נדרשת' });
    const mediaIds = Array.isArray(attachmentIds) ? attachmentIds.filter((x: unknown) => typeof x === 'string') : [];
    const attachments = await loadAttachmentsFromMediaIds(mediaIds);

    const response = await runAskQuestion({
      query: question,
      depth: validDepth,
      scope: validScope,
      models: validModels,
      attachments,
      adminUserId: admin?.id ?? null,
    });

    const baseValues = {
      type: 'ask_question' as const,
      query: question,
      depth: validDepth,
      scope: validScope,
      adminUserId: admin?.id ?? null,
      adminFullName: admin?.fullName ?? null,
      attachedFileIds: mediaIds,
    };

    if ('multiple' in response) {
      const saved = await Promise.all(
        response.multiple.map((r) =>
          db.insert(adminAiAnalyses).values({
            ...baseValues,
            report: r.report,
            model: r.model,
            tokensUsed: r.tokensUsed,
            costUsd: String(r.costUsd.toFixed(6)),
          }).returning()
        )
      );
      for (let i = 0; i < saved.length; i++) {
        const aid = saved[i][0]?.id;
        if (aid && mediaIds.length) {
          await db.insert(aiAnalysisAttachments).values(mediaIds.map((mid) => ({ analysisId: aid, mediaId: mid })));
        }
      }
      return res.json({ results: response.multiple.map((r, i) => ({ ...r, id: saved[i][0]?.id })) });
    }

    const [saved] = await db.insert(adminAiAnalyses).values({
      ...baseValues,
      report: response.single.report,
      model: response.single.model,
      tokensUsed: response.single.tokensUsed,
      costUsd: String(response.single.costUsd.toFixed(6)),
    }).returning();

    if (saved?.id && mediaIds.length) {
      await db.insert(aiAnalysisAttachments).values(mediaIds.map((mid) => ({ analysisId: saved.id, mediaId: mid })));
    }

    res.json({
      id: saved.id,
      report: response.single.report,
      model: response.single.model,
      tokensUsed: response.single.tokensUsed,
      costUsd: response.single.costUsd,
    });
  } catch (err: any) {
    console.error('[ai/ask-question]', err);
    const msg = err?.message ?? 'השאלה נכשלה';
    res.status(500).json({ error: msg });
  }
});

// AI - Synthesize: merge two model outputs into one superior document
adminRoutes.post('/ai/synthesize', requireAdmin, aiPostLimiter, async (req, res) => {
  try {
    const admin = await getAdminFromRequest(req);
    const { reports, synthesisModel, originalQuery } = req.body;

    if (!Array.isArray(reports) || reports.length < 2) {
      return res.status(400).json({ error: 'נדרשים לפחות 2 דוחות לסינתזה' });
    }
    const validReports = reports
      .filter((r: unknown) => r && typeof (r as { content?: unknown }).content === 'string')
      .map((r: { content: string; model?: string }) => ({ content: r.content, model: r.model ?? 'unknown' }));
    if (validReports.length < 2) {
      return res.status(400).json({ error: 'כל דוח חייב לכלול שדה content' });
    }

    const allProviderIds = ['claude', 'openai', 'gemini', 'gemini31', 'perplexity'] as const;
    const validSynthesisModel = allProviderIds.includes(synthesisModel as typeof allProviderIds[number])
      ? synthesisModel as typeof allProviderIds[number]
      : 'claude';

    const result = await runSynthesis({
      reports: validReports,
      synthesisModel: validSynthesisModel,
      originalQuery: typeof originalQuery === 'string' ? originalQuery : undefined,
      adminUserId: admin?.id ?? null,
    });

    const [saved] = await db.insert(adminAiAnalyses).values({
      type: 'synthesis' as const,
      query: originalQuery ?? null,
      report: result.report,
      model: result.model,
      tokensUsed: result.tokensUsed,
      costUsd: String(result.costUsd.toFixed(6)),
      adminUserId: admin?.id ?? null,
      adminFullName: admin?.fullName ?? null,
      depth: null,
      scope: null,
      attachedFileIds: [],
    }).returning();

    res.json({
      id: saved?.id,
      report: result.report,
      model: result.model,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
    });
  } catch (err: any) {
    console.error('[ai/synthesize]', err);
    res.status(500).json({ error: err?.message ?? 'הסינתזה נכשלה' });
  }
});

// AI - Archive: list analyses (with admin user email)
adminRoutes.get('/ai/analyses', requireAdmin, async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const baseQuery = db
      .select({
        id: adminAiAnalyses.id,
        type: adminAiAnalyses.type,
        query: adminAiAnalyses.query,
        report: adminAiAnalyses.report,
        depth: adminAiAnalyses.depth,
        scope: adminAiAnalyses.scope,
        model: adminAiAnalyses.model,
        tokensUsed: adminAiAnalyses.tokensUsed,
        costUsd: adminAiAnalyses.costUsd,
        adminUserId: adminAiAnalyses.adminUserId,
        adminUserEmail: adminUsers.email,
        adminUserFullName: adminUsers.fullName,
        attachedFileIds: adminAiAnalyses.attachedFileIds,
        createdAt: adminAiAnalyses.createdAt,
        outputQuality: adminAiAnalyses.outputQuality,
        devQuality: adminAiAnalyses.devQuality,
        processSpeed: adminAiAnalyses.processSpeed,
        ratedAt: adminAiAnalyses.ratedAt,
      })
      .from(adminAiAnalyses)
      .leftJoin(adminUsers, eq(adminAiAnalyses.adminUserId, adminUsers.id))
      .$dynamic();

    const filtered = type && ['project_analysis', 'feature_planning', 'ask_question', 'synthesis'].includes(type)
      ? baseQuery.where(eq(adminAiAnalyses.type, type))
      : baseQuery;

    const list = await filtered
      .orderBy(desc(adminAiAnalyses.createdAt))
      .limit(limit)
      .offset(offset);
    res.json(list);
  } catch (err: any) {
    console.error('[ai/analyses]', err?.message ?? err);
    return res.json([]);
  }
});

// AI - Archive: get single analysis
adminRoutes.get('/ai/analyses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await db
      .select()
      .from(adminAiAnalyses)
      .where(eq(adminAiAnalyses.id, id))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'לא נמצא' });
    res.json(row);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(404).json({ error: 'לא נמצא' });
    console.error('[ai/analyses/:id]', err);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// AI - PATCH rate for analysis
const rateSchema = z.object({
  outputQuality: z.number().int().min(1).max(5).nullable().optional(),
  devQuality: z.number().int().min(1).max(5).nullable().optional(),
  processSpeed: z.enum(['very_slow', 'slow', 'medium', 'fast', 'very_fast']).nullable().optional(),
});

adminRoutes.patch('/ai/analyses/:id/rate', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id } = req.params;

    const parsed = rateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid rating data', details: parsed.error.flatten() });
    }

    const [existing] = await db
      .select({ id: adminAiAnalyses.id })
      .from(adminAiAnalyses)
      .where(eq(adminAiAnalyses.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const { outputQuality, devQuality, processSpeed } = parsed.data;

    const updateData: Record<string, unknown> = {
      ratedAt: new Date(),
      ratedBy: admin.id,
    };
    if (outputQuality !== undefined) updateData.outputQuality = outputQuality;
    if (devQuality !== undefined) updateData.devQuality = devQuality;
    if (processSpeed !== undefined) updateData.processSpeed = processSpeed;

    const [updated] = await db
      .update(adminAiAnalyses)
      .set(updateData as Record<string, unknown>)
      .where(eq(adminAiAnalyses.id, id))
      .returning({
        id: adminAiAnalyses.id,
        outputQuality: adminAiAnalyses.outputQuality,
        devQuality: adminAiAnalyses.devQuality,
        processSpeed: adminAiAnalyses.processSpeed,
        ratedAt: adminAiAnalyses.ratedAt,
      });

    try {
      await logAudit(req, admin.id, 'ai_analysis_rated', 'admin_ai_analysis', id, undefined, { outputQuality, devQuality, processSpeed });
    } catch (_) {
      /* ignore */
    }

    res.json({ ok: true, rating: updated });
  } catch (err: any) {
    console.error('[ai/analyses/:id/rate]', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// App versions
adminRoutes.get('/versions', async (req, res) => {
  try {
    const platform = req.query.platform as string;
    const base = db.select().from(appVersions);
    const query = platform ? base.where(eq(appVersions.platform, platform)) : base;
    const list = await query.orderBy(desc(appVersions.createdAt));
    res.json(list);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

adminRoutes.post('/versions', async (req, res) => {
  try {
    const { version, platform, releaseNotes, releasedAt } = req.body;
    if (!version || typeof version !== 'string') return res.status(400).json({ error: 'version required' });
    const [row] = await db
      .insert(appVersions)
      .values({
        version: version.trim(),
        platform: ['web', 'ios', 'android'].includes(String(platform || 'web')) ? platform : 'web',
        releaseNotes: typeof releaseNotes === 'string' ? releaseNotes : undefined,
        releasedAt: releasedAt ? new Date(releasedAt) : new Date(),
      })
      .returning();
    res.status(201).json(row);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'App versions table not available' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

// Finance – עלויות והכנסות (Cursor, מערכות, מנויים)
adminRoutes.get('/finance/entries', requireAdmin, async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    let q = db.select().from(adminFinanceEntries).orderBy(desc(adminFinanceEntries.createdAt));
    if (type && (type === 'income' || type === 'expense')) {
      q = q.where(eq(adminFinanceEntries.type, type));
    }
    const rows = await q;
    res.json(rows.map((r) => ({
      id: r.id,
      type: r.type,
      category: r.category,
      name: r.name,
      amount: Number(r.amount),
      currency: r.currency,
      recurrence: r.recurrence,
      periodMonth: r.periodMonth,
      periodYear: r.periodYear,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch finance entries' });
  }
});

adminRoutes.get('/finance/summary', requireAdmin, async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const rows = await db.select().from(adminFinanceEntries);
    const monthly = rows.filter((r) => r.recurrence === 'monthly' || (r.periodYear === year));
    const income = monthly.filter((r) => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
    const expense = monthly.filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
    res.json({
      totalIncome: income,
      totalExpense: expense,
      netProfit: income - expense,
      year,
      entriesByCategory: monthly.reduce((acc, r) => {
        const k = r.category;
        if (!acc[k]) acc[k] = { income: 0, expense: 0 };
        if (r.type === 'income') acc[k].income += Number(r.amount);
        else acc[k].expense += Number(r.amount);
        return acc;
      }, {} as Record<string, { income: number; expense: number }>),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch finance summary' });
  }
});

adminRoutes.post('/finance/entries', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const body = req.body as { type: string; category: string; name: string; amount: number; currency?: string; recurrence?: string; notes?: string; periodMonth?: number; periodYear?: number };
    if (!body.type || !body.category || !body.name || body.amount == null) {
      return res.status(400).json({ error: 'Missing type, category, name or amount' });
    }
    const [row] = await db
      .insert(adminFinanceEntries)
      .values({
        type: body.type,
        category: body.category,
        name: body.name,
        amount: String(body.amount),
        currency: body.currency || 'ILS',
        recurrence: body.recurrence || 'monthly',
        notes: body.notes,
        periodMonth: body.periodMonth ?? null,
        periodYear: body.periodYear ?? null,
        createdBy: admin.id,
      })
      .returning();
    res.status(201).json({
      id: row.id,
      type: row.type,
      category: row.category,
      name: row.name,
      amount: Number(row.amount),
      currency: row.currency,
      recurrence: row.recurrence,
      notes: row.notes,
      createdAt: row.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create finance entry' });
  }
});

adminRoutes.patch('/finance/entries/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body as { type?: string; category?: string; name?: string; amount?: number; recurrence?: string; notes?: string };
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.type) update.type = body.type;
    if (body.category) update.category = body.category;
    if (body.name) update.name = body.name;
    if (body.amount != null) update.amount = String(body.amount);
    if (body.recurrence) update.recurrence = body.recurrence;
    if (body.notes !== undefined) update.notes = body.notes;
    const [row] = await db.update(adminFinanceEntries).set(update).where(eq(adminFinanceEntries.id, id)).returning();
    if (!row) return res.status(404).json({ error: 'Entry not found' });
    res.json({
      id: row.id,
      type: row.type,
      category: row.category,
      name: row.name,
      amount: Number(row.amount),
      currency: row.currency,
      recurrence: row.recurrence,
      notes: row.notes,
      updatedAt: row.updatedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update finance entry' });
  }
});

adminRoutes.delete('/finance/entries/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const [row] = await db.delete(adminFinanceEntries).where(eq(adminFinanceEntries.id, id)).returning();
    if (!row) return res.status(404).json({ error: 'Entry not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete finance entry' });
  }
});

// Analytics - Page views and user activity
adminRoutes.get('/analytics/overview', requireAdmin, async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    // Mock data for now - integrate with real analytics later
    res.json({
      pageViews: { total: 45230, change: 12.5 },
      uniqueUsers: { total: 3420, change: 8.3 },
      avgSessionTime: { total: '4:32', change: -2.1 },
      bounceRate: { total: 32.4, change: -5.2 },
      topPages: [
        { path: '/dashboard', views: 12340, uniqueUsers: 2100 },
        { path: '/tasks', views: 8920, uniqueUsers: 1850 },
        { path: '/patient', views: 6540, uniqueUsers: 1420 },
      ],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Backups - List and create backups
adminRoutes.get('/backups', requireAdmin, async (_req, res) => {
  try {
    // Mock data - integrate with actual backup system
    const backups = [
      { id: '1', timestamp: new Date().toISOString(), size: '245 MB', status: 'completed', type: 'auto' },
      { id: '2', timestamp: new Date(Date.now() - 86400000).toISOString(), size: '243 MB', status: 'completed', type: 'auto' },
    ];
    res.json(backups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

adminRoutes.post('/backups', requireAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    // Trigger backup creation - implement with pg_dump or similar
    const backup = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      size: '0 MB',
      status: 'in_progress',
      type: 'manual',
    };
    res.status(201).json(backup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Notifications - Templates management
adminRoutes.get('/notifications/templates', requireAdmin, async (_req, res) => {
  try {
    // Mock data - integrate with actual notification system
    const templates = [
      { id: '1', name: 'תזכורת למשימה', channel: 'push', trigger: '30 דקות לפני', enabled: true },
      { id: '2', name: 'משימה חדשה נוצרה', channel: 'in_app', trigger: 'מיידי', enabled: true },
    ];
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Security - Security events and checks
adminRoutes.get('/security/events', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    // Mock data - integrate with actual security logging
    const events = [
      { time: new Date().toISOString(), event: 'ניסיון כניסה כושל', user: 'admin@memoraid.com', severity: 'medium' },
    ];
    res.json(events.slice(0, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch security events' });
  }
});

adminRoutes.get('/security/checks', requireAdmin, async (_req, res) => {
  try {
    const checks = [
      { name: 'HTTPS מופעל', status: 'pass', description: 'כל התקשורת מוצפנת' },
      { name: 'Rate limiting', status: 'pass', description: 'הגנה מפני brute force' },
      { name: '2FA למנהלים', status: 'warn', description: 'מומלץ להפעיל' },
    ];
    res.json(checks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch security checks' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Development Kanban System
// ──────────────────────────────────────────────────────────────────────────────

// Columns management
adminRoutes.get('/dev/columns', requireAdmin, async (_req, res) => {
  try {
    const columns = await db.select().from(devColumns).orderBy(devColumns.position);
    res.json(columns);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
});

adminRoutes.post('/dev/columns', requireAdmin, async (req, res) => {
  try {
    const { name, color } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'Name required' });
    
    const maxPos = await db.select({ max: sql<number>`MAX(${devColumns.position})` }).from(devColumns);
    const position = (maxPos[0]?.max ?? -1) + 1;
    
    const [column] = await db.insert(devColumns).values({
      name: String(name).trim(),
      color: color || 'slate',
      position,
    }).returning();
    
    res.status(201).json(column);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'Table not available' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create column' });
  }
});

adminRoutes.patch('/dev/columns/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body ?? {};
    const update: any = {};
    if (name) update.name = String(name).trim();
    if (color) update.color = color;
    
    const [column] = await db.update(devColumns).set(update).where(eq(devColumns.id, id)).returning();
    if (!column) return res.status(404).json({ error: 'Column not found' });
    
    res.json(column);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update column' });
  }
});

adminRoutes.delete('/dev/columns/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(devColumns).where(eq(devColumns.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

adminRoutes.post('/dev/columns/reorder', requireAdmin, async (req, res) => {
  try {
    const { order } = req.body ?? {};
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Order array required' });
    
    for (let i = 0; i < order.length; i++) {
      await db.update(devColumns).set({ position: i }).where(eq(devColumns.id, order[i]));
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reorder columns' });
  }
});

// Tasks management
adminRoutes.get('/dev/tasks', requireAdmin, async (req, res) => {
  try {
    const { columnId, category, priority, assignee, search, sprint } = req.query;
    const conditions = [];

    if (columnId) conditions.push(eq(devTasks.columnId, String(columnId)));
    if (category) conditions.push(eq(devTasks.category, String(category)));
    if (priority) conditions.push(eq(devTasks.priority, String(priority)));
    if (assignee) conditions.push(eq(devTasks.assignee, String(assignee)));

    let taskList: typeof devTasks.$inferSelect[];

    if (sprint) {
      const sprintId = String(sprint);
      const sprintConditions = [eq(sprintTasks.sprintId, sprintId)];
      if (columnId) sprintConditions.push(eq(devTasks.columnId, String(columnId)));
      if (category) sprintConditions.push(eq(devTasks.category, String(category)));
      if (priority) sprintConditions.push(eq(devTasks.priority, String(priority)));
      if (assignee) sprintConditions.push(eq(devTasks.assignee, String(assignee)));
      const tasksInSprint = await db
        .select({
          task: devTasks,
          sprintName: sprints.name,
          phaseName: devPhases.name,
        })
        .from(sprintTasks)
        .innerJoin(devTasks, eq(sprintTasks.taskId, devTasks.id))
        .leftJoin(sprints, eq(sprintTasks.sprintId, sprints.id))
        .leftJoin(devPhases, eq(devTasks.phaseId, devPhases.id))
        .where(and(...sprintConditions));
      taskList = tasksInSprint.map((r) => ({
        ...r.task,
        sprintName: r.sprintName,
        phaseName: r.phaseName,
      })) as typeof devTasks.$inferSelect[];
      taskList.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    } else {
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db
        .select({
          task: devTasks,
          sprintName: sprints.name,
          phaseName: devPhases.name,
        })
        .from(devTasks)
        .leftJoin(sprints, eq(devTasks.sprintId, sprints.id))
        .leftJoin(devPhases, eq(devTasks.phaseId, devPhases.id))
        .where(whereClause ?? sql`1=1`)
        .orderBy(devTasks.position);
      taskList = rows.map((r) => ({
        ...r.task,
        sprintName: r.sprintName,
        phaseName: r.phaseName,
      })) as typeof devTasks.$inferSelect[];
    }

    if (search) {
      const s = String(search).toLowerCase();
      taskList = taskList.filter(
        (t) => t.title.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s)
      );
    }

    res.json(taskList);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

adminRoutes.post('/dev/tasks', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { title, description, columnId, priority, category, assignee, labels, estimateHours, dueDate } = req.body ?? {};
    
    if (!title) return res.status(400).json({ error: 'Title required' });
    
    const maxPos = columnId 
      ? await db.select({ max: sql<number>`MAX(${devTasks.position})` }).from(devTasks).where(eq(devTasks.columnId, columnId))
      : await db.select({ max: sql<number>`MAX(${devTasks.position})` }).from(devTasks);
    const position = (maxPos[0]?.max ?? -1) + 1;
    
    const [task] = await db.insert(devTasks).values({
      title: String(title).trim(),
      description: description || null,
      columnId: columnId || null,
      priority: priority || 'medium',
      category: category || null,
      assignee: assignee || null,
      labels: labels || [],
      estimateHours: estimateHours || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      position,
      createdBy: admin.id,
    }).returning();
    
    res.status(201).json(task);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'Table not available' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

adminRoutes.patch('/dev/tasks/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, category, assignee, labels, estimateHours, actualHours, dueDate, riskLevel } = req.body ?? {};
    
    const update: any = { updatedAt: new Date() };
    if (title !== undefined) update.title = String(title).trim();
    if (description !== undefined) update.description = description;
    if (priority !== undefined) update.priority = priority;
    if (category !== undefined) update.category = category;
    if (assignee !== undefined) update.assignee = assignee;
    if (labels !== undefined) update.labels = labels;
    if (estimateHours !== undefined) update.estimateHours = estimateHours;
    if (actualHours !== undefined) update.actualHours = actualHours;
    if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
    if (riskLevel !== undefined) update.riskLevel = riskLevel || null;
    
    const [task] = await db.update(devTasks).set(update).where(eq(devTasks.id, id)).returning();
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

adminRoutes.delete('/dev/tasks/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(devTasks).where(eq(devTasks.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

adminRoutes.post('/dev/tasks/:id/move', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { columnId, position } = req.body ?? {};
    
    const update: any = { updatedAt: new Date() };
    if (columnId !== undefined) update.columnId = columnId;
    if (position !== undefined) update.position = position;
    
    const [task] = await db.update(devTasks).set(update).where(eq(devTasks.id, id)).returning();
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to move task' });
  }
});

// Comments
adminRoutes.get('/dev/tasks/:id/comments', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await db
      .select({
        id: devComments.id,
        comment: devComments.comment,
        createdAt: devComments.createdAt,
        adminUser: {
          id: adminUsers.id,
          username: adminUsers.username,
        },
      })
      .from(devComments)
      .leftJoin(adminUsers, eq(devComments.adminUserId, adminUsers.id))
      .where(eq(devComments.taskId, id))
      .orderBy(desc(devComments.createdAt));
    
    res.json(comments);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

adminRoutes.post('/dev/tasks/:id/comments', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { comment } = req.body ?? {};
    
    if (!comment) return res.status(400).json({ error: 'Comment required' });
    
    const [newComment] = await db.insert(devComments).values({
      taskId: id,
      adminUserId: admin.id,
      comment: String(comment).trim(),
    }).returning();
    
    res.status(201).json(newComment);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'Table not available' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

adminRoutes.get('/dev/tasks/:id/nexus-docs', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const extractedRes = await db.execute(sql`
      SELECT brief_id FROM nexus_extracted_tasks WHERE dev_task_id = ${id} LIMIT 1
    `);
    const extracted = (extractedRes as any).rows?.[0];
    if (!extracted?.brief_id) {
      return res.json({ briefId: null, briefTitle: null, docs: [] });
    }
    const briefId = extracted.brief_id;
    const briefRes = await db.execute(sql`
      SELECT id, title, idea_prompt FROM nexus_briefs WHERE id = ${briefId} LIMIT 1
    `);
    const brief = (briefRes as any).rows?.[0];
    const docsRes = await db.execute(sql`
      SELECT id, doc_type, title, content, created_at
      FROM nexus_generated_docs
      WHERE brief_id = ${briefId}
      ORDER BY created_at
    `);
    const docs = (docsRes as any).rows ?? [];
    res.json({ briefId, briefTitle: brief?.title ?? null, ideaPrompt: brief?.idea_prompt ?? null, docs });
  } catch (err: any) {
    if (err?.code === '42P01') return res.json({ briefId: null, briefTitle: null, docs: [] });
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nexus docs' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Dev Phases (Roadmap)
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/phases', requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(devPhases).orderBy(devPhases.position, devPhases.createdAt);
    res.json(list);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch phases' });
  }
});

adminRoutes.post('/phases', requireAdmin, async (req, res) => {
  try {
    const { name, description, goals, techStack, complexity, aiContext, status, position } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const [phase] = await db.insert(devPhases).values({
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      goals: Array.isArray(goals) ? goals : [],
      techStack: Array.isArray(techStack) ? techStack : [],
      complexity: complexity ? String(complexity) : null,
      aiContext: aiContext ? String(aiContext).trim() : null,
      status: status ? String(status) : 'pending',
      position: typeof position === 'number' ? position : 0,
    }).returning();
    res.status(201).json(phase);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'dev_phases table not available' });
    console.error(err);
    res.status(500).json({ error: err?.message || 'Failed to create phase' });
  }
});

adminRoutes.patch('/phases/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.description !== undefined) update.description = body.description ? String(body.description).trim() : null;
    if (Array.isArray(body.goals)) update.goals = body.goals;
    if (Array.isArray(body.techStack)) update.techStack = body.techStack;
    if (body.complexity !== undefined) update.complexity = body.complexity ? String(body.complexity) : null;
    if (body.aiContext !== undefined) update.aiContext = body.aiContext ? String(body.aiContext).trim() : null;
    if (body.status !== undefined) update.status = String(body.status);
    if (typeof body.position === 'number') update.position = body.position;
    if (body.aiAnalysisResult !== undefined) update.aiAnalysisResult = body.aiAnalysisResult;
    if (body.totalCostUsd !== undefined) update.totalCostUsd = body.totalCostUsd;
    update.updatedAt = new Date();
    if (Object.keys(update).length <= 1) return res.status(400).json({ error: 'No fields to update' });
    const [phase] = await db.update(devPhases).set(update as any).where(eq(devPhases.id, id)).returning();
    if (!phase) return res.status(404).json({ error: 'Phase not found' });
    res.json(phase);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'dev_phases table not available' });
    console.error(err);
    res.status(500).json({ error: err?.message || 'Failed to update phase' });
  }
});

adminRoutes.delete('/phases/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(devPhases).where(eq(devPhases.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'dev_phases table not available' });
    console.error(err);
    res.status(500).json({ error: err?.message || 'Failed to delete phase' });
  }
});

const ROADMAP_SEED = [
  { name: 'Phase 1 - MVP', status: 'completed', goals: ['Auth & Login', 'משפחות ומשתמשים', 'מטופלים', 'משימות בסיסיות', 'Dashboard ראשוני'], position: 0 },
  { name: 'Phase 2 - Multi-family', status: 'completed', goals: ['תמיכה במשפחות מרובות', 'Family switcher', 'הרשאות לפי משפחה', 'Family invites', 'Member tiers'], position: 1 },
  { name: 'Phase 3 - Admin System', status: 'completed', goals: ['33 דפי Admin', 'Dashboard & Stats', 'Support tools', 'QA & Monitoring', 'Feature flags', 'Error tracking', 'CMS', 'Analytics'], position: 2 },
  { name: 'Phase 4 - User Features', status: 'completed', goals: ['Kanban board', 'Drag & drop', 'Forgot password', 'Change password', 'Profile page', 'Settings page', 'Notifications'], position: 3 },
  { name: 'Phase 5 - Integrations', status: 'pending', goals: ['Resend (Email)', 'Google Calendar', 'Outlook Calendar', 'Apple Calendar', 'Twilio (SMS)', 'WhatsApp'], position: 4 },
  { name: 'Phase 5b - Plans & Checkout', status: 'in_progress', goals: ['מיגרציה admin_plans', 'Admin API: plans, coupons, promotions', 'דף ניהול מסלולים', 'דף קודי קופון', 'דף מבצעים', 'Checkout + Stripe Webhooks'], position: 5 },
  { name: 'Phase 6 - Testing & Quality', status: 'pending', goals: ['E2E tests (Playwright)', 'Unit tests (Vitest)', 'Integration tests', 'Performance testing', 'Security audit'], position: 6 },
  { name: 'Phase 7 - Optimization', status: 'pending', goals: ['React Query', 'Virtual scrolling', 'Lazy loading', 'Code splitting', 'Image optimization'], position: 7 },
  { name: 'Phase 8 - AI Enhanced', status: 'pending', goals: ['AI task suggestions', 'Smart reminders', 'Questionnaire AI', 'Voice interface', 'Predictive analytics'], position: 8 },
  { name: 'Phase 9 - Mobile', status: 'pending', goals: ['React Native app', 'Push notifications', 'Offline mode', 'App stores', 'Biometric auth'], position: 9 },
];

adminRoutes.post('/phases/fix-phase5', requireAdmin, async (_req, res) => {
  try {
    const phases = await db.select().from(devPhases).where(eq(devPhases.name, 'Phase 5 - Integrations'));
    if (phases.length === 0) return res.json({ ok: true, message: 'Phase 5 not found', updated: 0 });
    await db.update(devPhases).set({ status: 'pending', updatedAt: new Date() }).where(eq(devPhases.id, phases[0].id));
    res.json({ ok: true, message: 'Phase 5 סטטוס עודכן ל-pending', updated: 1 });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Fix failed' });
  }
});

adminRoutes.post('/phases/reset', requireAdmin, async (_req, res) => {
  try {
    await db.delete(devPhases);
    for (const p of ROADMAP_SEED) {
      await db.insert(devPhases).values({
        name: p.name,
        goals: p.goals,
        status: p.status,
        position: p.position,
      });
    }
    res.json({ ok: true, message: `${ROADMAP_SEED.length} phases reset with Phase 5=pending`, count: ROADMAP_SEED.length });
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'dev_phases table not available' });
    console.error(err);
    res.status(500).json({ error: err?.message || 'Reset failed' });
  }
});

adminRoutes.post('/phases/seed', requireAdmin, async (_req, res) => {
  try {
    const existing = await db.select({ id: devPhases.id }).from(devPhases).limit(1);
    if (existing.length > 0) {
      return res.json({ ok: true, message: 'Phases already exist. Use POST /admin/phases/reset to re-seed.', count: 0 });
    }
    for (const p of ROADMAP_SEED) {
      await db.insert(devPhases).values({
        name: p.name,
        goals: p.goals,
        status: p.status,
        position: p.position,
      });
    }
    res.json({ ok: true, message: `${ROADMAP_SEED.length} phases seeded`, count: ROADMAP_SEED.length });
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'dev_phases table not available. Run migration 0020.' });
    console.error(err);
    res.status(500).json({ error: err?.message || 'Seed failed' });
  }
});

adminRoutes.post('/phases/:id/analyze', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [phase] = await db.select().from(devPhases).where(eq(devPhases.id, id));
    if (!phase) return res.status(404).json({ error: 'Phase not found' });

    const tasks = await analyzePhaseToTasks({
      name: phase.name,
      description: phase.description,
      goals: phase.goals ?? [],
      techStack: phase.techStack ?? [],
      aiContext: phase.aiContext,
    });

    await db.update(devPhases).set({
      aiAnalysisResult: { tasks, analyzedAt: new Date().toISOString() },
      updatedAt: new Date(),
    }).where(eq(devPhases.id, id));

    res.json({ tasks });
  } catch (err: any) {
    console.error('[phases/analyze]', err);
    const msg = err?.message ?? 'Failed to analyze phase';
    res.status(500).json({ error: msg });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Sprint Management System
// ──────────────────────────────────────────────────────────────────────────────

// Get all sprints
adminRoutes.get('/sprints', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = [];

    if (status) conditions.push(eq(sprints.status, String(status)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sprintList = await db
      .select()
      .from(sprints)
      .where(whereClause)
      .orderBy(desc(sprints.startDate));

    res.json(sprintList);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sprints' });
  }
});

// Create new sprint
adminRoutes.post('/sprints', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { name, goal, startDate, endDate, phaseId } = req.body ?? {};

    console.log('Creating sprint:', { name, goal, startDate, endDate, phaseId });

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, start date, and end date required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const values: Record<string, unknown> = {
      name: String(name).trim(),
      goal: goal ? String(goal).trim() : null,
      startDate: start,
      endDate: end,
      status: 'planning',
      createdBy: admin.id,
    };
    if (phaseId) values.phaseId = phaseId;

    const [sprint] = await db.insert(sprints).values(values).returning();

    console.log('Sprint created:', sprint);

    // Log activity
    await db.insert(sprintActivities).values({
      sprintId: sprint.id,
      activityType: 'created',
      description: `Sprint "${sprint.name}" created`,
      adminUserId: admin.id,
    });

    res.status(201).json(sprint);
  } catch (err: any) {
    console.error('Failed to create sprint:', err);
    if (err?.code === '42P01') {
      return res.status(503).json({ error: 'Sprint tables not available. Please run: http://localhost:3006/api/health/create-sprint-tables' });
    }
    res.status(500).json({ error: err?.message || 'Failed to create sprint' });
  }
});

// Get single sprint with tasks
adminRoutes.get('/sprints/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    
    const tasks = await db
      .select({
        task: devTasks,
        storyPoints: sprintTasks.storyPoints,
        addedAt: sprintTasks.addedAt,
      })
      .from(sprintTasks)
      .innerJoin(devTasks, eq(sprintTasks.taskId, devTasks.id))
      .where(eq(sprintTasks.sprintId, id));
    
    res.json({ ...sprint, tasks });
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(404).json({ error: 'Sprint not found' });
    if (err?.code === '42703') {
      console.error('Schema mismatch (column missing):', err?.message);
      return res.status(500).json({
        error: 'Database schema outdated. הרץ: npm run db:push',
        code: 'SCHEMA_OUTDATED',
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sprint' });
  }
});

// Update sprint
adminRoutes.patch('/sprints/:id', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { name, goal, startDate, endDate, status, velocity, phaseId } = req.body ?? {};

    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = String(name).trim();
    if (goal !== undefined) update.goal = goal;
    if (startDate !== undefined) update.startDate = new Date(startDate);
    if (endDate !== undefined) update.endDate = new Date(endDate);
    if (status !== undefined) update.status = status;
    if (velocity !== undefined) update.velocity = velocity;
    if (phaseId !== undefined) update.phaseId = phaseId || null;
    
    const [sprint] = await db.update(sprints).set(update).where(eq(sprints.id, id)).returning();
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    
    if (status) {
      await db.insert(sprintActivities).values({
        sprintId: id,
        activityType: 'status_changed',
        description: `Sprint status changed to ${status}`,
        adminUserId: admin.id,
      });
    }
    
    res.json(sprint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update sprint' });
  }
});

// Activate sprint — only one active at a time per brief
adminRoutes.post('/sprints/:id/activate', requireAdmin, async (req, res) => {
  try {
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, req.params.id));
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    if (sprint.status === 'active') return res.json({ ok: true, message: 'Already active' });

    // Deactivate any other active sprint for the same brief
    if (sprint.briefId) {
      await db.execute(sql`
        UPDATE sprints SET status = 'planning', updated_at = now()
        WHERE brief_id = ${sprint.briefId} AND status = 'active' AND id != ${sprint.id}
      `);
    }

    // Activate this sprint
    await db.update(sprints).set({ status: 'active', updatedAt: new Date() }).where(eq(sprints.id, sprint.id));

    // Move sprint tasks from Backlog to To Do
    const todoCol = await db.execute(sql`SELECT id FROM dev_columns WHERE name ILIKE 'to do' OR name ILIKE 'todo' LIMIT 1`);
    const todoColId = (todoCol as any).rows?.[0]?.id;
    if (todoColId) {
      const backlogCol = await db.execute(sql`SELECT id FROM dev_columns WHERE name ILIKE 'backlog' LIMIT 1`);
      const backlogId = (backlogCol as any).rows?.[0]?.id;
      if (backlogId) {
        await db.execute(sql`
          UPDATE dev_tasks SET column_id = ${todoColId}, updated_at = now()
          WHERE id IN (SELECT task_id FROM sprint_tasks WHERE sprint_id = ${sprint.id})
            AND column_id = ${backlogId}
        `);
      }
    }

    // Log activity
    await db.execute(sql`
      INSERT INTO sprint_activities (sprint_id, activity_type, description)
      VALUES (${sprint.id}, 'status_changed', 'Sprint activated')
    `);

    res.json({ ok: true, status: 'active' });
  } catch (err: any) {
    console.error('[sprint/activate]', err.message);
    res.status(500).json({ error: err.message || 'Failed to activate sprint' });
  }
});

// Complete sprint — verify all tasks done
adminRoutes.post('/sprints/:id/complete', requireAdmin, async (req, res) => {
  try {
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, req.params.id));
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    // Check incomplete tasks
    const doneCol = await db.execute(sql`SELECT id FROM dev_columns WHERE name ILIKE 'done' LIMIT 1`);
    const doneColId = (doneCol as any).rows?.[0]?.id;

    const incompleteRes = await db.execute(sql`
      SELECT dt.id, dt.title, dt.column_id FROM dev_tasks dt
      JOIN sprint_tasks st ON st.task_id = dt.id
      WHERE st.sprint_id = ${sprint.id}
        AND (dt.column_id != ${doneColId ?? 'none'} OR dt.column_id IS NULL)
    `);
    const incomplete = (incompleteRes as any).rows ?? [];

    const force = req.body?.force === true;
    if (incomplete.length > 0 && !force) {
      return res.status(400).json({
        error: 'Sprint has incomplete tasks',
        incompleteTasks: incomplete.map((t: any) => ({ id: t.id, title: t.title })),
        message: `${incomplete.length} tasks are not in Done. Set force=true to complete anyway.`,
      });
    }

    await db.update(sprints).set({ status: 'completed', updatedAt: new Date() }).where(eq(sprints.id, sprint.id));

    await db.execute(sql`
      INSERT INTO sprint_activities (sprint_id, activity_type, description)
      VALUES (${sprint.id}, 'status_changed', ${'Sprint completed — ' + (incomplete.length > 0 ? incomplete.length + ' tasks forced' : 'all tasks done')})
    `);

    res.json({ ok: true, status: 'completed', incompleteTasks: incomplete.length });
  } catch (err: any) {
    console.error('[sprint/complete]', err.message);
    res.status(500).json({ error: err.message || 'Failed to complete sprint' });
  }
});

// Get active sprint (for kanban default view)
adminRoutes.get('/sprints/active', requireAdmin, async (_req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM sprints WHERE status = 'active' ORDER BY sprint_order LIMIT 1`);
    const active = (result as any).rows?.[0];
    res.json({ sprint: active ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete sprint
adminRoutes.delete('/sprints/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(sprints).where(eq(sprints.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete sprint' });
  }
});

// Add task to sprint
adminRoutes.post('/sprints/:id/tasks', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { taskId, storyPoints } = req.body ?? {};
    
    if (!taskId) return res.status(400).json({ error: 'Task ID required' });
    
    await db.insert(sprintTasks).values({
      sprintId: id,
      taskId,
      storyPoints: storyPoints || null,
    });
    
    const [task] = await db.select().from(devTasks).where(eq(devTasks.id, taskId));
    
    await db.insert(sprintActivities).values({
      sprintId: id,
      activityType: 'task_added',
      description: `Task "${task?.title || taskId}" added to sprint`,
      adminUserId: admin.id,
    });
    
    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err?.code === '23505') return res.status(400).json({ error: 'Task already in sprint' });
    console.error(err);
    res.status(500).json({ error: 'Failed to add task to sprint' });
  }
});

// Bulk create tasks and add to sprint
adminRoutes.post('/sprints/:id/tasks/bulk', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id: sprintId } = req.params;
    const { tasks: bodyTasks, phaseId } = req.body ?? {};

    if (!Array.isArray(bodyTasks) || bodyTasks.length === 0) {
      return res.status(400).json({ error: 'tasks array required' });
    }

    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, sprintId));
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    const [backlogCol] = await db.select().from(devColumns).where(eq(devColumns.name, 'Backlog')).limit(1);
    const columnId = backlogCol?.id ?? null;

    const created: { taskId: string; title: string }[] = [];
    let position = 0;

    for (const t of bodyTasks as ProposedTask[]) {
      if (!t?.title) continue;
      const [task] = await db.insert(devTasks).values({
        title: String(t.title).slice(0, 255),
        description: t.description ? String(t.description).slice(0, 5000) : null,
        columnId,
        priority: t.priority ?? 'medium',
        category: t.category ?? null,
        estimateHours: t.estimateHours ?? null,
        labels: t.labels ?? null,
        position,
        sprintId,
        phaseId: phaseId ?? sprint.phaseId ?? null,
        aiGenerated: true,
        createdBy: admin.id,
      }).returning({ id: devTasks.id, title: devTasks.title });

      if (task) {
        await db.insert(sprintTasks).values({
          sprintId,
          taskId: task.id,
          storyPoints: t.storyPoints ?? null,
        });
        created.push({ taskId: task.id, title: task.title });
        position++;
      }
    }

    if (created.length > 0) {
      await db.insert(sprintActivities).values({
        sprintId,
        activityType: 'bulk_add',
        description: `${created.length} משימות נוספו (AI)`,
        adminUserId: admin.id,
      });
    }

    res.status(201).json({ ok: true, created: created.length, taskIds: created.map((c) => c.taskId) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message ?? 'Failed to bulk add tasks' });
  }
});

// Remove task from sprint
adminRoutes.delete('/sprints/:id/tasks/:taskId', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id, taskId } = req.params;
    
    const [task] = await db.select().from(devTasks).where(eq(devTasks.id, taskId));
    
    await db.delete(sprintTasks).where(
      and(eq(sprintTasks.sprintId, id), eq(sprintTasks.taskId, taskId))
    );
    
    await db.insert(sprintActivities).values({
      sprintId: id,
      activityType: 'task_removed',
      description: `Task "${task?.title || taskId}" removed from sprint`,
      adminUserId: admin.id,
    });
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove task from sprint' });
  }
});

// Get sprint activities
adminRoutes.get('/sprints/:id/activities', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const activities = await db
      .select({
        id: sprintActivities.id,
        activityType: sprintActivities.activityType,
        description: sprintActivities.description,
        createdAt: sprintActivities.createdAt,
        adminUser: {
          id: adminUsers.id,
          username: adminUsers.username,
        },
      })
      .from(sprintActivities)
      .leftJoin(adminUsers, eq(sprintActivities.adminUserId, adminUsers.id))
      .where(eq(sprintActivities.sprintId, id))
      .orderBy(desc(sprintActivities.createdAt));
    
    res.json(activities);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get sprint metrics
adminRoutes.get('/sprints/:id/metrics', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const tasks = await db
      .select({
        task: devTasks,
        storyPoints: sprintTasks.storyPoints,
      })
      .from(sprintTasks)
      .innerJoin(devTasks, eq(sprintTasks.taskId, devTasks.id))
      .where(eq(sprintTasks.sprintId, id));
    
    const doneColumn = await db.select().from(devColumns).where(eq(devColumns.name, 'Done')).limit(1);
    const doneColumnId = doneColumn[0]?.id ?? null;
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.task.columnId === doneColumnId).length;
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = tasks
      .filter(t => t.task.columnId === doneColumnId)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    
    res.json({
      totalTasks: total,
      completedTasks: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalPoints,
      completedPoints,
      pointsCompletionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
    });
  } catch (err: any) {
    if (err?.code === '42P01') return res.json({ totalTasks: 0, completedTasks: 0, completionRate: 0, totalPoints: 0, completedPoints: 0, pointsCompletionRate: 0 });
    if (err?.code === '42703') {
      console.error('Schema mismatch (column missing):', err?.message);
      return res.status(500).json({
        error: 'Database schema outdated. הרץ: npm run db:push',
        code: 'SCHEMA_OUTDATED',
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Pipelines System
// ──────────────────────────────────────────────────────────────────────────────

// Get all pipelines
adminRoutes.get('/pipelines', requireAdmin, async (req, res) => {
  try {
    const { type, status } = req.query;
    const conditions = [];
    
    if (type) conditions.push(eq(pipelines.type, String(type)));
    if (status) conditions.push(eq(pipelines.status, String(status)));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const pipelineList = await db
      .select()
      .from(pipelines)
      .where(whereClause)
      .orderBy(pipelines.name);
    
    res.json(pipelineList);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

// Get single pipeline
adminRoutes.get('/pipelines/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, id));
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
    res.json(pipeline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

// Create pipeline
adminRoutes.post('/pipelines', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { name, description, type, config, schedule } = req.body ?? {};
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type required' });
    }
    
    const [pipeline] = await db.insert(pipelines).values({
      name: String(name).trim(),
      description: description || null,
      type,
      config: config || null,
      schedule: schedule || null,
      status: 'active',
      createdBy: admin.id,
    }).returning();
    
    res.status(201).json(pipeline);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'Table not available' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create pipeline' });
  }
});

// Update pipeline
adminRoutes.patch('/pipelines/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, status, config, schedule } = req.body ?? {};
    
    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = String(name).trim();
    if (description !== undefined) update.description = description;
    if (type !== undefined) update.type = type;
    if (status !== undefined) update.status = status;
    if (config !== undefined) update.config = config;
    if (schedule !== undefined) update.schedule = schedule;
    
    const [pipeline] = await db.update(pipelines).set(update).where(eq(pipelines.id, id)).returning();
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
    
    res.json(pipeline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update pipeline' });
  }
});

// Delete pipeline
adminRoutes.delete('/pipelines/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(pipelines).where(eq(pipelines.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete pipeline' });
  }
});

// Trigger pipeline manually
adminRoutes.post('/pipelines/:id/trigger', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const { id } = req.params;
    
    const [run] = await db.insert(pipelineRuns).values({
      pipelineId: id,
      status: 'running',
      triggeredBy: admin.id,
    }).returning();
    
    await db.update(pipelines).set({ lastRun: new Date() }).where(eq(pipelines.id, id));
    
    res.status(201).json(run);
  } catch (err: any) {
    if (err?.code === '42P01') return res.status(503).json({ error: 'Table not available' });
    console.error(err);
    res.status(500).json({ error: 'Failed to trigger pipeline' });
  }
});

// Get pipeline runs
adminRoutes.get('/pipelines/:id/runs', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    
    const runs = await db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.pipelineId, id))
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(limit);
    
    res.json(runs);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

// Get pipeline stages
adminRoutes.get('/pipelines/:id/stages', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, id))
      .orderBy(pipelineStages.stageOrder);
    
    res.json(stages);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stages' });
  }
});

// Get pipeline alerts
adminRoutes.get('/pipelines/:id/alerts', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved } = req.query;
    
    const conditions = [eq(pipelineAlerts.pipelineId, id)];
    if (resolved !== undefined) {
      conditions.push(eq(pipelineAlerts.resolved, resolved === 'true'));
    }
    
    const alerts = await db
      .select()
      .from(pipelineAlerts)
      .where(and(...conditions))
      .orderBy(desc(pipelineAlerts.createdAt))
      .limit(100);
    
    res.json(alerts);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get pipeline statistics
adminRoutes.get('/pipelines/stats/overview', requireAdmin, async (_req, res) => {
  try {
    const allPipelines = await db.select().from(pipelines);
    const recentRuns = await db
      .select()
      .from(pipelineRuns)
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(100);
    
    const unresolvedAlerts = await db
      .select()
      .from(pipelineAlerts)
      .where(eq(pipelineAlerts.resolved, false));
    
    const stats = {
      totalPipelines: allPipelines.length,
      activePipelines: allPipelines.filter(p => p.status === 'active').length,
      pausedPipelines: allPipelines.filter(p => p.status === 'paused').length,
      totalRuns: recentRuns.length,
      successfulRuns: recentRuns.filter(r => r.status === 'success').length,
      failedRuns: recentRuns.filter(r => r.status === 'failed').length,
      unresolvedAlerts: unresolvedAlerts.length,
    };
    
    res.json(stats);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json({ totalPipelines: 0, activePipelines: 0, pausedPipelines: 0, totalRuns: 0, successfulRuns: 0, failedRuns: 0, unresolvedAlerts: 0 });
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Medical Intelligence — Population Health Summary
// ──────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/medical-insights-summary', requireAdmin, async (_req, res) => {
  try {
    const [
      totalPatients,
      totalVitals,
      abnormalVitals,
      totalLabs,
      abnormalLabs,
      pendingReferralsList,
      criticalInsights,
      totalMeds,
      topDiagnoses,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(patients),
      db.select({ count: sql<number>`count(*)::int` }).from(vitals),
      db.select({ count: sql<number>`count(*)::int` }).from(vitals).where(eq(vitals.isAbnormal, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(labResults),
      db.select({ count: sql<number>`count(*)::int` }).from(labResults).where(eq(labResults.isAbnormal, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(referrals).where(eq(referrals.status, 'pending')),
      db.select({ count: sql<number>`count(*)::int` }).from(patientHealthInsights).where(and(eq(patientHealthInsights.severity, 'critical'), eq(patientHealthInsights.status, 'new'))),
      db.select({ count: sql<number>`count(*)::int` }).from(medications).where(eq(medications.isActive, true)),
      db
        .select({ condition: patientDiagnoses.condition, count: sql<number>`count(*)::int` })
        .from(patientDiagnoses)
        .where(eq(patientDiagnoses.status, 'active'))
        .groupBy(patientDiagnoses.condition)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
    ]);

    // Recent critical insights (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const recentCriticalInsights = await db
      .select({
        id: patientHealthInsights.id,
        patientId: patientHealthInsights.patientId,
        familyId: patientHealthInsights.familyId,
        title: patientHealthInsights.title,
        content: patientHealthInsights.content,
        severity: patientHealthInsights.severity,
        insightType: patientHealthInsights.insightType,
        createdAt: patientHealthInsights.createdAt,
      })
      .from(patientHealthInsights)
      .where(and(
        eq(patientHealthInsights.severity, 'critical'),
        eq(patientHealthInsights.status, 'new'),
        gte(patientHealthInsights.createdAt, sevenDaysAgo)
      ))
      .orderBy(desc(patientHealthInsights.createdAt))
      .limit(20);

    // Overdue referrals (pending > 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000);
    const overdueReferrals = await db
      .select({
        id: referrals.id,
        patientId: referrals.patientId,
        familyId: referrals.familyId,
        specialty: referrals.specialty,
        urgency: referrals.urgency,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .where(and(eq(referrals.status, 'pending'), lte(referrals.createdAt, fourteenDaysAgo)))
      .orderBy(referrals.urgency, referrals.createdAt)
      .limit(20);

    res.json({
      summary: {
        totalPatients: totalPatients[0]?.count ?? 0,
        totalVitalReadings: totalVitals[0]?.count ?? 0,
        abnormalVitalReadings: abnormalVitals[0]?.count ?? 0,
        totalLabResults: totalLabs[0]?.count ?? 0,
        abnormalLabResults: abnormalLabs[0]?.count ?? 0,
        pendingReferrals: pendingReferralsList[0]?.count ?? 0,
        criticalUnreadInsights: criticalInsights[0]?.count ?? 0,
        activeMedications: totalMeds[0]?.count ?? 0,
      },
      topDiagnoses,
      recentCriticalInsights,
      overdueReferrals,
    });
  } catch (err: any) {
    if (err?.code === '42P01') {
      return res.json({
        summary: { totalPatients: 0, totalVitalReadings: 0, abnormalVitalReadings: 0, totalLabResults: 0, abnormalLabResults: 0, pendingReferrals: 0, criticalUnreadInsights: 0, activeMedications: 0 },
        topDiagnoses: [],
        recentCriticalInsights: [],
        overdueReferrals: [],
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch medical insights summary' });
  }
});
