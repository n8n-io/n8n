# Workflow Environments — Sequential Implementation Tasks

## Context

This breaks [6_PLAN.md](single-instance-promotion-prototype/no-skill/6_PLAN.md) into 4 domain-driven, commit-sized tasks for sequential Claude sessions. Each commit is a full vertical slice (migration → entity → repository → service → controller → frontend) for one domain concept. Later commits build on earlier ones.

Each session should start by reading `6_PLAN.md` for full context, then the files listed in "Read first" for that task.

---

## Task 1 — Environment CRUD

**Delivers:** The base concept of a named environment on a project. You can create, rename, and delete environments. Nothing can be published to them yet — this is purely the management layer.

**Scope (full vertical slice):**

**Backend:**
- Migration: `project_environment` table only (`1790000000001-CreateEnvironmentTables.ts` in `packages/@n8n/db/src/migrations/common/`; register in postgres + sqlite index files)
- Entity: `ProjectEnvironment` extending `WithTimestampsAndStringId` in `packages/@n8n/db/src/entities/project-environment.ts`; export from `entities/index.ts`
- Repository: `ProjectEnvironmentRepository` with `findAllByProject(projectId)` in `packages/@n8n/db/src/repositories/`
- Service: `ProjectEnvironmentService` in `packages/cli/src/services/` — CRUD methods only: `getEnvironments`, `createEnvironment`, `updateEnvironment`, `deleteEnvironment`; all require Enterprise license check
- DTOs: `CreateEnvironmentDto` + `UpdateEnvironmentDto` in `packages/@n8n/api-types/src/dto/environments/environment.dto.ts`
- Controller: `ProjectEnvironmentController` at `@RestController('/projects/:projectId/environments')` — `GET /`, `POST /`, `PATCH /:envId`, `DELETE /:envId`; Enterprise-gated

**Frontend:**
- API module: `packages/frontend/@n8n/rest-api-client/src/api/projectEnvironments.ts` — wrappers for the 4 CRUD endpoints
- Pinia store: `packages/frontend/editor-ui/src/features/environments/environments.store.ts` — `environments: ProjectEnvironment[]` state + fetch/create/update/delete actions
- Component: `EnvironmentList.vue` — simple CRUD list in `packages/frontend/editor-ui/src/features/environments/components/`
- Wire up: new "Environments" tab in project settings; hidden for non-Enterprise

**Read first:**
- `packages/@n8n/db/src/migrations/common/1776150756000-CreateFavoritesTable.ts` — table creation DSL pattern
- `packages/@n8n/db/src/migrations/postgresdb/index.ts` + sqlite equivalent — registration pattern
- `packages/@n8n/db/src/entities/project.ts` — `WithTimestampsAndStringId`, `@ManyToOne` pattern
- `packages/@n8n/db/src/repositories/project.repository.ts` — `@Service()`, query builder pattern
- An existing controller in `packages/cli/src/controllers/` — decorator, auth, DI pattern
- An existing API module and Pinia store in the frontend for patterns

**Verify:** `pnpm typecheck` in `packages/@n8n/db` and `packages/cli` and `packages/editor-ui`. Manually: create/rename/delete an environment via the project settings tab on an Enterprise instance.

---

## Task 2 — Published Version per Environment

**Delivers:** You can publish a workflow to a specific environment (records which version is "live" for that environment). The environment selector appears on the canvas for manual execution and passes `environmentId` through the execution pipeline — but no credential swap or variable override happens yet. Canonical resources are used regardless of which environment is selected.

**Scope (full vertical slice):**

**Backend:**
- Migration: `workflow_published_environment_version` table (int PK autoincrement; `workflowId` FK→`workflow_entity` CASCADE; `environmentId` FK→`project_environment` CASCADE; `publishedVersionId` varchar(36) — RESTRICT FK to `workflow_history.versionId` via raw SQL, NOT a TypeORM decorator; UNIQUE `(workflowId, environmentId)`). Add to the same migration file as Task 1, OR a new migration file `1790000000002-CreateWorkflowPublishedEnvironmentVersion.ts`
- Entity: `WorkflowPublishedEnvironmentVersion` in `packages/@n8n/db/src/entities/workflow-published-environment-version.ts`; export from index
- Repository: `WorkflowPublishedEnvironmentVersionRepository` — `getPublishedVersionId`, `setPublishedVersion` (upsert), `removePublishedVersion`
- Interface: add `environmentId?: string` to `IWorkflowExecuteAdditionalData` in `packages/workflow/src/interfaces.ts` (near `projectId?: string`)
- DTO: add `environmentId: z.string().optional()` to `ActivateWorkflowDto` in `packages/@n8n/api-types/src/dto/workflows/activate-workflow.dto.ts`
- `getBase()` in `packages/cli/src/workflow-execute-additional-data.ts`: accept `environmentId?: string` in params, store on `additionalData.environmentId`
- Manual execution path in `packages/cli/src/workflows/workflow-execution.service.ts`: extract `environmentId` from request query param, pass to `getBase()`
- `WorkflowService.activateWorkflow` in `packages/cli/src/workflows/workflow.service.ts`: accept optional `environmentId`; when present, upsert a `WorkflowPublishedEnvironmentVersion` row (no binding validation yet — that comes in Task 3); do NOT touch `workflow_entity.activeVersionId` or `active`; do NOT call `ActiveWorkflowManager.add()`

**Frontend:**
- Extend API module (from Task 1) with activate endpoint usage for env publishing
- Extend store with `publishedVersions: Record<envId, string>` state + `publishToEnvironment` action
- Canvas env selector: small dropdown before the "Execute" button; options = "No environment (global)" + each environment from the store; only shown for Enterprise projects with ≥1 environment; passes `environmentId` as query param on manual execution trigger
- Publish modal: add per-env publication slots (env name + currently published version + freshness indicator — green = current, yellow = stale, grey = never published); "Publish globally" always at top; no credential warning badges yet (those come in Task 3)

**Read first:**
- `packages/cli/src/workflow-execute-additional-data.ts` — current `getBase()` signature and body (~lines 661–780)
- `packages/cli/src/workflows/workflow-execution.service.ts` — how manual execution calls `getBase()`, how query params flow in
- `packages/cli/src/workflows/workflow.service.ts` — `activateWorkflow` method
- `packages/workflow/src/interfaces.ts` ~lines 3319–3425 — `IWorkflowExecuteAdditionalData`
- Canvas toolbar and publish modal components in the frontend

**Verify:** `pnpm typecheck` in all touched packages. Manually: publish workflow to "dev" environment → confirm `workflow_published_environment_version` row is created; confirm `workflow_entity.activeVersionId` and `active` are unchanged; select "dev" in canvas execution dropdown → execution runs (with canonical credentials/variables for now).

---

## Task 3 — Credential Bindings per Environment

**Delivers:** Each environment can map a canonical credential to an env-specific one. When a manual execution runs with an `environmentId`, the credential swap is applied transparently. Publishing to an environment with unbound credentials is blocked with a clear error.

**Scope (full vertical slice):**

**Backend:**
- Migration: `environment_credential_binding` table (`environmentId` FK→`project_environment` CASCADE; `sourceCredentialId` + `targetCredentialId` FK→`credentials_entity` CASCADE; UNIQUE `(environmentId, sourceCredentialId)`; INDEX `environmentId`)
- Entity: `EnvironmentCredentialBinding` in `packages/@n8n/db/src/entities/environment-credential-binding.ts`; export from index
- Repository: `EnvironmentCredentialBindingRepository` — `upsertBinding`, `resolveTargetCredentialId` (hot-path single-row lookup), `findAllByEnvironment`, `deleteBinding`
- Service: add to `ProjectEnvironmentService` — `getCredentialBindings(environmentId)`, `replaceCredentialBindings(environmentId, bindings[])` (validates both credentials belong to same project before upserting), `validateEnvironmentBindingsForPublish(workflowId, environmentId, nodes[])` (extracts credential IDs from connected enabled nodes; returns `{ valid, missingBindings[] }`)
- Modify `WorkflowService.activateWorkflow` env path: call `validateEnvironmentBindingsForPublish` before writing the WPEV row; throw `BadRequestError` with missing binding names if invalid
- Modify `CredentialsHelper.getCredentialsEntity` in `packages/cli/src/credentials-helper.ts`: if `additionalData.environmentId` is set, call `resolveTargetCredentialId`; if a target is found, replace `credentialsEntity` with the target before downstream decryption
- DTOs: `UpsertCredentialBindingsDto` in `packages/@n8n/api-types/src/dto/environments/environment-bindings.dto.ts`
- Controller: add `GET /:envId/credential-bindings` + `PUT /:envId/credential-bindings` to `ProjectEnvironmentController`

**Frontend:**
- Extend API module with credential binding endpoints
- Extend store with `credentialBindings: Record<envId, EnvironmentCredentialBinding[]>` state + fetch/replace actions
- `EnvironmentBindings.vue`: credential bindings section — for each project credential, a source→target select pair; save triggers `PUT /:envId/credential-bindings`
- Wire `EnvironmentBindings.vue` into the "Environments" tab (alongside `EnvironmentList.vue`)
- Publish modal: add orange badge on env slot if any credential is unmapped; block publish button for that env slot

**Read first:**
- `packages/cli/src/credentials-helper.ts` — find `getCredentialsEntity`, understand how `additionalData` is accessed
- `packages/cli/src/workflows/workflow.service.ts` — env publication path from Task 2
- `packages/@n8n/db/src/entities/credentials-entity.ts` — credential entity shape
- `EnvironmentBindings.vue` starting point + how project credentials are listed in the frontend (credential store/service)

**Verify:** `pnpm typecheck` in all touched packages. Manually: bind credential A → A-dev in dev env; run workflow with "dev" selected → confirm A-dev credential is used; attempt to publish to env with unbound credential → expect 400 with missing binding list.

---

## Task 4 — Variable Overrides per Environment

**Delivers:** Each environment can override the value of a project-scoped variable. When execution runs with an `environmentId`, overridden variable values are merged on top of project variables before execution.

**Scope (full vertical slice):**

**Backend:**
- Migration: `environment_variable_override` table (`environmentId` FK→`project_environment` CASCADE; `variableId` FK→`variables` CASCADE; `overrideValue TEXT NOT NULL`; UNIQUE `(environmentId, variableId)`; INDEX `environmentId`)
- Entity: `EnvironmentVariableOverride` in `packages/@n8n/db/src/entities/environment-variable-override.ts`; export from index
- Repository: `EnvironmentVariableOverrideRepository` — `upsertOverride`, `resolveOverridesForExecution(environmentId): Promise<Record<string, string>>` (joins to `variables` to return `{ [variable.key]: overrideValue }` map), `findAllByEnvironment`, `deleteOverride`
- Service: add to `ProjectEnvironmentService` — `getVariableOverrides(environmentId)`, `replaceVariableOverrides(environmentId, overrides[])`
- Modify `WorkflowHelpers.getVariables` in `packages/cli/src/workflow-helpers.ts`: accept optional `environmentId`; when provided, call `resolveOverridesForExecution` and `Object.assign(variables, overrides)` on top of the resolved project variables; propagate `environmentId` from `getBase()` call site
- DTOs: `UpsertVariableOverridesDto` in `packages/@n8n/api-types/src/dto/environments/environment-bindings.dto.ts` (add to existing file)
- Controller: add `GET /:envId/variable-overrides` + `PUT /:envId/variable-overrides` to `ProjectEnvironmentController`

**Frontend:**
- Extend API module with variable override endpoints
- Extend store with `variableOverrides: Record<envId, VariableOverride[]>` state + fetch/replace actions
- Add variable overrides section to `EnvironmentBindings.vue`: list project-scoped variables; for each, an editable value field (empty = use project default); save triggers `PUT /:envId/variable-overrides`
- Publish modal: add info badge on env slot showing override count (never blocks publish)

**Read first:**
- `packages/cli/src/workflow-helpers.ts` — `getVariables` function and how it's called from `getBase()`
- `packages/@n8n/db/src/entities/variables.ts` — variable entity; note `project: Project | null` (null = global, non-null = project-scoped; only project-scoped variables are meaningful override targets)
- How the frontend lists project variables (variables store/service)

**Verify:** `pnpm typecheck` in all touched packages. Walk through the full verification checklist from `6_PLAN.md` items 1–13: create envs, bind credentials, set variable overrides, publish globally + per-env, execute with each env selector, confirm correct credential + variable values are used, delete env and confirm cascade, attempt publish with unbound credential, test non-Enterprise hiding.

---

## Running Order

```
Task 1 (Environments CRUD)
  → Task 2 (Published version per env — env selector + publish path)
    → Task 3 (Credential bindings — swap at execution time + publish gate)
      → Task 4 (Variable overrides — merge at execution time)
```

Each task = one commit. Each session reads `6_PLAN.md` first, then the files in "Read first", then implements exactly the task scope — no more.
