/**
 * Medical document AI analysis – extract text, analyze, return structured result.
 * For image-based or scanned PDFs (where pdf-parse fails), the file is forwarded
 * as a multimodal attachment to Claude Vision instead of discarding the content.
 */
import { callAI, type ProcessedAttachment } from '../multiProviderAI';
import { processFileForAI } from './fileProcessor';
import { getMedicalDocumentBuffer } from './medicalDocumentStorage';

export interface MedicalAnalysisResult {
  // ── Document metadata (auto-extracted) ───────────────────────────────────
  documentTitle: string;
  documentType: 'discharge' | 'referral' | 'lab_results' | 'prescription' | 'consultation' | 'imaging' | 'other';
  documentDate: string | null;   // ISO date string e.g. "2025-11-05"
  issuingDoctor: string | null;
  doctorPhone: string | null;
  doctorFax: string | null;
  hospitalName: string | null;
  documentDescription: string | null;
  // ── Allergy / sensitivity warnings (CRITICAL safety) ─────────────────────
  extractedAllergyWarnings: Array<{
    substance: string;          // e.g. "פניצילין", "אספירין"
    reactionType: string;       // e.g. "רגישות", "אלרגיה", "אין ליתן", "סכנת חיים"
    severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
    notes?: string;
  }>;
  // ── Clinical content ─────────────────────────────────────────────────────
  simplifiedDiagnosis: string;
  keyFindings: string[];
  extractedMedications: Array<{
    name: string;
    dosage?: string;
    form?: string;          // tablet / capsule / drops / inhaler / injection — "טבליות/כמוסות/יחידות"
    frequency?: string;     // "1 ביום", "2 ביום", "3 בשבוע" etc.
    duration?: string;
    instructions?: string;  // extra instructions from the prescription
  }>;
  // Medical history extracted from problem lists (active + past conditions)
  extractedMedicalHistory?: Array<{
    condition: string;       // ICD description or Hebrew name
    status: 'active' | 'past';
    diagnosisDate?: string;  // ISO date if available
  }>;
  extractedTasks: Array<{
    title: string;
    description?: string;
    /** 'patient' = the patient does it (take med, exercise) | 'caregiver' = family/doctor does it | 'note' = important observation */
    taskFor: 'patient' | 'caregiver' | 'note';
    dueDate?: string | null;
  }>;
  extractedVitals: Array<{
    type: 'blood_pressure' | 'blood_sugar' | 'weight' | 'heart_rate' | 'temperature' | 'oxygen_saturation';
    value: number;
    value2?: number;
    unit: string;
    isAbnormal?: boolean;
    notes?: string;
  }>;
  extractedLabValues: Array<{
    name: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    isAbnormal: boolean;
  }>;
  extractedReferrals: Array<{
    specialty: string;
    reason: string;
    urgency: 'routine' | 'soon' | 'urgent';
    doctorName?: string;
    phone?: string;
  }>;
  followUpRequired: boolean;
  followUpDate?: string | null;
  urgencyLevel: 'routine' | 'soon' | 'urgent';
  doctorNotes: string;
  rawText?: string;
}

const MEDICAL_ANALYSIS_PROMPT = `אתה מומחה לניתוח מסמכים רפואיים ישראליים. זהה אוטומטית את שפת המסמך (עברית/אנגלית/ערבית/רוסית) ונתח בהתאם. קרא את המסמך הרפואי בשלמותו וענה ב-JSON בלבד (ללא טקסט נוסף, ללא markdown, ללא הסברים).

פורמט התשובה:
{
  "documentTitle": "כותרת תמציתית ומדויקת למסמך (עד 60 תווים)",
  "documentType": "אחד מ: discharge/referral/lab_results/prescription/consultation/imaging/other",
  "documentDate": "תאריך המסמך בפורמט YYYY-MM-DD. חשוב: בישראל תאריכים נכתבים DD/MM/YYYY. לדוגמה: 11/05/2025 = 2025-05-11. אם אין תאריך: null",
  "issuingDoctor": "שם מלא של הרופא עם תואר (ד\"ר / פרופ') אם קיים, אחרת null",
  "doctorPhone": "מספר טלפון (לא פקס) של הרופא/מרפאה אם קיים במסמך, אחרת null",
  "doctorFax": "מספר פקס אם קיים במסמך, אחרת null",
  "hospitalName": "שם בית החולים / קופת החולים / מרפאה אם קיים, אחרת null",
  "documentDescription": "תיאור קצר של תוכן המסמך (עד 100 תווים)",
  "simplifiedDiagnosis": "אבחנה/סיכום בשפה פשוטה שמשפחה יכולה להבין, 1-3 משפטים",
  "keyFindings": ["ממצא חשוב 1 (בעיה פעילה/ממצא/רקע)", "ממצא חשוב 2"],
  "extractedAllergyWarnings": [
    {
      "substance": "שם החומר/התרופה שיש רגישות אליו",
      "reactionType": "תיאור הרגישות (רגישות / אלרגיה / אין ליתן / תגובה אנפילקטית / אינטולרנטיות)",
      "severity": "mild|moderate|severe|life_threatening",
      "notes": "פרטים נוספים אם קיימים"
    }
  ],
  "extractedMedications": [
    {
      "name": "שם תרופה שיש ליטול",
      "dosage": "מינון למנה בודדת (לדוגמה: 2.5MG, 40MG)",
      "form": "צורת נטילה בעברית (טבליות / כמוסות / יחידות / טיפות / אינהלטור / זריקה)",
      "frequency": "תדירות ברורה (לדוגמה: פעם ביום, פעמיים ביום, 3 פעמים בשבוע)",
      "duration": "משך טיפול אם צוין",
      "instructions": "הוראות מיוחדות אם קיימות"
    }
  ],
  "extractedMedicalHistory": [
    {
      "condition": "שם המצב הרפואי (כפי שמופיע במסמך, עברית או אנגלית)",
      "status": "active|past",
      "diagnosisDate": "YYYY-MM-DD או null"
    }
  ],
  "extractedTasks": [
    {"title": "כותרת משימה", "description": "תיאור מפורט", "taskFor": "patient|caregiver|note", "dueDate": "YYYY-MM-DD או null"}
  ],
  "extractedVitals": [
    {"type": "blood_pressure", "value": 140, "value2": 90, "unit": "mmHg", "isAbnormal": false, "notes": ""}
  ],
  "extractedLabValues": [
    {"name": "שם בדיקה", "value": "11.2", "unit": "g/dL", "referenceRange": "12-16", "isAbnormal": true}
  ],
  "extractedReferrals": [
    {"specialty": "נוירולוג", "reason": "סיבה מפורטת", "urgency": "soon", "doctorName": "שם המומחה אם צוין", "phone": "טלפון אם קיים"}
  ],
  "followUpRequired": true,
  "followUpDate": "תאריך מעקב YYYY-MM-DD אם צוין, אחרת null",
  "urgencyLevel": "routine",
  "doctorNotes": "הערות חשובות מהרופא שהמשפחה צריכה לדעת — כולל הנחיות לזימון תור, מסמכים נדרשים (טופס 17 וכדומה), אזהרות"
}

═══════════════════════════════════════════════════════════════
כללי חובה — קרא כל אחד בעיון לפני מענה:
═══════════════════════════════════════════════════════════════

1. documentType: discharge=מכתב שחרור, referral=הפניה, lab_results=בדיקות מעבדה, prescription=מרשם תרופות, consultation=סיכום ביקור, imaging=צילום/CT/MRI, other=אחר

2. urgencyLevel: "urgent"=דחוף (ימים), "soon"=בהקדם (שבועות), "routine"=שגרתי

3. ⚠️ CRITICAL — ALLERGY RULE (NO EXCEPTIONS):
   אם המסמך מכיל מילים כגון: "רגישות ל", "אלרגיה ל", "אנמנזה של רגישות", "אין ליתן", "אין לתת", "contraindicated", "intolerance", "אינטולרנטיות", "תגובה אלרגית" — זהו אלרגיה/רגישות.
   חומר כזה חייב להיכנס ל-extractedAllergyWarnings בלבד. אסור לשים אותו ב-extractedMedications.
   ⚠️ דוגמאות מחייבות:
   - "רגישות לפניצילין" → extractedAllergyWarnings: [{substance:"פניצילין",reactionType:"רגישות",severity:"moderate"}]
   - "אלרגיה לאספירין" → extractedAllergyWarnings: [{substance:"אספירין",reactionType:"אלרגיה",severity:"moderate"}]
   - "אין ליתן פניצילין" → extractedAllergyWarnings: [{substance:"פניצילין",reactionType:"אין ליתן",severity:"severe"}]
   - אם חומר מופיע גם ברגישות וגם במרשם — ALLERGY גובר! הסר מ-extractedMedications.
   ⚠️ CLALIT/HMO "אינו ידוע" RULE: אם בסעיף רגישויות (רגישויות ו/או תופעות לוואי) כתוב "אינו ידוע / לא ידוע / unknown" בלבד — זה אומר שאין רגישויות ידועות. אל תיצור entry ב-extractedAllergyWarnings. במקום זאת, כתוב ב-doctorNotes: "לא ידועות רגישויות — דווח ע\"י המטופל".

4. ⚠️ MEDICATION TABLE (ISRAELI HMO FORMAT — CRITICAL):
   מסמכים של קופות חולים ישראליות (כללית, מכבי, מאוחדת, לאומית) מכילים טבלת תרופות קבועות בפורמט:
   "תרופות | כמות | א.הגשה | פעמים | ב..."
   שורה לדוגמה: "RAMIPRIL 2.5MG TAB 2.5MG 1 טבליות 1 ביום"
   הפורמט הוא: שם_תרופה | מינון | כמות_אריזה | צורת_נטילה | מספר_פעמים | תדירות
   ⚠️ חלץ **כל** עמודה:
   - name: שם התרופה המלא (כולל מינון שמופיע בשם: "RAMIPRIL 2.5MG")
   - dosage: המינון (לדוגמה: "2.5MG", "850MG", "1000MCG", "70MG/5600IU")
   - form: צורת הנטילה (טבליות / כמוסות / יחידות / טיפות)
   - frequency: הרכבת תדירות מ-"פעמים + ב..." (לדוגמה: "1 ביום", "2 ביום", "3 בשבוע", "1 בשבוע")
   דוגמאות:
   - "SIMVASTATIN 40MG TAB 40MG 1 טבליות 1 ביום" → {name:"SIMVASTATIN 40MG",dosage:"40MG",form:"טבליות",frequency:"פעם ביום"}
   - "B12 METHYLCOBL. 1000MCG SL 1000MCG 1 יחידות 3 בשבוע" → {name:"B12 METHYLCOBALAMIN 1000MCG",dosage:"1000MCG",form:"יחידות",frequency:"3 פעמים בשבוע"}
   - "METFORMIN HCL TAB 850MG 850MG 1 טבליות 2 ביום" → {name:"METFORMIN HCL 850MG",dosage:"850MG",form:"טבליות",frequency:"פעמיים ביום"}
   - "SILDENAFIL TAB 100MG 8 100MG 1 טבליות 2 בשבוע" → {name:"SILDENAFIL 100MG",dosage:"100MG",form:"טבליות",frequency:"2 פעמים בשבוע"}

5. ⚠️ FORM 17 (טופס 17) — CRITICAL RULE:
   טופס 17 הוא אישור ממשרד הבריאות לטיפול בבית חולים חוץ לקופה.
   - אם המסמך מכיל "אינו מצריך טופס 17" / "אינו מצריך ט. 17" / "does not require form 17" → המשמעות: **לא** נדרש טופס 17. אל תיצור משימה! אל תזכיר שצריך להביא טופס 17!
   - אם המסמך מכיל "מצריך טופס 17" / "נדרש טופס 17" / "יש להביא טופס 17" → צור משימה: {title:"הכנת טופס 17 לפני הביקור",taskFor:"caregiver",description:"יש לקבל טופס 17 מקופת החולים לפני הביקור בבית החולים"}
   - אם לא מוזכר טופס 17 כלל → אל תיצור משימה על טופס 17.

6. ⚠️ MEDICAL HISTORY — extractedMedicalHistory:
   מסמכי קופות חולים מכילים רשימות "בעיות פעילות" ו"בעיות בעבר" (ICD codes/names).
   חלץ אותן ל-extractedMedicalHistory:
   - רשימת "בעיות פעילות" → status: "active"
   - רשימת "בעיות בעבר" → status: "past"
   - את הבעיות הפעילות הכי משמעותיות (עד 5) הכנס גם ל-keyFindings בשפה פשוטה.
   - diagnosisDate: מ.גילוי בפורמט DD/MM/YYYY → YYYY-MM-DD. אם אין — null.

7. taskFor:
   - "patient" = המטופל עצמו מבצע (נטילת תרופה, תזונה, פעילות גופנית)
   - "caregiver" = בני משפחה/מטפלים מבצעים (תיאום תור, רכישת תרופה, הכנת מסמכים)
   - "note" = אזהרה/המלצה/מידע חשוב שאינו משימה

8. extractedVitals: type = blood_pressure/blood_sugar/weight/heart_rate/temperature/oxygen_saturation. לחץ דם: value=סיסטולי, value2=דיאסטולי. BMI → weight עם unit="BMI". eGFR → שמור ב-keyFindings.

9. תאריכים: ישראל = DD/MM/YYYY. "06/11/2025" = 6 בנובמבר = 2025-11-06.

10. ⚠️ תאריכי dueDate במשימות: חשב יחסית לתאריך המסמך (documentDate), לא לתאריך היום!
    אם לא ידוע תאריך המסמך, השתמש ב-{{DOC_DATE_PLACEHOLDER}}

11. ⚠️ מסמך הפניה (referral): חלץ את כל המומחים ל-extractedReferrals. הפניה ל-"כירורגיה" → specialty="כירורגיה", reason=מהתלונות. אל תשים הפניות רק ב-extractedTasks.

12. ⚠️ מכתב שחרור (discharge): חלץ הוראות מעקב ל-extractedTasks עם taskFor="caregiver".

13. REFERRAL NUMBER (מספר הפניה ישירה): אם קיים מספר הפניה (כגון: "מספר הפניה ישירה: 35797060416") — כתוב אותו ב-doctorNotes כ"מספר הפניה: XXXXXXXX" (ללא תעודת זהות).

14. חלץ כל מידע — אל תפספס שום תרופה, בדיקה, הפניה, מדד, משימה, רגישות, או טלפון/פקס.

15. אם שדה ריק — השתמש במערך ריק [] או null`;

export interface DocumentMetadata {
  title: string;
  documentType: string;
  issuingDoctor: string | null;
  hospitalName: string | null;
  description: string | null;
}

const METADATA_PROMPT = `אתה עוזר לסיווג מסמכים רפואיים. קרא את המסמך וחלץ מטא-דאטה בלבד.
ענה ב-JSON בלבד (ללא markdown, ללא טקסט נוסף):
{
  "title": "כותרת תמציתית ומדויקת למסמך (עד 60 תווים)",
  "documentType": "אחד מ: discharge / referral / lab_results / prescription / consultation / imaging / other",
  "issuingDoctor": "שם מלא של הרופא החותם (כולל תואר) אם קיים, אחרת null",
  "hospitalName": "שם בית החולים, קופת החולים, או המרפאה אם קיים, אחרת null",
  "description": "תיאור קצר של תוכן המסמך (עד 100 תווים)"
}`;

export async function extractDocumentMetadata(
  fileUrl: string,
  originalFilename?: string
): Promise<DocumentMetadata> {
  const buffer = await getMedicalDocumentBuffer(fileUrl);
  const filename = originalFilename || fileUrl.split('/').pop() || 'document.pdf';
  const mimeType = inferMimeType(fileUrl);

  const processed = await processFileForAI(buffer, mimeType, filename);

  const isVisual =
    processed.type === 'image' || (processed.type === 'pdf' && !!processed.mediaType);

  const attachments: ProcessedAttachment[] | undefined = isVisual
    ? [{ type: processed.type as 'image' | 'pdf', filename, mimeType: processed.mimeType, content: processed.content, mediaType: processed.mediaType }]
    : undefined;

  const textContent = isVisual
    ? ''
    : processed.content.length > 4000
      ? processed.content.slice(0, 4000)
      : processed.content;

  const userMessage = isVisual
    ? '[ראה קובץ מצורף]'
    : `תוכן המסמך:\n${textContent}`;

  try {
    const result = await callAI(
      'general',
      [
        { role: 'system', content: METADATA_PROMPT },
        { role: 'user', content: userMessage },
      ],
      {
        temperature: 0.1,
        attachments,
        preferredModels: attachments ? ['claude', 'openai'] : undefined,
        maxTokens: 300,
      }
    );

    const raw = (result?.content ?? '{}').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const VALID_TYPES = ['discharge', 'referral', 'lab_results', 'prescription', 'consultation', 'imaging', 'other'];

    return {
      title: (typeof parsed.title === 'string' && parsed.title.trim()) ? parsed.title.trim().slice(0, 60) : (filename.replace(/\.[^.]+$/, '') || 'מסמך רפואי'),
      documentType: VALID_TYPES.includes(parsed.documentType) ? parsed.documentType : 'other',
      issuingDoctor: parsed.issuingDoctor || null,
      hospitalName: parsed.hospitalName || null,
      description: (typeof parsed.description === 'string' && parsed.description.trim()) ? parsed.description.trim().slice(0, 100) : null,
    };
  } catch {
    return {
      title: filename.replace(/\.[^.]+$/, '') || 'מסמך רפואי',
      documentType: 'other',
      issuingDoctor: null,
      hospitalName: null,
      description: null,
    };
  }
}

function inferMimeType(url: string): string {
  if (url.endsWith('.pdf')) return 'application/pdf';
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
  if (url.endsWith('.png')) return 'image/png';
  return 'application/pdf';
}

export async function analyzeMedicalDocument(
  fileUrl: string,
  documentType?: string
): Promise<MedicalAnalysisResult> {
  const buffer = await getMedicalDocumentBuffer(fileUrl);
  const filename = fileUrl.split('/').pop() || 'document.pdf';
  const mimeType = inferMimeType(fileUrl);

  const processed = await processFileForAI(buffer, mimeType, filename);

  // When pdf-parse fails (scanned PDFs, Hebrew CMap encoding issues, etc.)
  // processed.mediaType is set and content is base64.
  // Pass it as a multimodal attachment to Claude Vision instead of discarding it.
  const isVisual =
    processed.type === 'image' || (processed.type === 'pdf' && !!processed.mediaType);

  const attachments: ProcessedAttachment[] | undefined = isVisual
    ? [
        {
          type: processed.type as 'image' | 'pdf',
          filename,
          mimeType: processed.mimeType,
          content: processed.content,
          mediaType: processed.mediaType,
        },
      ]
    : undefined;

  const textContent = isVisual
    ? ''
    : processed.content.length > 8000
      ? processed.content.slice(0, 8000) + '...'
      : processed.content;

  // We don't know the document date until the AI extracts it — use today as fallback for
  // relative due-date calculations. The AI is instructed to prefer the doc date once it finds it.
  const todayIso = new Date().toISOString().slice(0, 10);
  const promptWithDate = MEDICAL_ANALYSIS_PROMPT.replace('{{DOC_DATE_PLACEHOLDER}}', todayIso);

  // Reject empty / unreadable text documents before hitting AI
  if (!isVisual && textContent.length < 50) {
    throw new Error('המסמך ריק או לא קריא — לא ניתן לנתח. נסה להעלות קובץ תקין.');
  }

  const userMessage = isVisual
    ? `תאריך עיבוד (גיבוי בלבד): ${todayIso}\nסוג מסמך: ${documentType || 'לא צוין'}\n[ראה קובץ מצורף]`
    : `תאריך עיבוד (גיבוי בלבד): ${todayIso}\nסוג מסמך: ${documentType || 'לא צוין'}\n\nתוכן המסמך:\n${textContent}`;

  // 120-second hard timeout to prevent hung requests on large documents
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 120_000);

  let result: Awaited<ReturnType<typeof callAI>>;
  try {
    result = await callAI(
      'general',
      [
        { role: 'system', content: promptWithDate },
        { role: 'user', content: userMessage },
      ],
      {
        temperature: 0,
        attachments,
        preferredModels: attachments ? ['claude', 'openai'] : undefined,
        signal: controller.signal,
      }
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('ניתוח המסמך לקח יותר מדי זמן (timeout 120 שניות). נסה מסמך קצר יותר.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  const raw = (result?.content ?? '{}').trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  const VALID_VITAL_TYPES = ['blood_pressure', 'blood_sugar', 'weight', 'heart_rate', 'temperature', 'oxygen_saturation'];
  const VALID_DOC_TYPES = ['discharge', 'referral', 'lab_results', 'prescription', 'consultation', 'imaging', 'other'];

  const analysisResult: MedicalAnalysisResult = {
    // Metadata
    documentTitle: (typeof parsed.documentTitle === 'string' && parsed.documentTitle.trim())
      ? parsed.documentTitle.trim().slice(0, 60)
      : (filename.replace(/\.[^.]+$/, '') || 'מסמך רפואי'),
    documentType: VALID_DOC_TYPES.includes(parsed.documentType) ? parsed.documentType : 'other',
    documentDate: parsed.documentDate || null,
    issuingDoctor: parsed.issuingDoctor || null,
    doctorPhone: parsed.doctorPhone || null,
    doctorFax: parsed.doctorFax || null,
    hospitalName: parsed.hospitalName || null,
    documentDescription: parsed.documentDescription || null,
    // Allergy warnings (CRITICAL)
    extractedAllergyWarnings: Array.isArray(parsed.extractedAllergyWarnings)
      ? parsed.extractedAllergyWarnings
          .filter((a: any) => a.substance)
          .map((a: any) => ({
            substance: a.substance,
            reactionType: a.reactionType || 'רגישות',
            severity: ['mild', 'moderate', 'severe', 'life_threatening'].includes(a.severity) ? a.severity : 'moderate',
            notes: a.notes || undefined,
          }))
      : [],
    // Clinical
    simplifiedDiagnosis: parsed.simplifiedDiagnosis || '',
    keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
    extractedMedications: Array.isArray(parsed.extractedMedications)
      ? parsed.extractedMedications.map((m: any) => ({
          name: m.name || '',
          dosage: m.dosage || undefined,
          form: m.form || undefined,
          frequency: m.frequency || undefined,
          duration: m.duration || undefined,
          instructions: m.instructions || undefined,
        })).filter((m: any) => m.name)
      : [],
    extractedMedicalHistory: Array.isArray(parsed.extractedMedicalHistory)
      ? parsed.extractedMedicalHistory
          .filter((h: any) => h.condition)
          .map((h: any) => ({
            condition: h.condition,
            status: ['active', 'past'].includes(h.status) ? h.status : 'active',
            diagnosisDate: h.diagnosisDate || undefined,
          }))
      : undefined,
    extractedTasks: Array.isArray(parsed.extractedTasks)
      ? parsed.extractedTasks.map((t: any) => ({
          title: t.title || '',
          description: t.description || undefined,
          taskFor: ['patient', 'caregiver', 'note'].includes(t.taskFor) ? t.taskFor : 'caregiver',
          dueDate: t.dueDate || null,
        })).filter((t: any) => t.title)
      : [],
    extractedVitals: Array.isArray(parsed.extractedVitals)
      ? parsed.extractedVitals
          .filter((v: any) => VALID_VITAL_TYPES.includes(v.type) && v.value != null)
          .map((v: any) => ({
            type: v.type,
            value: Number(v.value),
            value2: v.value2 != null ? Number(v.value2) : undefined,
            unit: v.unit || '',
            isAbnormal: !!v.isAbnormal,
            notes: v.notes || undefined,
          }))
      : [],
    extractedLabValues: Array.isArray(parsed.extractedLabValues)
      ? parsed.extractedLabValues
          .filter((l: any) => l.name && l.value != null)
          .map((l: any) => ({
            name: l.name,
            value: String(l.value),
            unit: l.unit || undefined,
            referenceRange: l.referenceRange || undefined,
            isAbnormal: !!l.isAbnormal,
          }))
      : [],
    extractedReferrals: Array.isArray(parsed.extractedReferrals)
      ? parsed.extractedReferrals
          .filter((r: any) => r.specialty)
          .map((r: any) => ({
            specialty: r.specialty,
            reason: r.reason || '',
            urgency: ['routine', 'soon', 'urgent'].includes(r.urgency) ? r.urgency : 'routine',
            doctorName: r.doctorName || undefined,
            phone: r.phone || undefined,
          }))
      : [],
    followUpRequired: !!parsed.followUpRequired,
    followUpDate: parsed.followUpDate || null,
    urgencyLevel: ['routine', 'soon', 'urgent'].includes(parsed.urgencyLevel)
      ? parsed.urgencyLevel
      : 'routine',
    doctorNotes: parsed.doctorNotes || '',
    rawText: textContent ? textContent.slice(0, 2000) : '[visual content]',
  };

  // Strip Israeli ID numbers (9 consecutive digits) from text fields to avoid PII leakage
  return sanitizeAnalysisResultPII(analysisResult);
}

/** Remove Israeli ID numbers (9-digit sequences) from all text fields in the analysis result. */
function sanitizeAnalysisResultPII(result: MedicalAnalysisResult): MedicalAnalysisResult {
  const ISRAELI_ID_RE = /\b\d{9}\b/g;
  const redact = (s: string | null | undefined): string | null =>
    s ? s.replace(ISRAELI_ID_RE, '[ת.ז. הוסר]') : s ?? null;

  return {
    ...result,
    simplifiedDiagnosis: redact(result.simplifiedDiagnosis) ?? '',
    doctorNotes: redact(result.doctorNotes) ?? '',
    documentDescription: redact(result.documentDescription),
    rawText: result.rawText ? result.rawText.replace(ISRAELI_ID_RE, '[ת.ז. הוסר]') : result.rawText,
    keyFindings: result.keyFindings.map((f) => f.replace(ISRAELI_ID_RE, '[ת.ז. הוסר]')),
  };
}
