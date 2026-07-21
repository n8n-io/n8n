# single-instance dependency checks

Guards against a second physical copy of a "single-instance-sensitive" library
(`zod`, `form-data`, `@langchain/core`, `reflect-metadata`) reaching a build. Two copies
break `instanceof`, module singletons and cross-package schema composition — it only
surfaces in production / `npm install` graphs, not local pnpm dev.

Curated list + host/frontend exemptions live in `single-instance-libs.mjs` (single source
of truth, read by every check here).

| Script | Checks |
|---|---|
| `check-single-instance-peers.mjs` | Manifest **shape**: curated libs must be `peerDependencies`, not plain `dependencies` (except `reflect-metadata`, pin-only). Runs in `lint:ci` + the `single_instance_check` lefthook hook. |
| `verify-single-instance-deps.mjs` | Walks a built closure and fails if a curated lib resolves to >1 realpath. Report-only inside `build-n8n.mjs`. |
| `verify-single-instance-npm-install.mjs` | Packs workspace packages and installs them with npm to reproduce the `npm install` graph. `--changed=<ref>` (CI, scoped) / `--all` (release) / explicit names. |
| `syncpack.config.mjs` (repo root) | Curated libs must use the pnpm `catalog:` protocol. |

Tests (`*.test.mjs`) run via `pnpm test:single-instance` and the `.github/scripts` `npm test`
job in CI — **not** `lint:ci` (they test the tools, not repo state).

## The baseline — `single-instance-peers-baseline.json`

A committed snapshot of the **current tree** (not a cross-version diff), with two sections:

- `dependencies` — packages that today declare a curated lib as a plain `dependency`. These
  are the known offenders to migrate to peers (on `3.x`); the check **reports** them, does
  not fail. A curated dep in a package **not** listed here → hard fail (new violation).
- `requiredPeers` — packages that today declare a curated lib as a `peerDependency` (locked
  in). Dropping one → hard fail. This is the regression guard the old `check-zod-peer-deps.mjs`
  provided, now derived from the tree instead of a hardcoded list.

Regenerate after an intentional change with:

```bash
node scripts/single-instance/check-single-instance-peers.mjs --write
```

then commit the result. The checks never run `--write` themselves, so a regression can't be
silenced by rewriting the baseline — it must be an explicit, reviewed commit.
