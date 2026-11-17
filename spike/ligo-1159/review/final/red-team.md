# Red-team review: LIGO-1159 consolidated solution

Scope: `consolidated-solution.md` only, against the code at the current checkout. Read only. No build, no test, no run.

## Verdict

The core model holds: credential use is matched by id, a missing credential is the main dead end today, the hint file is safe for older readers, and a format version change would not be a reliable stop. Most current-state facts are correct. Three facts are partly wrong. Two of them hide coverage gaps. The main risks are these:

- Phase 1 lets the user create a credential in a project that an instance Apply then deletes, together with the credential.
- The plan claims that the public API stays compatible, but it adds a new blocker and changes a required field.
- The case "project deleted on the source with transfer of its workflows" stays a permanent Apply dead end, also after phase 4.

## 1. Facts checked

| # | Statement (section) | Result | Evidence |
|---|---|---|---|
| 1 | The path is the only owner record. Top level when the owner project is not in the export (2, Package format) | Correct | `n8n-packages/io/manifest-entry.ts` `projectScopedDirectory`; `credential.exporter.ts:89-97, 141-144` |
| 2 | `credential.json` is strict. The manifest drops unknown keys (2) | Correct | `spec/manifest.schema.ts:49-63` (plain `z.object`, strips keys) |
| 3 | Readers ignore an unknown file in an entity folder (2) | Correct | `io/directory/package-directory-inventory-reader.ts:296-300` (`classify` returns undefined); `base-branch-files.ts:79-80`; `import-manifest-bridge.ts:25-32` |
| 4 | An older selective Promote discards a manifest that fails the schema and writes `'1'` (2) | Correct | `import-manifest-bridge.ts:36-51, 113-121` |
| 5 | The overlay removes only `credential.json` on a path change (2, 6.2) | Correct | `working-copy-updater.ts:430-434` |
| 6 | Apply matches a credential by id through use. The personal route is off (2, Apply) | Correct | `credential-matcher.ts:98-120`; `credentials.service.ts:681-685`; `apply-preview.service.ts:80` |
| 7 | `unknown-owner` and `access-required` have no action (2) | Correct | `apply-preview.ts:440-470`; frontend `usePromotionBindings.ts:48-52, 145-146` |
| 8 | Reconciliation keeps a referenced workflow only for a caller in the same project (2) | Correct | `project-package-importer.ts:434-440`; `engine/import-result.ts:250-267`; `workflow-remover.ts:246-251` |
| 9 | "Promote refuses every move between projects" (2, line 72; ticket 15 problem) | **Partly wrong** | `promotions.service.ts:1373-1383` lets an instance Promote through when the old project no longer exists on the source |
| 10 | "Apply has no check for a missing workflow dependency ... Nothing reports it" (2, line 86) | **Partly wrong** | A published destination caller fails to publish, and Apply counts it: `workflow-publisher.ts:57-60, 197-213`; `promotions.service.ts:1583-1585, 1655`. Section 7, line 422 says this too |
| 11 | "Owner: for a resource that exists on the destination ... Apply does not read it" (6.1, line 320) | **Partly wrong** | Apply reads the destination owner to decide if it overwrites the name and expression values: `credential-conflict-policy.ts:24-54`; `credential-importer.ts:117-127`; policy `Overwrite` at `promotions.service.ts:138` |
| 12 | The promotion import gets no API key scope. No key can hold `credential:share` (2) | Correct | `public-api-permissions.ee.ts` (no `credential:share`); `promotions.public.controller.ts:576` ("granular API-key write scopes are not passed to it") |
| 13 | Data tables: the runtime uses the own project; Apply creates the table in the consumer project or fails on an id conflict (2) | Correct | `data-table-proxy.service.ts:83-118`; `dataTableProjectId` is set only in `ephemeral-node-executor.ts:343`; `data-table-importer.ts:160-175, 337-349` |

## 2. Findings

### Major

**M1. Phase 1 home selection can put a new credential in a project that the instance Apply deletes.**
- Evidence: ticket 2 (lines 494-497) and section 4.3 rule 4 let the user select any team project. Section 6.7 guard 1 (line 393) protects only a project that the *package names* as owner, and ships with ticket 11 (line 631). `promotions.service.ts:1160-1177` lists every destination team project that the package lacks as `project-deletion`. One `confirmDestructiveChanges` flag confirms all of them (`promotions.service.ts:123-125`). `project.service.ee.ts:185-188` loads the owned credentials of the deleted project for deletion.
- Failure: instance Apply. The check shows a credential without a named owner and lists destination-only project R for deletion. The user selects R as home, creates the credential, confirms. The import passes, then R is deleted with the credential. Every consumer project loses it. No message says so.
- Fix: in ticket 2, exclude projects that the same Apply deletes, and for an instance Apply offer only projects that the package holds (or warn). Move guard 1 to ticket 2 and extend it to "a project that owns a credential that the package uses".

**M2. The compatibility rule "a change to a public API response is additive" does not hold for tickets 2 and 4.**
- Evidence: rule at line 431. Ticket 4 adds a new blocker and a new acceptance field. `promotionMissingCredentialBindingSchema` requires `ownerProject` (`api-types/.../promotion-apply-check.dto.ts:92-95`). Ticket 2 and section 5.6 report an owner-less credential as a missing binding in place of `unknown-owner`. The conflict and binding schemas are discriminated unions.
- Failure: a script or an older `@n8n/cli` that calls Apply then Continue gets `blocked` where it got `applied` (ticket 4). A client that creates the credential in `ownerProject.id` gets no such field (ticket 2). Nothing persists an acceptance, so a reference that can never arrive (personal sub-workflow) stops every Apply. Section 6.3 says "stop one time". An automation must always send the acceptance flag, which turns the gate off.
- Fix: state the API delta for each ticket. Keep `unknown-owner` or make `ownerProject` nullable with a version note. Decide whether the gate is opt-in on the public API, or ship it on `3.x` as a breaking change (see `.github/DEVELOPING_V3.md`). Replace "one time" with the real behavior.

**M3. A project that was deleted on the source with transfer of its workflows stays a permanent Apply dead end.**
- Evidence: fact 9. `promotions.service.ts:1373-1383` lets the move reach the branch when the old project is gone on the source. Section 4.5 (line 176) and ticket 13 (line 653) keep the `moved` block when the package does not hold the old project. Section 3 has no row for this case.
- Failure: delete project A on the source and transfer its workflows to B. The instance Promote succeeds. Every instance Apply on the destination is blocked by `moved`, before and after phase 4. The only way out is a manual move on each destination.
- Fix: add a scope row and a ticket 13 outcome: when the old project is absent from the package and is a `project-deletion` candidate of the same Apply, transfer the item, then delete the project.

**M4. Contradictory rules on the same cases.**
- Apply side "personal workflow" (5.7 line 297, 4.4 line 168) needs an owner that the package does not carry (4.7 line 199: "no owner of a referenced workflow"). The destination cannot tell a personal workflow from a deleted workflow or an unpromoted one. Fix: the Apply message says "not on the branch" only, or add an owner kind to the workflow requirement.
- Data table of another project: section 3 decision says "Block" (line 115). The same row, section 4.8 (line 211) and ticket 9 say no block, "reported". Under `DataTableMissingMode.Create` (`promotions.service.ts:142`) "not created" needs either a blocker or an import skip. Ticket 9 does not say which. When the owner project already holds the table, today's id conflict blocks. Ticket 9 does not say if that stays.
- Section 6.2 (line 349) says the hint "drives proposals only". Guard 1 (line 393, ticket 11 line 631) uses the hint to suppress a project deletion. A stale hint (a selective Promote does not remove an unreferenced top-level credential directory) then protects a project forever. Fix: state that the hint has this effect, and limit it to hints of credentials that the applied workflows use.
- Ticket 3 (line 513) uses "the first consumer project" as the default home. Section 7 (line 412) rejects the consumer project as a silent default home, because the home gets owner rights. Fix: give the reason why the generic import may differ, or apply the same rule.
- Section 2 (line 86) "Nothing reports it" contradicts section 7 (line 422). See fact 10.

### Minor

**m1. The home choice changes which later Applies overwrite the credential.** Fact 11. A credential whose destination owner is a project of the Apply gets the branch name and expression values (`credential-importer.ts:117-127`). The home step (ticket 2, 5.6 step 3) states rights only. Fix: the step also says that applies of the home project update the name and expression values from the branch.

**m2. Personal and cross-project names reach Git.** Ticket 5 switches instance Promote to `ReferenceOnly`. `workflow-requirement.exporter.ts:34-46, 59-69` writes the id and the name of a referenced personal workflow that the admin can read. Section 4.4 claims no personal data. The hint writes the name and id of a team project that the branch does not hold. With one repository for each project (6.6), readers of P's repository see the names of other projects. Fix: no name for a personal workflow requirement. Make the project name in the hint optional, and leave it out for per-project connections.

**m3. Older sources leave orphan hint files.** `working-copy-updater.ts:430-434` removes only `credential.json` and keeps a directory that is not empty. An older source that renames or relocates a credential leaves the hint alone in the old directory. Ticket 10 says only "causes no error". Fix: the reader ignores a hint without a sibling `credential.json`, and the newer overlay removes such orphans.

**m4. The API key rule in ticket 1 is not feasible as written.** No API key scope `credential:share` exists, and promotion Apply passes no key scopes (fact 12). Other Apply writes (workflow delete, project delete) are not key-gated. Fix: ticket 1 states that it adds the scope and the plumbing, and that existing keys cannot grant until they are reissued.

**m5. Retention keeps a workflow that the source deleted, with no message.** Section 6.1 (line 325) and ticket 4 extend retention to every project. After ticket 5, a caller can reference a deleted workflow. The destination keeps it, with its triggers, while a caller in the package references it. The gate then treats it as present. Fix: report each retained workflow in the result, or count it as "missing" for the gate.

**m6. Ticket dependencies are incomplete.** Ticket 13 depends only on 1 (diagram, line 458), but its outcome needs 2 (owner-less credential in the new project) and 9 (data table). Ticket 2 offers "Create project" but states the licence quota only in ticket 11 (line 630). Fix: add 2 and 9 to ticket 13, and add the quota rule to ticket 2.

**m7. Ticket 4 does not define "present on the destination".** It does not say if an archived workflow, or a workflow in a destination personal project, satisfies the reference. Both fail at runtime. Fix: present means a team project, not archived, and the caller policy in ticket 7.

## 3. Areas with no finding

- The format argument (optional file, no version change) agrees with the code. Old readers ignore the file.
- Grant confirmation item by item, `credential:share` per item, no share removal: no privilege escalation found for global admins. The doc states the limit that use on the source does not prove access.
- Common case (one project, all references satisfied): no new step, apart from M2 for a reference that cannot be satisfied.
- Fact 3 "readers ignore": the import parser requires `workflow-metadata.json` (`n8n-package-parser.ts:311-312`). This does not affect the hint, because the doc makes the hint optional.

## 4. Not settled by the code

- Whether the instance Promote failure shows the workflow ids. `PackageExportBlockedError` has a description with ids (`static-sub-workflow-requirements.ts:24-30`). I did not trace whether the REST response sends it.
- Linear statuses (LIGO-1363, LIGO-1405, LIGO-1089). The doc already marks them for a person to check.
