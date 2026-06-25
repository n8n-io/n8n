# Plan: Activate Environment-Published Workflow Webhooks on Startup

## Context

On n8n startup, `ActiveWorkflowManager.addActiveWorkflows()` only activates workflows whose `WorkflowEntity.activeVersionId IS NOT NULL`. Workflows published to specific environments via `WorkflowPublishedEnvironmentVersion` are completely ignored — their webhooks are never registered.

`WorkflowPublishedEnvironmentVersion` stores `{ workflowId, environmentId, publishedVersionId }` where `publishedVersionId` is a FK to `WorkflowHistory.versionId`. The history snapshot for a given environment already embeds the environment-specific credentials in its node data, so loading the correct `publishedVersionId` snapshot inherently applies the right credential bindings.

**User decisions:**
- Environment-published versions → **webhooks only** (no poll/trigger listeners)
- If a workflow has env-published versions, the env version overrides global for webhooks; global `activeVersionId` still handles triggers/polls
- Webhook paths are namespaced by environment: `/webhook/{env-slug}/…` where the slug is the environment name lowercased with spaces replaced by `-`
- Credential bindings are satisfied by loading the correct `WorkflowHistory` snapshot

---

## Implementation Plan

### 1. `WorkflowPublishedEnvironmentVersionRepository`
**File:** `packages/@n8n/db/src/repositories/workflow-published-environment-version.repository.ts`

Add two methods:

```typescript
// Returns distinct workflow IDs that have at least one env-published version
async getAllDistinctWorkflowIds(): Promise<string[]> {
  const records = await this.find({ select: ['workflowId'] });
  return [...new Set(records.map((r) => r.workflowId))];
}

// Returns env-published versions for a workflow, including the environment name
async getPublishedVersionsWithEnvironments(
  workflowId: string,
): Promise<Array<{ environmentId: string; environmentName: string; publishedVersionId: string }>> {
  const records = await this.find({
    where: { workflowId },
    relations: ['environment'],   // eager-loads ProjectEnvironment for .name
    select: ['environmentId', 'publishedVersionId'],
  });
  return records.map((r) => ({
    environmentId: r.environmentId,
    environmentName: r.environment.name,
    publishedVersionId: r.publishedVersionId,
  }));
}
```

Note: `WorkflowPublishedEnvironmentVersion` already declares `@ManyToOne('ProjectEnvironment') environment` and `ProjectEnvironment` has a `name: string` column, so the relation load is straightforward.

---

### 2. `addWebhooks()` — add `pathPrefix` option
**File:** `packages/cli/src/active-workflow-manager.ts:138`

Extend the signature with an optional `pathPrefix` parameter:

```typescript
async addWebhooks(
  workflow: Workflow,
  additionalData: IWorkflowExecuteAdditionalData,
  mode: WorkflowExecuteMode,
  activation: WorkflowActivateMode,
  nodeIds?: Set<string>,
  pathPrefix?: string,   // NEW — e.g. "production" or "staging-env"
)
```

Inside the loop, after the existing path normalization (after slashes are stripped), insert:

```typescript
if (pathPrefix) {
  webhook.webhookPath = `${pathPrefix}/${webhook.webhookPath}`;
}
```

This means the stored and matched path becomes e.g. `production/my-webhook` instead of `my-webhook`. All existing callers pass no `pathPrefix`, so behaviour is unchanged.

---

### 3. `add()` — add `skipWebhooks` option
**File:** `packages/cli/src/active-workflow-manager.ts:528`

Extend the options parameter:

```typescript
async add(
  workflowId: WorkflowId,
  activationMode: WorkflowActivateMode,
  existingWorkflow?: WorkflowEntity,
  { shouldPublish, skipWebhooks } = { shouldPublish: true, skipWebhooks: false },
)
```

Change the `shouldAddWebhooks` line:

```typescript
// before
const shouldAddWebhooks = this.shouldAddWebhooks(activationMode);

// after
const shouldAddWebhooks = !skipWebhooks && this.shouldAddWebhooks(activationMode);
```

This lets `activateWorkflow()` suppress global webhook registration when env-specific webhooks will be registered separately.

---

### 4. `ActiveWorkflowManager` — inject new dependencies
**File:** `packages/cli/src/active-workflow-manager.ts`

Add to constructor injections:
- `WorkflowPublishedEnvironmentVersionRepository`
- `WorkflowHistoryRepository` (to load a `WorkflowHistory` snapshot by `versionId`)

---

### 5. New `addWebhooksForEnvironmentVersions()` method
**File:** `packages/cli/src/active-workflow-manager.ts`

```typescript
private async addWebhooksForEnvironmentVersions(
  dbWorkflow: WorkflowEntity,
  envVersions: Array<{ environmentId: string; environmentName: string; publishedVersionId: string }>,
  activationMode: WorkflowActivateMode,
): Promise<void> {
  for (const { environmentId, environmentName, publishedVersionId } of envVersions) {
    const historyRecord = await this.workflowHistoryRepository.findOne({
      where: { versionId: publishedVersionId },
    });

    if (!historyRecord) {
      this.logger.warn(
        `Skipping env webhook activation: history record not found for version "${publishedVersionId}"`,
        { workflowId: dbWorkflow.id, environmentId },
      );
      continue;
    }

    const { nodes, connections } = historyRecord;
    const workflow = new Workflow({
      id: dbWorkflow.id,
      name: dbWorkflow.name,
      nodes,
      connections,
      active: true,
      nodeTypes: this.nodeTypes,
      staticData: dbWorkflow.staticData,
      settings: dbWorkflow.settings,
    });

    const additionalData = await WorkflowExecuteAdditionalData.getBase({
      workflowId: workflow.id,
      workflowSettings: dbWorkflow.settings,
    });

    // Slug: lowercase, spaces → hyphens  (e.g. "My Env" → "my-env")
    const envSlug = environmentName.toLowerCase().replace(/\s+/g, '-');

    await this.addWebhooks(workflow, additionalData, 'trigger', activationMode, undefined, envSlug);

    this.logger.info(
      `Activated webhooks for workflow "${dbWorkflow.name}" in environment "${environmentName}"`,
      { workflowId: dbWorkflow.id, environmentId, pathPrefix: envSlug },
    );
  }
}
```

---

### 6. `activateWorkflow()` — drive env-specific webhook activation
**File:** `packages/cli/src/active-workflow-manager.ts:425`

```typescript
private async activateWorkflow(
  workflowId: WorkflowId,
  activationMode: 'init' | 'leadershipChange',
) {
  const dbWorkflow = await this.workflowRepository.findById(workflowId);
  if (!dbWorkflow) return;

  const envVersions =
    await this.workflowPublishedEnvVersionRepository.getPublishedVersionsWithEnvironments(workflowId);
  const hasEnvVersions = envVersions.length > 0;

  try {
    // Global activation: triggers/polls from activeVersionId.
    // Skip global webhooks if env-specific versions exist (env overrides).
    const added = await this.add(dbWorkflow.id, activationMode, dbWorkflow, {
      shouldPublish: false,
      skipWebhooks: hasEnvVersions,
    });

    if (hasEnvVersions) {
      await this.addWebhooksForEnvironmentVersions(dbWorkflow, envVersions, activationMode);
    }

    if (added.webhooks || added.triggersAndPollers || hasEnvVersions) {
      this.logger.info(`Activated workflow ${formatWorkflow(dbWorkflow)}`, {
        workflowName: dbWorkflow.name,
        workflowId: dbWorkflow.id,
      });
      // ... existing audit event (keep as-is)
    }
  } catch (error) {
    // ... existing error handling unchanged
  }
}
```

---

### 7. `addActiveWorkflows()` — include env-published workflows
**File:** `packages/cli/src/active-workflow-manager.ts:393`

```typescript
async addActiveWorkflows(activationMode: 'init' | 'leadershipChange') {
  // ... existing isActivationInProgress guard ...

  const globalIds = await this.workflowRepository.getAllActiveIds();
  const envPublishedIds =
    await this.workflowPublishedEnvVersionRepository.getAllDistinctWorkflowIds();

  // Deduplicate: a workflow can appear in both lists
  const allIds = [...new Set([...globalIds, ...envPublishedIds])];

  if (allIds.length === 0) return;

  // ... same batch/chunk logic, iterating allIds instead of dbWorkflowIds
}
```

---

## Files to Modify

| File | Change |
|---|---|
| `packages/@n8n/db/src/repositories/workflow-published-environment-version.repository.ts` | Add `getAllDistinctWorkflowIds()` and `getPublishedVersionsWithEnvironments()` |
| `packages/cli/src/active-workflow-manager.ts` | Inject two repos; extend `addWebhooks()` with `pathPrefix`; extend `add()` options with `skipWebhooks`; add `addWebhooksForEnvironmentVersions()`; update `activateWorkflow()` and `addActiveWorkflows()` |

---

## Deferred / Out of Scope

- **Incoming webhook routing**: The HTTP handler that dispatches webhook calls must also be updated to strip the `/{env-slug}/` prefix and resolve the correct environment/version. That is a separate change.
- **Multi-main**: `addWebhooksForEnvironmentVersions()` calls `addWebhooks()` directly, bypassing the leader-only PubSub command in `add()`. Multi-main compatibility for env webhooks is a follow-up.
- **Deactivation cleanup**: `clearWebhooks(workflow.id)` removes all webhooks for a workflow regardless of path prefix. Env-specific webhook cleanup on unpublish needs a scoped variant.

---

## Verification

1. Publish a workflow to a specific environment (e.g. "Production") without a global `activeVersionId`.
2. Restart n8n.
3. Query the `webhook` table: confirm rows exist with `webhookPath` prefixed by `production/...`.
4. Fire `POST /webhook/production/{path}` — confirm the workflow executes against the env-specific history snapshot.
5. Confirm workflows with only `activeVersionId` (no env versions) activate unchanged (no prefix).
6. Confirm workflows with BOTH `activeVersionId` and env-published versions: triggers fire from global version; webhook rows carry the env prefix.
