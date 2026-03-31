# MemorAId – ספריית רכיבי UI מלאה

> כל רכיב עם ערכים מדויקים, מתי כן / מתי לא, States, Accessibility.  
> גרסה: 2.0 | תאריך: פברואר 2026

---

## 1. טבלת רכיבים מלאה – מתי כן / מתי לא

| רכיב | מתי להשתמש | מתי לא | מימוש ב-MemorAId |
|------|-----------|---------|-----------------|
| **Button (Primary)** | פעולה ראשית בדף/dialog | יותר מ-2 כפתורי primary באותה view | `.btn-primary` / `button variant="primary"` |
| **Button (Outline)** | פעולה משנית, ביטול | כאשר לא צריך emphasis | `.btn-outline` |
| **Button (Ghost)** | פעולות בתוך tables/lists | כפעולה ראשית בדף | `variant="ghost"` |
| **Button (Destructive)** | מחיקה בלתי-הפיכה | פעולות רגילות | `.btn-destructive` (Admin) |
| **Button (Icon-only)** | כאשר שטח מצומצם + action ברור | כאשר יש מקום לטקסט | `aria-label` חובה |
| **Input (Text)** | קלט טקסט קצר | טקסט ארוך (>2 שורות) | Tailwind + `--input` token |
| **Textarea** | טקסט ארוך, הערות, תיאורים | קלט קצר חד-שורה | `min-h-[80px]` |
| **Select** | בחירה מתוך רשימה קצובה (< 8 items) | חיפוש ברשימה ארוכה → Combobox | Radix UI / native |
| **Combobox** | חיפוש + בחירה מרשימה ארוכה | רשימה קצרה (< 8) → Select | עתידי |
| **Checkbox** | בחירת 0–N items מרשימה | בחירת בדיוק item אחד → Radio | HTML checkbox |
| **Radio** | בחירת בדיוק item אחד | multi-select → Checkbox | HTML radio |
| **Toggle / Switch** | הפעלה/כיבוי מיידי (ללא שמירה נפרדת) | כאשר צריך אישור → Checkbox+Button | Radix Switch |
| **Card** | grouping של מידע קשור | שני concepts שונים בכרטיס אחד | `.section-card` / `.section-compact` |
| **Modal / Dialog** | פעולה שדורשת פוקוס מלא | מידע שלא דורש action → Toast | `components/ui/dialog.tsx` |
| **Drawer** | actions/forms ב-mobile, side panels | desktop עם מקום | עתידי |
| **Tooltip** | הסבר קצר על UI element | מידע ארוך → Popover | עתידי / title attr |
| **Toast** | feedback קצר אחרי פעולה (≤5 שניות) | שגיאות שדורשות action | Radix Toast / custom |
| **Alert (inline)** | מסר חשוב שצריך לראות לפני פעולה | feedback אחרי פעולה → Toast | custom Alert component |
| **Badge** | סטטוס, קטגוריה, ספירה | טקסט ארוך (> 2-3 מילים) | `.badge`, `.badge-*` classes |
| **Skeleton** | loading placeholder לפני טעינת נתונים | loading ממושך (> 10s) → empty+retry | custom Skeleton |
| **Pagination** | ניווט בין עמודי נתונים | רשימה קצרה (< 20 items) → scroll | עתידי |
| **Table** | נתונים טבלאיים עם עמודות מרובות | רשימה פשוטה → list component | HTML table + Tailwind |
| **Accordion** | תוכן שמתרחב (FAQ, sections) | ניווט ראשי | Radix Accordion |
| **Tabs** | ניווט בין views/sections בדף | ניווט בין דפים → Router | Radix Tabs |
| **DatePicker** | בחירת תאריך מדויק | בחירת טווח → DateRangePicker | עתידי / HTML date |
| **FileUpload** | העלאת קבצים | paste text → Textarea | עתידי |

---

## 2. ספריית רכיבים קיימים ב-MemorAId

### 2.1 PageLayout

**קובץ:** `client/src/components/ui/PageLayout.tsx`

**תיאור:** מיכל דף עם header ו-children. תמיכה ב-sidebar אופציונלי.

| פרמטר | ערך |
|-------|-----|
| max-width | 100% (ללא הגבלה כברירת מחדל) |
| padding | `px-4 sm:px-6 py-4` |
| gap header ↔ content | 24px (`space-y-6`) |
| grid עם sidebar | `lg:grid-cols-[1fr_280px]` |

---

### 2.2 PageHeader

**קובץ:** `client/src/components/ui/PageHeader.tsx`

| פרמטר | ערך |
|-------|-----|
| כותרת (page-title) | `text-lg`, `font-semibold`, `--foreground` |
| תת-כותרת (page-subtitle) | `text-sm`, `--muted-foreground` |
| מבנה | `flex`, `gap-3`, `items-center` (sm+) |
| Actions | `flex gap-2` |

---

### 2.3 SmartSection

**קובץ:** `client/src/components/ui/SmartSection.tsx`

| פרמטר | Compact | Card |
|-------|---------|------|
| padding | 16px (`p-4`) | 20px (`p-5`) |
| border-radius | 12px (`rounded-xl`) | 12px |
| shadow | `shadow-sm` | `shadow-md` |
| border | 1px `--border` | 1px `--border` |
| collapsible | ✅ | ✅ |

**Accessibility:** `role="button"`, `tabIndex=0`, `aria-expanded`, Enter/Space toggle.

---

### 2.4 DataRow

**קובץ:** `client/src/components/ui/DataRow.tsx`

| פרמטר | ערך |
|-------|-----|
| padding אנכי | 8px (`py-2`) |
| gap label↔value | 16px (`gap-4`) |
| font-size label | 12px (`text-xs`), muted |
| font-size value | 14px (`text-sm`) |
| border-bottom | 1px, `--border` 50% opacity |
| last row | ללא border |

---

### 2.5 BadgeRow + Badge

**קובץ:** `client/src/components/ui/BadgeRow.tsx`

| Badge variant | Background | Text |
|--------------|-----------|------|
| `badge-muted` | `hsl(--muted)` | `hsl(--muted-foreground)` |
| `badge-primary` | `hsl(--primary)/15` | `hsl(--primary)` |
| `badge-success` | `hsl(--success)/15` | `hsl(--success)` |
| `badge-destructive` | `hsl(--destructive)/15` | `hsl(--destructive)` |

| פרמטר | ערך |
|-------|-----|
| padding | `px-2 py-0.5` (8px, 2px) |
| font-size | 12px (`text-xs`) |
| font-weight | 500 (`font-medium`) |
| border-radius | 6px (`rounded-md`) |
| gap בין badges | 8px (`gap-2`) |

---

### 2.6 EmptyInline

**קובץ:** `client/src/components/ui/EmptyInline.tsx`

| פרמטר | ערך |
|-------|-----|
| font-size | 12px (`text-xs`) |
| font-style | italic |
| color | `hsl(--muted-foreground)` |
| padding | `py-2` |

---

### 2.7 Button Variants

**קבצים:** `client/src/index.css` (`.btn-primary`, `.btn-outline`), Admin: `.admin-btn-*`

| Variant | Padding | Height | Radius | Font | Code |
|---------|---------|--------|--------|------|------|
| Primary (User) | `px-4 py-2` | ~36px | `rounded-full` | `text-sm font-medium` | `.btn-primary` |
| Outline (User) | `px-4 py-2` | ~36px | `rounded-full` | `text-sm font-medium` | `.btn-outline` |
| Admin Primary | `px-4 py-2.5` | ~40px | `rounded-lg` | `text-sm` | `.admin-btn-primary` |
| Admin Secondary | `px-4 py-2.5` | ~40px | `rounded-lg` | `text-sm` | `.admin-btn-secondary` |
| Admin Danger | `px-4 py-2.5` | ~40px | `rounded-lg` | `text-sm` | `.admin-btn-danger` |

---

### 2.8 Dialog / Modal

**קובץ:** `client/src/components/ui/dialog.tsx`

| פרמטר | ערך |
|-------|-----|
| max-width | 512px (sm) / 672px (md) / 896px (lg) |
| max-height | 90vh |
| padding | 24px |
| border-radius | 12px (`rounded-xl`) |
| overlay | `rgba(0,0,0,0.6)` + `backdrop-blur-sm` |
| z-index | 50 |
| ARIA | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |

---

### 2.9 Admin Components (CSS Classes)

| Class | שימוש |
|-------|-------|
| `.admin-card` | `rounded-xl border border-slate-600 bg-slate-800/50 p-4` |
| `.admin-input` | input אדמין עם bg-slate-700 |
| `.admin-btn-primary` | כפתור indigo אדמין |
| `.admin-btn-secondary` | כפתור slate אדמין |
| `.admin-btn-danger` | כפתור red אדמין |
| `.admin-muted` | טקסט `text-slate-400` |
| `.admin-page-title` | `text-2xl font-bold text-slate-100` |
| `.admin-table-card` | wrapper לטבלה אדמין |
| `.admin-table-th` | `sticky top-0 bg-slate-800 text-slate-400 z-10` |

---

## 3. CSS Design System Classes

| Class | פרמטרים | שימוש |
|-------|---------|-------|
| `.section-compact` | `p-4 rounded-xl border shadow-sm bg-card` | section רגיל |
| `.section-card` | `p-5 rounded-xl border shadow-md bg-card` | section בולט |
| `.card-compact` | `p-3 rounded-xl border shadow-sm bg-card` | כרטיס קטן |
| `.card` | `p-4 rounded-xl border shadow-sm bg-card` | כרטיס כללי |
| `.page-header` | `flex flex-col sm:flex-row sm:items-center gap-3` | header דף |
| `.page-title` | `text-lg font-semibold tracking-tight` | כותרת דף |
| `.page-subtitle` | `text-sm text-muted-foreground mt-0.5` | תת-כותרת |
| `.data-row` | `flex items-baseline justify-between gap-4 py-2 border-b/50` | שורת data |
| `.data-row-label` | `text-xs font-medium text-muted-foreground shrink-0` | label |
| `.data-row-value` | `text-sm text-foreground text-end truncate` | value |
| `.badge` | `inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium` | badge |
| `.badge-muted` | `bg-muted text-muted-foreground` | – |
| `.badge-primary` | `bg-primary/15 text-primary` | – |
| `.badge-success` | `bg-success/15 text-success` | – |
| `.badge-destructive` | `bg-destructive/15 text-destructive` | – |
| `.badge-row` | `flex flex-wrap gap-2 items-center` | שורת badges |
| `.empty-inline` | `text-xs italic text-muted-foreground` | empty inline |
| `.list-compact` | `space-y-2` | רשימה דחוסה |
| `.section-title` | `text-sm font-semibold mb-1` | כותרת section |

---

## 4. States ו-Accessibility – לפי רכיב

| רכיב | States | ARIA | Keyboard |
|------|--------|------|---------|
| Button | default, hover, focus, active, disabled, loading, success | `aria-label` (icon-only), `aria-disabled`, `aria-busy` | Enter, Space |
| Input | default, hover, focus, error, disabled, read-only | `aria-label`/`<label>`, `aria-invalid`, `aria-describedby` | Tab, Shift+Tab |
| SmartSection (collapsible) | collapsed, expanded | `role="button"`, `aria-expanded`, `tabIndex=0` | Enter, Space |
| Modal | open, closed | `role="dialog"`, `aria-modal`, `aria-labelledby` | Escape, Tab (trap) |
| Badge | static | `title` לתיאור נוסף | – |
| EmptyInline | – | – | – |
| DataRow | – | – | – |

---

*MemorAId UX/UI Components v2.0 | February 2026*
