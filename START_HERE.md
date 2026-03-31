# הפעלת MemorAId – התחל כאן

## הבעיה: "Connection Refused" / ERR_CONNECTION_REFUSED

**זה אומר שהשרת לא רץ.** צריך להפעיל אותו.

---

## מה לעשות – בדיוק לפי הסדר

### 1. פתח טרמינל בתיקיית הפרויקט
```bash
cd C:\Users\USER\OneDrive\Documentos\memoraid-local
```

### 2. הרץ את זה (פקודה אחת)
```bash
npm run dev
```

**זהו.** זה מפעיל את ה-client (Vite) וה-server ביחד.

### 3. חכה עד שמופיע:
```
Server running at http://localhost:3001
VITE ready
Local: http://localhost:5173/
```

### 4. פתח בדפדפן
```
http://localhost:5173
```

או:
- **משתמשים:** http://localhost:5173/dashboard
- **אדמין:** http://localhost:5173/admin

**אין צורך בלוגין** – במצב dev זה דולג אוטומטית.

---

## אם npm run dev נכשל

1. **התקן תלויות:**
   ```bash
   npm install
   ```

2. **אם יש שגיאה על DB** – הרץ לפני:
   ```bash
   npm run fix:login
   node scripts/push-db.mjs
   ```

3. **הרץ שוב:**
   ```bash
   npm run dev
   ```

---

## חשוב

- **אל תסגור את החלון של הטרמינל** – השרת רץ שם
- אם סגרת – הרץ `npm run dev` שוב
- הפורט 5173 = client, 3001 = API
