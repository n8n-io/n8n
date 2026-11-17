# LIGO-1159 — Current state (evidence)

Master at `ed626a767fa` (2026-11-13). I got this by reading the code and did not run it.
Paths are relative to `packages/cli/src/modules/` unless they say otherwise.

## 1. Which relationships are really cross-project

At runtime, a workflow can reach outside its project in only a few ways. This
narrows the problem.

| Resource | Can a workflow in project A use one that lives elsewhere? | Evidence |
|---|---|---|
| Credential | **Yes.** A can use a credential that is owned by A, shared with A, or global. The owner is often another team project or a personal project. | `credentials/credentials.service.ts:664-685` |
| Sub-workflow / error workflow | **Yes, if the callee allows it.** The default caller policy is `workflowsFromSameOwner` (same project only). A call into another project needs `any` or `workflowsFromAList`. | `@n8n/config/src/configs/workflows.config.ts:21`, `cli/src/executions/pre-execution-checks/subworkflow-policy-checker.ts:87,108` |
| Variable | **No.** `$vars` reads A's own project variables, then global ones. A variable of project B can't be read. | `workflow/src/common/resolve-variables.ts:51-66` |
| Data table | **No.** The node resolves tables in the workflow's home project. | `modules/data-table/backend/src/data-table-proxy.service.ts:84-109` |
| Tag | Tags are global. They are instance-level, not cross-project. | — |
| Workflow sharing (`workflow:editor`) | It controls access only. It has no runtime effect, because the caller policy checks the **owner** project. | `subworkflow-policy-checker.ts:87` |

Only these relationships are really cross-project:
- **credential use**
- **workflow references** (sub-workflow, error workflow)
- **moves** between projects
- **sharing**

Global variables, global credentials and tags are *instance-level*
dependencies. They sit outside any project promote, but they are not
cross-project.

## 2. Package format

- **Ownership is set only by folder placement.** A credential, data table or variable file goes under
  `projects/<owner>/…` only if the owner project is part of the export.
  Otherwise it goes at the top level (`n8n-packages/io/manifest-entry.ts:74-81`,
  `entities/credential/credential.exporter.ts:92-96,141-144`).
- **"Top level" means two different things.** For variables it means
  *global*. For credentials and data tables it means *owner unknown or not exported*.
- **No ownership or sharing in the files.**
  - `project.json` has no type and no members.
  - Credential files drop `shared`, `isGlobal` and `usageScope`
    (`entities/credential/credential.serializer.ts:19-25`).
  - Workflow files drop `shared`.
- **Requirements carry identity and usage only.**
  - Credentials: `{id,name,type,usedBy}`.
  - Workflows: `{id,name?,usedBy}`.
  - There is no owner field (`n8n-packages/spec/requirements.schema.ts`).
- **The branch is one cumulative package.** A project or selective push
  overlays its export onto the branch. When the branch holds a credential
  under another project, that copy wins over the staging top-level copy
  (`promotions.ee/working-copy-updater.ts:540-580,668-681`). So "owner not in the package"
  happens only when the owner was never promoted, or is personal.

## 3. Promote (source side)

The promote variants differ in two places:
- **Instance promote** exports all team projects with dependency policy `Fail` (`promotions.ee/instance-package.ts:41-44`).
- **Project and selective promote** are one code path. They use `ReferenceOnly` (`promotions.ee/promotions.service.ts:503-505`).

The project preview also uses `ReferenceOnly` (`instance-package.ts:57-67`), and there is no instance-wide preview.

| Reference outside scope | Instance promote | Project / selective promote | Preview |
|---|---|---|---|
| Credential owned by another team project | File under owner folder | File at top level; the branch copy under the owner wins | Row, `included:true` |
| Credential owned by a personal project | File at top level | File at top level | Row |
| Credential the user can't read | Requirement only, no file | Same | Row |
| Sub-workflow in another team project | Included (all team projects exported) | Requirement only | Unselectable row, `included:false` |
| Sub-workflow in a personal project, or deleted | **Push fails** with "N workflow dependency/dependencies not included in the package. Export aborted." The public API keeps only `message`, so the ids are lost (`rest-error-response.ts:66-70`). | Requirement only | Same row as above. **No warning**, so the preview hides the instance-promote failure |
| Error workflow | Same as sub-workflow | Same | Same |
| Workflow moved team → team | Push fails (`cross-project-moves.ts:107-109`) | Push fails: `promotions-workflows-moved-cross-project` | `movedTo/movedFrom` markers |
| Workflow moved team → personal | Push fails ("would be deleted") (`promotions.service.ts:1664-1669`) | Push fails | Marker, personal project shown by id |
| Workflow shared with another project | Exported under the owner only. Sharing is lost | Selecting it from the non-owner project fails | Not listed |
| Agents, skills | Not exported | Not exported | — |

## 4. Apply (destination side)

| Variant | Policy | Projects planned |
|---|---|---|
| Instance Apply (`promotions.service.ts:991`) | `IMPORT_POLICY`: credentials and variables `must-preexist`, folder `overwrite`, hard delete | Every package project, each planned **separately** (`n8n-packages/engine/project-package-importer.ts:115-127`) |
| Selective / project Apply (`promotions.service.ts:897`) | `CHERRY_PICK_IMPORT_POLICY`: merge, explicit deletes | Only the selected project |

Credential matching uses the id. A credential matches only when it is usable
in the **consuming** project: owned by it, shared with it, or global
(`n8n-packages/entities/credential/credential-matcher.ts:98-144`).

| Reference | What happens |
|---|---|
| Credential exists and is usable | Bound. |
| Credential exists, not shared with the consumer | `access-required` blocker. The copy says "Ask an administrator to give their projects access" (`en.json:10816`), but **the person who reads this is already the instance admin**. There is no way to fix it in the flow, and nothing shares the credential. A user without global `credential:read` sees "missing" instead. Creating it then collides on the id. |
| Credential missing, file under a project folder | Missing binding. The UI creates it in that `ownerProject` with the source id (`modules/promotions/frontend/src/composables/usePromotionBindingCreation.ts:143-180`). If another project uses it, Continue then fails with `access-required` for that project. |
| Credential missing, file at top level (personal owner, or an owner that was never promoted) | **Hard `unknown-owner` conflict**: "The credential has no valid owner project. Set its owner project in the source." (`promotions.ee/apply-preview.ts:482-483`, `en.json:10821`). Any team workflow that uses a personal credential (a common setup) ends here on a fresh destination. |
| Generic import (`create-stub`, public API and CLI) | The stub is created **per consuming project**. With `id-only` the 2nd create fails after partial writes. Other modes create duplicates (LIGO-1250, LIGO-1091). |
| Sub-workflow absent from both the package and the destination | **No check.** The id is kept and the reference dangles silently (`n8n-packages/entities/workflow/references/sub-workflow-node.reference.ts:26-27`). Selective apply never expands to sub-workflows (`project-package-importer.ts:355-360`). |
| Variable | Never created by Apply. A missing one becomes a binding. A global variable shadowed by a project variable becomes a warning. Placement mismatches are tracked in LIGO-1234. |
| Data table | Matched in the consuming project only (`data-table-matching-mode.ts:29-32`). This is consistent with runtime (§1). |
| Workflow or folder moved between projects | A hard `moved` conflict blocks the whole Apply (`promotions.service.ts:1733-1747`). **LIGO-1363 is "To Be Released", but master has no transfer.** The only merged PR is #42117 (LIGO-1338, moves *within* a project). |
| Project matched by id, missing on the destination | Instance Apply creates it with the source id. Selective Apply returns 404, and the UI creates it first through `missing-projects`. |

## 5. Permissions

- Every promote and apply route requires global `promotions:*`. Only global owner and admin have it
  (`@n8n/permissions/src/roles/scopes/global-scopes.ee.ts:75-86,225`). Project
  admins and editors get 403. So today the "dependency in a project I can't
  access" case is reached only through custom roles that hold global `promotions:*`
  without global resource scopes.
- **Export** reads as the actor:
  - `project:export`, `workflow:export`.
  - `credential:read`. Without it, only metadata is written.
  - `dataTable:read`.
  - Variables come from `getAllForUser`.
- **Import** writes as the actor:
  - `project:update`/`create`.
  - `credential:update` for an overwrite.
  - `workflow:delete`.
  - `projectVariable:*`.
  - The binding UI checks `project.scopes.credential.create` on the owner project.
- **Sharing:** the n8n-packages and promotions code never shares anything.
- **Promotion never elevates privileges.** Good. Keep it.

## 6. Inconsistencies

1. **The same case is resolved differently per resource and per variant.**
   - A personal credential is a top-level file, which gives `unknown-owner` on Apply.
   - A personal sub-workflow fails an instance push but passes a project push.
   - A missing sub-workflow passes Apply silently.
2. **The project preview does not predict the instance push.** It uses `ReferenceOnly` while the push uses `Fail`.
3. **Apply plans per project.** There is no package-wide view of shared dependencies (LIGO-1250).
4. **The access fix is "ask an admin", and only admins can apply.**
5. **The format can't express "owned by B" when B is not exported**, and the top-level folder means two things.
6. **Moves are refused on both sides.** Only a manual move on the destination works around this.
