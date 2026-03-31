# MemorAId – Page Templates (טמפלטים לדפים)

> תבנית מחייבת לכל דף. לפני כתיבת קוד – קרא את הטמפלט הרלוונטי.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 0. תבנית כללית לדף (Base Template)

כל דף באפליקציית המשתמש מורכב מ:

```
[App Shell]
  ├── Sidebar (desktop, 240px)
  └── Main Content
        ├── PageHeader (title + subtitle + actions)
        └── Page Content Grid
              ├── Section 1
              ├── Section 2
              └── ...
```

### Layout Rules

| Breakpoint | עמודות תוכן | Sidebar |
|-----------|------------|---------|
| mobile (<768px) | 1 עמודה, 100% | מוסתר (burger menu) |
| md (768px+) | 2 עמודות, 50%+50% | מוסתר |
| lg (1024px+) | 2–3 עמודות | מוצג, 240px |
| xl (1280px+) | 3 עמודות | מוצג, 256px |

### Hard Rules

- `space-y-6` בין sections (24px).
- `gap-6` בגריד (24px).
- `w-full` על Main – אין `max-width` שחוסם.
- PageHeader תמיד ראשון, לפני כל התוכן.

---

## 1. `/dashboard` – לוח בקרה

### מטרה

מצב כללי מהיר: משימות פתוחות, מצב מטופל, פעולות אחרונות.

### מבנה

```
PageHeader: "לוח בקרה" + subtitle "שלום, [שם]"
│
├── Row 1 (badges): KPI Bar – BadgeRow (3–5 badges)
│     [מטופלים פעילים] [משימות פתוחות] [מסמכים] [זמינות]
│
├── Grid (lg:grid-cols-3, md:grid-cols-2, gap-6):
│     ├── Col 1 (lg:col-span-2): SmartSection "משימות פתוחות"
│     │     ListCompact (max 5 items) + "הצג הכל" link
│     ├── Col 2: SmartSection "מצב מטופל"
│     │     DataRows (שם, גיל, תרופות אחרונות)
│     └── (Col 3 on xl): SmartSection "ביקורים קרובים"
│
└── Row 3 (full width): SmartSection "פעולות אחרונות"
      ListCompact עם timestamps
```

### Grid Spec

| אלמנט | Mobile | md | lg | xl |
|-------|--------|----|----|-----|
| KPI Bar | 1 שורה wrapping | 1 שורה | 1 שורה | 1 שורה |
| Content grid | 1 עמודה | 2 עמודות | 3 עמודות | 3 עמודות |
| Section col-span | 1 | 1 | 2 (משימות) | 2 (משימות) |

### Empty States

| מצב | Empty State |
|-----|------------|
| אין משימות | EmptyInline: "אין משימות פתוחות. הוסף משימה." |
| אין מטופל | EmptyPage: "לא נוסף מטופל. הוסף מטופל ראשון." |
| אין ביקורים | EmptyInline: "אין ביקורים קרובים." |

### קישורים

- Tokens: `UX_UI_TOKENS.md §3`
- Spec: `UX_UI_SPECIFICATIONS.md §4` (Dashboard)
- Components: SmartSection, BadgeRow, DataRow, EmptyInline

---

## 2. `/patient` – פרטי מטופל

### מטרה

פרופיל מלא של המטופל עם כל המידע הרפואי, חלוקה לוגית לסקשנים.

### מבנה

```
PageHeader: "פרטי מטופל" + שם מטופל + [כפתור "ערוך פרופיל"]
│
├── Progress Bar: "השלמת פרופיל: X%"
│     [Progress component, עם הסבר ספציפי לפי אחוז]
│     CTA: "המשך להשלמה" (מוצג עד 100%)
│
├── Grid (xl:grid-cols-3, lg:grid-cols-2, gap-6):
│     ├── SmartSection "פרטים אישיים" (section-compact)
│     │     DataRows: שם, ת.ז, תאריך לידה, גיל, כתובת, טלפון
│     ├── SmartSection "אנשי קשר" (section-compact)
│     │     DataRows: שם איש קשר, קשר, טלפון
│     ├── SmartSection "מצב רפואי" (section-card)
│     │     DataRows: אבחנות, תרופות, אלרגיות
│     ├── SmartSection "מדדים" (section-compact)
│     │     BadgeRow: לחץ דם, סוכר, BMI, הידרציה
│     ├── SmartSection "משימות" (section-compact)
│     │     ListCompact (max 5) + "הצג הכל"
│     └── SmartSection "הערות" (section-compact)
│           Textarea read-only / edit mode
```

### Progress Bar Spec

| אחוז | מסר | Color |
|------|-----|-------|
| 0–25% | "כדי להתחיל – הוסף פרטים בסיסיים" | `--destructive` |
| 26–50% | "עוד קצת – השלם את הפרטים הרפואיים" | `--warning` |
| 51–75% | "כמעט שם – בדוק פרטי תרופות" | `--info` |
| 76–99% | "מצוין! רק עוד כמה פרטים" | `--success` |
| 100% | "הפרופיל מלא" | `--success` |

### Grid Spec

| Breakpoint | Layout |
|-----------|--------|
| mobile | 1 עמודה |
| md | 2 עמודות |
| xl | 3 עמודות (כל section ~33%) |

### Good vs Bad

| ✅ Good | ❌ Bad |
|--------|-------|
| 3 עמודות ב-xl, כל section קומפקטי | section ענק אחד עם הכל |
| DataRows קומפקטיים | paragraphs ארוכים |
| Progress bar ספציפי | "50% הושלם" ללא context |
| "ערוך פרופיל" בלחיצה → מצב עריכה / navigate | ערוך בלחיצה ללא indication |
| הערות בצד ימין (sidebar) ב-lg+ | הערות בשורה עם פרטים אישיים |

---

## 3. `/questionnaires` – שאלונים וסקרים

### מטרה

בחירת שאלון ומילויו. לאחר מילוי – סיכום.

### מבנה – רשימת שאלונים

```
PageHeader: "שאלונים וסקרים" + "בחר שאלון למילוי"
│
├── Grid שאלונים (xl:grid-cols-4, lg:grid-cols-3, md:grid-cols-2, gap-4):
│     └── כרטיס שאלון (section-compact, max-w-xs):
│           [Icon 32px]
│           [כותרת שאלון]
│           [תיאור קצר, max 2 שורות]
│           [Badge: "מולא ב-[תאריך]" / "טרם מולא"]
│           [כפתור "פתח שאלון"]
```

### כרטיס שאלון – Spec

| פרמטר | ערך |
|-------|-----|
| רוחב מקסימלי | `max-w-xs` (320px) |
| padding | 16px (`p-4`) |
| gap בין כרטיסים | 16px (`gap-4`) |
| עמודות | xl: 4, lg: 3, md: 2, mobile: 1–2 |
| כותרת | `text-sm font-semibold` |
| תיאור | `text-xs text-muted-foreground`, max 2 שורות |

**כלל:** כרטיס עם מידע דל (שם + תיאור + כפתור) = `max-w-xs`, לא מתוח על כל הרוחב.

### מבנה – מילוי שאלון

```
PageHeader: "[שם השאלון]" + [כפתור "חזרה לרשימה"]
│
├── max-w-2xl mx-auto (תוכן שאלון ממוקד, לא רוחב מלא)
├── Progress indicator: "שאלה 3/10"
│
├── Question Card (section-card):
│     [מספר שאלה] [טקסט שאלה]
│     [אפשרויות: Radio / Checkbox / Textarea]
│
└── Form Actions: [הקודם] [הבא] / [סיים ושלח]
```

---

## 4. `/rights` – מרכז זכויות

### מטרה

מידע על זכויות זמינות למטופל. כל כרטיס = זכות אחת.

### מבנה

```
PageHeader: "מרכז זכויות" + subtitle "זכויות הזמינות עבור [שם מטופל]"
│
├── Grid זכויות (xl:grid-cols-4, lg:grid-cols-3, md:grid-cols-2, gap-4):
│     └── כרטיס זכות (section-compact, max-w-xs):
│           [Icon 24px]
│           [שם הזכות: text-sm font-semibold]
│           [תיאור קצר: text-xs muted, max 2 שורות]
│           [Badge: "זכאי" / "לא זכאי" / "בבדיקה"]
│           [כפתור: "פתח מדריך"] ← לא "שלח בקשה"!
│
└── כשנלחץ "פתח מדריך":
      ↓ expanded section מתחת לכרטיס (inline, לא modal):
        [bullet list של שלבים / מידע / קריטריוני זכאות]
        [כפתור "סגור"]
```

### כרטיס זכות – Spec

| פרמטר | ערך |
|-------|-----|
| רוחב | `max-w-xs` (320px) |
| padding | 16px |
| כפתור | "פתח מדריך" (outline, לא primary) |
| expanded content | bullet list, `text-xs`, `mt-3 pt-3 border-t` |

### ❌ Anti-patterns

- "שלח בקשה" – אסור אלא אם קיים workflow מוגדר.
- כרטיס רחב (100%) עם 3 שורות טקסט – בזבוז שטח.
- מעבר לדף חדש ל"מדריך" – עדיף inline expand.

---

## 5. `/documents` – מסמכים רפואיים

### מבנה

```
PageHeader: "מסמכים רפואיים" + [כפתור "הוסף מסמך"]
│
├── Filter Bar (אופציונלי): [חיפוש] [פילטר לפי סוג] [מיון]
│
├── Grid / List מסמכים:
│     עד 3 עמודות (xl) / 2 (md) / 1 (mobile)
│     כל כרטיס מסמך (section-compact):
│           [FileIcon 20px] [שם מסמך: text-sm font-semibold]
│           [DataRow: סוג | תאריך]
│           [DataRow: מי הוסיף]
│           [Actions: עיון | הורדה | מחיקה]
│
└── Empty State (אם אין מסמכים):
      EmptyPage: [FileTextIcon 48px] "אין מסמכים עדיין"
      "הוסף מסמך ראשון כדי לנהל את הרישום הרפואי"
      [כפתור "הוסף מסמך"]
```

---

## 6. `/memories` – זכרונות

### מבנה

```
PageHeader: "זכרונות" + [כפתור "הוסף זכרון"]
│
├── Grid (xl:3, md:2, mobile:1):
│     כרטיס זכרון (section-card):
│           [תמונה (אם יש), border-radius 8px]
│           [כותרת: text-sm font-semibold]
│           [תאריך: text-xs muted]
│           [תיאור קצר, max 3 שורות, truncate]
│           [Badge: קטגוריה]
│
└── Empty State:
      EmptyPage: [BookHeartIcon 48px] "אין זכרונות עדיין"
```

---

## 7. `/availability` – זמינות

### מבנה

```
PageHeader: "זמינות" (text-xl font-semibold) + subtitle
│
├── לוח שנה / Week view:
│     שורת ימים (7 עמודות, או 5 לשבוע עבודה)
│     שעות כשורות
│     תאים מקליקביליים: available / busy
│
└── Section "פגישות קרובות":
      ListCompact: תאריך + שם + סוג + actions
```

### Spec

| אלמנט | ערך |
|-------|-----|
| כותרת העמוד | `text-xl font-semibold` (לא text-3xl!) |
| Cell גריד | min-h-[40px] |
| Available cell | `bg-success/10 border border-success/30` |
| Busy cell | `bg-destructive/10 border border-destructive/30` |

---

## 8. `/family` – משפחה

### מבנה

```
PageHeader: "משפחה" + [כפתור "הוסף בן משפחה"]
│
├── FamilyHierarchyMap (visual, מוצג ב-lg+):
│     עץ family / רשת
│
└── List (mobile, lg-: תחליף לעץ):
      Section-compact לכל בן משפחה:
        DataRows: שם, קשר, טלפון, הרשאות
        [כפתור "ערוך הרשאות"]
```

---

## 9. `/settings` – הגדרות

### מבנה

```
PageHeader: "הגדרות"
│
├── max-w-2xl mx-auto (טפסים לא צריכים כל הרוחב)
├── Tabs (אם יש קטגוריות): [כללי] [אבטחה] [התראות]
│
└── Per tab:
      Form sections (section-compact):
        [section-title]
        [fields in 1–2 column grid]
        [Form Actions: שמור שינויים]
```

### Grid טפסים

| Breakpoint | עמודות |
|-----------|--------|
| mobile | 1 |
| md+ | 2 (50% כל אחד) |
| max-width | `max-w-2xl` (672px) |

---

## 10. Admin Pages – טמפלטים

### 10.1 `/admin/dashboard` – Admin Dashboard

```
AdminShell (dark sidebar, header)
│
├── Grid KPIs (4 cards, sm:grid-cols-2 lg:grid-cols-4):
│     כל card: icon + number + label + trend
│
├── Grid Charts (lg:grid-cols-2, gap-6):
│     Chart 1: משתמשים חדשים לאורך זמן
│     Chart 2: פעילות
│
└── Table: "פעולות אחרונות" (latest 10)
```

### 10.2 `/admin/users` – Users Table

```
PageHeader: "ניהול משתמשים" + [כפתור "הוסף משתמש"] + [חיפוש]
│
└── Table (full width, sticky header):
      עמודות: שם | אימייל | תפקיד | סטטוס | תאריך | פעולות
      Header height: 48px
      Row height: 44px
      Actions column: 120px, icon-only buttons
```

### 10.3 `/admin/families` – Families

```
PageHeader: "ניהול משפחות" + חיפוש + פילטר
│
└── Table (families) + expandable rows לפרטי family
```

---

## נספח – Mapping לקבצי קוד

| דף | קובץ TSX | Spec | Components |
|----|---------|------|-----------|
| Dashboard | `client/src/pages/Dashboard.tsx` | §4 | SmartSection, BadgeRow, DataRow |
| Patient | `client/src/pages/Patient.tsx` | §1,2,3 | SmartSection, DataRow, BadgeRow |
| Questionnaires | `client/src/pages/Questionnaires.tsx` | §2 (cards) | section-compact, max-w-xs |
| Rights | `client/src/pages/RightsCenter.tsx` | §2 (cards) | section-compact, max-w-xs |
| Documents | `client/src/pages/MedicalDocuments.tsx` | §5 | section-compact, Table |
| Memories | `client/src/pages/Memories.tsx` | §2 | section-card |
| Availability | `client/src/pages/Availability.tsx` | §8 | custom grid |
| Family | `client/src/pages/Family.tsx` | §8 | DataRow, SmartSection |
| Settings | `client/src/pages/Settings.tsx` | §6 (forms) | inputs, max-w-2xl |

---

*MemorAId UX/UI Page Templates v1.0 | February 2026*
