Here's a summary of every cut and simplification applied:

Cut:

- color + sortOrder columns from project_environment schema
- reorder() from the repository and drag-to-reorder from EnvironmentList.vue
- EnvironmentColorPicker.vue
- Entire webhook URL disambiguation section (WebhookService routing, env-prefixed URLs, "Inbound Webhook" execution trace)
- workflow_publication_outbox modification
- WorkflowPublicationApplier changes
- ActiveWorkflowManager composite-key discussion
- getPublishedVersionsForWorkflow from the publication repository
- Enriched GET /workflows/:id/environments status endpoint
- Header badge aggregation ("Global + 2/3 envs current") and the WorkflowHeaderDraftPublishActions.vue modification
- Variable scoping guard from ProjectEnvironmentService and schema docs
- Open Items 1 (ActiveWorkflowManager identity) and 2 (outbox concurrency)
- Verification steps 5–7 (webhook path checks) replaced with trigger-registration and manual-execution checks

Simplified:

- project_environment: 3 columns only (id, projectId, label)
- 5 migration files → 1 (CreateEnvironmentTables.ts)
- 5 DTO files → 2 (environment.dto.ts, environment-bindings.dto.ts)
- Publishing: synchronous direct write to workflow_environment_publication with best-effort ActiveWorkflowManager.add
- ProjectEnvironment entity: no @OneToMany eager relations