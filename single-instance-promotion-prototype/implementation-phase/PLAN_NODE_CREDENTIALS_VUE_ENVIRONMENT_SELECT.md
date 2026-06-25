# Plan: EnvironmentSelect in NodeCredentials

## Context

Environment credential bindings exist in the DB (`environment_credential_binding` table) keyed by `(workflowId, environmentId, nodeId, credentialType) → targetCredentialId`. The backend API and frontend store (`useEnvironmentsStore`) already support fetching and replacing these bindings. The project settings page (`EnvironmentBindings.vue`) lets project admins manage bindings in bulk.

This plan moves the binding UI into `NodeCredentials.vue` — the natural place for workflow authors. A single environment dropdown at the top of the component switches between environment "lenses". In env mode the credential slots below show the bound credential (if any) or the regular empty state. Publishing to an environment is already blocked when bindings are missing, so the empty state is semantically accurate (not misleading — there is no runtime fallback that hides the gap).

**Discriminator in use:** `(workflowId, environmentId, nodeId, credentialType)` — matching the current DB entity and repo.

**Sync policy:** The env dropdown in NodeCredentials is **local to the NDV panel** (independent of the canvas-level `EnvironmentSelector`). It initialises from `environmentsStore.selectedEnvironmentId` but does not write back to it.

**Credential selection in env mode:** Selecting or creating a credential saves **only** a credential binding — it does not update `node.credentials`. The normal `onCredentialSelected` path (which writes to `node.credentials`) is bypassed in env mode.

---

## Files to Modify

### 1. `packages/frontend/editor-ui/src/features/environments/environments.store.ts`

Add a single-binding upsert action. It fetches the existing binding list (if not cached), splices in the change, then calls the existing `saveCredentialBindings` which does a full `PUT` replace.

```typescript
async function setCredentialBinding(
  projectId: string,
  workflowId: string,
  envId: string,
  nodeId: string,
  credentialType: string,
  targetCredentialId: string | null,
): Promise<void> {
  // Ensure the binding list for this workflow+env is loaded
  if (!credentialBindings.value[workflowId]?.[envId]) {
    await fetchCredentialBindings(projectId, workflowId, envId);
  }
  const existing = credentialBindings.value[workflowId]?.[envId] ?? [];
  const filtered = existing.filter(
    (b) => !(b.nodeId === nodeId && b.credentialType === credentialType),
  );
  const updated = targetCredentialId
    ? [...filtered, { nodeId, credentialType, targetCredentialId }]
    : filtered;
  await saveCredentialBindings(projectId, workflowId, envId, updated);
}
```

Export `setCredentialBinding` from the store's return object.

### 2. `packages/frontend/editor-ui/src/features/credentials/components/NodeCredentials.vue`

#### Script additions (after existing store instantiations)

```typescript
import { useEnvironmentsStore } from '@/features/environments/environments.store';

const environmentsStore = useEnvironmentsStore();

// Local env selection — does not sync back to canvas EnvironmentSelector
const nodeCredEnvId = ref<string | null>(environmentsStore.selectedEnvironmentId);

const effectiveProjectId = computed(
  () => props.projectId ?? projectsStore.currentProject?.id ?? '',
);
const effectiveWorkflowId = computed(
  () => (!workflowsStore.isNewWorkflow ? workflowDocumentStore?.value.workflowId : '') ?? '',
);

// Show env UI only when project has environments and workflow + node IDs are known
const isEnvMode = computed(
  () =>
    environmentsStore.environments.length > 0 &&
    !!nodeCredEnvId.value &&
    !!effectiveWorkflowId.value &&
    !!props.node.id,
);

// Fetch bindings when env selection changes
watch(
  nodeCredEnvId,
  async (envId) => {
    if (!envId || !effectiveProjectId.value || !effectiveWorkflowId.value) return;
    if (!environmentsStore.credentialBindings[effectiveWorkflowId.value]?.[envId]) {
      await environmentsStore.fetchCredentialBindings(
        effectiveProjectId.value,
        effectiveWorkflowId.value,
        envId,
      );
    }
  },
  { immediate: true },
);

function getEnvBinding(credentialType: string) {
  if (!nodeCredEnvId.value || !effectiveWorkflowId.value) return null;
  const bindings =
    environmentsStore.credentialBindings[effectiveWorkflowId.value]?.[nodeCredEnvId.value] ?? [];
  return bindings.find((b) => b.nodeId === props.node.id && b.credentialType === credentialType) ?? null;
}

// Returns the credential ID to show in the select (binding in env mode, node credential otherwise)
function getEffectiveSelectedId(type: INodeCredentialDescription): string | undefined {
  if (isEnvMode.value) return getEnvBinding(type.name)?.targetCredentialId ?? undefined;
  return getSelectedId(type);
}

// Returns true when the credential slot has a value to display
function isEffectiveCredentialExisting(type: INodeCredentialDescription): boolean {
  if (isEnvMode.value) return !!getEnvBinding(type.name);
  return isCredentialExisting(type);
}

async function onEnvCredentialSelected(credentialType: string, credentialId: string | null) {
  if (!nodeCredEnvId.value || !effectiveProjectId.value || !effectiveWorkflowId.value || !props.node.id) return;
  try {
    await environmentsStore.setCredentialBinding(
      effectiveProjectId.value,
      effectiveWorkflowId.value,
      nodeCredEnvId.value,
      props.node.id,
      credentialType,
      credentialId,
    );
  } catch (error) {
    toast.showError(error, i18n.baseText('nodeCredentials.environmentBinding.saveError'));
  }
}
```

#### Auto-select watcher guard

At the top of the `credentialTypesNodeDescriptionDisplayed` watcher, skip auto-selection in env mode:
```typescript
if (isEnvMode.value) return;
```

#### `credentialsStore.$onAction` handler

In the `createNewCredential` case, intercept in env mode:
```typescript
case 'createNewCredential':
  if (result) {
    const newId = (result as ICredentialsResponse).id;
    if (isEnvMode.value) {
      await onEnvCredentialSelected(credentialType, newId);
    } else {
      onCredentialSelected(credentialType, newId);
    }
  }
  break;
```

#### `onQuickConnectSignIn` intercept

Replace `onCredentialSelected(credentialTypeName, credential.id)` with:
```typescript
if (isEnvMode.value) {
  await onEnvCredentialSelected(credentialTypeName, credential.id);
} else {
  onCredentialSelected(credentialTypeName, credential.id);
}
```

#### Template changes

**At the top of the outer `<div v-if="credentialTypesNodeDescriptionDisplayed.length">`**, add the environment select:

```html
<div v-if="environmentsStore.environments.length > 0 && !standalone" :class="$style.envSelectRow">
  <N8nSelect
    v-model="nodeCredEnvId"
    size="small"
    clearable
    :placeholder="i18n.baseText('nodeCredentials.environmentSelect.placeholder')"
    data-test-id="node-credentials-env-select"
  >
    <N8nOption
      v-for="env in environmentsStore.environments"
      :key="env.id"
      :value="env.id"
      :label="env.name"
    />
  </N8nSelect>
</div>
```

**In the per-credential-type `v-for` block**, replace references to drive the display:

- Replace `getSelectedId(type)` → `getEffectiveSelectedId(type)` on the N8nSelect `:model-value`
- Replace `isCredentialExisting(type)` → `isEffectiveCredentialExisting(type)` in `showQuickConnectEmptyState`, `showStandardEmptyState`, and the `v-else-if` for the credential select block
- Replace `@update:model-value` handler in the normal select to call `onEnvCredentialSelected` in env mode:
  ```html
  @update:model-value="
    (value: string) =>
      isEnvMode
        ? onEnvCredentialSelected(type.name, value)
        : onCredentialSelected(type.name, value, showMixedCredentials(type))
  "
  ```
- The quick connect and standard empty state flows remain unchanged in the template — the interception happens in the action/quickConnect handlers above.

**New style:**
```scss
.envSelectRow {
  margin-bottom: var(--spacing-xs);
}
```

### 3. `packages/frontend/@n8n/i18n/src/locales/en.json`

Under `nodeCredentials`:
```json
"environmentSelect": {
  "placeholder": "Select environment"
},
"environmentBinding": {
  "saveError": "Failed to save environment credential binding"
}
```

---

## Backend Changes

None required. The existing endpoints are sufficient:
- `GET /projects/:projectId/environments/:envId/credential-bindings?workflowId=<id>` — used by `fetchCredentialBindings`
- `PUT /projects/:projectId/environments/:envId/credential-bindings?workflowId=<id>` — used by `saveCredentialBindings` (called inside `setCredentialBinding`)

The fetch-merge-replace pattern in `setCredentialBinding` is safe because the store cache is always populated before the merge step.

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Env selector scope | Local to NDV | Global selector controls canvas execution env; NDV selector controls binding view |
| Credential selection in env mode | Only saves binding, no `node.credentials` change | Bindings are the source of truth for env execution; node creds are the base/dev credential |
| Empty state when no binding | Show regular empty state | Publishing is blocked without bindings, so empty state is accurate — not misleading |
| Backend approach | Fetch-merge-replace via existing PUT | No new endpoint needed; store cache makes this safe |
| Discriminator | `nodeId + credentialType` | Matches current DB entity and enables per-node overrides |

---

## Verification

1. Open a workflow in a project that has environments defined.
2. Open the NDV for a node with credentials. Confirm the environment select appears at the top with all project environments as options.
3. Select an environment — the credential slots should show the empty state (no binding yet).
4. Use "Setup credential" in the empty state. Confirm after credential creation that a binding is saved (check via the project settings `EnvironmentBindings.vue`, or via the API: `GET /projects/:projectId/environments/:envId/credential-bindings?workflowId=<id>`).
5. With a binding set, reopen the NDV — the credential select should show the bound credential.
6. Change the selection in the env credential select — confirm the binding is updated.
7. Clear the select — confirm the binding is removed.
8. Switch environments — confirm a different binding (or empty state) is shown.
9. Set `nodeCredEnvId` to null (clear the env select) — confirm the component reverts to normal `node.credentials` display.
10. Verify a new workflow (unsaved) does not show the env binding UI.
11. Run: `pushd packages/frontend/editor-ui && pnpm typecheck && popd`
12. Run: `pushd packages/frontend/@n8n/i18n && pnpm build && popd`
