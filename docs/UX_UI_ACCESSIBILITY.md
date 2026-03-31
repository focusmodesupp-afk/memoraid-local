# MemorAId – נגישות מלאה (Accessibility / WCAG)

> נגישות כברירת מחדל – לא פיצ'ר, לא אופציה. מלא לפי WCAG 2.1 AA.  
> גרסה: 2.0 | תאריך: פברואר 2026

---

## 7.1 Color Contrast Requirements – דרישות ניגודיות צבע

| סוג | יחס מינימלי | יחס מועדף | הערות |
|-----|------------|-----------|-------|
| טקסט רגיל (<18px) | **4.5:1** | 7:1 | WCAG AA / AAA |
| טקסט גדול (≥18px bold / ≥24px) | **3:1** | 4.5:1 | WCAG AA |
| Non-text UI (icons, borders) | **3:1** | 4.5:1 | WCAG AA |
| Disabled elements | פטור | – | לא נדרש |
| Logo / decorative | פטור | – | לא נדרש |

### מיפוי ל‑Tokens

| זוג צבעים | יחס מינימלי נדרש | קובץ | כלל |
|----------|-----------------|------|-----|
| `--foreground` על `--background` | 4.5:1 | `index.css` | טקסט ראשי |
| `--muted-foreground` על `--muted` | 4.5:1 | `index.css` | labels, metadata |
| `--primary-foreground` על `--primary` | 4.5:1 | `index.css` | כפתור ראשי |
| `--sidebar-foreground` על `--sidebar` | 4.5:1 | `index.css` | nav text |
| `--destructive-foreground` על `--destructive` | 4.5:1 | `index.css` | error buttons |
| אייקונים על `--background` | 3:1 | – | icons |

---

## 7.2 Focus Management – ניהול פוקוס

### 7.2.1 Focus Ring Standard

| פרמטר | ערך |
|-------|-----|
| גישה | `:focus-visible` (לא `:focus`) |
| עובי | 2px |
| צבע | `hsl(--ring)` = `hsl(--primary)` |
| offset | 2px (מחוץ לרכיב) |
| Tailwind | `focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2` |

### 7.2.2 כללים מחייבים

| כלל | פירוט |
|-----|-------|
| ❌ `:focus { outline: none; }` | **אסור** ללא חלופה עם `:focus-visible` |
| ✅ Focus Trap במודלים | כאשר מודל פתוח, Tab מסתובב רק בתוך המודל |
| ✅ Skip Link | "דלג לתוכן" כלינק ראשון נסתר, נגלה ב-focus |
| ✅ סדר Tab לוגי | לפי סדר DOM, לא z-index |
| ✅ Focus Restore | עם סגירת מודל/dropdown – חזרה לאלמנט שפתח אותו |

### 7.2.3 Skip Link Implementation

```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[hsl(var(--primary))] focus:text-white focus:rounded-lg">
  דלג לתוכן הראשי
</a>
```

---

## 7.3 ARIA – חובות לכל רכיב

| רכיב | role | aria attributes נדרשים |
|------|------|----------------------|
| Modal / Dialog | `role="dialog"` | `aria-modal="true"`, `aria-labelledby="[title-id]"`, `aria-describedby="[desc-id]"` |
| Alert (inline) | `role="alert"` | `aria-live="assertive"` |
| Toast (non-critical) | `role="status"` | `aria-live="polite"` |
| Icon-only button | `role="button"` | `aria-label="תיאור הפעולה"` **חובה** |
| Input / Textarea | – | `id` + `<label htmlFor>` או `aria-label` |
| Input עם שגיאה | – | `aria-invalid="true"`, `aria-describedby="[error-id]"` |
| שדה חובה | – | `aria-required="true"` |
| Progress bar | `role="progressbar"` | `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label` |
| img | – | `alt="תיאור"` – חובה תמיד (ריק `alt=""` לדקורטיב) |
| Collapsible section | `role="button"` | `aria-expanded="true/false"` |
| Tab list | `role="tablist"` | כל tab: `role="tab"`, `aria-selected`, panel: `role="tabpanel"` |
| Dropdown menu | `role="menu"` | items: `role="menuitem"`, trigger: `aria-haspopup="true"`, `aria-expanded` |
| Breadcrumb | `role="navigation"` | `aria-label="breadcrumb"`, current: `aria-current="page"` |
| Table | `<table>` | `<caption>` אם יש כותרת, `<th scope="col/row">` |
| Checkbox group | `role="group"` | `aria-labelledby="[group-title]"` |
| Loading state | `aria-busy="true"` | הוסף ל‑container שבטעינה |
| Notification count | `aria-label` | "X התראות חדשות" |

---

## 7.4 Keyboard Navigation Requirements

| רכיב | מקש | התנהגות |
|------|-----|---------|
| כל הדף | `Tab` | ניווט קדימה בין אלמנטים אינטראקטיביים |
| כל הדף | `Shift+Tab` | ניווט אחורה |
| כפתור / לינק | `Enter` | הפעלה |
| כפתור | `Space` | הפעלה (כפתור בלבד, לא לינק) |
| Checkbox | `Space` | toggle |
| Modal | `Escape` | סגירה |
| Dropdown | `Escape` | סגירה + חזרה ל-trigger |
| Dropdown | `↑` / `↓` | ניווט בין פריטים |
| Dropdown | `Home` / `End` | פריט ראשון / אחרון |
| Tab list | `←` / `→` | מעבר בין tabs (RTL: ← = הבא) |
| Accordion | `Enter` / `Space` | expand/collapse |
| Select | `↑` / `↓` | ניווט options |
| Select | `Enter` | בחירת option |
| Date picker | `↑` / `↓` / `←` / `→` | ניווט בין ימים |
| Date picker | `Escape` | סגירת picker |
| Table (sortable) | `Enter` | מיון לפי עמודה |
| List item (activatable) | `Enter` | פתיחה/בחירה |

---

## 7.5 RTL Specifications

### 7.5.1 כיווניות בסיסית

```css
/* ב-index.css */
body {
  direction: rtl;
  text-align: right;
}
```

### 7.5.2 Logical Properties – חובה

| במקום | השתמש ב |
|-------|---------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `border-right` | `border-inline-end` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |

### 7.5.3 Directional Icons

| אייקון | כיוון LTR | כיוון RTL | הערות |
|-------|---------|---------|-------|
| חץ קדימה | → | ← | `scale(-1, 1)` או icon נפרד |
| chevron-right | ← | → | ניווט לדף הבא בעברית |
| chevron-left | → | ← | ניווט לדף הקודם |
| arrow-back | ← | → | חזרה |
| align-left | `text-start` | `text-start` | לוגי |
| אייקונים סמנטיים | לא מתהפכים | לא מתהפכים | warning, heart, star, check |

### 7.5.4 ב-Tailwind

Tailwind 3.3+ תומך ב-RTL class modifiers:

```html
<!-- Inline-start instead of left -->
<div class="ps-4 pe-2 ms-2 me-4">
```

---

## 7.6 Screen Reader Requirements

| כלל | יישום |
|-----|-------|
| טקסט גלוי = שם הרכיב | אין צורך ב-`aria-label` נוסף אם טקסט ברור |
| אייקון בלי טקסט | חובה `aria-label` על כפתור/לינק |
| תמונות | `alt` תיאורי לפי תוכן; `alt=""` לתמונות דקורטיב |
| מסמכי טבלה | `caption` + `scope` |
| Live regions | Toasts: `polite` / Errors: `assertive` |
| Dynamic content | `aria-live="polite"` על container שמשתנה |
| Modals | announce title on open |
| Loading | `aria-busy="true"` + visually hidden "טוען..." |

---

*MemorAId UX/UI Accessibility v2.0 | February 2026*
