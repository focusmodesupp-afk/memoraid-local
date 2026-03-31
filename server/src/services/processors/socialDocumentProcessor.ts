/**
 * Social Document Processor
 * Handles National Insurance Institute documents, disability assessments,
 * nursing allowance, and legal/guardianship documents.
 */

import { db } from '../../db';
import { tasks, patientHealthInsights } from '../../../../shared/schemas/schema';
import type { MedicalAnalysisResult } from '../medicalDocumentAnalyzer';

interface SocialRight {
  keywords: string[];
  category: string;
  taskTitle: string;
  taskDays: number;
  priority: string;
  insightTitle: string;
}

const SOCIAL_RIGHTS: SocialRight[] = [
  {
    keywords: ['קצבת סיעוד', 'nursing allowance', 'גמלת סיעוד', 'long-term care'],
    category: 'nursing_allowance',
    taskTitle: 'בדיקת זכאות לקצבת סיעוד — ביטוח לאומי',
    taskDays: 30,
    priority: 'medium',
    insightTitle: 'קצבת סיעוד — בדוק זכאות',
  },
  {
    keywords: ['ועדה רפואית', 'medical committee', 'ועדת נכות'],
    category: 'medical_committee',
    taskTitle: 'הכנה לוועדה רפואית — ביטוח לאומי',
    taskDays: 14,
    priority: 'high',
    insightTitle: 'ועדה רפואית — הכנה נדרשת',
  },
  {
    keywords: ['ערר', 'appeal', 'ערעור', 'appealing'],
    category: 'appeal',
    taskTitle: 'הגשת ערר — מועד אחרון לבדיקה',
    taskDays: 7,
    priority: 'urgent',
    insightTitle: 'ערר — בדוק מועד הגשה',
  },
  {
    keywords: ['נכות כללית', 'disability', 'אחוזי נכות', 'disability percentage'],
    category: 'disability',
    taskTitle: 'בדיקת זכאות לנכות כללית',
    taskDays: 30,
    priority: 'medium',
    insightTitle: 'נכות — בדוק זכאות',
  },
  {
    keywords: ['שירותים מיוחדים', 'special services', 'תגמול לנכה'],
    category: 'special_services',
    taskTitle: 'בדיקת זכאות לשירותים מיוחדים',
    taskDays: 30,
    priority: 'medium',
    insightTitle: 'שירותים מיוחדים — בדוק זכאות',
  },
  {
    keywords: ['אפוטרופסות', 'guardianship', 'ייפוי כוח', 'power of attorney', 'ייפוי כוח מתמשך'],
    category: 'legal',
    taskTitle: 'עדכון מסמכים משפטיים — אפוטרופסות/ייפוי כוח',
    taskDays: 30,
    priority: 'high',
    insightTitle: 'מסמך משפטי — אפוטרופסות / ייפוי כוח',
  },
  {
    keywords: ['הטבות מס', 'tax benefits', 'נקודות זיכוי', 'disability tax'],
    category: 'tax_benefits',
    taskTitle: 'בדיקת הטבות מס לנכה',
    taskDays: 60,
    priority: 'low',
    insightTitle: 'הטבות מס — בדוק זכאות',
  },
];

export async function processSocialDocument(
  result: MedicalAnalysisResult,
  patientId: string,
  familyId: string,
  sourceDocumentId: string,
  userId: string
): Promise<void> {
  const allText = [
    result.simplifiedDiagnosis,
    result.doctorNotes,
    result.documentDescription,
    ...result.keyFindings,
    ...(result.rawText ? [result.rawText] : []),
  ].join(' ').toLowerCase();

  for (const right of SOCIAL_RIGHTS) {
    const found = right.keywords.some((kw) => allText.includes(kw.toLowerCase()));
    if (!found) continue;

    await createInsight(patientId, familyId, sourceDocumentId, 'social_rights',
      right.insightTitle,
      `מסמך מביטוח לאומי / זכויות זוהה. קטגוריה: ${right.category}. ודא שהמטופל מקבל את מלוא הזכויות.`,
      'info'
    );

    await createTask(familyId, patientId, userId,
      right.taskTitle,
      `זוהה מסמך הקשור ל-${right.category}. בדוק זכאות ופעל בהתאם.`,
      right.taskDays, right.priority, sourceDocumentId
    );
  }

  // ── Care level / nursing level detection ────────────────────────────────
  const careLevelMatch = allText.match(/דרגת סיעוד[:\s]+(\d+)/i) ?? allText.match(/care level[:\s]+(\d+)/i);
  if (careLevelMatch) {
    await createInsight(patientId, familyId, sourceDocumentId, 'care_level',
      `דרגת סיעוד: ${careLevelMatch[1]}`,
      `מסמך ביטוח לאומי מציין דרגת סיעוד ${careLevelMatch[1]}. עדכן פרופיל המטופל.`,
      'info'
    );
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
    await db.insert(tasks).values({ familyId, patientId, createdByUserId: userId, title, description, status: 'todo', priority: priority as any, category: 'other', source: 'ai', dueDate, sourceEntityType: 'document', sourceEntityId: sourceDocumentId });
  } catch { /* non-critical */ }
}
