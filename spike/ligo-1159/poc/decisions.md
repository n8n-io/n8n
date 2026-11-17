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
