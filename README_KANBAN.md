# 🚀 Dev Kanban System - מדריך מהיר

## הקנבאן ריק? הנה הפתרון! ⚡

### שלב 1: הפעל את השרת
```bash
npm run dev
```

### שלב 2: פתח את דף ההגדרה
פתח בדפדפן:
```
file:///c:/Users/USER/OneDrive/Documentos/memoraid-local/setup-kanban.html
```

או גש ישירות ל:
```
http://localhost:5000/api/health/create-dev-kanban-tables
```

### שלב 3: גש לקנבאן
```
http://localhost:5000/admin/dev/kanban
```

---

## 🎯 מה ייווצר?

### 4 עמודות:
1. **Backlog** (אפור) - משימות עתידיות
2. **To Do** (כחול) - משימות מתוכננות  
3. **In Progress** (כתום) - בעבודה כרגע
4. **Done** (ירוק) - הושלם

### 20 משימות מתכנית העבודה:

**Backlog (8 משימות):**
- E2E tests - Playwright
- Unit tests - Vitest
- React Native app
- AI task suggestions
- Voice interface
- React Query caching
- Virtual scrolling
- Code splitting

**To Do (5 משימות):**
- Google Calendar API
- Outlook Calendar API
- Apple Calendar (CalDAV)
- Twilio SMS
- WhatsApp notifications

**In Progress (2 משימות):**
- Resend Email setup
- Stripe webhooks

**Done (4 משימות):**
- Admin System (33 pages)
- Kanban board
- Forgot Password
- Multi-family support

---

## ✨ תכונות

### ✅ מה כבר עובד:
- [x] 4 עמודות ברירת מחדל
- [x] 20 משימות מתכנית העבודה
- [x] הוספת עמודות חדשות (כפתור "עמודות")
- [x] עריכת עמודות (שם, צבע)
- [x] מחיקת עמודות
- [x] סידור מחדש של עמודות
- [x] יצירת משימות חדשות
- [x] עריכה מלאה של משימות
- [x] Drag & Drop בין עמודות
- [x] מערכת תגובות
- [x] חיפוש וסינון
- [x] שמירה אוטומטית ב-PostgreSQL

### 🎨 קטגוריות זמינות:
- Email
- Calendar
- Admin
- Testing
- Optimization
- AI
- Mobile

### 🎯 עדיפויות:
- 🔴 High
- 🟡 Medium
- ⚪ Low

---

## 📝 שימוש

### הוספת משימה:
1. לחץ "+ משימה חדשה"
2. הזן כותרת
3. בחר עמודה
4. לחץ "צור"

### עריכת משימה:
1. לחץ על המשימה
2. ערוך ב-3 טאבים:
   - **פרטים**: כותרת, תיאור, עדיפות, קטגוריה
   - **תכנון**: אחראי, תאריך יעד, הערכת שעות, תגיות
   - **פעילות**: תגובות

### הוספת עמודה:
1. לחץ "עמודות"
2. לחץ "+ הוסף עמודה"
3. הזן שם ובחר צבע
4. לחץ ✓

### העברת משימה:
גרור את המשימה לעמודה אחרת!

---

## 🔧 Troubleshooting

### הקנבאן עדיין ריק?
הטבלאות לא נוצרו. פתח:
```
file:///c:/Users/USER/OneDrive/Documentos/memoraid-local/setup-kanban.html
```

### שגיאת "Connection refused"?
השרת לא רץ:
```bash
npm run dev
```

### רוצה לאפס הכל?
1. פתח Drizzle Studio: `npm run db:studio`
2. מחק את הטבלאות: `dev_columns`, `dev_tasks`, `dev_comments`
3. הרץ שוב את setup-kanban.html

---

## 🎉 זהו!

**4 עמודות + 20 משימות + אפשרות להוסיף עוד! 🚀**

תיהנה מהקנבאן החדש! 💪
