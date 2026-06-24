Here's the summary of what I found — organized by how blocking each gap is:

Critical (would cause the implementation to be wrong without addressing these first):

Webhook disambiguation — the plan has a fundamental gap here. You confirmed env-scoped URL prefixes (/webhook/{env-id}/path), but this requires extending WebhookService registration, the inbound dispatch path, and the frontend URL display — none of which are in the current plan.

Trigger deregistration on env delete — cascade-deleting the DB row doesn't stop the running webhook/polling trigger. The active trigger manager needs an explicit deactivation call from the environment DELETE handler.

environmentId through the inbound webhook path — the plan traces the trigger-fired path, but not the inbound webhook path. When a webhook POST comes in with an env prefix in the URL, something has to parse that and inject environmentId into additionalData. That code path isn't designed.

Important (affects correctness but less blocking):

Variables are instance-wide — the plan validates "variable must belong to the project" but the current Variables entity has no projectId. The override pattern still works, but the scoping logic needs adjusting.

Promotion UX — the plan never shows a version-picker. Does "publish to environment" always publish the latest version, or can you select any version from history? The original prompt implies the latter (v5 → prod, v7 → dev).

Enterprise license gate is absent — no @Licensed decorator on the controller, no UI gating. This needs to be wired in.

Design gaps for during implementation: ActiveWorkflowManager identity model for multi-env triggers, the header badge state for mixed global+env publications, outbox concurrency handling.

The most important thing to nail before coding is the webhook architecture — the env-prefix approach ripples through registration, dispatch, the trigger activator, and the frontend URL display. That design should be explicit before phase 1 starts.
