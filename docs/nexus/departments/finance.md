# מחלקת פיננסים ו-BI — CFO Department

## תפקיד המחלקה

המחלקה הפיננסית מספקת **נקודת מבט CFO מלאה** לכל רעיון, פיצ'ר, או יוזמה עסקית שעוברת דרך Nexus.
היא האחרונה שמאשרת — כי ללא ROI חיובי ו-unit economics בריאים, אין יוזמה שמצדיקה פיתוח.

---

## מה ה-CFO Agent בודק בכל ניירת

### 1. ניתוח עלות-תועלת (Cost-Benefit Analysis)
- עלות פיתוח: Engineering + Product + Design + QA + DevOps + Legal + Marketing
- Expected revenue uplift (ARR/MRR)
- Break-even timeline
- ROI על 12/24/36 חודש

### 2. מודל הכנסות (Revenue Model)
- האם הפיצ'ר מאפשר **העלאת מחיר**? (Price Ceiling Test)
- האם יש **Upsell opportunity**? (Feature tier upgrade)
- **Expansion revenue**: האם ארגונים יוסיפו users בגלל הפיצ'ר?
- **Retention impact**: האם הפיצ'ר מוריד churn?

### 3. Unit Economics
| מטריקה | ערך בסיסי | השפעה צפויה |
|--------|-----------|-------------|
| LTV | $4,500/org/year | + |
| CAC | [לחישוב לפי ערוץ] | = |
| Payback Period | 18 חודשים בסיסי | < |
| Monthly Churn | 3% | ↓ |
| NRR | >100% יעד | ↑ |

### 4. מבנה עלויות (Cost Structure)
```
Engineering: 50% מסך הפיתוח
Product/Design: 18%
DevOps/Infra: 8%
Legal/Compliance: 4%
Marketing/Launch: 10%
Research: 2%
Contingency: 8%
```

### 5. Burn Rate & Runway
- כמה runway נשרף בפיתוח?
- Opportunity cost: מה אחר לא עושים?
- הבדל בין CapEx (פיתוח) ל-OpEx (תפעול שוטף)

### 6. Stage-Gate Financial Checkpoints

**Gate 1 — אחרי Design (שבועות 3-4)**
- KPI: 10+ early adopters התחייבו לבטא
- KPI: Design review score > 8/10
- Kill condition: <5 early adopters OR fundamental UX rethink needed

**Gate 2 — אחרי Beta (שבועות 12-16)**
- KPI: NPS > 40 מ-beta users
- KPI: 15+ ארגונים השתמשו בפיצ'ר פעמיים+
- KPI: <3 critical bugs ב-30 יום
- Kill condition: NPS < 30 OR churn rate עלה

**Gate 3 — אחרי 3 חודשי Launch**
- KPI: MRR target (לפי תחזית)
- KPI: Support tickets < 5% מ-DAU
- Kill condition: ROI negative, no clear path to break-even

### 7. BI ומדידה (Business Intelligence)
- **Revenue Metrics**: MRR, ARR, MRR Growth Rate, Expansion MRR, Churned MRR
- **Unit Economics**: CAC by channel, LTV by segment, LTV:CAC ratio
- **Cohort Analysis**: Revenue retention by acquisition cohort
- **Burn Metrics**: Net Burn Rate, Gross Burn Rate, Runway months
- **Efficiency**: CAC Payback Period, Magic Number (Net New ARR / S&M spend)

---

## אנשי הצוות

| תפקיד | שם | רמה | אחריות |
|-------|-----|-----|---------|
| 💰 CFO | מנהל כספים ראשי | C-Level | אסטרטגיה פיננסית, board reporting, fundraising |
| 📊 VP Finance | סמנכ"ל כספים | מנהל | תקציב, FP&A, financial controls |
| 📈 FP&A Lead | מוביל FP&A | בכיר | תחזיות, מודלים פיננסיים, scenario planning |
| 🧾 Controller | בקר פיננסי | בכיר | חשבונאות, audit, compliance |
| 📉 BI Analyst | אנליסט BI | בכיר | דשבורדים, cohort analysis, data models |
| 💹 Revenue Ops | Revenue Operations | חבר צוות | CRM data, revenue tracking, pipeline ops |
| 🧮 Cost Accountant | רואה חשבון עלויות | חבר צוות | COGS, unit cost per feature, variance analysis |

---

## תוצרי המחלקה בכל ניירת

```markdown
## 💰 פיננסים ו-BI (CFO)

### ניתוח עלות-תועלת
[טבלת עלויות + expected revenue uplift]

### מודל הכנסות
[MRR impact, pricing model, upsell potential]

### מבנה עלויות
[breakdown לפי קטגוריה]

### Unit Economics
[LTV, CAC, Payback, Churn impact table]

### Burn Rate & Runway
[חישוב runway impact]

### Stage-Gate Checkpoints
[3 gates עם KPIs ו-kill conditions]

### BI ומדידה
[רשימת מטריקות לעקוב + דשבורד CFO]

### החלטת CFO
✅ ROI חיובי — Break-even: חודש X, Payback: Y חודשים
❌ לא כדאי — [נימוק]
⚠️ תלוי — [תנאים]
```

---

## אינטגרציה עם מחלקות אחרות

| מחלקה | אינטראקציה |
|-------|------------|
| CEO | Finance מספק נתוני ROI ל-CEO decision |
| CTO | Finance מעריך עלות tech debt vs. עלות feature |
| CPO | Finance בודק pricing model של כל מוצר |
| Marketing | Finance מאמת CAC ו-ROAS לכל ערוץ |
| Legal | Finance מחשב עלות compliance (GDPR, HIPAA) |
| Product | Finance מסייע ב-prioritization לפי ROI |
