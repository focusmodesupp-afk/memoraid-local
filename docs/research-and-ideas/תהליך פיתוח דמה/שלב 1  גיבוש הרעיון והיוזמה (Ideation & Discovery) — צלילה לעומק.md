# שלב 1: גיבוש הרעיון והיוזמה (Ideation & Discovery)
### מוצר לדוגמה: TaskFlow — אפליקציית ניהול משימות SaaS לעסקים קטנים ובינוניים
### משך: 2–4 שבועות

***

## מהו השלב הזה באמת?

שלב ה-Discovery הוא אחד השלבים החשובים ביותר — ולרוב גם המוזנחים ביותר. המטרה אינה "לאשר רעיון שכבר יש לנו בראש", אלא לצאת לשטח עם שאלות פתוחות ולבדוק האם **יש בעיה אמיתית, שמספיק אנשים חווים, וגדולה מספיק כדי שישלמו עליה**.[^1][^2]

לפי נתונים מהשוק, למעלה מ-50% מהמוצרים שנכשלים נופלים בדיוק כאן — הצוות בנה מוצר שלא ענה על צורך אמיתי. Discovery מוצלח מצמצם סיכון זה באופן דרסטי.[^3]

***

## מי מפעיל את השלב הזה? מי קובע שזה מתחיל?

ב-TaskFlow, הרעיון עלה בפגישת ה-All-Hands רבעונית. ה-CEO שיתף insight מישיבת דירקטוריון: שוק ניהול המשימות ל-SMB גדל ב-23% בשנה האחרונה, אך אף מוצר לא פותר את ה-Handoff הבין-מחלקתי בצורה אינטואיטיבית.

ה-**Product Manager** קיבל את "הזרקת האדרנלין" הזו וביקש אישור ראשוני מ-CTO ו-CEO להפעיל **Discovery Sprint** בן שבועיים. לאחר אישור בעל-פה, הוא הרכיב **Core Discovery Team** קטן:[^4]

```
Discovery Team של TaskFlow:
├── Product Manager (מוביל)
├── UX Researcher (1 איש)
├── Product Marketing Manager
├── Engineering Lead / Tech Lead (חלקי — 25% זמן)
└── Sales Ops / Account Executive בכיר (מייעץ)
```

***

## שבוע 1: הבנת הבעיה (Understanding Phase)

### יום 1–2: Kickoff Workshop פנימי

לפני שיוצאים לשטח, הצוות מכנס **Business Design Workshop פנימי** של 3 שעות. המטרה: ליישר ציפיות ולמנוע Bias של "אנחנו כבר יודעים מה הם רוצים".[^5]

**מה עושים בוורקשופ?**
- מגדירים את ה-**Problem Space**: מה הבעיה שאנחנו חושבים שקיימת? (ולא הפתרון)
- מפרטים את ה-**Assumptions**: רשימה של כל ההנחות שמחזיקות את הרעיון — מה חייב להיות נכון כדי שזה ישתלם?[^4]
- מגדירים **Non-Goals**: מה אנחנו *לא* בודקים בשלב זה
- קובעים **Decision Criteria**: מה יגרום לנו להמשיך? מה יגרום לנו לעצור?

**Template של Discovery Sprint (TaskFlow):**
```
Problem statement:   מנהלים ב-SMB מתקשים לעקוב אחר משימות
                     שעוברות בין עובדים ומחלקות
Target user:         Team Leads בחברות 20–200 עובדים
Context:             עובדים מנהלים משימות ב-Slack, Email ו-Excel
                     ואין "מקום אחד" שכולם מסכימים עליו
Non goals:           לא בודקים Enterprise (500+ עובדים) בשלב זה
Success metrics:     10 ראיונות עם Pain Point ברור + Willingness to Pay
Top assumptions:     1. המשתמשים מבזבזים 30+ דקות/יום על חיפוש Status
                     2. הם מוכנים לשלם $15–25/user/month
                     3. החסם העיקרי הוא Adoption, לא פיצ'רים
Decision owner:      Product Manager
Decision meeting:    סוף שבוע 2
```

***

### יום 3–5: מחקר משני (Secondary / Desk Research)

לפני שיוצאים לראיינות, ה-**Product Marketing Manager** מבצע מחקר שוק ראשוני:[^6]

**1. ניתוח שוק (Market Sizing)**
- בדיקת TAM / SAM / SOM — כמה גדול הפאי?
- מקורות: Gartner, IDC, דוחות אנליסטים, G2 Category Pages
- שאלה מרכזית: האם יש שוק מספיק גדול? ב-TaskFlow — SMB Task Management = שוק של ~$4.5B

**2. ניתוח מתחרים (Competitive Landscape)**

| מתחרה | נקודות חוזק | חולשות | מחיר |
|--------|-------------|---------|-------|
| Asana | UI מלוטש, Brand חזק | יקר ל-SMB, מסובך ל-Onboarding | $24.99/user |
| Monday.com | גמיש מאוד | Overwhelming, Learning Curve | $20+/user |
| Trello | פשוט ואינטואיטיבי | חסר Reporting, לא Scale | $10/user |
| Notion | All-in-one | לא מוצר מוקד, מורכב | $16/user |

מה ה-**Gap** שמזהים? אין מוצר שפותר ספציפית את ה-**Handoff** — המעבר של משימה מאדם לאדם עם הקשר מלא, ללא צורך ב"תחקיר".

**3. ניתוח VoC (Voice of Customer) ממקורות קיימים**
- חיפוש ב-G2 Reviews, Reddit (r/productivity, r/smallbusiness), ProductHunt Comments
- חיפוש ביקורות שליליות על המתחרים — מה אנשים **כי** מתלוננים עליו?[^7]
- דוגמה לממצא: 87% מהריוויוס השליליים על Asana מזכירים "Too complex for our team size"

***

## שבוע 1–2: מחקר משתמשים (User Research Phase)

### גיוס משתתפים לראיונות

ה-UX Researcher והמכירות מגייסים ביחד 10–15 משתמשים פוטנציאליים לראיונות:[^8]
- 5 ממאגר הלידים הקיים של Sales (prospecs שלא סגרו)
- 5 מ-LinkedIn Outreach ממוקד (Team Leads בחברות 20-200)
- 3–5 מחברות Beta שהחברה כבר עובדת איתן

**כלל הזהב:** מראיינים **לקוחות קיימים וגם שאינם לקוחות** — האינסייטים החשובים לעתים קרובות מגיעים מאלו שלא קנו.[^9]

***

### ביצוע ראיונות משתמשים (Customer Interviews)

ה-UX Researcher מוביל ראיונות של 45–60 דקות. הכלל הבסיסי: **לא מראים מוצר ולא מדברים על פתרון בשלב הזה**.[^8][^1]

**מבנה ראיון טיפוסי ל-TaskFlow:**

```
חלק 1 — Warm Up (5 דקות)
"ספר לי על תפקידך. מה אתה אחראי עליו?"

חלק 2 — ביצועי יומיום (15 דקות)
"תאר לי בדיוק איך יום עבודה טיפוסי נראה אצלך."
"איך אתה יודע מה לעשות היום בבוקר?"
"מה גורם לך להרגיש שאבדת שליטה על מה שקורה?"

חלק 3 — Pain Points (20 דקות)
"ספר לי על פעם שמשימה 'נפלה בין הכסאות' — מה קרה?"
"כמה זמן ביום אתה מבלה בחיפוש אחרי Status של משימות?"
"אם יכולת לשנות דבר אחד בתהליך הזה מחר בבוקר — מה זה היה?"

חלק 4 — Current Solutions (10 דקות)
"מה אתה משתמש בו היום?"
"מה את/ה אוהב/ת בו? מה מעצבן אותך בו?"
"האם שקלת לעבור לכלי אחר? מה עצר אותך?"

חלק 5 — Willingness to Pay (5 דקות)  ← עדין מאוד
"אם היה מוצר שפתר X לחלוטין, איך זה היה שינוי את עבודתך?"
"מה ההוצאה החודשית שהייתם מוכנים להצדיק עבור זה?"
```

**שאלות שאסור לשאול בראיון:**
- ❌ "האם היית משתמש במוצר כזה?" (הם תמיד יגידו כן)
- ❌ "מה פיצ'רים היית רוצה?" (Confirmation Bias)
- ✅ תמיד שאלות על התנהגות בעבר, לא כוונות עתידיות[^1]

***

### כלי: מפת אמפתיה (Empathy Map)

לאחר כל ראיון, ה-UX Researcher ממלא **Empathy Map** — ארבעה ריבועים שמגדירים מה המשתמש:[^10]

```
┌─────────────────────┬─────────────────────┐
│      THINKS         │       FEELS          │
│ "אני לא יכול לסמוך │ מתוסכל, מאבד שליטה │
│  על הצוות שידווח   │ מרגיש לא מוכשר     │
│  לי בזמן"          │ אחרי Surprises       │
├─────────────────────┼─────────────────────┤
│       SAYS          │        DOES          │
│ "אני שולח תזכורות  │ מחזיק Excel Sheet    │
│  ב-Slack כל יום"   │ שולח DMs ידניים     │
│ "זה לא הגיוני"     │ פוגש כל אחד 1:1     │
└─────────────────────┴─────────────────────┘
              PAINS & GAINS
PAINS: זמן, בושה, חוסר ודאות, Surprises
GAINS: שליטה, אמינות, זמן פנוי לאסטרטגיה
```

***

### כלי: Jobs To Be Done (JTBD)

ה-JTBD Framework עוזר להבין **מה המשתמש "מגייס" את המוצר לעשות**:[^11][^12]

```
פורמט JTBD:
"כאשר [CONTEXT] אני רוצה [MOTIVATION] כדי שאוכל [DESIRED OUTCOME]"

דוגמה מ-TaskFlow:
כאשר אני מקבל עדכון ממנהל בכיר על שינוי סדרי עדיפויות —
אני רוצה לדעת מיד אילו משימות מושפעות ועל מי —
כדי שאוכל לתקשר בביטחון לצוות מבלי להיראות חסר אחיזה.
```

שלושת הרבדים של ה-Job:[^12]
- **Functional**: לדעת מה כל אחד עושה ומה Status שלו
- **Emotional**: להרגיש בשליטה ולא להיות מופתע בישיבות
- **Social**: להיראות מנהל אמין ומאורגן בעיני הבוס

***

### שבוע 1: תרומת מחלקת המכירות

ה-**Account Executive הבכיר** מספק נתונים שאי אפשר להשיג בראיונות:[^13]

**Voice of Customer מהשטח:**
- ב-6 החודשים האחרונים, 34 מתוך 78 עסקאות שלא נסגרו — הסיבה הנפוצה ביותר: "אנחנו כבר עובדים עם Asana, לא נחליף"
- 12 לקוחות ביקשו ב-Discovery Calls פיצ'ר כלשהו של "Handoff בין עובדים" — אך לא קיים בשום כלי מקובל
- 3 לקוחות גדולים שיתפו שהם מפחיתים שימוש ב-Asana כי "ה-Onboarding עלה יותר מדי זמן"

**תובנת מכירות שמאכילה את ה-Product Brief:**
> "הלקוחות לא מחפשים *עוד* כלי ניהול משימות. הם מחפשים דרך שכולם **באמת ישתמשו בה**."

***

## שבוע 2: ניתוח וסינתזה (Synthesis Phase)

### סינתזת ממצאים — Affinity Mapping

לאחר 10–12 ראיונות, הצוות מקיים **Synthesis Workshop** של 4 שעות:[^14]

1. כל מרואיין על פתקיות — ציטוטים, תצפיות, Quotes
2. קיבוץ Patterns דומים ל-Clusters
3. זיהוי **3–5 Insight Pillars** — הממצאים שחוזרים שוב ושוב

**Insight Pillars של TaskFlow (לאחר סינתזה):**
1. **"שקיפות בזמן אמת"** — 9/11 מרואיינים ציינו שהמתח הגדול הוא חוסר ידיעה על Status ללא שצריכים לשאול
2. **"Onboarding Cost"** — 7/11 מרואיינים אמרו שניסו כלי קיים אך הצוות לא אימץ אותו
3. **"Context Loss בהעברות"** — 6/11 ציינו שכשמשימה עוברת בין אנשים — ההקשר אובד
4. **"Slack as Primary"** — 10/11 משתמשים אמרו שסלאק הוא המקום שכולם *באמת* פותחים

***

### ניתוח JTBD מרוכז (Job Map)

```
Job: לנהל ביצוע עבודת צוות ולמנוע Surprises

שלב  │ Job Step             │ Pain Level │ Current Solution
─────┼─────────────────────┼────────────┼─────────────────
1    │ הגדרת משימה ושיוך   │ נמוך       │ Jira / Asana
2    │ תקשורת הקשר         │ בינוני     │ Email + Slack
3    │ מעקב התקדמות        │ גבוה ★★★   │ DM ידני בסלאק
4    │ קבלת עדכון Status   │ גבוה ★★★   │ עדכונים ידניים
5    │ זיהוי חסמים מוקדם  │ גבוה ★★★   │ לא קיים
6    │ העברת משימה         │ בינוני     │ Slack DM
7    │ Closure + Learning  │ נמוך       │ כלום
```

ה-Opportunity Score הגבוה ביותר (שלבים 3–5) = כאן נמצאת ה-Sweet Spot של TaskFlow.

***

### הגדרת ICP (Ideal Customer Profile)

ה-Product Marketing Manager בונה את ה-ICP הראשוני:[^15][^16]

**ICP של TaskFlow — Version 1.0:**

```
שכבה 1 — מי הם (Firmographics):
• גודל חברה: 20–150 עובדים
• תעשיות: Services, Tech, Creative Agencies
• שלב: חברות בצמיחה שגייסו A/B/C
• Stack הנוכחי: Slack + שלל כלים לא מסונכרנים

שכבה 2 — איך הם קונים (Behavioral Signals):
• Buyer: Team Lead, Operations Manager, COO
• Champion פנימי: מנהל שנכווה מ"Surprise" בפגישת הנהלה
• Trigger Event: גדילה מ-15 ל-30+ עובדים בחצי שנה
• Discovery: Product Review Sites (G2, Capterra), LinkedIn

שכבה 3 — מדוע הם מצליחים (Outcome Proximity):
• הצלחה = 80%+ מהעובדים מעדכנים Status פעם ביום ללא תזכורת
• חסם: כלל "כל הצוות צריך לאמץ" — אחרת המוצר חסר ערך
• ההבחנה שתגדיר קנייה: "Slack-native experience"
```

***

## שבוע 2: הגדרת OKRs ראשוניים

ה-PM מגדיר עם ה-CTO ו-CEO את ה-OKRs לפרויקט כולו:[^17][^18]

```
Objective 1: הוכחת Product-Market Fit ל-TaskFlow

  KR 1.1: 80% מהמשתמשים בעלי Activation שלמה (Define Activation)
           מבצעים לפחות 5 Handoffs בשבוע הראשון
  KR 1.2: NPS ≥ 40 בסוף חודש ה-3 לאחר Launch
  KR 1.3: 15% מהלקוחות שגייסנו ב-Direct Outreach
           הופכים ל-Paying Customers (Trial → Paid)

Objective 2: עמידה ב-Timeline ובתקציב

  KR 2.1: MVP מוכן ל-Beta בתוך 18 שבועות מהיום
  KR 2.2: עלות פיתוח לא חורגת מ-10% מהתקציב המאושר
  KR 2.3: גיוס 2 מהנדסים נוספים עד סוף שבוע 6
```

***

## ה-Technical Feasibility Spike

ה-**Engineering Lead** לוקח שבוע-שבועיים לבצע **Technical Spike** — בדיקת היתכנות טכנית לפני שמחויבים לבנות:[^19][^20][^21]

**מה נבדק ב-Spike של TaskFlow:**

```
שאלה טכנית 1: Slack Integration
 - האם Slack API מאפשר יצירת Task-Cards ישירות מתוך Slack?
 - זמן בדיקה: 2 ימים
 - תשובה: כן — Slack Block Kit + Workflow Builder תומכים בזה
 - סיכון: Rate Limits אם חברה יש 100+ ערוצים

שאלה טכנית 2: Real-time Status Updates
 - האם Websockets מסחריים (Pusher/Ably) מספיקים ל-Scale?
 - זמן בדיקה: 1 יום
 - תשובה: Ably מספיק ל-10K connections/שרת, עלות סבירה

שאלה טכנית 3: Data Model
 - מה המבנה הנכון ל-Task עם Handoff History?
 - זמן בדיקה: 2 ימים
 - תשובה: PostgreSQL + JSONB לגמישות, לא Graph DB — מספיק

סיכום Spike:
- ✅ טכנית אפשרי
- ⚠️ סיכון עיקרי: Slack API Changes (Dependency)
- ✅ MVP אפשרי ב-10–14 שבועות של פיתוח
```

***

## מסמך Product Brief הסופי

בסוף שבוע שניים, ה-PM מכין **Product Brief** שמסכם את כל ה-Discovery:[^22][^23]

```
PRODUCT BRIEF — TaskFlow v0.1
──────────────────────────────
שם המוצר:    TaskFlow — Handoff-First Task Management
תאריך:        [תאריך הכנת המסמך]
מחבר:         Product Manager

PROBLEM STATEMENT
"מנהלי צוות ב-SMBs מבזבזים 30+ דקות ביום על בקשת Status Updates
 ידניות, ומופתעים בפגישות הנהלה ממשימות שנפלו בין הכסאות."

TARGET USER (ICP)
 - Team Leads / Ops Managers בחברות 20–150 עובדים
 - חברות שמשתמשות ב-Slack כ-Primary Communication

UNIQUE VALUE PROPOSITION
"TaskFlow הוא כלי ניהול משימות שמחיה בתוך Slack —
 כל Handoff שומר על ההקשר, וכל Status מתעדכן אוטומטית."

COMPETITIVE DIFFERENTIATOR
 - Asana/Monday: מוצרים עצמאיים שדורשים Context Switch
 - TaskFlow: Slack-Native — אפס שינוי הרגלים לצוות

SUCCESS METRICS (Definition of Success)
 - Activation: 70%+ מהצוות יוצר לפחות משימה אחת בשבוע ראשון
 - Retention D30: 60%+ מחברות שהתחילו Trial מגיעות לחודש
 - WTP: לקוחות מוכנים לשלם $12–18/user/month (אושר ב-7/11 ראיונות)

SCOPE — מה ב-MVP
 ✅ יצירת Task מתוך Slack Message
 ✅ שיוך Task לאדם + Due Date
 ✅ Automatic Status Update כשTask עובר בין אנשים
 ✅ Dashboard פשוט (Web)
 ✅ Weekly Digest ל-Managers

OUT OF SCOPE לעת עתה
 ❌ Mobile App
 ❌ Integrations (Jira, GitHub, etc.)
 ❌ Enterprise SSO / Permissions
 ❌ Custom Workflows / Automations

RISKS
 1. תלות ב-Slack API — Slack יכולה לשנות Terms
 2. Adoption Challenge — שירות שדורש שכולם ישתמשו בו
 3. Market Timing — AI Task Management Tools צומחים מהר

OKRs
 [כפי שהוגדרו לעיל]

PROPOSED TIMELINE
 Discovery Done:    שבוע 2
 PRD + Design:      שבועות 3–7
 Development:       שבועות 8–21
 Beta:              שבועות 22–25
 Launch:            שבוע 26–28
```

***

## פגישת ה-Go/No-Go (Decision Meeting)

בסוף שבוע שניים, מתכנסת **פגישת החלטה** עם:[^4]
- CEO
- CTO
- CFO (מייצג אישור תקציב ראשוני)
- PM

**מה מוצג:**
1. ממצאי Discovery (10 ראיונות, Insight Pillars)
2. ניתוח שוק ומתחרים
3. ICP ו-WTP (Willingness to Pay)
4. Spike Results — היתכנות טכנית
5. Product Brief
6. בקשת תקציב ראשונית לשלב הבא

**שלושה תוצאות אפשריות:**
- ✅ **Go** — ממשיכים לשלב Business Case & Budget (שלב 2)
- 🔄 **Pivot** — ממשיכים את ה-Discovery לכיוון אחר (כגון: Enterprise במקום SMB)
- ❌ **No-Go** — הרעיון לא מצדיק את ההשקעה, ממשיכים לרעיון הבא

***

## תוצרי השלב — Deliverables מלאים

| תוצר | בעלים | פורמט | סטטוס לפני Go |
|-------|-------|--------|---------------|
| Discovery Sprint Brief | PM | Notion Doc | ✅ חייב |
| סיכום 10–12 ראיונות | UX Researcher | Affinity Map + Synthesis Doc | ✅ חייב |
| Empathy Maps (per Persona) | UX Researcher | Figma / Miro Board | ✅ חייב |
| JTBD Job Map | UX Researcher + PM | Doc/Miro | ✅ חייב |
| Competitive Analysis | PMM | Spreadsheet | ✅ חייב |
| ICP Version 1.0 | PMM | Doc | ✅ חייב |
| Technical Feasibility Spike | Engineering Lead | Tech Doc | ✅ חייב |
| OKRs ראשוניים | PM + CEO | OKR Sheet | ✅ חייב |
| Product Brief v0.1 | PM | Notion Doc | ✅ חייב |
| Go/No-Go Decision | CEO/CTO | Meeting Notes | ✅ חייב |

***

## שגיאות נפוצות בשלב זה

**1. יוצאים ל-Discovery עם פתרון בראש**
הצוות כבר "יודע" מה הוא בונה ורק מחפש אישור. הסימן: שואלים "האם היית משתמש במוצר שעושה X?" במקום לשאול "ספר לי איך אתה מנהל Y".[^1]

**2. Discovery שקצר מדי**
"כבר ראיינו שלושה אנשים, מספיק לנו." — 3 ראיונות לא מספיקים לזהות Pattern. מינימום 7–10 ראיונות לפני שמסיקים מסקנות.[^8]

**3. Engineering לא בשלב Discovery**
כשה-Engineering Lead לא שותף ל-Discovery, ה-Product Brief שמגיע ל-Engineering מלא בדרישות בלתי-ניתנות למימוש. ה-Spike חוסך שבועות של פיתוח לשווא.[^24][^25]

**4. Discovery בלי Decision Criteria**
הצוות מבצע ראיונות נפלאים, אוסף insights מרתקים — אך אין שאלה ברורה שהם אמורים לענות עליה. תמיד מגדירים מראש: "מה יגרום לנו לעצור את הפרויקט?".[^4]

**5. Marketing לא שותף**
Product Marketing לא מעורבת ב-Discovery → הצוות בונה מוצר שאי אפשר למכור. ה-ICP שמוגדר ב-Discovery חייב להיות גם ICP של Marketing ו-Sales.[^16]

---

## References

1. [Product Discovery: The Ultimate Guide to Building What Customers ...](https://www.usercall.co/post/product-discovery-the-ultimate-guide-to-building-what-customers-actually-want-not-what-you-think-they-want) - Learn how to master product discovery with proven frameworks, real research examples, and actionable...

2. [Step 5: Brainstorm Possible...](https://userpilot.com/blog/product-discovery-process/) - The product discovery process is an essential part of product development. Read our guide to see how...

3. [Voice Of The Customer (VoC) Guide For Product Managers [+ ...](https://productside.com/voice-of-the-customer-voc-guide-for-product-managers-template/) - VoC insights validate assumptions, reduce risk, and guide better product decisions. By grounding str...

4. [Product Discovery Sprint Guide: Validate Fast Without Wasting Weeks](https://apptension.com/guides/the-practical-guide-to-product-discovery-that-does-not-waste-weeks) - A practical product discovery sprint template with workshop agendas, research shortcuts, prototype v...

5. [Product Discovery Sprint deliverables – what can you expect? - EDISONDA - Business Design & Innovations](https://edisonda.com/knowledge/product-discovery-sprint-deliverables-what-can-you-expect/) - A Discovery Sprint helps validate a business idea quickly and is the perfect first step in building ...

6. [Product Ideation Framework — Strategy Umwelt](https://strategyumwelt.com/frameworks/product-ideation-framework) - A framework designed to get to a new product hypothesis faster and with greater accuracy by leveragi...

7. [Voice of Customer Research Guide 2025: Complete Methods](https://testfeed.ai/blog/voice-of-customer-research/) - Master voice of customer research with proven methodologies that drive real business results. Transf...

8. [8 Product Discovery Techniques and Methods to Try](https://maze.co/guides/product-discovery/techniques/) - Get to know your users’ needs and pain points at each step of the product lifecycle. Try these produ...

9. [Customer Interviews vs. Customer Feedback in Product Discovery](https://www.aha.io/blog/customer-interviews-vs-customer-feedback-in-product-discovery) - Feedback comes from multiple sources. Customers submit ideas directly. PMs gather insights from supp...

10. [How to Use Discovery Research in UX Product Development](https://www.linkedin.com/posts/the-good_what-is-discovery-research-in-ux-activity-7383578526970626048-OZul) - Let's dive into the empathy map method and discover how it makes your projects more user-centered, c...

11. [Jobs-to-Be-Done for UX Researchers: A Practical Approach](https://www.userintuition.ai/reference-guides/jobs-to-be-done-for-ux-researchers-a-practical-approach/) - How JTBD methodology transforms UX research from feature validation into understanding the fundament...

12. [Jobs To Be Done for UX Research | Beginner's Guide to JTBD](https://mrx.sivoinsights.com/blog/using-jobs-to-be-done-jtbd-in-ux-research-a-practical-guide) - Learn how to use Jobs To Be Done (JTBD) in UX research to uncover user needs and improve product des...

13. [Voice of Customer Research vs. Sales Discovery and Qualifying](https://www.nosmokeandmirrors.com/2024/03/20/understanding-the-distinction-voice-of-customer-research-vs-sales-discovery-and-qualifying/) - When a team has conducted VOC, we often discover three to five insight pillars and better understand...

14. [10 tips for running an effective product Discovery Sprint - EDISONDA - Business Design & Innovations](https://edisonda.com/knowledge/10-tips-product-discovery-sprint/) - Product Discovery Sprint helps companies to validate ideas for digital products effectively. This pr...

15. [How to create an ideal customer profile (ICP)](https://www.productmarketingalliance.com/how-to-determine-your-ideal-customer-profile/) - My name’s Yael Davidowitz-Neu, and I'm the Director of Product Marketing at Cyxtera. In this article...

16. [Integrating Icp Into...](https://nalpeiron.com/blog/winning-icp-gtm-success) - Discover how aligning your ICP with your business strategy avoids wasted resources and ensures impac...

17. [A Guide to Setting Objectives and Key Results for Product Teams](https://okrinstitute.org/crushing-goals-a-guide-to-setting-objectives-and-key-results-for-product-teams/) - Objectives and Key Results (OKRs) provide a framework for defining and tracking these goals. This gu...

18. [OKR Framework - The Ultimate Guide For Digital Product ...](https://adaptmethodology.com/blog/okr-framework/) - The OKR Framework is a popular framework in goal setting and management that helps organizations imp...

19. [Technical Spike - Engineering Fundamentals Playbook](https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/recipes/technical-spike/) - ISE Engineering Fundamentals Engineering Playbook

20. [Product Experiment: Technical Spike - Learning Loop](https://learningloop.io/plays/technical-spike) - Technical Spikes are short, focused, time-boxed explorations of technical challenges designed to red...

21. [Managing Technical Spikes and Discovery Work in Agile Sprints](https://agileseekers.com/blog/managing-technical-spikes-and-discovery-work-in-agile-sprints) - A technical spike is a time-boxed activity used to research or prototype a solution when the team la...

22. [Product Brief – How to Write One with Examples](https://productstrategy.co/product-brief/) - Have you ever wondered how successful products are brought to life? It all starts with an effective ...

23. [How to Write a Thorough Product Brief [With Complete Template] - Frill](https://frill.co/blog/posts/product-brief) - Learn how to write a product brief that aligns teams, streamlines development, and drives execution....

24. [Discovery Phase: Stages, Deliverables & Goals - NIX United](https://nix-united.com/blog/discovery-phase-stages-values-and-challenges/) - How does the discovery phase support technical feasibility assessment? What is the difference betwee...

25. [7 Product Discovery Techniques That Reduce Costly Rework by 50%](https://www.itonics-innovation.com/blog/product-discovery-techniques) - Engineering leads own technical feasibility. Clear authority prevents discovery from devolving into ...

