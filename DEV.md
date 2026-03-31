# פיתוח מקומי (Local Development)

## הפעלת השרת

יש להריץ **גם** את ה-Client וגם את ה-Server כדי שהאפליקציה תעבוד.

```bash
npm run dev
```

פקודה זו מפעילה:
- **Client** (Vite) – `http://localhost:5173`
- **Server** (Express API) – `http://localhost:3001`

הקריאות ל-`/api/*` מהדפדפן מנותבות דרך Vite proxy ל-Server.

### אם מופיעה "Failed to fetch" או ERR_CONNECTION_REFUSED

בדוק ש-**שני** התהליכים רצים. אם הרצת רק `npm run dev:client`, ה-API לא יהיה זמין.

הרץ מחדש:
```bash
npm run dev
```

ולדאוג שרואים בשני חלונות הטרמינל:
- `VITE v... ready in ...`
- `Server running at http://localhost:3001`
