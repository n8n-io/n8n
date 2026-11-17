# Critique of submission B

Scope: I read all four files of submission B, the task, the decision matrix, and the source code. I ran no code. Paths are relative to `packages/cli/src/` unless they start with `packages/`.

No finding is a blocker. Seven findings are major. Three are minor.

## Findings

### B-01 (major) Apply widens credential access on a claim that the package cannot support

**What B says.** Apply shares an existing credential with each consumer project, with no separate confirmation. The reason given: "it reproduces an edge the source has" (solution §2, ADR candidate). A global credential "travels with `isGlobal`. Apply makes it global again if the actor may share globally."

**Why it fails.** B derives the edge from `usedBy`. `usedBy` proves that a workflow file names a credential id. It does not prove that the source project can use that credential.

- The exporter writes a credential requirement with `usedBy` for every id that an exported workflow names. It does this also when the exporting user cannot read the credential, with the name and type taken from the workflow node (`modules/n8n-packages/entities/credential/credential.exporter.ts:58-111`). No step checks project access.
- The editor transfer shares credentials only for the ids that the user selects (`workflows/workflow.service.ee.ts:804-890`, `shareCredentials: string[] = []`). So a moved workflow can name credentials that its new project cannot use on the source. B's own move design then shares all of them on the destination ("The transfer gives B access to the workflow's credentials").
- The import reads credential requirements from `manifest.json` in Git (`modules/n8n-packages/engine/project-package-importer.ts:370-374`). A change to one file in the branch is sufficient to declare a consumer.
- Today this case stops Apply: `accessRequirements.length > 0` blocks (`modules/promotions.ee/promotions.service.ts:1132-1143`). A person must share the credential on purpose.
- B's guard is "It blocks only if the actor can't share it". Only global owners and admins can Apply today (B, current-state §5). The guard never fires.
- The only consent is an "Access change" row in the preview. The public API Apply has no preview step. B adds no confirmation flag. Ticket 1 also adds "every consuming project in the package can use the credential" to the generic import, which has no preview at all.

**Contradiction inside B.** B rejects the sharing graph because "production is often stricter on purpose" (solution §4). The auto-share overrides exactly that stricter production state.

**Open point that B must close.** The text does not say if `isGlobal` applies only when Apply creates the credential, or also to an existing destination credential. In the second reading, one optional manifest field makes a production credential usable by every project, and B specifies no preview row for it. That reading would be a blocker.

**Affects.** Tickets 1, 4, 8. Instance Apply, selective Apply, generic import.

### B-02 (major) The Apply reference check ignores what the same Apply deletes

**What B says.** Ticket 5 checks each workflow reference against "destination ∪ planned workflows". Ticket 5 must ship before ticket 6 so that "incomplete packages" do not "reach production silently". Ticket 10 says "Apply shows the deletion like any other deletion".

**Why it fails.** The check does not subtract the deletions of the Apply. The remover retains a referenced workflow only when the caller is in the same project scope.

- `retainedWorkflowIds` = planned workflows plus `subWorkflowRequirementIds` (`modules/n8n-packages/entities/workflow/workflow-remover.ts:250-255`).
- `subWorkflowRequirements` is filtered to consumers among that project's own workflows (`modules/n8n-packages/engine/project-package-importer.ts:434-440`, `engine/import-result.ts:250-267`).
- Instance Apply uses folder policy `overwrite` with hard delete (`modules/promotions.ee/promotions.service.ts:139-140`).

Case: workflow W in project A calls S in project B. On the source, S is deleted, or S moves to a personal project. Tickets 6 and 10 let instance Promote write this branch. Today `ExportDependencyPolicy.Fail` prevents it (`modules/promotions.ee/instance-package.ts:41-44`).

- Cross-project (W in A, S in B): at check time S exists on the destination, so the check passes. Then scope B hard-deletes S. W keeps a dead id. Nobody is told that W breaks.
- Same project (W and S in A): S is a requirement of scope A, so the remover retains S. The "removal" of ticket 10 never happens on the destination, and nothing reports that.

This is a reading of the code. I found no test for the cross-project case.

A second gap: B claims that ticket 5 "gives LIGO-1170 the closure check that LIGO-1165 deferred". The check covers references from applied workflows. It does not cover a destination workflow that calls a workflow that a selective Apply deletes (`modules/n8n-packages/n8n-packages.types.ts:313-315`: "References to deleted workflows remain unchanged").

**Affects.** Tickets 5, 6, 10. Instance Apply and selective Apply with deletes.

### B-03 (major) "Old destinations keep working" holds for parsing only

**What B says.** No version change. "An older destination ignores the new fields. This matters: destinations often run an older n8n version than the source." The order rules "5 before 6" and "8 before 9" protect the rollout.

**Why it fails.** The order rules are a merge order on one code base. They do not hold across two instances with different versions. B's design changes what the source writes, and an older destination reads that with today's behavior.

- Tickets 9 and 10: Promote writes a move. Today Promote refuses every move (`modules/promotions.ee/promotions.service.ts:1341-1384`, `469-476`), so a branch holds none. An older destination turns each move into a `moved` conflict that Continue cannot pass (`promotions.service.ts:123-125`, `1731-1748`). One move then blocks the whole instance Apply. The only fix is a manual move on the destination.
- Ticket 6: instance Promote stops failing. An older destination has no reference check. This is the exact state that B's own rule "5 must ship before 6" exists to prevent.
- B removes the only stop signal. The manifest version is a literal that a reader rejects when it differs (`modules/n8n-packages/spec/manifest.schema.ts:50`). B keeps `'1'` and proposes no capability gate, no flag, and no "Apply ships one release before Promote" rule.

**Affects.** Tickets 6, 9, 10. Constraint "existing branches keep working" and the case "older destination versions".

### B-04 (major) The placement table leaves cases open, so destination ownership depends on the Apply variant and order

**What B says.** "Apply binds each reference once, in its owner's place." The consistency table says that placement is the "same" for instance, project and selective Apply. B rejects "stub into the consuming project" because "it gives the credential the wrong owner".

**Why it fails.**

1. Three of the four rows of B's own placement table put the credential in the consumer project (team owner absent, personal, unknown). This is the outcome that B rejects in §4.
2. A case falls between row 1 and row 2: owner project B is on the branch, B is not on the destination, and the user runs a project Apply of A. This is the LIGO-1268 case. Row 1 needs "this Apply creates it". A project Apply creates only the selected project (`modules/promotions.ee/apply-preview.ts:191-194`: `missingProjects` holds only projects that the plan creates). Row 2 needs "absent from the package". Neither row applies. B does not say if Apply creates a shell of B from a project Apply of A, or uses the consumer.
3. The same branch gives different owners. Instance Apply puts the credential in B. Project Apply of A first puts it in A (or is undefined, see 2). A later Apply of B finds the id in A and shares it with B. The owner stays inverted. B has no convergence rule.
4. The "unknown" row is more frequent than B assumes. B states that owner-not-in-package "happens only when the owner was never promoted, or is personal" (current-state §2). The fact check marks this partly wrong: a credential that B owns and only an A workflow uses is at the top level although B is on the branch (`modules/n8n-packages/entities/credential/credential.exporter.ts:58-60`, `io/manifest-entry.ts:70-81`). On every existing branch this credential defaults to the consumer project, although its real owner exists on the destination.

Note: a personal credential that lands in consumer project A gives the admins of A owner rights on a credential that they could only use on the source. This is a deliberate decision. B does not state the consequence.

**Affects.** Ticket 3. Project Apply, selective Apply, existing branches.

### B-05 (major) The Promote "Dependencies" group is wrong for credentials

**What B says.** Each outside dependency shows "whether the branch has it". For "In project B · not on the branch" the copy is "Apply needs it. Promote it from project B." Ticket 7 covers "outside sub-workflows and credentials".

**Why it fails.** The badge fits workflows. It does not fit credentials.

- Apply never creates a credential (`must-preexist`, `modules/promotions.ee/promotions.service.ts:136-137`). Apply needs the credential on the destination. The presence of a file on the branch decides nothing.
- "Promote it from project B" does not work. A push of B writes only the credentials that the selected B workflows use (`credential.exporter.ts:58-60`). A credential that B owns and only A uses never reaches `projects/B/credentials/` through a project push.
- The push of A itself writes the credential file at the top level (`io/manifest-entry.ts:70-81`). So "not on the branch" is false immediately after the push.
- Global variables have the same problem (`variableMissingMode: MustPreexist`, `promotions.service.ts:144`).

**Friction on a common case.** B calls a team workflow with a personal credential "a common setup". Promote cannot read the destination. So the personal-owner warning shows on every Promote of that workflow, also when the destination already has the credential. The copy "Apply will ask to confirm" is also wrong for a credential: Apply asks for a binding, not a confirmation.

**Affects.** Ticket 7, ticket 6 dialog. Every Promote variant.

### B-06 (major) Moves rest on a service that does not behave as B assumes

**What B says.** "Transfer it with the editor's ownership-transfer services." "Apply never removes an edge." The move needs "`workflow:move` on both projects". "Variables, data tables: there is no new work here."

**Why it fails.**

- `transferWorkflowOwnership` removes all sharings of the workflow (`workflows/workflow.service.ee.ts:1222-1260`, "Remove all sharings"). A destination-only workflow share is lost.
- The transfer deactivates a published workflow and tries to activate it again. The code comment says: "The destination's policy can refuse the republish, and then the move unpublishes the workflow" (`workflow.service.ee.ts:873-890`). So an Apply can unpublish a production workflow. Apply uses `PreserveTargetState` today.
- The scopes are `workflow:move` on the workflow and `workflow:create` in the destination project (`workflow.service.ee.ts:812-840`), not `workflow:move` in both projects. B's permission table is wrong for this row.
- Data tables: a moved workflow keeps its table id. The import looks for the table in the consumer project, does not find it, plans a create with the source id, and fails with `id-conflict` because the old project holds that id (`modules/n8n-packages/entities/data-table/data-table-importer.ts:91-97`, `337-349`). B says that data tables need no work.
- Not addressed: the destination holds the item in a third project; the old or new project does not exist on the destination; a selective Apply that selects the old project.
- Rule 1 says that "only a promotion of that project changes" content. The selective Promote of a move from A writes into the folder of B on the branch. Section 4 rejects "pull in" for the same reason ("writes team B's content through team A's promotion").
- "The push writes both sides in one commit" is not possible with one repository for each project. B says the model "also works for per-project repositories" and does not mention this case.

**Affects.** Tickets 8, 9. Constraint "stay compatible with per-project repositories".

### B-07 (major) "Never elevates" contradicts the data that the design needs

**What B says.** "Promotion acts as the user and never elevates." An unreadable credential travels as "Reference only, no data". Ticket 7: "An inaccessible dependency shows no name the user can't see."

**Why it fails.** B does not say what the package holds about a dependency that the user cannot read. Each option breaks another rule.

- Credential owner. For an unreadable credential the exporter has only the node's name and type (`credential.exporter.ts:61-74`). If the exporter fills `owner`, it reads beyond the user's rights and writes the id and name of a hidden project to Git. If it does not, the owner is "unknown" and Apply defaults to the consumer project, although the source owner is a known team project.
- Workflow owner. B needs `team`, `personal` or `missing`. Today a missing workflow and an inaccessible workflow look the same (`modules/n8n-packages/entities/workflow/workflow-dependency-resolver.ts:48-53`, `workflow-requirement.exporter.ts:56-71`). The copy "a workflow you can't access" needs an existence lookup without an access check.
- Apply. Without global `credential:read` the matcher gives no reason, so an existing credential looks missing (`modules/n8n-packages/entities/credential/credential-matcher.ts:127-145`). B names this collision in current-state §4 ("Creating it then collides on the id"). The solution gives no rule for it. The placement picker would offer a create that fails.

Today only admins use promotion, so the case is rare. B designs the table for project-level roles (P-LIGO-1604), where it is the normal case.

**Affects.** Tickets 2, 3, 7. The ticket question on permissions.

### B-08 (minor) Two owner records with no precedence rule, and the manifest row is fragile

- After ticket 2 a credential has two owner records: the file path, which Apply reads today (`modules/promotions.ee/apply-preview.ts:482-517`), and `requirements.credentials[].owner`. B says what happens when `owner` is absent. B does not say which record wins when they differ.
- They will differ. The overlay keeps a branch copy under another project and skips the new copy (`modules/promotions.ee/working-copy-updater.ts:572-574`, `681`).
- On a selective push, the staging requirement row replaces the branch row as a whole (`modules/promotions.ee/import-manifest-bridge.ts:313-324`). A push that has no owner for the credential erases the owner that an earlier push wrote.
- A source that runs an older version (for example after a rollback) parses the manifest with the old schema, which drops unknown keys, and rewrites the file (`import-manifest-bridge.ts:46`, `113-123`). All `owner` values of all projects are lost with no error.

Ticket 2 does not name the bridge.

### B-09 (minor) The ticket order delays the fixes that B calls urgent

- Ticket 1 (LIGO-1250) is first because "every credential ticket builds on package-wide resolution". Promotion Apply does not use `create-stub`; it uses `must-preexist` (`promotions.service.ts:136-137`). The promotion check already merges credential issues by id over all projects (`apply-preview.ts:438-517`), and the UI creates the credential once. So tickets 3 and 4 do not depend on ticket 1 in the promotion flow.
- Ticket 3 depends on ticket 2 (format). The personal and unknown cases need no format data: the fix is to stop producing `unknown-owner` and offer a project.
- Result: the two dead ends in B's "Findings worth acting on now" wait for an engine bug that promotion does not hit and for a format change.
- Ticket 3 without ticket 4: the user creates the credential in one picked project, then Continue blocks with `access-required` for the other consumers. The created credential stays. This is not worse than today, but it is a new path to the "ask an administrator" dead end.

### B-10 (minor) Cases that B does not address

- Credentials with `usageScope: 'instance'`. They get no file and Apply reports `incompatible-usage-scope` (`credential-matcher.ts:142`). The task lists "global or instance-scoped credentials".
- Sharing licence. The share route needs `feat:sharing` (`credentials/credentials.controller.ts:569-570`). `shareWithProjects` has no licence check and no permission check (`credentials/credentials.service.ee.ts:44-98`); the controller does both and also sends e-mail (`credentials.controller.ts:649-667`). B's share step "uses the existing credential sharing service with the actor's `credential:share` check" without these facts.
- A credential owner change on the source. Under B it produces nothing on the destination. B does not say so.
- Dynamic sub-workflow references.
- A move across two connections.

## Three ideas to keep

1. **The runtime surface analysis.** Only credential use, workflow references and moves cross a project at runtime. Variables and data tables cannot, and tags are global. The fact check confirms each row (F27, F41, F45, F48). This removes format and blocker work that other designs add for variables and data tables.
2. **One dependency policy for every Promote variant, with the Apply check as the gate.** Instance Promote stops failing on one workflow, the preview uses the same policy as the push, the user gets a list instead of a count, and the Apply reference check ships first. The gate needs the corrections of B-02 and B-03, but the direction is right (F10 to F13, F37).
3. **Remove the two dead ends with a soft fallback.** An unknown or personal owner leads to a placement that the user confirms, not to a hard `unknown-owner` conflict. This works on existing branches with no migration. Git holds the kind `personal` only, with no id and no e-mail. The observation that the reader of "ask an administrator" is the administrator is correct and worth a fix (F19, F20, F28).
