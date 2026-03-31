# מדריך פיתוח – מניעת שבירת כניסה (Auth Resilience)

## הבעיה
לאחר שינויים בקוד, הכניסה למערכת (משתמשים או Admin) נשברת. הסיבות העיקריות:

1. **סכמה לא מסונכרנת** – עמודות/טבלאות חדשות בקוד אבל המיגרציות לא רצו
2. **לוגיקה אופציונלית שזורקת** – audit_log, family_members, primary_family_id – אם חסרים, השאילתה נכשלת
3. **Import-time failures** – טעינת מודולים שמנפצים את האפליקציה
4. **בדיקות חסרות** – אין אימות אוטומטי שכניסה עובדת

---

## כללים לפיתוח

### 1. שינוי סכמה
- **תמיד** להוסיף מיגרציה ב-`server/db/migrations/`
- **להריץ** `npm run db:migrate` או להריץ את ה-SQL ידנית ב-Supabase
- **Admin tables** – להריץ `node scripts/create-admin.mjs ...` אחרי מיגרציה 0008

### 2. קוד Auth – הגנה
- **ליבת Auth** (sessions, users, admin_users, admin_sessions) – חייבת לעבוד תמיד
- **לוגיקה אופציונלית** (families, family_members, primary_family_id, audit_log) – לעטוף ב-`try/catch`, כשנכשל – להחזיר fallback ולא לזרוק
- **Short-circuit** – אם אין token, להחזיר null מיד בלי שאילתת DB

### 3. לפני Commit / Deploy
```bash
npm run check:auth
```
מוודא שכניסה למשתמשים ול-Admin עובדת.

### 4. כשמשהו נשבר
1. לבדוק יומן השרת (טרמינל) – השגיאה המדויקת
2. קוד 42P01 = טבלה/עמודה חסרה → להריץ מיגרציה או create-admin
3. קוד 42703 = עמודה חסרה → fallback כבר אמור לתפוס

---

## מבנה Auth – נקודות שבירות

### משתמשים (User)
| רכיב | חובה? | אם חסר |
|------|-------|--------|
| users, sessions, families | כן | 500 |
| primary_family_id | לא | fallback ל-familyId |
| family_members | לא | fallback – משפחה אחת |

### Admin
| רכיב | חובה? | אם חסר |
|------|-------|--------|
| admin_users, admin_sessions | כן | 500 – להריץ create-admin |
| audit_log | לא | התעלמות |

---

*MemorAid Auth Development Guide | February 2026*
