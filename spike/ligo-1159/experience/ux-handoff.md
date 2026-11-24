# Handoff: cross-project promotion experience

Status: draft 1, 2026-11-24. Read with `ux-principles.md`, `ux-surfaces.md` and
`ux-content.md`.

## How to use this

The Environments Playground is a **reference**. It is not code to merge. Build the
behaviour into your own work. Match what the Playground shows. When the Playground and
a doc disagree, the Playground wins on behaviour and `ux-content.md` wins on copy. Tell
Jeroen about every difference, so one of the two gets fixed.

When your work is done, Jeroen runs the QA pass in `ux-qa-checklist.md`.

Open the Playground: Settings, Environments Playground. The route is
`/settings/promotions/playground`. It is in development builds only. Each scenario has
three amounts: Few, Some, Many. Check your work at all three.

## Who takes what

Suggested owners. Change them if the code says otherwise.

| Area | Owner | Scenarios |
|---|---|---|
| Dependency detection, the `outsideAccess` data, the Issues tab | Irénée | P1 to P4, A1 to A4 |
| The selection model, credential selection | Sandra | P1, P2, A2 |
| The review screen, the approve dialog | Kay and Jan | B1 |
| Copy, terms, visual details | Jeroen | All |

## Scenario names

`ux-surfaces.md` numbers its scenarios P1 to P5 and A1 to A4. The Playground has fewer, with
other numbers. Use the Playground ids in the table below and in the QA checklist.

| Id | Playground scenario |
|---|---|
| P1 | Nothing is missing (Promote) |
| P2 | Dependencies outside your access (Promote) |
| P3 | Credential in a personal project |
| P4 | The list changes before you promote |
| A1 | Nothing is missing (Apply) |
| A2 | Dependencies you can resolve |
| A3 | Dependencies outside your access (Apply) |
| A4 | Both kinds at once |
| B1 | Review with missing dependencies |

## Terms

Use these words in the UI. Do not use "blocker", "gap" or "binding".

| Thing | Term |
|---|---|
| The tab | **Issues**, with a count. The count is `0` when there are none. |
| Resolvable, blocks Apply | **Needs your action** |
| Unresolvable, never blocks | **Outside your access** |
| The noun | dependency |
| The state word | unresolved |

The Promote and Apply pages share the same components. Only the verb changes.

## Behaviour to match

### 1. Two kinds of issue

- **Needs your action.** The user can fix it: create the credential or variable, or use a
  placeholder. Apply stays disabled until none remain.
- **Outside your access.** The dependency belongs to a project that the user cannot use.
  It never blocks. The user confirms and continues.
- A credential in a personal project is a third case on Promote only. It shows as
  "Cannot be promoted". The user must move it to a team project first.
- A workflow that has an issue that needs action stays **selectable**. The user can select
  it. Apply is disabled, with a message that says why.

### 2. The selection tree (Sandra's selection behaviour)

The source is `spec/preview-selection.feature` and `promotionPreview.selection.ts`. These
are the rules that the Playground adds or relies on:

- Every checkbox looks the same. No checkbox looks disabled, except a dependency that is
  outside the access of the user.
- A dependency is not selected directly. A selected workflow includes the dependencies
  that it needs.
- Clearing a dependency that selected workflows need clears those workflows. This is
  `clearRequirers`.
- No hint, lock or "selected" count on a required dependency. No "x selected" text.
- Tags are not selectable. Tags are not promoted.
- The group heading reads **Workflows (N)**, in the same style as the group name. N is
  the total, not the number selected. It includes items that are outside the access of the
  user.
- Dependencies outside the access of the user are the **last item of their group**. They
  have a disabled checkbox, muted text, and a lock at the right. They count in N. They
  cannot be selected.
- An outside workflow sits under a project row. If the project is known, the row shows
  its name. If it is hidden, all of them share one row, **Other projects**, which comes
  last.
- A warning icon marks a workflow with an issue. It is amber when the user can resolve it.
  It is muted when it is outside the access of the user. The icon sits at the right of the
  row. A tooltip explains it. A row is never highlighted.
- Hovering a lock or a warning shows the reason. The text is in `ux-content.md` section 7b.

### 3. The button

| State | Behaviour |
|---|---|
| Something in "Needs your action" remains | Disabled. A message says what to do. |
| Nothing remains | Enabled. The action runs. |
| Only "Outside your access" remains | Enabled. It opens the confirmation. |

The label stays "Promote N changes" or "Apply N changes".

### 4. The confirmation

It shows the same warning on Promote, on Apply and when a reviewer approves.

- **Promote.** The existing commit message dialog. The title is always "Promote N
  changes?". The warning is above the message field.
- **Apply.** One dialog that replaces the generic question. The title is "Apply N
  changes?".
- **Approve, in the review.** The same warning inside the approve dialog.

The warning:

- An alert icon in the first column. The sentence and the list are in the second column.
- The sentence names the workflows that cannot be published, not the dependencies:
  - Promote: "4 workflows can't be published because their dependencies can't be promoted."
  - Apply: "4 workflows can't be published because their dependencies don't exist here."
- The list has one row for each workflow, with the dependencies that it misses: "Missing
  A, B and 2 more." The list has a divider above and below, and scrolls after 14rem.
- When no workflow uses the dependencies, the list shows the dependencies instead: "1
  dependency is not promoted."
- No "in a personal project" and no owner.

### 5. The review screen

- The **Changes** tab shows the number of changes.
- The **Issues** tab shows only when something is missing. Its count is the number of
  issues. Rows use the "Outside your access" row.
- The reviewer sees the same list as the author. The access of the reviewer is not used.
  **Open:** confirm this with Jeroen.
- The review can be approved and closed. The approve dialog shows the warning of section 4.

## Data the UI expects

The Playground answers these from a mock. The backend must send the same shape.

`promotions.types.ts` holds the types.

```ts
outsideAccess?: Array<{
  kind: 'credential' | 'variable' | 'workflow';
  name: string;
  reason?: 'personal';                 // Promote only. A personal credential.
  project?: { id: string; name: string }; // Only when the user may know it.
  consumers: Array<...>;               // The workflows that use it.
}>
```

- `outsideAccess` is on the Promote check, the Apply check, and the review changes.
  Absent or empty means nothing is outside the access.
- `project` is often absent. The UI then groups the dependency under "Other projects".
- The UI never shows an owner.

## Where to look

| Scenario | Playground | Files |
|---|---|---|
| P1, A1 nothing missing | Nothing is missing | `views/PromotionPreviewView.vue` |
| P2, A3 outside access | Dependencies outside your access | `components/preview/PromotionResourceTree.vue`, `PromotionBlockers.vue` |
| P3 personal credential | Credential in a personal project | `PromotionBlockers.vue`, `usePromotionPreviewLabels.ts` |
| P4 list changed | The list changes before you promote | `views/PromotionPreviewView.vue` |
| A2 resolvable | Dependencies you can resolve | `PromotionBlockers.vue` |
| A4 both | Both kinds at once | `PromotionBlockers.vue`, `PromotionResourceTree.vue` |
| Dialogs | P2, A3, A4 | `PromoteSelectionDialog.vue`, `PromotionUnresolvedDialog.vue`, `PromotionUnresolvedSummary.vue` |
| B1 review | Review with missing dependencies | `components/review/`, `packages/modules/inbox/frontend/src/promotions/PromotionReviewDetail.vue` |

All paths are under `packages/modules/promotions/frontend/src` unless they start with
`packages/`.

The review reaches the promotions module through three SDK slots, because modules cannot
import each other: `promotion-changes`, `promotion-issues` and `promotion-approval-notice`.

## Copy

Do not write copy again. Take it from `ux-content.md`. The keys are in `en.json` under
`promotions.preview.*`, `promotions.unresolved.*` and `promotions.review.*`.

## Not in the prototype

- The real data. The Playground uses a mock API.
- After Apply. The editor behaves as it does today.
- A lighter version of the approve warning. We use the full list.
- Anything marked **?** in the docs.

## Remove the Playground

Delete `playground/`, the two lines `...playgroundSettingsPages` and `...playgroundRoutes`
in `promotions.module.ts`, and the `promotions.playground.*` keys. See
`playground/README.md`.
