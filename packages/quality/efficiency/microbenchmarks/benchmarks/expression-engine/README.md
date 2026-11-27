# Expression transfer benchmarks

Build `@n8n/expression-runtime` before you run the transfer benchmarks.

```sh
pnpm --filter @n8n/expression-runtime build > /tmp/expression-runtime-build.log 2>&1
pnpm --filter @n8n/performance bench benchmarks/expression-engine/transfer.bench.ts
```

The file has one case for each transfer path: large numeric arrays, nested
arrays, returned items, items that share one data object, items with dates or
maps, results with built-in types, errors, class instances, shared values in a
map, and deep results. Each case runs on isolated-vm and QuickJS.

Compare both revisions on the same machine. Keep the Node.js version and the
process settings the same. Warm each case before you measure it. Use several
rounds and compare the median times. Do not treat differences below 5% as a
confirmed change.

Check each engine and each case separately. An overall average can hide a
regression in array transfer or in host calls with shared data. These benchmarks
measure evaluation time. They do not measure peak memory or cold starts.

## Full matrix

`transfer.bench.ts` is small because it runs in CI. For a change to the
expression runtime, also run the full matrix by hand. It has about 800 cases and
does not run in CI.

The matrix compares builds of `@n8n/expression-runtime`. Each build is a package
directory with a `dist` folder, for example one from a second checkout of the
base revision. Give each build a label.

```sh
cd packages/quality/efficiency/microbenchmarks/scripts/expression-matrix
BASE=/path/to/base/checkout/packages/@n8n/expression-runtime
NEW=../../../../../@n8n/expression-runtime

node run.mjs /tmp/transfer.vm.jsonl vm transfer base=$BASE new=$NEW
node run.mjs /tmp/transfer.quickjs.jsonl quickjs transfer base=$BASE new=$NEW
ROUNDS=3 node run.mjs /tmp/general.vm.jsonl vm general base=$BASE new=$NEW
ROUNDS=3 node run.mjs /tmp/general.quickjs.jsonl quickjs general base=$BASE new=$NEW

node report.mjs /tmp/transfer.vm.jsonl base new
```

| Matrix     | Cases | Content                                                                                        |
| ---------- | ----- | ---------------------------------------------------------------------------------------------- |
| `transfer` | 106   | Results that the guest builds, and host data with dates, maps, sets, shared objects and cycles |
| `general`  | 690   | 23 data shapes with 30 expressions                                                             |

Each case runs in its own process. In each round every build runs in turn, and
the lowest median is kept. The report lists the cases that moved by more than
10%, the results that differ between the builds, and the guest and host memory.
Run a suspect case again with more rounds before you trust it:

```sh
ROUNDS=9 ONLY='^none guest-numbers-50000$' node run.mjs /tmp/recheck.jsonl vm transfer base=$BASE new=$NEW
```
