import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { families, users, patients, tasks, sessions } from '../../shared/schemas/schema';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe =
  stripeSecret && stripeSecret !== 'YOUR_STRIPE_SECRET_KEY'
    ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' })
    : null;

export const routes = Router();

// ──────────────────────────────────────────────────────────────────────────────
// Helpers – sessions & cookies
// ──────────────────────────────────────────────────────────────────────────────

const SESSION_COOKIE = 'mr_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h
const SESSION_TTL_REMEMBER_SECONDS = 60 * 60 * 24 * 30; // 30 days

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (!k || !v) return acc;
    acc[k.trim()] = decodeURIComponent(v.trim());
    return acc;
  }, {});
}

async function getUserFromRequest(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const now = new Date();
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      familyId: users.familyId,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token), sql`${sessions.expiresAt} > ${now}`))
    .limit(1);

  if (!rows[0]) return null;
  return rows[0];
}

async function createSession(userId: string, rememberMe: boolean, res: Response) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(
    Date.now() + (rememberMe ? SESSION_TTL_REMEMBER_SECONDS : SESSION_TTL_SECONDS) * 1000,
  );

  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt: expires,
  });

  const cookieParts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    `HttpOnly`,
    `Path=/`,
    `SameSite=Lax`,
    `Max-Age=${rememberMe ? SESSION_TTL_REMEMBER_SECONDS : SESSION_TTL_SECONDS}`,
  ];
  // ב‑localhost אין צורך ב-Secure; בפרודקשן כן.
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

async function clearSession(req: Request, res: Response) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, token));
  }
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
}

async function generateUniqueFamilyInviteCode(): Promise<string> {
  // פורמט בסיסי: MEM-XXXXXX
  while (true) {
    const random = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 תווים
    const code = `MEM-${random}`;
    const existing = await db
      .select({ id: families.id })
      .from(families)
      .where(eq(families.inviteCode, code))
      .limit(1);
    if (!existing[0]) return code;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Health
// ──────────────────────────────────────────────────────────────────────────────

routes.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────────────────────────────────────
// AUTH – Register / Login / Logout / Me
// ──────────────────────────────────────────────────────────────────────────────

// Register:
// mode=create  -> יצירת משפחה חדשה + משתמש ראשון (manager)
// mode=join    -> הצטרפות למשפחה קיימת באמצעות inviteCode
routes.post('/auth/register', async (req, res) => {
  try {
    const { mode = 'create', familyName, inviteCode, fullName, email, password } = req.body ?? {};

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'fullName, email, password נדרשים' });
    }

    if (mode === 'create' && !familyName) {
      return res.status(400).json({ error: 'familyName נדרש ליצירת משפחה חדשה' });
    }

    if (mode === 'join' && !inviteCode) {
      return res.status(400).json({ error: 'inviteCode נדרש להצטרפות למשפחה קיימת' });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      return res.status(409).json({ error: 'משתמש עם האימייל הזה כבר קיים' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let familyId: string;

    if (mode === 'create') {
      const code = await generateUniqueFamilyInviteCode();
      const [family] = await db
        .insert(families)
        .values({
          familyName,
          inviteCode: code,
        })
        .returning();
      familyId = family.id;
    } else {
      const [family] = await db
        .select()
        .from(families)
        .where(eq(families.inviteCode, inviteCode))
        .limit(1);

      if (!family) {
        return res.status(404).json({ error: 'קוד משפחה לא נמצא. בדקו שוב את הקוד.' });
      }

      familyId = family.id;
    }

    const [user] = await db
      .insert(users)
      .values({
        familyId,
        fullName,
        email,
        passwordHash,
        role: 'manager',
      })
      .returning();

    await createSession(user.id, true, res);

    res.status(201).json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      familyId: user.familyId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login – יוצר session ומחזיר מידע בסיסי על המשתמש
routes.post('/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email ו‑password נדרשים' });
    }

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'אימייל או סיסמא שגויים' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'אימייל או סיסמא שגויים' });
    }

    await createSession(user.id, Boolean(rememberMe), res);

    res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      familyId: user.familyId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// BILLING – Stripe checkout (תשתית ראשונית בלבד)
// ──────────────────────────────────────────────────────────────────────────────

routes.post('/billing/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Billing is not configured on the server' });
    }

    const { plan } = req.body ?? {};
    if (plan !== 'premium') {
      return res.status(400).json({ error: 'Unsupported plan' });
    }

    const priceId = process.env.STRIPE_PRICE_PREMIUM;

    if (!priceId) {
      return res.status(500).json({ error: 'Missing STRIPE_PRICE_PREMIUM configuration' });
    }

    const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appBaseUrl}/pricing?status=success`,
      cancel_url: `${appBaseUrl}/pricing?status=cancel`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

routes.post('/auth/logout', async (req, res) => {
  try {
    await clearSession(req, res);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

routes.get('/auth/me', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load current user' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DASHBOARD (stub)
// ──────────────────────────────────────────────────────────────────────────────

routes.get('/dashboard', async (_req, res) => {
  try {
    // TODO: להשתמש ב‑tasks/appointments/documents כשיימומשו
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [tasksTodayCount] = await db
      .select({ count: tasks.id.count() })
      .from(tasks);

    res.json({
      date: today.toISOString(),
      kpis: {
        tasksToday: tasksTodayCount?.count ?? 0,
      },
      urgentTasks: [],
      nextAppointment: null,
      recentDocuments: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard (stub)' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PATIENTS
// ──────────────────────────────────────────────────────────────────────────────

// primary patient for current family
routes.get('/patients/primary', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.familyId, user.familyId))
      .orderBy(desc(patients.isPrimary), desc(patients.createdAt))
      .limit(1);

    if (!patient) return res.status(404).json({ error: 'No patient found' });
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch primary patient' });
  }
});

routes.get('/patients/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const { id } = req.params;
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.familyId, user.familyId)))
      .limit(1);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// create primary patient for family
routes.post('/patients', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const { fullName, dateOfBirth, primaryDiagnosis, notes } = req.body ?? {};
    if (!fullName) return res.status(400).json({ error: 'fullName is required' });

    const [created] = await db
      .insert(patients)
      .values({
        familyId: user.familyId,
        fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        primaryDiagnosis: primaryDiagnosis ?? undefined,
        notes: notes ?? undefined,
        isPrimary: true,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// partial update of patient (only within same family)
routes.patch('/patients/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה לעדכן פרופיל מטופל' });
    }

    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.familyId, user.familyId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Patient not found' });

    const body = req.body ?? {};
    const update: any = {};

    if (body.fullName !== undefined) update.fullName = String(body.fullName);
    if (body.dateOfBirth !== undefined) {
      update.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.primaryDiagnosis !== undefined) {
      update.primaryDiagnosis = body.primaryDiagnosis || null;
    }
    if (body.emergencyContact !== undefined) {
      update.emergencyContact = body.emergencyContact || null;
    }
    if (body.emergencyContactPhone !== undefined) {
      update.emergencyContactPhone = body.emergencyContactPhone || null;
    }
    if (body.primaryDoctorName !== undefined) {
      update.primaryDoctorName = body.primaryDoctorName || null;
    }
    if (body.primaryDoctorPhone !== undefined) {
      update.primaryDoctorPhone = body.primaryDoctorPhone || null;
    }
    if (body.healthFundName !== undefined) {
      update.healthFundName = body.healthFundName || null;
    }
    if (body.notes !== undefined) {
      update.notes = body.notes || null;
    }

    const [updated] = await db
      .update(patients)
      .set(update)
      .where(eq(patients.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// TASKS (very minimal list/create for now)
// ──────────────────────────────────────────────────────────────────────────────

routes.get('/tasks', async (req, res) => {
  try {
    const { familyId, status } = req.query;

    const where = [];
    if (familyId) where.push(eq(tasks.familyId, String(familyId)));
    if (status) where.push(eq(tasks.status, String(status) as any));

    const list = await db
      .select()
      .from(tasks)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(tasks.createdAt));

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

routes.post('/tasks', async (req, res) => {
  try {
    const { familyId, title, createdByUserId } = req.body;
    if (!familyId || !title || !createdByUserId) {
      return res
        .status(400)
        .json({ error: 'familyId, title and createdByUserId are required' });
    }

    const [created] = await db
      .insert(tasks)
      .values({
        familyId,
        title,
        createdByUserId,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// FAMILY (skeleton)
// ──────────────────────────────────────────────────────────────────────────────

routes.get('/family', async (_req, res) => {
  try {
    const list = await db.select().from(families).orderBy(desc(families.createdAt));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch families' });
  }
});

