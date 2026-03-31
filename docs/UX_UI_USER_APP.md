# MemorAId – הנחיות אפליקציית משתמש

> הנחיות לאפליקציית המשתמש – RTL, נושא בהיר, layout.  
> גרסה: 1.0 | תאריך: פברואר 2026

---

## 1. נושא ואסתטיקה

- **נושא:** בהיר (light)
- **פלטת צבעים:** מ-[`client/src/index.css`](client/src/index.css) – `:root`
- **צבע ראשי:** סגול (--primary)
- **רקע:** לבן-סגלגל קל
- **כרטיסים:** לבן עם גבול עדין

---

## 2. Layout

| אלמנט | כלל | ערך |
|-------|------|-----|
| Main content | רוחב | 100% – ללא max-width שמשאיר חלל ריק |
| Sidebar | רוחב | 240px (w-60) |
| Padding דף | mobile / sm+ | 16px / 24px |
| gap בין סקשנים | | 24px (space-y-6) |

---

## 3. Grid ודפים

**דף תוכן כללי:**
- Mobile: 1 עמודה
- md: 2 עמודות
- xl: 3 עמודות

**כרטיסים דלים (שאלונים, רשימות קצרות):**
- גריד: `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`
- max-width כרטיס: 400px או 33% מהעמודה

**דשבורד:**
- גריד 2–3 עמודות
- יחס שמאל:ימין = 2:1
- KPI: שורת badges קומפקטית
- איסור: סקשנים רחבים עם 1–2 שורות בלבד

---

## 4. תפריט צד (Sidebar)

| מצב | עיצוב |
|-----|-------|
| רגיל | טקסט לבן, רקע שקוף |
| hover | bg-white/10 |
| **פעיל** | bg-white/20 או sidebar-accent, font-semibold |

**חובה:** סימון חזותי לעמוד הפעיל – השוואת pathname ל-href.

---

## 5. כפתורים

- **Primary:** btn-primary – rounded-full, צבע primary
- **Outline:** btn-outline – border, רקע card
- **גובה מינימלי:** 36px
- **מרווח בין כפתורים:** 12px

---

## 6. טפסים

- שדות: 40px גובה, padding 12px 8px
- Grid: 1 עמודה mobile, 2 md+
- gap בין שדות: 16px
- Labels: text-xs, 4px מתחת ל-label

---

## 7. RTL

- body: dir="rtl"
- text-align: right
- אייקונים: chevron-left ל-RTL (כיוון "חזרה")
- margins: inline-start / inline-end

---

## 8. דוגמאות דפים

**Patient:** PageHeader + section-card (avatar, badges, onboarding) + grid סקשנים (משימות, מדדים, תרופות, פרטים).

**Dashboard:** PageHeader + BadgeRow (KPI) + grid 2:1 (משימות דחופות, ביקור, מסמכים | מטופל מרכזי, צוות, פעילות).

**Questionnaires:** כרטיסים דלים – grid 2/3/4 עמודות, max-w-md לכרטיס.

---

## 9. הפניה למסמכים

- [UX_UI_SPECIFICATIONS.md](UX_UI_SPECIFICATIONS.md) – ערכים מספריים
- [UX_UI_COMPONENTS.md](UX_UI_COMPONENTS.md) – רכיבים
- [UX_UI_ACCESSIBILITY.md](UX_UI_ACCESSIBILITY.md) – נגישות

---

*MemorAId UX/UI User App v1.0 | February 2026*
