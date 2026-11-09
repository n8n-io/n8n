# Self-healing playground

The playground is part of n8n on this throwaway branch. It uses your existing
login and the normal workflow APIs. No API key or separate dashboard is needed.

Build this branch if needed:

```sh
pnpm build > build.log 2>&1
```

Start n8n with the Assistant, Inbox, and self-healing flag enabled:

```sh
pnpm dev:self-healing
```

The local launcher enables test entitlements for one team project. It creates
**Self-healing test** for the instance owner. It uses the normal project service.
These test entitlements apply only when this launcher runs.

The default URL is `http://127.0.0.1:5698`. The launcher binds to loopback.
The default data folder is `.agent-setup/self-healing-local`. Set `N8N_USER_FOLDER`
to reuse another test instance. Complete owner setup on a fresh instance.

The launcher reads optional local settings from
`.agent-setup/self-healing-local.env` before the shared CLI environment file.
This file is ignored by Git. Use it for the test data folder, model connection,
and sandbox connection. Existing shell environment variables take precedence.
For a local n8n sandbox service, set `N8N_INSTANCE_AI_SANDBOX_PROVIDER=n8n-sandbox`,
`N8N_SANDBOX_SERVICE_URL`, and `N8N_SANDBOX_SERVICE_API_KEY`. Set
`N8N_INSTANCE_AI_MODEL` and `N8N_INSTANCE_AI_MODEL_API_KEY` for the model.
Once the model and sandbox are configured, the launcher disables unconfigured
web search to complete Assistant setup. This enables the Inbox chat handoff.
Existing search connections are preserved.

Open **Self-healing playground** in the sidebar, or navigate to
`/self-healing-playground` on your n8n instance.

1. Select your personal project or a team project. The playground prefers **Self-healing test** when it exists.
2. Create and publish a scenario. This does not run the workflow.
3. Open self-healing settings. Create and enable your configuration. Select the
   workflow and assign yourself as a reviewer.
4. Send the original input. The broken scenarios save a failed production webhook execution.
5. Review the real result in Inbox. Apply and publish a repair.
6. Send both inputs again. Inspect the saved executions and output.

The invoice scenario should return numeric totals of `42.5` and `19` for the two
inputs. The sub-workflow scenario should return the same totals. The output-shape scenario should return an object with an `items` array
that preserves the supplied items. The unavailable-API scenario uses a reserved
`.invalid` domain and tests reports that need outside help. The healthy control
should succeed without starting an investigation.

## Test a fix across workflows

The sub-workflow scenario creates two workflows. It creates and publishes the
sub-workflow first. Then it creates and publishes a parent webhook workflow. The
parent calls the sub-workflow with an Execute Sub-workflow node. The defect is in
the sub-workflow: it reads the customer email as the total.

1. Create the **Sub-workflow invoice mix-up** scenario. Both workflows appear in the list.
2. In self-healing settings, select the parent workflow. You can also select the
   sub-workflow. Assign yourself as a reviewer.
3. The settings form has no sub-workflow option yet. On the parent workflow card,
   select **Include sub-workflows**. This sets `includeSubWorkflows` on the
   configuration that covers the parent.
4. Send the original input to the parent. The parent execution fails in the
   sub-workflow call.
5. In Inbox, expect a repair that changes the sub-workflow.
   Apply and publish the repair. Then send both inputs again.

Only parent executions start investigations. Sub-workflow failures alone do not.

Assistant model and sandbox setup must work. The playground does not create
self-healing configurations or fabricate results. An open result blocks another
investigation on that workflow. Close it before sending another failed input.
Manual editor executions do not trigger self-healing.

If the first webhook request returns HTTP 404 just after publication, wait a
moment and try again. Check for a saved execution before treating it as a failure.
Use Refresh to update execution status after actions in another tab.

Test workflows stay in n8n. Their names start with `[self-healing playground]`.
Select **Reset playground** to delete them. Reset deletes parent workflows before
their sub-workflows.
