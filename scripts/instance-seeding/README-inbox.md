# Seed Inbox examples

Build the backend and start a development instance once to run its migrations.
Create a user through the normal setup screen. Stop the instance before seeding.

Set `N8N_USER_FOLDER` to that instance's parent directory.
Set `INBOX_SEED_USER_ID` to the user's ID.
Run `pnpm seed:inbox` from the repository root.
Use the same database environment variables as the development instance.

The script creates four saved results in the user's personal project:

- Fix ready, with changes.
- Needs attention, with changes.
- Needs attention, without changes.
- Could not fix, without changes.

The script creates workflow and execution records. It prepares changes through
`WorkflowSuggestionService`. It saves each result through
`SelfHealingResultService.complete()`. Only the investigation output is fixed.
The published workflow snapshots have no running triggers or external calls.

A repeat run replaces only workflows with this seed's exact ID and marker in
the same personal project. Associated results and suggestions are removed by
the normal database relations. Other seeded workflows remain unchanged.

Restart the instance with `N8N_INSTANCE_AI_SELF_HEALING_ENABLED=true` to expose
the result source and detail API. The `instance-ai` and `inbox` modules must be
enabled. Open `/inbox` to inspect the list. AST-1518 supplies the Assistant
report and action pane. Keep this rollout flag off in deployed instances until
that pane is connected.
