# 🎯 Sprint Management System - מערכת ניהול ספרינטים

## 📋 סקירה כללית

מערכת ניהול ספרינטים מלאה בסגנון JIRA, המשולבת עם מערכת הקנבאן ומאפשרת ניהול פרויקטים מקצועי.

---

## 🗄️ Database Schema

### טבלאות

#### `sprints` - ספרינטים
```sql
CREATE TABLE sprints (
  id uuid PRIMARY KEY,
  name varchar(255) NOT NULL,
  goal text,
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL,
  status varchar(32) DEFAULT 'planning',
  velocity decimal(10, 2),
  created_by uuid REFERENCES admin_users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**סטטוסים:**
- `planning` - בתכנון
- `active` - פעיל
- `completed` - הושלם

#### `sprint_tasks` - משימות בספרינט
```sql
CREATE TABLE sprint_tasks (
  sprint_id uuid REFERENCES sprints(id),
  task_id uuid REFERENCES dev_tasks(id),
  story_points integer,
  added_at timestamp DEFAULT now(),
  PRIMARY KEY (sprint_id, task_id)
);
```

#### `sprint_activities` - יומן פעילות
```sql
CREATE TABLE sprint_activities (
  id uuid PRIMARY KEY,
  sprint_id uuid REFERENCES sprints(id),
  activity_type varchar(64) NOT NULL,
  description text NOT NULL,
  admin_user_id uuid REFERENCES admin_users(id),
  created_at timestamp DEFAULT now()
);
```

---

## 🚀 התקנה

### שלב 1: צור את הטבלאות
```bash
# דרך API
curl -X POST http://localhost:3006/api/health/create-sprint-tables

# או דרך PowerShell
Invoke-WebRequest -Uri "http://localhost:3006/api/health/create-sprint-tables" -Method POST
```

### שלב 2: גש למערכת
```
http://localhost:5173/admin/sprints
```

---

## 📡 Backend APIs

### Sprints Management

```typescript
GET    /admin/sprints              // רשימת ספרינטים (עם סינון)
GET    /admin/sprints/:id          // פרטי ספרינט + משימות
POST   /admin/sprints              // יצירת ספרינט
PATCH  /admin/sprints/:id          // עדכון ספרינט
DELETE /admin/sprints/:id          // מחיקת ספרינט
```

**פרמטרי סינון ב-GET /admin/sprints:**
- `status` - סינון לפי סטטוס (planning/active/completed)

### Sprint Tasks

```typescript
POST   /admin/sprints/:id/tasks           // הוספת משימה לספרינט
DELETE /admin/sprints/:id/tasks/:taskId   // הסרת משימה מספרינט
```

### Sprint Metrics & Activities

```typescript
GET    /admin/sprints/:id/metrics     // מדדי ספרינט
GET    /admin/sprints/:id/activities  // יומן פעילות
```

---

## 🎨 Frontend Components

### 1. AdminSprints.tsx
דף הספרינטים הראשי:
- רשימת כל הספרינטים
- סינון לפי סטטוס
- הדגשת ספרינט פעיל
- יצירת ספרינט חדש

### 2. AdminSprintDetail.tsx
דף ספרינט בודד:
- פרטי הספרינט
- מטרת הספרינט
- רשימת משימות
- מדדי התקדמות
- יומן פעילות

---

## 🎯 תכונות מרכזיות

### 1. Sprint Planning
- **יצירת ספרינט חדש**
  - שם ספרינט
  - מטרה (Goal)
  - תאריך התחלה וסיום
  
- **הוספת משימות**
  - גרירה מהקנבאן
  - הוספה ידנית
  - Story Points

### 2. Sprint Execution
- **התחלת ספרינט**
  - שינוי סטטוס ל-Active
  - התחלת ספירה לאחור
  
- **מעקב התקדמות**
  - אחוז השלמה
  - משימות שהושלמו
  - Story Points שהושלמו

### 3. Sprint Completion
- **סיום ספרינט**
  - שינוי סטטוס ל-Completed
  - העברת משימות שלא הושלמו ל-Backlog
  - חישוב Velocity

### 4. Sprint Metrics
- **מדדים בזמן אמת:**
  - סה"כ משימות
  - משימות שהושלמו
  - אחוז השלמה
  - Story Points
  - Velocity

---

## 📊 Sprint Board

### תצוגת הספרינט הפעיל

```
┌────────────────────────────────────────────────┐
│ Sprint 12: Calendar Integration    [פתח]      │
│ 5 ימים נותרו מתוך 14                          │
├────────────────────────────────────────────────┤
│ 🎯 מטרה: Complete Google & Outlook sync      │
├────────────────────────────────────────────────┤
│ תאריך התחלה: 20.02.2026                       │
│ תאריך סיום: 05.03.2026                        │
│ ימים נותרו: 5                                 │
└────────────────────────────────────────────────┘
```

### מדדי התקדמות

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 11           │ 5            │ 45%          │ 32/80        │
│ סה"כ משימות  │ הושלמו       │ שיעור השלמה  │ Story Points │
└──────────────┴──────────────┴──────────────┴──────────────┘

התקדמות: ████████░░░░░░░░ 45%
```

---

## 🔄 תהליך עבודה

### 1. Sprint Planning
```
1. צור ספרינט חדש
   ↓
2. הגדר מטרה
   ↓
3. הוסף משימות מהקנבאן
   ↓
4. הגדר Story Points
   ↓
5. התחל ספרינט
```

### 2. Sprint Execution
```
1. עבוד על משימות
   ↓
2. העבר בין עמודות בקנבאן
   ↓
3. עדכן Story Points בפועל
   ↓
4. הוסף תגובות
   ↓
5. מעקב אחר התקדמות
```

### 3. Sprint Completion
```
1. סיים את כל המשימות
   ↓
2. סיים ספרינט
   ↓
3. משימות שלא הושלמו עוברות ל-Backlog
   ↓
4. חישוב Velocity
   ↓
5. Sprint Retrospective
```

---

## 🎨 UI/UX

### דף הספרינטים
- **ספרינט פעיל מודגש** - גרדיאנט כחול-סגול
- **סינון מהיר** - כפתורים עם מונים
- **כרטיסי ספרינטים** - מידע מרוכז
- **יצירה מהירה** - כפתור + בולט

### דף ספרינט בודד
- **Header עם פעולות** - התחל/סיים ספרינט
- **מטרה בולטת** - רקע מיוחד
- **מדדים ויזואליים** - KPI cards
- **Progress bar** - גרדיאנט כחול-ירוק
- **טאבים** - לוח/מדדים/פעילות

---

## 📈 Metrics & Analytics

### Sprint Metrics
```typescript
{
  totalTasks: 11,
  completedTasks: 5,
  completionRate: 45,
  totalPoints: 80,
  completedPoints: 32,
  pointsCompletionRate: 40
}
```

### Velocity Calculation
```
Velocity = סה"כ Story Points שהושלמו / מספר ספרינטים
```

### Burndown Chart (בקרוב)
```
Story Points
     │
  80 │●
     │ ●
  60 │  ●
     │   ●
  40 │    ●
     │     ●
  20 │      ●
     │       ●
   0 └────────────────────
     Day 1  5   10   14
```

---

## 🔗 אינטגרציה עם Kanban

### סנכרון דו-כיווני
- **משימה בספרינט** → מסומנת בקנבאן
- **משימה עוברת ל-Done** → מתעדכן בספרינט
- **משימה נמחקת** → מוסרת מהספרינט

### Story Points
- מוגדרים בספרינט
- מוצגים בכרטיס המשימה
- משמשים לחישוב Velocity

---

## 🎯 Best Practices

### Sprint Planning
- ✅ הגדר מטרה ברורה
- ✅ הוסף רק משימות שניתן להשלים
- ✅ הגדר Story Points לכל משימה
- ✅ אל תעמיס יותר מדי

### Sprint Execution
- ✅ עדכן סטטוס יומי
- ✅ הוסף תגובות למשימות
- ✅ עקוב אחר ה-Burndown
- ✅ תקשר עם הצוות

### Sprint Completion
- ✅ סיים רק כשהכל מוכן
- ✅ תעד מה למדת (Retrospective)
- ✅ חשב Velocity
- ✅ תכנן את הספרינט הבא

---

## 🚧 תכונות עתידיות

### Phase 1 (הושלם)
- [x] יצירת ספרינטים
- [x] הוספת משימות
- [x] מדדי התקדמות
- [x] התחלה/סיום ספרינט

### Phase 2 (בפיתוח)
- [ ] Burndown Chart
- [ ] Sprint Retrospective
- [ ] Velocity Tracking
- [ ] Sprint Templates

### Phase 3 (מתוכנן)
- [ ] Sprint Goals Tracking
- [ ] Team Capacity Planning
- [ ] Sprint Comparison
- [ ] Advanced Analytics

---

## 🐛 Troubleshooting

### הספרינטים לא נטענים?
```bash
# צור את הטבלאות
curl -X POST http://localhost:3006/api/health/create-sprint-tables
```

### לא מצליח להוסיף משימה?
- ודא שהמשימה קיימת בקנבאן
- בדוק שהמשימה לא כבר בספרינט אחר

### המדדים לא מתעדכנים?
- רענן את הדף
- בדוק שהמשימות מסומנות כ-Done

---

## 📝 דוגמאות שימוש

### יצירת ספרינט
```typescript
const sprint = await apiFetch('/admin/sprints', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Sprint 12: Calendar Integration',
    goal: 'Complete Google and Outlook calendar sync',
    startDate: '2026-02-20',
    endDate: '2026-03-05',
  }),
});
```

### הוספת משימה לספרינט
```typescript
await apiFetch(`/admin/sprints/${sprintId}/tasks`, {
  method: 'POST',
  body: JSON.stringify({
    taskId: 'task-id-here',
    storyPoints: 5,
  }),
});
```

### התחלת ספרינט
```typescript
await apiFetch(`/admin/sprints/${sprintId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    status: 'active',
  }),
});
```

---

## 🎉 סיכום

**מערכת ניהול ספרינטים מלאה בסגנון JIRA!** 🚀

עכשיו יש לך:
- ✅ יצירת וניהול ספרינטים
- ✅ הוספת משימות עם Story Points
- ✅ מעקב התקדמות בזמן אמת
- ✅ מדדים ו-Analytics
- ✅ אינטגרציה מלאה עם Kanban
- ✅ יומן פעילות

**הבא: Burndown Charts & Sprint Retrospective! 📊**
