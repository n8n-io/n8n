# The task the four authors received

Linear ticket LIGO-1159, "[Spike] Cross-project promotion: define the solution".

## Problem

- Promotion treats a project as a closed unit. Real instances are not closed: shared credentials, sub-workflows in other projects, project-owned variables, moves between projects, personal-project dependencies.
- Partial packages are live (selective Promote, selective Apply). References often point outside the package.
- Today each case fails, duplicates, or behaves differently per resource type. Users hit raw errors or surprises after Promote or Apply.
- There is no shared model for cross-project cases.

## Goal

Define the end-to-end cross-project solution (UX and technical) before the team picks up the rest of the project.

## Questions the spike must answer

- **Scope:** which cross-project cases do we support, block, or leave out?
- **Promote:** a dependency is outside the selection or project. What happens, what does the user see, and when?
- **Apply:** the owning project is not in the package. Where does the resource land? A shared resource: is it created once, and is sharing kept?
- **Personal projects:** how do dependencies on them behave?
- **Moves:** how does a cross-project move show and apply?
- **Permissions:** a dependency is in a project the user cannot access. What can the user do?
- **Package format:** what must it carry (owner, sharing), and how does it stay compatible with existing branches?
- **Consistency:** one model across instance and project Promote, selective Apply, per-project connections, and all resource types.

## Constraints

- No friction for the common case.
- Git stays the source of truth.
- Existing branches keep working.

## Deliverable

- Solution document: user flows, technical approach, rejected options.
- Ticket plan: tickets to implement the solution, in order.

## Out of scope

- Implementation.
- Promoting personal projects.
- Per-project repositories. The solution must stay compatible with them.

## Related Linear tickets

LIGO-1165 (engine partial import, done), LIGO-1168 (apply a selection), LIGO-1170 (partial apply spike), LIGO-1051 and LIGO-1053 (selective promote), LIGO-1089 (push with personal or team project dependencies), LIGO-1091 (import does not preserve cross-project sharing), LIGO-1250 (import fails or duplicates a missing credential used in several projects), LIGO-1243 (create missing credentials with package data), LIGO-1363 (move workflows and folders between projects on Apply), LIGO-1268 (project promotion without instance promotion first), LIGO-1056 (identify new credentials and variables of a changeset).

## Code

- Promotion: `packages/cli/src/modules/promotions.ee/`
- Package import and export: `packages/cli/src/modules/n8n-packages/`
- The authors investigated revision `ed626a767fa9015bf75007d915737eb436fc3f75`. The checkout at `/Users/ireneeajeneza/conductor/workspaces/n8n/hamburg-v1` is one commit later, with no change in these two modules. If a cited line number is slightly off but the behavior matches, accept the claim.

## Cross-project cases to check

Credential ownership and project sharing; personal credentials; global or instance-scoped credentials; static sub-workflows; error workflows; variables; data tables; tags; workflow sharing; resource moves; permission boundaries; existing branches; older destination versions.
