# Fact check, batch 1

Area: Export and package format: ownership by path, file schemas, versioning.

Method: read-only review of the code at the checkout. No build, test, or application run.
Paths are relative to `packages/cli/src/modules/` unless they start with `packages/`.

Verdict summary:

| id | verdict |
|---|---|
| F01 | confirmed |
| F02 | confirmed |
| F03 | confirmed (with scope limits, see corrected statement) |
| F04 | confirmed (one imprecise detail about `data`) |
| F05 | confirmed |
| F06 | confirmed |
| F07 | confirmed |
| F08 | confirmed (the check is in the parser, not in the reader classes) |
| F09 | confirmed (holds for the tar path too) |

---

## F01

**Statement.** `projectScopedDirectory()` places a credential, variable or data table under `projects/<slug>-<id>/<collection>/` only when its owner project is in the export (`projectTargetsById`). Otherwise the exporter writes the resource to the top-level collection directory (for example `credentials/`). So a selective export of project A that uses a credential owned by project B does not record that B owns it.

**Verdict.** confirmed

**Evidence.**
- `n8n-packages/io/manifest-entry.ts:70-81`: `const prefix = ownerProjectId ? projectTargetsById?.get(ownerProjectId) : undefined; return packageDirectory(collection, prefix);`. No prefix gives the bare collection directory (`:62-68`).
- Callers: credentials `n8n-packages/entities/credential/credential.exporter.ts:88-103` with the owner from the `credential:owner` sharing row (`:141-144`); variables `n8n-packages/entities/variable/variable.exporter.ts:87` (`variable.project?.id`); data tables `n8n-packages/entities/data-table/data-table.exporter.ts:66` (`dataTable.projectId`).
- `projectTargetsById` holds the selected projects and the project shells of auto-included workflows: `n8n-packages/entities/project/project-shell.exporter.ts:19-34`, `n8n-packages/n8n-packages.service.ts:343-376`.
- Test: `n8n-packages/__tests__/export-project.integration.test.ts:484-505` ("keeps a credential owned by a non-exported project at the package top level", target matches `^credentials/[^/]+$`).
- Nothing else in the package names project B: see F04, F06, F07.

**Corrected statement.** Same as the claim. Detail: "in the export" includes a project that is only present as a shell for an auto-included workflow.

---

## F02

**Statement.** The directory package inventory reader derives `projectId` for a resource from the resource file path. A top-level credential therefore has `projectId` null (no owner) on Apply.

**Verdict.** confirmed

**Evidence.**
- `n8n-packages/io/directory/package-directory-inventory-reader.ts:313-328` (`classify`): a path that starts with `projects/` and has more than 2 segments gets `projectDir = projects/<segment>`; every other path gets `projectDir: null`.
- `:126-137`: `projectIdOf` maps `projectDir` to the id in that directory's `project.json`, and returns `null` when `projectDir === null`.
- `:219-239`: `credentials.push({ path, projectId: projectIdOf(file), credential })`. Type comment `:52-57`: "`null` when the file is outside every project."
- Apply uses this inventory: `promotions.ee/apply-preview.service.ts:122`, `promotions.ee/promotions.service.ts:929,1005`.
- Effect on Apply: `promotions.ee/apply-preview.ts:482-483`: a missing credential with `!file || file.projectId === null` becomes a conflict with code `unknown-owner`. Otherwise `:484-491` builds a missing binding with `ownerProject`.

**Corrected statement.** Same as the claim. Detail: the project id comes from `project.json` in the enclosing `projects/<dir>` directory, not from the directory name. For a credential that the destination lacks, a null `projectId` makes the Apply check report `unknown-owner`.

---

## F03

**Statement.** Top-level placement has a different meaning per resource type: for variables it means "global", for credentials and data tables it means "owner unknown or not exported".

**Verdict.** confirmed

**Evidence.**
- Variables, export: `variable.exporter.ts:87` passes `variable.project?.id`. A global variable has no project, so it goes to top-level `variables/`. A workflow in project P resolves a name only to P's variable or to a global one (`packages/workflow/src/common/resolve-variables.ts:51-66`), and P is in a project export, so in a project package a top-level variable is a global one.
- Variables, import: `n8n-packages/engine/package-layout.ts:139-151` (`placeByLayout`): "bundled under the scope creates in that project, bundled at the top level creates globally".
- Variables, Apply check: `promotions.ee/apply-preview.ts:557`: `file.projectId === null ? 'global' : 'project'`.
- Credentials: top level when the owner project has no target in the export (F01). Apply check reports `unknown-owner` (`apply-preview.ts:482-483`).
- Data tables: top level when `dataTable.projectId` has no target (`data-table.exporter.ts:66`).

**Corrected statement.** In a project package (the kind that promotion uses), a top-level variable is a global variable, and a top-level credential or data table is one whose owner project is not in the package. Two limits apply. (1) In a workflow or folder package, `projectTargetsById` is undefined, so project variables are also at the top level, and import decides the scope by `VariableParentPolicy` (`package-layout.ts:131-137`). (2) No reader reads the owner of a data table from its path: the inventory has no `projectId` for data tables (`package-directory-inventory-reader.ts:66-69`, `:276-277` "Nothing reads the owner").

---

## F04

**Statement.** The packaged credential file holds `id`, `name`, `type`, `data` (expression fields only) and `dataIsComplete`. It has no owner, no project sharing (`shared`), no `isGlobal` and no `usageScope`. So a package cannot reconstruct source sharing from the credential file.

**Verdict.** confirmed

**Evidence.**
- Schema: `packages/@n8n/api-types/src/dto/packages/credential.schema.ts:27-35`: `id`, `name`, `type`, optional `data`, optional `dataIsComplete`, `.strict()`.
- Serializer: `n8n-packages/entities/credential/credential.serializer.ts:11-27`: `shared: 'exclude'`, `isGlobal: 'exclude'`, `usageScope: 'exclude'`, also `isManaged`, `isResolvable`, `resolverId`, `description` excluded. Output `:41-49`.
- `data`: `n8n-packages/entities/credential/credential-export-policy.ts:38-80` keeps expression values and never `oauthTokenData`. `credential.exporter.ts:117-139` (`withDisplayControllers`) then adds plain boolean or option values of the fields that decide which fields show.
- `dataIsComplete`: `credential.exporter.ts:98-101`, written only when `data` is present.

**Corrected statement.** Same as the claim, with one precision: `data` is not expression fields only. It holds the expression values plus the plain boolean or option values of display-controller fields. `data` and `dataIsComplete` are both optional, and both are absent under the `no-values` policy or when no value qualifies.

---

## F05

**Statement.** The `credential.json` schema is `.strict()`. `variable.json` and `data-table.json` schemas are also strict. `manifest.json` is not strict.

**Verdict.** confirmed

**Evidence.**
- `packages/@n8n/api-types/src/dto/packages/credential.schema.ts:27-35`: `.strict()`.
- `packages/@n8n/api-types/src/dto/packages/variable.schema.ts:5-11`: `.strict()`.
- `packages/@n8n/api-types/src/dto/packages/data-table.schema.ts:29-35`: `.strict()`; columns too (`:17-25`).
- `n8n-packages/spec/manifest.schema.ts:48-63`: `z.object({...}).superRefine(...)`, no `.strict()`. Manifest entries (`:7-22`) and the requirement schemas (`n8n-packages/spec/requirements.schema.ts`) are not strict either. Zod then drops unknown keys and does not reject them.
- Readers parse with these schemas and fail on a violation: `package-directory-inventory-reader.ts:289-310` and `n8n-packages/engine/n8n-package-parser.ts:463-481` ("failed schema validation").

**Corrected statement.** Same as the claim. Related facts: `folder.json` and `tag.json` are also strict. `project.json`, `workflow.json` and `workflow-metadata.json` are not strict (`project.schema.ts:13-19`, `workflow.schema.ts:52-62`, `workflow-metadata.schema.ts:8-11`). A reader of this version rejects an unknown key in a strict file and silently drops an unknown key in the manifest.

---

## F06

**Statement.** The directory path is the only owner record for a packaged credential, variable or data table. Manifest entries store only `id`, `name` and `target` for most resources, with no owner or sharing field.

**Verdict.** confirmed

**Evidence.**
- `n8n-packages/spec/manifest.schema.ts:7-22`: `manifestEntrySchema` = `id`, `name`, `target`. `:24-26`: workflow entries add `isArchived`. All other collections use `manifestEntrySchema` (`:53-61`).
- `n8n-packages/io/manifest-entry.ts:132-149`: `createManifestEntry` returns `{ id, name, target: baseDir/<slug>-<id> }`.
- Entity files have no owner field: `credential.schema.ts:27-35`; `variable.schema.ts:5-11` (`name`, `type`, `value`); `data-table.schema.ts:29-35` (`id`, `name`, `columns`). Serializers drop the project: `variable.serializer.ts:7-13`, `data-table.serializer.ts:12-20`.
- Requirements have no owner field (`requirements.schema.ts:8-41`).

**Corrected statement.** Same as the claim. Detail: the manifest `target` repeats the same path, so it carries the same owner information and no more. The path records an owner only when the owner project is in the package (F01).

---

## F07

**Statement.** Other package files carry no ownership or sharing data: `project.json` has no type and no members, workflow files drop `shared`, and requirements carry only `{id,name,type,usedBy}` for credentials and `{id,name?,usedBy}` for workflows, with no owner field.

**Verdict.** confirmed

**Evidence.**
- `packages/@n8n/api-types/src/dto/packages/project.schema.ts:13-19`: `id`, `name`, `description`, `icon`, `customTelemetryTags`. `n8n-packages/entities/project/project.serializer.ts:7-24`: `type: 'exclude'`, `projectRelations: 'exclude'`, `sharedCredentials: 'exclude'`, `sharedWorkflows: 'exclude'`.
- `n8n-packages/entities/workflow/workflow.serializer.ts:15-41`: `shared: 'exclude'`. Schema `workflow.schema.ts:52-62` has no project or sharing field.
- `n8n-packages/spec/requirements.schema.ts:8-26`: credential requirement = `id`, optional `name`, optional `type`, `usedBy`. `:37-41`: workflow requirement = `id`, optional `name`, `usedBy`.
- `usedBy` items are `{ kind: 'workflow' | 'agent', id }`: `packages/@n8n/api-types/src/dto/packages/import-blocking-issue.schema.ts:52-57`.

**Corrected statement.** Same as the claim. Precision: in the credential requirement, `name` and `type` are optional in the schema and required only when a workflow is a consumer.

---

## F08

**Statement.** The package format version is 1. The manifest schema validates it with `z.literal(FORMAT_VERSION)`, so a reader rejects a manifest with any other version.

**Verdict.** confirmed

**Evidence.**
- `n8n-packages/spec/constants.ts:1`: `export const FORMAT_VERSION = '1';` (a string).
- `n8n-packages/spec/manifest.schema.ts:50`: `packageFormatVersion: z.literal(FORMAT_VERSION)`.
- Import: `n8n-packages/engine/n8n-package-parser.ts:68-77`: `packageManifestSchema.parse(await reader.readManifest())`; a `ZodError` becomes `BadRequestError('Package manifest failed validation')`. Every import goes through it (`n8n-packages/n8n-packages.service.ts:598-602`).
- Promotion: `promotions.ee/promotion-change.service.ts:333-337` uses `safeParse` and returns `null`; `:314-321` then throws "The package manifest on the branch cannot be read".
- A search for `FORMAT_VERSION` and `packageFormatVersion` in `packages/cli/src` finds no branch for another version and no migration step.

**Corrected statement.** The format version is the string `'1'`, and the manifest schema accepts only that value. The check is in `N8nPackageParser.getManifest` and in the promotion `safeParse` calls. The reader classes (`TarPackageReader`, `DirectoryPackageReader`, `GitCommitPackageReader`) only parse JSON and do not check the version. The directory inventory reader does not read `manifest.json` at all (`package-directory-inventory-reader.ts:109-114`). Some promotion paths treat a manifest that fails the schema as absent and do not report the version (`promotions.ee/import-manifest-bridge.ts:36-51`).

---

## F09

**Statement.** Readers ignore unknown file names inside an entity folder. `workflow-metadata.json` is an existing sidecar file that has no manifest entry. (Verified by the submission for the directory inventory reader only, not for the tar reader.)

**Verdict.** confirmed

**Evidence.**
- Inventory reader: `package-directory-inventory-reader.ts:313-316`: `classify` returns `undefined` for a file name that is not in `KIND_BY_FILE_NAME` (`:82-89`), and `:123` drops it. Doc `:109-114`: "`manifest.json` and other files are ignored."
- Tar path: `n8n-packages/io/tar/tar-package-reader.ts:118-141` accepts every `File` entry with a valid path; there is no file-name allow-list. `N8nPackageParser` reads only the paths that it builds from manifest targets (`n8n-package-parser.ts:79-192`, `entityFilePath`). So an extra file is loaded and never read.
- Sidecar: `n8n-packages/io/manifest-entry.ts:87-92`: "Metadata files share the workflow target and have no manifest entry." Written at `:164-177`. `agent-metadata.json` is a second sidecar (`:94-96`).

**Corrected statement.** Same as the claim, and it also holds for the tar reader and the import parser. Two limits. (1) A file with a known entity file name (`project.json`, `workflow.json`, `folder.json`, `credential.json`, `variable.json`, `data-table.json`) in an unsupported location makes the inventory reader fail (`:349-353`). (2) `workflow-metadata.json` is ignored by the inventory reader but is mandatory for the import parser: a missing file fails the import with "Export the package again from an instance that runs this version" (`n8n-package-parser.ts:303-313`).

---

## Missed behaviors

### M1. Some credentials get no credential file at all, so they have no path and no owner record

The exporter loads each credential with `findCredentialForUser(id, user, ['credential:read'])` and no options (`credential.exporter.ts:61-65`). When the result is null, it writes no file and only a requirement with the id and the name and type that the workflow node holds (`:67-74`, `:106-111`). The result is null when the exporting user cannot read the credential, and also when the credential has `usageScope: 'instance'`: `findProjectCredentialForUser` returns the row only for `usageScope === 'project'` (`packages/@n8n/db/src/repositories/credential-access.repository.ts:99-124`), the global lookup also filters `usageScope: 'project'` (`:37-46`), and the exporter does not set `includeInstanceCredentials` (`packages/@n8n/backend-services/src/credentials/credentials-finder.service.ts:192-234`). The other types differ: an unreadable data table aborts the export (`data-table.exporter.ts:50-56`, `:81-100`), and an unreadable variable becomes a name-only requirement (`variable.exporter.ts:153`).

### M2. Only the promotion inventory reads the owner path; the import engine does not

The import engine looks credential files up by id "regardless of which project owns the credential file" (`n8n-packages/engine/package-layout.ts:38-63`; `n8n-package-parser.ts:181-183`). It creates a missing credential in the project of the consuming scope, `projectId: context.projectId` (`n8n-packages/entities/credential/credential-importer.ts:259-266`). Each project scope gets its own credential request and its own plan (`n8n-packages/engine/project-package-importer.ts:375-387`, `n8n-packages/engine/import-orchestrator.ts:388-393`). This review did not trace what happens when two scopes need the same missing credential. Data tables are also resolved and created in `context.projectId` (`n8n-packages/entities/data-table/data-table-importer.ts:97`, `:169`), and every scope receives all data tables of the package (`project-package-importer.ts:389-391`). Only `PackageDirectoryInventoryReader` turns the path into a `projectId`, and only for credentials and variables (`package-directory-inventory-reader.ts:52-69`, `:276-277`); the Apply check then uses it (`promotions.ee/apply-preview.ts:482-491`, `:557-565`).

### M3. Selective Promote rebuilds `manifest.json` from the entity files, with a fixed file list and a hard-coded version

`WorkingCopyUpdater.applySelection` calls `writeImportManifest` after it overlays the staged export on the branch package (`promotions.ee/working-copy-updater.ts:363-446`). That function walks the folder and lists entries only for the file names in `SNAPSHOT_FILES` (`promotions.ee/import-manifest-bridge.ts:25-32`, `:126-172`), builds each entry as `{ id, name, target }` from the file content and its directory (`:174-194`), writes `packageFormatVersion: '1'` as a literal (`:113-121`), and takes variables and requirements from the old and the staged manifests. A previous manifest that fails the schema is discarded without an error (`:36-51`). Because the manifest schema is not strict, an unknown manifest key is dropped on every parse. So a new manifest-level field (for example owner or sharing data) does not survive a selective Promote unless this bridge also writes it, while data inside entity files or their paths does survive.
