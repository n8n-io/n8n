In the following prompt I will include a summary of how workflow activation on startup of n8n works.
I want you to create a plan that incorporates workflow activation for not just the activeVersionId that's set on the WorkflowEntity, but also the published versions found via the WorkflowPublishedEnvironmentVersion rows.

Ask follow-up questions.

# How Published Workflows Get Activated on n8n Restart

## 1. Entry Point — `Start.run()`

`packages/cli/src/commands/start.ts:439`

```ts
await this.activeWorkflowManager.init();
```

Called after the HTTP server is up, only when not using the `WorkflowPublicationService` path.

---

## 2. `ActiveWorkflowManager.init()`

`packages/cli/src/active-workflow-manager.ts:91`

```ts
async init() {
  await this.addActiveWorkflows('init');
  await this.externalHooks.run('activeWorkflows.initialized');
}
```

---

## 3. `addActiveWorkflows('init')` — DB query + batch dispatch

`packages/cli/src/active-workflow-manager.ts:393`

The key DB call is on line 401:

```ts
const dbWorkflowIds = await this.workflowRepository.getAllActiveIds();
```

Which maps to this SQL (via TypeORM):

```sql
SELECT id FROM workflow
WHERE activeVersionId IS NOT NULL
  AND isArchived = false
```

`packages/@n8n/db/src/repositories/workflow.repository.ts:78`

After fetching IDs, they are split into batches (`activationBatchSize` config) and each batch runs `activateWorkflow()` calls in parallel via `Promise.all`.

---

## 4. `activateWorkflow(id)` — load full workflow data

`packages/cli/src/active-workflow-manager.ts:425`

Calls `workflowRepository.findById(id)` which eagerly loads the `activeVersion` relation — the `WorkflowHistory` record pointed to by `activeVersionId`, containing the actual nodes and connections of the published snapshot.

Then delegates to `add()`.

---

## 5. `add()` — instantiate Workflow + register triggers

`packages/cli/src/active-workflow-manager.ts:528`

Constructs a `Workflow` instance from the `activeVersion` data (nodes, connections). Then branches into two registration paths:

- **Webhooks** (`addWebhooks()`) — registers HTTP webhook paths
- **Non-webhook triggers** (`addNonWebhookTriggers()`) — handles schedule/poll/event trigger nodes

---

## 6. `addNonWebhookTriggers()` → `ActiveWorkflowTriggers.addTriggers()`

`packages/cli/src/active-workflow-manager.ts:964` → `packages/core/src/execution-engine/active-workflow-triggers.ts:127`

For each trigger/poll node in the workflow:

- **Active triggers** (e.g. AMQP, WebSocket, filesystem watch): calls `TriggersAndPollers.runTriggerFunction()`, which invokes `nodeType.trigger.call(triggerFunctions)` — this is where the actual persistent listener/connection is opened.
- **Poll triggers** (e.g. RSS, Airtable): calls `activatePollTrigger()`, which reads the `pollTimes` cron expressions and calls `ScheduledTaskManager.registerCron()` to schedule repeated polling.

---

## Full Call Chain

```
Start.run()                                      [start.ts:439]
  └─ ActiveWorkflowManager.init()                [active-workflow-manager.ts:91]
      └─ addActiveWorkflows('init')               [active-workflow-manager.ts:393]
          ├─ workflowRepository.getAllActiveIds()  [workflow.repository.ts:78]
          │    SQL: WHERE activeVersionId IS NOT NULL AND isArchived = false
          │
          └─ for each batch → activateWorkflow()  [active-workflow-manager.ts:425]
              ├─ workflowRepository.findById()    [loads activeVersion relation]
              └─ add()                            [active-workflow-manager.ts:528]
                  ├─ addWebhooks()                [registers HTTP webhook paths]
                  └─ addNonWebhookTriggers()      [active-workflow-manager.ts:964]
                      └─ ActiveWorkflowTriggers.addTriggers()  [active-workflow-triggers.ts:127]
                          ├─ nodeType.trigger.call()           [opens persistent connection]
                          └─ ScheduledTaskManager.registerCron() [poll triggers → cron jobs]
```

The pivot point between "published state" and "execution state" is the `activeVersionId` FK on `WorkflowEntity` — it points to the specific `WorkflowHistory` snapshot whose nodes/connections get loaded and wired up as live listeners.