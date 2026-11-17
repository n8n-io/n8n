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
