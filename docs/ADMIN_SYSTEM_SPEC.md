# MemorAid — Admin System Specification (טיוטה)

> **מסמך אפיון מערכת ניהול פלטפורמה — CRM Hub**  
> גרסה: טיוטה  
> תאריך: פברואר 2026

---

## 1. חזון ומטרה

מערכת Admin רחבה לניהול פלטפורמת MemorAid, לצוות פנימי בלבד. כל קטגוריה ראשית מכילה תת-דפים — "בכל דף יש עולם" — עם פונקציונליות מלאה ומעמיקה.

### עקרונות עיצוב
- **תפריט היררכי צד ימין** — קטגוריות שניתן לפתוח/לסגור (accordion/collapsible)
- **RTL מלא** — עברית, כיוון ימין-לשמאל
- **Dark theme** — בהתאם לדוגמת CRM Hub
- **גישה פנימית** — IP whitelist / VPN, ללא חשיפה ללקוחות

---

## 2. מפת דפים מלאה — Admin

### קטגוריה 1: ניהול מערכת (System Management)

| # | שם הדף | Route | תיאור |
|---|--------|-------|-------|
| 1 | לוח בקרה | `/admin` | KPI, מגמות צמיחה, התפלגויות |
| 2 | משפחות | `/admin/families` | רשימת משפחות, חיפוש, סינון |
| 3 | פרטי משפחה | `/admin/families/:id` | חברים, מטופלים, מנוי, impersonate |
| 4 | משתמשים | `/admin/users` | רשימת משתמשים, חיפוש |
| 5 | פרטי משתמש | `/admin/users/:id` | משפחות, פעילות, impersonate |
| 6 | לוגים | `/admin/logs` | לוג מערכת, שגיאות, אירועים |
| 7 | מרכז נתונים | `/admin/data-center` | ייצוא, גיבוי, סטטיסטיקות DB |

### קטגוריה 2: תמיכה ושירות (Support & Service)

| # | שם הדף | Route | תיאור |
|---|--------|-------|-------|
| 8 | מרכז תמיכה | `/admin/support` | פניות לקוחות, תגובות |
| 9 | חיפוש לקוחות | `/admin/support/search` | חיפוש משתמש/משפחה לצורך תמיכה |
| 10 | פעולות מזורזות | `/admin/support/actions` | איפוס סיסמא, הפעלת משתמש, וכו' |

### קטגוריה 3: תקשורת (Communication)

| # | שם הדף | Route | תיאור |
|---|--------|-------|-------|
| 11 | מרכז תקשורת | `/admin/communication` | שליחת הודעות/התראות ללקוחות |
| 12 | AI ואינטגרציות | `/admin/ai` | הגדרות AI, מכסות, סטטוס |
| 13 | אסטרטגיות | `/admin/strategies` | תבניות, workflows |

### קטגוריה 4: תוכן ועמודים (Content & Pages)

| # | שם הדף | Route | תיאור |
|---|--------|-------|-------|
| 14 | CMS | `/admin/content/cms` | ניהול תוכן אתר |
| 15 | ספריית תוכן | `/admin/content/library` | קבצי מדיה, תבניות |
| 16 | עמודים | `/admin/content/pages` | דפים סטטיים, landing |
| 17 | מרחבי שמות | `/admin/content/namespaces` | ניהול i18n, תרגומים |

### קטגוריה 5: מכירות ו-CRM (Sales & CRM)

| # | שם הדף | Route | תיאור |
|---|--------|-------|-------|
| 18 | דוחות ואנליטיקה | `/admin/sales/reports` | דוחות מכירות, המרות |
| 19 | מנויים | `/admin/sales/subscriptions` | Stripe, plans, ביטולים |
| 20 | פיננסים | `/admin/sales/finance` | הכנסות, הוצאות, OKR |

### קטגוריה 6: בדיקות ו-QA (Testing & QA)

| # | שם הדף | Route | תיאור |
|---|--------|-------|-------|
| 21 | QA חדר בקרה | `/admin/qa/control` | סטטוס בדיקות, bugs |
| 22 | ריצות בדיקות | `/admin/qa/runs` | תוצאות E2E, unit |
| 23 | Feature Flags | `/admin/qa/flags` | סוויצ'ים, A/B |
| 24 | **גרסאות** | `/admin/qa/versions` | ניהול גרסאות קוד/אפליקציה |
| 25 | כיסוי קוד | `/admin/qa/coverage` | Code coverage |
| 26 | איכות נתונים | `/admin/qa/data-quality` | ולידציות, תיקונים |
| 27 | שגיאות | `/admin/qa/errors` | Error tracking, stack traces |

### קטגוריה 7: הגדרות מתקדמות (Advanced Settings)

| # | שם הדף | Route | תיאור |
|---|--------|-------|-------|
| 28 | יומן ביקורת | `/admin/settings/audit` | Audit log מלא |
| 29 | שכבת ניהול | `/admin/settings/layer` | Admins, הרשאות |
| 30 | אישור שינויים | `/admin/settings/approval` | Change approval workflows |
| 31 | תוכנית עבודה | `/admin/settings/work-plan` | Roadmap, משימות פיתוח |
| 32 | OKR | `/admin/settings/okr` | יעדים, מדידות |
| 33 | מתכנן אוטומטי | `/admin/settings/planner` | אוטומציות |

**סה"כ: 33 דפי Admin**

---

## 3. מבנה התפריט הצדדי (UI)

```
┌─────────────────────────────────────┐
│  MemorAid - CRM Hub                 │
│  מרכז ניהול מערכת                   │
├─────────────────────────────────────┤
│  ▼ ניהול מערכת                      │
│      לוח בקרה                        │
│      משפחות                          │
│      משתמשים                         │
│      לוגים                           │
│      מרכז נתונים                     │
│  ▼ תמיכה & שירות                    │
│      מרכז תמיכה                      │
│      חיפוש לקוחות                    │
│      פעולות מזורזות                  │
│  ▼ תקשורת                           │
│      מרכז תקשורת                    │
│      AI & אינטגרציות                 │
│      אסטרטגיות                       │
│  ▼ תוכן & עמודים                   │
│      CMS                             │
│      ספריית תוכן                     │
│      עמודים                          │
│      מרחבי שמות                      │
│  ▼ מכירות & CRM                    │
│      דוחות & אנליטיקה               │
│      מנויים                           │
│      פיננסים                          │
│  ▼ בדיקות & QA                     │
│      QA חדר בקרה                     │
│      ריצות בדיקות                    │
│      Feature Flags                   │
│      גרסאות                          │
│      כיסוי קוד                       │
│      איכות נתונים                    │
│      שגיאות                          │
│  ▼ הגדרות מתקדמות                  │
│      יומן ביקורת                     │
│      שכבת ניהול                      │
│      אישור שינויים                   │
│      תוכנית עבודה                    │
│      OKR                              │
│      מתכנן אוטומטי                   │
├─────────────────────────────────────┤
│  התנתקות מהמערכת                   │
└─────────────────────────────────────┘
```

---

## 4. לוח הבקרה (Dashboard) — פירוט

### כרטיסי KPI (שורה עליונה)
| מדד | מקור נתונים | תיאור |
|-----|-------------|-------|
| פעילים היום | sessions / last_login | משתמשים שהתחברו היום |
| מדדים | (עתידי) | מדדים רפואיים שהוזנו |
| משימות | tasks | סה"כ משימות במערכת |
| תרופות | (עתידי) | תרופות במעקב |
| מטופלים | patients | סה"כ מטופלים |
| משתמשים | users | סה"כ משתמשים |
| משפחות | families | סה"כ משפחות |

### גרף מגמות צמיחה (30 יום)
- ציר X: תאריכים
- ציר Y: כמות
- 3 סדרות: משתמשים חדשים, משפחות חדשות, מטופלים חדשים

### התפלגות משימות לפי סטטוס
- Pie chart: scheduled, todo, in_progress, stuck, postponed, cancelled, done

### התפלגות משתמשים לפי תפקיד
- Pie chart: manager, caregiver, viewer, guest

### טאבים משניים
אנליטיקס | משתמשים | משפחות | משימות | ביקורת | שגיאות | איכות | ייצוא | הגדרות

---

## 5. סכמת מסד נתונים — Admin

### טבלאות חדשות

```
admin_users
├── id (PK)
├── email (UNIQUE)
├── password_hash
├── full_name
├── role: super_admin | support
├── is_active
├── last_login_at
└── created_at

admin_sessions
├── id (PK, token)
├── admin_user_id (FK)
├── expires_at
└── created_at

audit_log (יומן ביקורת)
├── id (PK)
├── admin_user_id (nullable)
├── user_id (nullable) — משתמש רגיל שהושפע
├── action: login | impersonate | user_edit | family_edit | ...
├── entity_type: user | family | patient | ...
├── entity_id (uuid)
├── old_value (jsonb)
├── new_value (jsonb)
├── ip_address
└── created_at

feature_flags (אופציונלי)
├── id (PK)
├── key (UNIQUE)
├── enabled (boolean)
├── description
└── updated_at

app_versions (גרסאות)
├── id (PK)
├── version (e.g. "1.2.3")
├── platform: web | ios | android
├── release_notes (text)
├── released_at
└── created_at
```

---

## 6. API Endpoints — Admin

כל הנתיבים תחת prefix `/api/admin/*`, דורשים `requireAdmin`.

### Auth
```
POST   /api/admin/auth/login
POST   /api/admin/auth/logout
GET    /api/admin/auth/me
```

### משפחות
```
GET    /api/admin/families?search=&page=&limit=
GET    /api/admin/families/:id
PATCH  /api/admin/families/:id
```

### משתמשים
```
GET    /api/admin/users?search=&page=&limit=
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
POST   /api/admin/users/:id/impersonate   → מחזיר session רגיל (super_admin)
```

### לוח בקרה
```
GET    /api/admin/stats
GET    /api/admin/stats/growth?days=30
GET    /api/admin/stats/tasks-by-status
GET    /api/admin/stats/users-by-role
```

### לוגים וביקורת
```
GET    /api/admin/logs?from=&to=&level=
GET    /api/admin/audit?from=&to=&action=
```

### מנויים (Stripe)
```
GET    /api/admin/subscriptions
GET    /api/admin/subscriptions/:familyId
PATCH  /api/admin/subscriptions/:familyId
```

### גרסאות
```
GET    /api/admin/versions
POST   /api/admin/versions
PATCH  /api/admin/versions/:id
```

### Feature Flags
```
GET    /api/admin/feature-flags
PATCH  /api/admin/feature-flags/:key
```

---

## 7. הרשאות Admin

| Role | משפחות | משתמשים | Impersonate | לוגים | גרסאות | פיננסים | הגדרות |
|------|--------|---------|-------------|-------|--------|---------|--------|
| super_admin | R/W | R/W | כן | R | R/W | R/W | R/W |
| support | R | R | לא | R | R | R | לא |

---

## 8. עיצוב ו-RTL

### ערכים
- **Primary:** #1E3A5F (כחול כהה)
- **Accent:** #27AE60 (ירוק)
- **Background (dark):** #0f172a / #1e293b
- **Sidebar:** רקע בהיר-סגול/כחול (כמו בדוגמה)

### רכיבים
- Sidebar: `position: fixed`, `right: 0` (RTL)
- Main content: `margin-right` ל-sidebar
- Collapsible: אייקון חץ שמסתובב ב-open/close
- כרטיסי KPI: `display: grid`, responsive

### גופנים
- עברית: Rubik
- אנגלית: Inter

---

## 9. סדר פיתוח מומלץ (Phases)

### Phase 1 — Core (4–6 שבועות)
- admin_users, admin_sessions
- Admin Auth (login, requireAdmin)
- לוח בקרה + Stats API
- דפים: Dashboard, Families, Users
- Impersonation

### Phase 2 — תמיכה ולוגים (2–3 שבועות)
- audit_log
- דפים: Logs, Support search, Support actions

### Phase 3 — מנויים ופיננסים (2–3 שבועות)
- אינטגרציה Stripe Admin
- דפים: Subscriptions, Finance/Reports

### Phase 4 — QA וגרסאות (2–3 שבועות)
- app_versions, feature_flags
- דפים: Versions, Feature Flags, Errors

### Phase 5 — תוכן והגדרות (3+ שבועות)
- CMS, Content, Settings
- לפי צורך עסקי

---

## 10. שאלות פתוחות

1. **תמיכה** — האם יש טבלת פניות/תיקיות או רק חיפוש משתמשים?
2. **גרסאות** — גרסאות קוד (Git tags) או גרסאות אפליקציה (App Store / web deploy)?
3. **פיננסים** — מקור: Stripe בלבד או גם רישום ידני?
4. **AI** — אילו הגדרות נדרשות (מכסות, מודלים)?
5. **CMS** — אילו עמודים נדרשים לעריכה (Landing, FAQ, וכו')?

---

*MemorAid Admin System Spec | Draft | February 2026*
