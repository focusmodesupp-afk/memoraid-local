/**
 * Hospital Discharge Document Processor
 * Handles discharge summaries: medication reconciliation, follow-up tasks,
 * readmission risk assessment, and updating patient hospitalization date.
 */

import { db } from '../../db';
import { tasks, patientHealthInsights, patients, medications, notifications, familyMembers } from '../../../../shared/schemas/schema';
import { and, eq } from 'drizzle-orm';
import type { MedicalAnalysisResult } from '../medicalDocumentAnalyzer';

const DISCHARGE_KEYWORDS = [
  'מכתב שחרור', 'סיכום אשפוז', 'discharge', 'שחרור מבית חולים',
  'discharge summary', 'לאחר אשפוז',
];

export function isDischargeDocument(result: MedicalAnalysisResult): boolean {
  if (result.documentType === 'discharge') return true;
  const allText = [result.simplifiedDiagnosis, result.doctorNotes, result.documentDescription].join(' ').toLowerCase();
  return DISCHARGE_KEYWORDS.some((kw) => allText.includes(kw.toLowerCase()));
}

export async function processHospitalDischarge(
  result: MedicalAnalysisResult,
  patientId: string,
  familyId: string,
  sourceDocumentId: string,
  userId: string
): Promise<void> {
  // ── 1. Update last hospitalization date ──────────────────────────────────
  if (result.documentDate) {
    try {
      await db
        .update(patients)
        .set({ lastHospitalizationDate: result.documentDate } as any)
        .where(eq(patients.id, patientId));
    } catch {
      // Field may not exist — non-critical
    }
  }

  // ── 2. Create post-discharge follow-up tasks ─────────────────────────────
  await createTask(familyId, patientId, userId,
    'ביקור מעקב לאחר שחרור מבית חולים',
    `שחרור מ${result.hospitalName ?? 'בית חולים'}. נדרש ביקור מעקב תוך 7 ימים.`,
    7, 'high', sourceDocumentId
  );

  await createTask(familyId, patientId, userId,
    'בדיקת תרופות לשחרור — עדכון רשימה',
    'יש לעדכן את רשימת התרופות הפעילות בהתאם למרשמי השחרור.',
    1, 'urgent', sourceDocumentId
  );

  // ── 3. Urgent discharge alert ────────────────────────────────────────────
  await createInsight(patientId, familyId, sourceDocumentId, 'hospital_discharge',
    `שחרור מבית חולים — נדרש מעקב`,
    `שוחרר מ${result.hospitalName ?? 'בית חולים'} בתאריך ${result.documentDate ?? 'לא ידוע'}. נדרש מעקב צמוד 30 יום. ${result.simplifiedDiagnosis ?? ''}`,
    'warning'
  );

  // ── 4. Readmission risk check ────────────────────────────────────────────
  const allText = [result.simplifiedDiagnosis, result.doctorNotes, ...result.keyFindings].join(' ').toLowerCase();
  const riskKeywords = ['אי ספיקת לב', 'heart failure', 'סוכרת', 'diabetes', 'כליות', 'kidney', 'כרוני', 'chronic'];
  const hasHighRisk = riskKeywords.filter((kw) => allText.includes(kw)).length >= 2;

  if (hasHighRisk) {
    await createInsight(patientId, familyId, sourceDocumentId, 'readmission_risk',
      'סיכון גבוה לאשפוז חוזר',
      'מחלות כרוניות מרובות זוהו. סיכון מוגבר לאשפוז חוזר תוך 30 יום.',
      'warning'
    );
    await createTask(familyId, patientId, userId,
      'מעקב אינטנסיבי לאחר שחרור — סיכון גבוה',
      'מחלות כרוניות מרובות — בדיקת מעקב תוך 48 שעות מומלצת.',
      2, 'urgent', sourceDocumentId
    );
  }

  // ── 5. Medication reconciliation ────────────────────────────────────────
  if (result.extractedMedications.length > 0) {
    await createTask(familyId, patientId, userId,
      'השוואת תרופות לפני/אחרי שחרור',
      `${result.extractedMedications.length} תרופות זוהו במסמך השחרור. השווה לרשימה הנוכחית — האם יש תרופות חדשות / שהופסקו / שינוי מינון?`,
      1, 'urgent', sourceDocumentId
    );
  }

  // ── 6. Notify family managers ────────────────────────────────────────────
  try {
    const managers = await db
      .select({ userId: familyMembers.userId })
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.role, 'manager')));
    if (managers.length) {
      await db.insert(notifications).values(
        managers.map((m) => ({
          userId: m.userId,
          title: `🏥 שחרור מבית חולים — נדרש מעקב`,
          body: `שוחרר מ${result.hospitalName ?? 'בית חולים'}. נדרשות פעולות מעקב.`,
          type: 'hospital_discharge',
        }))
      );
    }
  } catch { /* non-critical */ }
}

async function createInsight(patientId: string, familyId: string, sourceDocumentId: string, insightType: string, title: string, content: string, severity: 'info' | 'warning' | 'critical') {
  try {
    await db.insert(patientHealthInsights).values({ patientId, familyId, sourceDocumentId, insightType, title, content, severity, status: 'new' });
  } catch { /* non-critical */ }
}

async function createTask(familyId: string, patientId: string, userId: string, title: string, description: string, dueInDays: number, priority: string, sourceDocumentId: string) {
  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);
    await db.insert(tasks).values({ familyId, patientId, createdByUserId: userId, title, description, status: 'todo', priority: priority as any, category: 'medical', source: 'ai', dueDate, sourceEntityType: 'document', sourceEntityId: sourceDocumentId });
  } catch { /* non-critical */ }
}
