# Plan: Enforce environment-scoped publishing for projects with environments

## Context

Commit `07fbdcc` added support for publishing a workflow to specific per-environment slots. However, it left the old "global" publish path intact alongside the new per-environment path, and the `EnvironmentSelector` still offers "Global (no environment)" as a choice. The new product requirements enforce a stricter separation:

- **Projects with environments**: workflows may only be published to the currently selected environment. No "Global" option; no per-environment button list. A single "Publish" action, publishing to the active environment from `EnvironmentSelector`. Credential binding issues must surface in the modal and block publishing.
- **Projects without environments**: the old global publish path remains completely unchanged. The `EnvironmentSelector` must not appear at all (already handled).

---

## Changes

### 1. Backend — `ProjectEnvironmentService`
**File:** [packages/cli/src/services/project-environment.service.ts](packages/cli/src/services/project-environment.service.ts)

Add a lightweight helper that does a count query instead of loading all records:

```ts
async hasEnvironments(projectId: string): Promise<boolean> {
    const count = await this.environmentRepository.count({ where: { projectId } });
    return count > 0;
}
```

`environmentRepository` (`ProjectEnvironmentRepository`) is already injected.

### 2. Backend — `WorkflowService.activateWorkflow()`
**File:** [packages/cli/src/workflows/workflow.service.ts](packages/cli/src/workflows/workflow.service.ts)

After the workflow permission check but before the `environmentId` early-return block (~line 810), add a guard that blocks global publishing for workflows whose project has environments defined:

```ts
if (!options?.environmentId) {
    const ownerSharing = await this.sharedWorkflowRepository.findOne({
        where: { workflowId, role: 'workflow:owner' },
        select: { projectId: true },
    });
    if (ownerSharing?.projectId) {
        const hasEnvs = await this.projectEnvironmentService.hasEnvironments(ownerSharing.projectId);
        if (hasEnvs) {
            throw new BadRequestError(
                'Workflows in projects with environments must be published to a specific environment.',
            );
        }
    }
}
```

Both `sharedWorkflowRepository` and `projectEnvironmentService` are already injected into `WorkflowService` (lines 76 and 101 of the constructor).

### 3. Frontend — `EnvironmentSelector.vue`
**File:** [packages/frontend/editor-ui/src/features/environments/components/EnvironmentSelector.vue](packages/frontend/editor-ui/src/features/environments/components/EnvironmentSelector.vue)

- **Remove** `{ id: GLOBAL_ID, label: 'Global (no environment)' }` from the `items` computed array. When a project has environments, "Global" is no longer a valid execution context.
- **Auto-select** the first environment after `fetchEnvironments` resolves in `onMounted`, when `selectedEnvironmentId` is `null`.
- Update `selectedLabel` to fall back to the first environment name rather than `'Global'`.

```ts
const items = computed(() =>
    environmentsStore.environments.map((e) => ({ id: e.id, label: e.name })),
);

const selectedLabel = computed(() =>
    environmentsStore.environments.find((e) => e.id === environmentsStore.selectedEnvironmentId)
        ?.name ?? environmentsStore.environments[0]?.name ?? '',
);

onMounted(async () => {
    if (props.projectId && environmentsStore.environments.length === 0) {
        await environmentsStore.fetchEnvironments(props.projectId);
    }
    if (environmentsStore.environments.length > 0 && !environmentsStore.selectedEnvironmentId) {
        environmentsStore.selectedEnvironmentId = environmentsStore.environments[0].id;
    }
});
```

### 4. Frontend — `WorkflowPublishModal.vue`
**File:** [packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowPublishModal.vue](packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowPublishModal.vue)

**Remove** the entire per-environment slots section (the `v-if="environmentsStore.environments.length > 0"` div with per-env buttons). It is replaced by a unified single-publish UX.

**Wrap** the existing `<WorkflowVersionForm>` + `<div :class="$style.actions">` in `v-if="environmentsStore.environments.length === 0"`. They remain exactly as-is for projects without environments.

**Add** a new env-publish section shown when `environmentsStore.environments.length > 0`:

```html
<template v-else>
    <!-- Context: which environment will be published to -->
    <p :class="$style.envPublishContext">
        Publishing to environment:
        <strong>{{ selectedEnvironmentName }}</strong>
    </p>

    <!-- Credential binding warning -->
    <N8nCallout
        v-if="selectedEnvId && !envHasAllBindings(selectedEnvId)"
        theme="warning"
        icon="triangle-alert"
    >
        Some credentials are not bound for this environment. Resolve them before publishing.
    </N8nCallout>

    <!-- Actions: same Cancel + single Publish button -->
    <div :class="$style.actions">
        <N8nButton
            variant="subtle"
            :disabled="publishingEnvId !== null"
            :label="i18n.baseText('generic.cancel')"
            data-test-id="workflow-publish-cancel-button"
            @click="modalBus.emit('close')"
        />
        <N8nButton
            :disabled="!selectedEnvId || publishingEnvId !== null || (selectedEnvId && !envHasAllBindings(selectedEnvId))"
            :loading="publishingEnvId === selectedEnvId"
            :label="i18n.baseText('workflows.publish')"
            data-test-id="workflow-publish-button"
            @click="selectedEnvId && handlePublishToEnvironment(selectedEnvId)"
        />
    </div>
</template>
```

Add computed helpers in `<script setup>`:
```ts
const selectedEnvId = computed(() => environmentsStore.selectedEnvironmentId);
const selectedEnvironmentName = computed(() =>
    environmentsStore.environments.find((e) => e.id === selectedEnvId.value)?.name ?? '',
);
```

Update `handlePublishToEnvironment` to close the modal on success:
```ts
async function handlePublishToEnvironment(envId: string) {
    // ... existing logic ...
    // after showMessage success:
    modalBus.emit('close');
}
```

Remove the `publishingEnvId` ref and its `GLOBAL_ID` constant if no longer used elsewhere after removing per-env buttons. Keep `publishingEnvId` for the loading state on the single Publish button.

---

## What is NOT changed

- `WorkflowHeaderDraftPublishActions.vue` — no change needed.
- `environments.store.ts` — no change needed.
- DB schema / migrations — no change needed.

---

## Verification

1. **Project with environments**: Open the Publish modal → must show "Publishing to environment: **{selected env name}**". Single Publish button publishes to the selected environment. No per-env button list, no global publish form. Credential warning blocks publishing when bindings are missing. Modal closes on success.
2. **Project with environments + missing credential bindings**: Warning callout appears, Publish button is disabled.
3. **Project without environments**: Publish modal shows the normal version-name form + Publish button unchanged. `EnvironmentSelector` does not appear in the header.
4. **Backend guard**: Calling the activate endpoint without `environmentId` for a workflow in a project with environments returns `400 Bad Request`.
5. Run `pnpm typecheck` in `packages/cli` and `packages/frontend/editor-ui`.
6. Run `pnpm test` in the affected packages.
