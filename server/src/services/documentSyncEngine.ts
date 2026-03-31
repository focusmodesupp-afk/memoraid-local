/**
 * Document Sync Engine — Medical Brain & Heart
 *
 * Central routing service: takes the full MedicalAnalysisResult from an
 * analyzed document and intelligently distributes every extracted data point
 * to the correct table, triggers notifications, and creates AI health insights.
 *
 * Replaces/extends the old runMedicalDocumentPostProcessor in routes.ts.
 */

import { and, eq, desc, gte, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../db';
import {
  medications,
  tasks,
  notifications,
  vitals,
  labResults,
  referrals,
  patientDiagnoses,
  patientAllergies,
  patientHealthInsights,
  syncEvents,
  medicalDocuments,
  patients,
  familyMembers,
  professionals,
} from '../../../shared/schemas/schema';
import type { MedicalAnalysisResult } from './medicalDocumentAnalyzer';
import { runCorrelationEngine } from './medicalCorrelations';
import { runSafetyEngine } from './medicalSafetyEngine';
import { processPsychiatricDocument } from './processors/psychiatricDocumentProcessor';
import { processGeriatricDocument } from './processors/geriatricDocumentProcessor';
import { processHospitalDischarge, isDischargeDocument } from './processors/hospitalDischargeProcessor';
import { processImagingDocument } from './processors/imagingDocumentProcessor';
import { processSocialDocument } from './processors/socialDocumentProcessor';

export interface SyncInput {
  result: MedicalAnalysisResult;
  doc: {
    id: string;
    patientId: string | null;
    familyId: string;
    issuingDoctor?: string | null;
    title?: string | null;
  };
  userId: string;
}

export interface SyncSummary {
  medicationsCreated: number;
  medicationsSkipped: number;
  vitalsCreated: number;
  labResultsCreated: number;
  referralsCreated: number;
  tasksCreated: number;
  diagnosesCreated: number;
  insightsCreated: number;
  correlationsFound: number;
  safetyAlertsFound: number;
  errors: string[];
}

// ─── Helper: log a sync event ─────────────────────────────────────────────────
async function logSync(
  familyId: string,
  patientId: string | null,
  sourceId: string,
  targetType: string,
  targetId: string | null,
  action: string,
  metadata?: Record<string, unknown>
) {
  try {
    await db.insert(syncEvents).values({
      familyId,
      patientId: patientId ?? undefined,
      sourceType: 'document',
      sourceId,
      targetType,
      targetId: targetId ?? undefined,
      action,
      triggeredBy: 'ai',
      metadata,
    });
  } catch {
    // Never crash on audit log failure
  }
}

// ─── Helper: create a patient health insight ─────────────────────────────────
async function createInsight(
  patientId: string,
  familyId: string,
  sourceDocumentId: string,
  insightType: string,
  title: string,
  content: string,
  severity: 'info' | 'warning' | 'critical',
  relatedEntityType?: string,
  relatedEntityId?: string
): Promise<string | null> {
  try {
    const [row] = await db
      .insert(patientHealthInsights)
      .values({
        patientId,
        familyId,
        sourceDocumentId,
        insightType,
        title,
        content,
        severity,
        status: 'new',
        relatedEntityType,
        relatedEntityId,
      })
      .returning({ id: patientHealthInsights.id });
    return row?.id ?? null;
  } catch (err) {
    console.error('[SyncEngine] createInsight failed:', err);
    return null;
  }
}

// ─── Helper: notify all family managers ──────────────────────────────────────
async function notifyFamilyManagers(
  familyId: string,
  title: string,
  body: string,
  type: string
) {
  try {
    const managers = await db
      .select({ userId: familyMembers.userId })
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.role, 'manager')));

    if (managers.length === 0) return;

    await db.insert(notifications).values(
      managers.map((m) => ({
        userId: m.userId,
        title,
        body,
        type,
      }))
    );
  } catch (err) {
    console.error('[SyncEngine] notifyFamilyManagers failed:', err);
  }
}

// ─── Helper: detect trend — 3+ consecutive abnormal vitals of same type ──────
async function checkVitalTrend(
  patientId: string,
  familyId: string,
  sourceDocumentId: string,
  vitalType: string,
  summary: SyncSummary
) {
  try {
    const recent = await db
      .select({ isAbnormal: vitals.isAbnormal })
      .from(vitals)
      .where(and(eq(vitals.patientId, patientId), eq(vitals.type, vitalType as any)))
      .orderBy(desc(vitals.recordedAt))
      .limit(4);

    const abnormalCount = recent.filter((v) => v.isAbnormal).length;
    if (abnormalCount >= 3) {
      const insightId = await createInsight(
        patientId,
        familyId,
        sourceDocumentId,
        'trend_detection',
        `מגמה חריגה: ${vitalType}`,
        `זוהו ${abnormalCount} מדידות חריגות רצופות של ${vitalType}. מומלץ להתייעץ עם הרופא.`,
        'warning'
      );
      if (insightId) summary.insightsCreated++;
    }
  } catch (err) {
    console.error('[SyncEngine] checkVitalTrend failed:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Sync Engine
// ─────────────────────────────────────────────────────────────────────────────

export async function runDocumentSyncEngine(input: SyncInput): Promise<SyncSummary> {
  const { result, doc, userId } = input;
  const { familyId } = doc;
  const patientId = doc.patientId;

  const summary: SyncSummary = {
    medicationsCreated: 0,
    medicationsSkipped: 0,
    vitalsCreated: 0,
    labResultsCreated: 0,
    referralsCreated: 0,
    tasksCreated: 0,
    diagnosesCreated: 0,
    insightsCreated: 0,
    correlationsFound: 0,
    safetyAlertsFound: 0,
    errors: [],
  };

  // ── 1. Allergy Warnings → patientAllergies ────────────────────────────────
  if (patientId && result.extractedAllergyWarnings?.length) {
    for (const allergy of result.extractedAllergyWarnings) {
      if (!allergy.substance?.trim()) continue;
      try {
        const existing = await db
          .select({ id: patientAllergies.id })
          .from(patientAllergies)
          .where(
            and(
              eq(patientAllergies.patientId, patientId),
              eq(patientAllergies.allergen, allergy.substance.trim())
            )
          )
          .limit(1);

        if (existing.length > 0) continue;

        // Infer allergen type from substance name
        const sub = allergy.substance.toLowerCase();
        let allergenType: 'drug' | 'food' | 'environment' | 'contrast' | 'other' = 'drug';
        if (sub.includes('ניגוד') || sub.includes('contrast') || sub.includes('יוד')) {
          allergenType = 'contrast';
        } else if (
          sub.includes('אגוז') || sub.includes('חלב') || sub.includes('ביצ') ||
          sub.includes('גלוטן') || sub.includes('דג') || sub.includes('בוטנ')
        ) {
          allergenType = 'food';
        } else if (
          sub.includes('אבקן') || sub.includes('חתול') || sub.includes('כלב') ||
          sub.includes('עובש') || sub.includes('אבק')
        ) {
          allergenType = 'environment';
        }

        const [newAllergy] = await db
          .insert(patientAllergies)
          .values({
            patientId,
            familyId,
            allergen: allergy.substance.trim(),
            allergenType,
            reaction: [allergy.reactionType, allergy.notes].filter(Boolean).join(' — ') || null,
            severity: allergy.severity,
            status: 'active',
            sourceDocumentId: doc.id,
          })
          .returning({ id: patientAllergies.id });

        await logSync(familyId, patientId, doc.id, 'allergy', newAllergy?.id ?? null, 'created', {
          allergen: allergy.substance,
          severity: allergy.severity,
        });

        // Create critical insight for life-threatening / severe allergies
        const insightSeverity =
          allergy.severity === 'life_threatening' || allergy.severity === 'severe'
            ? 'critical'
            : 'warning';
        const insightId = await createInsight(
          patientId,
          familyId,
          doc.id,
          'allergy_detected',
          `אלרגיה/רגישות חדשה: ${allergy.substance}`,
          `זוהתה רגישות ל-${allergy.substance} (${allergy.reactionType}). חומרה: ${allergy.severity}. ${allergy.notes ?? ''}`,
          insightSeverity,
          'allergy',
          newAllergy?.id ?? undefined
        );
        if (insightId) summary.insightsCreated++;

        if (insightSeverity === 'critical') {
          await notifyFamilyManagers(
            familyId,
            `⚠️ אלרגיה קריטית: ${allergy.substance}`,
            `זוהתה רגישות חמורה ל-${allergy.substance}. ${allergy.reactionType}`,
            'critical_allergy'
          );
        }
      } catch (err: unknown) {
        const msg = `allergy:${allergy.substance}`;
        summary.errors.push(msg);
        console.error('[SyncEngine] allergy failed:', err);
      }
    }
  }

  // ── 2. Medications → medications table ────────────────────────────────────
  if (patientId && result.extractedMedications?.length) {
    for (const med of result.extractedMedications) {
      if (!med.name?.trim()) continue;
      try {
        const existing = await db
          .select({ id: medications.id })
          .from(medications)
          .where(
            and(
              eq(medications.patientId, patientId),
              eq(medications.name, med.name.trim()),
              eq(medications.isActive, true)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          summary.medicationsSkipped++;
          continue;
        }

        const [newMed] = await db
          .insert(medications)
          .values({
            patientId,
            familyId,
            name: med.name.trim(),
            dosage: med.dosage?.trim() || null,
            prescribingDoctor: doc.issuingDoctor ?? null,
            sourceDocumentId: doc.id,
            isActive: true,
          })
          .returning({ id: medications.id });

        summary.medicationsCreated++;
        await logSync(familyId, patientId, doc.id, 'medication', newMed?.id ?? null, 'created', {
          name: med.name,
        });
      } catch (err: unknown) {
        const msg = `medication:${med.name}`;
        summary.errors.push(msg);
        console.error('[SyncEngine] medication failed:', err);
      }
    }
  }

  // ── 3. Vitals ──────────────────────────────────────────────────────────────
  if (patientId && result.extractedVitals?.length) {
    for (const v of result.extractedVitals) {
      if (!v.type || v.value == null) continue;
      try {
        const isAbnormal = (v as any).isAbnormal ?? false;

        // Idempotency: skip if this document already created a vital of the same type
        const dupVital = await db
          .select({ id: vitals.id })
          .from(vitals)
          .where(and(eq(vitals.sourceDocumentId, doc.id), eq(vitals.type, v.type as any)))
          .limit(1);
        if (dupVital.length > 0) continue;

        const [newVital] = await db
          .insert(vitals)
          .values({
            patientId,
            familyId,
            type: v.type as any,
            value: String(v.value),
            value2: v.value2 != null ? String(v.value2) : undefined,
            unit: v.unit || '',
            isAbnormal,
            notes: v.notes || null,
            sourceDocumentId: doc.id,
            recordedByUserId: userId,
          })
          .returning({ id: vitals.id });

        summary.vitalsCreated++;
        await logSync(familyId, patientId, doc.id, 'vital', newVital?.id ?? null, 'created', {
          type: v.type,
        });

        // If weight — update patient summary weight
        if (v.type === 'weight') {
          try {
            await db
              .update(patients)
              .set({ weight: String(v.value) })
              .where(eq(patients.id, patientId));
          } catch {
            // non-critical
          }
        }

        // If abnormal — create insight and check for trend
        if (isAbnormal && newVital?.id) {
          const insightId = await createInsight(
            patientId,
            familyId,
            doc.id,
            'vital_alert',
            `ערך חריג: ${v.type}`,
            `נמצא ערך חריג במדידת ${v.type}: ${v.value}${v.value2 ? '/' + v.value2 : ''} ${v.unit}. יש לבדוק עם הרופא.`,
            'warning',
            'vital',
            newVital.id
          );
          if (insightId) summary.insightsCreated++;
          await checkVitalTrend(patientId, familyId, doc.id, v.type, summary);
        }
      } catch (err: unknown) {
        const msg = `vital:${v.type}`;
        summary.errors.push(msg);
        console.error('[SyncEngine] vital failed:', err);
      }
    }
  }

  // ── 4. Lab Results ─────────────────────────────────────────────────────────
  if (patientId && result.extractedLabValues?.length) {
    for (const lab of result.extractedLabValues) {
      if (!lab.name?.trim() || !lab.value) continue;
      try {
        // Dedup: skip same test within 24 hours
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dup = await db
          .select({ id: labResults.id })
          .from(labResults)
          .where(
            and(
              eq(labResults.patientId, patientId),
              eq(labResults.testName, lab.name.trim()),
              gte(labResults.createdAt, cutoff)
            )
          )
          .limit(1);

        if (dup.length > 0) continue;

        const [newLab] = await db
          .insert(labResults)
          .values({
            patientId,
            familyId,
            testName: lab.name.trim(),
            value: String(lab.value),
            unit: lab.unit || null,
            isAbnormal: lab.isAbnormal,
            orderingDoctor: doc.issuingDoctor ?? null,
            sourceDocumentId: doc.id,
          })
          .returning({ id: labResults.id });

        summary.labResultsCreated++;
        await logSync(familyId, patientId, doc.id, 'lab_result', newLab?.id ?? null, 'created', {
          name: lab.name,
        });

        // If abnormal — create insight
        if (lab.isAbnormal && newLab?.id) {
          const insightId = await createInsight(
            patientId,
            familyId,
            doc.id,
            'lab_alert',
            `ממצא מעבדה חריג: ${lab.name}`,
            `תוצאת בדיקת ${lab.name} חריגה: ${lab.value}${lab.unit ? ' ' + lab.unit : ''}. יש לבחון עם הרופא המטפל.`,
            'warning',
            'lab_result',
            newLab.id
          );
          if (insightId) summary.insightsCreated++;
        }
      } catch (err: unknown) {
        const msg = `lab:${lab.name}`;
        summary.errors.push(msg);
        console.error('[SyncEngine] lab failed:', err);
      }
    }
  }

  // ── 5. Referrals ───────────────────────────────────────────────────────────
  if (result.extractedReferrals?.length) {
    for (const ref of result.extractedReferrals) {
      if (!ref.specialty?.trim()) continue;
      try {
        // ── Dedup: skip if this referral already exists for this document+specialty ──
        const existingRef = await db
          .select({ id: referrals.id })
          .from(referrals)
          .where(and(
            eq(referrals.familyId, familyId),
            eq(referrals.specialty, ref.specialty.trim()),
            eq(referrals.sourceDocumentId, doc.id),
          ))
          .limit(1);
        if (existingRef.length > 0) {
          // Referral already exists — also skip its task
          summary.referralsCreated += 0; // counted as skipped
          continue;
        }

        const [newRef] = await db
          .insert(referrals)
          .values({
            patientId: patientId ?? (doc.patientId as string),
            familyId,
            specialty: ref.specialty.trim(),
            reason: ref.reason?.trim() || '',
            urgency: ref.urgency || 'routine',
            status: 'pending',
            referringDoctor: doc.issuingDoctor ?? null,
            sourceDocumentId: doc.id,
          })
          .returning({ id: referrals.id });

        summary.referralsCreated++;
        await logSync(familyId, patientId, doc.id, 'referral', newRef?.id ?? null, 'created', {
          specialty: ref.specialty,
        });

        // ── Dedup: skip task if a task for this specialty already exists ──
        const referralTaskTitle = `קביעת תור: ${ref.specialty.trim()}`;
        const existingReferralTask = await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.familyId, familyId), eq(tasks.title, referralTaskTitle)))
          .limit(1);

        if (existingReferralTask.length > 0) {
          // Task already exists — don't create another
          continue;
        }

        // Create a caregiver task to schedule the appointment
        const daysAhead = ref.urgency === 'urgent' ? 7 : ref.urgency === 'soon' ? 21 : 60;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysAhead);

        const [newTask] = await db
          .insert(tasks)
          .values({
            familyId,
            patientId: patientId ?? null,
            createdByUserId: userId,
            title: referralTaskTitle,
            description: ref.reason?.trim() || `נוצר אוטומטית מהפניה רפואית: ${doc.title ?? 'מסמך רפואי'}`,
            status: 'todo',
            priority: ref.urgency === 'urgent' ? 'urgent' : ref.urgency === 'soon' ? 'high' : 'medium',
            category: 'medical',
            source: 'ai',
            dueDate,
            sourceEntityType: 'referral',
            sourceEntityId: newRef?.id ?? undefined,
            linkedReferralId: newRef?.id ?? undefined,
          })
          .returning({ id: tasks.id });

        summary.tasksCreated++;
        await logSync(familyId, patientId, doc.id, 'task', newTask?.id ?? null, 'created', {
          referralId: newRef?.id,
        });

        // If urgent — create critical insight + notify managers
        if (ref.urgency === 'urgent' && patientId && newRef?.id) {
          const insightId = await createInsight(
            patientId,
            familyId,
            doc.id,
            'referral_required',
            `הפניה דחופה: ${ref.specialty}`,
            `הרופא הפנה דחופות ל${ref.specialty}. סיבה: ${ref.reason || 'לא צוין'}. יש לקבוע תור בהקדם.`,
            'critical',
            'referral',
            newRef.id
          );
          if (insightId) summary.insightsCreated++;

          await notifyFamilyManagers(
            familyId,
            `⚠️ הפניה דחופה: ${ref.specialty}`,
            `יש להפנות דחופות ל${ref.specialty}. ${ref.reason || ''}`,
            'urgent_referral'
          );
        }
      } catch (err: unknown) {
        const msg = `referral:${ref.specialty}`;
        summary.errors.push(msg);
        console.error('[SyncEngine] referral failed:', err);
      }
    }
  }

  // ── 6. Tasks from extractedTasks ───────────────────────────────────────────
  // Build a set of task titles already created in step 5 (referral tasks) to avoid triplication
  const referralTaskTitles = new Set<string>(
    (result.extractedReferrals ?? []).map((r) => `קביעת תור: ${r.specialty?.trim()}`)
  );

  if (result.extractedTasks?.length) {
    for (const t of result.extractedTasks) {
      if (!t.title?.trim()) continue;
      if ((t as any).taskFor === 'note') continue;
      // Skip if this task was already created by the referral step (prevents x2 duplication)
      if (referralTaskTitles.has(t.title.trim())) continue;
      try {
        // Skip if a task with the same title already exists for this family
        // (checks by title only — catches duplicates even if sourceEntityId was null in older runs)
        const existingTask = await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.familyId, familyId), eq(tasks.title, t.title.trim())))
          .limit(1);
        if (existingTask.length > 0) continue;

        const isPatientTask = (t as any).taskFor === 'patient';
        const [newTask] = await db
          .insert(tasks)
          .values({
            familyId,
            patientId: isPatientTask && patientId ? patientId : null,
            createdByUserId: userId,
            title: t.title.trim(),
            description: t.description?.trim() || `נוצר אוטומטית מניתוח: ${doc.title ?? 'מסמך רפואי'}`,
            status: 'todo',
            priority: 'medium',
            category: 'medical',
            source: 'ai',
            sourceEntityType: 'document',
            sourceEntityId: doc.id,
          })
          .returning({ id: tasks.id });

        summary.tasksCreated++;
        await logSync(familyId, patientId, doc.id, 'task', newTask?.id ?? null, 'created');
      } catch (err: unknown) {
        const msg = `task:${t.title}`;
        summary.errors.push(msg);
        console.error('[SyncEngine] task failed:', err);
      }
    }
  }

  // ── 7. Follow-up task ──────────────────────────────────────────────────────
  if (result.followUpRequired) {
    try {
      const isUrgent = result.urgencyLevel === 'urgent';
      const isSoon = result.urgencyLevel === 'soon';
      const followUpTitle = isUrgent
        ? 'פנייה דחופה לרופא – על בסיס המסמך הרפואי'
        : 'ביקורת מעקב – על בסיס המסמך הרפואי';

      // Skip if a follow-up task with this title already exists for this family
      const existingFollowUp = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.familyId, familyId), eq(tasks.title, followUpTitle)))
        .limit(1);

      if (existingFollowUp.length === 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (isUrgent ? 3 : isSoon ? 14 : 60));

        const [newTask] = await db
          .insert(tasks)
          .values({
            familyId,
            patientId: patientId ?? null,
            createdByUserId: userId,
            title: followUpTitle,
            description: result.doctorNotes
              ? `הערות רופא: ${result.doctorNotes}`
              : `נוצר אוטומטית ממסמך: ${doc.title ?? 'מסמך רפואי'}`,
            status: 'todo',
            priority: isUrgent ? 'urgent' : isSoon ? 'high' : 'medium',
            category: 'medical',
            source: 'ai',
            dueDate,
            sourceEntityType: 'document',
            sourceEntityId: doc.id,
          })
          .returning({ id: tasks.id });

        summary.tasksCreated++;
        await logSync(familyId, patientId, doc.id, 'task', newTask?.id ?? null, 'created', {
          followUp: true,
        });
      }
    } catch (err: unknown) {
      summary.errors.push('follow_up_task');
      console.error('[SyncEngine] follow-up task failed:', err);
    }
  }

  // ── 8. Diagnoses from simplifiedDiagnosis + keyFindings ────────────────────
  if (patientId && result.simplifiedDiagnosis?.trim()) {
    try {
      // Create an AI insight for the diagnosis
      const insightId = await createInsight(
        patientId,
        familyId,
        doc.id,
        'diagnosis_update',
        'עדכון אבחנה ממסמך רפואי',
        result.simplifiedDiagnosis.trim(),
        'info'
      );
      if (insightId) {
        summary.insightsCreated++;
        await logSync(familyId, patientId, doc.id, 'insight', insightId, 'created', {
          type: 'diagnosis_update',
        });
      }
    } catch (err: unknown) {
      summary.errors.push('diagnosis_insight');
      console.error('[SyncEngine] diagnosis insight failed:', err);
    }
  }

  // ── 9. Doctor notes insight ────────────────────────────────────────────────
  if (patientId && result.doctorNotes?.trim()) {
    try {
      const insightId = await createInsight(
        patientId,
        familyId,
        doc.id,
        'care_recommendation',
        'המלצות רופא',
        result.doctorNotes.trim(),
        'info'
      );
      if (insightId) {
        summary.insightsCreated++;
      }
    } catch (err: unknown) {
      console.error('[SyncEngine] doctor notes insight failed:', err);
    }
  }

  // ── 10. Urgent document — global family notification ──────────────────────
  if (result.urgencyLevel === 'urgent') {
    await notifyFamilyManagers(
      familyId,
      `🚨 מסמך רפואי דחוף`,
      `מסמך רפואי: "${doc.title ?? 'ללא שם'}" מסומן כדחוף. ${result.simplifiedDiagnosis ?? ''}`,
      'urgent_document'
    );
  }

  // ── 11. Specialized Document Processors ───────────────────────────────────
  if (patientId) {
    const docType = result.documentType;

    // Discharge documents
    if (docType === 'discharge' || isDischargeDocument(result)) {
      try { await processHospitalDischarge(result, patientId, familyId, doc.id, userId); } catch (e) { console.error('[SyncEngine] hospitalDischarge processor failed:', e); }
    }

    // Imaging documents
    if (docType === 'imaging') {
      try { await processImagingDocument(result, patientId, familyId, doc.id, userId); } catch (e) { console.error('[SyncEngine] imaging processor failed:', e); }
    }

    // Psychiatric / psychological documents
    const allDocText = [result.simplifiedDiagnosis, result.doctorNotes, result.documentDescription ?? ''].join(' ').toLowerCase();
    const isPsychDoc = allDocText.includes('פסיכ') || allDocText.includes('psych') || allDocText.includes('נפשי');
    if (isPsychDoc) {
      try { await processPsychiatricDocument(result, patientId, familyId, doc.id, userId); } catch (e) { console.error('[SyncEngine] psychiatric processor failed:', e); }
    }

    // Geriatric documents
    const isGeriatric = allDocText.includes('גריאט') || allDocText.includes('geriat') || allDocText.includes('mmse') || allDocText.includes('adl');
    if (isGeriatric) {
      try { await processGeriatricDocument(result, patientId, familyId, doc.id, userId); } catch (e) { console.error('[SyncEngine] geriatric processor failed:', e); }
    }

    // Social / National Insurance documents
    const isSocial = allDocText.includes('ביטוח לאומי') || allDocText.includes('national insurance') || allDocText.includes('נכות') || allDocText.includes('סיעוד');
    if (isSocial) {
      try { await processSocialDocument(result, patientId, familyId, doc.id, userId); } catch (e) { console.error('[SyncEngine] social processor failed:', e); }
    }
  }

  // ── 12. Correlation Engine — lab/vital cross-analysis ─────────────────────
  if (patientId && (result.extractedLabValues?.length || result.extractedVitals?.length)) {
    try {
      const corrResult = await runCorrelationEngine(
        patientId,
        familyId,
        doc.id,
        result.extractedLabValues ?? [],
        result.extractedVitals ?? [],
        userId
      );
      summary.correlationsFound += corrResult.correlationsFound;
      summary.insightsCreated += corrResult.insightsCreated;
      summary.tasksCreated += corrResult.tasksCreated;
    } catch (err) {
      console.error('[SyncEngine] CorrelationEngine failed:', err);
      summary.errors.push('correlation_engine');
    }
  }

  // ── 13. Safety Engine — allergy × medication checks ───────────────────────
  if (patientId && result.extractedMedications?.length) {
    try {
      const medNames = result.extractedMedications.map((m) => m.name).filter(Boolean);
      const safetyResult = await runSafetyEngine(patientId, familyId, doc.id, medNames, userId);
      summary.safetyAlertsFound += safetyResult.alertsFound;
      summary.insightsCreated += safetyResult.insightsCreated;
      summary.tasksCreated += safetyResult.tasksCreated;
    } catch (err) {
      console.error('[SyncEngine] SafetyEngine failed:', err);
      summary.errors.push('safety_engine');
    }
  }

  // ── 14. Auto-upsert professionals from extracted doctor names ─────────────
  try {
    type ProfCandidate = {
      name: string;
      specialty?: string;
      phone?: string;
      fax?: string;
      clinicOrCompany?: string;
    };
    const profCandidates: ProfCandidate[] = [];

    // Issuing doctor from the document itself
    if (result.issuingDoctor?.trim()) {
      profCandidates.push({
        name: result.issuingDoctor.trim(),
        specialty: result.documentType === 'referral' ? undefined : result.documentType ?? undefined,
        phone: result.doctorPhone?.trim() || undefined,
        fax: result.doctorFax?.trim() || undefined,
        clinicOrCompany: result.hospitalName?.trim() || undefined,
      });
    }

    // Doctors named in referrals
    for (const ref of (result.extractedReferrals ?? [])) {
      if ((ref as any).doctorName?.trim()) {
        profCandidates.push({
          name: (ref as any).doctorName.trim(),
          specialty: ref.specialty ?? undefined,
          phone: (ref as any).phone?.trim() || undefined,
        });
      }
    }

    for (const cand of profCandidates) {
      const nameNorm = cand.name.toLowerCase().replace(/\s+/g, ' ').trim();
      const specialtyNorm = (cand.specialty ?? '').toLowerCase().replace(/\s+/g, ' ').trim() || null;
      try {
        const existingProf = await db.execute(drizzleSql`
          SELECT id, linked_document_ids, phone, fax, clinic_or_company FROM professionals
          WHERE family_id = ${doc.familyId}::uuid AND name_normalized = ${nameNorm}
          LIMIT 1
        `);

        if (existingProf.rows.length > 0) {
          const row = existingProf.rows[0] as any;
          // Update: merge doc id + fill in any missing contact details
          await db.execute(drizzleSql`
            UPDATE professionals SET
              linked_document_ids = (
                SELECT jsonb_agg(DISTINCT elem)
                FROM jsonb_array_elements_text(
                  COALESCE(linked_document_ids, '[]'::jsonb) || ${JSON.stringify([doc.id])}::jsonb
                ) AS elem
              ),
              phone = COALESCE(NULLIF(phone, ''), ${cand.phone ?? null}),
              fax = COALESCE(NULLIF(fax, ''), ${cand.fax ?? null}),
              clinic_or_company = COALESCE(NULLIF(clinic_or_company, ''), ${cand.clinicOrCompany ?? null}),
              specialty = COALESCE(NULLIF(specialty, ''), ${specialtyNorm}),
              last_interaction_date = CURRENT_DATE,
              updated_at = now()
            WHERE family_id = ${doc.familyId}::uuid AND name_normalized = ${nameNorm}
          `);
        } else {
          await db.execute(drizzleSql`
            INSERT INTO professionals (family_id, name, name_normalized, specialty, phone, fax, clinic_or_company, source, linked_document_ids, last_interaction_date)
            VALUES (
              ${doc.familyId}::uuid,
              ${cand.name},
              ${nameNorm},
              ${specialtyNorm},
              ${cand.phone ?? null},
              ${cand.fax ?? null},
              ${cand.clinicOrCompany ?? null},
              'ai_extracted',
              ${JSON.stringify([doc.id])}::jsonb,
              CURRENT_DATE
            )
          `);
        }
      } catch (_) { /* ignore individual professional errors */ }
    }
  } catch (err) {
    console.error('[SyncEngine] professionals upsert failed:', err);
  }

  // ── 15. Mark document sync as complete ────────────────────────────────────
  try {
    await db
      .update(medicalDocuments)
      .set({
        syncStatus: summary.errors.length === 0 ? 'complete' : 'partial',
        syncCompletedAt: new Date(),
        extractedReferrals: (result.extractedReferrals ?? []) as any,
        extractedLabValues: (result.extractedLabValues ?? []) as any,
        extractedVitals: (result.extractedVitals ?? []) as any,
      })
      .where(eq(medicalDocuments.id, doc.id));
  } catch (err) {
    console.error('[SyncEngine] failed to update doc sync status:', err);
  }

  console.log(
    `[SyncEngine] doc=${doc.id} ` +
      `meds:+${summary.medicationsCreated}(skip:${summary.medicationsSkipped}) ` +
      `vitals:+${summary.vitalsCreated} ` +
      `labs:+${summary.labResultsCreated} ` +
      `referrals:+${summary.referralsCreated} ` +
      `tasks:+${summary.tasksCreated} ` +
      `insights:+${summary.insightsCreated} ` +
      `correlations:${summary.correlationsFound} ` +
      `safetyAlerts:${summary.safetyAlertsFound} ` +
      `errors:${summary.errors.length}`
  );

  return summary;
}
