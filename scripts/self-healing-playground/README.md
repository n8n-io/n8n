# Self-healing playground

This local dashboard creates real workflows and sends production webhook requests.
It uses the current self-healing stack. It does not create configurations, fabricate
results, or call the internal investigation service.

## Start n8n

Use this branch for both the backend and editor. Use Node 24 and the pinned pnpm version.
Install dependencies if needed with `pnpm install`.
If the build output is missing or stale, build before you start:

```sh
pnpm build > build.log 2>&1
```

Enable these settings in the **n8n backend terminal** before startup.
Keep any other modules and Assistant settings that you already use.

```sh
export N8N_ENABLED_MODULES=instance-ai,inbox
export N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true
pnpm start
```

For editor development, run `pnpm dev:fe:editor` in another terminal.
Complete Assistant setup in n8n. Check that a normal Assistant conversation works.
Self-healing needs the configured model, sandbox, workflow access, and permission
to share node parameters for candidate verification.

The dashboard accepts local n8n URLs only. Use a local development instance.
It creates persistent workflows. It does not delete or reset existing workflows.

## Start the dashboard

Create an API key in **Settings → n8n API** on the local instance.
The dashboard needs these scopes when your instance supports scoped API keys:

- `workflow:create`, `workflow:read`, `workflow:list`, `workflow:activate`
- `execution:list`

Set the key in a **separate dashboard terminal**. This zsh example reads it without
echoing it or putting it in shell history:

```sh
read -s 'N8N_API_KEY?Local n8n API key: '
export N8N_API_KEY
pnpm dev:self-healing
```

Open **http://127.0.0.1:5698**. The key stays in server memory. The browser does not
receive it. A restart needs the environment variable again.

| Variable | Default | Purpose |
| --- | --- | --- |
| `N8N_BASE_URL` | `http://localhost:5678` | Backend public API |
| `N8N_EDITOR_BASE_URL` | Backend URL | Editor links; set this to the URL printed by `pnpm dev:fe:editor` |
| `N8N_WEBHOOK_BASE_URL` | Backend URL | Production webhook base URL |
| `SELF_HEALING_PLAYGROUND_PORT` | `5698` | Dashboard port on `127.0.0.1` |

For example, set `N8N_BASE_URL=http://localhost:5691` if your backend uses port 5691.
The dashboard can start without a key and show setup instructions.

## Test the full flow

1. Enter a project ID if you want a team project. Copy it from the n8n project URL.
   Leave it blank for the API key owner's personal project.
2. Select **Create and publish** for **Invoice field mix-up**. Creation does not
   send an input. If publication fails, the dashboard keeps the draft and shows the error.
3. Open **Project settings**. Create your self-healing configuration. Include this
   workflow, assign yourself as a reviewer, and enable it.
4. Select **Send original input**. Expect a saved `error` execution in `webhook` mode.
   HTTP 500 is expected for a broken workflow. Check the saved execution to confirm.
5. Open **Inbox**. Wait for the real investigation. Review the report, changes,
   activity, and usage. The dashboard refreshes execution status every ten seconds.
   It does not claim that an investigation started from the webhook response alone.
6. Select **Apply and publish** in the result. Send the original input again.
   Expect `{ "orderId": "ORDER-101", "total": 42.5 }`.
7. Send the alternate input. Expect `{ "orderId": "ORDER-102", "total": 19 }`.
   Inspect the response and execution output. HTTP success alone does not prove a correct repair.
8. Create fresh copies for **Apply and open in editor**, **Discard**, and chat handoff.
   After applying to a draft, publish it before sending another input.

| Scenario | Initial behavior | What to check |
| --- | --- | --- |
| Invoice field mix-up | A number field receives an email address | Repair reads `body.amount`; both totals stay numeric |
| Order output shape | JSON output is an array instead of an object | Repair returns `{ "items": [...] }`; both inputs retain every item |
| Account API unavailable | HTTP Request cannot reach the example API | Report explains setup limits; a successful live repair is not expected |
| Healthy invoice | Execution succeeds | No new self-healing result |

The unavailable-service scenario uses a reserved `.invalid` API domain. It does not
contact a real account service. It is a setup-blocker test, not a runnable integration.
Model outcomes can vary. These scenarios do not force a particular Inbox outcome.

## If no result appears

- Confirm the backend has both modules and the workflow suggestions flag enabled.
- Confirm Assistant setup, model access, and sandbox access work.
- Confirm the configuration is enabled for this workflow's project and you are a reviewer.
- Confirm the execution is saved, failed, and uses `webhook` mode. Editor test runs do not qualify.
- If a webhook returns HTTP 404 just after publication, wait a moment and send the
  input again. Webhook registration can lag publication. A 404 does not prove that
  an execution ran. If it persists, check `N8N_WEBHOOK_BASE_URL`.
- Confirm the workflow has no unpublished changes. The dashboard blocks inputs until publication.
- Close an existing open result before testing another failure on the same workflow.
  Closing a result does not start an investigation. Send another input afterward.
- If an investigation is already running, wait for it. If Assistant capacity was
  full, a later failure can try again. There is no automatic retry queue.
- Check the n8n server log for admission or model errors.

Create scenarios one at a time to avoid filling Assistant capacity.
No test uses scheduled triggers. Stopping the dashboard stops new requests.
The created workflows stay published. Delete them in n8n when you finish; their
names start with `[self-healing playground]`.

## Dashboard checks

```sh
pnpm test:self-healing-playground
```

These tests check the dashboard boundary and API orchestration. They do not run a model.
Use the steps above to validate the real self-healing result and review flow.
