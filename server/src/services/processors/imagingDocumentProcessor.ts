/**
 * Imaging Document Processor
 * Handles CT, MRI, X-Ray, Ultrasound reports.
 * Detects urgent findings and pre-contrast medication warnings.
 */

import { db } from '../../db';
import { tasks, patientHealthInsights, medications, notifications, familyMembers } from '../../../../shared/schemas/schema';
import { and, eq } from 'drizzle-orm';
import type { MedicalAnalysisResult } from '../medicalDocumentAnalyzer';

interface UrgentFinding {
  keywords: string[];
  severity: 'warning' | 'critical';
  title: string;
  taskTitle: string;
  taskDays: number;
  taskPriority: string;
}

const URGENT_FINDINGS: UrgentFinding[] = [
  {
    keywords: ['דימום תוך-גולגולתי', 'intracranial hemorrhage', 'דימום מוחי', 'subarachnoid hemorrhage', 'subdural hematoma'],
    severity: 'critical',
    title: 'ממצא קריטי: דימום תוך-גולגולתי',
    taskTitle: 'הפניה דחופה לנוירוכירורגיה — דימום מוחי',
    taskDays: 0,
    taskPriority: 'urgent',
  },
  {
    keywords: ['אוטם מוחי', 'stroke', 'ischemic stroke', 'cerebral infarction'],
    severity: 'critical',
    title: 'ממצא קריטי: אוטם מוחי',
    taskTitle: 'הפניה דחופה לנוירולוג — אוטם מוחי',
    taskDays: 0,
    taskPriority: 'urgent',
  },
  {
    keywords: ['תסחיף ריאתי', 'pulmonary embolism', 'pe ', 'dvt', 'deep vein thrombosis'],
    severity: 'critical',
    title: 'ממצא קריטי: תסחיף ריאתי',
    taskTitle: 'הפניה דחופה לרפואה פנימית — תסחיף ריאתי',
    taskDays: 0,
    taskPriority: 'urgent',
  },
  {
    keywords: ['אנוריזמה', 'aneurysm', 'מפרצת', 'aortic dissection', 'ניתוק אאורטה'],
    severity: 'critical',
    title: 'ממצא קריטי: אנוריזמה / ניתוק אאורטה',
    taskTitle: 'הפניה דחופה לכירורגיה וסקולרית',
    taskDays: 0,
    taskPriority: 'urgent',
  },
  {
    keywords: ['גידול', 'tumor', 'mass', 'neoplasm', 'מסה', 'נגע חשוד', 'suspicious lesion', 'carcinoma', 'סרטן', 'cancer', 'malignant', 'ממאיר'],
    severity: 'critical',
    title: 'ממצא חשוד לגידול / ממאירות',
    taskTitle: 'הפניה לאונקולוג / ביופסיה',
    taskDays: 7,
    taskPriority: 'urgent',
  },
  {
    keywords: ['שבר', 'fracture', 'קרע', 'rupture'],
    severity: 'warning',
    title: 'ממצא: שבר / קרע',
    taskTitle: 'הפניה לאורטופד — שבר',
    taskDays: 3,
    taskPriority: 'high',
  },
  {
    keywords: ['אוסטיאופורוזיס', 'osteoporosis', 'ירידה בצפיפות עצם', 'bone density'],
    severity: 'warning',
    title: 'אוסטיאופורוזיס זוהה',
    taskTitle: 'בדיקת צפיפות עצם (DEXA) + ייעוץ',
    taskDays: 30,
    taskPriority: 'medium',
  },
  {
    keywords: ['כיס מרה', 'gallstone', 'cholelithiasis', 'אבנים בכיס המרה', 'cholecystitis'],
    severity: 'warning',
    title: 'אבנים בכיס המרה',
    taskTitle: 'ייעוץ כירורג — כיס מרה',
    taskDays: 21,
    taskPriority: 'medium',
  },
  {
    keywords: ['אבנים בכליות', 'kidney stones', 'nephrolithiasis', 'urolithiasis'],
    severity: 'warning',
    title: 'אבנים בכליות',
    taskTitle: 'הפניה לאורולוג — אבנים בכליות',
    taskDays: 21,
    taskPriority: 'medium',
  },
];

const CONTRAST_IMAGING_KEYWORDS = ['ct עם ניגוד', 'ct with contrast', 'אנגיוגרפיה', 'angiography', 'קתטריזציה', 'catheterization', 'mri עם גדוליניום', 'mri with gadolinium'];

export async function processImagingDocument(
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
  ].join(' ').toLowerCase();

  // ── Check for urgent findings ─────────────────────────────────────────────
  for (const finding of URGENT_FINDINGS) {
    const found = finding.keywords.some((kw) => allText.includes(kw.toLowerCase()));
    if (!found) continue;

    await createInsight(patientId, familyId, sourceDocumentId, 'imaging_urgent_finding',
      finding.title,
      `ממצא זוהה בבדיקת הדמיה. ${finding.title}. פנה לרופא מיד.`,
      finding.severity
    );

    await createTask(familyId, patientId, userId,
      finding.taskTitle,
      `ממצא דחוף בהדמיה: ${finding.title}.`,
      finding.taskDays, finding.taskPriority, sourceDocumentId
    );

    if (finding.severity === 'critical') {
      await notifyManagers(familyId, `⚠️ ${finding.title}`, `ממצא קריטי בבדיקת הדמיה. נדרשת פנייה רפואית מיידית.`);
    }
  }

  // ── Check for contrast imaging — metformin warning ─────────────────────
  const isContrastImaging = CONTRAST_IMAGING_KEYWORDS.some((kw) => allText.includes(kw.toLowerCase()));
  if (isContrastImaging && patientId) {
    try {
      // Check if patient is on metformin
      const metforminMeds = await db
        .select({ id: medications.id, name: medications.name })
        .from(medications)
        .where(and(eq(medications.patientId, patientId), eq(medications.isActive, true)));

      const hasMetformin = metforminMeds.some((m) =>
        m.name.toLowerCase().includes('מטפורמין') || m.name.toLowerCase().includes('metformin')
      );

      if (hasMetformin) {
        await createInsight(patientId, familyId, sourceDocumentId, 'pre_imaging_safety',
          '⚠️ מטפורמין + הדמיה עם ניגוד — הפסקה נדרשת',
          'המטופל נוטל מטפורמין. יש להפסיק 48 שעות לפני CT עם חומר ניגוד ולחדש לאחר 48 שעות עם תפקוד כליות תקין.',
          'critical'
        );
        await createTask(familyId, patientId, userId,
          'הפסקת מטפורמין לפני הדמיה עם ניגוד',
          'הפסק מטפורמין 48 שעות לפני CT עם חומר ניגוד. בדוק קריאטינין לאחר הבדיקה.',
          1, 'urgent', sourceDocumentId
        );
      }
    } catch { /* non-critical */ }
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
    const managers = await db.select({ userId: familyMembers.userId }).from(familyMembers)
      .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.role, 'manager')));
    if (!managers.length) return;
    await db.insert(notifications).values(managers.map((m) => ({ userId: m.userId, title, body, type: 'imaging_alert' })));
  } catch { /* non-critical */ }
}
