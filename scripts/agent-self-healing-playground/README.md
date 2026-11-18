# Agent self-healing playground

This playground is the agent twin of the self-healing playground on the branch
`local/self-healing-playground`. It is a page in n8n for a throwaway branch. It uses
your login and the normal REST routes. No API key is necessary.

One click creates a published support agent with two workflow tools, an eval suite,
a self-healing configuration that covers the agent, and production sessions. Then you
select **Run now** and review the proposal in **Inbox**.

## Files

| File | Purpose |
| --- | --- |
| `packages/frontend/editor-ui/src/app/views/AgentSelfHealingPlaygroundView.vue` | The page. |
| `packages/frontend/editor-ui/src/app/views/agentSelfHealingPlayground.ts` | The scenarios, the request bodies, and the page text. |
| `packages/frontend/editor-ui/src/app/views/agentSelfHealingPlayground.test.ts` | Checks the request bodies against the DTO schemas. |
| `scripts/agent-self-healing-playground/start.mjs` | The local launcher. |
| `scripts/agent-self-healing-playground/wiring.patch` | The route, the sidebar item, and the `dev:agent-self-healing` script. |

The page text is in `agentSelfHealingPlayground.ts` and not in the i18n package.
Thus the playground adds no keys to the locale file.

## Set up the branch

The page is not reachable until the wiring patch is applied. The patch changes
`package.json`, `router.ts`, and `MainSidebar.vue`. Keep these changes and the
playground files out of the feature pull request.

```sh
git switch -c local/agent-self-healing-playground   # from the agent self-healing branch
git apply scripts/agent-self-healing-playground/wiring.patch
git add scripts/agent-self-healing-playground packages/frontend/editor-ui/src/app/views package.json \
  packages/frontend/editor-ui/src/app/router.ts packages/frontend/editor-ui/src/app/components/MainSidebar.vue
git commit -m "chore: Add the agent self-healing playground (no-changelog)"
```

## Prerequisites

- `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true`.
- The modules `instance-ai`, `inbox`, `agents`, `agent-evals`, and `data-table` are active, and Agents
  are enabled in **Settings > Agents**. These are the defaults.
- `N8N_AGENT_EVALS_ENABLED=true`, or your user is in the `101_agent_evals` rollout. Without it,
  the playground cannot create the eval suite. The page then shows a note and continues.
- The instance does not use queue mode.
- The Assistant has a model. The sandbox is necessary only for the Inbox chat handoff.
- The project has a model for new agents: one LLM credential that you can use in the project, or one
  agent in the project that has a model. The playground copies the model of that agent.
- You can configure self-healing in the project, and you can create, publish, and delete agents and
  workflows there.

## Run it locally

```sh
pnpm build > build.log 2>&1
pnpm dev:agent-self-healing        # or: node scripts/agent-self-healing-playground/start.mjs
```

The launcher sets the flags above, binds to loopback, and creates the team project
**Self-healing test** for the instance owner. The default URL is `http://127.0.0.1:5708`.
The default data folder is `.agent-setup/agent-self-healing-local`. Complete owner setup on a
fresh instance.

The launcher reads optional settings from `.agent-setup/agent-self-healing-local.env`. Git ignores
this file. Put the Assistant model there (`N8N_INSTANCE_AI_MODEL`, `N8N_INSTANCE_AI_MODEL_API_KEY`)
and the sandbox connection. You can copy these lines from `.agent-setup/self-healing-local.env` of
the workflow playground.

Do not point this launcher at the data folder of the workflow playground. This branch has database
migrations that the workflow playground branch does not have.

## Deploy a test instance

Push the branch. Then use the same command as for the workflow playground:

```sh
pnpm nathan deploy local/agent-self-healing-playground test-sh-agents
```

The deployed instance does not use `start.mjs`. It needs the flags from **Prerequisites** in its
environment.

## Use it

1. Open **Agent self-healing playground** in the sidebar, or go to `/agent-self-healing-playground`.
2. Select a project. The page prefers **Self-healing test**.
3. Select **Create** on **Wrong lookup tool**. Wait about one minute. The page creates all the data
   and sends the production sessions. The message tells you in how many sessions the agent started
   with the wrong tool.
4. In **Your test agents**, select **Run now** on the card of the agent. The configuration form has
   no **Run now** button. To see the configuration, go to the **Configuration** row and select
   **Open** (**Project settings > Self-healing** for a team project, the **Self-healing** tab for a
   personal project).
5. Wait some minutes. Open **Inbox**. The proposal is on the **Open** tab.
6. Open the proposal. Read **Activity**, **Changes**, and **Eval results**. Select **Apply** or
   **Discard**.
7. To see the effect, select **Send production sessions** again and compare the session log.

## Scenarios

Each scenario makes an agent with the tools `crm-lookup` (customer accounts) and `oms-lookup`
(orders). A configuration covers only this agent. You are its reviewer and the user that the
investigation runs as.

| Scenario | What it creates | What you see |
| --- | --- | --- |
| **Wrong lookup tool** | Agent **Order support**. The description of `crm-lookup` claims orders and deliveries. The description of `oms-lookup` says nothing useful. The eval suite has two customer cases. The configuration uses **Wait for approval** with a schedule of 720 hours and no session trigger. Four production sessions: three order questions and one customer question. | After **Run now**: one proposal on the **Open** tab with a tool description edit, a regression case, and results for the published and the proposed version. |
| **Wrong lookup tool, Publish everything** | Agent **Delivery support**. The same defect. The configuration uses **Publish everything**. | After **Run now**: the proposal is applied without a review. It is on the **Closed** tab and shows **Published automatically**. |
| **Healthy support agent** | Agent **Account support**. Clear tool descriptions. The eval suite also has an order case. The same four sessions. | After **Run now**: no Inbox item. The investigation finishes with the outcome `no_change`. |
| **Conflicting instructions** | Agent **Refund support**. The instructions contradict each other. No sessions and no eval suite. | After **Run now**: a proposal from the configuration only, with an instructions edit and a new eval case. |
| **Session trigger** | Agent **Shipping support**. The wrong lookup tool defect. The session trigger is 3 and four sessions are sent. | Do not select **Run now**. The sweep runs each 5 minutes and starts the investigation. Then one proposal appears on the **Open** tab. |

A new **Create** of a scenario first deletes the earlier agent of that scenario in the project,
with its tool workflows, its eval suite, and its playground configuration.

## Production sessions

An investigation counts and reads only production sessions that its user can read. Test chats and
eval runs are not production sessions. Published n8n Chat sessions are private to their user.

The playground uses the **webhook channel** of the agent with the authentication `none`:

- It is a production source, and its sessions belong to the project. Thus the investigation can
  read them for each user that enables the configuration.
- It is one JSON request for each turn. No streaming and no chat credential are necessary.
- The sessions are real runs of the published agent. The playground writes no database rows.

For each scripted session, the page sends the question, then reads the session and its tool calls.
If the first tool is not the expected tool, the page sends the correction of the customer in the
same conversation. Thus a session shows a correction only when the agent made the error.

To send more sessions by hand, copy the webhook URL from the agent (**Triggers > Webhook**):

```sh
curl -X POST "$AGENT_WEBHOOK_URL/responses" -H 'Content-Type: application/json' \
  -d '{"input":"Where is my order ORDER-1042?"}'
# Continue the conversation with the ID from the reply:
curl -X POST "$AGENT_WEBHOOK_URL/responses" -H 'Content-Type: application/json' \
  -d '{"input":"ORDER-1042 is an order number. Look up the order.","conversation":"<conversation id>"}'
```

The known references are `ORDER-1042`, `ORDER-1043`, `ORDER-1044`, `CUST-204`, `CUST-311`, and
`dana@example.com`. Only sessions after the last publication of the agent are in the trace window.

## Clean up

Select **Reset playground**. It deletes each playground agent of the selected project, its tool
workflows, its eval suite, and its playground configuration. A configuration that you changed to
cover other agents or workflows stays. The project and the credentials stay.

The playground finds its data by the `agentSelfHealingPlayground` key in the `meta` of the tool
workflows. This key stores the scenario, the run ID, and the agent ID. If you delete a tool workflow
by hand, the page does not show that agent. Delete the agent in n8n.

## Known limits

- The model decides. The agent can select the correct tool although the descriptions are unclear.
  The message after **Create** gives the number of sessions that started with the wrong tool. If the
  number is 0, select **Send production sessions** again or use a smaller agent model.
- The webhook channel has no authentication on the test agents. Use the playground only on a local
  or throwaway instance.
- The page sends the sessions from the browser to the webhook URL that the backend reports. If
  this URL has another origin than the editor, the browser can block the request.
- An open proposal or an unfinished investigation blocks a new investigation of that agent. Apply or
  discard the proposal first.
- **Reset playground** cannot delete an eval suite that has runs. The suite data table then stays.
- No person is notified about a new proposal. Refresh **Inbox**.
- The 5-minute sweep skips an agent for 1 hour after a failed investigation.
