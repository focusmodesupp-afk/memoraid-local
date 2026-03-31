# שלב 4: עיצוב UX/UI ואדריכלות (Design & Architecture)
### מוצר: TaskFlow | הפנים של המוצר נוצרות
### משך: 3–5 שבועות (מקביל לחלקו לSprint 1–2)

***

## מה קורה בשלב הזה?

שלב 4 הוא המקום שבו הרעיון הופך לדבר שאפשר לראות ולגעת בו — **לפני שנכתבה שורת קוד אחת בפיתוח**. עיצוב נכון חוסך שבועות של פיתוח מחדש. מחקרים מראים שכל דולר שמשקיעים ב-UX בשלב זה חוסך בממוצע 100 דולר בתיקונים לאחר הפיתוח.[^1][^2]

שלב 4 רץ **במקביל לSprints הראשוניים** — בזמן שהמהנדסים בונים Infrastructure ו-Auth (Sprint 1), המעצבים כבר עובדים על Wireframes וPrototypes לSprints 2–3.

```
Timeline מקביל:
Engineering:  Sprint 1 (Auth/Infra)  →  Sprint 2 (Task Creation)
Design:       IA + Flows + Wireframes →  Hi-Fi + Usability Test  →  Handoff
              שבועות 1–2                   שבועות 3–4                   שבוע 5
```

***

## מי עושה מה?

| תפקיד | אחריות בשלב 4 |
|-------|--------------|
| **UX Designer** | Information Architecture, User Flows, Wireframes, Usability Testing |
| **UI Designer** | Design System, Hi-Fi Mockups, Prototypes אינטראקטיביים |
| **PM** | מוודא שה-Design תואם את ה-PRD, מוביל Design Reviews |
| **Engineering Lead** | בודק Technical Feasibility של כל Interaction, מסמן Constraints |
| **UX Researcher** | מריץ Usability Tests, מנתח ממצאים |
| **Marketing / PMM** | מוודא שה-Brand Voice עולה בקנה אחד עם ה-Design |
| **Legal** | בודק שה-Consent Screens ו-Privacy Flows תקינים ל-GDPR |

***

## פרק א': Information Architecture (IA)

### מה זה IA ולמה הוא הצעד הראשון?

Information Architecture (IA) היא **המפה הלוגית של המוצר** — איפה כל תוכן יגור, ואיך המשתמשים ינווטו בין הסעיפים השונים. IA גרועה גורמת למשתמשים לאבד את עצמם; IA טובה מרגישה בלתי נראית.[^3][^4]

IA קודמת לWireframes — אי אפשר לצייר מסכים לפני שמחליטים מה יש בכל מסך ואיך המסכים קשורים זה לזה.[^5][^6]

### Sitemap — TaskFlow

```
TaskFlow — Information Architecture

📱 SLACK BOT (Conversational UI):
├── Slash Command: /task
│   ├── Create Task Modal
│   │   ├── Title (auto-filled from message)
│   │   ├── Assignee
│   │   ├── Due Date
│   │   └── Priority
│   └── Confirmation Thread Message
│
├── Reaction Trigger: ✅ Emoji
│   └── → פותח Create Task Modal
│
├── Task Actions (Thread Buttons):
│   ├── Mark Complete
│   ├── Handoff →
│   │   ├── Handoff Modal (Done So Far, Next Steps, To Whom)
│   │   └── → DM לReceiver + Thread Update
│   └── View in Dashboard →
│
└── Daily Digest (DM אוטומטי):
    └── רשימת Tasks הפתוחים של המשתמש

🌐 WEB DASHBOARD:
├── Onboarding Flow (First Time):
│   ├── Connect Slack Workspace
│   ├── Invite Team Members
│   ├── Consent / Privacy Screen (GDPR)
│   └── Quick Tour
│
├── Dashboard (Home):
│   ├── All Tasks View
│   │   ├── Filter: Assignee / Status / Due Date / Priority
│   │   ├── Sort: Due Date / Created / Priority
│   │   └── Export CSV
│   ├── My Tasks
│   └── Overdue (Red Badge)
│
├── Task Detail Page:
│   ├── Title + Description
│   ├── Handoff History Log
│   ├── Assignee + Due Date
│   └── Status Timeline
│
├── Team Members:
│   ├── רשימת חברי הWorkspace
│   └── Tasks לפי אדם
│
├── Settings:
│   ├── Workspace Settings
│   ├── Notification Preferences
│   ├── Integrations (Slack Token)
│   ├── Billing & Plan
│   └── Privacy & Data (GDPR Export/Delete)
│
└── Admin:
    ├── Members & Permissions
    └── Audit Log
```

***

## פרק ב': User Flows

### User Flow 1 — יצירת Task מSlack (Core Flow)

```
[Slack Message נשלח]
        ↓
[User מגיב עם ✅]
        ↓
[TaskFlow Bot זיהה Reaction]
        ↓
[Modal נפתח ב-Slack]
   ↙              ↘
[User ממלא]    [User סוגר]
       ↓               ↓
[Submit]         [Task בוטל]
       ↓
[Validation]
   ↙        ↘
[עובר]    [נכשל]
   ↓           ↓
[Task נשמר]  [Error Toast בModal]
   ↓
[Thread Confirmation: "Task: [Title] → [Assignee] | Due: [Date]"]
   ↓
[Assignee מקבל DM: "הוקצתה לך משימה"]
```

### User Flow 2 — Handoff Engine

```
[Task Owner רואה Task שלו]
        ↓
[לוחץ "Handoff" ב-Slack Thread / Dashboard]
        ↓
[Handoff Modal נפתח]
   Fields:
   • Done So Far (text, חובה)
   • Next Steps (text, חובה)
   • Handoff To (Assignee Picker)
   • Priority (dropdown)
        ↓
[Submit]
        ↓
   ↙              ↘
[שני Fields ריקים]  [תקין]
        ↓                   ↓
[Validation Error]    [Task עובר לOwner חדש]
                              ↓
                   [History Log מתעדכן]
                              ↓
                   [Thread Updated: "🔄 Handed off: [A] → [B]"]
                              ↓
                   [Receiver מקבל DM עם Full Context]
```

### User Flow 3 — Onboarding (First-Time User)

```
[User פותח Dashboard לראשונה]
        ↓
[Welcome Screen]
        ↓
[Connect Slack Workspace → OAuth]
   ↙              ↘
[אישר]         [ביטל]
   ↓                ↓
[Invite Team]    [חוזר לWelcome]
   ↓
[Privacy & Consent Screen] ← דרישת GDPR
   ↓
[Slack Bot Install ב-Workspace]
   ↙              ↘
[הותקן]        [לא הותקן]
   ↓                ↓
[Quick Tour]    [Troubleshoot Guide]
   ↓
[Dashboard ריק עם Empty State:
 "Send ✅ on any Slack message to create your first task"]
```

***

## פרק ג': Wireframes — מLo-Fi לHi-Fi

### שלושת רמות ה-Fidelity

עיצוב מתקדם מLo-Fi לHi-Fi בשלוש סיבות: מהיר יותר לשנות, קל יותר לבדוק, ומונע "Pixel-Fixing" לפני שהמבנה נכון.[^2][^7][^1]

| רמה | כלי | מה כולל | מתי מכינים |
|-----|-----|---------|-----------|
| **Lo-Fi Wireframe** | Balsamiq / FigJam | Boxes + Labels בלבד, ללא צבע | שבוע 1–2 |
| **Mid-Fi Wireframe** | Figma (Grayscale) | Layout + Component Placement | שבוע 2 |
| **Hi-Fi Prototype** | Figma | עיצוב מלא + אינטראקציות | שבוע 3–4 |

***

### Lo-Fi Wireframes — TaskFlow (תיאור מילולי)

**מסך 1: Slack Modal — יצירת Task**
```
┌─────────────────────────────────────┐
│  📋 Create Task                  ✕  │
├─────────────────────────────────────┤
│  Title                              │
│  ┌─────────────────────────────┐   │
│  │ [auto-filled from message]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Assign To                          │
│  ┌─────────────────────────────┐   │
│  │ 👤 Select team member ▼     │   │
│  └─────────────────────────────┘   │
│                                     │
│  Due Date                           │
│  ┌─────────────────────────────┐   │
│  │ 📅 Pick a date              │   │
│  └─────────────────────────────┘   │
│                                     │
│  Priority                           │
│  ○ Low   ● Medium   ○ High          │
│                                     │
│  [Cancel]            [Create Task]  │
└─────────────────────────────────────┘
```

**מסך 2: Dashboard — All Tasks View**
```
┌──────────────────────────────────────────────────────┐
│  TaskFlow          🔔 3 Overdue    👤 Maya   ⚙️       │
├──────────────────────────────────────────────────────┤
│  📊 Dashboard  |  ✅ My Tasks  |  👥 Team  |  ⚙️      │
├──────────────────────────────────────────────────────┤
│  All Tasks (24)           [Filter ▼]  [Export CSV]   │
│                                                       │
│  ┌────────────┬───────────┬──────────┬─────────────┐ │
│  │ Task Title │ Assignee  │ Due Date │ Status      │ │
│  ├────────────┼───────────┼──────────┼─────────────┤ │
│  │ Write Q1.. │ 👤 Dan    │ ❗ 2 days │ In Progress │ │
│  │ Fix bug..  │ 👤 Shira  │ Mar 30   │ Open        │ │
│  │ Review..   │ 👤 Maya   │ Apr 2    │ Handoff     │ │
│  └────────────┴───────────┴──────────┴─────────────┘ │
│                                                       │
│  [Load More...]                                       │
└──────────────────────────────────────────────────────┘
```

**מסך 3: Task Detail + Handoff History**
```
┌──────────────────────────────────────────┐
│  ← Back to Dashboard                     │
├──────────────────────────────────────────┤
│  ✅ Write Q1 Marketing Report            │
│  Status: In Progress  │ Priority: High   │
│  Assigned to: 👤 Dan  │ Due: Mar 29      │
├──────────────────────────────────────────┤
│  🔄 Handoff History                      │
│  ────────────────────                    │
│  Mar 25 10:30  Maya → Dan               │
│  "Done: Research & Outline              │
│   Next: Write sections 2–4"             │
│                                          │
│  Mar 22 14:00  Task Created by Maya     │
├──────────────────────────────────────────┤
│  [Handoff →]     [Mark Complete ✅]     │
└──────────────────────────────────────────┘
```

***

## פרק ד': Design System — הבסיס שחוסך זמן

### מה זה Design System?

Design System הוא **ספריית הרכיבים המשותפת** של המוצר — צבעים, טיפוגרפיה, Buttons, Forms, Icons — שמוגדרת פעם אחת ומשמשת בכל המוצר.[^8][^9][^10]

ללא Design System: מהנדסים מיישמים כפתור "כחול" בשלוש גרסאות שונות. עם Design System: כפתור Primary מוגדר פעם אחת בFigma ומיישמות פעם אחת בקוד.[^11][^8]

### Design Tokens — TaskFlow

```
🎨 Color Palette:
Primary:    #4F46E5  (Indigo-600)
Secondary:  #06B6D4  (Cyan-500)
Success:    #10B981  (Emerald-500)
Warning:    #F59E0B  (Amber-500)
Danger:     #EF4444  (Red-500)
Text:       #111827  (Gray-900)
Subtle:     #6B7280  (Gray-500)
Background: #F9FAFB  (Gray-50)
White:      #FFFFFF

📝 Typography:
Font Family:  Inter (Primary), System fonts (Fallback)
H1: 30px / Bold / Gray-900
H2: 24px / SemiBold / Gray-900
H3: 18px / SemiBold / Gray-900
Body: 14px / Regular / Gray-700
Small: 12px / Regular / Gray-500
Label: 11px / SemiBold / Gray-500 / UPPERCASE

📐 Spacing Scale (8px Base):
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px

🔘 Border Radius:
sm:  4px  (inputs, small cards)
md:  8px  (cards, modals)
lg:  12px (large panels)
full: 9999px (badges, avatars)
```

### Component Library — TaskFlow

```
Atoms (בסיסי):
├── Button: Primary / Secondary / Ghost / Danger / Icon
├── Input: Text / Date / Select / Checkbox / Radio
├── Badge: Open / In Progress / Done / Overdue / Handoff
├── Avatar: User avatar עם Initials Fallback
├── Icon Set: Lucide Icons (open source)
└── Tooltip: Hover + Focus

Molecules (רכיבים מורכבים):
├── Task Card: Title + Assignee + Due Date + Badge
├── Handoff Modal: Form + Context Fields
├── Confirm Dialog: Title + Message + Actions
├── Toast Notification: Success / Error / Warning
├── Filter Bar: Multi-select Dropdowns
└── Empty State: Illustration + CTA

Organisms (עמודים שלמים):
├── Navigation Sidebar
├── Dashboard Table
├── Task Detail Panel
└── Onboarding Steps
```

***

## פרק ה': Usability Testing — לבדוק לפני שבונים

### למה בודקים עם Wireframes ולא עם המוצר הגמור?

בדיקת Usability עם Prototype עולה פחות מ-10% ממה שעולה לתקן את אותה בעיה לאחר פיתוח. הכלל: **לא להשיק מסך שלא עבר בדיקת עיניים של 5 אנשים אמיתיים**.[^12][^13]

### תוכנית Usability Testing — TaskFlow Mid-Fi Prototype

**מה בודקים?**
```
Test 1: Task Creation Flow
  שאלת מחקר: האם משתמשים מבינים שצריך להגיב ✅ כדי ליצור Task?
  מדד: Time to First Task < 90 שניות
  כלי: Maze (Unmoderated Remote Testing)
  משתתפים: 8 אנשים מה-ICP (SMB Team Leads)

Test 2: Handoff Flow
  שאלת מחקר: האם המשתמשים מבינים את ההבדל בין "Done So Far" ל-"Next Steps"?
  מדד: שיעור השלמה > 80% ללא עזרה
  כלי: UserTesting.com (Moderated Video)
  משתתפים: 6 אנשים

Test 3: Dashboard Navigation
  שאלת מחקר: האם Manager מוצא Tasks Overdue בפחות מ-30 שניות?
  מדד: Task Success Rate > 75%
  כלי: Maze (Unmoderated)
  משתתפים: 8 אנשים
```

**תוצאות שמחייבות Redesign (Red Flags):**[^14][^15]
```
❌ Task Success Rate < 70% → חייבים לשנות לפני Handoff לEngineer
❌ Time on Task גבוה פי 3 מהצפוי → בעיית Navigation או Label
❌ Error Rate > 15% → Validation או Affordance בעייתיים
❌ "מה אני אמור לעשות כאן?" → Empty State לא ברור
```

**מה עושים עם הממצאים?**
```
1. מסכמים Observations לכל Test Scenario
2. מזהים Top 5 Issues לפי Severity (Critical / Major / Minor)
3. PM + Designer מחליטים: Fix Now vs. Backlog
4. Critical Issues → מתוקנים לפני Handoff לEngineering
5. Major Issues → נכנסים לBacklog כUser Stories
6. Minor Issues → Icebox (גרסה עתידית)
```

***

## פרק ו': Design Review — לולאת המשוב

### ה-Design Critique Process

לא מספיק שהמעצב יחשוב שהעיצוב טוב — צריך תהליך מסודר של משוב ממספר נקודות מבט:[^16][^17][^18]

```
שבוע 1–2: Internal Design Critique (Design Team בלבד)
  ├── מצגת Wireframes לצוות Design
  ├── Feedback על IA + User Flows
  └── חזרה לעיצוב

שבוע 2–3: Cross-Functional Review
  ├── משתתפים: PM + Engineering Lead + Marketing + Legal
  ├── PM בודק: האם כל User Story מה-PRD מכוסה?
  ├── Engineering מסמן: "זה לא אפשרי טכנית ב-MVP" / "זה קל ליישם"
  ├── Marketing בודק: Voice & Tone, Brand Consistency
  └── Legal בודק: Consent Screen, Privacy Texts

שבוע 3: Stakeholder Review
  ├── CEO + CTO צופים בPrototype
  ├── הצגת Top 3 Design Decisions + Rationale
  └── Go/No-Go על Design Direction

שבוע 4: Usability Testing + Iteration
  └── ממצאי Testing → תיקונים בעיצוב
```

**טיפים לDesign Review יעיל:**[^17]
- שולחים Prototype לינק **48 שעות לפני** הפגישה — לא מציגים "קר"
- מבקשים Feedback ספציפי: "מה לא ברור?" ולא "מה אתם חושבים?"
- מבדילים בין **Design Decisions** (קונצנזוס) לבין **Personal Preferences** (לא רלוונטי)
- כל שינוי שמוחלט בReview → מתועד ב-Changelog

***

## פרק ז': Design Handoff לEngineering

### מה זה Design Handoff ולמה הוא נקודת כשל?

Design Handoff הוא הרגע שבו המעצב מעביר את הEspecs למהנדסים כדי שיוכלו לבנות. ללא Handoff מסודר — מהנדסים "מנחשים" pixel values, צבעים, ו-Spacing, ומקבלים תוצר שנראה שונה מהDesign.[^19][^20]

**הכלים המרכזיים:**
- **Figma Dev Mode** — מהנדסים מקבלים Inspect Panel עם CSS Properties, Spacing, Colors
- **Zeplin** — פלטפורמה ייעודית לHandoff עם Git-style Version Control[^21][^19]

### Handoff Checklist — TaskFlow

```
✅ כל ה-Screens מסומנים כ-"Ready for Development" בFigma
✅ Design Tokens מוגדרים: Colors, Spacing, Typography
✅ כל Component מוגדר עם כל States:
   Default / Hover / Active / Disabled / Error / Loading
✅ Responsive Breakpoints:
   Mobile 375px / Tablet 768px / Desktop 1280px+
✅ Annotations הוסבו על כל מסך מורכב
   (מה קורה כשלוחצים כאן? מה ה-Animation?)
✅ Edge Cases מצוירים:
   Empty State / Error State / Loading State
✅ Accessibility:
   Color Contrast Ratio > 4.5:1 (WCAG AA)
   כל Interactive Element עם Focus State
✅ Design Spec Document:
   מסמך PDF/Notion עם Overview + Interaction Notes
✅ פגישת "Design Walkthrough" עם Engineering:
   מעצב מסביר כל Flow למהנדסים (90 דקות)
```

**Design Handoff Meeting — אג'נדה:**
```
00:00–10:00  Overview of Design Philosophy + Brand Voice
10:00–30:00  Walkthrough: Slack Bot Flows (Create Task, Handoff)
30:00–50:00  Walkthrough: Web Dashboard (All screens)
50:00–65:00  Component Library Demo — איך להשתמש
65:00–80:00  Edge Cases + Error States
80:00–90:00  שאלות + תיעוד open items
```

***

## פרק ח': Architecture Design — CTO + Engineering Lead

### System Architecture Diagram

בזמן שהUX Designer עובד על Wireframes, ה-Engineering Lead מכין את ה-**High Level Architecture**:[^22]

```
                    ┌────────────────────────────────┐
                    │           SLACK API             │
                    │  (Events / Webhooks / OAuth)    │
                    └───────────────┬────────────────┘
                                    │ HTTPS Webhook
                    ┌───────────────▼────────────────┐
                    │        API GATEWAY              │
                    │     (AWS API Gateway)           │
                    │  Rate Limiting / Auth / SSL     │
                    └───────────────┬────────────────┘
                                    │
               ┌────────────────────▼──────────────────┐
               │          TASKFLOW API (Node.js)        │
               │         (AWS ECS Fargate)              │
               │  ┌─────────────┐  ┌────────────────┐  │
               │  │ Auth Module │  │ Task Module    │  │
               │  │ (JWT/OAuth) │  │ (CRUD + Queue) │  │
               │  └─────────────┘  └────────────────┘  │
               │  ┌─────────────┐  ┌────────────────┐  │
               │  │ Handoff     │  │ Notification   │  │
               │  │ Engine      │  │ Module         │  │
               │  └─────────────┘  └────────────────┘  │
               └───────┬───────────────────┬───────────┘
                       │                   │
          ┌────────────▼──────┐  ┌─────────▼──────────┐
          │   PostgreSQL      │  │   Redis             │
          │   (AWS RDS)       │  │   (AWS ElastiCache) │
          │  Multi-tenant     │  │  Queue (BullMQ)     │
          │  Row-Level Sec    │  │  Session Cache      │
          └───────────────────┘  └────────────────────┘
                                         │
                    ┌────────────────────▼──────────────┐
                    │     Worker Process (BullMQ)        │
                    │  Webhook Processor / Email Digest  │
                    └───────────────────────────────────┘
```

### Database Schema — TaskFlow

```sql
-- Tenants (Slack Workspaces)
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_team_id    VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(255),
  plan        VARCHAR(50) DEFAULT 'free',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  slack_user_id    VARCHAR(50) NOT NULL,
  name        VARCHAR(255),
  email       VARCHAR(255),
  role        VARCHAR(50) DEFAULT 'member',
  consent_at  TIMESTAMP,  -- GDPR consent timestamp
  UNIQUE(tenant_id, slack_user_id)
);

-- Tasks
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  title       TEXT NOT NULL,
  assignee_id UUID REFERENCES users(id),
  created_by  UUID REFERENCES users(id),
  due_date    DATE,
  priority    VARCHAR(20) DEFAULT 'medium',
  status      VARCHAR(30) DEFAULT 'open',
  slack_message_ts  VARCHAR(50),  -- Slack message timestamp
  slack_channel_id  VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Handoff Log
CREATE TABLE handoffs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID REFERENCES tasks(id),
  from_user   UUID REFERENCES users(id),
  to_user     UUID REFERENCES users(id),
  done_so_far TEXT NOT NULL,
  next_steps  TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Row-Level Security (RLS) על כל הטבלאות:
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tasks
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

***

## פרק ט': תוצרי סוף שלב 4

| תוצר | בעלים | Status נדרש |
|------|-------|-------------|
| **Sitemap + IA Document** | UX Designer | Approved by PM + Engineering[^3] |
| **User Flows (3 Core)** | UX Designer | Reviewed in Cross-Functional Review |
| **Lo-Fi + Mid-Fi Wireframes** | UX Designer | Usability Tested |
| **Hi-Fi Prototype (Figma)** | UI Designer | All Screens + States |
| **Design System + Tokens** | UI Designer | Published כShared Library בFigma[^10] |
| **Usability Test Report** | UX Researcher | Top 5 Issues + Decisions[^15] |
| **Design Handoff Package** | UI Designer | Ready for Dev בFigma/Zeplin[^20] |
| **System Architecture Diagram** | Engineering Lead | Reviewed + Approved by CTO |
| **DB Schema v1** | Backend Engineer | Reviewed + Merged לGit |

***

## שגיאות נפוצות בשלב 4

**1. מדלגים מLo-Fi ישר לHi-Fi**
מעצבים שמתחילים בצבעים ו-Pixel-Perfect לפני שהמבנה נבדק — מבזבזים שעות על עיצוב שישתנה כולו אחרי Usability Test. Lo-Fi ראשה, יופי אחר-כך.[^1]

**2. Engineering לא מעורב בDesign Review**
מעצבים שמציגים Hover Animations מורכבות ו-Custom Interactions מבלי לבדוק עם Engineering — גורמים ל-"לא, זה לוקח שבועיים לבנות" בHandoff. Engineering חייבים להיות בDesign Review.[^19]

**3. Design System שמתחיל מגדול מדי**
Design System שמנסה לכסות 200 Components לפני שהמוצר קיים — מתמוטט. מתחילים מ-Atoms (Button, Input, Badge) ומרחיבים לפי הצורך.[^23][^11]

**4. Usability Testing עם עמיתים ולא עם משתמשי ICP**
לבדוק את TaskFlow עם עמיתי המשרד (שרוצים לעזור ולא יגידו שדבר לא עובד) — אינו תחליף לבדיקה עם Team Lead SMB אמיתי שמעולם לא ראה את המוצר.[^13][^24]

**5. Handoff ללא "Walking the Design"**
שליחת קישור Figma למהנדסים ללא Walkthrough Meeting — גורם לפיצ'רים שנבנים "לפי הבנת המהנדס" ולא "לפי כוונת המעצב". 90 דקות Walkthrough חוסכות שבוע של Back-and-Forth.[^20]

***

## מה השתנה לאחר שלב 4?

```
לפני שלב 4:              אחרי שלב 4:
─────────────────        ──────────────────────────────────
PRD מילולי בלבד    →    Prototype מלא בFigma — רואים הכל
"נבנה Dashboard"   →    48 מסכים עם כל States + Edge Cases
אין Design System  →    Tokens + Component Library מוכן
לא בדקנו עם Users →    8 Usability Tests, Top 5 Issues תוקנו
Architecture בראש →    DB Schema + System Diagram מאושרים
Engineering "מנחש" →   Handoff Package מלא + Walkthrough
```

Sprint 3 — Handoff Engine — מתחיל עם הכל מוכן 🎨

---

## References

1. [The Complete UX Design Process: a Practical, Step-by-Step Guide for Junior Designers](https://blog.uxfol.io/ux-design-process/) - Learn the complete UX design process step by step. Understand UX stages, methodologies, activities, ...

2. [The UX design process: 7 actionable steps - LogRocket Blog](https://blog.logrocket.com/ux-design/ux-design-process-7-steps/) - Get answers to common UX design questions on the process, tools, timelines, and success metrics. And...

3. [Information Architecture Design: A Step-By-Step Guide](https://uxplanet.org/information-architecture-design-a-step-by-step-guide-41dcd4405ee3?gi=7dac04e0a415) - Information architecture is a discipline that focuses on organizing information within digital produ...

4. [A Beginner's Guide To Information Architecture in UX](https://www.loop11.com/a-beginners-guide-to-information-architecture-in-ux/)

5. [Sitemap vs Information Architecture: Differences and Similarities](https://aguayo.co/en/blog-aguayo-user-experience/sitemap-vs-information-architecture-differences-similarities/) - In this guide, we will explore the differences and similarities between the sitemap and the informat...

6. [Sitemap UX: How to Build Smarter Structure in Product Design](https://www.eleken.co/blog-posts/sitemap-ux) - Learn sitemap UX best practices with real examples. Discover how to map structure, avoid mistakes, a...

7. [Wireframing in UI/UX design: types, process and tools | Blog](https://www.future-processing.com/blog/wireframing-in-ui-ux-design-types-process-and-tools/) - You might have heard wireframing is one of the most important aspects of UI/UX Design. What does it ...

8. [Best Practices for Scalable Component Libraries](https://www.uxpin.com/studio/blog/best-practices-for-scalable-component-libraries/) - A scalable component library saves time, ensures consistency, and grows with your team. Let’s dive i...

9. [Organizing Your Design System: Practical Tips for Designers](https://www.designsystemscollective.com/organizing-your-design-system-practical-tips-for-designers-8aef9e598644?gi=e9792f825c9a) - Discover best practices for structuring design system libraries for scalability

10. [Organizing Components In A...](https://www.figma.com/best-practices/components-styles-and-shared-libraries/) - Shared components and style libraries are the cornerstone to producing consistent designs with ease—...

11. [Component Library Examples Teams Actually Use - Cabin](https://cabinco.com/build-design-system-teams-actually-use/) - Learn how to build a design system teams actually adopt — focusing on ownership, governance, and rea...

12. [How Product Designers Test Their Designs](https://www.usertesting.com/resources/guides/product-design/testing-methods) - You can use several methods to conduct product testing, including usability testing, prototype testi...

13. [Usability Testing for Product Design - Capicua](https://www.capicua.com/blog/usability-testing-product-design) - Usability testing is essential to Product Development and the UX Design process. It helps designers ...

14. [When to Use Which User-Experience Research Methods](https://www.nngroup.com/articles/which-ux-research-methods/) - To help you know when to use which user research method, each of 20 methods is mapped across 3 dimen...

15. [12 Steps for Usability Testing: Plan, Run, Analyze, Report](https://www.uxtigers.com/post/user-testing) - First, select your testing method by considering three key dimensions: Qualitative vs. Quantitative:...

16. [Product Development and Stakeholder Feedback](https://www.linkedin.com/pulse/product-development-stakeholder-feedback-erum-manzoor-rxb4c) - In today's rapidly evolving market landscape, the development of a new product is a complex and mult...

17. [How Feedback Loops Improve Collaborative Design](https://developerux.com/2025/05/28/how-feedback-loops-improve-collaborative-design/) - Explore how feedback loops enhance collaboration, catch issues early, and improve design quality in ...

18. [Best Practices for Stakeholder Feedback Loops](https://www.uxpin.com/studio/blog/stakeholder-feedback-loops-best-practices/) - Use clear goals, defined roles, focused tools, and milestone reviews to centralize stakeholder feedb...

19. [Using Zeplin for design handoff: How does it compare to ...](https://blog.logrocket.com/ux-design/zeplin-design-handoff-figma-dev-mode/) - Let’s compare Zeplin with Figma Dev Mode to find out which suits design handoff better for your soft...

20. [Design Handoff 101: How to handoff designs to developers](https://blog.zeplin.io/design-delivery/design-handoff-101-how-to-handoff-designs-to-developers/) - Design handoff is a big moment in designer-developer collaboration. Here’s what it's all about and h...

21. [Figma + Zeplin for design...](https://blog.zeplin.io/design-delivery/delivering-designs-with-figma-vs-zeplin/) - What's the difference between doing design handoff in Figma vs. Zeplin? Answers to that, plus which ...

22. [Software Design Document [Tips & Best Practices] - Atlassian](https://www.atlassian.com/work-management/knowledge-sharing/documentation/software-design-document) - Discover how to create a comprehensive software design document to outline project goals, architectu...

23. [Design system team](https://www.reddit.com/r/Frontend/comments/184dtmj/design_system_team/) - Design system team

24. [7 Essential usability testing methods for UX insights](https://maze.co/guides/usability-testing/methods/) - Key methods include lab testing, contextual inquiry, guerrilla testing, video interviews, session re...

