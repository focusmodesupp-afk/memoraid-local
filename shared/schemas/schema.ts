import {
  pgTable,
  primaryKey,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  date,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ──────────────────────────────────────────────────────────────────────────────
// Enums (בהתאם ל‑PRD)
// ──────────────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['manager', 'caregiver', 'viewer', 'guest']);

export const taskStatusEnum = pgEnum('task_status', [
  'requested',
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

// ── Medical Brain & Heart enums ──────────────────────────────────────────────

export const vitalTypeEnum = pgEnum('vital_type', [
  'blood_pressure',
  'blood_sugar',
  'weight',
  'heart_rate',
  'temperature',
  'oxygen_saturation',
  'respiratory_rate',
  'pain_level',
]);

export const referralStatusEnum = pgEnum('referral_status', [
  'pending',
  'scheduled',
  'completed',
  'cancelled',
  'expired',
]);

export const insightSeverityEnum = pgEnum('insight_severity', [
  'info',
  'warning',
  'critical',
]);

export const assessmentTypeEnum = pgEnum('assessment_type', [
  'adl',
  'iadl',
  'mmse',
  'gds',
  'falls_risk',
  'pain',
  'nutrition',
  'frailty',
]);

export const diagnosisStatusEnum = pgEnum('diagnosis_status', [
  'active',
  'resolved',
  'suspected',
  'ruled_out',
]);

export const allergenTypeEnum = pgEnum('allergen_type', [
  'drug',
  'food',
  'environment',
  'contrast',
  'other',
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

// Family invites – קודי הזמנה ספציפיים עם role/memberTier/permissions
// @see shared/constants/permissions.ts – PERMISSIONS, UserRole, MemberTier
// slot: 'family'|'supporter'|'viewer' – 3 קודי ברירת מחדל קבועים לפי סוג משתמש
export const familyInvites = pgTable('family_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 24 }).notNull().unique(),
  slot: varchar('slot', { length: 16 }), // 'family'|'supporter'|'viewer' – קוד לפי סוג
  role: userRoleEnum('role').notNull().default('viewer'),
  memberTier: varchar('member_tier', { length: 32 }).default('supporter_friend'),
  permissions: jsonb('permissions').$type<string[]>().default([]),
  emailOptional: varchar('email_optional', { length: 255 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
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
  primaryFamilyId: uuid('primary_family_id').references(() => families.id, { onDelete: 'set null' }),
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
  // Caregiving role & influence
  familyRole: varchar('family_role', { length: 32 }),
  familyRoles: jsonb('family_roles').$type<string[]>(),
  influenceAreas: jsonb('influence_areas').$type<string[]>(),
  proximity: varchar('proximity', { length: 16 }),
  availability: jsonb('availability').$type<{ days?: string[]; notes?: string }>(),
  userColor: varchar('user_color', { length: 7 }).default('#6366f1'), // hex colour shown on kanban cards
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Family members (many-to-many: user <-> family, with role + permissions per family)
// ──────────────────────────────────────────────────────────────────────────────

export const familyMembers = pgTable(
  'family_members',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull().default('viewer'),
    memberTier: varchar('member_tier', { length: 32 }).default('family'), // family | supporter_friend | supporter_medical
    permissions: jsonb('permissions').$type<string[]>().default([]),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.familyId] }),
  }),
);

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
  // Phase 1 – הרחבת סכמה
  profileCompletionScore: integer('profile_completion_score').default(0),
  onboardingStep: integer('onboarding_step').default(1),
  insuranceNumber: text('insurance_number'), // מוצפן ברמת השרות
  bloodType: varchar('blood_type', { length: 8 }),
  mobilityStatus: varchar('mobility_status', { length: 32 }),
  cognitiveStatus: varchar('cognitive_status', { length: 32 }),
  careLevel: varchar('care_level', { length: 32 }),
  lastAssessmentDate: date('last_assessment_date'),
  // Phase 2 – Medical Brain & Heart
  adlScore: integer('adl_score'),
  iadlScore: integer('iadl_score'),
  fallRiskLevel: varchar('fall_risk_level', { length: 16 }),
  painLevel: integer('pain_level'),
  nutritionStatus: varchar('nutrition_status', { length: 32 }),
  height: decimal('height', { precision: 5, scale: 1 }),
  weight: decimal('weight', { precision: 6, scale: 2 }),
  specialists: jsonb('specialists').$type<Array<{ name: string; specialty: string; phone?: string; lastVisit?: string }>>(),
  sdohFactors: jsonb('sdoh_factors').$type<{ housingSecure?: boolean; foodSecure?: boolean; transportAccess?: boolean; socialSupport?: string }>(),
  vaccinationHistory: jsonb('vaccination_history').$type<Array<{ name: string; date?: string; nextDue?: string }>>(),
  lastHospitalizationDate: date('last_hospitalization_date'),
  advanceDirectives: boolean('advance_directives').default(false),
  advanceDirectivesNotes: text('advance_directives_notes'),
  dnrStatus: boolean('dnr_status').default(false),
  // Care journey stage
  careStage: varchar('care_stage', { length: 32 }).default('suspicion'),
  stageUpdatedAt: timestamp('stage_updated_at', { withTimezone: true }),
  familyHistory: jsonb('family_history').$type<Array<{ relation: string; condition: string; ageOfOnset?: number; notes?: string }>>(),
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
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
  // Phase 2 – Medical Brain & Heart
  sourceEntityType: varchar('source_entity_type', { length: 32 }),
  sourceEntityId: uuid('source_entity_id'),
  linkedReferralId: uuid('linked_referral_id'),
  linkedDocumentIds: jsonb('linked_document_ids').$type<string[]>().default([]), // attached medical documents (array)
  coAssigneeIds: jsonb('co_assignee_ids').$type<string[]>().default([]), // additional assignees
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Task Checklists  (sub-tasks / checklist items)
// ──────────────────────────────────────────────────────────────────────────────

export const taskChecklists = pgTable('task_checklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  text: varchar('text', { length: 500 }).notNull(),
  isDone: boolean('is_done').notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Professionals Directory
// ──────────────────────────────────────────────────────────────────────────────

export const professionals = pgTable('professionals', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 32 }).notNull().default('medical'),
    // 'medical' | 'legal' | 'financial' | 'welfare' | 'other'
  specialty: varchar('specialty', { length: 128 }),
  clinicOrCompany: varchar('clinic_or_company', { length: 255 }),
  phone: varchar('phone', { length: 64 }),
  fax: varchar('fax', { length: 64 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  website: varchar('website', { length: 255 }),
  notes: text('notes'),
  linkedDocumentIds: jsonb('linked_document_ids').$type<string[]>().default([]),
  lastInteractionDate: date('last_interaction_date'),
  source: varchar('source', { length: 32 }).default('manual'), // 'manual' | 'ai_extracted'
  nameNormalized: varchar('name_normalized', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Google Calendar Integration
// ──────────────────────────────────────────────────────────────────────────────

export const userGoogleCalendarTokens = pgTable('user_google_calendar_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  calendarId: varchar('calendar_id', { length: 255 }).default('primary'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taskCalendarSync = pgTable(
  'task_calendar_sync',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    calendarEventId: varchar('calendar_event_id', { length: 255 }).notNull(),
    syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.userId] }),
  })
);

// ──────────────────────────────────────────────────────────────────────────────
// Questionnaires and responses
// ──────────────────────────────────────────────────────────────────────────────

export const questionnaires = pgTable('questionnaires', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  questions: jsonb('questions').$type<Array<{ id: string; text: string; type: 'text' | 'number' | 'scale' | 'choice' }>>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const memoryStories = pgTable('memory_stories', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  imageUrl: text('image_url'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }),
  location: varchar('location', { length: 255 }),
  emotionalTone: varchar('emotional_tone', { length: 32 }),
  tags: jsonb('tags').$type<string[]>(),
  aiInsight: text('ai_insight'),
  isReportedToDoctor: boolean('is_reported_to_doctor').default(false),
  severity: integer('severity'),
  careStage: varchar('care_stage', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const medicalDocuments = pgTable('medical_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  documentType: varchar('document_type', { length: 64 }),
  fileUrl: text('file_url'),
  aiAnalysisStatus: varchar('ai_analysis_status', { length: 32 }),
  aiAnalysisResult: jsonb('ai_analysis_result').$type<Record<string, unknown>>(),
  extractedMedications: jsonb('extracted_medications').$type<Array<{ name: string; dosage?: string }>>(),
  extractedTasks: jsonb('extracted_tasks').$type<Array<{ title: string; description?: string }>>(),
  simplifiedDiagnosis: text('simplified_diagnosis'),
  documentDate: date('document_date'),
  issuingDoctor: varchar('issuing_doctor', { length: 255 }),
  hospitalName: varchar('hospital_name', { length: 255 }),
  // Phase 2 – Medical Brain & Heart
  extractedReferrals: jsonb('extracted_referrals').$type<Array<{ specialty: string; reason: string; urgency: string }>>(),
  extractedLabValues: jsonb('extracted_lab_values').$type<Array<{ name: string; value: string; unit?: string; isAbnormal: boolean }>>(),
  extractedVitals: jsonb('extracted_vitals').$type<Array<{ type: string; value: number; value2?: number; unit: string; isAbnormal?: boolean }>>(),
  syncStatus: varchar('sync_status', { length: 32 }),
  syncCompletedAt: timestamp('sync_completed_at', { withTimezone: true }),
  isArchiveOnly: boolean('is_archive_only').notNull().default(false), // true = stored without AI analysis
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const medications = pgTable('medications', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  genericName: varchar('generic_name', { length: 255 }),
  dosage: varchar('dosage', { length: 64 }),
  frequency: varchar('frequency', { length: 64 }),
  timing: jsonb('timing').$type<string[]>(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  prescribingDoctor: varchar('prescribing_doctor', { length: 255 }),
  isActive: boolean('is_active').default(true),
  sourceDocumentId: uuid('source_document_id').references(() => medicalDocuments.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Medical Brain & Heart — 9 New Core Tables
// ──────────────────────────────────────────────────────────────────────────────

export const vitals = pgTable('vitals', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  type: vitalTypeEnum('type').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  value2: decimal('value2', { precision: 10, scale: 2 }),
  unit: varchar('unit', { length: 32 }).notNull(),
  isAbnormal: boolean('is_abnormal').default(false),
  notes: text('notes'),
  sourceDocumentId: uuid('source_document_id').references(() => medicalDocuments.id, { onDelete: 'set null' }),
  recordedByUserId: uuid('recorded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const labResults = pgTable('lab_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  testName: varchar('test_name', { length: 255 }).notNull(),
  value: varchar('value', { length: 64 }).notNull(),
  unit: varchar('unit', { length: 32 }),
  referenceRangeLow: varchar('reference_range_low', { length: 32 }),
  referenceRangeHigh: varchar('reference_range_high', { length: 32 }),
  isAbnormal: boolean('is_abnormal').default(false),
  testDate: date('test_date'),
  orderingDoctor: varchar('ordering_doctor', { length: 255 }),
  labName: varchar('lab_name', { length: 255 }),
  sourceDocumentId: uuid('source_document_id').references(() => medicalDocuments.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const referrals = pgTable('referrals', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  specialty: varchar('specialty', { length: 128 }).notNull(),
  reason: text('reason').notNull(),
  urgency: varchar('urgency', { length: 16 }).notNull().default('routine'),
  status: referralStatusEnum('status').notNull().default('pending'),
  referringDoctor: varchar('referring_doctor', { length: 255 }),
  scheduledDate: date('scheduled_date'),
  completedDate: date('completed_date'),
  notes: text('notes'),
  sourceDocumentId: uuid('source_document_id').references(() => medicalDocuments.id, { onDelete: 'set null' }),
  linkedTaskId: uuid('linked_task_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  appointmentType: varchar('appointment_type', { length: 64 }),
  doctorName: varchar('doctor_name', { length: 255 }),
  specialty: varchar('specialty', { length: 128 }),
  location: varchar('location', { length: 255 }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  status: varchar('status', { length: 32 }).notNull().default('scheduled'),
  notes: text('notes'),
  relatedReferralId: uuid('related_referral_id').references(() => referrals.id, { onDelete: 'set null' }),
  relatedTaskId: uuid('related_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const patientDiagnoses = pgTable('patient_diagnoses', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  condition: varchar('condition', { length: 255 }).notNull(),
  icdCode: varchar('icd_code', { length: 16 }),
  diagnosedDate: date('diagnosed_date'),
  status: diagnosisStatusEnum('status').notNull().default('active'),
  severity: varchar('severity', { length: 16 }),
  notes: text('notes'),
  sourceDocumentId: uuid('source_document_id').references(() => medicalDocuments.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const patientAllergies = pgTable(
  'patient_allergies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    allergen: varchar('allergen', { length: 255 }).notNull(),
    allergenType: allergenTypeEnum('allergen_type').default('other'),
    reaction: text('reaction'),
    severity: varchar('severity', { length: 32 }),
    confirmedDate: date('confirmed_date'),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    sourceDocumentId: uuid('source_document_id').references(() => medicalDocuments.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    patientAllergenIdx: index('idx_allergies_patient_allergen').on(table.patientId, table.allergen),
  })
);

export const patientAssessments = pgTable('patient_assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  assessmentType: assessmentTypeEnum('assessment_type').notNull(),
  score: integer('score').notNull(),
  maxScore: integer('max_score'),
  details: jsonb('details').$type<Record<string, unknown>>(),
  interpretation: text('interpretation'),
  assessedByUserId: uuid('assessed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  assessedAt: timestamp('assessed_at', { withTimezone: true }).defaultNow().notNull(),
  nextAssessmentDue: date('next_assessment_due'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const patientHealthInsights = pgTable('patient_health_insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  sourceDocumentId: uuid('source_document_id').references(() => medicalDocuments.id, { onDelete: 'set null' }),
  insightType: varchar('insight_type', { length: 64 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  severity: insightSeverityEnum('severity').notNull().default('info'),
  status: varchar('status', { length: 32 }).notNull().default('new'),
  acknowledgedByUserId: uuid('acknowledged_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  relatedEntityType: varchar('related_entity_type', { length: 32 }),
  relatedEntityId: uuid('related_entity_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const syncEvents = pgTable('sync_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
  sourceType: varchar('source_type', { length: 32 }).notNull(),
  sourceId: uuid('source_id').notNull(),
  targetType: varchar('target_type', { length: 32 }).notNull(),
  targetId: uuid('target_id'),
  action: varchar('action', { length: 32 }).notNull(),
  triggeredBy: varchar('triggered_by', { length: 64 }).notNull().default('ai'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  oldValue: jsonb('old_value').$type<Record<string, unknown>>(),
  newValue: jsonb('new_value').$type<Record<string, unknown>>(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Medical Brain Rules ───────────────────────────────────────────────────────
// Custom rules that override or extend the built-in Medical Brain logic.
export const medicalBrainRules = pgTable('medical_brain_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').references(() => families.id, { onDelete: 'cascade' }),
  ruleType: varchar('rule_type', { length: 64 }).notNull(), // 'lab_threshold' | 'allergy_alert' | 'medication_warning' | 'custom'
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  triggerCondition: jsonb('trigger_condition').$type<Record<string, unknown>>().notNull(),
  actions: jsonb('actions').$type<Record<string, unknown>[]>().notNull(),
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(50), // 1-100, higher = runs first
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rightsCategories = pgTable('rights_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  titleHe: varchar('title_he', { length: 255 }).notNull(),
  titleEn: varchar('title_en', { length: 255 }),
  descriptionHe: text('description_he'),
  descriptionEn: text('description_en'),
  icon: varchar('icon', { length: 32 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rightsRequests = pgTable('rights_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  categorySlug: varchar('category_slug', { length: 64 }),
  notes: text('notes'),
  status: varchar('status', { length: 32 }).default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const questionnaireResponses = pgTable('questionnaire_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionnaireId: uuid('questionnaire_id')
    .notNull()
    .references(() => questionnaires.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  answers: jsonb('answers').$type<Record<string, unknown>>().notNull().default({}),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────────────────────────

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  user: one(users, { fields: [familyMembers.userId], references: [users.id] }),
  family: one(families, { fields: [familyMembers.familyId], references: [families.id] }),
  invitedByUser: one(users, { fields: [familyMembers.invitedBy], references: [users.id], relationName: 'invitedBy' }),
}));

export const familyInvitesRelations = relations(familyInvites, ({ one }) => ({
  family: one(families, { fields: [familyInvites.familyId], references: [families.id] }),
}));

export const familiesRelations = relations(families, ({ many }) => ({
  users: many(users, { relationName: 'familyUsers' }),
  primaryFamilyUsers: many(users, { relationName: 'primaryFamily' }),
  members: many(familyMembers),
  invites: many(familyInvites),
  patients: many(patients),
  tasks: many(tasks),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  family: one(families, {
    fields: [users.familyId],
    references: [families.id],
    relationName: 'familyUsers',
  }),
  primaryFamily: one(families, {
    fields: [users.primaryFamilyId],
    references: [families.id],
    relationName: 'primaryFamily',
  }),
  familyMemberships: many(familyMembers),
  createdTasks: many(tasks, { relationName: 'createdTasks' }),
  assignedTasks: many(tasks, { relationName: 'assignedTasks' }),
  sessions: many(sessions),
  notifications: many(notifications),
  notificationPreferences: one(notificationPreferences),
  userSettings: one(userSettings),
  googleCalendarTokens: one(userGoogleCalendarTokens),
  taskCalendarSyncs: many(taskCalendarSync),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const userGoogleCalendarTokensRelations = relations(userGoogleCalendarTokens, ({ one }) => ({
  user: one(users, {
    fields: [userGoogleCalendarTokens.userId],
    references: [users.id],
  }),
}));

export const taskCalendarSyncRelations = relations(taskCalendarSync, ({ one }) => ({
  task: one(tasks, {
    fields: [taskCalendarSync.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskCalendarSync.userId],
    references: [users.id],
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Admin users & sessions (מערכת Admin נפרדת)
// ──────────────────────────────────────────────────────────────────────────────

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: varchar('full_name', { length: 255 }),
  role: varchar('role', { length: 32 }).notNull().default('support'), // super_admin | support
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminSessions = pgTable('admin_sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  adminUserId: uuid('admin_user_id')
    .notNull()
    .references(() => adminUsers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [adminSessions.adminUserId],
    references: [adminUsers.id],
  }),
}));

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 64 }).notNull(),
  entityType: varchar('entity_type', { length: 64 }),
  entityId: uuid('entity_id'),
  oldValue: jsonb('old_value').$type<Record<string, unknown>>(),
  newValue: jsonb('new_value').$type<Record<string, unknown>>(),
  ipAddress: varchar('ip_address', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 64 }).notNull().unique(),
  enabled: boolean('enabled').notNull().default(false),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const appVersions = pgTable('app_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: varchar('version', { length: 32 }).notNull(),
  platform: varchar('platform', { length: 16 }).notNull().default('web'),
  releaseNotes: text('release_notes'),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const errorLogs = pgTable('error_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  level: varchar('level', { length: 16 }).notNull().default('error'),
  message: text('message').notNull(),
  stackTrace: text('stack_trace'),
  context: jsonb('context').$type<Record<string, unknown>>(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  familyId: uuid('family_id').references(() => families.id, { onDelete: 'set null' }),
  url: text('url'),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 64 }),
  resolved: boolean('resolved').notNull().default(false),
  resolvedBy: uuid('resolved_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contentPages = pgTable('content_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  metaDescription: text('meta_description'),
  published: boolean('published').notNull().default(false),
  locale: varchar('locale', { length: 8 }).notNull().default('he'),
  updatedBy: uuid('updated_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mediaLibrary = pgTable('media_library', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 64 }),
  sizeBytes: integer('size_bytes'),
  url: text('url').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').references(() => families.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  model: varchar('model', { length: 64 }).notNull(),
  tokensUsed: integer('tokens_used').notNull().default(0),
  costUsd: varchar('cost_usd', { length: 16 }).default('0'),
  endpoint: varchar('endpoint', { length: 128 }),
  responseTimeMs: integer('response_time_ms'),
  errorOccurred: boolean('error_occurred').default(false),
  errorMessage: text('error_message'),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminAiAnalyses = pgTable('admin_ai_analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 32 }).notNull(),
  query: text('query'),
  report: text('report').notNull(),
  depth: varchar('depth', { length: 16 }),
  scope: varchar('scope', { length: 16 }),
  model: varchar('model', { length: 64 }),
  tokensUsed: integer('tokens_used').default(0),
  costUsd: varchar('cost_usd', { length: 24 }).default('0'),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  attachedFileIds: uuid('attached_file_ids').array().default([]),
  adminFullName: varchar('admin_full_name', { length: 255 }),
  analysisMetadata: jsonb('analysis_metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  // Rating fields
  outputQuality: integer('output_quality'),
  devQuality: integer('dev_quality'),
  processSpeed: varchar('process_speed', { length: 16 }),
  ratedAt: timestamp('rated_at', { withTimezone: true }),
  ratedBy: uuid('rated_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  // Intelligence Hub
  responseTimeMs: integer('response_time_ms'),
  questionQualityScore: integer('question_quality_score'),
  resultedInTasks: boolean('resulted_in_tasks').default(false),
  taskCount: integer('task_count').default(0),
  useCase: varchar('use_case', { length: 64 }),
  tags: text('tags').array(),
});

export const aiAnalysisAttachments = pgTable('ai_analysis_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => adminAiAnalyses.id, { onDelete: 'cascade' }),
  mediaId: uuid('media_id').references(() => mediaLibrary.id, { onDelete: 'set null' }),
  fileRole: varchar('file_role', { length: 64 }).default('context'),
  processingMethod: varchar('processing_method', { length: 64 }).default('vision'),
  tokensUsed: integer('tokens_used').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiModelBenchmarks = pgTable('ai_model_benchmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  model: varchar('model', { length: 64 }).notNull(),
  benchmarkDate: date('benchmark_date').notNull(),
  speedScore: integer('speed_score'),
  qualityScore: integer('quality_score'),
  costScore: integer('cost_score'),
  reliabilityScore: integer('reliability_score'),
  capabilityScore: integer('capability_score'),
  compositeScore: integer('composite_score'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  insightType: varchar('insight_type', { length: 64 }).notNull(),
  severity: varchar('severity', { length: 16 }).notNull().default('info'),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  data: jsonb('data').$type<Record<string, unknown>>(),
  modelRef: varchar('model_ref', { length: 64 }),
  adminRef: uuid('admin_ref').references(() => adminUsers.id, { onDelete: 'set null' }),
  isRead: boolean('is_read').default(false),
  isDismissed: boolean('is_dismissed').default(false),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiUsageDailySummary = pgTable('ai_usage_daily_summary', {
  id: uuid('id').defaultRandom().primaryKey(),
  summaryDate: date('summary_date').notNull(),
  model: varchar('model', { length: 64 }).notNull(),
  endpoint: varchar('endpoint', { length: 128 }),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  totalCalls: integer('total_calls').default(0),
  totalTokens: integer('total_tokens').default(0),
  totalCostUsd: decimal('total_cost_usd', { precision: 12, scale: 6 }).default('0'),
  avgTokensPerCall: integer('avg_tokens_per_call'),
  successCount: integer('success_count').default(0),
  errorCount: integer('error_count').default(0),
  avgQualityScore: decimal('avg_quality_score', { precision: 4, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const patientsRelations = relations(patients, ({ one, many }) => ({
  family: one(families, {
    fields: [patients.familyId],
    references: [families.id],
  }),
  tasks: many(tasks),
  medications: many(medications),
  vitals: many(vitals),
  labResults: many(labResults),
  referrals: many(referrals),
  appointments: many(appointments),
  diagnoses: many(patientDiagnoses),
  allergies: many(patientAllergies),
  assessments: many(patientAssessments),
  healthInsights: many(patientHealthInsights),
}));

export const vitalsRelations = relations(vitals, ({ one }) => ({
  patient: one(patients, { fields: [vitals.patientId], references: [patients.id] }),
  family: one(families, { fields: [vitals.familyId], references: [families.id] }),
  sourceDocument: one(medicalDocuments, { fields: [vitals.sourceDocumentId], references: [medicalDocuments.id] }),
  recordedBy: one(users, { fields: [vitals.recordedByUserId], references: [users.id] }),
}));

export const labResultsRelations = relations(labResults, ({ one }) => ({
  patient: one(patients, { fields: [labResults.patientId], references: [patients.id] }),
  family: one(families, { fields: [labResults.familyId], references: [families.id] }),
  sourceDocument: one(medicalDocuments, { fields: [labResults.sourceDocumentId], references: [medicalDocuments.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  patient: one(patients, { fields: [referrals.patientId], references: [patients.id] }),
  family: one(families, { fields: [referrals.familyId], references: [families.id] }),
  sourceDocument: one(medicalDocuments, { fields: [referrals.sourceDocumentId], references: [medicalDocuments.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  family: one(families, { fields: [appointments.familyId], references: [families.id] }),
  relatedReferral: one(referrals, { fields: [appointments.relatedReferralId], references: [referrals.id] }),
  relatedTask: one(tasks, { fields: [appointments.relatedTaskId], references: [tasks.id] }),
}));

export const patientDiagnosesRelations = relations(patientDiagnoses, ({ one }) => ({
  patient: one(patients, { fields: [patientDiagnoses.patientId], references: [patients.id] }),
  family: one(families, { fields: [patientDiagnoses.familyId], references: [families.id] }),
  sourceDocument: one(medicalDocuments, { fields: [patientDiagnoses.sourceDocumentId], references: [medicalDocuments.id] }),
}));

export const patientAllergiesRelations = relations(patientAllergies, ({ one }) => ({
  patient: one(patients, { fields: [patientAllergies.patientId], references: [patients.id] }),
  family: one(families, { fields: [patientAllergies.familyId], references: [families.id] }),
  sourceDocument: one(medicalDocuments, { fields: [patientAllergies.sourceDocumentId], references: [medicalDocuments.id] }),
}));

export const patientAssessmentsRelations = relations(patientAssessments, ({ one }) => ({
  patient: one(patients, { fields: [patientAssessments.patientId], references: [patients.id] }),
  family: one(families, { fields: [patientAssessments.familyId], references: [families.id] }),
  assessedBy: one(users, { fields: [patientAssessments.assessedByUserId], references: [users.id] }),
}));

export const patientHealthInsightsRelations = relations(patientHealthInsights, ({ one }) => ({
  patient: one(patients, { fields: [patientHealthInsights.patientId], references: [patients.id] }),
  family: one(families, { fields: [patientHealthInsights.familyId], references: [families.id] }),
  sourceDocument: one(medicalDocuments, { fields: [patientHealthInsights.sourceDocumentId], references: [medicalDocuments.id] }),
  acknowledgedBy: one(users, { fields: [patientHealthInsights.acknowledgedByUserId], references: [users.id] }),
}));

export const syncEventsRelations = relations(syncEvents, ({ one }) => ({
  family: one(families, { fields: [syncEvents.familyId], references: [families.id] }),
  patient: one(patients, { fields: [syncEvents.patientId], references: [patients.id] }),
}));

export const medicationsRelations = relations(medications, ({ one }) => ({
  patient: one(patients, { fields: [medications.patientId], references: [patients.id] }),
  family: one(families, { fields: [medications.familyId], references: [families.id] }),
  sourceDocument: one(medicalDocuments, {
    fields: [medications.sourceDocumentId],
    references: [medicalDocuments.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
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
  calendarSyncs: many(taskCalendarSync),
  checklists: many(taskChecklists),
}));

export const taskChecklistsRelations = relations(taskChecklists, ({ one }) => ({
  task: one(tasks, {
    fields: [taskChecklists.taskId],
    references: [tasks.id],
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Notifications (מרכז התראות)
// ──────────────────────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  type: varchar('type', { length: 32 }).default('info'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Notification preferences (הגדרות מרכז התראות)
// ──────────────────────────────────────────────────────────────────────────────

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),
  smsEnabled: boolean('sms_enabled').notNull().default(false),
  quietHoursEnabled: boolean('quiet_hours_enabled').notNull().default(false),
  quietHoursStart: varchar('quiet_hours_start', { length: 5 }).default('22:00'),
  quietHoursEnd: varchar('quiet_hours_end', { length: 5 }).default('07:00'),
  minSeverity: varchar('min_severity', { length: 32 }).default('info'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// User settings (הגדרות – תצוגה, יחידות, התראות, WhatsApp)
// ──────────────────────────────────────────────────────────────────────────────

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  darkMode: boolean('dark_mode').notNull().default(false),
  weightUnit: varchar('weight_unit', { length: 8 }).default('kg'),
  volumeUnit: varchar('volume_unit', { length: 8 }).default('ml'),
  prescriptionReminder: boolean('prescription_reminder').notNull().default(true),
  missedDoseAlert: boolean('missed_dose_alert').notNull().default(true),
  abnormalMeasurementsAlert: boolean('abnormal_measurements_alert').notNull().default(true),
  reminderChannel: varchar('reminder_channel', { length: 32 }).default('push'),
  pushChannel: varchar('push_channel', { length: 32 }).default('browser'),
  dndStart: varchar('dnd_start', { length: 5 }),
  dndEnd: varchar('dnd_end', { length: 5 }),
  whatsappPhone: varchar('whatsapp_phone', { length: 32 }),
  whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),
  whatsappMedication: boolean('whatsapp_medication').notNull().default(false),
  whatsappVitals: boolean('whatsapp_vitals').notNull().default(false),
  whatsappDrink: boolean('whatsapp_drink').notNull().default(false),
  whatsappAppointments: boolean('whatsapp_appointments').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Password Reset Tokens
// ──────────────────────────────────────────────────────────────────────────────

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 128 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Development Kanban System
// ──────────────────────────────────────────────────────────────────────────────

export const devColumns = pgTable('dev_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 64 }).notNull(),
  position: integer('position').notNull(),
  color: varchar('color', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const devTasks = pgTable('dev_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  columnId: uuid('column_id').references(() => devColumns.id, { onDelete: 'set null' }),
  priority: varchar('priority', { length: 16 }).notNull().default('medium'),
  category: varchar('category', { length: 64 }),
  assignee: varchar('assignee', { length: 255 }),
  labels: text('labels').array(),
  estimateHours: integer('estimate_hours'),
  actualHours: integer('actual_hours'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  position: integer('position').notNull().default(0),
  sprintId: uuid('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
  phaseId: uuid('phase_id').references(() => devPhases.id, { onDelete: 'set null' }),
  targetFile: varchar('target_file', { length: 500 }),
  estimatedTokens: integer('estimated_tokens').default(0),
  dependsOn: jsonb('depends_on').$type<string[]>().default([]),
  environment: varchar('environment', { length: 16 }).default('admin'),
  aiGenerated: boolean('ai_generated').notNull().default(false),
  cursorPromptSnippet: text('cursor_prompt_snippet'),
  verificationSteps: jsonb('verification_steps').$type<string[]>().default([]),
  riskLevel: varchar('risk_level', { length: 32 }),
  nexusContext: jsonb('nexus_context').$type<{
    briefId?: string;
    briefTitle?: string;
    sourceDepartment?: string;
    webSources?: Array<{ id: string; sourceType: string; url: string; title: string; trustScore: number }>;
    departmentExcerpt?: string;
    docReferences?: Array<{ docType: string; title: string }>;
  }>(),
  createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const devComments = pgTable('dev_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => devTasks.id, { onDelete: 'cascade' }),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Dev Phases (Roadmap - from Work Plan)
// ──────────────────────────────────────────────────────────────────────────────

export const devPhases = pgTable('dev_phases', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  goals: jsonb('goals').$type<string[]>().default([]),
  techStack: jsonb('tech_stack').$type<string[]>().default([]),
  complexity: varchar('complexity', { length: 32 }),
  aiContext: text('ai_context'),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  aiAnalysisResult: jsonb('ai_analysis_result').$type<Record<string, unknown>>(),
  totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 4 }),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Sprint Management System
// ──────────────────────────────────────────────────────────────────────────────

export const sprints = pgTable('sprints', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  goal: text('goal'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('planning'),
  velocity: decimal('velocity', { precision: 10, scale: 2 }),
  phaseId: uuid('phase_id').references(() => devPhases.id, { onDelete: 'set null' }),
  estimatedTokens: integer('estimated_tokens'),
  estimatedCostUsd: decimal('estimated_cost_usd', { precision: 10, scale: 4 }),
  cursorPrompt: text('cursor_prompt'),
  riskLevel: varchar('risk_level', { length: 32 }),
  sprintOrder: integer('sprint_order').notNull().default(0),
  briefId: uuid('brief_id'),
  createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sprintTasks = pgTable('sprint_tasks', {
  sprintId: uuid('sprint_id')
    .notNull()
    .references(() => sprints.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id')
    .notNull()
    .references(() => devTasks.id, { onDelete: 'cascade' }),
  storyPoints: integer('story_points'),
  taskOrder: integer('task_order').notNull().default(0),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.sprintId, table.taskId] }),
}));

export const sprintActivities = pgTable('sprint_activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  sprintId: uuid('sprint_id')
    .notNull()
    .references(() => sprints.id, { onDelete: 'cascade' }),
  activityType: varchar('activity_type', { length: 64 }).notNull(),
  description: text('description').notNull(),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Pipelines System
// ──────────────────────────────────────────────────────────────────────────────

export const pipelines = pgTable('pipelines', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 64 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  config: jsonb('config'),
  schedule: varchar('schedule', { length: 128 }),
  lastRun: timestamp('last_run', { withTimezone: true }),
  nextRun: timestamp('next_run', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pipelineRuns = pgTable('pipeline_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  pipelineId: uuid('pipeline_id')
    .notNull()
    .references(() => pipelines.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 32 }).notNull().default('running'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationMs: integer('duration_ms'),
  recordsProcessed: integer('records_processed'),
  recordsSuccess: integer('records_success'),
  recordsFailed: integer('records_failed'),
  errorMessage: text('error_message'),
  logs: jsonb('logs'),
  triggeredBy: uuid('triggered_by').references(() => adminUsers.id, { onDelete: 'set null' }),
});

export const pipelineStages = pgTable('pipeline_stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  pipelineId: uuid('pipeline_id')
    .notNull()
    .references(() => pipelines.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  stageOrder: integer('stage_order').notNull(),
  stageType: varchar('stage_type', { length: 64 }).notNull(),
  config: jsonb('config'),
  timeoutSeconds: integer('timeout_seconds').default(300),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Admin Finance – עלויות והכנסות (Cursor, מערכות, מנויים)
// ──────────────────────────────────────────────────────────────────────────────

export const adminFinanceEntries = pgTable('admin_finance_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 16 }).notNull(), // 'income' | 'expense'
  category: varchar('category', { length: 64 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('ILS'),
  recurrence: varchar('recurrence', { length: 32 }).notNull().default('monthly'), // 'one_time' | 'monthly' | 'yearly'
  periodMonth: integer('period_month'),
  periodYear: integer('period_year'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Admin Plans – מטא-דאטה למסלולים (Stripe Products/Prices כמקור אמת)
// ──────────────────────────────────────────────────────────────────────────────

export const adminPlans = pgTable('admin_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceIdMonthly: varchar('stripe_price_id_monthly', { length: 255 }),
  stripePriceIdYearly: varchar('stripe_price_id_yearly', { length: 255 }),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  nameHe: varchar('name_he', { length: 255 }).notNull(),
  descriptionHe: text('description_he'),
  features: jsonb('features').$type<string[]>().default([]),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Admin Coupon Meta – מטא-דאטה לקודי קופון (Stripe Coupons/Promotion Codes כמקור אמת)
// ──────────────────────────────────────────────────────────────────────────────

export const adminCouponMeta = pgTable('admin_coupon_meta', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripePromotionCodeId: varchar('stripe_promotion_code_id', { length: 255 }).notNull().unique(),
  source: varchar('source', { length: 32 }).notNull().default('other'), // newsletter | social | partner | other
  campaignName: varchar('campaign_name', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pipelineAlerts = pgTable('pipeline_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  pipelineId: uuid('pipeline_id')
    .notNull()
    .references(() => pipelines.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').references(() => pipelineRuns.id, { onDelete: 'cascade' }),
  alertType: varchar('alert_type', { length: 64 }).notNull(),
  severity: varchar('severity', { length: 32 }).notNull(),
  message: text('message').notNull(),
  resolved: boolean('resolved').notNull().default(false),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Nexus – Virtual Software House Brain
// ──────────────────────────────────────────────────────────────────────────────

export const nexusBriefStatusEnum = pgEnum('nexus_brief_status', [
  'draft',
  'researching',
  'review',
  'approved',
  'rejected',
  'in_progress',
  'done',
]);

export const nexusBriefs = pgTable('nexus_briefs', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  ideaPrompt: text('idea_prompt').notNull(),
  status: nexusBriefStatusEnum('status').notNull().default('draft'),
  selectedDepartments: text('selected_departments').array().notNull().default([]),
  selectedModels: varchar('selected_models', { length: 32 }).array().notNull().default([]),
  assembledBrief: text('assembled_brief'),
  reviewNotes: text('review_notes'),
  contextNotes: text('context_notes'),
  targetPlatforms: text('target_platforms').array().notNull().default([]),
  codebaseDepth: varchar('codebase_depth', { length: 16 }).default('deep'),
  codebaseScope: varchar('codebase_scope', { length: 16 }).default('all'),
  totalCostUsd: varchar('total_cost_usd', { length: 24 }).default('0'),
  totalTokensUsed: integer('total_tokens_used').default(0),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  adminFullName: varchar('admin_full_name', { length: 255 }),
  researchStartedAt: timestamp('research_started_at', { withTimezone: true }),
  researchCompletedAt: timestamp('research_completed_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  generatedSprintId: uuid('generated_sprint_id'),
  phaseId: uuid('phase_id'),
  templateId: uuid('template_id'),
  researchMode: varchar('research_mode', { length: 16 }).default('quick'),
  currentRound: integer('current_round').default(0),
  round1Synthesis: text('round_1_synthesis'),
  round2Synthesis: text('round_2_synthesis'),
  round3Synthesis: text('round_3_synthesis'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nexusBriefDepartments = pgTable('nexus_brief_departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  briefId: uuid('brief_id')
    .notNull()
    .references(() => nexusBriefs.id, { onDelete: 'cascade' }),
  department: varchar('department', { length: 32 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  output: text('output'),
  modelUsed: varchar('model_used', { length: 64 }),
  tokensUsed: integer('tokens_used').default(0),
  costUsd: varchar('cost_usd', { length: 24 }).default('0'),
  errorMessage: text('error_message'),
  promptSnapshot: text('prompt_snapshot'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nexusBriefWebSources = pgTable('nexus_brief_web_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  briefId: uuid('brief_id')
    .notNull()
    .references(() => nexusBriefs.id, { onDelete: 'cascade' }),
  sourceType: varchar('source_type', { length: 32 }).notNull(),
  url: text('url'),
  title: varchar('title', { length: 500 }),
  snippet: text('snippet'),
  trustScore: integer('trust_score').default(0),
  githubStars: integer('github_stars'),
  redditScore: integer('reddit_score'),
  contributorCount: integer('contributor_count'),
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
  department: varchar('department', { length: 32 }),
  teamMemberId: uuid('team_member_id'),
  roundNumber: integer('round_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Nexus V2: Meeting Rounds — Multi-round research with per-employee agents
// ──────────────────────────────────────────────────────────────────────────────

export const nexusBriefRounds = pgTable('nexus_brief_rounds', {
  id: uuid('id').defaultRandom().primaryKey(),
  briefId: uuid('brief_id')
    .notNull()
    .references(() => nexusBriefs.id, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),
  roundType: varchar('round_type', { length: 32 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  synthesisOutput: text('synthesis_output'),
  synthesisModel: varchar('synthesis_model', { length: 64 }),
  synthesisTokens: integer('synthesis_tokens').default(0),
  synthesisCostUsd: varchar('synthesis_cost_usd', { length: 16 }).default('0'),
  participantCount: integer('participant_count').default(0),
  completedCount: integer('completed_count').default(0),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nexusBriefRoundResults = pgTable('nexus_brief_round_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  briefId: uuid('brief_id')
    .notNull()
    .references(() => nexusBriefs.id, { onDelete: 'cascade' }),
  roundId: uuid('round_id')
    .notNull()
    .references(() => nexusBriefRounds.id, { onDelete: 'cascade' }),
  teamMemberId: uuid('team_member_id'),
  department: varchar('department', { length: 32 }).notNull(),
  employeeName: varchar('employee_name', { length: 128 }),
  employeeRole: varchar('employee_role', { length: 128 }),
  employeeLevel: varchar('employee_level', { length: 16 }),
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  output: text('output'),
  outputJson: jsonb('output_json').$type<Record<string, unknown>>(),
  promptSnapshot: text('prompt_snapshot'),
  modelUsed: varchar('model_used', { length: 64 }),
  tokensUsed: integer('tokens_used').default(0),
  costUsd: varchar('cost_usd', { length: 16 }).default('0'),
  errorMessage: text('error_message'),
  webSourcesUsed: integer('web_sources_used').default(0),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Nexus Layer 2+3+4: Skills, Rules, Templates, Dept Settings, Extracted Tasks
// ──────────────────────────────────────────────────────────────────────────────

export const nexusSkills = pgTable('nexus_skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 64 }).notNull().unique(),
  labelHe: varchar('label_he', { length: 64 }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
  category: varchar('category', { length: 32 }).notNull().default('tech'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nexusRules = pgTable('nexus_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  triggerType: varchar('trigger_type', { length: 64 }).notNull(),
  conditionJson: jsonb('condition_json').notNull().$type<Record<string, unknown>>(),
  actionType: varchar('action_type', { length: 64 }).notNull(),
  actionPayload: jsonb('action_payload').$type<Record<string, unknown>>(),
  priority: integer('priority').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nexusTemplates = pgTable('nexus_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameHe: varchar('name_he', { length: 255 }).notNull(),
  description: text('description'),
  departments: text('departments').array().notNull().default([]),
  models: varchar('models', { length: 32 }).array().notNull().default([]),
  codebaseDepth: varchar('codebase_depth', { length: 16 }).notNull().default('deep'),
  codebaseScope: varchar('codebase_scope', { length: 16 }).notNull().default('all'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nexusDeptSettings = pgTable('nexus_dept_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  department: varchar('department', { length: 32 }).notNull().unique(),
  labelHe: varchar('label_he', { length: 64 }).notNull(),
  emoji: varchar('emoji', { length: 8 }).notNull().default('🏢'),
  systemPromptOverride: text('system_prompt_override'),
  defaultModel: varchar('default_model', { length: 64 }),
  isActive: boolean('is_active').notNull().default(true),
  outputSections: jsonb('output_sections').$type<string[]>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nexusExtractedTasks = pgTable('nexus_extracted_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  briefId: uuid('brief_id').notNull().references(() => nexusBriefs.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 16 }).notNull().default('medium'),
  estimateHours: integer('estimate_hours').default(4),
  category: varchar('category', { length: 32 }).default('feature'),
  skillTags: text('skill_tags').array().notNull().default([]),
  sourceDepartment: varchar('source_department', { length: 32 }),
  environment: varchar('environment', { length: 16 }).default('admin'),
  accepted: boolean('accepted').notNull().default(true),
  devTaskId: uuid('dev_task_id'),
  sprintId: uuid('sprint_id'),
  phaseId: uuid('phase_id'),
  position: integer('position').notNull().default(0),
  contextJson: jsonb('context_json').$type<{
    webSourceIds?: string[];
    departmentId?: string;
    docReferences?: Array<{ docType: string; sectionHint?: string }>;
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Nexus Question Discovery ─────────────────────────────────────────────────
export const nexusBriefQuestions = pgTable('nexus_brief_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  briefId: uuid('brief_id').notNull().references(() => nexusBriefs.id, { onDelete: 'cascade' }),
  department: varchar('department', { length: 32 }).notNull(),
  gate: varchar('gate', { length: 16 }).notNull(),
  role: varchar('role', { length: 64 }),
  question: text('question').notNull(),
  answer: text('answer'),
  answerSource: varchar('answer_source', { length: 32 }),
  sourceUrl: text('source_url'),
  confidence: integer('confidence').notNull().default(0),
  verified: boolean('verified').notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nexusQuestionTemplates = pgTable('nexus_question_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  department: varchar('department', { length: 32 }).notNull(),
  gate: varchar('gate', { length: 16 }).notNull(),
  role: varchar('role', { length: 64 }),
  question: text('question').notNull(),
  answerStrategy: varchar('answer_strategy', { length: 32 }).notNull(),
  priority: integer('priority').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
});

// ── Nexus Department Knowledge Base ──────────────────────────────────────────
export const nexusDeptKnowledge = pgTable('nexus_dept_knowledge', {
  id: uuid('id').defaultRandom().primaryKey(),
  department: varchar('department', { length: 32 }).notNull(),
  category: varchar('category', { length: 32 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
