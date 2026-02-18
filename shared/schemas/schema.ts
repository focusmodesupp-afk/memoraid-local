import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ──────────────────────────────────────────────────────────────────────────────
// Enums (בהתאם ל‑PRD)
// ──────────────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['manager', 'caregiver', 'viewer', 'guest']);

export const taskStatusEnum = pgEnum('task_status', [
  'scheduled',
  'todo',
  'in_progress',
  'stuck',
  'postponed',
  'cancelled',
  'done',
]);

export const taskPriorityEnum = pgEnum('task_priority', ['urgent', 'high', 'medium', 'low']);

export const taskCategoryEnum = pgEnum('task_category', [
  'medical',
  'personal',
  'administrative',
  'shopping',
  'transport',
  'other',
]);

export const taskSourceEnum = pgEnum('task_source', [
  'manual',
  'ai',
  'questionnaire',
  'appointment',
]);

// ──────────────────────────────────────────────────────────────────────────────
// Families
// ──────────────────────────────────────────────────────────────────────────────

export const families = pgTable('families', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyName: text('family_name').notNull(),
  inviteCode: varchar('invite_code', { length: 16 }).unique(),
  subscriptionTier: varchar('subscription_tier', { length: 32 }).default('free'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  onboardingStatus: varchar('onboarding_status', { length: 32 }).default('pending'),
  preferences: jsonb('preferences').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  avatarUrl: text('avatar_url'),
  timezone: varchar('timezone', { length: 64 }),
  locale: varchar('locale', { length: 8 }).default('he'),
  isActive: boolean('is_active').notNull().default(true),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Sessions
// ──────────────────────────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(), // random token
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Patients
// ──────────────────────────────────────────────────────────────────────────────

export const patients = pgTable('patients', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 16 }),
  photoUrl: text('photo_url'),
  idNumber: text('id_number'), // מוצפן ברמת השרות
  primaryDiagnosis: text('primary_diagnosis'),
  chronicConditions: jsonb('chronic_conditions').$type<string[]>(),
  allergies: jsonb('allergies').$type<Array<{ name: string; severity?: string }>>(),
  emergencyContact: text('emergency_contact'),
  emergencyContactPhone: text('emergency_contact_phone'),
  primaryDoctorName: text('primary_doctor_name'),
  primaryDoctorPhone: text('primary_doctor_phone'),
  healthFundName: text('health_fund_name'),
  notes: text('notes'),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Tasks
// ──────────────────────────────────────────────────────────────────────────────

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assignedToUserId: uuid('assigned_to_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('todo'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  category: taskCategoryEnum('category').default('other'),
  source: taskSourceEnum('source').default('manual'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  completedByUserId: uuid('completed_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringPattern: jsonb('recurring_pattern').$type<Record<string, unknown>>(),
  relatedAppointmentId: uuid('related_appointment_id'),
  position: integer('position'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────────────────────────

export const familiesRelations = relations(families, ({ many }) => ({
  users: many(users),
  patients: many(patients),
  tasks: many(tasks),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  family: one(families, {
    fields: [users.familyId],
    references: [families.id],
  }),
  createdTasks: many(tasks, { relationName: 'createdTasks' }),
  assignedTasks: many(tasks, { relationName: 'assignedTasks' }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  family: one(families, {
    fields: [patients.familyId],
    references: [families.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  family: one(families, {
    fields: [tasks.familyId],
    references: [families.id],
  }),
  patient: one(patients, {
    fields: [tasks.patientId],
    references: [patients.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
    relationName: 'createdTasks',
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToUserId],
    references: [users.id],
    relationName: 'assignedTasks',
  }),
}));
