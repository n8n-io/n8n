# Batch 6: Variables, data tables and cross-project moves

Checked against the checkout at `/Users/ireneeajeneza/conductor/workspaces/n8n/hamburg-v1` (read only). Paths are relative to the repository root.

Short names used below:

- `promotions.ee/` = `packages/cli/src/modules/promotions.ee/`
- `n8n-packages/` = `packages/cli/src/modules/n8n-packages/`

---

## F45

**Statement:** At runtime, `$vars` reads the workflow's own project variables first and then global variables. A workflow never resolves a variable of another project.

**Verdict:** confirmed

**Evidence:**

- `packages/workflow/src/common/resolve-variables.ts:23-42` (`resolveVariables`): writes every variable without a project, then overwrites with variables where `variable.project?.id === projectId`. A variable of any other project is never written to the map.
- `packages/cli/src/workflow-helpers.ts:405-418` (`getVariables`): `projectIdToUse = projectId ?? project?.id`, where `project` is `OwnershipService.getWorkflowProjectCached(workflowId)`. Returns `Object.freeze(resolveVariables(variables, projectIdToUse))`.
- `packages/cli/src/workflow-execute-additional-data.ts:963-969` (`getBase`): resolves `projectId` from the owning project of the workflow when the caller gives none, then calls `getVariables(workflowId, projectId)`.
- `packages/core/src/execution-engine/node-execution-context/utils/get-additional-keys.ts:49,67`: `$vars: additionalData.variables`.
- Sub-workflow: `packages/cli/src/workflow-execute-additional-data.ts:723-732` builds a new `getBase({ workflowId: workflowData.id, ... })`, so a sub-workflow reads the variables of its own project, not of the caller.
- The cited lines 51-66 are `pickVariableForProject`, which the exporter and importer use. The runtime uses `resolveVariables` (lines 23-42). Both apply the same precedence.

**Corrected statement:** At runtime, `$vars` is a flat map: global variables, overridden by same-key variables of the workflow's owning project (`resolveVariables`, called from `getVariables` in `workflow-helpers.ts`). A variable of another project is never in the map. A sub-workflow gets the map of its own project.

---

## F46

**Statement:** Variables are separate package files whose scope is explicit in file placement. The exporter resolves each consumer against project variables first and then global variables (`resolveRequirements`, `assertNoBundledVariableCollision`). `collectVariableReferences` selects a project file before a global file. On Apply, `addVariableRules` rejects a missing definition, requires the declared scope, and warns about global shadowing.

**Verdict:** confirmed

**Evidence:**

- File placement: `n8n-packages/entities/variable/variable.exporter.ts:83-91` writes each variable with `projectScopedDirectory('variables', variable.project?.id, request.projectTargetsById)`. `n8n-packages/io/manifest-entry.ts:74-81`: inside the owner project's target when that project is part of the export, otherwise the top-level `variables/` directory. Import reads scope from that placement: `n8n-packages/engine/package-layout.ts:88-105,143-151` (`variableBundleEntry`, `placeByLayout`: an entry under the scope creates in the project, a top-level entry creates globally).
- Exporter precedence: `variable.exporter.ts:126-157` (`resolveRequirements`) calls `pickVariableForProject(..., name, projectId)` with the owning project of the consumer workflow (`resolveWorkflowProjects`, lines 159-163). A picked variable that the user cannot access becomes `undefined` (line 153), so a hidden project variable does not fall back to the global variable.
- `variable.exporter.ts:174-195` (`assertNoBundledVariableCollision`): throws `PackageExportBlockedError` when one name resolves to two different variables in the same package directory.
- `promotions.ee/package-references.ts:69-96` (`collectVariableReferences`): `files.get(variableKey(name, workflow.projectId)) ?? files.get(variableKey(name, null))`. Comment: "Other projects do not supply a fallback."
- `promotions.ee/apply-preview.ts:524-587` (`addVariableRules`): no file gives a conflict `{ kind: 'variable', code: 'missing-definition' }` (548-557). A consumer whose matched scopes lack the declared scope gives a `missingBindings` entry of kind `variable` with the declared scope (558-574). A global declaration with a project variable of the same name in a consumer project gives a warning `variable-shadowed` (575-586).
- Integration test: `promotions.ee/__tests__/promotions-package.integration.test.ts:2340` "reports a global variable that a project variable overrides as a warning, not a blocker".

**Corrected statement:** Confirmed. Two details: (1) the missing declared scope is a `missingBindings` entry, not a `conflicts` entry. Both block Apply (`isBlocked`, `promotions.service.ts:1132-1157`). (2) Placement gives the scope only in a project package, which is what promotion writes. A project variable whose project is not an export target is written to the top-level directory.

---

## F47

**Statement:** In the selective Promote manifest regeneration (`requirementsBlock` in import-manifest-bridge.ts), variable requirements merge by name only.

**Verdict:** confirmed

**Evidence:**

- `promotions.ee/import-manifest-bridge.ts:272-278`: `variables: mergeRequirementRows(leftover?.requirements?.variables, staging.requirements?.variables, remainingWorkflowIds, selectedWorkflowIds, (row) => row.name)`. All other collections use `row.id` (or type@version for node types).
- `mergeRequirementRows` (297-327): one row for each key. A staging row replaces the leftover row of the same key, and `usedBy` is the union filtered to the workflows that remain.
- The requirement row has no scope: `n8n-packages/spec/requirements.schema.ts:70-73` (`name` plus `usedBy`), and the schema rejects duplicate variable names (118-123).
- Call site: `promotions.ee/working-copy-updater.ts:440` inside `applySelection` (364), the overlay step of a selective Promote.
- The manifest `variables` entries (the files) are merged by id, not by name: `collectVariables`, `import-manifest-bridge.ts:196-223`.

**Corrected statement:** Confirmed. `requirementsBlock` merges variable requirement rows with the key `row.name`; a row carries no scope. The manifest list of variable files is merged separately by entry id (`collectVariables`).

---

## F48

**Statement:** At runtime, the data table node resolves tables in the workflow's home project only. A workflow cannot use a data table of another project. (Two cited paths for the same file.)

**Verdict:** confirmed

**Evidence:**

- The file that exists is `packages/modules/data-table/backend/src/data-table-proxy.service.ts` (the path of submission C). `packages/cli/src/modules/data-table/` does not exist.
- `data-table-proxy.service.ts:83-86` (`getProjectId`): `workflowProjectService.getWorkflowProjectCached(workflow.id)` gives the home project.
- `data-table-proxy.service.ts:99-119` (`getDataTableProxy`): `projectId = projectId ?? (await this.getProjectId(workflow))`, then `dataTableService.validateDataTableExists(dataTableId, projectId)`. A miss throws `NodeOperationError` "Data table with ID '...' could not be found in this project" (56-62, 108-116).
- `packages/modules/data-table/backend/src/data-table.service.ts:913-926` (`validateDataTableExists`): `findOneBy({ id, project: { id: projectId } })`.
- Every table operation passes the same `projectId` (`makeDataTableOperations`, 281-360). The aggregate list pins `filter.projectId` (261-268).
- The explicit `projectId` argument comes from `additionalData.dataTableProjectId` (`packages/core/src/execution-engine/node-execution-context/utils/data-table-helper-functions.ts:16-28`). Only three places set it, none of them a workflow execution: `packages/cli/src/controllers/dynamic-node-parameters.controller.ts:79,130,161` (editor option lookups, project from the request payload), `packages/cli/src/services/node-resource-explorer.service.ts:300`, and `packages/cli/src/node-execution/ephemeral-node-executor.ts:343` (a tool with its own project). A workflow execution leaves it unset, so the home project is used.
- Engine v2: `packages/cli/src/modules/engine-v2/remote-data-table-proxy-provider.ts:88-131` ignores the workflow and project arguments; the control plane resolves the project (`engine-data-tables.service.ts:68-95`) and uses the same not-found message.

**Corrected statement:** Confirmed. In a workflow execution the data table node reads and writes only tables of the workflow's home project (`packages/modules/data-table/backend/src/data-table-proxy.service.ts:83-119`). An explicit project id is used only in editor lookups and ephemeral tool executions.

---

## F49

**Statement:** Data table matching on import is project-specific (`by-id` matching mode, limited to the consumer project). So ownership metadata alone cannot give cross-project runtime access to a data table.

**Verdict:** confirmed

**Evidence:**

- `n8n-packages/entities/data-table/data-table-matching-mode.ts:29-32`: `'by-id'` returns the table only when `table.projectId === projectId`. `by-id` is the only mode.
- `n8n-packages/entities/data-table/data-table-importer.ts:93-97`: `candidates = { projectId: context.projectId, targetsById }`. `context.projectId` is the project of the scope that is imported (`n8n-packages/engine/project-package-importer.ts:416-421`), and the requirements of a scope are those that its workflows use (`identifyRequirements(manifest.requirements?.dataTables, workflows, agents)`, line 390). So the match is in the consumer project.
- Promotion uses `dataTableMatchingMode: 'by-id'` (`promotions.ee/promotions.service.ts:141`; default in `n8n-packages/n8n-packages.service.ts:116`).
- The second sentence is an inference. It agrees with F48: the runtime check is on the home project of the workflow, and no code path reads owner metadata.
- The cited exporter lines (`data-table.exporter.ts:50-75`) are not project-specific: `findDataTablesByIdsForUser(requestedIds, user, ['dataTable:read'])` returns a table of any project that the user can read (`data-table.service.ts:1074-1094`).

**Corrected statement:** Confirmed for the import side: a data table requirement matches only a table with the same id in the consumer project (`by-id`, the only mode). The runtime has the same project limit (F48), so owner metadata in the package would not give runtime access. The exporter is not limited to the consumer project; see missed behavior M2.

---

## F50

**Statement:** Promote refuses cross-project moves on every variant. Instance Promote refuses when the branch holds a workflow or folder under project A and the instance holds it under team project B (if A still exists), and when a branch workflow is now in a personal project (the push fails because the workflow "would be deleted"). Project/selective Promote refuses a selected workflow that moved in or out (`promotions-workflows-moved-cross-project`). The preview only shows movedTo/movedFrom markers.

**Verdict:** confirmed

**Evidence:**

- Instance Promote: `promotions.ee/promotions.service.ts:255-260` calls `assertNoProjectMovesSinceBranch` (1341-1384) before the export.
  - 1359-1365: a branch workflow whose owner here is not a team project throws `BadRequestError(describeWorkflowsMovedToPersonalProjects(...))`; text at 1664-1670: "A promotion does not include personal projects, so these workflows would be deleted on the destination".
  - 1367-1383: `crossProjectMoves` over the branch manifest, filtered to `projectExists`, throws `BadRequestError(describePromotedMoves(refused))` (`cross-project-moves.ts:107-109`).
  - The check reads the manifest at the remote head (`readRemoteManifest`), not the checkout.
- Selective Promote: `promoteProjectSelection` (603-641) calls `classifySelection` (698-740). A selected id that another project owns goes to `movedTo`. `promoteSelectionResolved` (469-476) throws `PromotionsWorkflowsMovedCrossProjectError`. The moved-in direction: `working-copy-updater.ts:316-332` (`assertNoCrossProjectMoves`) throws the same error when the branch holds a selected workflow outside the selected project's directory. Error code: `PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE` (`promotions-selective-push.error.ts`).
- Folder directories on selective Promote: `working-copy-updater.ts:339-354` (`assertNoCrossProjectContainerMoves`) throws `BadRequestError` "... belongs to another project on the branch. Promotion can't move it between projects."
- Preview: `promotions.ee/promotion-change.service.ts:160-193` (`markCrossProjectMoves`) sets `movedToProject` on a deleted workflow that another project owns now, and `movedFromProject` on an added workflow that the branch holds under another project. The frontend turns both into `moved` blockers (`packages/modules/promotions/frontend/src/promotionOperation.ts:186-193`).
- Tests: `promotions-package.integration.test.ts:2127` "refuses an instance promote that would write a move between team projects"; `__tests__/cross-project-moves.test.ts`.

**Corrected statement:** Confirmed, with these details. (1) The refusal on instance Promote happens before the export, so nothing is pushed. (2) The instance check does not require the current project to be a team project for a folder; a workflow in a personal project is refused first with the "would be deleted" message. (3) Selective Promote checks only the selected workflows and the folder directories that the selection moves; it does not check unselected workflows. (4) The preview fields are `movedToProject` and `movedFromProject`, on workflows only, and the UI treats them as blockers. (5) When the branch project no longer exists on the instance, instance Promote does not refuse, and the move reaches the branch (1373-1380).

---

## F51

**Statement:** On Apply, a workflow or folder whose project differs between the package and the destination produces a hard `moved` conflict. Apply writes nothing and the whole Apply is blocked; one moved folder disables Apply for the whole project selection (`findCrossProjectMoves`).

**Verdict:** partly-wrong

**Evidence:**

- Detection: `promotions.ee/apply-preview.service.ts:245-266` (`findCrossProjectMoves`) calls `crossProjectMoves` (`cross-project-moves.ts:34-84`): an item moves when its owner here exists and `here.id !== branchProjectId`.
- Conflict: `promotions.service.ts:1731-1748` (`blockingCheck`) turns every `movedWorkflows` and `movedFolders` entry into a conflict with `code: 'moved'`. `isConfirmableConflict` (123-125) accepts only `destructive-change` and `project-deletion`, so `moved` is never passed by Continue. `isBlocked` (1132-1157) returns `status: 'blocked'` before `applyPackagePlan`, so nothing is written.
- Instance Apply (`applyResolved`, 991-1042): passes all moves (1006, 1013-1016). Any move blocks the whole Apply. This part of the claim is right.
- Project selection Apply (`applySelectionResolved`, 897-974):
  - 945-950: `workflows: moves.workflows.filter(({ id }) => requestedWorkflowIds.has(id))`. A moved workflow blocks only when the request selects it. A selection without it is applied.
  - Folders are not filtered (comment 943-944: "A folder the package holds under this project but this instance holds elsewhere blocks every selection"). But `foldersInScope` (`cross-project-moves.ts:22-27,78`) counts a folder only when the package holds it under the selected project. A folder that the package holds under another project and the instance holds under this project is not counted on project Apply.
  - For workflows, `touchesProject` (`cross-project-moves.ts:54-55`) counts both directions.
- Frontend: `packages/modules/promotions/frontend/src/views/PromotionPreviewView.vue:205-213` blocks submit when `movedFolders.length > 0`; `promotionOperation.ts:90-92` keeps all moved folders and only the listed moved workflows.
- The import plan reports the same move as `workflow-id-conflict` or `folder-conflict` of kind `id-in-other-project`; `promotions.ee/apply-preview.ts:217-229` hides those issues for moved ids so each move is reported once.
- Tests: `promotions-package.integration.test.ts:2575` "reports a move between projects as blocked without importing"; 2265 "reports a workflow that moved to another project, next to the blockers of other workflows"; 2203 "says when the branch project of a moved workflow does not exist here yet".
- Cited lines 690-739 of `promotions.service.ts` are `classifySelection` (Promote), not Apply.

**Corrected statement:** On Apply, a workflow or folder that the package holds under one project and the destination holds under another becomes a `moved` conflict that Continue cannot pass. On instance Apply, any such move blocks the whole Apply and nothing is written. On project selection Apply, a moved workflow blocks only a request that selects it; a moved folder that the package holds under the selected project blocks every selection of that project; a folder that moved the other way is not checked.

---

## F52

**Statement:** The import engine matches an existing workflow only inside the project that it imports. A workflow that exists in another project looks new and the import fails with `workflow-id-conflict`.

**Verdict:** confirmed

**Evidence:**

- `n8n-packages/entities/workflow/workflow-import-match.service.ts:58-77` (`findBySourceWorkflowIds(projectId, ...)`) calls `workflowFinderService.findOwnedWorkflowsBySourceWorkflowIds(projectId, ...)`.
- `packages/cli/src/workflows/workflow-finder.service.ts:367-414`: both query branches require `projectId` and `role: 'workflow:owner'` (match on `sourceWorkflowId`, or on `id` when `sourceWorkflowId` is null).
- `n8n-packages/entities/workflow/workflow-importer.ts:75-79,93-113`: no match gives action `create`, and the decided id goes to `sourceCreateIds`.
- `workflow-importer.ts:194-216` (`collectIdConflicts`): "Any hit — even in another project — blocks the import", through `findOwningProjectsByWorkflowId` (instance-wide, `workflow-import-match.service.ts:39-56`).
- `n8n-packages/engine/import-orchestrator.ts:695`: the conflict becomes the blocking issue `workflow-id-conflict`.
- `WorkflowIdPolicy` has one value, `source` (`n8n-packages/n8n-packages.types.ts:57-60`), and promotion uses it (`promotions.service.ts:132`).
- Promotion hides this issue for an id that `crossProjectMoves` reports and shows `moved` instead (`promotions.ee/apply-preview.ts:217-229`).

**Corrected statement:** Confirmed. The importer matches a package workflow only against workflows that the target project owns. With no match it plans a create with the source id; a workflow with that id in any other project gives the blocking issue `workflow-id-conflict`. On Apply, promotion reports such a case as `moved` instead.

---

## F53

**Statement:** Folder and workflow moves and renames inside one project already work on Apply (integration test "Apply moves and renames within a project"). B adds that the only merged PR is #42117 (LIGO-1338), which covers moves within a project, and that master has no cross-project transfer on Apply although LIGO-1363 is marked "To Be Released". The PR and ticket status parts are not settled by repository code.

**Verdict:** confirmed (code parts). The ticket status parts are unverifiable from the repository.

**Evidence:**

- `promotions.ee/__tests__/promotions-package.integration.test.ts:1972` is a `describe('Apply moves and renames within a project')` block, not a single test. It holds, among others: 1991 "moves a published workflow to its branch folder and keeps it published" (`counts.workflows` `{ updated: 1, moved: 1 }`), 2013 archived workflow move, 2076 "swaps two folders back and renames one on instance Apply" (`counts.folders` `{ updated: 2, moved: 2, renamed: 1 }`), 2101 the same swap on project Apply.
- Mechanism: `promotions.ee/apply-preview.service.ts:77-78` sets `layoutConflictPolicy: LayoutConflictPolicy.FollowPackage` ("Apply moves and renames workflows and folders within their project to match the branch"). `n8n-packages/entities/workflow/workflow-importer.ts:130-137` sets `item.moveToFolderId` under that policy.
- No cross-project transfer on Apply: `promotions.service.ts:1727-1748` ("Apply cannot move a workflow or folder between projects, so each move of the preview becomes a conflict"). See F51.
- Git history (read only): commit `3c818eb1e72` "feat(core): Support workflow and folder moves within a project in promotions (no-changelog) (#42117)" is in the history. The commit message does not name a Linear ticket. A search of `packages/cli/src/modules` for `LIGO-1338` and `LIGO-1363` returned no match.
- Not settled by the repository: that #42117 is the only merged PR for this, that it belongs to LIGO-1338, and the status of LIGO-1363.

**Corrected statement:** Moves and renames of workflows and folders inside one project work on instance Apply and project Apply (`LayoutConflictPolicy.FollowPackage`; the `describe` block "Apply moves and renames within a project"). Commit `3c818eb1e72` (#42117) added moves within a project. The code has no transfer between projects on Apply; it reports a `moved` conflict. The link to LIGO-1338 and the status of LIGO-1363 cannot be verified from the repository.

---

# Missed behaviors

## M1. Apply never creates or updates a variable

- `promotions.ee/promotions.service.ts:144-145`: `variableMissingMode: VariableMissingMode.MustPreexist`, `variableConflictPolicy: VariableConflictPolicy.KeepExisting`. The selection flow gets the same defaults (`n8n-packages/n8n-packages.service.ts:118-119`; `applySelectionRequest` in `apply-preview.service.ts:61-82` does not override them).
- `n8n-packages/entities/variable/variable-importer.ts:60-98`: the engine itself accepts a global variable for a project requirement (`pickVariableForProject`), creates only when the missing mode creates, and compares values only when the policy is not `keep-existing`.
- So on Apply a variable must already exist on the destination in the scope that the branch file declares (`addVariableRules`, `apply-preview.ts:558-574`). The package value reaches the user only as `sourceValue` of the missing binding. For a project variable, the destination consumer project must hold its own copy.

## M2. A missing data table is created in the consumer project, whatever project owns it in the package

- `promotions.ee/promotions.service.ts:142`: `dataTableMissingMode: DataTableMissingMode.Create`.
- `n8n-packages/entities/data-table/data-table-importer.ts:167-174`: `createDataTable(context.projectId, ..., table.id, ...)`. The target is the project of the consuming scope. The package directory of the table file is not read for ownership (`packageDataTables: await this.packageParser.getDataTables(reader)`, `project-package-importer.ts:391`, is package-wide).
- `data-table-importer.ts:341-349`: when a table with the same id exists in another project of the destination, the creation fails with `id-conflict` ("Ids are globally unique, so a same-id table in another project blocks creation"). Promotion shows it as `data-table-conflict` (`apply-preview.ts:350-370`).
- The exporter bundles a table of any project that the user can read and places the file under the owner project's directory, or at the top level when the owner is not an export target (`data-table.exporter.ts:50-70`, `io/manifest-entry.ts:74-81`).
- Result: a data table id can exist in one project only, on the source and on the destination. A workflow that names a table of another project cannot run on the source (F48), and on Apply it gets either a new table in its own project or an `id-conflict`.

## M3. A project Apply does not delete a workflow that the project owns on the destination when the package holds it under another project

- `promotions.ee/promotions.service.ts:787-841` (`classifyApplySelection`, lines 818-823): a requested id that the package does not hold under this project and that this project owns here is a deletion, except when `movedWorkflowIds` has it. Comment: "A move is reported, not deleted; otherwise the package dropped it, so it is a deletion."
- `promotions.ee/apply-preview.service.ts:274-294` (`classifyProjectWorkflows`): `deletedWorkflowIds` leaves out `movedWorkflowIds`. The preview uses it for the whole project.
- Apply deletes with `overwriteDeletionPolicy: OverwriteDeletionPolicy.HardDelete` (`promotions.service.ts:140`, `apply-preview.service.ts:69`). So a workflow that the package does not hold in any project, and that this project owns here, is hard-deleted by a project Apply that selects it. Only the move check separates "the package holds it elsewhere" from "the package dropped it".
- The promote side has the mirror case: a selected id that the project no longer owns goes to `deletedWorkflowIds` (`promotions.service.ts:719-736`), and the `movedTo` refusal (469-476) stops the push. Comment at 469-470: "The destination can't tell a move from a removal and would delete the workflow."

# Second check

## F51

**First verdict:** partly-wrong. **Upheld:** yes. **Second verdict:** partly-wrong.

I read the code myself:

- `packages/cli/src/modules/promotions.ee/cross-project-moves.ts:22-27` (`foldersInScope`) keeps only folders that the package holds under `projectId`. Lines 54-55 (`touchesProject`) count a workflow when the package project or the instance project is the selected project. Lines 61 and 74-83 build the moves.
- `promotions.ee/apply-preview.service.ts:245-266` (`findCrossProjectMoves`) loads folder homes only for `foldersInScope(...)`.
- `promotions.ee/promotions.service.ts:123-125`: `isConfirmableConflict` accepts only `destructive-change` and `project-deletion`. `moved` is never confirmable.
- `promotions.service.ts:1731-1748` (`blockingCheck`): every moved workflow and moved folder becomes a conflict with `code: 'moved'`.
- `promotions.service.ts:1132-1157` (`isBlocked`): any non-confirmable conflict blocks. Both Apply paths return `status: 'blocked'` before `applyPackagePlan` (946-954, 1017-1019). Nothing is written.
- Instance Apply (`applyResolved`, 991-1042): `findCrossProjectMoves(inventory)` without a project (1006), and all moves go to `check` (1013-1016). One move blocks the whole Apply.
- Project selection Apply (`applySelectionResolved`, 897-974): moves are scoped to the project (930). Lines 943-950 filter `moves.workflows` to `requested.workflowIds` but keep all in-scope `moves.folders`. So a moved workflow blocks only a request that selects it. The claim "the whole Apply is blocked" is wrong for this case.
- Frontend matches: `packages/modules/promotions/frontend/src/promotionOperation.ts:90-92` keeps only listed moved workflows and all moved folders. `views/PromotionPreviewView.vue:204-213` disables submit for every selection when `movedFolders` is not empty.
- No other Apply path calls `findCrossProjectMoves` (only lines 930 and 1006 in `promotions.service.ts`; 123 in `apply-preview.service.ts` is the preview).

The claim is right on the hard `moved` conflict, on "writes nothing", on instance Apply, and on a moved folder that blocks every selection of the project. It is wrong to say that any moved workflow blocks the whole project selection Apply. The first checker's corrected statement is accurate. Note: "a folder that moved the other way is not checked" refers to the move check only. Such a folder is not in the package under the selected project, so the project selection does not import it.
