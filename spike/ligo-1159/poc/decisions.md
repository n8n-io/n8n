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

Superseded by S1: the field does not exist any more.

`allowIncomplete` defaults to `false` when a client does not send it, on create
and on update. A stored environment without the field is strict.

### D3. Shape of a confirmation

Partly superseded by S1: every operation with gaps sends `confirmedGapIds`, not only an "incomplete" one.

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

Partly superseded by S1: no environment is strict, so a gap never sets `blocked`.

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

Partly superseded by S1: the fixtures of the tests now fail for the opposite reason, they still send `allowIncomplete`.

The foundation changes make some existing test files fail the typecheck
(mostly fixtures without `allowIncomplete`). They are left as they are.

### D13. Dependency check engine (stream B)

Partly superseded by S1: there is one mode, and each credential gap whose id the destination does not hold gets the placeholder flag.

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
## Decisions of the stream "selection across projects"

### A1. New routes, old routes stay

The operations across projects have their own routes on the environment:
`GET /promotions/environments/:id/changes/:direction`,
`POST /promotions/environments/:id/changes/:direction/details`,
`POST /promotions/environments/:id/promote-selection` and
`POST /promotions/environments/:id/apply-selection`. The whole-instance routes
(`/changes`, `/promote`, `/apply`) do not change and stay for instance
environments and global admins. There is no `apply-selection/continue`: the
request has `expectedSource` and `confirmDestructiveChanges`, so a client sends
the same route again.

### A2. The projects of the changes view

- The view lists the projects that the environment covers and that the user can
  read. An instance environment covers every team project. A projects
  environment covers its linked projects.
- The export acts as the user, so a project has resources only when the user
  also holds `project:export` in it. Else the project is listed without
  resources.
- The Apply plan covers only the projects that the user can apply. A project
  that the user can only read is compared by its files, and it never adds a
  conflict to the check.
- A project of the branch that this instance lacks is listed only for a user
  with the global right on an instance environment, because the Apply creates
  it.
- A project that the branch lacks is listed without resources on Apply.
- A user without a project in the environment gets status 403.

### A3. A credential in a Promote across projects follows the selection

A credential file is written under its owner project only when a selected
workflow of that project uses it, or when it is in `credentialIds` of that
project. An export of several projects would also write a credential of project
B that only a workflow of project A uses. The Promote removes that file again,
so the reference stays a requirement row and the dependency check can report
the gap. `credentialIds` refuses a credential that the project does not own, an
instance credential and a placeholder.

### A4. A selected credential in an Apply across projects

A selected credential that this instance holds goes to the import as a
requirement of its project without consumers. The import matches it and
updates it by the existing rules. A selected credential that this instance
lacks is a `missingBindings` row with `ownerProject`, and it can have no
consumers. The schema of the row now accepts an empty `consumers` list.

### A5. The open-review gate in the operation

A Promote whose selection holds a project with an open review returns status
409, for the project route and for the environment route. The preview shows
the same state as `blocker` or `blockers`.

### A6. What a selection cannot do

A selection never removes a project from the branch and never deletes a
project on the instance. Only the whole-instance Promote and Apply do that. A
credential file without a consumer on the branch stays through selection
Promotes, and a whole-instance Promote removes it.

## Decisions of the stream "backend integration"

### G1. One gate, and the report of a preview

`PromotionDependencyGate` is the only caller of the check engine. An operation
gives it the selection that it writes. A preview has no selection, so its report
is the report of "every change that the user can operate": the added and the
changed workflows of each operable project, and the deleted ones. A client that
shows the report of another selection calls
`POST /promotions/environments/:id/changes/:direction/dependency-report` with
that selection. The route writes nothing. A preview catches a failure of the
check and returns no report. An operation does not catch it.

### G2. A selected folder is not a selected workflow

A selected folder writes the folder and not the workflows inside it, on Promote
and on Apply. So the gate does not give `folderIds` to the check.

### G3. The whole-instance Promote route

The result of `POST /environments/:id/promote` has no status. When the Promote
must stop, the route answers 409 and the message lists the gaps. The check uses
the selection "every workflow and every project credential of every team
project". The route accepts `confirmedGapIds`, and its result carries
`dependencyReport`.

### G4. Which status an Apply returns when it stops

Partly superseded by S1: the cause "the environment is strict and gaps exist" does not exist any more.

- `gaps-changed`, before any write and before any grant: the gaps differ from
  `confirmedGapIds`, the environment is strict and gaps exist, the report has a
  hard block, or `deletionCallers` is not empty and `confirmDeletionCallers` is
  not set.
- `blocked`, with `check`, `dependencyReport` and the grants given so far: a
  needed grant is not confirmed (`accessRequirements`), a top-level credential
  has no home (`unknown-owner`), a credential that the Apply writes is missing
  (`missingBindings`), or any other conflict of the plan.

The order is: check, compare the confirmations, give the confirmed grants,
plan, compare the plan. So a confirmed grant stays when the Apply then returns
`blocked`.

### G5. One row for one reference

`reconcileApplyCheck` removes from `check` each credential row that the report
describes: a gap, a warning, a hard block or a grant. `accessRequirements` then
holds exactly the grants of the report that the user did not confirm. A
`missingBindings` row stays for a credential that the Apply writes for its
owner project. `unknown-owner` stays for a top-level credential without a home.
With a home, it becomes a `missingBindings` row in the home project: a person
creates the credential there. The preview revision is computed before this
step, so it does not depend on the report.

### G6. What the import gets from the check

Partly superseded by S1: the check gives the placeholders on every environment.

- `credentialOwnerPolicy: 'follow-package'` is in every Apply request, also in
  the previews, so a move is a change row of the credential.
- `placeholderCredentialIds`: the credentials of the placeholders of the check.
  The check gives them only on an environment that allows incomplete applies,
  and the operation reaches the import only after the user confirmed the gaps.
  A gap with the exit "include" that the user confirmed instead also gets a
  placeholder: without one the workflow has no credential to bind.
- `allowedUnresolvedCredentialIds`: each other credential gap, and each
  credential reference that is broken on the source.
- `credentialGrants`: the confirmed grants that the report lists. The gate gives
  them before the plan. A grant that the report does not list is ignored.
- `credentialHomes`: only the homes that the check accepted.
- `ownedCredentialIds` is not sent. The default of the import (D19) is the rule
  of the check.
- `retainedWorkflowIds` (new, promotion-only): the workflows that reconciliation
  keeps, in any project of the import.

The import plan is the second opinion on a placeholder: a placeholder that the
plan may not create (`placeholderForbidden`) becomes the hard block
`placeholder-create-forbidden`, and the Apply returns `gaps-changed`.

### G7. The API key scope of a grant

A grant through an API key needs the key scope `credential:update`. Without
it, the route drops `confirmedGrantIds`, so the Apply shares nothing and
returns `blocked` on the access.

### G8. A project that an instance Apply keeps

The report has the new optional fields `keptProjects` and
`hiddenKeptProjectCount`. A kept project is not in the `project-deletion`
conflicts, so the Apply does not delete it. The preview still lists the content
of a kept project as deleted.

### G9. Texts for clients without their own texts

The `applied` result has the new optional field `dependencyMessages`: one
English sentence for each placeholder, each credential that did not move, and
each kept workflow or project. The CLI prints them. The editor writes its own
texts from the structured lists.

### G10. Owner requests and a Promote into a review

A Promote that pushes to a review branch does not close an "Ask the owner"
request. The request closes when the review merges and the inbox reads the base
branch. A Promote to the base branch and an Apply close the requests at once.

### G11. Not connected

- The review link of a gap has no URL: the review row does not store one.
- "Who can grant access" is not computed.
- "Create project" and "Apply the owner project first" are not exits of a gap.
  A missing owner project gives "include" for a global admin and "ask the
  owner" for any other user.
## Decisions of the user interface (stream E)

### E1. The dependency report follows the selection in the client

The preview is one `GET` and does not know the selection. The page keeps the
part of the report that belongs to the selection
(`scopeDependencyReport` in `promotionDependencies.ts`):

- A gap, a warning, a note and a hard block stay while their consumer workflow
  is in the operation.
- A gap with `include` leaves the list when the operation holds
  `include.resourceKey`.
- A gap of the group `deleted-by-apply` leaves the list when the user clears
  the deleted workflow.

So the best preview report holds each reference whose target does not come
with its consumer, also when the target is another change of the same preview.
The operation is the authority: it computes the gaps again and returns
`gaps-changed`. The page then shows the report of that result until the
selection changes.

### E2. An Apply of every change is the Apply of the whole instance

The changes view of an Apply sends the whole-instance Apply
(`/environments/:id/apply`) when the selection holds every change, the user can
apply every project, and the view was not opened from a project page. Only that
Apply deletes projects. Any other selection uses `apply-selection`. A Promote
always uses `promote-selection`, because only that result has a `status`.

### E3. From a project page to the changes view

"Include it" for an item of another project opens
`/promotions/<direction>?from=<projectId>&include=<resourceKey>`. The exact
selection goes in memory (`promotionSelectionHandoff.ts`), because a selection
can be too long for a URL. After a reload the view selects every change of the
`from` project and the `include` items. `from` also names the project whose
environment serves the view, so a project admin needs no global scope.

### E4. Confirmations of an Apply

The page disables the Apply until the user accepts each grant, accepts or
removes each deletion that has callers, and selects a home for each credential
without an owner. It sends only the confirmations of items that the report
still shows.

### E5. The instance Promote opens the changes view

The "Promote" button of the settings page opens the changes view with every
change selected. The commit message dialog follows. `PromoteInstanceDialog.vue`
has no caller left and stays in place.

### E6. Values of a hard block

A `credential-type-mismatch` shows both types when `detail` holds the keys
`sourceType` and `destinationType`.

### E7. Where a placeholder goes

The page names the project of the first consumer of a credential gap as the
project of its placeholder. The server decides the real project.

## Decisions of the frontend integration (stream J)

### J1. The Apply of every change is still the Apply of the whole instance (E2 again)

A selection never deletes a project (A6). So the changes view of an Apply keeps
the whole-instance route (`/environments/:id/apply`, `/apply/continue`) for one
case: every change is selected, the user can apply every project, the view was
not opened from a project page, and the user has the global scope
`promotions:apply`. The page then also reads the whole-instance preview
(`GET /environments/:id/changes`). It gives the projects that the Apply
deletes and the `revision` that the whole-instance route accepts. The revision
of the changes view is not sent to that route. When that preview fails (for
example a projects environment), every selection uses `apply-selection`.
The page names the projects in a callout: a warning when the Apply deletes
them, an information when a selection keeps them. Every other selection, and
every Promote, uses the new routes.

### J2. The report follows the selection in the client, and the last server report wins (E1 again)

The preview computes the report for every change that it lists. The preview
routes take no selection. So the page keeps the client-side filter of E1, with
two additions:

- The report of an operation that stopped (`gaps-changed`) stays the base of
  the page after the selection changes. The filter of E1 runs on it. A manual
  refresh drops it.
- A project page hands its report over to the changes view with its selection
  ("Include it" for an item of another project). The changes view lists no gap
  for that selection by itself, because its preview holds every change.

A gap that a cleared item opens shows only after the operation returns
`gaps-changed`. The Dependencies tab says that the check runs again. A preview
that takes the selection would remove this delay; see the report of stream J.

### J3. An included item counts as part of the operation, listed or not

A credential that "Include it" adds can have no row in the preview. The page
counts it as a change, shows it in "Also in this Promote", and lets the user
remove it there. A preview without rows is still usable when it holds such an
item.

### J4. A move out of a project that the branch does not hold

The page confirms it with the dialog of the destructive changes and sends
`confirmDestructiveChanges: true`, as F4 says for an instance Apply. It sends
the same flag for a selection across projects. A project page cannot confirm
the move: the row says to use the Apply of the environment.

### J5. A moved row is a change, not a blocker

The page no longer blocks a Promote of a moved workflow in the client. The
server refuses the moves that it cannot do, and the page shows its message.
On Apply, the moves of `check.movedWorkflows` and `check.movedFolders` still
block, and the moves of `check.plannedMoves` are changes.

### J6. The result of an Apply stays on the page when a person must act

An Apply that created a placeholder, gave a grant, moved or did not move a
credential, moved an item between projects, kept a workflow or left a gap
shows a result dialog before the page leaves. Any other Apply leaves with the
toast, as before.

### J7. The link of an owner request

The Inbox link adds `requested=1`. The preview then selects only the requested
item. A credential has no checkbox on a project page, so the page continues in
the changes view with only that credential (`?from=<project>&include=<key>`).

### J8. Display names of credential types

The capability `resourceEditors` of the shell gets one optional method,
`credentialTypeName(type)`. The raw type name shows until the name arrives,
and for a type that the instance does not know.

### J9. `PromoteInstanceDialog.vue` stays

Its test file still imports it, and the proof of concept deletes no test.
## Decisions of the stream "integration of moves"

### I1. The confirmation of a move out of a project that the branch does not hold

There is no new request field. `confirmDestructiveChanges` also confirms these
moves, for the whole-instance Apply and for the Apply of an environment
selection. The check lists them in `plannedMoves` with `needsConfirmation:
true`. An Apply with such a move returns `blocked` until the request confirms.
A project Apply never confirms: the move is a `moved` conflict there.

### I2. The server adds the other project of a move to the operation

- Apply: when the branch holds the old project, the plan gets it as a project
  without a selection. So the import writes both projects, and it also applies
  the project details of the old project. A moved row that the user selects
  under the old project goes to the selection of the new project.
- Promote: a selected workflow that another team project owns now goes to the
  selection of that project. The old project of a move is checked and not
  exported: only the moved paths change under it on the branch. The run of the
  review lists it, so the open-review gate holds both projects.

### I3. The rights of a move and the refusal

A move needs the right of the operation in each of the two projects, and the
environment must cover both. The server checks the projects that it adds.
- Promote refuses with a message (status 403, or 400 when the environment does
  not cover the project). The message names the other project only when the
  user can read it.
- Apply reports a `moved` conflict with the new optional field `blockedBy`:
  `personal-project`, `other-project-forbidden`, `other-project-not-covered` or
  `project-not-on-branch`. The preview and the operation give the same check.

### I4. A project of the branch that the source no longer has

A Promote does not check a right in a project that no longer exists on this
instance. Its items already left it here, and the branch follows.

### I5. The shape of a moved row

One row for each move. The row of the new project has `movedFromProject`. On a
view that does not hold the new project, the row of the old project keeps the
change `deleted` and has `movedToProject`. Both are selectable. `name` is left
out when the user cannot read the project. A move into a personal project has
`movedToProject` without a name, and the operation refuses it.

### I6. A move that the import does not plan

Only an item that this instance holds in a personal project still stops an
Apply as `moved`. A copy with the same source id (F6) and a moved folder that
the selection does not hold no longer stop it.

### I7. The moves in the result of an Apply

The `applied` result has the optional list `moves`. A move that unpublished a
workflow has `unpublished.reason`. A client shows it as a warning. The list
`warnings` keeps its shape.

### I8. The preview of a project Apply plans the moves out of the project

A workflow that left the project is planned under its new project, so the
check of the page also holds what stops that workflow in the new project.

### G12. The dependency check and the moves between projects (merge of G and I)

The plan of the moves can add a project to the selection of an Apply, and it can plan two
times. So the dependency check runs for each selection that is planned, and the Apply uses the
decision of the last one: the check reads the selection with the projects that the moves
added. The check writes nothing. The confirmed grants are given after the last decision and
before the Apply compares its plan (this replaces "give the grants, then plan" of G4 for the
selection routes; the import plans a confirmed grant as given). The previews and the route
`dependency-report` read the same selection after the moves, so the gap ids match. A moved
workflow counts in its new project: a credential of the old project that the new project
cannot use is a grant or a gap, also when only the published version uses it. The check does
not model data tables and project variables, so their warning after a move is not built.

### J10. The report of the selection comes from the server (replaces the limit of J2)

The page asks `POST .../changes/:direction/dependency-report` for the report of
the current selection, after a pause of 300 ms, on the changes view and on a
project page. The answer goes to the slot of the last server report. The
client-side filter of E1 is only the view while the request runs, and the
submit button waits for the answer. A request that fails leaves the filtered
view; the operation checks again. The Apply of the whole instance (J1) reads
the report of its own preview instead, because only that report lists the
workflows and projects that reconciliation keeps.

### J11. A gap of an unknown group cannot be confirmed

Partly superseded by S1: the rule stays, the words "also on an environment that allows incomplete operations" do not apply.

The page disables the operation, also on an environment that allows
incomplete operations, and says to update n8n or close the gap.

## Decisions of the backend verification (run on the dev/prod harness)

### V1. A sub-workflow row outside the listed projects shows the id only

A preview lists a called workflow that is not in a listed project as a row
without a parent. Its name came from the requirement row of the branch, which a
user with access to the owner project wrote. A project admin of the caller
project could then read the name of a workflow that they cannot access. The row
now always shows the id. The dependency report still names the target when the
user can read it.

### V2. A selection Promote never writes a top-level credential file

The exporter writes a credential of a project outside the export at the top
level of the package. A selection Promote now removes every credential file
that is not under a selected project, so the reference stays a requirement row
(with its reason). A credential file under a selected project replaces the
file of the same id under another project of the branch: the owner changed on
the source.

### V3. A refused credential move does not block the import plan

When the owner follows the package and the user may not move the credential
(or it is managed or end-user), the engine reported the selected credential as
unresolved and the Apply returned `blocked` with `import-blocked`. The engine
now settles that reference: the credential stays where it is, and the result
lists the move with `allowed: false` (decision D22).

### V4. The detail of `credential-type-mismatch` uses `sourceType`

The check wrote `branchType`. The user interface reads `sourceType` and
`destinationType` (decision E6), so the check now writes `sourceType`.

### V5. Git ignores the credential helpers of the host

On macOS the Git of the instance also asked the system keychain helper, stored
the provider token in the keychain of the host, and later stalled on a keychain
prompt ("Git operation stalled"). The HTTP(S) Git configuration now starts with
an empty `credential.helper`, so Git asks only the helper of n8n. This also
applies to source control, which shares the helper.

## UI verification (stream U)

### U1. A credential of a project is a row of that project

The previews listed a credential only as a dependency of a listed workflow, so
the owner could not find it. Now the export of a project for a preview holds
every project credential that the project owns (no placeholder, no instance
credential), and a changed one is a selectable row under its project, on
Promote and on Apply. "Select all" sends it as `credentialIds`. The reports of
the previews count these rows as part of the operation.

### U2. A credential travels only with a workflow of its owner project

The link of a workflow to a credential of another project has
`included: false`, as for a sub-workflow. The row of a credential whose owner
project the view does not hold shows no change. On an Apply, a top-level
credential of an existing branch still travels with the workflow.

### U3. `neededByBranch` on a credential row of a Promote preview

Set when the branch already has a requirement row for the credential and does
not hold its file. The page then says "Other projects wait for this
credential". The row names no workflow and no project.

### U4. A project page sends a selected credential through the environment route

Only `promote-selection` and `apply-selection` take `credentialIds`. A project
page uses them when the selection holds a credential that no selected workflow
of the project brings. That request carries no `expectedPreviewRevision`,
because the revision of the project page is not the revision of the
environment view. The dependency gate still runs.

### U5. Kept items of an instance Apply show no change

The instance Apply preview sets `change: unchanged` on a workflow that the
report keeps and on the content of a kept project. The revision stays the one
of the plan. In the changes view, a kept workflow reads "Stays" while every
change is selected.

### U6. The home selector replaces the `unknown-owner` conflict in the page

The check keeps `unknown-owner` for a top-level credential (decision of the
gate). The page does not treat it as a blocker of the workflow when the report
offers a home choice. With a home, the page shows the credential as missing in
that project, as the server does when it gets `credentialHomes`.

### U7. A viewer has no changes view in the user interface

The API answers a read-only view to a project viewer (decision A2). The route
guard of the page still needs the right to operate a project, so the viewer
goes to the home page.

## Frontend fixes after the coverage audits (stream F)

### F1. A reader of a project opens a read-only changes view (replaces U7)

The route guard lets a user in when an environment serves the project, also
without the right to operate. Only the changes view of the environment has a
read-only API (decision A2), so the project page of a reader leads to that
view (`/promotions/<direction>?from=<project>&view=read`). The view shows "You
can view these changes. You cannot promote them.", no checkbox and no submit
button. The project header shows a badge without a count for a reader, because
only a user who can operate may ask for the count.

### F2. The counts of the changes view leave out the project of a group header

The header of a group stands for its project. A change of the project itself,
such as a new project, comes with the items inside it, so the tab, the header
line, the tree and the submit button do not count it next to those items. A
project that is the only change of its group still counts. The header line
reads "3 of 4 changes selected in 3 projects". A project page lists the project
as a row, so its counts do not change.

### F3. A whole-instance Apply with only kept workflows has nothing to apply

A kept workflow is not a change of that Apply. The counts read "0 of 0
changes", the header line reads "No changes to apply", and a note says that the
instance matches the branch apart from the workflows that stay.

### F4. The result of an Apply shows once

When the Apply did something for its dependencies, or has a warning, the result
dialog opens and no toast shows. The dialog starts with the sentence of the
toast (the counts). Without such a result, only the toast shows.

### F5. Warnings are next to the count of the Dependencies tab, not in it

The tag of the tab still counts gaps and hard blocks. A warning icon with a
tooltip shows next to it. The line above the changes names the warnings: broken
on the source, a Promote of a deletion that breaks a reference on the branch,
and the others. On Promote, a deletion with callers on the branch counts as a
warning and needs no confirmation.

### F6. Texts for values that this client does not know

A warning code that the client does not know gets a sentence by the words of
the code (`placeholder`, `data-table`, `variable`), else a generic sentence. A
target kind that it does not know reads "Item". A usage that it does not know
reads "Used by".

### F7. The name of the project of a caller on a Promote of a deletion

The report sends the id of the project of a caller, and only for a project
that the user can read. A project page knows only its own project, so the page
reads the name of the other project with the rights of the user. Without a
name the sentence names no project.

### F8. `confirmedDeletionCallerIds` is sent with every confirmed deletion

The page sends the ids of the deleted workflows whose callers the user saw,
next to `confirmDeletionCallers: true`. The request DTOs are strict, so this
needs the backend change of the same round.
## Decisions of the backend fixes after the coverage audits (stream K)

### K1. A dependency file of a project that the user cannot read is not shown

A preview row for a credential or a data table under a project folder that the
user cannot read holds the id and the name of the requirement row of the
consumer. It has no file, so the details routes return no content for it. The
requirement row is what the consumer workflow shows: the exporter removes the
credential name from the node and keeps it on the row. The same rule gives the
name of a placeholder and of a gap. The file of the branch counts only when the
user can read its project.

### K2. A project that the user cannot read has no real id in a move

A moved row, `plannedMoves`, `changedProjects`, the result `moves` and a
refused move give `hidden-<12 hex characters>` in the place of the id of a
project that the user cannot read, and no name. The value is a hash of the id,
so it is stable and a client can still count such projects. A project that only
the branch holds is readable only for a user who can create it (the global
right on an instance environment).

### K3. One answer for a workflow outside the selected project

A Promote selection with a workflow of a project that the user cannot read, or
with a deletion that the branch does not hold under the project, answers 400
"The following workflows are not in the selected project". The dependency
report route refuses the same `credentialIds` as the Promote. The groups
`outside-environment` and `personal` of the report stay as the solution
describes them, also for a target that the user cannot read.

### K4. An owner request needs a covered owner project

`create` stores a request only when the environment covers the owner project.
The answer stays `sent`. For an Apply, the owner of a credential that this
instance holds is its owner project here: its admins can share it. So "Ask the
owner" is also an exit of the group `access-not-grantable`, except without a
sharing licence.

### K5. `credentialIds` on the project routes, and the default of a project Apply

`POST /projects/:id/promote`, `/apply` and `/apply/continue` accept
`credentialIds`. The CLI flag is `--credential`.

- Promote: without `credentialIds`, a credential comes only with a selected
  workflow of the project, as before.
- Apply: without `credentialIds`, the Apply writes each credential that the
  branch holds under the project and that this instance already holds, in any
  project. So the Apply of the owner project moves a credential to its owner,
  gives a placeholder its home and updates the name and the expression values.
  A credential that this instance lacks is not in the default, so the Apply
  never asks for a credential that no selected workflow needs. An explicit
  list, also an empty one, replaces the default.
- The Apply previews plan the same held credentials, so a changed or a moved
  one is a selectable row.

This replaces U4: a project page can send a selected credential on the project
route with `expectedPreviewRevision`.

### K6. The whole-instance Promote route writes what a selection of everything writes

The export uses `reference-only`, and the same placement rules as
`promote-selection` remove a credential file outside its owner project folder.
The 409 message gives the id and the fix of each gap, and the folders of an
ambiguous credential that the user can read.

### K7. The confirmation of the callers of a deleted workflow

Each `deletionCallers` row of an Apply has an `id`: the deleted workflow and a
hash of the callers that the row lists and of the hidden count.
`confirmedDeletionCallerIds` must hold exactly the current ids, else the Apply
returns `gaps-changed`. The flag `confirmDeletionCallers` alone still accepts
every caller, for a client of an earlier version. The server writes a log line
then.

### K8. The placeholder marker and the placeholder home

Partly superseded by S1: "an incomplete Apply" is now every Apply with gaps.

- The marker goes away only when the saved data holds a value: a text that is
  not blank, a number, or a list or an object with such a value. A switch alone
  is not a value. This narrows D13.
- The check gives the home of each placeholder to the import
  (`placeholderHomes`). The import creates the placeholder in that project,
  whatever the order of its scopes.
- A credential reference without a reason (a branch of an earlier version) gets
  no placeholder. It can be an instance credential, and the branch does not
  say. The reference stays unresolved after an incomplete Apply. The block
  `instance-credential-missing` still needs the reason on the row.

### K9. A live workflow and a new placeholder

The Apply does not unpublish. The `applied` result lists in
`livePlaceholderWorkflows` each workflow whose published version references the
id of a placeholder that the Apply created, and `dependencyMessages` holds one
sentence for it. The workflow index gives the references of the published
versions. This keeps D14.

### K10. No audit event for a credential move

No event for a credential transfer exists: the editor transfer writes none. The
proof of concept adds no event, so the move of an Apply writes none either.

### K11. Data tables and project variables of another project

- The report has the optional list `resourceWarnings` with the codes
  `data-table-of-other-project` and `variable-of-other-project`. A warning
  never stops an operation.
- Promote reads the source: the project of each data table, and whether the
  project of the workflow resolves each variable name. An export under
  `reference-only` no longer stops on a data table that the user cannot read:
  the table becomes a requirement row. A Promote writes a data table file only
  under a project of the operation.
- Apply reads the branch. The folder of a file names its owner. A data table
  under another project folder, or without a file, and a variable name that
  only another project folder holds, are references of another project.
- The import option `crossProjectResourcePolicy: 'reference-only'`
  (promotion-only) makes the import leave such a reference as it is: no data
  table is created or changed, and the variable is not required. The
  `missing-definition` conflict of a warned workflow leaves the check.
- Limit: when the branch holds no file for a variable name in any project, the
  Apply still reports the variable as missing. The branch does not say that
  another project owns it on the source.

### K12. Smaller additions to the contracts

- `credential-move-forbidden` has `detail.cause: 'missing-create-right'`. A
  credential with values that the user may not move is not a block: its
  `credentialMoves` row has `blockedReason: 'no-move-right'`.
- A home choice has `noCandidateReason` when no project can be the home. The
  candidates are team projects that the environment covers.
- A `workflow-forbidden` conflict of a move has `missingScope`.
- A `broken-on-source` warning of a Promote has `cause` when the user can read
  the target.

## Decisions of the final regression run (stream R)

### R1. An Apply request to the owner stays open before the consumer exists

- The check that closes a request read the project of the consumer workflow on
  the destination. Before the first Apply of the consumer, the destination
  does not hold it, and the request closed at once as "satisfied".
- The request now stays open until the destination holds the consumer and its
  project can use the credential. A recipient can dismiss it.
- The request names the credential as the destination names it. The
  recipients own it there.

### R2. The client sends the row ids of the deletion callers, not the flag

- `confirmedDeletionCallerIds` holds `deletionCallers[].id`. The server
  refuses the id of the deleted workflow.
- The client sends the flag `confirmDeletionCallers` only when a row has no
  id, which is a server of an earlier version.

### R3. A project page always sends `credentialIds` on Apply

- The project routes take `credentialIds` (K5), so the workaround U4 is gone:
  a project page stays on the project route and sends the revision of its
  preview.
- On Apply the page sends the list also when it is empty. Without the list,
  the server applies each credential of the project that the instance holds,
  also one that the user cleared.
- The list holds the credentials that the user selected directly. A credential
  that comes with a selected workflow is not in it, as on the changes view.

### R4. A data table of another project is not shown as included

- The preview links a workflow to each data table that it uses with
  `included: true`. The client reads `resourceWarnings` and shows such a table
  as "Not copied", not selected.
- The server still sends `included: true` for it. The client corrects one
  place, and the five server places that build a preview stay as they are.

### R5. A reader counts the changes that the reader can read

- The read-only view (F1) has no selectable row, so the tab and the group
  header read "0" and "No changes" next to the cards of the changes.
- The tab and the header of a read-only project now count the listed changes.

### R6. Texts for the new report fields

- `resourceWarnings` rows are in the "warnings" section, with the owner
  project when the report holds it. A table without a name reads "Data table"
  with its id.
- `livePlaceholderWorkflows` is a warning at the top of the Apply result.
- A `broken-on-source` warning adds the sentence of its `cause`.
- A home choice without a candidate shows the sentence of `noCandidateReason`
  in place of an empty selector. This case was not run.

## Decision of 2026-11-19: one mode

### S1. Promote and Apply with gaps is the default. The setting is removed.

Date: 2026-11-19. The user decided: "Remove the setting to opt in to
promote/apply with gaps. This is the default behaviour from now on. Promoting
and applying with gaps is just part of the user experience."

What changed:

- The environment setting `allowIncomplete` ("Allow incomplete promotions",
  "Allow incomplete applies") does not exist any more. There is no strict
  mode. Each Promote and each Apply can continue with gaps.
- The user still sees the gaps and confirms them before the operation writes.
  The operation takes `confirmedGapIds`. When the ids differ from the current
  gaps, it writes nothing and returns `gaps-changed` with the new report. The
  commit message and the review description still list the gaps, and the
  requirement rows still get `reason`.
- The exits of a gap ("Include it", "Ask the owner", "Open the review",
  "Restore it", "Remove the deletion from the selection", and the others) stay.
  They are the ways to make the operation complete. They are not conditions to
  continue.
- The exit `continue-incomplete` is removed from the enum. Each gap can
  continue, so the exit said nothing.
- `PromotionDependencyReport.allowIncomplete` is removed. `blocked` is true
  only for a hard block, or for a top-level credential without a home.
- An Apply plans a placeholder for each credential gap whose id the
  destination does not hold (solution 3.7), and creates it after the user
  confirms the gaps. The other rules stay: no placeholder when the id is
  taken, and the user needs `credential:create` in the consumer project
  (`placeholder-create-forbidden` when not). A credential reference without a
  reason on a branch of an earlier version still gets no placeholder (K8).
- Hard blocks, grants that are not confirmed, missing bindings, the
  confirmation of deletion callers, destructive confirmations and moves stop
  the operation as before. Warnings and notes did not change.
- A gap of a group that the client does not know still stops the operation in
  the page and in the CLI (J11).

Stored settings and old clients:

- A stored environment can still hold `allowIncomplete`. The settings schemas
  are strict, so `resolveStoredConfig` removes the field before it parses a
  stored row. Each read (the list, the detail, the project lookup, the
  operations) then works. The next save of the environment writes the row
  without the field. There is no migration.
- A write that still sends `allowIncomplete` is refused with status 400, like
  each other unknown settings field. Accept-and-ignore was not selected: it
  keeps a dead field in the DTO, and a client that sends `false` would think
  that the environment is strict.
- The value of the stored field has no effect. An environment that stored
  `false` now continues with gaps.

Names in the code: the dialog component is `PromotionGapsDialog.vue` (was
`PromotionIncompleteDialog.vue`), with the test ids `promotion-gaps-*`. The
`?fixture=` development mode has the names `gaps` (the default), `blocked`,
`changed` and `clean`. An old name such as `strict` or `incomplete` shows the
default.

Supersedes: D2. Partly: D3, D7, D12, D13 (the two points on modes), G4, G6,
J11, K8 (the wording). The journeys 4.1, 4.2 and 4.4 of the README changed
with it.
