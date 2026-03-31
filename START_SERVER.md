# 🚀 הפעלת השרת - הוראות

## ✅ הטבלאות כבר נוצרו!

הטבלאות במסד הנתונים כבר נוצרו עם:
- ✅ 4 עמודות (Backlog, To Do, In Progress, Done)
- ✅ 20 משימות מתכנית העבודה

---

## 🔧 בעיית ההרשאות

יש בעיית `EPERM` ב-Windows שמונעת מ-`concurrently` לעבוד.

### הפתרון:

**אופציה 1: הרץ בטרמינל רגיל (מומלץ)**

פתח PowerShell או CMD **כמנהל** והרץ:

```bash
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
npm run dev
```

---

**אופציה 2: הרץ בשני טרמינלים נפרדים**

**טרמינל 1 - השרת:**
```bash
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
npm run dev:server
```

**טרמינל 2 - הקליינט:**
```bash
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
npm run dev:client
```

---

**אופציה 3: הרץ רק את השרת (ללא Vite)**

```bash
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
npm run dev:server
```

השרת יהיה זמין ב: `http://localhost:3006`

---

## 📍 כתובות חשובות

לאחר שהשרת רץ:

- **Admin Login:** `http://localhost:5173/admin/login` (אם Vite רץ)
- **Dev Kanban:** `http://localhost:5173/admin/dev/kanban` (אם Vite רץ)
- **API Server:** `http://localhost:3006` (השרת)

---

## 🎯 מה עכשיו?

1. פתח PowerShell **כמנהל**
2. הרץ: `npm run dev`
3. גש ל: `http://localhost:5173/admin/dev/kanban`
4. תראה 4 עמודות עם 20 משימות! 🎉

---

## 💡 טיפ

אם עדיין יש בעיות, נסה:
```bash
# נקה cache
npm cache clean --force

# התקן מחדש
rm -rf node_modules
npm install

# הרץ שוב
npm run dev
```
