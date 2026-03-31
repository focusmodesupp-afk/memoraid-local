# MemorAId

> **כשדמנציה נכנסת למשפחה, אתם לא צריכים להתמודד לבד**
> *"When dementia enters the family, you don't have to face it alone."*

MemorAId is a Hebrew-first, bilingual (Hebrew/English) family care coordination platform built for families managing a relative with dementia. It centralizes all care data — documents, medications, vitals, appointments, and tasks — in a single place, enables multiple family members to collaborate with role-based permissions, and provides AI-powered assistance for document analysis, health insights, and clinical summaries.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Features](#2-core-features)
3. [Screens & Pages](#3-screens--pages)
4. [User Flow](#4-user-flow)
5. [Tech Stack](#5-tech-stack)
6. [Components](#6-components)
7. [Data & State](#7-data--state)
8. [Planned Features](#8-planned-features)
9. [Design Notes](#9-design-notes)

---

## 1. Project Overview

MemorAId is a full-stack TypeScript monorepo (React + Express + PostgreSQL) targeting Israeli families dealing with a dementia diagnosis. The platform defines a **four-stage care journey** — `genetic_awareness → suspicion → bridge → certainty` — and surfaces contextually appropriate features at each stage.

Key differentiators:
- **RTL-first UI** — designed in Hebrew, with full English support
- **Multi-family architecture** — a single user can belong to multiple care families
- **AI at the core** — Claude (Anthropic), GPT (OpenAI), and Gemini (Google) are integrated for document analysis, assistant chat, and health insights
- **Doctor View** — generates clinical summaries ready to bring to physician appointments
- **Internal admin panel** — a complete business operations, analytics, and dev-management suite at `/admin`

---

## 2. Core Features

### Care Coordination
- Task management with kanban board (statuses: requested → scheduled → todo → in progress → stuck → postponed → done)
- Task checklists, co-assignees, linked medical documents, priority levels
- Availability scheduling with a weekly calendar view
- Structured questionnaires for ongoing assessments

### Patient Health Record
- Patient profile with diagnosis, care stage, allergies, and advance directives
- Vitals tracking (blood pressure, glucose, weight, heart rate, temperature, O₂ saturation, pain level)
- Hydration log
- Medications list (name, dosage, frequency, prescribing doctor)
- Lab results with reference-range flagging
- Referrals management (pending / scheduled / completed)
- Medical appointments log
- Medical document upload and AI analysis (extracts medications and tasks automatically)

### Family Collaboration
- Role-based access: `manager | caregiver | viewer | guest`
- Per-member granular permissions panel
- Family hierarchy visual map
- Invite system with typed invite slots (family member / supporter / viewer)
- Family memory stories with AI-generated insights

### AI Tools
- **Assistant** — conversational AI chat with full care-context awareness
- **AI Insights Panel** — automated health observations based on recorded data
- **Document AI** — parse uploaded PDFs/images to extract medications, tasks, and summaries
- **Doctor View** — generate a printable clinical summary for appointments

### User Account
- Email + password authentication (session-based, HTTP-only cookie)
- Google OAuth login
- Password reset via email (Resend)
- Multi-family switcher (active family sent on every request via `X-Active-Family` header)
- Notification center with preference controls
- Google Calendar sync for tasks

### Billing
- Subscription plans via Stripe
- Stripe Checkout session creation
- Webhook handling for subscription lifecycle events

### Admin Panel (`/admin`)
- Separate authentication, separate dark-slate theme
- User & family management
- Finance, plans, coupons, promotions, subscriptions
- CMS (content pages) and media library
- AI usage analytics (cost by model, usage trends)
- Feature flags and app versioning
- Audit trail, error logs, server logs
- Internal dev Kanban (phases → sprints → tasks with AI phase analysis)
- Pipeline system (scheduled data processing with run history)
- OKR tracking, work plans, strategies
- QA control, QA runs, data quality monitoring
- Medical insights aggregation across families

---

## 3. Screens & Pages

### Public / Marketing Routes

| Route | Component | Description |
|---|---|---|
| `/` | `Landing` | Marketing landing page with hero section, interactive quiz, and feature highlights |
| `/features` | `Features` | Feature showcase page |
| `/pricing` | `Pricing` | Subscription plans (fetched live from Stripe) |
| `/resources` | `Resources` | Educational resources about dementia care |
| `/about` | `About` | About the product and team |
| `/contact` | `Contact` | Contact form |

### Auth Routes

| Route | Component | Description |
|---|---|---|
| `/login` | `Login` | Email + password login with rate limiting |
| `/forgot-password` | `ForgotPassword` | Initiates email-based password reset |
| `/reset-password` | `ResetPassword` | Token-validated password reset form |
| `/onboarding` | `Onboarding` | Post-registration wizard (family name, patient profile setup) |

### Authenticated App — Patient Section

| Route | Component | Description |
|---|---|---|
| `/patient` | `Patient` | Full patient profile: diagnosis, care stage, allergies, ADL/IADL scores, advance directives |
| `/vitals` | `Vitals` | Record and review vitals over time with trend charts |
| `/hydration` | `Hydration` | Daily hydration log and tracking |
| `/medications` | `Medications` | Medication list with dosage, frequency, and prescriber info |
| `/appointments` | `Appointments` | Upcoming and past medical appointments |
| `/lab-results` | `LabResults` | Lab results with reference ranges and abnormal flagging |
| `/referrals` | `Referrals` | Specialist referrals with status tracking |
| `/assessments` | `Assessments` | Structured clinical assessments (MMSE, GDS, ADL, IADL, falls risk, etc.) |

### Authenticated App — Care Management

| Route | Component | Description |
|---|---|---|
| `/dashboard` | `Dashboard` | Home screen: care stage overview, task summary, recent activity, upcoming appointments |
| `/tasks` | `Tasks` | Full task management with kanban board, filters, and bulk actions |
| `/availability` | `Availability` | Weekly calendar for caregiver availability management |
| `/questionnaires` | `Questionnaires` | Create and fill structured questionnaires |
| `/documents` / `/medical-documents` | `MedicalDocuments` | Upload, view, and AI-analyze medical documents |
| `/professionals` | `Professionals` | Directory of professionals (medical, legal, financial, welfare) linked to the family |

### Authenticated App — Family

| Route | Component | Description |
|---|---|---|
| `/family` | `Family` | Family member list with roles and invite management |
| `/family/permissions` | `FamilyPermissions` | Granular per-member permissions editor |
| `/memories` | `Memories` | Family memory stories with emotional tone tags and AI insights |
| `/family-guide` | `FamilyGuide` | Stage-based guide for what families should be doing at each care stage |

### Authenticated App — Tools

| Route | Component | Description |
|---|---|---|
| `/assistant` | `Assistant` | AI chat assistant with full care-context |
| `/doctor-view` | `DoctorView` | Generate a clinical summary document for doctor visits |
| `/rights` | `RightsCenter` | Israel patient/family rights and benefits eligibility center |
| `/data` | `DataStats` | Family data statistics and usage overview |

### Authenticated App — User Account

| Route | Component | Description |
|---|---|---|
| `/inbox` | `Inbox` | Internal messaging / support inbox |
| `/support` | `Support` | Help and support resources |
| `/profile` | `Profile` | User profile edit (name, avatar, timezone, locale) |
| `/notifications` | `Notifications` | Notification history |
| `/settings` | `Settings` | App settings and preferences |
| `/change-password` | `ChangePassword` | Password change form |

### Admin Panel (`/admin/*`)

| Page | Description |
|---|---|
| `AdminDashboard` | KPI overview, usage metrics, growth charts |
| `AdminFamilies` / `AdminFamilyDetail` | Browse and manage all families; deep-dive per family |
| `AdminUsers` / `AdminUserDetail` | Browse and manage all users |
| `AdminLogs` | Server application logs |
| `AdminAuditLog` (via `AdminSettingsAudit`) | Full audit trail of admin actions |
| `AdminErrors` | Aggregated error log viewer |
| `AdminSupport` | Support ticket management |
| `AdminSubscriptions` | Stripe subscription overview |
| `AdminFeatureFlags` | Toggle features per environment |
| `AdminVersions` | App version management |
| `AdminDataCenter` | Raw data inspection tools |
| `AdminCommunication` | Notification and email campaign management |
| `AdminQAControl` / `AdminQARuns` / `AdminQADataQuality` | QA test management and run history |
| `AdminSettingsAudit` / `AdminSettingsLayer` | Settings audit log and layered settings editor |
| `AdminSalesReports` | Revenue and sales analytics |
| `AdminCMS` / `AdminMediaLibrary` | Content page editor and media asset management |
| `AdminAI` | AI usage analytics, cost by model, AI interaction history |
| `AdminProjectAnalyze` | AI-powered codebase/project analysis |
| `AdminOKR` | Objectives and Key Results tracking |
| `AdminWorkPlan` / `AdminPlanner` / `AdminStrategies` | Internal planning and strategy tools |
| `AdminFinance` | Finance entry management |
| `AdminPlans` / `AdminCoupons` / `AdminPromotions` | Subscription plan, coupon, and promotion management |
| `AdminNamespaces` | Namespace/tenant management |
| `AdminIntegrations` | Third-party integration management |
| `AdminAnalytics` | Product analytics dashboard |
| `AdminBackups` | Database backup management |
| `AdminNotifications` | System notification management |
| `AdminSecurity` | Security settings and monitoring |
| `AdminDevDashboard` | Developer metrics and environment overview |
| `AdminDevKanban` | Internal dev task kanban with phases and columns |
| `AdminSprints` / `AdminSprintDetail` | Sprint planning and management |
| `AdminTaskDistributionSummary` | Task distribution analytics across sprints |
| `AdminPipelines` / `AdminPipelineDetail` | Scheduled data pipeline management with run history |
| `AdminMedicalInsights` | Cross-family medical insights aggregation |

---

## 4. User Flow

### New User — Create Family
1. Lands on `/` (marketing page)
2. Clicks "Get Started" → `/login` (registration mode)
3. Chooses **Create Family**: enters family name, own name, email, password
4. Redirected to `/onboarding` — multi-step wizard:
   - Step 1: Personal profile (name, avatar, role)
   - Step 2: Patient details (name, DOB, primary diagnosis)
   - Step 3: Care stage selection (`genetic_awareness → certainty`)
5. Lands on `/dashboard`

### Existing User — Join Family
1. Receives an invite link with a code
2. Goes to `/login` → chooses **Join Family**, enters invite code, registers
3. Assigned role/permissions defined by the invite slot
4. Redirected to `/dashboard` for that family

### Daily Care Workflow
1. **Dashboard** — see pending tasks, upcoming appointments, recent vitals at a glance
2. **Tasks** — work the kanban board; drag cards between columns, check off checklist items
3. **Vitals / Medications / Appointments** — record daily observations
4. **Documents** — upload a new scan → AI extracts medications and generates tasks automatically
5. **Assistant** — ask the AI a question about care options or patient status

### Before a Doctor Appointment
1. Navigate to `/doctor-view`
2. System assembles a clinical summary from all recorded data (vitals trends, medications, recent lab results, assessments)
3. Print or export the summary to bring to the visit

### Multi-Family Switching
1. Header displays a family switcher dropdown
2. Selecting a different family updates `localStorage` (`mr_active_family`) and reloads data
3. All subsequent API requests include the new family ID via `X-Active-Family` header

### Password Reset
1. `/forgot-password` → enter email → receive reset link via Resend email
2. Click link → `/reset-password?token=...` → enter new password
3. Redirected to `/login`

---

## 5. Tech Stack

### Frontend

| Library | Version | Role |
|---|---|---|
| React | `^18.2.0` | UI framework |
| TypeScript | `^5.3.3` | Type safety |
| Vite | `^5.1.4` | Build tool and dev server |
| Tailwind CSS | `^3.4.1` | Utility-first CSS |
| tailwindcss-animate | `^1.0.7` | Animation utilities |
| tailwind-merge | `^2.2.1` | Conditional class merging |
| wouter | `^3.0.0` | Lightweight SPA router |
| @tanstack/react-query | `^5.25.0` | Server state / data fetching |
| framer-motion | `^11.0.8` | Animations and transitions |
| lucide-react | `^0.344.0` | Icon library |
| recharts | `^2.12.0` | Charts and data visualizations |
| @radix-ui/react-dialog | `^1.0.5` | Accessible dialog primitive |
| react-markdown | `^10.1.0` | Markdown rendering |
| remark-gfm | `^4.0.1` | GitHub-flavored markdown |
| rehype-highlight | `^7.0.2` | Code syntax highlighting |
| mermaid | `^11.12.3` | Diagram rendering |
| date-fns | `^3.6.0` | Date utilities |
| zod | `^3.22.4` | Schema validation (shared with backend) |

### Backend

| Library | Version | Role |
|---|---|---|
| Express | `^4.18.3` | HTTP server |
| express-session | `^1.18.0` | Session management |
| express-rate-limit | `^7.5.1` | Rate limiting (login, uploads) |
| tsx | `^4.19.2` | TypeScript execution and watch |
| drizzle-orm | `^0.30.1` | Type-safe PostgreSQL ORM |
| drizzle-kit | `^0.21.0` | Schema migration tooling |
| drizzle-zod | `^0.5.0` | Zod schema generation from Drizzle models |
| pg | `^8.11.3` | PostgreSQL client |
| bcryptjs | `^2.4.3` | Password hashing (cost factor 10) |
| passport | `^0.7.0` | Auth middleware (Google OAuth) |
| multer | `^1.4.5-lts.1` | File uploads |
| cookie-parser | `^1.4.7` | Cookie parsing |

### AI & External Services

| Service | Library | Role |
|---|---|---|
| Anthropic Claude | `@anthropic-ai/sdk ^0.78.0` | AI assistant, document analysis, insights |
| OpenAI GPT | `openai ^6.22.0` | Alternative AI model |
| Google Gemini | `@google/genai ^1.41.0` | Alternative AI model |
| Google Calendar | `googleapis ^171.4.0` | Task calendar sync via OAuth |
| Stripe | `stripe ^16.6.0` | Subscription billing and webhooks |
| Resend | `resend ^6.9.2` | Transactional email (password reset, invites) |

### Testing

| Library | Version | Role |
|---|---|---|
| vitest | `^2.1.6` | Test runner |
| @testing-library/react | `^16.0.1` | React component testing |
| @testing-library/jest-dom | `^6.6.3` | DOM assertion matchers |
| jsdom | `^25.0.1` | DOM simulation environment |

### Infrastructure
- **Database**: PostgreSQL (40+ tables, 40+ migrations in `server/db/migrations/`)
- **Server port**: `3001` (configurable via `API_PORT`)
- **Session storage**: PostgreSQL `sessions` table
- **File uploads**: Multer (local storage; cloud storage is a planned upgrade)

---

## 6. Components

### App Shell & Navigation
- **`AppShell`** — authenticated app wrapper with sidebar navigation, header, and family switcher
- **`ScrollToTop`** — resets scroll position on route changes
- **`ErrorBoundary`** — React error boundary with user-facing fallback UI

### Patient & Health
- **`PatientOnboardingWizard`** — multi-step wizard for initial patient profile setup (runs post-registration)
- **`AIInsightsPanel`** — displays AI-generated health observations derived from vitals and medication data
- **`DocumentDetailDrawer`** — side drawer showing full detail of a medical document including AI analysis results

### Task Management
- **`KanbanBoard`** — drag-and-drop kanban with configurable columns matching `task_status` enum
- **`TaskModal`** — create/edit task form: title, status, priority, category, due date, assignees, checklist items, linked documents
- **`TaskRequestModal`** — simplified task request form for non-manager roles (caregiver/viewer)

### Family & Collaboration
- **`FamilyHierarchyMap`** — visual diagram of family members, their roles, and relationships
- **`FamilyPermissionsPanel`** — granular permission editor per family member
- **`MeetingFinderModal`** — finds overlapping availability slots across multiple family members
- **`WeekCalendar`** — weekly grid for availability management and scheduling

### UI Design System (`client/src/components/ui/`)

| Component | Description |
|---|---|
| `PageLayout` | Standard page wrapper with consistent padding and max-width |
| `PageHeader` | Page title + subtitle + optional action button area |
| `SmartSection` | Section block with optional title, collapsible, and loading state |
| `DataRow` | Labeled key-value row for display data |
| `BadgeRow` | Horizontal row of badge chips |
| `ListCompact` | Compact vertically stacked list |
| `EmptyInline` | Inline empty state with icon and message |
| `dialog` | Radix-based accessible dialog wrapper |

### Admin Components (`client/src/admin/components/`)

| Component | Description |
|---|---|
| `AdminLayout` / `AdminShell` | Admin app wrapper with separate nav, auth, and dark theme |
| `AdminNavSearch` | Global search within the admin panel |
| `AdminBreadcrumbs` | Dynamic breadcrumb trail for admin navigation |
| `AdminErrorBoundary` | Admin-specific error boundary |
| `AdminDialog` | Styled dialog for admin confirmations and forms |
| `TaskCard` | Dev kanban task card with priority, assignee, and sprint info |
| `TaskEditModal` | Edit form for dev kanban tasks |
| `CreateSprintModal` / `EditSprintModal` | Sprint creation and editing forms |
| `AddTaskToSprintModal` | Add existing tasks to a sprint |
| `ColumnManagement` | Manage kanban column configuration |
| `MarkdownRenderer` | Renders markdown with mermaid diagram support |

#### Admin Dashboard Sub-components
`StatCard`, `MetricRow`, `DataBlock`, `ProgressBar`, `CollapsibleSection` — composable building blocks for the admin dashboard KPI layout.

---

## 7. Data & State

### Server State (React Query)
All server data is managed by `@tanstack/react-query`. Each data domain has its own query keys and mutation hooks. Data is fetched on mount and invalidated after mutations.

Primary query domains:
- `patient` — patient profile
- `tasks` — task list with filters (status, assignee, priority, category)
- `vitals` — vitals history
- `medications` — medication list
- `appointments` — appointments list
- `lab-results` — lab results
- `referrals` — referrals
- `medical-documents` — uploaded documents
- `family` — family profile and member list
- `notifications` — notification feed
- `user` — current user profile (via `GET /api/auth/me`)

### Client State (Context)
- **`AuthContext`** (`client/src/contexts/AuthContext.tsx`) — current user, login/logout/register actions, auth loading state
- **`AdminAuthContext`** (`client/src/admin/AdminAuthContext.tsx`) — separate admin auth state
- **`ToastContext`** (`client/src/contexts/ToastContext.tsx`) — global toast notification queue

### Persistent Client State
- **`localStorage`** — active family ID (`mr_active_family`), UI preferences
- **HTTP-only cookie** — session token (set by server, not accessible from JS)

### Multi-Family Header
Every authenticated API request includes `X-Active-Family: <familyId>` which the server uses to scope all data queries.

### Key Database Tables

| Table | Purpose |
|---|---|
| `families` | Family group with subscription info and invite code |
| `users` | User accounts with hashed passwords, locale, timezone |
| `family_members` | Many-to-many join: users ↔ families, with role and permissions |
| `sessions` | Active session tokens (expires_at enforced server-side) |
| `family_invites` | Invite codes with slot type, role, and permissions preset |
| `patients` | Patient profile: diagnosis, care stage, ADL/IADL, allergies, advance directives |
| `tasks` | Care tasks with full status/priority/category lifecycle |
| `task_checklists` | Sub-items within tasks |
| `vitals` | Time-series vital sign readings |
| `medications` | Medication records |
| `appointments` | Medical appointment records |
| `lab_results` | Lab result values with reference ranges |
| `referrals` | Specialist referral tracking |
| `medical_documents` | Uploaded documents with AI analysis results |
| `memory_stories` | Family memory journal entries |
| `questionnaires` | Custom questionnaire definitions (JSONB questions array) |
| `notifications` | Per-user notification records |
| `professionals` | Family-linked professional contacts |
| `password_reset_tokens` | Short-lived tokens for password reset flow |
| `user_google_calendar_tokens` | OAuth tokens for Google Calendar integration |
| `task_calendar_sync` | Maps tasks to Google Calendar event IDs |
| `rights_categories` / `rights_requests` | Patient rights and benefits tracking |
| `admin_users` / `admin_sessions` | Separate admin authentication |
| `audit_log` | Admin action audit trail |
| `feature_flags` | Per-environment feature toggles |
| `app_versions` | Version history records |
| `error_logs` | Captured server errors |
| `content_pages` | CMS-managed content |
| `media_library` | Admin media assets |
| `ai_usage` | AI call logs with model, cost, and token counts |
| `admin_plans` | Subscription plan definitions |
| `dev_tasks` / `dev_columns` / `dev_phases` | Internal dev kanban data |
| `sprints` / `sprint_tasks` | Sprint management |
| `pipelines` / `pipeline_runs` | Scheduled data pipeline system |

### Core Enums

| Enum | Values |
|---|---|
| `user_role` | `manager`, `caregiver`, `viewer`, `guest` |
| `task_status` | `requested`, `scheduled`, `todo`, `in_progress`, `stuck`, `postponed`, `cancelled`, `done` |
| `task_priority` | `urgent`, `high`, `medium`, `low` |
| `task_category` | `medical`, `personal`, `administrative`, `shopping`, `transport`, `other` |
| `care_stage` | `genetic_awareness`, `suspicion`, `bridge`, `certainty` |
| `vital_type` | `blood_pressure`, `blood_sugar`, `weight`, `heart_rate`, `temperature`, `oxygen_saturation`, `respiratory_rate`, `pain_level` |
| `assessment_type` | `adl`, `iadl`, `mmse`, `gds`, `falls_risk`, `pain`, `nutrition`, `frailty` |
| `insight_severity` | `info`, `warning`, `critical` |

---

## 8. Planned Features

### In Progress / Partially Implemented
- **Phase 2 — Medical Brain & Heart**: extended patient schema additions — vaccination history, SDOH (social determinants of health) factors, advanced DNR status, detailed fall risk assessments
- **Task enhancements**: co-assignee support, linked documents on tasks, user colors on kanban cards
- **Professionals directory**: auto-extraction from AI document analysis
- **Document archive mode**: soft-archiving documents without deletion (`is_archive_only` flag)
- **Google Login**: Passport + Google OAuth infrastructure is in place; full login flow needs completion
- **Google Calendar sync**: OAuth tokens table and sync table exist; UI integration pending

### Planned (from roadmap and plan docs)
- **Multi-family user support expansion** — richer cross-family UI for users managing multiple relatives (`.cursor/plans/multi-family_user_support_bab35bcc.plan.md`)
- **Staging environment** — proper staging deployment pipeline (`.cursor/plans/staging_deployment_guide_e876070f.plan.md`)
- **AI feature expansion** — extended AI capabilities across more pages (`AI_FEATURE_README.md`, `AI_INTEGRATION_EXPLAINED.md`)
- **Pipeline automation** — the pipeline system in admin is being expanded for scheduled AI analysis jobs
- **Cloud file storage** — currently uploads are stored locally; S3 or equivalent is the target
- **Mobile-responsive redesign** — RTL mobile layout improvements
- **Rights Center expansion** — more Israeli patient rights categories and automated eligibility checks
- **Referral workflow** — end-to-end referral tracking with reminders and follow-up tasks

---

## 9. Design Notes

### Language & Direction
- The UI is **RTL-first** (`direction: rtl` on `body` in `index.css`)
- Language toggles between **Hebrew** (`he`) and **English** (`en`) using `i18next`
- Hebrew is the default locale

### Color System

All colors are defined as CSS custom properties in `client/src/index.css` using HSL values. The theme supports light and dark modes.

#### Light Mode
| Token | HSL Value | Description |
|---|---|---|
| `--background` | `250 45% 96%` | Very light lavender — main page background |
| `--foreground` | `253 50% 8%` | Near-black purple — primary text |
| `--card` | `253 40% 99%` | Near-white — card backgrounds |
| `--primary` | `253 79% 58%` | Bright indigo/purple — primary actions |
| `--primary-foreground` | `0 0% 100%` | White — text on primary buttons |
| `--accent` | `280 65% 55%` | Violet — accent highlights |
| `--secondary` | `200 60% 92%` | Light sky blue — secondary elements |
| `--muted` | `253 35% 95%` | Light lavender-grey — muted backgrounds |
| `--muted-foreground` | `253 15% 45%` | Medium grey-purple — secondary text |
| `--border` | `253 30% 88%` | Light purple-grey — borders and dividers |
| `--destructive` | `0 72% 51%` | Red — destructive/delete actions |
| `--success` | `142 71% 45%` | Green — success states |
| `--warning` | `320 75% 55%` | Pink-magenta — warning states |
| `--info` | `200 85% 52%` | Blue — informational states |
| `--sidebar` | `253 79% 58%` | Same as primary purple — sidebar background |
| `--radius` | `0.5rem` | Global border radius |

#### Dark Mode
| Token | HSL Value |
|---|---|
| `--background` | `250 40% 14%` |
| `--primary` | `253 79% 62%` |
| `--sidebar` | `253 75% 45%` |

#### Chart Colors
`--chart-1` through `--chart-5`: purple, blue, pink, green, amber

### Admin Theme
The admin panel uses a completely separate dark-slate aesthetic defined in `client/src/admin/admin-theme.css`. Primary palette: Tailwind `slate-700` / `slate-800` / `slate-900` for surfaces, `indigo-500` for primary actions. Admin is always dark — there is no light mode for the admin panel.

### Typography
- **Primary font**: System font stack (no custom web font currently loaded)
- Font sizes follow Tailwind's default scale
- Hebrew text requires RTL-aware line-height and letter-spacing

### Utility CSS Classes (defined in `index.css`)
The project maintains a set of semantic utility classes on top of Tailwind for consistent component styling:

| Class | Usage |
|---|---|
| `.btn-primary` | Primary CTA button (purple background) |
| `.btn-outline` | Outlined button |
| `.btn-ghost` | Ghost/text button |
| `.btn-danger` | Destructive action button |
| `.btn-primary-xs` / `.btn-ghost-xs` | Compact button variants |
| `.card` | Standard card container |
| `.section-card` | Full-bleed section card |
| `.section-compact` | Compact section variant |
| `.badge` | Base badge chip |
| `.badge-primary` / `.badge-success` / `.badge-destructive` / `.badge-warning` | Semantic badge variants |
| `.stat-card` | KPI/metric stat card |
| `.data-row` | Labeled data display row |
| `.input-base` | Standard form input |
| `.progress-bar` | Progress indicator |
| `.empty-block` / `.empty-inline` | Empty state containers |
| `.tag` | Tag/label chip |

### Animations
- `framer-motion` is used for page transitions, modal entrance/exit, and micro-interactions
- `tailwindcss-animate` provides CSS-only animation utilities for simpler cases

### Icons
- `lucide-react` is the sole icon library — consistent line-weight icon set

### Responsive Design
- Desktop-first layout with sidebar navigation
- Mobile responsiveness is a known area for improvement (noted as a planned feature)
- RTL mobile layout needs particular attention

---

*This README was generated on 2026-03-19 and reflects the current state of the codebase.*
