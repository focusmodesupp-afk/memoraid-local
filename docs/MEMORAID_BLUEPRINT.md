# MemorAId – BLUEPRINT מלא

> גרסה: 1.0 | תאריך: פברואר 2026 | סטטוס: Production-Ready
> מסמך זה הוא המקור היחיד לאמת (Single Source of Truth) של כל מערכת MemorAId.

---

## תוכן עניינים

1. [חזון ומשימה](#1-חזון-ומשימה)
2. [ארכיטקטורה כללית](#2-ארכיטקטורה-כללית)
3. [PRD – מסמך דרישות מוצר](#3-prd--מסמך-דרישות-מוצר)
4. [ERD – מבנה מסד הנתונים](#4-erd--מבנה-מסד-הנתונים)
5. [צד משתמש – User App](#5-צד-משתמש--user-app)
6. [צד אדמין – Admin App](#6-צד-אדמין--admin-app)
7. [API Reference מלא](#7-api-reference-מלא)
8. [AI ואוטומציות](#8-ai-ואוטומציות)
9. [אבטחה וסייבר](#9-אבטחה-וסייבר)
10. [UX/UI ועיצוב](#10-uxui-ועיצוב)
11. [אינטגרציות](#11-אינטגרציות)
12. [מיילים ותקשורת](#12-מיילים-ותקשורת)
13. [חוקיות ופרטיות](#13-חוקיות-ופרטיות)
14. [Copy ו-Microcopy](#14-copy-ו-microcopy)
15. [סביבה ותשתית](#15-סביבה-ותשתית)
16. [מפת דרכים עתידית](#16-מפת-דרכים-עתידית)

---

## 1. חזון ומשימה

### 1.1 הצהרת חזון
MemorAId היא הפלטפורמה המשפחתית המובילה לניהול טיפול בחולי דמנציה ואלצהיימר בישראל.
המערכת הופכת את הכאוס המשפחתי, המידע המפוזר, ומתחים הטיפול – לסדר, שקיפות ושקט נפשי.

### 1.2 הצהרת משימה
"כשדמנציה נכנסת למשפחה – לא צריך להתמודד לבד."
אנחנו מספקים למשפחות כלי ניהול רפואי, תיאום צוות טיפול, ומעקב קוגניטיבי חכם – הכל במקום אחד.

### 1.3 ערכי ליבה
- **שקיפות משפחתית** – כל בני המשפחה רואים, יודעים, שותפים
- **ממשק אנושי** – פשוט מספיק לאמא ולאבא, מלא מספיק לרופא
- **AI בשירות האנושי** – טכנולוגיה שמגיעה לך, לא הפוך
- **פרטיות ואבטחה** – מידע רפואי = קודש

### 1.4 קהל יעד
| סגמנט | תיאור |
|-------|--------|
| **מנהל משפחה** | בן/בת משפחה מרכזי שמתאם את כל הטיפול |
| **מטפל יומי** | בן משפחה שמבצע משימות טיפוליות |
| **צופה** | בן משפחה מרוחק שרוצה להישאר מעודכן |
| **רופא/מטפל מקצועי** | נגישות לסיכום רפואי מסודר |

### 1.5 שלבי מסע הטיפול (Care Journey)
1. **מודעות גנטית** – סיכון משפחתי, אין אבחנה עדיין
2. **חשד** – תסמינים ראשונים, בדיקות ראשוניות
3. **גשר** – אבחנה חלקית, מעקב אינטנסיבי
4. **ודאות** – אבחנה מאושרת, ניהול כרוני

---

## 2. ארכיטקטורה כללית

### 2.1 Stack טכנולוגי

| שכבה | טכנולוגיה | גרסה |
|------|-----------|-------|
| Frontend | React + TypeScript | 18.x |
| Routing (Client) | Wouter | 3.x |
| State | React Context + TanStack Query | 5.x |
| Styling | Tailwind CSS | 3.x |
| Charts | Recharts | 2.x |
| Build Tool | Vite | 5.x |
| Backend | Node.js + Express | 4.x |
| Language (Server) | TypeScript via TSX | 5.x |
| ORM | Drizzle ORM | 0.30 |
| Database | PostgreSQL (Supabase) | 15+ |
| File Storage | Local encrypted filesystem | - |
| Auth | Cookie-based sessions (bcrypt) | - |
| AI – Primary | Anthropic Claude Sonnet 4.6 | API |
| AI – Fallback | OpenAI GPT-4o | API |
| AI – Fallback 2 | Google Gemini 2.5 Flash | API |
| Payments | Stripe | 2023-10-16 |
| Email | Resend | - |
| Calendar | Google Calendar API | v3 |

### 2.2 מפת ארכיטקטורה

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER / CLIENT                        │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │   USER APP           │  │   ADMIN APP              │   │
│  │   /login, /dashboard │  │   /admin/*, /admin/login │   │
│  │   React + Wouter     │  │   React + Wouter (dark)  │   │
│  │   AuthContext        │  │   AdminAuthContext        │   │
│  └──────────┬───────────┘  └────────────┬─────────────┘   │
│             │ apiFetch (credentials:include)│               │
└─────────────┼──────────────────────────────┼───────────────┘
              │ HTTP + Cookie                │
┌─────────────▼──────────────────────────────▼───────────────┐
│                  EXPRESS SERVER                              │
│                                                             │
│  ┌─────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │routes.ts│ │adminRoutes │ │userExtRoutes│ │integration│ │
│  │User API │ │Admin API   │ │ Vitals/AI  │ │ Google Cal│ │
│  └────┬────┘ └─────┬──────┘ └─────┬──────┘ └─────┬─────┘ │
│       │            │              │               │        │
│  ┌────┴────────────┴──────────────┴───────────────┴──────┐ │
│  │                  SERVICE LAYER                        │ │
│  │  medicalDocumentAnalyzer | documentSyncEngine         │ │
│  │  medicalSafetyEngine | medicalCorrelations            │ │
│  │  encryption | fileStorage | googleCalendar            │ │
│  │  multiProviderAI (Claude → GPT-4o → Gemini)          │ │
│  └────────────────────────┬──────────────────────────────┘ │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────────┐ │
│  │            DRIZZLE ORM + PostgreSQL                   │ │
│  │            50+ tables, UUID PKs, SSL encrypted        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

External Services:
  Anthropic API | OpenAI API | Google AI | Stripe | Resend
  Google OAuth2 | Google Calendar API
```

### 2.3 חלוקת אחריות

| מודול | תיקייה | אחריות |
|-------|---------|--------|
| Client User | `client/src/` | ממשק משתמש, auth, ניהול state |
| Client Admin | `client/src/admin/` | ממשק אדמין, analytics |
| Server Routes | `server/src/routes.ts` | ~200 user API endpoints |
| Server Admin | `server/src/adminRoutes.ts` | ~100 admin API endpoints |
| Server Ext | `server/src/userExtRoutes.ts` | vitals, hydration, AI chat |
| Server Integrations | `server/src/integrationRoutes.ts` | Google OAuth + Calendar |
| Services | `server/src/services/` | AI, encryption, storage, calendar |
| Schema | `shared/schemas/schema.ts` | 50+ Drizzle table definitions |
| Constants | `shared/constants/` | permissions, colors |

---

## 3. PRD – מסמך דרישות מוצר

### 3.1 אפיק ליבה – ניהול מטופל

**מטרה עסקית:** ריכוז כל המידע הרפואי של המטופל במקום אחד, נגיש לכל בני המשפחה בזמן אמת.

**דרישות פונקציונליות:**
- [ ] יצירת פרופיל מטופל עם שדות דמוגרפיים ורפואיים
- [ ] הצפנת מספר ת.ז. ומספר ביטוח רפואי (AES-256)
- [ ] מעקב שלבי טיפול (4 שלבים: מודעות → חשד → גשר → ודאות)
- [ ] ניקוד השלמת פרופיל (0–100%) עם סרגל חזותי
- [ ] תמיכה בריבוי מטופלים למשפחה (is_primary flag)
- [ ] שדות Phase 2 (Medical Brain): ADL, IADL, MMSE, GDS, fall risk, pain level
- [ ] רשת מומחים (specialists jsonb): שם, התמחות, טלפון, ביקור אחרון
- [ ] גורמי סביבה חברתית (SDOH): דיור, מזון, ניידות, תמיכה חברתית
- [ ] הנחיות מקדימות (advance directives) + DNR status
- [ ] היסטוריה משפחתית (family history jsonb)

**דרישות לא-פונקציונליות:**
- טעינה < 2 שניות
- תמיכה ב-RTL מלא (עברית ראשית)
- Responsive (mobile-first)

---

### 3.2 אפיק – ניהול משימות

**מטרה עסקית:** תיאום משימות בין בני המשפחה, מניעת כפילויות, מעקב ביצוע.

**דרישות:**
- [ ] יצירת משימה עם כל שדות (כותרת, תיאור, עדיפות, קטגוריה, תאריך יעד, שיוך)
- [ ] Kanban board עם 8 סטטוסים
- [ ] רשימת co-assignees (מספר משתמשים לאותה משימה)
- [ ] Checklist items ב-drag-and-drop
- [ ] AI decompose – פירוק משימה לתת-משימות
- [ ] Workflow אישור: requested → approve/decline (מנהל בלבד)
- [ ] סנכרון Google Calendar (יצירה/עדכון/מחיקה events)
- [ ] פילטרים מתקדמים: סטטוס, עדיפות, קטגוריה, שיוך, מקור, טווח תאריכים
- [ ] Deduplication AI לניקוי כפילויות
- [ ] Bulk actions: מחיקה קבוצתית, שינוי סטטוס קבוצתי
- [ ] Linked documents (מסמכים קשורים למשימה)

---

### 3.3 אפיק – מסמכים רפואיים + AI

**מטרה עסקית:** ניתוח אוטומטי של מסמכים רפואיים והפצת המידע לכל הטבלאות הרלוונטיות.

**דרישות – העלאה:**
- [ ] PDF, JPEG, PNG עד 25MB
- [ ] הצפנה ב-rest (AES-256) בשמירה לדיסק
- [ ] HMAC-signed serve URLs (תוקף 15 דקות)
- [ ] Batch upload

**דרישות – AI Analysis:**
- [ ] Multi-provider waterfall: Claude → GPT-4o → Gemini
- [ ] תמיכה בדמוגרפיה: עברית, ערבית, אנגלית, רוסית
- [ ] חילוץ: אבחנות, תרופות, ערכי מעבדה, בדיקות, הפניות, חיסונים, אזהרות אלרגיות
- [ ] פישוט האבחנה לשפה ידידותית למשפחה
- [ ] רמת דחיפות: routine / soon / urgent
- [ ] הסרת ת.ז. מהפלט (PII sanitization)
- [ ] תמיכה בטפסים ישראלים: טופס 17, ממכ"ל, שב"ן

**דרישות – Sync Engine (15 שלבים):**
- [ ] אלרגיות → patient_allergies (dedup + insights + notifications)
- [ ] תרופות → medications
- [ ] מדדים → vitals (dedup + abnormal detection + trends)
- [ ] ממצאי מעבדה → lab_results
- [ ] הפניות → referrals + auto-task (due dates by urgency)
- [ ] משימות → tasks (dedup by title)
- [ ] Follow-up task אוטומטי
- [ ] Insights מאבחנה + הערות רופא
- [ ] Notifications למנהלים על דוחות דחופים
- [ ] מעבדי מסמך ייעודיים (הגמ/אשפוז/נפשי/גריאטרי/סוציאלי)
- [ ] Correlation Engine + Safety Engine
- [ ] אוטו-הוספה לספריית מומחים
- [ ] תיעוד sync_events (audit trail)

---

### 3.4 אפיק – ניהול משפחה ומשתמשים

**מטרה עסקית:** גמישות בקוי הזמנה, הרשאות ותפקידים.

**דרישות:**
- [ ] קוד הזמנה כללי לכל משפחה (regenerate option)
- [ ] קודים ספציפיים לפי סוג (5 presets): Full family / Family caregiver / Supporting friend / Medical caregiver / Viewer only
- [ ] תפקידים: manager / caregiver / viewer / guest
- [ ] Member tiers: family / supporter_friend / supporter_medical
- [ ] הרשאות גרנולריות per member: view/edit patient, tasks, financial, insurance, documents, manage_members
- [ ] תפקידי טיפול: 6 סוגים (מנהל רפואי, מנהל כלכלי, מטפל יומי, תמיכה רגשית, מנהל משפטי, מנהל משפחתי)
- [ ] שליחת הזמנה במייל (Resend)
- [ ] Multi-family support – משתמש יכול להשתייך למספר משפחות
- [ ] Family color picker (24 צבעים) לזיהוי על Kanban
- [ ] FamilyHierarchyMap ויזואלי

---

### 3.5 אפיק – Medical Brain & Heart (Phase 2)

**המוח הרפואי** – 9 טבלאות קליניות חדשות:

| טבלה | תפקיד |
|-------|--------|
| `vitals` | מדדים עם 8 סוגים, detection אנומליות |
| `lab_results` | תוצאות מעבדה עם reference ranges |
| `referrals` | הפניות עם workflow status |
| `appointments` | ביקורים רפואיים |
| `patient_diagnoses` | אבחנות עם ICD codes |
| `patient_allergies` | אלרגיות עם type + severity |
| `patient_assessments` | הערכות תפקודיות (8 סוגים) |
| `patient_health_insights` | תובנות AI קליניות |
| `medical_brain_rules` | חוקי אוטומציה מותאמים אישית |

**לב המערכת (Core Services):**
- `medicalSafetyEngine` – בדיקות cross-reactivity תרופות×אלרגיות, Beers Criteria לקשישים
- `medicalCorrelations` – ניתוח קשרים בין ממצאי מעבדה ומדדים → יצירת tasks ו-insights אוטומטיים
- `medicalReferenceRanges` – reference ranges עם `evaluateLabValue()`

---

### 3.6 אפיק – מזכיר AI (Assistant)

**מטרה:** AI שיחתי (Gemini 2.0 Flash) לשאלות ותשובות בזמן אמת.

**מצבים:**
- `general` – שאלות כלליות על דמנציה/טיפול
- `tasks` – עזרה בניהול משימות
- `medications` – מידע על תרופות ומינונים
- `family` – טיפים לתקשורת משפחתית

**תגובה בעברית/אנגלית לפי שפת המשתמש.**

---

### 3.7 אפיק – מרכז זכויות

**מטרה:** מידע על זכויות חולה ומשפחה בישראל.

**תוכן:**
- מפת זכויות
- שאלות לרופא
- טפסים חשובים
- הכנה לועדות
- זכויות נוספות: פטור ארנונה, הנחות הסעה, תקציב מטפל, זכויות מס, שיקום, ציוד רפואי

---

## 4. ERD – מבנה מסד הנתונים

### 4.1 Enums

```sql
user_role:        manager | caregiver | viewer | guest
task_status:      requested | scheduled | todo | in_progress | stuck | postponed | cancelled | done
task_priority:    urgent | high | medium | low
task_category:    medical | personal | administrative | shopping | transport | other
task_source:      manual | ai | questionnaire | appointment
vital_type:       blood_pressure | blood_sugar | weight | heart_rate | temperature |
                  oxygen_saturation | respiratory_rate | pain_level
referral_status:  pending | scheduled | completed | cancelled | expired
insight_severity: info | warning | critical
assessment_type:  adl | iadl | mmse | gds | falls_risk | pain | nutrition | frailty
diagnosis_status: active | resolved | suspected | ruled_out
allergen_type:    drug | food | environment | contrast | other
```

### 4.2 דיאגרמת ERD

```
families (1) ──────────── (∞) users
    │                          │
    │ (1)              (∞)    │ (1)
    ▼                family_members    ▼
patients (∞)         (user_id, family_id, role, permissions)    sessions
    │
    ├── (∞) tasks ──────── (∞) task_checklists
    │         └── (M:M) task_calendar_sync
    │
    ├── (∞) medications
    ├── (∞) vitals
    ├── (∞) lab_results
    ├── (∞) referrals
    ├── (∞) appointments
    ├── (∞) patient_diagnoses
    ├── (∞) patient_allergies
    ├── (∞) patient_assessments
    └── (∞) patient_health_insights

medical_documents ──source──▶ medications, vitals, lab_results,
                               referrals, patient_diagnoses,
                               patient_allergies, patient_health_insights

users (1:1) ──── user_google_calendar_tokens
         (1:1) ── notification_preferences
         (1:1) ── user_settings

admin_users ──── admin_sessions
            ──── audit_log
            ──── admin_ai_analyses ──── ai_analysis_attachments

sprints ──(M:M)── dev_tasks via sprint_tasks
dev_tasks ──── dev_comments
dev_phases ──── dev_tasks, sprints

pipelines ──── pipeline_runs, pipeline_stages, pipeline_alerts
```

### 4.3 אינדקסים (Migration 0040)

| אינדקס | טבלה | עמודות |
|--------|-------|--------|
| `idx_sessions_user_id` | sessions | user_id |
| `idx_sessions_expires_at` | sessions | expires_at |
| `idx_tasks_family_id` | tasks | family_id |
| `idx_tasks_status` | tasks | family_id, status |
| `idx_tasks_created_at` | tasks | family_id, created_at DESC |
| `idx_patients_family_id` | patients | family_id |
| `idx_medical_docs_family` | medical_documents | family_id |
| `idx_medications_patient` | medications | patient_id |
| `idx_vitals_patient` | vitals | patient_id |
| `idx_vitals_recorded_at` | vitals | patient_id, recorded_at DESC |
| `idx_lab_results_patient` | lab_results | patient_id |
| `idx_referrals_patient` | referrals | patient_id |
| `idx_appointments_family` | appointments | family_id |
| `idx_family_members_user` | family_members | user_id |
| `idx_notif_user_unread` | notifications | user_id, created_at DESC WHERE read_at IS NULL |
| `idx_memory_family` | memory_stories | family_id |
| `idx_audit_created_at` | audit_log | created_at DESC |
| `idx_allergies_patient_allergen` | patient_allergies | patient_id, allergen |

---

