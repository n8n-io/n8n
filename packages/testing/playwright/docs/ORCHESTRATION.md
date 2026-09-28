# Custom Test Orchestration

Fixture-pool-aware test distribution across CI shards.

## How It Works

| Step | What Happens |
|------|--------------|
| 1. Discovery | `pnpm janitor discover` (AST-based, detects `test.fixme()`/`test.skip()` automatically) |
| 2. Metrics | Get `avgDuration` per spec from Currents (last 7 days) |
| 3. Default | Missing specs get **60s** default (accounts for container startup) |
| 4. Group | Group specs by their resolved Playwright worker fixture pools |
| 5. Count | Count the fixture pools that start on each shard |
| 6. Split | Split a fixture-pool group when it exceeds **5 min** |
| 7. Limit | Aim for **5 min** of tests on each shard |
| 8. Bin Pack | Assign the heaviest items to the lightest shard |

### Why Group by Fixture Pool?

Playwright starts a worker for each worker fixture pool on a shard. Specs with
the same worker configuration can reuse that worker. Capability tags do not
define these groups. They select filters, reports, and Docker image pre-pulls.

### Why the Shard Count Has a Limit

Each shard pays about 3.4 minutes of fixed setup: checkout, Setup Environment,
browser install, and image load. This cost does not change with the size of the
workload. An impact-scoped PR selects only a few specs. Without a limit, the
packer distributes those few minutes of tests over many runners, and each runner
pays the full setup cost.

`targetShardDuration` (5 minutes) limits the bucket count to
`ceil(totalTestTime / targetShardDuration)`. The packer creates only the shards
it can fill. `minShardSpecs` applies a second limit to the same count. Set it to
`1` to disable it.

The name says target, not minimum, because `ceil` divides the work evenly over
the shards that remain. A 12-minute selection gets 3 shards of 4 minutes, not 2
shards of 6 minutes. `floor` would enforce a true minimum, but it would also add
about 2 minutes of wall-clock time to keep one more runner idle.

The shard count never drops below the number of fixture-pool packing items.
This prevents one runner from starting multiple fixture groups.

The packer applies the limits before it fills the buckets. Bin-packing still
balances the shards. This is not a merge step after the packer runs.

The full suite has about 196 minutes of test time. It uses all 20 available shards.

Configure both values under `orchestration` in `janitor.config.mjs`.

### Self-Balancing

Metrics auto-correct over time. As grouped tests run, they report actual execution time (not startup overhead), so future distributions become more accurate.

## Writing Tests with Capabilities

### Use the capability option

```typescript
test.use({ capability: 'proxy' });

test.use({
  capability: {
	services: ['proxy'],
	env: { MY_VAR: 'value' },
  },
});
```

### Available Capabilities

| Capability | Containers |
|------------|------------|
| `'proxy'` | Proxy server |
| `'email'` | Mailpit |
| `'source-control'` | Git server |
| `'oidc'` | OIDC provider |
| `'observability'` | VictoriaLogs + VictoriaMetrics + Vector |
| `'kafka'` | Kafka |
| `'external-secrets'` | LocalStack |
| `'kent'` | Sentry mock server |
| `'dynamic-credentials'` | Keycloak + dynamic credentials config |

## Modes vs Capabilities

**Capabilities** are add-on features you can combine with any infrastructure:
- Use `test.use({ capability: 'proxy' })` to configure the worker
- Add-on containers start alongside n8n

**Modes** (`@mode:X`) define the infrastructure configuration itself:
- `@mode:postgres` - n8n with PostgreSQL database (vs default sqlite)
- `@mode:queue` - n8n with EXECUTIONS_MODE=queue (workers via Bull, rarely used as tag)
- `@mode:multi-main` - n8n HA setup with leader election (implies queue mode)

Most e2e tests run against ALL modes via projects (`sqlite:e2e`, `postgres:e2e`, etc).
Use `@mode:X` only for tests that ONLY work with a specific infrastructure.

```typescript
// Capability - add-on feature
test.use({ capability: 'proxy' });
test('API mocking', ...);

// Mode - infrastructure requirement (no test.use needed, project handles it)
test('Postgres-specific test @mode:postgres', ...);

// Combined - capability ON a specific mode
test.use({ capability: 'observability' });
test('Multi-main logs @mode:multi-main', ...);
```

Service-backed capability tests and `@mode:X` tests skip local mode by default.

## Temporarily Disabling Tests

Use `test.fixme()` to mark tests that need fixing. The janitor's `discover` command detects `test.fixme()` and `test.skip()` calls via AST analysis and automatically excludes them from CI distribution.

```typescript
// Individual test
test.fixme('broken test', async ({ n8n }) => {
  // Excluded from CI distribution automatically
});

// Entire describe block
test.describe('Feature', () => {
  test.fixme(); // Marks all tests in this block

  test('test 1', async ({ n8n }) => { ... });
  test('test 2', async ({ n8n }) => { ... });
});
```

## Attempt-Aware Retry Filtering

When a shard fails in CI and the user clicks **Re-run failed jobs**, GitHub re-runs the full shard manifest. `janitor filter-shard` shrinks that to just the specs that failed in the previous attempt.

```bash
echo "$MATRIX_SPECS" | janitor filter-shard
```

- Reads candidate spec paths from stdin (newline- or space-separated)
- On `GITHUB_RUN_ATTEMPT == 1`: passes candidates through unchanged
- On `GITHUB_RUN_ATTEMPT > 1`: POSTs `{ runId, previousAttempt, candidates }` to the coordinator webhook (default `https://internal.users.n8n.cloud/webhook/failed-specs`, override with `--url=<...>` or `JANITOR_FILTER_SHARD_URL`), prints the intersection
- **Fails open** on any error (timeout, non-2xx, parse error, fallback response) — emits the original candidate list so a coordinator outage never breaks CI
- Wired into `test-e2e-reusable.yml` between "Pre-pull Test Container Images" and "Run Tests"; the coordinator (an n8n workflow) holds the Currents API key server-side, so fork PRs get the same benefit without exposing secrets

## Refreshing Metrics

```bash
CURRENTS_API_KEY=<key> node packages/testing/playwright/scripts/fetch-currents-metrics.mjs --project=nHHLA5
```

This fetches the last 7 days of test durations from Currents, aggregates by spec, and writes to `.github/test-metrics/playwright.json`. The PR-CI project is `nHHLA5` (n8n-ci); the legacy `LRxcNt` project still backs the nightly e2e workflows.

**When to refresh:**
- Weekly (recommended)
- After significant test changes
- When adding new specs (optional - they get 60s default)

Stale metrics do not cause an obvious failure. The packer still reports balanced
shards, because it balances against the durations in the file. The real spread is
what changes. A 3-month-stale file predicted a uniform 9.7 minutes for each
shard. Against refreshed durations, the same shards took 8.6 to 18.5 minutes.

**How to read the reported numbers:** Currents `avgDuration` is about 1.5 times
the test time that a shard uses in CI. Use `Total test time` and
`Expected wall-clock` to compare the shards with each other. Do not use them as
absolute predictions. `targetShardDuration` uses these same units.

## Architecture

```
janitor orchestrate (generic)          distribute-tests.mjs (n8n CI adapter)
┌──────────────────────────┐          ┌──────────────────────────┐
│ AST discovery            │          │ Calls janitor orchestrate│
│ Metrics loading          │   JSON   │ Maps capabilities →      │
│ Fixture-pool grouping    │ ──────→  │   Docker images          │
│ Group splitting          │          │ Adds container overhead  │
│ Greedy bin-packing       │          │ Outputs GH Actions matrix│
└──────────────────────────┘          └──────────────────────────┘
```

The janitor handles generic orchestration. `distribute-tests.mjs` asks Playwright to resolve
each spec's worker fixture pool. It passes those generated groups to the janitor. It uses
capabilities only to select the Docker images for each shard.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/distribute-tests.mjs` | CI adapter — calls janitor, maps images, outputs matrix |
| `scripts/fetch-currents-metrics.mjs` | Fetches metrics from Currents API |

### Testing Locally

```bash
# Janitor orchestration (generic output)
pnpm janitor orchestrate --shards=14

# CI adapter (n8n-specific output with Docker images)
node scripts/distribute-tests.mjs --matrix 14 --orchestrate

# Get specs for shard 0
node scripts/distribute-tests.mjs 14 0
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Specs not running | Check path matches janitor test patterns in `janitor.config.mjs` |
| Unbalanced shards | Refresh metrics - durations may have drifted |
| Worker not reused | Reuse the same capability constant for equivalent worker configurations |
