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
