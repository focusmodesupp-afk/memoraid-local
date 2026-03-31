---
name: Staging Deployment Guide
overview: מדריך להעלאת MemorAId לסביבת Staging על Railway או Render, כולל שינויים נדרשים בקוד והגדרות הדרושות.
todos: []
isProject: false
---

# מדריך Staging – Railway / Render

## ארכיטקטורה

הפרויקט בנוי כ־monorepo:

- **Client** (Vite + React) – בונה ל־`dist/`
- **Server** (Express) – API תחת `/api`, משתמש ב־PostgreSQL
- **shared** – סכמות Drizzle

הלקוח משתמש ב־`/api` יחסית ([client/src/lib/api.ts](client/src/lib/api.ts)), ולכן צריך **שרת אחד** שמגיש גם סטטי וגם API – כך שהכל באותו origin.

```mermaid
flowchart LR
    subgraph SingleService [שרת יחיד]
        Express[Express Server]
        Static[Static Files dist/]
        API[API /api/*]
    end
    Express --> Static
    Express --> API
    Browser --> Express
```



---

## בחירת פלטפורמה


| פלטפורמה    | יתרון                              | חיסרון                 |
| ----------- | ---------------------------------- | ---------------------- |
| **Railway** | חינם $5/חודש, Postgres מובנה, פשוט | Free tier מוגבל        |
| **Render**  | Free tier, Postgres חינם           | Cold starts, איטי יותר |


**המלצה לשלב Staging:** Railway (מהיר יותר) או Render (אם מעדיפים חינם מלא).

---

## שלב 1: מסד נתונים (PostgreSQL בענן)

צריך Postgres. אפשרויות:

1. **Neon** (חינם): [neon.tech](https://neon.tech) – יוצרים DB ומעתיקים את `DATABASE_URL`
2. **Supabase** (חינם): [supabase.com](https://supabase.com) – Projects → Settings → Database → Connection string
3. **Railway Postgres**: ב־Railway – New → Database → PostgreSQL
4. **Render Postgres**: ב־Render – New → PostgreSQL

**להריץ מיגרציות מקומית לפני deploy:**

```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require" node scripts/push-db.mjs
```

או עם Drizzle:

```bash
DATABASE_URL="..." npx drizzle-kit push
```

---

## שלב 2: שינויים נדרשים בקוד

### 2.1 הגשת קבצים סטטיים ב־Express

כרגע אין הגשת `dist/`. יש להוסיף ב־[server/src/index.ts](server/src/index.ts) לפני ה־404:

```ts
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// אחרי app.use('/api', routes):
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
```

(הסדר חשוב: API לפני SPA fallback.)

### 2.2 Secure cookie בפרודקשן

ב־[server/src/routes.ts](server/src/routes.ts) בפונקציית `createSession` (בערך שורה 70), להוסיף `Secure` כש־`NODE_ENV === 'production'`:

```ts
const cookieParts = [
  // ... existing
];
if (process.env.NODE_ENV === 'production') {
  cookieParts.push('Secure');
}
res.setHeader('Set-Cookie', cookieParts.join('; '));
```

### 2.3 סקריפט Start ב־package.json

לוודא שיש `start`:

```json
"scripts": {
  "start": "node server/dist/index.js"
}
```

צריך גם `server/tsconfig.json` עם `outDir: "dist"` (או להתאים את הנתיב).

---

## שלב 3: משתני סביבה (Environment Variables)

רשימה לשלב ב־Railway/Render:


| משתנה                  | חובה         | תיאור                                                           |
| ---------------------- | ------------ | --------------------------------------------------------------- |
| `DATABASE_URL`         | כן           | connection string ל־PostgreSQL                                  |
| `APP_BASE_URL`         | כן           | כתובת ה־Staging, למשל `https://memoraid-staging.up.railway.app` |
| `NODE_ENV`             | כן           | `production`                                                    |
| `STRIPE_SECRET_KEY`    | לא (staging) | אם יש תשלומים                                                   |
| `STRIPE_PRICE_PREMIUM` | לא           | אם יש תשלומים                                                   |


---

## שלב 4: Railway

1. הרשמה: [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo** (חיבור ל־repo)
3. **New** → **Database** → **PostgreSQL** – ליצור DB
4. **Variables** – לגרור `DATABASE_URL` מה־Postgres ל־Service
5. להוסיף: `APP_BASE_URL` (ה־URL שיקבל השירות), `NODE_ENV=production`
6. **Settings**:
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start` (או `node server/dist/index.js`)
  - Root Directory: שורש הפרויקט
7. **Deploy** – לחכות לבנייה והרצה
8. **Settings** → **Generate Domain** – לקבל URL (למשל `xxx.up.railway.app`)
9. לעדכן `APP_BASE_URL` ל־URL שנוצר
10. להריץ מיגרציות על ה־DB (מחשב מקומי עם `DATABASE_URL` של Railway):

```bash
DATABASE_URL="postgresql://..." node scripts/push-db.mjs
```

---

## שלב 5: Render

1. הרשמה: [render.com](https://render.com)
2. **New** → **Web Service** – חיבור ל־GitHub
3. **New** → **PostgreSQL** – יצירת DB
4. הגדרות ה־Web Service:
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
  - **Environment**:
    - `DATABASE_URL` – מ־Postgres (לחיצה על "Connect" ליד ה־DB)
    - `APP_BASE_URL` – `https://<your-service-name>.onrender.com`
    - `NODE_ENV` = `production`
5. **Create Web Service**
6. להריץ מיגרציות עם ה־`DATABASE_URL` מה־DB של Render (מהמחשב המקומי).

---

## שלב 6: Vercel (אם רוצים frontend נפרד)

Vercel מתאים ל־SPA, אבל ה־API הוא Express. אפשרות:

- **Frontend ב־Vercel, API ב־Railway/Render** – דורש:
  - עדכון [client/src/lib/api.ts](client/src/lib/api.ts) לתמוך ב־`VITE_API_URL` כשהוא מוגדר
  - הגדרת CORS בצד ה־API (כבר קיים)
  - טיפול ב־cookies cross-origin – `SameSite=None; Secure`

**לשלב Staging פשוט – עדיף deployment יחיד (Express + סטטי) ב־Railway או Render.**

---

## סיכום צעדים

1. יצירת PostgreSQL בענן (Neon / Supabase / Railway / Render)
2. הרצת מיגרציות: `DATABASE_URL="..." node scripts/push-db.mjs`
3. עדכון קוד: הגשת סטטי, Secure cookie, `start` script
4. פריסה ב־Railway או Render לפי השלבים למעלה
5. הגדרת משתני סביבה
6. בדיקה ב־URL שנוצר

---

## הערות

- **SSL/HTTPS**: Railway ו־Render מספקים HTTPS אוטומטית
- **Cold starts** (Render): בפעם הראשונה אחרי זמן ללא גישה, העומס יכול לקחת 30–60 שניות
- **Stripe**: אם לא מוגדר, דף Premium לא יעבוד; לשאר האפליקציה זה בסדר

