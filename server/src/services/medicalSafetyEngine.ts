/**
 * Medical Safety Engine — Medical Brain
 * Checks allergies × medications and allergies × procedures.
 * Also enforces Beers Criteria for elderly patients.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { patientAllergies, tasks, patientHealthInsights, notifications, familyMembers, patients } from '../../../shared/schemas/schema';

export interface SafetyAlert {
  type: 'allergy_medication' | 'allergy_procedure' | 'beers_criteria' | 'drug_interaction';
  severity: 'warning' | 'critical';
  allergen?: string;
  medication?: string;
  procedure?: string;
  message: string;
  recommendation: string;
}

// ── Allergy × Drug cross-reactivity map ─────────────────────────────────────

interface DrugAllergyRule {
  allergenKeywords: string[];
  conflictingDrugs: string[];
  crossReactiveDrugs?: string[];
  severity: 'warning' | 'critical';
  message: string;
  recommendation: string;
}

const DRUG_ALLERGY_RULES: DrugAllergyRule[] = [
  {
    allergenKeywords: ['פניצילין', 'penicillin', 'אמוקסיצילין', 'אוגמנטין', 'אמפיצילין'],
    conflictingDrugs: ['פניצילין', 'אמוקסיצילין', 'אוגמנטין', 'אמפיצילין', 'amoxicillin', 'ampicillin', 'augmentin', 'penicillin'],
    crossReactiveDrugs: ['צפלוספורין', 'cephalosporin', 'אמוקסיקלב'],
    severity: 'critical',
    message: 'אלרגיה לפניצילין — תרופה זו אסורה!',
    recommendation: 'שקול אזיתרומיצין, קלינדמיצין, או ארבניצין. cross-reactivity אפשרי עם צפלוספורינים (10%).',
  },
  {
    allergenKeywords: ['NSAIDs', 'אספירין', 'aspirin', 'איבופרופן', 'ibuprofen', 'נפרוקסן', 'דיקלופנק'],
    conflictingDrugs: ['איבופרופן', 'ibuprofen', 'נפרוקסן', 'naproxen', 'דיקלופנק', 'diclofenac', 'קטורולק', 'ketorolac', 'מלוקסיקם', 'celecoxib', 'סלקוקסיב', 'nsaids', 'אנדומטצין', 'indomethacin'],
    severity: 'critical',
    message: 'אלרגיה ל-NSAIDs/אספירין — תרופה זו אסורה!',
    recommendation: 'השתמש בפרצטמול (טיסנול/אקמול) כחלופה לכאב.',
  },
  {
    allergenKeywords: ['סולפה', 'sulfa', 'sulfamethoxazole', 'ספטרין', 'בקטרים'],
    conflictingDrugs: ['ספטרין', 'septrin', 'בקטרים', 'bactrim', 'sulfamethoxazole', 'סולפה'],
    crossReactiveDrugs: ['תיאזיד', 'thiazide', 'פורוסמיד', 'furosemide', 'סלקוקסיב'],
    severity: 'critical',
    message: 'אלרגיה לסולפה — תרופה זו אסורה!',
    recommendation: 'שקול חלופות אנטיביוטיות ללא סולפה.',
  },
  {
    allergenKeywords: ['קסילוקאין', 'לידוקאין', 'lidocaine', 'xylocaine', 'חומר הרדמה מקומי', 'אנסתזיה מקומית'],
    conflictingDrugs: ['לידוקאין', 'lidocaine', 'קסילוקאין', 'xylocaine', 'מרקיין', 'bupivacaine', 'פריוקאין', 'prilocaine'],
    severity: 'critical',
    message: 'רגישות לחומר הרדמה מקומי — תרופה זו עלולה לגרום לתגובה!',
    recommendation: 'יש ליידע את הרופא/רופא שיניים לפני כל פרוצדורה.',
  },
  {
    allergenKeywords: ['קודאין', 'codeine', 'אופיאטים', 'מורפין', 'opiates', 'opioids'],
    conflictingDrugs: ['קודאין', 'codeine', 'מורפין', 'morphine', 'אוקסיקודון', 'oxycodone', 'הידרוקודון', 'hydrocodone'],
    severity: 'critical',
    message: 'אלרגיה לאופיאטים — תרופה זו אסורה!',
    recommendation: 'שקול משככי כאבים שאינם אופיאטים (NSAIDs אם מותר, פרצטמול, טרמדול בזהירות).',
  },
];

// ── Allergy × Procedure rules ────────────────────────────────────────────────

interface ProcedureAllergyRule {
  allergenKeywords: string[];
  procedureKeywords: string[];
  severity: 'warning' | 'critical';
  message: string;
  recommendation: string;
}

const PROCEDURE_ALLERGY_RULES: ProcedureAllergyRule[] = [
  {
    allergenKeywords: ['הרדמה', 'הרדמה כללית', 'general anesthesia', 'malignant hyperthermia', 'היפרתרמיה ממאירה'],
    procedureKeywords: ['ניתוח', 'operation', 'surgery', 'כירורגי', 'הרדמה', 'anesthesia'],
    severity: 'critical',
    message: '⚠️ CRITICAL: מטופל עם רגישות ידועה להרדמה!',
    recommendation: 'יש ליידע את הצוות הרפואי ואת המרדים לפני הניתוח. בדוק נוגדנים להיפרתרמיה ממאירה.',
  },
  {
    allergenKeywords: ['חומר ניגוד', 'contrast', 'יוד', 'iodine', 'contrast dye'],
    procedureKeywords: ['ct עם ניגוד', 'ct with contrast', 'קתטריזציה', 'catheterization', 'אנגיוגרפיה', 'angiography', 'mri עם ניגוד', 'ct'],
    severity: 'critical',
    message: '⚠️ CRITICAL: אלרגיה לחומר ניגוד!',
    recommendation: 'יש ליידע את הרדיולוג/קרדיולוג. שקול פרמדיקציה (קורטיקוסטרואידים + אנטיהיסטמינים) או בדיקה חלופית ללא ניגוד.',
  },
  {
    allergenKeywords: ['לטקס', 'latex', 'גומי'],
    procedureKeywords: ['ניתוח', 'surgery', 'כירורגי', 'אנדוסקופיה', 'endoscopy', 'פרוצדורה'],
    severity: 'critical',
    message: '⚠️ CRITICAL: אלרגיה ללטקס!',
    recommendation: 'יש להשתמש בציוד נטול לטקס. ליידע את כל צוות הניתוח.',
  },
  {
    allergenKeywords: ['פניצילין', 'penicillin', 'אמוקסיצילין'],
    procedureKeywords: ['עקירת שן', 'tooth extraction', 'ניתוח שיניים', 'dental surgery', 'אנדודונטיה'],
    severity: 'warning',
    message: 'אלרגיה לפניצילין — נדרשת אנטיביוטיקה חלופית לפרופילקסיה!',
    recommendation: 'שקול אזיתרומיצין 500mg כפרופילקסיה לפני עקירת שן.',
  },
];

// ── Beers Criteria — high-risk medications for elderly (65+) ────────────────

interface BeersCriteriaRule {
  drugKeywords: string[];
  risk: string;
  alternative: string;
  severity: 'warning' | 'critical';
}

const BEERS_CRITERIA: BeersCriteriaRule[] = [
  {
    drugKeywords: ['בנזודיאזפין', 'benzodiazepine', 'לורזפם', 'lorazepam', 'דיאזפם', 'diazepam', 'קלונזפם', 'clonazepam', 'אלפרזולם', 'alprazolam', 'מידזולם', 'midazolam'],
    risk: 'בנזודיאזפינים בגיל מבוגר: סיכון נפילות, בלבול, תלות',
    alternative: 'לשינה: שקול מלטונין, CBT. לחרדה: SSRI, ייעוץ פסיכולוגי.',
    severity: 'warning',
  },
  {
    drugKeywords: ['דיפנהידרמין', 'diphenhydramine', 'פנרגן', 'phenergan', 'promethazine', 'כלורפנירמין', 'chlorpheniramine'],
    risk: 'אנטיהיסטמינים ישנים בגיל מבוגר: בלבול, אצירת שתן, נפילות',
    alternative: 'שקול לורטדין (קלריטין), צטיריזין (ציריטק) — אנטיהיסטמינים חדשים ובטוחים יותר.',
    severity: 'warning',
  },
  {
    drugKeywords: ['אמיטריפטילין', 'amitriptyline', 'נורטריפטילין', 'nortriptyline', 'אימיפרמין', 'imipramine'],
    risk: 'נוגדי דיכאון טריציקליים בגיל מבוגר: נפילות, בלבול, אריתמיה, אצירת שתן',
    alternative: 'שקול SSRI (סרטרלין, ציטלופרם) — בטוחים יותר לגיל מבוגר.',
    severity: 'warning',
  },
  {
    drugKeywords: ['nsaids', 'איבופרופן', 'ibuprofen', 'נפרוקסן', 'naproxen', 'דיקלופנק', 'diclofenac', 'מלוקסיקם', 'meloxicam'],
    risk: 'NSAIDs בגיל מבוגר: דימום GI, אי ספיקת כליות, עלייה בלחץ דם',
    alternative: 'שקול פרצטמול לכאב. אם נדרשים NSAIDs — עם מגן קיבה (PPI).',
    severity: 'warning',
  },
  {
    drugKeywords: ['גליבנקלמיד', 'glibenclamide', 'גלידנמיד', 'glyburide'],
    risk: 'גליבנקלמיד בגיל מבוגר: היפוגליקמיה ממושכת וחמורה',
    alternative: 'שקול גליקלזיד (דיאמיקרון), מטפורמין (אם תפקוד כליות תקין), או מעכבי SGLT-2.',
    severity: 'warning',
  },
  {
    drugKeywords: ['זולפידם', 'zolpidem', 'זופיקלון', 'zopiclone', 'zaleplon'],
    risk: 'כדורי שינה Z-drugs בגיל מבוגר: נפילות, בלבול, נהיגה לאחרונה',
    alternative: 'שקול מלטונין, CBT לנדודי שינה, שיפור היגיינת שינה.',
    severity: 'warning',
  },
];

// ── Drug × Drug interactions ─────────────────────────────────────────────────

interface DrugInteractionRule {
  drug1Keywords: string[];
  drug2Keywords: string[];
  severity: 'warning' | 'critical';
  effect: string;
  recommendation: string;
}

const DRUG_INTERACTIONS: DrugInteractionRule[] = [
  {
    drug1Keywords: ['וורפרין', 'warfarin', 'קומדין', 'coumadin'],
    drug2Keywords: ['אספירין', 'aspirin', 'nsaids', 'איבופרופן', 'ibuprofen'],
    severity: 'critical',
    effect: 'סיכון דימום מוגבר מאוד',
    recommendation: 'הימנע מנטילה משותפת. אם הכרחי — מעקב INR הדוק.',
  },
  {
    drug1Keywords: ['מטפורמין', 'metformin'],
    drug2Keywords: ['חומר ניגוד', 'contrast', 'iodine'],
    severity: 'critical',
    effect: 'סיכון לחמצת לקטית — יש להפסיק מטפורמין 48 שעות לפני CT עם ניגוד',
    recommendation: 'הפסק מטפורמין 48 שעות לפני בדיקת CT עם חומר ניגוד. חדש לאחר 48 שעות עם תפקוד כליות תקין.',
  },
  {
    drug1Keywords: ['ליתיום', 'lithium'],
    drug2Keywords: ['nsaids', 'איבופרופן', 'ibuprofen', 'נפרוקסן', 'naproxen'],
    severity: 'warning',
    effect: 'NSAIDs מעלים רמות ליתיום — סיכון רעילות ליתיום',
    recommendation: 'הימנע מ-NSAIDs אצל מטופלים על ליתיום. שקול פרצטמול.',
  },
  {
    drug1Keywords: ['ssri', 'פלואוקסטין', 'fluoxetine', 'סרטרלין', 'sertraline', 'ציטלופרם', 'citalopram', 'ונלפקסין', 'venlafaxine'],
    drug2Keywords: ['טרמדול', 'tramadol'],
    severity: 'critical',
    effect: 'SSRI + טרמדול = סיכון לתסמונת סרוטונין (חמורה)',
    recommendation: 'הימנע מטרמדול בחולים על SSRI/SNRI. שקול אופיאטים אחרים בזהירות.',
  },
  {
    drug1Keywords: ['סטטין', 'statin', 'אטורבסטטין', 'atorvastatin', 'רוסובסטטין', 'rosuvastatin', 'סימבסטטין', 'simvastatin'],
    drug2Keywords: ['פיברט', 'fibrate', 'פנופיברט', 'fenofibrate', 'ג\'מפיברוזיל', 'gemfibrozil'],
    severity: 'warning',
    effect: 'סטטינים + פיברטים = סיכון מיופתיה ורבדומיוליזיס',
    recommendation: 'הימנע מ-gemfibrozil עם סטטינים. אם נדרש — השתמש ב-fenofibrate עם ניטור CK.',
  },
  {
    drug1Keywords: ['ace inhibitor', 'enalapril', 'אנלפריל', 'lisinopril', 'ליסינופריל', 'ramipril', 'רמיפריל', 'perindopril'],
    drug2Keywords: ['אשלגן', 'potassium', 'spironolactone', 'ספירונולקטון'],
    severity: 'warning',
    effect: 'ACE inhibitors + אשלגן/ספירונולקטון = היפרקלמיה',
    recommendation: 'בדוק אשלגן ותפקוד כליות לאחר שילוב. מעקב תכוף.',
  },
];

// ── Main Safety Check Functions ─────────────────────────────────────────────

/**
 * Check if new medications conflict with known patient allergies.
 */
export async function checkAllergyMedicationConflicts(
  patientId: string,
  newMedications: string[]
): Promise<SafetyAlert[]> {
  const alerts: SafetyAlert[] = [];
  if (!newMedications.length) return alerts;

  const allergies = await db
    .select()
    .from(patientAllergies)
    .where(and(eq(patientAllergies.patientId, patientId), eq(patientAllergies.status, 'active')));

  for (const allergy of allergies) {
    const allergenLower = allergy.allergen.toLowerCase();

    for (const rule of DRUG_ALLERGY_RULES) {
      const allergenMatches = rule.allergenKeywords.some(
        (kw) => allergenLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(allergenLower)
      );
      if (!allergenMatches) continue;

      for (const med of newMedications) {
        const medLower = med.toLowerCase();
        const directConflict = rule.conflictingDrugs.some(
          (kw) => medLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(medLower)
        );
        if (directConflict) {
          alerts.push({
            type: 'allergy_medication',
            severity: rule.severity,
            allergen: allergy.allergen,
            medication: med,
            message: `${rule.message} (אלרגיה ידועה ל-${allergy.allergen})`,
            recommendation: rule.recommendation,
          });
          continue;
        }

        const crossConflict = rule.crossReactiveDrugs?.some(
          (kw) => medLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(medLower)
        );
        if (crossConflict) {
          alerts.push({
            type: 'allergy_medication',
            severity: 'warning',
            allergen: allergy.allergen,
            medication: med,
            message: `אפשרות cross-reactivity: אלרגיה ל-${allergy.allergen} — ${med} עלול לגרום לתגובה`,
            recommendation: rule.recommendation,
          });
        }
      }
    }
  }

  return alerts;
}

/**
 * Check if a planned procedure conflicts with known patient allergies.
 */
export async function checkAllergyProcedureConflicts(
  patientId: string,
  appointmentType: string
): Promise<SafetyAlert[]> {
  const alerts: SafetyAlert[] = [];
  const apptLower = appointmentType.toLowerCase();

  const allergies = await db
    .select()
    .from(patientAllergies)
    .where(and(eq(patientAllergies.patientId, patientId), eq(patientAllergies.status, 'active')));

  for (const allergy of allergies) {
    const allergenLower = allergy.allergen.toLowerCase();

    for (const rule of PROCEDURE_ALLERGY_RULES) {
      const allergenMatches = rule.allergenKeywords.some(
        (kw) => allergenLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(allergenLower)
      );
      if (!allergenMatches) continue;

      const procedureMatches = rule.procedureKeywords.some((kw) => apptLower.includes(kw.toLowerCase()));
      if (procedureMatches) {
        alerts.push({
          type: 'allergy_procedure',
          severity: rule.severity,
          allergen: allergy.allergen,
          procedure: appointmentType,
          message: `${rule.message} (אלרגיה ידועה ל-${allergy.allergen})`,
          recommendation: rule.recommendation,
        });
      }
    }
  }

  return alerts;
}

/**
 * Check medications against Beers Criteria for elderly patients.
 */
export async function checkBeersCriteria(
  patientId: string,
  medications: string[]
): Promise<SafetyAlert[]> {
  const alerts: SafetyAlert[] = [];
  if (!medications.length) return alerts;

  // Get patient age
  const [patient] = await db
    .select({ dateOfBirth: patients.dateOfBirth })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!patient?.dateOfBirth) return alerts;
  const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));
  if (age < 65) return alerts;

  for (const med of medications) {
    const medLower = med.toLowerCase();
    for (const rule of BEERS_CRITERIA) {
      const matches = rule.drugKeywords.some(
        (kw) => medLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(medLower)
      );
      if (matches) {
        alerts.push({
          type: 'beers_criteria',
          severity: rule.severity,
          medication: med,
          message: `Beers Criteria (גיל ${age}): ${rule.risk}`,
          recommendation: rule.alternative,
        });
      }
    }
  }

  return alerts;
}

/**
 * Check drug-drug interactions in a list of medications.
 */
export function checkDrugDrugInteractions(medications: string[]): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const medLowers = medications.map((m) => m.toLowerCase());

  for (const rule of DRUG_INTERACTIONS) {
    const hasDrug1 = medLowers.some((m) =>
      rule.drug1Keywords.some((kw) => m.includes(kw.toLowerCase()) || kw.toLowerCase().includes(m))
    );
    const hasDrug2 = medLowers.some((m) =>
      rule.drug2Keywords.some((kw) => m.includes(kw.toLowerCase()) || kw.toLowerCase().includes(m))
    );

    if (hasDrug1 && hasDrug2) {
      const drug1 = medications.find((m) =>
        rule.drug1Keywords.some((kw) => m.toLowerCase().includes(kw.toLowerCase()))
      ) ?? 'תרופה 1';
      const drug2 = medications.find((m) =>
        rule.drug2Keywords.some((kw) => m.toLowerCase().includes(kw.toLowerCase()))
      ) ?? 'תרופה 2';

      alerts.push({
        type: 'drug_interaction',
        severity: rule.severity,
        medication: `${drug1} + ${drug2}`,
        message: `אינטראקציה תרופתית: ${drug1} + ${drug2} — ${rule.effect}`,
        recommendation: rule.recommendation,
      });
    }
  }

  return alerts;
}

/**
 * Run all safety checks and persist results as insights + tasks.
 */
export async function runSafetyEngine(
  patientId: string,
  familyId: string,
  sourceDocumentId: string,
  medications: string[],
  userId: string
): Promise<{ alertsFound: number; insightsCreated: number; tasksCreated: number }> {
  let insightsCreated = 0;
  let tasksCreated = 0;
  const allAlerts: SafetyAlert[] = [];

  try {
    const [allergyMedAlerts, beersAlerts] = await Promise.all([
      checkAllergyMedicationConflicts(patientId, medications),
      checkBeersCriteria(patientId, medications),
    ]);
    const drugInteractions = checkDrugDrugInteractions(medications);
    allAlerts.push(...allergyMedAlerts, ...beersAlerts, ...drugInteractions);
  } catch (err) {
    console.error('[SafetyEngine] check failed:', err);
    return { alertsFound: 0, insightsCreated: 0, tasksCreated: 0 };
  }

  for (const alert of allAlerts) {
    try {
      const [row] = await db
        .insert(patientHealthInsights)
        .values({
          patientId,
          familyId,
          sourceDocumentId,
          insightType: alert.type,
          title: alert.message,
          content: alert.recommendation,
          severity: alert.severity,
          status: 'new',
        })
        .returning({ id: patientHealthInsights.id });

      if (row) insightsCreated++;

      if (alert.severity === 'critical') {
        // Create urgent task
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        await db.insert(tasks).values({
          familyId,
          patientId,
          createdByUserId: userId,
          title: `⚠️ ${alert.message}`,
          description: alert.recommendation,
          status: 'todo',
          priority: 'urgent',
          category: 'medical',
          source: 'ai',
          dueDate,
          sourceEntityType: 'document',
          sourceEntityId: sourceDocumentId,
        });
        tasksCreated++;

        // Notify family managers
        await notifyManagers(familyId, `⚠️ ${alert.message}`, alert.recommendation);
      }
    } catch (err) {
      console.error('[SafetyEngine] persist failed:', alert.message, err);
    }
  }

  return { alertsFound: allAlerts.length, insightsCreated, tasksCreated };
}

async function notifyManagers(familyId: string, title: string, body: string) {
  try {
    const managers = await db
      .select({ userId: familyMembers.userId })
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.role, 'manager')));
    if (!managers.length) return;
    await db.insert(notifications).values(
      managers.map((m) => ({ userId: m.userId, title, body, type: 'safety_alert' }))
    );
  } catch {
    // Non-critical
  }
}

export { DRUG_ALLERGY_RULES, PROCEDURE_ALLERGY_RULES, BEERS_CRITERIA, DRUG_INTERACTIONS };
