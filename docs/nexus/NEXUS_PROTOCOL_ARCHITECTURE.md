# NEXUS Operating Protocols — Architecture Specification

**Version:** 1.0
**Date:** 2026-04-03
**Status:** Foundation Document

---

## Overview

NEXUS operates through a multi-round meeting model. Each round involves specific organizational participants, governed by strict protocols that define what each agent must do, must not do, what format to return, and how data flows between rounds.

### Meeting Rounds

| Round | Name | Participants | Purpose |
|-------|------|-------------|---------|
| 0 | Intake | System | Normalize request into structured brief |
| 1 | Senior Leadership | C-Level (level=clevel) | Strategic assessment |
| 1.5 | Executive Synthesis | System | Merge Round 1 findings |
| 2 | Team Leads | Managers (level=manager) | Tactical breakdown |
| 2.5 | Technical Synthesis | System | Merge Round 2 findings |
| 3 | Individual Research | Senior+Member+Junior | Implementation details |
| 3.5 | Final Synthesis | System | Merge all into sprint-ready spec |
| 4 | Sprint Generation | System | Create sprints and tasks |
| 5 | Development Handoff | System | Package for Claude Code / Cursor |

---

## Protocol 1: NIP — Nexus Intake Protocol

### Purpose
Transform a free-form admin request into a normalized, structured brief that all subsequent rounds can consume reliably.

### Trigger
Admin clicks "Create Brief" and enters an idea prompt.

### Required Inputs
| Field | Required | Source |
|-------|----------|--------|
| `idea_prompt` | YES | Admin input |
| `selected_departments` | YES | Admin selection (at least 1) |
| `codebase_depth` | YES | Admin selection (quick/deep/full) |
| `codebase_scope` | YES | Admin selection (all/client/server) |
| `target_platforms` | NO | Admin selection |
| `context_notes` | NO | Admin free text |
| `attached_documents` | NO | File uploads |

### Process
1. **Validate** — all required fields present
2. **Codebase Scan** — run `gatherProjectData()` at selected depth
3. **Normalize** — AI extracts structured problem statement from free-form input
4. **Question Discovery** — generate questions per selected department
5. **Auto-Answer** — answer what can be answered from codebase + AI + Perplexity
6. **Gap Identification** — flag unanswered questions for admin

### Output Schema: `normalized_brief`
```json
{
  "id": "uuid",
  "problem_statement": "Structured problem description in Hebrew",
  "scope": {
    "affected_areas": ["admin-frontend", "server", "database"],
    "out_of_scope": ["mobile", "billing"],
    "environments": ["user-frontend", "admin-frontend"]
  },
  "existing_context": {
    "codebase_summary": "File tree + key patterns (from scan)",
    "architecture_notes": "Express + React + PostgreSQL + Drizzle",
    "known_constraints": [
      "Hebrew RTL first",
      "Tailwind CSS only, no inline styles",
      "shadcn/ui components",
      "callAI() for all LLM calls"
    ],
    "current_dependencies": ["react@18", "drizzle-orm", "express"]
  },
  "success_criteria": ["Menu load time < 200ms", "Accessibility WCAG AA"],
  "admin_directives": ["Focus on navigation UX", "Consider elderly users"],
  "question_gaps": [
    { "department": "design", "question": "What is the current menu structure?", "status": "unanswered" }
  ],
  "attached_docs": []
}
```

### Validation Rules
- Cannot proceed to Round 1 without at least 1 department selected
- Cannot proceed without codebase scan completed
- Unanswered critical questions (priority=0) block research start — admin must answer or skip

---

## Protocol 2: ERP — Executive Research Protocol

### Purpose
Govern Round 1 — Senior Leadership Meeting. C-Level executives assess the request from their strategic domain.

### Participants
Only employees with `level = 'clevel'` in selected departments.

### Per-Participant Mission

| Role | Mission | Must Assess | Must NOT Do |
|------|---------|-------------|-------------|
| CEO | Business viability, market fit, ROI | Market opportunity, competitive risk, resource justification | Recommend specific technologies |
| CTO | Technical feasibility, architecture impact | Stack compatibility, scale implications, technical debt risk | Make business decisions |
| CPO | Product strategy, user impact | User personas affected, feature priority, UX risk | Write code or specs |
| CISO | Security and compliance | Threat vectors, data privacy, regulatory requirements | Approve budgets |
| CFO | Financial viability | Cost-benefit, break-even, budget impact | Make product decisions |
| CMO | Market positioning, GTM impact | Channel strategy, positioning, competitive messaging | Make technical decisions |
| COO | Operational impact | Process changes, team capacity, timeline realism | Override strategic direction |

### What Each Executive Receives
1. **Canonical Context** — normalized brief + codebase summary + known constraints
2. **Persona Context** — their full CV profile (bio, skills, methodology, domain expertise, certifications)
3. **Web Research** — sources relevant to their domain (fetched per-employee using their skills)
4. **Department Knowledge** — from `nexus_dept_knowledge` table
5. **Q&A Context** — relevant questions + auto-answers from Question Discovery

### Required Output Schema: `executive_finding`
```json
{
  "participant": {
    "id": "team_member_uuid",
    "name": "CEO",
    "role_he": "מנכ\"ל",
    "department": "ceo",
    "level": "clevel"
  },
  "strategic_assessment": "Hebrew markdown — 200-500 words",
  "recommendation": "proceed | proceed_with_caution | investigate_further | reject",
  "confidence_score": 4,
  "risks": [
    {
      "description": "Risk description",
      "severity": "critical | high | medium | low",
      "probability": "high | medium | low",
      "impact_area": "business | technical | legal | financial | operational",
      "mitigation": "Suggested mitigation",
      "source": "URL or 'professional judgment'"
    }
  ],
  "opportunities": [
    { "description": "...", "potential_impact": "...", "confidence": 3 }
  ],
  "constraints_identified": [
    "Cannot change auth system without migration",
    "Must maintain Hebrew RTL support"
  ],
  "questions_for_next_round": [
    { "target_department": "cto", "question": "Is the current DB schema compatible?" }
  ],
  "known_unknowns": [
    "Cannot determine user adoption rate without A/B test data"
  ],
  "compatibility_with_existing": {
    "score": "compatible | needs_adaptation | breaking",
    "affected_areas": ["navigation", "admin layout"],
    "concerns": ["Current menu relies on nested routes"]
  },
  "key_metrics": {
    "okrs": ["Reduce menu navigation time by 40%"],
    "kpis": ["Menu click depth < 3", "User satisfaction > 4.2/5"]
  },
  "sources": [
    { "url": "https://...", "title": "...", "trust_score": 75, "relevance": "Competitor analysis" }
  ]
}
```

### Forbidden Behaviors (Round 1)
1. **NO implementation details** — no code, no library names, no file paths
2. **NO scope expansion** — stick to what was requested
3. **NO unsourced claims** — every factual statement needs source or "professional judgment" tag
4. **NO confidence without justification** — score must be explained
5. **NO ignoring existing system** — must reference current architecture
6. **NO recommendations without risk assessment**

### Research Rules
- Each executive gets web sources focused on their domain via `fetchEmployeeWebSources()`
- Sources must have trust_score >= 40 to be cited
- Maximum 10 web sources per executive
- Perplexity query must reference the executive's domain expertise

---

## Protocol 3: LSP — Leadership Synthesis Protocol

### Purpose
Merge all Round 1 executive findings into a single unified document. This is the "איחוד מחקרים" button.

### Trigger
Admin clicks "איחוד מחקרים" after reviewing Round 1 results.

### Input
Array of `executive_finding` JSON objects from all Round 1 participants.

### Synthesis Rules

1. **Consensus Detection**
   - If >70% of executives recommend "proceed" → mark as consensus
   - If mixed → flag as "requires discussion"
   - If >50% recommend "reject" or "investigate_further" → flag as "high risk"

2. **Conflict Handling**
   - Contradictory positions are preserved, not resolved
   - Each conflict includes: topic, positions[], recommendation
   - Admin sees conflicts explicitly and can resolve manually

3. **Dissent Preservation**
   - Minority opinions are kept in a dedicated section
   - Never deleted or summarized away

4. **Risk Aggregation**
   - All risks from all executives merged into single register
   - Deduplication by description similarity
   - Highest severity wins for duplicates

5. **Gap Analysis**
   - Questions raised by executives → forwarded to Round 2
   - Known unknowns aggregated
   - Missing department perspectives identified

### Output Schema: `executive_synthesis`
```json
{
  "brief_id": "uuid",
  "round": 1,
  "approved_problem_statement": "Refined and approved by leadership",
  "strategic_direction": "Agreed direction in Hebrew — what to do and why",
  "overall_recommendation": "proceed | proceed_with_caution | investigate_further | reject",
  "consensus_score": 0.85,
  "consensus_items": [
    { "topic": "Menu simplification needed", "agreement_level": 0.92, "details": "..." }
  ],
  "conflicts": [
    {
      "topic": "Timeline feasibility",
      "positions": [
        { "participant": "CEO", "position": "Can be done in 2 sprints" },
        { "participant": "CTO", "position": "Needs 4 sprints minimum" }
      ],
      "recommendation": "Admin to decide — CTO estimate is more conservative"
    }
  ],
  "risk_register": [
    { "id": "R1", "description": "...", "severity": "high", "owner": "cto", "mitigation": "..." }
  ],
  "open_questions_for_round2": [
    { "id": "Q1", "question": "...", "target": "design", "priority": "high" }
  ],
  "constraints": ["Must not break existing navigation", "RTL mandatory"],
  "success_metrics": { "okrs": [], "kpis": [] },
  "budget_envelope": {
    "estimated_hours_min": 40,
    "estimated_hours_max": 80,
    "estimated_cost_min": "$800",
    "estimated_cost_max": "$1600"
  },
  "dissent_log": [
    { "participant": "CFO", "position": "ROI unclear, recommends smaller scope first" }
  ]
}
```

### Forbidden Behaviors (Synthesis)
1. **NO opinion insertion** — synthesizer does not add its own views
2. **NO conflict resolution** — flag only, admin decides
3. **NO data loss** — every risk, question, constraint from any executive must appear
4. **NO score inflation** — consensus_score must reflect actual agreement

---

## Protocol 4: TBP — Technical Breakdown Protocol

### Purpose
Govern Round 2 — Team Leads Meeting. Managers translate strategic direction into tactical, technical plans.

### Participants
Only employees with `level = 'manager'` in selected departments.

### What Each Manager Receives
1. **Canonical Context** — same as Round 1
2. **Round 1 Synthesis** — `executive_synthesis` output (strategic direction, constraints, open questions)
3. **Persona Context** — their full profile
4. **Web Research** — sources focused on their technical domain
5. **Open Questions** — questions targeted at their department from Round 1

### Per-Manager Mission

| Role | Mission |
|------|---------|
| Engineering Manager | Estimate effort, identify affected codepaths, propose implementation approach |
| Design Lead | Define UX approach, component changes, accessibility impact |
| R&D Director | Evaluate tools/libraries, POC feasibility, research findings |
| Head of Product | Define user stories, acceptance criteria, feature scope |
| QA Lead | Define test strategy, regression risks, quality gates |
| DevOps Lead | Infrastructure changes, deployment strategy, CI/CD impact |

### Required Output Schema: `technical_finding`
```json
{
  "participant": { "id": "uuid", "name": "...", "role_he": "...", "department": "..." },
  "executive_directive_response": "How this dept addresses the strategic direction",
  "affected_systems": [
    { "system": "admin-sidebar", "files": ["AdminLayout.tsx", "adminNavConfig.ts"], "change_type": "modify" }
  ],
  "proposed_approach": "Hebrew markdown — technical approach description",
  "dependencies": [
    { "on": "design-system-update", "type": "blocking | non-blocking", "owner": "design", "risk": "..." }
  ],
  "breaking_changes": [
    { "what": "Nav structure change", "migration_plan": "Gradual rollout with feature flag", "rollback": "Revert nav config" }
  ],
  "tools_evaluated": [
    { "name": "react-navigation", "verdict": "adopt | trial | reject", "reason": "...", "source": "..." }
  ],
  "estimate": {
    "hours_min": 16,
    "hours_max": 32,
    "confidence": "medium",
    "assumptions": ["Design approved before dev starts", "No DB schema changes"]
  },
  "risks": [],
  "known_unknowns": [],
  "compatibility_report": {
    "files_affected": ["AdminLayout.tsx", "adminNavConfig.ts", "AdminShell.tsx"],
    "safe": true,
    "concerns": ["Sidebar width change may affect content area"],
    "existing_patterns_to_preserve": ["RTL direction", "admin-theme CSS variables"]
  },
  "open_questions_answered": [
    { "question_id": "Q1", "answer": "...", "confidence": 4 }
  ]
}
```

### Forbidden Behaviors (Round 2)
1. **NO strategic pivots** — Round 1 decided direction, Round 2 executes
2. **NO scope creep** — cannot add features beyond brief scope
3. **NO proposals without compatibility check** — must verify against existing code
4. **NO breaking changes without migration plan** — every breaking change needs rollback strategy
5. **NO duplicate libraries** — if project uses library X, cannot propose library Y for same purpose
6. **NO estimates without confidence level** — ranges only, no single numbers

---

## Protocol 5: IPP — Implementation Planning Protocol

### Purpose
Govern Round 3 (Individual employees) and Sprint/Task generation.

### Participants
All remaining employees: `level IN ('senior', 'member', 'junior')`.

### What Each Employee Receives
1. **Canonical Context** — brief + codebase
2. **Round 1 Synthesis** — strategic direction
3. **Round 2 Synthesis** — technical specification
4. **Persona Context** — their specific profile, skills, methodology
5. **Assigned Focus Area** — subset of the technical spec relevant to their role

### Per-Employee Output: `implementation_detail`
```json
{
  "participant": { "id": "uuid", "name": "...", "role_he": "...", "department": "...", "level": "senior" },
  "focus_area": "Frontend navigation restructure",
  "implementation_steps": [
    {
      "step": 1,
      "description": "Refactor adminNavConfig.ts to flat structure",
      "files": ["client/src/admin/adminNavConfig.ts"],
      "estimated_hours": 3,
      "depends_on": [],
      "acceptance_criteria": ["All nav items accessible", "No broken links", "RTL preserved"]
    }
  ],
  "code_recommendations": [
    { "pattern": "Use existing AdminBreadcrumbs component", "reason": "Already handles nested routes" }
  ],
  "do_not_break": [
    { "file": "AdminLayout.tsx", "function": "sidebar rendering", "reason": "Other features depend on it" }
  ],
  "test_requirements": [
    { "type": "unit", "description": "Test nav config generates correct routes" },
    { "type": "e2e", "description": "Verify all admin pages reachable" }
  ],
  "sources": []
}
```

### Task Granularity Rules
- Each task: **1-8 hours** (if larger → split)
- **Single responsibility** — one task, one purpose
- **Dependency explicit** — `depends_on` must reference other task IDs
- **Acceptance criteria mandatory** — at least 2 per task
- **Do-not-break list mandatory** — what existing code/behavior must survive

### Sprint Sizing Rules
- Max **40 hours per sprint** (2-week sprint, 4h/day effective AI dev)
- Max **15 tasks per sprint**
- **Priority order**: urgent → high → medium → low
- **Dependency graph must be acyclic** — circular dependencies flagged as error
- Tasks in sprint N cannot depend on tasks in sprint N+1

---

## Protocol 6: DHP — Development Handoff Protocol

### Purpose
Package a task for Claude Code / Cursor execution. The "צא לפיתוח" button.

### 8 Mandatory Prompt Blocks

Every dev handoff prompt must contain exactly these 8 sections:

```markdown
## 1. Who You Are
You are implementing task #{taskId} for MemorAid.

## 2. What Stage
Sprint {N}, Task {M}/{total}. Previous tasks: [list completed].

## 3. What The Project Is
{project_blueprint summary — tech stack, architecture, conventions}

## 4. What Exists Today
{Relevant file contents, current implementation, dependencies}

## 5. What Is Being Requested
{Task description, acceptance criteria, expected behavior}

## 6. What You Must Research
{External sources to check — npm packages, API docs, patterns}

## 7. What You Must Not Break
{Do-not-break list — files, functions, behaviors, APIs}
{Existing tests that must still pass}

## 8. What Exact Output Format
{Files to create/modify, expected structure, commit message format}
```

### Attached Files (per task type)

| Task Category | Required Attachments |
|--------------|---------------------|
| feature | brief.md, blueprint.md, design_spec.md, relevant_component_code |
| bug | brief.md, bug_report.md, relevant_file_code, test_file |
| refactor | brief.md, blueprint.md, current_code, target_architecture |
| security | brief.md, security_assessment.md, threat_model, relevant_code |
| design | brief.md, design_spec.md, component_library_reference |
| infrastructure | brief.md, blueprint.md, ci_cd_config, deployment_notes |

### Handoff Package Format
```
task_{id}/
  README.md          — The 8-block prompt
  context/
    brief.md         — Original brief
    blueprint.md     — Architecture doc
    synthesis.md     — Round synthesis relevant to this task
  code/
    {affected_files}  — Current versions of files to modify
  specs/
    acceptance.md    — Acceptance criteria
    do_not_break.md  — Compatibility checklist
```

---

## Prompt Envelope Specification

Every AI call in NEXUS V2 uses a structured JSON envelope, not free-form text.

### Envelope Structure
```json
{
  "system_role": "You are {role_he} in Round {N} of NEXUS Meeting Mode.",
  "protocol": "ERP | TBP | IPP",
  "protocol_version": "1.0",
  "mission": "Your specific mission statement from the protocol",
  "project_context": {
    "brief": "normalized_brief content",
    "blueprint": "architecture summary",
    "codebase": "file tree + patterns (truncated to 4000 chars)",
    "constraints": ["list of known constraints"]
  },
  "round_context": {
    "round_number": 1,
    "previous_synthesis": null,
    "open_questions": [],
    "decided_constraints": []
  },
  "persona_context": {
    "name": "Employee name",
    "role": "role_he",
    "level": "clevel | manager | senior | member",
    "department": "cto",
    "bio": "Professional bio",
    "skills": ["TypeScript", "React"],
    "domain_expertise": ["Cloud Architecture", "Performance"],
    "methodology": "ADR-driven, TDD",
    "certifications": ["AWS SA Pro"],
    "personality": "Analytical, methodical",
    "trusted_sources": ["from dept_knowledge"],
    "model_preference": "claude-sonnet-4-6"
  },
  "web_research": [
    { "source_type": "github", "url": "...", "title": "...", "trust_score": 75 }
  ],
  "rules": [
    "MUST NOT propose breaking changes without migration plan",
    "MUST include confidence score for every recommendation",
    "MUST cite sources for factual claims",
    "MUST list known unknowns"
  ],
  "required_output_schema": "executive_finding | technical_finding | implementation_detail",
  "forbidden_behaviors": [
    "Do not recommend technologies outside the existing stack without justification",
    "Do not ignore existing patterns",
    "Do not expand scope beyond the brief"
  ],
  "success_criteria": [
    "All required output fields populated",
    "Compatibility checked against existing code",
    "Risks assessed with severity and mitigation"
  ]
}
```

### Context Layer Tiers

**Always included (Layer 1 — Canonical):**
- `normalized_brief` — the request
- `codebase_summary` — file tree + key patterns (max 4000 chars)
- `known_constraints` — from CLAUDE.md + admin notes

**Included from Round 2+ (Layer 2 — Round Context):**
- `executive_synthesis` — Round 1 merged output
- `technical_synthesis` — Round 2 merged output (Round 3 only)
- `open_questions` — unresolved items from previous rounds

**Always included (Layer 3 — Persona):**
- Full employee profile from `nexus_dept_team_members`
- Department knowledge from `nexus_dept_knowledge`
- Per-employee web research results

---

## Rules Engine — Mandatory Rules

### Universal Rules (all rounds)

| ID | Rule | Enforcement |
|----|------|-------------|
| R01 | `REQUIRE_CONFIDENCE` | Every recommendation needs confidence 1-5 |
| R02 | `REQUIRE_SOURCES` | Factual claims need URL or "professional judgment" |
| R03 | `MARK_UNKNOWNS` | Must list what couldn't be determined |
| R04 | `COMPATIBILITY_CHECK` | Must assess impact on existing system |
| R05 | `NO_UNSUPPORTED_CLAIMS` | No claims without evidence or reasoning |

### Round-Specific Rules

| ID | Rule | Rounds | Enforcement |
|----|------|--------|-------------|
| R10 | `NO_IMPLEMENTATION_IN_STRATEGY` | Round 1 | C-levels must not include code/libraries |
| R11 | `NO_STRATEGIC_PIVOT` | Round 2, 3 | Cannot override Round 1 direction |
| R12 | `NO_SCOPE_CREEP` | Round 2, 3 | Cannot add features beyond brief |
| R13 | `NO_BREAK_WITHOUT_MIGRATION` | Round 2, 3 | Breaking changes need migration plan |
| R14 | `NO_DUPLICATE_LIBRARY` | Round 2, 3 | Cannot propose library if equivalent exists |
| R15 | `SINGLE_RESPONSIBILITY_TASKS` | Round 3 | One task = one purpose |
| R16 | `DEPENDENCY_ORDER` | Round 3 | Tasks must declare dependencies |
| R17 | `TASK_SIZE_LIMIT` | Round 3 | 1-8 hours per task |

---

## Handoff Contracts

### Brief → Round 1
```
Input:  normalized_brief
Output: Array<executive_finding>
Contract:
  - Every selected department's C-level MUST participate
  - Every finding MUST have recommendation field
  - Every finding MUST have at least 1 risk
  - compatibility_with_existing MUST be populated
```

### Round 1 → Synthesis → Round 2
```
Input:  Array<executive_finding>
Output: executive_synthesis
Contract:
  - ALL risks from ALL executives present in risk_register
  - Conflicts flagged, NOT resolved
  - open_questions forwarded to Round 2
  - Dissent preserved in dissent_log
  - consensus_score reflects actual data
```

### Round 2 → Synthesis → Round 3
```
Input:  Array<technical_finding> + executive_synthesis
Output: technical_synthesis
Contract:
  - Every system in Round 1 scope has a technical owner
  - Breaking changes have migration paths
  - Estimates are ranges, not single numbers
  - All Round 1 open questions addressed or escalated
```

### Round 3 → Sprint Generation
```
Input:  Array<implementation_detail> + executive_synthesis + technical_synthesis
Output: sprints_and_tasks
Contract:
  - Every task traces to a Round 2 technical finding
  - No orphan tasks (tasks without parent finding)
  - Dependency graph is acyclic
  - Sprint total hours <= 40
  - All tasks have acceptance criteria
  - All tasks have do-not-break list
```

---

## Data Flow Diagram

```
Admin Input
    │
    ▼
┌─────────────────┐
│  NIP (Protocol 1)│  ← Intake: normalize brief, scan codebase, Q&A
│  normalized_brief│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ERP (Protocol 2)│  ← Round 1: C-Level executives (parallel)
│  executive_finding│     Each gets: brief + profile + web research
│  × N participants │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LSP (Protocol 3)│  ← Synthesis: merge executive findings
│executive_synthesis│     Consensus, conflicts, risks, open questions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TBP (Protocol 4)│  ← Round 2: Team Leads (parallel)
│ technical_finding │     Each gets: brief + synthesis + profile + research
│  × N participants │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│technical_synthesis│  ← Synthesis: merge technical findings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IPP (Protocol 5)│  ← Round 3: Individual employees (parallel)
│implementation_detail│   Each gets: all syntheses + profile + focus area
│  × N participants │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sprint & Tasks  │  ← Generate sprints from implementation details
│ sprints_and_tasks │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DHP (Protocol 6)│  ← Package each task for Claude Code / Cursor
│  handoff_package │
└─────────────────┘
```
