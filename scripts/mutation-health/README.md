# `scripts/mutation-health/`

Patch-scoped mutation testing for n8n: prove the tests covering your change actually assert its behaviour.

## What is mutation testing?

Line coverage tells you which lines your tests **execute**. Mutation testing tells you which behavioural changes your tests **catch**. A file can have 100% line coverage and a 0% mutation score: every line runs during the test suite, but no test would fail if the code were silently broken.

### How it works

A mutation testing tool (n8n uses [Stryker](https://stryker-mutator.io/)) does this for each source file:

1. **Parse the source into an AST.**
2. **Generate small variants ("mutants")** by changing nodes in the AST. Examples:

   | Mutator | Original | Mutated |
   | --- | --- | --- |
   | Conditional | `if (item.mode === 'everyX')` | `if (true)`, `if (false)` |
   | Equality | `a === b` | `a !== b` |
   | Boundary | `value > 0` | `value >= 0` |
   | Arithmetic | `return a + b` | `return a - b` |
   | String literal | `'hello'` | `''`, `"Stryker was here!"` |
   | Block statement | `{ x(); return; }` | `{}` |
   | Conditional (ternary) | `cond ? a : b` | `a`, `b`, `cond ? a : a`, `cond ? b : b` |

   There are ~40 mutator categories. One source line typically produces several mutants.

3. **For each mutant, run the test suite against the mutated code.** One of these outcomes:

   | Outcome | Meaning |
   | --- | --- |
   | **Killed** | At least one test failed → tests caught the change. ✓ |
   | **Survived** | All tests passed → tests didn't catch the change. ✗ |
   | **NoCoverage** | No test even ran the mutated line. |
   | **Timeout** | Tests hung (counted as detected). |

4. **Mutation score** = `(killed + timeout) / (killed + timeout + survived + no_coverage)`. Higher = more load-bearing assertions.

### Line coverage vs mutation score — a real example

`packages/workflow/src/workflow-checksum.ts`:

- Line coverage: **87.09%**
- Mutation score: **38.64%**

Mutating `let hexString = ''` to `let hexString = "Stryker was here!"` survived the test suite. The tests assert that two similar workflows produce different checksums — but never pin the actual output format. Line coverage calls this fine; mutation testing flags it as assertion-light test theatre.

That divergence is exactly why this project exists.

---


## What's in this directory

| File | Role |
| --- | --- |
| `mutate.mjs` | The whole engine. Runs Stryker over a package and emits an actionable summary. Exposed as `pnpm mutate`. |
| `mutate.test.mjs` | Unit tests for its pure helpers (`node --test 'scripts/mutation-health/*.test.mjs'`). |
| `stryker.default.mjs` | Shared Stryker config for any vitest package. A package that needs special handling ships its own `stryker.config.mjs`, which `mutate.mjs` prefers. |

Outputs land in `<package>/reports/mutation/` (gitignored):

- `raw.json` — the full Stryker Mutation Testing Elements report (600 KB+; don't read it directly).
- `summary.json` — the compact actionable summary: every survivor's location, mutator, replacement, and covering tests. **This is the file to read.**

## Usage

The primary mode is `--diff`: mutate only the lines this branch changed.

```bash
# Everything you changed vs origin/master — committed and uncommitted —
# batched into one Stryker run per package.
pnpm mutate --diff
pnpm mutate --diff --base upstream/master

# One file, whole.
pnpm mutate packages/@n8n/crdt/src/utils.ts

# One file, only lines 40-75.
pnpm mutate packages/@n8n/crdt/src/utils.ts:40-75

# Package-relative target.
pnpm mutate src/cron.ts --package-dir packages/workflow
```

Exit codes: `0` gate passed · `1` gate failed (summary.json still written — this is the
iterate signal) · `2` usage error · `3` Stryker could not run. A toolchain failure is
**never** `1`, so a broken checkout can't be mistaken for a score of zero.

### Why `--diff` is fast

Two things do the work:

1. **Patch scoping.** Stryker's mutation-range syntax (`file.ts:13-16`) means only the mutants
   inside your changed lines are generated. You're scored on the lines you touched, not on
   inherited debt.
2. **One dry run per package.** Targets are comma-joined into a single `--mutate` argument.
   Repeated `--mutate` flags silently *overwrite* each other in Stryker's CLI, so comma-joining
   is the only way to batch — and it means a package pays for its dry run once, not once per file.

On top of that, Stryker's vitest runner only loads the tests *related* to the mutated files, so
cost tracks the related suite rather than package size. Measured end-to-end, whole-file:
`@n8n/decorators` 1s · `@n8n/scheduler` 3s · `packages/workflow` 13s · `nodes-base` 26s ·
`packages/cli` 88s. Line-scoping cuts these further.

### In-place mutation

Runs use Stryker's `--inPlace`. Its default sandbox copy breaks on any package whose vitest
config resolves a workspace dependency through a path alias — the alias doesn't survive the
copy, and `packages/cli` dies on `ERR_LOAD_URL … .stryker-tmp/@n8n/backend-test-utils`.

Stryker restores your files on a clean exit and on `Ctrl-C`, but not after a crash, a timeout or
a `SIGTERM` — and its preprocessing reaches past the mutate targets, so a target-only snapshot
left mutated files behind.

`mutate.mjs` therefore snapshots the **whole working tree** before the run:

- the exact bytes of every tracked file that is already dirty, plus every target. In `--diff`
  mode those files hold *uncommitted work*, so `git checkout --` is not a safe undo.
- the dirty set itself. Anything dirty *after* the run that was clean before it was changed by
  Stryker, and git holds its pre-run state, so `git checkout --` is the right undo there.

One cleanup routine restores that snapshot and deletes every `stryker-setup-*.js` the vitest
runner left under the repo root. It is idempotent and registered on every exit path: the usual
one, an uncaught exception, `SIGINT` and `SIGTERM`. A cancelled run exits `130` (`143` for
`SIGTERM`) with a clean `git status`.

One caveat: files you edit in another terminal *while a run is in flight* look like Stryker's
work and are reverted. Don't edit the repo during a run.

## Which packages can be scored

Any package whose `test` script runs **vitest** — which, since the Jest migration, is nearly all
of them, including `nodes-base`, `nodes-langchain`, `cli` and `db`. `--diff` derives eligibility
per file and prints a one-line reason for anything it skips; there is no curated list to
maintain.

Not scored:

- `@n8n/expression-runtime` — Stryker's dry run SIGABRTs on the isolated-vm engine ([DEVP-257](https://linear.app/n8n/issue/DEVP-257)).
- `.vue` single-file components — every SFC package crashed Stryker's mutate step in the 2026-06 sweep, and the component layer is low-value to mutate.
- Tests, declarations, stories, configs, migrations and build output.

## Gate semantics

A run passes only when **both**:

1. Mutation score meets `STRYKER_THRESHOLD` (default `80`), **and**
2. Zero `Survived` / `NoCoverage` mutants remain — every unkilled mutant must be explicitly justified as `Ignored` via a `// Stryker disable next-line <Mutator>: <reason>` comment in the source.

Stryker excludes `Ignored` mutants from both numerator and denominator of the score (see `scoreFromCounts` in `mutate.mjs`), so marking a genuine equivalent as ignored is **not** padding — it's the documented mechanism for "this mutant is equivalent / not behaviour-bearing, here's why". The score becomes a coarse floor; the real gate is "no unjustified survivors". This stops agents from padding the suite with trivial tests to clear `80%` while leaving real behaviour gaps unasserted. See [DEVP-442](https://linear.app/n8n/issue/DEVP-442) for the motivation.

`summary.json` surfaces every `Ignored` mutant alongside its disable-comment reason so reviewers can spot-check the justifications — those become the high-signal review artifact rather than N padding tests.

A **partial** run never passes: if Stryker exits non-zero but left a salvageable `raw.json`,
the summary is kept (survivors found so far are still useful) and flagged `partial`, because
mutants it never got to could be survivors.

### Threshold (provisional)

Runs use `STRYKER_THRESHOLD=80` as a placeholder. Scoped to a patch the number is coarse — a
handful of mutants makes for a jumpy percentage — so the load-bearing half of the gate is
"no unjustified survivors", not the score.
