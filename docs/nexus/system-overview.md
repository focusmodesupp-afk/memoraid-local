# Nexus Virtual Software House — System Overview

## מה זה Nexus?

Nexus הוא מערכת AI רב-מחלקתית המריצה **10 agents מקבילים** לניתוח עמוק של כל רעיון, פיצ'ר, או יוזמה עסקית.
כל agent מייצג מחלקה בחברה עם נקודת מבט ייחודית, ומספק תוצר Markdown מובנה.

---

## זרימת עבודה — Nexus Brief Pipeline

```
1. רעיון/יוזמה (ideaPrompt)
         ↓
2. סריקת קוד הפרויקט (projectDataGatherer)
   → מבנה, DB schema, API routes, components
         ↓
3. Web Intelligence (nexusWebIntelligence)
   → GitHub repos, Reddit discussions, RSS/YouTube feeds, Perplexity
   → Trust Score per source
         ↓
4. 10 Agents מקבילים (SSE streaming)
   → כל agent מקבל: codebase context + web intelligence + ideaPrompt
   → כל agent מחזיר: Markdown מובנה לפי outputSections שלו
         ↓
5. הרכבת ניירת (assembleBrief)
   → מסמך Markdown מלא עם כל ממצאי המחלקות
         ↓
6. סקירה ואישור (Admin Review)
   → Edit / Approve / Reject
         ↓
7. חילוץ משימות (Task Extraction)
   → Sprint Planning → Kanban
         ↓
8. יצירת מסמכי אפיון (Document Generation)
   → PRD, ERD, Blueprint, CI/CD, Design, Security, Marketing, Legal, Finance
```

---

## 10 המחלקות

| מחלקה | ID | תפקיד עיקרי |
|-------|-----|-------------|
| 👔 מנכ"ל | ceo | כדאיות עסקית, שוק, תחרות |
| ⚙️ CTO | cto | ארכיטקטורה, tech stack, integration |
| 🎯 CPO | cpo | אסטרטגיית מוצר, UX, MoSCoW |
| 🔬 R&D | rd | ספריות, repos, POC, AI/ML |
| 🎨 Design | design | Design System, UX, accessibility |
| 📋 Product | product | User Stories, Sprint, Backlog |
| 🔒 Security | security | OWASP, Threat Model, GDPR, HIPAA |
| ⚖️ Legal | legal | רישיונות, GDPR, סיכונים משפטיים |
| 📣 Marketing | marketing | GTM, SEO, positioning, growth |
| 💰 Finance/CFO | finance | ROI, עלות-תועלת, unit economics, Stage-Gate |

---

## תוצרי הניירת

כל ניירת מפיקה:
1. **ממצאי מחלקות** — ניתוח Markdown לפי outputSections של כל agent
2. **מקורות מידע** — GitHub repos + Reddit + RSS + Perplexity עם Trust Score
3. **עלות & Tokens** — עלות AI לכל agent + סה"כ
4. **משימות מחולצות** — לאחר אישור → Sprint → Kanban
5. **מסמכי אפיון** — PRD, ERD, Blueprint, CI/CD, Design, Security, Marketing, Legal, Finance Report

---

## מודל ה-Trust Score

```
Trust Score = log10(githubStars+1)*20 + log10(redditScore+1)*15 – (contributors>15 ? 5 : 0)
Max: 100 | Perplexity baseline: 75 | RSS baseline: 40-50
```

---

## DB Tables מרכזיות

- `nexus_briefs` — הניירות ומצבן (draft/researching/review/approved/done)
- `nexus_brief_departments` — תוצאות כל agent לכל ניירת
- `nexus_brief_web_sources` — מקורות שנמצאו לכל ניירת
- `nexus_extracted_tasks` — משימות שחולצו מהניירת
- `nexus_skills` — Skills להצמדה למשימות
- `nexus_rules` — Rules engine (triggers → actions)
- `nexus_templates` — תבניות מחקר מוגדרות מראש
- `nexus_dept_settings` — overrides לכל מחלקה (system prompt, model)
- `nexus_dept_team_members` — אנשי צוות לכל מחלקה
- `nexus_web_feeds` — מקורות RSS/YouTube/Reddit/GitHub מנוהלים
