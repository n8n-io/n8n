# @n8n/code-health

Static analysis for monorepo dependency hygiene. Built on `@n8n/rules-engine`.

## What it does

Scans all `package.json` files across the monorepo and flags:

- **Hardcoded catalog deps** — dependencies using a pinned version when `pnpm-workspace.yaml` already defines a catalog entry
- **Cross-package version drift** — the same dependency appearing in multiple packages with different versions
- **Encryption boundary coverage** — every package that depends on `n8n-core` or `@n8n/db` composes the encryption-boundary ESLint config at `error` severity and contains no ESLint directive that silences it
- **Unused workspace dependencies** — `workspace:*` entries a package declares but no file in it uses

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

## Unused workspace dependencies

`import-x/no-extraneous-dependencies` fails an import that the manifest does not declare. The
`unused-workspace-deps` rule covers the opposite direction: a `workspace:*` entry in `dependencies`
or `devDependencies` that no file in the package uses. An unused edge makes Turbo rebuild and
re-test packages a change cannot affect, and it misstates the architecture.

```bash
node packages/testing/code-health/dist/cli.js --rule=unused-workspace-deps
```

A linter cannot answer this: ESLint and oxlint visit one file at a time and never see the whole
package. The rule instead reads every file in the package and treats **any mention** of the
dependency as a use — an import, a dynamic `import()`, a `require`, a tsconfig `extends`, a config
file outside `src`, a `scripts` entry, a CSS or asset reference, or a plain string used to resolve a
path. A package that provides a binary also counts as used when that binary is named in the
manifest's `scripts` or in a `.bin/` path. Markdown is excluded: prose cannot make a dependency
necessary.

The bias is deliberate. A missed finding costs a stale edge that the next run may still catch; a
false positive sends someone to delete a live one. `peerDependencies` are never reported — they are
a contract with consumers, not a use — and third-party dependencies are out of scope, because they
need a resolver for bundler aliases, plugin auto-loading and binaries.

An edge with no mention anywhere, such as one that exists only to order the Turbo build, goes in
the rule's `allowUnused` option in `src/index.ts` as `"<package dir>#<dependency>"`.

The rule starts at `warning`. Raise it to `error` once the baseline is worked down to empty.

### Why not knip or depcheck

Neither is in the repo, and both answer a wider question than this one. `depcheck` reads imports
per package and has no model of a pnpm workspace protocol, a tsconfig `extends`, or a binary run
from a `scripts` entry — the cases that make up most of the "do not report" list. `knip` does model
those, but it wants per-workspace entry and project configuration for ~80 packages, and it reports
unused files and exports too, so adopting it is a project rather than a check. Wrapping either also
adds a third-party dependency and its lockfile weight for a rule that needs a few hundred lines
here, where every `package.json` is already read. Revisit as part of DEVP-618 if the wider
unused-files and unused-exports questions are picked up.

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
