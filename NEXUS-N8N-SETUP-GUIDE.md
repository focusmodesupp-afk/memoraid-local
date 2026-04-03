# NEXUS ↔ N8N — מדריך חיבור מלא

> מדריך זה מסביר כיצד לחבר את מערכת NEXUS ל-N8N לצורך מחקר WEB מתקדם.
> N8N משמש כ"מגבר מחקר" — מעשיר את ה-Web Intelligence עם GitHub, Reddit, YouTube וניתוח מתחרים.

---

## ארכיטקטורה — איך החיבור עובד

```
NEXUS (MemorAid Server)                    N8N (Workflow Automation)
========================                    ========================

Admin לוחץ "הפעל מחקר"
        │
        ▼
gatherWebIntelligenceHybrid()
        │
        ├─ בדיקה: האם N8N מוגדר?
        │  (N8N_WEBHOOK_BASE_URL קיים?)
        │
        ├─ כן → POST http://localhost:5678/webhook/full_research
        │         │
        │         │  Payload: { briefId, ideaPrompt, departments }
        │         │
        │         ▼
        │    ┌── full_research workflow ──────────────────────┐
        │    │                                                │
        │    │  מפעיל 4 workflows במקביל:                      │
        │    │  ├── /github_research  → GitHub API            │
        │    │  ├── /reddit_research  → Reddit API            │
        │    │  ├── /youtube_research → YouTube API            │
        │    │  └── /competitive_analysis → DuckDuckGo        │
        │    │                                                │
        │    │  מאחד תוצאות + Trust Scores                     │
        │    │                                                │
        │    └── מחזיר: { sources: [...], metadata: {...} }   │
        │         │
        │         ▼
        │    NEXUS מקבל sources ← processN8NResults()
        │    שומר ב-DB ← nexus_brief_web_sources
        │    SSE → "web_source_found" לכל מקור
        │
        └─ לא → Fallback: direct API
                (Perplexity, GitHub API, Reddit API, RSS)
```

---

## דרישות מקדימות

### חובה:
- N8N מותקן ורץ (localhost:5678 או שרת אחר)
- MemorAid server רץ (localhost:5001)

### אופציונלי (לשיפור תוצאות):
- GitHub Personal Access Token — לכמות בקשות גבוהה יותר
- YouTube Data API Key — לחיפוש סרטונים
- Reddit API credentials — לחיפוש מתקדם (ללא credentials עובד עם API ציבורי)

---

## שלב 1: הגדרת משתני סביבה

הוסף ל-`.env` של MemorAid:

```env
# N8N Integration
N8N_WEBHOOK_BASE_URL=http://localhost:5678/webhook
N8N_API_KEY=              # אופציונלי — אם הגדרת API key ב-N8N
N8N_TIMEOUT_MS=60000      # זמן המתנה מקסימלי (60 שניות ברירת מחדל)
```

**חשוב:** ה-URL חייב להסתיים ב-`/webhook` (ללא slash בסוף).

---

## שלב 2: ייבוא Workflows ל-N8N

### 2.1 פתח את N8N בדפדפן

```
http://localhost:5678
```

### 2.2 ייבא כל workflow

לכל אחד מ-5 הקבצים:

1. לחץ על **"+" (Create New Workflow)** בפינה הימנית העליונה
2. לחץ על **"..."** (תפריט) → **"Import from File"**
3. בחר את הקובץ מתיקיית `n8n-workflows/`
4. לחץ **"Save"**
5. לחץ **"Active"** (המתג בפינה) כדי להפעיל את ה-workflow

### סדר ייבוא מומלץ:

| סדר | קובץ | שם ב-N8N | Webhook Path |
|------|-------|----------|-------------|
| 1 | `nexus-github-research.json` | NEXUS — GitHub Research | `/webhook/github_research` |
| 2 | `nexus-reddit-research.json` | NEXUS — Reddit Research | `/webhook/reddit_research` |
| 3 | `nexus-youtube-research.json` | NEXUS — YouTube Research | `/webhook/youtube_research` |
| 4 | `nexus-competitive-analysis.json` | NEXUS — Competitive Analysis | `/webhook/competitive_analysis` |
| 5 | `nexus-full-research.json` | NEXUS — Full Research | `/webhook/full_research` |

**חשוב:** ייבא את ה-4 הראשונים לפני ה-5 (Full Research), כי הוא קורא להם.

### 2.3 הפעל את כל ה-workflows

וודא שכל 5 ה-workflows מופעלים (Active = ירוק):

```
✅ NEXUS — GitHub Research       [Active]
✅ NEXUS — Reddit Research       [Active]
✅ NEXUS — YouTube Research      [Active]
✅ NEXUS — Competitive Analysis  [Active]
✅ NEXUS — Full Research         [Active]
```

---

## שלב 3: הגדרת API Keys ב-N8N (אופציונלי)

### YouTube API Key

אם אתה רוצה חיפוש YouTube:

1. ב-N8N: לחץ על Settings → Environment Variables
2. הוסף: `YOUTUBE_API_KEY` = המפתח שלך מ-Google Cloud Console
3. או: לחץ על ה-workflow "YouTube Research" → לחץ על ה-node "YouTube API Search" → הדבק את המפתח ישירות ב-URL

### GitHub Token

GitHub עובד ללא token, אבל עם token יש 5000 בקשות/שעה במקום 60:

1. צור Personal Access Token ב-GitHub → Settings → Developer Settings → Tokens
2. ב-workflow "GitHub Research" → לחץ על "GitHub API Search" → הוסף Header: `Authorization: token YOUR_TOKEN`

---

## שלב 4: בדיקת החיבור

### בדיקה 1: סטטוס N8N מ-NEXUS

```bash
curl http://localhost:5001/api/admin/nexus/n8n-status
```

תשובה צפויה:
```json
{
  "configured": true,
  "webhookBaseUrl": "http://localhost:5678/webhook"
}
```

### בדיקה 2: טריגור ידני של workflow

```bash
curl -X POST http://localhost:5678/webhook/github_research \
  -H "Content-Type: application/json" \
  -d '{"body": {"briefId": "test-123", "ideaPrompt": "medication reminder system for elderly", "departments": ["cto", "rd"]}}'
```

תשובה צפויה:
```json
{
  "sources": [
    {
      "sourceType": "github",
      "url": "https://github.com/example/repo",
      "title": "example/repo — Medication reminder app",
      "trustScore": 75,
      "githubStars": 1200
    }
  ],
  "metadata": {
    "workflowName": "nexus-github-research",
    "totalRepos": 5
  }
}
```

### בדיקה 3: Full Research

```bash
curl -X POST http://localhost:5678/webhook/full_research \
  -H "Content-Type: application/json" \
  -d '{"body": {"briefId": "test-456", "ideaPrompt": "smart medication reminder with AI pattern analysis", "departments": ["ceo", "cto", "rd", "design"]}}'
```

תשובה צפויה: JSON עם sources מ-GitHub, Reddit, YouTube ו-Competitive Analysis.

### בדיקה 4: מחקר מלא מ-NEXUS

1. פתח את NEXUS: `http://localhost:5173/admin/nexus`
2. צור ניירת חדשה: "מערכת תזכורות תרופות חכמה"
3. בחר מחלקות ולחץ "הפעל מחקר"
4. צפה ב-SSE streaming — אם N8N עובד, תראה sources מ-N8N
5. ב-N8N: לחץ על "Executions" כדי לראות שה-workflows רצו

---

## פתרון בעיות

### בעיה: N8N לא מקבל webhooks

**סימפטום:** NEXUS עובר ל-fallback (direct API), אין executions ב-N8N

**פתרון:**
1. וודא ש-N8N רץ: `curl http://localhost:5678/healthz`
2. וודא שה-workflows מופעלים (Active = ירוק)
3. בדוק את ה-URL ב-.env: `N8N_WEBHOOK_BASE_URL=http://localhost:5678/webhook`
4. בדוק שאין חומת אש חוסמת את פורט 5678

### בעיה: GitHub API מחזיר 403

**סימפטום:** "API rate limit exceeded"

**פתרון:** הוסף GitHub Personal Access Token ל-workflow (5000 בקשות/שעה במקום 60)

### בעיה: YouTube workflow לא מחזיר תוצאות

**סימפטום:** sources ריק ל-YouTube

**פתרון:** YouTube API דורש API Key. הגדר `YOUTUBE_API_KEY` ב-N8N או ישירות ב-workflow.

### בעיה: Reddit מחזיר 429

**סימפטום:** "Too Many Requests"

**פתרון:** Reddit מגביל ל-60 בקשות/דקה. ה-workflow כבר כולל retry logic עם המתנה. אם הבעיה נמשכת, הפחת את מספר ה-subreddits ב-workflow.

### בעיה: Timeout (60 שניות)

**סימפטום:** NEXUS עובר ל-fallback אחרי 60 שניות

**פתרון:** הגדל `N8N_TIMEOUT_MS` ב-.env (לדוגמה: 120000 ל-2 דקות)

---

## מה כל Workflow עושה

### GitHub Research
- **קלט:** רעיון מחקר
- **פעולה:** חיפוש repositories ב-GitHub API, מיון לפי כוכבים
- **Trust Score:** `log10(stars+1)*20 + log10(contributors+1)*10`
- **פלט:** 5 repositories עם שם, URL, כוכבים, שפה, רישיון

### Reddit Research
- **קלט:** רעיון + מחלקות נבחרות
- **פעולה:** מיפוי מחלקות ל-subreddits, חיפוש בכל subreddit
- **Trust Score:** `log10(upvotes+1)*15 + upvote_ratio bonus`
- **פלט:** 10 פוסטים עם כותרת, URL, subreddit, ציון

### YouTube Research
- **קלט:** רעיון מחקר
- **פעולה:** חיפוש tutorials ומדריכים ב-YouTube Data API
- **Trust Score:** 60 (קבוע — תוכן וידאו פחות מדויק מקוד)
- **פלט:** 5 סרטונים עם כותרת, URL, ערוץ, תאריך
- **דורש:** YouTube Data API Key

### Competitive Analysis
- **קלט:** רעיון מחקר
- **פעולה:** חיפוש מתחרים וחלופות ב-DuckDuckGo (ללא API key)
- **Trust Score:** 45-55 (תוצאות חיפוש כלליות)
- **פלט:** 8 מקורות עם כותרת, URL, תיאור

### Full Research (Orchestrator)
- **קלט:** רעיון + מחלקות
- **פעולה:** מפעיל את 4 ה-workflows למעלה **במקביל**
- **פלט:** כל המקורות ממוזגים, ממוינים לפי Trust Score, ללא כפילויות
- **זה ה-workflow שNEXUS קורא לו**

---

## Data Flow מלא

```
NEXUS Server (.env: N8N_WEBHOOK_BASE_URL=http://localhost:5678/webhook)
    │
    ├── n8nBridge.ts
    │   ├── isN8NConfigured() → בודק אם URL קיים
    │   ├── gatherWebIntelligenceHybrid() → שולח POST ל-full_research
    │   └── processN8NResults() → מנקה ומאמת תוצאות
    │
    ▼
N8N Server (localhost:5678)
    │
    ├── /webhook/full_research → מפעיל 4 workflows במקביל
    │   ├── /webhook/github_research → GitHub API → Trust Scores
    │   ├── /webhook/reddit_research → Reddit API → Trust Scores
    │   ├── /webhook/youtube_research → YouTube API → Trust Scores
    │   └── /webhook/competitive_analysis → DuckDuckGo → Trust Scores
    │
    ├── Merge All Results → מאחד, ממיין, מסיר כפילויות
    │
    └── מחזיר JSON → { sources: [...], metadata: {...} }
    │
    ▼
NEXUS Server
    │
    ├── processN8NResults() → מאמת מקורות
    ├── DB: INSERT nexus_brief_web_sources
    ├── SSE: "web_source_found" → Admin רואה בזמן אמת
    │
    └── מקורות מוזרקים ל-prompt של כל מחלקה
```

---

## FAQ

**ש: מה קורה אם N8N כבוי?**
ת: NEXUS עובר אוטומטית ל-fallback — מחקר ישיר דרך Perplexity, GitHub API, Reddit API ו-RSS. אין הפסקה בשירות.

**ש: האם N8N חובה?**
ת: לא. N8N הוא אופציונלי. בלי N8N, NEXUS עדיין עושה מחקר WEB דרך ה-APIs הישירים. N8N מוסיף YouTube וניתוח מתחרים.

**ש: כמה זה עולה?**
ת: N8N בגרסת community הוא חינם (self-hosted). GitHub API חינם (עד 60 בקשות/שעה ללא token). Reddit חינם. YouTube דורש API key (חינם עד 10,000 בקשות/יום). DuckDuckGo חינם.

**ש: אפשר להוסיף עוד מקורות?**
ת: כן. תוכל לשכפל workflow קיים ולהתאים אותו למקור חדש (למשל: Stack Overflow, npm registry, arxiv). כל workflow שמחזיר `{ sources: [...] }` בפורמט הנכון יעבוד.

---

> מדריך זה חלק מסדרת התיעוד של NEXUS. ראה: NEXUS-MASTER-FIX-PLAN.md לתוכנית התיקון המלאה.
