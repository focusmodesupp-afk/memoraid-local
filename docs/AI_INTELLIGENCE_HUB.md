# AI Intelligence Hub – תיעוד

## סקירה

עמוד ה-AI ב-Admin (`/admin/ai`) שודרג ל-**Intelligence Hub** – מרכז בינה מלאכותית המציג:

- **KPIs** – עלות, tokens, בקשות, ניתוחים
- **גרף עוגה** – חלוקת עלויות לפי מודל
- **גרף בר** – שימוש ב-tokens לפי מודל
- **Leaderboard** – דירוג מודלים לפי ציון מורכב
- **ניתוח לפי Admin** – סטטיסטיקות לכל Admin
- **קורלציה AI-פיתוח** – ניתוחים מול tasks שנוצרו מ-AI
- **תובנות אוטומטיות** – המלצות מבוססות נתונים
- **ייצוא CSV** – Super Admin בלבד

## הרצת Migration

לפני השימוש, להריץ:

```bash
npm run migrate:ai-intelligence
```

או להתקין את ה-packages:

```bash
npm install
```

## API Endpoints

| Endpoint | תיאור |
|----------|--------|
| `GET /admin/ai/intelligence/dashboard` | KPIs כללים |
| `GET /admin/ai/intelligence/usage-by-model` | שימוש לפי מודל (לצורכי גרפים) |
| `GET /admin/ai/intelligence/costs` | עלויות מפורטות |
| `GET /admin/ai/intelligence/leaderboard` | דירוג מודלים |
| `GET /admin/ai/intelligence/admin-analysis` | ניתוח לפי Admin |
| `GET /admin/ai/intelligence/ai-dev-correlation` | קורלציה AI-פיתוח |
| `GET /admin/ai/intelligence/insights` | תובנות אוטומטיות |
| `GET /admin/ai/intelligence/export` | ייצוא CSV (Super Admin) |

כל ה-endpoints תומכים בפרמטרים: `days`, `dateFrom`, `dateTo`.

## הרשאות

- **Admin** – צפייה ב-KPIs, גרפים, leaderboard, נתוני עצמו בלבד
- **Super Admin** – צפייה בכל Admin, ייצוא CSV

## Rate Limiting

- **GET (נתונים)** – ללא rate limit
- **POST (קריאות AI)** – 10 בקשות לדקה ל-project-analyze, feature-planning, ask-question, upload-attachment
