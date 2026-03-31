# MemorAId – מפרטי UX/UI (מספריים)

> **מסמך חובה** – כל ערך מוגדר במספרים. אין מקום לפרשנות.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 1. סקשנים (Sections)

| פרמטר | ערך | יחידה | הערות |
|-------|-----|-------|-------|
| padding פנימי section-compact | 16px | px | p-4 |
| padding פנימי section-card | 20px | px | p-5 |
| padding פנימי card-compact | 12px | px | p-3 |
| border-radius | 12px | px | rounded-xl |
| border-width | 1px | px | |
| מרווח בין סקשנים (vertical) | 24px | px | space-y-6 / gap-6 |
| shadow section-compact | shadow-sm | - | |
| shadow section-card | shadow-md | - | |
| מרווח בין כותרת לתוכן (section-title) | 4px | px | mb-1 |
| גובה מינימלי סקשן | אין | - | לפי תוכן |

**אחוזי Layout בתוך דף:**
- Main content: 100% של האזור הזמין (ללא max-width שמשאיר ריק)
- Sidebar (אם קיים): 240px קבוע (w-60) – 15–18% במסך 1280px
- יחס Main:Sidebar במסכים רחבים: ~85% : ~15%

---

## 2. כרטיסים (Cards) – כולל רוחב לפי צפיפות תוכן

| פרמטר | ערך | יחידה |
|-------|-----|-------|
| padding | 16–20px | px |
| border-radius | 12px | px |
| border | 1px | px |
| shadow | sm / md | - |
| gap בין כרטיסים | 24px | px |

### רוחב כרטיס לפי צפיפות תוכן (חובה)

| מצב | כלל | ערך |
|-----|------|-----|
| כרטיס עם תוכן דל (פחות מ-3 שורות טקסט) | רוחב מקסימלי | 400px (max-w-md) או 33% מהעמודה |
| כרטיס עם תוכן בינוני | רוחב מקסימלי | 480px (max-w-lg) |
| כרטיס עם תוכן עשיר | ניתן למתוח | עד 100% של העמודה |
| גריד כרטיסים דלים | מספר עמודות xl | 3–4 עמודות |
| גריד כרטיסים דלים | מינימום md | 2 עמודות |

**כלל אצבע:** רוחב כרטיס = יחסי לצפיפות התוכן. ככל שמעט תוכן – כרטיס צר יותר.

---

## 3. ניווט – פריט תפריט פעיל (Sidebar / Nav)

| אלמנט | מצב | עיצוב |
|-------|------|-------|
| פריט תפריט | רגיל | טקסט לבן, רקע שקוף |
| פריט תפריט | hover | רקע `bg-white/10` |
| פריט תפריט | **פעיל (current page)** | רקע `bg-white/20` או `bg-[hsl(var(--sidebar-accent))]` |
| פריט תפריט | פעיל | font-weight: 600 (bold) |
| פריט תפריט | פעיל | אפשרות: `border-inline-end` 3px accent |

**יישום:** השוואת pathname ל-href – אם תואם, class לפעיל. חובה.

---

## 4. לוח בקרה (Dashboard)

| אלמנט | כלל | ערך |
|-------|------|-----|
| מבנה | גריד | 2–3 עמודות על מסכים רחבים |
| סקשן KPI | גודל | שורת badges אחת, קומפקטית |
| סקשנים עיקריים | יחס | 2:1 (שמאל:ימין) או 3:2 |
| תוכן דל (empty state) | גודל | לא כרטיס רחב – max-width או שורה אחת |
| צפיפות | איסור | אין סקשנים ענקיים עם 1–2 שורות בלבד |
| רווח | בין סקשנים | 24px (gap-6) |

---

## 5. טבלאות (Tables)

| פרמטר | ערך | יחידה | הערות |
|-------|-----|-------|-------|
| גובה שורת header | 48px | px | min-h |
| גובה שורת נתונים | 44px | px | min-h, compact: 40px |
| padding אופקי תא | 16px | px | px-4 |
| padding אנכי תא | 12px | px | py-3 |
| border בין שורות | 1px | px | |
| font-size header | 12px | px | text-xs, font-semibold |
| font-size תא | 14px | px | text-sm |
| רוחב מינימלי עמודה | 80px | px | או לפי תוכן |
| hover על שורה | background subtle | - | bg-[hsl(var(--muted))/0.3] |
| sticky header | top: 0 | - | z-10 |

**אחוזי רוחב עמודות:**
- עמודה ראשונה (שם/מזהה): 25–30%
- עמודות ביניים: גמיש
- עמודת פעולות: 120px קבוע או 10%

---

## 6. שדות קלט (Inputs)

| פרמטר | ערך | יחידה | הערות |
|-------|-----|-------|-------|
| גובה שדה | 40px | px | min-h |
| padding אופקי | 12px | px | px-3 |
| padding אנכי | 8px | px | py-2 |
| border-radius | 8px | px | rounded-lg |
| border-width | 1px | px | |
| font-size | 14px | px | text-sm |
| font-size label | 12px | px | text-xs |
| מרווח בין label ל-input | 4px | px | mb-1 |
| מרווח בין שדות (בטפסים) | 16px | px | space-y-4 |
| מרווח בין שדות באותה שורה | 16px | px | gap-4 |
| focus ring | 2px | px | ring-2 |
| textarea min-height | 80px | px | rows=3 ~80px |

**Grid טפסים:**
- Mobile: 1 עמודה (100%)
- md (768px+): 2 עמודות (50% כל אחת)
- מרווח בין עמודות: 16px (gap-4)

---

## 7. כפתורים (Buttons)

| פרמטר | ערך | יחידה | הערות |
|-------|-----|-------|-------|
| גובה מינימלי | 40px | px | py-2.5 (Admin), py-2 (User) |
| padding אופקי | 16px | px | px-4 |
| padding אנכי | 8–10px | px | py-2 או py-2.5 |
| border-radius | 9999px / 8px | px | rounded-full (User) / rounded-lg (Admin) |
| font-size | 14px | px | text-sm |
| font-weight | 500 | - | font-medium |
| מרווח אייקון–טקסט | 8px | px | gap-2 |
| מרווח בין כפתורים | 12px | px | gap-3 |
| disabled opacity | 50% | % | opacity-50 |
| hover transition | 150ms | ms | transition-colors |

---

## 8. רספונסיביות (Responsiveness)

**Breakpoints (Tailwind default):**

| Breakpoint | ערך | שימוש |
|------------|-----|-------|
| sm | 640px | טקסט, padding |
| md | 768px | גריד 2 עמודות, תפריטים |
| lg | 1024px | sidebar מוצג, גריד 2–3 |
| xl | 1280px | גריד 3 עמודות תוכן |
| 2xl | 1536px | max-width אופציונלי |

**Grid עמודות לפי דף תוכן:**
- Mobile (<768px): 1 עמודה (100%)
- md (768–1279px): 2 עמודות (50% כל אחת, gap 24px)
- xl (1280px+): 3 עמודות (~33.33% כל אחת, gap 24px)

**Padding דף:**
- Mobile: 16px (p-4)
- sm+: 24px (p-6)

**Header / App bar:**
- גובה: 56px (mobile), 64px (desktop)
- padding אופקי: 16px (mobile), 20px (sm+)

**Sidebar:**
- רוחב: 256px (w-64) או 240px (w-60)
- מוסתר ב-<768px (md)
- מוצג מ-md ומעלה

---

## 9. מודלים (Modals / Dialogs)

| פרמטר | ערך | יחידה |
|-------|-----|-------|
| max-width | 512px (sm), 672px (md), 896px (lg) | px |
| max-height | 90vh | vh |
| padding | 24px | px |
| border-radius | 12px | px |
| overlay | rgba(0,0,0,0.6) + backdrop-blur | - |
| מרווח בין כפתורים Footer | 12px | px |

---

## 10. Badges / תגיות

| פרמטר | ערך | יחידה |
|-------|-----|-------|
| padding | 2px 8px | px |
| border-radius | 6px | px |
| font-size | 12px | px |
| gap בין badges | 8px | px |

---

## 11. Data Row (label | value)

| פרמטר | ערך | יחידה |
|-------|-----|-------|
| padding אנכי | 8px | px |
| gap בין label ל-value | 16px | px |
| font-size label | 12px | px |
| font-size value | 14px | px |
| border-bottom | 1px, 50% opacity | px |

---

## 12. טיפוגרפיה מלאה

| רמה | size (px) | size (rem) | line-height | weight | letter-spacing | Tailwind | שימוש טיפוסי |
|-----|----------|-----------|-------------|--------|---------------|---------|--------------|
| Display | 30px | 1.875rem | 1.2 | 700 | -0.025em | `text-3xl font-bold tracking-tight` | Landing, marketing |
| H1 | 24px | 1.5rem | 1.3 | 600 | -0.025em | `text-2xl font-semibold tracking-tight` | כותרת דף ראשי |
| H2 | 20px | 1.25rem | 1.35 | 600 | -0.015em | `text-xl font-semibold` | כותרת section גדול |
| H3 | 18px | 1.125rem | 1.4 | 600 | 0 | `text-lg font-semibold` | כותרת כרטיס / SmartSection |
| H4 | 16px | 1rem | 1.4 | 600 | 0 | `text-base font-semibold` | כותרת תת-section |
| H5 | 14px | 0.875rem | 1.4 | 600 | 0 | `text-sm font-semibold` | Section title (`.section-title`) |
| Body LG | 16px | 1rem | 1.5 | 400 | 0 | `text-base` | תיאורים, paragraphs |
| Body | 14px | 0.875rem | 1.5 | 400 | 0 | `text-sm` | ברירת מחדל, table cells, inputs |
| Body SM | 13px | 0.8125rem | 1.5 | 400 | 0 | – | *(לא בשימוש – עדיף text-xs)* |
| Small | 12px | 0.75rem | 1.4 | 400–500 | 0 | `text-xs` | Labels, metadata, badges, captions |
| Caption | 11px | 0.6875rem | 1.3 | 400 | 0.025em | `text-[11px]` | מינימום מוחלט – metadata בלבד |
| Overline | 11px | 0.6875rem | 1.3 | 500 | 0.1em | `text-[11px] tracking-widest uppercase` | קטגוריות, section-labels |

---

## 13. Spacing Scale (חובה)

| שם | ערך | Tailwind |
|----|-----|----------|
| 1 | 4px | 1 |
| 2 | 8px | 2 |
| 3 | 12px | 3 |
| 4 | 16px | 4 |
| 5 | 20px | 5 |
| 6 | 24px | 6 |
| 8 | 32px | 8 |
| 10 | 40px | 10 |
| 12 | 48px | 12 |

**שימוש קבוע:**
- בין אייקון לטקסט: 8px (gap-2)
- בין שדות בטפסים: 16px (space-y-4 / gap-4)
- padding כרטיס: 16–20px
- בין סקשנים: 24px (space-y-6)

---

## 14. Navigation (Sidebar)

| פרמטר | ערך | יחידה |
|-------|-----|-------|
| רוחב sidebar desktop | 240–256px | px |
| גובה nav item | 40px | px |
| padding nav item | 8px 12px | px |
| font-size nav item | 14px | px |
| font-weight רגיל | 400 | – |
| font-weight פעיל | 600 | – |
| icon nav item | 20px | px |
| gap icon–text | 8px | px |
| border פעיל (inline-end) | 3px | px |
| מוסתר מ-mobile | <768px | – |

---

## 15. Tooltips

| פרמטר | ערך | יחידה |
|-------|-----|-------|
| max-width | 200px | px |
| padding | 6px 10px | px |
| font-size | 12px | px |
| border-radius | 6px | px |
| z-index | 70 | – |
| delay (show) | 600ms | ms |
| delay (hide) | 0ms | ms |
| animation | fade-in 150ms | – |

---

## 16. Dropdowns / Menus

| פרמטר | ערך | יחידה |
|-------|-----|-------|
| min-width | 160px | px |
| max-width | 280px | px |
| padding (container) | 4px | px |
| padding item | 8px 12px | px |
| font-size item | 14px | px |
| border-radius container | 12px | px |
| border-radius item | 6px | px |
| separator height | 1px | px |
| z-index | 40 | – |
| shadow | shadow-lg | – |
| hover item bg | `hsl(--muted)` | – |

---

## 17. Alerts / Toasts

| פרמטר | Alert (Inline) | Toast |
|-------|--------------|-------|
| padding | 12px 16px | 12px 16px |
| border-radius | 8px (rounded-lg) | 12px (rounded-xl) |
| border | 1px left accent (4px) | none |
| font-size | 14px | 14px |
| icon size | 16px | 16px |
| gap icon–text | 8px | 8px |
| z-index | בתוך flow | 60 |
| max-width | – | 384px (max-w-sm) |
| משך הצגה | עד סגירה | 3000ms ברירת מחדל |

---

## 18. Avatars

| גודל | px | Tailwind | שימוש |
|------|----|---------:|-------|
| xs | 24px | `size-6` | table cells, inline |
| sm | 32px | `size-8` | nav, list items |
| md | 40px | `size-10` | profile cards |
| lg | 64px | `size-16` | profile page |
| xl | 96px | `size-24` | profile header |

**Spec:** `rounded-full`, border `2px white` ב-overlap stacks.

---

## 19. Progress / Loaders

| פרמטר | ערך | יחידה |
|-------|-----|-------|
| Progress bar height | 8px | px |
| Progress bar radius | 4px | px |
| Spinner size (small) | 16px | px |
| Spinner size (medium) | 24px | px |
| Spinner size (page) | 32px | px |
| Skeleton radius | זהה לצורה | – |
| Skeleton shimmer duration | 1500ms | ms |

---

## 20. איסורים (חוקים קשיחים)

- אסור max-width שמשאיר יותר מ-30% ריק במסך
- אסור padding קטן מ-12px בתוך כרטיס/סקשן
- אסור כפתור בגובה קטן מ-36px
- אסור font-size קטן מ-11px (מלבד metadata)
- אסור ניגודיות מתחת ל-4.5:1 (טקסט רגיל)
- אסור gap בין אלמנטים קטן מ-4px (מלבד inline)
- אסור border-radius גדול מ-16px (מלבד rounded-full לכפתורים)
- אסור שימוש ב-px או rem שרירותי – חובה ממערכת ה-Spacing
- אסור כרטיס רחב מדי עם תוכן דל – רוחב יחסי לתוכן
- אסור תפריט ללא סימון עמוד פעיל – חובה סימון חזותי

---

*MemorAId UX/UI Specifications v2.0 | February 2026*
