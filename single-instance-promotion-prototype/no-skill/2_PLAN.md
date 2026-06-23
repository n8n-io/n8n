# Plan: Workflow Environments — Variables, Data Tables & Optional Environment Publishing

## Context

This extends `1_PLAN.md` (credentials-only environments) with two additional bindable resources:

- **Project variables** — environment-specific value overrides (e.g. `API_URL` has one value in dev, another in prod)
- **Data tables** — environment-specific table swapping (like credential bindings: "Customers" table in dev → "Customers-Prod" table in prod)

It also clarifies the publication model: **environments are opt-in per workflow**, not mandatory per project. A workflow in a project that has environments defined can still be published globally (no environment), behaving exactly as today. Only workflows that _need_ per-environment resource differences need to use environment-scoped publication.

---

## Publication Model Clarification (Key Design Change)

The original plan implied that once a project has environments, all publications go through the env-scoped path. This plan makes environments **opt-in at the workflow level**:

| Scenario | What happens |
|---|---|
| Project has no environments | Publish flow unchanged — writes `activeVersionId` / `workflow_published_version` |
| Project has environments, workflow published globally | Same legacy path — no credential/variable/table swapping |
| Project has environments, workflow published to env X | New env path — swaps credentials, applies variable overrides, remaps data tables for env X |

A workflow can have a global publication AND per-environment publications simultaneously (independent publication slots that don't conflict). Each slot has its own active trigger.

---

## Phase 1 — DB Schema (additions to existing plan)

### New table: `environment_variable_override`

Override a project variable's value for a specific environment. The variable key stays the same in expressions (`$vars.VAR_NAME`); only the value changes at execution time.

```
id             varchar(36)   PK
environmentId  varchar(36)   FK → project_environment.id CASCADE
variableId     varchar(36)   FK → variables.id CASCADE
overrideValue  text          NOT NULL
createdAt      datetime
updatedAt      datetime

UNIQUE (environmentId, variableId)
INDEX  (environmentId)
```

> **Why value-override, not variable-swap?**
> Variables are accessed by key (`$vars.DB_URL`) not by ID. Swapping a variable would require users to create duplicate variables per environment. Overriding the value keeps the same key everywhere and only changes the resolved value at execution time.

### New table: `environment_data_table_binding`

Map a "source" data table (the one referenced by nodes) to an env-specific "target" data table at execution time. Mirrors `environment_credential_binding` exactly.

```
id                  varchar(36)  PK
environmentId       varchar(36)  FK → project_environment.id CASCADE
sourceDataTableId   varchar(36)  FK → data_table.id CASCADE
targetDataTableId   varchar(36)  FK → data_table.id CASCADE
createdAt           datetime
updatedAt           datetime

UNIQUE (environmentId, sourceDataTableId)
INDEX  (environmentId)
```

### Migration files

- `1790000000005-CreateEnvironmentVariableOverrideTable.ts`
- `1790000000006-CreateEnvironmentDataTableBindingTable.ts`

Register in both `postgresdb/index.ts` and `sqlite/index.ts` (same pattern as existing plan migrations).

---

## Phase 2 — TypeORM Entities

New files in `packages/@n8n/db/src/entities/`:

- **`environment-variable-override.ts`** — extends `WithTimestampsAndStringId`; `@ManyToOne` → `ProjectEnvironment`; `@ManyToOne` → `Variables`
- **`environment-data-table-binding.ts`** — extends `WithTimestampsAndStringId`; `@ManyToOne` → `ProjectEnvironment`; stores `sourceDataTableId` / `targetDataTableId` as plain `varchar` columns (no TypeORM relation decorator — `DataTable` entity lives in `packages/cli`, not `@n8n/db`, so cross-package entity references are avoided; validated in the service layer instead)

Export both from `packages/@n8n/db/src/entities/index.ts`.

---

## Phase 3 — Repositories

### `environment-variable-override.repository.ts`

- `upsertOverride(environmentId, variableId, overrideValue)`
- `findAllByEnvironment(environmentId): Promise<{ variableId, key, overrideValue }[]>`
- `deleteOverride(environmentId, variableId)`
- `resolveOverridesForExecution(environmentId): Promise<Record<string, string>>` — returns `{ [key]: overrideValue }` map for fast merge at execution time

### `environment-data-table-binding.repository.ts`

- `upsertBinding(environmentId, sourceDataTableId, targetDataTableId)`
- `resolveTargetDataTableId(environmentId, sourceDataTableId): Promise<string | null>` — hot-path lookup
- `findAllByEnvironment(environmentId)`
- `deleteBinding(environmentId, sourceDataTableId)`

---

## Phase 4 — Backend Services

### Extended `ProjectEnvironmentService`

**File:** `packages/cli/src/services/project-environment.service.ts`

Add methods alongside the existing credential binding methods:

```ts
// Variable overrides
upsertVariableOverride(environmentId, variableId, overrideValue)
deleteVariableOverride(environmentId, variableId)
getVariableOverrides(environmentId)

// Data table bindings
upsertDataTableBinding(environmentId, sourceDataTableId, targetDataTableId)
deleteDataTableBinding(environmentId, sourceDataTableId)
getDataTableBindings(environmentId)
```

Validation guards:
- Variable must belong to the same project as the environment
- Both source and target data tables must belong to the same project as the environment

Extend `validateEnvironmentBindingsForPublish` to optionally check data table bindings (variables are never blocking for publish — an unoverridden variable silently uses its project default value).

### Modified: `WorkflowHelpers.getVariables`

**File:** `packages/cli/src/workflow-helpers.ts`

Add optional `environmentId` parameter. When provided, fetch variable overrides and merge them on top of the resolved project variables:

```ts
const variables = await getVariables(workflowId, projectId); // existing
if (environmentId) {
  const overrides = await environmentVariableOverrideRepository
    .resolveOverridesForExecution(environmentId);
  Object.assign(variables, overrides); // override values by key
}
```

Pass `environmentId` through `getBase()` in `packages/cli/src/workflow-execute-additional-data.ts` (~line 682), where variables are currently fetched.

### Modified: data table proxy provider (data table binding resolution)

**File:** `packages/core/src/execution-engine/node-execution-context/utils/data-table-helper-functions.ts`

Data tables are resolved on-demand via `getDataTableProxy(dataTableId)`. The provider is injected into `additionalData['data-table']` in `workflow-execute-additional-data.ts`. Wrap the provider to remap the table ID when an environment binding exists:

```ts
// Inside the wrapped provider, before forwarding to the original provider:
if (additionalData.environmentId) {
  const targetId = await environmentDataTableBindingRepository
    .resolveTargetDataTableId(additionalData.environmentId, dataTableId);
  if (targetId) dataTableId = targetId;
}
```

### Modified: `IWorkflowExecuteAdditionalData`

**File:** `packages/workflow/src/interfaces.ts`

`environmentId?: string` — already in original plan, no change.

---

## Phase 5 — REST API

### New endpoints on `ProjectEnvironmentController`

**File:** `packages/cli/src/controllers/project-environment.controller.ts`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/:envId/variable-overrides` | project:read | List variable overrides for environment |
| PUT | `/:envId/variable-overrides` | project:update | Full-replace variable overrides |
| GET | `/:envId/data-table-bindings` | project:read | List data table bindings for environment |
| PUT | `/:envId/data-table-bindings` | project:update | Full-replace data table bindings |

### Modified: `GET /workflows/:id/environments`

Enrich each environment entry to include:
- `credentialBindingStatus: 'complete' | 'incomplete'`
- `variableOverrideCount: number` (informational — overrides never block publish)
- `dataTableBindingStatus: 'complete' | 'incomplete' | 'not-configured'`
- `publishedVersionId: string | null`
- `globalPublication: { publishedVersionId: string; publishedAt: string } | null` — the "no environment" slot status

### New DTO types in `packages/@n8n/api-types`

- `src/dto/environments/upsert-variable-overrides.dto.ts` — array of `{ variableId, overrideValue }`
- `src/dto/environments/upsert-data-table-bindings.dto.ts` — array of `{ sourceDataTableId, targetDataTableId }`
- `src/schemas/environment-variable-override.schema.ts`
- `src/schemas/environment-data-table-binding.schema.ts`

---

## Phase 6 — Frontend

### Modified: `WorkflowPublishModal.vue`

**File:** `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowPublishModal.vue`

When the project has environments, the modal presents two independent sections:

1. **"Publish globally"** — always available, even when environments are defined. Existing publish behavior. No binding validation.
2. **Per-environment slots** — each environment shows:
   - Credential binding status (orange badge = missing, blocks publish button for that env)
   - Variable overrides count (info badge — never blocks)
   - Data table binding status (orange badge = missing, blocks publish button for that env)
   - Currently published version + freshness indicator (green/yellow/grey)

Users can independently publish/unpublish the global slot and each environment slot.

### Extended: `EnvironmentBindings.vue`

Extend (or replace) the credential-only bindings component with three sections:

1. **Credential bindings** — existing design (source → target credential select)
2. **Variable overrides** — list project-scoped variables with an inline value override field per environment; empty field = use project default
3. **Data table bindings** — same source → target select pattern as credentials

### New API module additions

**File:** `packages/frontend/@n8n/rest-api-client/src/api/projectEnvironments.ts`

Add wrappers for the four new endpoints alongside existing credential binding methods.

### Modified: Pinia `environments.store.ts`

**File:** `packages/frontend/editor-ui/src/features/environments/environments.store.ts`

Add state and actions for:
- `variableOverrides: Record<environmentId, VariableOverride[]>`
- `dataTableBindings: Record<environmentId, DataTableBinding[]>`

### Manual execution environment selector

The canvas execution dropdown adds **"No environment (global)"** as the default top option (uses canonical values). Below it, each configured environment is listed. Only shown when the project has environments.

---

## Execution Resolution — Full Trace with All Three Resource Types

For a trigger-fired execution in environment "prod":

```
1. Trigger fires → WorkflowTriggerActivator.activate
   └─ has environmentId from workflow_environment_publication row

2. getBase({ workflowId, projectId, environmentId: 'prod-env-id' })

3a. getVariables(workflowId, projectId, environmentId: 'prod-env-id')
    └─ fetch project variables → merge prod overrides by key → freeze
    └─ additionalData.variables = { API_URL: 'https://api.com', ... }

3b. data-table proxy provider configured with environmentId
    └─ getDataTableProxy(sourceTableId) → resolveTargetDataTableId → targetTableId
    └─ returns proxy over the env-specific target table

3c. CredentialsHelper.getCredentialsEntity (from original plan)
    └─ resolveTargetCredentialId('prod-env-id', canonicalCredId) → 'prod-cred-id'
    └─ loads prod-specific credential

4. Execution runs with:
   - $vars.API_URL = 'https://api.com'  (prod override)
   - Data table 'Customers' → resolves to 'Customers-Prod'
   - Credential 'PG Dev' → resolves to 'PG Prod'
```

For a **globally published workflow** in the same project (no `environmentId`):
- `getBase()` called without `environmentId`
- Zero extra DB calls — canonical variables, original tables, original credentials used

---

## Backward Compatibility

All invariants from the original plan hold, plus:

| Touchpoint | Behaviour when no environment context |
|---|---|
| `getVariables()` | No `environmentId` → no override lookup, zero extra DB calls |
| Data table proxy | No `environmentId` → direct table lookup, no remap |
| Publish modal | "Publish globally" always available even in env-enabled projects |
| Existing triggers | Global publish → `workflow_published_version` → existing trigger mechanism unchanged |
| Variable with no override | Uses project-level value as fallback — no error, no blocked publish |

---

## Verification

### Additional unit tests

| File | Covers |
|------|--------|
| `environment-variable-override.repository.test.ts` | Upsert, resolveOverridesForExecution (hit, miss, multiple keys) |
| `environment-data-table-binding.repository.test.ts` | Upsert, resolveTargetDataTableId (hit, miss) |
| `workflow-helpers.getVariables.test.ts` | Variables merged with environment overrides; fallback to project value when no override |
| `data-table-helper-functions.environment.test.ts` | Proxy remap with/without environmentId |

### Additional manual checklist steps (complement original plan's checklist 1–10)

11. Project has "dev"/"prod" environments → Publish modal shows both "Publish globally" and per-env slots
12. Publish globally in an env-enabled project → trigger fires with canonical variable/credential/table values
13. Configure variable override for "prod" (`API_URL` → `https://api.com`) → publish to prod → execution uses prod URL; dev execution still uses dev URL
14. Configure data table binding for "prod" (`Customers` → `Customers-Prod`) → Data Table node reads from `Customers-Prod` when triggered via prod publication
15. Workflow published globally AND to "dev" simultaneously → two independent triggers active, each using their respective resource sets
16. Remove variable override → execution falls back to project-level value, no error thrown
17. Publish to env with missing data table binding (but all credential bindings present) → decide whether this blocks (warning) or allows publish
18. Open existing project (no environments) → publish modal, header badge, and execution flow all unchanged
