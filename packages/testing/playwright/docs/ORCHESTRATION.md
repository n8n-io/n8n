# Custom Test Orchestration

Capability-aware test distribution across CI shards.

## How It Works

| Step | What Happens |
|------|--------------|
| 1. Discovery | `pnpm playwright test --list --project="multi-main:e2e"` |
| 2. Metrics | Get `avgDuration` per spec from Currents (last 30 days) |
| 3. Default | Missing specs get **60s** default (accounts for container startup) |
| 4. Group | Group specs by `@capability:xxx` tag for worker reuse |
| 5. Effective Duration | Calculate actual time accounting for container reuse within groups |
| 6. Split | If a group exceeds **5 min**, split into sub-groups |
| 7. Bin Pack | Greedy assign groups + standard specs to lightest shard |

### Why Group by Capability?

Tests requiring containers (proxy, email, etc.) include ~20s startup overhead. When grouped on the same shard, only the first test pays this cost - the rest reuse the worker.

**Example:** 15 proxy tests across 8 shards = 8 container starts (160s). Grouped on 2 shards = 2 starts (40s). **Saves 120s.**

### Self-Balancing

Metrics auto-correct over time. As grouped tests run, they report actual execution time (not startup overhead), so future distributions become more accurate.

## Writing Tests with Capabilities

### 1. Import shared capabilities (required for worker reuse)

```typescript
// fixtures/capabilities.ts has shared objects
import { capabilities } from '../../../fixtures/capabilities';

// CORRECT - same object reference enables worker reuse
test.use({ addContainerCapability: capabilities.proxy });

// WRONG - inline object breaks worker reuse
test.use({ addContainerCapability: { proxyServerEnabled: true } });
```

### 2. Add @capability tag (required for orchestration grouping)

```typescript
test('My feature @capability:proxy', async ({ page }) => {
  // This test will be grouped with other proxy tests
});

// Or at describe level:
test.describe('Feature @capability:email', () => {
  // All tests inherit the tag
});
```

### Available Capabilities

| Import | Tag | Container |
|--------|-----|-----------|
| `capabilities.proxy` | `@capability:proxy` | Proxy server |
| `capabilities.email` | `@capability:email` | Mailpit |
| `capabilities.sourceControl` | `@capability:source-control` | Git server |
| `capabilities.taskRunner` | `@capability:task-runner` | Task runner |
| `capabilities.oidc` | `@capability:oidc` | OIDC provider |
| `capabilities.observability` | `@capability:observability` | VictoriaLogs |

## Refreshing Metrics

```bash
CURRENTS_API_KEY=<key> node packages/testing/playwright/scripts/fetch-currents-metrics.mjs --project=<id>
```

This fetches the last 30 days of test durations from Currents, aggregates by spec, and writes to `.github/test-metrics/playwright.json`.

**When to refresh:**
- Weekly (recommended)
- After significant test changes
- When adding new specs (optional - they get 60s default)

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/distribute-tests.mjs` | Distributes specs across shards |
| `scripts/fetch-currents-metrics.mjs` | Fetches metrics from Currents API |

### Testing Locally

```bash
# See distribution for 14 shards
node scripts/distribute-tests.mjs --matrix 14 --orchestrate

# Get specs for shard 0
node scripts/distribute-tests.mjs 14 0
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Specs not running | Check path matches `playwright test --list` output |
| Unbalanced shards | Refresh metrics - durations may have drifted |
| Worker not reused | Use imported `capabilities.xxx`, not inline objects |
