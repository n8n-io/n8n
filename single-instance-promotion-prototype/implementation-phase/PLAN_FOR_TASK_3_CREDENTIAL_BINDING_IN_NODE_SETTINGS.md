# Plan: Inline Environment Credential Binding in NodeCredentials.vue

## Context

Environment credential bindings are currently configured on the Project Settings page via `EnvironmentBindings.vue`. This is the wrong place for workflow authors — they think about credentials in the context of a specific node, not in a global project list. The fix is to surface the environment binding directly inside `NodeCredentials.vue` (the NDV credential selector), where it appears naturally next to the credential it overrides. The row only shows when an environment is selected in the canvas header, keeping the default view uncluttered.

## Visual Design

```
Google Sheets
  [My Dev Google Sheets Account   ▾]  ✏
  🌍 Production   [Select production credential   ▾]
```

- The env row appears **below** each credential select, **only when** an environment is active in `EnvironmentSelector`
- It uses the same `N8nInputLabel` + `N8nSelect` pattern already present in the component
- Selecting a target credential **autosaves** immediately (no Save button) — shows a toast on error only
- Clearing the dropdown removes the binding
- Row is hidden when: no environment selected, no source credential chosen for this type, `readonly`, or `standalone` mode

## Files to Modify

### 1. `packages/frontend/editor-ui/src/features/environments/environments.store.ts`

Add a single-entry upsert action:

```typescript
async function setCredentialBinding(
  projectId: string,
  envId: string,
  sourceCredentialId: string,
  targetCredentialId: string | null,
): Promise<void> {
  const existing = credentialBindings.value[envId] ?? [];
  const filtered = existing.filter((b) => b.sourceCredentialId !== sourceCredentialId);
  const updated = targetCredentialId
    ? [...filtered, { sourceCredentialId, targetCredentialId }]
    : filtered;
  await saveCredentialBindings(projectId, envId, updated);
}
```

Export it from the store's return object.

### 2. `packages/frontend/editor-ui/src/features/credentials/components/NodeCredentials.vue`

**Imports** — add at top of `<script setup>`:
```typescript
import { useEnvironmentsStore } from '@/features/environments/environments.store';
```

**Setup** — add after existing store instantiations:
```typescript
const environmentsStore = useEnvironmentsStore();

const selectedEnvironment = computed(() =>
  environmentsStore.environments.find(
    (e) => e.id === environmentsStore.selectedEnvironmentId,
  ) ?? null,
);

const envProjectId = computed(
  () => props.projectId ?? workflowDocumentStore?.value.homeProject?.id,
);

// Ensure bindings are loaded when the selected environment changes
watch(
  () => environmentsStore.selectedEnvironmentId,
  async (envId) => {
    if (envId && envProjectId.value && !environmentsStore.credentialBindings[envId]) {
      await environmentsStore.fetchCredentialBindings(envProjectId.value, envId);
    }
  },
  { immediate: true },
);

function getEnvBindingTarget(sourceCredentialId: string): string {
  const envId = environmentsStore.selectedEnvironmentId;
  if (!envId) return '';
  const bindings = environmentsStore.credentialBindings[envId] ?? [];
  return bindings.find((b) => b.sourceCredentialId === sourceCredentialId)?.targetCredentialId ?? '';
}

async function onEnvBindingChange(sourceCredentialId: string, targetCredentialId: string) {
  const envId = environmentsStore.selectedEnvironmentId;
  if (!envId || !envProjectId.value) return;
  try {
    await environmentsStore.setCredentialBinding(
      envProjectId.value,
      envId,
      sourceCredentialId,
      targetCredentialId || null,
    );
  } catch (error) {
    toast.showError(error, i18n.baseText('nodeCredentials.environmentBinding.saveError'));
  }
}
```

**Template** — inside the `v-for` loop, after the `</div>` that closes the credential select block (line ~960) and before the private credential notices `<div v-if="getSelectedPrivateCredential...">`, add:

```html
<div
  v-if="
    selectedEnvironment &&
    selected[type.name]?.id &&
    !readonly &&
    !standalone &&
    !isAiGatewayManagedCredentials(type.name)
  "
  :class="$style.envBindingRow"
  data-test-id="credential-env-binding"
>
  <N8nInputLabel
    :label="
      i18n.baseText('nodeCredentials.environmentBinding.label', {
        interpolate: { env: selectedEnvironment.name },
      })
    "
    :bold="false"
    size="small"
    color="text-light"
  >
    <N8nSelect
      :model-value="getEnvBindingTarget(selected[type.name].id)"
      :placeholder="
        i18n.baseText('nodeCredentials.environmentBinding.placeholder', {
          interpolate: { env: selectedEnvironment.name },
        })
      "
      size="small"
      clearable
      @update:model-value="
        (value: string) => onEnvBindingChange(selected[type.name].id!, value)
      "
    >
      <N8nOption
        v-for="target in options.filter((o) => o.id !== selected[type.name]?.id)"
        :key="target.id"
        :value="target.id"
        :label="target.name"
      />
    </N8nSelect>
  </N8nInputLabel>
</div>
```

**Styles** — add to `<style>`:
```scss
.envBindingRow {
  margin-top: var(--spacing-3xs);
  padding-top: var(--spacing-3xs);
  border-top: 1px dashed var(--color-foreground-base);
}
```

### 3. `packages/frontend/@n8n/i18n/src/locales/en.json`

Add under `nodeCredentials`:
```json
"environmentBinding": {
  "label": "For {env}:",
  "placeholder": "Select {env} credential",
  "saveError": "Failed to save environment binding"
}
```

After editing, rebuild i18n to regenerate `BaseTextKey`:
```bash
pushd packages/frontend/@n8n/i18n && pnpm build && popd
```

## What to do with EnvironmentBindings.vue on ProjectSettings

Keep it — it serves a different audience (project admins wanting a bulk overview of all bindings for an environment). The inline NDV row is for workflow authors configuring per-node. The two surfaces are complementary, not redundant.

## Verification

1. Open a workflow in the NDV
2. Select an environment from the canvas header (`EnvironmentSelector`)
3. Open a node that uses credentials — the env binding row should appear below the credential select
4. Pick a target credential → binding autosaves (no visible loading, success is silent)
5. Clear the dropdown → binding removed
6. Switch to a different environment → row updates to show that environment's binding
7. With no environment selected → row is hidden entirely
8. Run typecheck: `pushd packages/frontend/editor-ui && pnpm typecheck && popd`
