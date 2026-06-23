## Gaps & Issues Found

### 1. Webhook/trigger collision (critical, unaddressed)

The plan says "each slot has its own active trigger" but a webhook node registers a URL path. If a workflow is published globally **and** to dev **and** to prod simultaneously, you'd have 3 competing webhooks trying to register the same path. The plan doesn't explain how URLs are disambiguated (e.g. path suffix per environment, a routing layer, or a constraint that only one publication slot can use webhooks). This is the most architecturally significant gap.

### 2. `environmentId` through the webhook inbound path

For **trigger-based** executions, the plan says `environmentId` is read from the `workflow_environment_publication` row in `WorkflowTriggerActivator`. But for **inbound webhooks**, the dispatch path goes through `WebhookService` → it looks up the webhook by path/method. There's no mechanism shown for how an inbound webhook request gets routed to the correct environment's execution context. This needs an explicit design.

### 3. Step 17 is left explicitly unresolved

The manual checklist in plan 2 ends with:

> "17. Publish to env with missing data table binding (but all credential bindings present) → **decide whether this blocks (warning) or allows publish**"

This is a product decision that needs an answer before implementation — it affects the `validateEnvironmentBindingsForPublish` method signature and the UI blocking logic.

### 4. Trigger deregistration on environment delete

When an environment is deleted, the cascade deletes the `workflow_environment_publication` row — but there's no mention of how the **active running trigger** (polling timer, webhook registration) gets deactivated. The `ActiveWorkflowManager` / `WorkflowTriggerActivator` tracks triggers by workflowId; a per-environment trigger would need a new identifier dimension.

### 5. Promotion UX concept is underspecified

The original prompt talks about "promoting" a version (v7 → dev, v5 → prod). The plan translates this as "publish a specific version to an environment." But there's no design for the workflow-history-picker UX: when publishing to an environment, how does the user select **which** version to publish? Does the modal show a version list, or does it always publish "the current version"?

### 6. Data table module status is unverified

The plan binds against `packages/cli/src/modules/data-table/data-table.entity.ts`. If this module is experimental/unreleased, prioritising environment bindings for it in the MVP might be premature.
