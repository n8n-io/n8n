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
