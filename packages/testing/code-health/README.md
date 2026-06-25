# @n8n/code-health

Static analysis for monorepo dependency hygiene. Built on `@n8n/rules-engine`.

## What it does

Scans all `package.json` files across the monorepo and flags:

- **Hardcoded catalog deps** — dependencies using a pinned version when `pnpm-workspace.yaml` already defines a catalog entry
- **Cross-package version drift** — the same dependency appearing in multiple packages with different versions

## Usage

```bash
# Build first
pnpm --filter=@n8n/code-health build

# Run analysis (uses baseline if present)
node packages/testing/code-health/dist/cli.js

# Show all violations (ignore baseline)
node packages/testing/code-health/dist/cli.js --ignore-baseline

# Run a specific rule
node packages/testing/code-health/dist/cli.js --rule=catalog-violations

# List available rules
node packages/testing/code-health/dist/cli.js rules
```

## Baseline

The baseline (`.code-health-baseline.json` at repo root) snapshots current violations so only **new** violations fail the check.

```bash
# Generate/update baseline
node packages/testing/code-health/dist/cli.js baseline

# Commit it
git add .code-health-baseline.json
git commit -m "chore: update code-health baseline"
```

## Output

All output is JSON. Exit code 1 if new violations are found, 0 if clean.

```json
{
  "summary": {
    "totalViolations": 3,
    "byRule": { "catalog-violations": 3 },
    "bySeverity": { "error": 3, "warning": 0, "info": 0 }
  }
}
```

## Adding rules

Rules extend `BaseRule<CodeHealthContext>` from `@n8n/rules-engine`. See `src/rules/catalog-violations.rule.ts` for the pattern. Register new rules in `src/index.ts`.
