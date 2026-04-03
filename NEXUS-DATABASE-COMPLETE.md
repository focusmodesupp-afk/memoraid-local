# NEXUS Database Architecture — Complete Data Model Reference

> The definitive guide to every database table, field, relationship, and data flow in the NEXUS Virtual Software House system. This document explains not just WHAT the data looks like, but WHY each table exists, HOW data flows between them, and WHAT role each field plays in the broader system.

---

## Part 1: The Database Philosophy — Why NEXUS Has So Many Tables

The NEXUS system is built on PostgreSQL, accessed through Drizzle ORM in TypeScript. However, not all tables are managed by Drizzle — some are created and maintained through raw SQL. Understanding why requires understanding how the system evolved.

When MemorAid began, it was a simple healthcare management app: families, patients, tasks, medications. The database schema reflected that simplicity. But when NEXUS was introduced — the Virtual Software House that manages all AI-driven research and development — the database grew dramatically. NEXUS needed tables for research briefs, department outputs, web intelligence sources, extracted tasks, skills taxonomies, automation rules, templates, knowledge bases, team member profiles, question discovery, and more.

The result is a database with roughly 14 NEXUS-specific tables managed by Drizzle ORM, plus 3 additional tables created via raw SQL that predate the Drizzle migration or were added ad-hoc during rapid development. These raw SQL tables include the team members table (which stores 98 virtual employee CVs), the web feeds table (for curated RSS/YouTube/Reddit sources), and the generated documents table (for the 8 specification document types).

All tables use UUIDs as primary keys (generated randomly via `defaultRandom()`), timestamps with timezone (`withTimezone: true`), and follow a consistent naming convention: snake_case for SQL column names, camelCase for TypeScript property names. Drizzle handles the mapping between these conventions automatically.

The database can be conceptually divided into several layers: the Core Brief Layer (where research briefs live), the Intelligence Layer (web sources and department outputs), the Planning Layer (extracted tasks, sprints, kanban), the Configuration Layer (skills, rules, templates, settings, knowledge), the Team Layer (virtual employees), and the Analytics Layer (AI usage tracking, cost analysis).

---

## Part 2: The Core Brief Layer — Where Research Lives

### nexus_briefs — The Heart of NEXUS

The `nexus_briefs` table is the central table in the NEXUS system. Every research brief — from the moment an admin types an idea to the moment it produces running code — is tracked here. This table captures the full lifecycle of an idea.

**The id field** is a UUID primary key generated randomly. Every other NEXUS table references this ID when it needs to connect back to a specific research brief. It is the gravitational center of the NEXUS data model.

**The title field** is a VARCHAR(500) that stores the auto-generated Hebrew title. When a brief is first created, the title starts as a generic placeholder. After research completes, NEXUS uses Gemini AI (chosen for speed and low cost) to generate a concise Hebrew title of 3-6 words that captures the essence of the research. The 500-character limit is generous because Hebrew titles tend to be shorter than their English equivalents, but NEXUS errs on the side of never truncating.

**The ideaPrompt field** is a TEXT column that stores the original idea as typed by the admin. This is the raw input that drives the entire research process. It could be anything from "Smart medication reminder system with AI pattern analysis" to "Add dark mode support to the user interface." The idea prompt is sent to every department agent as the core question they must analyze.

**The status field** uses a PostgreSQL enum (`nexus_brief_status`) with 7 possible values that represent the brief's lifecycle stages. "draft" means the brief has been created but research hasn't started — the admin is still configuring which departments to involve, which AI models to use, and what codebase scan depth to apply. "researching" means the 7-step pipeline is actively running — department agents are analyzing, web intelligence is being gathered, and SSE events are streaming to the admin's browser in real-time. "review" means all research is complete and the assembled brief is ready for the admin to read and evaluate. "approved" means the admin has given the green light — the brief can now have tasks extracted and sprints created. "rejected" means the admin decided the research wasn't satisfactory, possibly adding review notes explaining why. "in_progress" means tasks have been extracted and development has begun. "done" means all associated tasks are complete and the feature is implemented.

**The selectedDepartments field** is a TEXT array that stores which departments were chosen for this research session. For example, `['ceo', 'cto', 'cpo', 'design', 'r&d', 'security']` means six departments will analyze the idea. The admin selects these via checkboxes in the brief configuration wizard. This field determines which agents run during Step 4 of the pipeline.

**The selectedModels field** is a VARCHAR array storing the AI model preferences. Values like `['claude', 'openai', 'gemini']` tell the model router which providers to prefer. If the admin selects only 'claude', all departments will use Claude (with Gemini as automatic fallback if Claude fails).

**The assembledBrief field** is a TEXT column that can be very large — potentially tens of thousands of characters. After all department agents complete their analysis, the orchestrator assembles their outputs into a single Markdown document with sections for each department, an executive summary, metadata, and recommendations. This assembled brief is what the admin reads during the review phase, and it's also the primary input for task extraction.

**The reviewNotes field** stores the admin's feedback when they review the brief. If the admin rejects the brief, they can explain why: "The CTO's cost analysis doesn't account for the Perplexity API we'd need" or "The security assessment should include HIPAA compliance details." These notes help when the brief is reset to draft for re-research.

**The contextNotes field** is the admin's special instructions provided during configuration. For example: "Focus on accessibility — our users are elderly caregivers" or "This feature should be Hebrew-first, English can come later." Context notes are injected as Layer 1 of every department agent's prompt, ensuring all departments consider the admin's specific requirements.

**The targetPlatforms field** is a TEXT array specifying which platforms the feature targets: `['web']`, `['web', 'mobile']`, or `['web', 'mobile', 'desktop']`. This influences department recommendations — a mobile target means Design will consider touch interactions, CTO will evaluate React Native vs PWA, and Product Manager will write mobile-specific user stories.

**The codebaseDepth field** controls how deeply NEXUS scans the existing codebase before running agents. "quick" provides a high-level overview of file structure. "deep" reads key files and extracts function signatures. "full" does an exhaustive scan of the entire project. Deeper scans give agents more context about existing code but cost more tokens and take longer.

**The codebaseScope field** determines which parts of the codebase to scan: "all" scans everything, "client" focuses on frontend code, "server" focuses on backend code. For a UI-only feature, scanning only the client reduces noise in agent prompts.

**The totalCostUsd field** tracks the cumulative cost of all AI API calls made during research. Every department agent, every web research query, every title generation — each call's cost is added here. A typical full research (13 departments + Perplexity + title generation) costs between $15-25 USD. This field is updated in real-time during research via SSE events.

**The totalTokensUsed field** tracks the total token consumption (input + output) across all API calls. This is useful for monitoring and optimization — some departments consistently use more tokens than others, and this data helps tune prompt sizes.

**The adminUserId and adminFullName fields** track who created the brief. The user ID is a foreign key to the admin_users table, while the full name is stored redundantly for quick display without joins.

**The researchStartedAt and researchCompletedAt timestamps** mark the exact duration of the research pipeline. The difference between these two timestamps tells you how long the full 7-step pipeline took — useful for performance monitoring and optimization.

**The approvedAt and approvedBy fields** record when and who approved the brief. This creates an audit trail: you can always trace back which admin approved a research brief that led to specific development tasks.

**The generatedSprintId field** links to the sprint that was created from this brief's extracted tasks. Not all briefs produce sprints (the admin might extract tasks but not create a sprint yet), so this is nullable.

**The phaseId field** optionally links the brief to a development phase (from the roadmap/work plan). This helps track which phase of the product roadmap a research brief belongs to.

**The templateId field** records which brief template was used (if any). Templates are pre-configured research setups like "Full Research" (all departments), "Quick Review" (CEO + CTO + CPO only), or "Security Audit" (Security + Legal + CTO). When a template is used, its usage count is incremented.

---

### nexus_brief_departments — Individual Department Outputs

The `nexus_brief_departments` table stores the output of each department agent for each brief. If a brief runs 13 departments, this table will have 13 rows for that brief — one per department.

**The briefId field** is a foreign key to `nexus_briefs` with CASCADE delete — if the brief is deleted, all department outputs are automatically removed. This is important because department outputs can be very large (each output might be 2000+ tokens of structured Markdown), and orphaned outputs would waste significant database space.

**The department field** stores the department identifier: 'ceo', 'cto', 'cpo', 'r&d', 'design', 'product', 'security', 'legal', 'marketing', 'finance', 'hr', 'cs', 'sales', or 'ai-dev'. This VARCHAR(32) is used to match the department's configuration, system prompt, and team members during prompt construction.

**The status field** tracks where this specific department's analysis stands: 'pending' means the agent hasn't started yet, 'running' means the AI is currently generating output, 'completed' means the output is ready, and 'failed' means the agent encountered an error. These status values are sent as SSE events to the admin's browser during research.

**The output field** is a TEXT column that stores the department's complete analysis in Markdown format. This is the substantial content — the CEO's business viability assessment, the CTO's architecture recommendation, the Security team's threat model, etc. Each department's system prompt enforces a specific structure with required sections, so the output is consistently organized. Some outputs can be 3000+ characters of detailed analysis.

**The modelUsed field** records which AI model actually generated this output. This is important for debugging and quality comparison. If a brief used Claude for most departments but fell back to Gemini for one (due to rate limiting), you can see exactly which department used which model. Values like 'claude-sonnet-4-6', 'gpt-4o', 'gemini-3-1-pro' are stored here.

**The tokensUsed and costUsd fields** track the token consumption and cost for this specific department's analysis. This granular tracking lets admins see which departments are most expensive and optimize accordingly. The CTO department, for example, tends to use more tokens than Marketing because architecture analysis requires more detailed output.

**The errorMessage field** captures the error details if the department failed. Common errors include model rate limits ("429 Too Many Requests"), context length exceeded (prompt too large), or API timeouts. This field helps diagnose and fix research failures.

**The promptSnapshot field** is particularly valuable — it stores the exact prompt that was sent to the AI model, including all 9 layers of context injection. This means you can always see exactly what a department agent received as input, which is critical for debugging unexpected outputs or iterating on prompt quality. The prompt preview feature in the admin UI reads from this field.

**The startedAt and completedAt timestamps** measure how long each department took. Some departments are faster than others — a CEO analysis might take 15 seconds, while a comprehensive Security threat model might take 45 seconds. These timings help identify bottlenecks.

---

### nexus_brief_web_sources — Web Intelligence Discoveries

The `nexus_brief_web_sources` table stores every web source discovered during the intelligence gathering phase (Step 3 of the pipeline). A single research session might discover 30-50 sources from across GitHub, Reddit, RSS feeds, and Perplexity AI.

**The briefId field** links to the parent brief with CASCADE delete — when a brief is deleted, all its web sources are cleaned up.

**The sourceType field** categorizes where the source came from. Values include 'github' (repository from GitHub search), 'reddit' (post from Reddit), 'rss' (article from RSS feed), 'perplexity' (Perplexity AI synthesis or citation), and 'webpage' (generic web page). This categorization is important because different source types have different trust score calculations and different display formats in the UI.

**The url field** stores the source's web address. For GitHub sources, this is the repository URL. For Reddit, it's the post URL. For RSS, it's the article link. For Perplexity, it's the citation URL (or null for synthesis results). This URL is displayed to the admin and also included in department prompts so agents can reference specific sources.

**The title field** is the human-readable title of the source — a GitHub repo name, Reddit post title, RSS article headline, or Perplexity section title. This is displayed in the UI's source discovery feed during SSE streaming and in the assembled brief's source references.

**The snippet field** stores an excerpt from the source — a description of the GitHub repo, a summary of the Reddit post, the first few sentences of an RSS article, or a chunk of Perplexity's analysis. Snippets help agents and admins quickly understand what each source offers without visiting the full URL.

**The trustScore field** is an integer from 0-100 that represents how reliable and relevant NEXUS considers this source. Trust scores are calculated differently per source type. For GitHub repositories, the formula is `Math.min(100, Math.round(Math.log10(stars + 1) * 20 + Math.log10(contributors + 1) * 10))` — a repo with 10,000 stars and 100 contributors gets about 80-85 trust. For Reddit posts, it's `Math.round(Math.log10(score + 1) * 15)` — a post with 1000 upvotes gets about 45 trust. Perplexity synthesis results get a flat 75 trust (AI-curated), while individual Perplexity citations get 60. RSS feeds get 50-70 depending on the source's reputation. Trust scores determine the order in which sources appear in agent prompts (highest first) and whether they're auto-saved for future use (threshold: 65).

**The githubStars, redditScore, and contributorCount fields** store the raw metrics used to calculate trust scores. These are also displayed in the admin UI so the admin can understand why a source received its trust score.

**The rawPayload field** is a JSONB column that stores the complete API response for each source. For GitHub, this includes the full repository metadata. For Perplexity, the complete API response with all citations. This raw data is preserved for potential future use — deeper analysis, alternative trust score calculations, or debugging source quality issues.

---

## Part 3: The Configuration Layer — System Settings

### nexus_skills — Skills Taxonomy

The `nexus_skills` table defines the project's skill taxonomy — a controlled vocabulary of technologies, domains, and capabilities that can be assigned to team members and tasks. Skills serve two purposes: they help tag tasks during extraction (so a React-related task gets the 'react' skill tag), and they're injected into every agent's prompt so departments understand the project's capability landscape.

**The name field** is a VARCHAR(64) with a UNIQUE constraint. Values are English technical terms: 'react', 'typescript', 'postgresql', 'tailwind', 'drizzle-orm', 'claude-api', 'healthcare-domain', 'wcag-accessibility'. The unique constraint prevents duplicate skills.

**The labelHe field** stores the Hebrew display name: "React", "TypeScript", "PostgreSQL", "Tailwind CSS". While most tech terms are the same in Hebrew, domain skills like 'healthcare-domain' become "תחום בריאות" in Hebrew.

**The color field** is a hex color code (VARCHAR(7)) used for skill badges in the UI. The default is '#6366f1' (indigo). Different categories can use different colors for visual distinction.

**The category field** classifies the skill into one of six categories: 'tech' (programming languages, frameworks), 'ai' (AI/ML related), 'domain' (business domain knowledge), 'design' (UI/UX related), 'qa' (quality assurance), 'ops' (operations, deployment). This categorization helps filter and organize skills in the admin UI.

**The isActive flag** determines whether the skill appears in agent prompts. Inactive skills still exist in the database (for historical references) but aren't injected into new research sessions.

---

### nexus_rules — Automation Rules Engine

The `nexus_rules` table stores configurable automation rules that trigger actions based on NEXUS events. These rules are designed to reduce manual work — for example, automatically extracting tasks when a brief is approved, or sending webhooks to external systems when research completes.

**The name field** gives the rule a human-readable identifier like "Auto-extract tasks on approval" or "Notify admin when research completes."

**The description field** explains what the rule does and why it exists, helping admins understand the automation landscape.

**The triggerType field** defines which event activates this rule. The five trigger types are: 'brief_approved' (fires when an admin approves a brief), 'brief_rejected' (fires on rejection), 'research_done' (fires when the 7-step pipeline completes and status becomes 'review'), 'task_created' (fires when tasks are extracted from a brief), and 'sprint_created' (fires when a sprint is generated from NEXUS tasks). Each trigger type corresponds to a specific point in the brief lifecycle.

**The conditionJson field** is a JSONB column storing additional conditions that must be met for the rule to fire. For example, a rule might specify that auto-extraction only happens for briefs with more than 5 departments selected, or that webhooks only fire for briefs in certain categories. The condition JSON structure varies by trigger type.

**The actionType field** defines what happens when the rule triggers. Five action types are available: 'auto_extract_tasks' automatically runs the task extraction AI on the approved brief (with configurable maxTasks in the payload), 'notify_admin' sends a notification to specified admin users, 'auto_create_sprint' automatically creates a sprint from extracted tasks, 'webhook' sends an HTTP POST to a configured URL (useful for N8N, Slack, or other external integrations), and 'audit_log' records the event in the audit trail for compliance purposes.

**The actionPayload field** is JSONB storing action-specific parameters. For 'auto_extract_tasks', this might be `{ "maxTasks": 15 }`. For 'webhook', it includes `{ "url": "https://n8n.example.com/webhook/nexus-approved", "headers": {...} }`. For 'notify_admin', it specifies `{ "adminUserIds": ["uuid1", "uuid2"], "message": "Brief {{briefTitle}} approved" }`.

**The priority field** determines execution order when multiple rules match the same trigger. Higher numbers execute first (0-100 range). This matters when rules have dependencies — you might want task extraction (priority 90) to complete before sprint creation (priority 50).

**The isActive flag** allows temporarily disabling rules without deleting them. This is useful for maintenance, testing, or seasonal deactivation.

It's important to note that while the rules are stored in the database and the CRUD endpoints work, the actual execution of rule triggers within the pipeline may not be fully wired in all cases. The infrastructure is in place, but verifying that every trigger type correctly fires its associated rules requires careful testing.

---

### nexus_templates — Brief Templates

The `nexus_templates` table stores pre-configured research setups that save admins time when creating new briefs.

**The name and nameHe fields** store the template name in English and Hebrew respectively. Examples: "Full Research" / "מחקר מלא", "Quick Review" / "סקירה מהירה", "Security Audit" / "ביקורת אבטחה".

**The departments field** is a TEXT array pre-selecting which departments to involve. A "Full Research" template includes all departments, while a "Quick Review" might only include `['ceo', 'cto', 'cpo']`.

**The models field** pre-selects AI model preferences. A budget-conscious template might default to `['gemini']`, while a quality-focused one uses `['claude', 'openai']`.

**The codebaseDepth and codebaseScope fields** pre-configure the codebase scan. A "Security Audit" template might use depth='deep' and scope='server' to focus deeply on backend code where most security vulnerabilities live.

**The isDefault flag** marks one template as the system default — it's pre-selected when creating a new brief. Only one template should be marked as default.

**The usageCount field** tracks how many briefs have used this template. This helps admins understand which templates are most popular and useful, and informs decisions about which templates to keep, modify, or retire.

---

### nexus_dept_settings — Department Configuration

The `nexus_dept_settings` table stores per-department configuration that controls how each department agent behaves.

**The department field** has a UNIQUE constraint — there's exactly one settings row per department. Values: 'ceo', 'cto', 'cpo', 'r&d', 'design', 'product', 'security', 'legal', 'marketing', 'finance', 'hr', 'cs', 'sales', 'ai-dev'.

**The labelHe field** stores the Hebrew display name: "מנכ״ל" (CEO), "CTO", "CPO", "מוצר" (Product), "מו״פ" (R&D), "עיצוב" (Design), "אבטחה" (Security), "משפטים" (Legal), "שיווק" (Marketing), "כספים" (Finance), "משאבי אנוש" (HR), "הצלחת לקוח" (CS), "מכירות" (Sales), "AI-Dev".

**The emoji field** provides a visual identifier for each department: 👔 CEO, ⚙️ CTO, 🎯 CPO, 🔬 R&D, 🎨 Design, 📋 Product, 🔒 Security, ⚖️ Legal, 📣 Marketing, 💰 Finance, 👥 HR, 🤝 CS, 💼 Sales, 🤖 AI-Dev. These emojis appear throughout the admin UI in brief cards, department status indicators, and task badges.

**The systemPromptOverride field** is crucial — it allows admins to customize a department's system prompt without changing code. If the admin writes a custom prompt here, it replaces the hardcoded default prompt in `nexusDepartmentAgents.ts`. This is powerful for iteration: an admin can refine what the CEO agent focuses on, add specific instructions for the Security department, or adjust the Design department's constraints — all without redeploying.

**The defaultModel field** lets admins assign a preferred AI model per department. If the CEO should always use Claude (for best Hebrew analysis) while R&D can use cheaper Gemini (for technical research), this configuration makes that possible. When set, this model takes priority in the routing chain over the system defaults.

**The isActive flag** controls whether the department appears in the selection UI and can be included in research. Deactivating a department is useful when it's being reconfigured or when its analysis isn't needed for a particular project phase.

**The outputSections field** is a JSONB array defining the expected sections in the department's output. For the CEO: `["Business Viability", "Market Opportunity", "Competitive Analysis", "Business Risks", "CEO Decision"]`. This metadata is used for output validation and UI display.

---

### nexus_dept_knowledge — Department Knowledge Base

The `nexus_dept_knowledge` table stores institutional knowledge that persists across research sessions. These are facts, conventions, templates, and checklists that departments should always consider.

**The department field** scopes the knowledge to a specific department. A Security knowledge entry like "All API endpoints must validate JWT tokens" only gets injected into the Security department's prompt, not into Marketing's.

**The category field** organizes knowledge into five types: 'general' covers broad project facts and conventions ("We use Drizzle ORM, never raw SQL in application code"). 'best_practice' documents proven approaches ("All new database tables must have createdAt and updatedAt timestamps"). 'template' provides reusable content structures ("User story template: As a [role], I want [feature] so that [benefit]"). 'reference' links to external documentation ("See ADMIN_THEME_RULES.md for the design system"). 'checklist' provides verification lists ("Before recommending a library: check license, check last commit date, check TypeScript support, check bundle size").

**The content field** stores the actual knowledge entry in text/Markdown format. This content is directly injected into the department's prompt as Layer 5 of the 9-layer context system. Longer entries consume more tokens in the prompt, so admins should keep entries focused and concise.

**The isActive flag** allows temporary deactivation of knowledge entries without deleting them. This is useful for seasonal or project-phase-specific knowledge.

**The position field** determines the display order in the admin UI and the injection order in prompts. Critical knowledge should have a low position number (appears first).

---

## Part 4: The Planning Layer — Tasks, Sprints, and Kanban

### nexus_extracted_tasks — Tasks Born from Research

The `nexus_extracted_tasks` table stores the development tasks that are extracted from an approved brief by Claude AI. These are the intermediate representation between research output and kanban work items.

**The briefId field** links back to the source brief with CASCADE delete. This is essential because extracted tasks are meaningless without their research context — if a brief is deleted, its tasks should go too.

**The title field** is a VARCHAR(500) storing the task title in Hebrew. The 500-character limit accommodates descriptive Hebrew titles like "הוספת מערכת תזכורות חכמה עם זיהוי דפוסים אנומליים בזמני נטילת תרופות" (Add smart reminder system with anomaly detection in medication timing patterns).

**The description field** stores the full developer brief for this task in Markdown format. This is a structured document with sections: "What to do" (the implementation requirements), "Files to touch" (which existing files need modification), "API" (new or modified endpoints), "DB" (database changes), "Acceptance Criteria" (how to verify the task is done), "Sources" (web sources that informed this task), and "Dependencies" (other tasks that must be completed first). This structured description is what Claude Code AI reads when implementing the task.

**The priority field** ranks the task as 'urgent', 'high', 'medium', or 'low'. Priorities are determined by the AI during extraction based on the departments' recommendations — if the CEO and CTO both emphasized a particular aspect, related tasks get higher priority. Urgent tasks typically relate to security vulnerabilities or blocking issues.

**The estimateHours field** stores the AI's estimate of how many hours the task will take to implement. This is in AI-hours (how long it takes Claude Code, not a human developer). Estimates range from 1 (simple CSS change) to 40 (complex full-stack feature). These estimates drive sprint duration calculations.

**The category field** classifies the task's nature: 'feature' (new functionality), 'bug' (fix existing issue), 'refactor' (improve existing code), 'infrastructure' (DevOps, CI/CD, database), 'design' (UI/UX improvements), 'documentation' (docs, comments, README), 'security' (security hardening), 'research' (spike/investigation). The category affects how the task is displayed in the kanban board (different color badges) and helps with workload balancing.

**The skillTags field** is a TEXT array of skill names from the nexus_skills taxonomy: `['react', 'typescript', 'postgresql', 'tailwind']`. This connects tasks to skills for filtering and assignment.

**The sourceDepartment field** records which department's analysis primarily spawned this task. If the Security department identified a CSRF vulnerability, the resulting fix task has sourceDepartment='security'. This provides traceability from task back to research.

**The environment field** specifies where the task needs implementation: 'user-frontend' (client/src/ — not admin), 'user-backend' (server/src/ user routes), 'admin-frontend' (client/src/admin/), 'admin-backend' (server/src/ adminRoutes), 'server' (core services, DB), or 'fullstack' (spans multiple layers). This tagging is crucial because it determines the development order and helps Claude Code focus on the right part of the codebase.

**The accepted field** is a boolean that records whether the admin approved this specific task. When tasks are extracted, the admin reviews them and can approve or reject individual tasks. Only accepted tasks can be added to sprints.

**The devTaskId field** links to the corresponding dev_tasks entry in the kanban system. This is the bridge field — when an extracted task is moved to a sprint and the sprint is activated, a dev_task is created and this field is populated with the new task's ID. This bidirectional link allows the system to trace from kanban back to research.

**The sprintId and phaseId fields** track which sprint and development phase the task belongs to.

**The position field** determines the task's order within the brief's task list. Tasks are typically ordered by priority (urgent first) and then by dependency chain.

**The contextJson field** is a JSONB column that stores additional context linking the task back to its research sources. It includes `webSourceIds` (UUIDs of nexus_brief_web_sources entries that informed this task), `departmentId` (the nexus_brief_departments entry that spawned it), and `docReferences` (references to generated specification documents with section hints for relevant passages). This context is carried forward into the kanban's nexus_context when the task is activated.

---

### dev_columns — Kanban Board Structure

The `dev_columns` table defines the columns (stages) of the kanban board. This is a simple but important table — it determines the workflow stages that tasks move through.

**The name field** stores the column name: typical values are "Backlog", "To Do", "In Progress", "Review", "Done". Admins can create custom columns to match their workflow.

**The position field** determines the left-to-right order of columns on the board. Lower numbers appear on the left (earlier in the workflow).

**The color field** stores an optional color code for the column header, allowing visual distinction between workflow stages.

---

### dev_tasks — The Kanban Work Items

The `dev_tasks` table is where actual development work lives. This is the table that Claude Code AI interacts with when implementing features — tasks here have the full context needed for implementation.

**The title and description fields** store the task's name and implementation brief. For tasks generated by NEXUS, these come from the nexus_extracted_tasks data. For manually created tasks, admins write them directly.

**The columnId field** references dev_columns, placing the task in a specific workflow stage. Moving a task from "In Progress" to "Done" means updating this foreign key. The drag-and-drop kanban UI performs this update via the `/admin/dev/tasks/:id/move` endpoint.

**The priority field** uses 'urgent', 'high', 'medium', 'low' values. In the UI, these are visually distinguished: urgent gets a red left border, high gets amber, medium and low get slate gray.

**The category field** classifies the task type (same categories as extracted tasks). Each category has a distinct color badge in the UI.

**The assignee field** stores who's assigned to the task. In NEXUS's context, this is usually "Claude Code" or a specific admin's name.

**The labels field** is a TEXT array for additional tags: `['sprint-13', 'phase-5', 'frontend', 'accessibility']`. Labels provide flexible categorization beyond the structured category field.

**The estimateHours and actualHours fields** track estimated vs actual implementation time. The estimate comes from NEXUS's AI extraction, while actual hours are filled in after completion. Comparing these helps calibrate future estimates.

**The dueDate field** sets a deadline for the task. This is calculated from the sprint's end date and the task's priority.

**The position field** determines the task's order within its column. Lower numbers appear at the top.

**The sprintId and phaseId fields** link the task to its sprint and development phase. Tasks can belong to a sprint (for sprint-based work), a phase (for roadmap-based work), or both.

**The targetFile field** suggests which file the implementation should primarily modify. This is a hint for Claude Code AI to know where to start.

**The estimatedTokens field** estimates how many AI tokens implementing this task will cost. This helps with budget planning.

**The dependsOn field** is a JSONB array of task IDs that must be completed before this task can start. The kanban UI can visualize these dependencies.

**The environment field** specifies the implementation scope: 'admin' (admin panel), 'user' (user-facing), 'server' (backend), etc.

**The aiGenerated field** is a boolean that's TRUE for tasks created by NEXUS's extraction system. This distinguishes AI-generated tasks from manually created ones and is used for analytics (how much of the kanban comes from NEXUS research vs manual entry).

**The cursorPromptSnippet field** stores a pre-formatted AI development prompt for this task. The aiPromptFormatter utility generates this from the task's details, design system references, and stack information. When the admin clicks "Start Dev" on a task card, this prompt is copied to the clipboard.

**The verificationSteps field** is a JSONB array of strings describing how to verify the task is implemented correctly. These come from the extracted task's acceptance criteria.

**The riskLevel field** indicates implementation risk: 'low', 'medium', 'high'. High-risk tasks might involve database migrations, security changes, or core architecture modifications.

**The nexusContext field** is the crown jewel of NEXUS integration. This JSONB column carries the complete research context into the kanban. It contains: `briefId` (the source research brief), `briefTitle` (for display), `sourceDepartment` (which department spawned this task), `webSources` (array of web sources with IDs, types, URLs, titles, and trust scores that informed this task), `departmentExcerpt` (a 500-character excerpt from the source department's analysis), and `docReferences` (references to generated specification documents). This context means Claude Code can always trace WHY a task exists, WHAT research supports it, and WHERE to find more details.

**The createdBy field** references the admin who created the task (either directly or via NEXUS extraction).

---

### sprints — Sprint Management

The `sprints` table organizes dev_tasks into time-boxed development cycles.

**The name field** identifies the sprint: "Sprint 13: Plans & Checkout", "Security Hardening Sprint", etc.

**The goal field** describes what the sprint aims to achieve in narrative form. This goal is displayed prominently in the sprint detail page and the dev dashboard.

**The startDate and endDate fields** define the sprint's time box. Default duration is 14 days, but this is adjustable during creation. For multi-sprint generation from NEXUS, duration is calculated from the total estimated hours of included tasks.

**The status field** tracks the sprint lifecycle: 'planning' (sprint is being assembled, tasks are being added), 'active' (sprint is in progress, tasks are being implemented), 'completed' (all tasks are done or the sprint has been manually closed).

**The velocity field** tracks the sprint's velocity (story points completed per sprint). This is a DECIMAL for precision and is used for future sprint capacity planning.

**The phaseId field** links the sprint to a development phase from the roadmap.

**The estimatedTokens and estimatedCostUsd fields** project the AI cost of implementing all tasks in the sprint.

**The cursorPrompt field** stores an optional sprint-level development prompt that provides overarching context for all tasks.

**The riskLevel field** indicates overall sprint risk.

**The sprintOrder field** determines the chronological order of sprints (for roadmap display).

**The briefId field** links back to the NEXUS brief that generated this sprint, completing the research-to-development traceability chain.

---

### sprint_tasks — Sprint-Task Junction

The `sprint_tasks` table is a many-to-many junction between sprints and dev_tasks. A task can belong to only one sprint at a time, but the junction table allows for additional per-sprint metadata.

**The composite primary key** on (sprintId, taskId) prevents duplicate assignments.

**The storyPoints field** allows assigning story points to a task within the sprint context. The same task might be estimated at different story points in different sprint contexts.

**The taskOrder field** determines the task's position within the sprint's task list — different from the task's position within its kanban column.

---

### sprint_activities — Sprint Audit Trail

The `sprint_activities` table logs significant events during a sprint's lifecycle.

**The activityType field** categorizes the event: 'task_added', 'task_removed', 'status_changed', 'sprint_started', 'sprint_completed', etc.

**The description field** provides a human-readable description of what happened.

This table supports the (currently placeholder) Activity tab in the sprint detail page.

---

## Part 5: The Intelligence & AI Layer

### ai_usage — AI Cost Tracking

The `ai_usage` table logs every AI API call made by the system, whether for NEXUS research, codebase analysis, task extraction, or any other AI-powered feature.

**The model field** records which model was used: 'claude-sonnet-4-6', 'gpt-4o', 'gemini-2.5-flash', 'perplexity-sonar', etc.

**The tokensUsed field** stores the total token count (input + output) for the call.

**The costUsd field** stores the calculated cost based on the model's per-token pricing. The system maintains an internal pricing table and calculates costs in real-time.

**The endpoint field** records which system endpoint triggered the call: '/admin/nexus/briefs/:id/launch', '/admin/ai/analyses', '/admin/phases/:id/analyze', etc. This allows cost breakdown by feature.

**The responseTimeMs field** tracks latency per call, useful for identifying slow providers or network issues.

**The errorOccurred and errorMessage fields** flag calls that failed, enabling error rate monitoring.

**The adminUserId field** tracks which admin triggered the call, enabling per-user cost allocation.

This table is the foundation for cost dashboards, budget alerts, and model performance comparison.

---

### ai_usage_daily_summary — Aggregated Usage Analytics

The `ai_usage_daily_summary` table provides pre-computed daily rollups of AI usage for faster dashboard queries.

**Key aggregation fields**: totalCalls (number of API calls), totalTokens (sum of all tokens), totalCostUsd (sum of all costs), avgTokensPerCall (average efficiency), successCount/errorCount (reliability tracking), avgQualityScore (when quality ratings are available).

The summary is grouped by date, model, endpoint, and admin user — enabling multi-dimensional analysis without scanning the full ai_usage table.

---

### ai_model_benchmarks — Model Performance Tracking

The `ai_model_benchmarks` table stores periodic performance assessments of AI models across multiple dimensions.

**Scoring dimensions**: speedScore (response latency), qualityScore (output quality), costScore (cost efficiency), reliabilityScore (uptime and error rate), capabilityScore (task-specific capabilities), compositeScore (weighted aggregate).

This data informs model routing decisions and helps admins choose which models to assign to which departments.

---

### ai_insights — AI-Generated Observations

The `ai_insights` table stores automated observations and recommendations generated by the AI analytics system.

**The insightType field** categorizes the insight: 'cost_anomaly', 'quality_degradation', 'usage_spike', 'model_recommendation', etc.

**The severity field** ranks importance: 'info', 'warning', 'critical'.

**The isRead and isDismissed flags** track whether the admin has seen and acknowledged the insight.

**The validUntil timestamp** auto-expires time-sensitive insights.

---

## Part 6: The Development Environment Layer

### dev_phases — Roadmap Phases

The `dev_phases` table represents the high-level development roadmap. NEXUS organizes all work into phases that represent major product milestones.

The system comes with 9 pre-defined phases: Phase 1 (MVP), Phase 2 (Multi-family Support), Phase 3 (Admin Panel), Phase 4 (User Features), Phase 5 (Integrations), Phase 6 (Plans & Checkout), Phase 7 (Testing & QA), Phase 8 (Optimization & AI Enhanced), Phase 9 (Mobile).

**The goals field** is a JSONB array of phase objectives. Phase 6 might have goals like `["Implement Stripe integration", "Build plan comparison page", "Add checkout flow", "Set up webhook handling"]`.

**The techStack field** lists the technologies relevant to this phase.

**The complexity field** indicates how complex the phase is: 'low', 'medium', 'high'.

**The aiContext field** stores additional context for AI analysis of this phase.

**The status field** tracks phase progress: 'pending', 'in_progress', 'completed'.

**The aiAnalysisResult field** stores the output of AI-powered phase analysis (breaking the phase into tasks, estimating effort, identifying risks).

**The totalCostUsd field** tracks the cumulative AI cost of all work done within this phase.

---

### dev_comments — Task Discussion

The `dev_comments` table stores comments/notes on individual kanban tasks.

**The taskId field** links to the dev_task with CASCADE delete.

**The adminUserId field** identifies who wrote the comment.

**The comment field** stores the text content (Markdown supported).

This enables collaboration between admins on tasks and provides an audit trail of implementation discussions.

---

### pipelines, pipeline_runs, pipeline_stages, pipeline_alerts — Pipeline System

The pipeline system represents a broader automation framework beyond NEXUS research. Pipelines define multi-stage processes (like data imports, scheduled analyses, or deployment workflows) with stages, runs, and alerts.

**pipelines** stores the pipeline definition: name, type, status, configuration, schedule (cron expression), and timestamps.

**pipeline_runs** logs each execution: status, duration, records processed, errors.

**pipeline_stages** defines the stages within each pipeline: name, order, type, configuration, timeout, retry count.

**pipeline_alerts** stores alerts generated by pipeline runs: type, severity, message, resolution tracking.

This system is used for operational automation beyond the NEXUS research pipeline.

---

## Part 7: The Raw SQL Tables — Outside Drizzle ORM

Three NEXUS-related tables exist outside the Drizzle ORM schema, created and managed via raw SQL:

### nexus_dept_team_members

This table stores the 98 virtual team members with their complete CV profiles. It's not in Drizzle because it was added during rapid prototyping and uses a richer field set than what was initially planned for the ORM layer.

Key fields include: id (UUID), department (VARCHAR), name (VARCHAR 255), role_en (VARCHAR 64), role_he (VARCHAR 255), emoji (VARCHAR 8), level (VARCHAR 32 — clevel/manager/senior/member/junior), responsibilities (TEXT in Hebrew), skills (TEXT[] — PostgreSQL array), order_index (INTEGER), bio (TEXT — 40-300 words in Hebrew), experience_years (INTEGER), education (TEXT), certifications (TEXT[]), domain_expertise (TEXT[]), languages (TEXT[]), methodology (TEXT), personality (TEXT), achievements (TEXT), background (TEXT), work_history (JSONB — array of {company, role, years, highlights}).

The seed scripts (`seed-nexus-full-teams.mjs` with 98 members, `seed-nexus-cv-data.mjs` with 1374 lines of detailed CVs, and `seed-nexus-ai-dev-team.mjs` for AI-Dev department specifics) populate this table.

### nexus_web_feeds

This table stores curated web feed sources for ongoing intelligence gathering. Fields include: id (UUID), source_type (VARCHAR — 'rss', 'youtube', 'reddit', 'github'), url (TEXT), label (VARCHAR), category (VARCHAR), department (VARCHAR — null means all departments), is_active (BOOLEAN), trust_score (INTEGER), last_fetched (TIMESTAMP), created_at (TIMESTAMP).

The learning system in the orchestrator automatically adds high-trust sources (trust >= 65) as inactive feeds after each research session. Admins can then review and activate them in the settings UI.

### nexus_generated_docs

This table stores the 8 specification documents generated from approved briefs. Fields include: id (UUID), brief_id (UUID FK), doc_type (VARCHAR — 'prd', 'erd', 'blueprint', 'cicd', 'design', 'security', 'marketing', 'legal'), content (TEXT — can be very large), model_used (VARCHAR), tokens_used (INTEGER), cost_usd (VARCHAR), generated_at (TIMESTAMP), generated_by (UUID FK).

---

## Part 8: Data Flow — How Information Moves Through the System

Understanding NEXUS requires understanding how data flows between tables through the brief lifecycle:

### Flow 1: Brief Creation

When an admin types an idea, a single row is inserted into `nexus_briefs` with status='draft', the idea prompt, and basic metadata. No other tables are touched yet.

### Flow 2: Configuration

The admin selects departments and models, updating the selectedDepartments and selectedModels arrays on the brief row. If a template is used, the template's preset values are applied and the template's usageCount is incremented in `nexus_templates`.

### Flow 3: Research Launch

When the admin clicks "Launch Research," the orchestrator reads the brief's configuration and begins the 7-step pipeline. Step 1 updates the brief's status to 'researching' and clears any previous results by deleting existing rows in `nexus_brief_departments` and `nexus_brief_web_sources` for this briefId. Step 2 doesn't touch the database — codebase scanning is in-memory. Step 3 inserts rows into `nexus_brief_web_sources` for each discovered source (GitHub repos, Reddit posts, RSS articles, Perplexity results). Step 4 inserts rows into `nexus_brief_departments` for each department — first with status='pending', then updated to 'running' when the agent starts, then 'completed' (with output, cost, tokens) or 'failed' (with error message) when the agent finishes. Every AI call also inserts a row into `ai_usage` for cost tracking.

### Flow 4: Assembly and Review

The assembled brief text is written to the `nexus_briefs.assembledBrief` field. The status is updated to 'review'. A smart title is generated and stored. The researchCompletedAt timestamp is set. If the learning system finds high-trust sources, they're inserted into `nexus_web_feeds` (raw SQL table) with is_active=false.

### Flow 5: Approval and Task Extraction

When the admin approves, the status becomes 'approved' and approvedAt/approvedBy are set. Task extraction sends the assembledBrief plus any generated docs to Claude AI. The AI returns a JSON array of tasks. Each task is inserted as a row in `nexus_extracted_tasks` with all structured fields. The AI call is logged in `ai_usage`.

### Flow 6: Sprint Creation

The admin creates a sprint, inserting a row into `sprints`. Selected extracted tasks are linked via `sprint_tasks` junction table entries. The sprint's briefId field links back to the source brief. Each extracted task's sprintId field is updated.

### Flow 7: Sprint Activation (The Bridge)

When the sprint is activated, for each task in `nexus_extracted_tasks` (filtered by sprintId and accepted=true), a new row is created in `dev_tasks` with: all task details copied over, aiGenerated=true, cursorPromptSnippet generated by aiPromptFormatter, and nexusContext populated with the brief's research context (briefId, briefTitle, sourceDepartment, relevant webSources from nexus_brief_web_sources, a 500-char excerpt from the department's output in nexus_brief_departments, and docReferences from nexus_generated_docs). The extracted task's devTaskId field is updated with the new dev_task's UUID.

### Flow 8: Implementation

Claude Code reads the task (via "Start Dev" clipboard copy or direct API access), implements the code, and calls the bot API endpoint to move the task's columnId to the "Done" column in `dev_tasks`. The sprint's velocity is updated. When all tasks in the sprint are done, the admin can complete the sprint (status='completed').

---

## Part 9: The Seed Data System

NEXUS comes with several seed scripts that populate the database with initial data:

### seed-nexus-full-teams.mjs

This script creates 98 team members across all 14 departments. It uses `INSERT ... WHERE NOT EXISTS` to prevent duplicates — safe to run multiple times. Each member gets: name (Hebrew), role_en, role_he, emoji, level, responsibilities (Hebrew text), skills (array), and order_index. The script is approximately 150 lines and covers all department hierarchies.

### seed-nexus-cv-data.mjs

This is the largest seed script at 1,374 lines. It populates detailed CV data for all 98 team members: bio (40-300 Hebrew words describing their professional identity), experience_years, education, background, achievements, certifications (array), domain_expertise (array), languages (array), methodology (how they approach work), personality (work style), and work_history (JSONB array with company, role, years, highlights for 2-4 past positions). The script uses `UPDATE WHERE bio IS NULL` to avoid overwriting manual edits.

### seed-nexus-ai-dev-team.mjs

This script specifically populates the AI-Dev department (8 members) with enhanced CV data. The AI-Dev team includes: CAIO (Chief AI Officer), VP AI Engineering, AI Architect, Prompt Lead, AI QA Lead, AI Integration Specialist, AI Security Officer, and AI DevOps Engineer. Each member gets the full CV treatment with detailed Hebrew bios, certifications (like "AWS Machine Learning Specialty", "Anthropic Claude Advanced"), and work histories at companies like Google AI, Meta, Microsoft Research.

### fix-dept-models.mjs

This smaller script ensures all departments have entries in `nexus_dept_settings` with default_model set to 'claude-sonnet-4-6'. It's a maintenance script for cases where new departments are added but settings entries haven't been created yet.

---

## Part 10: Relationships and Entity Diagram

The NEXUS database tables form a rich web of relationships:

```
nexus_briefs (central entity)
  ├── nexus_brief_departments (1:N — one per department per brief)
  ├── nexus_brief_web_sources (1:N — many sources per brief)
  ├── nexus_extracted_tasks (1:N — 20-40 tasks per brief)
  │   └── dev_tasks (1:1 — each extracted task maps to one dev task)
  │       ├── dev_columns (N:1 — tasks belong to a column)
  │       ├── dev_comments (1:N — comments on tasks)
  │       └── sprint_tasks (N:M — tasks in sprints)
  ├── nexus_generated_docs (1:N — up to 8 docs per brief)
  ├── nexus_brief_questions (1:N — questions discovered during research)
  └── sprints (1:1 — brief generates one sprint)
      ├── sprint_tasks (1:N — junction to dev_tasks)
      ├── sprint_activities (1:N — audit log)
      └── dev_phases (N:1 — sprints belong to phases)

nexus_dept_settings (standalone — one per department)
nexus_skills (standalone — shared taxonomy)
nexus_rules (standalone — automation rules)
nexus_templates (standalone — brief presets)
nexus_dept_knowledge (standalone — per-department knowledge)
nexus_question_templates (standalone — reusable questions)

nexus_dept_team_members (raw SQL — team CVs)
nexus_web_feeds (raw SQL — curated sources)
nexus_generated_docs (raw SQL — spec documents)

ai_usage (analytics — logs every AI call)
ai_usage_daily_summary (analytics — pre-computed rollups)
ai_model_benchmarks (analytics — model performance)
ai_insights (analytics — automated observations)
```

---

## Part 11: Key Database Design Decisions

### Why UUIDs Instead of Auto-Increment IDs?

All NEXUS tables use UUID primary keys instead of sequential integers. This decision was driven by several factors: UUIDs are globally unique (no collisions even if data is merged from multiple environments), they don't expose row counts or creation order to the API consumer (important for security), and they allow client-side ID generation (the UI can create an optimistic ID before the server confirms). The tradeoff is slightly larger storage and index size, but for a system with at most thousands (not millions) of rows per table, this is negligible.

### Why CASCADE Deletes?

Most foreign key relationships use `onDelete: 'cascade'`, meaning that deleting a parent row automatically deletes all children. This is intentional: a research brief is a coherent unit, and deleting it should clean up all associated department outputs, web sources, questions, and extracted tasks. Without cascading, orphaned data would accumulate and waste space. The few exceptions use `onDelete: 'set null'` for fields like adminUserId (because deleting an admin shouldn't delete their work) and columnId (because deleting a kanban column shouldn't delete tasks).

### Why JSONB for Complex Fields?

Several fields use JSONB instead of normalized tables: nexusContext on dev_tasks, contextJson on extracted tasks, conditionJson and actionPayload on rules, workHistory on team members, etc. JSONB is used when the data structure is semi-structured, the data is always read/written as a whole (never queried individually), and creating separate tables would add complexity without benefit. For example, a task's nexusContext is always loaded and displayed together — there's no use case for querying "all tasks whose web sources have trust score > 80" that would justify normalizing web sources within the context.

### Why Some Tables Are Raw SQL?

Three tables (nexus_dept_team_members, nexus_web_feeds, nexus_generated_docs) were created via raw SQL instead of Drizzle ORM. This happened because they were added during rapid prototyping cycles where the priority was getting functionality working quickly. Moving them to Drizzle would require creating Drizzle schema definitions, generating migration files, and potentially reconciling schema differences. This is technical debt that should be addressed but isn't blocking functionality.

### Why Separate Extracted Tasks and Dev Tasks?

The system has two task tables: nexus_extracted_tasks (research output) and dev_tasks (kanban work items). This separation exists because they serve different purposes. Extracted tasks are research artifacts — they capture what the AI thinks should be done based on department analysis. Dev tasks are work items — they live on the kanban board and go through a workflow. Not all extracted tasks become dev tasks (the admin might reject some), and not all dev tasks come from extraction (admins can create tasks manually). The devTaskId field on extracted tasks bridges the two when needed.

---

## Part 12: Database Maintenance and Operations

### Running Seed Scripts

Seed scripts require a running PostgreSQL database. They connect via the DATABASE_URL environment variable. The execution order matters:

1. First, run the main application migrations (handled by Drizzle on startup)
2. Then run `node scripts/seed-nexus-full-teams.mjs` to create 98 team members
3. Then run `node scripts/seed-nexus-cv-data.mjs` to populate CV data
4. Optionally run `node scripts/seed-nexus-ai-dev-team.mjs` for enhanced AI-Dev profiles
5. Optionally run `node scripts/fix-dept-models.mjs` to ensure department settings exist

All seed scripts are idempotent (safe to run multiple times) thanks to `WHERE NOT EXISTS` and `WHERE bio IS NULL` guards.

### Schema Evolution

New tables and fields are added through Drizzle migrations. The schema file (`shared/schemas/schema.ts`) is the source of truth for the Drizzle-managed tables. When a new field is added, `drizzle-kit generate` creates a migration SQL file, and `drizzle-kit push` applies it to the database.

For raw SQL tables, changes are applied manually through SQL scripts or the admin API.

### Data Volume Considerations

The busiest tables by row count are: `ai_usage` (every API call creates a row — potentially thousands per day during active research), `nexus_brief_web_sources` (30-50 sources per brief), `nexus_brief_departments` (14 per brief), and `nexus_extracted_tasks` (20-40 per brief). With moderate usage (a few briefs per week), the database stays well under 100,000 rows total. Heavy usage might push ai_usage into millions of rows over time, which is why the daily summary table exists for fast aggregation queries.
