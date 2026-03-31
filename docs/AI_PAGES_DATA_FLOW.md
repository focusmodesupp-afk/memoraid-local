# זרימת נתונים – עמודי AI

## `/admin/ai/project-analyze`

### מקורות נתונים
| נתון | API | טבלת DB |
|------|-----|---------|
| ארכיון ניתוחים | `GET /admin/ai/analyses` | `admin_ai_analyses` |
| רשימת מודלים | `GET /admin/ai/providers` | - |
| שמירת ניתוח | `POST /admin/ai/project-analyze` | `admin_ai_analyses` |
| תכנון פיצ'ר | `POST /admin/ai/feature-planning` | `admin_ai_analyses` |
| שאלה ל-AI | `POST /admin/ai/ask-question` | `admin_ai_analyses` |

**הערה:** "אין עדיין ניתוחים בארכיון" מוצג כשאין רשומות ב-`admin_ai_analyses`. כדי לראות נתונים – הרץ ניתוח פרויקט, תכנון פיצ'ר או שאלה ל-AI.

---

## `/admin/ai` (Intelligence Hub)

### מקורות נתונים
| נתון | API |
|------|-----|
| KPIs (עלות, tokens, בקשות, ניתוחים) | `GET /admin/ai/intelligence/dashboard` |
| שימוש לפי מודל | `GET /admin/ai/intelligence/usage-by-model` |
| דירוג מודלים | `GET /admin/ai/intelligence/leaderboard` |
| ניתוח לפי Admin | `GET /admin/ai/intelligence/admin-analysis` |
| קורלציה AI-פיתוח | `GET /admin/ai/intelligence/ai-dev-correlation` |
| תובנות | `GET /admin/ai/intelligence/insights` |
| ספקי AI | `GET /admin/ai/providers` |

### טבלאות DB
- `ai_usage` – שימוש ב-AI (עלות, tokens)
- `admin_ai_analyses` – ניתוחים
- `dev_tasks` – משימות פיתוח (לקורלציה)
- `ai_insights` – תובנות (אם קיימת)

---

## תיקונים שבוצעו

- **שרת:** כל ה-endpoints של AI מחזירים נתוני ברירת מחדל (אפסים/מערכים ריקים) במקום 500 כשמתקבלת שגיאה
- **לקוח AdminAI:** כל fetch עם `.catch()` – כישלון של endpoint אחד לא מפסיק את הטעינה
- **לקוח AdminProjectAnalyze:** ארכיון כבר מטפל ב-catch ומציג רשימה ריקה

## יצירת טבלאות

אם חסרות טבלאות:
```bash
npm run fix:login
npm run create:ai-tables
# או
npm run db:push
```
