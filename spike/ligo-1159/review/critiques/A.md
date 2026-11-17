# Critique of submission A

Scope: `submissions/A/solution.md`, `ticket-plan.md`, `evidence.md`, the decision matrix, and repository source. I did not run code. Paths are under `packages/cli/src/modules/` unless they start with `packages/`.

## Findings

### A1 (major). An old source instance silently turns a format 2 branch back into format 1

**Claim in A.** "Old clients must reject format 2 before setup or imports." "Rolling back requires a format 1 branch commit or disabling new writes; stripping metadata is not a valid downgrade." "Upgrade readers before writers."

**Code.** Old import paths do reject a manifest whose version is not `'1'` (F08). The old selective Promote does not. `promoteSelectionResolved` (`promotions.ee/promotions.service.ts:429-515`) never schema-parses the branch manifest. It scans files (`working-copy-updater.ts:267-282`) and then calls `writeImportManifest` (`working-copy-updater.ts:440`). `readLeftoverManifest` (`promotions.ee/import-manifest-bridge.ts:36-51`) returns `undefined` when `safeParse` fails. A format 2 manifest fails, so it is discarded with no error. The bridge then writes `packageFormatVersion: '1'` (`import-manifest-bridge.ts:113-121`) from a fixed file walk. The instance Promote branch check (`branchPlacementsSchema`, `promotions.service.ts:1673-1677`) has no version field, so an old instance Promote passes and replaces the package folder with a format 1 export (`promotions.service.ts:285-287`).

**Consequence.** Suppose a source instance is rolled back to an older n8n version, or a second instance that was not upgraded pushes to the same branch. Its next selective Promote removes owner data, grants, coverage and explicit deletions, and writes `'1'`. It also loses the requirement rows and variable entries of unselected workflows, because these come only from the leftover manifest. Nothing reports an error. A's rollback rule and its "readers before writers" order assume that the only old clients are readers. The old Promote is an old writer. The rules can only cover new versions, so they cannot prevent this. The Promote preview (`promotion-change.service.ts:313-321`) throws on the unreadable manifest, so a UI user is likely warned first. The public API push is not.

### A2 (major). Instance Apply cannot "exclude consumers", so the LIGO-1089 block moves to Apply after the bad state is in Git

**Claim in A.** One shared classifier replaces the `Fail`/`ReferenceOnly` split (evidence.md; ticket 3: "Instance and project entry points produce equivalent decisions"). A personal or hidden dependency stays a reference at Promote. At Apply, a missing static requirement blocks with no force option. The remedies are: "include an available branch dependency, exclude its consumers, or have an authorized person prepare the target".

**Code.** Instance Apply has no selection. `applyResolved` (`promotions.service.ts:991-1042`) calls `check(plan, inventory, undefined, moves)` and returns `blocked` on any blocker. Selection exists only for project Apply, and it is single-project (`n8n-packages.types.ts:319` `selectedProjectId`; `engine/project-package-importer.ts:116-121`).

**Consequence.** Today, a team workflow that calls a personal sub-workflow stops instance Promote before anything reaches Git (F10, `instance-package.ts:41-44`). Under A, instance Promote commits the reference, and a review can merge it. On every destination that lacks the workflow, which is every destination for a personal workflow, the whole instance Apply then blocks. The user cannot exclude the consumer in that flow. The only remedy is a source-side move and a new Promote. A keeps the instance-wide block that LIGO-1089 reports and moves it from the source author to every destination operator. A does not discuss this trade-off.

### A3 (major). Ticket order: Promote stops failing before Apply can block

**Code.** Apply has no check for a missing workflow dependency today. The blocking issue types are `credential-unresolved`, `data-table-unresolved`, `tag-unresolved`, `variable-unresolved` and `missing-node-type` (`n8n-packages/n8n-packages.types.ts:673-707`). `apply-preview.ts` has no rule for `requirements.workflows`.

**Plan.** Ticket 4 ("Use the shared planner before export. Keep external workflow dependencies as references by default.") depends on 2 and 3 only. Apply integration ("A missing static requirement stops content writes") is ticket 6. Ticket 10 adds the opt-in flag, but the plan does not say that tickets 3 to 6 stay behind it.

**Consequence.** If ticket 4 ships before ticket 6, instance Promote writes external sub-workflow and error-workflow references. The current Apply then imports them as dangling references with no warning. Instance Apply also keeps an unpackaged sub-workflow only when the consumer is in the same project scope (`entities/workflow/workflow-remover.ts:226-255`; `project-package-importer.ts:434-440`). The decision matrix notes the same gap (agreement 22: A does not address the order). The Apply gate must ship before the instance Promote policy change.

### A4 (major). "Include dependency" has no defined authority, cannot be applied by the matching Apply, and can be destructive on a format 1 branch

**Claim in A.** "'Include dependency' adds its authorized content and required project/folder descriptors. It does not add the whole project." At Apply: "Offer to include an available branch dependency."

**Code and consequences.**
- *Authority is not defined.* A does not say which permission authorizes the action. Traversal loads with `workflow:export` (`entities/workflow/workflow-dependency-resolver.ts`, F40). That scope is held by project viewers (`packages/@n8n/permissions/src/roles/scopes/project-scopes.ee.ts:251`). Today only owners and admins hold `promotions:promote` (`global-scopes.ee.ts:82`), so the risk is latent. But A is the design for the permission question. Once project-level promote exists, a user with promote rights in Orders and viewer rights in Billing could write Billing's workflow to the branch. An instance Apply would then overwrite that workflow on production. B, C and D reject this for that reason (decision matrix D09).
- *The matching Apply cannot apply it.* Project Apply is single-project. The check filters workflows to `projectId === selection.selectedProjectId` (`promotions.ee/apply-preview.service.ts:218-239`), and the importer filters projects the same way (`project-package-importer.ts:116-121`). Billing's included workflow is therefore never imported by Orders' project Apply, only by instance Apply. "Offer to include an available branch dependency" at Apply needs a multi-project selection Apply. No ticket names that work.
- *Existing guards refuse it.* `assertNoCrossProjectMoves` and `assertNoCrossProjectContainerMoves` (`working-copy-updater.ts:310-354`) refuse a selected item that sits under another project on the branch. Ticket 4 does not mention that it must lift these guards or redesign them.
- *It is destructive without format 2.* On a branch where Billing is absent, the inclusion writes a Billing directory that holds one workflow. Instance Apply treats every packaged project scope as authoritative (`workflow-remover.ts:58-61, 226-241`, `importSource === 'git-pull'`) and hard-deletes the other Billing workflows on the destination. A's protection is format 2 coverage, which ticket 6 enforces. Ticket 4 does not require format 2 or ticket 6.
- *Per-project repositories.* If Orders has its own connection and Billing does not yet have one, Billing's content goes into Orders' repository. When Billing later gets its own connection, two repositories hold Billing's workflow. A's rule, "a dependency from a different configured repository remains external", only applies when both connections already exist.

### A5 (major). The owner check makes working destinations fail

**Claim in A.** For reuse, "Check owner and runtime usability." In the example: "C exists under another owner: show an ownership conflict." Credential transfers come later, in ticket 8.

**Code.** Today Apply matches a credential by id, usability and type only. Owner is ignored (`entities/credential/id-based-credential-matcher.ts:22-36`; personal route excluded in `apply-preview.service.ts:79-80`).

**Consequence.** Three common states pass today and would block under A:
- A destination admin moved C to another team project and shared it with Orders.
- C was created on the destination under its old owner, and the source later moved C to another project.
- The destination got C through a path other than promotion, with the same id.

Each new format 2 Promote produces an ownership conflict on an Apply that works today. The conflict blocks reuse of a dependency that the operation does not change. This contradicts A's own row: "Dependency outside selection, valid on target: Reuse it without updating its content." The case of a source-side credential owner change has no resolution between ticket 5 or 6 and ticket 8 (decision matrix D18). That violates "Existing branches keep working" and the no-friction rule.

### A6 (major). Coverage, explicit deletions and the move "base" have no rule for a branch that many operations build

**Claim in A.** The package declares `coverage` (complete or partial, with `completeProjects`) and explicit `deletions`. A move compares "the base Git owner, desired Git owner, and current target owner".

**Gap.** A branch is not one package. Instance Promote replaces the whole folder (`promotions.service.ts:285-287`). Selective Promote overlays on top and rewrites the manifest (`working-copy-updater.ts:440`). A gives no merge rule:
- After an instance Promote (complete) and then a selective Promote (partial), what is the coverage of the branch? If it is partial, instance Apply stops inferring project and workflow deletions that it handled before. If it is complete, the claim is wrong for content that the selective push did not refresh. The overlay skips refreshes and never removes dependencies (`working-copy-updater.ts:572-574, 681`).
- `deletions` are events in a state tree. If the next push clears them, a destination that applies a later commit misses them. If they accumulate, A defines no expiry and no interaction with re-creation. Grant removals have this problem in the strongest form, because A says omitted grants mean "not managed".
- The destination records only `promotion_run` rows for each environment (`promotions.ee/database/entities/promotion-run.entity.ts`). It has no last-applied commit for each project or resource. After selective Applies, resources come from different commits, so the "base Git owner" of a resource is not defined.

Ticket 1 states that partial coverage never deletes. It does not say how coverage and deletions survive or change across pushes.

### A7 (major). The version 2 rationale is partly wrong, and the hard break costs the common case

**Claim in A.** Rejected option: "Add optional owner fields while keeping version 1. Old readers can ignore fields that change placement and access semantics."

**Code.** This holds for the manifest and requirements (non-strict, decision matrix code facts). It is wrong for entity files, because `credential.json` is strict and an old reader rejects an unknown field (`packages/@n8n/api-types/src/dto/packages/credential.schema.ts:27-35`). For owner data the claim is also not unsafe: an old reader that ignores an owner field falls back to `unknown-owner` (`apply-preview.ts:482-483`), which blocks and writes nothing. Of A's field groups, only coverage and deletions are unsafe to ignore, because instance Apply deletes by absence (F44).

**Consequence.** A version break causes an old destination to reject every Apply from an opted-in branch. That includes single-project packages with no cross-project reference. The fix for the top dead end (`unknown-owner` for a team credential outside the export, F19) reaches users only after tickets 1-6, 9 and 10, plus an opt-in on each environment and a new Promote. All existing branches keep the dead end (decision matrix D22, D33). A does not consider a smaller version break: optional owner fields in version 1, with only the coverage and deletion semantics behind a version change. It also does not say how a source knows that "participating instances support it". Promotions has no registry of destination versions.

### A8 (major). The owner model does not fit global credentials or instance-scoped credentials

**Claim in A.** Owner = "Team project reference, global scope, or reference-only personal/unknown classification". Personal dependency: "Never export its content". Elsewhere, global access is a "grant".

**Code.** `isGlobal` is a flag on a credential that still has an owner project (`packages/@n8n/db/src/entities/credentials-entity.ts:51-55`; `credentials.service.ts:684`). Global is not an owner kind. Users often create a global credential in their own personal project. Under A that credential is both "global scope", so exportable, and "personal", so never exported. The two rules conflict. Credentials with `usageScope: 'instance'` (`credentials-entity.ts:77`) get no file at all today, because the export lookup returns only `usageScope === 'project'` (`packages/@n8n/db/src/repositories/credential-access.repository.ts:121-123`; `credential.exporter.ts:61-74`). A does not mention them. "Global or instance-scoped credentials" is on the task's case list.

### A9 (minor). Wrong or partly wrong facts that A's flows depend on

- "Apply has a read-only plan, dependency checks, source commit checks, and a preview revision" (F32, partly wrong). Only project selection Apply has a preview and revision, and the revision check is optional (`promotions.service.ts:912-926`). Instance Apply has neither (`applyResolved` 991-1042). The public preview routes exist only for projects. A's Apply steps 1-8 ("Review plan", "target revision") and ticket 6 ("Use the same plan in preview and execution") need a new instance preview. A treats it as existing and does not size it.
- `reconcileProjects` is `reconcileTeamProjects` (F44). This error has no design impact.

### A10 (minor). Ticket questions that A leaves open or answers vaguely

- Workflow sharing is on the task's case list. A does not address it (decision matrix D28).
- A does not map LIGO-1089, LIGO-1091 or LIGO-1250. Its plan can duplicate them (D34). The code alone settles LIGO-1089's current behavior (`instance-package.ts:41-44`).
- A personal credential shared with a team project is common. On a fresh destination it stays a hard block, and the only fix is on the source side (D14). A does not count how often users hit this case. It also does not explain how this is better than today's `unknown-owner` result.
- "Create project Billing" uses `createTeamProject`, which enforces the team-project licence quota (`packages/cli/src/services/project.service.ee.ts:483-501`). A does not mention the quota or what happens when the licence has no sharing feature (D31).
- Coverage merge for grants from a partial export is open (see A6). A partial export knows only the grants that the promoter can see.

## Strongest ideas to keep

1. **Partial packages must never delete by absence.** A is the only submission that ties the selective package model to the destructive instance Apply (`projectDeletions` and `reconcileTeamProjects`, and authoritative `git-pull` scopes in `workflow-remover`). This risk is real today. A final design needs an explicit statement of which scopes a package covers, even if the format differs from A's.
2. **Metadata must live in the Git tree and survive the selective overlay.** A names the manifest bridge, the overlay, inventory readers and preview hashes as one unit. It also says that the variable requirement merge key must include scope (F47). This matches `import-manifest-bridge.ts`, which rebuilds the manifest and drops unknown fields.
3. **Separate operations for reuse, setup, grant and transfer, each with its own permission, and silent read-only reuse.** A requirement never authorizes a write. Reuse needs no confirmation. Each write type is checked on its own, and Apply never falls back to the consumer project or a personal project. Moves are ID-preserving transfers that removal reconciliation must not delete. This gives a clear and safe permission model that the other ideas can build on.
