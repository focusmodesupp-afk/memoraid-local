/**
 * Medical Correlations Engine — Medical Brain
 * Analyzes lab values and vitals to produce clinical implications:
 * tasks, insights, alerts, and related test recommendations.
 */

import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { labResults, vitals, tasks, patientHealthInsights, notifications, familyMembers } from '../../../shared/schemas/schema';
import type { MedicalAnalysisResult } from './medicalDocumentAnalyzer';
import { evaluateLabValue } from './medicalReferenceRanges';

export interface CorrelationAction {
  type: 'insight' | 'task' | 'alert';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  content: string;
  taskDueInDays?: number;
  taskPriority?: 'low' | 'medium' | 'high' | 'urgent';
  notifyFamily?: boolean;
}

export interface CorrelationResult {
  trigger: string;
  actions: CorrelationAction[];
}

interface ExtractedLabValue {
  name: string;
  value: string;
  unit?: string;
  isAbnormal: boolean;
}

interface ExtractedVital {
  type: string;
  value: number;
  value2?: number;
  unit: string;
  isAbnormal?: boolean;
}

// ── Correlation rules ────────────────────────────────────────────────────────

function getNumericValue(val: string): number | null {
  const n = parseFloat(val.replace(',', '.').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}

function buildCorrelations(
  labs: ExtractedLabValue[],
  vitalsList: ExtractedVital[]
): CorrelationResult[] {
  const results: CorrelationResult[] = [];

  const getLabVal = (namePart: string): { value: number; lab: ExtractedLabValue } | null => {
    const found = labs.find((l) => l.name.toLowerCase().includes(namePart.toLowerCase()));
    if (!found) return null;
    const n = getNumericValue(found.value);
    return n !== null ? { value: n, lab: found } : null;
  };

  const getVital = (type: string): ExtractedVital | null =>
    vitalsList.find((v) => v.type === type) ?? null;

  // ── HbA1c ─────────────────────────────────────────────────────────────
  const hba1c = getLabVal('hba1c');
  if (hba1c) {
    if (hba1c.value >= 8.0) {
      results.push({
        trigger: `HbA1c >= 8% (${hba1c.value}%)`,
        actions: [
          {
            type: 'insight',
            severity: 'critical',
            title: 'סוכרת לא מאוזנת — HbA1c >= 8%',
            content: `HbA1c = ${hba1c.value}%. סוכרת לא מאוזנת. נדרש שינוי טיפול בהקדם.`,
            notifyFamily: true,
          },
          {
            type: 'task',
            severity: 'critical',
            title: 'ביקור דחוף אנדוקרינולוג — סוכרת לא מאוזנת',
            content: `HbA1c = ${hba1c.value}%. שקול שינוי טיפול.`,
            taskDueInDays: 7,
            taskPriority: 'urgent',
          },
        ],
      });
    } else if (hba1c.value >= 6.5) {
      results.push({
        trigger: `HbA1c >= 6.5% (${hba1c.value}%)`,
        actions: [
          {
            type: 'insight',
            severity: 'warning',
            title: 'אבחנת סוכרת — HbA1c >= 6.5%',
            content: `HbA1c = ${hba1c.value}%. ערך זה מציין סוכרת. נדרש מעקב אנדוקרינולוג.`,
          },
          {
            type: 'task',
            severity: 'warning',
            title: 'תור לאנדוקרינולוג — HbA1c מעל 6.5%',
            content: 'נדרש מעקב סוכרת ובדיקות השלמה: קריאטינין, eGFR, מיקרואלבומין.',
            taskDueInDays: 30,
            taskPriority: 'high',
          },
          {
            type: 'task',
            severity: 'info',
            title: 'בדיקת עיניים — רטינופתיה סוכרתית',
            content: 'מומלץ לבדוק עיניים לאיתור רטינופתיה סוכרתית (אחת לשנה).',
            taskDueInDays: 90,
            taskPriority: 'medium',
          },
        ],
      });
    } else if (hba1c.value >= 5.7) {
      results.push({
        trigger: `HbA1c טרום סוכרת (${hba1c.value}%)`,
        actions: [
          {
            type: 'insight',
            severity: 'warning',
            title: 'טרום סוכרת — HbA1c 5.7-6.4%',
            content: `HbA1c = ${hba1c.value}%. ערך זה מציין טרום סוכרת. נדרשים שינויי תזונה ופעילות גופנית.`,
          },
        ],
      });
    }
  }

  // ── eGFR / Kidney function ────────────────────────────────────────────
  const egfr = getLabVal('egfr') ?? getLabVal('e-gfr');
  if (egfr) {
    if (egfr.value < 30) {
      results.push({
        trigger: `eGFR < 30 (${egfr.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'critical',
            title: 'אי ספיקת כליות חמורה — eGFR < 30',
            content: `eGFR = ${egfr.value} mL/min/1.73m². נדרשת הפניה דחופה לנפרולוג. בדוק תרופות: מטפורמין אסור ב-eGFR < 30.`,
            notifyFamily: true,
          },
          {
            type: 'task',
            severity: 'critical',
            title: 'הפניה דחופה לנפרולוג — eGFR < 30',
            content: 'אי ספיקת כליות חמורה. קרא לנפרולוג בתוך 3 ימים.',
            taskDueInDays: 3,
            taskPriority: 'urgent',
          },
        ],
      });
    } else if (egfr.value < 60) {
      results.push({
        trigger: `eGFR < 60 (${egfr.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'warning',
            title: 'ירידה בתפקוד כליות — eGFR < 60',
            content: `eGFR = ${egfr.value} mL/min/1.73m². בדוק תרופות נפרוטוקסיות (NSAIDs, מטפורמין). הפנה לנפרולוג.`,
          },
          {
            type: 'task',
            severity: 'warning',
            title: 'הפניה לנפרולוג — eGFR < 60',
            content: 'בדוק תרופות ועקוב אחרי תפקוד הכליות.',
            taskDueInDays: 14,
            taskPriority: 'high',
          },
        ],
      });
    }
  }

  // ── Hemoglobin / Anemia ────────────────────────────────────────────────
  const hgb = getLabVal('hemoglobin') ?? getLabVal('hgb') ?? getLabVal('המוגלובין');
  if (hgb) {
    if (hgb.value < 7) {
      results.push({
        trigger: `המוגלובין קריטי < 7 (${hgb.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'critical',
            title: 'אנמיה חמורה מאוד — Hb < 7',
            content: `המוגלובין = ${hgb.value} g/dL. נדרש בירור וטיפול דחוף. שקול עירוי דם.`,
            notifyFamily: true,
          },
          {
            type: 'task',
            severity: 'critical',
            title: 'בירור אנמיה חמורה — דחוף',
            content: 'בדיקות: ברזל, פריטין, B12, חומצה פולית, רטיקולוציטים, MCV.',
            taskDueInDays: 1,
            taskPriority: 'urgent',
          },
        ],
      });
    } else if (hgb.value < 10) {
      results.push({
        trigger: `אנמיה — Hb < 10 (${hgb.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'warning',
            title: 'אנמיה — המוגלובין < 10',
            content: `המוגלובין = ${hgb.value} g/dL. נדרש בירור סיבת האנמיה.`,
          },
          {
            type: 'task',
            severity: 'warning',
            title: 'בירור אנמיה — בדיקות מעבדה',
            content: 'בדיקות: ברזל, פריטין, B12, חומצה פולית, MCV, רטיקולוציטים.',
            taskDueInDays: 7,
            taskPriority: 'high',
          },
        ],
      });
    }
  }

  // ── TSH / Thyroid ─────────────────────────────────────────────────────
  const tsh = getLabVal('tsh');
  if (tsh) {
    if (tsh.value > 6.0) {
      results.push({
        trigger: `TSH גבוה (${tsh.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'warning',
            title: 'TSH גבוה — שקול תת-פעילות בלוטת תריס',
            content: `TSH = ${tsh.value} mIU/L. בדוק T4 חופשי ונוגדני TPO. אם המטופל על לבותירוקסין — בדוק מינון.`,
          },
          {
            type: 'task',
            severity: 'warning',
            title: 'בדיקת T4 חופשי ו-TPO',
            content: 'בירור תת-פעילות בלוטת תריס.',
            taskDueInDays: 14,
            taskPriority: 'medium',
          },
        ],
      });
    } else if (tsh.value < 0.4) {
      results.push({
        trigger: `TSH נמוך (${tsh.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'warning',
            title: 'TSH נמוך — שקול יתר-פעילות בלוטת תריס',
            content: `TSH = ${tsh.value} mIU/L. בדוק T4 חופשי ו-T3. אם המטופל על לבותירוקסין — ייתכן מינון גבוה מדי.`,
          },
          {
            type: 'task',
            severity: 'warning',
            title: 'בדיקת T4 חופשי + ייעוץ אנדוקרינולוג',
            content: 'בירור יתר-פעילות בלוטת תריס.',
            taskDueInDays: 14,
            taskPriority: 'medium',
          },
        ],
      });
    }
  }

  // ── Vitamin D ─────────────────────────────────────────────────────────
  const vitD = getLabVal('vitamin_d') ?? getLabVal('ויטמין d') ?? getLabVal('vit d');
  if (vitD && vitD.value < 20) {
    results.push({
      trigger: `חסר ויטמין D (${vitD.value})`,
      actions: [
        {
          type: 'insight',
          severity: 'warning',
          title: 'חסר ויטמין D — סיכון לנפילות ואוסטיאופורוזיס',
          content: `ויטמין D = ${vitD.value} ng/mL. נדרשת תוספת. בדוק סידן ו-PTH.`,
        },
        {
          type: 'task',
          severity: 'warning',
          title: 'תוספת ויטמין D — התייעץ עם רופא',
          content: 'חסר ויטמין D. מומלץ לבדוק סידן ו-PTH ולהתחיל תוספת.',
          taskDueInDays: 7,
          taskPriority: 'medium',
        },
      ],
    });
  }

  // ── Vitamin B12 ───────────────────────────────────────────────────────
  const b12 = getLabVal('b12') ?? getLabVal('vitamin b12') ?? getLabVal('ויטמין b12');
  if (b12 && b12.value < 200) {
    results.push({
      trigger: `חסר ויטמין B12 (${b12.value})`,
      actions: [
        {
          type: 'insight',
          severity: 'warning',
          title: 'חסר ויטמין B12 — סיכון נוירולוגי',
          content: `B12 = ${b12.value} pg/mL. נדרשת תוספת. בדוק: המוגלובין, MCV, הומוציסטאין.`,
        },
        {
          type: 'task',
          severity: 'warning',
          title: 'טיפול בחסר B12 — זריקות או תוספת',
          content: 'חסר ויטמין B12. התייעץ עם רופא לגבי זריקות B12 או תוספת פומית.',
          taskDueInDays: 7,
          taskPriority: 'high',
        },
      ],
    });
  }

  // ── INR ────────────────────────────────────────────────────────────────
  const inr = getLabVal('inr');
  if (inr) {
    if (inr.value > 5.0) {
      results.push({
        trigger: `INR קריטי (${inr.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'critical',
            title: 'INR גבוה מאוד — סיכון דימום קריטי',
            content: `INR = ${inr.value}. סיכון דימום חמור. בדוק מינון קומדין/וורפרין דחוף.`,
            notifyFamily: true,
          },
          {
            type: 'task',
            severity: 'critical',
            title: 'INR חוזר + ייעוץ רופא — דחוף',
            content: 'INR > 5.0. פנה לרופא היום.',
            taskDueInDays: 1,
            taskPriority: 'urgent',
          },
        ],
      });
    } else if (inr.value > 3.5) {
      results.push({
        trigger: `INR גבוה (${inr.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'warning',
            title: 'INR גבוה — בדוק מינון נוגד קרישה',
            content: `INR = ${inr.value}. גבוה מהטווח הטיפולי. שקול הפחתת מינון.`,
          },
          {
            type: 'task',
            severity: 'warning',
            title: 'בדיקת INR חוזרת + ייעוץ רופא',
            content: 'INR גבוה. בדיקה חוזרת ב-1-2 שבועות.',
            taskDueInDays: 7,
            taskPriority: 'high',
          },
        ],
      });
    }
  }

  // ── LDL ───────────────────────────────────────────────────────────────
  const ldl = getLabVal('ldl');
  if (ldl && ldl.value >= 190) {
    results.push({
      trigger: `LDL גבוה מאוד (${ldl.value})`,
      actions: [
        {
          type: 'insight',
          severity: 'warning',
          title: 'LDL גבוה מאוד — שקול סטטינים',
          content: `LDL = ${ldl.value} mg/dL. גבוה מאוד. נדרש ייעוץ קרדיולוג. בדוק TSH (תת-פעילות תריס מעלה LDL).`,
        },
        {
          type: 'task',
          severity: 'warning',
          title: 'ייעוץ קרדיולוג / רופא משפחה — LDL גבוה',
          content: 'LDL >= 190. שקול טיפול בסטטינים.',
          taskDueInDays: 30,
          taskPriority: 'medium',
        },
      ],
    });
  }

  // ── Blood Pressure ────────────────────────────────────────────────────
  const bp = getVital('blood_pressure');
  if (bp) {
    const systolic = bp.value;
    const diastolic = bp.value2 ?? 0;
    if (systolic >= 180 || diastolic >= 120) {
      results.push({
        trigger: `לחץ דם היפרטנסיבי קריטי (${systolic}/${diastolic})`,
        actions: [
          {
            type: 'insight',
            severity: 'critical',
            title: 'לחץ דם גבוה מאוד — Hypertensive Crisis',
            content: `לחץ דם = ${systolic}/${diastolic} mmHg. נדרש טיפול מיידי. פנה לחדר מיון אם יש תסמינים.`,
            notifyFamily: true,
          },
          {
            type: 'task',
            severity: 'critical',
            title: 'ביקור רופא דחוף — לחץ דם גבוה מאוד',
            content: `לחץ דם ${systolic}/${diastolic} mmHg. פנה לרופא היום.`,
            taskDueInDays: 1,
            taskPriority: 'urgent',
          },
        ],
      });
    } else if (systolic >= 160 || diastolic >= 100) {
      results.push({
        trigger: `לחץ דם גבוה Stage 2 (${systolic}/${diastolic})`,
        actions: [
          {
            type: 'insight',
            severity: 'warning',
            title: 'לחץ דם גבוה (Stage 2)',
            content: `לחץ דם = ${systolic}/${diastolic} mmHg. נדרש טיפול. בדוק: קריאטינין, eGFR, אשלגן.`,
          },
          {
            type: 'task',
            severity: 'warning',
            title: 'ביקור רופא — לחץ דם גבוה',
            content: 'לחץ דם Stage 2. נדרש התאמת טיפול.',
            taskDueInDays: 3,
            taskPriority: 'high',
          },
        ],
      });
    }
  }

  // ── Blood Sugar (random/fasting) ──────────────────────────────────────
  const glucose = getVital('blood_sugar');
  if (glucose) {
    if (glucose.value > 400) {
      results.push({
        trigger: `גלוקוז קריטי (${glucose.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'critical',
            title: 'סוכר דם קריטי — גבוה מאוד',
            content: `סוכר דם = ${glucose.value} mg/dL. סיכון לקטואצידוזיס סוכרתית. פנה לטיפול דחוף.`,
            notifyFamily: true,
          },
        ],
      });
    } else if (glucose.value < 50) {
      results.push({
        trigger: `היפוגליקמיה קריטית (${glucose.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'critical',
            title: 'היפוגליקמיה קריטית',
            content: `סוכר דם = ${glucose.value} mg/dL. היפוגליקמיה חמורה. נדרש טיפול מיידי.`,
            notifyFamily: true,
          },
        ],
      });
    }
  }

  // ── Potassium ─────────────────────────────────────────────────────────
  const potassium = getLabVal('potassium') ?? getLabVal('אשלגן');
  if (potassium) {
    if (potassium.value > 6.5 || potassium.value < 2.5) {
      results.push({
        trigger: `אשלגן קריטי (${potassium.value})`,
        actions: [
          {
            type: 'insight',
            severity: 'critical',
            title: 'אשלגן ברמה קריטית',
            content: `אשלגן = ${potassium.value} mEq/L. סיכון לאריתמיה קרדיאלית. פנה לרופא דחוף.`,
            notifyFamily: true,
          },
          {
            type: 'task',
            severity: 'critical',
            title: 'אשלגן קריטי — ייעוץ רופא דחוף',
            content: 'אשלגן מחוץ לטווח הבטוח. ECG ופנייה רפואית דחופה.',
            taskDueInDays: 1,
            taskPriority: 'urgent',
          },
        ],
      });
    }
  }

  return results;
}

// ── Main engine function ─────────────────────────────────────────────────────

export async function runCorrelationEngine(
  patientId: string,
  familyId: string,
  sourceDocumentId: string,
  labValues: ExtractedLabValue[],
  vitalsList: ExtractedVital[],
  userId: string
): Promise<{ correlationsFound: number; insightsCreated: number; tasksCreated: number }> {
  const correlations = buildCorrelations(labValues, vitalsList);
  let insightsCreated = 0;
  let tasksCreated = 0;

  for (const correlation of correlations) {
    for (const action of correlation.actions) {
      try {
        if (action.type === 'insight' || action.type === 'alert') {
          const [row] = await db
            .insert(patientHealthInsights)
            .values({
              patientId,
              familyId,
              sourceDocumentId,
              insightType: 'correlation',
              title: action.title,
              content: action.content,
              severity: action.severity,
              status: 'new',
            })
            .returning({ id: patientHealthInsights.id });

          if (row) insightsCreated++;

          if (action.notifyFamily) {
            await notifyManagers(familyId, action.title, action.content);
          }
        } else if (action.type === 'task') {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (action.taskDueInDays ?? 14));
          await db.insert(tasks).values({
            familyId,
            patientId,
            createdByUserId: userId,
            title: action.title,
            description: action.content,
            status: 'todo',
            priority: (action.taskPriority ?? 'medium') as any,
            category: 'medical',
            source: 'ai',
            dueDate,
            sourceEntityType: 'document',
            sourceEntityId: sourceDocumentId,
          });
          tasksCreated++;
        }
      } catch (err) {
        console.error('[CorrelationEngine] action failed:', action.title, err);
      }
    }
  }

  return { correlationsFound: correlations.length, insightsCreated, tasksCreated };
}

async function notifyManagers(familyId: string, title: string, body: string) {
  try {
    const managers = await db
      .select({ userId: familyMembers.userId })
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.role, 'manager')));
    if (!managers.length) return;
    await db.insert(notifications).values(
      managers.map((m) => ({ userId: m.userId, title, body, type: 'medical_alert' }))
    );
  } catch {
    // Non-critical
  }
}
