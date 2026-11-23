# Content: cross-project promotion

Status: draft 2, 2026-11-23. Not reviewed. Follows `ux-principles.md` and
`ux-surfaces.md`.

Each moment shows the text on master today, then a proposal. Items marked
**?** are guesses or open choices.

## Decided terms

| Thing | Term |
|---|---|
| The tab | **Issues**, with a count |
| Section 1 | **Needs your action**. The user can resolve these. They block Apply. |
| Section 2 | **Outside your access**.  The user cannot resolve these. They do not block. |
| A row | "Missing credential: HubSpot API key" |
| The state word | **unresolved** |
| Not used in the product | blocker, gap, binding |

Rules: short sentences, active voice, no humor. Do not show an owner or a
project. Name the dependency and the next step.

## 1. The Issues tab

**Today:** "Blockers stop you from applying some changes to this instance. They
include missing credentials or variables, access restrictions, and conflicts.
Resolve the blockers to apply the related changes."

**Intro, Apply and Promote (decided):**
> Issues may stop you from applying some changes to this instance. They include
> missing credentials or variables, access restrictions, and conflicts. Resolve
> them to apply the related changes.

On Promote, the same text with "promoting" and "the branch" instead. **?**
Check the wording of the Promote version.

**Section titles and descriptions:**

| Title | Description |
|---|---|
| Needs your action (2) | Create these dependencies or use a placeholder before you apply. |
| Outside your access (2) | You do not have access to these dependencies. You can apply without them. |

On Promote, only "Outside your access" shows. **?** Promote includes what the
user can include.

## 2. The rows

**Needs your action**
> **Missing credential: Slack OAuth**
> Used by Lead enrichment
> [Create] [Use placeholder]

The actions are the existing ones.

**Outside your access**
> **Missing credential: CRM key**
> Used by Sync orders
> You do not have access to it.

When more than one workflow uses a dependency: "Used by Sync orders and 2 more".
Types in the label: credential, variable, workflow. A sub-workflow reads
"Missing workflow".

## 3. The marker on a workflow

**Today:** "This workflow has 1 blocker. Resolve it to apply this change."

| Situation | Text |
|---|---|
| Needs your action only | This workflow has 1 issue that needs your action. Resolve it to apply this change. |
| Outside your access only | This workflow uses 2 dependencies that are outside your access. You can apply it without them. |
| Both | This workflow has 1 issue that needs your action and 2 that are outside your access. |

## 4. The button

The button keeps today's label: "Apply 3 changes", "Promote 3 changes". It does
not mention issues.

| State | Behavior |
|---|---|
| Dependencies in "Needs your action" remain | Disabled. Message below. |
| Nothing remains | Enabled. The action runs. |
| Only "Outside your access" dependencies remain | Enabled. It opens the confirmation. |

**Disabled message:**
> Apply is disabled. Resolve the issues that need your action, or clear the
> changes that have them.

## 5. The confirmation

It opens only when "Outside your access" dependencies remain. It lists them
again, because they may be the only issues, and the user may not have opened
the Issues tab. Group by type. Show the first 5, and scroll for more.

**Apply (draft):**
> **Apply without 2 dependencies?**
> These are outside your access, so you cannot apply them. Workflows that use
> them cannot be published until they exist here.
>
> Credential: CRM key. Used by Sync orders.
> Workflow: Normalize. Used by Sync orders.
>
> [Cancel] [Apply 3 changes]

**Promote (draft):**
> **Promote without 2 dependencies?**
> These are outside your access, so you cannot promote them. Workflows that use
> them cannot be published until they exist where they are applied.
>
> *(same list)*
>
> [Cancel] [Promote 3 changes]

The confirm button repeats the label of the button that opened the dialog.
**?** The Promote consequence is a guess.

**Built (Playground).** The confirmation is not a separate dialog. On Promote it is the existing
commit message dialog, which shows the unresolved dependencies above the message field. On Apply it
is one dialog that replaces the generic question. A credential in a personal project gets its own
sentence in the same dialog.

## 6. The result

> Applied 2 workflows. 2 dependencies are still missing.

Promote: "Promoted 2 workflows. 2 dependencies are not included."

## 7. The review screen **?**

The review screen shows a second tab, Issues, only when something is missing.

> **Issues, 2**
> This review leaves out 2 dependencies that its workflows use. The workflows
> may show errors until those dependencies exist on the destination.

Rows use the "Outside your access" row. The reviewer may have different access
from the author. Open: does the tab show to everyone, and which dependencies does it
list?

## 8. Small messages

| Where | Text |
|---|---|
| Locked row in the selection | Required by Lead enrichment |
| Hint on a row | Uses 3 dependencies |
| The list changed after the preview | The list has changed. Review it before you continue. |
| Credential in a personal project | This credential is in a personal project. Move it to a team project to promote it. |

## Open

1. The Promote wording of the confirmation.
2. "Dependencies" is the noun. It is technical, but it is the right word.
   Where possible, name the type instead: "2 credentials".
3. Promote: is there a "Needs your action" section? **?**
4. The review tab (7).
