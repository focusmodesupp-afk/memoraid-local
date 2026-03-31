# MemorAId – Motion & Microinteractions

> אנימציות שמטרתן תקשורת, לא קישוט. כל תנועה חייבת לשרת מטרה.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 1. עקרונות Motion

| עיקרון | הגדרה | יישום |
|--------|-------|-------|
| **Purposeful – מכוון** | כל אנימציה מתקשרת מצב (טעינה, מעבר, הצלחה) | אסור אנימציה לאנימציה בלבד |
| **Fast – מהיר** | אנימציות UI קצרות – לא מעכבות את המשתמש | max 400ms לרוב ה-interactions |
| **Natural – טבעי** | עיקומי easing שמשקפים פיזיקה אמיתית | שימוש ב-ease-out ל-enter, ease-in ל-exit |
| **Accessible – נגיש** | כיבוד `prefers-reduced-motion` | כל אנימציה עם גרסת reduced fallback |

---

## 2. Duration Scale – סקאלת זמנים

| שם | טווח (ms) | שימוש טיפוסי |
|----|-----------|--------------|
| **Instant** | 0–50ms | אין אנימציה / state change בלתי-מורגש |
| **Micro** | 50–100ms | Hover feedback (bg, border), focus ring |
| **Short** | 100–200ms | כפתור click, badge appear, checkbox toggle |
| **Medium** | 200–300ms | Dropdown open/close, Toast enter, modal overlay fade |
| **Long** | 300–400ms | Modal open/close (slide+fade), Accordion expand |
| **Slow** | 400–600ms | Page transition, skeleton to content, progress animation |
| **אסור** | >600ms | פשוט ארוך מדי – מתיש את המשתמש |

---

## 3. Easing Curves – עיקומי easing

### 3.1 טבלת Easing

| Token | CSS Value | שימוש |
|-------|-----------|-------|
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations (יציאה) |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations (כניסה) |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | מעברים, move animations |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bounce effect (עדין) – כפתורים, badges |
| `--ease-linear` | `linear` | Spinners, progress bars |

### 3.2 מיפוי שימוש

| הקשר | Easing |
|------|--------|
| כניסת אלמנט לדף | `ease-out` |
| יציאת אלמנט מהדף | `ease-in` |
| מעבר בין states | `ease-in-out` |
| Hover effect | `ease-out` (קצר, 150ms) |
| Spinner | `linear` |
| Pop/bounce (badge counter) | `ease-spring` |

---

## 4. Microinteractions Catalog – קטלוג מלא

### 4.1 Buttons

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| btn-primary hover | `mouseenter` | `background-color` כהה יותר 8% | 150ms | ease-out |
| btn-primary click | `mousedown` | `scale(0.97)` + bg כהה יותר 15% | 100ms | ease-in-out |
| btn-primary click release | `mouseup` | `scale(1)` | 100ms | ease-spring |
| btn-primary loading | async start | replace text with spinner + "שומר..." | 200ms | ease-out |
| btn-primary success | complete | replace spinner with `check` icon, bg → `--success` | 200ms | ease-out |
| btn-primary success reset | 1500ms לאחר הצלחה | reset to default | 200ms | ease-in-out |
| btn-outline hover | `mouseenter` | bg → `hsl(--muted)` | 150ms | ease-out |
| icon-only button hover | `mouseenter` | bg `hsl(--muted)` + scale(1.05) | 150ms | ease-out |

### 4.2 Inputs

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| input focus | `focus` | border → `hsl(--ring)` 2px + ring-2 appear | 150ms | ease-out |
| input error | validation fail | border → `hsl(--destructive)`, shake (2x, 4px) | 300ms | ease-in-out |
| input error message | error show | `opacity 0→1`, `translateY(-4px→0)` | 200ms | ease-out |
| input success | validation pass | border → `hsl(--success)`, check icon fade in | 200ms | ease-out |
| label float | (אם implements floating label) | `scale(0.8)`, `translateY(-18px)` | 200ms | ease-in-out |

### 4.3 Cards / Sections

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| clickable card hover | `mouseenter` | `box-shadow` → shadow-md, `translateY(-1px)` | 200ms | ease-out |
| clickable card leave | `mouseleave` | shadow-sm, `translateY(0)` | 200ms | ease-in |
| SmartSection collapse | click toggle | `max-height` → 0, `opacity 1→0` | 300ms | ease-in-out |
| SmartSection expand | click toggle | `max-height` → content, `opacity 0→1` | 300ms | ease-out |
| section load | mount | `opacity 0→1`, `translateY(8px→0)` | 300ms | ease-out |

### 4.4 Toasts / Alerts

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Toast enter | show | `translateY(20px→0)`, `opacity 0→1` | 200ms | ease-out |
| Toast exit | auto dismiss / close | `opacity 1→0`, `translateY(0→10px)` | 200ms | ease-in |
| Alert inline enter | state change | `opacity 0→1`, `max-height 0→auto` | 250ms | ease-out |
| Alert inline exit | resolve | `opacity 1→0`, `max-height auto→0` | 200ms | ease-in |

### 4.5 Modals / Dialogs

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Modal overlay | open | `opacity 0→0.6` | 200ms | ease-out |
| Modal content | open | `opacity 0→1`, `scale(0.95→1)`, `translateY(8px→0)` | 250ms | ease-out |
| Modal overlay | close | `opacity 0.6→0` | 200ms | ease-in |
| Modal content | close | `opacity 1→0`, `scale(1→0.95)` | 200ms | ease-in |

### 4.6 Dropdowns / Popovers

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Dropdown open | click trigger | `opacity 0→1`, `translateY(-8px→0)` (direction מ‑RTL) | 200ms | ease-out |
| Dropdown close | click outside / Escape | `opacity 1→0`, `translateY(0→-4px)` | 150ms | ease-in |
| Dropdown item hover | `mouseenter` | bg → `hsl(--muted)` | 100ms | ease-out |

### 4.7 Accordions / Collapsibles

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Accordion open | click header | `max-height: 0 → content height`, `opacity 0→1` | 300ms | ease-out |
| Accordion close | click header | `max-height: content→0`, `opacity 1→0` | 250ms | ease-in |
| Arrow/chevron rotate | open/close | `rotate(0→180deg)` | 250ms | ease-in-out |

### 4.8 Tabs

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Tab active indicator | tab change | indicator slide (left/right), 200ms | 200ms | ease-in-out |
| Tab content switch | tab change | `opacity 0→1` | 150ms | ease-out |

### 4.9 Skeleton Loaders

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Skeleton shimmer | mounted | gradient L→R sweep | 1500ms | linear, infinite |
| Skeleton → content | data loaded | `opacity: 0→1`, skeleton fade out | 300ms | ease-out |

---

## 5. Page Transitions

### 5.1 Route Change Animation

| שלב | Animation | Duration |
|-----|-----------|----------|
| Page exit | `opacity 1→0`, `translateX(0→-20px)` | 200ms |
| Page enter | `opacity 0→1`, `translateX(20px→0)` | 250ms |
| Delay between exit/enter | – | 50ms |

**RTL הערה:** כיוון translateX הפוך ב‑RTL (כניסה מ‑שמאל, יציאה לימין).

### 5.2 Stagger List Items

כאשר מוצגת רשימה לאחר טעינה, הפריטים יופיעו בהדרגה:

```css
/* כל פריט מתעכב ב-50ms נוסף */
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
/* מקסימום: 300ms delay */
```

### 5.3 Scroll Behavior

```css
html {
  scroll-behavior: smooth;
}
```

---

## 6. Reduced Motion – נגישות תנועה

**חובה:** כל אנימציה חייבת לכבד `prefers-reduced-motion`.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**חלופות:**
- State change (צבע, גבול) – מתאים גם ב-reduced motion.
- Opacity change עדין – מותר.
- Scale, translate, rotate – **אסור** ב-reduced motion.

---

## 7. הנחיות יישום בקוד

### 7.1 Tailwind Transition Classes

| שימוש | Tailwind |
|-------|---------|
| כל ה-transitions ב-button | `transition-all duration-150 ease-out` |
| Hover bg בלבד | `transition-colors duration-150` |
| Scale בלבד | `transition-transform duration-100` |
| הכל ביחד | `transition duration-200 ease-in-out` |

### 7.2 Framer Motion (אם קיים/יתווסף)

```tsx
// כניסת דף
const pageVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' } }
};

// Stagger children
const containerVariants = {
  visible: { transition: { staggerChildren: 0.05 } }
};
```

---

*MemorAId UX/UI Motion v1.0 | February 2026*
