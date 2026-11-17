# Batch 3 — Apply: credential preview conflicts, matching and import policy

Checked against the checkout at `765740d4cf0` (read-only). Paths are relative to the repository root.
Short names used below:

- `apply-preview.ts` = `packages/cli/src/modules/promotions.ee/apply-preview.ts`
- `apply-preview.service.ts` = `packages/cli/src/modules/promotions.ee/apply-preview.service.ts`
- `promotions.service.ts` = `packages/cli/src/modules/promotions.ee/promotions.service.ts`
- `credential-matcher.ts` = `packages/cli/src/modules/n8n-packages/entities/credential/credential-matcher.ts`
- `en.json` = `packages/frontend/@n8n/i18n/src/locales/en.json`

## F19

**Statement:** On promotion Apply, a credential that is missing on the destination and whose package file is not under a project folder (top-level `credentials/`) is reported as the conflict `unknown-owner`. It is a blocker with no action on the destination; the copy is "The credential has no valid owner project. Set its owner project in the source." So a team workflow that uses a personal credential (or a credential whose owner was never promoted) cannot be applied to a fresh destination. If the destination already has a usable credential with the same id, Apply can continue.

**Verdict:** confirmed

**Evidence:**
- `apply-preview.ts:459-491`. For each `credential-unresolved` issue: `unknown_type`, `type_mismatch`, `incompatible-usage-scope` and `access-required` are handled first. The next branch is `else if (!file || file.projectId === null) { result.conflicts.push({ ...conflict(issue), code: 'unknown-owner' }) }` (482-483). Only a file under a project reaches `missing` (484-490).
- `InventoryCredential.projectId` is `null` "when the file is outside every project" (`packages/cli/src/modules/n8n-packages/io/directory/package-directory-inventory-reader.ts:52-57`, `classify` 313-328).
- The exporter puts a credential file under the owner project only when that project is part of the export, else in the top-level directory (`packages/cli/src/modules/n8n-packages/io/manifest-entry.ts:70-81`, `credential.exporter.ts:91-96`). Promote exports team projects only, so a personal owner gives a top-level file. `working-copy-updater.ts:545-548` documents the same fallback for "a credential owned by Beta while pushing Alpha".
- `unknown-owner` is a hard conflict: `isHardConflict` (`packages/modules/promotions/frontend/src/composables/usePromotionBindings.ts:48-52`) puts the dialog in `blocked` mode (145-146); `isBlocked` (`promotions.service.ts:1132-1143`) blocks on any conflict that is not confirmable.
- Copy: `en.json:10821`.
- A destination credential with the same id that the consumer project can use resolves in `IdBasedCredentialMatcher.resolve` (`id-based-credential-matcher.ts:22-36`), so no issue is raised.

**Corrected statement:** The claim holds. Two details to add. (1) `unknown-owner` also covers a credential with no file in the package at all (`!file`), which happens when the exporting user could not read the credential (`credential.exporter.ts:62-73`). (2) The branch is reached for a `not_found` whose reason is `not-on-instance` or absent; the reason is absent when the applying user has no global `credential:read`, so in that case the credential may exist on the destination. The dialog offers no action; the code does not forbid creating a credential with that id outside the flow.

## F20

**Statement:** When a credential exists on the destination but the consuming project cannot use it, Apply preview reports `access-required`. It is a blocker with no in-flow fix; the copy says to ask an administrator. `addCredentialRules` also reports type conflicts and `missingBindings`.

**Verdict:** confirmed

**Evidence:**
- `credential-matcher.ts:127-145`: for a `not_found` failure, a credential that exists with usage scope `project` gets `reason: 'access-required'`. `credential.types.ts:43-47` defines it as "the credential exists, but it is not shared with the target project".
- `apply-preview.ts:477-481` collects it, `495-505` pushes it to `result.accessRequirements` with `code: 'access-required'`.
- Blocker: `promotions.service.ts:1140-1143` (`check.accessRequirements.length > 0`). UI: `usePromotionBindings.ts:145-146` (mode `blocked`), comment at line 26 "Only a missing binding can be created here. Access is granted outside the dialog."
- Copy: `en.json:10816` "The credential exists but is not available to these workflows. Ask an administrator to give their projects access." Preview copy `en.json:10992` and `11021`: "Ask an admin to share it with this project."
- Other outputs of `addCredentialRules`: `missing-id` (431), `conflicting-types` (433), `unknown-type` (464), `type-mismatch` (466-470), `incompatible-usage-scope` (471-476), `unknown-owner` (483), `missingBindings` (506-517).

**Corrected statement:** The claim holds. `access-required` is an entry of `accessRequirements`, not of `conflicts`. It is reported only when the applying user has global `credential:read` (see F22); the Apply endpoints require the global scope `promotions:apply` (`promotions.public.controller.ts:571-572, 721-722`).

## F21

**Statement:** The credential matcher matches by id and resolves a credential for a project scope only when it is usable in the consuming project (owned by it, shared with it, or global) (B) and only when the acting user can read it (C).

**Verdict:** confirmed

**Evidence:**
- Apply uses `credentialMatchingMode: 'id-only'` (`promotions.service.ts:136`; `n8n-packages.service.ts:114` for a selection), which selects `IdBasedCredentialMatcher` (`credential-matcher-factory.ts:23-27`). It resolves a reference only when its id is in the usable list (`id-based-credential-matcher.ts:22-36`).
- The usable list is `getCredentialsAUserCanUseInAWorkflow(user, { projectId, excludePersonalRoute })` (`credential-matcher.ts:101-107`), called once per project scope (`credential-importer.ts:63-70`, `context.projectId`).
- `packages/cli/src/credentials/credentials.service.ts:664-685`: start from `findCredentialsForUser(user, ['credential:read'])` (C), keep those in `findAllCredentialIdsForProject(projectId)` or the personal route or `isGlobal` (B). `findAllCredentialsForProject` is `{ usageScope: 'project', shared: { projectId } }` (`packages/@n8n/db/src/repositories/credentials.repository.ts:592-594`), so owner and non-owner sharings both count.
- Apply sets `credentialPersonalRoute: CredentialPersonalRoute.Exclude` (`apply-preview.service.ts:79-80`), so the personal route is off for both Apply flows (`promotions.service.ts:938, 1009`).

**Corrected statement:** The claim holds for Apply. Outside Apply, the same matcher also accepts a credential of the importing user's own personal project when the user is a member of the target project (the personal route, `credentials.service.ts:675-677, 750-776`); Apply turns that route off. An explicit binding (`credentialBindings`) can replace the id match, but Apply sends none.

## F22

**Statement:** The credential matcher adds the reason (access-required, not-on-instance) only for users with global credential:read. On access-required, the instance Apply dialog switches to "Apply is blocked" and hides Continue.

**Verdict:** confirmed

**Evidence:**
- `credential-matcher.ts:134`: `if (ids.length === 0 || !hasGlobalScope(user, 'credential:read')) return failures;`. Reasons are set at 141-143: `not-on-instance`, `incompatible-usage-scope`, `access-required`.
- `usePromotionBindings.ts:145-146`: `if (hardConflicts.value.length || check.value?.accessRequirements.length) return 'blocked';`
- `packages/modules/promotions/frontend/src/components/PromotionBindingsDialog.vue:88-91` uses `promotions.bindings.blocked.title` = "Apply is blocked" (`en.json:10850`); the submit button has `v-if="mode !== 'blocked'"` (487-497). `ApplyInstanceDialog.vue:230` renders this dialog through `PromotionBindingsFlow.vue`.

**Corrected statement:** The claim holds. There is a third reason, `incompatible-usage-scope` (the credential exists but is not a project credential). Without global `credential:read` the failure carries no reason, and `addCredentialRules` then treats the credential as missing (`missingBindings`) or `unknown-owner`.

## F23

**Statement:** Nothing in the n8n-packages or promotions code ever shares a credential with a project.

**Verdict:** confirmed

**Evidence:**
- Searched `packages/cli/src/modules/n8n-packages` and `packages/cli/src/modules/promotions.ee` (non-test) for `shareWithProjects`, `SharedCredentials`, `.share(`, `EnterpriseCredentialsService`, `credential:share`, `transferOne`, `transferAll`, `Sharing(Service|Repository)`, `isGlobal = true`. No call that writes a sharing.
- The only credential writes of the import are `createStubCredential` (`credential-importer.ts:259-268`, one owner project, and not used under `must-preexist`) and `credentialsService.update` (`310-316`). The comment at `301-303` says the update leaves "sharing, `isGlobal`, `isResolvable` and the description".
- The package does not carry sharing: `credential.serializer.ts:19-21` marks `shared` and `isGlobal` as `exclude`.
- Frontend module `packages/modules/promotions/frontend/src`: no share call; `usePromotionBindingCreation.ts:150-158` creates a credential in one project only.

**Corrected statement:** The claim holds. The import creates a credential in one owner project at most, and never adds a sharing or sets `isGlobal`. The package format has no field for either.

## F24

**Statement:** The Promotions import policy (`IMPORT_POLICY`) uses `id-only` credential matching, `must-preexist` for credentials and variables, and `KeepExisting` for variable values. So Apply matches credentials by id, never creates credentials, requires credentials and variables to exist on the target, and keeps target variable values.

**Verdict:** confirmed

**Evidence:**
- `promotions.service.ts:129-148`: `credentialMatchingMode: 'id-only'` (136), `credentialMissingMode: 'must-preexist'` (137), `variableMissingMode: VariableMissingMode.MustPreexist` (144), `variableConflictPolicy: VariableConflictPolicy.KeepExisting` (145).
- `must-preexist` creates nothing and blocks on every failure: `credential-missing-mode.ts:25-31, 42-45, 57-59`. Variables: `variable-missing-mode.ts:11` `{ creates: false, usesPackageValue: false, blocks: true }`; `variable-importer.ts:57` skips the value comparison under `KeepExisting`.
- `IMPORT_POLICY` is used only by the instance Apply (`promotions.service.ts:1009`). A project or selective Apply goes through `planPackageSelection`, which applies `CHERRY_PICK_IMPORT_POLICY` with the same four values (`n8n-packages.service.ts:110-120, 706-726`).

**Corrected statement:** The claim holds for every value it names (F30 was not shown; where it disagrees on these values, the code supports F24). Two additions. (1) The same policy also sets `credentialConflictPolicy: Overwrite` (`promotions.service.ts:138`, `apply-preview.service.ts:74`): Apply does not create a credential, but it writes the branch name and expression values to a matched credential that an imported project owns (`apply-preview.ts:71-77`, `credential-conflict-policy.ts:26-54`). (2) "Never creates" is true for the server import. The Apply UI lets the user create a missing credential or variable on the destination (same id, owner project of the file) before Continue (`usePromotionBindingCreation.ts:136-170`).

## F25

**Statement:** Apply binding checks scan only the selected workflow consumers for credential and variable references (`check` in apply-preview.service.ts, `collectCredentialReferences` / `collectVariableReferences` in package-references.ts).

**Verdict:** confirmed

**Evidence:**
- `apply-preview.service.ts:218-239`: with a selection, `scoped.workflows` keeps only workflows where `projectId === selection.selectedProjectId && selected.has(id)`; `collectCredentialReferences(scoped)` and `collectVariableReferences(scoped, ...)` read that list. Docstring 214-217: "Without a selection, it checks the whole package. It reads credential and variable references only from the workflows that the plan imports."
- `package-references.ts:33-67` and `70-96` loop over `inventory.workflows` only.
- The plan side is scoped the same way: `identifyRequirements(manifest.requirements?.credentials, workflows, agents)` (`project-package-importer.ts:356-374`, `import-result.ts:250-267`); "Do not expand the selection to include referenced sub-workflows" (355).

**Corrected statement:** The claim holds for a selection. The project Apply preview selects every workflow of the project on the branch (`apply-preview.service.ts:274-294`), and the instance Apply passes no selection, so it scans every workflow of the package (`promotions.service.ts:1014`). A credential or variable used only by an unselected workflow does not block.

## F26

**Statement:** The promotion Apply check reads the entity files, not the manifest. import-manifest-bridge.ts describes itself as a temporary bridge.

**Verdict:** partly-wrong

**Evidence:**
- Entity-file part: the inventory comes from `PackageDirectoryInventoryReader`, whose docstring says "`manifest.json` and other files are ignored" (`package-directory-inventory-reader.ts:109-114`). The reference scan, file ownership, project list and move detection of the check use it (`apply-preview.service.ts:121-129`, `apply-preview.ts:176-181, 416`).
- Manifest part: the check is built on the import plan (`toPreviewCheck({ plan, ... })`, `apply-preview.service.ts:232-238`). `planPackage` and `planPackageSelection` start with `readImportManifest(reader)` (`n8n-packages.service.ts:640, 660`), and `GitCommitPackageReader.readManifest` throws "Package is missing manifest.json" without it (`git-commit-package-reader.ts:26-34`). The plan reads `manifest.projects`, `manifest.requirements.credentials|variables|dataTables|tags|workflows` (`project-package-importer.ts:115-117, 145, 152, 370-411`) and the parser lists workflows, folders, credentials and variables from manifest entries (`n8n-package-parser.ts:79-183`). Every `credential-unresolved` issue, and so `access-required`, `unknown-owner` and `missingBindings`, starts from `manifest.requirements.credentials`.
- Bridge: `import-manifest-bridge.ts:17-23`: "TEMPORARY bridge: import still inventories a directory package from `manifest.json`. Apply writes that file after overlay." It is called from the selective Promote overlay only (`working-copy-updater.ts:440`), not from the Apply check.

**Corrected statement:** The Apply check reads both. The inventory (project of each file, node scan for credential and variable references, moves, selection) reads the entity files and ignores the manifest. The import plan that the check wraps reads `manifest.json`, including `requirements`, and fails without it. `import-manifest-bridge.ts` does call itself a temporary bridge; it runs on selective Promote to rewrite `manifest.json` because the import still needs it.

## F27

**Statement:** At runtime, a workflow in project A can use a credential that is owned by A, shared with A, or global. The owner can be another team project or a personal project.

**Verdict:** confirmed

**Evidence:**
- The runtime check is `CredentialsPermissionChecker.check` / `findInaccessible` (`packages/cli/src/executions/pre-execution-checks/credentials-permission-checker.ts:293-324, 361-476`), not the cited lines. Project route: `getFilteredAccessibleCredentials(projectIds, projectScopedIds)` (406-411) matches any `shared_credentials` row of a project the workflow is in, with no role filter (`packages/@n8n/db/src/repositories/shared-credentials.repository.ts:103-116`), so owner and shared rows both pass and the owner project can be any type. Global: `findGlobalProjectCredentialIds` (413-416).
- The cited `credentials.service.ts:664-685` is the list for the editor (`getCredentialsAUserCanUseInAWorkflow`). It applies the same three conditions plus the personal route.

**Corrected statement:** The claim holds, but the list is not complete and the citation is the editor list, not the runtime check. At runtime there are three more rules: (1) a credential that the project route rejects still passes when the acting user (session user on a manual run, publisher on a triggered run) can use it through their own access (`credentials-permission-checker.ts:418-474`); (2) a workflow in a personal project whose owner holds global `credential:use` skips the check (384-403); (3) a credential with a usage scope other than `project` is never usable (375-384).

## Missed behaviors

1. **The package carries no sharing, no global flag and no owner field for a credential.** The only ownership signal is the file location, and only when the owner project is in the same export. Evidence: `credential.serializer.ts:11-27` (`shared`, `isGlobal`, `usageScope` are `exclude`; the file holds `id`, `name`, `type`, optional `data`); `manifest-entry.ts:70-81` and `credential.exporter.ts:91-96` (owner project directory, else top-level `credentials/`); `package-references.ts:32` "File paths define ownership."

2. **The Apply binding flow creates a missing credential in the owner project of the file only, so a consumer in another project then stops on `access-required`.** `missingBindings` carries `ownerProject: projectOf(file.projectId)` (`apply-preview.ts:484-491, 506-517`). The UI creates the credential with `id: binding.sourceId` in that project and creates the project first when it is missing (`usePromotionBindingCreation.ts:70-96, 136-170`); `matchesCreation` requires `created.projectId === binding.ownerProject.id` (`usePromotionBindings.ts:62-72`). Nothing shares it (F23), so on Continue the matcher of the other consumer project does not find it and reports `access-required`, which the dialog cannot resolve. The last step is derived from the code paths in F20 to F23; no test covers it.

3. **Apply excludes the personal route that the runtime allows.** `applySelectionRequest` sets `credentialPersonalRoute: CredentialPersonalRoute.Exclude` with the comment "A credential must be usable by the project, not only by the user who applies" (`apply-preview.service.ts:79-80`), and both Apply flows use it (`promotions.service.ts:938, 1009`). So a destination credential with the right id that sits in the applying user's personal project, and is not shared with the consumer project or global, gives `access-required`, although the runtime check would accept it for that user (`credentials-permission-checker.ts:418-474`).

## Second check

### F26

**Upheld:** yes. My verdict is also partly-wrong.

**Evidence (own reading):**
- Entity files: `PackageDirectoryInventoryReader` docstring says "`manifest.json` and other files are ignored" (`packages/cli/src/modules/n8n-packages/io/directory/package-directory-inventory-reader.ts:110-114`). `ApplyPreviewService.build` reads the inventory with it and uses it for moves and the project selection (`packages/cli/src/modules/promotions.ee/apply-preview.service.ts:121-129`). `check` collects credential and variable references from the inventory workflows (`apply-preview.service.ts:218-238`).
- Manifest: the same `build` plans the import with `planPackageSelection` (`apply-preview.service.ts:131-133`). `planPackage` and `planPackageSelection` both start with `this.readImportManifest(reader)` (`packages/cli/src/modules/n8n-packages/n8n-packages.service.ts:640, 660`). `GitCommitPackageReader.readManifest` throws "Package is missing manifest.json" (`packages/cli/src/modules/promotions.ee/git-commit-package-reader.ts:30-32`). `planImport` uses `manifest.projects`, `manifest.requirements.variables|credentials` (`project-package-importer.ts:115-117, 143-155`) and builds credential requirements from `manifest.requirements?.credentials` (`project-package-importer.ts:371-375`). The parser lists workflows from `manifest.workflows` (`n8n-package-parser.ts:79-88`). `toPreviewCheck` takes the plan as input (`apply-preview.ts:176-177`) and handles its `credential-unresolved` issues (`apply-preview.ts:410-411`).
- Bridge: `import-manifest-bridge.ts:17-23` says "TEMPORARY bridge: import still inventories a directory package from `manifest.json`". Its only caller is `WorkingCopyUpdater.applySelection` (`working-copy-updater.ts:440`), which `PromotionsService.promote` calls (`promotions.service.ts:511`, inside `promote` at line 227). So the bridge runs on selective Promote, not in the Apply check. The bridge comment says "Apply writes that file after overlay"; this refers to the `applySelection` method of the working-copy updater, not to promotion Apply.

**Result:** The second half of the claim is true. The first half is wrong: the Apply check reads the entity files for the inventory and `manifest.json` for the import plan, and it fails without the manifest. The corrected statement of the first checker is accurate.
