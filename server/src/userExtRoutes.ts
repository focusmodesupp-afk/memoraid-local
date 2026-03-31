/**
 * userExtRoutes – Missing user-facing API routes
 * Covers: vitals, hydration, doctor visits, handover notes, support tickets, AI chat
 * Tables are auto-created on first request if they don't exist.
 */
import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { getUserFromRequest } from './routes';

export const userExtRoutes = Router();

// ─── Table boot-strap (idempotent) ────────────────────────────────────────────

let tablesReady = false;

async function ensureTables() {
  if (tablesReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vital_readings (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      family_id   uuid NOT NULL,
      patient_id  uuid,
      user_id     uuid NOT NULL,
      type        varchar(64) NOT NULL,
      value       numeric(10,2) NOT NULL,
      value2      numeric(10,2),
      unit        varchar(16) NOT NULL DEFAULT 'unit',
      notes       text,
      is_abnormal boolean DEFAULT false,
      recorded_at timestamptz NOT NULL DEFAULT now(),
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vr_family_idx ON vital_readings(family_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vr_type_idx  ON vital_readings(family_id, type)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hydration_logs (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      family_id   uuid NOT NULL,
      patient_id  uuid,
      user_id     uuid NOT NULL,
      amount      integer NOT NULL,
      unit        varchar(8) NOT NULL DEFAULT 'ml',
      drink_type  varchar(32) NOT NULL DEFAULT 'water',
      notes       text,
      logged_at   timestamptz NOT NULL DEFAULT now(),
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS hl_family_idx ON hydration_logs(family_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS hl_logged_idx ON hydration_logs(family_id, logged_at)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS doctor_visits (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      family_id    uuid NOT NULL,
      patient_id   uuid,
      user_id      uuid NOT NULL,
      doctor_name  varchar(255) NOT NULL,
      specialty    varchar(128),
      date         timestamptz NOT NULL,
      location     varchar(255),
      summary      text,
      next_steps   text,
      status       varchar(32) NOT NULL DEFAULT 'scheduled',
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS dv_family_idx ON doctor_visits(family_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS dv_date_idx   ON doctor_visits(family_id, date)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS handover_notes (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      family_id  uuid NOT NULL,
      user_id    uuid NOT NULL,
      author     varchar(255) NOT NULL,
      note       text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS hn_family_idx ON handover_notes(family_id)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      user_id     uuid NOT NULL,
      family_id   uuid,
      subject     varchar(255) NOT NULL,
      category    varchar(64) NOT NULL DEFAULT 'general',
      description text NOT NULL,
      priority    varchar(32) NOT NULL DEFAULT 'normal',
      status      varchar(32) NOT NULL DEFAULT 'open',
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS st_user_idx ON support_tickets(user_id)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS support_messages (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      ticket_id  uuid NOT NULL,
      user_id    uuid,
      body       text NOT NULL,
      is_staff   boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS sm_ticket_idx ON support_messages(ticket_id)`);

  tablesReady = true;
}

// ─── Vitals ───────────────────────────────────────────────────────────────────

userExtRoutes.get('/vitals', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    await ensureTables();
    const rows = await db.execute(sql`
      SELECT id, type, value, value2, unit, notes, is_abnormal, recorded_at, created_at
      FROM vital_readings
      WHERE family_id = ${u.effectiveFamilyId}
      ORDER BY recorded_at DESC
      LIMIT 200
    `);
    const readings = (rows.rows as any[]).map((r) => ({
      id: r.id,
      type: r.type,
      value: parseFloat(r.value),
      value2: r.value2 != null ? parseFloat(r.value2) : null,
      unit: r.unit,
      notes: r.notes,
      isAbnormal: r.is_abnormal ?? false,
      recordedAt: r.recorded_at,
    }));
    res.json(readings);
  } catch (err: any) {
    console.error('GET /vitals:', err?.message);
    res.status(500).json({ error: 'Failed to load vitals' });
  }
});

userExtRoutes.post('/vitals', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    const { type, value, value2, unit, notes, recordedAt } = req.body ?? {};
    if (!type || value == null) return res.status(400).json({ error: 'type ו-value נדרשים' });

    await ensureTables();

    // Get primary patient
    const patientRows = await db.execute(sql`
      SELECT id FROM patients WHERE family_id = ${u.effectiveFamilyId} ORDER BY is_primary DESC, created_at ASC LIMIT 1
    `);
    const patientId = (patientRows.rows[0] as any)?.id ?? null;

    const NORMAL_RANGES: Record<string, (v: number, v2?: number) => boolean> = {
      blood_pressure: (v, v2) => v < 140 && (v2 == null || v2 < 90),
      blood_sugar: (v) => v >= 70 && v <= 180,
      heart_rate: (v) => v >= 50 && v <= 100,
      temperature: (v) => v >= 36.1 && v <= 37.5,
      oxygen_saturation: (v) => v >= 95,
      weight: () => true,
    };
    const checker = NORMAL_RANGES[type];
    const isAbnormal = checker ? !checker(Number(value), value2 != null ? Number(value2) : undefined) : false;

    const result = await db.execute(sql`
      INSERT INTO vital_readings (family_id, patient_id, user_id, type, value, value2, unit, notes, is_abnormal, recorded_at)
      VALUES (
        ${u.effectiveFamilyId},
        ${patientId},
        ${u.id},
        ${type},
        ${Number(value)},
        ${value2 != null ? Number(value2) : null},
        ${unit ?? 'unit'},
        ${notes ?? null},
        ${isAbnormal},
        ${recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString()}
      )
      RETURNING id, type, value, value2, unit, notes, is_abnormal, recorded_at, created_at
    `);
    const row = result.rows[0] as any;
    res.status(201).json({
      id: row.id,
      type: row.type,
      value: parseFloat(row.value),
      value2: row.value2 != null ? parseFloat(row.value2) : null,
      unit: row.unit,
      notes: row.notes,
      isAbnormal: row.is_abnormal ?? false,
      recordedAt: row.recorded_at,
    });
  } catch (err: any) {
    console.error('POST /vitals:', err?.message);
    res.status(500).json({ error: 'Failed to save vital' });
  }
});

userExtRoutes.delete('/vitals/:id', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    await ensureTables();
    await db.execute(sql`
      DELETE FROM vital_readings WHERE id = ${req.params.id} AND family_id = ${u.effectiveFamilyId}
    `);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /vitals/:id:', err?.message);
    res.status(500).json({ error: 'Failed to delete vital' });
  }
});

// ─── Hydration ────────────────────────────────────────────────────────────────

userExtRoutes.get('/hydration', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    await ensureTables();
    // Return last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await db.execute(sql`
      SELECT id, amount, unit, drink_type, notes, logged_at
      FROM hydration_logs
      WHERE family_id = ${u.effectiveFamilyId} AND logged_at >= ${since}
      ORDER BY logged_at DESC
    `);
    const entries = (rows.rows as any[]).map((r) => ({
      id: r.id,
      amount: r.amount,
      unit: r.unit,
      drinkType: r.drink_type,
      notes: r.notes,
      loggedAt: r.logged_at,
    }));
    res.json(entries);
  } catch (err: any) {
    console.error('GET /hydration:', err?.message);
    res.status(500).json({ error: 'Failed to load hydration' });
  }
});

userExtRoutes.post('/hydration', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    const { amount, unit, drinkType, notes, loggedAt } = req.body ?? {};
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount נדרש' });
    await ensureTables();

    const patientRows = await db.execute(sql`
      SELECT id FROM patients WHERE family_id = ${u.effectiveFamilyId} ORDER BY is_primary DESC, created_at ASC LIMIT 1
    `);
    const patientId = (patientRows.rows[0] as any)?.id ?? null;

    const result = await db.execute(sql`
      INSERT INTO hydration_logs (family_id, patient_id, user_id, amount, unit, drink_type, notes, logged_at)
      VALUES (
        ${u.effectiveFamilyId}, ${patientId}, ${u.id},
        ${Number(amount)}, ${unit ?? 'ml'}, ${drinkType ?? 'water'},
        ${notes ?? null}, ${loggedAt ? new Date(loggedAt).toISOString() : new Date().toISOString()}
      )
      RETURNING id, amount, unit, drink_type, notes, logged_at
    `);
    const row = result.rows[0] as any;
    res.status(201).json({
      id: row.id,
      amount: row.amount,
      unit: row.unit,
      drinkType: row.drink_type,
      notes: row.notes,
      loggedAt: row.logged_at,
    });
  } catch (err: any) {
    console.error('POST /hydration:', err?.message);
    res.status(500).json({ error: 'Failed to save hydration entry' });
  }
});

userExtRoutes.delete('/hydration/:id', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    await ensureTables();
    await db.execute(sql`
      DELETE FROM hydration_logs WHERE id = ${req.params.id} AND family_id = ${u.effectiveFamilyId}
    `);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /hydration/:id:', err?.message);
    res.status(500).json({ error: 'Failed to delete hydration entry' });
  }
});

// ─── Doctor Visits ────────────────────────────────────────────────────────────

userExtRoutes.get('/visits', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    await ensureTables();
    const rows = await db.execute(sql`
      SELECT id, doctor_name, specialty, date, location, summary, next_steps, status, created_at
      FROM doctor_visits
      WHERE family_id = ${u.effectiveFamilyId}
      ORDER BY date DESC
      LIMIT 100
    `);
    const visits = (rows.rows as any[]).map((r) => ({
      id: r.id,
      doctorName: r.doctor_name,
      specialty: r.specialty,
      date: r.date,
      location: r.location,
      summary: r.summary,
      nextSteps: r.next_steps,
      status: r.status,
      createdAt: r.created_at,
    }));
    res.json(visits);
  } catch (err: any) {
    console.error('GET /visits:', err?.message);
    res.status(500).json({ error: 'Failed to load visits' });
  }
});

userExtRoutes.post('/visits', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    const { doctorName, specialty, date, location, summary, nextSteps, status } = req.body ?? {};
    if (!doctorName?.trim() || !date) return res.status(400).json({ error: 'doctorName ו-date נדרשים' });
    await ensureTables();

    const patientRows = await db.execute(sql`
      SELECT id FROM patients WHERE family_id = ${u.effectiveFamilyId} ORDER BY is_primary DESC, created_at ASC LIMIT 1
    `);
    const patientId = (patientRows.rows[0] as any)?.id ?? null;

    const result = await db.execute(sql`
      INSERT INTO doctor_visits (family_id, patient_id, user_id, doctor_name, specialty, date, location, summary, next_steps, status)
      VALUES (
        ${u.effectiveFamilyId}, ${patientId}, ${u.id},
        ${doctorName.trim()}, ${specialty?.trim() || null},
        ${new Date(date).toISOString()}, ${location?.trim() || null},
        ${summary?.trim() || null}, ${nextSteps?.trim() || null},
        ${status ?? 'scheduled'}
      )
      RETURNING id, doctor_name, specialty, date, location, summary, next_steps, status, created_at
    `);
    const row = result.rows[0] as any;
    res.status(201).json({
      id: row.id,
      doctorName: row.doctor_name,
      specialty: row.specialty,
      date: row.date,
      location: row.location,
      summary: row.summary,
      nextSteps: row.next_steps,
      status: row.status,
      createdAt: row.created_at,
    });
  } catch (err: any) {
    console.error('POST /visits:', err?.message);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

userExtRoutes.put('/visits/:id', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    const { doctorName, specialty, date, location, summary, nextSteps, status } = req.body ?? {};
    if (!doctorName?.trim() || !date) return res.status(400).json({ error: 'doctorName ו-date נדרשים' });
    await ensureTables();

    const result = await db.execute(sql`
      UPDATE doctor_visits
      SET doctor_name = ${doctorName.trim()},
          specialty   = ${specialty?.trim() || null},
          date        = ${new Date(date).toISOString()},
          location    = ${location?.trim() || null},
          summary     = ${summary?.trim() || null},
          next_steps  = ${nextSteps?.trim() || null},
          status      = ${status ?? 'scheduled'},
          updated_at  = now()
      WHERE id = ${req.params.id} AND family_id = ${u.effectiveFamilyId}
      RETURNING id, doctor_name, specialty, date, location, summary, next_steps, status, created_at
    `);
    if (!result.rows[0]) return res.status(404).json({ error: 'ביקור לא נמצא' });
    const row = result.rows[0] as any;
    res.json({
      id: row.id,
      doctorName: row.doctor_name,
      specialty: row.specialty,
      date: row.date,
      location: row.location,
      summary: row.summary,
      nextSteps: row.next_steps,
      status: row.status,
      createdAt: row.created_at,
    });
  } catch (err: any) {
    console.error('PUT /visits/:id:', err?.message);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

userExtRoutes.delete('/visits/:id', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    await ensureTables();
    await db.execute(sql`
      DELETE FROM doctor_visits WHERE id = ${req.params.id} AND family_id = ${u.effectiveFamilyId}
    `);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /visits/:id:', err?.message);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

// ─── Handover Notes ───────────────────────────────────────────────────────────

userExtRoutes.get('/handover/notes', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    await ensureTables();
    const rows = await db.execute(sql`
      SELECT id, author, note, created_at
      FROM handover_notes
      WHERE family_id = ${u.effectiveFamilyId}
      ORDER BY created_at DESC
      LIMIT 10
    `);
    const notes = (rows.rows as any[]).map((r) => ({
      id: r.id,
      author: r.author,
      note: r.note,
      createdAt: r.created_at,
    }));
    res.json(notes);
  } catch (err: any) {
    console.error('GET /handover/notes:', err?.message);
    res.status(500).json({ error: 'Failed to load handover notes' });
  }
});

userExtRoutes.post('/handover/notes', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    const { note } = req.body ?? {};
    if (!note?.trim()) return res.status(400).json({ error: 'note נדרש' });
    await ensureTables();
    const result = await db.execute(sql`
      INSERT INTO handover_notes (family_id, user_id, author, note)
      VALUES (${u.effectiveFamilyId}, ${u.id}, ${u.fullName}, ${note.trim()})
      RETURNING id, author, note, created_at
    `);
    const row = result.rows[0] as any;
    res.status(201).json({ id: row.id, author: row.author, note: row.note, createdAt: row.created_at });
  } catch (err: any) {
    console.error('POST /handover/notes:', err?.message);
    res.status(500).json({ error: 'Failed to save handover note' });
  }
});

// ─── Support Tickets ──────────────────────────────────────────────────────────

userExtRoutes.get('/support', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    await ensureTables();
    const rows = await db.execute(sql`
      SELECT id, subject, category, priority, status, created_at, updated_at
      FROM support_tickets
      WHERE user_id = ${u.id}
      ORDER BY created_at DESC
      LIMIT 50
    `);
    const tickets = (rows.rows as any[]).map((r) => ({
      id: r.id,
      subject: r.subject,
      category: r.category,
      priority: r.priority,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(tickets);
  } catch (err: any) {
    console.error('GET /support:', err?.message);
    res.status(500).json({ error: 'Failed to load tickets' });
  }
});

userExtRoutes.post('/support', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    const { subject, category, description, priority } = req.body ?? {};
    if (!subject?.trim() || !description?.trim()) return res.status(400).json({ error: 'subject ו-description נדרשים' });
    await ensureTables();
    const result = await db.execute(sql`
      INSERT INTO support_tickets (user_id, family_id, subject, category, description, priority, status)
      VALUES (${u.id}, ${u.effectiveFamilyId}, ${subject.trim()}, ${category ?? 'general'}, ${description.trim()}, ${priority ?? 'normal'}, 'open')
      RETURNING id, subject, category, priority, status, created_at, updated_at
    `);
    const row = result.rows[0] as any;
    // Post first message (the description) as initial message
    await db.execute(sql`
      INSERT INTO support_messages (ticket_id, user_id, body, is_staff)
      VALUES (${row.id}, ${u.id}, ${description.trim()}, false)
    `).catch(() => {});
    res.status(201).json({
      id: row.id,
      subject: row.subject,
      category: row.category,
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err: any) {
    console.error('POST /support:', err?.message);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

userExtRoutes.get('/support/:id/messages', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    await ensureTables();
    // Verify ticket belongs to user
    const ticketRows = await db.execute(sql`
      SELECT id FROM support_tickets WHERE id = ${req.params.id} AND user_id = ${u.id} LIMIT 1
    `);
    if (!ticketRows.rows[0]) return res.status(404).json({ error: 'פניה לא נמצאה' });

    const rows = await db.execute(sql`
      SELECT id, body, is_staff, created_at
      FROM support_messages
      WHERE ticket_id = ${req.params.id}
      ORDER BY created_at ASC
    `);
    const messages = (rows.rows as any[]).map((r) => ({
      id: r.id,
      body: r.body,
      isStaff: r.is_staff,
      createdAt: r.created_at,
    }));
    res.json(messages);
  } catch (err: any) {
    console.error('GET /support/:id/messages:', err?.message);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

userExtRoutes.post('/support/:id/reply', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    const { body } = req.body ?? {};
    if (!body?.trim()) return res.status(400).json({ error: 'body נדרש' });
    await ensureTables();
    // Verify ticket belongs to user
    const ticketRows = await db.execute(sql`
      SELECT id FROM support_tickets WHERE id = ${req.params.id} AND user_id = ${u.id} LIMIT 1
    `);
    if (!ticketRows.rows[0]) return res.status(404).json({ error: 'פניה לא נמצאה' });

    const result = await db.execute(sql`
      INSERT INTO support_messages (ticket_id, user_id, body, is_staff)
      VALUES (${req.params.id}, ${u.id}, ${body.trim()}, false)
      RETURNING id, body, is_staff, created_at
    `);
    // Update ticket updated_at
    await db.execute(sql`UPDATE support_tickets SET updated_at = now() WHERE id = ${req.params.id}`).catch(() => {});
    const row = result.rows[0] as any;
    res.status(201).json({ id: row.id, body: row.body, isStaff: row.is_staff, createdAt: row.created_at });
  } catch (err: any) {
    console.error('POST /support/:id/reply:', err?.message);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// ─── AI Chat ──────────────────────────────────────────────────────────────────

userExtRoutes.post('/ai/chat', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    const { message, mode, lang } = req.body ?? {};
    if (!message?.trim()) return res.status(400).json({ error: 'message נדרש' });

    const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      // Graceful fallback when no AI key is configured
      const fallback = lang === 'he'
        ? 'עוזר ה-AI אינו מוגדר כרגע. אנא פנה לתמיכה.'
        : 'AI assistant is not configured yet. Please contact support.';
      return res.json({ message: fallback });
    }

    const modeContextHe: Record<string, string> = {
      general: 'עזרה כללית בטיפול',
      tasks: 'תכנון משימות טיפול',
      medications: 'שאלות על תרופות ומינונים',
      family: 'ייעוץ לטיפול בדמנציה עבור המשפחה',
    };
    const modeContextEn: Record<string, string> = {
      general: 'general care assistance',
      tasks: 'care task planning',
      medications: 'medication and dosage questions',
      family: 'dementia care guidance for families',
    };

    const systemPrompt = lang === 'he'
      ? `אתה עוזר AI של MemorAId – אפליקציית ניהול טיפול בבני משפחה עם דמנציה. המשתמש: ${u.fullName}. תחום: ${modeContextHe[mode] ?? 'עזרה כללית'}. ענה בעברית, בצורה תמציתית ואמפתית. זו עזרה כללית בלבד – אינה מחליפה ייעוץ רפואי מקצועי.`
      : `You are MemorAId's AI assistant – a family dementia care management app. User: ${u.fullName}. Focus: ${modeContextEn[mode] ?? 'general help'}. Respond in English, concisely and empathetically. This is general guidance only – not a substitute for professional medical advice.`;

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

    const resp = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${systemPrompt}\n\nUser: ${message.trim()}`,
      config: { maxOutputTokens: 1024, temperature: 0.7 },
    });

    const reply = resp.text ?? (lang === 'he' ? 'מצטער, לא הצלחתי לעבד את הבקשה.' : 'Sorry, I could not process your request.');
    res.json({ message: reply });
  } catch (err: any) {
    console.error('POST /ai/chat:', err?.message);
    const lang = req.body?.lang;
    res.status(500).json({
      error: lang === 'he' ? 'שגיאה בעוזר AI' : 'AI chat error',
      message: lang === 'he' ? 'מצטער, אירעה שגיאה. נסה שוב.' : 'Sorry, an error occurred. Please try again.',
    });
  }
});
