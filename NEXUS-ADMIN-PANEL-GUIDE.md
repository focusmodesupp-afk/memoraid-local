# NEXUS Admin Panel — Complete UI/UX Guide

> Every screen, every feature, every button, every workflow in the NEXUS admin panel, documented in narrative depth. This guide covers what exists, what works, what's placeholder, and how data flows through the interface.

---

## Part 1: The Admin Panel Architecture

### Overview and Design Philosophy

The MemorAid admin panel is a single-page application built with React 18, Vite as the build tool, Tailwind CSS for styling, and shadcn/ui as the component library. It is a Hebrew-first, right-to-left (RTL) interface designed for the MemorAid operations team — the administrators who manage the platform, configure NEXUS research, oversee development, and monitor system health. The entire interface uses the Heebo font, which provides excellent Hebrew rendering while maintaining readability for English technical terms that appear throughout the UI.

The admin panel follows a dark theme exclusively. There is no light mode. The design system uses CSS custom properties (variables) prefixed with `--admin-*` to maintain consistency. The primary background color is `--admin-bg-main` (#0f172a, a very dark navy blue). Cards and elevated surfaces use `--admin-bg-card` (rgba(30,41,59,0.5), a semi-transparent dark slate). The primary accent color is `--admin-primary` (#818cf8, a soft indigo). Text uses white and various shades of slate gray. Status indicators use green for success, blue for in-progress, amber for warning, and red for error states.

All interactive elements come from shadcn/ui: Buttons, Cards, Dialogs, Tables, Tabs, Select dropdowns, Input fields, Badges, Tooltips, and more. The admin panel explicitly prohibits using Tailwind's `dark:` prefix (since everything is already dark), pure white (#fff) as a color (use slate-100 or slate-200 instead), and any reference to Figma or external design tools. These rules exist because all development is done by Claude Code AI, which implements designs from code specifications rather than visual mockups.

### Navigation Structure

The admin panel organizes its pages into 13 navigation sections divided into two groups. The first group is "Product Admin" — sections related to managing the live product and its users. The second group is "Dev Tools" — internal development tooling including NEXUS, kanban, sprints, and system configuration.

**Product Admin sections:**

The Dashboard section contains the main admin dashboard at `/admin`. The Users section provides a hub page at `/admin/users-hub` that links to user management, family management, and user detail pages. Support lives at `/admin/support` and handles customer support tickets. Content is at `/admin/content-hub` linking to CMS, media library, and notifications management. Sales at `/admin/sales-hub` covers plans, subscriptions, promotions, coupons, and sales reports. Marketing has coupons management at `/admin/plans/coupons`. Medical Insights at `/admin/medical-insights` provides health data analysis. The AI section at `/admin/ai-hub` links to AI analysis tools and NEXUS. Communication at `/admin/communication-hub` handles messaging features. Monitoring at `/admin/monitoring-hub` provides system health, logs, errors, analytics, and data center views.

**Dev Tools sections:**

QA at `/admin/qa-hub` links to quality assurance controls, data quality, and test runs. Dev at `/admin/dev-hub` is the heart of development tooling — linking to the kanban board, sprints, dev dashboard, work plan, OKR, pipelines, strategies, and project analysis. Settings at `/admin/settings-hub` covers system settings, feature flags, security configuration, integrations, backups, and audit logs.

Each section in the sidebar shows a single entry point (the hub page) with a Lucide React icon. Clicking a hub page reveals cards linking to the subsection pages. This pattern keeps the sidebar clean while still providing access to dozens of pages.

### The Hub Page Pattern

Many admin sections use a "Hub Page" pattern implemented in `AdminHubPage.tsx`. A hub page is a landing page for a section that displays: a section title with icon, a brief description, quick-glance KPI cards (if applicable), and navigation cards linking to the section's subpages. Each navigation card shows an icon, title, description, and optional badge (like a count of pending items).

For example, the Dev Hub (`/admin/dev-hub`) shows KPI cards for total tasks, in-progress tasks, completed tasks, and blocked tasks, followed by navigation cards for Dashboard, Kanban, Sprints, Work Plan, OKR, Pipelines, Strategies, and Project Analysis.

This pattern provides orientation — when an admin enters a section, they immediately see the most important metrics and can navigate to the specific tool they need.

---

## Part 2: NEXUS Core Pages — The Research Interface

### AdminNexusHub — The Brief Listing Page

**Route:** `/admin/nexus`
**File:** `client/src/admin/pages/AdminNexusHub.tsx` (411 lines)
**Status:** Fully functional

This is the main entry point for NEXUS. When an admin navigates here, they see a dashboard of all research briefs organized by status.

At the top of the page, four stat cards show aggregate counts: total briefs across all statuses, briefs currently in "review" status (awaiting admin evaluation), briefs in "researching" status (pipeline actively running), and briefs that have been approved. These cards provide at-a-glance situational awareness.

Below the stats, a row of status filter tabs lets the admin view all briefs or filter by specific status: draft, researching, review, approved, rejected, or done. Switching tabs triggers a re-fetch from the API. A search bar allows filtering briefs by title text.

The main content area displays briefs as a responsive grid of cards (3 columns on desktop, 2 on tablet, 1 on mobile). Each BriefCard shows: the brief's Hebrew title, an array of department emoji badges showing which departments were involved, the total research cost in USD, total tokens consumed, a status badge with color coding (green for approved, blue for researching, yellow for review, red for rejected, gray for draft), and a delete button. Clicking anywhere on the card navigates to the brief detail page.

At the top right, a prominent "Create New Brief" button opens a modal where the admin types their idea prompt and creates a new brief in draft status. There's also a gear icon linking to NEXUS Settings.

**API Calls:**
- `GET /admin/nexus/briefs?status={filter}` — fetches briefs with optional status filter
- `POST /admin/nexus/briefs` — creates a new brief with the provided idea prompt
- `DELETE /admin/nexus/briefs/{id}` — deletes a brief (with confirmation for non-draft briefs)

**What works:** Everything on this page is fully functional. Brief creation, listing, filtering, search, deletion, and navigation all work as expected.

---

### AdminNexusBrief — The Brief Detail Page (The Main Research Interface)

**Route:** `/admin/nexus/briefs/:id`
**File:** `client/src/admin/pages/AdminNexusBrief.tsx` (2435 lines — the largest page in the admin panel)
**Status:** Fully functional

This is the most complex and feature-rich page in the entire admin panel. It manages the complete lifecycle of a single research brief, from configuration through research execution to review and approval. The page has multiple distinct states depending on the brief's status.

#### Draft State — The Configuration Wizard

When a brief is in "draft" status, the page displays a configuration interface where the admin prepares the research parameters before launching.

**Department Selection:** A grid of checkboxes lets the admin select which of the 14 departments should analyze the idea. Each checkbox shows the department's emoji icon and Hebrew name. Pre-selected departments are highlighted. The admin can select all departments or just a focused subset (like CEO + CTO + Design for a quick feasibility check).

**AI Model Selection:** The admin chooses which AI models to prefer. Available options include Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google), and Perplexity (for web research). The admin can select multiple models. The system uses these preferences in its model routing — if Claude is selected, departments will prefer Claude with automatic fallback to other models if Claude fails.

**Codebase Configuration:** Two selectors control the codebase scan. Depth can be "quick" (high-level file structure), "deep" (file structure plus key function signatures), or "full" (exhaustive project scan). Scope can be "all" (entire codebase), "client" (frontend only), or "server" (backend only). Deeper and wider scans provide more context to department agents but cost more tokens.

**Context Notes:** A text area where the admin can provide special instructions: "Focus on accessibility," "This is for the Israeli market only," "Consider GDPR compliance carefully." These notes are injected as the first layer of every department agent's prompt, ensuring all departments consider the admin's specific requirements.

**Target Platforms:** Checkboxes for web, mobile, and desktop. These influence department recommendations — selecting mobile means the CTO will evaluate mobile architectures and Design will consider touch interactions.

**Codebase Preview:** A button that runs the codebase scan and displays the result, allowing the admin to see exactly what context the agents will receive before launching research.

**Launch Button:** The prominent "Launch Research" button starts the 7-step pipeline. Once clicked, the page transitions to the streaming state.

#### Researching State — Real-Time SSE Streaming

When research is running, the page becomes a live monitoring dashboard. The entire 7-step pipeline streams updates via Server-Sent Events (SSE), and the page renders these updates in real-time.

**Progress Indicators:** A progress bar shows overall completion (departments completed / total departments). Below it, individual department status cards show each department's state: a spinner icon for "running," a green checkmark for "completed," a red X for "failed," and a gray circle for "pending."

**Live Cost and Token Counters:** Running totals of USD cost and tokens consumed update in real-time as each department completes. The admin can see the research bill growing in real-time, which is important for budget awareness ($15-25 is typical for full research).

**Web Source Feed:** As web intelligence gathers sources, each discovered source appears in a feed: source type icon (GitHub, Reddit, RSS, Perplexity), title, and trust score badge. Higher-trust sources (65+) get a green badge, medium (30-64) get yellow, and low get gray.

**Department Live Status:** Each department card shows: the department emoji and Hebrew name, the AI model being used, the status (pending/running/completed/failed), tokens consumed, and cost. When a department is running, a subtle pulse animation indicates activity.

**Assembly Phase:** After all departments complete, an "Assembly" progress indicator shows the brief being assembled. When assembly completes, the page automatically transitions to the review state.

The streaming is implemented using the EventSource API on the client side. The server sends events through the SSE endpoint `/admin/nexus/briefs/:id/launch`. Event types include: `start`, `codebase_ready`, `web_intelligence_start`, `web_source_found`, `web_intelligence_done`, `department_start`, `department_done`, `department_error`, `assembly_start`, `assembly_done`, `done`, and `error`.

If an error occurs during research, the brief is reset to "draft" status with a retryable error — the admin can fix the issue (adjust departments, change models) and re-launch.

#### Review State — Reading and Evaluating the Brief

When research completes and the brief enters "review" status, the page displays the assembled brief in a rich Markdown renderer. The admin reads through the entire document, which includes:

- An executive summary of the research
- Per-department analysis sections with structured outputs
- Web source references with trust scores
- Cost and token consumption summary
- Recommendations and next steps

The admin has several actions available:

**Approve:** Moves the brief to "approved" status. This is the green light that allows task extraction and sprint creation. The approvedAt timestamp and approvedBy admin ID are recorded.

**Reject:** Opens a text area for review notes explaining why the brief is rejected. The brief moves to "rejected" status. Review notes are preserved so the admin (or another admin) can understand the rejection reasons.

**Refine:** Resets the brief to "draft" with new context notes, allowing the admin to provide additional guidance and re-launch research. This is for cases where the research is partially good but needs adjustment.

**Reset:** A clean reset to draft, clearing all previous results.

**Edit Inline:** The admin can directly edit the assembled brief text in a text editor, making corrections or additions before approval.

#### Approved State — Task Extraction and Sprint Creation

After approval, the page enables two critical actions:

**Extract Tasks:** A button that sends the assembled brief, generated documents, and top web sources to Claude AI for task extraction. The AI analyzes the entire research output and produces 20-40 structured development tasks in JSON format. Each task includes a Hebrew title, structured description (with "What to do," "Files to touch," "API," "DB," "Acceptance Criteria," "Sources," "Dependencies"), priority, hour estimate, category, skill tags, source department, and environment tagging.

The extracted tasks appear in a list view where the admin can review each one, approve or reject individual tasks, and modify details. Approved tasks can then be organized into sprints.

**Create Sprint:** After task extraction, the admin can create a sprint from the approved tasks. Options include single sprint (14-day default) or multi-sprint (groups of 10 tasks, sorted by priority, with duration calculated from estimated hours). Sprint creation generates entries in the sprints table and links tasks via sprint_tasks.

**API Calls:**
- `GET /admin/nexus/briefs/{id}` — fetch full brief details
- `POST /admin/nexus/briefs/{id}/launch` — start research (returns SSE stream)
- `POST /admin/nexus/briefs/{id}/review` — submit review with notes
- `POST /admin/nexus/briefs/{id}/approve` — approve the brief
- `POST /admin/nexus/briefs/{id}/reject` — reject the brief
- `POST /admin/nexus/briefs/{id}/codebase-preview` — preview codebase scan result

**What works:** The entire lifecycle is functional. Configuration, SSE streaming, review, approval, rejection, task extraction, and sprint creation all work end-to-end. The SSE streaming is particularly impressive — admins see research happen in real-time.

---

### AdminNexusSettings — The NEXUS Configuration Page

**Route:** `/admin/nexus/settings`
**File:** `client/src/admin/pages/AdminNexusSettings.tsx` (1602 lines)
**Status:** Fully functional (some subsections more complete than others)

This is the comprehensive configuration page for the NEXUS system. It contains multiple tabs/sections:

**Department Management:** Lists all 14 departments with their emoji, Hebrew name, default AI model, and active/inactive status. Admins can edit department settings: change the default model, override the system prompt, toggle active status, and configure expected output sections. Each department links to its team member management.

**Team Member Management:** Lists virtual team members per department. Shows name, role, level (C-Level/Manager/Senior/Member/Junior with colored badges), skills, and a quality score indicator. Admins can add, edit, or remove team members. Editing a member opens a detailed form with all CV fields: bio, experience years, education, certifications, domain expertise, languages, methodology, personality, achievements, background, and work history entries.

**AI Models Configuration:** Displays available AI models with their capabilities, pricing, and recommended use cases. The admin can see which models are configured (based on environment variables) and which are available as fallbacks.

**Skills Taxonomy:** CRUD interface for managing the nexus_skills table. Admins can add new skills (name, Hebrew label, color, category, description), edit existing skills, toggle active/inactive, and delete unused skills.

**Automation Rules:** CRUD interface for the rules engine. Lists all rules with trigger type, action type, priority, and active status. Creating or editing a rule involves selecting trigger type, configuring conditions, selecting action type, and configuring the action payload.

**Brief Templates:** Manage pre-configured research setups. Each template specifies departments, models, depth, scope, and whether it's the default. Admins can create new templates, edit existing ones, and track usage counts.

**Web Feeds:** Manage curated web sources for intelligence gathering. Lists RSS feeds, YouTube channels, Reddit sources, and GitHub repositories with their categories and department scoping. The learning system auto-adds high-trust sources discovered during research as inactive feeds — this section is where admins review and activate them.

**Knowledge Base:** Browse and manage per-department knowledge entries. Admins can add general facts, best practices, templates, references, and checklists that get injected into department prompts.

**What works:** Department management, team members, skills, and knowledge base are fully functional. Automation rules have the CRUD interface but execution verification is needed. Brief templates work. Web feeds management exists. Model configuration display is mostly read-only.

---

### AdminDepartmentKnowledge — Department Knowledge Base

**Route:** `/admin/nexus/departments/:dept/knowledge`
**File:** `client/src/admin/pages/AdminDepartmentKnowledge.tsx` (239 lines)
**Status:** Fully functional

A focused page for managing knowledge entries for a specific department. Shows a list of entries organized by category (general, best practice, template, reference, checklist) with add, edit, and delete functionality. Each entry has a title and content field (supports Markdown).

This is where institutional memory is stored — things like "Our API follows RESTful patterns with /admin/ prefix" or "All Hebrew text must support RTL layout." These entries are injected as Layer 5 of department agent prompts.

**API Calls:**
- `GET /admin/nexus/dept-knowledge?department={dept}` — fetch entries
- `POST /admin/nexus/dept-knowledge` — create entry
- `PUT /admin/nexus/dept-knowledge/{id}` — update entry
- `DELETE /admin/nexus/dept-knowledge/{id}` — delete entry

---

### AdminTeamMemberProfile — Team Member Detail Page

**Route:** `/admin/nexus/team/:id`
**File:** `client/src/admin/pages/AdminTeamMemberProfile.tsx` (761 lines)
**Status:** Fully functional

A detailed profile page for a single virtual team member. Displays all CV information in a card-based layout:

**Header:** Name, role (Hebrew and English), department badge, level badge (with hierarchical color: indigo for C-Level, blue for Manager, teal for Senior, slate for Member/Junior), emoji avatar.

**Profile Section:** Bio text, years of experience, education credentials, background summary, notable achievements.

**Skills & Expertise:** Skills displayed as colored badges, domain expertise areas, certifications with issuing bodies, spoken/programming languages.

**Work Style:** Methodology description (how they approach work), personality description (communication and collaboration style).

**Work History:** Timeline of previous positions showing company name, role title, tenure period, and career highlights.

**Quality Score:** A visual indicator showing the team member's quality score (out of 130 max). Scores are calculated from the presence and quality of each profile field. Higher scores mean richer prompt context.

**Prompt Preview:** A button that shows the exact prompt text that will be injected for this team member when their department runs. This is invaluable for iteration — admins can see exactly how the CV data translates into AI prompt context.

**Contribution Tracking:** Metrics showing how many briefs this team member's department has contributed to, and (in future) which specific research outputs cite their expertise.

---

## Part 3: Development Management Pages

### AdminDevDashboard — Dev Overview

**Route:** `/admin/dev-dashboard`
**File:** `client/src/admin/pages/AdminDevDashboard.tsx` (439 lines)
**Status:** Fully functional

The development overview page showing key metrics and quick navigation.

**Active Sprint Banner:** If a sprint is currently active, a prominent banner shows the sprint name, goal, progress (tasks completed / total), and days remaining. This is the most important piece of information for daily work.

**KPI Cards:** Four cards showing: total tasks across all columns, tasks in "In Progress" status, completed tasks, and overdue tasks (past due date). Each card has a count and a visual indicator.

**NEXUS Integration Banner:** Shows the number of active NEXUS research briefs and AI-generated tasks waiting in the kanban. This non-blocking fetch connects the research world to the development world.

**Quick Navigation:** Cards linking to Kanban, Sprints, Work Plan, OKR, and Project Analysis.

**API Calls:**
- `GET /admin/dev/columns` — fetch kanban columns
- `GET /admin/dev/tasks` — fetch all tasks
- `GET /admin/sprints` — fetch sprint data
- `GET /admin/nexus/briefs?limit=5` — fetch recent NEXUS briefs (non-blocking)

---

### AdminDevKanban — The Kanban Board

**Route:** `/admin/kanban`
**File:** `client/src/admin/pages/AdminDevKanban.tsx` (792 lines)
**Status:** Fully functional

The core development workspace — a drag-and-drop kanban board where tasks flow through workflow stages.

**Column Layout:** Each column represents a workflow stage (configurable, but typically: Backlog, To Do, In Progress, Review, Done). Columns are displayed horizontally, scrolling if needed. Each column header shows the column name, task count, and an optional color indicator.

**Task Cards:** Each task is rendered as a `TaskCard` component showing:
- A colored left border indicating priority (red for urgent/high, amber for medium, gray for low)
- An "AI" badge in the top-left if the task was generated by NEXUS (`aiGenerated=true`)
- The task title
- A due date badge (red with pulse animation if overdue, amber if due soon, blue otherwise)
- Estimate hours
- Description (clamped to 2 lines)
- Sprint/phase badge (if applicable)
- Category badge with color coding
- Label badges
- Assignee display
- "Start Dev" button — clicking this copies the formatted AI development prompt to the clipboard via `formatTaskForAI()` from `aiPromptFormatter.ts`
- Selection checkbox (in bulk selection mode)

**Drag and Drop:** Tasks can be dragged between columns. Dragging changes the task's `columnId`, moving it to a new workflow stage. The drag-and-drop is implemented with native HTML5 drag events, not a library. Visual feedback shows which column is the drop target.

**Filters:** A filter bar at the top provides:
- Category filter: all, feature, bug, refactor, infrastructure, design, documentation, security, research
- Priority filter: all, urgent, high, medium, low
- Assignee filter: all, or specific team members
- Sprint filter: all, or specific sprint
- Text search: filters tasks by title

**Bulk Actions:** Admins can toggle selection mode, select multiple tasks, and perform bulk actions (currently: bulk delete).

**Column Management:** Admins can add new columns or remove existing ones to customize the workflow.

**API Calls:**
- `GET /admin/dev/columns` — fetch column definitions
- `GET /admin/dev/tasks` — fetch tasks with optional filters
- `POST /admin/dev/tasks` — create a new task
- `POST /admin/dev/tasks/{id}/move` — move task to a different column
- `PUT /admin/dev/tasks/{id}` — update task details
- `DELETE /admin/dev/tasks/{id}` — delete task
- `GET /admin/sprints/active` — get active sprint for filtering

---

### The aiPromptFormatter — How Tasks Become Development Prompts

When an admin clicks "Start Dev" on a task card, the `formatTaskForAI()` function generates a structured Hebrew development prompt that Claude Code can execute. The prompt includes:

**Task Header:** Task title, ID, sprint name, environment label (with path hint like "Admin Frontend (client/src/admin/)"), priority badge, hour estimate, and category.

**Development Context:** A standard block stating: Claude Code AI model, the full tech stack (TypeScript, React 18, Vite, Tailwind CSS, shadcn/ui, Express, Drizzle ORM, PostgreSQL), a reference to the design system rules file, font (Heebo), RTL/Hebrew-first requirement, and component library (shadcn/ui).

**Task Description:** The full structured description from task extraction.

**Labels:** Any task labels displayed.

**Design System Quick Reference:** The most commonly needed CSS variables (`--admin-bg-main`, `--admin-bg-card`, `--admin-primary`), CSS classes (`admin-card`, `admin-input`, `admin-page-title`, `admin-muted`), available shadcn/ui components, and explicit prohibitions (`dark:` prefix, `#fff` direct).

**Bot Status Update:** A bash `curl` command that Claude Code should run after completing the task to move it to "Done" status via the bot API:
```
curl -X POST http://localhost:5001/admin/dev/tasks/{id}/bot-move \
  -H "Authorization: Bearer $KANBAN_BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"columnName": "Done"}'
```

This prompt format ensures Claude Code has everything needed to implement the task without additional context: what to build, where to build it, which design patterns to follow, and how to report completion.

---

### AdminSprints — Sprint List Page

**Route:** `/admin/sprints`
**File:** `client/src/admin/pages/AdminSprints.tsx` (392 lines)
**Status:** Fully functional

Lists all sprints with filtering by status (all, planning, active, completed).

Each sprint card shows: name, goal excerpt, date range, status badge, task count, and associated phase (if any). The active sprint gets special highlighting (indigo border, gradient background).

Key actions:
- **Start Sprint:** For planning-status sprints, a button activates the sprint (moves tasks to kanban, sets status to active)
- **Delete Sprint:** With confirmation dialog for non-empty sprints
- **NEXUS Link:** If the sprint was generated from NEXUS research, a badge links back to the source brief

**API Calls:**
- `GET /admin/sprints?status={filter}` — fetch sprints
- `POST /admin/sprints/{id}/activate` — activate a sprint
- `DELETE /admin/sprints/{id}` — delete a sprint
- `GET /admin/phases` — fetch phases for phase association display
- `GET /admin/nexus/briefs?limit=100` — map brief IDs to sprint cards

---

### AdminSprintDetail — Sprint Detail View

**Route:** `/admin/sprints/:id`
**File:** `client/src/admin/pages/AdminSprintDetail.tsx` (467 lines)
**Status:** Mostly functional (some tabs placeholder)

A detailed view of a single sprint with three tabs:

**Board Tab:** Displays sprint tasks in a card grid layout. Each task card shows department badge, document count, estimate hours, and story points. Tasks are ordered by their taskOrder field.

**Metrics Tab:** Shows sprint metrics: total tasks, completed tasks, completion percentage (with progress bar), total story points, and completed story points. A burndown chart is planned but currently shows a "Coming Soon" placeholder.

**Activity Tab:** Planned to show sprint activity log (task additions, removals, status changes, comments). Currently shows a "Coming Soon" placeholder.

**Sprint Actions:**
- Edit sprint (name, goal, dates) via EditSprintModal
- Start sprint (planning → active, pushes tasks to kanban)
- Complete sprint (with validation that checks for incomplete tasks; force-complete option available)
- Delete sprint
- Add tasks to sprint via AddTaskToSprintModal

**What's placeholder:**
- Burndown chart in Metrics tab
- Activity log in Activity tab

---

### AdminWorkPlan — Roadmap and Sprint Management

**Route:** `/admin/settings/work-plan`
**File:** `client/src/admin/pages/AdminWorkPlan.tsx` (650 lines)
**Status:** Functional with some hardcoded data

A unified view combining the project roadmap with sprint management.

**Roadmap Section:** Displays 9 development phases: MVP, Multi-family Support, Admin Panel, User Features, Integrations, Plans & Checkout, Testing & QA, Optimization & AI, Mobile. Each phase shows its status (completed/in_progress/pending), a list of items/goals, and is expandable. If phases exist in the database, their status is editable via dropdown.

**Sprint Section:** Lists upcoming and completed sprints with quick stats. The active sprint is highlighted. Completed sprints show the last 3 with a "show more" link.

**Actions:**
- Seed phases from the hardcoded roadmap data
- Create sprint from a phase (auto-calculated 14-day duration)
- Update phase status
- Various maintenance actions (reset phases, fix Phase 5, seed demo sprint)

---

## Part 4: Analysis and Strategy Pages

### AdminProjectAnalyze — AI Codebase Analysis

**Route:** `/admin/project/analyze`
**File:** `client/src/admin/pages/AdminProjectAnalyze.tsx` (1074 lines)
**Status:** Fully functional

A powerful AI analysis tool with four modes:

**Analyze Mode:** Runs predefined analysis types on the codebase: architecture review, performance analysis, security audit, code quality check, dependency analysis, etc. Configurable depth (quick/deep/full), scope (all/client/server), and model selection.

**Feature Mode:** Generates AI-powered feature implementation plans. The admin describes a feature, and the AI produces a detailed implementation plan with file changes, API endpoints, database modifications, and testing strategies.

**Ask Mode:** Free-form Q&A about the codebase. The admin types any question ("How does authentication work?", "Where are the payment routes?") and gets an AI-generated answer based on codebase analysis.

**Archive Mode:** Browse previous analyses with timestamps, types, models used, costs, and quality ratings.

**Rating System:** After each analysis, the admin can rate: output quality (1-5), dev quality (1-5), and process speed (fast/medium/slow). Ratings are stored in `admin_ai_analyses` and help benchmark model performance.

---

### AdminOKR — Objectives and Key Results

**Route:** `/admin/okr`
**File:** `client/src/admin/pages/AdminOKR.tsx` (150 lines)
**Status:** Mock data, partially functional

Displays OKRs with progress bars and key results. Currently uses hardcoded mock data with two objectives ("Increase User Base" at 65% progress, "Improve User Experience" at 80% progress). Links to approved NEXUS briefs to show how research aligns with objectives.

**What's placeholder:** OKR creation and editing. The "Create OKR" button is non-functional.

---

### AdminPlanner — Automation Scheduling

**Route:** `/admin/planner`
**File:** `client/src/admin/pages/AdminPlanner.tsx` (81 lines)
**Status:** Mock data, not connected to backend

Displays a grid of automation cards: daily reminders (08:00), weekly reports (Sunday 09:00), old task cleanup (monthly, disabled), AI suggestions (daily 20:00, disabled). Each card has an enable/disable toggle.

**What's placeholder:** Everything. The automations are mock data, the toggles don't persist, and there's no backend connection. This page is a UI concept for future automation scheduling.

---

### AdminStrategies — Workflow Documentation

**Route:** `/admin/strategies`
**File:** `client/src/admin/pages/AdminStrategies.tsx` (71 lines)
**Status:** Informational only

Displays three documented workflows as visual flow diagrams:
1. **Onboarding:** Register → Create Family → Add Patient → First Task
2. **Daily Tasks:** Create → Schedule → Remind → Execute → Complete
3. **Support:** Request → Find User → Diagnose → Solve → Follow Up

**What's placeholder:** These are static informational displays. There's no CRUD, no backend, and no automation. The page serves as documentation of intended workflows.

---

### AdminTaskDistributionSummary — Phase Task Analysis

**Route:** `/admin/phases/:phaseId/task-summary`
**File:** `client/src/admin/pages/AdminTaskDistributionSummary.tsx` (308 lines)
**Status:** Functional

Analyzes a development phase with AI and distributes the resulting tasks to a sprint.

**Workflow:**
1. Load the selected phase and display its goals
2. Click "Analyze" — sends the phase to AI for task breakdown
3. Review generated tasks (each with title, description, priority, hours, category)
4. Approve or reject individual tasks
5. Click "Sync to Sprint" — pushes approved tasks to the active sprint's kanban

**What's placeholder:** Task editing shows "Coming Soon" — individual task detail editing isn't implemented yet.

---

## Part 5: The Internationalization System

### Hebrew-First Design

The entire admin panel is built Hebrew-first. The `useAdminI18n()` hook provides a `tt()` translation function that maps keys to Hebrew (primary) or English (fallback) text. The translation dictionary in `adminTranslations.ts` contains 200+ translation keys covering navigation labels, common actions, error messages, and NEXUS-specific terminology.

Key NEXUS translations:
- `navNexusBriefs` → "Nexus — ניירות מחקר" (Nexus — Research Papers)
- `navNexusSettings` → "Nexus — הגדרות" (Nexus — Settings)

The RTL layout is handled by Tailwind's RTL utilities and CSS `direction: rtl`. All text alignment, margin/padding directions, and flexbox orders account for right-to-left reading.

### Language Switching

The i18n system supports dynamic language switching between Hebrew and English, though Hebrew is the default and primary language. Most technical terms (API names, model names, programming languages) remain in English even in Hebrew mode, following Israeli tech industry conventions.

---

## Part 6: Real-Time Features — SSE Streaming

### How SSE Works in the Admin Panel

Server-Sent Events (SSE) power the real-time research monitoring in AdminNexusBrief. When the admin clicks "Launch Research," the client opens an EventSource connection to `/admin/nexus/briefs/:id/launch`. The server sends events as the 7-step pipeline progresses.

**Client-Side Implementation:**
The page maintains several state variables for live updates:
- `streaming` (boolean) — whether SSE is active
- `deptLiveStatus` (Record<string, DeptLiveStatus>) — per-department status
- `liveTopSources` (array) — discovered web sources
- `liveCost` (number) — running cost total
- `liveTokens` (number) — running token total
- `completedDepts` / `totalDepts` (numbers) — progress tracking
- `webDone` (boolean) — web intelligence complete
- `assemblyDone` (boolean) — brief assembly complete

The EventSource receives events in text/event-stream format. Each event has a type (event name) and data (JSON payload). The client parser handles each event type and updates the corresponding state:

- `department_start` → sets department status to "running" with model info
- `department_done` → sets department to "completed," updates cost and token totals
- `department_error` → sets department to "failed" with error message
- `web_source_found` → adds source to the live feed
- `web_intelligence_done` → marks web phase complete
- `assembly_done` → marks assembly complete
- `done` → closes the stream, triggers page refresh to show review state
- `error` → shows error message, resets to draft

This creates a live dashboard experience where the admin watches research unfold in real-time — seeing each department start and finish, watching sources being discovered, and tracking costs as they accumulate.

---

## Part 7: The Design System in Practice

### CSS Variables and Theming

The admin panel uses a carefully controlled set of CSS custom properties:

- `--admin-bg-main`: #0f172a (dark navy, main background)
- `--admin-bg-card`: rgba(30,41,59,0.5) (semi-transparent dark slate, card backgrounds)
- `--admin-primary`: #818cf8 (indigo, primary accent)
- `--admin-primary-hover`: #6366f1 (darker indigo, hover states)
- `--admin-border`: rgba(148,163,184,0.15) (very subtle border)

### Component Classes

Custom CSS classes provide consistent styling:
- `admin-card`: Rounded card with dark background, subtle border, padding
- `admin-input`: Dark input field with border and focus ring
- `admin-page-title`: Large heading with font-bold
- `admin-muted`: Dimmed text (slate-400)

### Status Color Conventions

Throughout the admin panel, colors consistently indicate status:
- **Green** (emerald-400/500): Success, completed, approved, active
- **Blue** (blue-400/500): In progress, researching, info
- **Amber** (amber-400/500): Warning, pending review, caution
- **Red** (red-400/500): Error, failed, rejected, overdue, urgent
- **Indigo** (indigo-400/500): NEXUS-branded, primary actions, selected
- **Slate** (slate-400/500): Neutral, draft, inactive, placeholder

### Responsive Design

The admin panel uses Tailwind's responsive breakpoints:
- Mobile (default): Single column, stacked layout
- Tablet (sm:, md:): Two-column grids
- Desktop (lg:, xl:): Three or four column grids
- Full layouts use `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

---

## Part 8: Complete User Workflows

### Workflow 1: Running a Full NEXUS Research

1. Navigate to `/admin/nexus` (NexusHub)
2. Click "Create New Brief"
3. Type the idea: "Smart medication reminder system with AI pattern analysis"
4. Click Create — brief created in draft status
5. Click the brief card to open detail page
6. Select departments: CEO, CTO, CPO, R&D, Design, Product, Security, Finance (8 departments)
7. Select models: Claude (primary), Gemini (fallback)
8. Set depth: deep, scope: all
9. Add context: "Focus on elderly user accessibility, consider HIPAA compliance"
10. Click "Launch Research"
11. Watch SSE streaming: web sources appear, departments start/complete one by one
12. Total cost: ~$18, duration: ~3 minutes
13. Brief assembled, status moves to "review"
14. Read the assembled brief — 14 sections of analysis
15. Click "Approve"
16. Click "Extract Tasks" — AI produces 32 development tasks
17. Review tasks, reject 4 that are redundant
18. Click "Create Sprint" — single sprint, 14 days
19. Navigate to `/admin/sprints` — see new sprint in planning
20. Click "Start Sprint" — tasks move to kanban
21. Navigate to `/admin/kanban` — 28 tasks in Backlog/To Do columns
22. Click "Start Dev" on first task — prompt copied to clipboard
23. Paste into Claude Code — development begins

### Workflow 2: Managing Day-to-Day Development

1. Check `/admin/dev-dashboard` — see active sprint progress, KPIs
2. Navigate to `/admin/kanban` — see task board
3. Filter by priority: urgent — focus on critical tasks
4. Drag a task from "To Do" to "In Progress"
5. Click "Start Dev" — copy AI prompt
6. After Claude Code implements: bot API moves task to "Done"
7. Check sprint progress on dev dashboard
8. When sprint complete: navigate to sprint detail, click "Complete Sprint"

### Workflow 3: Configuring NEXUS for Better Results

1. Navigate to `/admin/nexus/settings`
2. Go to Team Members section
3. Click a team member with low quality score
4. Fill in missing CV fields: add education, certifications, methodology
5. Check quality score — improved from 65 to 105
6. Click "Preview Prompt" — see richer context in the prompt
7. Go to Knowledge Base section
8. Add entry for Design department: "All new components must follow WCAG 2.1 AA"
9. Category: best_practice
10. Go to Skills section
11. Add new skill: "healthcare-compliance" with category "domain"
12. Next research brief will benefit from improved team profiles, knowledge, and skills

---

## Part 9: What's Functional vs. Placeholder — Honest Assessment

### Fully Functional (Production-Ready)

- NexusHub: Brief listing, creation, deletion, filtering, search
- NexusBrief: Full lifecycle — draft configuration, SSE streaming research, review, approval, task extraction, sprint creation
- NexusSettings: Department management, team members, skills, knowledge base
- DepartmentKnowledge: CRUD for knowledge entries
- TeamMemberProfile: Full CV display and editing
- DevDashboard: KPIs, sprint banner, NEXUS integration
- DevKanban: Drag-drop, filters, task creation, "Start Dev" prompt copy, bulk actions
- Sprints: List, activate, complete, delete
- SprintDetail: Board tab, basic metrics, sprint management actions
- WorkPlan: Roadmap display, sprint management, phase actions
- ProjectAnalyze: All four modes (analyze, feature, ask, archive) with rating system
- TaskDistributionSummary: Phase analysis and task sync
- aiPromptFormatter: Complete prompt generation with bot API integration

### Partially Built (Functional But Incomplete)

- NexusSettings automation rules: CRUD works, execution may not be fully wired
- NexusSettings web feeds: Display works, review/activate workflow needs polish
- SprintDetail metrics tab: Basic stats shown, burndown chart placeholder
- OKR: Display works with mock data, creation not functional
- Model routing UI: Read-only display, no editing

### Placeholder / Not Connected

- AdminPlanner: Mock automation schedules, no backend
- AdminStrategies: Static informational display only
- SprintDetail activity tab: "Coming Soon" placeholder
- Some download features in ProjectAnalyze (PDF/Word generation)

---

## Part 10: Technical Implementation Details

### State Management

All NEXUS pages use React's built-in `useState` and `useEffect` hooks. There is no global state management library (no Redux, no Zustand, no MobX). Each page manages its own state independently. Data is fetched from the API on mount and re-fetched when relevant dependencies change.

The common API pattern across all pages:
```typescript
async function load() {
  setLoading(true)
  try {
    const data = await apiFetch<Type>('/endpoint')
    setState(data)
  } catch (err) {
    console.error(err)
    setState(defaultValue)
  } finally {
    setLoading(false)
  }
}
useEffect(() => { load() }, [dependency])
```

### Routing

The admin panel uses `wouter` as its router (a lightweight alternative to React Router). Routes are defined in `App.tsx`. The `useRoute()` hook extracts URL parameters, and `useLocation()` handles navigation.

### API Communication

All API calls go through an `apiFetch()` utility that handles: base URL configuration, authentication headers, JSON parsing, and error handling. The base URL defaults to `http://localhost:5001` (the Express server).

### Component Reuse

Several components are shared across NEXUS pages:
- `TaskCard` — used in kanban, sprint detail, and task distribution
- `CreateSprintModal` — used in sprints page and work plan
- `EditSprintModal` — used in sprint detail
- `AddTaskToSprintModal` — used in sprint detail
- `MarkdownRenderer` — used everywhere that renders AI output
- `ColumnManagement` — used in kanban for column CRUD
- `AdminDialog` — standard modal dialog wrapper
- `AdminErrorBoundary` — error boundary for graceful error display
- `AdminBreadcrumbs` — navigation breadcrumbs based on current path
