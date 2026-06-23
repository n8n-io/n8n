Ultra cut list — everything below is YAGNI for a prototype.

---
Cut entirely

sortOrder column + reorder() + drag-to-reorder UI
You're testing whether credential binding works, not whether users want to reorder environments. Add when you have user research saying order matters.

color column + EnvironmentColorPicker.vue
Labels are enough to distinguish dev from prod. Color is polish, not data-model validation.

Webhook URL disambiguation (the entire /webhook/{envId}/path routing layer)
Manual execution proves credential/variable swapping. Webhook routing touches a completely separate layer (path parsing, registration key changes, WebhookService routing logic) — that's a second feature, not part of "validate UX and data model." Cut it. Add it when the core is validated and you're ready to ship.

workflow_publication_outbox modification
For a prototype, write to workflow_environment_publication directly (sync). The outbox is a production reliability mechanism. Wiring it up adds a parallel async code path for no prototype benefit.

WorkflowPublicationApplier changes
Consequence of skipping the outbox. Skip entirely.

ActiveWorkflowManager identity model ((workflowId, environmentId) composite key)
Already called out as an open item. Multi-env trigger activation is a production concern. The prototype validates the data model with manual execution. Keep this deferred.

Enriched GET /workflows/:id/environments status endpoint
credentialBindingStatus, variableOverrideCount, globalPublication enrichment — the frontend can compute all of this from the raw binding list it already fetches. Return the raw data, let the store/computed derive status. Skip the endpoint.

5 separate DTO files
create-environment.dto.ts, update-environment.dto.ts, upsert-credential-bindings.dto.ts, upsert-variable-overrides.dto.ts, project-environment.schema.ts — collapse into one file per domain (environment.dto.ts, environment-bindings.dto.ts). You have four tables, not five separate namespace concerns.

5 separate migration files → 1 migration
One file, one transaction, five CREATE TABLE / ALTER TABLE statements. Migration granularity matters for rollback in production, not for a prototype where you'll likely blow the schema away and recreate it anyway.

@OneToMany eager relations on ProjectEnvironment entity
You don't need the ORM to join these. Each repository does its own targeted query. Skip the relation decorators; load via repo methods.

getPublishedVersionsForWorkflow in the publication repo
"For history panel display" — that panel doesn't exist yet. YAGNI.

Header badge aggregation ("Global + 2/3 envs current")
Polish. The publish modal already shows per-env state. The header badge is a summary of a summary. Cut.

Variable scoping rule enforcement (variable.project?.id === environment.project.id guard)
Correct for production. For the prototype, you're manually creating test data — you'll know which vars are project-scoped. Add the guard when you're hardening, not when you're validating.

---
Simplify

project_environment schema: drop color and sortOrder. Three columns: id, projectId, label. That's the data model you're validating.

Repository surface: each repo needs exactly the methods that have a caller in the prototype. reorder(), removePublishedVersion(), and resolveOverridesForExecution() returning a full map (not needed until execution) all survive the cut only if you're testing execution in the prototype. If you are, keep resolveOverridesForExecution. If you're only testing CRUD and binding config, cut it too.

Publishing to an environment: make it synchronous. POST /workflows/:id/activate with { environmentId } writes directly to workflow_environment_publication and attempts trigger activation as a best-effort (existing ActiveWorkflowManager.add with a note that multi-env isolation is Phase 2). No outbox detour.

---
What stays

The 4 core tables (simplified schema), TypeORM entities (minimal), repositories (CRUD + hot-path resolvers), ProjectEnvironmentService with validateEnvironmentBindingsForPublish, environmentId on IWorkflowExecuteAdditionalData, the two execution-path modifications (CredentialsHelper, getVariables), the 8 REST endpoints, ActivateWorkflowDto extension, and the frontend: env settings tab, EnvironmentList, EnvironmentBindings, publish modal env slots, manual execution env dropdown.

---
What this prototype can now answer

- Does the data model hold bindings/overrides cleanly? ✓ (tables + CRUD)
- Does the UX for configuring environments and publishing make sense? ✓ (settings tab + publish modal)
- Does execution actually swap credentials and variables? ✓ (manual execution dropdown + CredentialsHelper + getVariables)

Webhook routing, async outbox, trigger identity model, drag-reorder, color theming — none of those questions can be answered by this prototype. Don't build them until the three above have a "yes."