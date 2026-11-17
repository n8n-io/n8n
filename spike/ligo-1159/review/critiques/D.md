# Critique of submission D

Scope: `submissions/D/solution.md` only. I read the code at the current checkout. I ran no code.
Paths below are relative to `packages/cli/src/modules/` unless they start with `packages/`.

## Summary

The core contract of D (managed content scopes and placement-only project references) is coherent. No single finding makes it unworkable.
The failures are in the rules that D adds around the contract:

- D adds hard blocks on Promote and on Apply for states that pass today. Most of them have no exit in the first delivery.
- D makes the Git owner binding for resources that already exist on the destination. That breaks destination pairs that work today.
- D derives the grants from the consumers. That can widen access on the destination.
- D supports a branch that does not hold the owner project, but the plan does not protect that project or the referenced sub-workflow from the instance Apply.
- The ticket order ships the new blocks before the fixes.

I rate eight findings: six major, two minor. I rate no blocker.

## Findings

### D-01 (major) The new Promote blocks stop promotions that work today, and they apply to the whole instance

What D says: "Promote must classify each selected dependency before it writes Git. It must block when a personal project owns a required resource." The `Blocked` state also covers "the scope is invalid, the actor cannot export safe metadata, or the resource moved". Ticket 2: "Block personal ownership, invalid scopes, and inaccessible structural metadata."

What the code does today:

- Instance Promote and selective Promote both succeed when a team workflow uses a personal credential. The exporter writes the file to top-level `credentials/` (`n8n-packages/io/manifest-entry.ts:70-81`, test `n8n-packages/__tests__/export-project.integration.test.ts:484-502`).
- A credential that the user cannot read becomes a requirement row and the export continues (`n8n-packages/entities/credential/credential.exporter.ts:61-74,106-111`).
- Apply continues when the destination holds a usable credential with the same id (fact F19).

Consequences:

1. One team workflow that uses one personal credential blocks the instance Promote of every team project. Today only a personal sub-workflow does that (`promotions.ee/instance-package.ts:42-44`, LIGO-1089). D keeps the `Fail` policy for instance Promote and adds credentials to the same block. D does not resolve LIGO-1089; D makes it larger.
2. A global credential can have a personal owner. `isGlobal` is a flag that a user with `credential:shareGlobally` sets on any credential (`packages/cli/src/credentials/credentials.service.ts:2414-2423`). D has no rule for global credentials, so its classifier sees "personal owner" and blocks every workflow that uses the credential.
3. The exporter never returns a credential with `usageScope: 'instance'` (`packages/@n8n/db/src/repositories/credential-access.repository.ts:99-124`). Under D that is "inaccessible structural metadata". D does not say whether this blocks.
4. An existing branch with a top-level personal credential can still be applied, but the source can never update it again until every such credential moves to a team project.

D calls the common path "unchanged". For an instance with personal credentials in team workflows it is not.

### D-02 (major) A binding owner plus a block on every owner change turns harmless states into dead ends, and D's own remedy for D-01 leads into it

What D says: "The first implementation must block owner changes for workflows, folders, credentials, variables, and data tables." Ticket 3: "Validate owner identity for existing resources." Scenario 8: "A credential owner changed from B to C. Preview shows the move and Apply writes nothing." The Promote flow chart has "Owner moved -> Block and show the move". Ticket 7 (moves) is "a separate follow-up", size XL, with no design.

What the code does today: Apply does not compare credential owners. It needs only a credential with the same id that the consumer project can use: owned, shared, or global (`n8n-packages/entities/credential/credential-matcher.ts:101-107`, `packages/cli/src/credentials/credentials.service.ts:668-685`). A credential transfer between team projects is an editor feature (`packages/cli/src/credentials/credentials.controller.ts:685-695`). It has no effect on Promote or Apply today.

Consequences:

1. Promote: after ticket 2, one credential transfer on the source blocks the Promote of every consumer project, and the instance Promote. Git cannot learn the new owner. The only exit is to move the credential back. For workflows this block exists today (`promotions.ee/promotions.service.ts:1332-1383`). For credentials, variables and data tables it is new.
2. Apply: a top-level credential has no creation path today (`unknown-owner` offers no action, `promotions.ee/apply-preview.ts:482-483`). So each destination that works today got the credential out of band: a database copy, or `POST /credentials` with the id, in a project that the operator selected. The first Promote from the new code writes `placement`. Each destination whose owner differs then gets an owner conflict and "writes nothing". The branch and destination pair worked the day before.
3. D-01 tells the user to "move it to a team project". After that move, the package declares team project T. Each destination that holds the credential under another owner (the usual case, see point 2) gets the owner conflict of ticket 3. The user must repeat the transfer by hand on every destination, and T must exist there with the source id.

The ticket asks how a cross-project move shows and applies. D answers "it is blocked" and extends the block to three more resource types and to the Promote side.

### D-03 (major) Grants derived from consumers can widen access on the destination

What D says: "After creation, Apply grants access to the selected consumer projects." "Selective Apply adds only the grants required by selected consumers." "When the exporter cannot read the full grant set, it stores only the grants required by packaged consumers." "Personal grants are not serialized."

The required grant is therefore "the project of each consumer workflow". It is not "the projects that the source shares the credential with".

Code fact: a user can use a credential in a team workflow through the personal route. The route covers every credential that has a share row with the user's personal project, including a credential that a team project owns (`packages/cli/src/credentials/credentials.service.ts:750-776`, filter `c.shared.some((s) => s.projectId === personalProject.id)`).

Scenario: credential X belongs to team project B. The source shares X with user U only. U uses X in a workflow of project A. On the source, the other members of A cannot use X. Under D, Promote records owner B and the required grant A. Apply shows "Grant access". After one click, every member of A on the destination can use the destination credential X.

The action is explicit and needs `credential:share`, so this is not a silent escalation. But the design gives the actor no signal that the source does not share X with A. D carries `sharing.projectIds`, so it could show the difference. It does not say so.
Today Apply refuses this case on purpose: `credentialPersonalRoute: Exclude`, "A credential must be usable by the project, not only by the user who applies" (`promotions.ee/apply-preview.service.ts:79-80`).

Related ambiguity: "After creation, Apply grants access" reads as automatic. Ticket 4 says "Do not add an automatic write to the first Apply request." D does not say which rule holds after the credential editor closes.

### D-04 (major) The hard block on a missing external workflow has failing cases, and the instance Apply can delete the workflow that the check just accepted

What D says: "External sub-workflow is missing -> Block." "Apply can continue after the destination has the same workflow ID in the expected owner project." There is no confirm option.

1. Mutual references. Project A calls a workflow of B, and B calls a workflow of A (or both name an error workflow of the other). A selective Apply is scoped to one project and never expands (`n8n-packages/engine/project-package-importer.ts:114-122,355-360`). On a new destination, the Apply of A waits for B and the Apply of B waits for A. Only an instance Apply can pass, and D does not state that a workflow written by the same Apply satisfies the requirement.
2. Error workflows. D never mentions them. The exporter records `settings.errorWorkflow` as the same requirement type (`n8n-packages/entities/workflow/references/workflow-references.ts:8-12`, `error-workflow.reference.ts:9-13`). A central error-handler project is a usual layout. Under D each project Apply is blocked until that project is applied, or the error workflow is not covered by the owner check. D does not say which.
3. Existing branches. Apply has no rule for workflow requirements today. `toPreviewCheck` adds credential rules, variable rules and moves only (`promotions.ee/apply-preview.ts:174-245`). Existing branches already hold `requirements.workflows` rows without `ownerProjectId`. D's seven compatibility rules do not cover these rows. If the new block applies to them, a branch that applies today stops after ticket 3.
4. Delete after check. Each project scope of an instance Apply hard-deletes the owned workflows that the package does not hold. It keeps only the requirement ids whose consumers are workflows of the same project (`project-package-importer.ts:434-440`, `engine/import-result.ts:250-267`, `entities/workflow/workflow-remover.ts:226-255`). Take a branch built by selective pushes that holds part of B but not the sub-workflow. B is then a managed scope, so D's rule "Apply must not reconcile or delete" a placement-only project does not protect it. D's check accepts the sub-workflow under B, and the same Apply deletes it. This point is a reading of the code. I found no test for it. D lists the case as "Support" (scenario 3) and no ticket makes the retention package-wide.

### D-05 (major) The instance Apply and the placement-only project: the protection rule has no ticket and no carrier

What D says: "`manifest.projectReferences` lists placement-only projects. Apply must not reconcile or delete their contents." The `Create project` action creates an empty team project B with the source id, and the credential is then created in B.

Code facts:

- The instance Apply lists every destination team project that the package files do not hold as `project-deletion` (`promotions.ee/promotions.service.ts:1160-1177`). The list comes from the inventory, which reads directories only: "`manifest.json` and other files are ignored" (`n8n-packages/io/directory/package-directory-inventory-reader.ts:109-114`).
- A confirmed deletion removes the project with its owned credentials (`promotions.service.ts:1522-1540`, `packages/cli/src/services/project.service.ee.ts:211-257`).

Consequences:

1. D's flow creates on the destination exactly the kind of project that the next instance Apply offers for deletion: a team project that is not under `projects/` on the branch. Deletion removes the shared credential that the workflows of A use. The exemption is a product rule in D, but no ticket names it. Ticket 3 is "read-only" and speaks only of the planning order.
2. An older destination ignores `projectReferences`. It offers the deletion of B. D says an older version "has the same safe behavior as it has today". That is true only because the same partial-branch risk exists today. D makes the branch without the owner project the supported shape, so the case becomes normal.
3. `projectReferences` is a manifest-level list, but "placement-only" is a property of one operation. In a selective Apply of A from a full branch, B is in `manifest.projects` and is still placement-only for that Apply. D's rule "a project ID must not appear as both" cannot express this. The claim of one contract across the modes holds only when the reader derives the role from the selection, which D does not state.

### D-06 (major) Global credentials are missing, and the grant reconciliation of a full Apply rests on a flag that selective pushes cannot keep current

1. Global credentials. The package carries no global flag (`n8n-packages/entities/credential/credential.serializer.ts:11-27`). D adds none, and the schema rule says "A credential placement must be a team project." For a global credential that team project B owns and project A uses, the source has no share row for A. `sharing.projectIds` then lacks A, while "required grants" include A. With `sharing.complete: true`, the full Apply "can reconcile the full team-project grant set" and shows the grant of A as a removal. If the user confirms, the workflows of A lose the credential, because the destination copy is not global. D does not say which rule wins.
2. Stale `complete`. A selective push exports only the credentials that the selected workflows use (`credential.exporter.ts:58-60`). The overlay skips the staging copy when the branch holds the credential under another project (`promotions.ee/working-copy-updater.ts:572-574,681`). D's merge keeps "leftover metadata for unselected consumers". So `complete: true` is a claim about the moment of one earlier push. A share that the source adds later reaches Git only when a workflow that uses the credential is pushed again. A full Apply then offers the removal of a grant that the source has.
3. Sharing licence. Credential sharing needs `feat:sharing` (`packages/cli/src/credentials/credentials.controller.ts:569-570`). D does not say what `Grant access` does without it.

The confirmation step limits the damage of points 1 and 2. The preview still presents a wrong removal as the Git truth.

### D-07 (major) The ticket order ships the blocks before the fixes, and puts the format work in front of a fix that does not need it

- Ticket 2 without ticket 3: Promote starts to block (D-01, D-02) and writes `placement` and `sharing` to Git. Apply gains nothing. Users lose promotions and get no new capability.
- Ticket 3 without tickets 4 and 5: Apply returns new typed blockers (missing owner project, missing external workflow, wrong owner, missing grant). No action exists for them yet. Public API and CLI callers get new blocker codes with no way to resolve them. The wrong-owner and missing-workflow blockers stop Applies that pass today (D-02, D-04).
- The most common dead end today needs no format change. A credential whose owner project is in the package is already under `projects/<owner>/credentials/`. The binding flow already creates it in the owner project (`packages/modules/promotions/frontend/src/composables/usePromotionBindingCreation.ts:136-170`). The consumer in another project then stops on `access-required`, which the dialog cannot resolve (`promotions.ee/apply-preview.ts:477-481,495-505`). D's `Grant access` fixes this from data that the package already holds. D places it in ticket 4, behind two L tickets.
- The plan has no ticket for these items that the design needs: the project-deletion exemption (D-05), package-wide retention of referenced sub-workflows (D-04), the overlay relocation of D-08, and the generic import (LIGO-1250). D says it could not read LIGO-1089, LIGO-1091 and LIGO-1250 and maps none of the related tickets.

### D-08 (minor) Two owner records (path and `placement`) with no rule for a disagreement, and one case where D's own schema rule fails

- D says "New packages must make the file path and placement agree when the owner is a managed project." Fact F17 case (c): Beta is on the branch, but no earlier push wrote credential X under it, because only an Alpha workflow uses X. A push of Alpha exports only Alpha (`promotions.service.ts:493-509`), so X goes to top-level `credentials/` with `placement: beta`. The overlay does not relocate it. `partitionChangedDependencies` skips or deletes only when the branch already holds the id (`working-copy-updater.ts:550-581`). The merged manifest then has Beta in `projects` and X at the top level. That breaks the rule. No ticket adds the relocation.
- If ticket 1 puts the cross-field rules into `packageManifestSchema`, a manifest that breaks one is discarded without an error on the next selective push (`promotions.ee/import-manifest-bridge.ts:36-51`). The leftover placements, shares, variable entries and requirements are then lost.
- An older source version rebuilds the manifest through the non-strict schema and drops `placement`, `sharing` and `projectReferences` for every entry, without an error (`import-manifest-bridge.ts:113-121`, `n8n-packages/spec/manifest.schema.ts:49-64`). This applies during a rolling upgrade of the source or after a rollback. D's mixed-version risk covers an older Apply only.
- `placement` on variable and data table entries records nothing new. The exporter resolves a variable only from the consumer project or the global scope (`n8n-packages/entities/variable/variable.exporter.ts:126-157`), and the path already carries that scope. The "variable from an unrelated project" block is for a case that the exporter cannot produce.

### D-09 (minor) Ticket questions answered vaguely or not at all

- Permissions on Promote: "it must use an opaque requirement or block." D does not select one. An opaque requirement has no owner, so Apply falls back to `unknown-owner`. A block stops a user because of a dependency that the message must not name.
- "`credential:read`, or a safe backend-only structural lookup": this is an elevation boundary. `projectReferences` carries `name`, so the lookup would write the name of a project that the user cannot read into Git. That is against D's own rule "must not reveal a hidden ... project name". D does not resolve this.
- Workflow sharing, error workflows, global and instance-scoped credentials, dynamic references, and the generic package import are not addressed.
- Moves: the answer is a deferral to one XL ticket that "needs a transaction design, rollback behavior, permission rules, and a migration path".
- Existing instance Apply creates a missing managed project without a user step (`n8n-packages/entities/project/project-importer.ts:97-105`). D lists this under "What already works" and also rejects "Create projects ... silently during Apply". The rule "project creation needs an explicit action" therefore holds for a placement-only project and not for a managed project.

## What the code does not settle

- How often a saved workflow holds a data table id of another project. The exporter accepts it (`n8n-packages/entities/data-table/data-table.exporter.ts:50-70`), and D blocks Promote for it. I did not check how such a reference comes to exist.
- D-04 point 4 is a reading of the remover code, not an observed result.
- D-03 depends on what the `Grant access` row shows. D does not specify it.

## Strongest ideas to keep

1. **Managed content scopes versus placement-only project references.** A package can name an owner project without carrying it, and Apply never reconciles or deletes a project that is only named. This answers "where does the resource land" without a selection that grows, and it fits per-project repositories.
2. **Topology first, explicit and idempotent actions, no content write while a topology blocker remains.** `Create project`, `Set up credential` and `Grant access` are separate actions with a permission check in the real project scope, and the preview runs again after each one. One credential row lists all consumer projects.
3. **Git must state how complete its knowledge is before Apply removes anything, and the selective manifest merge must preserve metadata by type and id.** A selective Apply never removes a grant. A removal is a destructive change that needs a confirmation. D names the manifest bridge as the largest compatibility risk and gives acceptance scenarios 9 and 10 for it. The "never guess a missing owner" fallback for old branches is safe.
