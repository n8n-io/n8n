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

Rule output is JSON (the single-instance subcommands below print plain text). Exit code 1 if new
violations are found, 0 if clean.

```json
{
  "summary": {
    "totalViolations": 3,
    "byRule": { "catalog-violations": 3 },
    "bySeverity": { "error": 3, "warning": 0, "info": 0 }
  }
}
```

## Single-instance dependency checks

Separate subcommands (not rules) verify that the curated single-instance libraries in
`src/single-instance/libs.ts` resolve to exactly one physical copy — a second copy breaks
`instanceof`, module singletons and cross-package schema composition at runtime.

```bash
# Verify an already-installed closure (e.g. a pruned production tree)
pnpm --dir packages/testing/code-health exec tsx src/cli.ts verify-closure <dir>

# Reproduce the `npm install` graph of published tarballs and verify that
pnpm --dir packages/testing/code-health exec tsx src/cli.ts verify-npm-install <pkgName>...

# Scopes CI uses: packages changed since a ref, or every publishable package.
# `--report-only` downgrades a finding to a warning and exits 0 (what CI passes today, while the
# curated-lib backlog is worked down).
pnpm --dir packages/testing/code-health exec tsx src/cli.ts verify-npm-install --changed=origin/master
pnpm --dir packages/testing/code-health exec tsx src/cli.ts verify-npm-install --all --report-only
```

`verify-npm-install` packs each target with `pnpm pack` and installs it with npm, because root
`pnpm.overrides` — which hide duplication locally and in `pnpm deploy` — do not travel in a
published tarball.

On a finding it prints every physical copy with the package that pulled it in, then the fix options
that apply to those requirers: move the library to `peerDependencies` (`catalog:`) in one of our
packages, align a version in a package the peer rule exempts, bump/replace the third-party package
pinning an incompatible range, or, as a last resort, add a documented `EXPECTED_DUPLICATES` entry in
`src/single-instance/collect-copies.ts`. In CI the same findings also go to the job summary, so a
finding is visible without opening the log.

A blocking run keeps its scratch install so you can walk the full requirer chain with `npm ls`; a
`--report-only` run deletes it (it is a complete `node_modules`), so re-run the same targets locally
when you need that chain.

## Adding rules

Rules extend `BaseRule<CodeHealthContext>` from `@n8n/rules-engine`. See `src/rules/catalog-violations.rule.ts` for the pattern. Register new rules in `src/index.ts`.
