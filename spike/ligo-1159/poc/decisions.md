# LIGO-1159 proof of concept: decisions

This file records each decision that the proof of concept made where the
solution (`../review/final/solution.md`) and the specification (`../spec/`) do
not decide. Each entry is the simplest option that works. None is a product
decision.

## Scope

- Open decisions 1, 2, 3, 5, 6, 7 and 8: the recommendation of the solution is
  implemented. Open decision 4 (stacked promotions) is not implemented.
- Not implemented: agents, instance to instance, central credentials,
  one repository for each project (LIGO-1399).
- No tests and no telemetry. This is a proof of concept.

## Decisions

### D1. Project-level promotion rights

The solution depends on rights for each project (LIGO-1006), which do not
exist. The proof of concept uses this rule, in `PromotionAccessService`:

- A user with the global scope `promotions:promote` (or `promotions:apply`) can
  promote (or apply) every team project.
- Any other user can promote or apply a team project when the user has the
  scope `project:update` in it (a project admin).
- A user can read a project when the user has the scope `project:read` in it.

### D2. Settings field for old clients

`allowIncomplete` defaults to `false` when a client does not send it, on create
and on update. A stored environment without the field is strict.

### D3. Shape of a confirmation

An incomplete operation sends `confirmedGapIds`: the ids of the gaps that the
user saw. The server compares them with the current gaps. When they differ, it
writes nothing and returns the status `gaps-changed` with the new report. The
public API and the CLI use the same field.

### D4. Life cycle of a request to the owner

- One open request for each requester, resource, operation and environment. A
  second "Ask the owner" returns "Request sent" and creates nothing.
- The owner can dismiss a request. A request closes by itself when the resource
  is on the branch (Promote) or on the destination (Apply).
- There is no decline message to the requester.

### D5. API key scopes of a project admin

The project routes of promotions keep their API key scope check
(`promotions:promote`, `promotions:apply`). A browser session gets its key
scopes from the global role, and a member has no promotion scope. So:

- `promotions:promote` and `promotions:apply` are in the key scopes of the
  member role and of every session (`API_KEY_SCOPES_FOR_PROJECT_PROMOTIONS`).
- The key scope only opens the route. The project routes then ask
  `PromotionAccessService` for the right in the project.
- The instance-wide routes keep their global scope check, so the new key scopes
  give nothing there.

### D6. How a project admin finds the environments

`GET /promotions/projects/:projectId/environments` returns the promote and the
apply environment that serve the project, with `canOperate` for each. It needs
read access to the project and no global promotion scope. It returns the id,
the name, the provider type, the branch and the settings. It does not return
the remote URL.

### D7. A strict environment and the status `gaps-changed`

There is no separate status for "strict environment with gaps". The operation
compares `confirmedGapIds` (empty when not sent) with the current gaps. When
they differ, it returns `gaps-changed` with the report, and the report has
`blocked: true` when the environment is strict. A hard block also gives
`blocked: true`.

The result of an instance Promote (`PromotePackageResultDto`) has no `status`.
It only gets the optional `dependencyReport`. A Promote that must report
changed gaps uses the selection result (`PromoteSelectionResultDto`).

### D8. Credentials in a selection across projects

Today a credential is not selectable. It comes with a selected workflow of its
project that uses it. "Include it" must add a credential of another project
that no selected workflow of that project uses, so the selection across
projects has the optional `credentialIds` for each project. Data tables,
variables and tags stay as today: they come with the workflows.

### D9. The reason on a requirement row

The reason is on the row, not on each consumer: it says why the target is not
on the branch. When a Promote of one consumer merges its fresh row with the row
of the branch, a fresh row without a reason keeps the reason of the branch row
while that row still has consumers.

### D10. The project of a preview resource

Each preview resource now has the optional `projectId` and `projectName`: the
project above it in the `parentKey` chain. An instance-wide resource and a
top-level credential have none.

### D11. Telemetry and the status `gaps-changed`

No telemetry event changes. A Promote that returns `gaps-changed` counts as
`preview_changed`, and an Apply that returns it counts as `blocked`.

### D12. Existing tests

The foundation changes make some existing test files fail the typecheck
(mostly fixtures without `allowIncomplete`). They are left as they are.

### D13. Dependency check engine (stream B)

The engine is in `packages/cli/src/modules/promotions.ee/dependency-check/`. It decided these
points:

- **Gap id.** `<consumer workflow id>|<usage>|<target id>`. A grant id is
  `<credential id>|<consumer project id>`.
- **Instance credential on Apply.** The requirement row gets a third reason,
  `instance-credential`. Without it an Apply cannot tell an instance credential that the
  destination lacks from a credential that is not on the branch. The Promote must write it
  (`requirementReasons()` gives the reason of each row).
- **A reason counts only while the branch does not hold the target.** A row of a target that
  is on the branch is ignored, so an old `broken-on-source` cannot hide a new gap.
- **`blocked` and a credential without a home.** The report is `blocked` while a top-level
  credential that the destination lacks has no selected home, in both modes. `credentialHomes`
  lifts it.
- **`blocked` and the callers of a deleted workflow.** `deletionCallers` does not set
  `blocked`. The operation must stop while the list is not empty and
  `confirmDeletionCallers` is not set.
- **Placeholder flag.** Each credential gap of an environment that allows incomplete applies
  gets `placeholder: true` when the destination does not hold the id, also a gap with the exit
  "include". Without it the import has no credential to bind.
- **Placeholder on the source.** The gap keeps the group of its project and has no exit
  "include". It has the detail `placeholder-on-source`.
- **Written credentials.** The check counts a credential as written when a selected workflow
  of its own project uses it, or when the selection names it in `credentialIds` (D8), and the
  user can read it.
- **A target that the user can operate and cannot read** is in the group
  `read-only-project` with "Ask the owner".
- **Archived or refused by the caller policy, in a project that the user cannot access.** The
  gap is in the group `no-access` with "Ask the owner", so the report does not say why.
- **A credential of a personal project that is not shared with the consumer project** counts
  as working on the source (unknown), so it is a `personal` gap and not a warning.
- **"In an open review".** A review holds a target when the changes of the review add or
  modify it. The report gives the review id and no URL.
- **The published version (open decision 8).** The check reads the nodes of the published
  version of each written workflow. A call to a deleted workflow is always read. A credential
  is read only when the Apply moves the workflow to another project. The callers that the
  Apply does not write come from the workflow index.
- **New optional fields of the report:** `detail` on a gap, `blockedReason` on a credential
  move, and `hiddenKeptWorkflowCount`.
### D-ask-1. Ask the owner: who receives a request (stream D)

A recipient is a user who can run the operation of the request in the owner
project (`PromotionAccessService`): an admin of the project, or a user with the
global scope of the operation. When the owner project is not on the instance,
only a user with the global scope receives the request.

### D-ask-2. Ask the owner: a request with no owner to go to (stream D)

The endpoint answers `sent`, stores nothing and writes a log line when:

- the target does not exist, or it is in a personal project (Promote);
- the branch does not hold the target in a project folder (Apply);
- the requester can already run the operation in the owner project.

The endpoint refuses with 403 and one message when the consumer workflow does
not exist, or when the user cannot run the operation in its project. It answers
400 when the consumer workflow does not reference the target.

### D-ask-3. Ask the owner: how a request closes by itself (stream D)

- `PromotionOwnerRequestService.closeSatisfied()` closes the requests for the
  resources that a Promote or an Apply wrote.
- The inbox also checks the open requests when it loads its first page. An
  Apply request closes when this instance holds the resource. A Promote request
  closes when the base branch holds it. The inbox reads the branch of an
  environment at most one time in a minute.
- A placeholder credential on the destination counts as "on the destination".
- The delete of the environment, of the owner project or of the requester
  deletes the request.
### F1. The import option for a move between projects

The import request has the promotion-only option `crossProjectMovePolicy`
(`refuse` by default, `transfer`). The public import never sets it. Under
`transfer`, a workflow or folder that the package holds under project P and the
target holds under team project Q is one transfer. All transfers run after the
projects exist and before the content of any project.

### F2. The transfer is the editor transfer

The import calls `EnterpriseWorkflowService.transferWorkflow` and
`transferFolder`. So the rights, the loss of the shares and the publish
behaviour are the ones of the editor move. A moved item first goes to the root
of the new project. The usual update of the import then puts it in its folder.

### F3. Publish state of a moved workflow

The transfer stops the triggers of a published workflow, changes the owner and
starts the published version again in the new project. The workflow stays
published when the new project accepts that version. When it does not (a policy
of the project, or a credential that the new project cannot use), the transfer
unpublishes the workflow. This is the only case where an Apply unpublishes. The
result names it: `moves[].unpublished.reason`. The plan says which moved
workflows are published (`published`), so a preview can warn.

### F4. A move out of a project that the operation does not write

The plan marks the move with `fromProjectInOperation: false`. It is the
blocking issue `cross-project-move-blocked` (kind `unconfirmed`) until the
request sets `confirmedMovesOutOfOperation`. The field is one flag, not a list
of ids: the preview revision already proves that the user saw the same moves.
An instance Apply sets the flag when the user confirms the destructive changes.
A project Apply never sets it.

### F5. The tree of a moved folder

A folder move transfers the whole tree that the target holds under the folder,
also the workflows and folders that the package does not hold. The old project
does not remove them as "missing from the package". They stay in the new
project until the next Apply, which removes them there under the normal rules.

### F6. A copy with the same source id

When the new project already holds a workflow that came from the same source
workflow under another id, the import updates that copy. The workflow of the
other project does not move.

### F7. A move on the branch

A selection Promote writes a move through the selection of the new project,
with `allowCrossProjectMoves` on the working-copy selection. The write removes
the old branch path and adds the new one in the same working copy. A moved
folder takes its branch directory, with all its content, to the new project.
A moved row that the user selects under the old project is put under the new
project first (`selectionWithMoves`).

### F8. Shape of the moves in the Apply check

The check gets two optional fields: `plannedMoves` (each move with both
projects, `needsConfirmation` and `losesShares`) and `changedProjects`. No new
conflict code. The lists `movedWorkflows` and `movedFolders` keep their
meaning: moves that stop the Apply. `movedFromProject` on a preview resource
now has an optional `name`, because a moved row does not name a project that
the user cannot access.

### F9. The warning of a Promote that deletes a called workflow

The Promote preview reuses `dependencyReport.deletionCallers`. The callers come
from the workflow requirement rows of the branch manifest. No new field.
### D13. When the placeholder marker goes away

The marker goes away when a person saves the credential with values: an update
that carries `data`, through the editor or the public API. A rename alone keeps
the marker. The update of a promotion Apply and of a package import never
removes it. The OAuth callback does not remove it either: the person saves the
credential first.

### D14. The publish check and a live workflow

The publish check runs only for a version that is not live yet, like the check
of the publisher's credential access. A workflow that is already live with the
same version can register its triggers again.

### D15. Credential decisions on the import request

The import engine does not compute a gap, a grant or a move. The caller gives
its decisions in `credentialDependencies` on the import request (promotion-only,
no public DTO and no CLI flag). The engine checks each right again when it
writes. The lists apply only with `credentialMatchingMode: 'id-only'`.

### D16. A confirmed grant and an import that stops

The engine gives a confirmed grant in the write step of the consumer project,
before its workflows. The plan step writes nothing, so a plan that has another
blocking issue gives no grant. A caller that must keep a confirmed grant when
the Apply then stops (the scenario "The Apply grants only the items that the
user confirmed") calls `EnterpriseCredentialsService.grantProjectAccess` before
it plans. The plan then finds the credential usable. Both ways are safe to
repeat.

### D17. The API key scope of a grant

`credential:share` is not an API key scope. The engine does not check a key
scope for a grant. The promotion routes decide which key scope allows a grant
and leave the grant out of the request when the key does not have it.

### D18. The home of a top-level credential file

`credentialHomes` only says which project owns a top-level credential file. The
engine then treats the file like a file in the folder of that project: the
owner follows it and its Apply updates the credential. The engine does not
create the credential. A person creates it with its values, as for any other
missing credential.

### D19. Which credential files a project Apply writes

With `credentialOwnerPolicy: 'follow-package'`, a credential file is content of
its home project, also when no workflow of the Apply uses it. An Apply of the
whole package writes every credential file of each applied project. A selection
Apply writes the files that its selected workflows of the home project use.
The caller can give the exact list in `ownedCredentialIds`. Only the scope of
the home project updates such a credential, so an Apply of a consumer project
never changes it.

### D20. An unresolved workflow reference

The import engine never blocks on a sub-workflow or an error workflow reference
that it cannot resolve: it writes the reference unchanged. So the request has
no list of allowed workflow ids. Only the dependency check of promotions
decides whether such a reference stops an Apply.

### D21. No policy check in the plan for a placeholder

The `credentialSave` policy check runs when the placeholder is written, not in
the plan. A policy that refuses the credential type stops the Apply at the
write of the placeholder.

### D22. A move that cannot run does not stop the Apply

A credential that the user may not move, and a managed or an end-user
credential, stay where they are and do not change. The import continues and the
result lists them. A destination credential with usage scope `instance` blocks,
as before.
