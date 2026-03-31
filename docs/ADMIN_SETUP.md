# MemorAid Admin — התקנה והפעלה

## צעדים ראשונים

### 1. הרצת מיגרציות (טבלאות Admin)

הרץ:

```bash
npm run db:push
```

או אם אתה משתמש במיגרציות ידניות:

```bash
# הרץ את הקובץ
psql $DATABASE_URL -f server/db/migrations/0008_admin.sql
```

### 2. יצירת משתמש Admin ראשון

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourSecurePassword npm run admin:create
```

או:

```bash
node scripts/create-admin.mjs admin@example.com yourSecurePassword
```

### 3. כניסה למערכת Admin

1. הפעל את האפליקציה: `npm run dev`
2. גלוש ל: **http://localhost:5173/admin**
3. התחבר עם האימייל והסיסמה שיצרת

## נתיבים

| נתיב | תיאור |
|------|-------|
| `/admin` | לוח בקרה |
| `/admin/families` | רשימת משפחות |
| `/admin/families/:id` | פרטי משפחה |
| `/admin/users` | רשימת משתמשים |
| `/admin/users/:id` | פרטי משתמש + impersonation (Super Admin) |

## Impersonation

משתמשים עם תפקיד `super_admin` יכולים ללחוץ על "התחבר כמשתמש" בדף פרטי משתמש — וכך להיכנס לאפליקציה כמשתמש זה לצורך תמיכה.
