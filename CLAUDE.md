# MemorAid — Claude Code Project Guide

## Project Identity

**MemorAid** is a Hebrew-first SaaS platform for digital health management in **mental health and elderly care** (Senior Care / Digital Health).

- **NOT** related to memoraid.com (memory sports competitions)
- **NOT** related to Anki, Duolingo, or memory training apps
- Target users: family caregivers, elderly patients, medical professionals, care facilities

Business model: $15/user/month, ~25 users/org → $375/month/org. Break-even at month 14.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Neon serverless) + Drizzle ORM |
| Auth | Custom JWT sessions (HttpOnly cookies) |
| AI | Anthropic Claude Sonnet/Haiku, Google Gemini Flash/Pro, Perplexity, GPT-4o |
| Payments | Stripe |
| Email | Nodemailer |
| Deployment | Render / cloud |
| Package mgr | pnpm |

---

## Repository Structure

```
memoraid-local/
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── admin/              # Admin panel pages & components
│       │   ├── pages/          # AdminNexusHub, AdminNexusBrief, AdminDevKanban, etc.
│       │   ├── components/     # Shared admin UI components
│       │   ├── hooks/          # Admin hooks (useAdminI18n, etc.)
│       │   └── utils/          # aiPromptFormatter, documentDownload, etc.
│       ├── components/         # User-facing shared components
│       ├── pages/              # User-facing pages
│       └── lib/                # api.ts, auth, utils
├── server/
│   └── src/
│       ├── index.ts            # Express app entry + DB migrations + seed
│       ├── routes.ts           # User API routes
│       ├── adminRoutes.ts      # Admin API routes
│       ├── nexusAdminRoutes.ts # NEXUS API routes (briefs, Q&A, sprints)
│       ├── nexusSettingsRoutes.ts # NEXUS settings CRUD routes
│       ├── nexusBriefOrchestrator.ts # 7-step brief pipeline
│       ├── nexusDepartmentAgents.ts  # Department AI agents
│       ├── nexusTaskExtractor.ts     # Task extraction + sprint creation
│       ├── nexusWebIntelligence.ts   # Web scraping (GitHub, Reddit, RSS, Perplexity)
│       ├── nexusDeptResearchConfig.ts # Per-dept source configs (Phase 6)
│       ├── questionDiscovery.ts      # Q&A generation & auto-answer
│       ├── multiProviderAI.ts        # callAI() with retry/cost tracking
│       ├── modelRouter.ts            # Model selection per use-case
│       └── projectDataGatherer.ts   # Codebase scanning
├── shared/
│   └── schemas/schema.ts       # Drizzle ORM table definitions (source of truth)
├── scripts/                    # Seed scripts (run once)
│   ├── seed-nexus-settings.mjs
│   ├── seed-nexus-cv-data.mjs
│   └── seed-nexus-full-teams.mjs
└── docs/
    └── nexus/
        └── project-identity.md # NEXUS research reference — THIS project, not memoraid.com
```

---

## Key Conventions

### TypeScript
- **Strict mode** is on — no implicit `any`
- All API inputs validated with **Zod** schemas
- All DB changes go through **Drizzle ORM migrations** (not raw ALTER TABLE in production)
- Prefer `type` over `interface` for data shapes

### Database
- ORM: **Drizzle** — use `db.select()`, `db.insert()`, `db.update()` over raw SQL
- Raw SQL only for complex queries or migrations: `db.execute(sql\`...\`)`
- All tables in `shared/schemas/schema.ts` — edit there first
- Use `ON CONFLICT DO NOTHING` for idempotent seeds
- UUID primary keys everywhere (`gen_random_uuid()`)

### API
- Admin routes: `/admin/*` — require `requireAdmin` middleware
- User routes: `/api/*` — require `requireAuth` middleware
- All responses: `res.json({ ... })` — never send bare strings
- Error responses: `res.status(4xx/5xx).json({ error: 'message' })`
- Use `apiFetch()` from `client/src/lib/api.ts` on the frontend

### Frontend / Admin UI
- **RTL-first**: Hebrew is the primary language, use `dir="rtl"` on text blocks
- Styling: **Tailwind CSS only** — no inline styles, no arbitrary values without tokens
- Admin theme: `bg-slate-800/50`, `text-slate-100`, `text-slate-400` — see `admin-theme.css`
- No `dark:` prefix — admin theme handles this via `[data-admin-theme="light"]` overrides
- Components: **shadcn/ui + Radix** — check `client/src/components/ui/` before creating new
- Icons: **Lucide React** only
- i18n: use `tt()` from `useAdminI18n` hook for all admin strings
- Loading states: show `<Loader2 className="animate-spin" />` spinner
- Font: **Heebo** (Hebrew-optimized)

### NEXUS System
- 14 departments: `ceo`, `cto`, `cpo`, `rd`, `design`, `product`, `security`, `legal`, `marketing`, `finance`, `hr`, `cs`, `sales`, `ai-dev`
- Department knowledge seeded in `nexus_dept_knowledge` — key: `department` matches exactly the IDs above
- Brief pipeline: 7 steps in `nexusBriefOrchestrator.ts` → `runNexusOrchestrator()`
- AI calls go through `callAI()` in `multiProviderAI.ts` — always use this, never call provider SDK directly
- Task extraction: `extractTasksFromBrief()` → `saveExtractedTasks()` → `createSprintFromBrief()`
- Sprint activation: `activateSprintTasks()` — moves tasks to Kanban with `nexus_context`
- Bot-move endpoint: `POST /dev/tasks/:id/bot-move` — authenticated with `KANBAN_BOT_API_KEY`

---

## Environment Variables

```env
DATABASE_URL=           # PostgreSQL connection string (Neon)
ANTHROPIC_API_KEY=      # Claude API
GOOGLE_GEMINI_API_KEY=  # Gemini API
OPENAI_API_KEY=         # GPT-4o API (optional)
PERPLEXITY_API_KEY=     # Perplexity API (web research)
STRIPE_SECRET_KEY=      # Stripe payments
KANBAN_BOT_API_KEY=     # Bot authentication for task automation
SESSION_SECRET=         # JWT session signing
```

---

## DO / DON'T

### DO
- ✅ Always add `await` when calling `getAdminFromRequest(req)`
- ✅ Use `pnpm` (not npm or yarn)
- ✅ Keep all Drizzle table schemas in `shared/schemas/schema.ts`
- ✅ Use `callAI()` for all LLM calls — handles retry, cost logging, fallback
- ✅ Use `apiFetch()` on the frontend — handles auth headers automatically
- ✅ Add `ON CONFLICT DO NOTHING` to all seed INSERTs
- ✅ Wrap admin routes with `requireAdmin` middleware
- ✅ Use `tt()` for all user-facing admin text (i18n)
- ✅ Use `dir="rtl"` on Hebrew text blocks
- ✅ Match department IDs exactly: `rd` not `rnd`, `cs` not `customer_support`

### DON'T
- ❌ Don't call AI provider SDKs directly — use `callAI()`
- ❌ Don't add new admin routes to `routes.ts` — use `adminRoutes.ts` or `nexusAdminRoutes.ts`
- ❌ Don't use `dark:` Tailwind prefix in admin components
- ❌ Don't seed department knowledge with `'rnd'` — the correct ID is `'rd'`
- ❌ Don't skip `requireAdmin` / `requireAuth` on protected routes
- ❌ Don't create new DB tables without adding them to `shared/schemas/schema.ts`
- ❌ Don't use `console.log` in production code — use structured logging or remove
- ❌ Don't hardcode API keys — always use `process.env.*`
- ❌ Don't reference memoraid.com or memory sports — this project is Digital Health / Senior Care

---

## Running Locally

```bash
# Install dependencies
pnpm install

# Start dev servers (frontend + backend concurrently)
pnpm dev

# Run database migrations + seed
node scripts/seed-nexus-settings.mjs
node scripts/seed-nexus-full-teams.mjs
node scripts/seed-nexus-cv-data.mjs

# Type check
pnpm typecheck

# Build for production
pnpm build
```

---

## NEXUS Brief Workflow (Quick Reference)

1. Admin creates a Brief with an idea prompt
2. Template selected → departments chosen
3. Q&A generated → auto-answered → manual questions filled by admin
4. Research launched → pipeline runs:
   - Step 1: Mark researching + cost governance
   - Step 2: Codebase scan
   - Step 3: Web intelligence — N8N (GitHub, Reddit, YouTube, Competitive) or direct fallback
   - Step 3.5: Per-dept deep research — focused sources per department via N8N or direct API
   - Step 4: All department agents run in parallel (each gets its own research context)
   - Step 4.5: AI-Dev meta-translation
   - Step 5: Brief assembled + AI synthesis + smart title
5. Admin reviews → Approves / Rejects
6. Tasks extracted → Sprint created → Tasks activated to Kanban
7. Developer copies task prompt → pastes into Claude Code → "Start Dev"

### N8N Workflow Setup (Optional)

N8N enhances research speed but is not required — the system falls back to direct API calls.

```bash
# Start N8N
docker compose -f docker-compose.n8n.yml up -d
# Access: http://localhost:5678
```

**Import workflows** (N8N UI → Import from file):
- `n8n-workflows/nexus-github-research.json`
- `n8n-workflows/nexus-reddit-research.json`
- `n8n-workflows/nexus-youtube-research.json`
- `n8n-workflows/nexus-competitive-analysis.json`
- `n8n-workflows/nexus-dept-research.json` ← Phase 6: per-department research

**After import:** Activate each workflow. Set `PERPLEXITY_API_KEY` in N8N environment for the dept-research workflow.

**Verify:** `curl -X POST http://localhost:5678/webhook/dept_research -H "Content-Type: application/json" -d '{"ideaPrompt":"test","department":"security","skills":[],"domainExpertise":[],"specialSources":{"subreddits":["netsec"],"searchKeywords":["OWASP"]}}'`
