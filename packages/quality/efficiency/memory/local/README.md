# Local memory profiling

Experimental. Record how one local n8n process uses memory while you click around or run tests.
No Docker or observability stack is required.

## Quickstart

### 1. Start n8n with the memory endpoints

Build if needed, then start n8n:

```bash
pnpm build > build.log 2>&1
pnpm memory:start
```

This starts n8n on `http://localhost:5678` with your normal data in `~/.n8n`.
It enables the test-only memory endpoints (`E2E_TESTS=true`) and lets the tool request garbage collection (`--expose-gc`).
Press Ctrl+C to stop it.

E2E mode skips `.env` loading and fakes license features.
It also exposes a test-only route that resets the database. Only the Playwright setup in step 2 calls it.

### 2. Record memory

**Option A: click around manually.**

```bash
pnpm memory run --url http://localhost:5678 --gc
```

1. Use n8n in the browser.
2. After each action finishes, type a checkpoint name, such as `after-10-executions`.
3. Type `quit` to save the run.

**Option B: run Playwright tests.**

The tests need the E2E test users, and creating them deletes all instance data.
Start a separate instance for tests:

```bash
N8N_USER_FOLDER=~/.n8n-memory-tests pnpm memory:start
```

Then create the test users once:

```bash
pnpm --filter n8n-playwright exec playwright install chromium

N8N_BASE_URL=http://localhost:5678 PLAYWRIGHT_SKIP_WEBSERVER=true RESET_E2E_DB=true \
  pnpm --filter n8n-playwright exec playwright test --project=e2e \
  tests/e2e/credentials/crud.spec.ts --workers=1
```

To sign in manually afterward, use the owner in
`packages/quality/testing/playwright/config/test-users.ts`.

Then record the tests you care about:

```bash
pnpm memory run --url http://localhost:5678 --gc -- \
  pnpm --filter n8n-playwright exec playwright test --project=e2e \
  tests/e2e/credentials/crud.spec.ts --workers=1 --repeat-each=3
```

The tool runs the command after `--` and passes it `N8N_BASE_URL`.
It disables Playwright's server startup and database reset, so the tests use your running instance.
It stops the tests if recording fails or you press Ctrl+C.

### 3. View the results

```bash
pnpm memory report
```

This opens the latest run. To view an older run, pass its directory: `pnpm memory report .memory-runs/run-AbC123`.

The report prints heap, RSS, and external memory at each checkpoint.
It also writes `report.json` and `memory.svg` (a timeline chart) to the run directory.
Open `memory.svg` in a browser.

**What to look for:** memory that rises during work and falls afterward is normal.
Settled memory that rises after each equal batch of work needs investigation.
See [Understand the results](docs/understand-results.md).

## Find what retains memory

Use a separate snapshot run. Snapshots pause n8n and change its memory use.

```bash
pnpm memory run --url http://localhost:5678 --snapshots
```

1. Warm up the action first. The tool takes a baseline snapshot when it starts.
2. Repeat the action you suspect, and let it finish.
3. Type `quit` to take the final snapshot.
4. Run `pnpm memory report`.

The report lists the fastest-growing object types between the first and last snapshot:

```text
Fastest-growing object types (first → last snapshot):
│ object                 │ added │ size    │
│ ExecutionContext       │ 1200  │ '18MB'  │
```

Object types that grow by about the same count as your repeated action are the likely leak.
To see what keeps them alive, load both `.heapsnapshot` files into the Chrome DevTools Memory panel.
Select the final snapshot, choose the Comparison view, select one of those objects, and read its Retainers.

## Options

| Option | Default | Purpose |
| --- | --- | --- |
| `--url` | Required | The n8n instance URL |
| `--gc` | Off | Request garbage collection before each checkpoint |
| `--snapshots` | Off | Capture a heap snapshot at each checkpoint instead of sampling |
| `--interval` | `2` seconds | Sampling interval |
| `--output` | `.memory-runs` | Parent directory for runs |
| `--timeout` | `10` seconds | Timeout for each request to n8n |

## Limits

- Records only the process at `--url`. It excludes the browser, task runners, and workers.
- Never starts, resets, or stops n8n.
- Command mode (`-- <command>`) requires macOS or Linux.
- A completed run is evidence, not a verdict that no leak exists.

## Development

```bash
pnpm --filter @n8n/memory test
pnpm --filter @n8n/memory lint
pnpm --filter @n8n/memory typecheck
```
