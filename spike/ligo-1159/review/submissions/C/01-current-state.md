# LIGO-1159 — Current state of cross-project promotion

Date: 2026-11-13. Code: `master` at `ed626a767fa`.

Method: static reading of the code and of the existing tests. I did not run the two-instance harness. Each claim has a file reference. Section 9 lists what I did not verify.

Path prefixes used below:

- `pkg/` = `packages/cli/src/modules/n8n-packages/`
- `promo/` = `packages/cli/src/modules/promotions.ee/`
- `fe/` = `packages/modules/promotions/frontend/src/`

## 1. Summary

- The import engine and the Apply check already agree on one rule: a resource is matched by its id (a variable by its name and scope), and Apply does not create credentials or variables. This is a good base.
- The gaps are at the edges of that rule. When a reference points outside the promoted project, the user gets one of three results: a dead end (a blocker with no action), a silent broken reference, or a refusal of the whole operation.
- The package format encodes the owner only by folder placement. It does not encode sharing. It does not encode the owner when the owner project is not in the export.
- Only instance owners and admins can promote and apply today. They can read every credential. So the "user cannot access the dependency" case does not occur yet.

## 2. Facts about the product model

These facts set the limits of what "cross-project" can mean.

| Resource | Who can use it from project P | Evidence |
|---|---|---|
| Credential | Owned by P, shared with P (`credential:user`), or `isGlobal`. A team-owned credential can be shared with team and personal projects. A personal-owned credential can be shared with a team project (setting `personalSpaceSharing`, on by default). | `packages/cli/src/credentials/credentials.service.ee.ts:44-97`, `credentials.service.ts:653-727`, `packages/@n8n/db/src/services/auth.roles.service.ts:120-145` |
| Sub-workflow, error workflow | A workflow in another project (team or personal) only if the called workflow has `callerPolicy: any`, or `workflowsFromAList` with the caller id. The default is same project only. | `packages/cli/src/executions/pre-execution-checks/subworkflow-policy-checker.ts:70-90`, `packages/cli/src/workflows/workflow-execution.service.ts:651-655` |
| Variable | Own project, then global. Never another project. | `packages/workflow/src/common/resolve-variables.ts:51-66` |
| Data table | Own project only. | `packages/modules/data-table/backend/src/data-table-proxy.service.ts:99-118` |
| Tag | Instance-wide. | `packages/@n8n/db/src/entities/tag-entity.ts:10-29` |
| Workflow sharing | Only with personal projects. | `packages/cli/src/workflows/workflow.service.ee.ts:156-186` |

Consequences:

- A real cross-project reference exists for two resource types only: credentials and workflows (sub-workflow, error workflow).
- Variables have two homes only: the project or the instance. The current behaviour is already consistent (section 5).
- Data tables and folders cannot be referenced across projects. A workflow that moved keeps a broken data table reference on the source too.
- Workflow sharing targets personal projects only, so it is not portable between instances.
- A personal project has a random id. Nothing stable links it to the same person on another instance except the email. `packages/@n8n/db/src/entities/abstract-entity.ts:63-68`

Permissions:

- All `promotions:*` scopes are global scopes. Only the global owner and admin roles hold them. `packages/@n8n/permissions/src/roles/scopes/global-scopes.ee.ts:75-86`
- The project routes (`/promotions/projects/:projectId/...`) use `@GlobalScope` too. `packages/cli/src/public-api/v1/controllers/promotions.public.controller.ts:690-747`
- An owner or admin can read every project credential, including credentials of other users' personal projects. `packages/@n8n/backend-services/src/credentials/credentials-finder.service.ts:98-102`

## 3. Package format: what it carries

- Owner = folder placement. A credential, variable or data table goes into `projects/<slug>-<id>/<collection>/` when its owner project is part of the export. Otherwise it goes into the top-level collection folder. `pkg/io/manifest-entry.ts:70-81`
- The inventory reader derives the owner from the path. A top-level credential has `projectId: null`. `pkg/io/directory/package-directory-inventory-reader.ts:128-137, 219-239`
- `credential.json` holds `id`, `name`, `type`, `data` (expression fields only), `dataIsComplete`. The schema is `.strict()`. It has no owner, no sharing, no `isGlobal`. `packages/@n8n/api-types/src/dto/packages/credential.schema.ts:27-35`
- `variable.json` and `data-table.json` are also `.strict()`. `manifest.json` is not strict.
- `manifest.json` lists `requirements` with `usedBy` consumers. The consumer project of each requirement is derivable from the workflow location. `pkg/spec/requirements.schema.ts`
- The Apply check reads the entity files, not the manifest. The manifest is on its way out as an input: `promo/import-manifest-bridge.ts:17-23` calls itself a temporary bridge.
- Readers ignore unknown file names inside an entity folder. `workflow-metadata.json` is an existing sidecar without a manifest entry. `pkg/io/manifest-entry.ts:87-92`, `package-directory-inventory-reader.ts:313-328`

What the format does not carry:

1. The owner of a credential when the owner project is not in the export.
2. Which projects a credential is shared with.
3. Whether a credential is global.
4. Where a referenced workflow lives when it is not in the package.

## 4. Credentials — scenario results

Setup: project P has workflow W. W uses credential C. The destination does not have C.

| # | Scenario | Promote | Apply on destination | User result |
|---|---|---|---|---|
| C1 | C owned by team project Q, shared with P. **Instance** promote. | File under `projects/Q/credentials/`. Written once. (`export-project.integration.test.ts:505`) | Missing binding with `ownerProject: Q`. UI creates C in Q with the source id. The UI does not share C with P. Next Apply returns `access-required` for P. | Three rounds. Round two is a message with no action: "Ask an admin to share it with this project." The admin leaves the flow, shares by hand, starts Apply again. |
| C2 | Same, **project** promote of P, branch has no copy of C under Q. | File at top-level `credentials/`. (`export-project.integration.test.ts:484`) | Conflict `unknown-owner`. `promo/apply-preview.ts:482-483` | Dead end. Copy: "The credential has no valid owner project. Set its owner project in the source." The source has no direct fix. Two indirect ones exist: a full instance promote, or a promote from Q of a workflow that uses C. Both move the file under Q. |
| C2b | Same as C2, branch already holds C under Q. | The branch copy stays. `promo/working-copy-updater.ts:539-581` | Same as C1. | Same as C1. |
| C3 | C owned by a **personal** project, shared with P. Any promote. | File at top-level `credentials/` (personal projects are never exported). | Conflict `unknown-owner`. | Dead end, for instance promote too. |
| C4 | C is **global** (`isGlobal`), owned by Q. | File under Q. The global flag does not travel. | Created in Q, not global. Every other consumer project gets `access-required`. | One manual fix for each consumer project, or the admin sets the global flag by hand. |
| C5 | C exists on the destination but P cannot use it. | — | `access-required`. `promo/apply-preview.ts:477-481`, `pkg/entities/credential/credential-matcher.ts:127-145` | Message only. The instance dialog switches to "Apply is blocked" and hides Continue. `fe/composables/usePromotionBindings.ts:145-150` |
| C6 | Generic package import (not promotion), `create-stub` + `id-only`, C used in two projects. | — | Each project scope plans a stub with the same id. The second create fails after the first project was written. `pkg/entities/credential/credential-importer.ts:71-76, 249-268`, `pkg/engine/import-orchestrator.ts:388-393` | LIGO-1250. Promotion is not exposed: it uses `must-preexist`. `promo/promotions.service.ts:136-137` |

Notes:

- The UI creates a missing credential through the public `POST /credentials` with `id: sourceId` in `ownerProject`. It creates a missing owner project first. `fe/composables/usePromotionBindingCreation.ts:70-96, 148-168`
- The UI rejects a creation that lands in another project than `ownerProject`. `fe/composables/usePromotionBindings.ts:62-72`
- The public API has no endpoint that shares a credential with a project. It has `PATCH` (with `isGlobal`) and `PUT /:id/transfer`. `packages/cli/src/public-api/v1/controllers/credentials.public.controller.ts`. So an API or CLI user cannot resolve `access-required` through the public API.
- The credential matcher resolves a credential for a project scope only when the acting user can read it. It adds the reason (`access-required`, `not-on-instance`) only for users with global `credential:read`. `credential-matcher.ts:127-145`
- Apply updates the name and expression fields of a matched credential only when a project of the import owns it. A credential owned elsewhere is only bound. `pkg/entities/credential/credential-conflict-policy.ts:25-54`. This rule is correct and the solution keeps it.

## 5. Variables — already consistent

- Export resolves `$vars.x` like the runtime does: project variable first, then global. A project variable goes under the project folder, a global one at top level. `pkg/entities/variable/variable.exporter.ts:121-157`
- Apply requires the variable in the scope that the branch declares. A project variable does not fall back to a global one. `promo/apply-preview.ts:520-587`
- A missing variable becomes a missing binding with its scope. The UI creates it in that scope. A global one needs the global variable scope.
- A global variable hidden by a project variable on the destination is a warning (`variable-shadowed`), not a blocker.
- A reference without a file in the package is `missing-definition`.

No change is needed for the model. Variables are the reference example: "the package says where the thing must exist, the destination must have it there, the binding step can create it".

## 6. Workflow references — scenario results

Setup: W in project P calls S (Execute Workflow node or `settings.errorWorkflow`).

| # | Scenario | Promote | Apply | User result |
|---|---|---|---|---|
| W1 | S in team project Q. **Instance** promote and instance Apply. | Both are in the package. | Both are written. References resolve across projects. (`import-projects.integration.test.ts:2133`) | Works. |
| W2 | S not selected (same project or project Q). **Project** promote of W. | Export uses `reference-only`. S is not written. `promo/promotions.service.ts:503-505` | No check exists for a missing workflow dependency. No `BlockingIssue` type covers it. `pkg/n8n-packages.types.ts:667-729` | W arrives with a broken reference. Nobody is told, on either side. The preview shows S in a "Sub-workflows" group with "No changes". `promo/promotion-preview.ts:321-384` |
| W3 | S on the branch, but not selected in a **project Apply**. | — | The selection is not expanded. `pkg/engine/project-package-importer.ts:355-360` | Same silent result if the destination does not have S yet. |
| W4 | S in a **personal** project, or deleted. **Instance** promote. | The whole promote fails. `promo/instance-package.ts:42-44`, `pkg/entities/workflow/static-sub-workflow-requirements.ts:6-32` | — | Toast with a count and raw ids. One workflow blocks the instance. LIGO-1089, LIGO-1405. |
| W5 | Same as W4, **project** promote. | Succeeds silently (`reference-only`). | No check. | Silent broken reference on the destination. It can never resolve: a personal workflow never reaches the destination with the same id. |

The two promote paths treat the same reference in opposite ways: instance promote refuses everything, project promote says nothing.

## 7. Moves between projects

- **Instance promote** refuses when the branch holds a workflow or folder under project A and this instance holds it under team project B, if A still exists here. Message: move it back. It also refuses when a branch workflow is now in a personal project, because Apply would delete it. `promo/promotions.service.ts:1332-1384`
- **Project promote** refuses a selected workflow that moved in or out. Error code `promotions-workflows-moved-cross-project`. `promo/promotions.service.ts:469-476`, `promo/working-copy-updater.ts:311-354`
- The **promote preview** shows a move as two rows: "deleted" in A with `movedToProject`, and "added" in B with `movedFromProject`. Both are disabled. `promo/promotion-change.service.ts:154-193`. LIGO-1258 asks for one row.
- **Apply** (instance and project) reports each placement difference as a `moved` conflict and writes nothing. One moved folder disables Apply for the whole project selection. `promo/cross-project-moves.ts`, `promo/promotions.service.ts:1727-1748`, `fe/views/PromotionPreviewView.vue:205-213`
- The engine matches an existing workflow only inside the project it imports. A workflow in another project looks new and then fails with `workflow-id-conflict`. `pkg/entities/workflow/workflow-import-match.service.ts:59-77`
- A move is safe today in one sense: nothing is deleted or duplicated. But the user must repeat the move by hand on every destination, or undo it on the source.
- The editor transfer keeps the id, history and executions. It removes all sharings, deactivates and reactivates, and can share the listed credentials with the new project. `packages/cli/src/workflows/workflow.service.ee.ts:804-897, 1079-1156, 1222-1292`. LIGO-1363 planned to reuse it; only the in-project part shipped.

## 8. Scopes of operation

| Operation | Scope | Export or import policy | Notes |
|---|---|---|---|
| Instance promote | All team projects | `dependencyPolicy: fail` | Replaces the whole package on the branch. `promo/promotions.service.ts:262-287` |
| Project promote | Selected workflows and folders of one project | `reference-only` | Overlays the branch. A branch can now hold a partial view of the instance (LIGO-1268). |
| Instance Apply | Whole package | Package is authoritative: `overwrite` + hard delete; deletes team projects that the package lacks after a confirmation. `promo/promotions.service.ts:129-148, 1159-1177` | |
| Project Apply | Selected workflows and folders of one project | Additive, with explicit deletes | Never reconciles projects. |

Environments:

- An environment has scope `instance` or `projects`. A project uses its linked environment if it has one, otherwise the instance environment. `promo/promotion-environment.resolver.ts:46-65`
- A `projects` environment can be created through the API, not through the UI. On it, the preview and the project Apply run. Promote and full Apply are refused by `assertInstanceScope`. `promo/promotions.service.ts:1438-1449`
- The package of a project environment will hold one project. Every other project is then always outside the package. Any solution must treat "the owner is not in the package" as a normal state.

## 9. Not verified

- No run on two real instances. The scenario tables come from code and tests.
- C6: I did not check whether the first project's writes roll back. LIGO-1250 says they do not.
- A data table referenced from two projects of one package would be planned as a create in both scopes with the same id. This is an inference from `pkg/entities/data-table/data-table-importer.ts:167-173, 340-349`. It needs a broken reference at the source to occur (for example after a move), so it is a small risk.
- I did not check whether the tar reader (the `.n8np` path) tolerates an unknown file inside an entity folder. The directory inventory reader does.
- The exact publish behaviour of an applied workflow with a broken sub-workflow reference.
