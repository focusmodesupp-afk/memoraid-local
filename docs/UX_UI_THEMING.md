# MemorAId – Theming (ערכות נושא)

> Light / Dark / Admin / High-Contrast – כל theme מוגדר ב-CSS Tokens בלבד.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 1. עקרונות Theming

| עיקרון | פירוט |
|--------|-------|
| **Semantic tokens only** | אין להשתמש בצבעים ישירים בתוך קומפוננטות. רק `hsl(var(--token))`. |
| **לא `invert()`** | Dark mode אינו היפוך הצבעים. כל theme מוגדר בנפרד. |
| **אותה ספרייה** | ריווח, טיפוגרפיה, רדיוס – זהה בכל ה-themes. רק הצבעים משתנים. |
| **Status colors בודקים** | ב-Dark mode, success/warning/error חייבים לעמוד בניגודיות 4.5:1 גם הם. |
| **Sidebar / Admin** | ה-Admin theme הוא dark תמיד. User יכול להיות light (ברירת מחדל) או dark (עתידי). |

---

## 2. ארכיטקטורת ה-Themes

```css
/* 1. User App – Light (ברירת מחדל) */
:root {
  --background: 250 45% 96%;
  --foreground: 253 50% 8%;
  /* ... */
}

/* 2. User App – Dark (עתידי) */
.dark {
  --background: 250 40% 14%;
  --foreground: 253 15% 95%;
  /* ... */
}

/* 3. Admin Theme (תמיד dark) */
.admin-theme {
  --background: 222 47% 11%; /* slate-900 */
  --foreground: 215 20% 90%; /* slate-200 */
  /* ... */
}

/* 4. High Contrast (נגישות) */
.high-contrast {
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  --primary: 240 100% 40%;
  --border: 0 0% 0%;
}

/* 5. Respects OS preference */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    /* apply dark theme */
  }
}
```

---

## 3. טבלת ה-Tokens לפי Theme

| Token | User Light | User Dark | Admin Dark | הערות |
|-------|-----------|-----------|-----------|-------|
| `--background` | 250 45% 96% | 250 40% 14% | 222 47% 11% | רקע ראשי |
| `--foreground` | 253 50% 8% | 253 15% 95% | 215 20% 90% | טקסט ראשי |
| `--card` | 253 40% 99% | 253 30% 12% | 217 33% 17% | רקע כרטיסים |
| `--card-foreground` | 253 50% 8% | 253 15% 95% | 215 20% 90% | טקסט בכרטיס |
| `--primary` | 253 79% 58% | 253 79% 62% | 239 84% 67% | primary actions |
| `--primary-foreground` | 0 0% 100% | 253 20% 10% | 0 0% 100% | טקסט על primary |
| `--secondary` | 200 60% 92% | 200 50% 25% | 215 25% 25% | secondary bg |
| `--muted` | 253 35% 95% | 253 25% 18% | 215 25% 18% | muted bg |
| `--muted-foreground` | 253 15% 45% | 253 10% 65% | 215 16% 47% | metadata, labels |
| `--border` | 253 30% 88% | 253 20% 22% | 215 28% 17% | גבולות |
| `--input` | 253 25% 92% | 253 20% 25% | 215 28% 20% | input bg |
| `--ring` | 253 79% 58% | 253 79% 62% | 239 84% 67% | focus ring |
| `--destructive` | 0 72% 51% | 0 65% 55% | 0 63% 31% | error/danger |
| `--success` | 142 71% 45% | 142 60% 52% | 142 55% 40% | success |
| `--warning` | 320 75% 55% | 320 70% 62% | 43 74% 66% | warning |
| `--info` | 200 85% 52% | 200 75% 58% | 200 65% 55% | info |
| `--sidebar` | 253 79% 58% | 253 75% 45% | 222 47% 11% | sidebar bg |
| `--sidebar-accent` | 253 85% 70% | 253 70% 55% | 239 84% 67% | active nav item |

---

## 4. User App Light Theme – סיכום

**מראה:** בהיר, עם גוון סגלגל עדין. מרגיש מקצועי אך חמים.

| אלמנט | עיצוב |
|-------|-------|
| רקע הדף | לבן-סגלגל, 96% lightness |
| כרטיסים | לבן כמעט מלא (99% lightness) |
| Sidebar | סגול בינוני (primary color) |
| כפתורים ראשיים | סגול מלא עם טקסט לבן |
| טקסט ראשי | כמעט שחור, גוון סגלגל כהה |
| טקסט משני | אפור-סגלגל, 45% lightness |
| גבולות | אפור-סגלגל בהיר |

---

## 5. Admin Dark Theme – סיכום

**מראה:** כהה ומקצועי. Slate gray as base, Indigo as primary.

**קובץ:** `client/src/admin/admin-theme.css`

| אלמנט | Tailwind / CSS | ערך |
|-------|--------------|-----|
| רקע הדף | `bg-slate-900` | `hsl(222 47% 11%)` |
| רקע כרטיסים | `bg-slate-800/50` | `hsl(217 33% 17% / 50%)` |
| טקסט ראשי | `text-slate-100` | `hsl(215 25% 90%)` |
| טקסט משני | `text-slate-400` | `hsl(215 16% 47%)` |
| Primary | `bg-indigo-500` | `hsl(239 84% 67%)` |
| Primary hover | `bg-indigo-400` | – |
| גבולות | `border-slate-700` | `hsl(215 28% 17%)` |
| כפתור סכנה | `bg-red-500` | `hsl(0 72% 51%)` |
| Input | `bg-slate-700/80` | – |
| Sidebar (Admin) | `bg-slate-950` | – |

---

## 6. Dark Mode (User) – עתידי

כאשר תתווסף תמיכה ב-Dark mode לאפליקציית המשתמש:

| כלל | פירוט |
|-----|-------|
| הפעלה | class `dark` על `<html>` |
| Toggle | שמירה ב-`localStorage['theme']` |
| ברירת מחדל | `prefers-color-scheme` |
| צללים ב-Dark | עדינים יותר – `shadow-sm` במקום `shadow-md` בכרטיסים |
| גבולות ב-Dark | `opacity` גבוה יותר (border גלוי יותר) |
| תמונות ב-Dark | `filter: brightness(0.85)` על תמונות רגילות |

---

## 7. High Contrast Theme – נגישות מוגברת

```css
.high-contrast {
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  --primary: 240 100% 35%;
  --primary-foreground: 0 0% 100%;
  --border: 0 0% 0%;
  --muted-foreground: 0 0% 25%;
  --destructive: 0 100% 35%;
}
```

**הפעלה:** class `high-contrast` על `<html>`, או זיהוי `prefers-contrast: more`.

---

## 8. Sidebar – Light vs Admin

| פרמטר | User Sidebar | Admin Sidebar |
|-------|-------------|--------------|
| רקע | `hsl(--sidebar)` = סגול | `slate-950` / `slate-900` |
| טקסט | לבן | `slate-300` |
| פריט פעיל | `bg-white/20` | `bg-indigo-500/20` |
| border פעיל | `border-inline-end 3px white/60%` | `border-inline-end 3px indigo-400` |
| hover | `bg-white/10` | `bg-slate-700` |
| גודל | 240–256px | 256px |

---

*MemorAId UX/UI Theming v1.0 | February 2026*
