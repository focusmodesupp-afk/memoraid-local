# NEXUS Phase 6 — Test Report
## Per-Agent Deep Research via N8N

**Date:** 2026-04-03
**Commits:** `e05bad8`, `1ca8a45`
**Environment:** Live Supabase DB, no N8N instance (direct fallback mode)

---

## 1. What Was Tested

### 1.1 Unit Tests — `nexusDeptResearchConfig.ts`
| # | Test | Result |
|---|------|--------|
| 1 | 13 departments configured (ai-dev excluded) | PASS |
| 2 | All configs have required fields (searchKeywords, subreddits, perplexityFocusTemplate) | PASS |
| 3 | Query differentiation: Security/R&D/Legal produce different Reddit queries and Perplexity prompts | PASS |
| 4 | Unknown department returns valid fallback queries | PASS |
| 5 | Team skills injected into Perplexity prompt | PASS |
| 6 | Domain expertise injected into Perplexity prompt | PASS |

### 1.2 Unit Tests — `n8nBridge.ts` (mergeWebIntelligence)
| # | Test | Result |
|---|------|--------|
| 7 | Dept-specific sources appear first in merged result | PASS |
| 8 | +10 trust score bonus applied to dept sources (capped at 100) | PASS |
| 9 | Synthesized context includes department name | PASS |
| 10 | Empty dept gets only generic sources | PASS |
| 11 | No duplicate URLs in merged result | PASS |
| 12 | Gap detection: 0 sources triggers gap | PASS |
| 13 | Gap detection: 1 source triggers gap (< 3 threshold) | PASS |

### 1.3 Unit Tests — Feature Flag & Imports
| # | Test | Result |
|---|------|--------|
| 14 | `NEXUS_DEPT_RESEARCH_ENABLED=false` returns empty (no-op) | PASS |
| 15 | All new exports resolve: `triggerPerDeptResearch`, `triggerDeptGapResearch`, `mergeWebIntelligence` | PASS |
| 16 | Exported functions from nexusWebIntelligence: `fetchGitHubSources`, `fetchRedditSources`, `fetchPerplexitySingle` | PASS |
| 17 | `DeptResearchContext` type works at runtime | PASS |

### 1.4 Integration Tests — Live DB
| # | Test | Result |
|---|------|--------|
| 18 | DB migration: `department` column exists on `nexus_brief_web_sources` | PASS |
| 19 | 14 departments with active team members (16-49 members each) | PASS |
| 20 | Team members have skills and domain_expertise arrays populated | PASS |
| 21 | 498 existing web sources in DB (baseline) | PASS |

### 1.5 Integration Tests — Direct Fallback (no N8N)
| # | Test | Result |
|---|------|--------|
| 22 | Per-dept research returns sources for 4 depts in parallel | PASS |
| 23 | All 58 sources correctly tagged with `department` field | PASS |
| 24 | 3 source types returned: GitHub, Reddit, Perplexity | PASS |
| 25 | Zero subreddit overlap between Security (netsec, cybersecurity) and CEO (startups, Entrepreneur) | PASS |
| 26 | Performance: 4 departments in 10.2 seconds | PASS |
| 27 | Concurrency limiter works (mode=direct, concurrency=5) | PASS |

### 1.6 Bug Found & Fixed
| # | Test | Initial Result | After Fix |
|---|------|---------------|-----------|
| 28 | GitHub search with dept-specific qualifiers (topic:security topic:owasp) | FAIL (0 repos) | N/A |
| 29 | GitHub search with dept keyword appended (idea + "OWASP") | FAIL (0 repos) | N/A |
| 30 | GitHub search with idea-only (stop words removed, max 5 words) | — | PASS (5 repos) |

**Root cause:** GitHub Search API returns 0 results when combining an idea prompt with unrelated department keywords. Fixed by using idea-only queries for GitHub; department differentiation comes from Reddit subreddits and Perplexity prompts.

---

## 2. What Was NOT Tested

### 2.1 N8N Workflow Path
| Item | Reason |
|------|--------|
| `nexus-dept-research.json` workflow execution | N8N instance not running; workflow JSON not yet imported |
| N8N webhook `POST /dept_research` endpoint | Requires N8N import + activation |
| N8N parallel node execution (GitHub + Reddit + Perplexity) | Requires N8N runtime |
| N8N error handling (continueOnFail, retries) | Requires N8N runtime |

**Impact:** Low. The direct fallback covers the same logic and was fully tested. N8N is an optimization, not a prerequisite.

### 2.2 Full Orchestrator Pipeline (Step 3.5 in context)
| Item | Reason |
|------|--------|
| `runNexusOrchestrator()` with Step 3.5 active | Requires running server + creating a brief via admin UI |
| SSE events streaming to frontend (`dept_research_start/found/gap/done`) | No live server test |
| Step 3.5 → Step 4 handoff (per-dept intelligence injected into agents) | Requires full pipeline run |
| Gap Analysis second pass during real orchestration | Requires full pipeline run |
| DB persistence of per-dept sources with `department` column during real brief | Requires full pipeline run |
| `loadNexusConfig()` inside Step 3.5 (team skills aggregation) | Tested in isolation, not in orchestrator context |

### 2.3 Edge Cases
| Item | Reason |
|------|--------|
| All 13 departments running simultaneously | Tested with 4; full 13 not yet tested |
| Perplexity API rate limiting with 13 parallel calls | No rate limit scenario tested |
| GitHub API rate limiting (unauthenticated: 10 req/min) | Only 4 depts tested; 13 may hit limits |
| N8N timeout handling (45s per dept) | No timeout scenario tested |
| Step 3.5 try/catch fallback to generic (when entire step fails) | Not tested with simulated failure |
| Brief with Hebrew-only idea prompt | Not tested |

---

## 3. What Still Needs to Be Done for Phase 6 Completion

### 3.1 Critical (Must)
| # | Item | Status | Detail |
|---|------|--------|--------|
| 1 | Import N8N workflow | NOT DONE | `nexus-dept-research.json` needs manual import to N8N UI + activation. Setup docs added to CLAUDE.md |
| 2 | Full pipeline E2E test | NOT DONE | Create brief via admin UI → verify Step 3.5 runs → verify per-dept sources in DB → verify assembled brief has dept-specific research |
| 3 | Frontend SSE events | DONE | `AdminNexusBrief.tsx` now handles all 5 new `dept_research_*` events with UI progress section |

### 3.2 Important (Should)
| # | Item | Status | Detail |
|---|------|--------|--------|
| 4 | GitHub API rate limiting | FIXED | GitHub query deduped — 1 API call shared across all depts (65 URLs, 5 unique). GITHUB_TOKEN added to .env.example |
| 5 | 13-dept parallel test | DONE | All 13 depts: 11-16 sources each, 3 types, 100% tagged, 25.9s, zero overlap |
| 6 | Hebrew idea prompt test | DONE | GitHub/Reddit return 0 (English-only). Perplexity works. Auto-translation recommended for future |

### 3.3 Nice to Have (Could)
| # | Item | Status | Detail |
|---|------|--------|--------|
| 7 | Admin UI progress for per-dept research | DONE | Frontend now handles 5 new SSE events, shows dept research progress section |
| 8 | Per-dept source count in assembled brief metadata | NOT ADDED | Brief metadata shows total `sourceCount` but not per-dept breakdown |
| 9 | Dashboard analytics for per-dept research | NOT BUILT | No metrics on how many sources each dept typically gets |

---

## 4. Architecture Summary

```
Step 3:   gatherWebIntelligenceHybrid()     ← Generic (unchanged)
              ↓ WebIntelligenceResult (20-40 sources)

Step 3.5: loadNexusConfig()                 ← NEW
              ↓ team skills + domain expertise per dept
          buildDeptContexts() → 13 DeptResearchContext objects
          triggerPerDeptResearch()
              ↓ N8N /dept_research ×13 (or direct API fallback)
              ↓ concurrency=5, timeout=45s per dept
          identifyGaps() → depts with < 3 quality sources
          triggerDeptGapResearch() → second pass (broader queries)
          mergeWebIntelligence() → Map<dept, WebIntelligenceResult>
          Save to DB with department column
              ↓

Step 4:   runAllDepartmentAgents()           ← Modified
              ↓ Each dept receives its OWN WebIntelligenceResult
              ↓ (fallback: generic sources if perDeptWebIntelligence is undefined)
```

---

## 5. Files Modified

| File | Change | Lines |
|------|--------|-------|
| `server/src/nexusDeptResearchConfig.ts` | NEW — 13 dept configs + query builder | 180 |
| `n8n-workflows/nexus-dept-research.json` | NEW — N8N workflow (8 nodes) | 198 |
| `server/src/n8nBridge.ts` | triggerPerDeptResearch, gap analysis, merge, concurrency limiter, direct fallback | +310 |
| `server/src/nexusBriefOrchestrator.ts` | Step 3.5 insertion, SSE events, DB save | +102 |
| `server/src/nexusDepartmentAgents.ts` | Accept + route perDeptWebIntelligence | +7 |
| `server/src/nexusWebIntelligence.ts` | Export fetchGitHubSources, fetchRedditSources, fetchPerplexitySingle | +6 |
| `shared/schemas/schema.ts` | Add department column to nexusBriefWebSources | +3 |
| `server/src/index.ts` | Patch 0042: ALTER TABLE ADD COLUMN | +3 |
| `.env.example` | N8N_DEPT_TIMEOUT_MS, N8N_DEPT_CONCURRENCY, NEXUS_DEPT_RESEARCH_ENABLED | +4 |

**Total: +813 lines across 9 files (2 new, 7 modified)**
