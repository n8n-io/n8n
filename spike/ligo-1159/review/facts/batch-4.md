# Batch 4: Credential creation and sharing, import planning, permissions

Checkout: `/Users/ireneeajeneza/conductor/workspaces/n8n/hamburg-v1` (one commit after `ed626a767fa`). Method: code reading only. No build, test or application run. Paths are relative to the repository root.

Short path names used below:

- `FE` = `packages/modules/promotions/frontend/src`
- `PKG` = `packages/cli/src/modules/n8n-packages`
- `PROMO` = `packages/cli/src/modules/promotions.ee`

| id | verdict |
|---|---|
| F28 | confirmed |
| F29 | confirmed |
| F30 | partly-wrong |
| F31 | partly-wrong |
| F32 | partly-wrong |
| F33 | confirmed |
| F34 | partly-wrong |
| F35 | confirmed |
| F36 | confirmed |

---

## F28

**Statement.** The binding UI creates a missing credential through the public POST /credentials with id = source id in `ownerProject`, and creates a missing owner project first. It does not share the credential with consumer projects, and it rejects a creation that lands in a project other than `ownerProject`. Continue then fails with access-required for any other consuming project. So a credential owned by team project Q and shared with P takes three Apply rounds and a manual share.

**Verdict.** confirmed (with conditions, see the corrected statement).

**Evidence.**

- `FE/composables/usePromotionBindingCreation.ts:156-168`: the editor callback calls `ensureProject(projectId, 'credential')`, then `createPublicCredential(rootStore.publicApiContext, { id: binding.sourceId, ..., projectId, isResolvable: false })`. `packages/frontend/@n8n/rest-api-client/src/api/credentials.ts:7-12` sends `POST /credentials` on the public API. The function makes no share call.
- `usePromotionBindingCreation.ts:98-101, 224`: the editor destination is `binding.ownerProject`.
- `usePromotionBindingCreation.ts:70-96`: `ensureProject` calls `createPublicProject(..., missing)` when the project is in `check.missingProjects`. It then refuses a project that is not a team project or where the user cannot create (`destinationDenied`, lines 92-94).
- `FE/composables/usePromotionBindings.ts:62-72, 218-221`: `matchesCreation` requires `created.id === binding.sourceId`, the same type, and `created.projectId === binding.ownerProject.id`. A mismatch sets the error `creationMismatch` and the binding stays missing. The check runs after the POST, so the credential that was created stays on the instance.
- Backend, after the credential exists in Q only: `PKG/entities/credential/credential-matcher.ts:101-107` matches against `getCredentialsAUserCanUseInAWorkflow(user, { projectId })`. `packages/cli/src/credentials/credentials.service.ts:681-685` keeps a credential only if the project holds it, the personal route applies, or it is global. This holds for a global owner too. `credential-matcher.ts:136-143` sets the reason `access-required`. `PROMO/apply-preview.ts:477-481, 495-505` puts it in `accessRequirements`. `PROMO/promotions.service.ts:1140-1143` blocks Apply on it. The response is HTTP 200 with `status: 'blocked'`, not an error.
- Dialog behavior: `usePromotionBindings.ts:26` ("Access is granted outside the dialog"), `:145-146` (mode `blocked` when `accessRequirements` is not empty). `FE/components/PromotionBindingsDialog.vue:96` ("A blocked apply cannot continue"), `:311-313` (restart text), `:483-484` (no submit button in mode `blocked`).
- The count: Apply (blocked, missing binding) -> create in Q -> Continue (blocked, access-required) -> share by hand outside the dialog -> new Apply. That is three submissions.
- Conditions: `PROMO/apply-preview.ts:482-491` offers the creation only when the package holds the credential file under a project directory. If the file is in the top-level `credentials/` directory, the check returns the conflict `unknown-owner` and offers no creation. A second UI path exists: `FE/components/preview/PromotionBlockers.vue:50-51, 224-229` creates the binding from the preview and reloads the check, before any Apply.

**Corrected statement.** The binding UI creates a missing credential through the public `POST /credentials` with id = source id in `ownerProject`. It first creates the owner project through public `POST /projects` when `missingProjects` lists it. It does not share the credential. After the POST, it accepts the result only if id, type and project match; a mismatch shows `creationMismatch` but the created credential stays. Continue then returns `blocked` with `access-required` for each consumer project that does not own the credential. The dialog cannot resolve that; the user shares by hand and starts a new Apply. So the case "owned by team project Q, used by P" takes three submissions (Apply, Continue, Apply) and a manual share in the dialog path. This needs Q in the package; otherwise the result is `unknown-owner` with no creation offered.

---

## F29

**Statement.** Generic package import with `create-stub` plans a credential stub per consuming project scope. With `id-only` matching and a credential used in two projects, the second create fails after the first project was already written (partial writes). Other matching modes create duplicates.

**Verdict.** confirmed (by code reading; no test covers the case).

**Evidence.**

- Requirements are cut to one project: `PKG/engine/project-package-importer.ts:370-374` (`identifyRequirements(manifest.requirements?.credentials, workflows, agents)`). Each project is one scope: `:173-191`, and `PKG/engine/import-orchestrator.ts:388-393` (`for (const input of inputs) plans.push(await this.planScope(input, mode))`).
- Stub ids per scope: `PKG/entities/credential/credential-importer.ts:71-76`: `request.matchingMode === 'id-only' ? sourceId : generateNanoId()`. `PKG/entities/credential/credential-missing-mode.ts:41-54` removes duplicates inside one scope only.
- Stub lands in the consuming project: `credential-importer.ts:249-268` calls `createStubCredential({ id: targetId, ..., projectId: context.projectId })`.
- No cross-scope stub check: `import-orchestrator.ts:314-381` reconciles credential updates, tags, variables and quota across scopes, but not `stubIds`.
- Write order: `project-package-importer.ts:212` creates the project shells, `:227-233` applies the scopes one after the other. `import-orchestrator.ts:569-577` writes tags and folders of a scope before its credentials. No transaction wraps the import (search for `transaction|TransactionRunner` in `PKG` finds only the skill importer and agent publisher).
- Second create fails: `packages/cli/src/credentials/credentials.service.ts:2205-2219` turns `CredentialIdConflictError` into `BadRequestError('Cannot create credential stub: a credential with id "..." already exists')`. `packages/@n8n/db/src/repositories/credentials.repository.ts:92` throws it on a unique constraint error.
- Other modes: each scope gets its own `generateNanoId()`, so each consuming project gets its own stub.
- Searched `PKG/__tests__` for a test of a stub used in two projects: none found. `import-credential-conflict.integration.test.ts:1020` covers an existing shared credential (update once), not a missing one. The ticket ids LIGO-1250 and LIGO-1091 do not appear in the code.

**Corrected statement.** Same as the claim. Detail: at the failure, the project shells, all content of the first project, and the tags and folders of the second project are already written. Related inference from the same code: `canStubNotFoundFailure` (`credential-missing-mode.ts:9-13`) does not read the `reason`, so with `create-stub` + `id-only` a credential that exists on the instance but is not usable in the target project is also planned as a stub with its own id, and that create fails the same way. Promotion Apply does not use `create-stub` (`PROMO/promotions.service.ts:136-137`: `id-only`, `must-preexist`).

---

## F30

**Statement.** Apply can create a missing project with the source project ID, and can create a missing credential with the source credential ID through the existing binding and setup flow (missingBindings, accessRequirements).

**Verdict.** partly-wrong. The code settles the conflict with F24: the Apply engine never creates a credential.

**Evidence.**

- Project: the engine creates a missing project with the source id. `PKG/entities/project/project-importer.ts:97-105` calls `createTeamProject(user, ..., { id: item.sourceProjectId, ... })`. Apply uses `projectConflictPolicy: Overwrite` (`PROMO/promotions.service.ts:130`). `PROMO/apply-preview.service.ts:256` comment: "Instance-wide Apply creates missing projects".
- Credential: Apply uses `credentialMatchingMode: 'id-only'` and `credentialMissingMode: 'must-preexist'` (`PROMO/promotions.service.ts:136-137`; selection Apply: `PKG/n8n-packages.service.ts:114-115`). With `must-preexist` every failure blocks (`PKG/entities/credential/credential-missing-mode.ts:27`) and `credentialsToStub` returns nothing (`:44`).
- The cited test `PROMO/__tests__/promotions-package.integration.test.ts:1169-1311` shows this. Apply returns `blocked` with `missingBindings` and writes nothing (lines 1179-1196). The test client creates the project (`POST /projects`, line 1222) and the credential (`POST /credentials` with `id: credential.id`, lines 1237-1259). A credential with another id does not resolve the binding (lines 1245-1258). Continue then returns `applied` with `counts.projects.created` = 0 and `credentials` = `{ matched: 1, stubbed: 0, updated: 0 }` (lines 1286-1288).
- `accessRequirements` creates nothing. It reports a credential that exists but is not shared with the consumer project (`PROMO/apply-preview.ts:477-481, 495-505`). The dialog cannot resolve it (`FE/composables/usePromotionBindings.ts:26, 145-146`).

**Corrected statement.** The Apply engine creates a missing project with the source project id. It never creates a credential: a missing credential blocks Apply and is reported in `missingBindings`. The client (binding UI, or an API caller) creates the credential with the source id through public `POST /credentials`, then calls Continue, and the engine matches it by id. `accessRequirements` is a block for an existing credential that the consumer project cannot use; no flow creates or shares anything for it. This matches F28.

---

## F31

**Statement.** Instance Apply plans every package project separately. There is no package-wide view of shared dependencies.

**Verdict.** partly-wrong. The first sentence is right. The second sentence is too strong.

**Evidence.**

- Per-project planning: `PKG/engine/project-package-importer.ts:173-191` builds one input for each project. `PKG/engine/import-orchestrator.ts:388-393, 422-456` plans each scope alone. Credential match and stub planning run per scope (`import-orchestrator.ts:456`, `PKG/entities/credential/credential-importer.ts:59-76`) with requirements cut to that project (`project-package-importer.ts:370-374`).
- Package-wide steps that exist:
  - `import-orchestrator.ts:343-362`: "Across scopes: one destination credential can be reached from several projects": forbidden updates, conflicts and planned updates of credentials are merged across scopes. Test: `PKG/__tests__/import-credential-conflict.integration.test.ts:1020` ("writes a credential used in two projects of a project package once").
  - `project-package-importer.ts:149-155` reads the credential files once for the import; `:162` builds one credential update scope from all selected projects; `:216-218` resolves workflow ids across projects for sub-workflow references.
  - `import-orchestrator.ts:320-341, 364-379`: tags, variable overwrites and variable quota are reconciled across scopes. `:407-415`: skills.
  - Promotion check: `PROMO/apply-preview.ts:405-412, 438-517` groups credential issues by source id over all projects, merges the consumers, and returns one `missingBindings` or `accessRequirements` entry for each credential, with `ownerProject` from the package file location.
- What is missing: a package-wide plan for creating or sharing a credential. Stub ids are not reconciled across scopes (see F29), and usability is decided per consumer project.

**Corrected statement.** Instance Apply plans each package project as its own scope, and credential matching runs per consumer project. Several package-wide steps exist: credential updates, tags, variables, skills and workflow ids are reconciled across scopes, and the promotion check merges credential blockers by credential id across projects. No package-wide step plans the creation or the sharing of a credential used by several projects.

---

## F32

**Statement.** A shared import plan and source/revision protection already exist: `planImport` / `applyPlan` in the project package importer, `applySelectionResolved` in the promotions service, and `previewRevision` in apply-preview.ts. Apply already has a read-only plan, dependency checks, source commit checks and a preview revision.

**Verdict.** partly-wrong. All named items exist. The last sentence is not true for every Apply flow.

**Evidence.**

- `PKG/engine/project-package-importer.ts:105-201` `planImport` ("Writes no data"), `:204-208` `applyPlan` refuses a plan with issues. `PKG/n8n-packages.service.ts:635-674` exposes `planPackage`, `planPackageSelection`, `applyPackagePlan`.
- `PROMO/promotions.service.ts:897-974` `applySelectionResolved` (private). `PROMO/apply-preview.ts:631-638` `previewRevision` (sha256 of resources and check).
- Dependency checks: `PROMO/apply-preview.ts:174-260` (`toPreviewCheck`), `PROMO/promotions.service.ts:1132-1157` (`isBlocked`).
- Source commit check: `promotions.service.ts:1073-1095` (`readApplyTip` returns `source-changed`). `expectedSource` is optional on the first Apply and required on Continue (`packages/@n8n/api-types/src/dto/promotions/promotion-operations.dto.ts:129, 150, 181, 190`).
- Preview revision: only the project selection Apply checks it, and only when the caller sends `expectedPreviewRevision` (`promotions.service.ts:912-926`; DTO lines 182, 191). Instance Apply (`applyResolved`, `promotions.service.ts:991-1042`) has no revision check. The preview itself is project-scoped (`PROMO/apply-preview.service.ts:104-173`).
- "Read-only": the preview plans in mode `check` (`apply-preview.service.ts:134-138`). Apply plans in mode `enforce` (`promotions.service.ts:941, 1011`), where policy checks write audit events (`project-package-importer.ts:101-103`). No resource data is written in either mode.

**Corrected statement.** `planImport` / `applyPlan`, `applySelectionResolved` and `previewRevision` exist. Both Apply flows build a plan that writes no resource data, run the dependency check on it, and can compare the source commit (`expectedSource`, optional on the first call, required on Continue). The preview and its revision exist for project Apply only, and the revision check is optional. Instance Apply has no preview revision.

---

## F33

**Statement.** Credential export deduplicates by credential ID (`groupByCredentialId`). A credential used by several projects is not duplicated at export in this path.

**Verdict.** confirmed.

**Evidence.**

- `PKG/entities/credential/credential.exporter.ts:58-60` iterates `this.groupByCredentialId(request.requirements)`. `:146-163` groups by `requirement.credentialId` and collects `usedBy`.
- One file for each credential, under the owner project when that project is in the export: `:88-103` with `projectScopedDirectory('credentials', this.ownerProjectId(credential), request.projectTargetsById)`. `PKG/io/manifest-entry.ts:70-81`: otherwise the top-level `credentials/` directory.
- Test: `PKG/__tests__/export-project.integration.test.ts:505-540` ("writes a credential shared across two exported projects once, under its owner"): one manifest entry, two `usedBy` consumers.

**Corrected statement.** Same as the claim. The single file goes under the owner project directory when the owner is in the export, else in the top-level `credentials/` directory. The manifest requirement lists every consumer in `usedBy`.

---

## F34

**Statement.** The public API has no endpoint that shares a credential with a project. It has PATCH (with isGlobal) and PUT /:id/transfer only. So an API or CLI user cannot resolve `access-required` through the public API.

**Verdict.** partly-wrong. No share endpoint exists. The conclusion is too strong.

**Evidence.**

- Routes of `packages/cli/src/public-api/v1/controllers/credentials.public.controller.ts`: `GET /` (153), `GET /:credentialId` (189), `POST /` (210), `PATCH /:credentialId` (266), `DELETE /:credentialId` (457), `PUT /:credentialId/transfer` (487), `POST /:credentialId/test` (508), `GET /schema/:credentialTypeName` (532), `GET /:credentialId/dependencies` (555). No share route.
- The share route is internal only: `packages/cli/src/credentials/credentials.controller.ts:569-571` (`PUT /credentials/:credentialId/share`, `@Licensed('feat:sharing')`).
- Public workflow transfer does not pass `shareCredentials`: `packages/cli/src/public-api/v1/controllers/workflows.public.controller.ts:538-557`.
- CLI: `packages/@n8n/cli/src/commands/credential/` holds `create`, `delete`, `get`, `list`, `schema`, `transfer`. No share and no update command.
- Two public routes can clear the blocker, each with a side effect:
  - `PATCH` with `isGlobal: true` (`credentials.public.controller.ts:297-307`, needs the sharing licence and `credential:shareGlobally`). A global credential is usable in every project: `packages/cli/src/credentials/credentials.service.ts:681-685` (`|| c.isGlobal`). The matcher then finds it.
  - `PUT /:id/transfer` to the consumer project (`:487-506`). `packages/cli/src/credentials/credentials.service.ee.ts:262-276` removes every sharing and makes the destination the owner. With two or more consumer projects, the others then lose access.

**Corrected statement.** The public API and the CLI have no way to share a credential with one project. A public API user can clear `access-required` only by making the credential global (`PATCH isGlobal: true`) or by transferring it to the consumer project, which changes the owner and drops all other shares. The CLI has only the transfer. No public route keeps the owner and grants access to one more project.

---

## F35

**Statement.** `EnterpriseCredentialsService.shareWithProjects` adds shares and does not check the caller's permission. The internal credentials controller does the `credential:share` check before it calls the service.

**Verdict.** confirmed.

**Evidence.**

- `packages/cli/src/credentials/credentials.service.ee.ts:44-97`: the method checks that the credential exists with `usageScope: 'project'` (51-54), loads the target projects, removes projects that already own the credential (82-87), and saves `credential:user` rows (89-97). It has no `credential:share` check and no check of the caller's access to the credential.
- One caller-dependent filter exists: a caller without global `project:list` gets only the team projects where the caller has a role with `project:list` (56-73). Other requested team projects are dropped without an error. Personal projects are not filtered.
- `packages/cli/src/credentials/credentials.controller.ts:603-610`: `userHasScopes(req.user, ['credential:share'], false, { credentialId })`, else `ForbiddenError`. `:612-620`: the same for `credential:unshare`. `:630-635`: then `shareWithProjects`. The cited line 604 is correct.
- Second caller: `packages/cli/src/workflows/workflow.service.ee.ts:1263-1291` filters the credential ids by `credential:share` before it calls the service.

**Corrected statement.** `shareWithProjects` adds `credential:user` shares and does not check `credential:share` or any credential permission of the caller. It only drops target team projects that a caller without global `project:list` cannot list. The internal controller (`PUT /credentials/:credentialId/share`, licence `feat:sharing`) checks `credential:share` and `credential:unshare` before the call.

---

## F36

**Statement.** All `promotions:*` scopes are global scopes held only by the global owner and admin roles. The project routes /promotions/projects/:projectId/... also use @GlobalScope. An owner or admin can read every project credential, including those in other users' personal projects. So the "user cannot access the dependency" case does not occur today.

**Verdict.** confirmed.

**Evidence.**

- `packages/@n8n/permissions/src/roles/scopes/global-scopes.ee.ts:75-86`: the twelve `promotions:*` scopes are in `GLOBAL_OWNER_SCOPES`. `:225`: `GLOBAL_ADMIN_SCOPES = GLOBAL_OWNER_SCOPES.concat()`. `:227-259`: the member scopes hold none. A search for `promotions:` in the other files of `roles/scopes/` (project, credential-sharing, workflow-sharing) finds nothing.
- Custom roles cannot hold them: `packages/@n8n/permissions/src/roles/custom-role-scopes.ee.ts:88-271, 350-353` (the allowed scope lists for custom global and project roles have no `promotions` entry). `packages/@n8n/backend-services/src/services/role.service.ts:235-242` rejects any scope outside that list.
- `packages/cli/src/public-api/v1/controllers/promotions.public.controller.ts:690-693, 719-722, 744-747`: project promote, apply and apply/continue carry `@GlobalScope`. The two project preview routes (`:630-632`, `:653-655`) carry no `@GlobalScope`; `PROMO/promotion-change.service.ts:303-310` checks `hasGlobalScope(user, scope)` in the service instead. The effect is the same.
- `packages/@n8n/backend-services/src/credentials/credentials-finder.service.ts:98-102, 172-180`: with the global scopes, `access` is `null` and the query returns every project credential. Owner and admin hold `credential:read`, `credential:use`, `credential:update`, `credential:share` (`global-scopes.ee.ts:28-40`).
- Limit of the conclusion: read access is not project usability. `packages/cli/src/credentials/credentials.service.ts:681-685` still requires that the consumer project holds the credential or that it is global, so `access-required` occurs today for owners and admins (see F28). An API key with fewer scopes than its user can also be refused (`promotions.public.controller.ts:774-781`, `PKG/engine/import-orchestrator.ts:251-267`).

**Corrected statement.** Same as the claim, with two precisions. Three of the five project routes use `@GlobalScope`; the two preview routes enforce the same global scope in the service. The caller of Promote or Apply can always read and change the dependency, so no user-permission gap exists today. The blocker that does occur is `access-required`, which is about the consumer project, not about the user.

---

## Missed behaviors

### M1. The package carries no owner, sharing or global flag for a credential. The owner comes only from the file location.

- `PKG/entities/credential/credential.serializer.ts:11-27, 42-48`: the file holds `id`, `name`, `type`, optional `data` and `dataIsComplete`. `shared`, `isGlobal`, `usageScope` and `isResolvable` are excluded.
- `PKG/io/manifest-entry.ts:70-81`: the file goes under the owner project directory only when that project is in the export; else into the top-level `credentials/` directory. Test: `PKG/__tests__/export-project.integration.test.ts:498-502`.
- `PKG/io/directory/package-directory-inventory-reader.ts:126-136, 235`: on Apply, `projectId` of a credential is read from its directory; a top-level file gives `null`.
- `PROMO/apply-preview.ts:482-483`: a missing credential without a file, or with `projectId === null`, is the hard conflict `unknown-owner`. No creation is offered. So a credential owned by a project outside the package cannot be set up through Apply, and a global credential arrives without its global flag.

### M2. Apply matches a credential by project usability, with the personal route off. A global credential satisfies every consumer.

- `PROMO/apply-preview.service.ts:79-80`: `credentialPersonalRoute: CredentialPersonalRoute.Exclude` ("A credential must be usable by the project, not only by the user who applies").
- `PKG/entities/credential/credential-matcher.ts:101-107`, `packages/cli/src/credentials/credentials.service.ts:668-685`: a match needs the consumer project to own the credential, to have a share of it, or the credential to be global (`c.isGlobal`). A personal credential of the applying user does not match in a team project.
- `credential-matcher.ts:127-145`: the reasons `not-on-instance`, `access-required`, `incompatible-usage-scope` are set only when the user has global `credential:read`. `PROMO/apply-preview.ts:471-491` reads these reasons to choose between "access required", "instance credential" and "missing". Without the reason, an existing credential would be reported as missing and the UI would try to create an id that exists. This is hidden today because only owners and admins can Apply.

### M3. Apply overwrites a matched credential only when a package project owns it. A credential owned elsewhere is bound and never updated.

- `PROMO/promotions.service.ts:138` and `PROMO/apply-preview.service.ts:74`: `credentialConflictPolicy: Overwrite`.
- `PKG/engine/project-package-importer.ts:161-162`: the update scope is the ids of the selected package projects. `PKG/entities/credential/credential-conflict-policy.ts:25-54`: a credential is an update candidate only if its owner project is in that scope and it is not managed, not resolvable and not an instance credential. "Any other credential, also a global one, is only bound."
- Effect for a credential owned by Q and used by P: instance Apply (Q in the package) writes the branch name and expression values once (`PKG/engine/import-orchestrator.ts:343-362`). A project Apply of P never updates it, because the scope holds P only. `PROMO/apply-preview.ts:71-76` shows the update as `modified` only in the first case.

---

## Second check

Scope: F30, F31, F32, F34. I read the code myself. I did not use the evidence of the first checker as proof.

### F30: upheld (partly-wrong)

- The engine creates a missing project with the source id: `packages/cli/src/modules/n8n-packages/entities/project/project-importer.ts:98-106` (`createTeamProject(..., { id: item.sourceProjectId, ... })`). Apply uses `projectConflictPolicy: Overwrite` (`promotions.ee/promotions.service.ts:130`).
- The engine never creates a credential in Apply. Both Apply flows use `credentialMissingMode: 'must-preexist'` (`promotions.service.ts:137`; selection `n8n-packages.service.ts:115`). No promotion code overrides it (search for `credentialMissingMode` in `promotions.ee` finds only line 137). With `must-preexist`, every failure blocks and `credentialsToStub` returns `[]` (`entities/credential/credential-missing-mode.ts:24-29, 40-44`).
- The binding UI creates the credential with the source id through the public API: `packages/modules/promotions/frontend/src/composables/usePromotionBindingCreation.ts:156-168` (`createPublicCredential({ id: binding.sourceId, ..., projectId })`).
- Addition that the first checker did not state: the binding UI also creates the missing owner project with the source id before it creates the credential. `usePromotionBindingCreation.ts:70-96` (`ensureProject` calls `createPublicProject(..., missing)`, where `missing` comes from `check.missingProjects`), and `PromotionMissingProjectsDialog.vue:204`. `check.missingProjects` carries the source project `id` (`promotions.ee/apply-preview.ts:192-207`). `createPublicProject` posts to public `POST /projects`, "which accepts the project id" (`packages/frontend/@n8n/rest-api-client/src/api/projects.ts:62-68`). So under the "binding UI flow" reading, the project and the credential both get the source id.
- `accessRequirements` creates nothing. `usePromotionBindings.ts:26` ("Only a missing binding can be created here. Access is granted outside the dialog.") and `:146` (any access requirement puts the dialog in `blocked` mode).
- Verdict: partly-wrong. Under the "UI flow" reading the claim is correct for the project and the credential, but the parenthetical that names `accessRequirements` as a creation path is wrong. Under the "engine" reading the credential part is wrong. The corrected statement of the first checker stands; add that the binding UI can also create the owner project with the source id.

### F31: upheld (partly-wrong)

- Per-scope planning is real: `n8n-packages/engine/import-orchestrator.ts:388-393` (`planPackage` calls `planScope` once for each input), `:422-456` (`credentialImporter.plan(context, credentialRequest)` for each scope).
- Package-wide steps exist: `import-orchestrator.ts:343-362` (comment "Across scopes: one destination credential can be reached from several projects"; forbidden updates, conflicts and planned updates over all `credentialPlans`), `:320-341` (tags and divergent variable overwrites across plans), `:364-379` (variable quota over all plans), `:394`, `:404-411` (skills).
- The promotion check groups credential issues by source id over all projects: `promotions.ee/apply-preview.ts:405-412` (`issuesById`), `:438-492` (`mergeConsumers` into one `access` or `missing` entry for each credential), `:494-517` (one `accessRequirements` or `missingBindings` entry for each credential, `ownerProject` from the file location).
- No package-wide step plans creation or sharing of a credential: Apply never creates credentials (see F30), and usability is decided per consumer project.
- Verdict: partly-wrong. "No package-wide view of shared dependencies" is false.

### F32: upheld (partly-wrong)

- `planImport` ("Writes no data") and `applyPlan` (refuses a plan with issues): `n8n-packages/engine/project-package-importer.ts:101-105, 203-206`.
- `applySelectionResolved`: `promotions.ee/promotions.service.ts:897-974`. It reads the tip with `readApplyTip` (`:908-909`), checks the preview revision only when `expectedPreviewRevision !== undefined` (`:912-926`), plans in `'enforce'` mode (`:937-942`), and runs the check (`:946-953`).
- Instance Apply `applyResolved` (`:991-1042`) checks the source commit (`:1000-1001`) and plans and checks, but has no preview revision.
- `previewRevision`: `apply-preview.ts:631`; built only by `apply-preview.service.ts:173`, which is project-scoped. The public preview routes are project routes only (`public-api/v1/controllers/promotions.public.controller.ts:630, 653`). No instance preview route exists.
- `expectedSource` is optional on the first Apply and required on Continue; `expectedPreviewRevision` is optional and exists only on the selection DTOs (`packages/@n8n/api-types/src/dto/promotions/promotion-operations.dto.ts:127-131, 146-152, 154-191`).
- Verdict: partly-wrong. The items exist, but "Apply already has ... a preview revision" holds only for project (selection) Apply, and only when the caller sends the revision.

### F34: upheld (partly-wrong)

- Public credential routes: `public-api/v1/controllers/credentials.public.controller.ts:153, 189, 210, 266, 457, 487, 508, 532, 555`. No share route. Public workflow transfer passes no credential-sharing option (`workflows.public.controller.ts:537-556`).
- CLI credential commands: `packages/@n8n/cli/src/commands/credential/` holds `create`, `delete`, `get`, `list`, `schema`, `transfer`. No share and no update.
- `PATCH isGlobal` is allowed with the sharing licence and `credential:shareGlobally` (`credentials.public.controller.ts:297-308`). A global credential is usable in every project (`packages/cli/src/credentials/credentials.service.ts:681-685`, `|| c.isGlobal`), and the matcher uses that list (`entities/credential/credential-matcher.ts:101-112`). So making the credential global clears `access-required`.
- Transfer makes the consumer project the owner and removes every other sharing (`packages/cli/src/credentials/credentials.service.ee.ts:262-276`). That also clears `access-required` for that one consumer.
- Verdict: partly-wrong. No public route shares a credential with one project, but "cannot resolve `access-required` through the public API" is false: global or transfer clears it, with side effects. The CLI has only transfer.
