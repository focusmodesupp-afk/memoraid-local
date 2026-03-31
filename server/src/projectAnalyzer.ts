/**
 * Project Analyzer – runs a deep project health check via AI.
 * Uses projectDataGatherer + multiProviderAI.
 */
import { gatherProjectData, type Depth, type Scope } from './projectDataGatherer';
import { callAI, type AIProviderId, type ProcessedAttachment } from './multiProviderAI';

const SYSTEM_PROMPT = `אתה מנתח פרויקט MemorAId – אפליקציית ניהול משפחה עם ממשק Admin, Kanban פיתוח, אינטגרציות AI.
Tech stack: React, Express, Drizzle ORM, PostgreSQL, TypeScript, Vite, Wouter.

משימתך: לנתח את נתוני הפרויקט ולכתוב דוח מעמיק בעברית, מקצועי וממוקד. אין הגבלת אורך – כתוב כמה שנדרש.

דרישות פורמט (Markdown):
- כותרות ראשיות עם ## ומשנה עם ###
- השתמש בטבלאות Markdown לכל רשימת קבצים, השוואה או בעיות מרובות (עמודות: שדה | ערך | הערה)
- קטעי קוד עם \`\`\`typescript או \`\`\`sql וכו' (עם שם השפה תמיד)
- כשמזכירים חבילה חיצונית, הוסף לינק: [שם-חבילה](https://npmjs.com/package/שם-חבילה)
- כשיש פתרון ידוע, הוסף לינק לתיעוד: [Docs](url)
- **חייב** לכלול ## סיכום והמלצות בסוף עם טבלת עדיפויות
- **חייב** לכלול לפחות דיאגרמת Mermaid אחת המתארת את ארכיטקטורת המערכת או זרימת הנתונים בפורמט:
\`\`\`mermaid
flowchart TD / graph TD / sequenceDiagram
...
\`\`\`

פורמט הדוח – חובה לשמור על המבנה הבא (כל קטע עם תוכן רלוונטי או "אין ממצאים" אם אין):

## ארכיטקטורה – תרשים מערכת
כלול דיאגרמת Mermaid של ארכיטקטורת המערכת (Client→Server→DB→AI).

## באגים ובעיות (Bugs)
זהה באגים פוטנציאליים, שגיאות לוגיקה, edge cases לא מטופלים, בעיות אבטחה.
הצג בטבלה: | קובץ | בעיה | חומרה | פתרון מוצע |

## סנכרון (Sync)
חוסר התאמה בין client ל-server, endpoints שחסרים, סכמה שלא מסונכרנת עם הקוד.
הצג בטבלה: | נושא | צד Client | צד Server | פעולה נדרשת |

## חסרים בפיתוח (Missing)
פיצ'רים שהוזכרו אך לא יושמו, חוסר error handling, tests חסרים, תיעוד חסר.

## שיפורים טכנולוגיים (Tech Improvements)
עדכון dependencies, אופטימיזציות, best practices מודרניים.
הצג טבלת חבילות מיושנות: | חבילה | גרסה נוכחית | גרסה מומלצת | סיבה |

## זרימות עבודה (Workflows)
המלצות לשיפור CI/CD, תהליכי פיתוח, code review.
הצג דיאגרמת Mermaid של תהליך ה-CI/CD המומלץ.

## סיכום והמלצות
טבלת עדיפויות: | המלצה | עדיפות | מורכבות | השפעה |`;

export type AnalysisResult = {
  report: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
};

/** Single result or multiple (when 2 models run in parallel). */
export type AnalysisResponse =
  | { single: AnalysisResult }
  | { multiple: AnalysisResult[] };

export async function runProjectAnalysis(opts: {
  depth?: Depth;
  scope?: Scope;
  models?: AIProviderId[];
  attachments?: ProcessedAttachment[];
  /** טקסט מיקוד – כיוונון לנושאים שכדאי להתמקד בהם בניתוח */
  focus?: string;
  /** Admin user ID for usage analytics */
  adminUserId?: string | null;
}): Promise<AnalysisResponse> {
  const depth = (opts.depth ?? 'deep') as Depth;
  const scope = (opts.scope ?? 'all') as Scope;
  const models = opts.models && opts.models.length > 0
    ? opts.models.slice(0, 2) as AIProviderId[]
    : undefined;
  const attachments = opts.attachments ?? [];
  const focus = typeof opts.focus === 'string' ? opts.focus.trim() : '';

  const projectData = await gatherProjectData(depth, scope, {});

  const focusBlock = focus
    ? `\n\n**מיקוד למחקר (בהתאם לבקשת המשתמש):**\n${focus}\n\nהתאם את הניתוח לנושאים הללו והרחב בהם.\n`
    : '';

  const userPrompt = `הנה נתוני הפרויקט. בצע ניתוח מעמיק וכתוב דוח לפי הפורמט שהוגדר.
${focusBlock}
עומק: ${depth}
היקף: ${scope}

---
${projectData}
---`;

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: userPrompt },
  ];

  const aiOpts = { temperature: 0.2, preferredModels: models && models.length === 1 ? [models[0]] : undefined, attachments, adminUserId: opts.adminUserId ?? null };

  if (models && models.length === 2) {
    const [r1, r2] = await Promise.all([
      callAI('projectHealthCheck', messages, { ...aiOpts, preferredModels: [models[0]] }),
      callAI('projectHealthCheck', messages, { ...aiOpts, preferredModels: [models[1]] }),
    ]);
    return { multiple: [
      { report: r1.content, model: r1.model, tokensUsed: r1.tokensIn + r1.tokensOut, costUsd: r1.costUsd },
      { report: r2.content, model: r2.model, tokensUsed: r2.tokensIn + r2.tokensOut, costUsd: r2.costUsd },
    ] };
  }

  const result = await callAI('projectHealthCheck', messages, aiOpts);
  return { single: { report: result.content, model: result.model, tokensUsed: result.tokensIn + result.tokensOut, costUsd: result.costUsd } };
}

const FEATURE_PLANNING_PROMPT = `אתה מתכנן פיצ'ר חדש לפרויקט MemorAId – אפליקציית ניהול משפחה עם ממשק Admin, Kanban פיתוח, אינטגרציות AI.
Tech stack: React, Express, Drizzle ORM, PostgreSQL, TypeScript, Vite, Wouter.

משימתך: על סמך שאילתת המשתמש ונתוני הפרויקט – ליצור אפיון מלא, מעמיק ומעשי ברמת PRD מקצועית. אין הגבלת אורך.

דרישות פורמט (Markdown):
- השתמש בטבלאות Markdown לכל ERD, עלויות, רשימת קבצים לעדכון
- קטעי קוד עם \`\`\`typescript או \`\`\`sql (תמיד עם שם השפה)
- לינקים לחבילות חיצוניות: [שם](https://npmjs.com/package/שם)
- לינקים לתיעוד רלוונטי כשיש
- **חייב** לכלול דיאגרמת Mermaid של זרימת הפיצ'ר (User→Frontend→API→DB) ודיאגרמת ERD
- **חייב** לסיים עם ## סיכום והמלצות

חובה:
- אם השאילה כוללת מספר נושאים או פיצ'רים – טפל בכל אחד במלואו. אל תקצר.
- קרא בעיון את schema, routes, adminNavConfig, AdminLayout, mediaLibrary – והסתמך על המבנה הקיים.
- ציין במפורש אילו קבצים יש לעדכון (כתובת מלאה).
- כל סעיף חייב להכיל פירוט מלא – לפחות 2–3 פסקאות (או "אין רלוונטי" אם באמת לא).
- כתוב בעברית.

פורמט הדוח – חובה לשמור על המבנה הבא:

## 1. PRD – Product Requirements Document
- תיאור מפורט של הפיצ'ר
- User Stories (לפחות 3–5)
- Acceptance Criteria
- תרחישי שימוש (Use Cases) עם זרימות ברורות

## 2. ERD – Entity Relationship (אם רלוונטי)
טבלה: | עמודה | טיפוס | הסבר | אילוץ |
יחסים בין ישויות ודיאגרמה טקסטואלית

## 3. עלויות משוערות
טבלה: | רכיב | שעות | מורכבות | סיכונים |

## 4. מערכות תומכות
- אינטגרציות קיימות שיש להשתמש בהן
- מערכות חיצוניות נדרשות
- טבלת תלויות: | חבילה | גרסה | מטרה |

## 5. אבטחה
- נקודות אבטחה, הרשאות נדרשות, סיכוני אבטחה

## 6. תוכנית יישום (Implementation Plan)
טבלת קבצים: | קובץ | פעולה | תיאור שינוי |
שלבים ממוספרים עם סדר ברור

## 7. סיכום והמלצות
טבלת עדיפויות: | המלצה | עדיפות | מורכבות | השפעה |`;

export async function runFeaturePlanning(opts: {
  query: string;
  depth?: Depth;
  scope?: Scope;
  models?: AIProviderId[];
  attachments?: ProcessedAttachment[];
  adminUserId?: string | null;
}): Promise<AnalysisResponse> {
  const depth = (opts.depth ?? 'deep') as Depth;
  const scope = (opts.scope ?? 'all') as Scope;
  const models = opts.models && opts.models.length > 0
    ? opts.models.slice(0, 2) as AIProviderId[]
    : undefined;
  const attachments = opts.attachments ?? [];
  const query = String(opts.query || '').trim() || 'פיצ\'ר או שיפור כללי – נתח את הפרויקט והצע אפיון.';

  const projectData = await gatherProjectData(depth, scope, { query });

  const userPrompt = `שאילתת המשתמש:
---
${query}
---

הנה נתוני הפרויקט הנוכחי. צור אפיון מלא ומעמיק לפי הפורמט – כל סעיף בפירוט.
אם השאילה כוללת כמה נושאים – כל נושא מקבל טיפול מלא.
עומק: ${depth}
היקף: ${scope}

---
${projectData}
---`;

  const messages = [
    { role: 'system' as const, content: FEATURE_PLANNING_PROMPT },
    { role: 'user' as const, content: userPrompt },
  ];

  const aiOpts = { temperature: 0.2, preferredModels: models && models.length === 1 ? [models[0]] : undefined, attachments, adminUserId: opts.adminUserId ?? null };

  if (models && models.length === 2) {
    const [r1, r2] = await Promise.all([
      callAI('featurePlanning', messages, { ...aiOpts, preferredModels: [models[0]] }),
      callAI('featurePlanning', messages, { ...aiOpts, preferredModels: [models[1]] }),
    ]);
    return { multiple: [
      { report: r1.content, model: r1.model, tokensUsed: r1.tokensIn + r1.tokensOut, costUsd: r1.costUsd },
      { report: r2.content, model: r2.model, tokensUsed: r2.tokensIn + r2.tokensOut, costUsd: r2.costUsd },
    ] };
  }

  const result = await callAI('featurePlanning', messages, aiOpts);
  return { single: { report: result.content, model: result.model, tokensUsed: result.tokensIn + result.tokensOut, costUsd: result.costUsd } };
}

const SYNTHESIS_SYSTEM_PROMPT = `אתה מומחה בסינתזה וניתוח של תוצרים טכניים מבינה מלאכותית.
קיבלת שני ניתוחים/תכנונים שנוצרו על ידי שני מודלי AI שונים לאותו פרויקט.

משימתך: לייצר מסמך מאוחד אחד שהוא **עדיף על כל אחד מהמסמכים בנפרד**.

כללי הסינתזה:
1. **הסכמה** – כל נושא שבו שני המודלים מסכימים: חזק ומוודא, הוסף פירוט נוסף
2. **השלמה** – רעיונות שרק מודל אחד הביא ואינם סותרים: **שלב את כולם**
3. **קונפליקט** – כשיש גישות סותרות: בחר את הגישה המנומקת יותר, הסבר את ההחלטה
4. **העשרה** – הוסף תובנות שנובעות מהשוואת שני המסמכים יחד שלא היו בכל אחד לבד
5. **אורך** – המסמך המאוחד אמור להיות **ארוך ומפורט יותר** מכל אחד מהמקורות

דרישות פורמט חובה (Markdown):
- כל כותרות ראשיות עם ##
- כותרות משנה עם ###
- השתמש בטבלאות Markdown לכל השוואה, רשימת עלויות, רשימת קבצים לעדכון
- קטעי קוד עם \`\`\`[שפה] ... \`\`\` (TypeScript, SQL, tsx וכו')
- לינקים חיצוניים כשמתייחסים לחבילות/כלים: [שם](URL)
- **חייב** לכלול לפחות דיאגרמת Mermaid אחת (ארכיטקטורה, זרימת תהליך, או ERD)
- **חייב** לסיים עם סקשן ## סיכום וכיווני פעולה מומלצים
- **חייב** לסיים עם סקשן ## מה לקחנו מכל מודל (Attribution)

כתוב בעברית. אורך מינימלי: 3000 מילים.`;

export async function runSynthesis(opts: {
  reports: { content: string; model: string }[];
  synthesisModel: AIProviderId;
  originalQuery?: string;
  adminUserId?: string | null;
}): Promise<AnalysisResult> {
  const { reports, synthesisModel, originalQuery, adminUserId } = opts;
  if (reports.length < 2) {
    throw new Error('נדרשים לפחות 2 דוחות לסינתזה');
  }

  const [r1, r2] = reports;
  const originalQueryBlock = originalQuery
    ? `\n\n---\n**שאלה / בקשה מקורית של המשתמש:**\n${originalQuery}\n---\n`
    : '';

  const userPrompt = `${originalQueryBlock}

## תוצר מודל 1 (${r1.model})

${r1.content}

---

## תוצר מודל 2 (${r2.model})

${r2.content}

---

כעת בצע סינתזה מלאה לפי ההוראות. צור מסמך מאוחד מקיף ומעולה.`;

  const messages = [
    { role: 'system' as const, content: SYNTHESIS_SYSTEM_PROMPT },
    { role: 'user' as const, content: userPrompt },
  ];

  const result = await callAI('general', messages, {
    temperature: 0.3,
    preferredModels: [synthesisModel],
    adminUserId: adminUserId ?? null,
  });

  return {
    report: result.content,
    model: result.model,
    tokensUsed: result.tokensIn + result.tokensOut,
    costUsd: result.costUsd,
  };
}

const ASK_QUESTION_PROMPT = `אתה יועץ טכני ומקצועי לפרויקט MemorAId – אפליקציית ניהול משפחה עם ממשק Admin, Kanban פיתוח, אינטגרציות AI.
Tech stack: React, Express, Drizzle ORM, PostgreSQL, TypeScript, Vite, Wouter.

משימתך: לקבל שאלה מהמשתמש, לחקור לעומק את נתוני הפרויקט, ולהחזיר תשובה מעמיקה ומקצועית. אין הגבלת אורך.

דרישות פורמט (Markdown):
- כותרות ## ו-### תמיד
- השתמש בטבלאות לכל רשימת קבצים, השוואה, שלבים
- קטעי קוד עם \`\`\`typescript / \`\`\`sql / \`\`\`tsx (תמיד עם שם השפה)
- לינקים לחבילות ותיעוד חיצוני כשרלוונטי
- **חייב** לכלול דיאגרמת Mermaid של הזרימה, הפתרון, או הסכמה הרלוונטית
- **חייב** לסיים עם ## סיכום והמלצות

חובה:
- קרא בעיון את כל הקבצים שמועברים – schema, routes, AdminLayout, adminNavConfig, AdminShell וכו'
- הסתמך אך ורק על מידע אמיתי מהקוד – אל תמציא או תניח
- תן פתרונות קונקרטיים עם הפניות לקבצים (למשל: "ב-AdminLayout.tsx", "ב-adminNavConfig.ts")
- אם השאלה כוללת מספר נושאים – טפל בכל אחד במלואו. אל תקצר.
- כתוב בעברית, במבנה מסודר עם כותרות ## ופסקאות

פורמט התשובה:
## ניתוח הבעיה
## פתרון מוצע (Backend / Frontend / UX)
## קבצים לעדכון
טבלה: | קובץ | שינוי | פירוט |
## תוכנית יישום (שלבים ממוספרים)
## סיכום והמלצות
טבלת עדיפויות: | המלצה | עדיפות | מורכבות |`;

export async function runAskQuestion(opts: {
  query: string;
  depth?: Depth;
  scope?: Scope;
  models?: AIProviderId[];
  attachments?: ProcessedAttachment[];
  adminUserId?: string | null;
}): Promise<AnalysisResponse> {
  const depth = (opts.depth ?? 'deep') as Depth;
  const scope = (opts.scope ?? 'all') as Scope;
  const models = opts.models && opts.models.length > 0
    ? opts.models.slice(0, 2) as AIProviderId[]
    : undefined;
  const attachments = opts.attachments ?? [];
  const query = String(opts.query || '').trim();
  if (!query) throw new Error('שאלה נדרשת');

  const projectData = await gatherProjectData(depth, scope, { query });

  const userPrompt = `שאלת המשתמש:
---
${query}
---

הנה נתוני הפרויקט. חקור, נתח והשב באופן מעמיק ומקצועי – תשובה מלאה ומפורטת.
אם השאלה כוללת כמה נושאים – כל נושא מקבל טיפול מלא.
עומק: ${depth}
היקף: ${scope}

---
${projectData}
---`;

  const messages = [
    { role: 'system' as const, content: ASK_QUESTION_PROMPT },
    { role: 'user' as const, content: userPrompt },
  ];

  const aiOpts = { temperature: 0.2, preferredModels: models && models.length === 1 ? [models[0]] : undefined, attachments, adminUserId: opts.adminUserId ?? null };

  if (models && models.length === 2) {
    const [r1, r2] = await Promise.all([
      callAI('askQuestion', messages, { ...aiOpts, preferredModels: [models[0]] }),
      callAI('askQuestion', messages, { ...aiOpts, preferredModels: [models[1]] }),
    ]);
    return { multiple: [
      { report: r1.content, model: r1.model, tokensUsed: r1.tokensIn + r1.tokensOut, costUsd: r1.costUsd },
      { report: r2.content, model: r2.model, tokensUsed: r2.tokensIn + r2.tokensOut, costUsd: r2.costUsd },
    ] };
  }

  const result = await callAI('askQuestion', messages, aiOpts);
  return { single: { report: result.content, model: result.model, tokensUsed: result.tokensIn + result.tokensOut, costUsd: result.costUsd } };
}
