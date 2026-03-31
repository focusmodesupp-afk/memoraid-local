# MemorAId – UX/UI Master (מקור אמת עליון)

> כל UI בקוד נבנה רק לפי מסמכים אלו. אין חריגות.  
> גרסה: 2.0 | תאריך: פברואר 2026

---

## 1. עקרונות מחייבים (סעיף 12.1)

| # | עיקרון | משמעות |
|---|--------|--------|
| 1 | **Single Source of Truth** | כל UI בקוד נבנה רק לפי Tokens והמסמכים האלו. |
| 2 | **RTL‑First** | כל רכיב מתוכנן מראש ל-RTL. תמיכה ב-EN היא secondary. |
| 3 | **Accessible by Default** | נגישות = ברירת מחדל, לא פיצ'ר נוסף. |
| 4 | **No Magic Numbers** | אין ערכי px/rem/צבע אקראיים. רק מ-Tokens. |
| 5 | **States‑First** | כל רכיב מתועד עם כל מצביו לפני פיתוח. |
| 6 | **Operational Docs** | כל מסמך כולל "מתי כן / מתי לא", לא רק "איך זה נראה". |
| 7 | **Code = Docs** | שינוי בקוד מחייב עדכון במסמכי UX/UI הרלוונטיים. |

---

## 2. Hard Rules – חוקים קשיחים (סעיף 12.2)

כל אחד מהחוקים הבאים הוא **חוסם PR** אם מופר.

| # | כלל | ערך | סעיף |
|---|-----|-----|------|
| R1 | ❌ `max-width` שמשאיר > 30% ריק | אסור | Spec §1, §8 |
| R2 | ❌ padding פנימי בכרטיס < 12px | מינימום 12px | Spec §1, §7 |
| R3 | ❌ כפתור בגובה < 36px | מינימום 36px | Spec §7 |
| R4 | ❌ `font-size` < 11px (מלבד metadata בלבד) | מינימום 11px | Spec §12 |
| R5 | ❌ ניגודיות < 4.5:1 לטקסט רגיל | ≥ 4.5:1 | Accessibility §7.1 |
| R6 | ❌ ניגודיות < 3:1 לטקסט גדול | ≥ 3:1 | Accessibility §7.1 |
| R7 | ❌ `gap` < 4px בין elements (מלבד inline) | מינימום 4px | Spec §13 |
| R8 | ❌ `border-radius` > 16px (מלבד `rounded-full`) | מקסימום 16px | Tokens §4.2 |
| R9 | ❌ שימוש ב-px/rem/color שרירותי | רק מ-Tokens | Tokens |
| R10 | ❌ `:focus { outline: none; }` ללא חלופה | חייב `:focus-visible` | Accessibility §7.2 |
| R11 | ❌ `<img>` ללא `alt` | חייב `alt` | Accessibility §7.3 |
| R12 | ❌ icon-only button ללא `aria-label` | חובה `aria-label` | Accessibility §7.3 |
| R13 | ❌ placeholder כ-label יחיד | חייב `<label>` | Accessibility §7.3 |
| R14 | ❌ הודעת שגיאה = "שגיאה" בלבד | מה+למה+מה לעשות | Content §3 |
| R15 | ❌ תפריט ללא סימון עמוד פעיל | חובה visual active state | Spec §3 |
| R16 | ❌ כרטיס רחב מדי עם תוכן דל | רוחב = יחסי לתוכן | Spec §2 |

---

## 3. מבנה מסמכי ה-UX/UI

```
docs/
├── UX_UI_MASTER.md                  ← אתה כאן – מקור אמת עליון
├── UX_UI_TOKENS.md                  ← Design Tokens: צבעים, גופנים, ריווח
├── UX_UI_SPECIFICATIONS.md          ← חוקיות מספריות: sections, tables, inputs, buttons
├── UX_UI_COMPONENTS.md              ← ספריית רכיבים: מתי כן/לא, ערכים, ARIA
├── UX_UI_STATES.md                  ← כל הסטייטים לכל רכיב (hover, error, loading...)
├── UX_UI_MOTION.md                  ← אנימציות, easing, microinteractions
├── UX_UI_PATTERNS.md                ← דפוסי UX, forms, flows
├── UX_UI_ACCESSIBILITY.md           ← WCAG 2.1 AA: ניגודיות, ARIA, keyboard, RTL
├── UX_UI_ACCESSIBILITY_CHECKLIST.md ← צ'קליסט לפני כל Merge
├── UX_UI_THEMING.md                 ← Light / Dark / Admin / High-Contrast themes
├── UX_UI_CONTENT.md                 ← Microcopy, ניסוח, button labels, error messages
├── UX_UI_ICONOGRAPHY.md             ← Lucide icons: גדלים, צבעים, RTL, ARIA
├── UX_UI_USER_APP.md                ← חוקים ספציפיים לאפליקציית משתמש
├── UX_UI_ADMIN.md                   ← חוקים ספציפיים ל-Admin
├── UX_UI_PAGE_TEMPLATES.md          ← טמפלטים לכל דף (Dashboard, Patient, Rights...)
└── UX_UI_CHANGELOG.md               ← גרסאות ושינויים
```

---

## 4. Workflow – "איך עובדים עם המערכת"

### 4.1 מפתח חדש – סדר קריאה

```
1. UX_UI_MASTER.md          ← עקרונות + Hard Rules (אתה כאן)
2. UX_UI_TOKENS.md          ← הבן את מערכת הצבעים והמרווחים
3. UX_UI_SPECIFICATIONS.md  ← קרא את ה-section הרלוונטי לדף שאתה בונה
4. UX_UI_PAGE_TEMPLATES.md  ← בדוק את הטמפלט לדף הספציפי
5. UX_UI_COMPONENTS.md      ← בחר רכיבים נכונים
6. UX_UI_CONTENT.md         ← כתוב טקסט נכון
7. UX_UI_ACCESSIBILITY_CHECKLIST.md ← בדוק לפני PR
```

### 4.2 כלל לכל שינוי ב-`client/src/pages/`

כל PR שמשנה דף חייב לעבור דרך:

| שלב | מסמך | מה לבדוק |
|-----|------|---------|
| 1 | `UX_UI_PAGE_TEMPLATES.md` | האם הדף עומד בטמפלט? |
| 2 | `UX_UI_SPECIFICATIONS.md` | האם כל המספרים נכונים? |
| 3 | `UX_UI_COMPONENTS.md` | האם משתמשים ברכיבים הנכונים? |
| 4 | `UX_UI_CONTENT.md` | האם הטקסט נכון ועומד בכללים? |
| 5 | `UX_UI_ACCESSIBILITY_CHECKLIST.md` | האם כל פריטי ה-A–I מסומנים? |

### 4.3 כלל לכל שינוי ב-`design-system.css` / `index.css`

- עדכן `UX_UI_TOKENS.md` בהתאם.
- עדכן `UX_UI_CHANGELOG.md` עם גרסה.

### 4.4 כלל לתוספת רכיב חדש

- תעד ב-`UX_UI_COMPONENTS.md` (מתי כן/לא, ערכים, ARIA).
- הוסף States ל-`UX_UI_STATES.md`.
- הוסף אנימציות ל-`UX_UI_MOTION.md`.

---

## 5. Design Tokens – מיפוי לקוד

**קובץ:** `client/src/index.css`

| קטגוריה | Tokens עיקריים | מסמך |
|---------|--------------|------|
| צבעים | `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--destructive`, `--success` | UX_UI_TOKENS.md §1 |
| טיפוגרפיה | `font-sans`, `text-xs..2xl`, `font-normal..semibold` | UX_UI_TOKENS.md §2 |
| ריווח | `space-1..24`, `gap-2..6`, `p-3..5` | UX_UI_TOKENS.md §3 |
| Radius | `rounded-md`, `rounded-xl`, `rounded-full` | UX_UI_TOKENS.md §4 |
| Shadows | `shadow-sm`, `shadow-md`, `shadow-lg` | UX_UI_TOKENS.md §5 |
| Z-Index | 10, 20, 30, 40, 50, 60, 70 | UX_UI_TOKENS.md §6 |

---

## 6. קישורי קוד

| קובץ | תפקיד |
|------|-------|
| `client/src/index.css` | Design tokens, CSS variables, themes |
| `client/src/styles/design-system.css` | Component classes (.section-card, .data-row, .badge, ...) |
| `client/src/components/ui/` | React UI components |
| `client/src/admin/admin-theme.css` | Admin dark theme |
| `client/src/pages/` | Page-level components |

---

## 7. מסמכי Admin

| מסמך | תוכן |
|------|------|
| `docs/UX_UI_ADMIN.md` | Admin UX rules, dark theme, components |
| `docs/ADMIN_UX_BLUEPRINT.md` | Blueprint מפורט לממשק Admin |
| `docs/ADMIN_SYSTEM_SPEC.md` | מפרט מערכת Admin |

---

*MemorAId UX/UI Master v2.0 | February 2026*
