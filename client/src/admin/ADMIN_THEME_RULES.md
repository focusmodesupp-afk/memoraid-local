# חוקיות Theme – ממשק Admin MemorAid

**זה המקור לאמת.** כל פיתוח חדש בממשק Admin חייב להתבסס על המסמך הזה.

---

## 1. עקרונות Theme

| עיקרון | הסבר |
|--------|------|
| **Dark Mode** | ברירת מחדל. העיצוב המקורי – **אין לשנות**. |
| **Light Mode** | שכבת override בלבד. מופעל דרך `data-admin-theme="light"`. |
| **מנגנון** | `useAdminTheme` מגדיר `data-admin-theme` על `html` ו-`body`. |
| **Base = Dark** | כל הקומפוננטות נכתבות עם מחלקות Dark; Light מקבל override אוטומטי ב-`admin-theme.css`. |

---

## 2. פלטת צבעים – מקור אמת

### Dark Mode (לא לשנות)

| משתנה | ערך | שימוש |
|-------|-----|-------|
| --admin-bg-main | #0f172a | רקע ראשי |
| --admin-bg-sidebar | rgba(30,41,59,0.98) | סיידבר |
| --admin-bg-card | rgba(30,41,59,0.5) | כרטיסים |
| --admin-bg-input | rgba(51,65,85,0.8) | שדות |
| --admin-text | #f1f5f9 | טקסט ראשי |
| --admin-text-muted | #94a3b8 | טקסט משני |
| --admin-primary | #818cf8 | אינדיגו – פעולה ראשית |

### Light Mode (צבעים חיים, אינדיגו)

| משתנה | ערך | שימוש |
|-------|-----|-------|
| --admin-bg-main | #f8f7fc | רקע ראשי (לבנדר עדין) |
| --admin-bg-sidebar | #f5f3ff | סיידבר (indigo-50) |
| --admin-bg-card | #ffffff | כרטיסים |
| --admin-bg-input | #f0eefc | שדות |
| --admin-text | #1e1b4b | טקסט ראשי (indigo-950) |
| --admin-text-muted | #5b5b7a | טקסט משני |
| --admin-primary | #4f46e5 | אינדיגו – פעולה ראשית |

### צבעים סמנטיים

| תפקיד | Dark | Light |
|-------|------|-------|
| Success | #4ade80 | #059669 |
| Error | #f87171 | #dc2626 |
| Warning | #fbbf24 | #d97706 |
| Info | #60a5fa | #0284c7 |
| Primary | #818cf8 | #4f46e5 |

---

## 3. מחלקות חובה – שימוש בפיתוח חדש

| רכיב | מחלקות | הערה |
|------|--------|------|
| רקע כרטיס | `admin-card` או `bg-slate-800/50` | מקבל override ב-Light |
| שדה קלט | `admin-input` | |
| טקסט ראשי | `text-slate-100` | override ל-#1e1b4b ב-Light |
| טקסט משני | `admin-muted` או `text-slate-400` | |
| כותרות | `admin-page-title` | |
| לינקים | `text-blue-500` / `text-blue-400` | override ל-#4f46e5 ב-Light |

### צבעים סמנטיים

- **מומלץ:** `admin-text-success`, `admin-text-error`, `admin-text-warning`, `admin-text-info`
- **מקובל:** `text-green-400`, `text-red-400` וכו' – מקבלים override אוטומטי

---

## 4. איסורים

| איסור | סיבה |
|-------|------|
| **לא** `dark:` | העיצוב הבסיסי הוא Dark; Light הוא override. |
| **לא** לשנות Dark | רק להוסיף/לעדכן overrides ב-`admin-theme.css`. |
| **לא** לבן טהור (#fff) ב-Light | להשתמש ב-#fcfbf9 או #ffffff עם גוון עדין. |

---

## 5. קבצים מרכזיים

| קובץ | תפקיד |
|------|-------|
| `client/src/admin/admin-theme.css` | **מקור אמת** – משתנים + כל ה-overrides ל-Light |
| `client/src/admin/hooks/useAdminTheme.tsx` | ניהול theme, localStorage |
| `client/src/admin/AdminLayout.tsx` | Layout, toggle, `admin-theme-root` |
| `client/src/main.tsx` | ייבוא `admin-theme.css` **אחרי** `index.css` |

---

## 6. מבנה DOM

```
body[data-admin-theme="light"|"dark"]
  #root
    AdminThemeProvider
      AdminLayout
        div.admin-theme-root (data-admin-theme={theme})
          aside.admin-sidebar
          main
            header.admin-header
            div.admin-content  ← כל התוכן כאן
```

כל קומפוננטה חדשה חייבת להיות בתוך `admin-theme-root` (תחת AdminLayout).
