# NEXUS — Gap Analysis & Fix Roadmap

> Last updated: 2026-04-03
> Status: 14 confirmed defects across 2 independent audits
> Sources: NEXUS-ENGINEERING-FLOW.md code trace + Strategic audit from NotebookLM/AI analysis
> Priority: Stabilize core loop before expanding capabilities

---

## Executive Summary

After a comprehensive audit of the NEXUS system — combining code-level analysis (NEXUS-ENGINEERING-FLOW.md), external AI review (NotebookLM), and strategic assessment — **14 confirmed defects** were identified. The consensus across all analyses is clear: NEXUS as a **design** is exceptional (9.5/10), but NEXUS as an **execution** is incomplete (6/10).

The core issue is not vision — the vision is correct. The issue is that the system is more architecturally advanced than its operational stability. Features were built wide before being built deep. The Rules Engine has a UI but no execution. The template system exists but is missing 5 departments. The R&D department has a knowledge base that it can never read due to a naming mismatch. The authentication on critical routes can be bypassed due to a missing `await`.

This document catalogs every known defect, prioritizes them by severity, and provides a clear fix roadmap with exact file paths and verification steps.

---

## The 14 Confirmed Defects

### Defect Map by Source

| # | Defect | Severity | Source | File(s) |
|---|--------|----------|--------|---------|
| 1 | Auth bypass on dept-knowledge | CRITICAL | Engineering Flow | nexusSettingsRoutes.ts |
| 2 | rnd vs rd naming mismatch | CRITICAL | Strategic Audit | index.ts seed, dept queries |
| 3 | Status done vs completed | HIGH | Engineering Flow | nexusDepartmentAgents.ts, nexusTaskExtractor.ts |
| 4 | Default template missing 5 depts | HIGH | Strategic Audit | seed-nexus-settings.mjs |
| 5 | Index mismatch in error mapping | HIGH | Engineering Flow | nexusDepartmentAgents.ts |
| 6 | gatherProjectData signature | HIGH | Engineering Flow | nexusBriefOrchestrator.ts |
| 7 | Skill taxonomy mismatch | HIGH | Strategic Audit | seed-nexus-settings.mjs, nexusTaskExtractor.ts |
| 8 | Q&A manual_only has no UI | HIGH | Strategic Audit | AdminNexusBrief.tsx |
| 9 | Reddit missing 5 departments | MEDIUM | Strategic Audit | nexusWebIntelligence.ts |
| 10 | AI-Dev missing Q&A context | MEDIUM | Strategic Audit | nexusDepartmentAgents.ts |
| 11 | assembleBrief static summary | MEDIUM | Strategic Audit | nexusBriefOrchestrator.ts |
| 12 | docReferences too broad | MEDIUM | Engineering Flow | nexusTaskExtractor.ts |
| 13 | Rules Engine disconnected | MEDIUM | Engineering Flow | nexusAdminRoutes.ts, orchestrator |
| 14 | No CLAUDE.md at project root | MEDIUM | Strategic Audit | new file: CLAUDE.md |

---

## CRITICAL Defects — Fix Immediately

### Defect #1: Auth Bypass on Department Knowledge Routes

**Severity:** CRITICAL (Security)
**Source:** NEXUS-ENGINEERING-FLOW.md Appendix C, Defect 3
**File:** `server/src/nexusSettingsRoutes.ts`

**What's broken:** The `getAdminFromRequest(req)` function is called without `await` on the department knowledge CRUD routes (POST, PUT, DELETE). Because it's an async function, calling it without await returns a Promise object instead of the actual admin user. Since a Promise is truthy, the auth check passes for anyone — authenticated or not.

**What this means in practice:** Any unauthenticated request to `/api/admin/nexus/dept-knowledge` can create, modify, or delete department knowledge entries. This is a security vulnerability because department knowledge is injected directly into AI agent prompts. A malicious actor could inject arbitrary instructions into the knowledge base, which would then be included in every future research session for that department.

**The fix:** Add `await` before every `getAdminFromRequest(req)` call in the department knowledge routes. There may be similar missing awaits in other routes in the same file — all should be audited.

**Verification:** After fixing, send an unauthenticated POST request to `/api/admin/nexus/dept-knowledge` with a test payload. It should return 401 Unauthorized. Before fixing, it returns 200 OK.

---

### Defect #2: rnd vs rd Department Naming Mismatch

**Severity:** CRITICAL (Data Integrity)
**Source:** Strategic Audit
**Files:** `server/src/index.ts` (seed block, ~line 652), `server/src/nexusDepartmentAgents.ts` (loadDeptKnowledge)

**What's broken:** The R&D department is identified as `'rd'` throughout the codebase — in seed scripts for team members (`seed-nexus-cv-data.mjs`), in the department agents configuration, and in the `loadDeptKnowledge()` function. However, the knowledge base seed in `index.ts` inserts department knowledge entries with `department = 'rnd'`.

**What this means in practice:** When the R&D department agent runs and calls `loadDeptKnowledge('rd')`, the query `SELECT * FROM nexus_dept_knowledge WHERE department = 'rd'` returns zero rows. All the R&D knowledge base entries (best practices, templates, references, checklists) exist in the database under `'rnd'` but are never found because the code searches for `'rd'`.

This means the R&D department — one of the most technically important departments that recommends libraries, tools, and implementation approaches — runs every single research session **without any institutional knowledge**. It never sees the best practices, conventions, or guidelines that were carefully written for it.

**The fix:** Update the seed in `server/src/index.ts` to use `department = 'rd'` instead of `'rnd'` for all R&D knowledge entries. Also run a migration query to fix any existing data: `UPDATE nexus_dept_knowledge SET department = 'rd' WHERE department = 'rnd'`.

**Verification:** After fixing, run `loadDeptKnowledge('rd')` and confirm it returns the expected knowledge entries. Before fixing, it returns an empty array.

---

## HIGH Defects — Fix This Sprint

### Defect #3: Status String Inconsistency (done vs completed)

**Severity:** HIGH (Data Loss)
**Source:** NEXUS-ENGINEERING-FLOW.md Appendix C, Defect 4
**Files:** `server/src/nexusDepartmentAgents.ts`, `server/src/nexusTaskExtractor.ts`

**What's broken:** When a department agent completes successfully, some code paths insert `status = 'done'` and others insert `status = 'completed'` into the `nexus_brief_departments` table. The task extraction function (`extractTasksFromBrief`) queries for `WHERE status = 'completed'`, while the sprint activation function (`activateSprintTasks`) queries for `WHERE status IN ('done', 'completed')`.

**What this means in practice:** If a department's result is saved with `status = 'done'`, the task extraction step will not find that department's output. This means some department analyses are silently excluded from task extraction. The admin sees all departments completed in the UI (because the SSE events fired), but the tasks generated don't include insights from departments whose status was saved as 'done'.

This is particularly insidious because it's a silent failure — nothing errors, nothing warns, tasks are just generated from an incomplete set of department outputs.

**The fix:** Standardize on `'completed'` everywhere. Search all NEXUS files for `status = 'done'` and change to `status = 'completed'`. Also search for any status checks that only look for one value and ensure they're consistent.

**Verification:** After fixing, grep across all NEXUS server files for both 'done' and 'completed' status values. Only 'completed' should appear in INSERT/UPDATE statements. Only 'completed' should appear in WHERE clauses for department status.

---

### Defect #4: Default Template Missing 5 Departments

**Severity:** HIGH (Incomplete Research)
**Source:** Strategic Audit
**File:** `scripts/seed-nexus-settings.mjs`

**What's broken:** The default "Full Research" template includes only 9 departments: `['ceo', 'cto', 'cpo', 'rd', 'design', 'product', 'security', 'legal', 'marketing']`. Five departments are missing: `finance`, `hr`, `cs` (customer success), `sales`, and `ai-dev`.

**What this means in practice:** When an admin creates a new brief and selects the "Full Research" template (or uses the default), only 9 out of 14 departments are selected. The admin would need to manually check 5 more boxes to get a truly full research. Most admins would assume "Full Research" means all departments, and would never notice that Finance, HR, Customer Success, Sales, and AI-Dev are not running.

This means that financial analysis (ROI, break-even, cost-benefit), HR capacity analysis, customer impact assessment, sales viability, and the critical AI-Dev translation layer may all be missing from "full" research sessions.

**The fix:** Update the default template in `seed-nexus-settings.mjs` to include all 14 departments: `['ceo', 'cto', 'cpo', 'rd', 'design', 'product', 'security', 'legal', 'marketing', 'finance', 'hr', 'cs', 'sales', 'ai-dev']`. Also run a migration to fix any existing templates in the database.

**Verification:** After fixing, create a new brief using the default template. All 14 department checkboxes should be pre-selected.

---

### Defect #5: Index Mismatch in Department Error Mapping

**Severity:** HIGH (Debugging)
**Source:** NEXUS-ENGINEERING-FLOW.md Appendix C, Defect 1
**File:** `server/src/nexusDepartmentAgents.ts`

**What's broken:** In `runAllDepartmentAgents`, the code filters departments to only active ones (`activeDepts`), then maps over them with `Promise.allSettled`. When a promise is rejected, the error handler uses `departments[i]` (the original unfiltered array) instead of `activeDepts[i]` (the filtered array) to identify which department failed.

**What this means in practice:** If inactive departments are filtered out, the indices no longer match. For example, if department index 2 (finance) is inactive and filtered out, and department index 3 (CTO) fails, the error will be attributed to department index 3 in the original array — which might be a different department than what actually failed. This makes debugging department failures unreliable.

**The fix:** Change `departments[i]` to `activeDepts[i]` in the error mapping within the `Promise.allSettled` results handler.

**Verification:** Temporarily make a department always fail (throw in its handler), verify the error message identifies the correct department.

---

### Defect #6: gatherProjectData Signature Mismatch

**Severity:** HIGH (Broken Codebase Scan)
**Source:** NEXUS-ENGINEERING-FLOW.md Appendix C, Defect 2
**File:** `server/src/nexusBriefOrchestrator.ts`

**What's broken:** The orchestrator calls `gatherProjectData({ depth, scope })` passing a single object argument. But the function signature is `gatherProjectData(depth: Depth, scope: Scope, opts?: GatherOptions)` — it expects positional arguments, not an object.

**What this means in practice:** The `depth` parameter receives the object `{ depth, scope }` instead of the depth string. The `scope` parameter receives `undefined`. The function likely falls through to defaults or produces unexpected results. This means the codebase context injected into department prompts may be incorrect, incomplete, or entirely empty — defeating the purpose of the codebase scan.

**The fix:** Change the call from `gatherProjectData({ depth, scope })` to `gatherProjectData(depth, scope)`.

**Verification:** After fixing, run a brief with depth='full' and scope='server'. Check the SSE `codebase_ready` event — it should show a meaningful lines count, not 0 or undefined.

---

### Defect #7: Skill Taxonomy Mismatch

**Severity:** HIGH (Prompt/Extract Misalignment)
**Source:** Strategic Audit
**Files:** `scripts/seed-nexus-settings.mjs`, `server/src/nexusTaskExtractor.ts`

**What's broken:** The skills seeded into `nexus_skills` (which are injected into department prompts) use different names than the skill tags the EXTRACT_SYSTEM_PROMPT expects in extracted tasks. For example: the seed creates a skill named `'node-express'` but the extraction prompt expects `'nodejs'`. The seed has `'ai-llm'` but extraction expects `'ai-integration'`. Several skills in the extraction prompt (`'legal-review'`, `'api-design'`, `'mobile'`) don't exist in the seed at all.

**What this means in practice:** When departments see the skills list in their prompt, they reference skill names like `'node-express'` and `'ai-llm'`. When the AI extracts tasks and assigns skill tags, it uses the names from the EXTRACT_SYSTEM_PROMPT: `'nodejs'`, `'ai-integration'`. The result is that extracted tasks have skill tags that don't match any skill in the database, making skill-based filtering and assignment unreliable.

**The fix:** Align the skill names in the seed with the expected tags in the EXTRACT_SYSTEM_PROMPT. Either update the seed to match the extraction prompt's expected values, or update the extraction prompt to use the seed's names. The goal is a single consistent taxonomy.

**Verification:** After fixing, extract tasks from a brief and check that every skillTag on every task matches an existing entry in `nexus_skills`.

---

### Defect #8: Q&A manual_only Questions Have No UI

**Severity:** HIGH (Silent Missing Data)
**Source:** Strategic Audit
**File:** `client/src/admin/pages/AdminNexusBrief.tsx` (Step 7 UI)

**What's broken:** Of the 74 question templates, 11 are defined with `answer_strategy = 'manual_only'`, meaning they require a human admin to provide the answer. The `autoAnswerQuestions` function correctly skips these questions (it only handles `codebase_scan`, `ai_research`, and `perplexity`). However, there is no UI element in the Wizard's Step 7 that highlights these questions to the admin or provides a text input for manual answers.

**What this means in practice:** These 11 questions — likely the most critical ones that require human judgment (e.g., business strategy decisions, regulatory interpretations, partnership considerations) — are generated but never answered. When departments run, their Q&A context block is missing the answers to these critical questions. The admin never even knows these questions exist or need answering.

**The fix:** In the Step 7 UI (AdminNexusBrief.tsx), add a visual section for `manual_only` questions with: a clear label ("Requires Admin Input"), a text input for each question, and a save button that updates the answer in `nexus_brief_questions`.

**Verification:** After fixing, generate questions for a brief. The manual_only questions should appear with input fields. Fill one in, launch research, and verify the answer appears in the Q&A context of the relevant department's prompt.

---

## MEDIUM Defects — Fix Next Sprint

### Defect #9: Reddit Missing 5 Department Subreddits

**Severity:** MEDIUM (Incomplete Web Intelligence)
**Source:** Strategic Audit
**File:** `server/src/nexusWebIntelligence.ts`

**What's broken:** The `DEPT_REDDIT_SUBREDDITS` mapping only covers CEO, CTO, R&D, Design, Security, Marketing, and Legal. Five departments have no Reddit coverage: Finance, HR, Customer Success, Sales, and AI-Dev. Additionally, `fetchDeptRedditSources` only searches the first subreddit for each department, even when multiple are configured.

**What this means in practice:** When web intelligence runs, Reddit community insights are only gathered for 7-9 departments. Finance, HR, CS, Sales, and AI-Dev receive no Reddit data in their prompts. This limits the diversity of community perspectives available to these departments.

**The fix:** Add subreddit mappings for the 5 missing departments. For example: Finance → `['fintech', 'startups']`, HR → `['humanresources', 'recruiting']`, CS → `['CustomerSuccess', 'SaaS']`, Sales → `['sales', 'B2Bsales']`, AI-Dev → `['MachineLearning', 'LocalLLaMA']`. Also consider searching multiple subreddits per department, not just the first.

---

### Defect #10: AI-Dev Does Not Receive Q&A Context

**Severity:** MEDIUM (Incomplete Synthesis)
**Source:** Strategic Audit
**File:** `server/src/nexusDepartmentAgents.ts` (runAIDevTranslation function)

**What's broken:** The AI-Dev meta-translator, which runs last and synthesizes all department outputs into a development brief, does not call `getQAContextForDepartment()`, does not receive department knowledge from `loadDeptKnowledge()`, and does not receive the skills taxonomy. It only receives: the idea prompt, department outputs, and codebase context.

**What this means in practice:** If the admin provided critical answers during the Q&A step (Step 7) — for example, "we already have a payment integration with Stripe" or "this feature must support offline mode" — the AI-Dev translator never sees these answers. Its development brief may therefore contradict or ignore important constraints that were explicitly documented.

**The fix:** Pass Q&A context (all departments, not just ai-dev) and skills taxonomy to the `runAIDevTranslation` function, and include them in the AI-Dev prompt.

---

### Defect #11: assembleBrief Has Static Summary

**Severity:** MEDIUM (Quality)
**Source:** Strategic Audit
**File:** `server/src/nexusBriefOrchestrator.ts` (assembleBrief function, lines 155-165)

**What's broken:** The "Summary and Development Recommendations" section at the end of every assembled brief is hardcoded static text. It says generic instructions like "Review department findings" and "Click Approve to proceed." It does not synthesize the actual research findings.

**What this means in practice:** Every brief ends with the same boilerplate text regardless of what the research found. There is no cross-department synthesis that highlights: where departments agree, where they conflict, what the key risks are, or what the recommended priority should be. The admin must read all 14 department outputs individually to form their own synthesis.

**The fix:** After the AI-Dev translation step, add an additional AI call that generates a genuine executive summary based on all department outputs. This summary should highlight: consensus points, conflicts, key risks, and recommended next steps.

---

### Defect #12: docReferences Not Per-Task

**Severity:** MEDIUM (Prompt Noise)
**Source:** NEXUS-ENGINEERING-FLOW.md Appendix C, Defect 6
**File:** `server/src/nexusTaskExtractor.ts` (activateSprintTasks function)

**What's broken:** When sprint tasks are activated and `nexus_context` is built for each dev_task, the `docReferences` field receives ALL generated documents for the entire brief — not just the documents relevant to that specific task. Every task gets references to the PRD, ERD, Blueprint, CI/CD, Design, Security, Marketing, and Legal documents regardless of whether they're relevant.

**What this means in practice:** When Claude Code picks up a CSS styling task, its `nexus_context` includes references to the Marketing GTM strategy and Legal compliance analysis. This adds noise to the prompt and may cause the AI to consider irrelevant information. For tasks with nexus_context injected into the description, this means longer prompts with lower signal-to-noise ratio.

**The fix:** Filter docReferences based on the task's `sourceDepartment` and `category`. A design task should get Design and PRD references. A security task should get Security and Blueprint references. A database task should get ERD and Blueprint references.

---

### Defect #13: Rules Engine Not Connected to Pipeline

**Severity:** MEDIUM (Feature Incomplete)
**Source:** NEXUS-ENGINEERING-FLOW.md Appendix C, Defect 5
**Files:** `server/src/nexusAdminRoutes.ts`, `server/src/nexusBriefOrchestrator.ts`, `server/src/nexusTaskExtractor.ts`

**What's broken:** The Rules Engine has a complete CRUD interface (create, read, update, delete rules) and the database table (`nexus_rules`) is well-designed with trigger types, conditions, actions, and priorities. However, the actual trigger evaluation is not connected to the pipeline. When a brief is approved, no code checks the rules table for `trigger_type = 'brief_approved'`. When research completes, no code checks for `trigger_type = 'research_done'`.

**What this means in practice:** Admins can create rules like "When a brief is approved, automatically extract up to 15 tasks" — but the rule sits inert in the database. The automation never fires. The admin must manually click "Extract Tasks" every time, defeating the purpose of the rules engine.

**The fix:** Create a `evaluateRules(triggerType, briefId)` function that:
1. Queries active rules matching the trigger type
2. Evaluates condition_json against the brief
3. Executes the action (auto_extract_tasks, notify_admin, auto_create_sprint, webhook, audit_log)
4. Calls this function at the appropriate pipeline points:
   - After status change to 'approved' → evaluate 'brief_approved' rules
   - After status change to 'review' → evaluate 'research_done' rules
   - After task extraction → evaluate 'task_created' rules
   - After sprint creation → evaluate 'sprint_created' rules

---

### Defect #14: No CLAUDE.md at Project Root

**Severity:** MEDIUM (Developer Experience)
**Source:** Strategic Audit
**File:** New file: `CLAUDE.md` at project root

**What's broken:** When an admin clicks "Start Dev" on a task and pastes the prompt into Claude Code, the AI has no project-level context beyond what's in the task prompt. The `formatTaskForAI` function includes design system rules and a bot-move curl command, but it does not include: project identity, overall architecture, database schema summary, existing patterns and conventions, key file paths, or DO/DON'T rules.

A `docs/nexus/project-identity.md` file exists with good content, but it is not referenced by the task prompt formatter and is not in the standard CLAUDE.md location that Claude Code automatically reads.

**What this means in practice:** Claude Code starts each task without understanding the broader project context. It may: duplicate existing utilities, use inconsistent naming patterns, create files in wrong locations, or violate unwritten conventions. The task prompt provides task-specific context but not project-level context.

**The fix:** Create a `CLAUDE.md` file at the project root containing: project identity (MemorAid healthcare SaaS), stack summary, key file paths, database schema highlights, naming conventions, DO/DON'T rules, and references to design system and admin theme rules. The existing `docs/nexus/project-identity.md` can serve as the starting point.

---

## Systemic Gaps (Not Bugs — Architecture Needs)

These are not bugs in existing code but missing capabilities identified across all analyses:

### Gap A: Closed Feedback Loop (Claude Code → NEXUS)

Currently the flow is one-directional: NEXUS → tasks → Claude Code → bot-move to Done. There is no mechanism for Claude Code to report back: which files it changed, whether tests passed, whether the build succeeded, what errors it encountered, or what it learned during implementation. This feedback would dramatically improve NEXUS's ability to generate better tasks over time.

### Gap B: Governance State Machine

The current status lifecycle is: draft → researching → review → approved → in_progress → done. Missing states include: qa (quality assurance after implementation), staging (pre-production verification), production (deployed), and monitoring (post-deployment observation). Without these states, there is no formal process to ensure implemented features are tested and verified before reaching users.

### Gap C: Cost Governance

There are no budget guardrails. A full 13-department research costs $15-25 per run. If an admin runs 20 briefs in a day, the cost is $300-500 with no warning or cap. The system needs: per-brief cost limits, daily/monthly budget caps, cost alerts, and approval workflows for expensive research configurations.

### Gap D: Per-Agent Deep Research via N8N

This is the vision described by the project owner: instead of generic web intelligence shared by all departments, each department should have its own N8N research workflow that gathers sources specific to its expertise. The CISO should search CVE databases, the CTO should analyze architecture patterns, the R&D should check npm registry health, the Design should search UX pattern libraries. Currently all departments receive the same web intelligence. The N8N bridge code exists but the workflows themselves are not built.

### Gap E: QA Automation Layer

After Claude Code completes a task, there is no automated quality assurance. Ideally: tests should auto-run, acceptance criteria should be validated, code coverage should be checked, and QA results should feed back into the sprint metrics.

### Gap F: Production Telemetry Dashboard

There is no dashboard for: failed research runs, department failure rates, provider fallback percentages, average tokens per department, cost trends over time, or anomaly detection.

---

## Fix Roadmap — Execution Order

### Phase 1: STABILIZE (This Week)

These fixes prevent data loss, security issues, and silent failures.

| Priority | Defect | Effort | Impact |
|----------|--------|--------|--------|
| P0 | #1 Auth bypass | 15 min | Closes security hole |
| P0 | #2 rnd→rd naming | 20 min | R&D gets its knowledge |
| P0 | #3 Status done/completed | 30 min | All depts found by extraction |
| P0 | #6 Signature mismatch | 5 min | Codebase scan works correctly |
| P0 | #5 Index mismatch | 10 min | Error attribution correct |
| P1 | #4 Template missing depts | 10 min | Full Research = all 14 |
| P1 | #7 Skill taxonomy | 30 min | Seeds match extraction |
| P1 | #14 CLAUDE.md | 45 min | Claude Code knows the project |

**Total Phase 1: ~3 hours**

### Phase 2: QUALITY (Next Week)

These fixes improve research quality and prompt accuracy.

| Priority | Defect | Effort | Impact |
|----------|--------|--------|--------|
| P1 | #8 manual_only UI | 2 hrs | Admin answers critical Q's |
| P1 | #9 Reddit 5 depts | 30 min | All depts get Reddit intel |
| P1 | #10 AI-Dev Q&A context | 1 hr | Better dev brief |
| P1 | #11 Static summary | 2 hrs | AI-generated synthesis |
| P1 | #12 docRefs per-task | 1 hr | Focused task context |

**Total Phase 2: ~7 hours**

### Phase 3: AUTOMATION (Week 3)

These fixes enable the automation layer.

| Priority | Defect | Effort | Impact |
|----------|--------|--------|--------|
| P2 | #13 Rules Engine | 4 hrs | Auto-extract, auto-sprint |
| P2 | Gap C: Cost governance | 3 hrs | Budget protection |
| P2 | Gap F: Telemetry | 4 hrs | Operational visibility |

**Total Phase 3: ~11 hours**

### Phase 4: EXPANSION (Month 2)

These are the architectural enhancements.

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| P3 | Gap A: Feedback loop | 8 hrs | Claude → NEXUS learning |
| P3 | Gap B: Governance states | 6 hrs | Full lifecycle |
| P3 | Gap D: Per-agent N8N | 16 hrs | Deep per-dept research |
| P3 | Gap E: QA automation | 8 hrs | Auto-test after dev |

**Total Phase 4: ~38 hours**

---

## Verification Checklist

After each phase, verify:

### After Phase 1:
- [ ] Unauthenticated POST to /nexus/dept-knowledge returns 401
- [ ] `loadDeptKnowledge('rd')` returns entries (not empty)
- [ ] Grep for `status = 'done'` in NEXUS files returns 0 matches
- [ ] gatherProjectData called with positional args
- [ ] Default template includes all 14 departments
- [ ] Skill names in seed match EXTRACT_SYSTEM_PROMPT
- [ ] CLAUDE.md exists at project root

### After Phase 2:
- [ ] Step 7 shows manual_only questions with input fields
- [ ] All 14 departments have Reddit subreddits
- [ ] AI-Dev prompt includes Q&A context
- [ ] Brief ends with AI-generated summary (not boilerplate)
- [ ] Task nexus_context.docReferences filtered by relevance

### After Phase 3:
- [ ] Create rule "on approved → auto extract" → approve a brief → tasks appear automatically
- [ ] Set daily budget cap → exceed it → get warning
- [ ] Telemetry dashboard shows department success/fail rates

---

## Files Reference

| File | Defects Addressed |
|------|-------------------|
| `server/src/nexusSettingsRoutes.ts` | #1 (auth) |
| `server/src/index.ts` | #2 (rnd seed) |
| `server/src/nexusDepartmentAgents.ts` | #3 (status), #5 (index), #10 (AI-Dev Q&A) |
| `server/src/nexusBriefOrchestrator.ts` | #6 (signature), #11 (summary) |
| `server/src/nexusTaskExtractor.ts` | #3 (status), #7 (skills), #12 (docRefs) |
| `scripts/seed-nexus-settings.mjs` | #4 (template), #7 (skills) |
| `server/src/nexusWebIntelligence.ts` | #9 (Reddit) |
| `client/src/admin/pages/AdminNexusBrief.tsx` | #8 (manual_only UI) |
| `server/src/nexusAdminRoutes.ts` | #13 (Rules Engine) |
| `CLAUDE.md` (new) | #14 |

---

## Cross-References

This document is part of the NEXUS documentation suite:

| Document | Focus |
|----------|-------|
| **NEXUS-GAPS-AND-ROADMAP.md** (this file) | All defects + fix roadmap |
| **NEXUS-ENGINEERING-FLOW.md** | Step-by-step code trace (1630 lines) |
| **NEXUS-BLUEPRINT.md** | Architecture overview |
| **NEXUS-DEEP-DIVE.md** | Narrative A-Z |
| **NEXUS-DEPARTMENTS-AND-PROMPTS.md** | System prompts + prompt construction |
| **NEXUS-ENCYCLOPEDIA-PART1.md** | Pipeline, departments, web intelligence |
| **NEXUS-ENCYCLOPEDIA-PART2.md** | Teams, tasks, sprints, bridge |
| **NEXUS-AUTOMATION-SECURITY-OPS.md** | Automations, N8N, security, cost |
| **NEXUS-DATABASE-COMPLETE.md** | Every table and field |
| **NEXUS-ADMIN-PANEL-GUIDE.md** | Every UI screen documented |

---

> **This document should be updated as defects are fixed. Mark each defect as FIXED with the date and commit reference.**
