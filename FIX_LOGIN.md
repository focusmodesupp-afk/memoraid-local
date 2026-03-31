# 🔐 תיקון בעיית הלוגין - פתרון מהיר

## ⚠️ הבעיה
לא מצליח להתחבר עם הסיסמה `MeMo@@2025@@`

---

## 🔌 שגיאת 500 / Internal Server Error? בדוק את DATABASE_URL

אם אתה מקבל **500** או **Internal Server Error** – בדרך כלל בעיית חיבור ל-Supabase.

### הגדר Session Pooler ב-`.env`:

1. פתח `.env` בתיקיית הפרויקט.
2. ודא ש-`DATABASE_URL` משתמש ב-**Session Pooler** (פורט 5432):

```
DATABASE_URL=postgresql://postgres.cmkuuvbwspsmgqtlnbti:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

3. החלף `[YOUR-PASSWORD]` בסיסמת מסד הנתונים מ-Supabase (Settings → Database).
4. **חשוב:** אם הסיסמה מכילה `@`, צריך לקודד אותה ב-URL: `@` → `%40`
   - דוגמה עם `MeMo@@2025@@`: `MeMo%40%402025%40%40`
   - לכן: `DATABASE_URL=postgresql://postgres.cmkuuvbwspsmgqtlnbti:MeMo%40%402025%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`
5. שמור והפעל מחדש: `npm run dev`.

---

## ✅ הפתרון (3 אפשרויות)

### אופציה 1: עדכן סיסמה דרך API ⭐ (הכי קל)

#### שלב 1: ודא שהשרת רץ
```powershell
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
npm run dev:server
```

#### שלב 2: פתח בדפדפן
```
http://localhost:3006/api/health/update-admin-password
```

תראה:
```json
{
  "ok": true,
  "message": "Password updated successfully!",
  "credentials": {
    "email": "yoav@memoraid.co",
    "password": "MeMo@@2025@@"
  }
}
```

#### שלב 3: התחבר
```
http://localhost:5173/admin/login
```

**זהו! הסיסמה עודכנה!** ✅

---

### אופציה 2: צור משתמש אדמין מחדש

```powershell
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
node scripts/create-admin.mjs
```

**הזן:**
- Username: `yoav`
- Email: `yoav@memoraid.co`
- Password: `MeMo@@2025@@`

---

### אופציה 3: בדוק מה הסיסמה הנוכחית

אם אתה זוכר סיסמה אחרת שיצרת, נסה אותה.

אפשרויות נפוצות:
- `MeMo@@2025@@`
- `Memo@@2025@@` (עם M קטנה)
- `admin123`
- סיסמה אחרת שהגדרת

---

## 🎯 פרטי התחברות הנכונים

- **Email:** `yoav@memoraid.co`
- **Password:** `MeMo@@2025@@`

(שים לב: M גדולה, e קטנה, M גדולה, o קטנה, 2 @ באמצע, 2025, 2 @ בסוף)

---

## 🐛 עדיין לא עובד?

### בדוק שהשרת רץ:
```powershell
# בדוק אם פורט 3006 פעיל
netstat -ano | findstr :3006
```

אם אין תוצאה → השרת לא רץ → הרץ `npm run dev:server`

---

### בדוק שיש משתמש אדמין:
```powershell
node scripts/check-auth.mjs
```

---

## 📋 Checklist

- [ ] השרת רץ על פורט 3006
- [ ] פתחתי `http://localhost:3006/api/health/update-admin-password`
- [ ] ראיתי `"ok": true`
- [ ] גשתי ל-`http://localhost:5173/admin/login`
- [ ] הזנתי: `yoav@memoraid.co` / `MeMo@@2025@@`
- [ ] נכנסתי בהצלחה! 🎉

---

## 🎉 זהו!

**הסיסמה תתעדכן והכל יעבוד!**

אם עדיין יש בעיות, אולי צריך ליצור משתמש אדמין מחדש עם `create-admin.mjs`
