# NEXUS — Master Fix Plan

> Version: 2026-04-03
> Status: Comprehensive fix plan based on 3 independent audits
> Scope: 17 confirmed defects + 6 systemic gaps + 12 improvement opportunities
> Philosophy: STABILIZE → QUALITY → AUTOMATE → EXPAND

---

## Executive Summary

Three independent audits of NEXUS were conducted: (1) NEXUS-ENGINEERING-FLOW.md code trace identifying 6 bugs, (2) Strategic audit identifying 8 additional defects, and (3) Deep server/client code exploration confirming findings and discovering 3 more issues. This document merges all findings into one authoritative fix plan.

**The core diagnosis:** NEXUS is architecturally excellent but operationally fragile. The design is 9.5/10 — the execution is 6/10. The system is more advanced than its implementation. This plan closes that gap.

**Total findings:** 17 confirmed defects + 6 systemic gaps + 12 improvements = 35 action items.

---

## Part 1: Complete Defect Registry

Every known defect, organized by severity, with exact file paths, line numbers, code snippets, root cause analysis, fix specification, and verification steps.

---

### CRITICAL DEFECTS (5)

These defects cause data loss, security vulnerabilities, or silent system failures. Fix immediately before any new development.

---

#### C-1: Auth Bypass on Department Knowledge Routes

**Severity:** CRITICAL — Security Vulnerability
**File:** `server/src/nexusSettingsRoutes.ts`
**Lines:** 567, 584, 603
**Source:** Engineering Flow Appendix C + Server Audit

**Root Cause:**

The `getAdminFromRequest(req)` function is async and returns a Promise. On three department knowledge routes (POST, PUT, DELETE), it is called without `await`. The result is a Promise object, which is always truthy in JavaScript. The subsequent `if (!admin)` check never triggers, meaning these routes accept all requests regardless of authentication.

**Current Code (broken):**
```typescript
// Line 567
router.post('/nexus/dept-knowledge', async (req, res) => {
  const admin = getAdminFromRequest(req);  // ← Returns Promise, not user!
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  // Promise is truthy → auth ALWAYS passes
```

**What Should Be:**
```typescript
router.post('/nexus/dept-knowledge', async (req, res) => {
  const admin = await getAdminFromRequest(req);  // ← Now returns actual user
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
```

**Impact:** Any unauthenticated request can create, modify, or delete department knowledge entries. Since knowledge entries are injected directly into AI agent prompts, this is an injection vector — malicious content could be planted into the knowledge base and would appear in every future research session for that department.

**Fix:** Add `await` before `getAdminFromRequest(req)` on lines 567, 584, and 603. Also audit ALL other routes in the same file for the same pattern.

**Verification:**
1. Before fix: `curl -X POST http://localhost:5001/api/admin/nexus/dept-knowledge -H "Content-Type: application/json" -d '{"department":"ceo","category":"general","title":"test","content":"test"}'` → Returns 200
2. After fix: Same request → Returns 401 Unauthorized

**Estimated effort:** 15 minutes

---

#### C-2: Status Value Mismatch — 'done' vs 'completed'

**Severity:** CRITICAL — Silent Data Loss
**Files:** `server/src/nexusDepartmentAgents.ts`, `server/src/nexusTaskExtractor.ts`, `server/src/nexusBriefOrchestrator.ts`
**Source:** Engineering Flow Appendix C + Server Audit

**Root Cause:**

When a department agent completes successfully, the orchestrator saves the result with one status string. But downstream functions that read department results query for a different status string. The result is that completed department outputs are invisible to task extraction and sprint activation.

**Evidence from code:**

INSERT (orchestrator): `status = 'done'` or `status = 'completed'` — inconsistent depending on code path.

SELECT (task extractor, line 177): `WHERE status = 'completed'` — only finds 'completed' rows.

SELECT (sprint activation): `WHERE status IN ('done', 'completed')` — finds both, but this inconsistency masks the bug.

**What this means:** If 13 departments complete research, but some are saved as 'done' and others as 'completed', the task extraction step may only see a subset. The AI extracts tasks from an incomplete research output. No error is thrown. No warning appears. Tasks are simply generated from fewer department perspectives than expected.

**Fix:**
1. Grep all NEXUS server files for `status.*=.*'done'` and `status.*=.*'completed'` in INSERT/UPDATE context
2. Standardize everything to `'completed'`
3. Add a check: if the brief has 13 departments selected but only 8 are found with status='completed', log a warning

**Verification:** After fix, run a full research → verify `SELECT COUNT(*) FROM nexus_brief_departments WHERE brief_id = X AND status = 'completed'` equals the number of departments that ran.

**Estimated effort:** 30 minutes

---

#### C-3: rnd vs rd Department ID Mismatch

**Severity:** CRITICAL — R&D Department Runs Without Knowledge
**Files:** `server/src/index.ts` (seed block, ~line 650-680)
**Source:** Strategic Audit

**Root Cause:**

The R&D department is identified as `'rd'` across the codebase: in `nexusDepartmentAgents.ts`, in seed scripts for team members, and in `DEPT_REDDIT_SUBREDDITS`. However, there may be legacy data or manual insertions where knowledge entries were created with `department = 'rnd'`.

The seed in `index.ts` includes a patch: `UPDATE nexus_dept_knowledge SET department = 'rd' WHERE department = 'rnd'`. This defensive fix runs on server startup. However, if the patch runs BEFORE the seed inserts, it fixes nothing. If new knowledge is manually added with 'rnd', it won't be fixed until next restart.

**What this means:** The R&D department — which recommends libraries, tools, and implementation approaches — may run without its institutional knowledge (best practices, conventions, checklists). It produces generic recommendations instead of project-aware recommendations.

**Fix:**
1. Verify the UPDATE runs AFTER all INSERT statements in the seed block
2. Add a runtime check in `loadDeptKnowledge()`: if department is 'rd' and no results found, also try 'rnd' as fallback
3. Add a startup log: `"R&D knowledge entries: ${count}"` to catch when knowledge is missing

**Verification:** After fix, call `loadDeptKnowledge('rd')` — should return entries, not empty array.

**Estimated effort:** 20 minutes

---

#### C-4: gatherProjectData May Receive Wrong Arguments

**Severity:** CRITICAL — Codebase Context May Be Empty/Wrong
**File:** `server/src/nexusBriefOrchestrator.ts` line 222-225
**Source:** Engineering Flow Appendix C + Server Audit

**Root Cause:**

The orchestrator calls `gatherProjectData({ depth, scope })` passing a single object. The function may expect positional arguments `(depth, scope)`. If the signature mismatch exists, the function receives `{ depth, scope }` as the `depth` parameter and `undefined` as `scope`, producing incorrect or empty codebase context.

The server audit found that the call uses object syntax AND that the error is handled silently (falls back to a generic message on line 240 without logging the actual error).

**What this means:** The codebase context — the first 4000 characters of project structure that prevents AI hallucination — may be empty or malformed. Every department agent would then run without knowledge of the existing codebase, potentially recommending things that already exist or contradict the current architecture.

**Fix:**
1. Verify the actual function signature of `gatherProjectData` in its source file
2. If signature is positional: change call to `gatherProjectData(depth, scope)`
3. If signature accepts object: ensure destructuring is correct
4. Add error logging: if codebase context is empty or very short (< 100 chars), log a warning

**Verification:** Run a brief with depth='full', scope='all'. The SSE `codebase_ready` event should show `linesScanned > 0`.

**Estimated effort:** 15 minutes

---

#### C-5: formatTaskForAI Missing Critical Context

**Severity:** CRITICAL — Claude Code Lacks Project Awareness
**File:** `client/src/admin/utils/aiPromptFormatter.ts` lines 45-104
**Source:** Client Audit

**Root Cause:**

When an admin clicks "Start Dev" and the task prompt is generated, the `formatTaskForAI()` function includes: task details, design system CSS variables, stack mention, and bot-move curl command. But it does NOT include:

- Reference to CLAUDE.md (which exists at project root with 8,534 bytes of conventions)
- Reference to docs/nexus/project-identity.md (which prevents confusing MemorAid healthcare with memoraid.com memory sports)
- The nexusDocs from the task context (PRD, ERD, Blueprint references)
- The briefTitle that spawned the task
- The nexus_context research traceability

Furthermore, the PromptContext type defines 4 fields (`nexusDocs`, `briefTitle`, `columnName`, `sprintId`) that are **never used** in the function body. They were defined but never wired.

**What this means:** Claude Code starts each task knowing the task description and basic design rules, but not: what the project is about (healthcare for dementia patients), what conventions to follow (from CLAUDE.md), what specification documents exist (PRD/ERD), or why this task was created (research context). It operates in a vacuum.

**Fix:**
1. Add a project identity block at the top of the prompt referencing CLAUDE.md
2. Wire the unused context fields: inject nexusDocs as "Reference Documents" section, briefTitle as context header
3. Add a brief note about the research origin (brief title + source department)

**Verification:** Click "Start Dev" on a NEXUS-generated task. The clipboard prompt should include CLAUDE.md reference and nexusDocs section.

**Estimated effort:** 45 minutes

---

### HIGH DEFECTS (7)

These defects degrade research quality, limit intelligence gathering, or produce incorrect metadata. Fix within 1-2 sprints.

---

#### H-1: Index Mismatch in Department Error Mapping

**File:** `server/src/nexusDepartmentAgents.ts` lines 724-734
**Root Cause:** `departments[i]` used instead of `activeDepts[i]` in Promise.allSettled error handler. When inactive departments are filtered out, indices no longer align.
**Impact:** Failed department errors are attributed to wrong department names.
**Fix:** Change `departments[i]` to `activeDepts[i]` in the error mapping.
**Effort:** 10 minutes

---

#### H-2: Default Template Full Research Includes All 14 Departments — VERIFIED OK

**Status:** ✅ NOT A BUG — The seed script at `scripts/seed-nexus-settings.mjs` line 99 correctly includes all 14 departments: `['ceo','cto','cpo','rd','design','product','security','legal','marketing','finance','hr','cs','sales','ai-dev']`.

**Note:** The strategic audit reported this as a defect, but the deep code exploration confirmed the seed is correct. If this defect was observed in a running system, the database may have stale data from an older seed. Running `node scripts/seed-nexus-settings.mjs` will fix it.

---

#### H-3: Skill Taxonomy Partial Mismatch

**Files:** `scripts/seed-nexus-settings.mjs` lines 22-36, `server/src/nexusTaskExtractor.ts` EXTRACT_SYSTEM_PROMPT
**Root Cause:** The seed defines 14 skills. The EXTRACT_SYSTEM_PROMPT defines an enum of expected skillTag values. Most match, but `'healthcare'` and `'hebrew-rtl'` are in the seed but NOT in the extraction enum. If the AI generates tasks with these tags, they may cause validation issues.
**Fix:** Add `'healthcare'` and `'hebrew-rtl'` to the skillTag enum in EXTRACT_SYSTEM_PROMPT.
**Effort:** 10 minutes

---

#### H-4: Reddit Intelligence Limited to First Subreddit Per Department

**File:** `server/src/nexusWebIntelligence.ts` line 176
**Root Cause:** `fetchDeptRedditSources()` takes the subreddit array for each department but only queries `subreddits[0]`. For CTO with `['softwarearchitecture', 'node', 'programming']`, only `softwarearchitecture` is searched.
**Impact:** 2/3 of Reddit intelligence per department is lost. R&D misses LocalLLaMA and MachineLearning (gets only 'artificial').
**Fix:** Loop through all subreddits (or at least top 2-3) instead of only index 0. Add rate limiting between requests.
**Effort:** 30 minutes

---

#### H-5: Five Departments Missing Reddit Subreddits

**File:** `server/src/nexusWebIntelligence.ts` — DEPT_REDDIT_SUBREDDITS map
**Root Cause:** The subreddit mapping only covers: CEO, CTO, CPO, R&D, Design, Security, Marketing, Legal. Missing: Finance, HR, Customer Success, Sales, AI-Dev.
**Impact:** These 5 departments receive zero Reddit community intelligence in their prompts.
**Fix:** Add subreddit mappings:
- finance: `['fintech', 'startups', 'smallbusiness']`
- hr: `['humanresources', 'recruiting', 'managers']`
- cs: `['CustomerSuccess', 'SaaS', 'userexperience']`
- sales: `['sales', 'B2Bsales', 'Entrepreneur']`
- ai-dev: `['MachineLearning', 'LocalLLaMA', 'ClaudeAI']`
**Effort:** 15 minutes

---

#### H-6: AI-Dev Translation Missing Q&A Context and Knowledge

**File:** `server/src/nexusDepartmentAgents.ts` — `runAIDevTranslation` function
**Root Cause:** Unlike regular department agents that receive: dept knowledge, Q&A answers, skills, and (for design/cpo) design rules — the AI-Dev meta-translator receives ONLY: department outputs, idea prompt, and codebase context. It explicitly skips loadDeptKnowledge, getQAContextForDepartment, and skills injection.
**Impact:** If admin answered critical Q&A questions ("we use Stripe for payments", "this must work offline"), the AI-Dev brief won't know. Its development plan may contradict established answers.
**Fix:** Add Q&A context (aggregated from all departments), skills, and ai-dev knowledge to the AI-Dev translation prompt.
**Effort:** 1 hour

---

#### H-7: Department Knowledge Not Seeded for 4 Departments

**File:** `server/src/index.ts` lines 657-679
**Root Cause:** The knowledge seed only covers 10 departments: CEO, CTO, CPO, R&D, Design, Product, Security, Legal, Marketing, Finance. Missing: HR, CS (Customer Success), Sales, AI-Dev.
**Impact:** These 4 departments run with zero institutional knowledge in their prompts.
**Fix:** Add knowledge entries for the 4 missing departments with at least 2 entries each (general conventions + best practices).
**Effort:** 30 minutes

---

### MEDIUM DEFECTS (5)

These defects reduce quality or create suboptimal behavior. Fix in normal development cycle.

---

#### M-1: assembleBrief Produces Static Summary

**File:** `server/src/nexusBriefOrchestrator.ts` lines 155-165
**Root Cause:** The "Summary and Recommendations" section at the end of every brief is hardcoded boilerplate text that never changes between briefs. There is no AI-generated cross-department synthesis.
**Impact:** The admin must read all 14 department outputs individually to understand the research. There's no executive summary highlighting consensus, conflicts, or key risks.
**Fix:** After AI-Dev translation, add an AI call that generates a genuine executive summary from all department outputs.
**Effort:** 2 hours

---

#### M-2: docReferences Not Filtered Per Task

**File:** `server/src/nexusTaskExtractor.ts` — `activateSprintTasks` function
**Root Cause:** When building `nexus_context` for each dev_task, ALL generated documents for the brief are attached to EVERY task. A CSS styling task gets references to the Legal Compliance document and Marketing GTM strategy.
**Impact:** Claude Code receives noisy context. Prompt is longer than necessary. AI may reference irrelevant specification documents.
**Fix:** Filter docReferences based on task.sourceDepartment and task.category. Design tasks get Design + PRD docs. Security tasks get Security + Blueprint docs.
**Effort:** 1 hour

---

#### M-3: Rules Engine Not Connected to Pipeline Events

**Files:** `server/src/nexusAdminRoutes.ts`, `server/src/nexusBriefOrchestrator.ts`, `server/src/nexusTaskExtractor.ts`
**Root Cause:** The CRUD for rules is fully functional. The database table is well-designed. But no code evaluates rules when events occur. When a brief is approved, no code checks `nexus_rules` for matching triggers. The entire automation layer is inert.
**Impact:** Features like "auto-extract tasks on approval" or "webhook to Slack on research complete" don't work. Admins must do everything manually.
**Fix:** Create `evaluateRules(triggerType, context)` function and call it at 4 pipeline points:
- Brief approved → evaluate 'brief_approved' rules
- Research complete → evaluate 'research_done' rules
- Tasks extracted → evaluate 'task_created' rules
- Sprint created → evaluate 'sprint_created' rules
**Effort:** 4 hours

---

#### M-4: N8N Empty Fallback Returns No Data

**File:** `server/src/n8nBridge.ts` line 233
**Root Cause:** When N8N is configured but unreachable, and the direct API fallback also fails, the function returns `{ sources: [], synthesizedContext: '' }` — completely empty. It doesn't attempt the built-in direct intelligence gathering.
**Impact:** In edge cases, web intelligence is completely empty, and departments run without any web context.
**Fix:** On N8N failure, explicitly call `gatherWebIntelligence()` as fallback rather than returning empty.
**Effort:** 30 minutes

---

#### M-5: No Launch Validation for Unanswered Manual Questions

**File:** `client/src/admin/pages/AdminNexusBrief.tsx`
**Root Cause:** The UI correctly shows warnings about unanswered manual_only questions (amber highlighting, badges, warning text). But there is no validation gate — the admin can click "Launch Research" even with 11 unanswered mandatory questions.
**Impact:** Critical questions that require human judgment (business strategy, regulatory decisions) remain empty. Departments run without this context.
**Fix:** Add a confirmation dialog: "You have X unanswered manual questions. Launch anyway?" or optionally make manual_only questions required before launch.
**Effort:** 30 minutes

---

## Part 2: Systemic Gaps

These are not bugs in existing code but missing architectural capabilities.

---

### Gap A: Closed Feedback Loop (Claude Code → NEXUS)

**What's missing:** The flow is one-directional: NEXUS → tasks → Claude Code → bot-move Done. Claude Code never reports back: which files changed, whether tests passed, build status, errors encountered, or implementation quality.

**Why it matters:** Without feedback, NEXUS can't learn from implementation results. It can't improve task descriptions based on what works. It can't detect patterns like "tasks from Security department always need rework."

**What to build:**
1. Extend the bot-move endpoint to accept: filesChanged[], testsPassed (boolean), buildStatus, notes
2. Store feedback in a new `nexus_task_feedback` table
3. Aggregate feedback per department and per brief for quality dashboards
4. Feed high-confidence patterns back into department knowledge base

**Effort:** 8 hours

---

### Gap B: Governance State Machine

**What's missing:** The brief lifecycle stops at: draft → researching → review → approved → in_progress → done. There is no: qa, staging, production, or monitoring state. There is no formal approval chain.

**What to build:**
1. Extend the status enum: add 'qa', 'staging', 'production', 'monitoring'
2. Add transition rules: who can move between states, what conditions must be met
3. Add sprint-level governance: sprint can't complete without QA sign-off
4. Dashboard showing pipeline health across all states

**Effort:** 6 hours

---

### Gap C: Cost Governance

**What's missing:** No budget limits. A full research costs $15-25. No daily cap, no monthly cap, no per-brief alerts.

**What to build:**
1. Settings table for: max_cost_per_brief, daily_budget, monthly_budget
2. Pre-launch check: estimate cost based on selected departments and models, warn if over budget
3. Runtime check: abort research if accumulated cost exceeds brief limit
4. Dashboard widget: daily/monthly spend vs budget

**Effort:** 3 hours

---

### Gap D: Per-Agent Deep Research via N8N

**What's missing:** Currently all departments receive the same generic web intelligence. The vision is: each department should have its own N8N workflow that searches sources relevant to its expertise.

**What to build:**
1. N8N workflow per department type (security searches CVE databases, R&D searches npm registry, etc.)
2. N8N bridge extended to send department-specific queries
3. Results routed back per-department into web intelligence
4. Gap detection: if a department's N8N workflow returns zero results, trigger fallback

**Effort:** 16 hours

---

### Gap E: QA Automation Layer

**What's missing:** After Claude Code completes a task, no automated QA runs. No test execution, no acceptance criteria validation, no code review.

**What to build:**
1. Post-task webhook: when bot-move fires, trigger QA pipeline
2. QA pipeline: run relevant tests, check TypeScript compilation, validate acceptance criteria
3. QA results stored in task feedback
4. Auto-reopen task if QA fails

**Effort:** 8 hours

---

### Gap F: Production Telemetry

**What's missing:** No dashboard for: department success/failure rates, provider usage/fallback rates, average cost per department, token consumption trends, or anomaly detection.

**What to build:**
1. Aggregate queries from `ai_usage` and `nexus_brief_departments`
2. Dashboard page in admin panel with: department health matrix, model performance chart, cost trend graph, error rate indicators
3. Alerts for: cost spike, error rate increase, provider degradation

**Effort:** 4 hours

---

## Part 3: Improvement Opportunities

These are not broken but could be significantly better.

---

### I-1: Wire Unused PromptContext Fields
**File:** `aiPromptFormatter.ts`
**What:** nexusDocs, briefTitle, columnName, sprintId defined but never used in the prompt.
**Improvement:** Inject nexusDocs as reference section, briefTitle as task origin, sprintId for traceability.
**Effort:** 30 minutes

---

### I-2: Add Cross-Department Synthesis to Brief
**What:** After AI-Dev translation, add an AI call that produces a genuine executive summary: consensus points, conflicts between departments, top 3 risks, recommended priority.
**Effort:** 2 hours

---

### I-3: Search All Reddit Subreddits Per Department
**What:** Currently only first subreddit is searched. Search top 2-3 per department for richer community intelligence.
**Effort:** 30 minutes

---

### I-4: Add Department Knowledge for Missing 4 Departments
**What:** HR, CS, Sales, AI-Dev have no institutional knowledge seeded. Add best practices and conventions for each.
**Effort:** 1 hour

---

### I-5: Add Trust Score Sources to Brief Summary
**What:** The assembled brief shows source count but not the actual top sources. Add a "Key Sources" section with top 5 by trust score.
**Effort:** 30 minutes

---

### I-6: Add N8N Retry Logic
**What:** Currently N8N gets one attempt. Add 1-2 retries with backoff before falling back to direct API.
**Effort:** 30 minutes

---

### I-7: Log JSON Sanitization for Debugging
**What:** The aggressive JSON sanitizer in task extraction strips characters silently. Log what was sanitized for debugging.
**Effort:** 15 minutes

---

### I-8: Add Cost Estimate Before Launch
**What:** Before admin clicks "Launch Research," show estimated cost based on: number of departments × average tokens × model pricing. Let admin decide if the research is worth the cost.
**Effort:** 1 hour

---

### I-9: Add Research Duration Estimate
**What:** Based on historical data in `nexus_brief_departments`, estimate how long the research will take based on selected departments and models. Show "Estimated: 2-4 minutes" before launch.
**Effort:** 1 hour

---

### I-10: Add Department Dependency Order
**What:** Some departments could benefit from seeing others' outputs. Security could benefit from CTO's architecture analysis. Currently all run in parallel without awareness. Consider running in waves: C-level first, then specialists, then AI-Dev.
**Effort:** 4 hours (requires pipeline restructuring)

---

### I-11: Add Brief Comparison
**What:** When running a second research on a similar idea, show diff between old and new brief. What changed? What's consistent?
**Effort:** 3 hours

---

### I-12: Add Prompt Size Warning
**What:** With full CVs + knowledge + web sources + codebase, prompts can exceed model context limits. Add a pre-flight check that estimates prompt size and warns if it's too large.
**Effort:** 1 hour

---

## Part 4: Execution Roadmap

### Phase 1: STABILIZE (Days 1-2, ~4 hours)

Stop the bleeding. Fix every defect that causes data loss, security issues, or silent failures.

| Order | Defect | Action | Time |
|-------|--------|--------|------|
| 1 | C-1 | Add `await` on auth routes | 15m |
| 2 | C-4 | Fix gatherProjectData call | 15m |
| 3 | C-2 | Standardize status to 'completed' | 30m |
| 4 | C-3 | Verify rnd→rd fix runs correctly | 20m |
| 5 | H-1 | Fix activeDepts index | 10m |
| 6 | H-3 | Add healthcare/hebrew-rtl to skill enum | 10m |
| 7 | H-7 | Seed knowledge for HR, CS, Sales, AI-Dev | 30m |

**Phase 1 total: ~2.5 hours**
**After Phase 1:** Core pipeline works correctly. No silent failures. Auth is enforced.

---

### Phase 2: ENRICH (Days 3-5, ~5 hours)

Make the research output richer and more accurate.

| Order | Defect | Action | Time |
|-------|--------|--------|------|
| 1 | C-5 | Wire formatTaskForAI with CLAUDE.md + nexusDocs + briefTitle | 45m |
| 2 | H-4 | Search all subreddits per dept (not just first) | 30m |
| 3 | H-5 | Add Reddit subreddits for 5 missing departments | 15m |
| 4 | H-6 | Add Q&A + knowledge + skills to AI-Dev translation | 1h |
| 5 | M-1 | Add AI-generated cross-department summary to assembleBrief | 2h |
| 6 | I-1 | Wire unused PromptContext fields | 30m |

**Phase 2 total: ~5 hours**
**After Phase 2:** Every department has Reddit data. AI-Dev sees Q&A context. Briefs end with real synthesis. Task prompts reference CLAUDE.md.

---

### Phase 3: PROTECT (Days 6-7, ~3 hours)

Add safeguards and visibility.

| Order | Defect/Gap | Action | Time |
|-------|------------|--------|------|
| 1 | M-2 | Filter docReferences per task | 1h |
| 2 | M-5 | Add launch validation for manual questions | 30m |
| 3 | I-8 | Add cost estimate before launch | 1h |
| 4 | I-12 | Add prompt size warning | 30m |

**Phase 3 total: ~3 hours**
**After Phase 3:** No noisy docRefs. Cost awareness before launch. Prompt size safety.

---

### Phase 4: AUTOMATE (Week 2, ~8 hours)

Enable the automation layer.

| Order | Item | Action | Time |
|-------|------|--------|------|
| 1 | M-3 | Wire Rules Engine to pipeline events | 4h |
| 2 | M-4 | Fix N8N empty fallback | 30m |
| 3 | Gap C | Add cost governance (budget caps) | 3h |
| 4 | I-6 | Add N8N retry logic | 30m |

**Phase 4 total: ~8 hours**
**After Phase 4:** Auto-extract tasks on approval. Budget protection. N8N retry.

---

### Phase 5: INTELLIGENCE (Week 3-4, ~20 hours)

Make the system smarter.

| Order | Item | Action | Time |
|-------|------|--------|------|
| 1 | Gap A | Build feedback loop (Claude → NEXUS) | 8h |
| 2 | Gap F | Build telemetry dashboard | 4h |
| 3 | I-10 | Add department dependency order (waves) | 4h |
| 4 | I-9 | Add research duration estimate | 1h |
| 5 | I-11 | Add brief comparison | 3h |

**Phase 5 total: ~20 hours**

---

### Phase 6: EXPAND (Month 2, ~30 hours)

Scale the system architecture.

| Order | Item | Action | Time |
|-------|------|--------|------|
| 1 | Gap D | Build per-agent N8N research workflows | 16h |
| 2 | Gap B | Add governance state machine | 6h |
| 3 | Gap E | Build QA automation layer | 8h |

**Phase 6 total: ~30 hours**

---

## Part 5: Verification Checklist

### After Phase 1 (Stabilize):
- [ ] `curl` unauthenticated to /nexus/dept-knowledge → 401
- [ ] `grep -r "status.*done" server/src/nexus*` → 0 matches (all 'completed')
- [ ] `loadDeptKnowledge('rd')` returns entries
- [ ] gatherProjectData SSE shows linesScanned > 0
- [ ] Error for failed dept shows correct department name
- [ ] Skills in seed match EXTRACT_SYSTEM_PROMPT enum
- [ ] All 14 departments have knowledge entries

### After Phase 2 (Enrich):
- [ ] "Start Dev" prompt includes CLAUDE.md reference
- [ ] "Start Dev" prompt includes nexusDocs references
- [ ] All 14 departments have Reddit subreddits
- [ ] AI-Dev prompt includes Q&A section
- [ ] Brief ends with AI-generated summary (not boilerplate)

### After Phase 3 (Protect):
- [ ] Task nexus_context.docReferences filtered by relevance
- [ ] Launch with unanswered manual questions shows warning
- [ ] Cost estimate shown before launch
- [ ] Large prompt triggers size warning

### After Phase 4 (Automate):
- [ ] Create rule "on approval → auto extract" → approve brief → tasks appear
- [ ] N8N failure → fallback to direct API (not empty)
- [ ] Budget cap exceeded → warning

### After Phase 5 (Intelligence):
- [ ] Claude Code feedback stored in DB
- [ ] Telemetry dashboard shows department health
- [ ] Department waves: C-level → specialists → AI-Dev

---

## Total Effort Summary

| Phase | Focus | Hours | Impact |
|-------|-------|-------|--------|
| Phase 1 | Stabilize | 2.5h | Core pipeline correct |
| Phase 2 | Enrich | 5h | Research quality 2x |
| Phase 3 | Protect | 3h | Safety + awareness |
| Phase 4 | Automate | 8h | Rules Engine alive |
| Phase 5 | Intelligence | 20h | Learning system |
| Phase 6 | Expand | 30h | Full N8N + governance |
| **Total** | | **68.5h** | **NEXUS 10/10** |

---

## File Impact Matrix

| File | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|---------|---------|---------|---------|
| `nexusSettingsRoutes.ts` | C-1 (auth) | | | |
| `nexusDepartmentAgents.ts` | C-2, H-1 | H-6 | | |
| `nexusBriefOrchestrator.ts` | C-4 | M-1 | | |
| `nexusTaskExtractor.ts` | C-2, H-3 | | M-2 | |
| `nexusWebIntelligence.ts` | | H-4, H-5 | | |
| `aiPromptFormatter.ts` | | C-5, I-1 | | |
| `index.ts` | C-3, H-7 | | | |
| `seed-nexus-settings.mjs` | H-3 | | | |
| `AdminNexusBrief.tsx` | | | M-5 | |
| `nexusAdminRoutes.ts` | | | | M-3 |
| `n8nBridge.ts` | | | | M-4, I-6 |

---

> **This is the definitive fix plan for NEXUS. Update this document as defects are fixed: mark each with [FIXED - date] and add the commit hash.**
