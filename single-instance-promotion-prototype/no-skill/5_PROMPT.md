Read these two files:
- `single-instance-promotion-prototype/no-skill/3_PLAN.md` — the implementation plan
- `single-instance-promotion-prototype/ponytail/1_PONYTAIL.md` — a YAGNI review of that plan

Produce a revised plan by mechanically applying every directive in the ponytail review. Follow these three rules:

**Cut:** Remove every item ponytail marks for cutting — sortOrder + color columns, reorder() + EnvironmentColorPicker.vue, the entire webhook URL disambiguation section (WebhookService changes, the frontend env-URL display, the "Inbound Webhook" execution trace), the workflow_publication_outbox modification, WorkflowPublicationApplier changes, the ActiveWorkflowManager composite-key discussion, getPublishedVersionsForWorkflow, the enriched GET /workflows/:id/environments endpoint, the header badge aggregation ("Global + 2/3 envs"), and the variable scoping guard.

**Simplify:** Apply each simplification exactly as specified:
- project_environment schema: id + projectId + label only
- 5 migrations → 1 migration file
- 5 DTO files → 2 (environment.dto.ts, environment-bindings.dto.ts)
- Publishing: synchronous write directly to workflow_environment_publication (no outbox detour)
- Drop @OneToMany eager relations from ProjectEnvironment entity

**Keep:** Everything ponytail says stays — the 4 core tables (simplified schemas), TypeORM entities (minimal), repositories (CRUD + hot-path resolvers), ProjectEnvironmentService with validateEnvironmentBindingsForPublish, environmentId on IWorkflowExecuteAdditionalData, CredentialsHelper changes, getVariables changes, the 8 REST endpoints, ActivateWorkflowDto extension, and all listed frontend components (EnvironmentList, EnvironmentBindings, publish modal slots, manual execution dropdown).

Format rules:
- Same phase structure as the original; trim content within phases, don't restructure
- Remove any phase heading that becomes empty
- Keep the mermaid diagram, Context section, Publication Model table, and Backward Compatibility table (remove rows for cut features)
- Update Open Items: remove items that are now explicitly deferred by the ponytail review
- Trim the Verification Checklist to remove steps that test cut features (e.g. webhook routing steps)
- No "Changes from original" commentary — just the revised plan

Write the output to `single-instance-promotion-prototype/no-skill/3_PLAN_REVISED.md`.