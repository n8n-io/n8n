# Fact check, batch 2

Area: Promote: dependency policy, personal projects, branch overlay and manifest regeneration.

Checked against the checkout at `/Users/ireneeajeneza/conductor/workspaces/n8n/hamburg-v1`. Code was read only. No build, test or application was run.

Short paths used below:

- `promotions.ee/` = `packages/cli/src/modules/promotions.ee/`
- `n8n-packages/` = `packages/cli/src/modules/n8n-packages/`

## Summary

| id | verdict |
|---|---|
| F10 | confirmed |
| F11 | confirmed |
| F12 | confirmed |
| F13 | confirmed |
| F14 | wrong |
| F15 | confirmed (with two conditions) |
| F16 | confirmed (one framing note) |
| F17 | partly-wrong |
| F18 | partly-wrong |

F13 and F14 conflict. The code decides for F13: the UI calls the same public API endpoint, so the ids reach no surface.

---

## F10

**Statement.** Instance (full) Promote exports all team projects with the `Fail` workflow dependency policy. Project and selective Promote share one code path that uses `ReferenceOnly`. So instance Promote can fail on a dependency that project or selective Promote leaves as a reference.

**Verdict.** confirmed

**Evidence.**

- `promotions.ee/promotions.service.ts:264` reads `projectRepository.findTeamProjectIds()`. `packages/@n8n/db/src/repositories/project.repository.ts:97-104` filters `where: { type: 'team' }`.
- `promotions.ee/promotions.service.ts:276-283` exports with `instancePromotionExportRequest(...)`. `promotions.ee/instance-package.ts:44` sets `dependencyPolicy: ExportDependencyPolicy.Fail`.
- There is one project-level Promote entry: `POST /promotions/projects/:projectId/promote` (`packages/cli/src/public-api/v1/controllers/promotions.public.controller.ts:690-710`) calls `promoteProjectSelection` (`promotions.service.ts:603-641`), which calls `promoteSelectionResolved` (`promotions.service.ts:429`). The export request at `promotions.service.ts:493-509` sets `dependencyPolicy: ExportDependencyPolicy.ReferenceOnly` (line 505). There is no separate "whole project" Promote. The comment at 596-602 says an empty selection promotes only the project.
- `n8n-packages/n8n-packages.service.ts:211-212, 335-341`: `assertStaticSubWorkflowsIncluded` runs only when the policy is not `ReferenceOnly`. With `ReferenceOnly`, traversal is `direct` (line 258) and the missing workflow becomes a `requirements.workflows` row (`n8n-packages/entities/workflow/workflow-requirement.exporter.ts:25-53`).

**Corrected statement.** Instance Promote exports every team project with `ExportDependencyPolicy.Fail`. Project Promote and selective Promote are the same code path (`promoteProjectSelection` → `promoteSelectionResolved`) and use `ExportDependencyPolicy.ReferenceOnly`. So instance Promote can fail on a workflow dependency that project or selective Promote records as a requirement.

---

## F11

**Statement.** The project promote preview also uses ReferenceOnly, and there is no instance-wide preview. So the project preview does not predict an instance push failure.

**Verdict.** confirmed

**Evidence.**

- `promotions.ee/promotion-change.service.ts:77-131`: `getPreview(user, projectId, direction)` calls `exportInstancePackage(this.packagesService, user, projectId)` (line 105).
- `promotions.ee/instance-package.ts:49-67`: `exportInstancePackage` exports `projectIds: [projectId]` with `dependencyPolicy: ExportDependencyPolicy.ReferenceOnly` (line 66). The name is misleading: it exports one project.
- The public controller has preview routes only below a project: `GET /projects/:projectId/changes/:direction` and `POST /projects/:projectId/changes/:direction/details` (`promotions.public.controller.ts:630-675`). `getPreview` has no other caller (searched `getPreview` in `packages/cli/src`).
- The instance Promote dialog sends the push with no preview step: `packages/modules/promotions/frontend/src/components/PromoteInstanceDialog.vue:98-114`.

**Corrected statement.** Same as the claim. The project preview exports one project with `ReferenceOnly`. No endpoint and no UI step previews an instance Promote. The `Fail` check runs only inside the instance push.

---

## F12

**Statement.** An instance Promote fails as a whole when a team workflow references a sub-workflow or error workflow that is in a personal project or is deleted. The message is "N workflow dependency/dependencies not included in the package. Export aborted."

**Verdict.** confirmed

**Evidence.**

- Both reference types are extracted: `n8n-packages/entities/workflow/references/workflow-references.ts:8-12` lists `subWorkflowNodeReference` and `errorWorkflowReference`. `error-workflow.reference.ts:21-31` skips `'DEFAULT'` and values that start with `=`.
- `n8n-packages/entities/workflow/workflow-dependency-resolver.ts:48-56`: an id that the finder does not return (deleted or not accessible) stays a requirement of its parent.
- `n8n-packages/n8n-packages.service.ts:336-341` compares the requirements with the workflows in the package. A workflow of a personal project is never in an instance Promote package, because only team projects are exported.
- `n8n-packages/entities/workflow/static-sub-workflow-requirements.ts:22-31` throws `PackageExportBlockedError` with the message `` `${size} workflow ${dependencyLabel} not included in the package. Export aborted.` ``.
- The throw happens inside the `try` at `promotions.service.ts:275-283`, before the package folder is replaced (286-287) and before the commit. The `finally` at 317-319 removes the staging folder. So nothing is pushed.
- The source comment at `promotions.ee/instance-package.ts:42-43` states the same: "a team workflow calling a personal sub-workflow blocks the whole promotion; intended for now, see LIGO-1089".

**Corrected statement.** Same as the claim, with one precision: only static references count (a sub-workflow node with a fixed id, or `settings.errorWorkflow` that is not `DEFAULT` and not an expression). The failure is an HTTP 400 and nothing is pushed.

---

## F13

**Statement.** For the instance Promote dependency failure, the public API error response keeps only the message, so the workflow ids are lost.

**Verdict.** confirmed

**Evidence.**

- The file is `packages/@n8n/backend-services/src/errors/rest-error-response.ts`. Lines 66-70: `case RestErrorKind.userError: return { status: 400, body: { message: descriptor.message } }`.
- `PackageExportBlockedError extends UserError` (`n8n-packages/entities/package-export.errors.ts:10`) and is not a `ResponseError`, so `classifyRestError` returns `{ kind: userError, message }` (`packages/@n8n/backend-services/src/errors/rest-error-classifier.ts:66-68`). The descriptor has no `description` field.
- The ids are only in `description` (`static-sub-workflow-requirements.ts:26-30`).
- Nothing between the throw and the response rewraps the error: `observePromotion` rethrows the original (`promotions.ee/promotion-telemetry.ts:55-62`), and `promotePackage` has no catch (`promotions.public.controller.ts:556-567`). `sendPublicApiErrorResponse` (`packages/cli/src/public-api/v1/public-api-error-response.ts:24-64`) does not log a user error, so the ids are not in the server log either.
- Contrast: the package export endpoint keeps the description on purpose (`n8n-packages.public.controller.ts:275`). The promotions controller does not.

**Corrected statement.** Same as the claim. The response is `400 { "message": "N workflow dependency/dependencies not included in the package. Export aborted." }`. The `description` that holds the workflow ids is dropped.

---

## F14

**Statement.** For the instance Promote dependency failure, the user sees a toast that shows a count and the raw workflow ids.

**Verdict.** wrong (the count is right, the ids are not shown)

**Evidence.**

- The UI calls the public API, not an internal REST endpoint: `packages/modules/promotions/frontend/src/promotionsSettings.api.ts:175-185` (`makePublicApiRequest(... '/promotions/environments/${environmentId}/promote')`). So the response body is the one from F13: `{ message }` only.
- `packages/frontend/@n8n/rest-api-client/src/utils.ts:203-218` builds a `ResponseError` from `message`, `code`, `stack`, `meta`, `hint`. It reads no `description`.
- `PromoteInstanceDialog.vue:110-111`: `toast.showError(error, i18n.baseText('settings.promotions.promote.toast.error'))`.
- `packages/frontend/@n8n/composables/src/useToast.ts:223-243`: the toast shows the title, then `error.message`, then `error.description` only when it exists. It does not exist here.
- `packages/modules/promotions/frontend/src/promoteErrorMessage.ts:17-36` handles only the "workflows moved between projects" meta. It has no branch for this error.

**Corrected statement.** For the instance Promote dependency failure, the user sees an error toast with the generic Promote title and the message "N workflow dependency/dependencies not included in the package. Export aborted." The toast shows the count only. The workflow ids exist only in the server-side `description`, which the public API drops, so no surface shows them.

---

## F15

**Statement.** Instance Promote exports team projects only. Personal projects are never exported. So a credential owned by a personal project always lands in the top-level collection.

**Verdict.** confirmed, with two conditions that the claim leaves out

**Evidence.**

- Team projects only: `promotions.service.ts:262-264` and `project.repository.ts:97-104`. A project Promote refuses a personal project: `promotion-environment.resolver.ts:52-54` and `promotions.service.ts:1451-1458`.
- Routing: `n8n-packages/io/manifest-entry.ts:75-82` (`projectScopedDirectory`): the owner project's directory is used only when the owner id is in `projectTargetsById`, "otherwise the top-level collection directory". `n8n-packages/entities/credential/credential.exporter.ts:92-96` passes the `credential:owner` project (148-150).
- Test that shows the intent: `n8n-packages/__tests__/export-project.integration.test.ts:484-502`, "keeps a credential owned by a non-exported project at the package top level".
- Condition 1: only a credential that an exported workflow uses is exported (`credential.exporter.ts:58-60`, driven by `requirements.credentials`).
- Condition 2: the file is written only when the promoting user can read the credential: `findCredentialForUser(credentialId, request.user, ['credential:read'])` at `credential.exporter.ts:61-65`, then `if (credential)` at 74. Otherwise only a requirement row is written (106-111). The built-in owner and admin roles hold both `promotions:promote` and global `credential:read` (`packages/@n8n/permissions/src/roles/scopes/global-scopes.ee.ts:29, 82, 225`), so with these roles the condition holds.

**Corrected statement.** Instance Promote exports team projects only, and personal projects are never exported. A credential that a personal project owns, that an exported team workflow uses, and that the promoting user can read, is written to the top-level `credentials/` directory. A credential that the user cannot read gets a requirement row and no file. A credential that no exported workflow uses is not exported.

---

## F16

**Statement.** Personal project data is already sanitized in promotion messages: `toInstanceProject` in cross-project-moves.ts removes personal project names, and Apply preview excludes the personal credential route. The source comment at the `Fail` policy names the personal-dependency limitation and references LIGO-1089.

**Verdict.** confirmed (each fact holds; one framing note)

**Evidence.**

- `promotions.ee/cross-project-moves.ts:86-93`: `toInstanceProject` returns `{ id, name }` for a team project and `{ id }` otherwise. Lines 95-98 print "a personal project". Tests: `__tests__/cross-project-moves.test.ts:67-97`.
- Other message sites do the same: `promotions.service.ts:728-732` (`classifySelection`), `promotions.service.ts:1663-1669` (`describeWorkflowsMovedToPersonalProjects`), `promotion-change.service.ts:185` (preview `movedToProject`).
- `promotions.ee/apply-preview.service.ts:79-80`: `credentialPersonalRoute: CredentialPersonalRoute.Exclude`.
- `promotions.ee/instance-package.ts:42-44`: the comment names the limitation and LIGO-1089.

**Framing note.** `CredentialPersonalRoute.Exclude` is not message sanitization. It is a credential matching rule: the matcher does not bind the applying user's own personal credential (`n8n-packages/n8n-packages.types.ts:183-191`, `n8n-packages/entities/credential/credential-matcher.ts:105`). It is set in `applySelectionRequest`, which the Apply preview (`apply-preview.service.ts:135`), the selective Apply (`promotions.service.ts:938`) and the instance Apply (`promotions.service.ts:1009`) all use. So it applies to the real Apply too, not only to the preview.

**Corrected statement.** Promotion messages and preview data leave out personal project names (`toInstanceProject`, `classifySelection`, `describeWorkflowsMovedToPersonalProjects`). Separately, every Apply and the Apply preview set `CredentialPersonalRoute.Exclude`, which stops the matcher from binding the applying user's personal credential. The comment at the `Fail` policy names the personal-dependency limitation and LIGO-1089.

---

## F17

**Statement.** The promotion branch is one cumulative package. A project or selective push overlays its export onto the branch. When the branch already holds a dependency (for example a credential) under another project's folder, that copy wins and the overlay does not write a second top-level copy. So "owner not in the package" happens only when the owner was never promoted or is personal.

**Verdict.** partly-wrong (the overlay facts are right; the last inference misses a case)

**Evidence for the overlay facts.**

- Overlay: `promotions.service.ts:511-517` calls `workingCopy.applySelection`. `promotions.ee/working-copy-updater.ts:409` copies the current package, then 439 overlays the staging export.
- Skip rule: `working-copy-updater.ts:550-581` (`partitionChangedDependencies`). When the branch holds the same id under another project's directory (`underOtherProject`, 572-574), the staging target goes into `outOfScopeInStaging`. `overlayDirectory` skips it (`keptFiles.has(relative)`, line 681).
- Scope of the rule: `DEPENDENCY_COLLECTIONS = ['credentials', 'dataTables', 'tags']` (line 35). Variables are not in it.
- Test: `__tests__/working-copy-updater.test.ts:1142-1177`, "keeps a dependency the branch holds under a project the push does not export". It expects `projects/beta/credentials/c1/credential.json` to stay and `credentials/c1/credential.json` to be absent.
- "Cumulative" holds for project and selective pushes only. An instance Promote replaces the whole package folder: `promotions.service.ts:285-287` (`rm(packageFolder)` then `rename(stagingFolder, packageFolder)`).

**Evidence against the last sentence.** The skip needs a copy of that dependency on the branch under the other project (`dependencies` comes from the file scan, `working-copy-updater.ts:171-175`). The owner project can be on the branch without that copy. A project or selective push of Beta writes only the credentials that the selected Beta workflows use (`credential.exporter.ts:58-60`). So a credential that Beta owns and only an Alpha workflow uses is absent under `projects/beta/` after a Beta push. A later Alpha push exports only Alpha (`projectIds: [selection.projectId]`, `promotions.service.ts:496`), so the exporter places the credential at the top level (`manifest-entry.ts:75-82`), the scan finds no copy under Beta, and the overlay writes the top-level copy. The owner project is promoted and is a team project, but the credential still sits at the top level.

**Corrected statement.** A project or selective push overlays its export onto the package that the branch holds. An instance Promote replaces the package. For credentials, data tables and tags, when the branch already holds the same id under another project's directory, the overlay keeps that copy and skips the top-level copy of the push. A dependency sits at the top level of the branch when (a) its owner is a personal project, (b) its owner team project was never promoted, or (c) its owner team project is on the branch but no earlier push wrote that dependency under it.

---

## F18

**Statement.** A selective Promote overlay regenerates (rewrites) the manifest. The bridge rebuilds manifest entries from the files (id, name, target) and drops metadata that is not in a file or file path.

**Verdict.** partly-wrong (right for six collections; not right for variables and requirements)

**Evidence.**

- Rewrite: `working-copy-updater.ts:440-446` calls `writeImportManifest` after the overlay. The overlay itself skips the staging `manifest.json` (line 681).
- Rebuilt from files: `promotions.ee/import-manifest-bridge.ts:25-32, 126-172`. `walkSnapshotCollections` walks `project.json`, `folder.json`, `workflow.json`, `credential.json`, `data-table.json`, `tag.json`. `readIdNameFile` (174-194) reads `id` and `name` from the file and takes `target` from the path. A workflow entry also gets `isArchived` from the file (153-158).
- Not rebuilt from files:
  - Variables: `collectVariables` (196-223) merges the entries of the previous branch manifest and the staging manifest by id. The file is used only as an existence check.
  - Requirements: `requirementsBlock` and `mergeRequirementRows` (244-327) merge the rows of the previous manifest and the staging manifest. `usedBy` is filtered to workflows that remain on disk (329-338). Consumers that are not workflows are dropped (307, 334-337).
- Header fields are written new: `packageFormatVersion: '1'`, `sourceN8nVersion: getN8nVersion()`, `sourceId` of this instance (113-116).
- Unknown fields are dropped twice: the previous manifest is read through `packageManifestSchema.safeParse` (46-47) and the result is written through `packageManifestSchema.parse` (121). The schema has no passthrough (`n8n-packages/spec/manifest.schema.ts:7-27, 49-64`), and an entry holds only `id`, `name`, `target`, plus `isArchived` for a workflow.
- The file comment calls this a temporary bridge (17-23).

**Corrected statement.** A project or selective Promote overlay rewrites `manifest.json`. The bridge rebuilds the project, folder, workflow, credential, data table and tag entries from the files on disk: `id` and `name` from the file, `target` from the path, and `isArchived` for a workflow. Any other field on those entries is dropped. Variable entries and the `requirements` block are not rebuilt from files: they are merged from the previous branch manifest and the staging manifest. Fields that the manifest schema does not know are dropped in all cases.

---

## Missed behaviors

### M1. Project and selective Promote run only on an instance-scope environment

`resolveForProject` prefers the project's own environment (`promotions.ee/promotion-environment.resolver.ts:56-58`). `promoteSelectionResolved` then calls `assertInstanceScope(input, 'Promote')` (`promotions.service.ts:436-437`), which throws "Promote is only available on an instance environment. Project environments are not supported yet." (`promotions.service.ts:1438-1449`). The comment at 436 says the assertion needs a change for project-scoped promotions. The preview path (`promotion-change.service.ts:85`, `promotions.service.ts:1179-1184`) has no such assertion. So a project with its own Promote environment can be previewed but cannot be promoted today. This matters for the "per-project connections" consistency question.

### M2. The overlay does not refresh a dependency that it keeps, and it never removes one

When the branch copy under another project wins, the staging copy is skipped as a whole (`working-copy-updater.ts:572-574, 681`). So the push does not update the name or the exported values of that credential, data table or tag on the branch, even when it changed on the instance. Only a push that exports the owner project, or an instance Promote, updates it. The overlay also keeps a dependency that no remaining workflow uses (`__tests__/working-copy-updater.test.ts:1123-1140` "keeps a dependency directory that staging does not re-include", and 846 "keeps an unused dependency that belongs to another project"). The branch state after selective pushes can so differ from the state after an instance Promote of the same instance.

### M3. Promote is refused when a workflow on the branch now belongs to a personal project

Instance Promote: `assertNoProjectMovesSinceBranch` reads the branch manifest and throws a 400 when a branch workflow has an owner here whose type is not `team` (`promotions.service.ts:1359-1365`). The message is "A promotion does not include personal projects, so these workflows would be deleted on the destination: … Move them back to the team project the branch holds them in, then promote again." (`promotions.service.ts:1663-1669`). Project and selective Promote: `classifySelection` puts a selected id that another project owns into `deletedWorkflowIds` and `movedTo` (`promotions.service.ts:720-734`), and the push is refused with `PromotionsWorkflowsMovedCrossProjectError` (`promotions.service.ts:472-476`). So a move to a personal project blocks Promote before any dependency check runs. Tests: `__tests__/promotions.service.test.ts:393-412, 1551-1575`.

---

## Second check

### F14 (first verdict: wrong) - upheld

I read the code myself and reach the same verdict. The count is right. The ids are not shown.

- The dialog calls `promotePackage` (`packages/modules/promotions/frontend/src/components/PromoteInstanceDialog.vue:104-110`). That function calls `makePublicApiRequest` on `/promotions/environments/:id/promote` (`promotionsSettings.api.ts:175-185`).
- The error is thrown by `assertStaticSubWorkflowsIncluded` as `PackageExportBlockedError` (`n8n-packages/entities/workflow/static-sub-workflow-requirements.ts:24-31`, called at `n8n-packages.service.ts:336-341`). The message holds the count. The ids are only in `description`. The instance request uses `ExportDependencyPolicy.Fail` (`promotions.ee/instance-package.ts:42-44`).
- `PackageExportBlockedError extends UserError` (`package-export.errors.ts:10`). `classifyRestError` returns `{ kind: userError, message }` (`backend-services/src/errors/rest-error-classifier.ts:66-68`). `serializePublicApiError` returns `{ message }` only (`rest-error-response.ts:66-70`). The public controller (`public-api/v1/controllers/promotions.public.controller.ts:556-567`) and `promoteResolved` (`promotions.service.ts:240-330`, try/finally only) do not rewrap it. The registry routes errors to `sendPublicApiErrorResponse` (`public-api-controller.registry.ts:297, 431-495`).
- The client builds `ResponseError` from `message`, `code`, `stack`, `meta`, `hint` (`rest-api-client/src/utils.ts:207-213`). `useToast.showError` shows `error.description` only when it exists (`composables/src/useToast.ts:223-237`). It does not exist here. `promoteErrorMessage.ts` is not used by this dialog and handles only the moved-cross-project meta.
- So F13 and F14 describe the same surface chain. F13 holds; F14 is wrong on the ids. The corrected statement of the first checker stands.

### F17 (first verdict: partly-wrong) - upheld

Same verdict. The overlay facts hold. The last inference misses a case.

- Selective and project push export only the selected project: `projectIds: [selection.projectId]` (`promotions.service.ts:493-508`), then `workingCopy.applySelection` (511-517).
- Skip rule: `partitionChangedDependencies` (`working-copy-updater.ts:550-581`) skips the staging target only when the branch file scan (171-175) found the same id under another project target (572-574). `overlayDirectory` skips that path (681). Rule scope: `DEPENDENCY_COLLECTIONS = ['credentials', 'dataTables', 'tags']` (35). Test: `__tests__/working-copy-updater.test.ts:1142-1177`.
- Missed case confirmed. Credential requirements come only from exported workflows (and agents): `n8n-packages.service.ts:303-309, 347-354`; the project exporter merges only folder and workflow requirements (`entities/project/project.exporter.ts:134, 200`). So a push of Beta does not write a Beta-owned credential that only Alpha workflows use. A later Alpha push routes it to the top level because Beta is not in `projectTargetsById` (`io/manifest-entry.ts:72-80`). The scan finds no copy under Beta, so nothing is skipped and the top-level copy is written. Beta is a promoted team project, but the credential sits at the top level.
- Instance Promote replaces the package (`promotions.service.ts:285-287`). It exports every team project together, so case (c) arises only on a branch built by project or selective pushes.
- The corrected statement of the first checker stands.

### F18 (first verdict: partly-wrong) - upheld

Same verdict.

- Rewrite: `working-copy-updater.ts:439-446` (overlay, then `writeImportManifest`). The overlay skips the staging `manifest.json` (681).
- Rebuilt from files: `import-manifest-bridge.ts:25-32, 126-194`: id and name from the file, target from the path, `isArchived` for a workflow.
- Not rebuilt from files: variables are merged from the previous manifest and staging by id; the file is only an existence check (`collectVariables`, 196-223). Requirements are merged from the previous manifest and staging (`requirementsBlock` and `mergeRequirementRows`, 244-327), with `usedBy` limited to workflows still on disk (329-338).
- Unknown fields are dropped: `safeParse` on read (46-47), `parse` on write (121). `manifestEntrySchema` and `packageManifestSchema` are plain `z.object` without passthrough (`n8n-packages/spec/manifest.schema.ts:7-27, 49-64`).
- Extra note, not settled by my reading: the schema has `agents` and `skills` collections, but the bridge does not walk them and does not carry them over from the previous manifest. The selective export does not set `includeAgents: false` (`promotions.service.ts:493-508`; `n8n-packages.service.ts:498-499`). If staging can hold agents, their entries would be missing from the rewritten manifest. I did not check whether the agent exporter writes anything for a workflow-only selection.
- The corrected statement of the first checker stands.
