# LIGO-1159: decision log for the consolidated solution

This file records how `consolidated-solution.md` settles each divergence (D01 to D34) and each critique finding of severity major. No critique rated a finding as a blocker.

Rules:

1. `all-agree`: adopt, unless a critique or the ledger shows a defect.
2. `code-settled`: a verified fact decides.
3. `eliminated-unsafe-or-infeasible`: a critique shows that a position is unsafe or cannot work. I verified the finding in the code before I used it.
4. `merged-compatible`: the positions are complementary and the result has no contradiction.
5. `human-decision`: the positions still conflict. The solution uses the recommendation and marks it "Recommendation, pending decision".

Agreement between submissions was not counted as evidence.

Paths are relative to `packages/cli/src/modules/` unless they start with `packages/`.
"Verified" means that I read the cited code in the checkout at `765740d4cf0`. I ran no code.

## Part 1: divergences

### Data model

**D01. Authority of the source owner on the destination**

- Positions: A, D: binding, another owner is a conflict. B: default that the user can change. C: a destination concern, use decides.
- Adopted: two parts. (1) Apply does not compare the owner of a resource that exists. Use decides. (2) For a missing credential, the source owner is the proposed home. The user can change it. The server does not enforce it.
- Rule: part 1 is `eliminated-unsafe-or-infeasible` for the owner conflict. Part 2 is `human-decision` (decision 1).
- Evidence: the matcher uses id, usability and type, and ignores the owner (F21; `n8n-packages/entities/credential/id-based-credential-matcher.ts:22-36`). A destination that works today would get a conflict (critiques A5, D-02). Any client can create a credential with the source id in any project, so the server cannot enforce a home (F19 corrected statement, F28).
- Dissent: A and D hold that one branch must describe one topology on every instance. C would not let the user change a home that the package names.

**D02. Owner project absent from the destination and from the package**

- Positions: A, D: create the project from a descriptor, never use the consumer. B: consumer project, picker for several. C: the user selects, default consumer.
- Adopted: when the package names a team owner, the flow offers to create that project (explicit step). The user can select another team project. When the package names no team owner, the user selects a team project, with no project selected in advance.
- Rule: `merged-compatible`, inside decision 1.
- Evidence: the binding flow already creates a project that the Apply plan creates (`packages/modules/promotions/frontend/src/composables/usePromotionBindingCreation.ts:70-96`). It cannot create an owner project outside the plan (`promotions.ee/apply-preview.ts:191-207`; reading of the code). Project creation has a licence quota (`packages/cli/src/services/project.service.ee.ts:478-501`). The home project gets owner rights (`packages/@n8n/permissions/src/roles/scopes/credential-sharing-scopes.ee.ts:3-16`), so a silent consumer default is rejected (critique C-3).
- Dissent: A and D reject every home other than the declared owner. B and C select the consumer project in advance.

**D03. Coverage and explicit deletions**

- Positions: A: yes, in format 2. D: partly. C: a separate decision. B: silent.
- Adopted: no coverage field and no explicit deletions in the package. Two guards only: a project that the package names as an owner is not a deletion candidate, and the dependency gate counts the deletions of the same Apply. The general problem goes to decision 4.
- Rule: `human-decision` (decision 4). A's mechanism is `eliminated-unsafe-or-infeasible` as specified.
- Evidence: the risk is real (F44; workflow deletions by reconciliation have no confirmation, `promotions.ee/promotions.service.ts:123-125`, `promotions.ee/apply-preview.ts:350-365`). A branch is built by full replaces and overlays, and A gives no merge rule for coverage or for deletions (critique A6; `promotions.service.ts:285-287`, `working-copy-updater.ts:439-446`).
- Dissent: A holds that this spike must own the risk, because partial packages are live.

### Package format

**D04. Format version**

- Positions: A: version 2. B, D: version 1 with optional fields. C: no change in three of four phases.
- Adopted: no version change.
- Rule: `eliminated-unsafe-or-infeasible` for version 2, and `code-settled`.
- Evidence: an older selective Promote discards a manifest that fails the schema and writes version `'1'` with no error (`promotions.ee/import-manifest-bridge.ts:36-51, 113-121`, verified; critique A1). So the version is not a reliable stop. No adopted field is unsafe to ignore: an ignored owner hint gives the current blocker (F19). A version change stops every Apply on an older destination (F08).
- Dissent: A. Its concern about deletion by absence stays valid and goes to decision 4.

**D05. Carrier and content of owner metadata**

- Positions: A: in the Git tree, all resource types, with project descriptors. B: manifest requirement rows. C: a file next to `credential.json`, credentials only. D: manifest entries and `projectReferences`.
- Adopted: one optional file next to `credential.json`. It holds the owner (only for a top-level file) and the global state. No owner for variables, data tables or referenced workflows.
- Rule: `code-settled`.
- Evidence: `credential.json` is strict (F05). Readers ignore unknown file names, also the tar reader and the parser (F09). The selective Promote rebuilds the manifest, a staged requirement row replaces the old row, and unknown fields are lost (F18; `import-manifest-bridge.ts:297-327`, verified). The path already gives the scope of a variable and the project of a data table (F46; critique D-08). One part of C's reason is false: the Apply check does read the manifest (F26). The other part holds.
- Dissent: A wants explicit owner metadata for every resource type. D wants `projectReferences` as a manifest list. B wants the owner of a referenced workflow in Git, so that the destination can say where it lives.

**D06. Sharing in the package**

- Positions: A, D: yes. B, C: no, derive the needed access from use.
- Adopted: no sharing list in Git. Apply derives one access item for each pair of credential and consumer project.
- Rule: `eliminated-unsafe-or-infeasible` for the lists as specified.
- Evidence: a selective Promote does not refresh a credential that the branch holds under another project (F17; ledger "missed behaviors", batch 2), so D's `complete` flag goes out of date (critique D-06). A's explicit removals are events in a state tree with no expiry rule (critique A6).
- Dissent: A and D: a new instance cannot rebuild the source shares from Git. Accepted: shares beyond use are destination configuration.

**D07. Removal of shares**

- Positions: D: on a full Apply when the list is complete. A: through an explicit removal in Git. B, C: never.
- Adopted: Apply never removes a share.
- Rule: `eliminated-unsafe-or-infeasible` (same evidence as D06).
- Dissent: A, D.

### Promote

**D08. Promote and a dependency that cannot reach the destination**

- Positions: D: block before the Git write. B, C: never fail, warn. A: keep the reference.
- Adopted: Promote never fails on a dependency. Instance Promote uses the same policy as project Promote and returns a typed list.
- Rule: `eliminated-unsafe-or-infeasible` for D's new blocks on credentials and metadata. `human-decision` (decision 3) for the instance Promote failure on a workflow dependency.
- Evidence: a team workflow with a personal credential promotes today and applies when the destination holds the credential (F15, F19; critique D-01). The two Promote variants treat the same reference in opposite ways, and the preview cannot predict the failure (F10, F11, F12, F13).
- Dissent: D: an early block keeps unsupported state out of Git.

**D09. Explicit inclusion of an external dependency**

- Positions: A: yes. B, C, D: no.
- Adopted: no. "Select it too" stays for a workflow of the same project.
- Rule: `eliminated-unsafe-or-infeasible`.
- Evidence: a project Apply plans one project only (`n8n-packages/engine/project-package-importer.ts:114-122`). On a branch without the other project, an instance Apply treats the new project folder as authoritative and deletes its other workflows (`n8n-packages/entities/workflow/workflow-remover.ts:223-240`; critique A4).
- Dissent: A: it gives a one-step remedy.

**D10. Branch presence in the Promote preview**

- Positions: B, C: yes. A, D: no.
- Adopted: yes for workflow dependencies. No for credentials: the row shows the owner as a note.
- Rule: `merged-compatible`.
- Evidence: Apply never creates a credential (F24), and a Promote of the owner project does not write a credential that only another project uses (F17), so a branch state for a credential is misleading (critique B-05).
- Dissent: A: Promote cannot certify a destination. The wording therefore says "the branch will not hold it", not "the destination will not have it".

### Apply

**D11. Missing sub-workflow or error workflow**

- Positions: A, D: hard block. B: confirmable, like a destructive change. C: confirmable with its own flag.
- Adopted: a blocker that the user can accept with its own confirmation.
- Rule: `eliminated-unsafe-or-infeasible` for the hard block. `merged-compatible` for B and C.
- Evidence: instance Apply has no selection, so the user cannot exclude a caller (`promotions.ee/promotions.service.ts:991-1042`, verified; critique A2). A project Apply covers one project and adds no sub-workflow (F43), so two projects that reference each other could never pass on a new destination (critique D-04). Today the reference passes with no message (F37), so a confirmation is safer than the current state.
- Dissent: A and D: a selection that cannot resolve must not write.

**D12. What "resolved" means for a sub-workflow**

- Positions: B, C: exists by id on the destination or in this Apply. A: also the caller policy. D: also the same owner.
- Adopted: present after this Apply (on the destination and not deleted by this Apply, or written by it). The caller policy check follows as ticket 7. No owner check.
- Rule: `merged-compatible` for B, C and A. `eliminated-unsafe-or-infeasible` for D's owner check (same evidence as D01).
- Evidence: the caller policy is a setting of the called workflow or an instance default, and the checker compares owner projects (F41; `packages/cli/src/executions/pre-execution-checks/subworkflow-policy-checker.ts:69-90, 140-144`, verified; critique C-5). Reconciliation keeps a referenced workflow only for a caller in the same project (`project-package-importer.ts:434-440`, `workflow-remover.ts:250-255`, verified; critiques B-02, C-1).
- Dissent: D.

**D13. How Apply grants credential access**

- Positions: B: no step, a preview row. C: one confirmation on Continue. D: a separate action. A: a grant that Git declares.
- Adopted: an item list on Continue. The server grants only the listed items, after the permission, API key and licence checks.
- Rule: `eliminated-unsafe-or-infeasible` for B. A's position falls with D06. `human-decision` (decision 2) between the forms of C and D.
- Evidence: the consumer list comes from the manifest and from use, and the public API Apply has no preview (critique B-01; F32). On the source, a workflow can run through the access of the acting user (`packages/cli/src/executions/pre-execution-checks/credentials-permission-checker.ts:418-474`, verified; critiques C-2, D-03). The API key scope list has no `credential:share`, and the promotions module reads no API key scope for the import (verified). `shareWithProjects` does not check the permission (F35).
- Dissent: B: the reader of the blocker is the admin, so a confirmation adds a step. D: the grant must be an action outside Apply.

### Personal projects

**D14. Personal-owned credential that is missing on the destination**

- Positions: D: Promote blocks. A: reference, the fix is on the source. B: consumer project. C: the user selects, default consumer.
- Adopted: no Promote block. On Apply the user selects a team project, with no project selected in advance.
- Rule: `eliminated-unsafe-or-infeasible` for D's block (D08). `human-decision` (decision 1) for the rest.
- Evidence: F15, F19; critiques D-01, C-3.
- Dissent: A, D: the supported path is a move to a team project on the source.

**D15. Move into or out of a personal project**

- Positions: B: a move in is a removal with a warning. A, C, D: stays blocked.
- Adopted: stays blocked.
- Rule: `eliminated-unsafe-or-infeasible` for B's rule in the current code.
- Evidence: B relies on "Apply shows the deletion like any other deletion, with a confirmation". The server confirms only a project deletion and a destructive data table change (`promotions.service.ts:123-125`, `apply-preview.ts:350-365`, verified). An instance Apply would hard-delete the workflow with no confirmation.
- Dissent: B: one move of one user blocks the instance Promote of every team. Decision 6 keeps this open.

### Moves

**D16. Place of moves in this delivery**

- Positions: A, B, C: in the plan, last. D: a later follow-up.
- Adopted: last phase of the plan. The current refusals stay until then.
- Rule: `merged-compatible`.
- Dissent: D: no design before the dependency work is done.

**D17. Move mechanics**

- Positions: A: three-way comparison with the base Git owner, one transaction. B, C: match by id across the projects of the package, reuse the editor transfer. Credentials: B shares them automatically, C and A treat them as requirements.
- Adopted: match by id across the projects of the package. Transfer only when the package holds both projects. Otherwise the current `moved` conflict stays. The transfer keeps the publish state. Credentials are requirements in the new project. The rights are those of the editor move.
- Rule: `merged-compatible`, with three eliminations.
- Evidence: the destination stores no last applied commit for each resource, so a base owner does not exist (critique A6; `promotions.ee/database/entities/promotion-run.entity.ts`). The editor transfer removes all shares and can unpublish a published workflow (`packages/cli/src/workflows/workflow.service.ee.ts:873-890, 1222-1250`, verified; critique B-06). The editor move needs `workflow:move` on the workflow and `workflow:create` in the destination project (`workflow.service.ee.ts:812-840`, verified). B's automatic share falls with D13.
- Dissent: A: only the three-way comparison detects a third owner. The adopted rule covers the case where the third owner is outside the package. Decision 7 covers the shares of the workflow.

**D18. Owner change of a credential, variable or data table**

- Positions: A: credentials later, the others blocked. D: all blocked. B, C: not addressed.
- Adopted: an owner change of a credential on the source does not travel. Variables and data tables keep the current checks.
- Rule: `code-settled`.
- Evidence: Apply does not read the owner of a credential that exists (F21). A variable must exist in the declared scope (F46). A data table id can be in one project only, and Apply reports a conflict (ledger "missed behaviors", batch 6). The data table module has only a transfer of all tables of one project (`packages/modules/data-table/backend/src/data-table.service.ts:370-371`). A search found no move of one table.
- Dissent: A, D: an owner change must be visible on the destination.

### Permissions

**D19. Detail in a permission blocker**

- Positions: B: permission and project. C: who can act, ids, node name and type. A: generic. D: action and permission, no project name, same message for missing and inaccessible.
- Adopted: the row names the action and says who can do it. It names a project or credential only when the user can read it. Missing and inaccessible get the same message when the difference would show a hidden resource.
- Rule: `merged-compatible`.
- Evidence: not reachable today (F36).

**D20. Privileged lookups**

- Positions: B, A: no elevation. C: id only, plus an existence check for the generic import. D: a backend-only structural lookup, or a block.
- Adopted: no elevation. The exporter writes the owner hint only from data that the user can read.
- Rule: `eliminated-unsafe-or-infeasible` for D's lookup.
- Evidence: the lookup would write the name of a hidden project to Git (critique D-09). The exporter already falls back to the node data (`n8n-packages/entities/credential/credential.exporter.ts:61-74`, verified).
- Dissent: D.

**D21. The user cannot create in the owner project**

- Positions: B: ask an admin or choose another project. C: the row says who can. A, D: an authorized person does it.
- Adopted: the row says who can, and the user can select another team project.
- Rule: `human-decision` (decision 1).
- Dissent: A, C, D.

### Compatibility

**D22. Old branch with a top-level credential**

- Positions: A, D: the dead end stays until a new Promote. B, C: the user selects the home.
- Adopted: B, C. The rule "never guess an owner" of A and D holds, because the user selects.
- Rule: `merged-compatible`.
- Evidence: F19. The fix needs no format change.
- Dissent: A, D.

**D23. Older destination and rollout**

- Positions: A: reject format 2, readers first, opt-in flag. B, D: ignore the fields. C: Apply side one release before the Promote side.
- Adopted: no version change. The Apply side ships at least one release before the Promote side.
- Rule: `human-decision` (decision 5).
- Evidence: the order "gate before open Promote" holds on one instance only (critiques B-03, C-4). An older destination blocks an instance Apply on any move (F51).
- Dissent: A: an explicit stop is safer than a silent fallback.

### Cross-project cases

**D24. Global credentials**

- Positions: A: an explicit grant intent in Git. B: `isGlobal` travels and Apply applies it. C: grants first, then a hint and an offer. D: silent.
- Adopted: C, with A's rule that global access is never automatic. Credentials with usage scope `instance` are excluded.
- Rule: `merged-compatible`. B's automatic step is `eliminated-unsafe-or-infeasible`.
- Evidence: `isGlobal` is a flag on a credential that has an owner (`packages/@n8n/db/src/entities/credentials-entity.ts:55`; critique A8). A workflow can never use an instance credential (`credentials-permission-checker.ts:375-384`, verified). Critique B-01 for the automatic step.

**D25. Variables**

- Positions: B, C: no work. A: scope in the format, shadow warning. D: `placement` and a Promote block.
- Adopted: no work.
- Rule: `code-settled`.
- Evidence: the runtime never reads a variable of another project (F45). The exporter resolves a name in the project of the consumer or in the global scope, with no other fallback (F46). The shadow warning exists (F46). The requirement rows merge by name (F47), but a row has no scope and no reader takes the scope from it, so no defect follows.
- Dissent: A, D.

**D26. Data tables**

- Positions: A, D: a new blocker. B, C: no work.
- Adopted: ticket 9. Apply never creates a table in a project that does not own it in the package. Promote warns and does not block.
- Rule: `code-settled`. Each side is right in part.
- Evidence: the runtime uses only tables of the own project (F48). But a saved workflow can hold the id of a table of another project: the exporter bundles it (`n8n-packages/entities/data-table/data-table.exporter.ts:44-75`), and Apply creates a table with that id in the consumer project or reports an id conflict (`data-table-importer.ts:160-175, 337-349`, verified).
- Dissent: A, D want a block. B, C want no work.

**D27. Error workflows**

- Adopted: same rule as a sub-workflow.
- Rule: `code-settled`. The reference registry handles both in the same way (F12, F40).

**D28. Workflow sharing**

- Adopted: excluded. It does not travel.
- Rule: `code-settled`. Share targets are personal projects only (F42). The caller policy reads the owner project, not a share (F41).

**D29. Dynamic references**

- Adopted: a note in the Promote preview. No validation claim.
- Rule: `merged-compatible` (A only; no position against it).

**D30. Generic package import**

- Positions: B: all rules. C: the credential fix in the engine, the gate in promotions. A: one planner. D: silent.
- Adopted: C. LIGO-1250 gets "created one time". The import shares a new stub only on request and never shares a credential that exists.
- Rule: `merged-compatible`.
- Evidence: F29, F31. The generic import already reports a broken sub-workflow as a failed publish (F37). It has no preview and no confirmation (critiques B-01, C-7).
- Dissent: B: one rule for preflight and engine.

**D31. Sharing licence**

- Adopted: without the licence, the access item stays a blocker with that reason.
- Rule: `code-settled`. The share route needs `feat:sharing` (`packages/cli/src/credentials/credentials.controller.ts:569`, verified).

**D32. Dependencies and moves across two connections**

- Adopted: a dependency in another repository stays a requirement. A move applies only when the package holds both projects, so a move across two connections stays refused.
- Rule: `merged-compatible` (A, C).
- Evidence: critique C-7 for the missing guard in C.

### Ticket order

**D33. First deliverable**

- Positions: A, D: the package contract first. B: LIGO-1250 first. C: dead ends first, no format change.
- Adopted: C's order, with changes. Access grant before the home selection. Backend and UI of a new blocker in one release. LIGO-1250 in parallel.
- Rule: `eliminated-unsafe-or-infeasible` for the contract-first orders, and `code-settled`.
- Evidence: under D's order, Promote blocks ship before any fix (critique D-07). Under A's order, Promote can write references before Apply can gate them (critique A3). Promotion Apply does not use `create-stub`, so it does not depend on LIGO-1250 (F29; critique B-09). The UI reads `ownerProject` without a guard and treats an unknown conflict as a hard block (`packages/modules/promotions/frontend/src/composables/usePromotionBindings.ts:48-52, 68, 145-146`, verified; critique C-4).
- Dissent: A: a credential-only start leaves deletion and moves inconsistent.

**D34. Existing Linear tickets**

- Positions: B and C map the tickets. A and D do not.
- Adopted: C's mapping. Existing tickets keep their scope. New scope gets new tickets.
- Rule: `merged-compatible`.
- Evidence: none from Linear. I did not read it. The code confirms only that master has no transfer between projects on Apply (F53).
- Dissent: B extends LIGO-1258 to cover the Promote and puts LIGO-1250 first.

## Part 2: agreements that needed a correction

| Agreement | Correction | Evidence |
|---|---|---|
| A move needs move rights in both projects. | The editor move needs `workflow:move` on the workflow and `workflow:create` in the destination project. The solution uses that rule. | `packages/cli/src/workflows/workflow.service.ee.ts:812-840` |
| The Apply reference check must ship before instance Promote stops failing. | True, and not sufficient. The order must also hold across two instances, so one release separates the two tickets. | Critiques B-03, C-4 |
| A data table is never copied to make a cross-project reference pass. | The current code creates a table in the consumer project. Ticket 9 makes the agreement true. | `data-table-importer.ts:160-175` |
| Apply does not create an owner project without a visible step. | An instance Apply creates the projects that are its content, with no step. The rule holds for a project that is only the owner of a missing credential. | F30; critique D-09 |
| Credential resolution runs across the whole package before the per-project work. | The promotion check already merges credential blockers by id across projects. Only the generic import lacks it (LIGO-1250). | F31 |

## Part 3: critique findings of severity major

No critique rated a blocker. Critique B notes one reading of submission B that would be a blocker (global access applied to an existing credential). The solution avoids it: see B-01.

| Finding | Verified | Handling |
|---|---|---|
| A1. An older source turns a format 2 branch back into format 1 with no error. | Yes, `import-manifest-bridge.ts:36-51, 113-121` | Avoided. No version change. The hint file must also cause no error when an older source promotes (ticket 10). |
| A2. Instance Apply cannot exclude consumers, so the instance-wide block moves to Apply. | Yes, `promotions.service.ts:991-1042` | Fixed. The blocker has an acceptance (ticket 4). |
| A3. Promote can write references before Apply can block them. | Yes (F37) | Fixed. Ticket 4 ships one release before ticket 5. |
| A4. "Include dependency" has no authority, no Apply path, and can delete. | Yes, `project-package-importer.ts:114-122`, `workflow-remover.ts:223-240` | Avoided. The option is rejected. |
| A5. The owner check on reuse makes working destinations fail. | Yes (F21) | Avoided. Apply does not compare owners. |
| A6. Coverage, deletions and the move base have no rule for a branch that many operations build. | Yes for the branch mechanics. The absence of a per-resource base is a reading of the entity list. | Avoided. No coverage field, no explicit deletion, no base owner. The deletion risk goes to decision 4. |
| A7. The version 2 rationale is partly wrong, and the hard break costs the common case. | Yes (F05, F08, F19) | Avoided. Version 1 stays. |
| A8. The owner model does not fit global or instance-scoped credentials. | Yes, `credentials-entity.ts:55, 77` | Fixed. Global is a flag in the hint, not an owner kind. Instance-scoped credentials are excluded with a stated behavior. |
| B-01. Apply widens credential access on a claim that the package cannot support. | Yes, `credential.exporter.ts:58-111`, `promotions.service.ts:1132-1157` | Fixed: item list, permission check, API key rule, no automatic global access, no sharing of an existing credential by the generic import. Accepted in part: use does not prove source access. Decision 2 states this limit. |
| B-02. The Apply reference check ignores what the same Apply deletes. | Yes for the code. The cross-project case has no test. | Fixed. The gate counts deletions, reconciliation keeps referenced workflows in every project (ticket 4), and ticket 8 covers callers that the Apply does not write. |
| B-03. "Old destinations keep working" holds for parsing only. | Yes (F37, F51) | Fixed in part. Release order and a stated minimum version. Accepted limit: a destination that is more than one release behind still has the old behavior. Decision 5. |
| B-04. The placement table leaves cases open; ownership depends on the Apply variant and order. | Yes, `apply-preview.ts:191-207`, F17 | Fixed. One proposal rule for every variant. A project Apply can create the owner project (ticket 2). No silent consumer default. Accepted limit: on an old branch the user selects the home by hand until the hint exists. |
| B-05. The Promote "Dependencies" group is wrong for credentials. | Yes (F24, F17) | Avoided. No branch state and no warning for a credential. |
| B-06. Moves rest on a transfer service that does not behave as assumed. | Yes, `workflow.service.ee.ts:803-890, 1222-1250`, `data-table-importer.ts:337-349` | Fixed. The Apply transfer keeps the publish state. Rights follow the editor move. Ticket 9 covers the data table. The rule "both projects in the package" covers the missing cases and the per-project repositories. Decision 7 covers the shares. |
| B-07. "Never elevates" contradicts the data that the design needs. | Yes, `credential.exporter.ts:61-74`, `credential-matcher.ts:123-145` | Fixed. The package holds no owner for a resource that the user cannot read. No workflow owner in Git. One message for missing and inaccessible. Not reachable today (F36). |
| C-1. The gate counts a workflow as present when the same Apply deletes it. | Yes | Fixed. Same as B-02. |
| C-2. Grants derived from use exceed the access that the source had. | Yes, `credentials-permission-checker.ts:418-474`, API key scope list | Fixed: item list and API key rule. Accepted in part: same limit as B-01. |
| C-3. The default home gives the consumer project owner rights. | Yes, `credential-sharing-scopes.ee.ts:3-16` | Fixed. No project is selected in advance, and the step states the rights. |
| C-4. The ticket order leaves broken or blocking intermediate states. | Yes, `usePromotionBindings.ts:48-52, 68, 145-146` | Fixed. Backend and UI ship together. API changes are additive. Release order for tickets 4 and 5 and for tickets 13 to 15. |
| C-5. A sub-workflow that exists is not proven callable. | Yes, `subworkflow-policy-checker.ts:69-90, 140-144` | Fixed. Ticket 7. |
| D-01. New Promote blocks stop promotions that work today. | Yes (F15, F19) | Avoided. Promote does not block on a dependency. |
| D-02. A binding owner plus a block on every owner change creates dead ends. | Yes (F21) | Avoided. No owner check, no new owner-change block. |
| D-03. Grants derived from consumers can widen access. | Yes | Same as C-2. |
| D-04. The hard block on a missing workflow fails for mutual references, error workflows and old branches; instance Apply can delete the accepted workflow. | Yes for points 1 to 3. Point 4 is a reading of the code. | Fixed. A workflow that the same Apply writes satisfies the reference. The blocker has an acceptance. Error workflows follow the same rule. Old requirement rows get the gate with the acceptance. Reconciliation keeps referenced workflows in every project. |
| D-05. The rule that protects a placement-only project has no ticket and no carrier. | Yes, `promotions.service.ts:1159-1177` | Fixed. Ticket 11 holds the rule. The role "owner only" comes from the operation, not from a manifest list. An older destination ignores the hint, so it never creates such a project through this flow. |
| D-06. Global credentials are missing, and grant removal rests on a flag that goes out of date. | Yes (F17) | Avoided: no sharing list and no removal. Fixed: the global state is in the hint, and the licence rule is in ticket 1. |
| D-07. The ticket order ships the blocks before the fixes. | Yes | Fixed. The access grant is ticket 1 and needs no format change. |

## Part 4: minor findings that changed the solution

| Finding | Effect |
|---|---|
| A9. Only project Apply has a preview and a revision. | The flows use the blocked response and Continue, which exist for both Apply variants. No instance preview is needed. |
| B-08, D-08. Two owner records with no precedence rule. | The hint holds an owner only for a top-level file. The path decides for every other file. |
| B-09. LIGO-1250 is not a base for the promotion tickets. | LIGO-1250 runs in parallel. |
| B-10, C-7. Instance-scoped credentials, licence, credential owner change. | Each has a row in the scope table. |
| C-6. Wrong facts (F14, F26, F34, F38). | The solution does not repeat them. Ticket 5 says "a count", not "raw ids". |
| C-7. The generic import must not share with fewer checks than promotion. | Ticket 3 outcome. |
| D-09. An explicit-creation rule that does not hold for content projects. | The rule is limited to owner-only projects. |

## Part 5: what the code does not settle

- The content and the status of LIGO-1089, LIGO-1091, LIGO-1243, LIGO-1250, LIGO-1258, LIGO-1363 and LIGO-1405. I did not read Linear.
- The cross-project retention gap (`workflow-remover.ts`, `project-package-importer.ts`) is a reading of the code. No test covers it.
- That a move out of a personal project shows as a new workflow is derived from F50. No test was read for it.
- How often a saved workflow holds the id of a data table of another project.
- Whether the binding flow fails cleanly when the owner project is on the branch and not on the destination in a project Apply. The code path suggests an error from the project read.

## Part 6: Red-team resolution

The red-team reviewed `consolidated-solution.md` and returned four major findings and seven minor findings. No finding was a blocker.
I read the cited code for each finding before I acted. I ran no code.
Actions: `fixed` (the solution changed), `decision` (a new open decision for a human), `rejected` (the finding does not hold, with evidence).

### Major findings

| Finding | Action | Reason |
|---|---|---|
| M1. The home selection can place a new credential in a project that the instance Apply deletes. | fixed | Verified. `projectDeletions` lists every team project that the package lacks (`promotions.ee/promotions.service.ts:1160-1177`), one flag confirms all of them (`promotions.service.ts:1027-1034`), and `deleteProject` deletes the owned credentials (`packages/cli/src/services/project.service.ee.ts:185-188, 225-235`). The selector of ticket 2 no longer offers a project that the same Apply lists for deletion. Guard 1 moves from ticket 11 to ticket 2 and now reads the destination: an instance Apply keeps a project while it owns a credential that a workflow of the package uses, and returns a warning. The server cannot enforce the home, so the guard is the server rule. Sections 2, 4.3, 5.6, 6.7, tickets 2 and 11, decision 4. |
| M2. The claim "every public API change is additive" is false for tickets 2 and 4. | fixed in part, decision 8 for the rest | Verified. `ownerProject` is required on a missing credential binding and `conflicts` is a discriminated union (`packages/@n8n/api-types/src/dto/promotions/promotion-apply-check.dto.ts:92-95, 174-259`). Fixed: the plan rule now says that only the shape is additive. The new section 6.8 states the change for each ticket. Ticket 2 keeps the `unknown-owner` code and adds optional fields. "Stop one time" is replaced: the server stores no acceptance, so the blocker returns on each Apply. Decision 8: whether the gate is on for every public API caller, and which form the acceptance has. One fact that the red-team did not use: the promotions public API carries a Beta note that allows a breaking change without a major version (`packages/cli/src/public-api/v1/controllers/promotions.public.controller.ts:82`). So the `3.x` branch is one option and not the only one. |
| M3. A source project deletion with transfer of its workflows stays a permanent Apply dead end. | fixed | Verified. An instance Promote refuses only the moves whose branch project still exists on the source (`promotions.service.ts:1373-1383`). The code comment states the way out of today: the user moves the item on the destination before Apply. The ledger had this fact (F50, corrected statement, point 5) and the solution lost it. Fixed: section 2 states the exception. The scope table has a row. In ticket 13, an instance Apply transfers the item out of a team project that the package does not hold, after the user confirms the destructive changes, and before the project deletions. A project Apply and a personal project keep the block. No submission covers this case, so the rule is marked `[new]`. I did not send it to a human decision because the only alternative is the manual move of today, and the instance Apply already lists the old project for deletion. |
| M4 (a). The Apply message for a personal workflow needs an owner that the package does not carry. | fixed | Verified. A workflow requirement holds id, optional name and `usedBy` (`n8n-packages/entities/workflow/workflow-requirement.exporter.ts:39-52`). The Apply message now says "not on the branch" and lists the possible causes. Only the Promote side names the personal project as the cause. Sections 4.4, 5.7, ticket 4. No owner kind is added to the requirement, because a selective Promote of an older source drops unknown manifest fields (F18). |
| M4 (b). A data table of another project: "Block" in one place, "reported" in three places. | fixed | Verified in the document. D26 adopted "never copy, Promote does not block". The label "Block" was wrong. The row now says Exclude. Ticket 9 now says: Apply plans no table for the consumer project, writes the workflow, returns a warning, and does not block. The id conflict of today no longer occurs for this case. Reason for no block: the reference is already broken on the source (F48), and an instance Apply has no selection. Dissent stays as in D26: A and D want a block. Section 7 has a new row for the rejected blocker. |
| M4 (c). The hint "drives proposals only", but guard 1 used it to suppress a project deletion. | fixed | Verified in the document, and the stale-hint risk follows from the overlay (ledger "missed behaviors", batch 2, M2). The M1 fix removes the cause: guard 1 reads the destination and the requirement rows only. No deletion rule reads the hint. Sections 6.2, 6.7, 7, ticket 11. |
| M4 (d). Ticket 3 uses the first consumer project as the default home, which section 7 rejects. | fixed | Verified in the document. The exception stays and is now stated with its reasons: the generic import has no step where a user can select, and today each consumer project already owns its own copy in both creation modes (`n8n-packages/entities/credential/credential-importer.ts:249-268`). The order is the package order and the result reports the home. Section 7 names the exception. |
| M4 (e). Section 2 "Nothing reports it" contradicts section 7 and the code. | rejected | The red-team states that a published destination caller fails to publish and that Apply counts it. This does not hold for promotion Apply. Both Apply flows use `PreserveTargetState` (`promotions.service.ts:134`), which maps to `noop` (`n8n-packages/entities/workflow/workflow-publishing-policy.ts:34`), and `WorkflowPublisher.apply` returns `unchanged` for `noop` without a call to `activateWorkflow` (`workflow-publisher.ts:163-169`). So the `failed` count that `promotions.service.ts:1583-1585` reads cannot come from this case. The ledger says the same (F37). Section 7 speaks about the generic import, which can publish. Section 2 was correct. I added two sentences to section 2 that state the difference, so that the two sections do not look contradictory. |

### Minor findings

| Finding | Action | Reason |
|---|---|---|
| m1. Apply reads the destination owner, so the home choice controls later overwrites. | fixed | Verified (`n8n-packages/entities/credential/credential-conflict-policy.ts:24-54`, `promotions.service.ts:138`; ledger batch 4, M3). Section 2 has the fact. Section 6.1 is corrected. The home step of ticket 2 and section 5.6 states the effect. |
| m2. Names of personal workflows and of other projects reach Git. | fixed | Verified (`workflow-requirement.exporter.ts:59-69`). This happens today on a project Promote, not only after ticket 5. Ticket 5: the requirement row of a personal workflow holds the id only. Section 6.2 and ticket 10: the project name in the hint is optional, and an export for a connection of one project leaves it out. |
| m3. Older sources leave orphan hint files. | fixed | Verified (`promotions.ee/working-copy-updater.ts:430-434`). The reader ignores a hint without a credential file next to it. The overlay of the new version removes it. Section 6.2, ticket 10. |
| m4. API key gating for grants needs a scope and plumbing that do not exist. | fixed | Verified (`packages/@n8n/permissions/src/public-api-permissions.ee.ts:89-93`, `promotions.public.controller.ts:570-576`). Ticket 1 now states that it adds the scope and passes the key scopes to Apply. One correction to the finding: an owner can add a scope to an existing key (`packages/cli/src/controllers/api-keys.controller.ts:95-110`), so a key does not need a reissue. |
| m5. Extended retention silently keeps workflows that the source deleted. | fixed | Follows from `workflow-remover.ts:246-251` and ticket 4. The Apply result lists each workflow that retention keeps, with its caller. The gate still counts it as present, because the reference works. Section 6.1, ticket 4. |
| m6. Ticket dependencies are incomplete. | fixed | Verified in the document. Ticket 13 depends on 1, 2 and 9, in the text and in the diagram. Ticket 2 states the `project:create` and licence quota condition for the "Create project" offer. |
| m7. Ticket 4 does not define "present on the destination". | fixed, with one difference | Present means: the workflow exists and is not archived. I did not adopt "in a team project". A sub-workflow in a personal project of the destination can work today when its caller policy allows the caller (`packages/cli/src/executions/pre-execution-checks/subworkflow-policy-checker.ts:69-90`), and D12 rejects a new blocker for a destination that works. Ticket 7 checks the caller policy. Section 6.1, ticket 4. |

### Earlier entries that this part changes

- D03 and critique D-05: guard 1 no longer protects "a project that the package names as an owner". It protects a project that owns, on the destination, a credential that a workflow of the package uses. It ships with ticket 2, not ticket 11.
- D17 and D32: the rule "transfer only when the package holds both projects" has one exception for an instance Apply (M3). A project Apply and a move across two connections keep the rule.
- D26: the scope label is Exclude, not Block. Apply returns a warning and does not block.
- D30: the default home of the generic import is a stated exception to the rule of critique C-3.
- Critique C-4, "API changes are additive": true for the shape only. Section 6.8 and decision 8 replace the claim.
- Part 5 gets two more items that the code does not settle: whether the team applies the `3.x` rule to a Beta API (decision 8), and whether the REST response of a failed instance Promote sends the workflow ids (the red-team did not trace it, and the ledger marks F14 as wrong).

## Part 7: revision of 2026-11-17, dependencies first

A human review changed the base model. `solution.md` is now the chosen solution. `consolidated-solution.md` is the alternative. Parts 1 to 6 stay as the record of the earlier model.

Reason for the change: the earlier model lets the destination differ from the source. A missing credential lands in a home that the user selects, and the source never sees it. A diff between the two sides then needs rules for each kind of difference. The reviewer wants structural parity between source and destination.

This revision reverses the consensus of the four submissions. It is a candidate for an ADR.

**R1. Base rule: the branch resolves every reference that resolves on the source.**
- Adopted: Promote checks each dependency of each item that it writes. A dependency that will not be on the branch blocks, with the next step.
- Replaces: D08 (instance Promote never fails), the rule "Promote informs, Apply gates", and the rejected-option row "Promote blocks on a personal owner, an unreadable resource, or an owner change".
- Answer to the earlier rejection ("one workflow would stop the Promote of every team"): it applies only to instance Promote, and only to personal dependencies. A personal workflow dependency already fails instance Promote today (F12). The fix is a full list before the write to the branch, not silence. Decision 1 of `solution.md`.

**R2. Personal resources block on Promote.**
- Replaces: D14 (home selector for a personal credential), the personal rows of the scope table.
- The editor transfer of a credential is the fix (`packages/cli/src/credentials/credentials.service.ee.ts:235`).

**R3. Broken stays broken.**
- A reference that does not work on the source is a warning on both sides. The branch then matches the source. Decision 10 of `solution.md`.

**R4. Item level, not project level.**
- Most cycles between projects are not cycles between items, so they pass in order. A true cycle goes through an instance Promote and an instance Apply. Decision 2 of `solution.md`.

**R5. The branch path is the owner.**
- Replaces: D01 part 2 and decision 1 of the earlier model for new branches. The home selector stays for top-level credentials of existing branches.
- Removes: the owner hint file (tickets 10 and 11 of the earlier plan). No format change at all.
- Kept: Apply does not compare the owner of a credential that exists. Decision 9 of `solution.md` adds a note as an option.

**R6. Credentials are selectable in project Promote.**
- New. Promote selects workflows and folders only today (`packages/@n8n/api-types/src/dto/promotions/promotable-resource.dto.ts:14-15`). Without this, the owner team cannot promote a credential that only other projects use.
- Risk: a credential-only Promote puts a project on the branch with no workflows. An instance Apply then deletes the workflows of that project on the destination (F44). Decision 4 now blocks ticket 5.

**R7. Apply gate without acceptance.**
- Replaces: "apply anyway" and decision 8 option a of the earlier model. On a closed branch each blocker has a fix. A dependency that is not on the branch is a warning.
- The earlier rejection of a hard block (critiques A2, D-04) does not apply: an instance Apply writes the whole package, and a project Apply can apply the other project first.

**R8. Sharing in Git stays rejected.**
- Checked again under the new model. A Promote of project P changes the use of a credential of Q and does not rewrite the file of Q, so a sharing list still goes out of date.

**R9. Repositories for each project.**
- Flagged only. Section 11 of `solution.md`. A separate spike decides.

**R10. Rollout.**
- The Promote check warns for one release, then blocks. Decision 5 of `solution.md`.

## Part 8: revision of 2026-11-17 (evening), complete by default, never stuck

Reason for the change: team feedback on the Notion page and in Slack. The rule "a dependency goes before, or with, what uses it" had no objection. The hard block had: it stops users who cannot access the dependency, and it gives no exit for archived or personal dependencies. `solution.md` now describes the final state only. Work planning is a separate conversation.

**S1. The rule defines "complete". Enforcement gives exits.**
- Adopted: each gap gets the best exit that the user can take: include it, ask the owner, continue incomplete, or block.
- Replaces: R7 (Apply gate without acceptance) and the hard-block part of R1.

**S2. Strict by default. "Allow incomplete" is opt-in.**
- One setting for each environment and each direction, next to `createBranchOnPromotion`. Off by default. No extra permission.
- Rejected: an instance setting (the risk depends on the destination), and "on" by default.

**S3. Selection across projects, one review.**
- Builds on the instance Apply preview (#43422). A Promote across projects opens one review. Runs already store `contents.projectIds` as a list.
- Replaces: the instance Promote and instance Apply as the only route for a cycle across projects (R4 and decision 2 of the previous revision).

**S4. No information leaks.**
- A user never sees information about a resource that they cannot access. The report shows only what the workflow of the user already holds.

**S5. Placeholder credential in the consumer project, then the owner follows the branch.**
- An incomplete Apply creates an empty placeholder for a credential that is not on the branch and not on the destination.
- When Apply writes a credential that the branch places in P, and the destination holds it in Q, Apply moves it to P, keeps every share, then updates it.
- Any owner mismatch moves. No placeholder marker.
- The move needs the rights of the user in P only, because every share stays.
- Rejected: no placeholder (the workflow cannot bind), a placeholder in the owner project (unknown owner), a marker for placeholders only, and access to Q for the move.
- Replaces: decision 9 of the previous revision (a credential with another owner on the destination keeps that owner).

**S6. No placeholder workflow.**
- A workflow gap stays an unresolved reference. A workflow reference that is not on the branch stays a warning.

**S7. Publishing.**
- Promotion Apply never changes the publish state (`PreserveTargetState`). A workflow with a gap does not go live by itself.

**S8. Personal dependencies.**
- Strict: block. "Allow incomplete": a gap with the fix in the message.
- Replaces: R2 for environments that allow incomplete.

**S9. Removed from the document.**
- The rollout (R10, warning for one release). There is no phase in the final state.
- The ticket plan. Planning is separate.
- Auto-apply. It is a future feature and does not shape the solution.
- The reference to LIGO-1268. That ticket is "Allow project promotion without first promoting the entire instance" (Done). It does not cover what an instance Apply deletes. The earlier revisions cited it by mistake.

**S10. Kept.**
- The branch path is the owner (R5). No format change.
- No closure. Sharing in Git stays rejected (R8).
- Per-project repositories stay with LIGO-1399 (R9).

## Part 9: amendments after the specification review (2026-11-17)

Two independent reviews of the specification found contradictions between `solution.md` and the `.feature` files, and rules that were missing. These amendments answer them. Each amendment that a person must confirm is an open decision in `solution.md` section 9.

**A1. The owner follows the branch needs an authorization.** (open decision 5)
- Before: any owner mismatch moves, with rights in the new owner project only (S5).
- Problem: a user with rights in one project can take over a credential with secret values from a project that they cannot access. A client can create a credential with a chosen id.
- Now: a placeholder moves with rights in the new owner project only. Any other credential moves only when the user may move it.
- Replaces: the second and third bullet of S5.

**A2. A placeholder has a marker.** (open decision 6)
- The publish check and the move rule read it. Promote never writes a placeholder to a branch, so a gap stays visible through several environments.
- Replaces: "No placeholder marker" in S5.

**A3. The branch records why a reference is not on the branch.** (open decision 7)
- One optional field on the requirement row: "confirmed gap" or "broken on the source".
- A strict Apply blocks on a confirmed gap and warns on a broken reference, for workflows and for credentials. Journey 4.2 and section 3.4 now agree.
- Replaces: S6, "A workflow reference that is not on the branch stays a warning". Changes R-level "no format change" to "no version change and no new file".

**A4. The Apply check reads the state after the Apply.**
- A target that the same Apply writes must still be usable by its consumer: a grant for a credential, the caller policy for a workflow, not archived.

**A5. One order for deletions.**
- A deletion in the selection that an item of the same Apply references: a gap.
- An instance Apply keeps a workflow that the package still references.
- A caller on the destination that the Apply does not write: the user accepts or cancels.

**A6. Placeholder rules.**
- A placeholder only when the destination does not hold the id. One placeholder for one id. It needs `credential:create`. A confirmation never gives a permission.

**A7. Credentials on Apply.**
- "Include it" for a missing credential adds the step where a person creates it in its owner project.
- A match by id needs the same type.
- An instance credential is a note on Promote and must exist on the destination.
- The home selector stays for a top-level credential of an existing branch only, in both modes.

**A8. The promise about live workflows is the publish state only.** (open decision 8)
- The deletion check and the grant check of a move also read the published version.

**A9. No leak in the other direction.**
- Lists of callers, consumers, kept items and move projects name only what the user can access, and give a count for the rest.
- The check resolves a hidden target internally. Unknown is never "broken".

**A10. "Include it" needs the project in the environment scope and read access to the item.** A dependency outside the environment scope has its own group in the report.

**A11. Known limits.** `solution.md` section 10 lists what the reviews found and this revision does not solve.
