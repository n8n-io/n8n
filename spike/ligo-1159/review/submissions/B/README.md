# LIGO-1159 — Cross-project promotion spike

| Doc | What it holds |
|---|---|
| [current-state.md](current-state.md) | What master does today, with file references |
| [solution.md](solution.md) | Model, answers to each question in the ticket, user flows, technical approach, rejected options |
| [ticket-plan.md](ticket-plan.md) | 10 tickets in build order (4 existing ones reused, 6 new), plus housekeeping |

## Conclusion

- **The real cross-project surface is small.** At runtime, only credentials (shares), workflow references
  (sub-workflow, error workflow) and moves cross a project boundary. Variables and data tables can't do it, and tags are global.
- **Model:** content travels with its project. Everything else travels as a reference, with its owner.
  Apply binds each reference once, in its owner's place, and gives the consuming projects access.
  This model is the same for instance, project and selective promote and Apply, and it also works for per-project repositories later.
- **Promote** never fails because of an outside dependency. It shows the dependency in the preview, and warns when the branch lacks it.
- **Apply:**
  - creates a shared credential once, in its owner project, or in the consumer when the owner is personal or unknown;
  - shares the credential with the consumers;
  - asks the user to confirm a dangling sub-workflow;
  - transfers moved workflows.
- **Format:** an optional `owner` field on the credential and workflow requirements. There is no sharing graph and no version bump. Old branches and old destinations keep working.
- **Permissions:** promotion acts as the user. Every write that touches another project names the permission it needs.

## Findings worth acting on now

- LIGO-1363 is marked "To Be Released", but master still refuses cross-project moves on Apply.
- A team workflow that uses a **personal** credential can't be applied to a fresh destination. Apply stops with a hard `unknown-owner` conflict and gives no fix.
- The `access-required` blocker tells an instance admin to "ask an administrator".
- The project preview doesn't predict instance-promote failures, because the two use different dependency policies.
- A missing sub-workflow passes Apply silently.
