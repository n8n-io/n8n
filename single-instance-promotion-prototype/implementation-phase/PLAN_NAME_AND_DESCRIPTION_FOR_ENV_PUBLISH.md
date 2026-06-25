# Plan: Support versionName and description in environment-scoped publishing

## Context

When publishing a workflow, users can enter a version name and description to label the published version. However this form (`WorkflowVersionForm`) is only rendered in the modal when **no environments are configured**. As soon as environments exist, the modal switches to an "environment publish" branch that has no version name/description inputs — and `handlePublishToEnvironment` never passes those values to the store/API.

The backend DTO (`ActivateWorkflowDto`) already accepts optional `name` and `description` fields, but they are not passed from the frontend and are ignored in the environment-publish branch of the service. The fix threads name/description all the way through: UI → store → API client → service.

---

## Layers and changes

### 1. `WorkflowPublishModal.vue` (primary change)
`packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowPublishModal.vue`

**Template (env branch, lines 403–435):** Add `WorkflowVersionForm` above the action buttons:
```vue
<template v-else>
  <p ...>Publishing to environment: <strong>...</strong></p>
  <N8nCallout .../>  <!-- existing missing-bindings callout -->

  <!-- ADD: same form used in non-env branch -->
  <WorkflowVersionForm
    ref="publishForm"
    v-model:version-name="versionName"
    v-model:description="description"
    :disabled="inputsDisabled"
    version-name-test-id="workflow-publish-version-name-input"
    description-test-id="workflow-publish-description-input"
  />

  <div :class="$style.actions"> ... </div>
</template>
```

**`inputsDisabled` computed (line 71):** Include `publishingEnvId` so the form is disabled while an env publish is in-flight:
```ts
const inputsDisabled = computed(() => {
  return (
    !wfHasAnyChanges.value ||
    !containsTrigger.value ||
    hasNodeIssues.value ||
    publishing.value ||
    publishingEnvId.value !== null   // ADD
  );
});
```

**Env publish button `disabled` binding:** Add version-name check (mirrors `isPublishDisabled` for non-env):
```ts
:disabled="
  !selectedEnvId ||
  publishingEnvId !== null ||
  versionName.trim().length === 0 ||   // ADD
  (!!selectedEnvId && !envHasAllBindings(selectedEnvId))
"
```

**`handlePublishToEnvironment` (line 248):** Pass name/description and call `setVersionData` on success:
```ts
async function handlePublishToEnvironment(envId: string) {
  ...
  await environmentsStore.publishToEnvironment(
    workflowId, envId, versionId,
    versionName.value,       // ADD
    description.value,       // ADD
  );
  workflowDocumentStore.value?.setVersionData({   // ADD (mirrors non-env path)
    versionId,
    name: versionName.value,
    description: description.value,
  });
  ...
}
```

---

### 2. Environments store
`packages/frontend/editor-ui/src/features/environments/environments.store.ts`

Update `publishToEnvironment` to accept and forward `name`/`description`:
```ts
async function publishToEnvironment(
  workflowId: string,
  environmentId: string,
  versionId: string,
  name?: string,         // ADD
  description?: string,  // ADD
): Promise<void> {
  await environmentsApi.publishToEnvironment(
    rootStore.restApiContext,
    workflowId, environmentId, versionId,
    name, description,   // ADD
  );
  ...
}
```

---

### 3. REST API client
`packages/frontend/@n8n/rest-api-client/src/api/projectEnvironments.ts`

Update `publishToEnvironment` to accept and include `name`/`description` in the request body:
```ts
export const publishToEnvironment = async (
  context: IRestApiContext,
  workflowId: string,
  environmentId: string,
  versionId: string,
  name?: string,         // ADD
  description?: string,  // ADD
): Promise<void> => {
  await makeRestApiRequest(context, 'POST', `/workflows/${workflowId}/activate`, {
    versionId,
    environmentId,
    name,         // ADD
    description,  // ADD
  });
};
```

---

### 4. Backend service — update version record
`packages/cli/src/workflows/workflow.service.ts`

In the `if (options?.environmentId)` branch, update the workflow_history record with name/description before recording the published version. Mirror how the non-env path saves name/description onto the version. Find the existing workflow-history update call used in the non-env path (likely `workflowHistoryRepository.update(...)` or similar) and replicate it here when `options.name` or `options.description` are present:

```ts
if (options?.environmentId) {
  // ADD: update version metadata in workflow_history if provided
  if (options.name !== undefined || options.description !== undefined) {
    await this.workflowHistoryRepository.update(
      { versionId: versionIdToActivate },
      { name: options.name, description: options.description },
    );
  }
  await this.workflowPublishedEnvVersionRepository.setPublishedVersion(...);
  return workflow;
}
```

> Note: Confirm the exact repository method/call by reading the non-env publish path in `workflow.service.ts` — use whatever method it already uses to persist name/description to `workflow_history`.

---

## Files to modify (summary)

| File | Change |
|------|--------|
| `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowPublishModal.vue` | Add `WorkflowVersionForm` to env branch; update disabled logic; pass name/description in `handlePublishToEnvironment`; call `setVersionData` on success |
| `packages/frontend/editor-ui/src/features/environments/environments.store.ts` | Add `name?`/`description?` params to `publishToEnvironment` |
| `packages/frontend/@n8n/rest-api-client/src/api/projectEnvironments.ts` | Add `name?`/`description?` params, include in request body |
| `packages/cli/src/workflows/workflow.service.ts` | Update `workflow_history` record with name/description in env-publish branch |

No DB migrations needed — `workflow_history` already stores `name` and `description` columns.

---

## Verification

1. Start the dev server
2. Open a workflow with environments configured
3. Open the Publish modal → confirm version name and description inputs appear
4. Fill them in and publish → confirm the API request body contains `name`, `description`, `versionId`, `environmentId`
5. Confirm the version in workflow history shows the entered name/description
6. Confirm the env publish button is disabled when version name is empty
7. Confirm inputs are disabled while publish is in-flight
8. Run `pnpm typecheck` from `packages/cli` and `packages/frontend/editor-ui`
