# TypeScript 6 → 7 migration tooling

Support scripts for migrating the monorepo from TypeScript `6.0.2` to the
TypeScript 7 line, and for moving legacy packages off `moduleResolution: node`
onto **NodeNext**. Migration is done **per package**.

## Choosing the TypeScript catalog

TypeScript 7 is the native (Go) compiler, "tsgo". The `typescript@7.0.2`
package is just a launcher for the native `tsc` binary — **TS 7.0 ships no
programmatic compiler API** (`ts.createProgram`, `ts.Extension`, the `ts.*`
namespace); that lands in **TS 7.1**. Any tool that calls the compiler API at
runtime therefore cannot run against tsgo yet.

Each migrated package picks **one** of two catalogs for its `typescript`
devDependency (both give a tsgo `tsc`, so both get the full typecheck/build
speed-up):

### `catalog:typescript` — plain upgrade (the default)

```jsonc
"typescript": "catalog:typescript"   // → tsgo (typescript@7.0.2)
```

For packages that only *compile* with TypeScript — no code path that imports
the compiler API at runtime. This is the target for the overwhelming majority
of packages.

### `catalog:typescript-tooling` — needs the compiler API at runtime

```jsonc
"@typescript/native": "catalog:typescript-tooling",  // → tsgo: provides the `tsc` bin
"typescript": "catalog:typescript-tooling"           // → @typescript/typescript6: the real TS 6 API + `tsc6` bin
```

This is the official **side-by-side install** ([TS 7.0 announcement →
"Running side-by-side with TypeScript 6.0"](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)).
The two packages expose non-colliding binaries (`tsc` from tsgo, `tsc6` from
TS 6), so `tsc`/`build`/`typecheck` still run on tsgo, while `require('typescript')`
resolves to the real TS 6 JS API that the tooling needs.

**A package needs `typescript-tooling` when it (or its tests) does any of:**

- value-imports `@typescript-eslint/*` or `typescript-eslint` (e.g.
  `typescript-estree` `parse`, `@typescript-eslint/rule-tester`);
- runs ESLint programmatically (`new ESLint(...)`) with a typescript-eslint
  parser;
- value-imports the `typescript` module for its API (`import ts from
  'typescript'`, `ts.createProgram`, …) — **not** type-only imports.

First-party code in these packages must `import ts from 'typescript'` — the
catalog points that specifier at the TS6 API. Do **not** add a separately-named
alias dependency (e.g. `"typescript6": "npm:@typescript/typescript6@…"`); keep
the single `typescript-tooling` convention so the 7.1 cleanup is one catalog flip.

Currently on `typescript-tooling`: `@n8n/eslint-config`,
`@n8n/eslint-plugin-community-nodes`, `@n8n/node-cli`, `@n8n/nodes-langchain`.

> **Forward-looking (TS 7.1):** once the native compiler ships its own
> programmatic API, `typescript-tooling` packages can drop the side-by-side
> dance — remove `@typescript/native`, point `typescript` back at
> `catalog:typescript`, and let the tooling use the native API directly. The
> `catalog:typescript` vs `catalog:typescript-tooling` split is exactly the
> list of packages to revisit when that lands.

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

## Per-package migration loop

1. **Baseline:** `benchmark.mjs <pkg> --label=before`.
2. **Config:** point the package's tsconfig at NodeNext — extend
   `@n8n/typescript-config/modern`, or the `config.go.json` variant, or set `module: NodeNext` +
   `moduleResolution: NodeNext` locally.
3. **Migrate dynamic imports:** Run typechecks and build and fix any lingering issues
		most likely related to the dynamic imports not having file extensions.
4. **Aliases:** if the package keeps path aliases, enable `tsc-alias`
   `resolveFullPaths` so alias tails also get extensions in emit.
5. **Compiler:** swap the `typescript` devDependency from `catalog:` onto the
   right TS 7 catalog — `catalog:typescript`, or `catalog:typescript-tooling`
   if the package uses the compiler API at runtime (see
   [Choosing the TypeScript catalog](#choosing-the-typescript-catalog)), then
   `pnpm install`.
6. **Verify:** `pnpm --filter <pkg> run build && pnpm --filter <pkg> run typecheck && pnpm --filter <pkg> test`.
7. **After:** `benchmark.mjs <pkg> --label=after` → confirm the delta table.

Migrate leaf/low-dependency packages first (`workflow`, `@n8n/config`,
`@n8n/di`) so downstream typechecks stay green, then work up toward `cli`.
