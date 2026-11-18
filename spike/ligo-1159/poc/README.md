# LIGO-1159 proof of concept: cross-project promotion

This folder documents the proof of concept (POC) of the solution in
`spike/ligo-1159/review/final/solution.md`. The code is on this branch. It is
not for merge: it has no tests and no telemetry.

## What the POC implements

- A dependency check for Promote and Apply. It reads each static reference of
  a workflow to a credential, a sub-workflow and an error workflow.
- A dependency report with gaps, warnings, notes and hard blocks. A report
  shows only what the user can access.
- The environment setting "Allow incomplete". A strict environment stops on a
  gap. An environment that allows incomplete operations continues after the
  user confirms each gap.
- Project-level rights. A project admin can promote and apply the project
  without a global scope. A project reader gets a read-only changes view.
- A changes view for one environment across projects. One Promote writes one
  commit for many projects.
- The exits of a gap: "Include it", "Ask the owner" (a request in the Inbox of
  the owner project), "Continue incomplete", and the others of the solution.
- Credentials under the folder of their owner project on the branch. Apply
  moves the owner on the destination to follow the branch and keeps the access
  of the other projects.
- Access grants on Apply, after the user confirms each one.
- Placeholder credentials on an incomplete Apply. A workflow that uses a
  placeholder cannot be published until the credential has values.
- Moves of a workflow between two team projects, as one change.
- Protection of deletions: an instance Apply keeps a workflow that the branch
  still calls, and a selection asks before it deletes one.
- Warnings for a data table or a project variable of another project.

## How to run it locally

The harness skill `n8n-dev-prod-e2e` starts two instances and a Git remote.
Read `~/.claude/skills/n8n-dev-prod-e2e/SKILL.md` for the prerequisites and
the logins. The passwords are the throwaway defaults of the skill.

```bash
export E2E_OUT=$PWD/.context/poc/e2e
~/.claude/skills/n8n-dev-prod-e2e/scripts/up.sh --promotion   # start, data is kept
.context/poc/e2e/scripts/reset-state.sh                        # start of journey 4.1
~/.claude/skills/n8n-dev-prod-e2e/scripts/down.sh              # stop
```

| | URL | Role |
|---|---|---|
| dev | http://localhost:5780 | Promote side |
| prod | http://localhost:5781 | Apply side |
| Gitea | http://localhost:3310 | Git remote, plain `git` provider |

The cast (same users on both instances, `<name>@example.com`):

| User | Role |
|---|---|
| owner | instance owner |
| builder | project admin of Sales |
| plat | project admin of Platform |
| ops | project admin of Ops |
| multi | project admin of Sales, Platform and Ops |
| viewer | project viewer of Sales |

Sales owns the workflow "Sync orders". Platform owns the credential "CRM key"
and shares it with Sales. Ops owns the sub-workflow "Normalize".

A full rebuild from empty instances: `up.sh --reset --promotion`, then
`.context/poc/e2e/scripts/00-cast.sh`. The ids in `.context/poc/e2e/state.md`
then change.

The instances serve the built UI. After a frontend change, run
`.context/poc/e2e/ui/build-fe.sh`.

Regression scripts:

- Backend: `.context/poc/e2e/scripts/regress-1.sh` to `regress-4.sh`
  (108 checks through the public API).
- UI: `.context/poc/e2e/ui/final.sh` (headless Playwright, writes
  `.context/poc/e2e/shots/final/`).

## Journeys

Each step names the user, the page, and the screenshot in `screenshots/`.

### 4.1 Builder with one project, strict environment

1. builder on dev: project Sales, the Promote badge in the header, tab
   "Dependencies". Two gaps, no project names, Promote is disabled.
   ![](screenshots/4.1-02-builder-gaps-no-access.png)
2. builder: "Ask the owner" on each row. The row then reads "Request sent".
3. plat on dev: Inbox, the request, "Promote CRM key".
   ![](screenshots/4.1-04-platform-inbox-request.png)
4. plat: the page opens with only the credential selected. Promote.
   ![](screenshots/4.1-05-plat-deep-link-preview.png)
5. ops does the same for "Normalize". builder then has no gap and promotes.

### 4.2 The same builder, the Promote environment allows incomplete

1. owner on dev: Settings, Environments, edit the environment, "Allow
   incomplete promotions".
2. builder: "Promote with 2 gaps", then the confirmation.
   ![](screenshots/4.2-03-promote-with-2-gaps-dialog.png)
3. builder on prod (strict): project Sales, the Apply badge, tab
   "Dependencies". Apply is disabled.
   ![](screenshots/4.2-06-strict-apply-not-on-branch.png)

### 4.3 A user with the three projects

1. multi on dev: project Sales, Promote, tab "Dependencies", "Include it".
   ![](screenshots/4.3-02-multi-gaps-include-it.png)
2. The changes view opens. "Include it" again, then one Promote.
   ![](screenshots/4.3-06-three-projects-selected.png)
3. owner on prod: Settings, Environments, "Apply". Tab "Blockers", "Add
   credential" creates "CRM key" in Platform.
4. Tab "Dependencies": confirm the access for Sales, then Apply.
   ![](screenshots/4.3-15-grant-confirmed.png)

### 4.4 Incomplete Apply, then the real credential

1. Start: the branch of journey 4.2. prod allows incomplete applies.
2. builder on prod: project Sales, Apply, tab "Dependencies".
   ![](screenshots/4.4-02-gaps-and-placeholder.png)
3. "Apply with 2 gaps". The result names the placeholder.
   ![](screenshots/4.4-04-apply-result-placeholder.png)
4. builder: open "Sync orders", Publish. n8n refuses.
   ![](screenshots/4.4-10-publish-refused.png)
5. plat on dev promotes "CRM key". plat on prod: project Platform, Apply. The
   placeholder moves into Platform, and Sales keeps access.
   ![](screenshots/4.4-13-platform-apply-credential-moves.png)
6. plat enters the values. The marker goes. builder publishes "Sync orders".

### Other cases

| Case | Screenshot |
|---|---|
| A workflow moved from Ops to Sales, on Apply | ![](screenshots/M-02-apply-moved-row.png) |
| The destination holds the credential with another type | ![](screenshots/B-01-type-mismatch-dependencies.png) |
| A branch of an earlier version: select the home of a credential | ![](screenshots/B-02b-credential-home-selector.png) |
| Apply deletes a workflow that another workflow calls | ![](screenshots/B-04c-deletion-accepted.png) |
| Promote of a deletion with a caller on the branch | ![](screenshots/D-02-promote-deletion-callers.png) |
| A data table of another project | ![](screenshots/T-02-promote-data-table-of-other-project.png) |
| A published workflow gets a placeholder | ![](screenshots/L-02-apply-result-live-placeholder.png) |
| A project viewer reads the changes | ![](screenshots/V-02-viewer-read-only-view.png) |

## New routes

Public API, under `/api/v1/promotions`:

| Route | Use |
|---|---|
| `GET /environments/:id/changes/:direction` | The changes of every project that the user can access |
| `POST /environments/:id/changes/:direction/details` | The content of listed changes |
| `POST /environments/:id/changes/:direction/dependency-report` | The dependency report of a selection, without a write |
| `POST /environments/:id/promote-selection` | Promote a selection across projects in one commit |
| `POST /environments/:id/apply-selection` | Apply a selection across projects |
| `POST /environments/:id/owner-requests` | "Ask the owner" |
| `GET /projects/:id/environments` | The environments of a project, for a project admin |

Internal REST: `POST /rest/promotions/owner-requests/:requestId/dismiss`.

Changed routes: the project routes (`/projects/:id/promote`, `/apply`,
`/apply/continue`) and the instance routes take `confirmedGapIds`. The Apply
routes also take `confirmedGrantIds`, `confirmedDeletionCallerIds` and
`credentialHomes`. The project routes take `credentialIds`. The results hold
`dependencyReport`.

## New CLI commands

All under `n8n-cli promotion-environment`:

- `list-environment-changes <environmentId> <direction>`
- `promote-environment-selection <environmentId>`
- `apply-environment-selection <environmentId>`

Changed: `promote-selection`, `apply-selection` and `apply-selection-continue`
take `--credential` and `--confirmGap`. The Apply commands also take
`--confirmGrant`, `--confirmDeletion`, `--confirmDeletionCallers` and
`--credentialHome`. A command that stops on the dependencies prints the
report and exits with code 4.

## Database

Two migrations: `isPlaceholder` on the credentials table, and the table
`promotion_owner_request`.

## Known limits

- An Apply request to an owner stays open until the consumer workflow is on
  the destination and its project can use the credential.
- A variable that no project folder of the branch holds is reported as
  missing on Apply. The branch does not say that another project owns it.
- A credential move writes no audit event.
- A project page lists a credential gap of an Apply only in the tab
  "Dependencies", not as a row of the tree.
- The existing unit tests were not updated. Some of them fail to compile.

## Not verified

- Reviews. The harness uses a plain `git` provider, so no review opens. The
  review description, the open-review gate, the state "In an open review" and
  "one review for three projects" were only read in the code.
- `sharing-not-licensed`, managed credentials and end-user credentials.
- The home selector with no candidate project (`noCandidateReason`).
- A grant that stays when the Apply then stops on another cause.
- Executions after a move. The id, the history and the publish state were
  checked.
- An instance credential (it needs a database edit) and a move out of a
  project that the branch does not hold were verified in the first backend
  run and not run again in the final regression.
- In the UI: an archived sub-workflow, a caller policy, a personal resource,
  a project outside the environment, kept projects, and a refused credential
  move. The API checks cover the first two.

## More

- Decisions that the solution leaves open: [decisions.md](decisions.md).
- The solution: `spike/ligo-1159/review/final/solution.md`.
- The behaviour: `spike/ligo-1159/spec/*.feature`.
