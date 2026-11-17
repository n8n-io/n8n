# Investigation evidence

Baseline: `ed626a767fa9015bf75007d915737eb436fc3f75`.

Paths below are relative to the repository root. Function names are search anchors. Line numbers are omitted where a function spans several branches. These findings are source observations, not runtime reproductions.

## Findings that drive the recommendation

| Finding | Evidence | Consequence |
|---|---|---|
| Full and selective Promote use different dependency policies. | `packages/cli/src/modules/promotions.ee/instance-package.ts:24`, `instancePromotionExportRequest`; `promotions.service.ts:493`, selective export request. | Full Promote can fail on a dependency that selective Promote leaves as a reference. A shared classifier should replace this entry-point difference. |
| An omitted owner project sends a dependency to the top level. | `packages/cli/src/modules/n8n-packages/io/manifest-entry.ts:74`, `projectScopedDirectory`; `entities/credential/credential.exporter.ts`, `ownerProjectId` and `writeManifestEntry`. | Ownership must survive independently of project selection. |
| Credential files omit sharing and global-access state. | `packages/cli/src/modules/n8n-packages/entities/credential/credential.serializer.ts:19`. | A package cannot reconstruct source project sharing from the credential file. This is not proof that all existing target sharing disappears. |
| Credential export deduplicates by credential ID. | `entities/credential/credential.exporter.ts`, `groupByCredentialId`. | Reuse this identity model. Export duplication is not the root cause in this path. |
| Apply already handles missing credentials and access separately. | `packages/cli/src/modules/promotions.ee/apply-preview.ts`, `addCredentialRules`. It reports `access-required`, `unknown-owner`, type conflicts, or `missingBindings`. | Extend existing typed checks. Do not build a separate validation wizard. |
| Promotions requires credential and variable setup. | `promotions.service.ts:128`, `IMPORT_POLICY`: `id-only`, `must-preexist`, and `KeepExisting`. | The proposal must preserve target credential secrets and variable values. “Create once” refers to a declared setup operation, not silent credential import. |
| Apply scans only selected workflow consumers for binding checks. | `apply-preview.service.ts`, `check`, and `collectCredentialReferences` / `collectVariableReferences` in `package-references.ts`. | Keep diagnostics scoped to consumers affected by the selection. |
| Variable source scope is already explicit in file placement. | `entities/variable/variable.exporter.ts`, `resolveRequirements`, `assertNoBundledVariableCollision`; `promotions.ee/package-references.ts`, `collectVariableReferences`. | Variable resolution is project-first, then global. Another project's variable is not a valid fallback. |
| Apply preserves declared variable scope. | `promotions.ee/apply-preview.ts`, `addVariableRules`. | The design must not weaken this to name-only matching. |
| Sub-workflow traversal and rebinding already exist. | `entities/workflow/workflow-dependency-resolver.ts`; `entities/workflow/references/workflow-references.ts`; `engine/project-package-importer.ts:214`. | Extend these implementations. Do not build a new generic graph extractor from strings. |
| Cross-project workflow and folder moves are deliberately blocked. | `promotions.ee/cross-project-moves.ts`; `promotions.service.ts`, `assertNoCrossProjectMoves` call path and `classifySelection`; `apply-preview.service.ts`, `findCrossProjectMoves`. | Moves need a new transfer plan and two-sided authorization. Removing the check is insufficient. |
| Same-project moves already work. | `promotions.ee/__tests__/promotions-package.integration.test.ts`, `describe('Apply moves and renames within a project')`. | Avoid reporting all moves as unsupported. |
| Personal data needs separate handling. | `instance-package.ts:42` excludes personal projects; `cross-project-moves.ts`, `toInstanceProject`, removes their names; `apply-preview.service.ts:80` excludes the personal credential route. | Preserve private metadata handling and project-level credential usability. |
| Data-table matching is project-specific. | `entities/data-table/data-table-matching-mode.ts:29`, `by-id`. | Ownership metadata alone cannot add cross-project table runtime access. |
| Selective overlays regenerate a manifest. | `promotions.ee/import-manifest-bridge.ts`, `writeImportManifest`, `requirementsBlock`; `working-copy-updater.ts`. | New metadata must survive overlay and regeneration. Variable requirements currently merge by name. |
| Current package version is 1. | `n8n-packages/spec/constants.ts:1`; `spec/manifest.schema.ts`, `z.literal(FORMAT_VERSION)`. | Semantically required new fields need an explicit reader compatibility boundary. |
| Full Apply infers absent project deletions. | `promotions.service.ts:1159`, `projectDeletions`, and `reconcileProjects` flow. | Coverage must distinguish a partial package from a complete instance snapshot. |
| There is already a shared plan and source/revision protection. | `n8n-packages/engine/project-package-importer.ts`, `planImport` / `applyPlan`; `promotions.service.ts`, `applySelectionResolved`; `apply-preview.ts`, `previewRevision`. | Extend these protections to dependency and grant state. |
| Effective project environments already have a resolver. | `promotions.ee/promotion-environment.resolver.ts`, `resolveForProject`. | Do not hard-code one repository into dependency identity or planning. The supplied brief says per-project connections are not live; resolver code alone does not prove release availability. |

Paths starting with `entities/`, `engine/`, or `spec/` in the table are under `packages/cli/src/modules/n8n-packages/`. Paths starting with `promotions.ee/` are under `packages/cli/src/modules/`. Unqualified Promotions service filenames are under `packages/cli/src/modules/promotions.ee/`.

## Code-traced scenarios

### Team credential outside a selective project export

Input: workflow W belongs to Orders. Credential C belongs to Billing. Only Orders is exported.

1. `CredentialExporter` obtains C when the actor has `credential:read`.
2. It passes Billing's ID to `projectScopedDirectory`.
3. Billing is absent from `projectTargetsById`, so the file goes under top-level `credentials/`.
4. `CredentialSerializer` emits ID, name, type, and permitted data. It emits neither owner nor sharing.
5. `collectCredentialReferences` finds the file, but inventory ownership is not a team project.
6. If the target cannot resolve C, `addCredentialRules` reports `unknown-owner` instead of offering setup in Billing.

Inference: carrying an owner reference removes this ambiguity. Adding Billing's whole content is not necessary. A working, accessible target credential may already resolve; this is not an unconditional failure claim.

### Personal sub-workflow

`instancePromotionExportRequest` uses `Fail` and excludes personal projects. The source comment names this limitation and references LIGO-1089. Selective export instead uses `ReferenceOnly`. This supports replacing the entry-point difference with an explicit external-reference policy. It does not establish what LIGO-1089 currently proposes.

### Cross-project move

The integration test “rejects a selection with a workflow that belongs to another project on the branch and pushes nothing” verifies the branch-scope guard. The adjacent Orders-to-Billing test verifies that selective Promote refuses a workflow moved at source and preserves the branch. `crossProjectMoves` also produces Apply move checks. The tests inspected prove intended behavior; they were not executed in this investigation.

### Variable scope

`VariableExporter` resolves each consumer against project and global variables. `collectVariableReferences` selects a project file before a global file. `addVariableRules` reports a missing definition, requires the declared scope, and warns about global shadowing. The proposed scope contract preserves these rules and extends them to external requirements and moves.

## Legacy Source Control distinction

I also inspected `source-control.ee`. Its resource files carry `owner` / `ownedBy`. It can create missing team owners and transfer workflow or credential ownership. It puts project variable stubs in project files. Those facts do **not** describe Promotions, whose files and plan use `n8n-packages`.

Do not copy the legacy fallback to the applying user's personal project into Promotions. Do not use legacy variable serialization as the baseline for this spike. This distinction corrects the initial broad exploration and prevents a proposal based on the wrong import path.

## Verification and limits

- Read the supplied issue, its attached comment, relevant implementation, schemas, and existing tests.
- Checked local HEAD, local target ref, and working-tree status. The working tree was clean before document creation.
- Checked shared requirement extractors, workflow traversal, project resolution, and plan/apply boundaries before proposing new services.
- Did not fetch live Linear context. No Linear connector was available.
- Did not inspect another agent's conclusions or reuse an archived solution. Only the matching archived issue attachment was used.
- Did not run tests. `node_modules` was absent. This is a documentation-only spike, so installing and building the monorepo would not validate the proposed behavior.
- Did not run browser tests or create a prototype. The flow proposals are design analysis, not verified UI behavior.
- No implementation, ticket creation, branch rename, commit, or external message was performed.
