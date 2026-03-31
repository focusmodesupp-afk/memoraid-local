# תיקון שגיאות 500 ו-404 בשרת

## הבעיה
- **500 Internal Server Error** ב-`/api/auth/login` ו-`/api/auth/me`
- **404 Not Found** ב-`/api/tasks`
- הודעת "Internal Server Error" בטופס ההתחברות

---

## סדר תיקון מומלץ (הרץ לפי הסדר)

### 1. ודא שהשרת רץ
```bash
npm run dev
```
בטרמינל חייב להופיע:
```
Server running at http://localhost:3001
DB: connected
```
אם לא – ראה [השרת לא עולה](#השרת-לא-עולה) למטה.

### 2. סנכרן את מסד הנתונים
```bash
npm run db:push
```
זה מעדכן את הסכמה (טבלאות users, sessions, families, tasks וכו').

### 3. צור חשבונות בדיקה
```bash
npm run seed:dev
```
זה יוצר:
- משתמש אדמין
- משתמש רגיל לאותו אימייל וסיסמה

### 4. הרץ אבחון
```bash
npm run diagnose:auth
```
הסקריפט בודק חיבור ל-DB, קיום טבלאות, ומנסה התחברות.

### 5. הפעל מחדש את השרת
```bash
npm run dev
```
ואז: `http://localhost:5173/login`

---

## בעיות נפוצות

### השרת לא עולה
- **חיבור ל-DB נכשל:** בדוק `DATABASE_URL` ב-`.env`
- **פורט תפוס:** שנה `API_PORT=3002` ב-`.env` (וודא ש-`vite.config.ts` proxy מצביע לאותו פורט)
- **טבלאות חסרות:** הרץ `npm run db:push` ואז `npm run fix:login`

### שגיאת 500 על login/auth/me
| סיבה | פתרון |
|------|--------|
| טבלאות users/sessions חסרות | `npm run db:push` |
| משתמש לא קיים | `npm run seed:dev` |
| חיבור DB כושל | בדוק `DATABASE_URL`, הרץ `npm run db:test` |
| סכמה לא מעודכנת | `npm run db:push` |
| סיסמה עם @ | קודד ב-URL: `@` → `%40` |

### שגיאת 404 על /api/tasks
- **השרת לא רץ** – הרץ `npm run dev` (לא רק `vite`)
- **נתיב שגוי** – הקריאה צריכה להיות ל-`/api/tasks` (ה-API מוסיף את `/api` אוטומטית)

---

## בדיקה מהירה
```bash
# 1. חיבור DB
npm run db:test

# 2. סנכרן סכמה
npm run db:push

# 3. צור משתמשים
npm run seed:dev

# 4. הפעל שרת
npm run dev

# 5. אבחון (בטרמינל נפרד, כשהשרת רץ)
npm run diagnose:auth
```

---

## פרטי התחברות ברירת מחדל (אחרי seed:dev)
- **אימייל:** yoav@memoraid.co (או מה שב-`ADMIN_EMAIL` ב-.env)
- **סיסמה:** MeMo@@2025@@ (או מה שב-`ADMIN_PASSWORD` ב-.env)
