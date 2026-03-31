# MemorAId — Financial Model & Unit Economics

## מודל הכנסות בסיסי

| פרמטר | ערך |
|-------|-----|
| מחיר | $15/user/month |
| ממוצע users לארגון | 25 |
| MRR לארגון | $375/org/month |
| ARR לארגון | $4,500/org/year |
| המרה trial→paid | 15% |
| Monthly Churn Rate | 3% |
| Annual Churn Rate | ~31% (compound) |

---

## תחזית הכנסות — שנה 1

| חודש | ארגונים חדשים | סה"כ ארגונים | MRR | ARR Run Rate |
|------|-------------|------------|-----|-------------|
| 1 | 5 | 5 | $1,875 | $22,500 |
| 3 | 15 | 44 | $16,500 | $198,000 |
| 6 | 30 | 126 | $47,250 | $567,000 |
| 9 | 50 | 218 | $81,750 | $981,000 |
| 12 | 60 | 240 | $90,000 | $1,080,000 |
| **14** | **65** | **~255** | **~$95,625** | **Break-even** |

---

## עלויות פיתוח — שנה 1

| קטגוריה | עלות שנתית |
|---------|-----------|
| Engineering (4 engineers) | $480,000 |
| Product Management | $120,000 |
| Design | $80,000 |
| QA | $60,000 |
| DevOps/Infrastructure | $48,000 |
| Legal/Compliance | $15,000 |
| Marketing/Launch | $30,000 |
| Research | $8,000 |
| Hiring/Recruitment | $25,000 |
| **Contingency (10%)** | **$86,600** |
| **סה"כ שנה 1** | **$952,600** |

---

## Unit Economics מפורטות

### LTV (Lifetime Value)
```
MRR per org = $375
Monthly Churn = 3% → Average lifetime = 1/0.03 = 33.3 months
LTV = $375 × 33.3 = ~$12,500 per org
```

### CAC (Customer Acquisition Cost)
```
Marketing Budget שנה 1: $30,000
Expected new orgs שנה 1: 240
CAC = $30,000 / 240 × (1/0.15) = ~$833 per org
(מחולק ב-15% conversion rate)
```

### LTV:CAC Ratio
```
LTV:CAC = $12,500 / $833 = 15:1
(יעד SaaS: >3:1 | מצוין: >5:1 | MemorAId: 15:1 ✅)
```

### Payback Period
```
Monthly Gross Margin per org: ~$300 (80% margin)
CAC: $833
Payback = $833 / $300 = ~2.8 months ✅
```

### Magic Number
```
Magic Number = (Net New ARR Q / S&M Spend Q-1)
יעד: > 0.75 | מצוין: > 1.0
```

---

## Sensitivity Analysis

| תרחיש | Conversion Rate | Churn | Break-even | ARR שנה 2 |
|-------|----------------|-------|-----------|---------|
| שמרני | 10% | 5% | חודש 18 | $650K |
| **בסיסי** | **15%** | **3%** | **חודש 14** | **$1.2M** |
| אופטימי | 20% | 2% | חודש 10 | $2.1M |

---

## Stage-Gate Financial KPIs

### Gate 1 — אחרי Design (שבוע 4)
- [ ] 10+ early adopters committed to beta
- [ ] Design score > 8/10 (UX validation)
- **Kill condition**: < 5 early adopters

### Gate 2 — אחרי Beta (שבוע 16)
- [ ] NPS > 40 from beta users (n≥20)
- [ ] 15+ orgs used feature 2+ times
- [ ] < 3 critical bugs in 30 days
- [ ] Beta→Paid conversion: > 30%
- **Kill condition**: NPS < 30 OR churn spiked > 5%

### Gate 3 — 3 חודשים אחרי Launch
- [ ] MRR from feature: > $15K (40+ orgs using it)
- [ ] Support tickets from feature: < 5% of DAU
- [ ] NRR > 105% (expansion > churn)
- **Kill condition**: ROI < 0, no path to break-even in 6 months

---

## ROI Calculation

```
Year 1 Revenue: $1,080,000 ARR Run Rate
Year 1 Costs:   $952,600
Year 1 Net:     $127,400

Year 2 Revenue: $2,160,000 (2x growth)
Year 2 Costs:   $700,000 (team scaling)
Year 2 Net:     $1,460,000

2-Year ROI = ($127,400 + $1,460,000) / $952,600 = 166.7%
```

---

## BI Dashboard — CFO Metrics to Track

### Revenue Dashboard
- [ ] MRR & ARR (daily)
- [ ] Net New MRR = New MRR + Expansion MRR - Churned MRR
- [ ] MRR Growth Rate (MoM)
- [ ] Revenue by Plan/Tier

### Cohort Analysis
- [ ] Revenue Retention by Cohort (Month 1, 3, 6, 12)
- [ ] Expansion Rate by Cohort
- [ ] Churn by Acquisition Channel

### Efficiency Metrics
- [ ] CAC by Channel (Organic / Paid / Referral)
- [ ] LTV:CAC by Segment
- [ ] CAC Payback Period
- [ ] Burn Multiple = Net Burn / Net New ARR

### Operational
- [ ] Gross Margin % (target: >75%)
- [ ] Net Burn Rate (monthly)
- [ ] Runway (months at current burn)
- [ ] COGS per customer
