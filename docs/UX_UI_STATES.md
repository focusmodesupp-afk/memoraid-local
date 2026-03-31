# MemorAId – States (מצבי רכיב)

> כל רכיב מתועד עם כל מצביו לפני שמפתחים אותו.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 1. Component States Matrix – מטריצת מצבים

### 1.1 הגדרת מצבים

| State | שם עברי | טריגר |
|-------|---------|-------|
| Default | ברירת מחדל | טעינה רגילה |
| Hover | ריחוף | `mouseenter` |
| Focus | פוקוס | `Tab` / `click` |
| Focus-visible | פוקוס מקלדת | ניווט `Tab` בלבד |
| Active / Pressed | לחיצה | `mousedown` |
| Disabled | לא זמין | `disabled` attribute |
| Loading | טעינה | pending async |
| Error | שגיאה | validation fail, server error |
| Success | הצלחה | action confirmed |
| Warning | אזהרה | partial success, caution |
| Read-only | לקריאה בלבד | `readonly` attribute |
| Selected | נבחר | checkbox / radio / tab active |
| Indeterminate | אי-ודאי | checkbox חלקי |
| Empty | ריק | אין תוכן |
| Skeleton | טוען | pre-load placeholder |

---

### 1.2 Buttons – מצבים חזותיים

| State | Background | Border | Text | Icon | Shadow | Cursor | Transition |
|-------|-----------|--------|------|------|--------|--------|-----------|
| Default | `hsl(--primary)` | none | white | white | shadow-sm | pointer | – |
| Hover | `hsl(--primary)` + 8% כהה יותר | none | white | white | shadow-md | pointer | 150ms ease |
| Focus-visible | `hsl(--primary)` | ring-2 `--ring` | white | white | shadow-sm | pointer | – |
| Active/Pressed | `hsl(--primary)` + 15% כהה יותר, scale 0.97 | none | white | white | none | pointer | 100ms |
| Disabled | `hsl(--primary)` | none | white/50% | white/50% | none | not-allowed | – |
| Loading | `hsl(--primary)` | none | white/70% | spinner | shadow-sm | wait | – |
| Success | `hsl(--success)` | none | white | check | shadow-sm | default | 200ms |

**Outline Button (btn-outline):**

| State | Background | Border | Text |
|-------|-----------|--------|------|
| Default | `hsl(--card)` | `hsl(--border)` | `hsl(--foreground)` |
| Hover | `hsl(--muted)` | `hsl(--border)` | `hsl(--foreground)` |
| Focus-visible | `hsl(--card)` | ring-2 | `hsl(--foreground)` |
| Disabled | `hsl(--card)` | `hsl(--border)/50` | `hsl(--muted-foreground)` |

---

### 1.3 Inputs – מצבים חזותיים

| State | Background | Border | Text | Shadow |
|-------|-----------|--------|------|--------|
| Default | `hsl(--input)` | `hsl(--border)` 1px | `hsl(--foreground)` | none |
| Hover | `hsl(--input)` + 2% בהיר | `hsl(--border)` | `hsl(--foreground)` | none |
| Focus | `hsl(--card)` | `hsl(--ring)` 2px | `hsl(--foreground)` | ring-2 |
| Error | `hsl(--destructive)/5%` | `hsl(--destructive)` 2px | `hsl(--foreground)` | none |
| Disabled | `hsl(--muted)` | `hsl(--border)/50` | `hsl(--muted-foreground)` | none |
| Read-only | `transparent` | `hsl(--border)/40` | `hsl(--foreground)` | none |
| Success | `hsl(--success)/5%` | `hsl(--success)` | `hsl(--foreground)` | none |

---

### 1.4 Cards / Sections – מצבים חזותיים

| State | Background | Border | Shadow | Scale |
|-------|-----------|--------|--------|-------|
| Default | `hsl(--card)` | `hsl(--border)` 1px | shadow-sm/md | 1 |
| Hover (clickable card) | `hsl(--card)` + 1% | `hsl(--border)` | shadow-md | – |
| Selected | `hsl(--primary)/5%` | `hsl(--primary)` 2px | shadow-md | – |
| Disabled | `hsl(--muted)` | `hsl(--border)/50` | none | – |

---

### 1.5 Nav Items (Sidebar) – מצבים חזותיים

| State | Background | Text | Font Weight | Border |
|-------|-----------|------|-------------|--------|
| Default | transparent | white | 400 | none |
| Hover | `bg-white/10` | white | 400 | none |
| **Active (current page)** | `bg-white/20` או `--sidebar-accent` | white | **600** | `border-inline-end 3px --sidebar-accent` |
| Focus-visible | `bg-white/10` | white | 400 | ring-2 |

**חובה:** זיהוי עמוד פעיל ע"י השוואת pathname. אין חריגות.

---

### 1.6 Checkboxes / Radios / Toggles

| State | Checkbox Appearance | Radio Appearance | Toggle |
|-------|-------------------|-----------------|--------|
| Default | border 2px `--border`, white bg | circle outline `--border` | gray track |
| Hover | border `--primary` | border `--primary` | – |
| Checked | bg `--primary`, checkmark white | filled dot `--primary` | blue/primary track |
| Indeterminate | bg `--primary`, dash white | – | – |
| Disabled | bg `--muted`, opacity-50 | opacity-50 | opacity-50 |
| Focus | ring-2 `--ring` | ring-2 `--ring` | ring-2 |

---

### 1.7 Badges / Tags

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default muted | `hsl(--muted)` | `hsl(--muted-foreground)` | none |
| Default primary | `hsl(--primary)/15` | `hsl(--primary)` | none |
| Default success | `hsl(--success)/15` | `hsl(--success)` | none |
| Default destructive | `hsl(--destructive)/15` | `hsl(--destructive)` | none |
| Default warning | `hsl(--warning)/15` | `hsl(--warning)` | none |
| Default info | `hsl(--info)/15` | `hsl(--info)` | none |

---

## 2. Empty States – מפרט מלא

### 2.1 טיפוסי Empty State

| טיפוס | מתי | מרכיבי חובה |
|-------|-----|------------|
| **EmptyInline** | בתוך SmartSection – אין פריטים ברשימה | טקסט קצר (italic, muted) |
| **EmptyPage** | דף שלם ללא תוכן (ניווט ישיר לדף ריק) | אייקון + כותרת + תיאור + CTA |
| **EmptySearch** | חיפוש ללא תוצאות | אייקון חיפוש + "לא נמצאו תוצאות" + כפתור ניקוי |
| **EmptyError** | שגיאה בטעינת נתונים | אייקון שגיאה + הסבר + "נסה שוב" |
| **EmptyFirstUse** | משתמש חדש, לפני הוספת נתונים | אייקון ברוכים הבאים + הסבר + CTA להתחלה |

### 2.2 Empty State Anatomy

| מרכיב | חובה? | מפרט |
|-------|-------|------|
| Icon | כן (בEmptyPage+) | 48px, `hsl(--muted-foreground)`, Lucide icon |
| Title | כן | `text-sm font-semibold`, `hsl(--foreground)` |
| Description | מומלץ | `text-xs`, `hsl(--muted-foreground)`, max 2 שורות |
| CTA Button | לפי הקשר | `btn-primary` או `btn-outline`, text ממוקד פעולה |

### 2.3 EmptyInline מפרט

```css
.empty-inline {
  font-size: 12px; /* text-xs */
  font-style: italic;
  color: hsl(var(--muted-foreground));
  padding: 8px 0;
}
```

---

## 3. Error States – מפרט חומרה

### 3.1 טבלת חומרת שגיאות

| סוג | חומרה | איפה מוצג | משך | אייקון | צבע |
|-----|-------|----------|-----|--------|-----|
| **Success** | 0 | Toast (למטה/למעלה) | 3000ms + fade | `check-circle` | `--success` |
| **Info** | 1 | Toast | 4000ms + fade | `info` | `--info` |
| **Warning** | 2 | Alert bar (inline) | עד סגירה ידנית | `alert-triangle` | `--warning` |
| **Error – field** | 3 | מתחת לשדה (inline) | עד תיקון | `x-circle` | `--destructive` |
| **Error – form** | 4 | Alert בראש הטופס | עד תיקון | `alert-circle` | `--destructive` |
| **Error – page** | 5 | EmptyError component | עד "נסה שוב" | `server-crash` | `--destructive` |

### 3.2 Inline Field Error – מפרט מדויק

| פרמטר | ערך |
|-------|-----|
| מיקום | מתחת לשדה, margin-top 4px |
| font-size | 12px (text-xs) |
| color | `hsl(--destructive)` |
| אייקון | 12px, inline-start |
| גבול שדה | 2px `hsl(--destructive)` |
| רקע שדה | `hsl(--destructive)/5%` |
| ARIA | `aria-describedby` → error message id, `aria-invalid="true"` |

### 3.3 Toast Specifications

| פרמטר | ערך |
|-------|-----|
| מיקום | bottom-center (mobile) / bottom-start (desktop) |
| רוחב | max-w-sm (384px) |
| padding | 12px 16px |
| border-radius | 12px (rounded-xl) |
| shadow | shadow-lg |
| z-index | 60 |
| enter animation | translateY(20px) → 0, opacity 0→1, 200ms ease-out |
| exit animation | opacity 1→0, translateY(0→10px), 200ms ease-in |
| משך ברירת מחדל | 3000ms |

---

## 4. Loading States

### 4.1 Skeleton Loading

| פרמטר | ערך |
|-------|-----|
| רקע | `hsl(--muted)` |
| animation | shimmer (gradient L→R), 1.5s infinite |
| border-radius | לפי הצורה שטוענת |
| שימוש | לתחליף כרטיסים, שורות טבלה, תמונות לפני טעינה |

### 4.2 Spinner (Loading indicator)

| פרמטר | ערך |
|-------|-----|
| גודל ברכיב קטן (כפתור) | 16px |
| גודל ברכיב גדול (דף) | 32px |
| צבע | `hsl(--primary)` |
| animation | rotate 360deg, 600ms linear infinite |

---

*MemorAId UX/UI States v1.0 | February 2026*
