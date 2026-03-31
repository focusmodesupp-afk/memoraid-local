# זהות הפרויקט — MemorAid (Healthcare SaaS)

## ⚠️ הכרזת זהות חשובה
**שם הפרויקט "memoraid-local" אינו קשור ל-memoraid.com (אתר תחרויות זיכרון Mental Sports).**
כל מחקר שנעשה במסגרת Nexus חייב להתייחס לפרויקט המתואר כאן בלבד.

---

## מה הפרויקט?
**MemorAid** היא פלטפורמת SaaS לניהול טיפול דיגיטלי בתחום **בריאות הנפש והזיקנה** (Digital Health / Senior Care).

### קהל יעד
- **מטפלים משפחתיים** (בנות/בני זוג, ילדים בוגרים) של חולים עם צרכי טיפול מורכבים
- **חולים** עצמם (בעיקר קשישים, חולי אלצהיימר, דמנציה, ניידות מוגבלת)
- **אנשי מקצוע רפואיים** — רופאים, אחיות, עובדים סוציאליים
- **ספקי שירות** — מרפאות, בתי אבות, מוסדות שיקום

### ערך מרכזי
MemorAid מרכזת את כל המידע הרפואי, המשימות, הפגישות, התרופות, המסמכים וההתראות של חולה אחד — ונותנת לכל בני המשפחה ולצוות הרפואי גישה מתואמת ומאובטחת.

### פיצ'רים עיקריים קיימים
- **ניהול משימות** — Kanban board, assignments, סטטוסים
- **יומן פגישות ורופאים** — תיאום, תזכורות, מעקב
- **ניהול תרופות** — מינון, תזמון, מעקב נטילה
- **תיעוד רפואי** — העלאת מסמכים, תוצאות בדיקות, הפניות
- **מדדים גופניים** — לחץ דם, סוכר, משקל, הידרציה
- **קשר רב-משתמשים** — Family hierarchy, permissions, roles
- **AI Assistant** — עוזר AI לשאלות בריאות ותמיכה
- **פאנל אדמין** — ניהול משתמשים, billing, Nexus

### מודל עסקי
SaaS: $15/user/month, ממוצע 25 users/ארגון → $375/חודש/ארגון. Break-even חודש 14.

---

## מה הפרויקט **לא**
| מה זה נשמע כמו | מה זה באמת לא |
|----------------|----------------|
| memoraid.com | אתר תחרויות זיכרון/Mental Sports — לא קשור |
| Mnemosyne / Anki | כרטיסיות לימוד / Spaced Repetition — לא קשור |
| Duolingo / Lumosity | אפליקציות אימון מוח — לא קשור |
| Memoriad World Championships | תחרות זיכרון בינלאומית — לא קשור |
| Memory Palace apps | טכניקות זיכרון — לא קשור |

---

## טכנולוגיות
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon serverless) + Drizzle ORM
- **AI**: Anthropic Claude (Sonnet/Haiku), Google Gemini, Perplexity
- **Auth**: Custom JWT sessions
- **Payments**: Stripe
- **Email**: Nodemailer
- **Deployment**: Render / cloud

---

## תחומי מחקר רלוונטיים לNexus
כשמחקר Nexus מבוצע על פרויקט זה, יש להתמקד ב:
- Digital Health / HealthTech SaaS
- Caregiver tools, patient management platforms
- Senior care technology, eldercare software
- Medical records management, care coordination
- HIPAA compliance, medical data privacy (GDPR)
- Family caregiving apps (competitor space: Carely, CareZone, CaringBridge)
