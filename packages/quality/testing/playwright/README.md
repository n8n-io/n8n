# Playwright test runner

Playwright is not only the browser E2E runner. This package uses Playwright's
worker lifecycle and project model to orchestrate browsers, APIs, n8n processes,
service containers, deployment topologies, diagnostics, and benchmark artifacts.

## Choose a suite

Commands in this table run from the repository root. Container-backed tests need a current n8n image. Run `pnpm build:docker` first when you change product code.

| Goal | Project or runner | Command | Guide |
| --- | --- | --- | --- |
| Test a product UI or API journey | `e2e` (local) or `<mode>:e2e` (container) | `pnpm --filter n8n-playwright test:local` | [E2E tests](tests/e2e/) |
| Test PostgreSQL, queue mode, multi-main, or process lifecycle | `<mode>:infrastructure` | `pnpm --filter n8n-playwright exec playwright test --project=postgres:infrastructure` | [Infrastructure tests](tests/infrastructure/) |
| Check accessibility within a product journey | E2E project with the `a11y` fixture | `pnpm --filter n8n-playwright test:local` | [Accessibility checks](docs/ACCESSIBILITY.md) |
| Measure idle memory, retention, or canvas performance | `performance` | `pnpm --filter n8n-playwright test:performance` | [Performance guide](tests/performance/README.md) |
| Measure infrastructure throughput and resource use | `benchmarking:infrastructure` | `pnpm --filter n8n-playwright test:benchmark` | [Infrastructure benchmarks](tests/infrastructure/benchmarks/README.md) |
| Investigate Instance AI memory with a local-only, Docker-backed run | `benchmark-memory-instanceai:infrastructure` | `pnpm --filter n8n-playwright exec playwright test --project=benchmark-memory-instanceai:infrastructure` | [Local benchmark setup](tests/infrastructure/benchmarks-local/README.md) |
| Test workflow execution and schemas | `cli-workflows` | `pnpm --filter n8n-playwright test:workflows` | [Workflow tests](tests/cli-workflows/README.md) |
| Check fixture, reporter, or helper code without a browser | Vitest | `pnpm --filter n8n-playwright test:unit` | [Test-writing patterns](docs/TESTING_PATTERNS.md) |
| Check browser-backed harness contracts | Harness Vitest config | `pnpm --filter n8n-playwright test:harness` | [Test-writing patterns](docs/TESTING_PATTERNS.md) |
| Run evaluation scenarios | `eval` | `pnpm --filter n8n-playwright test:evals` | [Evaluation tests](tests/evals/) |

The Playwright package owns the runner and its specs. Standalone measurement tools live in [efficiency](../../efficiency/README.md). Read [AGENTS.md](AGENTS.md) before you change a test. The examples below run from this package unless noted.

## Development setup
```bash
pnpm install-browsers # in the Playwright package
pnpm build:docker # from the repository root for container tests of local product changes
```

## Quick Start
```bash
pnpm test:all                 									# Run all tests (fresh containers, pnpm build:docker from root first to ensure local containers)
pnpm test:local           											# Starts a local server and runs the E2E tests
N8N_BASE_URL=http://localhost:5068 pnpm test:local	# Runs the E2E tests against the running instance
```

## Test Layout

Product Playwright tests live under `tests/`. Most product tests are grouped
under `tests/e2e/`, with infrastructure, performance, evaluation, and other
test suites beside it.

Framework and harness tests live under `tests/framework/`. These tests verify
the test framework, fixtures, startup lifecycle, diagnostics, and harness
contracts. They are not product E2E tests and must not be added under
`tests/e2e/`.

Run browser-free fixture, reporter, and helper tests with `pnpm test:unit`. The default Vitest configuration does not include `tests/framework/`. Run its browser-backed harness contracts with the dedicated configuration:

```bash
pnpm test:harness
```

Inspect the full E2E distribution without running tests or containers:

```bash
pnpm --silent distribution:count
```

The report counts selected specs, runnable tests, declared container images, and
the Playwright worker profiles that would each start an n8n stack with one worker.
It compares those stack starts with the fixture count from the distributor.

Inspect the impact selection for a pull request:

```bash
pnpm --silent distribution:count -- --pr=<pull-request-number>
```

Pass an explicit changed-file list when no pull request exists:

```bash
pnpm --silent distribution:count -- \
  --files=packages/core/src/example.ts,packages/workflow/src/example.ts \
  --base=<base-sha>
```

## Develop against running containers (avoid docker rebuilds)

Iterating on a feature that needs postgres/redis/SMTP/an HTTP proxy? You don't
need `pnpm build:docker` each time. Boot only the services your local dev
servers need, and let dev mode pick them up.

**Two-terminal workflow:**

```bash
# Terminal 1 — boot only the services. Writes packages/cli/bin/.env with the
# host:port + credentials. Containers stay running in the background.
pnpm --filter n8n-containers services --services postgres,redis,mailpit,proxy

# Terminal 2 — run n8n locally as usual. It picks up the .env automatically.
# Add `pnpm dev:fe:editor` in a third terminal for frontend hot reload.
pnpm dev:be
```

Scope the `--services` list to what you actually need — booting fewer
containers makes startup faster.

| Service | What dev mode gets | Use when… |
|---------|--------------------|-----------|
| `postgres` | `DB_*` vars → PostgreSQL backend | testing migrations or PG-specific queries |
| `redis` | `QUEUE_*`/`N8N_CACHE_*` → queue mode + cache | testing queue mode or distributed cache |
| `mailpit` | `N8N_SMTP_*` → captured SMTP at `http://localhost:<mapped-port>` | testing email flows |
| `proxy` | `HTTP_PROXY`/`HTTPS_PROXY`/`N8N_PROXY_*` → MockServer | testing outbound HTTP via the proxy |

Other available services: `kafka`, `gitea`, `keycloak`, `kent`, `victoriaLogs`,
`victoriaMetrics`, `vector`, `tracing`, `localstack`, `cloudflared`, `ngrok`.
See `packages/quality/environments/containers/README.md` for the full list.

**Tear down when you're done:**

```bash
pnpm --filter n8n-containers services:clean
```

This stops the containers and removes `packages/cli/bin/.env`.

**Running service-backed tests against this setup.** Tests with service-backed
`capability` options skip local mode because the service helpers require an n8n
test container. Run these tests with a container project.

## Separate Backend and Frontend URLs

When developing with separate backend and frontend servers (e.g., backend on port 5680, frontend on port 8080), you can use the following environment variables:

- **`N8N_BASE_URL`**: Backend server URL (also used as frontend URL if `N8N_EDITOR_URL` is not set)
- **`N8N_EDITOR_URL`**: Frontend server URL (when set, overrides frontend URL while backend uses `N8N_BASE_URL`)

**How it works:**
- **Backend URL** (for API calls): Always uses `N8N_BASE_URL`
- **Frontend URL** (for browser navigation): Uses `N8N_EDITOR_URL` if set, otherwise falls back to `N8N_BASE_URL`

This allows you to:
- Test against a backend on port 5680 while the frontend dev server runs on port 8080
- Use different URLs for API calls vs browser navigation
- Maintain backward compatibility with single-URL setups

## Test Commands

```bash
# By Mode
pnpm test:container:sqlite      # SQLite (default)
pnpm test:container:postgres    # PostgreSQL
pnpm test:container:queue       # Queue mode
pnpm test:container:multi-main  # HA setup

pnpm test:performance						# Runs the performance tests against a SQLite container


# Development
pnpm test:all --grep "workflow"           # Pattern match, can run across all test types E2E/cli-workflow/performance
pnpm test:local --ui            # To enable UI debugging and test running mode

# Isolated local run: random port, throwaway DB, includes container-tagged tests
pnpm test:local:isolated tests/e2e/credentials/crud.spec.ts
```

### `test:local:isolated` — local run with full isolation

`pnpm test:local:isolated` is a generalized version of `test:local` for
situations where `test:local`'s defaults aren't enough:

- **Random free OS port** for n8n's HTTP server and the task-runner broker, so
  multiple instances can run in parallel without colliding on `5678`/`5679`.
  Pin a port with `N8N_BASE_URL=http://localhost:5680 …` when you need a
  stable URL for browser inspection.
- **Throwaway `N8N_USER_FOLDER`** under the OS temp dir (cleaned up on exit).
  n8n creates `.n8n/` (sqlite DB, encryption key) inside it, fully isolated
  from your local `~/.n8n` install.
- **Container-tagged tests included.** The local project selects `@licensed`,
  `@db:reset`, and `@mode:*` tests. Service-backed tests still skip because
  local mode does not provide the service container helpers.
- **Self-managed n8n.** Boots n8n with a readiness check against
  `/rest/e2e/reset`, so the run waits for the E2E controller itself, and skips
  Playwright's own webServer.

Pass extra n8n env via `N8N_TEST_ENV` (the same convention `test:local` uses):

```bash
N8N_TEST_ENV='{"N8N_ENABLED_MODULES":"my-module"}' \
  pnpm test:local:isolated tests/e2e/my-module
```

The two underlying env-var levers — usable independently of the script:

| Env var | Effect |
|---------|--------|
| `PLAYWRIGHT_ALLOW_CONTAINER_ONLY=true` | Includes `@mode:*`, `@licensed`, and `@db:reset` tests in local runs. Service-backed tests still skip. |
| `PLAYWRIGHT_SKIP_WEBSERVER=true` | Stops Playwright from launching its own n8n via the `webServer` config. Use when a wrapper script (like `scripts/run-local-isolated.mjs`) already manages n8n with custom env vars. |

## Test Tags
```typescript
test('basic test', ...)                              // All modes, fully parallel
test('postgres only @mode:postgres', ...)            // Mode-specific
test('chaos test @mode:multi-main @chaostest', ...) // Isolated per worker
test('cloud resource test @cloud:trial', ...)       // Cloud resource constraints
test('enterprise feature @licensed', ...)           // Requires enterprise license (container-only)
```

### Tag Reference

| Tag | Description | When to Use |
|-----|-------------|-------------|
| `@mode:X` | Infrastructure mode (postgres, queue, multi-main) | Tests requiring specific DB or architecture |
| `@licensed` | Enterprise license features | Tests for features behind license flags at startup |
| `@cloud:X` | Resource constraints (trial, enterprise) | Performance tests with memory/CPU limits |
| `@chaostest` | Chaos engineering tests | Tests that intentionally break things |
| `@auth:X` | Authentication role (owner, admin, member, none) | Tests requiring specific user role |
| `@db:reset` | Reset database before each test (container-only) | Tests that need fresh DB state per test (e.g., MFA tests) |
| `@engine:v2` | Must pass on engine v2 as well | Runs under the `engine-v2:e2e` project (see below) |
| `@engine:v1-only` | Engine v2 will never support this | Skipped under `engine-v2:e2e`; tracking only |
| `@engine:v2-pending` | Engine v2 will support this, but not yet | Expected to fail under `engine-v2:e2e`; an unexpected pass tells you to promote it to `@engine:v2` |

### Engine v2 parity

The `engine-v2:e2e` project runs the regular `tests/e2e` specs against a stack
that runs engine v2 in its own container (`containerConfig.engine:
'container'`, Postgres, single main). The main runs the `engine-v2` module in
remote mode and dials the engine over the stack network. The engine container
runs `n8n engine`, has no `DB_*` env and no encryption key, resolves
credentials through the main's control plane server, and keeps its own
`n8n_engine` database on the dedicated `engine-postgres` service. Execution
responses travel back to the main over the stack's Redis. Under that stack
every workflow the API helpers create gets `settings.engineType = 'v2'`, so a
spec proves parity without changes.

`@db:reset` clears the control plane only, so data plane execution rows live
on inside a worker. The engine database is emptied once, when the worker takes
its container.

A workflow built in the UI does not get the setting, and a workflow without it
runs on the legacy engine. A tagged spec must therefore create its workflow
through `api.workflows` and run it through `api.workflows.runManually`, which
fails the test when the run did not reach engine v2. A spec that starts the
run from the UI instead calls `api.workflows.assertLatestExecutionRoutedToEngine`
after the run, which checks the same thing. A tag the parity buckets do not
know also fails the test, and names the three valid tags.

The project only picks up specs with an `@engine:*` tag for now. Tag a spec
`@engine:v2` once it passes on both engines; use the other two tags to track
specs that engine v2 does not run yet:

```bash
pnpm --filter=n8n-playwright test:container:engine-v2:e2e tests/e2e/api/manual-run-outcome.spec.ts
```

For a local stack with the engine: `pnpm --filter n8n-containers stack --engine`.

### Worker Isolation (Fresh Database)

Tests that need their own isolated database should use `test.use()` with a unique capability config. This gives the test file its own container with a fresh database:

```typescript
// my-isolated-tests.spec.ts
import { test, expect } from '../fixtures/base';

// Unique value breaks worker cache → fresh container with clean DB
test.use({ capability: { env: { TEST_ISOLATION: 'my-test-name' } } });

test.describe('My isolated tests', () => {
  test.describe.configure({ mode: 'serial' }); // If tests depend on each other's data

  test('test with clean state', async ({ n8n }) => {
    // Fresh container with reset database
  });
});
```

**How it works:** The `capability` option is scoped to the worker level. When you pass a unique value via `test.use()`, Playwright creates a new worker with a fresh container. Each container starts with a clean database automatically.

### Per-Test Database Reset (@db:reset)

If tests within the same file need a fresh database before **each test** (not just the file), add `@db:reset` to the describe block. **Note:** This tag is container-only - tests with `@db:reset` won't run in local mode.

```typescript
// my-stateful-tests.spec.ts
import { test, expect } from '../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'my-stateful-tests' } } });

test.describe('My stateful tests @db:reset', () => {
  test('test 1', async ({ n8n }) => {
    // Fresh database (reset before this test)
  });

  test('test 2', async ({ n8n }) => {
    // Fresh database again (reset before this test too)
  });
});
```

**When to use `@db:reset`:** When tests modify shared state that would break subsequent tests (e.g., enabling MFA, creating users, changing settings). Since resetting the database would affect all parallel tests in local mode, these tests are excluded from local runs and only execute in container mode where each worker has its own isolated database.

### Enterprise Features (@licensed)
Use the `@licensed` tag for tests that require enterprise features which are **only available when the license is present at startup**. This differs from features that can be enabled/disabled at runtime.

**When to use:**
- Features behind `@BackendModule({ licenseFlag: LICENSE_FEATURES.X })` decorators
- API endpoints that only exist when the module loads with a valid license
- Features like log streaming, SSO, LDAP where routes aren't registered without license

**Example:**
```typescript
// The @licensed tag ensures this only runs in container mode with a valid license
test.describe('Log Streaming @licensed', () => {
  test.beforeEach(async ({ n8n }) => {
    // enableFeature() works for runtime checks, but module must be loaded first
    await n8n.api.enableFeature('logStreaming');
  });

  test('should show licensed view', async ({ n8n }) => {
    await n8n.navigate.toLogStreaming();
    // ...
  });
});
```

> **Note:** `@licensed` tests are skipped in local mode (`test:local`) and only run in container mode where a license is available.

**Enterprise license for testing:**
To run `@licensed` tests or manually test enterprise features, set `N8N_LICENSE_TENANT_ID` and `N8N_LICENSE_ACTIVATION_KEY` in your environment. The containers package reads these variables automatically. Ask in Slack for the sandbox license key.

## Fixture Selection
- **`base.ts`**: Standard testing with worker-scoped containers (default choice)
- **`cloud-only.ts`**: Cloud resource testing with guaranteed isolation
  - Use for performance testing under resource constraints
  - Requires `@cloud:*` tags (`@cloud:trial`, `@cloud:enterprise`, etc.)
  - Creates only cloud containers, no worker containers

```typescript
// Standard testing
import { test, expect } from '../fixtures/base';

// Cloud resource testing
import { test, expect } from '../fixtures/cloud-only';
test('Performance under constraints @cloud:trial', async ({ n8n, api }) => {
  // Test runs with 384MB RAM, 250 millicore CPU
});
```

## Tips
- `test:*` commands use fresh containers (for testing)
- VS Code: Set `N8N_BASE_URL` in Playwright settings to run tests directly from VS Code
- Pass custom env vars via `N8N_TEST_ENV='{"KEY":"value"}'`

## Project Layout
- **composables**: Multi-page interactions (e.g., `WorkflowComposer.executeWorkflowAndWaitForNotification()`)
- **config**: Test setup and configuration (constants, test users, etc.)
- **fixtures**: Custom test fixtures extending Playwright's base test
  - `base.ts`: Standard fixtures with worker-scoped containers
  - `cloud-only.ts`: Cloud resource testing with test-scoped containers only
- **pages**: Page Object Models for UI interactions
- **services**: API helpers for E2E controller, REST calls, workflow management, etc.
- **utils**: Utility functions (string manipulation, helpers, etc.)
- **workflows**: Test workflow JSON files for import/reuse

## Writing Tests with Proxy

You can use ProxyServer to mock API requests.

```typescript
import { test, expect } from '../fixtures/base';

test.use({ capability: 'proxy' });

test.describe('Proxy tests', () => {
  test('should mock HTTP requests', async ({ services, n8n }) => {
    // Create mock expectations
    await services.proxy.createGetExpectation('/api/data', { result: 'mocked' });

    // Execute workflow that makes HTTP requests
    await n8n.canvas.openNewWorkflow();
    // ... test implementation

    // Verify requests were proxied
    expect(await services.proxy.wasRequestMade({ method: 'GET', path: '/api/data' })).toBe(true);
  });
});
```

### Recording and replaying requests

The ProxyServer service supports recording HTTP requests for test mocking and replay. All proxied requests are automatically recorded by the mock server as described in the [Mock Server documentation](https://www.mock-server.com/proxy/record_and_replay.html).

#### Recording Expectations

```typescript
// Record all requests (the request is simplified/cleansed to method/path/body/query)
await services.proxy.recordExpectations('test-folder');

// Record with filtering and options
await services.proxy.recordExpectations('test-folder', {
  host: 'googleapis.com',           // Filter by host (partial match)
  dedupe: true,                     // Remove duplicate requests
  raw: false                        // Save cleaned requests (default)
});

// Record raw requests with all headers and metadata
await services.proxy.recordExpectations('test-folder', {
  raw: true                         // Save complete original requests
});

// Record requests matching specific criteria
await services.proxy.recordExpectations('test-folder', {
  pathOrRequestDefinition: {
    method: 'POST',
    path: '/api/workflows'
  }
});
```

#### Loading and Using Recorded Expectations

Recorded expectations are saved as JSON files in the `expectations/` directory. To use them in tests, you must explicitly load them:

```typescript
test('should use recorded expectations', async ({ services }) => {
  // Load expectations from a specific folder
  await services.proxy.loadExpectations('test-folder');

  // Your test code here - requests will be mocked using loaded expectations
});
```

#### Important: Cleanup Expectations

**Remember to clean up expectations before or after test runs:**

```typescript
test.beforeEach(async ({ services }) => {
  // Clear any existing expectations before test
  await services.proxy.clearAllExpectations();
});

test.afterEach(async ({ services }) => {
  // Or clear expectations after test
  await services.proxy.clearAllExpectations();
});
```

This prevents expectations from one test affecting others and ensures test isolation.

## Debugging

### Keepalive Mode

Use `N8N_CONTAINERS_KEEPALIVE=true` to keep containers running after tests complete. Useful for:
- Inspecting n8n instance state after a failure
- Exploring configured integrations (email, OIDC, source control)
- Manual testing against a pre-configured environment

```bash
N8N_CONTAINERS_KEEPALIVE=true pnpm test:container:sqlite tests/e2e/auth/password-reset.spec.ts --workers 1
```

After tests complete, connection details are printed:
```
=== KEEPALIVE: Containers left running for debugging ===
    URL: http://localhost:54321
    Project: n8n-stack-abc123
    Cleanup: pnpm --filter n8n-containers stack:clean:all
=========================================================
```

Clean up when done: `pnpm --filter n8n-containers stack:clean:all`

### Victoria Export on Failure

When tests fail with observability enabled, logs and metrics are automatically exported as Currents attachments:

| Attachment | Description |
|------------|-------------|
| `container-logs` | Human-readable logs grouped by container |
| `victoria-logs-export.jsonl` | Raw logs in JSON Lines format |
| `victoria-metrics-export.jsonl` | All metrics in JSON Lines format |

#### Importing into a local Victoria instance

1. Download the `.jsonl` attachments from Currents
2. Import into running Victoria containers (e.g., from keepalive mode):

```bash
node scripts/import-victoria-data.mjs victoria-metrics-export.jsonl victoria-logs-export.jsonl
```

Or start standalone containers first with `--start`:

```bash
node scripts/import-victoria-data.mjs --start victoria-metrics-export.jsonl victoria-logs-export.jsonl
```

3. Query locally:
   - **Metrics UI:** http://localhost:8428/vmui/
   - **Logs UI:** http://localhost:9428/select/vmui/

## Check test architecture

Use [Janitor](../janitor/README.md) to check rules, inspect test impact, and find duplicate code. It tracks existing violations in `.janitor-baseline.json`.

## Write a test

Use the [test-writing patterns](docs/TESTING_PATTERNS.md) for isolated state, users, and feature overrides. See [CONTRIBUTING.md](CONTRIBUTING.md) for package conventions.
