# Plan: Scope EnvironmentCredentialBinding per Workflow

## Context

The `EnvironmentCredentialBinding` table currently maps `(environmentId, sourceCredentialId) → targetCredentialId`. This is project-environment scoped: all workflows sharing the same project environment get the same credential swap. However, each workflow in a project independently chooses which credentials its nodes use, so two workflows may both reference the same source credential but need different target credentials in the same environment. Adding `workflowId` to the unique key makes the binding `(workflowId, environmentId, sourceCredentialId) → targetCredentialId`.

---

## Changes

### 1. Migration — modify existing (prototype branch, not in prod)

**File:** `packages/@n8n/db/src/migrations/common/1784000000039-CreateEnvironmentCredentialBinding.ts`

- Add `workflowId` column: `varchar(36) NOT NULL`, FK → `workflow_entity.id` CASCADE
- Replace the unique index on `['environmentId', 'sourceCredentialId']` with one on `['workflowId', 'environmentId', 'sourceCredentialId']`
- Update or replace the non-unique index on `environmentId` with one on `['workflowId', 'environmentId']` for efficient execution-time lookup

Down method: drop and recreate (table drop is already there, no additional rollback needed).

### 2. Entity

**File:** `packages/@n8n/db/src/entities/environment-credential-binding.ts`

- Add `@Column({ type: 'varchar', length: 36 }) workflowId: string`
- Add `@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' }) @JoinColumn({ name: 'workflowId' }) workflow: Relation<WorkflowEntity>`

### 3. Repository

**File:** `packages/@n8n/db/src/repositories/environment-credential-binding.repository.ts`

Update all three methods to accept and filter by `workflowId`:

- `resolveTargetCredentialId(environmentId, workflowId, sourceCredentialId)` — hot-path lookup at execution time; `findOne` on all three columns
- `findAllByEnvironment(environmentId, workflowId)` — used by the GET endpoint
- `replaceAll(environmentId, workflowId, bindings[])` — used by the PUT endpoint; delete WHERE `environmentId = ? AND workflowId = ?`, then bulk insert

### 4. Service

**File:** `packages/cli/src/services/project-environment.service.ts`

Add `workflowId: string` parameter to:

- `getCredentialBindings(environmentId, workflowId)` → delegates to `bindingRepository.findAllByEnvironment`
- `replaceCredentialBindings(projectId, environmentId, workflowId, dto)` → passes `workflowId` into `bindingRepository.replaceAll`
- `validateEnvironmentBindingsForPublish(environmentId, workflowId, nodes[])` → passes `workflowId` into `bindingRepository.findAllByEnvironment` to check only this workflow's bindings

### 5. Controller

**File:** `packages/cli/src/controllers/project-environment.controller.ts`

Add `workflowId` as a **required query parameter** to both credential binding endpoints (route path stays unchanged to avoid a larger refactor):

- `GET /:envId/credential-bindings?workflowId=<id>` — extract from `req.query.workflowId`, pass to service
- `PUT /:envId/credential-bindings?workflowId=<id>` — same

Validate `workflowId` is present; throw `BadRequestError` if missing.

### 6. CredentialsHelper — execution-time swap

**File:** `packages/cli/src/credentials-helper.ts`

In the environment swap block (currently around line 404–412), change:

```ts
// before
resolveTargetCredentialId(additionalData.environmentId, credentialsEntity.id)

// after
resolveTargetCredentialId(additionalData.environmentId, additionalData.workflowId, credentialsEntity.id)
```

`additionalData.workflowId` is already populated on `IWorkflowExecuteAdditionalData` — no interface change needed.

### 7. WorkflowService — publish-time validation

**File:** `packages/cli/src/workflows/workflow.service.ts`

In `activateWorkflow`, pass `workflowId` to the validation call:

```ts
// before
validateEnvironmentBindingsForPublish(options.environmentId, versionToActivate.nodes)

// after
validateEnvironmentBindingsForPublish(options.environmentId, workflowId, versionToActivate.nodes)
```

### 8. Frontend — API client

**File:** `packages/frontend/@n8n/rest-api-client/src/api/projectEnvironments.ts`

- Add `workflowId: string` param to `getCredentialBindings` and `replaceCredentialBindings`
- Append `?workflowId={workflowId}` to the request URL for both

Also update the `EnvironmentCredentialBinding` interface to include `workflowId: string`.

### 9. Frontend — Store

**File:** `packages/frontend/editor-ui/src/features/environments/environments.store.ts`

Change state shape from `Record<envId, EnvironmentCredentialBinding[]>` to `Record<workflowId, Record<envId, EnvironmentCredentialBinding[]>>`:

```ts
// before
const credentialBindings = ref<Record<string, EnvironmentCredentialBinding[]>>({});

// after
const credentialBindings = ref<Record<string, Record<string, EnvironmentCredentialBinding[]>>>({});
```

Update `fetchCredentialBindings(projectId, workflowId, envId)` and `saveCredentialBindings(projectId, workflowId, envId, bindings)` to key state by `workflowId` first.

### 10. Delete EnvironmentBindings component

**File:** `packages/frontend/editor-ui/src/features/environments/components/EnvironmentBindings.vue`

Delete this file. The per-workflow credential binding UI will live in `NodeCredentials.vue` in a future task; for now the project-settings bindings surface is removed entirely. Also remove any import/usage of `EnvironmentBindings.vue` from `ProjectSettings.vue` and any related i18n keys (`projects.settings.environments.bindings.*`).

### 11. Tests

- `packages/cli/src/__tests__/credentials-helper.test.ts` — add `workflowId` to mock `additionalData` and repository mock calls
- `packages/cli/src/workflows/__tests__/workflow.service.test.ts` — update `validateEnvironmentBindingsForPublish` mock to accept `workflowId`
- `packages/cli/test/integration/workflows/workflow.service.test.ts` — same

---

## Verification

1. `pnpm typecheck` in `packages/@n8n/db`, `packages/cli`, `packages/frontend/editor-ui`, `packages/frontend/@n8n/rest-api-client`
2. `pnpm test` in `packages/cli` — credentials-helper and workflow.service tests pass
3. Manual: bind credential A → A-dev for **workflow W1** in dev env; run W1 with "dev" selected → A-dev used; run a different workflow W2 with "dev" → original A used (no binding for W2)
4. Manual: attempt to publish W1 to dev with an unbound credential → 400 with missing binding list
