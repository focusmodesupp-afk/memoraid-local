# תיקון מהיר – שגיאות 500 בהתחברות Admin

## פקודה אחת – תיקון מלא:

```bash
npm run fix:login
```

הסקריפט בודק חיבור, יוצר טבלאות אדמין אם חסרות, ויוצר/מעדכן משתמש.

---

## הרצה ידנית (אם fix:login לא עובד):

### 1. בדיקת חיבור DB
```bash
node scripts/test-db-connection.mjs
```
- ✅ אם מצליח – עבור לשלב 2
- ❌ אם נכשל – בדוק `DATABASE_URL` ב-`.env`. אם Supabase – ודא Session Pooler (פורט 5432). אם סיסמה עם `@` → קודד: `@` → `%40`

### 2. יצירת/עדכון טבלאות ומשתמש
```bash
npm run seed:dev
```

### 3. הפעלת שרת
```bash
npm run dev
```

### 4. התחברות
- **אימייל:** `yoav@memoraid.co`
- **סיסמה:** `MeMo@@2025@@` (שני @ באמצע, שני @ בסוף)

---

## אם עדיין 500

1. **בדוק את הטרמינל** שבו רץ `npm run dev` – השגיאה המדויקת מופיעה שם (למשל: `Admin login error [code=42P01]:` או `health/tables DB error`)

2. **הרץ אבחון מלא:**
   ```bash
   npm run diagnose:auth
   ```

3. **אם "טבלאות חסרות":**
   ```bash
   npm run db:push
   npm run seed:dev
   ```

4. **הרץ סקריפט עדכון סיסמה (אם השרת רץ):**
   - פתח בדפדפן: `http://localhost:3001/api/health/update-admin-password` (או הפורט שלך)
   - ראה FIX_LOGIN.md לפרטים
