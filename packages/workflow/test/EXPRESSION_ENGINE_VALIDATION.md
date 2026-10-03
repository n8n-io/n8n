# Expression engine test matrix

The workflow Vitest suite runs on VM and QuickJS. Both projects run the same
expression contracts. The runtime `legacy` option remains available, but the
normal suite no longer compares each case against it. Stryker uses QuickJS
because VM teardown aborts in its workers (isolated-vm #464).

## Local performance check

Run from `packages/testing/performance`:

```bash
pnpm bench benchmarks/expression-engine/patterns-vm.bench.ts benchmarks/expression-engine/patterns-legacy.bench.ts
```

One local run on Node 24.15.0 measured warm expression evaluation through
`Workflow.expression`. Lower mean latency is better. Results depend on the
runner; these numbers are not a CI performance baseline.

| Workload | VM mean | Legacy mean |
| --- | ---: | ---: |
| Simple property, small data | 0.159 ms | 0.033 ms |
| Nested property, depth 4 | 0.185 ms | 0.034 ms |
| Extension call, `isEmpty` | 0.217 ms | 0.036 ms |
| Map 100 items | 0.830 ms | 0.037 ms |
| Filter 100 items | 1.701 ms | 0.036 ms |
| Map 10,000 items | 61.665 ms | 0.054 ms |

VM is slower on these workloads, especially on array iteration. The ticket
does not state a numeric acceptance limit. This run does not establish that
VM meets a performance bar. Use the same benchmark on production-like hardware
and agree on a limit before treating performance as validated.

## Compatibility check

Before removing the legacy project, the compatibility corpus, array proxy,
and `$item(index)` suites passed on legacy, VM, and QuickJS (231 tests per
project). All three projects shared the same contract cases. The only
engine-specific expected result in that corpus was `Number.format()`:
legacy returned `undefined`; VM and QuickJS return the unformatted number
as a string. Array and object writes also differ: legacy changes the input
data, while VM and QuickJS keep writes within the evaluation. The VM and
QuickJS assertions still cover both behaviors they share. The matrix no
longer checks new changes against legacy automatically.

After the change, `pnpm test` in `packages/workflow` passed 180 test files
across VM and QuickJS (6,521 passed; one skipped). The Stryker QuickJS
configuration passed all 90 test files (3,260 passed; one skipped). A narrow
Stryker run on `get-connected-nodes.ts:37` killed three of three mutants.
