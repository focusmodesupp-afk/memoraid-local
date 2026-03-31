# MemorAId – UX/UI Changelog

> כל שינוי ב-Design System מתועד כאן. גרסה + תאריך + מה השתנה + השפעה על קוד.

---

## v2.0 – פברואר 2026 (הקמת מערכת מלאה)

### מסמכים חדשים

| מסמך | תוכן |
|------|------|
| `UX_UI_TOKENS.md` | Design Tokens מלאים: Primitive, Semantic, Component, Typography, Spacing, Radius, Shadow, Z-Index, Opacity |
| `UX_UI_STATES.md` | מטריצת States לכל רכיב: Buttons, Inputs, Cards, Nav, Checkboxes, Badges, Empty States, Error States, Loading |
| `UX_UI_MOTION.md` | Duration Scale, Easing Curves, Microinteractions Catalog (טבלה מלאה), Page Transitions, Reduced Motion |
| `UX_UI_THEMING.md` | Light / Dark / Admin / High-Contrast themes, טבלת Tokens לפי theme |
| `UX_UI_CONTENT.md` | Microcopy, Button Labels, Error Messages Standard, Placeholders, Section Titles, Navigation Labels |
| `UX_UI_ICONOGRAPHY.md` | Lucide library, Icon Sizes (12–96px), Colors, RTL directional icons, Usage rules, Context mapping |
| `UX_UI_ACCESSIBILITY_CHECKLIST.md` | צ'קליסט A–I לפני כל Merge (ניגודיות, Focus, ARIA, Keyboard, RTL, Forms, Motion, Hard Rules) |
| `UX_UI_PAGE_TEMPLATES.md` | טמפלטים לכל דף: Dashboard, Patient, Questionnaires, Rights, Documents, Memories, Availability, Family, Settings, Admin |

### מסמכים מורחבים

| מסמך | שינויים |
|------|---------|
| `UX_UI_MASTER.md` | v2.0 – הוספת Hard Rules טבלה מלאה (R1–R16), Workflow תרשים, מפת מסמכים, קישורי קוד |
| `UX_UI_ACCESSIBILITY.md` | v2.0 – הוספת טבלת 7.1 מלאה (יחסי ניגודיות), ARIA טבלה לכל רכיב, Keyboard Navigation טבלה, RTL Logical Properties, Skip Link |
| `UX_UI_COMPONENTS.md` | v2.0 – הוספת טבלת "מתי כן/לא" מלאה (24 רכיבים), ערכים מדויקים לכל רכיב, States, ARIA |

### קובצי Governance חדשים

| קובץ | תוכן |
|------|------|
| `.cursor/rules/ux-ui.mdc` | כלל Cursor שמחייב עמידה ב-UX/UI Hard Rules בכל שינוי UI |

---

## v1.0 – ינואר 2026 (הקמה ראשונית)

### מסמכים שנוצרו

- `UX_UI_MASTER.md` – מקור אמת ראשוני
- `UX_UI_SPECIFICATIONS.md` – מפרטים מספריים (sections, tables, inputs, buttons, breakpoints, typography, spacing)
- `UX_UI_COMPONENTS.md` – ספריית רכיבים (PageLayout, PageHeader, SmartSection, DataRow, BadgeRow, EmptyInline)
- `UX_UI_PATTERNS.md` – דפוסי UX, form patterns, navigation, flows
- `UX_UI_USER_APP.md` – חוקי אפליקציית משתמש
- `UX_UI_ADMIN.md` – חוקי Admin
- `UX_UI_ACCESSIBILITY.md` – נגישות (v1.0)
- `UX_UI_CHANGELOG.md` – עצמו

### שינויי קוד

| קובץ | שינוי |
|------|-------|
| `client/src/styles/design-system.css` | הוספת `.section-card` (shadow-md), עדכון `.data-row` (border-b, gap-4), עדכון `.section-compact` (p-4) |
| `client/src/pages/Patient.tsx` | תיקון JSX, עדכון grid (xl:grid-cols-3), `w-full` במקום `max-w-5xl` |
| `client/src/pages/Questionnaires.tsx` | grid xl:grid-cols-4, max-w-xs לכרטיסים |
| `client/src/pages/RightsCenter.tsx` | החלפת "שלח בקשה" ב-"פתח מדריך", inline expand, grid xl:grid-cols-4 |
| `client/src/App.tsx` | main: `w-full` במקום `max-w-5xl` |

---

## כיצד לתעד שינוי חדש

```markdown
## v[MAJOR.MINOR] – [חודש שנה]

### שינויים ב-Design System
- שינוי X: [ערך ישן] → [ערך חדש], קובץ: Y, השפעה: Z

### שינויים בקוד
| קובץ | שינוי |
|------|-------|
| ... | ... |

### Hard Rules שנוספו / עודכנו
- R17: ...
```

---

*MemorAId UX/UI Changelog | February 2026*
