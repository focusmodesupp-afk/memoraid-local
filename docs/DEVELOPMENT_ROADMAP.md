# MemorAid — תכנית פיתוח (Roadmap)

> **מסמך תכנון מחזורי** — MVP להיום, הרחבה לעתיד  
> מבוסס על: PRD Blueprint, Admin Blueprint (Replit), מצב הקוד הנוכחי  
> **הערה:** קובץ DOCX "Admin Platform - Complete Technical Blueprint" לא ניתן לקריאה מכלי זה.  
> מסמך זה משלב את הידע מהתמונות, PRD, ו-[docs/ADMIN_SYSTEM_SPEC.md](ADMIN_SYSTEM_SPEC.md).

---

## 1. תמצית המצב הנוכחי

### צד משתמשים (User App) — מה קיים היום

| דף | Route | סטטוס |
|----|-------|-------|
| Landing | `/` | קיים |
| Features, Pricing, Resources, About, Contact | `/features`, `/pricing`, וכו' | קיים |
| Login, Onboarding | `/login`, `/onboarding` | קיים |
| Dashboard | `/dashboard` | קיים (stub) |
| Patient | `/patient` | קיים |
| Tasks | `/tasks` | קיים (לא Kanban מלא) |
| Family | `/family` | קיים |
| Family Permissions | `/family/permissions` | קיים |
| Profile, Settings, Change Password | `/profile`, `/settings`, `/change-password` | קיים |
| Notifications | `/notifications` | קיים |

### מה חסר (לפי PRD מלא)

- Kanban Tasks מלא (7 עמודות, drag & drop, checklist, comments, attachments)
- Appointments (תורים וביקורים)
- Documents (מסמכים רפואיים + AI)
- Memory Stories
- Timeline
- Rights Center
- Contacts, Doctors, Hospitals
- Dashboard מלא (KPI אמיתיים)

### צד Admin — מה קיים היום

**אין.** אין Admin Panel. רק `manager` ברמת משפחה.

---

## 2. MVP להיום — מה בונים עכשיו

### עקרון: לזקק ל-MVP פונקציונלי בשני הצדדים

**צד משתמשים:** משפרים את מה שקיים, מוסיפים רק הכרחי.  
**צד Admin:** מתחילים מליבת הניהול — דשבורד, משפחות, משתמשים, impersonation.

---

### 2.1 צד משתמשים — MVP

| עדיפות | משימה | תיאור קצר |
|--------|-------|-----------|
| 1 | תיקון אבטחה | Auth ל-GET /family, GET /tasks, POST /tasks, GET /dashboard |
| 2 | Dashboard מלא יותר | KPI אמיתיים: משימות היום, מטופל ראשי, פעילות |
| 3 | Multi-family | Family switcher, activeFamilyId, הרשאות לפי משפחה |
| 4 | Kanban בסיסי | לפחות עמודות status, גרירה בסיסית |
| - | שאר הדפים | נשארים כפי שהם — לא דחוף |

**לא ב-MVP:** Appointments, Documents, Memory Stories, Timeline, Rights, Contacts/Doctors/Hospitals.

---

### 2.2 צד Admin — MVP

| עדיפות | משימה | תיאור קצר |
|--------|-------|-----------|
| 1 | Admin Auth | admin_users, admin_sessions, login, requireAdmin |
| 2 | Shell + תפריט | Admin SPA עם תפריט היררכי צד ימין (collapsible) |
| 3 | לוח בקרה | KPI: משפחות, משתמשים, מטופלים, משימות |
| 4 | משפחות | רשימה, חיפוש, פרטי משפחה |
| 5 | משתמשים | רשימה, חיפוש, פרטי משתמש |
| 6 | Impersonation | super_admin מתחזה למשתמש לצורך תמיכה |

**לא ב-MVP Admin:** לוגים, תמיכה, תקשורת, תוכן, מכירות, QA, גרסאות, הגדרות מתקדמות.

---

## 3. תלותיות — צד משתמשים מול Admin

```
┌─────────────────────────────────────────────────────────────────────────┐
│  צד משתמשים (User App)                    │  צד Admin                     │
├───────────────────────────────────────────┼──────────────────────────────┤
│  families, users, patients, tasks         │  Admin רואה אותם → משפחות,   │
│  notifications, family_members            │  משתמשים, מטופלים, משימות    │
│                                           │                               │
│  Appointments (עתידי)                     │  Admin יוכל לראות ביקורים    │
│  Documents (עתידי)                        │  Admin יראה מסמכים (read)    │
│  Subscriptions (Stripe)                   │  Admin → מנויים, פיננסים     │
└───────────────────────────────────────────┘
```

**כלל:** כל ישות בצד המשתמשים תהפוך ל"ניתנת לצפייה/ניהול" מצד Admin.  
לכן — מבנה ה-DB והמודלים בצד המשתמשים משפיעים ישירות על מה Admin יכול להציג ולערוך.

---

## 4. תכנית הרחבה עתידית — Phases

### Phase 0 — אבטחה ותשתית (1–2 שבועות)
- תיקון auth ל-endpoints חשופים
- הכנת מבנה Admin (תיקייה, routing)

### Phase 1 — Admin Core + User Polish (4–6 שבועות)

**User:**
- Family switcher, activeFamilyId
- Dashboard עם KPI אמיתיים
- Kanban בסיסי

**Admin:**
- admin_users, admin_sessions
- Admin shell + תפריט collapsible
- Dashboard Admin: KPI, מגמות
- משפחות, משתמשים, impersonation

### Phase 2 — User Features + Admin Support (6–8 שבועות)

**User:**
- Appointments (תורים וביקורים)
- Documents (upload, אולי AI)
- Kanban מלא

**Admin:**
- לוגים, audit_log
- חיפוש לקוחות (support)
- פעולות מזורזות (איפוס סיסמא, הפעלת משתמש)

### Phase 3 — מנויים ופיננסים (4–6 שבועות)

**User:**
- Stripe checkout, plans
- הגבלות לפי tier

**Admin:**
- מנויים (Stripe)
- דוחות פיננסיים בסיסיים

### Phase 4 — תוכן, תקשורת, QA (6+ שבועות)

**User:**
- Memory Stories
- Timeline
- Rights Center
- Contacts, Doctors, Hospitals

**Admin:**
- מרכז תמיכה
- תקשורת (שליחת הודעות)
- Feature Flags
- גרסאות (app_versions)

### Phase 5 — הרחבה מלאה (לפי Blueprint)

**Admin:** כל 33 הדפים לפי [ADMIN_SYSTEM_SPEC.md](ADMIN_SYSTEM_SPEC.md):
- תוכן & עמודים (CMS, ספרייה, עמודים)
- מכירות & CRM מלא
- בדיקות & QA (כיסוי, איכות נתונים, שגיאות)
- הגדרות מתקדמות (OKR, אישור שינויים, מתכנן)

---

## 5. שיקולים לפיתוח עתידי

### 5.1 ארכיטקטורת נתונים

- **כל ישות חדשה בצד User** — לחשוב מראש: האם Admin יצטרך גישה?
- **שדות רגישים** (id_number, וכו') — לוג ב-audit_logAdmin צופה/משנה.

### 5.2 APIs

- **RESTful consistent** — `/api/entities` ו-`/api/admin/entities` זהים מבחינת מבנה תגובה, Admin מוסיף endpoints לעריכה.
- **Pagination** — כל רשימה: `?page=&limit=` (חובה ל-Admin).

### 5.3 UI — Admin

- **תפריט דינמי** — הגדרת קטגוריות ב-config, הרשאות לפי role.
- **דפים ריקים (placeholders)** — אפשר להוסיף route עם "בהמשך" כבר ב-MVP, כדי שהתפריט יהיה מלא.

### 5.4 גרסאות (לעתיד)

- `app_versions` — גרסאות web/mobile.
- קישור ל-Git tags אם רלוונטי.
- Admin: יצירה, עריכת release notes.

### 5.5 פיננסים (לעתיד)

- מקור ראשי: Stripe.
- Admin: צפייה במנויים, דוחות הכנסות, OKR אם נדרש.

---

## 6. טבלת תזכורת — User vs Admin

| ישות | User Routes | Admin Routes |
|------|-------------|--------------|
| משפחות | `/family` (המשפחה שלי) | `/admin/families`, `/admin/families/:id` |
| משתמשים | פרופיל עצמי | `/admin/users`, `/admin/users/:id` |
| מטופלים | `/patient` | דרך פרטי משפחה |
| משימות | `/tasks` | דרך Dashboard / משפחה |
| התראות | `/notifications` | (עתידי) שליחה ממרכז תקשורת |
| מנויים | checkout | `/admin/subscriptions` |

---

## 7. המלצה לסדר עבודה

1. **עכשיו:** Phase 0 + Phase 1 — אבטחה, Admin Core, User Polish.
2. **אחר כך:** Phase 2 — User features (Appointments, Documents) + Admin Support.
3. **בהמשך:** Phase 3–5 לפי עדיפות עסקית.

---

## 8. עדכון מה-Blueprint המלא (DOCX)

כשיהיה אפשר לגשת לתוכן ה-DOCX (ייצוא ל-MD או העתקה):

- לעדכן מפת הדפים אם יש הבדלים
- להוסיף פירוט טכני אם חסר
- לסנכרן מונחים ושמות עם Blueprint המלא

---

*MemorAid Development Roadmap | מבוסס PRD + Admin Spec | פברואר 2026*
