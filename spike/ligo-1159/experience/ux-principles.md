# LIGO-1159: Experience principles for cross-project promotion

Status: draft 6, 2026-11-23. Not reviewed.

A change can use a credential, a variable, or a sub-workflow that the
destination does not have. This document calls such an item a **missing
dependency**. "Missing dependency" is a working term and not final. One name
covers all of them.

Where the dependency comes from decides what the user can do:

- It comes from a project that the user administers or edits. The user can
  **resolve** it: create it, or replace it with a placeholder.
- It comes from a project that the user cannot access. The user cannot
  resolve it. It stays **unresolved**.

The rule for v1: the user must resolve what the user can resolve. The rest
can stay open. We may reverse this later.

Each principle names the n8n design principle that it applies, in brackets.
Sources: the check-in of 2026-11-23. The POC documents are on the branch
`ireneea/ligo-1159-cross-project-promotion-poc`: `spike/ligo-1159/review/final/solution.md`,
`poc/decisions.md`, `poc/README.md`.

## Principles

1. **Be transparent.** Before the operation, show what is missing, what n8n
   will do about it, and what the user must do afterward. After the operation,
   show what happened and what is still open. Link each open item to where the
   user fixes it. If the preview changes before the user continues, show the
   new preview. *(Own the complexity: make it understandable, do not hide it.)*
2. **One list, one name, two states.** Show all missing dependencies in one
   list, on Promote and on Apply. Mark each one as resolvable or unresolvable,
   and say why. A resolvable item must be resolved before Apply continues. An
   unresolvable item does not stop Promote or Apply: the user reviews it,
   confirms it, and continues. *(Own the complexity. Consistency builds trust.)*
3. **No change when nothing is missing.** Reuse existing screens and patterns.
   *(Protect the flow. Consistency builds trust.)*
4. **One clear path.** Each screen shows where the user is, what happens
   next, and what the next action does. In v1 the only exit for an
   unresolvable item is to continue. Show a summary first and the details on
   request. *(Build for mastery. Less, but better.)*
5. **Use plain words.** Name the resource and the next step in every message.
   Do not show raw errors or internal IDs. *(Consistency builds trust.)*
6. **State the limits of what you show.** The user may not have access to the
   owner or the project of a resource. Do not show them. Say that the
   information is not available to the user. Show only what the user's own
   workflow already shows, such as the name and the type. *(Own the
   complexity.)*
7. **Design for the extremes.** One item, hundreds of items, no items, and
   very long names must all work. *(Own the complexity.)*
8. **Leave room for later.** The v1 rule may change. The design must not
   block a stricter rule, or the exits that are out of scope today. *(Design
   for tomorrow, ship today.)*

A promotion never publishes a workflow. A workflow that uses a credential
without values cannot be published. Publish refuses it and states the reason.

## Content direction

- Use short, direct sentences in the active voice.
- State facts. Do not use humor or wordplay.
- Put the next step on the button, with the count: "Promote with 2 unresolved
  dependencies".
- Use one name for one thing across all surfaces.

## Decided (check-in 2026-11-23)

- The tab that lists them is called **Issues**, to match the editor. A row
  reads "Missing credential: HubSpot API key".
- Missing dependencies appear on Promote and on Apply, when the user opens
  the changes from the instance overview.
- Resolvable items stay mandatory on Apply. Unresolvable items show a warning
  and ask for confirmation. They do not block.
- Credential deletion is out of scope.
- A credential in a personal project cannot be promoted. The user moves it to a
  team project first. Top-level credentials are dropped.
- Data tables come along automatically with the workflows that use them.
- Apply needs the credential read, create and update scopes.

## Out of scope for v1 (TBD)

- "Include it" and "Ask the owner" as exits.
- Showing who owns a resource or which project holds it.

## To check

- [ ] The notes conflict. The summary says to lift hard blockers for missing
  bindings. The details say that resolvable bindings stay mandatory on Apply.
  This draft follows the details.
- [ ] The final name for "missing dependency".
- [ ] Apply creates empty credentials ("Needs first setup"). The meeting did
  not cover this.
- [ ] The user confirms each access grant on Apply. The meeting did not cover
  this.
- [ ] The hard blocks of the POC (for example a credential type mismatch).
  The meeting did not cover them.
