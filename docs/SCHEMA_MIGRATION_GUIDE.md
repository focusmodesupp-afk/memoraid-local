# מדריך שינוי Schema – MemorAId

## מתי להשתמש ב-db:push vs migrate

| מצב | כלי | תיאור |
|-----|-----|-------|
| פיתוח מקומי | `npm run db:push` | מעדכן את ה-DB ישירות לפי schema.ts, בלי קבצי migration. מהיר, מתאים לפיתוח. |
| ייצור / staging | `node scripts/safe-migrate.mjs` | גיבוי, יצירת migration, הצגת SQL, אישור, הרצת migrate. |

**דחיפה ישירה לייצור:** אל תשתמשו ב-`db:push` בייצור. השתמשו ב-`safe-migrate` או ב-`drizzle-kit migrate` אחרי גיבוי.

## מתי גיבוי חובה

- **חובה** לפני כל `drizzle-kit migrate` בייצור או staging.
- `safe-migrate` מריץ אוטומטית `backup-data` לפני migrate.
- עבור שינויים קריטיים (מחיקת עמודות, שינוי types) – גיבוי מלא נוסף מומלץ.

```bash
npm run backup:data
```

## Migrations קיימים

- `0023_admin_ai_analyses.sql` + `0024_ai_file_attachments.sql` – סכמה מלאה של admin AI analyses.
- Script `create-admin-ai-analyses.mjs` ו-endpoint `/admin/ai/create-tables` מיועדים ליצירה/תיקון ידני אם הטבלאות חסרות.

## נוהל מומלץ

1. עדכן `shared/schemas/schema.ts`.
2. הרץ `npm run db:generate` – נוצרים קבצי migration חדשים.
3. בדוק את ה-SQL שנוצר.
4. הרץ `node scripts/safe-migrate.mjs` – גיבוי, הצגה, אישור, migrate.
