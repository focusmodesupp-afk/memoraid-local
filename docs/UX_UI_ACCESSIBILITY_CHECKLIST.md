# MemorAId – Accessibility Checklist (לפני Merge)

> סמן ✅ כל פריט לפני כל PR שמשנה UI. פריטים ב-❌ חוסמים merge.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## A. ניגודיות צבע

| # | בדיקה | תקן | ✓/✗ |
|---|-------|-----|-----|
| A1 | כל טקסט רגיל (<18px) עומד ביחס ≥ 4.5:1 | WCAG AA | ☐ |
| A2 | כל טקסט גדול (≥18px bold / ≥24px) עומד ביחס ≥ 3:1 | WCAG AA | ☐ |
| A3 | אייקונים ו-borders עומדים ביחס ≥ 3:1 | WCAG AA | ☐ |
| A4 | `--muted-foreground` על `--muted` ≥ 4.5:1 | UX-ACC-7.1 | ☐ |
| A5 | `--primary-foreground` על `--primary` ≥ 4.5:1 | UX-ACC-7.1 | ☐ |
| A6 | טקסט sidebar ≥ 4.5:1 על רקע ה-sidebar | UX-ACC-7.1 | ☐ |

**כלי בדיקה מומלץ:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## B. Focus Management

| # | בדיקה | ✓/✗ |
|---|-------|-----|
| B1 | אין `:focus { outline: none }` ללא `:focus-visible` חלופה | ☐ |
| B2 | כל כפתור / לינק / input מציג ring ב-Tab navigation | ☐ |
| B3 | מודלים: Focus Trap פעיל (Tab מסתובב בתוך המודל) | ☐ |
| B4 | עם סגירת מודל / dropdown – focus חוזר ל-trigger | ☐ |
| B5 | Skip Link קיים ועובד | ☐ |
| B6 | סדר Tab לוגי ומתאים לסדר ויזואלי | ☐ |

---

## C. Labels ו-ARIA

| # | בדיקה | ✓/✗ |
|---|-------|-----|
| C1 | כל `<input>` / `<select>` / `<textarea>` עם `<label>` מקושר | ☐ |
| C2 | כל icon-only button עם `aria-label` | ☐ |
| C3 | מודלים עם `role="dialog"`, `aria-modal="true"`, `aria-labelledby` | ☐ |
| C4 | שדות עם שגיאה: `aria-invalid="true"`, `aria-describedby` → error message | ☐ |
| C5 | שדות חובה: `aria-required="true"` | ☐ |
| C6 | Toasts / Alerts עם `aria-live` מתאים | ☐ |
| C7 | Progress bars עם `role="progressbar"` ו-`aria-valuenow` | ☐ |
| C8 | Collapsible sections עם `aria-expanded` | ☐ |
| C9 | טבלאות עם `<th scope="col">` | ☐ |
| C10 | כל `<img>` עם `alt` (ריק לדקורטיב, תיאורי לתוכן) | ☐ |

---

## D. ניווט מקלדת

| # | בדיקה | ✓/✗ |
|---|-------|-----|
| D1 | ניתן להפעיל כל action ב-Tab + Enter / Space בלבד | ☐ |
| D2 | מודלים נסגרים עם Escape | ☐ |
| D3 | Dropdowns נסגרים עם Escape וחוזרים ל-trigger | ☐ |
| D4 | Dropdowns: ניווט ב-↑ / ↓ | ☐ |
| D5 | Accordions: פתיחה/סגירה ב-Enter / Space | ☐ |
| D6 | Tab lists: ניווט ב-← / → | ☐ |
| D7 | אין "מלכודת Tab" (focus לא נתקע ברכיב) | ☐ |

---

## E. RTL

| # | בדיקה | ✓/✗ |
|---|-------|-----|
| E1 | `dir="rtl"` על `<html>` | ☐ |
| E2 | אין `margin-left/right` קשיח – שימוש ב-`inline-start/end` | ☐ |
| E3 | חצים ו-chevrons מכווינים נכון ב-RTL | ☐ |
| E4 | Sidebar: פריט פעיל עם `border-inline-end` (לא `border-right`) | ☐ |
| E5 | Toast / Notifications מופיעים ב-bottom-start (לא bottom-right) | ☐ |
| E6 | Modals ו-Drawers: כיוון slide נכון ב-RTL | ☐ |

---

## F. Responsive & Content

| # | בדיקה | ✓/✗ |
|---|-------|-----|
| F1 | אין overflow אופקי ב-mobile (320px) | ☐ |
| F2 | כל טקסט קריא ב-mobile (לא < 12px) | ☐ |
| F3 | Placeholder אינו משמש כ-label יחיד | ☐ |
| F4 | הודעות שגיאה כוללות: מה קרה + למה + מה לעשות | ☐ |
| F5 | אין מידע מועבר ב-צבע בלבד (יש גם אייקון/טקסט) | ☐ |

---

## G. Forms

| # | בדיקה | ✓/✗ |
|---|-------|-----|
| G1 | שגיאות מוצגות inline מתחת לשדה הרלוונטי | ☐ |
| G2 | Submit button מציג loading state | ☐ |
| G3 | בעת שגיאת שרת: הודעת שגיאה ברורה מוצגת בראש הטופס | ☐ |
| G4 | Focus מועבר לשגיאה הראשונה בעת submit | ☐ |

---

## H. Motion

| # | בדיקה | ✓/✗ |
|---|-------|-----|
| H1 | `@media (prefers-reduced-motion: reduce)` מבטל animations | ☐ |
| H2 | אין תנועה שמשתמשת ב-scale/translate ב-reduced motion | ☐ |
| H3 | Spinners עוצרים ב-reduced motion (או מוחלפים בדוט) | ☐ |

---

## I. Hard Rules (מה-UX_UI_MASTER.md)

| # | בדיקה | ✓/✗ |
|---|-------|-----|
| I1 | אין `max-width` שמשאיר > 30% ריק | ☐ |
| I2 | כל padding פנימי בכרטיס/סקשן ≥ 12px | ☐ |
| I3 | גובה כל כפתור ≥ 36px | ☐ |
| I4 | אין `font-size` < 11px (מלבד metadata) | ☐ |
| I5 | כל gap בין elements ≥ 4px | ☐ |
| I6 | תפריט מציג סימון עמוד פעיל | ☐ |
| I7 | כרטיסים עם תוכן דל: רוחב מוגבל (לא נמתח לאינסוף) | ☐ |

---

## ✅ תוצאה

| תוצאה | פעולה |
|-------|-------|
| כל הפריטים ✅ | מותר לעבור Merge |
| פריטים A–E עם ✗ | **חסום Merge** – יש לתקן |
| פריטים F–I עם ✗ | יש לתעד ב-PR ולתקן בסיבוב הבא |

---

*MemorAId UX/UI Accessibility Checklist v1.0 | February 2026*
