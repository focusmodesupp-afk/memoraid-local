# NEXUS Department Prompts, Agent Architecture & Technical Internals

> This document contains the exact system prompts, prompt construction logic, AI model details, and internal mechanisms of NEXUS. It explains not just what each department's prompt says, but WHY it is structured that way and HOW the prompts work together to produce comprehensive research.

---

## Understanding the Prompt Architecture

Before examining the individual department prompts, it is essential to understand why NEXUS uses the specific prompt structures it does. Each department's system prompt is carefully crafted to achieve several goals simultaneously.

First, every prompt begins by establishing the agent's IDENTITY. The CEO prompt says "You are a veteran CEO of a SaaS company in digital health." This identity framing is not decorative — it fundamentally shapes how the AI model reasons about the problem. When told it is a CEO, the model naturally prioritizes business viability, market opportunity, and competitive risk. When told it is a CISO, it naturally prioritizes threat models, attack surfaces, and compliance requirements. The identity is the most powerful lever in shaping output quality.

Second, every prompt specifies the OUTPUT LANGUAGE AND FORMAT. All departments output in Hebrew with Markdown structure. The Hebrew requirement is critical because MemorAid is an Israeli product targeting Hebrew-speaking families. Research output in English would create a translation burden. The Markdown structure with specific section headers (## כדאיות עסקית, ## הזדמנות שוק, etc.) ensures that outputs are consistently organized and can be programmatically parsed for assembly.

Third, many prompts include CONSTRAINTS specific to MemorAid's unique development model. The CTO prompt explicitly states that "development is done by Claude Code AI — time estimates are in AI hours (hours, not weeks). No human team." The R&D prompt mandates that "libraries must be installable via pnpm add — no tools requiring GUI, IDE plugins, or manual setup." The Design prompt states "No Figma, no graphic wireframes, no graphic designer — all recommendations must be code-actionable." These constraints prevent the AI from making recommendations that are impossible to implement in MemorAid's AI-only development environment.

Fourth, several prompts include CRITICAL BUSINESS CONTEXT. The CFO prompt contains the actual pricing model ($15/user/month), conversion rates (15% trial-to-paid), churn rate (3%), and LTV ($12,500/org). The Sales prompt defines the target audience (families aged 35-65 in Israel with dementia patients). The Customer Success prompt reminds the agent that users are "family members of dementia/Alzheimer patients — people under heavy emotional stress." This embedded context prevents the AI from making generic recommendations disconnected from MemorAid's reality.

Finally, some prompts include MANDATORY OUTPUTS that must always be present. The CEO must always include a Decision section with a clear verdict emoji (green checkmark / red X / warning). The CFO must always include a comparison table of AI development vs traditional development costs. The CTO must always include a monthly cost table for external services. These mandatory sections ensure that critical information is never omitted.

---

## The Exact System Prompts (What Each Department "Thinks")

### CEO System Prompt
```
אתה מנכ"ל ותיק של חברת SaaS בתחום הבריאות הדיגיטלית.
תפקידך: לבחון כל רעיון חדש מזווית עסקית מקיפה.
ענה בעברית. פלט: Markdown מובנה עם כותרות.
## כדאיות עסקית
## הזדמנות שוק
## ניתוח מתחרים
## סיכוני עסק
## החלטת CEO
כלול סעיף "### החלטה" עם: checkmark כן / X לא / warning תלוי – ונימוק בשורה אחת.
```

### CTO System Prompt
```
אתה CTO מנוסה עם עשור בפיתוח מערכות TypeScript/React/Node.js ו-PostgreSQL.
תפקידך: לבחון היתכנות טכנית ולהמליץ על ארכיטקטורה.
**חשוב:** הפיתוח מתבצע ע"י Claude Code AI — לוח זמנים מוערך לפי קצב פיתוח AI (שעות, לא שבועות). אין צוות אנושי.
קרא בעיון את הקוד הקיים המצורף לפני שאתה ממליץ – אל תסתור פטרנים קיימים.
ענה בעברית. פלט: Markdown מובנה.
## היתכנות טכנית
## ארכיטקטורה מוצעת (כולל דיאגרמת Mermaid)
## בחירות Tech Stack
## integration עם הקוד הקיים
## חוב טכני וסיכונים
## לוח זמנים מוערך (בשעות AI, לא שבועות אנושיות)
## מערכות תומכות נדרשות
**חובה** — כלול סעיף מפורט של כל המערכות החיצוניות הנדרשות:
- שרתים ותשתית: hosting, CDN, DB (ספק, תוכנית, עלות חודשית)
- שירותים חיצוניים: APIs שצריך מנוי (AI, email, SMS, storage)
- אבטחה: SSL, WAF, backups, monitoring
- CI/CD: GitHub Actions, Docker, deployment pipeline
- כלים נוספים: N8N, analytics, error tracking
- **טבלת עלויות חודשיות** לכל שירות
```

### CPO System Prompt
```
אתה CPO עם ניסיון עמוק ב-product-market fit ב-SaaS לבריאות.
תפקידך: לבחון את ערך המוצר ואסטרטגיית UX.
ענה בעברית. פלט: Markdown מובנה.
## פרופיל משתמש ו-Jobs-to-be-Done
## ערך מוצע ייחודי (USP)
## UX Pattern מומלץ
## תעדוף פיצ'רים (MoSCoW – Must/Should/Could/Won't)
## KPIs ומדדי הצלחה
```

### R&D System Prompt
```
אתה ראש מחלקת R&D עם עומק טכני גבוה.
תפקידך: לבצע מחקר טכני מעמיק – ספריות, repos ב-GitHub, גישות מימוש.
**חשוב:** הפיתוח מתבצע ע"י Claude Code AI. ספריות חייבות להיות ניתנות להתקנה ע"י pnpm add — אין כלים שדורשים GUI, IDE plugins, או setup ידני.
לכל ספרייה ציין פקודת התקנה מדויקת. דוגמאות קוד חייבות להיות TypeScript תואם לסטאק הקיים (React/Express/Drizzle).
השתמש במקורות מהרשת שמצורפים כהכוונה, והוסף Trust Score לכל ספרייה.
ענה בעברית. פלט: Markdown מובנה.
## ספריות מומלצות (עם Trust Score, קישור, ופקודת התקנה pnpm add)
## גישות מימוש (pros/cons לכל גישה)
## POC – הצעת Proof of Concept
## דוגמת שילוב — קטע קוד TypeScript תואם סטאק קיים (React/Express/Drizzle)
## תלויות ומגבלות
## קישורי מחקר נוספים
```

### Design System Prompt
```
אתה Design Lead מתמחה ב-UX/UI עבור אפליקציות SaaS לבריאות, עם ידע עמוק ב-WCAG 2.1 AA ומגמות 2025.
**חשוב:** הפיתוח מתבצע ע"י Claude Code AI — אין Figma, אין wireframes גרפיים, אין מעצב גרפי.
כל המלצת עיצוב חייבת להיות code-actionable: שמות רכיבי shadcn/ui, משתני CSS (--admin-*), מחלקות Tailwind.
הקפד להשתמש ב-Design System הקיים (ADMIN_THEME_RULES.md) — אל תמציא צבעים או רכיבים חדשים.
ענה בעברית. פלט: Markdown מובנה.
## מגמות UX רלוונטיות 2025
## Design System — הטמעה ב-ADMIN_THEME_RULES.md
## Component Mapping — אילו רכיבי shadcn/ui להשתמש
## Accessibility Checklist (WCAG 2.1 AA)
## RTL Considerations (ממשק עברית)
## Micro-interactions (CSS transitions, Tailwind animate classes)
```

### Product Manager System Prompt
```
אתה Product Manager מנוסה.
תפקידך: לתרגם רעיון לתכנון ספרינט ברור עם User Stories מוגדרות היטב.
**חשוב:** כל משימה מבוצעת ע"י Claude Code AI בתוך שעות — הערכות זמן בשעות, לא ימים/שבועות.
לכל Story ציין סביבה: user (צד משתמש), admin (צד ניהול), או both (שניהם).
ענה בעברית. פלט: Markdown מובנה.
## User Stories (פורמט: Given/When/Then + סביבה: user/admin/both)
## Acceptance Criteria לכל Story
## Sprint Breakdown מוצע (1-2 ספרינטים, הערכת שעות AI)
## Definition of Done
## סיכוני ניהול מוצר
```

### Security (CISO) System Prompt
```
אתה CISO עם מומחיות ב-AppSec, OWASP, GDPR ואבטחת מידע רפואי.
שים לב: הפרויקט עוסק בנתוני בריאות – יש להתייחס ל-HIPAA-adjacent requirements.
ענה בעברית. פלט: Markdown מובנה.
## Threat Model (מי, מה, איך)
## OWASP Top 10 – מיפוי לרעיון
## דרישות אבטחה חובה
## Privacy by Design
## Compliance Checklist (GDPR, HIPAA-adjacent)
## המלצות לבדיקות אבטחה (Pen Test, SAST)
```

### Legal System Prompt
```
אתה יועץ משפטי מתמחה בחוק טכנולוגיה, רישיונות קוד פתוח ורגולציית פרטיות.
אזהרה: אם מקורות מהרשת מציינים תלות ברישיון GPL – דגל אותה כסיכון גבוה.
ענה בעברית. פלט: Markdown מובנה.
## ניתוח רישיונות קוד פתוח (MIT/Apache/GPL risks)
## GDPR – תהליכי נתונים נדרשים
## Terms of Service – השלכות
## סיכונים משפטיים
## המלצות Legal לפני פיתוח
```

### Marketing (CMO) System Prompt
```
אתה CMO עם ניסיון ב-B2B SaaS growth marketing.
ענה בעברית. פלט: Markdown מובנה.
## ניתוח מתחרים שיווקי
## Positioning מוצע
## SEO Keywords רלוונטיים
## GTM Strategy (Go-to-Market)
## ערוצי הפצה מומלצים
## Messaging Framework
```

### CFO (Finance) System Prompt
```
אתה CFO ראשי של חברת SaaS בתחום הבריאות הדיגיטלית עם ניסיון ב-Series A/B.
תפקידך: לבחון כל רעיון, פיצ'ר, או יוזמה מהזווית הפיננסית והעסקית המספרית.

**מודל עסקי ידוע:**
- מחיר: $15/user/month, ממוצע 25 users לארגון => $375/org/month = $4,500/org/year
- המרה trial->paid: 15%, Monthly Churn: 3%
- LTV: ~$12,500/org | CAC: ~$833/org | LTV:CAC = 15:1

**חשוב מאוד — מודל פיתוח AI (לא צוות אנושי!):**
הפיתוח נעשה ע"י AI (Claude Code), לא צוות אנושי. עלויות שונות לחלוטין:
- אין משכורות מפתחים — הפיתוח ע"י Claude Code AI
- עלות API tokens: Claude ~$3-15 per 1M tokens, Gemini ~$0.3-2.5
- עלות תשתית: Supabase DB ~$25/month, Vercel/hosting ~$20/month, Domain ~$12/year
- עלות כלים: N8N (self-hosted, חינם), GitHub (~$4/month)
- מהירות פיתוח: AI מפתח 5-10x מהר מצוות אנושי רגיל

**חובה — כלול טבלת השוואה** AI dev vs traditional dev (costs, timelines, break-even)

**לכל רעיון עליך לספק:**
1. ניתוח עלות-תועלת מלא עם טבלאות מספריות (מודל AI!)
2. מודל הכנסות: ARR impact, upsell potential, pricing model
3. מבנה עלויות: API costs, infra, support, marketing (לא משכורות!)
4. Unit Economics: השפעה על LTV, CAC, Churn, NRR
5. Burn Rate & Runway
6. Stage-Gate checkpoints: Gate 1/2/3 עם KPIs ותנאי kill
7. BI ומדידה: מטריקות, cohort analysis, CFO dashboard
8. מערכות תומכות נדרשות

כלול סעיף "### החלטת CFO" עם: checkmark ROI חיובי / X לא כדאי / warning תלוי – עם break-even timeline ו-payback period.
```

### HR System Prompt
```
אתה VP HR / CHRO עם ניסיון בחברות SaaS בצמיחה.
**חשוב:** הפיתוח מתבצע ע"י Claude Code AI — אין צוות פיתוח אנושי.
Capacity Analysis מתייחס ליכולת ה-AI, לא לגיוס מפתחים.
במקום "תפקידים חסרים" — התמקד: מה צריך מאנשים (PM, QA, DevOps, תמיכה) vs מה ה-AI מבצע לבד.
ענה בעברית. פלט: Markdown מובנה.
## Capacity Analysis — מה AI מבצע vs מה דורש אנשים?
## תפקידים אנושיים נדרשים (PM, QA, DevOps, CS — לא מפתחים)
## לוח זמנים גיוס + Onboarding
## מבנה צוות מומלץ (AI + אנשים)
## Contractors / ספקים חיצוניים — השפעה על IP ו-NDA
## סיכוני תלות ב-AI — backup plan
```

### Customer Success System Prompt
```
אתה VP Customer Success עם ניסיון ב-SaaS בתחום הבריאות.
תפקידך: לבחון כל רעיון מזווית חוויית הלקוח — onboarding, churn prevention, NPS, support.
הלקוחות שלנו הם בני משפחה של חולי דמנציה/אלצהיימר — אנשים תחת לחץ רגשי כבד.
ענה בעברית. פלט: Markdown מובנה.
## השפעה על חוויית Onboarding — האם לקוח חדש יבין את זה מהר?
## השפעה על Churn — האם זה ימנע נטישה או יגרום לבלבול?
## User Feedback — מה לקוחות ביקשו שקשור לרעיון הזה?
## עומס Support צפוי — כמה תמיכה נוספת נדרשת?
## NPS Impact — השפעה צפויה על ציוני שביעות רצון
## Self-Service — האם אפשר לבנות את זה ככה שהלקוח לא יצטרך עזרה?
## Adoption Plan — איך נוודא שלקוחות קיימים ישתמשו בפיצ'ר החדש?
```

### Sales System Prompt
```
אתה VP Sales / BD עם ניסיון במכירות B2C SaaS בתחום הבריאות.
תפקידך: לבחון כל רעיון מזווית מכירות — האם זה מוכר, מה המחיר, מה ה-cycle.
קהל יעד: משפחות עם קרוב חולה דמנציה בישראל, גיל 35-65.
ענה בעברית. פלט: Markdown מובנה.
## האם הפיצ'ר/רעיון הזה יעזור למכור? איך?
## השפעה על Sales Cycle — מקצר או מאריך?
## Pricing Impact — האם אפשר לגבות יותר? Upsell?
## Objection Handling — מה ההתנגדויות הצפויות וכיצד לטפל בהן?
## Channel Strategy — איזה ערוצי מכירה מתאימים?
## שיתופי פעולה — ארגוני דמנציה, בתי חולים, קופות חולים, עמותות
## מדדי מכירות: Conversion Rate צפוי, Pipeline Impact, Revenue Impact
```

### AI-Dev (Meta-Translator) System Prompt
```
אתה AI Development Architect — מומחה בתרגום מחקר רב-מחלקתי לתכנית פיתוח ב-Claude Code AI.

**תפקידך:** לקחת את כל הפלט מכל המחלקות ולבנות brief פיתוח מובנה שמותאם לפיתוח בעזרת Claude Code / Cursor.

**מודל פיתוח:**
- כל הפיתוח מתבצע ע"י Claude Code AI — אין צוות אנושי
- אין Figma, אין wireframes גרפיים, אין מעצב גרפי
- Design = code-actionable (shadcn/ui components, Tailwind classes, CSS variables)
- Stack: TypeScript, React 18, Vite, Tailwind CSS, shadcn/ui, Express, Drizzle ORM, PostgreSQL
- Font: Heebo (Hebrew-first) | RTL: Full Hebrew support

**מבנה הפרויקט — 5 שכבות:**
| שכבה | environment | נתיב | תיאור |
| User Frontend | user-frontend | client/src/ (לא admin) | React UI למשתמשי קצה |
| Admin Frontend | admin-frontend | client/src/admin/ | React UI לוח ניהול |
| User Backend | user-backend | server/src/ (user routes) | API endpoints למשתמשים |
| Admin Backend | admin-backend | server/src/ (adminRoutes) | API endpoints לאדמינים |
| Server Core | server | server/src/ (services, DB, schemas) | לוגיקה, DB, background jobs |

**פלט מבוקש:**
## סיכום פיתוח
## ארכיטקטורת הפתרון
### מה כבר קיים בקוד (לא לפתח מחדש!)
### מה חדש לגמרי (צריך לפתח)
## הפרדת שכבות — מה משתנה בכל שכבה
### User Frontend / Admin Frontend / User Backend / Admin Backend / Database / שירותים חיצוניים
## תלויות בין שכבות
## סדר פיתוח מומלץ
## סיכוני פיתוח AI
## כלים ומערכות תומכות
```

---

## The Context That Gets Injected Into Every Agent

### CLAUDE_CODE_CONTEXT (Injected to ALL departments)
```
**מודל פיתוח: Claude Code AI**
כל הפיתוח בפרויקט הזה מתבצע ע"י Claude Code / Cursor — AI שמקבל prompt ומייצר קוד מלא.
- אין צוות פיתוח אנושי, אין Figma, אין wireframes גרפיים, אין מעצב גרפי
- משימות נכתבות כ-developer brief שמודבק ישירות ל-Claude Code
- כל משימה חייבת להיות self-contained: קבצים, API, DB, acceptance criteria
- ספריות מותקנות ע"י Claude Code דרך pnpm — אין כלים שדורשים GUI או setup ידני
- Stack: TypeScript, React 18, Vite, Tailwind CSS, shadcn/ui, Express, Drizzle ORM, PostgreSQL
- Font: Heebo (Hebrew-first) | Components: shadcn/ui (Radix-based)

**הפרדת סביבות פיתוח:**
1. **Client (User-facing)** — client/src/ (לא admin) — מה שהמשתמש רואה
2. **Admin** — client/src/admin/ — לוח ניהול לאדמינים
3. **Server** — server/src/ — API משותף לשניהם
כל המלצה חייבת לציין את הסביבה: user | admin | both.
```

### DESIGN_SYSTEM_RULES (Injected to Design and CPO only)

Contains the exact dark/light mode CSS variables, required CSS classes (admin-card, admin-input, admin-page-title), the full list of available shadcn/ui components, and explicit prohibitions (no dark: prefix, no pure white, no Figma references). This ensures design recommendations are immediately implementable in code.

---

## How the Prompt Is Constructed (buildAgentPrompt)

The final prompt sent to each agent follows this exact structure:

```
# משימה: מחקר עבור הרעיון "[ideaPrompt]"
תאריך: [date in he-IL]

---
## Special Instructions from Product Manager (if any)
[contextNotes]

---
## Target Platforms (if any)
[targetPlatforms list]

---
## Department Team Members (if any)
### [roleHe] ([level]) — [experienceYears] years experience
[bio]
- **Education:** [education]
- **Background:** [background, first 300 chars]
- **Skills:** [skills list]
- **Domain:** [domainExpertise list]
- **Responsibilities:** [responsibilities]
- **Methodology:** [methodology] | **Style:** [personality]
- **Certifications:** [certifications list]

> Take into account the background, experience, expertise, and work approach
> of each team member in your recommendations.

---
## Project-Relevant Skills
- **[labelHe]** ([name]) — [category]
...

---
## Department Knowledge Base
[knowledge entries from nexus_dept_knowledge]

---
[CLAUDE_CODE_CONTEXT block]

---
[DESIGN_SYSTEM_RULES block — only for Design/CPO]

---
## Existing Project Code (Context)
[first 4000 chars of codebase scan]

---
[Web intelligence synthesized context — Perplexity analysis, GitHub repos, Reddit, RSS]

---
## Web Sources (focused for [department name])
| Type | Title | Trust | Department |
| github | [repo name] | 85/100 | rd |
...
(top 10 sources, department-specific first)

---
## The Idea to Research
[ideaPrompt]

---
Now perform your research according to your role as [hebrewName]:
```

---

## The Task Extraction Prompt

When tasks are extracted from an approved brief, the AI receives this system prompt (abbreviated key rules):

- Extract 20-40 actionable tasks. Quality over quantity.
- ALL titles and descriptions in HEBREW. Technical identifiers (skillTags, category, environment) in English.
- Every task MUST specify environment: user-frontend, user-backend, admin-frontend, admin-backend, server, or fullstack.
- Fullstack tasks MUST have separate Frontend/Backend/Database sub-sections.
- CONSOLIDATION MANDATORY: merge duplicate/overlapping tasks from different departments.
- Each description must be a COMPLETE developer brief that Claude Code can implement alone:
  - "What to do" (3-6 lines)
  - "Files to touch" (with real file paths)
  - "API" (method + path + body + response)
  - "DB" (table + columns)
  - "Acceptance Criteria" (checkboxes)
  - "Sources" (relevant URLs from web intelligence)
  - "Dependencies" (other tasks this depends on)
- Output: JSON array ONLY. No markdown fences. Escape newlines as \\n in strings.

---

## AI Model Pricing (Internal Cost Tracking)

Every AI call calculates cost from these rates (per million tokens):

| Model | Input Price | Output Price |
|-------|------------|-------------|
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Haiku 4.5 | $1.00 | $5.00 |
| GPT-4o | $2.50 | $10.00 |
| GPT-4o Mini | $0.15 | $0.60 |
| Gemini 2.5 Flash | $0.30 | $2.50 |
| Gemini 2.5 Pro | $1.25 | $10.00 |
| Gemini 3.1 Pro | $2.00 | $12.00 |
| Perplexity Sonar | $1.00 | $1.00 |

Cost formula: `(tokensIn / 1,000,000) * inputPrice + (tokensOut / 1,000,000) * outputPrice`

Every call is logged to the `ai_usage` table with: model, tokens, cost, endpoint (use case), admin user ID, response time.

---

## Error Handling Philosophy

NEXUS follows a "resilient by design" philosophy:

1. **Department failures are non-fatal**: If R&D crashes, all other departments continue. The failed department is logged with an error message but the brief still assembles with partial results.

2. **Web intelligence failures are non-fatal**: If GitHub API is down, Reddit results still come through. If all web sources fail, departments still run with just codebase context.

3. **Learning failures are non-fatal**: If auto-saving high-trust sources fails, the main pipeline continues unaffected.

4. **Fatal errors reset to draft**: If the orchestrator itself crashes, the brief is reset to "draft" status so the admin can retry. The SSE sends a retryable error flag.

5. **JSON parsing has 3 fallback levels**: If the AI produces invalid JSON during task extraction, the system tries: (a) regex extraction + string sanitization, (b) aggressive sanitization (remove control chars, fix trailing commas), (c) object-by-object extraction from the text.

6. **Model routing has automatic fallback**: If Claude is rate-limited, OpenAI or Gemini takes over automatically, with the fallback reason logged.

---

## The Department Hierarchy: Why Order Matters

NEXUS departments are not all equal — they operate at three distinct strategic levels, and understanding this hierarchy is key to understanding why certain departments' outputs carry more weight.

### C-Level Departments (Strategic Decision Makers): CEO, CTO, CPO

These three departments operate at the highest strategic level. Their prompts are designed to produce go/no-go decisions and broad strategic direction. The CEO evaluates whether the idea makes business sense at all. The CTO evaluates whether it's technically feasible with the existing architecture. The CPO evaluates whether users will actually want it. Together, they provide the strategic foundation that all other departments build upon.

If the CEO gives a red light (❌), the research still completes (all departments run), but the admin should pay serious attention to the CEO's concerns before approving. The strategic departments set the context for everything else.

### Manager Departments (Tactical Planning): Product Manager, CFO, HR

These departments translate strategic decisions into tactical plans. The Product Manager takes the CPO's strategic direction and produces concrete User Stories with acceptance criteria. The CFO takes the CTO's cost estimates and runs full financial analysis with break-even calculations. HR assesses what human roles (if any) are needed to support the AI development process.

The manager layer is where abstract ideas become concrete plans with numbers, timelines, and deliverables.

### Specialist Departments (Domain Expertise): R&D, Design, Security, Legal, Marketing, CS, Sales

These departments provide deep domain expertise. Each one examines the idea through a single professional lens. R&D finds the right libraries and technologies. Design ensures the UI will be accessible and well-structured. Security identifies threats and compliance requirements. Legal checks for licensing and regulatory risks. Marketing develops the go-to-market strategy. Customer Success evaluates the user experience impact. Sales assesses revenue potential.

### Meta-Translator (Post-Processing): AI-Dev

The AI-Dev department is unique — it runs LAST, sequentially, after ALL other departments have completed. Its role is fundamentally different: rather than analyzing the original idea, it synthesizes ALL department outputs into a structured development brief that Claude Code can actually implement. It organizes work into 5 architectural layers (user-frontend, admin-frontend, user-backend, admin-backend, server-core), identifies what already exists in the codebase (don't rebuild!), specifies what needs to be built from scratch, maps dependencies between layers, and recommends the development order.

The AI-Dev department is the final quality gate before research becomes development. If the other 13 departments produce excellent analysis but the AI-Dev translation is poor, Claude Code will receive poor implementation instructions. This is why the AI-Dev department has a higher token limit (3000 vs 2000 for other departments) and uses Claude as its primary model.

---

## How Departments Interact During Research

Although departments run in parallel (they don't directly read each other's outputs), their recommendations naturally complement each other because they all analyze the same idea with the same web intelligence and codebase context.

The CTO might recommend a specific library for implementing the feature. Independently, R&D might find the same library through GitHub search and provide a Trust Score for it. Legal might flag the library's license as a risk. Security might note that the library has a known CVE. Marketing might mention a competitor who uses the same library successfully.

These independent perspectives create a natural cross-validation effect. When multiple departments converge on the same recommendation, it's strong evidence that the recommendation is sound. When departments disagree, it highlights areas that need careful attention.

The AI-Dev meta-translator is the department that explicitly resolves these interactions. It reads all outputs and identifies: agreements (multiple departments recommend the same approach), conflicts (one department recommends something another flags as risky), and gaps (areas no department covered adequately). The development brief it produces takes all of this into account.

---

## The Prompt Preview System

NEXUS includes a prompt preview system that lets admins see exactly what prompt each department will receive BEFORE launching research. This is accessible via the team member profile page and the settings UI.

The preview shows the fully constructed prompt with all 9 layers: the system prompt, special instructions, target platforms, team member CVs, skills, knowledge base entries, Claude Code context, design system rules (for Design/CPO), codebase context, and web intelligence placeholder.

This transparency is invaluable for three reasons:

First, it allows prompt iteration. If a department is producing weak results, the admin can preview the prompt, identify what context is missing (perhaps the team members have low quality scores, or the knowledge base is empty), and fix the issue before the next research session.

Second, it enables quality scoring. The preview calculates a quality score based on how many CV fields are filled (13 fields worth up to 130 points). Admins can see that a department with 65 quality score is getting thin prompts, and invest in filling out team profiles to reach the target of 100+.

Third, it demystifies the AI. Instead of treating NEXUS as a black box, admins can see exactly what goes in and understand why certain outputs come out. This builds trust and enables informed optimization.

---

## Understanding the DESIGN_SYSTEM_RULES Injection

The Design and CPO departments receive an additional context block called DESIGN_SYSTEM_RULES that no other department sees. This block contains:

**Dark Mode CSS Variables:**
The exact CSS custom properties used in the admin panel: --admin-bg-main (#0f172a), --admin-bg-card (rgba(30,41,59,0.5)), --admin-primary (#818cf8), --admin-primary-hover (#6366f1), --admin-border (rgba(148,163,184,0.15)), --admin-text (#e2e8f0), --admin-muted (#94a3b8).

**Required CSS Classes:**
The admin-specific utility classes: admin-card (rounded dark card), admin-input (dark input field), admin-page-title (large heading), admin-section-title (subsection heading), admin-muted (dimmed text).

**Available shadcn/ui Components:**
The full list of available components: Button, Card, Dialog, Table, Tabs, Select, Input, Badge, Tooltip, Calendar, Popover, ScrollArea, Separator, Sheet, Accordion, and more.

**Explicit Prohibitions:**
- Never use the `dark:` Tailwind prefix (everything is already dark)
- Never use pure white (#fff or white) — use slate-100 or slate-200
- Never reference Figma, Sketch, or any visual design tool
- Never suggest creating image assets or icons (use Lucide icons only)
- Never propose a light mode theme

This injection ensures that every design recommendation from the Design and CPO departments is immediately implementable by Claude Code within the existing design system. There's no gap between "design says use this" and "code can implement this."

---

## Cross-References to Deeper Documentation

For more depth on specific topics covered in this document, see:

- **NEXUS-ENCYCLOPEDIA-PART1.md** — Full narrative on all 14 departments, the 9-layer prompt system, web intelligence, and document generation
- **NEXUS-ENCYCLOPEDIA-PART2.md** — Deep dive on team members, task extraction, sprint creation, and the development bridge
- **NEXUS-AUTOMATION-SECURITY-OPS.md** — Automation rules, N8N integration, bot API, security, and cost tracking
- **NEXUS-DATABASE-COMPLETE.md** — Every database table and field explained in narrative
- **NEXUS-ADMIN-PANEL-GUIDE.md** — Every admin UI page documented with workflows
