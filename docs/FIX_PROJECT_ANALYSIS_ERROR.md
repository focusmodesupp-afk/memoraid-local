# תיקון שגיאת ניתוח פרויקט – "attached_file_ids does not exist"

## תקציר

פעולת "הפעל ניתוח" בטאב "ניתוח פרויקט" נכשלה עם השגיאה:
```
column "attached_file_ids" of relation "admin_ai_analyses" does not exist
```

**הסיבה:** הטבלה `admin_ai_analyses` במסד הנתונים נוצרה מגרסה ישנה של הסכמה, ללא העמודה `attached_file_ids`.

---

## ניתוח מעמיק

### 1. מה קרה בפועל

1. המשתמש לחץ על "הפעל ניתוח" בדף ניתוח ותכנון AI
2. הקליינט שלח `POST /api/admin/ai/project-analyze`
3. השרת הריץ `INSERT` לטבלת `admin_ai_analyses` כולל שדה `attached_file_ids`
4. PostgreSQL החזיר שגיאה: העמודה `attached_file_ids` לא קיימת בטבלה
5. השרת החזיר 500 והקליינט הציג את הודעת השגיאה

### 2. שורש הבעיה

הסכמה בקוד (Drizzle + `shared/schemas/schema.ts`) מגדירה:

```ts
attachedFileIds: uuid('attached_file_ids').array().default([]),
```

אבל הטבלה במסד הנתונים נוצרה בלי עמודה זו.

**מקורות אפשריים לטבלה ללא העמודה:**
- מיגרציה 0023 – יוצרת את הטבלה בלי `attached_file_ids`
- מיגרציה 0024 – מוסיפה את העמודה; ייתכן שלא הופעלה
- סקריפט `create-admin-ai-analyses.mjs` – יוצר טבלה בלי עמודה זו
- יצירת טבלה ידנית או דרך כלי חיצוני

### 3. מבנה הסכמה הרלוונטי

| קובץ | תפקיד |
|------|--------|
| `server/db/migrations/0023_admin_ai_analyses.sql` | יוצר את הטבלה ללא `attached_file_ids` |
| `server/db/migrations/0024_ai_file_attachments.sql` | מוסיף `attached_file_ids`, `admin_full_name`, `analysis_metadata` |
| `scripts/create-admin-ai-analyses.mjs` | יוצר טבלה בסיסית – **ללא** העמודות הנוספות |
| `server/src/adminRoutes.ts` – POST `/ai/create-tables` | יוצר טבלה ורץ `ALTER TABLE` להוספת העמודות |

### 4. פתרון מומלץ

הרצת הוספת העמודות החסרות במסד הנתונים.

#### אפשרות א': דרך הממשק
1. גלוש לדף: `http://localhost:5173/admin/ai/project-analyze`
2. לחץ על "יצירת טבלת ארכיון (לחץ כאן)"
3. המתן להודעת הצלחה

#### אפשרות ב': הרצת סקריפט
```bash
npm run fix:ai-schema
```

או:
```bash
node scripts/fix-ai-analyses-schema.mjs
```

#### אפשרות ג': SQL ידני (Supabase SQL Editor)
```sql
ALTER TABLE "admin_ai_analyses"
  ADD COLUMN IF NOT EXISTS "attached_file_ids" uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "admin_full_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "analysis_metadata" jsonb DEFAULT '{}';
```

---

## אם כפתור "יצירת טבלת ארכיון" לא עובד

אם לחיצה על "יצירת טבלת ארכיון (לחץ כאן)" לא מסייעת, ייתכן ש:
- השרת מחזיר שגיאה 500 (בדוק את הקונסול)
- חיבור ל-DB נכשל

במקרה כזה השתמש באפשרות ב' או ג' (סקריפט / SQL ידני).

---

## סיכום

| פריט | ערך |
|------|-----|
| **שגיאה** | `column "attached_file_ids" of relation "admin_ai_analyses" does not exist` |
| **סיבה** | סכמת DB לא מעודכנת – חסרות עמודות שהוספו בקוד |
| **תיקון** | הרצת `ALTER TABLE` להוספת העמודות (דרך UI, סקריפט או SQL) |
