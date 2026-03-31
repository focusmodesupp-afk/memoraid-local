# MemorAId – מערכת אייקונים (Iconography)

> ספרייה אחידה, גודל עקבי, שימוש סמנטי, ARIA תקין.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 1. ספרייה – Lucide React

MemorAId משתמשת ב-**[Lucide React](https://lucide.dev/)** בלבד.

| כלל | פירוט |
|-----|-------|
| ספרייה אחידה | אסור לערבב Lucide עם Font Awesome / Material Icons / emoji |
| Stroke icons | Lucide הוא stroke-based, עקבי בעובי |
| Stroke width | 2px (ברירת מחדל Lucide) – לא לשנות אלא ב-exception מוסמך |
| Export | `import { IconName } from 'lucide-react'` |

---

## 2. Icon Sizes – גדלים וקונטקסט

| גודל (px) | Tailwind | שימוש |
|----------|---------|-------|
| 12px | `size-3` | metadata inline, badge icon, timestamp |
| 16px | `size-4` | inline עם טקסט (כפתור, nav item, label) |
| 20px | `size-5` | כרטיסים, Section icons, list item indicators |
| 24px | `size-6` | Standalone icon buttons, empty state small |
| 32px | `size-8` | Empty state large, feature icons |
| 48px | `size-12` | Empty Page icon, onboarding illustration spot |
| 64px | `size-16` | Welcome screen, branding |
| 96px | `size-24` | לא בשימוש שוטף – landing/marketing בלבד |

**כלל:** גודל האייקון = גודל הטקסט שלצדו. ליד `text-sm` → `size-4`.

---

## 3. Icon Color – צבעים

| מצב | צבע | Tailwind |
|-----|-----|---------|
| Default (inline עם טקסט) | ירש מהטקסט | `currentColor` (ברירת מחדל Lucide) |
| Muted / secondary | `hsl(--muted-foreground)` | `text-[hsl(var(--muted-foreground))]` |
| Primary action | `hsl(--primary)` | `text-[hsl(var(--primary))]` |
| Success | `hsl(--success)` | `text-[hsl(var(--success))]` |
| Warning | `hsl(--warning)` | `text-[hsl(var(--warning))]` |
| Error/Danger | `hsl(--destructive)` | `text-[hsl(var(--destructive))]` |
| Info | `hsl(--info)` | `text-[hsl(var(--info))]` |
| Disabled | `hsl(--muted-foreground)` + `opacity-50` | `opacity-50` |
| On dark bg (sidebar) | white | `text-white` |

---

## 4. Icon Usage Rules – כללי שימוש

### 4.1 אייקון עם טקסט

```tsx
// כמה גדלים תואמים לטקסט:
<button className="flex items-center gap-2 text-sm">
  <PlusIcon className="size-4" />
  <span>הוסף מטופל</span>
</button>
```

**כלל:** `gap-2` (8px) בין אייקון לטקסט. תמיד `items-center`.

### 4.2 Icon-only Buttons

```tsx
// חובה aria-label
<button aria-label="מחק פריט" className="p-2 rounded-md hover:bg-[hsl(var(--muted))]">
  <Trash2Icon className="size-4 text-[hsl(var(--destructive))]" />
</button>
```

### 4.3 Decorative Icons (ללא משמעות)

```tsx
// aria-hidden="true" על אייקונים שרק דקורטיביים
<StarIcon className="size-4" aria-hidden="true" />
```

### 4.4 Semantic Icons (אייקונים עם משמעות)

כאשר האייקון מעביר מידע (לא רק decoration), חובה טקסט נלווה או aria-label:

```tsx
<AlertTriangleIcon className="size-4 text-[hsl(var(--warning))]" aria-hidden="true" />
<span className="sr-only">אזהרה</span>
<span>נא לבדוק את הנתונים</span>
```

---

## 5. Directional Icons – RTL

בממשק RTL, אייקונים שמכוונים לכיוון מסוים חייבים להתהפך:

| אייקון | LTR | RTL | יישום |
|-------|-----|-----|-------|
| `ChevronRight` | → (הבא) | ← (הבא) | `rtl:scale-x-[-1]` |
| `ChevronLeft` | ← (הקודם) | → (הקודם) | `rtl:scale-x-[-1]` |
| `ArrowRight` | → (קדימה) | ← (קדימה) | `rtl:scale-x-[-1]` |
| `ArrowLeft` | ← (חזרה) | → (חזרה) | `rtl:scale-x-[-1]` |
| `ChevronsRight` | >> | << | `rtl:scale-x-[-1]` |
| `CornerDownLeft` | Enter/Return | אותו | לא מתהפך |

**אייקונים שלא מתהפכים (סמנטיים):**

| אייקון | שימוש | מתהפך? |
|-------|-------|--------|
| `AlertTriangle` | אזהרה | לא |
| `CheckCircle` | הצלחה | לא |
| `XCircle` | שגיאה | לא |
| `Heart` | מועדפים | לא |
| `Star` | דירוג | לא |
| `Lock` | אבטחה | לא |
| `Bell` | התראות | לא |
| `Search` | חיפוש | לא |
| `Settings` | הגדרות | לא |
| `User` | משתמש | לא |

**Tailwind RTL flip helper:**

```html
<ChevronRight className="size-4 rtl:-scale-x-100" />
```

---

## 6. אייקונים לפי קונטקסט

### 6.1 Navigation

| עמוד | אייקון Lucide |
|------|-------------|
| לוח בקרה | `LayoutDashboard` |
| מטופל | `User` |
| משימות | `CheckSquare` |
| מסמכים | `FileText` |
| זכרונות | `BookHeart` |
| שאלונים | `ClipboardList` |
| מרכז זכויות | `Scale` |
| זמינות | `Calendar` |
| משפחה | `Users` |
| הגדרות | `Settings` |
| פרופיל | `UserCircle` |
| התחברות | `LogIn` |
| יציאה | `LogOut` |

### 6.2 Actions

| פעולה | אייקון |
|-------|--------|
| הוסף | `Plus` |
| מחק | `Trash2` |
| ערוך | `Pencil` |
| שמור | `Save` |
| סגור / X | `X` |
| שלח | `Send` |
| העלאה | `Upload` |
| הורדה | `Download` |
| חפש | `Search` |
| פתח קישור | `ExternalLink` |
| העתק | `Copy` |
| רענן | `RefreshCw` |
| פילטר | `Filter` |
| מיין | `ArrowUpDown` |
| צמצם | `ChevronUp` |
| הרחב | `ChevronDown` |
| פתח תפריט | `MoreVertical` / `MoreHorizontal` |

### 6.3 Status Icons

| סטטוס | אייקון | צבע |
|-------|--------|-----|
| הצלחה | `CheckCircle` | `--success` |
| שגיאה | `XCircle` | `--destructive` |
| אזהרה | `AlertTriangle` | `--warning` |
| מידע | `Info` | `--info` |
| טוען | `Loader2` (spin) | `--primary` |
| נחסם | `Lock` | `--muted-foreground` |
| ריק | `Inbox` / `FolderOpen` | `--muted-foreground` |

---

## 7. אייקון ב-Empty State

```tsx
// גודל 48px, muted color, מרכוז
<div className="flex flex-col items-center gap-3 py-8">
  <FileTextIcon className="size-12 text-[hsl(var(--muted-foreground))] opacity-50" aria-hidden="true" />
  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">אין מסמכים עדיין</p>
  <p className="text-xs text-[hsl(var(--muted-foreground))]">הוסף מסמך ראשון כדי להתחיל</p>
  <button className="btn-primary">הוסף מסמך</button>
</div>
```

---

*MemorAId UX/UI Iconography v1.0 | February 2026*
