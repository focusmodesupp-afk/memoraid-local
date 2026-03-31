# MemorAId – הנחיות מערכת Admin

> מסמך מרכזי למערכת Admin – dark theme, רכיבים, חוקיות.  
> מפרטים מלאים: [ADMIN_UX_BLUEPRINT.md](ADMIN_UX_BLUEPRINT.md).  
> ערכים מספריים: [UX_UI_SPECIFICATIONS.md](UX_UI_SPECIFICATIONS.md).  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 1. תמצית

מערכת Admin משתמשת ב-**Dark theme** – רקעים כהים, טקסט בהיר, צבעים פעילים (indigo, violet, green, red). מודלים דארק – לא לבנים.

---

## 2. פלטת צבעים

| שם | ערך | שימוש |
|----|-----|-------|
| admin-bg-base | #0f172a | רקע ראשי |
| admin-bg-raised | #1e293b | כרטיסים, מודלים |
| admin-bg-elevated | #334155 | inputs, popovers |
| admin-text-primary | #f8fafc | טקסט ראשי |
| admin-text-secondary | #cbd5e1 | labels |
| admin-text-muted | #94a3b8 | placeholders |
| admin-primary | #6366f1 | כפתור ראשי, focus |
| admin-accent | #8b5cf6 | Kanban, highlights |
| admin-success | #22c55e | הצלחה |
| admin-danger | #ef4444 | מחיקה, שגיאות |
| admin-border | #475569 | גבולות |

---

## 3. רכיבים – מפרט קצר

| רכיב | עיצוב |
|------|-------|
| כפתור Primary | indigo, py-2.5, rounded-lg, 40px min-height |
| כפתור Secondary | admin-bg-elevated, border |
| כפתור Danger | red-500 |
| Input | admin-bg-elevated, 12px 16px padding, ring on focus |
| Modal | admin-bg-raised, shadow-xl, לא לבן |
| Card | admin-bg-raised, border, 12px radius, 16px padding |
| Table | alternating rows, sticky header |

---

## 4. חוקים קשיחים

1. **מודלים דארק** – אין רקע לבן/בהיר במודל על רקע כהה
2. **ניגודיות** – טקסט בהיר על רקע כהה, לא להפך
3. **כפתורים** – 40px min-height, hover ברור
4. **פינות** – 8px inputs/buttons, 12px cards/modals
5. **RTL** – כיוון מלא

---

## 5. Classes (Tailwind / admin-theme)

- `admin-input` – שדה קלט
- `admin-btn-primary` – כפתור ראשי
- `admin-btn-secondary` – כפתור משני
- `admin-btn-danger` – כפתור מחיקה
- `admin-card` – כרטיס
- `admin-table-card`, `admin-table-th` – טבלאות

---

## 6. מסמכים

| מסמך | תוכן |
|------|------|
| [ADMIN_UX_BLUEPRINT.md](ADMIN_UX_BLUEPRINT.md) | מפרט מלא – צבעים, רכיבים, טיפוגרפיה, checklist |
| [UX_UI_SPECIFICATIONS.md](UX_UI_SPECIFICATIONS.md) | ערכים מספריים – spacing, tables, inputs |

---

*MemorAId UX/UI Admin v1.0 | February 2026*
