# MemorAid Admin — חוקיות חווית משתמש ועיצוב (UX/UI Blueprint)

> **מסמך מחייב** — כל רכיב במערכת Admin חייב לעמוד בהנחיות מסמך זה.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## תמצית מנהלים

מסמך זה מגדיר **מערכת עיצוב מלאה** למערכת Admin — פלטת צבעים, טיפוגרפיה, רכיבים, נגישות ועקביות. מטרתו: מערכת **חיה**, **נעימה לעיניים**, **מסודרת** ו**אחידה** — ללא טקסטים קשה־לקריאה (בהיר על בהיר / כהה על כהה), עם כפתורים ברמה גבוהה, גבולות ברורים ומעברים זורמים.

---

## 1. עקרונות עיצוב ראשיים

### 1.1 "חיים אבל מהודק"
- **צבעים:** Dark theme עם נגיעות צבע מדוד — לא מונוכרום (לבן/שחור/אפור בלבד).
- **היררכיה:** רקעים כהים, טקסט בהיר, אלמנטים פעילים בצבע (כחול, סגול, ירוק, אדום) — באופן עקבי.
- **אווירה:** מקצועי, נקי, מסודר — לא "מת" ולא "צועק".

### 1.2 ניגודיות חובה (אין חריגות)
| מצב | דוגמה | סטטוס |
|-----|--------|--------|
| טקסט כהה על רקע כהה | `#1e293b` על `#0f172a` | ❌ אסור |
| טקסט בהיר על רקע בהיר | `#e2e8f0` על `#f8fafc` | ❌ אסור |
| טקסט בהיר על רקע כהה | `#f1f5f9` על `#1e293b` | ✅ חובה |
| טקסט כהה על רקע בהיר | `#0f172a` על `#f8fafc` | ✅ מותר (רק ברקעים בהירים יזומים) |

### 1.3 עקביות מוחלטת
- כל מודלים, כרטיסים, טפסים — **אותו שפה עיצובית**.
- מודלים **לא** לבנים על רקע כהה — מודלים **דארק** שמשתלבים ברקע.
- כפתורים: אותו סגנון בכל המערכת (גודל, פינות, צל, hover).

### 1.4 RTL מלא
- כיוון ימין־לשמאל לכל הממשק.
- אייקונים בכיוון נכון (חצים, תפריטים).
- מרווחים: `margin-right` / `padding-right` כשצריך.

---

## 2. פלטת צבעים (Color Palette)

### 2.1 רקעים (Backgrounds)

| שם | ערך | שימוש |
|----|-----|-------|
| `admin-bg-base` | `#0f172a` (slate-900) | רקע ראשי של האפליקציה |
| `admin-bg-raised` | `#1e293b` (slate-800) | כרטיסים, אזורים מורמים |
| `admin-bg-elevated` | `#334155` (slate-700) | מודלים, popovers, inputs |
| `admin-bg-subtle` | `#1e293b` + opacity 0.5 | אזורים משניים |

### 2.2 טקסט (Text / Foreground)

| שם | ערך | שימוש |
|----|-----|-------|
| `admin-text-primary` | `#f8fafc` (slate-50) | כותרות, טקסט ראשי |
| `admin-text-secondary` | `#cbd5e1` (slate-300) | תיאורים, labels |
| `admin-text-muted` | `#94a3b8` (slate-400) | טקסט עזר, placeholders |

### 2.3 צבעים פעילים (Accent Colors) — "החיים" במערכת

| שם | ערך | שימוש |
|----|-----|-------|
| `admin-primary` | `#6366f1` (indigo-500) | כפתור ראשי, לינקים, focus |
| `admin-primary-hover` | `#818cf8` (indigo-400) | Hover על primary |
| `admin-accent` | `#8b5cf6` (violet-500) | Kanban, ספרינטים, highlights |
| `admin-success` | `#22c55e` (green-500) | הצלחה, Done, אישורים |
| `admin-warning` | `#f59e0b` (amber-500) | אזהרות, תשומת לב |
| `admin-danger` | `#ef4444` (red-500) | מחיקה, שגיאות, סכנה |
| `admin-info` | `#0ea5e9` (sky-500) | מידע, tips |

### 2.4 גבולות (Borders)

| שם | ערך | שימוש |
|----|-----|-------|
| `admin-border-default` | `#475569` (slate-600) | גבולות כרטיסים, inputs |
| `admin-border-subtle` | `#334155` (slate-700) | הפרדות עדינות |
| `admin-border-focus` | `#6366f1` (indigo-500) | focus state |

### 2.5 ערכים ל־CSS Variables (Tailwind / HSL)

```css
/* Admin-scoped - להוסיף ל־AdminShell או wrapper */
.admin-theme {
  --admin-bg-base: 222 47% 11%;        /* #0f172a */
  --admin-bg-raised: 222 47% 18%;      /* #1e293b */
  --admin-bg-elevated: 215 28% 27%;    /* #334155 */
  --admin-text-primary: 210 40% 98%;   /* #f8fafc */
  --admin-text-secondary: 215 20% 65%; /* #cbd5e1 */
  --admin-text-muted: 215 16% 57%;     /* #94a3b8 */
  --admin-primary: 239 84% 67%;        /* #6366f1 */
  --admin-accent: 263 70% 58%;         /* #8b5cf6 */
  --admin-success: 142 71% 45%;        /* #22c55e */
  --admin-warning: 38 92% 50%;         /* #f59e0b */
  --admin-danger: 0 84% 60%;           /* #ef4444 */
  --admin-border: 215 20% 40%;         /* #475569 */
  --admin-radius: 0.5rem;              /* 8px */
  --admin-radius-lg: 0.75rem;          /* 12px */
}
```

---

## 3. טיפוגרפיה

### 3.1 גופנים

| תפקיד | גופן | משקל | הערות |
|-------|------|------|-------|
| כותרות | Rubik / Heebo | 600–700 | עברית |
| גוף | Rubik / Heebo | 400 | עברית |
| מספרים / קוד | JetBrains Mono / Fira Code | 400 | מונוספס |

```css
font-family: 'Heebo', 'Rubik', system-ui, sans-serif;
```

### 3.2 גדלים ומרווחים

| רמה | גודל | line-height | שימוש |
|-----|------|-------------|-------|
| H1 | 1.5rem (24px) | 1.3 | כותרת דף |
| H2 | 1.25rem (20px) | 1.35 | כותרת סעיף |
| H3 | 1.125rem (18px) | 1.4 | כותרת כרטיס |
| Body | 0.875rem (14px) | 1.5 | טקסט רגיל |
| Small | 0.75rem (12px) | 1.4 | labels, hints |
| Caption | 0.6875rem (11px) | 1.3 | metadata |

---

## 4. רכיבים (Components)

### 4.1 כפתורים (Buttons)

#### Primary (פעולה ראשית)
```
רקע: admin-primary (#6366f1)
טקסט: לבן #ffffff
גבול: none
פינות: 8px (rounded-lg)
צל: shadow-md
Hover: רקע כהה יותר / בהיר קל
Disabled: opacity 50%
גובה מינימלי: 40px (py-2.5)
```

#### Secondary (פעולה משנית)
```
רקע: admin-bg-elevated (#334155)
טקסט: admin-text-primary
גבול: 1px admin-border
פינות: 8px
Hover: רקע בהיר קל (#475569)
```

#### Danger (מחיקה / פעולה הרסנית)
```
רקע: admin-danger (#ef4444)
טקסט: לבן
Hover: אדום כהה יותר
```

#### Ghost (ביטול, טפל)
```
רקע: שקוף
טקסט: admin-text-secondary
Hover: רקע admin-bg-subtle
```

#### חוקי כפתורים
- אייקון + טקסט: רווח 8px ביניהם
- כפתורים באותה שורה: רווח 12px ביניהם
- אין כפתור אפור "מת" — גם secondary חייב hover ברור

---

### 4.2 שדות קלט (Inputs)

```
רקע: admin-bg-elevated (#334155) — לא שחור מוחלט
טקסט: admin-text-primary (#f8fafc)
גבול: 1px admin-border
פינות: 8px
Padding: 12px 16px
Focus: ring 2px admin-primary, outline none
Placeholder: admin-text-muted
```

**Select / Dropdown:**
- אותו סגנון כמו input
- חץ ימינה (RTL) — `chevron-left` במערכת LTR

**Textarea:**
- min-height 80px
- resize: vertical

---

### 4.3 מודלים (Modals / Dialogs)

#### עקרון מרכזי: מודלים דארק — לא לבנים

```
רקע המודל: admin-bg-raised (#1e293b) — זהה לכרטיסים ברקע
גבול: 1px admin-border
צל: shadow-xl (חזק — להבחנה מהרקע)
פינות: 12px (rounded-xl)
טקסט כותרת: admin-text-primary
טקסט labels: admin-text-secondary
Inputs בתוך המודל: admin-bg-elevated (קצת כהה מהרקע כדי להבדיל)
Overlay: rgba(0,0,0,0.6) + backdrop-blur
```

**איסור מוחלט:** רקע לבן או אפור בהיר במודל כאשר הרקע הראשי כהה.

**טאבים במודל:**
- פעיל: border-bottom 2px admin-primary, טקסט admin-primary
- לא פעיל: טקסט admin-text-muted, hover → admin-text-secondary

---

### 4.4 כרטיסים (Cards)

```
רקע: admin-bg-raised (#1e293b)
גבול: 1px admin-border
פינות: 12px
Padding: 16px
צל: shadow-sm (אופציונלי)
Hover (אם קליקבילי): גבול admin-primary קל, רקע כמעט זהה
```

---

### 4.5 טבלאות (Tables)

```
רקע שורות: alternating — base / raised קל
גבול: admin-border-subtle בין שורות
Header: רקע admin-bg-elevated, טקסט admin-text-primary, font-weight 600
Hover על שורה: רקע admin-bg-subtle
```

---

### 4.6 Badges / תגיות

| סוג | רקע | טקסט |
|-----|-----|------|
| Default | admin-bg-elevated | admin-text-secondary |
| Success | green-500/20 | green-400 |
| Warning | amber-500/20 | amber-400 |
| Danger | red-500/20 | red-400 |
| Info | sky-500/20 | sky-400 |

פינות: 6px (rounded-md). גודל: small (12px).

---

## 5. אייקונים

- **ספריית אייקונים:** Lucide React (קיימת).
- גודל סטנדרטי: 20px (w-5 h-5). קטן: 16px. גדול: 24px.
- צבע: inherit מהטקסט או admin-text-muted.
- אייקון פעיל: admin-primary.

---

## 6. מרווחים ו־Layout

### 6.1 Spacing Scale (Tailwind)

| שם | ערך | שימוש |
|----|-----|-------|
| xs | 4px | בין אייקון לטקסט |
| sm | 8px | בין אלמנטים קטנים |
| md | 12px | בין שדות בטפסים |
| lg | 16px | padding כרטיס |
| xl | 24px | בין סעיפים |
| 2xl | 32px | בין אזורים |

### 6.2 Sidebar

```
רוחב: 260px (לא צר מדי)
רקע: admin-bg-raised
גבול שמאל: 1px admin-border (כי RTL — הצד השמאלי הוא "חיצוני")
פריט פעיל: רקע admin-primary/20, border-right 3px admin-primary
פריט hover: רקע admin-bg-subtle
```

### 6.3 Main Content

```
Padding: 24px
Max-width: 1400px (אופציונלי, centered)
```

---

## 7. אנימציות ומעברים

- **Duration:** 150ms–200ms לרוב המעברים.
- **Easing:** ease-out ל־hover, ease-in-out ל־modals.
- **Modal פתיחה:** fade-in + scale 0.98→1.
- **לא:** אנימציות מוגזמות, קפיצות.

---

## 8. נגישות (Accessibility)

- **Contrast:** מינימום 4.5:1 לטקסט רגיל, 3:1 לטקסט גדול.
- **Focus visible:** תמיד ring ברור (admin-primary) ב־focus.
- **Labels:** כל input חייב label מקושר.
- **כפתורים:** aria-label כשאין טקסט (רק אייקון).

---

## 9. רשימת בדיקה (Checklist) ליישום

### מודלים
- [ ] רקע מודל = admin-bg-raised (#1e293b)
- [ ] אין רקע לבן/בהיר
- [ ] Inputs במודל עם admin-bg-elevated
- [ ] כפתורי Save / Cancel / Delete לפי הסטנדרט

### כפתורים
- [ ] Primary: indigo (#6366f1)
- [ ] Secondary: slate-700 עם hover
- [ ] Danger: red-500
- [ ] גובה מינימלי 40px

### טקסט
- [ ] אין טקסט בהיר על רקע בהיר
- [ ] אין טקסט כהה על רקע כהה
- [ ] Labels ב־admin-text-secondary

### כרטיסים וטבלאות
- [ ] רקע admin-bg-raised
- [ ] גבול admin-border
- [ ] פינות 12px

---

## 10. דוגמאות קוד (Tailwind Classes)

### מודל דארק
```jsx
<DialogContent className="bg-slate-800 border-slate-600 text-slate-100 shadow-xl rounded-xl">
  <input className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 
    focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
</DialogContent>
```

### כפתור Primary
```jsx
<button className="px-4 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white 
  font-medium shadow-md transition-colors disabled:opacity-50">
  שמור
</button>
```

### כרטיס
```jsx
<div className="rounded-xl border border-slate-600 bg-slate-800 p-4 text-slate-100">
  ...
</div>
```

---

## 11. סיכום — "החוקים הקשיחים"

1. **מודלים דארק** — אף מודל לא לבן על רקע כהה.
2. **ניגודיות** — אין טקסט קשה־לקריאה (בהיר על בהיר, כהה על כהה).
3. **צבע פעיל** — Primary = indigo, Accent = violet, Success/Danger לפי ההגדרות.
4. **כפתורים** — גובה 40px, hover ברור, secondary לא "מת".
5. **גבולות** — תמיד ברורים (slate-600) — לא לחסוך בגבולות.
6. **פינות** — 8px inputs/buttons, 12px cards/modals.
7. **RTL** — כיוון מלא, אייקונים מותאמים.

---

*MemorAid Admin UX Blueprint v1.0 | February 2026*
