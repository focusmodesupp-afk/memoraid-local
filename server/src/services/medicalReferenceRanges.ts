/**
 * Medical Reference Ranges — Israeli clinical standards
 * Provides evaluation of lab values against age/gender-adjusted reference ranges.
 */

export type LabStatus = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high';

export interface LabEvaluation {
  status: LabStatus;
  label: string;
  isAbnormal: boolean;
  isCritical: boolean;
  clinicalNote?: string;
}

interface RangeEntry {
  low?: number;
  high?: number;
  criticalLow?: number;
  criticalHigh?: number;
  label?: string;
  note?: string;
}

interface GenderedRange {
  male?: RangeEntry;
  female?: RangeEntry;
  general?: RangeEntry;
}

// ── Reference Ranges Database ───────────────────────────────────────────────

const RANGES: Record<string, GenderedRange> = {
  // ── Hematology ──────────────────────────────────────────────────────────
  hemoglobin: {
    male: { low: 13.5, high: 17.5, criticalLow: 7, criticalHigh: 20 },
    female: { low: 12.0, high: 15.5, criticalLow: 7, criticalHigh: 20 },
  },
  hgb: { male: { low: 13.5, high: 17.5, criticalLow: 7 }, female: { low: 12.0, high: 15.5, criticalLow: 7 } },
  hematocrit: { male: { low: 41, high: 53 }, female: { low: 36, high: 46 } },
  wbc: { general: { low: 4.5, high: 11.0, criticalLow: 2.0, criticalHigh: 30.0 } },
  platelets: { general: { low: 150, high: 400, criticalLow: 50, criticalHigh: 1000 } },
  mcv: { general: { low: 80, high: 100, note: 'Low = microcytic, High = macrocytic' } },
  mch: { general: { low: 27, high: 33 } },
  mchc: { general: { low: 32, high: 36 } },
  reticulocytes: { general: { low: 0.5, high: 2.5 } },

  // ── Diabetes ────────────────────────────────────────────────────────────
  hba1c: { general: { high: 5.6, note: '5.7-6.4 = prediabetes, >=6.5 = diabetes' } },
  glucose_fasting: { general: { low: 70, high: 100, criticalLow: 50, criticalHigh: 400 } },
  glucose_random: { general: { high: 200 } },
  fasting_glucose: { general: { low: 70, high: 100, criticalLow: 50, criticalHigh: 400 } },

  // ── Kidneys ─────────────────────────────────────────────────────────────
  creatinine: { male: { low: 0.7, high: 1.3, criticalHigh: 10 }, female: { low: 0.5, high: 1.1, criticalHigh: 10 } },
  egfr: { general: { low: 60, note: '60-89=mild, 30-59=moderate, 15-29=severe, <15=failure' } },
  bun: { general: { low: 7, high: 20 } },
  urea: { general: { low: 2.5, high: 7.1 } },
  uric_acid: { male: { high: 7.0 }, female: { high: 6.0 } },
  microalbumin: { general: { high: 30, note: '30-300=microalbuminuria, >300=macroalbuminuria' } },

  // ── Thyroid ─────────────────────────────────────────────────────────────
  tsh: { general: { low: 0.4, high: 4.0, note: 'Age 65+: up to 6.0 may be acceptable' } },
  free_t4: { general: { low: 0.8, high: 1.8 } },
  t4_free: { general: { low: 0.8, high: 1.8 } },
  free_t3: { general: { low: 2.3, high: 4.2 } },

  // ── Vitamins & Minerals ─────────────────────────────────────────────────
  vitamin_d: { general: { low: 30, note: '<20=deficiency, 20-30=insufficient, 30-100=normal' } },
  vit_d: { general: { low: 30 } },
  vitamin_b12: { general: { low: 200, high: 900, criticalLow: 150 } },
  b12: { general: { low: 200, high: 900, criticalLow: 150 } },
  folate: { general: { low: 3.0 } },
  folic_acid: { general: { low: 3.0 } },
  iron: { male: { low: 60, high: 170 }, female: { low: 40, high: 150 } },
  ferritin: { male: { low: 30, high: 400 }, female: { low: 13, high: 150 } },
  transferrin_saturation: { general: { low: 20, high: 50 } },
  calcium: { general: { low: 8.5, high: 10.5, criticalLow: 7.0, criticalHigh: 13.0 } },
  potassium: { general: { low: 3.5, high: 5.0, criticalLow: 2.5, criticalHigh: 6.5 } },
  sodium: { general: { low: 136, high: 145, criticalLow: 120, criticalHigh: 160 } },
  magnesium: { general: { low: 1.7, high: 2.2 } },
  phosphorus: { general: { low: 2.5, high: 4.5 } },

  // ── Lipids ──────────────────────────────────────────────────────────────
  cholesterol: { general: { high: 200, note: '200-239=borderline, >=240=high' } },
  total_cholesterol: { general: { high: 200 } },
  ldl: { general: { high: 100, note: '100-129=near-optimal, 130-159=borderline, >=160=high, >=190=very high' } },
  hdl: { male: { low: 40 }, female: { low: 50 } },
  triglycerides: { general: { high: 150, note: '150-199=borderline, 200-499=high, >=500=very high' } },
  tg: { general: { high: 150 } },
  non_hdl: { general: { high: 130 } },

  // ── Liver ───────────────────────────────────────────────────────────────
  alt: { male: { high: 40 }, female: { high: 35 } },
  alanine_aminotransferase: { male: { high: 40 }, female: { high: 35 } },
  ast: { general: { high: 40 } },
  aspartate_aminotransferase: { general: { high: 40 } },
  ggt: { male: { high: 55 }, female: { high: 38 } },
  alk_phos: { general: { low: 44, high: 147 } },
  alkaline_phosphatase: { general: { low: 44, high: 147 } },
  bilirubin: { general: { high: 1.2 } },
  direct_bilirubin: { general: { high: 0.3 } },
  albumin: { general: { low: 3.5, high: 5.0, note: '<3.0=severe malnutrition' } },
  total_protein: { general: { low: 6.3, high: 8.2 } },
  inr: { general: { low: 0.8, high: 1.2, criticalHigh: 5.0 } },
  pt: { general: { low: 11, high: 13 } },
  ptt: { general: { low: 25, high: 35 } },

  // ── Inflammation ────────────────────────────────────────────────────────
  crp: { general: { high: 1.0, note: '1-3=elevated risk, >3=high inflammation' } },
  esr: { general: { note: 'Male: age/2, Female: (age+10)/2' } },
  procalcitonin: { general: { high: 0.1, note: '>0.5 suggests bacterial infection' } },

  // ── Prostate ────────────────────────────────────────────────────────────
  psa: { general: { note: 'Age 50-59: <3.5, Age 60-69: <4.5, Age 70+: <6.5 ng/mL' } },

  // ── Cardiac ─────────────────────────────────────────────────────────────
  troponin: { general: { high: 0.04, note: '>14x ULN = acute MI', criticalHigh: 0.5 } },
  bnp: { general: { high: 100 } },
  nt_pro_bnp: { general: { high: 300 } },

  // ── Electrolytes ────────────────────────────────────────────────────────
  bicarbonate: { general: { low: 22, high: 29 } },
  chloride: { general: { low: 98, high: 107 } },
};

// Aliases for Hebrew/mixed test names
const ALIASES: Record<string, string> = {
  'המוגלובין': 'hemoglobin',
  'hgb': 'hemoglobin',
  'גלוקוז צום': 'glucose_fasting',
  'גלוקוז': 'glucose_fasting',
  'hba1c': 'hba1c',
  'קריאטינין': 'creatinine',
  'egfr': 'egfr',
  'e-gfr': 'egfr',
  'tsh': 'tsh',
  't4 חופשי': 'free_t4',
  'ויטמין d': 'vitamin_d',
  'ויטמין d3': 'vitamin_d',
  'ויטמין b12': 'vitamin_b12',
  'b12': 'vitamin_b12',
  'חומצה פולית': 'folate',
  'ברזל': 'iron',
  'פריטין': 'ferritin',
  'סידן': 'calcium',
  'אשלגן': 'potassium',
  'נתרן': 'sodium',
  'מגנזיום': 'magnesium',
  'כולסטרול': 'cholesterol',
  'כולסטרול כללי': 'total_cholesterol',
  'ldl': 'ldl',
  'hdl': 'hdl',
  'טריגליצרידים': 'triglycerides',
  'alt': 'alt',
  'ast': 'ast',
  'ggt': 'ggt',
  'בילירובין': 'bilirubin',
  'אלבומין': 'albumin',
  'inr': 'inr',
  'crp': 'crp',
  'psa': 'psa',
  'אוריאה': 'urea',
  'חומצה אורית': 'uric_acid',
  'tsh': 'tsh',
  'wbc': 'wbc',
  'כדוריות לבנות': 'wbc',
  'טסיות': 'platelets',
  'mcv': 'mcv',
};

function normalizeTestName(name: string): string {
  const lower = name.toLowerCase().trim();
  if (ALIASES[lower]) return ALIASES[lower];
  // Try to find a direct key match
  if (RANGES[lower]) return lower;
  // Try partial match
  for (const alias of Object.keys(ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) return ALIASES[alias];
  }
  for (const key of Object.keys(RANGES)) {
    if (lower.includes(key) || key.includes(lower)) return key;
  }
  return lower;
}

/**
 * Evaluate a lab value against reference ranges.
 * Returns a structured evaluation with status, label, and clinical context.
 */
export function evaluateLabValue(
  testName: string,
  value: number,
  options: { age?: number; gender?: 'male' | 'female' } = {}
): LabEvaluation {
  const key = normalizeTestName(testName);
  const rangeEntry = RANGES[key];

  if (!rangeEntry) {
    return {
      status: 'normal',
      label: 'ערך ייחוס לא זמין',
      isAbnormal: false,
      isCritical: false,
    };
  }

  const { gender } = options;
  const range: RangeEntry =
    (gender === 'male' ? rangeEntry.male : gender === 'female' ? rangeEntry.female : null) ??
    rangeEntry.general ??
    rangeEntry.male ??
    rangeEntry.female ??
    {};

  // Special cases with complex interpretation
  if (key === 'hba1c') return evaluateHbA1c(value);
  if (key === 'egfr') return evaluateEGFR(value);
  if (key === 'vitamin_d') return evaluateVitaminD(value);
  if (key === 'ldl') return evaluateLDL(value);
  if (key === 'triglycerides') return evaluateTriglycerides(value);

  const { low, high, criticalLow, criticalHigh, note } = range;

  if (criticalLow !== undefined && value < criticalLow) {
    return { status: 'critical_low', label: `נמוך קריטי (< ${criticalLow})`, isAbnormal: true, isCritical: true, clinicalNote: note };
  }
  if (criticalHigh !== undefined && value > criticalHigh) {
    return { status: 'critical_high', label: `גבוה קריטי (> ${criticalHigh})`, isAbnormal: true, isCritical: true, clinicalNote: note };
  }
  if (low !== undefined && value < low) {
    return { status: 'low', label: `נמוך מהנורמה (< ${low})`, isAbnormal: true, isCritical: false, clinicalNote: note };
  }
  if (high !== undefined && value > high) {
    return { status: 'high', label: `גבוה מהנורמה (> ${high})`, isAbnormal: true, isCritical: false, clinicalNote: note };
  }
  return { status: 'normal', label: 'בגבולות הנורמה', isAbnormal: false, isCritical: false, clinicalNote: note };
}

function evaluateHbA1c(value: number): LabEvaluation {
  if (value >= 8.0) return { status: 'critical_high', label: 'סוכרת לא מאוזנת (>= 8%)', isAbnormal: true, isCritical: true, clinicalNote: 'נדרש שינוי טיפול דחוף' };
  if (value >= 6.5) return { status: 'high', label: 'סוכרת (>= 6.5%)', isAbnormal: true, isCritical: false, clinicalNote: 'נדרש מעקב אנדוקרינולוג' };
  if (value >= 5.7) return { status: 'high', label: 'טרום סוכרת (5.7-6.4%)', isAbnormal: true, isCritical: false, clinicalNote: 'נדרשים שינויי אורח חיים' };
  return { status: 'normal', label: 'תקין (< 5.7%)', isAbnormal: false, isCritical: false };
}

function evaluateEGFR(value: number): LabEvaluation {
  if (value < 15) return { status: 'critical_low', label: 'אי ספיקת כליות (< 15)', isAbnormal: true, isCritical: true, clinicalNote: 'שקול דיאליזה — הפניה דחופה לנפרולוג' };
  if (value < 30) return { status: 'critical_low', label: 'ירידה חמורה (15-29)', isAbnormal: true, isCritical: true, clinicalNote: 'הפניה דחופה לנפרולוג' };
  if (value < 60) return { status: 'low', label: 'ירידה בינונית (30-59)', isAbnormal: true, isCritical: false, clinicalNote: 'מעקב נפרולוג — בדוק תרופות נפרוטוקסיות' };
  if (value < 90) return { status: 'low', label: 'ירידה קלה (60-89)', isAbnormal: false, isCritical: false, clinicalNote: 'מעקב' };
  return { status: 'normal', label: 'תפקוד כליות תקין (>= 90)', isAbnormal: false, isCritical: false };
}

function evaluateVitaminD(value: number): LabEvaluation {
  if (value < 10) return { status: 'critical_low', label: 'חסר חמור (< 10)', isAbnormal: true, isCritical: true, clinicalNote: 'טיפול מיידי נדרש — סיכון גבוה לאוסטיאופורוזיס ונפילות' };
  if (value < 20) return { status: 'low', label: 'חסר (< 20)', isAbnormal: true, isCritical: false, clinicalNote: 'נדרשת תוספת ויטמין D' };
  if (value < 30) return { status: 'low', label: 'לא מספיק (20-29)', isAbnormal: true, isCritical: false, clinicalNote: 'תוספת ויטמין D מומלצת' };
  return { status: 'normal', label: 'תקין (>= 30)', isAbnormal: false, isCritical: false };
}

function evaluateLDL(value: number): LabEvaluation {
  if (value >= 190) return { status: 'critical_high', label: 'גבוה מאוד (>= 190)', isAbnormal: true, isCritical: true, clinicalNote: 'טיפול בסטטינים נדרש' };
  if (value >= 160) return { status: 'high', label: 'גבוה (160-189)', isAbnormal: true, isCritical: false };
  if (value >= 130) return { status: 'high', label: 'גבולי (130-159)', isAbnormal: true, isCritical: false };
  if (value >= 100) return { status: 'normal', label: 'קרוב לאופטימלי (100-129)', isAbnormal: false, isCritical: false };
  return { status: 'normal', label: 'אופטימלי (< 100)', isAbnormal: false, isCritical: false };
}

function evaluateTriglycerides(value: number): LabEvaluation {
  if (value >= 500) return { status: 'critical_high', label: 'גבוה מאוד (>= 500)', isAbnormal: true, isCritical: true, clinicalNote: 'סיכון דלקת לבלב' };
  if (value >= 200) return { status: 'high', label: 'גבוה (200-499)', isAbnormal: true, isCritical: false };
  if (value >= 150) return { status: 'high', label: 'גבולי (150-199)', isAbnormal: true, isCritical: false };
  return { status: 'normal', label: 'תקין (< 150)', isAbnormal: false, isCritical: false };
}

export { RANGES };
