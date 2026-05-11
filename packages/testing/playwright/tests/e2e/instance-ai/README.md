# Instance AI Playwright tests

These tests cover the `/instance-ai` UI and exercise the end-to-end agent flow
(chat, tool calls, workflow preview). They're tagged
`@capability:proxy` because the standard CI run uses a MockServer proxy to
record/replay LLM traffic instead of hitting the real Anthropic API.

## Two run modes

### CI / container mode (default)

Spins up an n8n container plus a MockServer proxy. The proxy either:

- **Replays** previously-recorded responses from `expectations/instance-ai/<test-slug>/`
  when no real Anthropic key is present (the default in CI).
- **Records** real Anthropic traffic into `expectations/...` when
  `ANTHROPIC_API_KEY` is set and `CI` is not (use this to refresh fixtures locally).

Run via:

```bash
pnpm test:container:sqlite tests/e2e/instance-ai
```

### Local-build mode (no docker, real Anthropic key)

Use this when iterating on instance-ai code and you want a fast feedback loop
against your local n8n build, without the docker proxy stack. Tests hit the
real Anthropic API directly — no recording, no replay.

```bash
cd packages/testing/playwright
export ANTHROPIC_API_KEY=sk-ant-...
pnpm test:local:instance-ai
```

That's the whole setup. Extra args flow through to `playwright test`:

```bash
# Single file
pnpm test:local:instance-ai instance-ai-workflow-preview.spec.ts

# Grep
pnpm test:local:instance-ai --grep "preview"

# Multiple instances in parallel — each gets its own random port + temp DB
pnpm test:local:instance-ai --grep "preview" &
pnpm test:local:instance-ai --grep "sidebar"  &
wait

# Pin the port (e.g. for browser inspection at http://localhost:5680)
N8N_BASE_URL=http://localhost:5680 pnpm test:local:instance-ai --grep "preview"

# Headed browser for visual debugging
pnpm test:local:instance-ai --grep "preview" --headed
```

#### What `test:local:instance-ai` does

It's a thin wrapper over the generic
[`test:local:isolated`](../../../README.md#testlocalisolated--local-run-with-full-isolation)
runner that pre-fills the four env vars n8n needs to boot the instance-ai
module (`N8N_ENABLED_MODULES`, `N8N_INSTANCE_AI_MODEL`,
`N8N_INSTANCE_AI_MODEL_API_KEY`, `N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED`).

From the isolated runner you get:

- **Random free OS ports** for n8n + the task-runner broker, so multiple
  invocations don't collide.
- **Throwaway `N8N_USER_FOLDER`** under the OS temp dir, cleaned up on exit.
  `~/.n8n/database.sqlite` is never touched.
- **`PLAYWRIGHT_ALLOW_CONTAINER_ONLY=true`** so the `@capability:proxy` tag
  is honoured locally.
- **Self-managed n8n** with a real `/rest/e2e/reset` readiness check (not the
  racy default favicon poll), `PLAYWRIGHT_SKIP_WEBSERVER=true` to stop
  Playwright from spawning a duplicate, and process-group cleanup so
  `node ./n8n` doesn't get orphaned.

The `instanceAiProxySetup` fixture (`fixtures.ts`) detects the missing
`n8nContainer` and short-circuits all proxy + tool-trace setup, so every LLM
call goes straight to Anthropic.

> **Cost note:** Each run makes real Anthropic calls. Scope with `--grep` or
> a filename while iterating; reserve full-suite runs for fixture refreshes
> (see [Adding a new test](#adding-a-new-test) below).

## Adding a new test

1. Write the test against fixtures from `./fixtures` (not the base playwright
   fixture). The `instanceAiTestConfig` brings in the `@capability:proxy`
   services and the env vars n8n needs.
2. Iterate in **local-build mode** until the test passes against real
   Anthropic.
3. Refresh recorded expectations:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-... pnpm test:container:sqlite \
     tests/e2e/instance-ai/<your-test>.spec.ts --workers 1
   ```
   Recording requires a real key + non-CI env. The `instanceAiProxySetup`
   fixture writes both `expectations/instance-ai/<slug>/<n>.json` (proxy
   responses) and `expectations/instance-ai/<slug>/trace.jsonl` (tool I/O for
   ID remapping during replay).
4. Commit the regenerated `expectations/` files alongside the test.

## Reference files

| File | Purpose |
|------|---------|
| `fixtures.ts` | `instanceAiTestConfig` capability + `instanceAiProxySetup` auto-fixture (record/replay/local). |
| `../../../pages/InstanceAiPage.ts` | Page object — locators for chat, timeline, preview iframe, etc. |
| `../../../scripts/run-local-instance-ai.mjs` | Wrapper that powers `pnpm test:local:instance-ai` — pre-fills instance-ai env vars over the generic runner. |
| `../../../scripts/run-local-isolated.mjs` | Generic runner (random port + temp DB) that powers `pnpm test:local:isolated`. |
| `expectations/instance-ai/<test-slug>/` | Per-test recordings — proxy responses + tool trace events. |
