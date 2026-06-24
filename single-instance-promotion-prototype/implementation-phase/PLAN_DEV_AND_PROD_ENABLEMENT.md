# Plan: Enable Environments Toggle UX

## Context

The `EnvironmentList` component in `ProjectSettings.vue` currently presents an always-visible inline form as its empty state, making the environments feature feel like a required configuration step rather than an opt-in capability.

The change introduces an "Enable environments" toggle as the entry point. Until a user explicitly opts in, no environments exist and the toggle is off. On first enable, the system auto-creates "Dev" and "Prod" environments and creates pass-through credential bindings for all workflow nodes in the project (source = target), so existing workflows continue to execute identically. Once environments exist, the toggle becomes disabled/read-only (a visual indicator only), the list of environments is shown, and a ghost "+ Add environment" button at the bottom lets users add more.

---

## Changes

### 1. Backend: Initialize Environments Endpoint

**Files:**
- `packages/cli/src/services/project-environment.service.ts`
- `packages/cli/src/controllers/project-environment.controller.ts`
- `packages/@n8n/api-types/src/dto/environments/` (new `initialize-environments.dto.ts` if needed, or inline)

**New service method: `initializeEnvironments(projectId: string)`**

Logic (wrapped in a transaction):
1. Guard: throw `ConflictError` if any environments already exist for the project.
2. Create two `ProjectEnvironment` records: `"Dev"` and `"Prod"`.
3. Load all workflows belonging to the project (`WorkflowRepository.findByProjectId(projectId)` or equivalent — check how the service currently queries workflows; `validateEnvironmentBindingsForPublish` gives a reference for how nodes are scanned).
4. For each workflow, iterate all enabled nodes. For each node's `credentials` map (`node.credentials[type].id`), collect unique `credentialId` values.
5. For each `(workflowId, credentialId)` pair, insert two `EnvironmentCredentialBinding` records:
   - `{ workflowId, environmentId: devId, sourceCredentialId: credId, targetCredentialId: credId }`
   - `{ workflowId, environmentId: prodId, sourceCredentialId: credId, targetCredentialId: credId }`
   (Pass-through bindings: both environments start with the same credential as the workflow currently uses.)
6. Return `{ environments: [dev, prod], bindingsCreated: number }`.

**New controller endpoint:**
```
POST /projects/:projectId/environments/initialize
```
- Decorated with `@ProjectScope('project:update')` (same authorization as creating environments).
- Calls `projectEnvironmentService.initializeEnvironments(projectId)`.
- Returns `201` with the two created environments.

**No new DB migrations needed** — existing `project_environment` and `environment_credential_binding` tables cover this.

---

### 2. API Types

**File:** `packages/@n8n/api-types/src/dto/environments/initialize-environments.dto.ts` (new, or add to `environment.dto.ts`)

No request body needed. Response type reuses `ProjectEnvironment[]`.

---

### 3. API Client

**File:** `packages/frontend/@n8n/rest-api-client/src/api/projectEnvironments.ts`

Add:
```ts
export async function initializeEnvironments(
  projectId: string,
): Promise<ProjectEnvironment[]> { ... }
```

Calls `POST /projects/${projectId}/environments/initialize`.

---

### 4. Environments Store

**File:** `packages/frontend/editor-ui/src/features/environments/environments.store.ts`

Add action:
```ts
async initializeEnvironments(projectId: string): Promise<void> {
  const created = await projectEnvironmentsApi.initializeEnvironments(projectId);
  environments.value = created;
}
```

---

### 5. EnvironmentList.vue — Full Refactor

**File:** `packages/frontend/editor-ui/src/features/environments/components/EnvironmentList.vue`

**New template structure (top-level):**

```
┌─────────────────────────────────────────────────────────┐
│  [N8nSwitch2]  Enable environments                       │  ← always visible; off = no envs, disabled when on
└─────────────────────────────────────────────────────────┘

If environments.length > 0:
┌─────────────────────────────────────────────────────────┐
│  Dev          [edit ghost]  [delete ghost]               │
│  Prod         [edit ghost]  [delete ghost]               │
│                                                          │
│  + Add environment   ← ghost button                      │
│                                                          │
│  [If showAddForm:]                                       │
│    [input]  [Cancel]  [Create]                           │
└─────────────────────────────────────────────────────────┘
```

**Key implementation details:**

- `hasEnvironments` computed = `environmentsStore.environments.length > 0`
- Toggle:
  ```vue
  <N8nSwitch2
    :model-value="hasEnvironments"
    :disabled="hasEnvironments"
    size="small"
    @update:model-value="onEnableToggle"
  />
  ```
- `onEnableToggle`: calls `useMessage().confirm(...)` with the explanation copy (see i18n below). On `MODAL_CONFIRM`, calls `environmentsStore.initializeEnvironments(projectId)`. Shows toast on error.
- Delete button: change from `type="secondary"` → `type="tertiary"` (ghost-like). Replace native `confirm()` with `useMessage().confirm()` to match the rest of the codebase.
- Edit button: keep `type="tertiary"` (already minimal).
- `showAddForm = ref(false)` — "+ Add environment" ghost button sets it to `true`; "Cancel" sets it back.
- The add-form input + Create/Cancel buttons move to be controlled by `showAddForm` (rather than always visible).

**Imports to add:** `N8nSwitch2` from `@n8n/design-system`, `useMessage` from `@/app/composables/useMessage`, `MODAL_CONFIRM` from `@/app/constants`.

---

### 6. i18n

**File:** `packages/frontend/@n8n/i18n/src/locales/en.json`

Add the following keys:
```json
"projects.settings.environments.enable": "Enable environments",
"projects.settings.environments.enable.confirm.title": "Enable environments?",
"projects.settings.environments.enable.confirm.message": "This will add two environments to this project: Dev and Prod. All credentials used across your workflows will automatically be bound to both environments — they'll use the same credential as before. Going forward, workflow authors can choose a different credential per node per environment.",
"projects.settings.environments.enable.confirm.button": "Enable",
"projects.settings.environments.enable.error": "Failed to initialize environments",
"projects.settings.environments.addEnvironment": "+ Add environment"
```

The existing `projects.settings.environments.delete.confirm` key currently uses native `confirm()` — it can stay as-is if switching to `useMessage()` is considered out of scope, otherwise update the call site in `removeEnvironment` to use `useMessage().confirm()`.

---

## Verification

1. **Unit/integration tests:**
   - Backend: add a test in `project-environment.service.spec.ts` for `initializeEnvironments` covering: no-environment guard, two environments created, pass-through bindings inserted for workflow credentials, transaction rollback on failure.
   - Frontend: update `EnvironmentList.spec.ts` (if exists) or add vitest tests for toggle rendering, confirmation dialog, and add-form visibility.

2. **Manual smoke test:**
   - Open a project with existing workflows that use credentials.
   - Go to Project Settings → Environments section.
   - Toggle is off. Click it → confirmation dialog appears with the explanation copy.
   - Confirm → Dev and Prod environments appear in the list; toggle is now on and disabled.
   - Click "+ Add environment" → inline form appears; fill in a name → "Staging" is created.
   - Delete an environment → confirmation dialog; confirm → removed.
   - Delete all remaining environments → toggle goes back to off state.
   - Test with a project that has no workflows — environments still get created, just no bindings.
