# Dev Kanban System - מערכת קנבאן לפיתוח

## 📋 סקירה כללית

מערכת Kanban מתקדמת לניהול משימות פיתוח בסגנון JIRA, עם תמיכה מלאה ב:
- עמודות מותאמות אישית (Backlog, To Do, In Progress, QA, Support, Done)
- עריכה מלאה של כל שדות המשימה
- מערכת תגובות
- חיפוש וסינון מתקדם
- Drag & Drop בין עמודות
- שמירה מלאה ב-PostgreSQL (Supabase)

## 🗄️ Database Schema

### טבלאות

#### `dev_columns` - עמודות הקנבאן
```sql
CREATE TABLE dev_columns (
  id uuid PRIMARY KEY,
  name varchar(64) NOT NULL,
  position integer NOT NULL,
  color varchar(32),
  created_at timestamp DEFAULT now()
);
```

**עמודות ברירת מחדל:**
1. Backlog (slate)
2. To Do (blue)
3. In Progress (amber)
4. QA (purple)
5. Support (cyan)
6. Done (green)

#### `dev_tasks` - משימות פיתוח
```sql
CREATE TABLE dev_tasks (
  id uuid PRIMARY KEY,
  title varchar(255) NOT NULL,
  description text,
  column_id uuid REFERENCES dev_columns(id),
  priority varchar(16) DEFAULT 'medium',
  category varchar(64),
  assignee varchar(255),
  labels text[],
  estimate_hours integer,
  actual_hours integer,
  due_date timestamp,
  position integer NOT NULL,
  created_by uuid REFERENCES admin_users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

#### `dev_comments` - תגובות למשימות
```sql
CREATE TABLE dev_comments (
  id uuid PRIMARY KEY,
  task_id uuid REFERENCES dev_tasks(id) ON DELETE CASCADE,
  admin_user_id uuid REFERENCES admin_users(id),
  comment text NOT NULL,
  created_at timestamp DEFAULT now()
);
```

## 🚀 התקנה והרצה

### 1. הרצת המיגרציה
```bash
npm run migrate:dev-kanban
```

או באופן ידני:
```bash
node scripts/run-dev-kanban-migration.mjs
```

### 2. בדיקת הטבלאות
```bash
npm run db:studio
```

### 3. גישה למערכת
נווט ל: `http://localhost:5000/admin/dev/kanban`

## 📡 Backend APIs

### Columns Management

```typescript
GET    /admin/dev/columns              // רשימת עמודות
POST   /admin/dev/columns              // יצירת עמודה חדשה
PATCH  /admin/dev/columns/:id          // עדכון עמודה
DELETE /admin/dev/columns/:id          // מחיקת עמודה
POST   /admin/dev/columns/reorder      // סידור מחדש של עמודות
```

### Tasks Management

```typescript
GET    /admin/dev/tasks                // רשימת משימות (עם סינון)
POST   /admin/dev/tasks                // יצירת משימה חדשה
PATCH  /admin/dev/tasks/:id            // עדכון משימה
DELETE /admin/dev/tasks/:id            // מחיקת משימה
POST   /admin/dev/tasks/:id/move       // העברת משימה בין עמודות
```

**פרמטרי סינון ב-GET /admin/dev/tasks:**
- `columnId` - סינון לפי עמודה
- `category` - סינון לפי קטגוריה
- `priority` - סינון לפי עדיפות
- `assignee` - סינון לפי אחראי
- `search` - חיפוש חופשי בכותרת ותיאור

### Comments

```typescript
GET    /admin/dev/tasks/:id/comments   // רשימת תגובות למשימה
POST   /admin/dev/tasks/:id/comments   // הוספת תגובה
```

## 🎨 Frontend Components

### 1. AdminDevKanban.tsx
הקומפוננט הראשי של הקנבאן:
- טעינת עמודות ומשימות מה-API
- Drag & Drop בין עמודות
- חיפוש וסינון
- יצירת משימות חדשות
- ניהול עמודות

### 2. TaskEditModal.tsx
מודל עריכת משימה עם 3 טאבים:

**טאב פרטים:**
- כותרת
- תיאור
- עדיפות (Low/Medium/High)
- קטגוריה

**טאב תכנון:**
- אחראי (Assignee)
- תאריך יעד
- הערכת שעות
- שעות בפועל
- תגיות (Labels)

**טאב פעילות:**
- רשימת תגובות
- הוספת תגובה חדשה

### 3. ColumnManagement.tsx
ניהול עמודות:
- הוספת עמודה חדשה
- עריכת שם וצבע
- מחיקת עמודה
- סידור מחדש (Drag & Drop)

## 🎯 תכונות מרכזיות

### 1. Custom Columns
- הוספה, עריכה ומחיקה של עמודות
- 8 צבעים זמינים
- סידור מחדש עם Drag & Drop

### 2. Rich Task Editor
כל השדות ניתנים לעריכה:
- כותרת ותיאור
- עדיפות וקטגוריה
- אחראי ותאריך יעד
- הערכת שעות מול שעות בפועל
- תגיות מרובות

### 3. Comments System
- תגובות עם שם משתמש וזמן
- תמיכה בטקסט רב-שורות
- מיון לפי זמן (החדש ביותר למעלה)

### 4. Advanced Filters
- חיפוש חופשי בכותרת ותיאור
- סינון לפי קטגוריה
- סינון לפי עדיפות
- סינון לפי אחראי (דרך API)

### 5. Drag & Drop
- גרירה בין עמודות
- עדכון אוטומטי ב-DB
- אפקטים ויזואליים

## 📊 קטגוריות זמינות

- Email
- Calendar
- Admin
- Testing
- Optimization
- AI
- Mobile
- Security
- Performance

## 🎨 עדיפויות

- 🔴 **High** - משימות דחופות
- 🟡 **Medium** - משימות רגילות
- ⚪ **Low** - משימות בעדיפות נמוכה

## 🔐 אבטחה

- כל ה-APIs דורשים אימות Admin (`requireAdmin`)
- Foreign keys עם `ON DELETE CASCADE` לתגובות
- `ON DELETE SET NULL` למשימות (שמירת היסטוריה)
- Indexes לביצועים מיטביים

## 📈 סטטיסטיקות

הדף מציג:
- סך כל המשימות
- פילוח לפי עדיפות (🔴/🟡/⚪)
- מספר משימות בכל עמודה

## 🛠️ Troubleshooting

### טבלאות לא קיימות
```bash
npm run migrate:dev-kanban
```

### שגיאת SSL (Supabase)
הסקריפט כבר מטפל ב-SSL עם `rejectUnauthorized: false`

### עמודות לא נטענות
בדוק ב-Drizzle Studio:
```bash
npm run db:studio
```

## 🚧 פיתוחים עתידיים

- [ ] Bulk operations (בחירה מרובה)
- [ ] Export/Import משימות
- [ ] Templates למשימות נפוצות
- [ ] Notifications על שינויים
- [ ] Activity log מפורט
- [ ] Time tracking מתקדם
- [ ] Sprint planning
- [ ] Burndown charts

## 📝 דוגמאות שימוש

### יצירת משימה חדשה
```typescript
const newTask = await apiFetch('/admin/dev/tasks', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Google Calendar Integration',
    description: 'Implement OAuth2 flow',
    columnId: 'todo-column-id',
    priority: 'high',
    category: 'calendar',
    assignee: 'John Doe',
    estimateHours: 8,
    dueDate: '2026-03-01',
  }),
});
```

### העברת משימה
```typescript
await apiFetch(`/admin/dev/tasks/${taskId}/move`, {
  method: 'POST',
  body: JSON.stringify({
    columnId: 'in-progress-column-id',
  }),
});
```

### הוספת תגובה
```typescript
await apiFetch(`/admin/dev/tasks/${taskId}/comments`, {
  method: 'POST',
  body: JSON.stringify({
    comment: 'Started working on this task',
  }),
});
```

## 🎉 סיכום

מערכת Kanban מלאה ומקצועית לניהול משימות פיתוח, עם:
- ✅ Database persistence מלא
- ✅ UI אינטואיטיבי ומהיר
- ✅ תמיכה בעמודות מותאמות
- ✅ עריכה מלאה של כל השדות
- ✅ מערכת תגובות
- ✅ חיפוש וסינון מתקדם
- ✅ Drag & Drop חלק

**הכל מוכן לשימוש!** 🚀
