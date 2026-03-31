/**
 * Psychiatric Document Processor
 * Processes psychiatric/psychological documents to identify:
 * - Psychiatric medications and changes
 * - Risk indicators (suicidal ideation, self-harm, psychosis)
 * - Required follow-up actions
 */

import { db } from '../../db';
import { tasks, patientHealthInsights, notifications, familyMembers } from '../../../../shared/schemas/schema';
import { and, eq } from 'drizzle-orm';
import type { MedicalAnalysisResult } from '../medicalDocumentAnalyzer';

const ANTIDEPRESSANTS_SSRI = ['פלואוקסטין', 'fluoxetine', 'סרטרלין', 'sertraline', 'ציטלופרם', 'citalopram', 'אסציטלופרם', 'escitalopram', 'פרוקסטין', 'paroxetine', 'פלובוקסמין', 'fluvoxamine'];
const ANTIDEPRESSANTS_SNRI = ['ונלפקסין', 'venlafaxine', 'דולוקסטין', 'duloxetine', 'מילנציפרן', 'milnacipran'];
const ANTIDEPRESSANTS_OTHER = ['מירטזפין', 'mirtazapine', 'בופרופיון', 'bupropion', 'טרזודון', 'trazodone', 'אמיטריפטילין', 'amitriptyline'];
const ANTIPSYCHOTICS = ['ריספרידון', 'risperidone', 'אולנזפין', 'olanzapine', 'קווטיאפין', 'quetiapine', 'ארפיפרזול', 'aripiprazole', 'קלוזפין', 'clozapine', 'הלופרידול', 'haloperidol', 'כלורפרומזין', 'chlorpromazine'];
const MOOD_STABILIZERS = ['ליתיום', 'lithium', 'ולפרואט', 'valproate', 'דפקין', 'depakine', 'קרבמזפין', 'carbamazepine', 'טגרטול', 'tegretol', 'למוטריגין', 'lamotrigine', 'למיקטל', 'lamictal'];
const ANXIOLYTICS = ['לורזפם', 'lorazepam', 'קלונזפם', 'clonazepam', 'דיאזפם', 'diazepam', 'אלפרזולם', 'alprazolam'];

const SUICIDAL_KEYWORDS = ['מחשבות אובדניות', 'רצון למות', 'פגיעה עצמית', 'suicidal', 'אובדנות', 'self-harm', 'חיתוכים', 'suicide', 'ideation'];
const SELF_HARM_KEYWORDS = ['פגיעה עצמית', 'self-harm', 'חיתוכים', 'שריטות'];
const PSYCHOSIS_KEYWORDS = ['הזיות', 'דלוזיות', '妄想', 'psychosis', 'hallucinations', 'paranoia', 'פרנויה', 'סכיזופרניה', 'schizophrenia'];
const SEVERE_DEPRESSION_KEYWORDS = ['דיכאון חמור', 'mdd', 'major depressive', 'פרקים דיכאוניים חמורים'];
const MANIA_KEYWORDS = ['מאניה', 'היפומאניה', 'mania', 'hypomanic', 'bipolar', 'דו-קוטבי'];

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function isPsychiatricMedication(medName: string): { isPsychiatric: boolean; category: string } {
  const n = medName.toLowerCase();
  if (ANTIDEPRESSANTS_SSRI.some((kw) => n.includes(kw.toLowerCase()))) return { isPsychiatric: true, category: 'SSRI' };
  if (ANTIDEPRESSANTS_SNRI.some((kw) => n.includes(kw.toLowerCase()))) return { isPsychiatric: true, category: 'SNRI' };
  if (ANTIDEPRESSANTS_OTHER.some((kw) => n.includes(kw.toLowerCase()))) return { isPsychiatric: true, category: 'נוגד דיכאון' };
  if (ANTIPSYCHOTICS.some((kw) => n.includes(kw.toLowerCase()))) return { isPsychiatric: true, category: 'אנטיפסיכוטי' };
  if (MOOD_STABILIZERS.some((kw) => n.includes(kw.toLowerCase()))) return { isPsychiatric: true, category: 'מייצב מצב רוח' };
  if (ANXIOLYTICS.some((kw) => n.includes(kw.toLowerCase()))) return { isPsychiatric: true, category: 'נוגד חרדה (BZD)' };
  return { isPsychiatric: false, category: '' };
}

export async function processPsychiatricDocument(
  result: MedicalAnalysisResult,
  patientId: string,
  familyId: string,
  sourceDocumentId: string,
  userId: string
): Promise<void> {
  const allText = [
    result.simplifiedDiagnosis,
    result.doctorNotes,
    ...result.keyFindings,
    ...(result.rawText ? [result.rawText] : []),
  ].join(' ');

  // ── Suicidal ideation / self-harm → critical alert ──────────────────────
  if (containsAny(allText, SUICIDAL_KEYWORDS) || containsAny(allText, SELF_HARM_KEYWORDS)) {
    await createInsight(patientId, familyId, sourceDocumentId, 'psychiatric_risk',
      '⚠️ סיכון אובדני — נמצא במסמך',
      'המסמך מציין מחשבות אובדניות / פגיעה עצמית. נדרש מעקב פסיכיאטרי דחוף.',
      'critical'
    );
    await createTask(familyId, patientId, userId, 'מעקב פסיכיאטרי דחוף — סיכון אובדני',
      'המסמך מציין סיכון אובדני. יש לפנות לפסיכיאטר בהקדם.',
      1, 'urgent', sourceDocumentId
    );
    await notifyManagers(familyId,
      '⚠️ סיכון אובדני זוהה במסמך',
      'המסמך הרפואי מציין מחשבות אובדניות. נדרש מעקב פסיכיאטרי דחוף.'
    );
  }

  // ── Psychosis ────────────────────────────────────────────────────────────
  if (containsAny(allText, PSYCHOSIS_KEYWORDS)) {
    await createInsight(patientId, familyId, sourceDocumentId, 'psychiatric_risk',
      'תסמינים פסיכוטיים זוהו במסמך',
      'המסמך מציין הזיות, דלוזיות, או תסמינים פסיכוטיים אחרים.',
      'warning'
    );
  }

  // ── Mania ────────────────────────────────────────────────────────────────
  if (containsAny(allText, MANIA_KEYWORDS)) {
    await createInsight(patientId, familyId, sourceDocumentId, 'psychiatric_risk',
      'מאניה / היפומאניה זוהתה במסמך',
      'המסמך מציין פרק מאני או היפומאני. בדוק מייצב מצב רוח.',
      'warning'
    );
    await createTask(familyId, patientId, userId, 'מעקב פסיכיאטר — פרק מאני',
      'נצפה פרק מאני/היפומאני. בדוק מינון מייצבי מצב רוח.',
      7, 'high', sourceDocumentId
    );
  }

  // ── Psychiatric medications ────────────────────────────────────────────────
  for (const med of result.extractedMedications) {
    const { isPsychiatric, category } = isPsychiatricMedication(med.name);
    if (isPsychiatric) {
      await createTask(familyId, patientId, userId,
        `מעקב תרופה פסיכיאטרית: ${med.name} (${category})`,
        `נרשמה תרופה פסיכיאטרית חדשה. בדוק תופעות לוואי תוך 2 שבועות.`,
        14, 'medium', sourceDocumentId
      );

      // Lithium monitoring
      if (med.name.toLowerCase().includes('ליתיום') || med.name.toLowerCase().includes('lithium')) {
        await createTask(familyId, patientId, userId,
          'בדיקת רמות ליתיום בדם',
          'ליתיום נרשם/עודכן. יש לבדוק רמות בדם (therapeutic range: 0.6-1.2 mEq/L) ותפקוד כליות ותריס.',
          7, 'high', sourceDocumentId
        );
      }
    }
  }
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

async function notifyManagers(familyId: string, title: string, body: string) {
  try {
    const managers = await db.select({ userId: familyMembers.userId }).from(familyMembers).where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.role, 'manager')));
    if (!managers.length) return;
    await db.insert(notifications).values(managers.map((m) => ({ userId: m.userId, title, body, type: 'psychiatric_alert' })));
  } catch { /* non-critical */ }
}
