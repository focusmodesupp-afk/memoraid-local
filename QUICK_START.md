# 🚀 התחלה מהירה - MemorAid Admin & Sprint System

## ⚠️ בעיות נפוצות ופתרונות

### בעיה 1: דף הלוגין לא קליקאבילי / לא עובד

**הסיבה:** השרת לא רץ

**הפתרון:**

#### אופציה 1: הרץ מטרמינל רגיל (מומלץ)
1. פתח **PowerShell או CMD כמנהל** (לא דרך Cursor)
2. נווט לתיקייה:
```bash
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
```

3. הרץ את השרת:
```bash
npm run dev
```

4. המתן עד שתראה:
```
Server running at http://localhost:3006
VITE ready at http://localhost:5173
```

5. עכשיו גש ל:
```
http://localhost:5173/admin/login
```

---

#### אופציה 2: הרץ בשני טרמינלים נפרדים

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

### בעיה 2: איך ליצור את טבלאות הספרינטים?

**לאחר שהשרת רץ**, בחר אחת מהאפשרויות:

#### אופציה 1: דרך הדפדפן
פשוט גש לכתובת:
```
http://localhost:3006/api/health/create-sprint-tables
```

תקבל תשובה:
```json
{"ok":true,"message":"Sprint tables created successfully!"}
```

#### אופציה 2: דרך PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:3006/api/health/create-sprint-tables" -Method POST
```

#### אופציה 3: דרך CMD (עם curl)
```bash
curl -X POST http://localhost:3006/api/health/create-sprint-tables
```

---

## 📋 סדר פעולות מלא

### שלב 1: הפעל את השרת
```bash
# פתח PowerShell כמנהל
cd c:\Users\USER\OneDrive\Documentos\memoraid-local
npm run dev
```

### שלב 2: צור טבלאות (אם עדיין לא)

**טבלאות Kanban:**
```
http://localhost:3006/api/health/create-dev-kanban-tables
```

**טבלאות Sprints:**
```
http://localhost:3006/api/health/create-sprint-tables
```

### שלב 3: היכנס לאדמין
```
http://localhost:5173/admin/login
```

**פרטי התחברות:**
- Username: (השתמש ב-`create-admin.mjs` אם אין משתמש)
- Password: (הסיסמה שהגדרת)

### שלב 4: גש לספרינטים
```
http://localhost:5173/admin/sprints
```

---

## 🔧 פתרון בעיות נוספות

### השרת לא עולה - שגיאת EPERM
**הסיבה:** בעיית הרשאות ב-Windows

**הפתרון:**
1. הרץ PowerShell **כמנהל**
2. או השתמש באופציה 2 (שני טרמינלים)

---

### דף הלוגין לא נטען
**בדוק:**
1. ✅ השרת רץ? (`npm run dev`)
2. ✅ Vite רץ? (אמור להיות על פורט 5173)
3. ✅ אין שגיאות ב-console?

**פתרון:**
```bash
# נקה cache
npm cache clean --force

# התקן מחדש
rm -rf node_modules
npm install

# הרץ שוב
npm run dev
```

---

### לא מצליח להיכנס לאדמין
**צור משתמש אדמין:**
```bash
node scripts/create-admin.mjs
```

עקוב אחר ההוראות ליצירת משתמש.

---

### הטבלאות לא נוצרות
**בדוק שהשרת רץ:**
```bash
# בדוק אם השרת פעיל
netstat -ano | findstr :3006
```

אם אין תוצאה - השרת לא רץ.

---

## 📍 כתובות חשובות

| שירות | כתובת | תיאור |
|-------|--------|-------|
| **Vite (Frontend)** | http://localhost:5173 | האתר הראשי |
| **API Server** | http://localhost:3006 | השרת |
| **Admin Login** | http://localhost:5173/admin/login | כניסה לאדמין |
| **Sprints** | http://localhost:5173/admin/sprints | ספרינטים |
| **Kanban** | http://localhost:5173/admin/dev/kanban | קנבאן |
| **Create Kanban Tables** | http://localhost:3006/api/health/create-dev-kanban-tables | יצירת טבלאות |
| **Create Sprint Tables** | http://localhost:3006/api/health/create-sprint-tables | יצירת טבלאות |

---

## ✅ Checklist להפעלה

- [ ] פתחתי PowerShell **כמנהל**
- [ ] ניווטתי לתיקייה הנכונה
- [ ] הרצתי `npm run dev`
- [ ] ראיתי "Server running at..."
- [ ] ראיתי "VITE ready at..."
- [ ] יצרתי טבלאות Kanban
- [ ] יצרתי טבלאות Sprints
- [ ] יצרתי משתמש אדמין (אם צריך)
- [ ] נכנסתי לאדמין
- [ ] הכל עובד! 🎉

---

## 🆘 עדיין לא עובד?

### בדוק את הלוגים:

**לוג השרת:**
```bash
# אם השרת רץ ברקע, בדוק את הלוג
cat C:\Users\USER\.cursor\projects\c-Users-USER-OneDrive-Documentos-memoraid-local\terminals\*.txt
```

**לוג הדפדפן:**
1. פתח את הדפדפן
2. לחץ F12
3. עבור ל-Console
4. חפש שגיאות אדומות

---

## 💡 טיפים

### טיפ 1: השתמש בדפדפן Incognito
לפעמים cache גורם לבעיות. נסה:
```
Ctrl + Shift + N (Chrome)
Ctrl + Shift + P (Firefox)
```

### טיפ 2: רענן עם ניקוי Cache
```
Ctrl + Shift + R
```

### טיפ 3: בדוק את הפורטים
```powershell
# בדוק מי משתמש בפורט 5173
netstat -ano | findstr :5173

# בדוק מי משתמש בפורט 3006
netstat -ano | findstr :3006
```

---

## 🎉 הצלחת!

אם הכל עובד, אתה אמור לראות:
- ✅ דף לוגין פעיל
- ✅ אפשרות להזין username/password
- ✅ לאחר התחברות - ממשק אדמין מלא
- ✅ תפריט עם "ספרינטים"
- ✅ תפריט עם "Kanban פיתוח"

**עכשיו תתחיל לעבוד! 🚀**
