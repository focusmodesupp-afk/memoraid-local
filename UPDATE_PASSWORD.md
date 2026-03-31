# 🔐 עדכון סיסמת אדמין

## ✅ הסיסמה החדשה

- **Email:** `yoav@memoraid.co`
- **Password:** `MeMo@@2025@@`

---

## 🚀 איך לעדכן (2 דרכים)

### דרך 1: דרך API (קל ומהיר) ⭐

#### שלב 1: ודא שהשרת רץ
```powershell
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
npm run dev:server
```

#### שלב 2: פתח בדפדפן
```
http://localhost:3006/api/health/update-admin-password
```

תקבל:
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

**זהו! הסיסמה עודכנה!** ✅

---

### דרך 2: דרך סקריפט

```powershell
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
npm run admin:update-password
```

---

## 🌐 עכשיו התחבר

1. גש ל: `http://localhost:5173/admin/login`
2. הזן:
   - **Email:** `yoav@memoraid.co`
   - **Password:** `MeMo@@2025@@`
3. לחץ "כניסה"

**זהו! אתה בפנים!** 🎉

---

## 🐛 אם זה לא עובד

### בעיה: "Admin user not found"

**פתרון:** צור משתמש אדמין:
```powershell
node scripts/create-admin.mjs
```

עקוב אחר ההוראות ושים:
- Email: `yoav@memoraid.co`
- Password: `MeMo@@2025@@`

---

### בעיה: השרת לא רץ

**פתרון:**
```powershell
# פתח PowerShell כמנהל
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
npm run dev
```

---

### בעיה: "Table not found"

**פתרון:** צור את הטבלאות:
```powershell
node scripts/create-admin.mjs
```

---

## 📝 הערות

- הסיסמה מוצפנת ב-bcrypt במסד הנתונים
- הסיסמה החדשה: `MeMo@@2025@@` (עם 2 @ באמצע ו-2 @ בסוף)
- אם שינית את הסיסמה בעבר, היא תידרס

---

## ✅ Checklist

- [ ] השרת רץ (`npm run dev`)
- [ ] פתחתי את `http://localhost:3006/api/health/update-admin-password`
- [ ] ראיתי `"ok": true`
- [ ] נכנסתי ל-`http://localhost:5173/admin/login`
- [ ] הזנתי את הפרטים הנכונים
- [ ] נכנסתי בהצלחה! 🎉

---

## 🎉 זהו!

**הסיסמה עודכנה והכל אמור לעבוד!**
