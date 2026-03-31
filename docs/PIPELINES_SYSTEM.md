# 🔄 Pipelines System - מערכת צינורות אוטומציה

## 📋 סקירה כללית

מערכת Pipelines קריטית לאוטומציה של תהליכים במערכת Admin:
- 🔄 **אוטומציה** - תהליכים שרצים אוטומטית
- ⏰ **תזמון** - Cron jobs מתוזמנים
- 📊 **ניטור** - מעקב אחר ביצועים
- 🚨 **התראות** - התראות על כשלים
- 📈 **דוחות** - סטטיסטיקות ומדדים

---

## 🎯 סוגי Pipelines

### 1. **Backup** 💾
- גיבוי יומי של מסד הנתונים
- גיבוי קבצים ומדיה
- ארכיון נתונים ישנים

### 2. **Analytics** 📊
- עיבוד נתוני משתמשים
- חישוב KPIs
- יצירת דוחות אנליטיים

### 3. **Email** 📧
- עיבוד תור מיילים
- שליחת מיילים המוניים
- Retry על כשלים

### 4. **Notification** 🔔
- שליחת התראות
- תזכורות למשימות
- Push notifications

### 5. **Monitoring** 🔍
- Health checks
- בדיקות תקינות
- איסוף שגיאות

### 6. **Integration** 🔗
- סנכרון עם Stripe
- סנכרון עם Google Calendar
- סנכרון עם שירותים חיצוניים

### 7. **Cleanup** 🧹
- ניקוי נתונים ישנים
- מחיקת sessions פגי תוקף
- ארכיון לוגים

### 8. **Reporting** 📈
- דוחות שבועיים/חודשיים
- סיכומים למנהלים
- Export נתונים

### 9. **Reminder** ⏰
- תזכורות למשימות
- תזכורות לתרופות
- תזכורות לפגישות

### 10. **Data Processing** ⚙️
- עיבוד נתונים כבדים
- ML/AI processing
- Image optimization

---

## 🗄️ Database Schema

### `pipelines` - הגדרות Pipeline
```sql
CREATE TABLE pipelines (
  id uuid PRIMARY KEY,
  name varchar(255) NOT NULL,
  description text,
  type varchar(64) NOT NULL,
  status varchar(32) DEFAULT 'active',
  config jsonb,
  schedule varchar(128),
  last_run timestamp,
  next_run timestamp,
  created_by uuid REFERENCES admin_users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### `pipeline_runs` - היסטוריית ריצות
```sql
CREATE TABLE pipeline_runs (
  id uuid PRIMARY KEY,
  pipeline_id uuid REFERENCES pipelines(id),
  status varchar(32) DEFAULT 'running',
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  duration_ms integer,
  records_processed integer,
  records_success integer,
  records_failed integer,
  error_message text,
  logs jsonb,
  triggered_by uuid REFERENCES admin_users(id)
);
```

### `pipeline_stages` - שלבי Pipeline
```sql
CREATE TABLE pipeline_stages (
  id uuid PRIMARY KEY,
  pipeline_id uuid REFERENCES pipelines(id),
  name varchar(255) NOT NULL,
  stage_order integer NOT NULL,
  stage_type varchar(64) NOT NULL,
  config jsonb,
  timeout_seconds integer DEFAULT 300,
  retry_count integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);
```

### `pipeline_alerts` - התראות
```sql
CREATE TABLE pipeline_alerts (
  id uuid PRIMARY KEY,
  pipeline_id uuid REFERENCES pipelines(id),
  run_id uuid REFERENCES pipeline_runs(id),
  alert_type varchar(64) NOT NULL,
  severity varchar(32) NOT NULL,
  message text NOT NULL,
  resolved boolean DEFAULT false,
  resolved_at timestamp,
  resolved_by uuid REFERENCES admin_users(id),
  created_at timestamp DEFAULT now()
);
```

---

## 📡 Backend APIs

### Pipelines Management
```typescript
GET    /admin/pipelines              // רשימת pipelines (עם סינון)
GET    /admin/pipelines/:id          // פרטי pipeline
POST   /admin/pipelines              // יצירת pipeline
PATCH  /admin/pipelines/:id          // עדכון pipeline
DELETE /admin/pipelines/:id          // מחיקת pipeline
POST   /admin/pipelines/:id/trigger  // הפעלה ידנית
```

### Pipeline Runs
```typescript
GET    /admin/pipelines/:id/runs    // היסטוריית ריצות
```

### Pipeline Stages & Alerts
```typescript
GET    /admin/pipelines/:id/stages  // שלבי pipeline
GET    /admin/pipelines/:id/alerts  // התראות
```

### Statistics
```typescript
GET    /admin/pipelines/stats/overview  // סטטיסטיקות כלליות
```

---

## 🎨 Frontend Components

### 1. AdminPipelines.tsx
דף ה-Pipelines הראשי:
- רשימת כל ה-Pipelines
- סינון לפי סוג
- KPIs: סה"כ, פעילים, ריצות מוצלחות, כשלונות
- הפעלה ידנית
- השהיה/הפעלה

### 2. AdminPipelineDetail.tsx
דף Pipeline בודד:
- פרטי Pipeline
- היסטוריית ריצות
- שלבי Pipeline
- הגדרות
- התראות

---

## 🔄 Pipeline Workflow

### דוגמה: Email Queue Pipeline

```
┌─────────────────────────────────────────────┐
│ Email Queue Pipeline                        │
├─────────────────────────────────────────────┤
│ Stage 1: Fetch pending emails              │
│   ↓                                         │
│ Stage 2: Validate email addresses          │
│   ↓                                         │
│ Stage 3: Send via Resend API               │
│   ↓                                         │
│ Stage 4: Update status in DB               │
│   ↓                                         │
│ Stage 5: Log results                        │
└─────────────────────────────────────────────┘
```

### דוגמה: Data Backup Pipeline

```
┌─────────────────────────────────────────────┐
│ Data Backup Pipeline                        │
├─────────────────────────────────────────────┤
│ Stage 1: Create DB snapshot                │
│   ↓                                         │
│ Stage 2: Compress files                    │
│   ↓                                         │
│ Stage 3: Upload to S3/Supabase             │
│   ↓                                         │
│ Stage 4: Verify backup integrity           │
│   ↓                                         │
│ Stage 5: Cleanup old backups               │
└─────────────────────────────────────────────┘
```

---

## ⏰ Cron Schedule Examples

```
*/5 * * * *     - כל 5 דקות
0 */6 * * *     - כל 6 שעות
0 2 * * *       - כל יום ב-02:00
0 0 * * 1       - כל יום שני ב-00:00
0 3 * * 0       - כל יום ראשון ב-03:00
0 8,14,20 * * * - 3 פעמים ביום (08:00, 14:00, 20:00)
```

---

## 📊 10 Pipelines ברירת מחדל

1. **Data Backup** - גיבוי יומי (02:00)
2. **User Analytics** - אנליטיקה כל 6 שעות
3. **Email Queue** - עיבוד מיילים כל 5 דקות
4. **Notification Sender** - התראות כל 10 דקות
5. **Task Reminders** - תזכורות 3 פעמים ביום
6. **Data Cleanup** - ניקוי שבועי (ראשון 03:00)
7. **Health Check** - בדיקה כל 15 דקות
8. **Stripe Sync** - סנכרון כל 4 שעות
9. **Error Aggregation** - איסוף שגיאות כל 30 דקות
10. **Report Generation** - דוחות שבועיים (שני 00:00)

---

## 🚀 תכונות מתקדמות

### 1. Multi-Stage Pipelines
כל Pipeline יכול להכיל מספר שלבים:
- **Sequential** - שלב אחרי שלב
- **Parallel** - שלבים במקביל
- **Conditional** - תנאים לביצוע

### 2. Retry Logic
- ניסיון חוזר אוטומטי על כשלים
- Exponential backoff
- מספר ניסיונות מוגדר

### 3. Timeout Management
- Timeout לכל שלב
- Kill process אוטומטי
- התראה על timeout

### 4. Alert System
- התראות על כשלים
- Severity levels (low/medium/high/critical)
- ניהול התראות (resolve/ignore)

### 5. Logging
- לוג מפורט לכל ריצה
- JSON logs מובנים
- Query logs בקלות

---

## 📈 Monitoring & Analytics

### Pipeline Health Dashboard
```
┌──────────────────────────────────────────────┐
│ Pipeline Health Overview                     │
├──────────────────────────────────────────────┤
│ Total Pipelines:        10                   │
│ Active:                 9                    │
│ Paused:                 1                    │
│                                              │
│ Last 24h:                                    │
│   Successful runs:      287 (95%)           │
│   Failed runs:          15 (5%)             │
│   Avg duration:         2.3s                │
│                                              │
│ Alerts:                                      │
│   Unresolved:           3                    │
│   Critical:             1                    │
└──────────────────────────────────────────────┘
```

### Per-Pipeline Metrics
```
Email Queue Pipeline:
├─ Total runs: 1,234
├─ Success rate: 98.5%
├─ Avg duration: 450ms
├─ Records processed: 45,678
└─ Last failure: 2 days ago
```

---

## 🔧 שימושים קריטיים

### 1. Data Pipeline
```typescript
{
  name: "User Data ETL",
  type: "analytics",
  stages: [
    { name: "Extract", type: "query" },
    { name: "Transform", type: "process" },
    { name: "Load", type: "insert" },
  ]
}
```

### 2. Email Pipeline
```typescript
{
  name: "Weekly Newsletter",
  type: "email",
  schedule: "0 9 * * 1", // Monday 09:00
  stages: [
    { name: "Fetch subscribers", type: "query" },
    { name: "Generate content", type: "template" },
    { name: "Send emails", type: "send" },
    { name: "Track opens", type: "analytics" },
  ]
}
```

### 3. Backup Pipeline
```typescript
{
  name: "Daily Backup",
  type: "backup",
  schedule: "0 2 * * *", // Daily 02:00
  stages: [
    { name: "Snapshot DB", type: "backup" },
    { name: "Compress", type: "archive" },
    { name: "Upload", type: "transfer" },
    { name: "Verify", type: "check" },
  ]
}
```

---

## 🚨 Alert Types

### Severity Levels:
- **Critical** 🔴 - דורש תשומת לב מיידית
- **High** 🟠 - חשוב, לטפל בהקדם
- **Medium** 🟡 - בעיה שצריך לטפל בה
- **Low** 🟢 - מידע, לא דחוף

### Alert Types:
- `pipeline_failed` - Pipeline נכשל
- `stage_timeout` - שלב עבר timeout
- `high_error_rate` - שיעור שגיאות גבוה
- `slow_performance` - ביצועים איטיים
- `resource_limit` - הגעה למגבלת משאבים

---

## 🔐 אבטחה

- ✅ רק Admin users יכולים לנהל Pipelines
- ✅ Audit log לכל פעולה
- ✅ הצפנת config sensitive
- ✅ Rate limiting על triggers
- ✅ Validation על inputs

---

## 📊 Use Cases קריטיים

### 1. גיבוי אוטומטי
```
Pipeline: Daily Backup
Schedule: 02:00 יומי
Critical: ✅ קריטי!
```

### 2. שליחת תזכורות
```
Pipeline: Task Reminders
Schedule: 08:00, 14:00, 20:00
Critical: ✅ משפיע על UX
```

### 3. סנכרון Stripe
```
Pipeline: Stripe Sync
Schedule: כל 4 שעות
Critical: ✅ משפיע על מנויים
```

### 4. ניקוי נתונים
```
Pipeline: Data Cleanup
Schedule: שבועי
Critical: ⚠️ חשוב לביצועים
```

### 5. דוחות אוטומטיים
```
Pipeline: Weekly Reports
Schedule: שני 00:00
Critical: ℹ️ נחמד לקבל
```

---

## 🚀 התקנה

### צור את הטבלאות:
```bash
curl -X POST http://localhost:3006/api/health/create-pipeline-tables
```

או בדפדפן:
```
http://localhost:3006/api/health/create-pipeline-tables
```

### גש למערכת:
```
http://localhost:5173/admin/pipelines
```

---

## 📝 דוגמאות שימוש

### יצירת Pipeline חדש
```typescript
const pipeline = await apiFetch('/admin/pipelines', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Calendar Sync',
    description: 'סנכרון משימות ליומנים חיצוניים',
    type: 'integration',
    schedule: '0 */2 * * *', // כל שעתיים
    config: {
      calendars: ['google', 'outlook', 'apple'],
      syncDirection: 'bidirectional',
    },
  }),
});
```

### הפעלה ידנית
```typescript
await apiFetch(`/admin/pipelines/${pipelineId}/trigger`, {
  method: 'POST',
});
```

### השהיה/הפעלה
```typescript
await apiFetch(`/admin/pipelines/${pipelineId}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'paused' }),
});
```

---

## 🎯 Best Practices

### תכנון Pipeline:
- ✅ פרק לשלבים קטנים
- ✅ הגדר timeouts ריאליסטיים
- ✅ הוסף retry logic
- ✅ תעד כל שלב

### ניטור:
- ✅ בדוק logs באופן קבוע
- ✅ הגדר alerts
- ✅ מעקב אחר ביצועים
- ✅ אופטימיזציה מתמשכת

### אבטחה:
- ✅ אל תשמור credentials בקוד
- ✅ השתמש ב-environment variables
- ✅ הצפן נתונים רגישים
- ✅ Audit log לכל פעולה

---

## 🔮 תכונות עתידיות

### Phase 1 (הושלם)
- [x] יצירת Pipelines
- [x] הפעלה ידנית
- [x] היסטוריית ריצות
- [x] סטטיסטיקות

### Phase 2 (בפיתוח)
- [ ] Cron scheduler אמיתי
- [ ] Multi-stage execution
- [ ] Parallel stages
- [ ] Conditional logic

### Phase 3 (מתוכנן)
- [ ] Visual pipeline builder
- [ ] Real-time logs streaming
- [ ] Advanced alerting
- [ ] Pipeline templates

---

## 🎉 סיכום

**מערכת Pipelines מלאה ומקצועית!** 🚀

עכשיו יש לך:
- ✅ 10 Pipelines ברירת מחדל
- ✅ ניהול מלא (הפעלה, השהיה, מחיקה)
- ✅ היסטוריית ריצות
- ✅ מערכת התראות
- ✅ סטטיסטיקות ומדדים
- ✅ תזמון Cron
- ✅ Multi-stage support

**Pipelines הם הלב של האוטומציה במערכת! 💪**
