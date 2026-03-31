# MemorAId – דפוסי UX/UI (Patterns)

> דפוסים חוזרים – טפסים, ניווט, empty states, טיפול בשגיאות.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 1. טפסים (Forms)

### מבנה
- Header: כותרת + תיאור (אופציונלי)
- שדות: grid 1 עמודה mobile, 2 עמודות md+
- gap בין שדות: 16px (space-y-4)
- gap בין עמודות: 16px (gap-4)
- Footer: כפתורי Save / Cancel – gap 12px

### Validation
- שגיאה: טקסט אדום מתחת לשדה, text-xs
- שגיאה גלובלית: בראש הטופס

### מפרטים
- עיין ב-[UX_UI_SPECIFICATIONS.md](UX_UI_SPECIFICATIONS.md) – שדות קלט

---

## 2. ניווט (Navigation)

### App Shell
- Header: לוגו, פעולות, פרופיל
- Sidebar: רשימת דפים
- Main: תוכן

### Sidebar
- פריט רגיל: טקסט, hover
- **פריט פעיל:** רקע בהיר, font-semibold – חובה
- השוואת pathname ל-href

### Breadcrumbs
- כשנכנסים לדף משני: Home > Section > Page

---

## 3. Empty States

### EmptyInline (תוכן דל בתוך סקשן)
- טקסט קצר, italic
- בתוך SmartSection

### Empty State מלא (דף ריק)
- אייקון + כותרת + תיאור + CTA
- max-width כרטיס: 400px

---

## 4. Loading

### Inline
- טקסט "טוען..." או ספינר קטן
- מרכז האזור

### Skeleton
- placeholders בצורת התוכן הסופי

---

## 5. טיפול בשגיאות

### Inline (בטפסים)
- מתחת לשדה, text-xs, destructive

### Toast / הודעה
- בפינה, 3–5 שניות
- סגנון: אדום לשגיאה, ירוק להצלחה

### Modal
- לשגיאות קריטיות (מחיקה, כישלון חמור)

---

## 6. Modals / Dialogs

### מבנה
- Header: כותרת + תיאור
- Body: תוכן
- Footer: כפתורים (Cancel | Primary)

### מפרטים
- max-width: 512–896px לפי גודל
- max-height: 90vh
- overlay: rgba(0,0,0,0.6) + backdrop-blur

---

## 7. User Flow Template – צ'קליסט

כל Flow מתועד לפי השבלונה:

| שלב | שאלה |
|-----|------|
| Entry point | מאיפה המשתמש מגיע לדף/flow זה? |
| Happy path | מה הנתיב האידיאלי (ללא שגיאות)? |
| Error paths | מה יכול להשתבש? איך מציגים? |
| Empty states | מה רואים כשאין נתונים? |
| Loading | איך נראה הדף בזמן טעינה? |
| Success | איך מאשרים שהפעולה הצליחה? |
| Exit | לאן המשתמש ממשיך אחרי? |

---

## 8. User Flows – MemorAId

### 8.1 התחברות → דשבורד

| שלב | פרטים |
|-----|-------|
| Entry | URL ישיר / redirect |
| Happy path | Login form → validate → redirect לדשבורד |
| Error | שגיאת אימות → inline error, form stays |
| Loading | כפתור "מתחבר...", disabled |
| Success | redirect לדשבורד + Toast "ברוך הבא" |
| Exit | דשבורד |

### 8.2 הוספת / עריכת פרטי מטופל

| שלב | פרטים |
|-----|-------|
| Entry | דף Patient → "ערוך פרופיל" |
| Happy path | טופס עריכה → מלא שדות → שמור |
| Validation | inline errors מתחת לשדות שגויים |
| Loading | "שומר..." + disabled |
| Success | close modal/form + refresh data + Toast "הפרטים נשמרו" |
| Exit | דף Patient מעודכן |

### 8.3 מילוי שאלון

| שלב | פרטים |
|-----|-------|
| Entry | `/questionnaires` → בחר שאלון → "פתח שאלון" |
| Happy path | שאלה 1 → הבא → ... → שאלון אחרון → "סיים ושלח" |
| Validation | אי-אפשר להמשיך ללא תשובה (שדה חובה) |
| Loading | "שולח..." + disabled |
| Success | Toast "השאלון הוגש בהצלחה" + חזרה לרשימה |
| Exit | `/questionnaires` עם badge "מולא ב-[תאריך]" |

### 8.4 הוספת פריט (generic)

| שלב | פרטים |
|-----|-------|
| Entry | כפתור "הוסף [X]" |
| Happy path | Modal עם טופס → מלא → "שמור" |
| Error paths | שגיאת validation (inline) / שגיאת שרת (Alert בראש Modal) |
| Loading | "שומר..." |
| Success | Modal נסגר + רשימה מתעדכנת + Toast "X נוסף" |
| Exit | אותו דף, רשימה מעודכנת |

### 8.5 מחיקה

| שלב | פרטים |
|-----|-------|
| Entry | כפתור "מחק" (icon-only / "מחק") |
| Confirm | Confirmation Dialog: "מחיקת X?" + "פעולה בלתי-הפיכה" |
| Happy path | "כן, מחק" → Loading → success |
| Cancel | "לא, חזרה" → dialog נסגר, אין שינוי |
| Loading | "מוחק..." |
| Success | רשימה מתעדכנת + Toast "X נמחק" |
| Exit | אותו דף ללא הפריט |

---

## 9. Form Patterns – מפורט

### 9.1 Validation Strategy

| מצב | מתי לבדוק | איפה לציג |
|-----|---------|----------|
| שדה חובה ריק | `onBlur` + `onSubmit` | מתחת לשדה, text-xs destructive |
| פורמט שגוי (email, phone) | `onBlur` | מתחת לשדה |
| שגיאת שרת | אחרי submit | Alert בראש הטופס |
| שגיאה גלובלית (multi-field) | אחרי submit | Alert בראש הטופס |

### 9.2 Form Grid Patterns

| מבנה | שימוש | קוד |
|------|-------|-----|
| 1 עמודה (100%) | mobile, פרטים פשוטים | `space-y-4` |
| 2 עמודות 50%+50% | md+, טפסים מורכבים | `grid md:grid-cols-2 gap-4` |
| 2:1 (66%+33%) | שדה ראשי + שדה משני | `grid md:grid-cols-[2fr_1fr] gap-4` |

### 9.3 Form Actions

```
[Cancel (outline)] [Save (primary)]
```

- גרד Actions תמיד בתחתית.
- כפתור primary בסוף (inline-end ב-RTL).
- gap-3 (12px) בין כפתורים.
- disabled + loading state על Submit כשטוען.

---

## 10. Navigation Patterns

### 10.1 Sidebar Desktop

- תמיד גלוי ב-lg+.
- רוחב 240–256px.
- פריט פעיל: `bg-white/20 font-semibold border-inline-end`.
- hover: `bg-white/10`.
- icons: 20px, text-sm.

### 10.2 Mobile Navigation

- Sidebar מוסתר.
- Bottom Tab Bar (אם מיושם) / Hamburger → Sheet Drawer.
- Sheet Drawer: מגיע מ-inline-start (RTL), רוחב 240px.

### 10.3 Breadcrumbs

- מוצג כשיש יותר מ-1 רמה.
- פורמט: `ראשי / ניהול / דף נוכחי`.
- `aria-current="page"` על הרמה הנוכחית.
- separator: `/` או `>` (מתהפך ב-RTL).

---

## הפניות

- [UX_UI_SPECIFICATIONS.md](UX_UI_SPECIFICATIONS.md) – ערכים מספריים
- [UX_UI_COMPONENTS.md](UX_UI_COMPONENTS.md) – רכיבים
- [UX_UI_STATES.md](UX_UI_STATES.md) – states לכל רכיב
- [UX_UI_CONTENT.md](UX_UI_CONTENT.md) – טקסטים ומיקרוקופי

---

*MemorAId UX/UI Patterns v2.0 | February 2026*
