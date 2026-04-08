# 2026-04-08 DB Testability Hardening Report

## Scope

Phase 1.5 focused on hardening the DB-backed integration foundation before any additional NEXUS business-flow integration tests were added.

The objective was to make the local PostgreSQL integration layer deterministic, explicit, auditable, and safe enough to support a medical-sensitive workflow.

## What Was Fixed

### 1. Production DB entry point was preserved while adding testable seams

- `server/src/db.ts` was kept as the stable backward-compatible production entry point
- a new additive DB layer was introduced:
  - `server/src/db/factory.ts`
  - `server/src/db/context.ts`
- route code can still use existing `import { db } from './db'`
- tests can now inject a request-scoped DB context through the app factory without destructive replacement

### 2. App construction was separated from startup

- `server/src/createApp.ts` now owns Express app construction
- `server/src/index.ts` was reduced to startup responsibilities only
- schema mutation responsibility was removed from runtime server startup
- this removed hidden coupling between booting the process and mutating the schema

### 3. Integration bootstrap is now explicit

- a dedicated bootstrap module was added:
  - `server/src/db/bootstrap.ts`
- a dedicated Vitest global setup path was added:
  - `server/__tests__/integration/global-setup.ts`
- `vitest.config.integration.ts` now points at the new global setup path
- test DB creation, teardown, guardrails, and `DATABASE_URL` wiring are explicit

### 4. Route-to-test DB consistency is now explicit

- `server/__tests__/integration/test-harness.ts` now creates the real app through `createApp(...)`
- the harness injects the test Drizzle DB context into the same route execution path
- route handlers and test assertions now operate against the same test-controlled DB context

### 5. Transaction isolation remained in place and was proven

- the legacy harness was retained as the active transaction/savepoint layer during the hardening phase
- per-file transaction wrapping remains in place
- per-test savepoint rollback remains in place
- this was verified by the integration smoke suite

### 6. Clean empty-DB bootstrap now succeeds

- the migration/bootstrap path was hardened until an empty local PostgreSQL database could be created, migrated, validated, and dropped successfully
- `0042_schema_sync.sql` was corrected so it no longer fails on malformed array defaults or deterministic duplicate-column collisions in the patient, task, and user blocks

## What Was Blocking Bootstrap Before

Bootstrap originally failed for multiple distinct reasons:

### 1. Wrong canonical bootstrap path

- the earlier test setup relied on:
  - `schema-snapshot.sql`
  - `ensure-schema.ts`
  - startup patch logic in `index.ts`
- this split schema authority across multiple places and made bootstrap difficult to trust

### 2. Drizzle config was overriding test DB selection

- `drizzle.config.ts` was loading `.env` values in a way that could override test-time `DATABASE_URL`
- this made the bootstrap path unsafe and ambiguous

### 3. Schema sync SQL was malformed

- `0042_schema_sync.sql` contained invalid SQL such as malformed array defaults
- this produced bootstrap syntax failures before test execution could begin

### 4. Duplicate-column collisions in migration ordering

`0042_schema_sync.sql` attempted to recreate columns already introduced by earlier migrations, including:

- `patients.profile_completion_score`
- `patients.care_stage`
- `tasks.scheduled_start`
- `users.primary_family_id`

These duplicate column adds were changed to idempotent `ADD COLUMN IF NOT EXISTS` statements in the affected blocks.

### 5. Legacy migration ordering issues

Two older migrations still assume objects exist before they are actually created in the full chain:

- `0040_performance_indexes.sql`
- `0041_nexus_task_context.sql`

Those are handled by narrow explicit allowlists in bootstrap and are logged when skipped.

## What Is Now Passing

### Clean bootstrap validation

The local PostgreSQL test database can now be:

1. created from empty state
2. migrated successfully
3. validated against expected core tables
4. dropped deterministically

Observed validation output:

- `bootstrap-validation: ok`
- `teardown-validation: ok`

### Full PostgreSQL integration suite

The real DB-backed integration suite now executes and passes.

Observed result:

- `1` test file passed
- `6` tests passed
- `0` tests failed

## Exact Test Results

Command:

```text
npm run test:integration
```

Result:

- Total test files: `1`
- Total tests collected: `6`
- Total tests executed: `6`
- Passed: `6`
- Failed: `0`
- Exact failing tests: none

The passing suite is:

- [smoke.test.ts](/C:/Users/USER/OneDrive/Documentos/memoraid-local/server/__tests__/integration/smoke.test.ts)

Passing coverage inside the suite:

- DB connection health
- admin insert
- brief insert/readback
- brief -> round -> review -> decision items persistence
- savepoint rollback isolation
- full brief child persistence

Key proof points:

- rollback isolation proof:
  - [smoke.test.ts:96](/C:/Users/USER/OneDrive/Documentos/memoraid-local/server/__tests__/integration/smoke.test.ts:96)
- round/decision persistence proof:
  - [smoke.test.ts:60](/C:/Users/USER/OneDrive/Documentos/memoraid-local/server/__tests__/integration/smoke.test.ts:60)
- brief persistence proof:
  - [smoke.test.ts:38](/C:/Users/USER/OneDrive/Documentos/memoraid-local/server/__tests__/integration/smoke.test.ts:38)
- full child persistence proof:
  - [smoke.test.ts:109](/C:/Users/USER/OneDrive/Documentos/memoraid-local/server/__tests__/integration/smoke.test.ts:109)

## Residual Technical Debt

### 1. Legacy migration allowlists still exist

The bootstrap path still contains two explicit allowlisted legacy migration skips:

- `0040_performance_indexes.sql`
  - missing relation: `professionals`
- `0041_nexus_task_context.sql`
  - missing relation: `nexus_extracted_tasks`

These are narrow, explicit, logged, and fail closed for all other cases. They are acceptable as temporary containment but should not remain indefinitely.

### 2. `ensure-schema.ts` still exists

- it is no longer the active structural bootstrap authority for the DB-backed integration path
- it still exists in the repo and remains a source of historical schema patch logic
- this file should eventually be reduced or retired once the migration chain is fully normalized

### 3. Legacy setup file still exists

- `server/__tests__/integration/setup.ts` remains in the repo as legacy context
- the active global setup path is now `server/__tests__/integration/global-setup.ts`
- the legacy file can be removed in a later cleanup pass once the team explicitly approves removal

### 4. Integration coverage is still intentionally minimal

- only the hardening smoke suite is passing today
- deeper business-flow lifecycle integration tests were intentionally deferred in this phase

## Legacy Migration Allowlists Still Present

In `server/src/db/bootstrap.ts`:

1. `0040_performance_indexes.sql`
   - allowed only for:
     - PostgreSQL error code `42P01`
     - message matching missing `professionals`

2. `0041_nexus_task_context.sql`
   - allowed only for:
     - PostgreSQL error code `42P01`
     - message matching missing `nexus_extracted_tasks`

Any other migration error still fails bootstrap immediately.

## Phase 2 Approval Status

### Decision

Approved for Phase 2 work.

### Rationale

The DB-backed integration foundation is now sufficiently trustworthy to support Phase 2 integration testing because:

- local-only safety guards are in place
- bootstrap is deterministic from empty PostgreSQL
- route code and tests share the same DB context boundary
- transaction/savepoint isolation is proven
- core NEXUS persistence smoke coverage is passing against the real database

## Recommended Next Engineering Step

Begin Phase 2 by adding real lifecycle integration tests for the NEXUS round workflow on top of the hardened DB foundation, starting with:

1. round progression gating
2. decision review persistence
3. approved findings propagation
4. sprint transition persistence

In parallel, plan a follow-up cleanup pass to normalize the two legacy migration allowlists so the bootstrap path no longer needs exceptional handling.
