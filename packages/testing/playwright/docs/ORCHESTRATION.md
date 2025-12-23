# Custom Test Orchestration

Duration-based test distribution across CI shards, using committed metrics for deterministic runs.

## Overview

Instead of Playwright's built-in sharding (which distributes by file count), this approach distributes specs by **estimated duration** using a greedy bin-packing algorithm. This results in more balanced shard execution times.

**Key properties:**
- **Deterministic** - Same commit always produces same distribution
- **Re-run safe** - Failed jobs re-run the same specs (no full suite re-run)
- **Community PR friendly** - No secrets needed at runtime
- **Source agnostic** - Metrics can come from any test analytics provider

## Scripts

Located in `packages/testing/playwright/scripts/`:

| Script | Purpose |
|--------|---------|
| `distribute-tests.mjs` | Assigns specs to shards using bin-packing |
| `fetch-currents-metrics.mjs` | Fetches duration data from Currents API |

## Metrics File

Committed at `.github/test-metrics/playwright.json`

### Schema

```json
{
  "updatedAt": "2025-01-15T00:00:00.000Z",
  "source": "currents | playwright | manual | <provider>",
  "specs": {
    "tests/e2e/path/to/spec.ts": {
      "avgDuration": 45000,
      "testCount": 5,
      "flakyRate": 0.02
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `updatedAt` | ISO 8601 | When metrics were last refreshed |
| `source` | string | Where metrics originated |
| `specs` | object | Map of spec path to metrics |
| `specs[path].avgDuration` | number | Average duration in milliseconds |
| `specs[path].testCount` | number | Number of tests in spec |
| `specs[path].flakyRate` | number | Flakiness rate (0-1) |

Only `avgDuration` is required for distribution. Other fields are informational.

## CI Usage

### Enabling Custom Orchestration

In the workflow call to `playwright-test-reusable.yml`:

```yaml
jobs:
  e2e-tests:
    uses: ./.github/workflows/playwright-test-reusable.yml
    with:
      test-command: pnpm --filter=n8n-playwright test:local
      shards: 8
      use-custom-orchestration: true  # Enable duration-based distribution
    secrets: inherit
```

### How It Works

When `use-custom-orchestration: true`:

```bash
# Each shard runs:
SPECS=$(node packages/testing/playwright/scripts/distribute-tests.mjs $TOTAL_SHARDS $SHARD_INDEX)
pnpm test:local --workers=2 $SPECS
```

The distribute script:
1. Reads committed metrics from `.github/test-metrics/playwright.json`
2. Sorts specs by duration (descending)
3. Assigns each spec to the lightest shard (greedy bin-packing)
4. Outputs space-separated spec paths for the requested shard

### Distribution Algorithm

```
Input: specs sorted by duration [100s, 80s, 60s, 40s, 30s, 20s]
Shards: 3

Step 1: 100s → Shard 0 (lightest)  → [100, 0, 0]
Step 2: 80s  → Shard 1 (lightest)  → [100, 80, 0]
Step 3: 60s  → Shard 2 (lightest)  → [100, 80, 60]
Step 4: 40s  → Shard 2 (lightest)  → [100, 80, 100]
Step 5: 30s  → Shard 1 (lightest)  → [100, 110, 100]
Step 6: 20s  → Shard 0 (lightest)  → [120, 110, 100]

Result: Balanced ~110s per shard instead of uneven distribution
```

## Refreshing Metrics

### Using Currents API

```bash
CURRENTS_API_KEY=<key> node packages/testing/playwright/scripts/fetch-currents-metrics.mjs --project=<id>
```

The script:
1. Fetches test durations from Currents API (last 30 days)
2. Aggregates by spec file
3. Validates against `pnpm playwright test --list --project="standard:e2e"`
4. Reports drift (stale specs removed, new specs added with 30s default)
5. Writes to `.github/test-metrics/playwright.json`

### Using Other Sources

Create a script that outputs the same JSON schema. The distribution only requires:

```json
{
  "specs": {
    "tests/e2e/example.spec.ts": { "avgDuration": 45000 }
  }
}
```

### When to Refresh

- When new spec files are added (they get 30s default until refreshed)
- When specs are deleted/renamed (stale entries are filtered out)
- Periodically to capture duration changes (weekly recommended)

## Maintenance

### Detecting Drift

Run the fetch script - it reports mismatches:

```
Stale specs (in metrics but not Playwright):
  - tests/e2e/deleted/old.spec.ts

New specs (in Playwright but not metrics, using 30s default):
  - tests/e2e/new/feature.spec.ts
```

### Manual Metrics Entry

For new specs before CI data exists:

```json
{
  "specs": {
    "tests/e2e/new/feature.spec.ts": {
      "avgDuration": 45000,
      "testCount": 3,
      "flakyRate": 0
    }
  }
}
```

Estimate duration based on similar specs, or use 30000 (30s) as default.

## Troubleshooting

### Specs not running

Check that the spec path in `playwright.json` matches exactly what Playwright outputs:
```bash
pnpm --filter=n8n-playwright playwright test --list --project="standard:e2e"
```

### Unbalanced shards

Refresh metrics - durations may have changed significantly since last update.

### Script errors

```bash
# Test distribution locally
node packages/testing/playwright/scripts/distribute-tests.mjs 8 0

# Validate metrics file
cat .github/test-metrics/playwright.json | jq '.specs | length'
```
