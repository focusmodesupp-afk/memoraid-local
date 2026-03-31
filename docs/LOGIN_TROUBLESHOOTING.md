# פתרון שגיאות התחברות אדמין

## ECONNREFUSED / "השרת לא מגיב"

**משמעות:** ה-backend לא רץ. Vite (ה-client) מנסה להעביר בקשות API לפורט 3001 – ואין שם שום דבר.

### מה לעשות

1. **הרץ תמיד `npm run dev`** – לא `vite` ולא `npm run dev:client` לבד.
   - `npm run dev` מפעיל **גם** את ה-client **וגם** את ה-server (concurrently).

2. **ודא שבטרמינל מופיע:**
   ```
   Server running at http://localhost:3001
   DB: connected
   ```
   אם לא רואה את זה – השרת קרס או לא עלה. בדוק שגיאות אדומות בטרמינל.

3. **אם השרת קורס בהפעלה:**
   - הרץ: `node scripts/test-db-connection.mjs` – לוודא חיבור ל-DB.
   - הרץ: `npm run fix:login` – ליצירת טבלאות אדמין.
   - אם יש `MODULE_NOT_FOUND` – יש import שגוי. שלח את השגיאה המלאה.

## Dev Bypass – עבודה בלי לוגין

1. הוסף ל־`.env`: `DEV_SKIP_AUTH=1`
2. הפעל מחדש את השרת
3. גלוש ל־`http://localhost:5173/admin?dev=1`

## סדר הפעלה מומלץ

```bash
npm run fix:login
npm run db:push
npm run dev
```

ואז: `http://localhost:5173/admin?dev=1`
