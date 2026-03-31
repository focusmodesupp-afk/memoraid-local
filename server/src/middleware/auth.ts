/**
 * Central auth middleware.
 *
 * Provides reusable Express middleware for user and admin authentication.
 * All new routes should use these instead of calling getUserFromRequest() /
 * getAdminFromRequest() directly inside each handler.
 *
 * Usage (user routes):
 *   router.get('/my-data', requireAuth, (req, res) => {
 *     const user = (req as AuthRequest).user;
 *   });
 *
 * Usage (admin routes):
 *   router.get('/admin-data', requireAdmin, (req, res) => {
 *     const admin = (req as AdminRequest).adminUser;
 *   });
 *
 * Usage (admin super_admin only):
 *   router.post('/sensitive', requireSuperAdmin, handler);
 */

import type { Request, Response, NextFunction } from 'express';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db';
import {
  sessions,
  users,
  familyMembers,
  adminSessions,
  adminUsers,
} from '../../../shared/schemas/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  familyId: string;
  primaryFamilyId: string | null;
  effectiveFamilyId: string;
};

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
};

export type AuthRequest = Request & { user: AuthenticatedUser };
export type AdminRequest = Request & { adminUser: AuthenticatedAdmin };

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_COOKIE = 'mr_session';
const ADMIN_SESSION_COOKIE = 'mr_admin_session';

const MOCK_DEV_USER: AuthenticatedUser = {
  id: 'dev-bypass-user',
  fullName: 'Dev User',
  email: 'dev@local',
  role: 'manager',
  familyId: 'dev-family-1',
  primaryFamilyId: null,
  effectiveFamilyId: 'dev-family-1',
};

const MOCK_DEV_ADMIN: AuthenticatedAdmin = {
  id: 'dev-bypass',
  email: 'dev@local',
  fullName: 'Dev Bypass',
  role: 'super_admin',
};

// ── Core lookup helpers (exported for direct use when needed) ─────────────────

/**
 * Resolves the authenticated user from the request cookie and X-Active-Family header.
 * Returns null if unauthenticated or session expired.
 */
export async function getUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  if (
    process.env.DEV_SKIP_AUTH === '1' &&
    process.env.NODE_ENV !== 'production' &&
    req.headers['x-dev-bypass-user'] === '1'
  ) {
    return MOCK_DEV_USER;
  }

  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || typeof token !== 'string' || !token.trim()) return null;

  const now = new Date();
  let rows: { id: string; fullName: string; email: string; role: string; familyId: string; primaryFamilyId?: string | null }[];

  try {
    rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        familyId: users.familyId,
        primaryFamilyId: users.primaryFamilyId,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
      .limit(1);
  } catch (e: any) {
    // Fallback if primary_family_id column doesn't exist yet (pre-migration)
    if (e?.code === '42703' || (typeof e?.message === 'string' && e.message.includes('primary_family_id'))) {
      const fallback = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          familyId: users.familyId,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
        .limit(1);
      rows = fallback.map((r) => ({ ...r, primaryFamilyId: null }));
    } else {
      throw e;
    }
  }

  if (!rows[0]) return null;
  const u = rows[0];

  // Resolve effective family from X-Active-Family header
  const headerFamily = (req.headers['x-active-family'] as string)?.trim();
  let effectiveFamilyId = u.primaryFamilyId ?? u.familyId;

  if (headerFamily) {
    if (headerFamily === u.familyId || headerFamily === u.primaryFamilyId) {
      effectiveFamilyId = headerFamily;
    } else {
      try {
        const [fm] = await db
          .select({ familyId: familyMembers.familyId })
          .from(familyMembers)
          .where(and(eq(familyMembers.userId, u.id), eq(familyMembers.familyId, headerFamily)))
          .limit(1);
        if (fm) effectiveFamilyId = headerFamily;
      } catch (_) {
        // family_members table might not exist yet – ignore
      }
    }
  }

  return { ...u, primaryFamilyId: u.primaryFamilyId ?? null, effectiveFamilyId };
}

/**
 * Resolves the authenticated admin from the admin session cookie.
 * Returns null if unauthenticated or session expired.
 */
export async function getAdminFromRequest(req: Request): Promise<AuthenticatedAdmin | null> {
  if (
    process.env.DEV_SKIP_AUTH === '1' &&
    process.env.NODE_ENV !== 'production' &&
    req.headers['x-dev-bypass'] === '1'
  ) {
    return MOCK_DEV_ADMIN;
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

// ── Express middleware ─────────────────────────────────────────────────────────

/**
 * requireAuth – attaches req.user or returns 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  getUserFromRequest(req)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'לא מחובר' });
        return;
      }
      (req as AuthRequest).user = user;
      next();
    })
    .catch((err: unknown) => {
      console.error('requireAuth error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'שגיאת אימות פנימית' });
    });
}

/**
 * requireAdmin – attaches req.adminUser or returns 401.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  getAdminFromRequest(req)
    .then((admin) => {
      if (!admin) {
        res.status(401).json({ error: 'Admin login required' });
        return;
      }
      (req as AdminRequest).adminUser = admin;
      next();
    })
    .catch((err: unknown) => {
      if (
        process.env.DEV_SKIP_AUTH === '1' &&
        process.env.NODE_ENV !== 'production' &&
        (req as Request).headers['x-dev-bypass'] === '1'
      ) {
        (req as AdminRequest).adminUser = MOCK_DEV_ADMIN;
        next();
        return;
      }
      console.error('requireAdmin error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Auth error' });
    });
}

/**
 * requireSuperAdmin – like requireAdmin but also checks role === 'super_admin'.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAdmin(req, res, () => {
    const admin = (req as AdminRequest).adminUser;
    if (admin.role !== 'super_admin') {
      res.status(403).json({ error: 'Super admin access required' });
      return;
    }
    next();
  });
}
