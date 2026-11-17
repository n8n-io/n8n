# LIGO-1159 decision matrix

This document compares the designs of submissions A, B, C and D. It does not rank them.

Sources: `review/task.md`, the four submission folders, and the repository source at the current checkout.

## Code facts used in this comparison

I read these files. I ran no code.

| Fact | Source |
|---|---|
| The manifest version is the literal `'1'`. A reader rejects any other value. | `packages/cli/src/modules/n8n-packages/spec/constants.ts`, `spec/manifest.schema.ts` |
| The manifest and requirement schemas are non-strict `z.object`. A reader drops unknown fields without an error. | `spec/manifest.schema.ts`, `spec/requirements.schema.ts` |
| The `credential.json` schema is strict. A reader rejects an unknown field. | `packages/@n8n/api-types/src/dto/packages/credential.schema.ts` |
| The selective push rewrites `manifest.json`. It parses the old manifest with the schema and rebuilds the collections from a file walk. | `packages/cli/src/modules/promotions.ee/import-manifest-bridge.ts` |
| Instance Promote uses `ExportDependencyPolicy.Fail`. Selective Promote uses `ReferenceOnly`. | `promotions.ee/instance-package.ts`, `promotions.ee/promotions.service.ts` |
| Apply produces `unknown-owner` and `access-required` for credentials. | `promotions.ee/apply-preview.ts` |
| Workflow sharing accepts personal projects only as share targets. | `packages/cli/src/workflows/workflow.service.ee.ts` (filter `type: 'personal'`) |

Not checked in code: whether the tar reader accepts an unknown file in an entity folder, and whether a workflow can hold a reference to a data table or variable of another project.

## Table 1: the eight ticket questions

| Question | A | B | C | D |
|---|---|---|---|---|
| Scope | Supports team-to-team credentials, static sub-workflows, error workflows, scoped variables, and later team-to-team moves. Blocks cross-project data tables, variable and table moves, personal moves, cross-repository moves. Personal and inaccessible dependencies are reference-only. | Supports team credentials, personal credentials (land in a team project), global credentials, sub-workflows and error workflows as references, and team-to-team moves. Leaves out workflow sharing and share cleanup. Says variables and data tables need no work. | Supports team credentials, personal credentials (team home on the destination), global credentials, sub-workflows and error workflows as requirements, and moves in phase 4. Blocks personal moves and cross-connection moves. Leaves out workflow sharing and sharing lists. | Supports team credentials and team sub-workflows as references. Blocks personal-owned dependencies, cross-project variables and data tables, all owner changes, and unresolvable old packages. Does not mention error workflows or workflow sharing. |
| Promote | Never auto-includes. External dependencies stay references by default. Offers an explicit "Include dependency" action. Does not block on personal or hidden dependencies. | Never fails on an outside dependency, in every variant. Shows a Dependencies group with owner and branch presence. Never pulls content in. | Never fails on a dependency. Shows a state for each unselected link (on-branch, same-project, other-project, personal, missing). Instance Promote changes to `reference-only`. | Classifies direct dependencies before the commit. Writes references and topology for team owners. Blocks before the Git write for personal owners, invalid scopes, owner moves, and unreadable metadata. |
| Apply | Keeps the declared owner. Creates a minimal owner project from a Git descriptor when the user has permission. Creates the credential once. Applies grants that Git declares. Blocks on a missing requirement with no force option. | Places a missing credential in the owner project, else the consumer project, else a user choice. Creates once. Shares with in-scope consumers without a separate confirmation. A missing sub-workflow is a confirmable conflict. | Places a missing credential in the source home, else the user selects the home. Creates once. Grants access on Continue after a confirmation, on the server. A missing sub-workflow is a blocker with "Apply anyway". | Places a resource in the declared owner only. Offers an explicit Create project action. Creates the credential once. Adds grants through an explicit action. Full Apply can reconcile grants. A missing sub-workflow is a blocker. |
| Personal projects | Reference-only. Apply reuses a valid destination resource. Otherwise the user moves the resource to a team project at the source. | A personal credential lands in the consumer team project. A personal sub-workflow gives a warning, then a confirmable conflict. | A personal credential gets a team home that the user selects. A personal sub-workflow gives a warning, then a blocker with "Apply anyway". | Promote blocks before the Git write. The user must move the resource to a team project. |
| Moves | Team-to-team moves are one ID-preserving transfer with a three-way owner comparison. They ship after dependency handling. Personal and cross-repository moves stay blocked. | Team-to-team moves are one "moved" change. Apply transfers by id match. A move into a personal project becomes a removal. A move out becomes a new workflow. | Team-to-team moves in one connection are one change in phase 4. Apply ships one release before Promote. Personal and cross-connection moves stay blocked. | Phase 1 blocks every owner change. A later XL ticket adds atomic moves. |
| Permissions | Hidden dependencies are reference-only. Each write type needs its own permission. An authorized person completes the setup. The user retries the same commit. | Promotion acts as the user and never elevates. Each blocker names the permission and the project. The user can choose another project when creation is not allowed. | "Report, do not act, do not leak." The check offers an action only when the user holds the permission. Otherwise the row says who can. | Each action is checked in its real project scope. Blockers hide names. A missing and an inaccessible resource get the same message. Promote can block when it cannot read structure. |
| Package format | Version 2 with identity, owner, owner-project descriptors, requirements, grants, coverage, and explicit deletions. Old readers must reject it. | Version 1 with optional `owner` and `isGlobal` on credential requirements and `owner` on workflow requirements. No sharing data. | No required change. An optional sidecar file next to `credential.json` carries the owner kind, team project, and global flag. No sharing data. | Version 1 with optional `projectReferences`, `placement`, credential `sharing` with a `complete` flag, and `ownerProjectId` on workflow requirements. |
| Consistency | One identity, one owner, one read-only planner for all entry points. Per-type runtime rules stay. | One code path. Only the scope set changes. The generic import follows the same rules. | One pipeline with rules R1 to R8. Three states for each requirement. The generic import follows rule R5. | One contract: managed content scopes versus placement-only project references. Per-type rules stay. |

## Table 2: cross-project cases

| Case | A | B | C | D |
|---|---|---|---|---|
| Credential ownership and project sharing | Support. One id, one declared owner, grants from Git. | Support. Owner project first, then consumer. Shares with in-scope consumers. | Support. Created once at home. Access granted on Continue. | Support. Created once in the declared owner. Explicit grant action. |
| Personal credentials | Exclude. Reference-only; reuse or move at the source. | Support. Lands in the consumer team project. | Support. The user selects a team home. | Block at Promote. |
| Global or instance-scoped credentials | Support. Global access is an explicit grant intent. Little detail. | Support. `isGlobal` travels. Apply makes it global when the user may. | Support. Phase 1 uses grants. Phase 3 offers "make it global". | Not addressed. |
| Static sub-workflows | Support. External by default. Apply checks existence and caller policy, and blocks. | Support. Reference only. Confirmable conflict on Apply. | Support. Requirement. Blocker with "Apply anyway". | Support. Reference only. Apply requires the same id under the same owner, and blocks. |
| Error workflows | Support. Same as sub-workflows. | Support. Same as sub-workflows. | Support. Same as sub-workflows. | Not addressed. |
| Variables | Support. Keeps the declared scope. Adds a shadow warning. | Not cross-project. No new work. | Support. No change. | Not cross-project. Blocks a variable from another project at Promote. |
| Data tables | Block. Cross-project use reports an unsupported scope. | Not cross-project. No new work. | Not cross-project. Content of the own project. | Not cross-project. Blocks a table from another project at Promote. |
| Tags | Not cross-project. Global, unchanged. | Not cross-project. Global, unchanged. | Not cross-project. Global, unchanged. | Support. Global, unchanged. |
| Workflow sharing | Not addressed. | Exclude. | Exclude. | Not addressed. |
| Resource moves | Support. Later release gate. | Support. | Support. Phase 4. | Block. Later follow-up. |
| Permission boundaries | Support. Reference-only for hidden dependencies. | Support. Named scopes for each write. | Support. Report only; future-facing. | Support. Scope check for each action; sanitized blockers. |
| Existing branches | Support. Format 1 keeps its behavior and its blockers. | Support. No version change. `unknown` leads to a picker. | Support. No required change. `unknown-owner` is not produced. | Support. Format 1 fallback. `unknown-owner` stays. |
| Older destination versions | Support. Old clients must reject format 2. | Support. Old destinations ignore the new fields. | Support. Old destinations ignore the sidecar (tar reader not verified). | Support. Old destinations ignore the new fields. |

## Agreements

Each statement holds for every submission that addresses the point.

1. **No automatic closure.** Promote and Apply never add the content of another project automatically (A, B, C, D).
2. **Created once.** Apply creates a missing shared credential one time for each source id and never makes one copy for each consumer project (A, B, C, D).
3. **Package-wide resolution.** Credential resolution runs across the whole package before the per-project import work (A, B, C, D).
4. **No personal project as a destination owner.** Apply never places a resource in a personal project, and never in the personal project of the user who applies (A, B, C, D).
5. **No personal data in Git.** The package carries no email and no personal project name or id; it carries the kind "personal" at most (A, B, C, D).
6. **Silent common case.** A requirement that the destination already satisfies adds no modal and no confirmation (A, B, C, D).
7. **No side-effect update.** Apply never creates or updates an unselected sub-workflow to satisfy a reference (A, B, C, D).
8. **Check before write.** Apply evaluates unresolved requirements before any content write (A, B, C, D).
9. **Selective Apply never removes shares.** A selective Apply keeps credential shares that exist only on the destination (A, B, C, D).
10. **Secrets stay on the destination.** The package keeps the current credential export policy and carries no secret values (A, B, C, D).
11. **Variable scope is fixed.** A variable stays in its declared scope (own project or global), and the design never converts a project variable to a global variable (A, B, C, D).
12. **No cross-project data tables.** A data table is never copied or shared to make a cross-project reference pass (A, B, C, D).
13. **Tags stay global.** Tags keep the current instance-level behavior (A, B, C, D).
14. **Existing branches stay readable.** A current branch needs no migration (A, B, C, D).
15. **No leak.** A preview or blocker does not show the name of a resource that the user cannot read (A, B, C, D).
16. **Actions match permissions.** The design offers a create, share, or move action only when the user holds the permission for that action (A, B, C, D).
17. **Explicit project creation.** Apply does not create an owner project without a visible step (A, B, C, D).
18. **A supported move keeps identity.** A team-to-team move is one transfer that keeps the id; it is not a delete and a create, and Apply must not delete the item in the old project (A, B, C; D defers moves and asks for an atomic transfer later).
19. **A move needs rights in both projects** (A, B, C, D for the later ticket).
20. **Sub-workflows and error workflows share one rule** (A, B, C; D does not mention error workflows).
21. **Per-project connections.** Each model works when the package holds one project (A, B, C, D).
22. **Reference check before open Promote.** The Apply reference check must ship before instance Promote stops failing (B, C; A and D do not address the order).
23. **LIGO-1089.** The decision is option 1 with the visibility of LIGO-1405 (B, C; A and D do not map the ticket).
24. **Promote of a move ships after Apply can land it** (B, C; A does not split the two sides; D defers moves).

## Divergences

### Data model

**D01. Authority of the source owner on the destination.**
Question: Is the owner that Git declares binding on the destination, or is it a default that the destination user can change?
- A, D: Binding. Apply uses the declared owner only. An existing resource under another owner is a conflict. Rationale: one branch must describe one topology on every instance; a consumer placement changes ownership and can duplicate shared resources.
- B: Default. The binding step shows the owner project and the user can change it. Rationale: this removes the `unknown-owner` dead end and still does not guess silently.
- C: Destination concern. A resource that exists by id and is usable satisfies the requirement, whoever owns it. Ownership can differ between instances. Rationale: ids are preserved, so a reference resolves wherever the resource lives.
Why it matters: The answer decides whether Git or the destination is the source of truth for ownership. It drives the package format, the conflict set, and every placement rule.

**D02. Owner project absent from the destination and from the package.**
Question: When the owner project of a missing credential exists in neither place, does Apply create that project or place the credential elsewhere?
- A: Apply offers "Create project X" from an identity-only descriptor in Git. It never uses the consumer project.
- D: Apply offers an explicit Create project action (empty team project with the source id), or the user promotes that project first. It never uses the consumer project.
- B: Apply places the credential in the consumer project. With several consumers the user picks one.
- C: The user selects the home. The default is the consumer project when there is exactly one.
Why it matters: A and D need a project descriptor in the package and can create empty projects on the destination. B and C need no descriptor but let ownership differ from the source.

**D03. Coverage and explicit deletions.**
Question: Must the package declare whether it is a complete snapshot or a partial patch, so that Apply does not delete by absence?
- A: Yes. Format 2 carries coverage and explicit deletions. A partial package cannot delete unrelated projects.
- D: Partly. Placement-only project references are never reconciled or deleted. `sharing.complete` gates grant removals. No general coverage field.
- C: No, not in this spike. C flags the problem (LIGO-1268) as adjacent and asks for a separate decision.
- B: Silent.
Why it matters: Full Apply deletes projects and workflows that the branch lacks. Partial branches are live. The team must decide whether this spike owns that risk.

### Package format

**D04. Format version.**
Question: Does the new metadata need package format version 2?
- A: Yes. Rationale: an old reader can ignore optional fields that change placement and access.
- B, D: No. Keep version 1 with optional fields. Rationale: a version change breaks old branches or old destinations; optional fields are sufficient.
- C: No. Phases 1, 2 and 4 need no format change at all.
Why it matters: The code confirms both premises. A reader rejects a version other than `'1'`, and a reader drops unknown manifest fields silently. The choice is between a hard stop on old destinations and a silent fallback to current behavior.

**D05. Carrier and content of owner metadata.**
Question: Where does owner metadata live, and for which resources?
- A: In the Git tree, not only in the generated manifest. It covers every resource type and includes owner-project descriptors.
- B: In the manifest, as `owner` on credential and workflow requirements. B does not address the manifest rewrite on selective push.
- C: In a sidecar file next to `credential.json`, for credentials only. C carries no owner for referenced workflows. Rationale: `credential.json` is strict, and the selective push rewrites the manifest.
- D: In the manifest, as `projectReferences`, `placement` on credential, variable and data table entries, and `ownerProjectId` on workflow requirements. D requires a change to the manifest bridge.
Why it matters: The code confirms that `credential.json` is strict and that the selective push rebuilds `manifest.json`. A manifest-only field needs bridge work to survive. C's sidecar depends on an unverified tar reader behavior.

**D06. Sharing in the package.**
Question: Does Git carry credential sharing grants?
- A: Yes. Git carries explicit team and global grant intent, and explicit removals.
- D: Yes. Git carries `sharing.projectIds` and a `complete` flag.
- B, C: No. Apply derives the needed grants from `usedBy` and the consumer project. Rationale: sharing is destination access control; a merge request must not change access for untouched projects.
Why it matters: With grants in Git, a branch change can change access on the destination. Without them, the destination can hold fewer shares than the source.

**D07. Removal of shares.**
Question: Can an Apply remove a credential share?
- D: Yes, in a full instance Apply, when `sharing.complete` is true, after a confirmation.
- A: Yes, only through an explicit reviewed removal in Git with an impact check.
- B, C: No. Apply only adds shares. B leaves cleanup to LIGO-1235.
Why it matters: A removal can break production workflows that depend on a destination-only share.

### Promote behavior

**D08. Promote and a dependency that the destination cannot get.**
Question: Does Promote block when a dependency is personal-owned or otherwise unpromotable?
- D: Yes. Promote blocks before the Git write for a personal owner, an invalid scope, an owner move, and unreadable metadata. Rationale: keep unsupported state out of Git.
- B, C: No. Promote never fails on a dependency, including instance Promote. It warns. Apply is the gate. Rationale: one workflow must not block every team.
- A: No. The dependency stays a reference. One shared classifier replaces the `Fail` and `ReferenceOnly` split.
Why it matters: D's rule keeps or extends the instance-wide block that LIGO-1089 reports. The other rule lets incomplete packages reach Git and relies on the Apply gate.

**D09. Explicit inclusion of an external dependency.**
Question: Can the user add a dependency from another project to the promotion?
- A: Yes. "Include dependency" adds the authorized content and the required project and folder descriptors.
- B, C, D: No. A promotion never carries the content of another project. C offers "select it too" for the same project only. Rationale: it writes team B's content through team A's promotion and does not work with per-project repositories.
Why it matters: Inclusion gives a one-step fix but lets a project operation write another project.

**D10. Branch presence in the Promote preview.**
Question: Does the Promote preview check whether the branch already holds each dependency?
- B, C: Yes. A dependency on the branch gives no warning. A dependency not on the branch gives a warning with a next step.
- A: No. The preview shows owner and consumers. Promote states that Apply checks the target.
- D: No. The preview uses the states Ready, Needs destination setup, and Blocked.
Why it matters: The branch check changes the backend work and decides how many warnings a normal promotion shows.

### Apply behavior

**D11. Missing sub-workflow or error workflow on Apply.**
Question: Can the user accept a missing workflow dependency and continue?
- A: No. Apply blocks. There is no force option.
- D: No. Apply blocks and links to the owner-project promotion.
- B: Yes. It is a confirmable conflict, similar to `destructive-change`.
- C: Yes. "Apply anyway" uses a separate confirmation flag, not `confirmDestructiveChanges`.
Why it matters: A hard block lets one broken source workflow stop an instance Apply. A confirmable block lets a broken reference reach production by choice. B and C also differ on the confirmation flag.

**D12. What "resolved" means for a sub-workflow.**
Question: Which checks does Apply run on an external workflow that exists on the destination?
- B, C: Existence by id on the destination or in this Apply. C states that caller policy is content of the called workflow.
- A: Existence and caller policy.
- D: Existence under the same owner project. Another owner is an owner conflict.
Why it matters: Each extra check adds a new blocker type on the destination.

**D13. How Apply grants credential access.**
Question: What user step adds a missing credential share?
- B: None. Apply shares as part of the run. The preview shows an "Access change" row.
- C: One confirmation on Continue (`grantCredentialAccess`). The server shares, then imports.
- D: A separate explicit "Grant access" action. The preview runs again after each action. The first Apply request makes no automatic write.
- A: A reviewed grant operation that Git declares. A user with grant authority performs it before the content Apply.
Why it matters: Git content causes an access change on the destination. The team must choose the level of consent. The choice also decides whether API and CLI users can complete the flow.

### Personal projects

**D14. Personal-owned credential that is missing on the destination.**
Question: What happens to it?
- D: Promote blocks. The user moves the credential to a team project.
- A: Promote keeps a reference. Apply blocks until the user moves the credential at the source and promotes again.
- B: Apply places it in the consumer team project (picker when there are several).
- C: The user selects a team home. The default is the consumer project.
Why it matters: A personal credential shared with a team project is a common setup. The options range from a block at the source to a new owner on the destination.

**D15. Move into or out of a personal project.**
Question: How does such a move behave?
- B: A move into a personal project is a removal with a warning; the push continues; Apply shows a confirmed deletion. A move out is a new workflow.
- A, C, D: The move stays blocked.
Why it matters: B's rule removes an instance-wide block but deletes the workflow on the destination after a confirmation.

### Moves

**D16. Place of moves in this delivery.**
Question: Are team-to-team moves part of the plan?
- A: Yes, as a later release gate (tickets 7 and 8).
- B: Yes (tickets 8 to 10).
- C: Yes, as phase 4 (tickets 11 to 14). Apply ships one release before Promote.
- D: No. Phase 1 blocks all owner changes. One later XL follow-up.
Why it matters: The answer sets the size of the project and the status of LIGO-1363 and LIGO-1258.

**D17. Move mechanics.**
Question: How does Apply detect and run a move?
- A: A three-way comparison of base Git owner, desired Git owner, and destination owner. A third owner is a drift conflict. Ownership and folder changes run in one persistence transaction.
- B, C: Match by id across the projects of the package. Keep the item out of the removal plan. Use the editor's ownership-transfer service. Neither addresses a third owner.
Sub-question: credentials after a move.
- B: Apply shares the workflow's credentials with the new project automatically.
- C: The credentials become requirements of the new project and follow the normal grant step.
- A: Apply checks credential access again under the new owner. Credentials do not move.
Why it matters: C notes that the editor transfer removes sharings and reactivates published workflows. The team must decide between reuse of that service and a new transfer operation.

**D18. Owner change of a credential, variable, or data table.**
Question: Does an owner change of these types on the source reach the destination?
- A: Credentials later, through a domain transfer (ticket 8). Variables and tables stay blocked until a safe transfer exists.
- D: Blocked in phase 1 for all types. The later ticket covers all types.
- B, C: Not addressed as a move. Under their model, credential ownership on the destination is independent of the source.
Why it matters: Under A and D a credential owner change on the source produces a conflict or a block on Apply. Under B and C it produces nothing.

### Permissions

**D19. Detail in a permission blocker.**
Question: How much does a blocker say when the user lacks a permission?
- B: It names the permission and the project.
- C: It says who can do the action (project admin, instance admin). It shows ids, and the credential name and type from the workflow node.
- A: It gives a generic remedy and does not disclose the owner.
- D: It names the action and the permission. It hides project names. A missing and an inaccessible resource get the same message.
Why it matters: A more specific message helps the user fix the problem but can reveal a hidden project or credential.

**D20. Privileged lookups and unreadable dependencies on Promote.**
Question: Can the backend read structure that the user cannot read, and does Promote block without it?
- B: No elevation. Promote writes a reference without data and does not block.
- A: No traversal of hidden content. Promote keeps the reference.
- C: Promote writes the id only. For the generic import, C uses an existence check that does not depend on the user's read access.
- D: A safe backend-only structural lookup is allowed. Promote uses an opaque requirement or blocks.
Why it matters: A backend lookup is an elevation boundary. A Promote block here affects every user with project-level rights in the future.

**D21. User cannot create in the owner project.**
Question: What can the user do?
- B: Ask an admin of the owner project, or choose another project.
- C: The row says who can. No other action.
- A, D: An authorized person completes the setup. The user then retries. No other placement.
Why it matters: B's fallback keeps the user unblocked but changes ownership.

### Compatibility

**D22. Old branch with a top-level credential and no owner data.**
Question: Does the `unknown-owner` dead end stay for existing branches?
- A, D: Yes. Old packages keep the current behavior. The reader never guesses an owner. The next Promote writes the new metadata.
- B: No. `unknown` leads to the binding picker.
- C: No. Apply stops producing `unknown-owner`. The user selects the home. This is ticket 1 and needs no format change.
Why it matters: Existing branches hit this case today. A and D fix it only after a new Promote from an upgraded source.

**D23. Older destination and rollout.**
Question: What must an older destination do with a package that carries the new semantics, and how does the rollout run?
- A: It must reject format 2 before any write. Readers ship before writers. Format 2 writes need an environment opt-in flag. Rollback uses a format 1 commit.
- B, D: It ignores the optional fields and behaves as today. No flag. D does not expect a new cross-project case to apply on an old version.
- C: It ignores the sidecar. For moves, it answers with the current `moved` blocker. The Apply side ships one release before the Promote side.
Why it matters: Destinations often run an older version than the source. The choice is between an explicit failure and current behavior with possibly missing semantics.

### Cross-project cases

**D24. Global credentials.**
Question: How does a global credential reach the destination?
- A: Global access is an explicit grant intent in Git and needs instance authority.
- B: `isGlobal` travels. Apply makes the credential global when the user may share globally. Otherwise Apply treats it as a project credential.
- C: Phase 1 grants access to each consumer project. Phase 3 carries the flag and offers "make it global".
- D: Silent. The schema rule says a credential placement must be a team project.
Why it matters: A global credential gives access to every project. Automatic, offered, and declared are three different consent levels.

**D25. Variables.**
Question: Does this project add any variable work?
- B, C: No. The current behavior is correct. B points to LIGO-1234 for placement.
- A: Yes. Scope travels in format 2. Apply warns when a project variable shadows a global variable. Variable moves stay blocked.
- D: Yes. `placement` on variable entries. Promote blocks a variable from another project.
Why it matters: The answer adds or removes format fields and a new Promote blocker. I did not check in code whether a workflow can reference a variable of another project.

**D26. Data tables.**
Question: Does this project add a blocker for a cross-project data table reference?
- A: Yes. The planner reports an unsupported scope.
- D: Yes. Promote blocks it as an invalid dependency.
- B, C: No. The case cannot occur at runtime. C lists an unverified risk of a double create for a table referenced from two projects.
Why it matters: I did not check in code whether such a reference can exist in a saved workflow. The answer decides whether a new blocker is needed.

**D27. Error workflows.**
Question: Do error workflows follow the sub-workflow rule?
- A, B, C: Yes.
- D: Silent.
Why it matters: `settings.errorWorkflow` is a reference outside the node graph. D's classification and ownership check must cover it or state that it does not.

**D28. Workflow sharing.**
Question: Does workflow sharing travel?
- B: No. It is destination access control with no runtime effect. Close LIGO-1091 with that decision.
- C: No. It targets personal projects only and is not portable.
- A, D: Silent.
Why it matters: The task lists this case. The code confirms that workflow share targets are personal projects only.

**D29. Dynamic references.**
Question: How does the design treat a reference that an expression computes?
- A: A warning at preview. No validation claim.
- B, C, D: Silent.
Why it matters: A dynamic sub-workflow reference passes every static check and can fail at runtime.

**D30. Generic package import (API and CLI).**
Question: Do the new rules apply to the generic `.n8np` import?
- B: Yes. Package-wide resolution, shares with `create-stub`, owner then first consumer placement, workflow references reported in the result, moves under `overwrite`.
- C: Partly. One stub for each id, home then first consumer, shares after creation. The workflow dependency gate stays in promotions; the engine keeps importing dangling references.
- A: The planner extends the engine plan, and every entry point rejects unsupported versions. No placement rule for an import without a UI.
- D: Silent.
Why it matters: LIGO-1250 is an engine bug. The team must decide which rules live in the engine and which in promotions.

**D31. Sharing licence.**
Question: What happens to a grant when the instance has no sharing licence?
- C: The access requirement stays a hard blocker with a reason.
- A, B, D: Silent.
Why it matters: Every design depends on credential sharing to make a cross-project credential usable.

**D32. Dependencies and moves across two connections.**
Question: What does the design say for per-project repositories?
- A: A dependency from another repository stays external. Cross-repository moves stay blocked. Coordinated commits need a later design.
- C: A move across two connections is a documented limit. The per-project project must decide: refuse, or accept the loss with a warning.
- B: The model is the same with a smaller scope. Silent on cross-connection moves.
- D: A project package can carry project references. Silent on cross-connection moves.
Why it matters: Per-project repositories are out of scope, but the solution must stay compatible with them.

### Ticket order

**D33. First deliverable.**
Question: Does the plan start with the package contract or with fixes that need no format change?
- A: Contract first. Format 2 schema, metadata preservation, planner, Promote review, credential placement, Apply review, moves, tests, rollout. Ten tickets, several XL.
- D: Contract first. Topology contract, export classification, Apply planning, credential actions, UI, tests and telemetry, moves later. Seven tickets.
- B: Bug first. LIGO-1250, then the owner field, placement, share step, reference check, instance Promote, preview, moves. Eleven entries.
- C: Dead ends first, with no format change. `unknown-owner`, access grant, UI, LIGO-1250 in parallel, then workflow dependencies, then the sidecar, then moves. Fourteen tickets.
Why it matters: Under A and D, no user-visible fix ships before the format work lands. Under B and C, fixes ship early, but ownership parity comes later or stays partial.

**D34. Use of existing Linear tickets.**
Question: Which existing tickets does the plan reuse, close, or change?
- B: Keep LIGO-1250. Rescope LIGO-1405. Close LIGO-1089 and LIGO-1091. Move LIGO-1363 back to Ready for Dev. Extend LIGO-1258 to cover the push, after Apply moves.
- C: Extend LIGO-1250. Rescope LIGO-1405. Close LIGO-1089 and LIGO-1091. Reopen LIGO-1363 or open a new ticket. Keep LIGO-1258 unchanged and deliver it before Apply moves; add a new ticket for the Promote side.
- A, D: No mapping. Both state that they could not read LIGO-1089, LIGO-1091 and LIGO-1250.
Why it matters: The plans of A and D can duplicate existing tickets. B and C differ on the order and scope of LIGO-1258.
