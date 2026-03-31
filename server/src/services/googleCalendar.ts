/**
 * Google Calendar integration service
 * OAuth2 flow, token refresh, and task↔event sync
 */
import { google } from 'googleapis';
import { db } from '../db';
import { userGoogleCalendarTokens, taskCalendarSync, users, familyMembers } from '../../../shared/schemas/schema';
import { eq, and } from 'drizzle-orm';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
/** Scopes for login/register + calendar (auto-connect) */
export const AUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar',
];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET must be set');
  }
  const appBase = process.env.APP_BASE_URL ?? 'http://localhost:5173';
  const redirectUri = `${appBase}/api/integrations/google/oauth/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state?: string): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh_token
    scope: SCOPES,
    state: state ?? undefined,
  });
}

/** OAuth2 client for auth callback (redirect: /api/auth/google/callback) */
function getOAuth2ClientForAuth() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET must be set');
  }
  const appBase = (process.env.APP_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const redirectUri = `${appBase}/api/auth/google/callback`;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** Auth URL for login/register – includes calendar scope for auto-connect */
export function getAuthUrlForLogin(state: string): string {
  const oauth2 = getOAuth2ClientForAuth();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: AUTH_SCOPES,
    state,
  });
}

/** Exchange auth code for tokens + user info. Returns user info; caller saves calendar tokens. */
export async function exchangeAuthCodeForUserInfo(code: string): Promise<{
  email: string;
  fullName: string;
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}> {
  const oauth2 = getOAuth2ClientForAuth();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.access_token) throw new Error('No access token from Google');

  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google user info');
  const info = (await res.json()) as { email?: string; name?: string };
  const email = String(info.email || '').trim();
  const fullName = String(info.name || email.split('@')[0] || 'User').trim();

  return {
    email,
    fullName,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? undefined,
    expiryDate: tokens.expiry_date ?? undefined,
  };
}

export async function getTokensFromCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}> {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.access_token) {
    throw new Error('No access token received from Google');
  }
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
  };
}

export async function getUserTokens(userId: string) {
  const [row] = await db
    .select()
    .from(userGoogleCalendarTokens)
    .where(eq(userGoogleCalendarTokens.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function saveTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiryDate?: number
) {
  const expiresAt = expiryDate ? new Date(expiryDate) : null;
  const existing = await getUserTokens(userId);
  const now = new Date();

  if (existing) {
    await db
      .update(userGoogleCalendarTokens)
      .set({
        accessToken,
        refreshToken,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(userGoogleCalendarTokens.userId, userId));
  } else {
    await db.insert(userGoogleCalendarTokens).values({
      userId,
      accessToken,
      refreshToken,
      expiresAt,
      updatedAt: now,
    });
  }
}

export async function deleteUserTokens(userId: string) {
  await db.delete(userGoogleCalendarTokens).where(eq(userGoogleCalendarTokens.userId, userId));
}

export async function getCalendarClient(userId: string) {
  const row = await getUserTokens(userId);
  if (!row) return null;

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    access_token: row.accessToken ?? undefined,
    refresh_token: row.refreshToken,
    expiry_date: row.expiresAt ? row.expiresAt.getTime() : undefined,
  });

  oauth2.on('tokens', async (tokens) => {
    if (tokens.access_token || tokens.refresh_token) {
      await saveTokens(
        userId,
        tokens.access_token ?? row.accessToken ?? '',
        tokens.refresh_token ?? row.refreshToken,
        tokens.expiry_date
      );
    }
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2 });
  const calendarId = row.calendarId ?? 'primary';

  return { calendar, calendarId };
}

export type TaskForSync = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: string;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  attendeeEmails?: string[];
};

const DONE_STATUSES = ['done', 'completed', 'cancelled'];
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem';

export async function syncTaskToCalendar(
  task: TaskForSync,
  userId: string
): Promise<{ eventId?: string; error?: string }> {
  // Use scheduledStart if available, fall back to dueDate
  const effectiveStart = task.scheduledStart ?? task.dueDate;
  if (!effectiveStart) {
    return {}; // Skip tasks without any date
  }

  const client = await getCalendarClient(userId);
  if (!client) return {};

  const { calendar, calendarId } = client;
  const isDone = DONE_STATUSES.includes(task.status);

  // Check if we have an existing sync for this user + task
  const [existingSync] = await db
    .select()
    .from(taskCalendarSync)
    .where(and(eq(taskCalendarSync.taskId, task.id), eq(taskCalendarSync.userId, userId)))
    .limit(1);

  if (isDone && existingSync) {
    try {
      await calendar.events.delete({
        calendarId,
        eventId: existingSync.calendarEventId,
      });
      await db
        .delete(taskCalendarSync)
        .where(and(eq(taskCalendarSync.taskId, task.id), eq(taskCalendarSync.userId, userId)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('404') && !msg.includes('deleted')) {
        console.error('Google Calendar delete event failed:', err);
      }
    }
    return {};
  }

  if (isDone) return {};

  const startDate = new Date(effectiveStart);
  // Use scheduledEnd if available, otherwise scheduledStart + 30 min or dueDate + 30 min
  const endDate = task.scheduledEnd
    ? new Date(task.scheduledEnd)
    : new Date(startDate.getTime() + 30 * 60 * 1000);

  const event: Record<string, unknown> = {
    summary: task.title,
    description: task.description ?? undefined,
    start: { dateTime: startDate.toISOString(), timeZone: TZ },
    end: { dateTime: endDate.toISOString(), timeZone: TZ },
  };

  // Add attendees if provided – Google Calendar will send email invites automatically
  if (task.attendeeEmails && task.attendeeEmails.length > 0) {
    event.attendees = task.attendeeEmails.map((email) => ({ email }));
    event.guestsCanSeeOtherGuests = true;
    event.sendUpdates = 'all';
  }

  try {
    if (existingSync) {
      const res = await calendar.events.update({
        calendarId,
        eventId: existingSync.calendarEventId,
        requestBody: event,
        sendUpdates: task.attendeeEmails?.length ? 'all' : 'none',
      });
      await db
        .update(taskCalendarSync)
        .set({ syncedAt: new Date() })
        .where(and(eq(taskCalendarSync.taskId, task.id), eq(taskCalendarSync.userId, userId)));
      return { eventId: res.data.id ?? undefined };
    } else {
      const res = await calendar.events.insert({
        calendarId,
        requestBody: event,
        sendUpdates: task.attendeeEmails?.length ? 'all' : 'none',
      });
      const eventId = res.data.id;
      if (eventId) {
        await db.insert(taskCalendarSync).values({
          taskId: task.id,
          calendarEventId: eventId,
          userId,
        });
      }
      return { eventId };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Google Calendar sync failed:', err);
    return { error: msg };
  }
}

export async function syncAllTasksForUser(
  userId: string,
  familyId: string,
  taskFetcher: (familyId: string) => Promise<TaskForSync[]>
): Promise<{ synced: number; errors: number }> {
  const tasks = await taskFetcher(familyId);
  let synced = 0;
  let errors = 0;

  for (const task of tasks) {
    const result = await syncTaskToCalendar(task, userId);
    if (result.eventId) synced++;
    else if (result.error) errors++;
  }

  return { synced, errors };
}

export type BusySlot = { start: string; end: string };

export async function getFreeBusy(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<{ busy: BusySlot[]; error?: string }> {
  const client = await getCalendarClient(userId);
  if (!client) return { busy: [] };

  const { calendar } = client;
  const calendarId = client.calendarId ?? 'primary';

  try {
    const res = await calendar.freebusy.query({
      requestBody: {
        items: [{ id: calendarId }],
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
      },
    });

    const cal = res.data.calendars?.[calendarId];
    const busy = (cal?.busy ?? []).map((b) => ({
      start: b.start ?? '',
      end: b.end ?? '',
    }));

    return { busy };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Freebusy query failed:', err);
    return { busy: [], error: msg };
  }
}

export async function getFamilyMembersWithCalendar(
  familyId: string
): Promise<{ userId: string; fullName: string }[]> {
  const fromMembers = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
    })
    .from(familyMembers)
    .innerJoin(users, eq(familyMembers.userId, users.id))
    .innerJoin(userGoogleCalendarTokens, eq(users.id, userGoogleCalendarTokens.userId))
    .where(eq(familyMembers.familyId, familyId));

  const fromPrimary = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
    })
    .from(users)
    .innerJoin(userGoogleCalendarTokens, eq(users.id, userGoogleCalendarTokens.userId))
    .where(eq(users.familyId, familyId));

  const seen = new Set<string>();
  const result: { userId: string; fullName: string }[] = [];
  for (const r of [...fromMembers, ...fromPrimary]) {
    if (!seen.has(r.userId)) {
      seen.add(r.userId);
      result.push({ userId: r.userId, fullName: r.fullName });
    }
  }
  return result;
}
