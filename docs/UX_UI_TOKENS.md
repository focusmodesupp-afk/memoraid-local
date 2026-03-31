# MemorAId – Design Tokens

> כל הטוקנים הם המקור היחיד לצבעים, גופנים, מרווחים ועיצוב ב‑MemorAId.  
> אין להשתמש בערכי px / rem / צבע שרירותיים – רק ב‑Tokens.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 1. Color Tokens – שלוש שכבות

### 1.1 Primitive Color Tokens – פלטת הבסיס

ערכים כ‑HSL (Hue Saturation Lightness) כפי שמוגדר ב‑`client/src/index.css`.

| Token | HSL (User Light) | HSL (User Dark) | שימוש בסיסי |
|-------|-----------------|-----------------|-------------|
| `--color-purple-50` | 250 80% 97% | 250 40% 18% | רקעים קלים |
| `--color-purple-100` | 252 79% 92% | 252 35% 22% | hover, subtle |
| `--color-purple-300` | 253 79% 75% | 253 65% 55% | accent light |
| `--color-purple-500` | 253 79% 58% | 253 79% 62% | primary actions |
| `--color-purple-700` | 253 75% 42% | 253 70% 70% | pressed state |
| `--color-purple-900` | 253 60% 20% | 253 15% 85% | deep text |
| `--color-gray-0` | 0 0% 100% | 250 20% 10% | pure white/dark |
| `--color-gray-50` | 250 45% 96% | 250 25% 12% | page background |
| `--color-gray-100` | 253 35% 95% | 253 20% 16% | muted bg |
| `--color-gray-200` | 253 30% 88% | 253 20% 22% | borders |
| `--color-gray-400` | 253 15% 65% | 253 10% 55% | secondary text |
| `--color-gray-600` | 253 20% 35% | 253 10% 70% | tertiary text |
| `--color-gray-950` | 253 50% 8% | 253 15% 95% | main foreground |
| `--color-red-500` | 0 72% 51% | 0 65% 55% | destructive, error |
| `--color-green-500` | 142 71% 45% | 142 60% 52% | success |
| `--color-yellow-500` | 38 92% 50% | 38 85% 58% | warning (chart) |
| `--color-blue-500` | 200 85% 52% | 200 75% 58% | info |
| `--color-pink-500` | 320 75% 55% | 320 70% 62% | warning (UI) |

---

### 1.2 Semantic Color Tokens – מיפוי משמעות

| Token | משמעות | Light value (HSL) | Dark value (HSL) |
|-------|--------|------------------|-----------------|
| `--primary` | כפתורים ראשיים, לינקים, focus | 253 79% 58% | 253 79% 62% |
| `--primary-foreground` | טקסט על primary | 0 0% 100% | 253 20% 10% |
| `--accent` | accent/secondary actions | 280 65% 55% | 280 65% 60% |
| `--accent-foreground` | טקסט על accent | 0 0% 100% | 253 20% 10% |
| `--secondary` | רקעים משניים, chips | 200 60% 92% | 200 50% 25% |
| `--secondary-foreground` | טקסט על secondary | 253 50% 8% | 0 0% 98% |
| `--success` | הצלחה, מצב פעיל חיובי | 142 71% 45% | 142 60% 52% |
| `--warning` | אזהרה, תשומת לב | 320 75% 55% | 320 70% 62% |
| `--info` | מידע, הסברים | 200 85% 52% | 200 75% 58% |
| `--destructive` | מחיקה, שגיאה, סכנה | 0 72% 51% | 0 65% 55% |
| `--destructive-foreground` | טקסט על destructive | 0 0% 100% | 0 0% 100% |

---

### 1.3 Component Color Tokens – טוקנים ברמת רכיב

| Token | שימוש | Light (HSL) | Dark (HSL) | קובץ מקור |
|-------|-------|------------|-----------|-----------|
| `--background` | רקע ראשי של האפליקציה | 250 45% 96% | 250 40% 14% | `index.css` |
| `--foreground` | טקסט ראשי | 253 50% 8% | 253 15% 95% | `index.css` |
| `--card` | רקע כרטיסים ו‑sections | 253 40% 99% | 253 30% 12% | `index.css` |
| `--card-foreground` | טקסט בכרטיס | 253 50% 8% | 253 15% 95% | `index.css` |
| `--popover` | רקע Dropdown/Tooltip | 253 40% 99% | 253 30% 12% | `index.css` |
| `--popover-foreground` | טקסט ב‑popover | 253 50% 8% | 253 15% 95% | `index.css` |
| `--muted` | רקעים מרוסנים (chips, dividers) | 253 35% 95% | 253 25% 18% | `index.css` |
| `--muted-foreground` | טקסט משני, labels, metadata | 253 15% 45% | 253 10% 65% | `index.css` |
| `--border` | גבולות כרטיסים, inputs, dividers | 253 30% 88% | 253 20% 22% | `index.css` |
| `--input` | רקע שדות קלט | 253 25% 92% | 253 20% 25% | `index.css` |
| `--ring` | focus ring | 253 79% 58% | 253 79% 62% | `index.css` |
| `--sidebar` | רקע סרגל צד | 253 79% 58% | 253 75% 45% | `index.css` |
| `--sidebar-foreground` | טקסט בסרגל צד | 0 0% 100% | 0 0% 98% | `index.css` |
| `--sidebar-accent` | פריט פעיל בסרגל צד | 253 85% 70% | 253 70% 55% | `index.css` |
| `--sidebar-border` | גבולות בסרגל צד | 253 70% 50% | 253 60% 45% | `index.css` |

---

### 1.4 Chart Tokens

| Token | ערך (Light) | ערך (Dark) |
|-------|------------|-----------|
| `--chart-1` | 253 79% 58% | 253 79% 62% |
| `--chart-2` | 200 85% 52% | 200 75% 58% |
| `--chart-3` | 320 70% 58% | 320 65% 62% |
| `--chart-4` | 142 71% 45% | 142 60% 52% |
| `--chart-5` | 38 92% 50% | 38 85% 58% |

---

## 2. Typography Tokens

### 2.1 Font Families

| Token | ערך | שימוש |
|-------|-----|-------|
| `--font-sans` | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | טקסט כללי (body, labels, buttons) |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', Consolas, monospace` | קוד, IDs, timestamps |
| `--font-display` | זהה ל‑sans כרגע | כותרות Display (עתידי) |

### 2.2 Font Size Scale (Tailwind mapping)

| Token / Tailwind Class | גודל (px) | גודל (rem) | שימוש |
|------------------------|-----------|-----------|-------|
| `text-xs` | 12px | 0.75rem | Captions, labels, metadata, badges |
| `text-sm` | 14px | 0.875rem | Body text, table cells, inputs |
| `text-base` | 16px | 1rem | Body large, descriptions |
| `text-lg` | 18px | 1.125rem | H3, card headings |
| `text-xl` | 20px | 1.25rem | H2, page section titles |
| `text-2xl` | 24px | 1.5rem | H1, page titles |
| `text-3xl` | 30px | 1.875rem | Display (זהיר – רק landing) |
| ~~קטן מ‑text-xs~~ | ~~<12px~~ | – | **אסור** (מלבד 11px caption בלבד) |

### 2.3 Font Weight Scale

| Token / Tailwind | ערך | שימוש |
|-----------------|-----|-------|
| `font-normal` | 400 | Body, table cells, form values |
| `font-medium` | 500 | Buttons, nav items, labels |
| `font-semibold` | 600 | Headings (H1–H3), page title, active nav |
| `font-bold` | 700 | זהיר – רק emphatic headings |

### 2.4 Line Height

| Tailwind | ערך | שימוש |
|---------|-----|-------|
| `leading-tight` | 1.25 | Display, H1 |
| `leading-snug` | 1.375 | H2, H3 |
| `leading-normal` | 1.5 | Body text |
| `leading-relaxed` | 1.625 | Long paragraphs |

### 2.5 Letter Spacing

| Tailwind | ערך | שימוש |
|---------|-----|-------|
| `tracking-tight` | -0.025em | Headings גדולות |
| `tracking-normal` | 0em | Body |
| `tracking-wide` | 0.025em | All caps labels, Overline |
| `tracking-widest` | 0.1em | Overline, tags (זהיר) |

---

## 3. Spacing Tokens

סקאלה מלאה – כל ערך מרווח חייב להגיע מהסקאלה הזאת.

| Token (Tailwind) | ערך (px) | ערך (rem) | שימושים עיקריים |
|-----------------|---------|---------|----------------|
| `0` | 0px | 0 | reset |
| `0.5` | 2px | 0.125rem | inline gap מינימלי |
| `1` | 4px | 0.25rem | gap בין אייקון לאייקון |
| `1.5` | 6px | 0.375rem | padding badge אנכי |
| `2` | 8px | 0.5rem | gap אייקון‑טקסט, badge padding |
| `2.5` | 10px | 0.625rem | padding כפתור אנכי Admin |
| `3` | 12px | 0.75rem | padding card-compact, button min padding |
| `4` | 16px | 1rem | padding section-compact, input padding, gap שדות |
| `5` | 20px | 1.25rem | padding section-card |
| `6` | 24px | 1.5rem | gap בין sections, page padding sm+ |
| `8` | 32px | 2rem | gap גדול בין blocks |
| `10` | 40px | 2.5rem | גובה input/button |
| `12` | 48px | 3rem | גובה header table row |
| `14` | 56px | 3.5rem | גובה App header mobile |
| `16` | 64px | 4rem | גובה App header desktop |
| `20` | 80px | 5rem | textarea min-height |
| `24` | 96px | 6rem | section padding max |

---

## 4. Border & Radius Tokens

### 4.1 Border Width

| שימוש | ערך | Tailwind |
|-------|-----|---------|
| כל הגבולות | 1px | `border` |
| focus ring | 2px | `ring-2` |
| פריט nav פעיל (accent border) | 3px | `border-[3px]` |

### 4.2 Border Radius

| Token | ערך (px) | ערך (rem) | Tailwind | שימוש מומלץ |
|-------|---------|---------|---------|------------|
| `--radius` | 8px | 0.5rem | `rounded-lg` | Inputs, dropdowns, alerts |
| – | 12px | 0.75rem | `rounded-xl` | Cards, sections, modals |
| – | 6px | 0.375rem | `rounded-md` | Badges, tooltips |
| – | 4px | 0.25rem | `rounded` | Checkboxes, small chips |
| – | 9999px | – | `rounded-full` | כפתורים User app, Avatars |
| **אסור** | >16px | >1rem | – | **אסור (מלבד rounded-full)** |

---

## 5. Shadow Tokens

| Token | ערך (Tailwind) | שימוש |
|-------|--------------|-------|
| `shadow-none` | none | sections flat |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | section-compact, cards קלים |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | section-card, modals, dropdowns |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.10)` | popovers, floating elements |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.10)` | modals (אופציונלי) |

---

## 6. Z‑Index Tokens

| שכבה | ערך | שימוש |
|------|-----|-------|
| Base | 0 | Content רגיל |
| Sticky Header | 10 | Table sticky header, `z-10` |
| Sidebar | 20 | Sidebar `z-20` |
| App Header | 30 | Top nav `z-30` |
| Dropdown | 40 | Popover, dropdown menu `z-40` |
| Modal Overlay | 50 | `z-50` |
| Toast | 60 | Toasts, notifications `z-60` |
| Tooltip | 70 | Tooltips `z-70` |

---

## 7. Opacity Tokens

| Token | ערך | Tailwind | שימוש |
|-------|-----|---------|-------|
| Disabled | 50% | `opacity-50` | כפתורים/inputs disabled |
| Subtle bg | 10% | `/10` modifier | Hover bg on sidebar |
| Active bg | 20% | `/20` modifier | Active nav item bg |
| Overlay | 60% | `bg-black/60` | Modal backdrop |
| Border subtle | 50% | `/50` modifier | Dividers בתוך card |
| Muted hover | 30% | `/30` modifier | Table row hover |

---

## 8. Admin Theme Tokens (`.admin-theme` / `.dark`)

| Token | ערך Admin | שימוש |
|-------|-----------|-------|
| `--background` | `slate-900` | רקע אדמין |
| `--card` | `slate-800/50` | רקע כרטיסי אדמין |
| `--border` | `slate-600..700` | גבולות |
| `--foreground` | `slate-100..200` | טקסט |
| `--muted-foreground` | `slate-400` | מידע משני |
| `--primary` (Admin) | `indigo-500` | כפתורים אדמין |
| `--primary-hover` | `indigo-400` | hover |
| `--destructive` | `red-500` | מחיקה |

**קובץ:** `client/src/admin/admin-theme.css`, `client/src/index.css` (`.dark` block)

---

*MemorAId UX/UI Tokens v1.0 | February 2026*
