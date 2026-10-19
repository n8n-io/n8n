# Expression-engine validation record

## CET-60 measurements

Measured on 2026-10-19 at base commit `14d2d305`:

- Node.js v24.21.0, Linux x64, AMD EPYC, 4 logical CPUs, 15.4 GiB RAM.
- Both engines ran on the same machine, one file at a time, with one worker.
- The existing pattern benchmarks use the full `Workflow.expression` path.
- Each benchmark uses a 500 ms warmup, at least 100 warmup iterations, and at least a 1 s measurement period.
- VM uses one pooled isolate, a 1,024-entry code cache, and a 128 MiB memory limit.
- Native evaluation, lazy acquisition, and the runtime compile cache remain off.
- Initialization and isolate acquisition occur before measurement. These results measure repeated expressions, not startup or cache misses.

The fixtures cover property access, nested access, extensions, conditionals, and array operations. The data includes 100-item arrays and a 10,000-item stress case. No Docker image is required.

Run from the repository root:

```bash
pnpm --filter @n8n/performance bench benchmarks/expression-engine/patterns-legacy.bench.ts benchmarks/expression-engine/patterns-vm.bench.ts --maxWorkers=1 --no-file-parallelism --reporter=json
```

Vitest writes the report to `packages/quality/efficiency/microbenchmarks/.vitest/json/output.json`. Copy the report before the next run if you need both raw reports.

Two measured runs followed one unrecorded warmup run. Each run passed all 26 benchmarks. Values below are milliseconds per evaluation. The p99 column gives the higher VM p99 from the two runs.

| Workload | Legacy mean A | Legacy mean B | VM mean A | VM mean B | VM p99, higher |
| --- | ---: | ---: | ---: | ---: | ---: |
| Property, small data | 0.046 | 0.038 | 0.218 | 0.237 | 0.778 |
| Property, medium data | 0.044 | 0.035 | 0.305 | 0.316 | 1.224 |
| Property, large data | 0.035 | 0.033 | 0.301 | 0.267 | 1.220 |
| Nested property, fixture label depth 3 | 0.032 | 0.033 | 0.329 | 0.267 | 1.463 |
| Nested property, fixture label depth 4 | 0.033 | 0.034 | 0.244 | 0.249 | 0.894 |
| `toUpperCase()` | 0.032 | 0.034 | 0.298 | 0.237 | 1.063 |
| `isEmpty()` | 0.032 | 0.033 | 0.296 | 0.216 | 1.063 |
| Map, 100 items | 0.033 | 0.034 | 1.735 | 1.410 | 5.981 |
| Filter, 100 items | 0.034 | 0.033 | 3.517 | 2.239 | 9.108 |
| Filter and map, 100 items | 0.034 | 0.034 | 2.000 | 1.197 | 6.550 |
| Map, 10,000 items | 0.057 | 0.055 | 86.167 | 67.424 | 117.696 |
| Nullish coalescing | 0.036 | 0.032 | 0.284 | 0.217 | 1.126 |
| Ternary | 0.035 | 0.034 | 0.271 | 0.229 | 1.020 |

### Interpretation

VM completed every workload. Scalar means stayed below 0.33 ms. The 100-item array means stayed below 3.52 ms. The 10,000-item map mean stayed below 86.2 ms. No evaluation reached the benchmark's 60 s bridge timeout.

VM does not match legacy throughput. Same-run mean ratios are about 5–10 times for scalar workloads, 35–103 times for 100-item arrays, and 1,235–1,506 times for the 10,000-item map. Array boundary costs remain a performance gap.

VM mean relative margins of error ranged from 2.37% to 12.35%. The 10,000-item case had 64 samples per run. Shared-runner timing varies, especially for arrays. These results show workload completion and measured costs. They do not prove a throughput-equivalence target or a production latency target. The supplied CET-60 discussion does not state a numeric acceptance threshold. Performance acceptance remains unconfirmed.

## Compatibility and test coverage

The workflow matrix now runs expression contracts in `vm-engine` and `quickjs-engine`. Other tests run once in `default`. The setup guard still rejects expression evaluation outside the engine projects. Engine setup also verifies that the requested engine is active.

The audit found one suite gated on `legacy-engine`: `expression-shadow.test.ts`. Its eight checks now run in both remaining projects. The suite selects the runtime legacy engine explicitly and restores the previous selection. This preserves the shadow-runner result, error, callback, timeout, and error-class contracts.

Other expression suites already ran in VM and QuickJS. Their contract checks remain. Tests now assert VM and QuickJS results directly instead of retaining unused legacy expectation branches. Stryker selects QuickJS and uses the evaluator setup. This avoids the documented isolated-vm worker teardown issue and exercises the shared VM evaluation path. No CI workflow referenced `legacy-engine`.

The runtime `legacy` option remains available. This change does not change production code or engine defaults.

### Known differences

These differences already existed before the test-project removal:

- VM and QuickJS writes to `$json` stay within one evaluation. Legacy writes can change the workflow data. `expression-array-proxy-semantics.test.ts` checks the evaluation-scoped contract.
- `(1234.5678).format('0,0.00')` returns `'1234.5678'` in VM and QuickJS. Legacy returns `undefined`. `expression-compatibility.test.ts` retains the VM and QuickJS check.
- Sparse arrays cross the isolate boundary with holes filled by `undefined`. Native evaluation and legacy use the live array. `native-evaluation-parity.test.ts` records this difference.
- QuickJS can truncate strings at NUL, replace lone surrogates, return nested `undefined` as `null`, and return nested `-0` as `0`. Non-decimal number formatting can also differ from V8. The existing fuzz test excludes these cases; passing fuzz tests do not establish parity for them.
- `expression.test.ts` keeps one VM-only global-object check. It remains skipped in QuickJS.

### Verification

From `packages/workflow`:

```bash
pnpm test --maxWorkers=1
pnpm exec stryker run --mutate src/expressions/expression-helpers.ts --dryRunOnly --concurrency 1
```

- Workflow suite: 124 files passed; 5,464 tests passed; one existing QuickJS skip.
- The workflow run included all VM and QuickJS expression suites, including the eight shadow checks in each project.
- Stryker: initial run passed with 2,376 tests. No mutations ran. This checks the QuickJS worker configuration and teardown.
