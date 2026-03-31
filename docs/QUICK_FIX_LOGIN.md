# תיקון מהיר – לא מתחבר לאדמין / 500 / בעיה במסד הנתונים

## סדר פעולות

### 1. סגור תהליכים ישנים
סגור את כל החלונות שבהן הרצת `npm run dev` או שרתים. אם נשארו תהליכים – הפורט עשוי להיות תפוס.

### 2. עדכן סכמת הטבלאות
```bash
npm run create:ai-tables
```
(יוצר את הטבלה `admin_ai_analyses` עם העמודות הנדרשות)

### 3. ודא שמשתמש האדמין קיים
```bash
npm run admin:ensure
```
מציג: אימייל וסיסמה (ברירת מחדל: `yoav@memoraid.co` / `MeMo@@2025@@`)

### 4. הרץ את השרת
```bash
npm run dev
```
צריך לראות:
- `Server running at http://localhost:3001`
- `DB: connected`
- `VITE ready at http://localhost:5173`

### 5. התחבר
גלוש ל־http://localhost:5173/admin/login והתחבר עם האימייל והסיסמה מהשלב 3.

---

## אם עדיין לא עובד

- **500 / בעיה במסד הנתונים:** ודא ש־`DATABASE_URL` ב־`.env` תקין (Session Pooler, פורט 5432). הרץ `npm run db:test`.
- **Invalid credentials:** הרץ `npm run admin:ensure` ובדוק את הסיסמה המוצגת.
- **פורט תפוס:** הוסף ל־`.env`: `API_PORT=3002` והפעל מחדש.
