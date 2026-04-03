# NEXUS BLUEPRINT — Virtual Software House

> Last updated: 2026-04-02
> System: MemorAId Admin Panel
> Stack: TypeScript, React 18, Vite, Tailwind CSS, Express, Drizzle ORM, PostgreSQL

---

## 1. Executive Summary

NEXUS is a **multi-agent AI research orchestration system** — a "Virtual Software House" that takes a product idea and runs it through 14 specialized department agents (CEO, CTO, CPO, R&D, Design, Product, Security, Legal, Marketing, Finance, HR, CS, Sales, plus an AI-Dev meta-translator). Each department analyzes the idea from its professional perspective, producing structured research outputs that are assembled into a comprehensive brief.

### What NEXUS Does
1. Takes a product idea/research prompt as input
2. Gathers web intelligence from GitHub, Reddit, RSS, Perplexity (+ optional N8N automation)
3. Scans the existing codebase for context
4. Runs 13 departments in parallel + 1 sequential translator
5. Assembles a research brief with department-specific outputs
6. Generates specification documents (PRD, ERD, Blueprint, CI/CD, Design, Security, Marketing, Legal)
7. Extracts 20-40 actionable development tasks in Hebrew
8. Creates sprints with AI-estimated task breakdowns
9. Bridges into the Kanban/Dev system for actual implementation

### The Two Environments NEXUS Bridges

```
ADMIN ENVIRONMENT                    DEV ENVIRONMENT
(Research & Strategy)                (Implementation)

AdminNexusHub ──────────────────┐
  Brief creation                │
  Department research           │
  Web intelligence              │
  Document generation           │
  Task extraction ──────────────┼──► Extracted Tasks
  Sprint creation ──────────────┼──► Sprints (planning)
                                │
AdminNexusSettings              │
  Department config             │    Sprint Activation
  Team members / CVs            │         │
  Skills / Rules / Templates    │         ▼
  Web feeds / Knowledge         │    dev_tasks (kanban)
                                │    sprint_tasks (links)
AdminTeamMemberProfile          │    nexus_context (JSON)
  Full CV + prompt engine       │         │
  Contribution tracking         │         ▼
                                │    AdminDevKanban
                                │    AdminDevDashboard
                                │    AdminSprintDetail
                                └──► Claude Code (AI dev)
```

---

## 2. System Architecture — The 7-Step Pipeline

### Pipeline Flow (`nexusBriefOrchestrator.ts`)

```
Step 1: INIT
  └─ Mark brief status = 'researching'
  └─ Clear previous department results + web sources
  └─ Set researchStartedAt timestamp

Step 2: CODEBASE CONTEXT
  └─ gatherProjectData(depth, scope)
  └─ Depth: quick | deep | full
  └─ Scope: all | client | server
  └─ Returns: Markdown-formatted code overview
  └─ Special: [EXISTING_PROJECT] prefix warns agents not to rewrite
  └─ SSE: codebase_ready

Step 3: WEB INTELLIGENCE
  └─ Try N8N first (if configured)
  └─ Fallback: Direct API (Perplexity, GitHub, Reddit, RSS)
  └─ Returns: { synthesizedContext, sources[] }
  └─ Each source gets a trustScore (0-100)
  └─ High-trust sources (>=65) auto-saved to nexus_web_feeds (inactive)
  └─ SSE: web_intelligence_start → web_source_found (per source) → web_intelligence_done

Step 4: DEPARTMENT AGENTS (PARALLEL)
  └─ Load NEXUS config once (deptSettings, skills, teamMembers)
  └─ Filter active departments only
  └─ Run all agents in parallel via Promise.map
  └─ Each agent receives: idea, web intelligence, codebase (4000 chars),
     models, context notes, target platforms, Q&A context
  └─ Save each result to nexus_brief_departments
  └─ SSE per dept: department_start → department_done | department_error

Step 4.5: AI-DEV TRANSLATION (SEQUENTIAL)
  └─ Runs ONLY after all departments complete
  └─ Receives all department outputs
  └─ Generates structured development brief
  └─ Emphasis: layer separation, what exists vs new, dev order, AI risks
  └─ SSE: department_start → department_done

Step 5: BRIEF ASSEMBLY
  └─ assembleBrief() generates Markdown document
  └─ Sections: metadata, executive summary, per-department outputs, recommendations
  └─ generateSmartTitle() creates Hebrew title (3-6 words)
  └─ Update brief: status='review', title, assembledBrief, costs
  └─ SSE: assembly_start → assembly_done

Step 6: LEARNING (NON-BLOCKING)
  └─ learnFromSources() saves high-trust sources to nexus_web_feeds
  └─ Silent failure (best-effort)

Step 7: DONE
  └─ SSE: done { totalCostUsd, totalTokens, durationMs }
  └─ On error: reset brief to 'draft', SSE: error { message, retryable: true }
```

### SSE Events (Real-Time Streaming)

| Event | Data | When |
|-------|------|------|
| `start` | {} | Pipeline begins |
| `codebase_ready` | { linesScanned, depth, scope } | Code scan done |
| `web_intelligence_start` | { query, n8n } | Web research starts |
| `web_source_found` | { sourceType, title, trustScore } | Per source found |
| `web_intelligence_done` | { sourceCount, topSources } | Web research done |
| `department_start` | { department, hebrewName } | Agent starts |
| `department_done` | { department, tokensUsed, costUsd, modelUsed } | Agent done |
| `department_error` | { department, error } | Agent failed |
| `assembly_start` | {} | Brief assembly starts |
| `assembly_done` | { briefId, assembledLength } | Brief ready |
| `done` | { totalCostUsd, totalTokens, durationMs } | Pipeline complete |
| `error` | { message, retryable } | Fatal error |

---

## 3. The 14 Departments

### Hierarchy & Roles

```
C-LEVEL (Strategic)
  ├─ 👔 CEO — Business viability, market opportunity, competitive analysis, risks
  ├─ ⚙️ CTO — Technical feasibility, architecture, tech stack, costs
  └─ 🎯 CPO — User profiles, USP, UX patterns, MoSCoW prioritization, KPIs

MANAGERS (Tactical)
  ├─ 📋 Product — User Stories (Given/When/Then), Acceptance Criteria, Sprint breakdown
  ├─ 💰 Finance (CFO) — Cost-benefit, revenue model, unit economics, Stage-Gate
  └─ 👥 HR — Capacity analysis, human roles needed (PM, QA, DevOps, CS — NOT devs)

SENIOR SPECIALISTS (Domain)
  ├─ 🔬 R&D — Libraries (with Trust Score + pnpm install), POC, TypeScript samples
  ├─ 🎨 Design — UX trends, Design System, WCAG 2.1 AA, RTL, shadcn/ui mapping
  ├─ 🔒 Security — Threat Model, OWASP Top 10, Privacy by Design, GDPR/HIPAA
  ├─ ⚖️ Legal — OSS licenses (GPL=red flag), GDPR processes, ToS, legal risks
  ├─ 📣 Marketing — Competitive analysis, SEO, GTM strategy, distribution channels
  ├─ 🤝 CS — Onboarding impact, churn prevention, NPS, adoption plan
  └─ 💼 Sales — Sales impact, pricing/upsell, objection handling, partnerships

META-TRANSLATOR (Post-Processing)
  └─ 🤖 AI-Dev — Translates ALL department outputs into structured dev brief
                  Architecture diagram, layer separation, dependencies, dev order
```

### Department Output Details

| Dept | Output Sections | Token Limit |
|------|----------------|-------------|
| CEO | Business viability, market opportunity, competitive analysis, business risks | 2000 |
| CTO | Technical feasibility, architecture, tech stack, supporting systems with costs | 2000 |
| CPO | User profile, USP, UX Pattern, MoSCoW prioritization, KPIs | 2000 |
| R&D | Libraries (Trust Score, pnpm install), approaches, POC, TypeScript code | 2000 |
| Design | UX trends 2025, Design System, Component Mapping, WCAG, RTL | 2000 |
| Product | User Stories (Given/When/Then), Acceptance Criteria, Sprint Breakdown | 2000 |
| Security | Threat Model, OWASP, mandatory requirements, Privacy, Compliance | 2000 |
| Legal | OSS licenses, GDPR processes, ToS implications, legal risks | 2000 |
| Marketing | Competitors, Positioning, SEO keywords, GTM, channels | 2000 |
| Finance | Cost-benefit tables, revenue model, unit economics, Stage-Gate, CFO decision | 2000 |
| HR | Capacity Analysis, human roles, team structure, AI dependency risks | 2000 |
| CS | Onboarding impact, churn prevention, feedback, NPS, adoption | 2000 |
| Sales | Sales impact, cycle, pricing, objections, partnerships, conversion | 2000 |
| AI-Dev | Dev summary, architecture diagram, layer separation, dev order, AI risks | 3000 |

### Context Injected Into Every Agent

1. **CLAUDE_CODE_CONTEXT** — AI development model, stack details, environment separation
2. **Codebase Context** — First 4000 chars of project structure
3. **Web Intelligence** — Synthesized findings + top 10 sources (dept-specific first)
4. **Skills** — From nexus_skills table (active only)
5. **Team Members** — Full CVs of dept members (bio, experience, education, skills, methodology)
6. **Context Notes** — Admin-provided constraints/requirements
7. **Target Platforms** — If specified
8. **Department Knowledge** — Custom knowledge base entries (from nexus_dept_knowledge)
9. **Q&A Context** — Previously answered questions for this brief

### Special Injections
- **Design/CPO only**: DESIGN_SYSTEM_RULES — dark mode vars, CSS classes, shadcn/ui components, prohibitions
- **[EXISTING_PROJECT]**: Critical prefix warning agents to work within existing architecture

---

## 4. Virtual Team Members

### How Team Members Work

Each department can have multiple virtual team members. Team members inject their "CV" (expertise, personality, methodology) into the AI agent's prompt, making each department's response contextually richer.

### CV Structure (`nexus_dept_team_members`)

| Field | Type | Purpose | Quality Points |
|-------|------|---------|---------------|
| name | varchar | Full name | - |
| roleEn / roleHe | varchar | Role in both languages | - |
| emoji | varchar | Visual identifier | - |
| level | varchar | clevel / manager / senior / member / junior | - |
| bio | text | Professional biography | 10 |
| experienceYears | int | Years of experience | 5 |
| education | text | Academic background | 10 |
| background | text | Professional background | 10 |
| skills | text[] | Technical/domain skills | 10 |
| domainExpertise | text[] | Specialized domains | 10 |
| certifications | text[] | Professional certifications | 5 |
| responsibilities | text | Current role responsibilities | 10 |
| methodology | text | Work approach/philosophy | 5 |
| personality | text | Communication/work style | 5 |
| achievements | text | Notable accomplishments | 5 |
| systemPromptOverride | text | Custom system prompt | 5 |
| workHistory | jsonb | Array of { company, role, years, highlights } | - |
| deptKnowledge | (external) | Department knowledge entries exist | 10 |

### Quality Score

- Max score: **130 points** (sum of all quality points above)
- Target: >= 100 for high-quality profiles
- Calculated at `/nexus/team-members/:id/prompt-preview`
- Used to assess how well a team member will perform

### Hierarchy Levels & Visual Styling

| Level | Label | Badge Color | Gradient |
|-------|-------|-------------|----------|
| clevel | C-Level | indigo | indigo → purple |
| manager | Manager | blue | blue → cyan |
| senior | Senior | teal | teal → emerald |
| member | Member | slate | slate → slate |
| junior | Junior | slate (darker) | slate → slate |

### Prompt Injection Flow

```
Agent Prompt = {
  System: Department systemPrompt (DB override > hardcoded)
  User: [
    Idea prompt
    + CLAUDE_CODE_CONTEXT
    + Codebase context (4000 chars)
    + Web intelligence (synthesized + top 10 sources)
    + Skills block
    + TEAM MEMBERS block:
        For each active member in this dept:
          Name, role, level, experience, bio, education,
          background (300 chars), skills, domain expertise,
          methodology, personality, certifications
    + Context notes
    + Target platforms
    + Department knowledge entries
    + Q&A context
  ]
}
```

---

## 5. AI Model Routing

### Model Router (`modelRouter.ts`)

Every AI call goes through the model router which selects the best available provider.

### Use Cases & Routing

| Use Case | Primary | Fallback | Purpose |
|----------|---------|----------|---------|
| `webResearch` | Perplexity | Gemini | Web intelligence gathering |
| `departmentAnalysis` | Claude | Gemini 3.1 | Department agent research |
| `smartTitle` | Gemini | Claude | Brief title generation |
| `taskExtraction` | Claude | Gemini 3.1 | Extract tasks from brief |
| `docGeneration` | Claude | Gemini 3.1 | Generate PRD, ERD, etc. |
| `briefSummary` | Gemini | OpenAI | Brief summaries |
| `qualityCheck` | OpenAI | Claude | Quality validation |
| `medicalAnalysis` | Claude | OpenAI | Medical domain analysis |
| `codeAnalysis` | Claude | Gemini 3.1 | Code structure analysis |
| `analyzePhase` | Claude | Gemini 3.1 | Phase analysis |
| `featurePlanning` | Claude | Gemini 3.1 | Feature planning |
| `projectHealthCheck` | Claude | OpenAI | Project health assessment |
| `askQuestion` | Claude | Gemini | Q&A system |
| `general` | Claude | Gemini | General purpose |

### Available Providers

| Provider | Env Variable | Models |
|----------|-------------|--------|
| Claude (Anthropic) | `ANTHROPIC_API_KEY` | claude-opus-4-1, claude-sonnet-4-6, etc. |
| OpenAI | `OPENAI_API_KEY` | gpt-4-turbo, gpt-4, etc. |
| Gemini (Google) | `GOOGLE_GENERATIVE_AI_API_KEY` | gemini-pro, gemini-2.5-flash, etc. |
| Perplexity | `PERPLEXITY_API_KEY` | sonar-medium, sonar-small |

### Selection Priority

```
1. User-selected models (from brief config) → override all
2. Department default model (from nexus_dept_settings.defaultModel)
3. Model router use case routing (primary → fallback)
4. Available providers (checks env vars)
```

### Cost Tracking

Every AI call returns:
- `tokensUsed` (input + output)
- `costUsd` (calculated from tokens x model pricing)
- `modelUsed` (actual model used)
- `fallbackReason` (if primary failed, why)

Costs accumulated per brief in `nexus_briefs.totalCostUsd` and `totalTokensUsed`.

---

## 6. Web Intelligence System

### Source Types

| Source | API | Data Collected | Trust Score Basis |
|--------|-----|---------------|------------------|
| GitHub | GitHub REST API | Repos: stars, language, topics, contributors | log10(stars) * 20 + activity |
| Reddit | Reddit API | Posts: score, subreddit, comments | log10(score) * 15 + engagement |
| RSS | Direct fetch | Articles: title, snippet, date | Domain authority + freshness |
| Perplexity | Perplexity API | Synthesized answers with citations | ~40 (synthesis, not primary) |

### Trust Score Formula

```
GitHub:  min(100, log10(stars+1)*20 + log10(contributors+1)*10)
Reddit:  min(100, log10(score+1)*15 + log10(comments+1)*10)
RSS:     Based on domain authority + freshness
Perplexity: Fixed ~40 (synthesis source)
```

**High-trust threshold: >= 65** — eligible for auto-learning (saved to nexus_web_feeds)

### Department-Specific Reddit Subreddits

| Dept | Subreddits |
|------|-----------|
| CEO | startups, Entrepreneur, business |
| CTO | softwarearchitecture, node, programming |
| R&D | MachineLearning, LocalLLaMA, artificial |
| Design | web_design, userexperience, UI_Design |
| Security | netsec, cybersecurity, AskNetsec |
| Marketing | marketing, SEO, digital_marketing |
| Legal | legaltech, privacy, opensource |

### RSS Feed Categories (40+ feeds)

Categories: tech, frontend, backend, devops, ai, security, design, product, marketing, healthcare, youtube

Sources loaded from:
1. **Database**: `nexus_web_feeds` table (admin-managed, takes priority)
2. **Hardcoded fallback**: Built-in array of 40+ feeds

### N8N Integration (`n8nBridge.ts`)

| Config | Env Variable |
|--------|-------------|
| Base URL | `N8N_WEBHOOK_BASE_URL` |
| API Key | `N8N_API_KEY` |
| Timeout | `N8N_TIMEOUT_MS` (default 60s) |
| Callback | `APP_URL/api/admin/nexus/briefs/{id}/n8n-callback` |

**N8N Workflow Types:**
- `github_research` — Deep GitHub repository analysis
- `reddit_research` — Reddit thread mining
- `youtube_research` — YouTube content analysis
- `competitive_analysis` — Competitor research
- `full_research` — All of the above in parallel

**Flow:**
```
1. triggerFullN8NResearch() → triggers all 4 workflows in parallel
2. Each workflow calls N8N webhook with { briefId, ideaPrompt, departments }
3. N8N processes externally, calls back to /n8n-callback
4. processN8NResults() validates & saves sources to DB
5. If N8N unavailable → fallback to direct API intelligence
```

### Learning System

After each research:
1. Filter sources with trustScore >= 65
2. INSERT into `nexus_web_feeds` with `is_active = false`
3. ON CONFLICT (url) DO NOTHING — no duplicates
4. Admin can review and activate learned sources in Settings

---

## 7. Brief Lifecycle

```
 DRAFT ──────────► RESEARCHING ──────────► REVIEW
   │                    │                     │
   │  User creates      │  Pipeline runs      │  Admin reviews
   │  idea + config     │  13 depts parallel  │  assembled brief
   │                    │  + AI-Dev translate  │
   │                    │  + web intelligence  │
   │                    │                     │
   │                    │  Error? → DRAFT     │
   │                    │  (retryable)        │
   │                    │                     │
   ▼                    ▼                     ▼
                                          ┌───────┐
                                          │APPROVE│──► APPROVED
                                          └───────┘       │
                                          ┌───────┐       │  Extract tasks
                                          │REJECT │──► REJECTED    │
                                          └───────┘       │        ▼
                                          ┌───────┐       │  IN_PROGRESS
                                          │REFINE │──► DRAFT       │
                                          └───────┘       │  Create sprints
                                          ┌───────┐       │        ▼
                                          │ RESET │──► DRAFT    DONE
                                          └───────┘
```

### Status Transitions

| From | To | Trigger | Action |
|------|----|---------|--------|
| (new) | draft | POST /briefs | Create brief |
| draft | researching | POST /briefs/:id/run | Start pipeline |
| researching | review | Pipeline completes | Brief assembled |
| researching | draft | Pipeline error | Reset (retryable) |
| review | approved | POST /approve | Admin approves |
| review | rejected | POST /reject | Admin rejects with notes |
| review | draft | POST /reset | Reset for changes |
| approved | in_progress | Extract tasks + create sprint | Tasks generated |
| in_progress | done | Sprint completed | All tasks done |
| rejected | draft | POST /reset | Reset for retry |

---

## 8. Task Extraction

### How It Works (`nexusTaskExtractor.ts`)

```
Input:
  - Assembled brief (22-32k chars)
  - Generated docs: PRD, ERD, Blueprint, etc. (13k chars)
  - Web sources: top 30 by trust score (3k chars)
  - Department IDs for source matching

Process:
  - AI prompt with EXTRACT_SYSTEM_PROMPT
  - Use case: 'taskExtraction' (primary: Claude, fallback: Gemini)
  - Parse JSON array from AI response
  - Post-process: match web sources, build contextJson

Output:
  - 20-40 ExtractedTask objects
  - Each saved to nexus_extracted_tasks
```

### Task Structure

```typescript
{
  title: string            // Hebrew title (mandatory)
  description: string      // Markdown with structured sections:
                           //   ## What to do
                           //   ## Files to touch
                           //   ## API (method + path + body + response)
                           //   ## DB (table + columns)
                           //   ## Acceptance Criteria (checkboxes)
                           //   ## Sources (URLs)
                           //   ## Dependencies
  priority: 'urgent' | 'high' | 'medium' | 'low'
  estimateHours: 1-40
  category: 'feature' | 'bug' | 'refactor' | 'infrastructure' |
            'design' | 'documentation' | 'security' | 'research'
  skillTags: string[]      // English: react, nodejs, postgresql, ai-integration,
                           //   security-review, legal-review, design-system,
                           //   devops, api-design, mobile, testing
  sourceDepartment: string // Which dept identified this task
  environment: 'user-frontend' | 'user-backend' | 'admin-frontend' |
               'admin-backend' | 'server' | 'fullstack'
  contextJson: {
    webSourceIds?: string[]
    departmentId?: string
    docReferences?: { docType: string; sectionHint?: string }[]
  }
}
```

### Extraction Rules (from EXTRACT_SYSTEM_PROMPT)

- ALL titles + descriptions in **Hebrew** (skillTags/category/environment in English)
- Extract **20-40 tasks** (quality over quantity)
- **CONSOLIDATION MANDATORY** — merge overlapping tasks
- Every task MUST specify environment
- Fullstack tasks MUST have separate Frontend/Backend/Database sub-sections
- Output: JSON array ONLY (no markdown fences)

---

## 9. Sprint System

### Sprint Creation Flow

```
Brief approved
    │
    ▼
Extract Tasks (20-40 tasks)
    │
    ▼
Admin selects tasks + creates sprint(s)
    │
    ├─ Single sprint: createSprintFromBrief()
    │   - Status: 'planning'
    │   - Duration: 14 days default
    │   - Links extracted tasks to sprint
    │
    └─ Multi-sprint: createSprintsFromBrief()
        - Sort tasks by priority (urgent first)
        - Split into chunks of 10 (configurable)
        - Each chunk = 1 sprint
        - Duration: max(14 days, ceil(totalHours/6/5)*7)
    │
    ▼
Admin activates sprint
    │
    ▼
activateSprintTasks()
    │
    ├─ Load extracted tasks (accepted=true, no dev_task_id yet)
    ├─ Load NEXUS context (web sources, dept outputs, docs)
    ├─ For each task:
    │   ├─ Create dev_task in kanban (column: Backlog)
    │   ├─ Inject nexus_context JSON:
    │   │   { briefId, briefTitle, sourceDepartment,
    │   │     webSources[], departmentExcerpt, docReferences[] }
    │   ├─ Set ai_generated = true
    │   ├─ Link sprint_tasks
    │   └─ Update extracted_task.dev_task_id
    ├─ Activate sprint (status: 'active', start_date: now)
    └─ Return { tasksCreated }
```

### nexus_context (Injected into dev_tasks)

```json
{
  "briefId": "uuid",
  "briefTitle": "Smart Medication Reminders",
  "sourceDepartment": "rd",
  "webSources": [
    { "id": "uuid", "sourceType": "github", "url": "...", "title": "...", "trustScore": 85 }
  ],
  "departmentExcerpt": "First 500 chars of R&D dept analysis...",
  "docReferences": [
    { "docType": "PRD", "title": "Product Requirements" },
    { "docType": "ERD", "title": "Entity Relationship" }
  ]
}
```

This context is displayed in the Kanban task detail view, giving developers full traceability back to the research.

---

## 10. Document Generation

### 8 Document Types

| Type | Title | Content |
|------|-------|---------|
| **PRD** | Product Requirements Document | Features, user stories, acceptance criteria, MoSCoW |
| **ERD** | Entity Relationship Diagram | Mermaid ER diagram, tables, columns, relationships |
| **Blueprint** | System Architecture | Architecture diagram, API endpoints, tech stack, infrastructure |
| **CI/CD** | Pipeline Specification | GitHub Actions YAML, Blue/Green deployment, environments |
| **Design** | UX/UI Specification | Design system, components, user flows, wireframes, RTL, a11y |
| **Security** | Security Assessment | STRIDE, OWASP Top 10, threat model, penetration plan |
| **Marketing** | GTM Strategy | Market analysis, ICP, positioning, messaging, SEO keywords |
| **Legal** | Legal & Compliance | OSS licenses, GDPR, ToS, Privacy Policy, IP protection |

### Generation Flow

```
POST /admin/nexus/briefs/:id/generate-doc?docType=PRD
    │
    ├─ Load assembled brief
    ├─ Load relevant department outputs
    ├─ Call AI (use case: 'docGeneration')
    ├─ Save to nexus_generated_docs table
    └─ Return generated document
```

Storage: `nexus_generated_docs` (id, brief_id, doc_type, title, content, created_at)

---

## 11. Question Discovery

### Flow

```
1. POST /briefs/:id/generate-questions
   └─ AI generates questions per department/gate/role
   └─ Each question has: department, gate, role, question text
   └─ Saved to nexus_brief_questions

2. POST /briefs/:id/auto-answer
   └─ AI answers questions from codebase + web intelligence
   └─ Each answer has: text, source, confidence (0-100)

3. GET /briefs/:id/questions
   └─ Returns all questions with answers

4. PATCH /briefs/:briefId/questions/:qId
   └─ Manual edit/verify answer
   └─ Set verified = true
```

### Question Structure

```typescript
{
  id: string
  briefId: string
  department: string      // Which dept this question is for
  gate: string           // Research gate/phase
  role: string           // Specific role perspective
  question: string       // The question text
  answer: string | null  // AI or manual answer
  answerSource: string   // 'codebase' | 'web' | 'manual'
  sourceUrl: string      // Reference URL
  confidence: number     // 0-100
  verified: boolean      // Admin verified
  position: number       // Display order
}
```

---

## 12. Configuration System

### Skills (`nexus_skills`)

Define the taxonomy of technical skills used for:
- Team member expertise tagging
- Task skill tagging
- Department matching

Seeded skills: react, node-express, postgresql, tailwind, ai-llm, healthcare, security, ux-design, testing, devops, hebrew-rtl, mobile

### Automation Rules (`nexus_rules`)

| Trigger Type | When | Example Actions |
|-------------|------|-----------------|
| `brief_approved` | Brief status → approved | auto_extract_tasks |
| `brief_rejected` | Brief status → rejected | notify_admin |
| `research_done` | Brief status → review | notify_admin |
| `task_created` | New task extracted | log |
| `sprint_created` | New sprint from NEXUS | audit_log |

| Action Type | What It Does |
|------------|--------------|
| `auto_extract_tasks` | Automatically extract tasks from approved brief |
| `notify_admin` | Send notification to admin |
| `auto_create_sprint` | Auto-create sprint from tasks |
| `webhook` | Call external webhook |
| `log` / `audit_log` | Log to audit trail |

### Templates (`nexus_templates`)

Pre-configured brief configurations:

| Template | Departments | Depth | Scope |
|----------|------------|-------|-------|
| Full Research (default) | All 9 | full | all |
| Quick Review | CEO, CTO, CPO | quick | all |
| Security Audit | Security, Legal, CTO | deep | server |
| Feature Planning | CTO, R&D, Design, Product, CPO | deep | all |

### Web Feeds (`nexus_web_feeds`)

Admin-managed list of web sources for intelligence gathering.

- **Source types**: RSS, YouTube, Reddit, GitHub
- **Categories**: tech, ai, security, design, product, marketing, healthcare, devops, frontend, backend, business, legal
- **Department scoping**: NULL = all depts, or array of specific dept IDs
- **Learning**: High-trust sources from research auto-added (inactive, for review)

### Knowledge Base (`nexus_dept_knowledge`)

Per-department internal knowledge entries injected into agent prompts.

- **Categories**: general, best_practice, template, reference, checklist
- **Each entry**: title + content (Markdown)
- **Injected into**: Agent prompt as "Department Knowledge" section
- **Managed via**: AdminDepartmentKnowledge page or Settings

### Department Settings (`nexus_dept_settings`)

Per-department configuration:

| Field | Purpose |
|-------|---------|
| labelHe | Hebrew display name |
| emoji | Department emoji |
| systemPromptOverride | Custom system prompt (overrides hardcoded) |
| defaultModel | Default AI model for this dept |
| isActive | Enable/disable department |
| outputSections | Custom output section structure |

---

## 13. Database Schema

### Core NEXUS Tables (15 tables)

#### nexus_briefs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Brief ID |
| title | varchar(500) | AI-generated Hebrew title |
| idea_prompt | text | Original idea/concept |
| status | varchar | draft, researching, review, approved, rejected, in_progress, done |
| selected_departments | text[] | Departments to run |
| selected_models | varchar[] | Preferred AI models |
| assembled_brief | text | Final compiled research |
| review_notes | text | Admin review notes |
| context_notes | text | Additional context |
| target_platforms | text[] | Target platforms |
| codebase_depth | varchar | quick, deep, full |
| codebase_scope | varchar | all, client, server |
| total_cost_usd | varchar(24) | Total AI cost |
| total_tokens_used | int | Total tokens consumed |
| admin_user_id | UUID FK | Creator admin |
| admin_full_name | varchar(255) | Creator name |
| research_started_at | timestamp | Research start |
| research_completed_at | timestamp | Research end |
| approved_at | timestamp | Approval time |
| approved_by | UUID FK | Approving admin |
| generated_sprint_id | UUID | Generated sprint reference |
| phase_id | UUID | Development phase |
| template_id | UUID | Template used |
| created_at, updated_at | timestamp | Timestamps |

#### nexus_brief_departments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Record ID |
| brief_id | UUID FK | Parent brief |
| department | varchar(32) | Department ID |
| status | varchar | pending, completed, error |
| output | text | Full department analysis |
| model_used | varchar(64) | AI model used |
| tokens_used | int | Tokens consumed |
| cost_usd | varchar(24) | Cost |
| error_message | text | Error if failed |
| prompt_snapshot | text | Full prompt sent |
| started_at, completed_at | timestamp | Timing |

#### nexus_brief_web_sources
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Source ID |
| brief_id | UUID FK | Parent brief |
| source_type | varchar | github, reddit, rss, perplexity |
| url | text | Source URL |
| title | varchar(500) | Source title |
| snippet | text | Content snippet |
| trust_score | int | 0-100 trust score |
| github_stars | int | GitHub stars |
| reddit_score | int | Reddit post score |
| contributor_count | int | Contributors |
| raw_payload | jsonb | Full API response |

#### nexus_extracted_tasks
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Task ID |
| brief_id | UUID FK | Source brief |
| title | varchar(500) | Hebrew task title |
| description | text | Markdown task brief |
| priority | varchar | urgent, high, medium, low |
| estimate_hours | int | 1-40 hours |
| category | varchar(32) | feature, bug, refactor, etc. |
| skill_tags | text[] | Technical skills needed |
| source_department | varchar(32) | Department that identified task |
| environment | varchar(16) | user-frontend, server, etc. |
| accepted | boolean | Admin accepted task |
| dev_task_id | UUID | Link to kanban dev_task |
| sprint_id | UUID | Link to sprint |
| phase_id | UUID | Development phase |
| position | int | Display order |
| context_json | jsonb | Web sources, dept references, doc refs |
| created_at | timestamp | Creation time |

#### nexus_brief_questions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Question ID |
| brief_id | UUID FK | Parent brief |
| department | varchar | Target department |
| gate | varchar | Research gate |
| role | varchar(64) | Perspective role |
| question | text | Question text |
| answer | text | Answer text |
| answer_source | varchar(32) | codebase, web, manual |
| source_url | text | Reference URL |
| confidence | int | 0-100 confidence |
| verified | boolean | Admin verified |
| position | int | Display order |

#### nexus_skills
id, name (unique), label_he, color, category, description, is_active, created_at, updated_at

#### nexus_rules
id, name, description, trigger_type, condition_json (jsonb), action_type, action_payload (jsonb), priority, is_active, created_at, updated_at

#### nexus_templates
id, name, name_he, description, departments (text[]), models (varchar[]), codebase_depth, codebase_scope, is_default, is_active, usage_count, created_at, updated_at

#### nexus_dept_settings
department (PK), label_he, emoji, system_prompt_override, default_model, is_active, output_sections (jsonb), created_at, updated_at

#### nexus_dept_team_members
id, department, name, role_en, role_he, emoji, level, responsibilities, skills (text[]), default_model, system_prompt_override, order_index, bio, experience_years, education, certifications (text[]), domain_expertise (text[]), languages (text[]), methodology, personality, achievements, background, work_history (jsonb), is_active, created_at, updated_at

#### nexus_web_feeds
id, source_type, url (unique), label, category, departments (text[]), is_active, created_at, updated_at

#### nexus_dept_knowledge
id, department, category, title, content, position, is_active, created_at, updated_at

#### nexus_generated_docs
id, brief_id, doc_type, title, content, created_at

#### nexus_question_templates
id, department, gate, role, question, answer_strategy, priority, is_active, position

### Bridge Tables (connecting NEXUS → Dev)

| Table | Purpose |
|-------|---------|
| dev_tasks | Kanban tasks — ai_generated=true, nexus_context (jsonb) |
| sprint_tasks | Sprint ↔ Task bridge |
| sprints | Sprint metadata — brief_id links back to NEXUS |

---

## 14. API Reference

### Brief Management

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/nexus/briefs` | Admin | Create brief (draft) |
| GET | `/nexus/briefs` | Admin | List briefs (?status, ?limit, ?offset) |
| GET | `/nexus/briefs/:id` | Admin | Get brief + departments + sources |
| PATCH | `/nexus/briefs/:id` | Admin | Update brief fields |
| DELETE | `/nexus/briefs/:id` | Admin | Delete (draft/rejected only) |
| POST | `/nexus/briefs/:id/run` | Admin | Start research pipeline |
| GET | `/nexus/briefs/:id/stream` | Admin | SSE real-time progress |
| POST | `/nexus/briefs/:id/approve` | Admin | Approve brief |
| POST | `/nexus/briefs/:id/reject` | Admin | Reject with notes |
| POST | `/nexus/briefs/:id/reset` | Admin | Reset to draft |

### Task & Sprint

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/nexus/briefs/:id/extract-tasks` | Admin | Extract tasks from brief |
| GET | `/nexus/briefs/:id/extracted-tasks` | Admin | List extracted tasks |
| PATCH | `/nexus/briefs/:id/extracted-tasks/:taskId` | Admin | Update task |
| POST | `/nexus/briefs/:id/generate-sprint` | Admin | Create single sprint |
| POST | `/nexus/briefs/:id/generate-sprints` | Admin | Create multiple sprints |

### Documents & Questions

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/nexus/briefs/:id/generate-doc` | Admin | Generate doc (PRD, ERD, etc.) |
| GET | `/nexus/briefs/:id/generated-docs` | Admin | List generated docs |
| POST | `/nexus/briefs/:id/generate-questions` | Admin | Generate questions |
| POST | `/nexus/briefs/:id/auto-answer` | Admin | Auto-answer questions |
| GET | `/nexus/briefs/:id/questions` | Admin | List questions |
| PATCH | `/nexus/briefs/:briefId/questions/:qId` | Admin | Edit question |

### Settings

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET/POST/PATCH/DELETE | `/nexus/skills` | Mixed | Skills CRUD |
| GET/POST/PATCH/DELETE | `/nexus/rules` | Mixed | Rules CRUD |
| GET/POST/PATCH/DELETE | `/nexus/templates` | Mixed | Templates CRUD |
| GET/PUT | `/nexus/dept-settings` | Mixed | Dept settings |
| GET/POST/PATCH/DELETE | `/nexus/web-feeds` | Mixed | Web feeds CRUD |
| GET/POST/PUT/DELETE | `/nexus/dept-knowledge` | Mixed | Knowledge base CRUD |

### Team Members

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/nexus/team-members` | No | List (?department filter) |
| POST | `/nexus/team-members` | Admin | Create member |
| PATCH | `/nexus/team-members/:id` | Admin | Update member |
| DELETE | `/nexus/team-members/:id` | Admin | Delete member |
| GET | `/nexus/team-members/:id/profile` | No | Enriched profile |
| GET | `/nexus/team-members/:id/contributions` | No | Contribution stats |
| GET | `/nexus/team-members/:id/prompt-preview` | No | Prompt + quality score |

### Utility

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/nexus/departments` | No | List all departments |
| GET | `/nexus/models` | No | Available models |
| GET | `/nexus/model-routes` | No | Model routing config |
| GET | `/nexus/codebase-preview` | No | Code preview (?depth, ?scope) |
| POST | `/nexus/extract-text` | Admin | Extract text from files |
| GET | `/nexus/n8n-status` | Admin | N8N configuration status |
| POST | `/nexus/briefs/:id/trigger-n8n` | Admin | Trigger N8N pipeline |
| POST | `/nexus/briefs/:id/n8n-callback` | N8N | Receive N8N results |
| GET | `/nexus/dev-tasks/:taskId/context` | No | Full NEXUS context for dev task |
| GET | `/nexus/dept-configs` | No | Dept configs with prompts |
| GET | `/nexus/phases` | No | Dev phases |

---

## 15. Client UI Pages

### AdminNexusHub (`/admin/nexus`)
- Brief listing with status filters and search
- Stats row: total briefs, in review, researching, approved
- Quick navigation: briefs list + settings buttons
- New brief modal (idea prompt text area)
- Brief cards with status badges, dept emojis, cost, delete

### AdminNexusBrief (`/admin/nexus/briefs/:id`)
**The most complex page (~2,400 lines)**

- **Wizard mode** (draft): Department multi-select, model selection, codebase depth/scope, file upload, context notes, code preview, launch button
- **Results mode** (researching+): Live SSE progress (per-department status, cost counter, source discovery), assembled brief viewer with Markdown rendering, department accordion, web sources with trust scores
- **Review tools**: Approve/Reject/Refine/Reset buttons, edit brief inline, refinement notes modal
- **Task extraction**: Extract tasks button, task list with accept/edit, sprint creation (single or multi)
- **Document generation**: 8 doc types grid, generate individually, download
- **Question discovery**: Generate questions, auto-answer, manual edit/verify

### AdminNexusSettings (`/admin/nexus/settings`)
**7 tabs:**
1. **Departments** — Config per dept (model, prompt override, active toggle) + nested team members with full CRUD
2. **Skills** — Skill taxonomy CRUD with colors and categories
3. **Rules** — Automation rules CRUD (trigger + condition + action)
4. **Templates** — Brief template CRUD with dept/model presets
5. **Agents** — View/edit agent system prompts per department
6. **Web Sources** — Web feed CRUD with filters and department scoping
7. **Model Routes** — Read-only model routing display

### AdminTeamMemberProfile (`/admin/nexus/team/:id`)
**2 tabs:**
1. **Profile** — Full CV display (bio, experience, education, skills, domain expertise, certifications, work history, methodology, personality, achievements), department settings, colleagues, web sources (grouped by domain with links), knowledge base entries, contribution history, stats
2. **Prompt Engine** — System prompt preview, team block, knowledge block, skills block, quality score with per-field checklist

### AdminDepartmentKnowledge (`/admin/nexus/departments/:dept/knowledge`)
- Knowledge entry CRUD per department
- Categories: general, best_practice, template, reference, checklist
- Markdown content editor
- Breadcrumb navigation

### AdminAI (`/admin/ai`) — NEXUS Tab
- Embeds AdminNexusHub component directly
- Part of larger AI dashboard with 7 tabs

---

## 16. Status Report

### DONE (Fully Built & Working)

- 14 department agent definitions with system prompts
- Multi-provider AI routing (Claude, OpenAI, Gemini, Perplexity)
- Full orchestration pipeline (7 steps + SSE streaming)
- Brief CRUD + lifecycle management
- Web intelligence (direct + N8N fallback)
- Trust score calculation and learning system
- Task extraction (AI-generated 20-40 tasks)
- Sprint creation (single + multi)
- Sprint activation (bridge to kanban dev_tasks)
- nexus_context injection into dev tasks
- 8 document types generation (PRD, ERD, Blueprint, etc.)
- Question discovery + auto-answer
- Team member management with full CVs
- Department settings (model, prompt, active toggle)
- Skills taxonomy
- Automation rules engine
- Brief templates
- Web feeds management
- Department knowledge base
- Prompt engine preview with quality scoring
- Team member profile page with contributions
- CSV + Excel export (comprehensive 34-column)
- Settings page with 7 configuration tabs
- File upload + text extraction (PDF, DOCX, MD, TXT, images)
- Codebase preview (quick/deep/full x all/client/server)

### INCOMPLETE / NEEDS ATTENTION

- **Model Routes tab** — read-only display, no editing UI for changing routing
- **Rules engine execution** — rules are defined but execution may not be fully wired (trigger handling in pipeline needs verification)
- **N8N workflows** — bridge code exists but actual N8N workflow definitions need external setup
- **Document ZIP download** — individual doc download works, batch ZIP partially implemented
- **Sprint auto-creation rule** — rule exists but auto_create_sprint action handler needs verification
- **Question templates** — table exists (nexus_question_templates) but no CRUD UI in settings
- **Learning review** — auto-learned web sources saved as inactive, but no dedicated "review learned sources" workflow in UI
- **Perplexity integration** — marked as Phase 5 optional, may not be fully tested
- **Bot API integration** — environment variable BOT_API_KEY exists for Claude Code task updates, integration depth unclear
- **Generated docs table** — not in Drizzle schema (raw SQL only), no migration tracking

### KNOWN ISSUES / POTENTIAL BREAKS

- **nexus_web_feeds** and **nexus_dept_team_members** — tables created via raw SQL, not in Drizzle schema → migration drift risk
- **nexus_generated_docs** — same: raw SQL only
- **Error swallowing** — some API calls use `.catch(() => {})` or `.catch(() => [])` which silently hides errors
- **Team member route** — was missing in App.tsx top-level router (FIXED in this session)
- **Large prompt sizes** — with full team CVs + knowledge + web sources, prompts can exceed model context limits

### PLANNED / FUTURE

- Model routing editor UI (currently read-only)
- Question template management UI
- Learned source review workflow
- N8N workflow builder/templates
- Cost budgeting per brief/department
- Historical cost analytics per department
- Team performance metrics (which team configs produce better outputs)
- A/B testing of system prompts
- Webhook integrations for external notifications
- Mobile-responsive admin pages

---

## 17. Integration Map

```
                    ┌─────────────────────────────────────┐
                    │           NEXUS CORE                │
                    │   (nexusBriefOrchestrator.ts)       │
                    └──────────┬──────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐      ┌──────────────┐     ┌──────────────┐
    │ AI MODELS│      │ WEB INTEL    │     │ CODEBASE     │
    │          │      │              │     │ SCANNER      │
    │ Claude   │      │ GitHub API   │     │              │
    │ OpenAI   │      │ Reddit API   │     │ gatherProject│
    │ Gemini   │      │ RSS Feeds    │     │ Data()       │
    │ Perplexity│     │ Perplexity   │     │              │
    │          │      │ N8N Bridge   │     │ depth/scope  │
    └──────────┘      └──────────────┘     └──────────────┘
          │                    │                    │
          │                    │                    │
          ▼                    ▼                    ▼
    ┌─────────────────────────────────────────────────────┐
    │              DATABASE (PostgreSQL)                   │
    │                                                     │
    │  nexus_briefs          nexus_dept_settings           │
    │  nexus_brief_depts     nexus_dept_team_members       │
    │  nexus_brief_sources   nexus_dept_knowledge          │
    │  nexus_extracted_tasks nexus_skills                   │
    │  nexus_brief_questions nexus_rules                    │
    │  nexus_generated_docs  nexus_templates                │
    │  nexus_web_feeds       nexus_question_templates       │
    └────────────────────────┬────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐  ┌──────────────┐
            │ KANBAN/DEV   │  │ SPRINT       │
            │              │  │ SYSTEM       │
            │ dev_tasks    │  │              │
            │ dev_columns  │  │ sprints      │
            │ nexus_context│  │ sprint_tasks │
            │ ai_generated │  │ phases       │
            └──────────────┘  └──────────────┘
                    │                 │
                    ▼                 ▼
            ┌─────────────────────────────┐
            │     CLAUDE CODE (AI Dev)    │
            │                             │
            │  Reads: nexus_context       │
            │  Uses: web sources, dept    │
            │  analysis, doc references   │
            │  Updates: task status via   │
            │  BOT_API_KEY                │
            └─────────────────────────────┘
```

---

## 18. Environment Bridge

NEXUS is the **brain** that connects two separate operational environments:

### Environment 1: Admin Research (NEXUS Settings + Briefs)

**Where**: Admin panel (`/admin/nexus/*`)
**Who**: Product managers, admins, stakeholders
**What**: Research, strategy, decision-making

- Configure departments, team members, skills
- Create research briefs from ideas
- Run multi-department AI analysis
- Review research outputs
- Approve/reject briefs
- Generate specification documents
- Extract development tasks

### Environment 2: Dev Implementation (Kanban + Sprints)

**Where**: Admin panel (`/admin/dev/*`, `/admin/sprints/*`)
**Who**: Developers (human or AI — Claude Code)
**What**: Task execution, sprint management, code delivery

- Kanban board with task cards
- Sprint planning and tracking
- Task detail with nexus_context
- CI/CD pipeline tracking
- Development dashboard

### The Bridge: How NEXUS Connects Them

```
NEXUS Brief (approved)
    │
    ├─ extractTasksFromBrief()
    │   └─ Creates nexus_extracted_tasks
    │       └─ Hebrew titles, Markdown descriptions
    │       └─ Priority, estimate, category, environment
    │       └─ Skill tags, source department
    │       └─ Context JSON (web sources, dept refs, doc refs)
    │
    ├─ createSprintFromBrief()
    │   └─ Creates sprint in 'planning' status
    │   └─ Links extracted_tasks.sprint_id
    │
    └─ activateSprintTasks()
        └─ For each extracted task:
            ├─ CREATE dev_task
            │   ├─ column_id = Backlog
            │   ├─ ai_generated = true
            │   ├─ nexus_context = {
            │   │     briefId, briefTitle,
            │   │     sourceDepartment,
            │   │     webSources[],
            │   │     departmentExcerpt,
            │   │     docReferences[]
            │   │   }
            │   └─ All task details (title, desc, priority, etc.)
            │
            ├─ CREATE sprint_tasks link
            │
            └─ UPDATE extracted_task.dev_task_id = new task

        Sprint status → 'active'
        Tasks appear in Kanban → Ready for development
```

### Data Traceability Chain

```
Idea → Brief → Department Analysis → Extracted Task → Sprint → Dev Task → Code
  │       │           │                    │              │         │
  │       │           │                    │              │         └─ nexus_context
  │       │           │                    │              └─ sprint_tasks
  │       │           │                    └─ context_json
  │       │           └─ prompt_snapshot
  │       └─ assembled_brief
  └─ idea_prompt

Every piece of code can be traced back to the original idea through this chain.
```

---

---

## 13. Complete Documentation Suite

This Blueprint is one of 8 documents that together provide exhaustive coverage of the NEXUS system:

| Document | Focus | Depth |
|----------|-------|-------|
| **NEXUS-BLUEPRINT.md** (this file) | Architecture overview, tables, diagrams | Reference |
| **NEXUS-DEEP-DIVE.md** | Narrative A-Z, every mechanism explained | Narrative |
| **NEXUS-DEPARTMENTS-AND-PROMPTS.md** | Exact system prompts, prompt construction | Technical |
| **NEXUS-ENCYCLOPEDIA-PART1.md** | Philosophy, pipeline, 14 departments, web intelligence | Deep Narrative |
| **NEXUS-ENCYCLOPEDIA-PART2.md** | Teams, tasks, sprints, development bridge | Deep Narrative |
| **NEXUS-AUTOMATION-SECURITY-OPS.md** | Automations, N8N, security, cost tracking | Operations |
| **NEXUS-DATABASE-COMPLETE.md** | Every table, every field, data flow | Database |
| **NEXUS-ADMIN-PANEL-GUIDE.md** | Every UI screen, workflows, what works/doesn't | UI/UX |

For NotebookLM analysis, upload all 8 documents to get the most comprehensive understanding of NEXUS.

> **Last updated: 2026-04-03. Keep updated as NEXUS evolves.**
