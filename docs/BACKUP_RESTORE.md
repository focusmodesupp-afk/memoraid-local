# גיבוי ושחזור – MemorAId

## גיבוי נתונים

הסקריפט `backup-data.mjs` שומר את הטבלאות העיקריות לקובץ JSON:

```bash
npm run backup:data
# או עם קובץ פלט:
node scripts/backup-data.mjs my-backup.json
```

**טבלאות:** admin_ai_analyses, admin_users, families, users, family_invites, ai_usage

הקובץ נשמר בתיקיית הפרויקט עם שם ברירת מחדל: `backup-YYYY-MM-DD-HHmm.json`.

## שחזור ידני

קובץ הגיבוי הוא JSON עם מבנה:

```json
{
  "_meta": { "exportedAt": "...", "tables": [...] },
  "data": {
    "users": [...],
    "families": [...],
    ...
  }
}
```

אין סקריפט שחזור מובנה. לשחזור:

1. לנתח את הקובץ ולהוסיף נתונים ידנית ל-DB
2. או להשתמש בכלי DB (pgAdmin, DBeaver) ל-INSERT מבוסס על ה-JSON

## גיבוי לפני Migration

לפני הרצת migrations בייצור או staging – **חובה** גיבוי:

```bash
npm run backup:data
node scripts/safe-migrate.mjs
```

`safe-migrate` מריץ אוטומטית את `backup-data` לפני migrate. ראה [SCHEMA_MIGRATION_GUIDE.md](./SCHEMA_MIGRATION_GUIDE.md).
