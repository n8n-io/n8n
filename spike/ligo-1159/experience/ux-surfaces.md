# Scenarios and surfaces

Status: draft 3, 2026-11-23. Not reviewed. This list follows `ux-principles.md`.

Scenarios marked **?** are my guesses from the POC and the check-in. Please
correct them.

## What the user is trying to do

A user works on one n8n instance (for example dev) and wants the work to arrive
on another (for example prod). This has two directions:

- **Promote:** send my changes from this instance to the branch.
- **Apply:** bring the changes from the branch onto this instance.

In both cases the user wants to finish without surprises. They want to know
what will arrive, what will not, and what they must do afterward.

A change is often not self-contained. A workflow can use a credential, a
variable or a sub-workflow. Sometimes the user owns these. Sometimes they
belong to another project that the user cannot access.

## Who

| Who | Can resolve |
|---|---|
| Admin of one project | Only dependencies of that project |
| Admin of several projects, or instance admin | Dependencies of those projects, or of all |
| Member who can only read | Nothing. Read-only view. **?** |

The same promotion can look different for each person.

## Scenarios

Words: a *missing dependency* is something that a workflow uses and the
destination does not have. The user can *resolve* it (create it, or use a
placeholder) or cannot (it belongs to a project the user cannot access).

### Promote

**P1. Nothing is missing.** The common case.
- The user selects workflows and promotes.
- They see: nothing new. The screens stay as they are today.

**P2. A missing dependency that the user can resolve.** **?**
- The workflow uses a credential from a project the user administers.
- They see: the credential is selected with the workflow, as "Required by
  Lead enrichment". They do not have to find it.

**P3. A missing dependency that the user cannot resolve.**
- The workflow uses a credential or sub-workflow from a project the user
  cannot access.
- They see: a warning that something is missing and that they cannot add it.
  They do not see the owner or the project. They confirm and continue.

**P4. A credential in a personal project.**
- Personal credentials cannot be promoted.
- They see: the reason, and that they must move it to a team project first.

**P5. The list changes while the user reviews.**
- Someone else changes something before the user continues.
- They see: a message and the new list, before anything runs.

### Apply

**A1. Nothing is missing.** The common case. Nothing new on screen.

**A2. Missing credentials or variables that the user can resolve.** (Exists
today.)
- They see: the blockers. Apply stays off.
- They create each item, or use a placeholder. Then Apply turns on.

**A3. Missing credentials or sub-workflows that the user cannot resolve.**
- They see: a warning for each. They do not see the owner or the project.
- They confirm and continue.

**A4. Both kinds at the same time.** This is the confusing case.
- They see: both kinds in one list. The list says which they must resolve and
  which can stay open.
- Apply stays off until they resolve the first kind. Then they confirm the
  second kind.

### Both

**B1. Reviewing a promotion.** (New.)
- When review is on, a promotion opens a review. Something can be missing.
- They see: a second tab on the review screen. It shows only when something is
  missing. It lists what is missing.

Decided: the tab that lists these items is called **Issues**, to match the
editor. It has two sections: "To resolve" and "Can stay open".

## Surfaces by scenario

Rule: reuse what exists. These surfaces are lists, so each one is a row in the
existing list or a message in an existing place.

| Scenario | What the user sees | Reuse |
|---|---|---|
| P1, A1 | Existing screens | No change |
| P2 | Locked dependency row, "Required by ..." | The row of the changes tree, with a locked checkbox |
| P3, A3 | Warning row in the list. A confirmation. | The "Can stay open" section of the Issues tab. The existing confirm dialog |
| P4 | Row that cannot be selected, with a reason | The row of the changes tree, with a disabled state |
| P5 | "The list has changed" message | The existing callout above the list |
| A2 | Blockers with create and placeholder actions | Exists. No change |
| A4 | One list with both kinds, and a rule on top | The Issues tab (today's Blockers tab, renamed): "To resolve" and "Can stay open" sections, plus a short intro |
| B1 | A second tab on the review screen, only when something is missing | The tabs of the preview page |

## Out of scope

- **After Apply.** The editor behaves as it does today. A node with a missing
  credential shows the standard issue. A workflow with issues cannot be
  published, with the standard message.

## Questions for you

1. **Scenario list.** Which scenarios are wrong or missing?
2. **P2.** Is automatic selection in v1?
3. **B1.** What should the second tab on the review screen list?
4. **Other problems.** The tab today (Blockers, now Issues) also shows conflicts and moved folders.
   They are not dependencies. Where do they go?
