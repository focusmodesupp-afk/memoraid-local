# Budget Model & Stage-Gate Framework

## עלות פיצ'ר ממוצע (Feature Development Cost)

### Engineering Resources
```
4 Engineers × 26 weeks × $92/hr × 40hrs = ~$384,000
בניכוי ימי overhead: ~26 שבועות נטו = $384,000
```

### עלות לפי גודל פיצ'ר

| גודל | שבועות | עלות Engineering | עלות כוללת |
|------|--------|-----------------|-----------|
| S (Small) | 2-4 | $30-60K | ~$50-80K |
| M (Medium) | 6-10 | $90-150K | ~$120-200K |
| L (Large) | 12-20 | $180-300K | ~$250-400K |
| XL (Epic) | 24+ | $350K+ | $500K+ |

---

## תקציב שנה 1 — מלא

### Headcount (Salaries + Benefits)

| תפקיד | כמות | עלות שנתית | סה"כ |
|-------|------|-----------|------|
| Senior Backend Engineer | 2 | $130,000 | $260,000 |
| Mid Frontend Engineer | 1 | $105,000 | $105,000 |
| Full-Stack Engineer | 1 | $115,000 | $115,000 |
| Product Manager | 1 | $120,000 | $120,000 |
| UX Designer | 1 | $80,000 | $80,000 |
| QA Engineer | 1 | $60,000 | $60,000 |
| DevOps Engineer (part) | 0.5 | $96,000 | $48,000 |
| **Headcount Total** | | | **$788,000** |

### Non-Headcount

| קטגוריה | עלות שנתית |
|---------|-----------|
| Legal & IP (GDPR, ToS, Privacy) | $15,000 |
| Marketing (Content, Ads, Events) | $30,000 |
| Infrastructure (Cloud, DB, CDN) | $24,000 |
| Tools (Figma, Jira, Linear, etc.) | $12,000 |
| Research & User Testing | $8,000 |
| Recruitment Fees | $25,000 |
| **Non-HC Total** | **$114,000** |

### Contingency
```
10% of (Headcount + Non-HC) = $90,200
→ Rounded: $86,600 (after rounding headcount)
```

### **Grand Total: $952,600**

---

## Hiring Timeline

| תפקיד | זמן גיוס | עלות גיוס |
|-------|---------|----------|
| Senior Backend Engineer | 6-8 weeks | $13,000 |
| Mid Frontend Engineer | 5-7 weeks | $10,500 |
| Product Manager | 4-6 weeks | $12,000 |
| UX Designer | 3-5 weeks | $8,000 |
| QA Engineer | 3-4 weeks | $6,000 |

---

## Stage-Gate Funding Framework

### מה זה Stage-Gate?
מנגנון לאישור/ביטול השקעות בנקודות ביניים — מונע אוברראן ומאפשר pivot מוקדם.

### Gate 0 — Concept Approval
**מי מאשר:** CEO + CPO + CFO
**קריטריונים:**
- Nexus brief אושר ע"י 7+ מחלקות
- Market size > $1B TAM
- No direct competitor with >70% market share
- Team capable of building MVP in 3 months

### Gate 1 — Design Approval (שבוע 3-4)
**מי מאשר:** CPO + CTO + CFO
**קריטריונים:**
- [ ] Design mockups approved (NPS > 7/10 internal)
- [ ] 10+ signed LOIs from early adopters
- [ ] Tech feasibility confirmed by CTO
- [ ] Budget ≤ 110% of estimate
**Budget released:** 30% of total

### Gate 2 — Beta Approval (שבוע 12-16)
**מי מאשר:** CEO + CFO
**קריטריונים:**
- [ ] Beta NPS ≥ 40
- [ ] 15+ active beta users (used 2+ times)
- [ ] 0 P1/P0 security issues
- [ ] Trial→Beta conversion ≥ 30%
- [ ] Budget on track (≤ 115%)
**Budget released:** 50% additional (80% total)

### Gate 3 — Full Launch (חודש 3 post-launch)
**מי מאשר:** Board
**קריטריונים:**
- [ ] MRR target hit (per model)
- [ ] NPS ≥ 45 (post-launch)
- [ ] Support escalation rate < 5% of DAU
- [ ] Path to break-even within 6 months
**Budget released:** Remaining 20% + Year 2 planning

---

## ROI Formula

```
ROI = (Net Revenue - Total Investment) / Total Investment × 100

Net Revenue (Year 1+2):
  Year 1: $1,080,000 (ARR run rate at month 12)
  Year 2: $2,160,000 (2x growth, conservative)

Total Investment: $952,600 (Year 1)

2-Year ROI = ($3,240,000 - $952,600) / $952,600 = 240%
(Or using net: 166.7% using Year 1 net revenue only)
```

---

## CFO Checklist — לכל יוזמה

### לפני אישור פיתוח
- [ ] Business Case מלא עם ROI > 50% over 2 years
- [ ] Stage-Gate checkpoints מוגדרים ומאושרים
- [ ] Budget approved by CFO + CEO
- [ ] Revenue model validated (at least 5 LOIs)
- [ ] Legal costs for GDPR/HIPAA compliance estimated
- [ ] Infrastructure scaling costs modeled

### במהלך פיתוח
- [ ] Weekly burn rate vs. budget tracking
- [ ] Monthly ROI model update
- [ ] Gate checkpoint meetings scheduled
- [ ] Kill clause defined in advance

### אחרי Launch
- [ ] Revenue attribution model in place
- [ ] Cohort analysis running
- [ ] CAC by channel tracked
- [ ] LTV model updated with real data
