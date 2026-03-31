/**
 * Integration routes: Google Calendar OAuth and sync
 */
import { Router, Request } from 'express';
import { eq, and, gt } from 'drizzle-orm';
import { db } from './db';
import { users, sessions } from '../../shared/schemas/schema';
import {
  getAuthUrl,
  getTokensFromCode,
  saveTokens,
  getUserTokens,
  deleteUserTokens,
  syncAllTasksForUser,
  getFreeBusy,
  getFamilyMembersWithCalendar,
} from './services/googleCalendar';
import { tasks, familyMembers } from '../../shared/schemas/schema';

export const integrationRoutes = Router();

const MOCK_DEV_USER = {
  id: 'dev-bypass-user',
  familyId: 'dev-family-1',
  primaryFamilyId: null as string | null,
  effectiveFamilyId: 'dev-family-1',
};

async function getUserFromRequest(req: Request) {
  if (
    process.env.DEV_SKIP_AUTH === '1' &&
    process.env.NODE_ENV !== 'production' &&
    req.headers['x-dev-bypass-user'] === '1'
  ) {
    return MOCK_DEV_USER;
  }
  const token = req.cookies?.['mr_session'];
  if (!token || typeof token !== 'string' || !token.trim()) return null;

  const now = new Date();
  const rows = await db
    .select({
      id: users.id,
      familyId: users.familyId,
      primaryFamilyId: users.primaryFamilyId,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!rows[0]) return null;
  const u = rows[0];
  const headerFamily = (req.headers['x-active-family'] as string)?.trim();
  let effectiveFamilyId = u.primaryFamilyId ?? u.familyId;
  if (headerFamily) {
    const [fm] = await db
      .select({ familyId: familyMembers.familyId })
      .from(familyMembers)
      .where(
        and(eq(familyMembers.userId, u.id), eq(familyMembers.familyId, headerFamily))
      )
      .limit(1);
    if (fm) effectiveFamilyId = headerFamily;
  }
  return { ...u, effectiveFamilyId };
}

const hasGoogleCalendarConfig = () =>
  !!(process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() && process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim());

// GET /api/integrations/google/oauth/start - redirect to Google OAuth
integrationRoutes.get('/google/oauth/start', async (req, res) => {
  if (!hasGoogleCalendarConfig()) {
    return res.status(503).json({ error: 'Google Calendar integration is not configured' });
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  const state = user.id;
  const authUrl = getAuthUrl(state);
  res.redirect(authUrl);
});

// GET /api/integrations/google/oauth/callback - handle OAuth callback
integrationRoutes.get('/google/oauth/callback', async (req, res) => {
  if (!hasGoogleCalendarConfig()) {
    return res.redirect('/settings?calendar_error=not_configured');
  }
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.redirect('/settings?calendar_error=no_code');
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  const userId = user.id;

  try {
    const tokens = await getTokensFromCode(code);
    if (!tokens.refresh_token) {
      return res.redirect('/settings?calendar_error=no_refresh_token');
    }
    await saveTokens(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date
    );
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return res.redirect('/settings?calendar_error=oauth_failed');
  }

  const appBase = process.env.APP_BASE_URL ?? 'http://localhost:5173';
  res.redirect(`${appBase}/settings?calendar_connected=1`);
});

// GET /api/integrations/google/status - check if user has connected
integrationRoutes.get('/google/status', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'לא מחובר' });
  }
  const configured = hasGoogleCalendarConfig();
  const tokens = await getUserTokens(user.id);
  res.json({
    configured,
    connected: !!tokens,
  });
});

// POST /api/integrations/google/disconnect
integrationRoutes.post('/google/disconnect', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'לא מחובר' });
  }
  await deleteUserTokens(user.id);
  res.json({ ok: true, connected: false });
});

// POST /api/integrations/google/sync - manual full sync
integrationRoutes.post('/google/sync', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'לא מחובר' });
  }

  const taskFetcher = async (familyId: string) => {
    const list = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        dueDate: tasks.dueDate,
        status: tasks.status,
      })
      .from(tasks)
      .where(eq(tasks.familyId, familyId));
    return list.map((t) => ({
      ...t,
      status: String(t.status),
    }));
  };

  const result = await syncAllTasksForUser(user.id, user.effectiveFamilyId, taskFetcher);
  res.json({ ok: true, ...result });
});

// GET /api/integrations/google/availability?from=&to= - my busy slots
integrationRoutes.get('/google/availability', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'לא מחובר' });

  const from = req.query.from as string;
  const to = req.query.to as string;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to (ISO date) required' });
  }
  const timeMin = new Date(from);
  const timeMax = new Date(to);
  if (isNaN(timeMin.getTime()) || isNaN(timeMax.getTime())) {
    return res.status(400).json({ error: 'Invalid from/to dates' });
  }

  const result = await getFreeBusy(user.id, timeMin, timeMax);
  res.json(result);
});

// GET /api/integrations/google/family-availability?from=&to= - busy slots of family members with connected calendar
integrationRoutes.get('/google/family-availability', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'לא מחובר' });
  if (!hasGoogleCalendarConfig()) {
    return res.status(503).json({ error: 'Google Calendar integration is not configured' });
  }

  const from = req.query.from as string;
  const to = req.query.to as string;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to (ISO date) required' });
  }
  const timeMin = new Date(from);
  const timeMax = new Date(to);
  if (isNaN(timeMin.getTime()) || isNaN(timeMax.getTime())) {
    return res.status(400).json({ error: 'Invalid from/to dates' });
  }

  const members = await getFamilyMembersWithCalendar(user.effectiveFamilyId);
  const availability: { userId: string; fullName: string; busy: { start: string; end: string }[] }[] = [];

  for (const m of members) {
    const result = await getFreeBusy(m.userId, timeMin, timeMax);
    availability.push({
      userId: m.userId,
      fullName: m.fullName,
      busy: result.busy,
    });
  }

  res.json({ availability });
});
