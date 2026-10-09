# Assistant e2e tests with two instances

The specs in this folder test the n8n Assistant against two n8n processes from
the local build:

| Name | URL | Task-runner broker | Purpose |
|---|---|---|---|
| This computer | `http://localhost:5678` | 5690 | Runs the Assistant. Its model is the scripted LLM. |
| Cloud | `http://127.0.0.1:5680` | 5691 | A second instance with MCP access. |

The two instances use different host names. Thus the browser and the API
helpers keep separate cookies for each instance.

The model is the [scripted LLM](../../../services/scripted-llm/README.md), so
the replies are the same on each run. No real API key and no network are
necessary.

## Run the tests

1. Install Node.js 24 or later. n8n does not start on an older version.
   Playwright can run on the Node.js version of your shell.
2. Build the backend and the editor. The tests use the local build:

   ```bash
   cd <repo root>
   pnpm build > build.log 2>&1
   ```

   To rebuild only the parts that the tests use, run
   `npx turbo run build --filter=n8n --filter=n8n-editor-ui`.

3. Run the tests from `packages/quality/testing/playwright`:

   ```bash
   pnpm test:future-poc
   ```

   When `node` on your PATH is older than 24, give the path of a Node.js 24
   binary:

   ```bash
   N8N_NODE_BIN=/opt/node24/bin/node pnpm test:future-poc
   ```

   Other arguments go to `playwright test`, for example `--grep "smoke"`,
   `--headed` or a spec path.

The runner (`scripts/run-local-linked.mjs`) does these steps:

1. It makes sure that ports 5678, 5680, 5690, 5691 and the ports of the
   scripted LLM and the fake sandbox are free.
2. It starts both instances with a temporary `N8N_USER_FOLDER` each. It writes
   their logs to a temporary folder.
3. It waits until each instance is ready and answers `POST /rest/e2e/reset`.
4. It runs Playwright on this folder with one worker.
5. It stops Playwright and both n8n process groups, and removes the user
   folders. It does this also on Ctrl-C and on failure. On failure, it keeps
   the logs and prints their paths and last lines.

The exit code is the exit code of Playwright.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `N8N_NODE_BIN` | `node` on PATH | The Node.js 24 binary for n8n. The runner also puts its folder first on the PATH of n8n, so the task runner uses the same version. |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright default | The folder of the Playwright browsers. The runner passes it to Playwright. |
| `SCRIPTED_LLM_PORT` | `5799` | The port of the scripted LLM. n8n gets `N8N_INSTANCE_AI_MODEL_URL=http://127.0.0.1:<port>/v1`. |
| `SANDBOX_SERVICE_PORT` | `5798` | The port of the fake sandbox service. n8n gets `N8N_SANDBOX_SERVICE_URL=http://127.0.0.1:<port>`. |
| `N8N_TEST_ENV_LOCAL` | – | A JSON object of extra variables for "This computer", for example `'{"N8N_LOG_LEVEL":"debug"}'`. These values override the values of the runner. |
| `N8N_TEST_ENV_CLOUD` | – | A JSON object of extra variables for "Cloud". |

The runner gives these variables to Playwright. Do not set them yourself:

| Variable | Value |
|---|---|
| `N8N_BASE_URL` | `http://localhost:5678` |
| `CLOUD_BASE_URL` | `http://127.0.0.1:5680` |
| `SCRIPTED_LLM_PORT`, `SANDBOX_SERVICE_PORT` | The ports above |
| `PLAYWRIGHT_SKIP_WEBSERVER` | `true`: the runner starts n8n, not Playwright. |
| `PLAYWRIGHT_ALLOW_CONTAINER_ONLY` | `true` |

The specs skip when `CLOUD_BASE_URL` is not set. Thus other Playwright
projects do not run them.

### n8n settings that the runner sets

Both instances: `E2E_TESTS=true`, `N8N_LISTEN_ADDRESS=127.0.0.1`,
`PREBUILDS_ONLY=1`, `N8N_LOG_LEVEL=warn`, and their own ports and user folder.

"This computer" also gets:

- `N8N_ENABLED_MODULES=instance-ai`.
- `N8N_INSTANCE_AI_MODEL=anthropic/claude-scripted`,
  `N8N_INSTANCE_AI_MODEL_URL` (the scripted LLM, with `/v1`) and
  `N8N_INSTANCE_AI_MODEL_API_KEY=scripted`.
- `N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED=true`.
- `N8N_INSTANCE_AI_SANDBOX_ENABLED=true`,
  `N8N_INSTANCE_AI_SANDBOX_PROVIDER=n8n-sandbox` and
  `N8N_SANDBOX_SERVICE_URL` (the fake sandbox). Without a sandbox, the
  Assistant shows its setup screen.
- `N8N_EXPERIENCE_MODES_ENABLED=true`.
- `N8N_SSRF_ALLOWED_IP_RANGES=127.0.0.1/32`, so that it can call "Cloud".

"Cloud" also gets `N8N_MCP_SERVER_RATE_LIMIT=0` and `N8N_SECURE_COOKIE=false`.
Playwright sends a `Secure` cookie over plain HTTP only to `localhost`, and
the cloud host is `127.0.0.1`.

## Write a spec

Import `test` and `expect` from `./fixtures`. Call `requireLinkedInstances()`
at file scope and use serial mode:

```ts
import { expect, requireLinkedInstances, test } from './fixtures';

requireLinkedInstances();
test.use({ script: { rules: [/* ... */], fallback: { text: 'Done.' } } });

test.describe('My journey', () => {
	test.describe.configure({ mode: 'serial' });

	test('does something', async ({ n8n, api, cloudApi, llm }) => {
		// ...
	});
});
```

Before each test, the fixtures deactivate the active workflows of "This
computer", reset both instances, sign in the owner of "This computer" and turn
off web search and the local gateway there. The local gateway setting goes back
to the value of the runner, so a test that turns it on does not change the
tests after it.

The browser context of the `n8n` and `page` fixtures uses reduced motion, so
animations keep still. It also starts with the sidebar expanded: the sidebar
experiment has no PostHog variant in e2e, and its control group starts
collapsed. A test that stores a choice in `sidebar.collapsed` keeps it.
A page from `n8n.start.withUser()` gets neither, because that helper opens a new
context with `browser.newContext()`. For such a page, call
`page.emulateMedia({ reducedMotion: 'reduce' })`, and add the sidebar init
script of `fixtures.ts` to its context before the first load.

A published workflow cannot be deleted by a database reset. Before each reset, the
fixtures deactivate the active workflows and wait until they are unpublished. A
test that stops early therefore cannot make the next reset fail.

| Fixture | Purpose |
|---|---|
| `n8n`, `api` | The usual page and API helpers for "This computer". |
| `cloudApi` | API helpers for "Cloud", signed in as its owner after the reset. |
| `cloudUrl` | The origin of "Cloud". |
| `script` | The script of `llm`. Set it with `test.use({ script })`. |
| `llm` | The scripted LLM, started from `script` for each test and stopped after it. |
| `startLlm(script)` | Starts the scripted LLM in the test, for a script that holds ids that the test created. Do not use it together with `llm`: both use the same port. |
| `startAssistantRun(threadId, message)` | Starts an Assistant run in a chat as the user of `n8n` and reads its event stream. At teardown, it closes every stream that the test opened, also after a failure. |
| `sandbox` | The fake sandbox service (one for each worker). It keeps files in memory and answers every command with exit code 0. |

Each scripted LLM counts its tool call ids from 1 (`toolu_scripted_1`, ...).
Two `startLlm` servers in one chat therefore give two calls the same id. Keep
this: real models can do the same, and the chat must keep both calls.

Guard each rule for the agent turn with `systemIncludes: 'n8n Instance Agent'`,
so that title and memory calls get the fallback text. See the
[scripted LLM guide](../../../services/scripted-llm/README.md#guard-the-rules-for-the-assistant).

The fake sandbox answers every command with exit code 0, so the Assistant cannot
run real commands. A rule can still ask the Assistant to build a workflow with
the `build-workflow` tool. The rule passes the workflow JSON as `sourceCode`. The
Simple and Power spec does this for its digest workflow. For other workflows,
create them with the API helpers in the test, then start the scripted LLM with
their ids (`startLlm`).
