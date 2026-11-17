# Batch 5: Sub-workflows and workflow references, Apply scope and deletion

Checkout: `/Users/ireneeajeneza/conductor/workspaces/n8n/hamburg-v1`. Code read only. No build, test, or application was run.

Path shorthand:

- `PKG` = `packages/cli/src/modules/n8n-packages`
- `PROMO` = `packages/cli/src/modules/promotions.ee`
- `FE` = `packages/modules/promotions/frontend/src`

## F37

**Statement:** Apply has no check for a missing workflow dependency: no BlockingIssue type covers it. When a sub-workflow or error workflow is absent from both the package and the destination, the id is kept and the reference dangles silently; nobody is told.

**Verdict:** confirmed

**Evidence:**

- `PKG/n8n-packages.types.ts:664-740`: the `BlockingIssue` union has `credential-unresolved`, `data-table-unresolved`, `tag-unresolved`, `variable-unresolved`, `missing-node-type` and others. It has no variant for an unresolved workflow reference. The only workflow-dependency variant is `agent-dependency-unresolved` with `dependencyType: 'workflow'` (`packages/@n8n/api-types/src/dto/packages/import-blocking-issue.schema.ts:438-446`), and it applies to Agents only. Promotion exports with `includeAgents: false` (`PROMO/instance-package.ts:36, 62`).
- `PKG/entities/workflow/references/sub-workflow-node.reference.ts:26-27`: `const targetId = bindings.workflows.get(currentId); if (targetId) setStaticSubworkflowId(node, targetId);`. Without a binding the id stays.
- `PKG/entities/workflow/references/error-workflow.reference.ts:17`: `bindings.workflows.get(currentId) ?? currentId`.
- `PKG/engine/project-package-importer.ts:216-218`: the bindings hold only the workflows that the plan writes.
- `PROMO/apply-preview.ts:174-260` (`toPreviewCheck`): adds credential and variable rules only. Nothing reads `manifest.requirements.workflows` against the destination.
- Why no later signal appears: both Apply flows set `publishingPolicy: PreserveTargetState` (`PROMO/promotions.service.ts:134`, `PROMO/apply-preview.service.ts:76`), which maps to `noop` (`PKG/entities/workflow/workflow-publishing-policy.ts:34`). So `WorkflowService.activateWorkflow` and its `_validateSubWorkflowReferences` (`packages/cli/src/workflows/workflow.service.ts:1283, 2191-2204`) never run on Apply. The generic import does report the case through a soft publish failure: test `PKG/__tests__/import-package-selection.integration.test.ts:430-466` ("imports an out-of-subset sub-workflow reference broken-but-preserved, soft-failing its publish") expects `publishing.state === 'failed'` and an error that names the sub-workflow.
- The Apply result carries `counts` and `warnings: check.warnings` only (`PROMO/promotions.service.ts:965-973, 1036-1041`). The only warning code is `variable-shadowed` (`PROMO/apply-preview.ts:577-583`).
- The preview does list the called workflow as a row (`PROMO/promotion-preview.ts:370-383`), but as `change: 'unchanged'`. It does not say that the destination lacks it.

**Corrected statement:** Promotion Apply has no check for a missing workflow dependency. No `BlockingIssue` variant covers a workflow-to-workflow reference (only Agents have `agent-dependency-unresolved`, and promotion excludes Agents). When a static sub-workflow or error workflow is in neither the written set nor the destination, the id is kept. Apply uses `preserve-target-state`, so the publish-time sub-workflow validation that the generic import reports as a soft publish failure does not run. The Apply result and check report nothing. The preview shows the called workflow as an unchanged "Sub-workflows" row without saying that it is missing.

## F38

**Statement:** The promote preview shows an unpromoted dependency in a 'Sub-workflows' group with 'No changes'. Workflow requirements exist in the manifest but nothing uses them.

**Verdict:** partly-wrong

**Evidence:**

- First sentence, correct for a workflow outside the previewed project: `PROMO/promotion-preview.ts:370-383` builds a placeholder row for every `requirements.workflows` entry (`parentKey: null`, `change: 'unchanged'`, `selectable: false`) and a link with `included: false`. `:429-431` adds the placeholder only when the project index has no row for that workflow. `FE/promotionPreview.tree.ts:65-67` puts a workflow with `parentKey === null` in the `subWorkflow` group ("Sub-workflows", `packages/frontend/@n8n/i18n/src/locales/en.json:10924`). `FE/components/preview/PromotionChangeCard.vue:218-225` shows "No changes. The operation keeps this resource as it is." for `unchanged`.
- Missing detail: an unselected sub-workflow inside the same project is in the index, so it shows as an ordinary workflow row with its real change, not as a placeholder (`promotion-preview.ts:134-136, 429-431`).
- Second sentence, wrong. `manifest.requirements.workflows` is read by:
  - the preview itself (`PROMO/promotion-preview.ts:370`), which the first sentence depends on;
  - the publish order (`PKG/engine/project-package-importer.ts:239`, `PKG/entities/workflow/sub-workflow-ordering.ts:7-59`);
  - the retention set of the overwrite reconciliation (`PKG/engine/project-package-importer.ts:434-440`, `PKG/engine/import-orchestrator.ts:483`, `PKG/entities/workflow/workflow-remover.ts:250-255`);
  - Agent dependency binding (`PKG/entities/agent/agent-import-bindings.ts:360`);
  - the manifest merge of a selective Promote (`PROMO/import-manifest-bridge.ts:66, 265-268`).
- What is true: no Apply gate checks a workflow requirement against the destination (see F37).

**Corrected statement:** The promote preview shows a called workflow that is outside the previewed project as an unselectable row in a "Sub-workflows" group with "No changes". An unselected sub-workflow of the same project shows as a normal workflow row with its own change. Workflow requirements in the manifest are used for the preview links, the publish order, the retention of referenced workflows during overwrite reconciliation, Agent bindings and the selective-Promote manifest merge. No Apply check uses them to detect a dependency that the destination lacks.

## F39

**Statement:** Package requirements already record the consumers (usedBy lists) of credentials, data tables, variables, tags and sub-workflows. With the reference-only policy, a sub-workflow outside the selection (for example in another project) is recorded as a requirement, its body is not written, and the Promote succeeds silently.

**Verdict:** confirmed

**Evidence:**

- `PKG/spec/requirements.schema.ts:4-6, 8-73`: every requirement schema (credentials, dataTables, workflows, agents, tags, nodeTypes, variables) carries `usedBy` with at least one consumer.
- `PKG/n8n-packages.service.ts:211-212, 246-260, 336-341`: under `reference-only` the resolver runs with `traversal: 'direct'` and `assertStaticSubWorkflowsIncluded` is skipped ("Reference-only records missing dependencies as requirements instead of aborting").
- `PKG/entities/workflow/workflow-requirement.exporter.ts:34-51, 56-71`: the requirement gets a best-effort name for a workflow that is not in the package. An id that the user cannot export stays without a name.
- Tests: `PKG/__tests__/export-project.integration.test.ts:773-789` and `PKG/__tests__/export-workflow.integration.test.ts:741-760` ("Only the parent's workflow.json travels").
- `PROMO/promotions.service.ts:503-505`: selective Promote sets `dependencyPolicy: ExportDependencyPolicy.ReferenceOnly`. Its result carries only review warnings (`:583-593`, `:335-393`).
- Scope of the claim: only selective (project) Promote uses reference-only. Instance Promote uses `ExportDependencyPolicy.Fail` (`PROMO/instance-package.ts:41-44`) and aborts.

**Corrected statement:** Package requirements record the consumers (`usedBy`) of credentials, data tables, variables, tags, sub-workflows (and Agents and node types). Selective Promote uses the reference-only policy: a statically referenced sub-workflow or error workflow outside the selection, for example in another project, becomes a requirement with id, optional name and `usedBy`. Its body is not written, and the Promote returns no warning. Instance Promote uses the `fail` policy instead and aborts on such a dependency.

## F40

**Statement:** Sub-workflow traversal and rebinding already exist: `WorkflowDependencyResolver`, a workflow reference registry that covers sub-workflow nodes, error workflows and caller IDs, and cross-project workflow bindings in the project package importer.

**Verdict:** confirmed

**Evidence:**

- `PKG/entities/workflow/workflow-dependency-resolver.ts:27-70`: breadth-first walk of static references, `transitive` or `direct`. It loads workflows with `workflow:export` for the user and does not traverse through a workflow that the user cannot export, but keeps the id as a requirement of its parent (`:51-53`).
- `PKG/entities/workflow/references/workflow-references.ts:8-12`: registry of `subWorkflowNodeReference`, `errorWorkflowReference`, `callerIdsReference`. `callerIdsReference.extract` returns `[]` (`caller-ids.reference.ts:10-12`), so caller IDs are rebound on import but never become a requirement.
- `PKG/entities/workflow/workflow-importer.ts:379`: `for (const reference of workflowReferences) reference.apply(entity, bindings);`.
- `PKG/engine/project-package-importer.ts:214-218, 231`: one binding map for every planned project is passed to each scope ("so a sub-workflow reference that points into another project resolves when its parent is applied").
- Limits: only static database references count (`packages/workflow/src/node-helpers.ts:2204-2215` skips expressions and non-database sources). The cross-project map holds only workflows that the plan writes.

**Corrected statement:** Same as the claim. `WorkflowDependencyResolver` walks static sub-workflow and error-workflow references on export. The reference registry extracts sub-workflow nodes and error workflows and rebinds those two plus `callerIds` on import. `ProjectPackageImporter.applyPlan` seeds one workflow binding map across all planned projects. Caller IDs are rebind-only, and expression references are not covered.

## F41

**Statement:** The default sub-workflow caller policy is workflowsFromSameOwner (same project only), and the policy checker compares the owner project of the workflows. A sub-workflow or error workflow in another project is callable only with callerPolicy `any` or `workflowsFromAList`. Workflow sharing (workflow:editor) controls access only and has no runtime effect on sub-workflow calls.

**Verdict:** confirmed

**Evidence:**

- `packages/@n8n/config/src/configs/workflows.config.ts:19-21`: `callerPolicyDefaultOption: CallerPolicy = 'workflowsFromSameOwner'`, configurable with `N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION`.
- `packages/cli/src/executions/pre-execution-checks/subworkflow-policy-checker.ts:69-90`: `any` allows. `workflowsFromAList` allows when `callerIds` lists the parent id (`:167-175`). Otherwise `parentWorkflowProject.id === subworkflowProject.id` must hold under `workflowsFromSameOwner`. `none` always denies. `:140-144`: the sub-workflow's own `settings.callerPolicy` wins over the default.
- `packages/@n8n/backend-services/src/services/workflow-project.service.ts:30-33`: the project lookup reads the `SharedWorkflow` row with `role: 'workflow:owner'`. A `workflow:editor` row is not read.
- Error workflows use the same checker: `packages/cli/src/workflows/workflow-execution.service.ts:651-655`, and `packages/cli/src/workflows/error-workflow-validation.service.ts:113-124`.
- Sub-workflow runtime: `packages/cli/src/workflow-execute-additional-data.ts:684-689`. `userId` only feeds `hasReadAccess` for the error text (`subworkflow-policy-checker.ts:122-135`).

**Corrected statement:** Same as the claim, with two details. The default `workflowsFromSameOwner` is an instance setting (`N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION`) that applies when the called workflow has no `settings.callerPolicy`. Under `workflowsFromAList`, the caller's workflow id must be in the called workflow's `callerIds`. The checker compares the owner projects (`workflow:owner` rows). Workflow sharing does not enter the decision.

## F42

**Statement:** Workflow sharing targets personal projects only. Tags are instance-wide.

**Verdict:** confirmed

**Evidence:**

- `packages/cli/src/workflows/workflow.service.ee.ts:156-186`: `shareWithProjects` loads `Project` with `where: { id: In(shareWithIds), type: 'personal' }` and creates rows with `role: 'workflow:editor'`. It is the only place in `packages/cli/src` (tests excluded) that writes `role: 'workflow:editor'`. Its caller is `PUT /:workflowId/share` (`packages/cli/src/workflows/workflows.controller.ts:569-630`).
- `packages/@n8n/db/src/entities/tag-entity.ts:10-29`: `TagEntity` has a unique `name` index and no project column or relation.

**Corrected statement:** Same as the claim. Sharing a workflow creates `workflow:editor` rows for personal projects only (a team project id in the request is dropped by the `type: 'personal'` filter). Tags have no project and a unique name for the whole instance.

## F43

**Statement:** Selective (project) Apply imports only the selected project and the selected workflows. It never expands the selection to sub-workflows or other dependencies.

**Verdict:** partly-wrong

**Evidence:**

- Correct core: `PKG/engine/project-package-importer.ts:114-122` keeps only the project with `selection.selectedProjectId`. `:355-360`: "Do not expand the selection to include referenced sub-workflows." and a filter on `selectedWorkflowIds`. `PKG/n8n-packages.types.ts:310-316` states the same. Test: `PKG/__tests__/import-package-selection.integration.test.ts:430-466` (the unselected sub-workflow is not created).
- Wrong for "only" and "other dependencies". The same selection plan also writes:
  - folders: the selected folders, the folders that hold a selected workflow, and every folder above them (`project-package-importer.ts:361-366, 469-493`);
  - project details: `projectConflictPolicy: Overwrite` (`PROMO/apply-preview.service.ts:67`);
  - data tables that the selected workflows require: `dataTableMissingMode: 'create'` (`PKG/n8n-packages.service.ts:117`), created in the selected project (`PKG/entities/data-table/data-table-importer.ts:167-169`), and schema updates (`OverwriteNonDestructive`, `apply-preview.service.ts:70-72`);
  - tags: `tagMissingMode: 'create'` (`n8n-packages.service.ts:120`) and `TagConflictPolicy.Rename` (`apply-preview.service.ts:73`);
  - credentials: no creation (`credentialMissingMode: 'must-preexist'`), but `CredentialConflictPolicy.Overwrite` updates a credential that the project owns (`apply-preview.service.ts:74`, `PROMO/apply-preview.ts:71-77`);
  - explicit deletions of workflows in the same project (`project-package-importer.ts:441, 461-467`).
- Requirements are scoped to the selected workflows (`project-package-importer.ts:370-374, 390, 399`), so dependencies of unselected workflows are not written.

**Corrected statement:** Selective (project) Apply plans only the selected project and writes only the selected workflows. It does not add referenced sub-workflows or error workflows to the selection. It does write what the selected workflows need other than workflows: their folders and parent folders, the project details, missing data tables (created in the selected project) and data table schema updates, tags (created or renamed), and updates to credentials that the project owns. Credentials and variables must exist already. It also hard-deletes the workflows named for deletion in that project.

## F44

**Statement:** Instance (full) Apply treats the package as authoritative: overwrite plus hard delete. It infers project deletions from absence and deletes team projects that the package lacks after a confirmation (`projectDeletions`, `reconcileProjects`). Project Apply is additive with explicit deletes and never reconciles projects (this last sentence is C's only).

**Verdict:** confirmed

**Evidence:**

- `PROMO/promotions.service.ts:127-148`: `IMPORT_POLICY` with `projectConflictPolicy: Overwrite`, `folderConflictPolicy: Overwrite`, `overwriteDeletionPolicy: HardDelete`, comment "Apply treats the package as source of truth."
- `PROMO/promotions.service.ts:1159-1177` (`projectDeletions`): team projects on the instance whose id the package inventory lacks become conflicts with `code: 'project-deletion'`.
- `:122-125, 1132-1157`: `project-deletion` and `destructive-change` are the conflicts that `confirmDestructiveChanges` passes. Without it, Apply returns `status: 'blocked'`.
- `:1026-1034, 1522-1540`: the method is `reconcileTeamProjects`, not `reconcileProjects`. It deletes only the confirmed projects that the import did not keep, with `projectService.deleteProject(actor, projectId)` and no migration target.
- `PKG/entities/workflow/workflow-remover.ts:49-91, 226-241`: with source `git-pull` the whole project is authoritative, so every unarchived workflow that the project owns and the package does not account for is a removal candidate.
- Project Apply: `PKG/n8n-packages.service.ts:110-120` (`CHERRY_PICK_IMPORT_POLICY`, `folderConflictPolicy: 'merge'`), `PKG/n8n-packages.types.ts:350-353` ("The folder policy stays `merge`, so nothing is removed"), `workflow-remover.ts:42-45, 93-150` (explicit deletes only), `PROMO/apply-preview.service.ts:68-69` (hard delete), `PROMO/promotions.service.ts:787-841` (the server classifies a requested id that the branch lacks and that the project owns as a deletion), `:968-971` (`projectReconciliation: { deletedProjectIds: [] }`).

**Corrected statement:** Same as the claim, with the method name corrected to `reconcileTeamProjects`. Instance Apply uses overwrite policies with hard delete, lists team projects that the package lacks as `project-deletion` conflicts, returns `blocked` until the caller confirms, then deletes the confirmed projects after the import. Project Apply uses the `merge` folder policy, hard-deletes only the workflows that the request names and the branch lacks in that project, and never deletes projects. It still overwrites the project details and the project's own credentials.

## Missed behaviors

### M1. Instance Promote fails on a dependency outside the exported team projects

Instance Promote exports with `dependencyPolicy: ExportDependencyPolicy.Fail` (`PROMO/instance-package.ts:41-44`, comment: "personal projects are excluded, so a team workflow calling a personal sub-workflow blocks the whole promotion; intended for now, see LIGO-1089"). `assertStaticSubWorkflowsIncluded` (`PKG/entities/workflow/static-sub-workflow-requirements.ts:6-32`, called at `PKG/n8n-packages.service.ts:336-341`) throws `PackageExportBlockedError` "N workflow dependency not included in the package. Export aborted." with workflow ids only. The registry treats an error workflow as the same kind of dependency (`references/workflow-references.ts:8-12`). So the same reference is silent on selective Promote (reference-only) and fatal on instance Promote.

### M2. Overwrite reconciliation retains a referenced sub-workflow only within the consumer's project

On instance Apply, each project scope removes the owned workflows that the package does not account for, except those in `subWorkflowRequirementIds` (`PKG/entities/workflow/workflow-remover.ts:226-255`). That list is scoped to the consumers in the same project: `identifyRequirements(manifest.requirements?.workflows, workflows, agents)` with this project's workflows (`PKG/engine/project-package-importer.ts:434-440`, `PKG/engine/import-result.ts:250-267`). Candidates are the workflows that `context.projectId` owns (`workflow-remover.ts:58-61`). From this code, a sub-workflow in project B that the branch does not hold, referenced only by a packaged workflow in project A, is not in B's retention set and is a hard-delete candidate when B is on the branch. I found no test for this cross-project case, so it is a reading of the code, not an observed result.

### M3. Deletions have no reverse-reference guard and are confined to the selected project

`PKG/n8n-packages.types.ts:313-315`: "Delete only within the destination project, even under `merge`. Ignore absent or archived IDs. References to deleted workflows remain unchanged." `workflow-remover.ts:117-121` loads explicit delete targets with `findOwnedWorkflowRemovalCandidates(context.projectId, ...)`. Tests: `PKG/__tests__/import-package-selection.integration.test.ts:574-603` ("allows deletion of a workflow that is only referenced by the selection": the parent keeps the id of the removed sub-workflow) and `:709` ("confines deletes to the scoped project"). Project Apply hard-deletes (`PROMO/apply-preview.service.ts:68-69`), so a caller in any project keeps a reference to a workflow that no longer exists. A confirmed project deletion on instance Apply calls `deleteProject` without a migration target, which deletes the project's workflows, owned credentials and data tables (`packages/cli/src/services/project.service.ee.ts:211-257`) with no check for callers in other projects.

## Second check

### F38 — upheld (partly-wrong)

I read the code myself and reach the same verdict.

- First sentence holds only for a called workflow that no indexed project holds. `PROMO/promotion-preview.ts:370-383` adds a placeholder row for each `requirements.workflows` entry (`parentKey: null`, `change: 'unchanged'`, `selectable: false`) and a link with `included = false`. `:429-431` keeps the placeholder only when the index has no row for that key. The index holds every workflow of each previewed project (`:134-136`), so a same-project sub-workflow keeps its real row and its real change. The placeholder is listed only when a listed workflow calls it (`:442-457`).
- Frontend: `promotionPreview.tree.ts:65-67` puts a workflow with `parentKey === null` in the `subWorkflow` group ("Sub-workflows", `en.json:10924`). `PromotionChangeCard.vue:218-225` shows `promotions.preview.card.noChanges` for an `unchanged` row.
- Second sentence is wrong. Consumers of `manifest.requirements.workflows`: the preview (`promotion-preview.ts:215, 370`); publish order (`PKG/engine/project-package-importer.ts:239` -> `workflow-publisher.ts:71` -> `sub-workflow-ordering.ts:7-59`); overwrite-reconciliation retention (`project-package-importer.ts:434-440` -> `import-orchestrator.ts:483` -> `workflow-remover.ts:250-255`); Agent bindings (`agent-import-bindings.ts:360`); the selective-Promote manifest merge (`PROMO/import-manifest-bridge.ts:66, 265-268`); and the single-workflow importer (`workflow-package-importer.ts:159-175`).
- I found no Apply check that uses these requirements to block on a sub-workflow the destination lacks. The corrected statement is accurate.

### F43 — upheld (partly-wrong)

I read the code myself and reach the same verdict.

- Core is correct. `project-package-importer.ts:114-122` keeps only `selection.selectedProjectId`. `:355-360` ("Do not expand the selection to include referenced sub-workflows.") filters workflows by `selectedWorkflowIds`. `n8n-packages.types.ts:310-316` says the same. Error workflows are not added either: the filter uses only `selectedWorkflowIds`.
- "Only" and "never ... other dependencies" are wrong:
  - folders: selected folders, folders that hold a selected workflow, and all ancestors (`project-package-importer.ts:361-366, 476-493`);
  - project details: `ProjectConflictPolicy.Overwrite` (`PROMO/apply-preview.service.ts:67`);
  - data tables: `dataTableMissingMode: 'create'` (`PKG/n8n-packages.service.ts:117`), created in `context.projectId` (`data-table-importer.ts:167-173`), schema updates (`apply-preview.service.ts:70-72`);
  - tags: `tagMissingMode: 'create'` (`n8n-packages.service.ts:120`), `TagConflictPolicy.Rename` (`apply-preview.service.ts:73`);
  - credentials: `credentialMissingMode: 'must-preexist'` (`n8n-packages.service.ts:114`) but `CredentialConflictPolicy.Overwrite` (`apply-preview.service.ts:74`) updates project-owned credentials (`PROMO/apply-preview.ts:71-77`);
  - variables: `variableMissingMode: 'must-preexist'` (`n8n-packages.service.ts:118`);
  - explicit deletes in the selected project with hard delete (`project-package-importer.ts:441, 461-467`; `apply-preview.service.ts:68-69`).
- Requirements are scoped to the selected workflows (`project-package-importer.ts:370-374, 390, 399`). The corrected statement is accurate.
