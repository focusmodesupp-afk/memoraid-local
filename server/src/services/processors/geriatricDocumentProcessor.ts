/**
 * Geriatric Document Processor
 * Processes geriatric assessments to update functional scores,
 * detect fall risk, cognitive decline, and malnutrition.
 */

import { db } from '../../db';
import { tasks, patientHealthInsights, patients } from '../../../../shared/schemas/schema';
import { eq } from 'drizzle-orm';
import type { MedicalAnalysisResult } from '../medicalDocumentAnalyzer';

// Beers Criteria keywords for elderly
const HIGH_RISK_ELDERLY_DRUGS = [
  { keywords: ['בנזודיאזפין', 'benzodiazepine', 'לורזפם', 'lorazepam', 'דיאזפם', 'diazepam', 'קלונזפם', 'clonazepam'], risk: 'נפילות, בלבול' },
  { keywords: ['דיפנהידרמין', 'diphenhydramine', 'פנרגן', 'phenergan'], risk: 'בלבול, אצירת שתן' },
  { keywords: ['nsaids', 'איבופרופן', 'ibuprofen', 'דיקלופנק', 'diclofenac'], risk: 'דימום GI, נזק כליות' },
  { keywords: ['גליבנקלמיד', 'glibenclamide', 'glyburide'], risk: 'היפוגליקמיה ממושכת' },
  { keywords: ['אמיטריפטילין', 'amitriptyline', 'נורטריפטילין', 'nortriptyline'], risk: 'נפילות, בלבול, אריתמיה' },
  { keywords: ['זולפידם', 'zolpidem', 'זופיקלון', 'zopiclone'], risk: 'נפילות, בלבול' },
];

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function extractScore(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const n = Number(m[1]);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

export async function processGeriatricDocument(
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

  // ── MMSE Score ───────────────────────────────────────────────────────────
  const mmseScore = extractScore(allText, [
    /mmse[:\s]+(\d+)/i,
    /mini.*mental[:\s]+(\d+)/i,
    /בדיקה.*קוגניטיבי[ת]?[:\s]+(\d+)/i,
  ]);
  if (mmseScore !== null) {
    let cogLabel = '';
    let taskNeeded = false;
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (mmseScore < 10) { cogLabel = 'ירידה קוגניטיבית חמורה'; severity = 'critical'; taskNeeded = true; }
    else if (mmseScore < 18) { cogLabel = 'ירידה קוגניטיבית בינונית'; severity = 'warning'; taskNeeded = true; }
    else if (mmseScore < 24) { cogLabel = 'ירידה קוגניטיבית קלה'; severity = 'warning'; taskNeeded = true; }
    else { cogLabel = 'תפקוד קוגניטיבי תקין'; }

    await createInsight(patientId, familyId, sourceDocumentId, 'cognitive_assessment',
      `MMSE: ${mmseScore}/30 — ${cogLabel}`,
      `ציון MMSE = ${mmseScore}. ${cogLabel}. ${mmseScore < 24 ? 'שקול הפניה לנוירולוג/גריאטר.' : ''}`,
      severity
    );

    if (taskNeeded) {
      await createTask(familyId, patientId, userId,
        `הפניה לנוירולוג/גריאטר — MMSE ${mmseScore}`,
        `ירידה קוגניטיבית זוהתה (MMSE = ${mmseScore}). הפנה להערכה נוירולוגית.`,
        14, 'high', sourceDocumentId
      );
    }
  }

  // ── GDS (Geriatric Depression Scale) ────────────────────────────────────
  const gdsScore = extractScore(allText, [
    /gds[:\s]+(\d+)/i,
    /geriatric depression scale[:\s]+(\d+)/i,
    /סולם דיכאון גריאטרי[:\s]+(\d+)/i,
  ]);
  if (gdsScore !== null && gdsScore >= 6) {
    await createInsight(patientId, familyId, sourceDocumentId, 'depression_screen',
      `GDS: ${gdsScore} — ${gdsScore >= 11 ? 'דיכאון חמור' : 'דיכאון קל'}`,
      `ציון GDS = ${gdsScore}. מציין ${gdsScore >= 11 ? 'דיכאון חמור' : 'דיכאון קל'}. הפנה לפסיכיאטר גריאטרי.`,
      gdsScore >= 11 ? 'critical' : 'warning'
    );
    await createTask(familyId, patientId, userId,
      'הפניה לפסיכיאטר גריאטרי — GDS חיובי',
      `GDS = ${gdsScore}. נדרשת הערכה פסיכיאטרית.`,
      14, 'medium', sourceDocumentId
    );
  }

  // ── Fall Risk ────────────────────────────────────────────────────────────
  const fallRiskKeywords = ['סיכון נפילה', 'fall risk', 'morse', 'berg balance', 'timed up and go', 'tug test', 'סיכון גבוה לנפילה'];
  if (containsAny(allText, fallRiskKeywords)) {
    await createInsight(patientId, familyId, sourceDocumentId, 'fall_risk',
      'סיכון נפילה גבוה זוהה',
      'המסמך מציין סיכון נפילה. נדרשת הערכת בטיחות בית ופיזיותרפיה.',
      'warning'
    );
    await createTask(familyId, patientId, userId,
      'הערכת בטיחות בית + פיזיותרפיה — סיכון נפילה',
      'סיכון נפילה זוהה. יש להתאים את הסביבה ולפנות לפיזיותרפיה.',
      14, 'high', sourceDocumentId
    );
  }

  // ── Weight loss ─────────────────────────────────────────────────────────
  const weightLossKeywords = ['ירידת משקל', 'weight loss', 'תת-תזונה', 'malnutrition', 'אנורקסיה', 'anorexia'];
  if (containsAny(allText, weightLossKeywords)) {
    await createInsight(patientId, familyId, sourceDocumentId, 'nutrition',
      'ירידת משקל / תת-תזונה זוהתה',
      'המסמך מציין ירידת משקל או תת-תזונה. הפנה לדיאטנית ובדוק: אלבומין, TSH, CBC.',
      'warning'
    );
    await createTask(familyId, patientId, userId,
      'הפניה לדיאטנית — ירידת משקל',
      'ירידת משקל משמעותית. בדיקות: אלבומין, TSH, ספירת דם מלאה.',
      7, 'high', sourceDocumentId
    );
  }

  // ── DNR / Advance Directives ─────────────────────────────────────────────
  const dnrKeywords = ['dnr', 'do not resuscitate', 'אל תחייה', 'ללא החייאה', 'הנחיות מקדימות', 'צוואה רפואית', 'ייפוי כוח רפואי'];
  if (containsAny(allText, dnrKeywords)) {
    await createInsight(patientId, familyId, sourceDocumentId, 'advance_directive',
      '⚠️ הנחיות מקדימות / DNR זוהו',
      'המסמך מציין הנחיות מקדימות או הוראת DNR. יש לעדכן את פרופיל המטופל.',
      'critical'
    );
  }

  // ── Beers Criteria check for elderly ────────────────────────────────────
  for (const med of result.extractedMedications) {
    const medLower = med.name.toLowerCase();
    for (const rule of HIGH_RISK_ELDERLY_DRUGS) {
      if (rule.keywords.some((kw) => medLower.includes(kw.toLowerCase()))) {
        await createInsight(patientId, familyId, sourceDocumentId, 'beers_criteria',
          `Beers Criteria: ${med.name} — גיל מבוגר`,
          `התרופה ${med.name} מסוכנת לגיל מבוגר. סיכון: ${rule.risk}.`,
          'warning'
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
