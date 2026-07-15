# TypeScript 6 → 7 migration tooling

Support scripts for migrating the monorepo from TypeScript `6.0.2` to the
TypeScript 7 line, and for moving legacy packages off `moduleResolution: node`
onto **NodeNext**. Migration is done **per package**.

## Scripts

### `benchmark.mjs` — build/typecheck timing

Times a single package's `build` and `typecheck` scripts and records the result
to a per-package JSON file. Run it *before* switching compilers, switch, then
run it again — the second run appends to the same file and prints a delta table.

```bash
# before the switch
node scripts/typescript-migration/benchmark.mjs @n8n/config --label=before

# … swap in the TS 7 compiler …

# after — appends to the same file and prints the before/after delta
node scripts/typescript-migration/benchmark.mjs @n8n/config --label=after
```

**Options**

| Flag             | Default              | Meaning                                                       |
| ---------------- | -------------------- | ------------------------------------------------------------- |
| `<package>`      | —                    | Workspace name (`@n8n/config`) or a package dir.              |
| `--label=<name>` | `ts-<tsc version>`   | Storage key. Different compilers auto-separate by version.    |
| `--runs=<n>`     | `3`                  | Repetitions per task; reports min/median/mean.                |
| `--tasks=a,b`    | `typecheck,build`    | Subset to run. Missing scripts are skipped with a warning.    |
| `--no-prepare`   | prepare on           | Skip the untimed dependency prebuild.                         |

**How it isolates the package** — dependencies are prebuilt once (untimed) via
`turbo run build --filter=<pkg>^...`, then each timed run deletes the package's
`dist/` + `*.tsbuildinfo` (cold compile) and runs the package script directly
with `pnpm --filter <pkg> run <task>`, bypassing turbo's cache. So the numbers
reflect only that package's own `tsc` (+ `tsc-alias`) time.

Results land in `results/<pkg>.json` (gitignored). The label is compiler-
agnostic: this script never installs or selects TypeScript — wire that up
separately and just re-run with a new `--label`.

### `add-import-extensions.mjs` — NodeNext import codemod

Adds explicit `.js` / `.json` / `/index.js` extensions to **relative** import,
re-export, and dynamic-`import()` specifiers, which NodeNext (and ESM) require.

```bash
# dry-run: prints every rewrite it would make
node scripts/typescript-migration/add-import-extensions.mjs packages/workflow

# apply
node scripts/typescript-migration/add-import-extensions.mjs packages/workflow --write
```

- Uses `ts-morph` (already a catalog dep) and the package's `tsconfig.json` to
  find source files.
- **Rewrites alias specifiers** that match a `paths` mapping in the tsconfig
  (`@/foo` → `@/foo.js`, `@/widgets` → `@/widgets/index.js`), resolving the
  extension against the mapped target dir. Typecheck (`tsc --noEmit`) doesn't run
  `tsc-alias`, so aliases need the extension too; `resolveFullPaths` still handles
  the already-suffixed alias in emit. Packages with no `paths` skip this step.
- **Skips** bare specifiers (package names — they never match a `@/*`-style
  `paths` prefix) and specifiers that already carry a known extension.
- Reports any relative specifier it can't resolve on disk for manual review;
  it does not guess.

## Per-package migration loop

1. **Baseline:** `benchmark.mjs <pkg> --label=before`.
2. **Config:** point the package's tsconfig at NodeNext — extend
   `@n8n/typescript-config/modern`, or set `module: NodeNext` +
   `moduleResolution: NodeNext` locally.
3. **Codemod:** run `add-import-extensions.mjs <pkg>` (review), then `--write`.
   This adds extensions to both relative and `paths`-alias specifiers in source.
4. **Aliases:** if the package keeps path aliases, enable `tsc-alias`
   `resolveFullPaths` so the alias prefix is rewritten to a relative path in
   emit (the codemod already added the extension in source).
5. **Verify:** `pnpm --filter <pkg> run build && pnpm --filter <pkg> run typecheck && pnpm --filter <pkg> test`.
6. **After:** `benchmark.mjs <pkg> --label=after` → confirm the delta table.

Migrate leaf/low-dependency packages first (`workflow`, `@n8n/config`,
`@n8n/di`) so downstream typechecks stay green, then work up toward `cli`.
