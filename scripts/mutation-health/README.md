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
| `mutate.mjs` | The entry point, exposed as `pnpm mutate`. Reads the command line, plans the runs, runs Stryker and prints the summary. |
| `plan.mjs`, `targets.mjs` | What a run mutates: targets, diff ranges, test files and which packages can be scored. |
| `stryker.mjs` | How a run starts: the run config, the Stryker process and signal handling. |
| `sandbox-mirror.mjs` | Where the sandbox goes. See [Sandbox runs](#sandbox-runs). |
| `summary.mjs` | Scoring, the gate and `summary.json`. |
| `vitest-compat.mjs`, `vitest-compat-runner.mjs` | The `vitest-compat` Stryker test runner. See [Vitest 5](#vitest-5). |
| `*.test.mjs`, `test-doubles.mjs` | Unit tests (`node --test scripts/mutation-health/*.test.mjs`). They start no Stryker run. CI runs them in the "Workflow scripts" job, which installs only `.github/scripts`, so a test must not need a root dependency such as Stryker. Inject a stand-in, or skip the test when the dependency is missing. |
| `stryker.default.mjs` | Shared Stryker config for any vitest package. A package that needs special handling ships its own `stryker.config.mjs`, which `mutate.mjs` prefers. |
| `stryker.cli.mjs` | The default plus `vitest.related: false`, used for `packages/cli` targets. See [Scoping the tests](#scoping-the-tests-with---test-files). |

Outputs land in `<package>/reports/mutation/` (gitignored):

- `raw.json` — the full Stryker Mutation Testing Elements report (600 KB+; don't read it directly).
- `summary.json` — the compact actionable summary: every survivor's location, mutator, replacement, and covering tests. **This is the file to read.**
- `stryker.run.json` — the exact config the tool gave Stryker. Read it when a run does not do what
  you expect. It can name the sandbox mirror (see [Sandbox runs](#sandbox-runs)), which is gone
  after the run. To repeat a run, run `pnpm mutate` again with the same arguments, not
  `stryker run` on this file.

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

# One file, scoped to the tests that must kill its mutants.
pnpm mutate packages/cli/src/credentials/external-secrets.utils.ts:32-68 \
  --test-files packages/cli/src/credentials/__tests__/external-secrets.utils.test.ts

# A package whose `test` script does not run vitest: name the test command.
pnpm mutate packages/quality/testing/playwright/coverage-options.ts \
  --test-files coverage-options.test.ts --test-command 'pnpm exec vitest run'
```

Exit codes: `0` gate passed · `1` gate failed (summary.json still written — this is the
iterate signal) · `2` usage or config error · `3` Stryker could not run · `130` / `143` the run
was cancelled. A toolchain failure is **never** `1`, so a broken checkout can't be mistaken for a
score of zero.

### Why `--diff` is fast

Three things do the work:

1. **Patch scoping.** Stryker's mutation-range syntax (`file.ts:13-16`) means only the mutants
   inside your changed lines are generated. You're scored on the lines you touched, not on
   inherited debt.
2. **One dry run per package.** All the targets of a package go into one Stryker run, so a
   package pays for its dry run once, not once per file.
3. **Per-test coverage.** The default runner records which tests cover each mutant during the
   dry run. Each mutant then runs only those tests, in a Vitest process that stays alive
   between mutants.

On top of that, Stryker's vitest runner loads only the tests *related* to the mutated files, so
cost tracks the related suite rather than package size.

Measured with the sandbox runs of this tool (Vitest 5.0.1, 4 workers):

| Target | Mutants | Default runner | Command runner |
| --- | --- | --- | --- |
| `@n8n/instance-ai` `utils/model-config-id.ts` | 38 | 5–11 s | 16 s |
| `@n8n/scheduler` `core/clock-skew.ts` | 15 | 5 s | — |
| `@n8n/instance-ai` `automation/schedule-phrase.ts` | 350 | 54 s | 11 min 45 s ¹ |
| `packages/cli` `credentials/external-secrets.utils.ts:32-68` | 11 | 26 s | — |

¹ Measured with 2 workers. Both runners found the same 8 survivors.

A `packages/cli` run spends most of its time on the sandbox copy and the cli test setup.

### Scoping the tests with `--test-files`

By default Stryker's vitest runner uses [related mode](https://vitest.dev/guide/cli.html#vitest-related): it
walks the import graph of the mutated file and runs every test file that reaches it. That is the
right default for most packages, and it is what keeps cost tracking the related suite rather than
package size.

`--test-files` replaces that discovery with an explicit list. With the default runner the list
goes to Stryker's [`testFiles`](https://stryker-mutator.io/docs/stryker-js/configuration/#testfiles-string)
config field, so only those files run. With `--test-command` the files go onto the end of the
command, because the command runner does not accept `testFiles`. The list also answers a
sharper question: can this module's *own* unit tests kill its mutants, without help from the
rest of the suite?

The flag repeats and it also takes a comma-separated list. Paths may be repo-relative (what you
type) or package-relative (what Stryker matches); `mutate.mjs` converts them. Globs work with the
default runner. A test command gets each path as one quoted argument, so a glob is not expanded.

```bash
pnpm mutate packages/@n8n/crdt/src/utils.ts --test-files packages/@n8n/crdt/src/__tests__/utils.test.ts
pnpm mutate src/utils.ts --package-dir packages/@n8n/crdt --test-files 'src/__tests__/*.test.ts'
```

`--test-files` needs a single target, so it does not combine with `--diff`.
For `packages/cli`, diff mode automatically uses the test files changed in the
patch. This keeps unrelated CLI tests out of Stryker's instrumented dry run.

#### `packages/cli` test scope

`packages/cli` runs vitest with `pool: 'forks'` and a global setup, so each test file costs a
process. Related discovery finds hundreds of them for a typical source file, and the dry run alone
outlives any usable timeout. A named `packages/cli` target therefore **fails with exit `2`** until
you name the test files:

```bash
$ pnpm mutate packages/cli/src/credentials/external-secrets.utils.ts:32-68
Mutating packages/cli needs --test-files.
```

Those runs also get `stryker.cli.mjs` instead of the shared default — same settings, with
`vitest.related` turned off, because the explicit list already decides the scope.

In diff mode, the changed CLI test files provide the same explicit list. If a
CLI patch changes source without changing a test, the command fails before
Stryker starts. Add or update a covering test, or run a named target with the
existing covering tests passed through `--test-files`.

### Test runners

| Runner | When | How it runs a mutant | Coverage in the summary |
| --- | --- | --- | --- |
| `vitest-compat` | By default, for every config that uses the `vitest` runner | Runs only the tests that cover the mutant, in a Vitest process that stays alive | Yes |
| `command` | With `--test-command <cmd>` | Runs `<cmd> <test files>` in a new shell for each mutant | No (`cov n/a`) |

Use `--test-command` only for a package whose `test` script does not run vitest, such as the
playwright package (`test:unit` runs its unit tests). The command runner has no per-test
coverage, so:

- every mutant runs every named test file, and pays the start-up time of the command;
- `NoCoverage` never appears: a mutant that no test reaches is `Survived`, which also fails the gate;
- `coveringTests` in `summary.json` is empty;
- a command that finds no test file fails the dry run. The tool records it as a score-0 red
  result, as it does when the vitest runner finds no test.

Name the test files with `--test-files`. Without them the command runs the package's whole
suite for each mutant. `--test-command` needs a single target, so it does not combine with
`--diff`.

## Vitest 5

`@stryker-mutator/vitest-runner` 10.0.0 is tested against Vitest 4.1. The repo uses Vitest 5.
With the plain runner every mutant survived, and Stryker printed `Ran 0.00 tests per mutant`.
The cause is the test filter. For each mutant the runner runs only the tests that cover it, and it
selects them with a `testNamePattern` regex built from names that join the suite and the test
with a space (`suite test`). Vitest 4 matched the pattern against names in that form. Vitest 5
matches it against `fullTestName`, which joins them with ` > ` (`suite > test`). The pattern then
misses every test inside a `describe`, so no test runs. `coverageAnalysis: 'off'` and `'all'` do
not help: the runner records per-test coverage in each dry run, and Stryker then sends the same
per-test filter.

`vitest-compat-runner.mjs` is a small Stryker plugin that wraps the runner. Before Vitest starts,
it changes each space in the pattern to "space or ` > `". It makes one more change: a test file
that throws on import fails the dry run with that file's error. The plain runner drops such a
file without an error, and the run then reads as "no covering tests".

`mutate.mjs` gives the `vitest-compat` runner to every config that uses `vitest`, including
the package-local configs of `packages/workflow` and `@n8n/scheduler`. Remove the name fix when
the runner supports Vitest 5.

## Sandbox runs

Every run uses Stryker's sandbox: Stryker copies the package and mutates the copy, never your
files. Nothing is restored after a run, and you can keep working in the repo while a run is in
flight.

The default sandbox sits two levels below the package (`<package>/.stryker-tmp/sandbox-*/`). A
config path that leaves the package then points to the wrong place. Examples are the cli aliases
`../@n8n/telemetry/src` and `../@n8n/mcp-apps/src/server`, and the `@nodes-testing` alias of
`nodes-base` and `nodes-langchain`. Stryker corrects such paths in `tsconfig.json`, but not in a
vite or vitest config.

`mutate.mjs` therefore puts the sandbox in a **mirror** of the repo under `.stryker-tmp/` at the
repo root (gitignored). The mirror has real directories along the package's path, with a symbolic
link to each real entry beside that path. The sandbox has the same depth as the package, so `..`
from the sandbox reaches the same files as `..` from the package. Stryker's tsconfig correction is
turned off for these runs, because the paths are already right.

After each run Stryker removes its sandbox and the tool removes the mirror. The removal unlinks
each link and never follows one, so it never deletes a real file. A crash can leave a
`.stryker-tmp/mirror-*` directory behind: it holds only directories and links, and you can delete
it.

The tool refuses a config that turns on Stryker's in place mode, with exit `2`.

Results that Stryker keeps for `incremental` runs go to a file for each runner (for example
`stryker-incremental.vitest-compat.json`). The runners name tests differently, so their results do
not mix. This also drops the results that the plain runner recorded under Vitest 5.

## Which packages can be scored

Any package whose `test` script runs **vitest** — which, since the Jest migration, is nearly all
of them, including `nodes-base`, `nodes-langchain`, `cli` and `db`. `--diff` derives eligibility
per file and prints a one-line reason for anything it skips; there is no curated list to
maintain.

A package whose `test` script does not run vitest, such as the playwright package, can be scored
as a named target with [`--test-command`](#test-runners).

Not scored:

- `@n8n/expression-runtime` — Stryker's dry run SIGABRTs on the isolated-vm engine ([DEVP-257](https://linear.app/n8n/issue/DEVP-257)).
- `.vue` single-file components — every SFC package crashed Stryker's mutate step in the 2026-06 sweep, and the component layer is low-value to mutate.
- Tests, declarations, stories, configs, migrations and build output.

`packages/cli` is scored with an explicit [`--test-files`](#packagescli-test-scope)
list for named targets, or with the changed CLI tests in diff mode.

## Gate semantics

A run passes only when **both**:

1. Mutation score meets `STRYKER_THRESHOLD` (default `80`), **and**
2. Zero `Survived` / `NoCoverage` mutants remain — every unkilled mutant must be explicitly justified as `Ignored` via a `// Stryker disable next-line <Mutator>: <reason>` comment in the source.

Stryker excludes `Ignored` mutants from both numerator and denominator of the score (see `scoreFromCounts` in `summary.mjs`), so marking a genuine equivalent as ignored is **not** padding — it's the documented mechanism for "this mutant is equivalent / not behaviour-bearing, here's why". The score becomes a coarse floor; the real gate is "no unjustified survivors". This stops agents from padding the suite with trivial tests to clear `80%` while leaving real behaviour gaps unasserted. See [DEVP-442](https://linear.app/n8n/issue/DEVP-442) for the motivation.

`summary.json` surfaces every `Ignored` mutant alongside its disable-comment reason so reviewers can spot-check the justifications — those become the high-signal review artifact rather than N padding tests.

A **partial** run never passes: if Stryker exits non-zero but left a salvageable `raw.json`,
the summary is kept (survivors found so far are still useful) and flagged `partial`, because
mutants it never got to could be survivors.

### Threshold (provisional)

Runs use `STRYKER_THRESHOLD=80` as a placeholder. Scoped to a patch the number is coarse — a
handful of mutants makes for a jumpy percentage — so the load-bearing half of the gate is
"no unjustified survivors", not the score.
