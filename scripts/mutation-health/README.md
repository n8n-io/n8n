# `scripts/mutation-health/`

Phase 1 substrate for the Mutation Health Observability initiative.

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

| File | Purpose |
| --- | --- |
| `pick-next.mjs` | Walk `<pkg>/src/`, merge with the live ledger, return the next source file to mutate |
| `mutate.mjs` | Run Stryker on one source file of any vitest package, write `summary.json` |
| `stryker.default.mjs` | Default Stryker config for onboarded packages (points at the package's own `vitest.config.*`) |
| `emit-payload.mjs` | Turn a Stryker `summary.json` into a BQ-ready writer payload |

`mutate.mjs` is package-agnostic — run `pnpm mutate <repo-relative-file>` from the repo root and the package is inferred from the path (or pass `--package-dir <pkg>` for a package-relative target, as the nightly does). It uses the package's own `stryker.config.mjs` if one exists (e.g. `packages/workflow` carves out the isolated-vm engine), otherwise `stryker.default.mjs`.

The reader and writer webhooks are plain HTTP — the GHA hits them with `curl`. There is no fetch/post wrapper script; if you want to call them locally, see [Local usage](#local-usage).

The BQ table schema lives with the writer workflow (in n8n's internal Quality project), not in this repo — the writer owns the MERGE statement and is the single source of truth.

## End-to-end pipeline

```
[GHA nightly cron, .github/workflows/mutation-health-nightly.yml]
       │
       ├─► curl GET reader webhook          → live-ledger.json (current BQ state)
       │       │
       │       └─► [n8n: QA Mutation Health Reader] ──► SELECT from BQ ledger
       │
       ├─► pick-next.mjs                    → one source file
       │     walks <pkg>/src/, merges with live ledger
       │     files missing from ledger are synthesised as `new`
       │     priority: new → red → stale → skip green
       │     within new:        alphabetical
       │     within red/stale:  lowest score first
       │
       ├─► mutate.mjs --package-dir <pkg>   → summary.json
       │
       ├─► emit-payload.mjs                 → bq-payload.json
       │
       └─► curl POST writer webhook         → INSERTs event + MERGEs ledger row
                                              ↓
                              [n8n writer workflow: QA: Mutation Health Writer]
                                              ↓
                              ┌───────────────────────────────────┐
                              │ qa_mutation_health_ledger (MERGE) │
                              │ qa_performance_metrics  (INSERT)  │
                              └───────────────────────────────────┘
```

The writer workflow lives in n8n's internal Quality project. It's created and maintained outside this repo. This README documents the contract it implements.

## Passes, packages & onboarding

The nightly runs a **matrix of `package × pass`** (built once in the `setup` job of `mutation-health-nightly.yml`). Each leg picks, mutates, and writes back independently; the ledger is keyed by package, so they don't collide. Two passes, selectable via the `mode` dispatch input (`both` on schedule):

- **baseline** — `pick-next.mjs --mode baseline` → scores files with no result yet (the `new` bucket). Builds out coverage.
- **coverage** — `pick-next.mjs --mode coverage` → revisits the weakest scored files (`red`/`stale`, lowest score first). Strengthens existing tests.

To onboard a **vitest** package: add one `{ name, dir, slug }` line to the `packages` array in the `setup` job. No per-package config needed — `stryker.default.mjs` auto-resolves the package's own `vitest.config.*` (verified on plain and DI-decorator packages). Add a local `stryker.config.mjs` only if the package needs special handling.

Not yet covered: **jest** packages (need Stryker's jest-runner — different setup) and `@n8n/expression-runtime` (it _is_ the isolated-vm engine; blocked on the patch in DEVP-257).

## State transitions

| Trigger | Stored `status` |
| --- | --- |
| Source file in `src/` but no row yet | synthesised as `new` at pick time; not stored |
| Last run scored ≥ `threshold_at_run` | `green` |
| Last run scored < `threshold_at_run` | `red` |

Stored statuses are just two: `red` and `green`. `new` is computed in-memory by the picker for any file in the source tree that has no ledger row yet — the row is only persisted after that file's first scored run. The picker also computes a transient `stale` state — any `green` row whose `last_checked_at` is older than 4 weeks is treated as `stale` for that pick. No `last_checked_sha` is needed; no git history is consulted.

Picker priority: `new` → `red` → `stale` → skip fresh `green`.

- Within `new`: alphabetical (rows exit the bucket as they're scored)
- Within `red`: lowest score first (weakest tests revisited first)
- Within `stale`: oldest `last_checked_at` first (natural cycling of long-stable files)

If every row is green and fresh, the picker exits 0 with `{"picked": null, "reason": "all-green"}` — a healthy "nothing to do" state, not a failure.

## Webhook contracts

Two n8n workflows back the pipeline. Both live in the internal Quality project (`L8csxtEbFpFOWlf8`) and are created/maintained outside this repo. Both run unauthenticated (URL-as-secret pattern, matching existing `qa_*` workers).

| Endpoint | Method | Workflow | Purpose |
| --- | --- | --- | --- |
| `https://internal.users.n8n.cloud/webhook/mutation-health-writer` | POST | `QA: Mutation Health Writer` (`iYEBmBat8OscRTVq`) | INSERT events + MERGE ledger |
| `https://internal.users.n8n.cloud/webhook/mutation-health-ledger?package=<name>` | GET | `QA: Mutation Health Reader` (`ZmRsNUwvgfCSq0JI`) | Read current ledger state |

### Writer webhook

`POST https://internal.users.n8n.cloud/webhook/mutation-health-writer` with `Content-Type: application/json`:

```json
{
  "ledger": [
    {
      "source_file_path": "packages/workflow/src/cron.ts",
      "package": "n8n-workflow",
      "last_score": 95.12,
      "threshold_at_run": 80,
      "last_checked_at": "2026-05-22T10:03:55.660Z",
      "status": "green",
      "mutants_killed": 39,
      "mutants_survived": 2,
      "mutants_no_coverage": 0,
      "mutants_timeout": 0
    }
  ],
  "events": [
    {
      "benchmark_name": "mutation_health",
      "value": 95.12,
      "timestamp": "2026-05-22T10:03:55.660Z",
      "dimensions": {
        "package": "n8n-workflow",
        "source_file": "packages/workflow/src/cron.ts",
        "sha": "095239e175",
        "status_after": "green",
        "threshold": 80,
        "mutants_killed": 39,
        "mutants_survived": 2,
        "mutants_no_coverage": 0,
        "mutants_timeout": 0
      }
    }
  ]
}
```

Either array may be empty (manual smoke tests sometimes send only `events`).

The writer:

1. For each `events[]` row → `INSERT` into `qa_performance_metrics`.
2. For each `ledger[]` row → `MERGE` into `qa_mutation_health_ledger` on `source_file_path`. Status is always `red` or `green` — the picker synthesises `new` in-memory and never posts it.

The webhook URL is delivered to GHA via the `MUTATION_HEALTH_WEBHOOK` repo secret. The secret URL itself is the only auth (matches existing `qa_*` writer pattern); rotate the secret if leaked.

### Reader webhook

`GET https://internal.users.n8n.cloud/webhook/mutation-health-ledger?package=<pkg>`:

```json
{
  "ledger": [
    {
      "source_file_path": "packages/workflow/src/cron.ts",
      "package": "n8n-workflow",
      "last_score": 95.12,
      "threshold_at_run": 80,
      "last_checked_at": "2026-05-22T10:03:55.660Z",
      "status": "green",
      "mutants_killed": 39,
      "mutants_survived": 2,
      "mutants_no_coverage": 0,
      "mutants_timeout": 0
    }
  ]
}
```

The `package` query param is validated server-side against the same pnpm-workspace allowlist regex used elsewhere in the pipeline; invalid input returns 500. No SQL is constructed or accepted on the client side — the SELECT is hardcoded in the workflow.

Unauthenticated — the URL is not a secret. The data isn't sensitive (file paths + integer scores), but treat the URL as low-trust: anyone with it can read all current ledger state for the queried package.

## Threshold (provisional)

Runs use `STRYKER_THRESHOLD=80` as a placeholder. The threshold moves to evidence-based after ~4 weeks of accumulated data. Until then, treat `red`/`green` verdicts as preliminary.

## Local usage

```bash
# Run Stryker on one file (the inner loop — also invokable via /n8n:mutant-score skill).
# Package is inferred from the repo-relative path; works for any vitest package.
pnpm mutate packages/workflow/src/cron.ts
pnpm mutate packages/@n8n/crdt/src/utils.ts

# Pull current ledger from BQ
curl --fail -sS \
  'https://internal.users.n8n.cloud/webhook/mutation-health-ledger?package=n8n-workflow' \
  -o /tmp/ledger.json

# Pick the next file to score
node scripts/mutation-health/pick-next.mjs \
  --package-dir packages/workflow \
  --ledger-file /tmp/ledger.json

# Build a BQ payload from a Stryker run
node scripts/mutation-health/emit-payload.mjs \
  --summary packages/workflow/reports/mutation/summary.json \
  --package n8n-workflow

# POST the result (requires MUTATION_HEALTH_WEBHOOK to be set)
curl --fail -sS -X POST \
  -H 'Content-Type: application/json' \
  --data @packages/workflow/reports/mutation/bq-payload.json \
  "$MUTATION_HEALTH_WEBHOOK"
```
