# Technical Challenges: Environment-Scoped Publishing with Dedicated Credential Bindings

This document summarises the non-obvious technical challenges that arise when implementing per-environment credential bindings in a single-instance promotion model.

---

## 1. Binding discriminator: what uniquely identifies a credential slot?

The binding row maps "which credential is used in environment X" for a specific slot in a workflow. Two discriminator designs were considered and evolved through the prototype:

| Discriminator | Key | Trade-off |
|---|---|---|
| `sourceCredentialId` | `(workflowId, environmentId, sourceCredentialId)` | One row covers all nodes that share the same credential, but blocks independent remapping when two nodes share the same dev credential yet need different prod credentials |
| `(nodeId, credentialType)` | `(workflowId, environmentId, nodeId, credentialType)` | Resolves to the exact credential slot, allows full per-node control, but requires one binding row per node (not per credential) |

**Resolution (current prototype direction):** Switch to `(nodeId, credentialType)` as the discriminator. This resolves at execution time via `executeData.node.id` + the `type` param already in scope in `CredentialsHelper.getDecrypted`, with no interface changes required.

**Remaining UX consideration:** With `nodeId` as the key, the binding UI must present bindings per node, not per unique credential. This is more precise but requires the UI to surface node names alongside credential types.

---

## 2. Binding scope: project-level vs. workflow-level

The initial schema scoped bindings to `(environmentId, sourceCredentialId)` — a project-wide mapping. This was wrong: two workflows in the same project may reference the same credential ID but need different environment substitutions.

**Resolution:** Add `workflowId` to the unique key. Bindings become `(workflowId, environmentId, nodeId, credentialType) → targetCredentialId`. The execution-time lookup, the API endpoints, the store state shape, and publish-time validation all take `workflowId` as an explicit parameter.

**Impact:** The frontend store must key binding state as `Record<workflowId, Record<envId, Binding[]>>`, not a flat `Record<envId, Binding[]>`.

---

## 3. Execution-time resolution and silent fallback risk

`CredentialsHelper.getDecrypted` is the single injection point for environment substitution. After loading the credential entity it checks `additionalData.environmentId` and queries the binding repository for a `targetCredentialId`.

**Risk:** If a target credential is deleted (cascading the binding row), `resolveTargetCredentialId` returns `null`. A guard-less implementation silently falls back to the original credential, meaning a prod environment could start running with dev credentials without any visible error.

**Requirement:** The resolution block must hard-fail with an execution error — not silently fall back — when a binding existed but its target is gone. This keeps the execution failure visible in the execution log rather than causing subtle credential misuse.

---

## 4. Publish-time validation is a TOCTOU race

`validateEnvironmentBindingsForPublish` reads bindings, verifies all credential slots are bound, then writes the published version row. A concurrent binding deletion between the read and the write can produce a published version with missing bindings.

This is acceptable in a prototype but must be explicitly documented as a known race. For production, the check and write should be in a DB transaction that locks the relevant binding rows.

---

## 5. Webhook routing: environment prefix vs. user-defined paths

Environment-scoped webhooks register under `/{env-slug}/{path}`. The routing layer must detect whether the first path segment is an environment slug before falling through to the standard global handler.

**Collision risk:** A user-defined webhook path that begins with a UUID-shaped segment could be misidentified as an environment prefix if that UUID happens to match an environment ID. The lookup strategy (slug vs. ID, exact vs. prefix match) must be explicit.

**Hot-path cost:** Every inbound webhook request incurs a lookup to resolve whether the first segment is an environment. Without a warm in-process cache this adds a DB round-trip to every webhook — including those that are not environment-scoped.

---

## 6. Multiple active environments and the ActiveWorkflowManager identity model

`ActiveWorkflowManager` currently keys active workflows by `workflowId`. Publishing a workflow to a second environment would overwrite the first environment's registration under the same key.

**Requirement:** The activation key must encode the environment: `{workflowId}:{environmentId}`. Trigger registration, deregistration, and status lookups all need to be env-aware. Without this, the core promise of the feature — one workflow independently active in multiple environments — cannot be fulfilled.

**Scope note:** Schedule and cron triggers are not disambiguated by URL prefix. If a workflow is active in both Dev and Prod, the trigger fires once per active registration. Users would observe duplicate executions. A deduplication strategy (or an explicit constraint that only one environment may have a trigger-bearing workflow active at a time) is needed.

---

## 7. History retention conflicts with the RESTRICT FK

`workflow_published_environment_version.publishedVersionId` has a `RESTRICT` FK to `workflow_history.versionId`. If history retention tries to prune an old version that is still referenced by an environment publication, the delete fails silently (or loudly, depending on the retention implementation).

**Required decision:** Either the retention job must check for environment publications before pruning (skipping pinned versions), or the environment publication must be automatically unpublished before the version can be deleted.

---

## 8. No unpublish operation

The prototype has no API endpoint to remove a workflow from a specific environment without deleting the entire environment. Deleting the environment also removes all its credential bindings for all workflows.

**Required operation:** A targeted unpublish endpoint (`DELETE /environments/:envId/workflows/:workflowId/publication` or equivalent) that deactivates the workflow in that environment without touching the environment's configuration for other workflows.

---

## 9. Binding initialisation on environment setup

When environments are first enabled for a project, the system auto-creates pass-through bindings (source = target) for all existing workflow nodes. This ensures existing workflows continue executing identically. The initialisation must:

- Run in a transaction (all-or-nothing)
- Guard against double-initialisation (`ConflictError` if environments already exist)
- Handle projects with no workflows (environments still get created; no bindings needed)

With the `(nodeId, credentialType)` discriminator, the initialisation logic iterates `Object.entries(node.credentials ?? {})` per node rather than collecting unique credential IDs — one binding per slot, not per unique credential.

---

## 10. UX placement of binding configuration

Two surfaces emerged for configuring bindings:

- **Project Settings → Environments**: bulk overview per environment, suited for project admins
- **NDV (NodeCredentials.vue)**: inline per-node binding, where workflow authors already think about credentials

The NDV surface has a key design constraint: selecting a credential in environment mode must save **only** a credential binding, not update `node.credentials`. The normal credential-selection path (which writes to the workflow definition) must be bypassed when an environment lens is active.

The NDV environment selector should be **local to the panel** (does not write back to the canvas-level `EnvironmentSelector`), initialising from the canvas selection but operating independently.

---

## 11. Access control and license gating

The feature is gated by a license check in the management API. However, once environments are created, env-scoped webhook registrations and credential substitutions remain active regardless of subsequent license changes.

**Required decision:** Should a license lapse deactivate all environment-scoped trigger registrations, or should existing registrations keep running? The execution path (not just the management API) needs a license check if the former is desired.
