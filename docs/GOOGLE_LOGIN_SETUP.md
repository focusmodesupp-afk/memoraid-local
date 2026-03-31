# התחברות עם Google – מדריך חיבורים

אתה מבצע רק את החיבורים ב-Google Cloud. הקוד מוכן.

---

## 0. בדיקת ה-redirect URI (לפני שינוי ב-Google)

**חשוב:** אחרי כל שינוי ב-.env – הפעל מחדש את השרת.

לפני שמשנים משהו ב-Google Cloud:

1. הפעל את השרת (אם שינית .env – הפעל מחדש)
2. גלוש ל: `http://localhost:5173/api/auth/google/check`
3. תופיע הודעה עם `redirectUri` – **העתק את הערך בדיוק** (ללא גרשיים) והוסף אותו ב-Google Cloud

---

## 1. Google Cloud Console

### Credentials → עריכת ה-OAuth Client

1. גש ל-[console.cloud.google.com](https://console.cloud.google.com) → פרויקט MemorAid  
2. **APIs & Services** → **Credentials**  
3. לחץ **Edit** על "MemorAid Google Calendareb"

### Authorised JavaScript origins

הוסף (אם השדה ריק):

```
http://localhost:5173
```

**לא** להוסיף `/api/...` – רק דומיין ופורט.

### Authorised redirect URIs

הוסף את שני ה-URIs הבאים (לחיצה על **Add URI** לכל אחד):

```
http://localhost:5173/api/auth/google/callback
http://localhost:5173/api/integrations/google/oauth/callback
```

### שמור

לחץ **Save**.

---

## 2. העתקת הערכים ל-.env

מאותו מסך – העתק:

- **Client ID** → `GOOGLE_CALENDAR_CLIENT_ID`
- **Client secret** (Show → העתק) → `GOOGLE_CALENDAR_CLIENT_SECRET`

ב-.env:

```
GOOGLE_CALENDAR_CLIENT_ID=מספרים-מחרוזת.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-מחרוזת
APP_BASE_URL=http://localhost:5173
```

---

## 3. הרצה ובדיקה

1. הפעל שרת + אפליקציה  
2. גלוש ל-`http://localhost:5173/login`  
3. לחץ **"כניסה מהירה עם Gmail"**  
4. אם הכל מוגדר נכון – תגיע ל-Google ותחזור למערכת מחובר
