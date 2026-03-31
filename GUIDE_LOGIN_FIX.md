# תיקון שגיאת primary_family_id – הדרכה שלב אחרי שלב

## הבעיה
הקוד מצפה לעמודה `primary_family_id` בטבלת `users`, אבל בבסיס הנתונים ב-Supabase העמודה הזו עדיין לא קיימת.

---

## שלב 1: וידוא קובץ .env

1. פתח את הפרויקט ב-Cursor (או בעורך הקוד).
2. וודא שקיים קובץ `.env` בתיקיית הפרויקט.
3. וודא שיש בו שורה `DATABASE_URL` שמכוונת ל-Supabase, למשל:
   ```
   DATABASE_URL=postgresql://postgres.xxx:[הסיסמה]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
   ```

---

## שלב 2: הרצת מיגרציות (אפשרות א')

1. פתח **Terminal** ב-Cursor (או CMD/PowerShell בתיקיית הפרויקט).
2. הרץ:
   ```
   cd c:\Users\USER\OneDrive\Documentos\memoraid-local
   npm run db:migrate
   ```
3. אם הכל עבר – עבר לשלב 3.
4. אם יש שגיאה – עבור לאפשרות ב'.

---

## שלב 3: הרצת המיגרציה ידנית (אפשרות ב')

אם `npm run db:migrate` נכשל:

1. היכנס ל-**Supabase Dashboard**.
2. בחר את הפרויקט שלך.
3. בתפריט השמאלי: **SQL Editor**.
4. לחץ **New query**.
5. הדבק את ה-SQL הבא והרץ אותו:

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "primary_family_id" uuid;
UPDATE "users" SET "primary_family_id" = "family_id" WHERE "primary_family_id" IS NULL AND "family_id" IS NOT NULL;
```

6. לחץ **Run** (או F5).
7. אמור להופיע "Success".

---

## שלב 4: הפעלת השרת מחדש והתחברות

1. בטרמינל הרץ (או עצור והפעיל מחדש):
   ```
   npm run dev
   ```
2. בדפדפן – רענן את דף הכניסה.
3. נסה להתחבר שוב עם האימייל והסיסמה.

---

## אם עדיין לא עובד

- ודא ש-`DATABASE_URL` נכון וה-Supabase פרויקט פעיל.
- ודא שטבלת `users` קיימת (אם אין – הרץ קודם את המיגרציות 0000 עד 0003).
