# Compiled workflow engine PoC: results

Date: 2026-11-11. Branch: `poc/compiled-workflow-engine`. Not committed.

## Summary

The bet holds for the core loop. A workflow in a TypeScript subset compiles
to bytecode, runs start to finish inside one Zig process with requests
entering and leaving through it, survives a kill at any point, and runs
the same as Node.js on a 20-workflow corpus. Throughput on one core exceeds
the plan's thresholds for glue (W1) and for webhook in, reply out (W2).

Not done: resume of a parked execution on a new workflow version
(criterion 5), and showing a compiled workflow live in the real editor canvas
(criterion 7 is met only as library code and type checks). Two thresholds
are missed: isolation at p99 (criterion 15) and the fallback host is a
single Node.js process (criterion 13 is measured, at about 1:20).

Recommendation: continue to a second phase that builds criterion 5 and the
editor integration, and runs the throughput workloads on a dedicated Linux
machine with NVMe. The interpreter is not the limit, as the plan predicted:
the first bottlenecks found were data-structure costs in the shell and core
(hash-map tombstones, table scans), each fixed in under an hour once the
profiler named it.

## What exists

| Part | Where | State |
|---|---|---|
| Spec: subset, bytecode, module format, fixtures | `packages/@n8n/workflow-lang/docs/spec.md` | Written; changed during the build where the code taught us something |
| Compiler, SDK, reference runner, canvas projection, source map, manifest | `packages/@n8n/workflow-lang/src` | 185 tests pass; typecheck passes |
| Canvas write-back, Tier 1 | `workflow-lang/src/edit` | All six Tier 1 actions |
| Legacy expression import | `workflow-lang/src/legacy` | Coverage below |
| Run-data adapter for the canvas | `workflow-lang/src/canvas/run-data.ts` | Produces `IRunData`; not wired into the editor |
| Node library | `workflow-lang/src/nodes` | HTTP Request native; 7 nodes ported by hand; 9 declarative nodes translated from their descriptions; credentials tool `wfc credentials` (`docs/credential-coverage.md`) |
| Zig runtime: core, shell, simulation, benchmarks | `workflow-runtime/` | `./ci.sh` passes |
| Schedule triggers (cron and n8n intervals, time zones, DST) | SDK `schedule()`, `workflow-runtime/src/core/cron.zig`, `tz.zig`; spec sections 1.4 and 8 | Fires from META with no flags; a slot fires once across crashes; catch-up "once". 0 divergences in 2,000 sim seeds at the default crash rate (23,621 crashes, 20,000 fires) and at 10% (76,142 crashes). Differential test against the `cron` npm package: 5,994 of 6,000 random cases identical over 50 slots; the 6 others are two documented DST quirks of the package |
| Admin API and event stream for n8n (spec 9) | `workflow-runtime/src/shell/admin.zig`, `server.zig`; core events `load_workflow`, `unload_workflow`, `manual` | Load, replace and unload workflows at run time; manual runs with n8n ids; per-workflow credentials; NDJSON event stream with a bounded queue. `bench/admin-test.sh` passes, restart included. The simulation now loads, replaces, replaces back and unloads a workflow and starts every third execution as a manual run: 0 divergences in 1,000 seeds (11,860 crashes) and 300 seeds at 10% (11,372 crashes) |
| `ctx.trace` | SDK, compiler (`TRACE`, opcode 75), reference runner, TS VM, Zig interpreter and core; corpus `23-trace` | Glue only, not logged; output items of glue nodes for the canvas. 23 of 23 corpus workflows identical on Node.js and Zig |
| Fallback host | `packages/@n8n/workflow-fallback-host` | Code steps in `node:vm`; v1 nodes through the Engine v2 shim; Postgres tested on a real database |

## Success criteria

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Kill-anywhere correctness | **Met.** 0 divergences in 10,000 seeds (33,060 crashes), plus 2,000 seeds at a 10% crash rate (21,196 crashes) | `wfrt sim --seeds 10000`. Checks final results and that no effect is applied twice. Corpus is 5 hand-assembled workflows (loop, Promise.all, approval, long wait, try/catch), not the 20 compiled ones |
| 2 | Language fidelity | **Met.** 20 of 20 corpus workflows give identical output on the Zig VM and Node.js | `wfrt corpus` |
| 3 | Human-in-the-loop pause | **Met.** A parked execution holds no region; it resumes in the batch that receives the signal; survives restart | W5, simulation |
| 4 | Retry a failed step | **Met.** 0 re-dispatches of completed steps | `src/shell/retry_test.zig`; simulation |
| 5 | Retry after a fix | **Not built.** The compiler emits resume signatures (SUSPENDS section); the runtime does not yet swap a parked execution to a new module | — |
| 6 | Node tiers | **Met.** HTTP native in Zig. Hand ports: Slack, Google Sheets (read, append, update), Gmail (send), Telegram (send message), Notion (create database page, query database), Airtable (create, search), OpenAI (message a model). Translated mechanically: 9 of 23 declarative nodes, 60 of 211 operations. 53 request-equivalence cases in 15 nodes match requests recorded from the v1 nodes, and give the same result on the Zig runtime. A call that a library node does not support falls back to the v1 node in the fallback host (warning `WL061`). Postgres and Code in the fallback host. W2 and W3 run with no JavaScript process | Corpus 18, 19; `workflow-lang/docs/node-coverage.md`; `src/nodes/__tests__/equivalence.test.ts`; fallback host tests |
| 7 | Canvas view and run | **Partly.** Projections of three reference workflows validate as v1 `INode[]`/`IConnections` against real nodes-base classes; run-data adapter produces `IRunData`. Not shown in the running editor | `workflow-lang` tests |
| 8 | Canvas write-back | **Met** for all Tier 1 actions; untouched source byte-identical | `workflow-lang/src/edit` tests |
| 9 | Glue-only throughput (W1) | **Met.** 268,000/s on one core; 2.45 million/s on 12 threads | `wfrt bench-w1` |
| 10 | Durable throughput | **Measured.** W2 batched 119,000/s, sync 114,000/s, 1,072 log bytes per execution | `bench/run.sh`; macOS fsync, see caveats |
| 11 | Native HTTP throughput | **W2 met:** 163,000/s on one shard. **W3 measured:** 84,000/s at 0 ms; about 5% lower after the full HTTP/1.1 client; over TLS 13% below plain | `bench/run.sh`, `ONLY=w3tls` |
| 12 | Snapshot size | **Measured.** 960 bytes per parked approval execution | W5 |
| 13 | Cost of the JavaScript hop | **Measured.** W4 4,200/s vs W3 84,000/s: about 1:20, against Engine v2's 2,000–3,000 transitions/s | `bench/run.sh` |
| 14 | Limiting factor named | **Met** for every run below | CPU sampled during each run |
| 15 | Isolation under load | **Not met at p99.** p50 220→190 µs; p99 380→530 µs (+39%) beside a 10× flood | W8 below |
| 16 | Legacy expression coverage | **Measured.** 90.9% of occurrences, 84.4% of distinct expressions compile (74.0% and 82.4% before the Date subset) | `workflow-lang/docs/expression-coverage.md`; Date semantics in spec section 4.5 |

## Benchmarks

Machine: Apple M5 Pro (6 performance, 12 efficiency cores), 48 GB, internal
SSD, macOS. ReleaseSafe build. One shard. The load generator and the stub
run on the same machine, on other cores. This is not the dedicated Linux
machine the plan asks for, so treat absolute numbers as indicative.

| Workload | Rate | Latency p50 / p99 | Saturated resource | Log bytes per execution |
|---|---|---|---|---|
| W1 glue, 1 KB, in process, 1 core | 268,000/s | — | CPU (138 instructions per execution) | 0 |
| W1, 12 threads | 2,454,000/s | — | CPU | 0 |
| W2 webhook in/out, none | 162,800/s | 0.64 / 1.66 ms | Shard CPU 98% | 32 (id reservations) |
| W2 batched | 119,200/s | 0.93 / 2.12 ms | Shard CPU 98% | 1,072 |
| W2 sync | 113,900/s | 0.97 / 2.13 ms | Shard CPU 97% | 1,072 |
| W3 + 1 outbound call, stub 0 ms | 84,100/s | 1.51 / 2.73 ms | Shard CPU 99% | 32 |
| W3 after the TLS/DNS client rewrite, stub 0 ms (2026-11-12, loaded machine) | 45,400/s vs W2 92,800/s in the same session: W3/W2 0.49, was 0.52 (about 5% slower; 79,500/s scaled to the run above) | 2.8 / 4.3 ms | Shard CPU 98% | 32 |
| W3 compiled module, http vs https stub (`ONLY=w3tls`, same session) | http 41,700/s, https 36,400/s (TLS costs 13%) | 3.1 / 4.6 ms vs 3.4 / 6.2 ms | Shard CPU 96–98% | 1,209 |
| W3 sync, stub 0 ms | 67,200/s | 1.91 / 3.11 ms | Shard CPU 97% | 1,153 |
| W3, stub 10 ms, 1,024 connections | 74,900/s | 13.0 / 20.7 ms | Shard CPU 98% | — |
| W3, stub 100 ms, 2,048 connections | 19,500/s | 101 / 111 ms | In-flight limit of the load generator (2,048 / 0.1 s); shard CPU 37% | — |
| W4: W3 with the call as a code step in the fallback host | 4,200/s | 27 / 54 ms | The single Node.js host process; shard CPU 5% | 39 |
| W5: park 1,000,000 approvals, then resume | park 273,000/s, resume 232,000/s | — | CPU | Snapshot 960 bytes; index row ~27 bytes; peak RSS 1.36 GB with snapshots in memory |
| W6: loop of 100 effects, answered at once | 1.7 million round trips/s | — | CPU | — |
| W7: W2 with 100 KB bodies, none | 5,600/s (560 MB/s) | 11 / 14 ms | CPU in the JSON decoder | 33 |
| W7 batched | 2,600/s | 27 / 39 ms | CPU, plus 265 MB/s of log writes | 102,600 |
| W8 isolation, normal at 2,000/s paced | solo vs beside flood | p50 220→190 µs, p99 380→530 µs | Shared shard batches | — |
| W8 flood at 20,000/s offered, limit 2,000/s | 2,028/s admitted, 83,600 rejected with 429 | — | Admission at the door | — |

Operation counts: a batch of 1 and a batch of 1,000 executions both make 1
log append and 1 sync (`wfrt bench-counts`).

### What the profiles found

| Finding | Effect | Fix |
|---|---|---|
| Hash-map tombstones from finished executions made every insert probe far | W2 stuck at 88,000/s | Rehash after a fixed number of removals: W2 to 163,000/s |
| Removing a finished execution's pending effects scanned a 131,072-entry table | W3 at 11,700/s | Remove by effect number: W3 to 84,000/s |
| A full region always moved up a size class | Loops with garbage hit the memory limit | Compact within the class first |

## Deviations from the plan

- **Value format.** Snapshots are compacted region bytes and log payloads
  are JSON text. The shared tagged binary format is not built. It was not
  needed: the region copy restores with no pointer fix-up.
- **Path-pruned decoding, pass-through bytes and constant parameters** are
  not built. W7 shows the cost: 100 KB bodies are decoded in full.
- **Shards.** Each shard is a thread with its own listener. On macOS the
  kernel does not spread connections over `SO_REUSEPORT` listeners, so only
  one-shard numbers are reported. There is no cross-shard forwarding of
  resume requests.
- **Snapshots** are held in process memory; the log is the durable record.
  A replay rebuilds them. A log segment is never truncated, and there are no
  checkpoints.
- **Recovery decisions are logged.** Resolving effects in doubt is itself an
  input event, so a second crash replays the same decisions. The simulation
  found this was needed.
- **History.** `finished` records are re-emitted from a replay, because the
  original write may not have happened before the crash. History writes must
  be idempotent by execution id.
- **Schedule triggers.** They differ from n8n's Schedule Trigger in three
  ways (spec 1.4 and 8). A missing second, minute, hour or day is 0 (or day
  1), not n8n's stable pseudo-random value. An interval that does not divide
  its parent unit (every 7 minutes) counts from 1970 in local time, not from
  the last fire. Two DST corner cases of the `cron` package are not copied.
  Each fire is a logged input event, and its batch is synced before any
  action, in every durability tier.
- **Module memory.** A replaced module stays while executions use it and
  is reclaimed in a later batch. When reclamation happens depends on when
  executions finish, and a replay does not repeat that timing. So module
  indices never appear in logged events: schedule events name a module by
  its load number. Near a full module store, a load that succeeded before a
  crash could fail in the replay; the store is sized well above that
  (64 MB, 256 modules in `serve`).
- **Memory at idle.** In safe builds, Zig's `Allocator.alloc` fills new
  memory with 0xAA, so every buffer reserved at start became resident:
  1.2 GB RSS for an idle `wfrt serve`. Large buffers are now reserved with
  `rawAlloc` and touched on use: 32 MB idle, about 160 MB with a 16 MB
  upload in flight. Requests larger than the connection buffer use a small
  pool of large buffers (`--max-request-mb`, default 32 MB).
- **Bug found.** A reply made while reading a request (400, 413, 503) went
  out only when the next batch ran; with no other traffic, the client
  waited for ever. Such replies are now sent after each poll.
- **Bug found.** Compaction scanned every frame slot of a frames block, and
  only the used ones were set. A reused region then exposed closures of an
  earlier execution, and evicting an approval could panic. Frames blocks are
  now cleared when they are allocated. The admin integration test found it.
- **Scheduler.** The runtime runs the lowest-index runnable fibre; the spec
  now says first in, first out. The corpus passes either way; align before
  a phase 2.
- **Zig standards.** Followed in the core: one region pool reserved at
  startup, no allocator in the interpreter, no I/O in the core, no recursion,
  explicit stacks, assertions. Not followed everywhere: the interpreter's
  dispatch function and some shell functions are longer than 60 lines; the
  shell uses a general allocator for snapshots and queued outbound requests;
  there is no explicit SIMD; there are no fuzz targets or Callgrind gates yet.

## CPU per node run and the production mix (one core, M5 Pro)

Measured on 2026-11-12, with process CPU time (`ps`), not wall-clock rates:
macOS cannot pin a process to a core, and the machine was shared. The
setup is `serve --shards 1`, one fallback host with one worker, the local
stubs at 0 ms, and 32 connections from the load generator. Each workload ran
5 times for 10 s after a 3 s warm-up; costs are differences against the
workload with no nodes (`bench/mix/measure.sh`, `workloads.mjs`; raw data in
`bench/mix/results-2026-11-12-m5pro.csv`). The mix comes from the reference
runs of the 1,000 production workflows (`bench/mix/mix.mjs`): 4.52 node runs
and 1.38 items per node run. Per workflow: 1.00 trigger, 1.07 native glue,
0.83 Code, 0.28 HTTP Request, 0.77 library vendor nodes (Google Sheets,
Gmail, Slack, …) and 0.57 other nodes, which run as v1 nodes in the host.

CPU per unit, in µs (median, range over the 5 runs):

| Class | wfrt | Host |
|---|---|---|
| Execution, webhook in and respond out, hand-assembled: none / batched / sync | 6.7 (6.4–6.8) / 6.9 (6.4–7.7) / 7.2 (7.1–7.2) | – |
| Execution, compiled workflow, batched (trigger parse with headers, query, body) | 7.8 (6.8–11.0) | – |
| (a) Native glue node (Set, IF, Filter, Switch, Merge in turn), 1 item / 2 items / at 1.38 items | 0.7 (0.6–0.8) / 1.1 (1.1–1.1) / 0.8 | – |
| (b) HTTP call to the stub, plain / TLS (kept-alive connections) | 8.8 (8.6–9.6) / 11.4 (11.0–12.2) | – |
| (b) Slack library node over TLS (library code, credential, JSON) | 17.1 (13.2–23.6) | – |
| (c) Small Code step (converter wrapper, "all items") | 14.0 (13.3–17.7) | 291 (274–363) |
| (d) v1 node in the host (Set 3.4) | 88 (77–92) | 31,227 (31,106–31,256) |

Per workflow of the mix, on one core:

| Form | CPU per workflow | Workflows/s | Node runs/s |
|---|---|---|---|
| wfrt alone (host CPU not counted) | 87 µs | 11,500 | 52,000 |
| wfrt + host | 18.0 ms | 56 | 250 |
| Every Code node native (counted as 3 glue nodes) | 17.8 ms | 56 | 255 |
| wfrt + host, if a v1 node cost 1 ms in the host | 0.90 ms | 1,100 | 5,000 |
| Code native, and a v1 node at 1 ms | 0.64 ms | 1,550 | 7,000 |

What the numbers say:

* wfrt is not the limit. A typical workflow costs about 87 µs of wfrt CPU,
  mostly the execution itself and the HTTP and vendor calls; glue nodes
  cost under 1 µs. Durability tiers differ by under 0.5 µs of CPU per
  execution (the sync tier's fsync is time waiting, not CPU).
* Before the fix below, the host decided the throughput, and almost all of
  it had one cause: a v1 node step cost about 31 ms of CPU. A profile showed
  that each step made and disposed an isolated-vm V8 isolate for n8n's
  expression sandbox (`IsolatedVmBridge`, `loadVendorLibraries`). That work
  ran on V8's other threads, about 12 busy threads for one host process.

### After the host fix (same day)

The host now keeps one expression isolate for each worker process
(`workflow-fallback-host/src/expression-engine.ts`):

* n8n's native evaluator runs expressions of its subset in the process,
  without an isolate. In the 1,000 workflows, 56% of the host node runs have
  no expression, 31% have only native-subset expressions, and 13% need the
  isolate (`bench/mix/expr-share.mjs`; 80% of all expressions are native).
* The isolate is made when the first expression outside the subset comes,
  and all later steps use it (`sharedCaller`, `lazyAcquire`).
* A step must not change what a later step sees. The sandbox already blocks
  prototypes and the real global object. When the host makes the isolate, it
  removes the legacy `RegExp.$1` match statics, freezes every object that
  the global object reaches, and gives the targets of the sandbox's proxies
  (`Object`, the error classes) fixed getters. A host test checks that
  writes to `Math`, `JSON`, `DateTime`, `Object` and `Error` do not reach the
  next step. All 5,227 distinct expressions of the 1,000 workflows give the
  same result as with n8n's isolate for each execution, except for values
  that depend on the time or on `Math.random`.

The full measurement ran again (`results-2026-11-12-m5pro-host-fix.csv`,
host in the server process). The machine was much busier in this run (load
average 19 to 204). The wfrt costs of unchanged code were 1.6 to 2 times
those of the first run (execution 10.6 against 6.7 µs, plain HTTP 17.8
against 8.8 µs). So read the second run as an upper bound.

| Unit, CPU µs (median, range) | Before | After |
|---|---|---|
| v1 node, native-subset expression: host | 31,227 (31,106–31,256) | 89 (84–110) |
| v1 node, expression in the isolate: host | – | 247 (238–254) |
| Host node run at the 13% isolate share: host | 31,227 | 109 |
| Code step: host | 291 (274–363) | 636 (621–665), load |

| Form, per core | Before: µs per workflow, workflows/s | After (busy machine): µs per workflow, workflows/s |
|---|---|---|
| wfrt alone | 87, 11,500 | 75, 13,400 |
| wfrt + host | 18,004, 56 | 667, 1,500 |
| Every Code node native | 17,752, 56 | 118, 8,500 |

A direct check of the host alone (400 to 2,000 Set frames, one socket) gives
185 µs for each step in the server process and 215 µs with the worker pool
of the next section. A step with an expression outside the subset (a luxon
date) costs 540 to 550 µs in both modes. The pool adds about 30 µs per
step, and the bridge gain stays.

What is left: Code steps cost 0.3 to 0.6 ms in the host, about 0.53 ms per
workflow of the mix. Compiling Code to native steps is now the largest gain
(1,500 to 8,500 workflows/s per core in this run).

Machine and load: Apple M5 Pro, 6 performance and 12 efficiency cores,
48 GB. Load average 6.9 at the start and 17.9 at the end (other agents'
builds and tests); CPU 74–82% idle in the snapshots. A saturated wfrt used
9.7 CPU-s in 10 s, so one thread ran nearly all the time; at the default
QoS macOS most likely ran it on a performance core. The two lower-throughput
repeats of `glue-k1-n0` (7.8 → 11 µs) coincide with the load peak, which
looks like moves to efficiency cores or contention. The host's v1 path is
multi-threaded, so its CPU was spread over many cores.

Main uncertainties:

* The library covers only some operations of Google Sheets, Gmail and Slack
  (`workflow-lang/docs/node-coverage.md`); calls outside them run in the host at the v1
  cost. Counting all of them as native is optimistic.
* The "other" class (0.57 per workflow: RSS, Google Drive, data tables,
  LangChain agents, …) is costed as a v1 Set node; real nodes do more work
  per item, but the measured cost is mostly per-step overhead.
* Schedule triggers (46% of the mix) are costed as webhook executions; a
  schedule fire has no HTTP parse or reply, but its batch is always synced.
* TLS handshakes are amortised by kept-alive connections; one handshake per
  call would add tens of µs.
* The stubs answer at 0 ms. Real latency does not add CPU but keeps more
  executions in memory at once.
* With a slow host, wfrt runs small batches, so its per-step cost (14 µs for
  Code, 88 µs for v1) is higher than when it is saturated.
* The blend is a steady-state figure. Step 3 below measures one cold run
  of each real workflow, which costs much more.

### Step 3: one run of each of the 1,000 compiled workflows

`bench/mix/replay-cpu.mjs` runs the engine-test bed's replay of `sets/1000`
through the gym agent's adapter (6 runs at a time). It samples the CPU time
of the adapter's `wfrt` and fallback host processes (host with the bridge
fix and the worker pool). Compile time (in the replay process) and the gym's
CPU are not counted. Result: 775 exact, 120 structure, 54 status, 49
mismatch, 2 harness errors (`bench/mix/replay-2026-11-12-sets1000.json`).

| Process | CPU for 1,000 runs | Per run | Runs/s per core |
|---|---|---|---|
| wfrt | 2.4 s | 2.4 ms | 420 |
| Fallback host (server and 2 workers) | 25.1 s | 25 ms | 40 |
| Other children of the adapter (short Node.js helpers) | 9.0 s | 9 ms | – |

These figures are 25 to 40 times the blend, and they do not contradict it.
Each replay run is a cold run of a workflow that the engine has not seen:

* wfrt loads and verifies the module (admin PUT), runs it once with trace
  on (every step's data goes out as events), and unloads it. Each vendor
  call opens a new TLS connection to the gym.
* The host loads the code of each node type the first time a worker meets
  it. The real nodes (Google Sheets, Gmail, RSS, LangChain agents) parse the
  gym's real responses, not a 1-item stub.

A long-running deployment runs the same workflows many times, warm, with
connections kept alive. The blend estimates that case. The replay gives the
upper bound for a workflow's first run. To measure the warm case on real
workflows, the next step is to run each bundle many times in one load.

### Warm runs of real workflows

`bench/warm/warm.ts` loads each workflow once into one long-running `wfrt`
(one shard, admin API, keep-alive TLS to the gym) and one fallback host (two
worker processes). Then it runs the workflow 200 times (or for 10 s) with 4
runs in flight. Runs have no trace, as in production. The workflows are an
even sample of the bundles of `sets/1000` that matched the reference exactly
in step 3 (skipped: bundles with data tables, and runs that did not end as
the reference did). The gym tenant is restored once for each bundle; the
gym's responses can repeat. CPU comes from `ps` for `wfrt` and for all host
processes (10 ms resolution, so about 50 µs per run). Compile time and the
gym are not counted. Load average 20 to 30. Results:
`bench/warm/results-2026-11-12-code-{host,native}.json`, summary with
`bench/warm/report.mjs`.

Code steps in the host (as today), 112 workflows, 22,216 runs, 3.34 node
runs per run:

| CPU µs | p50 | p90 | p99 | Mean (each workflow once) |
|---|---|---|---|---|
| Per run: wfrt | 250 | 550 | 2,350 | 329 |
| Per run: host | 1,350 | 6,600 | 30,400 | 3,138 |
| Per run: total | 2,050 | 6,950 | 31,600 | 3,467 |
| Per node run: wfrt | 83 | 167 | 833 | 99 |
| Per node run: host | 433 | 2,525 | 7,600 | 940 |
| Per node run: total | 525 | 2,625 | 7,900 | 1,038 |

Per core at the mean: 288 workflows/s, 960 node runs/s. wfrt alone: 3,000
workflows/s.

With the native Code path that is in the tree (`codeNodes: 'native'`), 99
workflows: total per run p50 700, p90 8,250, p99 43,125, mean 3,360 µs;
298 workflows/s per core. On the 99 workflows that both runs have, a
workflow with Code steps costs at the median 0.65 times as much as with
Code in the host. The mean changes little (3,500 to 3,360 µs), because the
mean comes from a few workflows with heavy v1 nodes.

Compared with the blend:

* wfrt: 330 µs per run against 75 to 87 µs in the blend. The blend has no
  admin API and no event stream. Here n8n's side drives each run: a POST
  for each run, and `started`, step and `finished` events for each step.
  The vendor calls also carry real payloads.
* Host: 3.1 ms per run against 0.6 ms in the blend. The blend costed every
  v1 node as a Set node with one item (89 µs). Real v1 nodes on real gym
  responses cost milliseconds: the six heaviest workflows (10 to 33 ms per
  run) use Gmail "get many", Google Drive, Google Calendar, RSS feeds and
  Telegram. The library covers only some operations of these nodes, so the
  rest run as v1 nodes.
* So for warm runs of real workflows, plan with about 3.5 ms of CPU per
  workflow run (290 per second per core), and about 1 ms per node run. The
  median workflow is much cheaper (2 ms; 0.7 ms with native Code). The way
  to raise the mean is to move the heavy vendor operations (Gmail, Drive,
  Calendar, RSS) into the library, not more work in wfrt.

### Warm runs after the integration and library work

Same sample, same driver and same settings as above, after the changes
below (`bench/warm/results-2026-11-12b-code-{host,native}.json`). Load
average 20 to 30 again. Paired on the workflows that both runs have:

| Code steps | Workflows | wfrt mean | Host mean | Total mean | Total p50 | Total p90 |
|---|---|---|---|---|---|---|
| In the host, before | 102 | 344 | 3,213 | 3,557 | 1,950 | 7,600 |
| In the host, after | 102 | 292 | 2,921 | 3,214 | 1,500 | 6,950 |
| Native, before | 99 | 338 | 3,022 | 3,360 | 700 | 8,250 |
| Native, after | 99 | 291 | 2,605 | 2,896 | 650 | 8,300 |

(CPU µs per run.) All workflows of the new runs, each once: with Code in the
host 3,285 µs per run, 304 workflows/s and 1,030 node runs/s per core
(p50 1,500, p90 7,150 µs); with native Code 3,043 µs, 329 workflows/s and
1,110 node runs/s (p50 1,000, p90 8,300 µs).

**Where wfrt's 330 µs went** (`bench/warm/admin-cost.mjs`, `sample` of the
`wfrt` process during warm runs of single workflows):

* The integration path is small. A run through the admin API costs about 11
  µs more than through a webhook (27 against 16 µs for a workflow with only
  a trigger). A client on the event stream adds 0 to 5%.
* The real payloads cost the most, through three quadratic patterns in
  string code: `charCodeAt(i)` and `charAt(i)` scanned the string from its
  start each time, `.length` of a module constant counted its UTF-16 units
  each time, and the Gmail node built its base64 with `out += c`. A Gmail
  send of an HTML email cost 14.6 ms of wfrt CPU per run.

Changes:

* Core: ASCII strings index their bytes directly; `charCodeAt` on other
  strings goes on from the last position it found (a cache in the Vm, which
  the core makes again after it moves a region); the UTF-16 length of the
  last module constant is cached. Corpus case 26 checks the results against
  the reference runner for ASCII, multi-byte and astral text.
* Gmail library node: base64 through a list and one `join`. The Gmail send
  above went from 14.6 to 4.2 ms. The rest is interpreted UTF-8 and base64
  code; a native helper would remove it.
* Events: executions that nobody watches send `started` and `finished`, a
  `failed` step event and `waiting` events, and no other step events. Trace,
  `saveData` and a subscription watch an execution. `--step-events-sample N`
  sends all step events of 1 in N other executions (spec 9.2).
* Library nodes with request-equivalence tests against v1 and a gym check:
  Gmail `message.getAll` and `message.get` (with `simple` on), Google Drive
  `fileFolder.search`, Google Calendar `event.getAll` (version 1.3). A new
  `name=value` form in `supports` sends Gmail calls with `simple` off to the
  host, and older node versions also go to the host. In the gym check, the
  77 bundles of `sets/1000` with these operations got 62 exact matches. That
  includes all 47 that were exact before, so no bundle got worse.
* Not done: RSS Feed Read. The node parses the feed's XML (rss-parser). In
  interpreted library code that would cost more than the host does now; it
  needs a native XML parser in wfrt first. Gmail with `simple` off parses
  MIME (mailparser) and stays in the host for the same reason. Telegram
  stays with the gym agent.

What is left: the host still gives 85 to 90% of the CPU. It comes from v1
nodes that run in the host: RSS feeds, Gmail with `simple` off, Drive
download and move, LangChain agents and Telegram. The gain of the four
ported operations is real, but small in the mean (10 to 14%), because the
sample has few runs of them and many runs of the others.

### Warm runs after the string builder, native codecs and the XML parser

Same sample and settings (`bench/warm/results-2026-11-12c-code-{host,native}.json`),
load average 35 to 45 (higher than before, so host CPU is noisier).

| Code steps | CPU µs per run: p50 / p90 / p99 / mean | Per node run: p50 / p90 / mix-weighted | Workflows/s per core | Node runs/s |
|---|---|---|---|---|
| In the host | 1,800 / 8,950 / 25,650 / 3,537 | 533 / 2,875 / 1,046 | 283 | 956 |
| Native | 600 / 8,750 / 21,875 / 2,883 | 175 / 3,175 / 853 | 347 | 1,173 |

wfrt alone: mean 299 to 312 µs per run (3,200 to 3,350 workflows/s), and its
p99 went from 2,350 to 1,300 µs: the long string loops of library nodes are
gone. On the workflows that both runs have, wfrt's mean went from 357 to 312
µs (Code in the host) and 338 to 289 µs (native Code); the total with native
Code went from 3,360 to 2,837 µs. The host still gives about 90% of the CPU.
The ported RSS node runs in few workflows of the sample, and most of its gym
runs end at once with a DNS error, so it moves the mean little.

The changes:

* **String builder (core).** `s + x` with a long result goes to a string
  buffer object in the region (`StrBuf`); a `StrRef` is a prefix of it. An
  append to the longest string of a buffer writes in place, so `s += x` in a
  loop is linear. Strings stay immutable: an older, shorter string keeps its
  length, and an append to it takes a new buffer. Compaction copies buffers
  and keeps them shared. Corpus 28 builds 1 MiB with 65,536 appends: 0.02 s
  now; before, the execution ended with `limit` (out of region memory).
* **Native codecs:** `btoa`, `atob`, `encodeURIComponent`,
  `decodeURIComponent`, `escape`, `unescape` (spec 4.3), with the errors of
  JavaScript. Gmail, Google Sheets and Google Calendar use them. Corpus 29
  and a fuzz target (round trips).
* **XML parser (core):** a port of the sax 1.2.4 state machine with
  xml2js 0.5's object building, no recursion (stack cap 256), the sax and
  HTML entity tables generated from the libraries (`gen_xmlent.mjs`),
  `XML.parse`, `XML.snippet`, `XML.content`. Corpus 30 compares it with the
  JavaScript libraries on feeds, entities, CDATA, white space and 14 error
  messages; a fuzz target runs it with the helpers.
* **RSS Feed Read (library node, version 1.2):** RSS 2.0, Atom, RSS 1.0,
  0.9 and podcasts, as rss-parser builds the items; 4 request-equivalence
  cases against v1, corpus 31 on the runtime, and the gym: the 7 bundles of
  `sets/1000` with RSS nodes got 6 exact matches, as before (one was not
  exact before either). Request failures give the messages v1 gives (n8n's
  descriptions of Node.js error codes).

### Host CPU by node type and operation

The warm sample again (Code steps in the host), with a step profile in the
host: each worker records the CPU time of its process from the step message
to the result message (`WF_FALLBACK_STEP_PROFILE`,
`fallback-host/src/step-profile.ts`). One run in flight (`--conc 1`), so
no step overlapped another in a worker. 106 workflows, 100 runs each,
14,069 steps; host CPU 3,871 µs per run on average. Each workflow counts
once, as in the production mix. Results:
`bench/warm/results-2026-11-12d-profile.json`; table:
`node bench/warm/host-profile.mjs <warm.json> <steps-dir> --markdown`.

80.3% of the host CPU is inside steps. The other 19.7% is the server
process, IPC framing and worker time between steps.

| # | Step (node type and resource.operation) | Share of host CPU | Cumulative | CPU per step (µs) | Workflows in sample |
|---|---|---|---|---|---|
| 1 | Code (JavaScript) | 24.4% | 24.4% | 1,027 | 48 |
| 2 | googleCalendar getAll (resource left at its default) | 7.3% | 31.7% | 5,974 | 3 |
| 3 | rssFeedRead (in the host: not the library form) | 5.2% | 36.9% | 1,788 | 1 |
| 4 | gmail message.getAll | 4.4% | 41.3% | 18,065 | 1 |
| 5 | gmailTrigger (poll) | 4.0% | 45.2% | 8,117 | 2 |
| 6 | gmail getAll (resource left at its default) | 3.5% | 48.8% | 7,259 | 2 |
| 7 | slack (resource and operation left at their defaults) | 3.5% | 52.3% | 4,813 | 3 |
| 8 | googleSheets append | 3.4% | 55.7% | 14,010 | 1 |
| 9 | telegram sendPhoto | 3.4% | 59.1% | 14,005 | 1 |
| 10 | slack message.post | 2.5% | 61.6% | 5,111 | 2 |
| 11 | googleSheetsTrigger (poll) | 2.4% | 64.0% | 9,703 | 1 |
| 12 | Compiled schedule item (`n8n-compiled.schedule`) | 2.3% | 66.3% | 236 | 40 |
| 13 | hubspot deal.search | 2.3% | 68.5% | 4,625 | 2 |
| 14 | filter (host expressions) | 2.0% | 70.5% | 2,742 | 3 |
| 15 | googleCalendar event.getAll | 1.8% | 72.3% | 7,383 | 1 |
| 16 | microsoftOutlook | 1.5% | 73.8% | 5,975 | 1 |
| 17 | httpRequest | 1.3% | 75.1% | 5,338 | 1 |
| 18 | googleDrive folder | 1.2% | 76.3% | 4,978 | 1 |
| 19 | lc.openAi | 1.2% | 77.4% | 4,724 | 1 |
| 20 | slack channel.join | 1.1% | 78.6% | 4,587 | 1 |
| 21 | jira getAll | 1.1% | 79.6% | 4,339 | 1 |
| 22 | set | 0.5% | 80.1% | 1,967 | 1 |
| 23 | html | 0.1% | 80.2% | 561 | 1 |
| 24 | if | 0.1% | 80.3% | 442 | 1 |
| — | Host outside steps | 19.7% | 100% | — | — |

Reading the table:

* Code steps are the largest item (24%); native Code removes most of it.
* The rest is a long tail of v1 nodes, each in 1 to 6 workflows of the
  sample. A share from one workflow is uncertain: the sample has about 110
  workflows, so one workflow is about 1% of the mix.
* The best ports by share per effort: Google Calendar getAll and Gmail
  getAll in the forms that still run in the host (together 17%), Slack
  message post (6%), the Gmail and Sheets poll triggers
  (6%), and the compiled schedule item: 236 µs per step, but in 40 of the
  workflows (2.3%). It is a step the converter adds (`scheduleItem: 'v1'`),
  so it can move into the runtime.
* 20% outside steps is a fixed cost per host step (framing, IPC, the
  worker's event loop). Fewer host steps lower it too.

### Workflow static data

n8n keeps `$getWorkflowStaticData` between production runs. Poll triggers
keep their cursor there, and Code nodes use it for deduplication. Before
this change, both native Code and host Code started each run with an empty
document, which is wrong for production workflows. The runtime now keeps
the data as v1 does (spec 9.7):

* One document for each workflow, in a table that is reserved at startup
  (`--max-static-data`, `--static-data-kb`).
* A run captures the document at its start. A run that ends `ok` or
  `error` commits its changes, and the last writer wins. Manual runs and
  cancelled runs do not commit.
* The commits of a batch apply at its end. They are written to the log in
  the same record, so a replay gives the same table, also for runs of the
  `none` tier.
* `ctx.staticData(type, node)` gives the objects in compiled code.
* Host steps with `staticData: true` get the document in the frame and send
  back a changed one. The host serves `Workflow.getStaticData` from the
  step's document, so v1 nodes and poll triggers work unchanged.
* n8n gets each commit on the event stream (`staticData`), reads the
  document with `GET /_admin/workflows/<id>/static-data`, and sends its copy
  with `PUT /_admin/workflows`.
* Tests:
  * corpus 33 (wfrt and the reference runner agree);
  * a shard test: load, commits, manual and failed runs, a host step,
    reload, replay, limits;
  * a table unit test;
  * 4 host tests.

Not done here:

* the n8n side that stores the events (packages/cli);
* the native Code helper `staticDataOf` (code-native, which can now call
  `ctx.staticData`);
* native polling (spec 9.8).

### Cloud benchmark kit

`bench/cloud/` builds and runs the benchmark on a fresh Linux VM
(`bench/cloud/README.md`):

* `pack.sh` packs the working tree without customer-derived files.
* `setup.sh` downloads Zig 0.17.0 and checks its SHA-256, then builds
  `wfrt` (ReleaseSafe), the workspace and the host.
* `run.sh` records the machine and runs W1 to W7 across shard counts. It
  then runs a synthetic mix of 15 hand-written workflows, warm and under
  load, across shard and host worker counts, and writes `results.csv` and
  `summary.md`.

The synthetic mix follows the node mix of `sets/1000` (3.3 node runs per
run). On the M5 Pro, its CPU per run is close to that of the real
workflows:

| Code steps | Set | CPU per run, µs: p50 / p90 / p99 / mean |
|---|---|---|
| In the host | Real | 1,800 / 8,950 / 25,650 / 3,537 |
| In the host | Synthetic | 1,281 / 13,103 / 16,749 / 3,226 |
| Native | Real | 600 / 8,750 / 21,875 / 2,883 |
| Native | Synthetic | 148 / 14,089 / 15,813 / 2,381 |

The dry run on the Linux box (AMD EPYC 7B12, 16 vCPU, a shared GCP VM, nice
10, `run.sh --quick`) went end to end in about 2.5 minutes after the build.
The build took 4.5 minutes for the install and 1 minute for turbo.

* **Synthetic warm, Code steps in the host:** 6,279 and 8,297 µs per run
  (mean) in two quick runs of 60 runs each. That is 1.9 to 2.6 times the M5
  Pro value for the same set, which is the per-core speed difference of the
  two CPUs plus the noise of a shared machine.
* **Mix:** 219 workflows/s with 1 host worker and 460/s with 2. The host
  used 1.3 and 2.4 cores. A second shard changed nothing, because the host
  limits the rate.
* **W2 and W3:** the load generator on the 4 aux cores is the limit (W2 used
  0.53 of a shard core). Use a second VM (`LOADGEN_SSH`) for the cloud run.

Running the kit found three faults, all fixed:

* The admin API needs one shard per process, so `engine.ts` starts one
  `wfrt` process for each shard on a shared port (SO_REUSEPORT).
* The host keyed steps by frame id, and two `wfrt` processes reuse ids. The
  host now makes ids unique for each connection.
* With mawk, a process that ended while `/proc` was being read stopped the
  CPU sum.

### CPU per run: first round toward 100k workflows/s per core

Measured on the M5 Pro under load, in instructions retired by the `wfrt`
process (`/usr/bin/time -l`; for the mix, `bench/perf/rusage.c` through the
engine's `/cpu`). On a loaded machine the instruction count moves far less
than the time.

- `bench/perf/cpu.sh`: W2 and W3.
- `bench/perf/mix-ab.sh`: the synthetic mix with native Code, A/B between
  binaries, one after the other.

| Change | W2 instr/req | W3 instr/req | Mix instr/run | Mix CPU µs/run |
|---|---|---|---|---|
| Start of the round | 82,000 | 159,000 | 2.77 M | 293 |
| Ids of the `none` tier reserved in blocks of 65,536 (no log record per request); no second `read` that returns EAGAIN after a short read; no 0xAA fill of large stack buffers in the JSON and query code | 77,700 | 151,400 | – | – |
| Log records buffered until the sync (one `write` per 5 ms, not per batch) | – | – | −1.6% (cycles −7%) | – |
| JSON strings scanned 16 bytes at a time (decode and encode) | – | – | 2.61 M | 297 |
| `pending` map rehashed on its own schedule; property keys compared by value, then length, then bytes; integer `%`; simple instructions in `fastRun` | – | – | 2.27 M → 2.13 M | 274 → 238 |
| Record and snapshot checksums XXH3 in place of CRC-32 (log format `LOG2`, snapshot version 2) | – | – | (in the row above) | – |
| Decoded object keys from a small key cache; ASCII strings without a second UTF-16 pass | **68,800** | **139,300** | **2.04 M** | **234** |

Totals:

- W2 −16% and W3 −12% in instructions.
- The synthetic mix −26% in instructions, −20% in cycles, and 293 → 234 µs
  of wfrt CPU per run.

Microbenchmarks from the same round:

| Benchmark | Instructions before | After |
|---|---|---|
| W1 glue | 126,000 per execution | 86,000 |
| Object-building loop | 1.04 G | 0.44 G |
| JSON parse and stringify of 7.4 KB | 2.21 G | 1.89 G |

Where the time goes now:

- **W2 and W3 on macOS:** the kernel takes 71–74% of the CPU (loopback TCP
  `read` and `sendto`), as the floor model says. User time per request is
  about 2.5 µs (W2) and 6 µs (W3) under load.
- **On Linux:** the remaining lever is fewer system calls per request
  (`docs/io-uring-design.md`).
- **The mix:** in a profile taken partway through this round, the interpreter
  dispatch was about 19% of wfrt CPU, JSON about 19%, log writes and syncs
  about 18%, and socket system calls about 11%. The next steps are in
  `docs/aot-design.md`: hand-written natives for the hot library
  operations, then superinstructions and inline caches, then
  ahead-of-time compilation.

The log write buffering changes one failure case:

- **Before:** a crash of the process kept the records written since the last
  sync, because they were already in the page cache.
- **Now:** a crash of the process loses them, as a crash of the machine
  always did. The window is at most `batched_sync_ms` (5 ms). The `sync`
  tier still writes and syncs before it replies.

Tests: unit tests (Debug), corpus 33 of 33 and the simulation (300 seeds, 0
divergent). These ran in a private copy of the tree with the earlier egress
files, while the egress agent's work in progress kept the shared tree from
building.

### W3 single-core result: above 100,000 workflows/s

Date: 2026-11-13. W3 is a webhook in, one outbound HTTP/2-over-TLS call to a
stub that answers after 100 ms, and the reply. On one pinned Linux core,
`wfrt` runs W3 at 106,000 to 116,000 workflows per second, with 0 errors
and 8.6 to 9.4 µs of `wfrt` CPU per workflow.

Setup:

| Item | Value |
|---|---|
| Machine | research-operator, AMD EPYC 7B12 (Zen 2), GCP VM |
| `wfrt serve` | vCPU 7, `--shards 1`; vCPU 15, its SMT sibling, idle |
| Stub (`wfrt stub --h2`, TLS, 100 ms) | vCPUs 4 and 12 |
| Load generator (`wfrt load`, 32 requests per connection) | vCPUs 5 and 13 |
| Executions in flight | 30,000 to 60,000 |
| Workflow | `bench/egress-load/w3.ts`, with the stub URL changed to `https` |

Commands (on research-operator):

```bash
# From the Mac: copy the sources, then build on the machine.
rsync -a --delete --exclude zig-out --exclude .zig-cache \
  src build.zig build.zig.zon research-operator:wfrt-proof/
# On the machine: one run per in-flight count.
INFLIGHT_LIST="30000 60000" ~/wfrt-proof/proof.sh
```

`proof.sh` starts the stub and `wfrt serve` with `taskset`. It warms up for
8 s, and then reads the CPU time of `wfrt` from `/proc/<pid>/stat` over 10 s.
The CPU per workflow is that CPU time divided by the requests in the same
window.

Results (four runs):

| Run | Workflows/s | Errors | wfrt CPU per workflow |
|---|---|---|---|
| 1 | 106,000 | 0 | 8.6–9.4 µs |
| 2 | 113,000 | 0 | 8.6–9.4 µs |
| 3 | 116,000 | 0 | 8.6–9.4 µs |
| 4 | 112,000 | 0 | 8.6–9.4 µs |

Pinning: `/proc` showed both `wfrt` threads on vCPU 7
only. The process used exactly 100% of one core. The rate is therefore
the rate of one core.

#### The regression and its fix

Before this run, the same setup gave 93,300/s (10.7 µs per workflow). One
change in the core (`exec_index.zig`, a table from execution id to slot)
then made the cost grow with the executions in flight:

| In flight | Workflows/s | µs per workflow |
|---|---|---|
| 30,000 | 41,000 | 24.4 |
| 60,000 | 26,700 | 37.5 |

`perf` put 77.6% of all CPU in `core.releaseSlot`. The cause:

- Execution ids come from a counter. The ids of live executions are
  therefore one long run of full entries in the table, each at its home.
- The table used plain linear probing with backward-shift deletion. A
  removal scanned forward to the first empty entry, which is at the end of
  the run. Each finished execution cost a scan over all the executions in
  flight.

The fix (`src/core/exec_index.zig`):

- Robin Hood order: an insert takes the place of an entry that is closer to
  its home, so each entry is at most as far from home as the entries
  before it.
- A removal moves the next entries back by one, and stops at the first
  empty entry or at the first entry that is at its home. For sequential
  ids, that is the next entry.
- A lookup that misses stops at the first entry that is closer to its
  home than the probe.
- A regression test keeps 60,000 sequential ids live and replaces the
  oldest one 100,000 times, with wrap-around. It requires at most 4 probes
  per operation on average. A second test checks collisions and
  wrap-around.

W3 on the Mac (h2 and TLS, stub at 100 ms, instructions per request of the
`wfrt` process, `/usr/bin/time -l`):

| In flight | Before the fix | After the fix |
|---|---|---|
| 5,000 | 128,000 | 62,000 |
| 10,000 | 171,000 | 62,000 |
| 60,000 | 346,000 | 58,000 |

After the fix, the cost per request no longer grows with the executions in
flight.

#### Result members that the code never reads

These changes landed with the fix or after it. The Linux runs above
include none of them:

- The compiler now proves, for each `ctx.http` call in a workflow, whether
  any code can read `headers` or `body` of its result. Before, it proved it
  only for the `ctx.http` calls of library nodes, so the W3 module decoded
  every response header. Each step gets the flag `result headers unread` or
  `result body unread` (step flags 1 and 2). The rules are the same as for
  headers: only property reads of other members, or a `const` binding used
  only that way.
- The core then skips the decode of what is never read. The shell does not
  write the headers as JSON, and does not copy an unread body. An execution
  that keeps its data (`trace`, `saveData`) still decodes everything,
  because its step events hold the whole result.

| W3 on the Mac, 5,000 in flight | Instructions per request |
|---|---|
| After the `exec_index` fix | 60,600 |
| Headers and body flags in the core | 57,500–58,000 |
| The shell also skips the unread members | 55,900–56,500 |

## Failure isolation of the fallback host

One step that fails badly must not stop the host or other executions. The
full model is in `packages/@n8n/workflow-fallback-host/README.md`. In short:

* A supervisor process starts the host server process again when it stops.
  The server process runs steps on worker processes (`--workers`, default
  2). Processes, not threads: a SIGKILL or a native crash stops only one
  worker. A worker thread with isolated-vm stopped the whole process with a
  native assertion when the pool terminated it.
* In a worker, each step has its own async context. A late rejection or a
  throw from a timer fails its step while that step runs. After the step
  has ended, the worker only logs it. `process.exit`, `process.abort` and
  `process.kill` of the own process throw in the step.
* Limits: a wall-clock limit for each step (300 s), a CPU guard (a worker
  that does not answer pings for 30 s is stopped), and a heap limit for each
  worker (4 GB).
* A worker that stopped with one step in it blames that step. With more
  steps, each one runs again alone on a new worker, and only the step that
  stops its worker again fails. So a step can run twice (at least once, as
  after a crash of wfrt).
* wfrt fails each step of a lost host connection with a retryable error. A
  host that reads nothing for 30 s counts as lost. wfrt fails new host steps
  at once while no host is connected, and connects again every 500 ms. The
  table of host steps in flight has a size that is set at startup (65,536).
  A full table is a retryable limit error. The failed steps follow the
  step's retry setting, or the execution goes to `needs_attention` (with a
  `failed` step event first), where an operator retry sends the step again.
* The wfrt side of the host link allocates nothing after startup. The read
  and write buffers are 64 MiB of reserved virtual memory each, and frames
  are written there with bounded appends. Credentials are copied as raw JSON
  from the credentials document, so no step serializes JSON. A frame that
  does not fit, or a step name that is too long, fails its step with a limit
  error. It does not stop the shard. All frames of a batch go out in one
  write after the batch.
* No result is dropped. Inbound requests and host frames leave room in the
  event queue for one result of each outbound HTTP request in flight. Host
  frames that do not fit wait in the read buffer until the next batch, and
  host failures wait in their own queue. A host frame larger than the read
  buffer ends the connection, so its steps fail with a retryable error and
  do not hang. A result larger than the batch memory fails its step.

Tests:

* `chaos.e2e.test.ts` (host) runs each failure with 6 healthy steps on two
  workers: a synchronous throw, a rejection after the return, a timer that
  throws after the step ended, an endless loop, out of memory,
  `process.exit`, `process.abort`, a SIGKILL that stands for a native crash,
  an open socket and a request that never gets an answer. Only the faulty
  step fails each time.
* `bench/chaos-test.sh` (end to end) runs 5 of these failures, each with 20
  healthy webhook executions at the same time: all 100 healthy executions
  finish. A 3 MiB host result arrives (the old read buffer of 1 MiB made
  wfrt spin). A step name that is too long for a frame fails only its
  execution, and the shard goes on. Then the test kills the host server
  process while 10 executions run. All 10 end with `needs_attention`
  (retryable) and none hangs. The 20 executions after the restart finish.
  Then the test stops the whole host. A new execution ends at once (8 ms),
  and after the host comes back, 20 of 20 finish.

* Recycling: a worker takes no new steps after 20,000 steps or 1,536 MB
  of resident memory. A new worker takes its place, and the old one stops
  when its last step ends. `soak.e2e.test.ts` runs 6,000 mixed steps (Code,
  native-subset expressions, isolate expressions with a new text each time)
  on one worker. The heap after a full GC went from 54 to 53 MB, and the
  resident memory from 311 to 320 MB. So the reused isolate keeps no state
  of a step. The growth seen in long gym replays (75 to 226 MB) matches the
  code of more node types that the workers load, not a leak for each step.
  The recycling limit is the backstop.

Cost: about 30 µs of CPU for each step (the IPC message), measured above.

## wfrt fixes from the gym runs

* A step that failed outside a try block sent `finished` /
  `needs_attention` without a `step` event with `status: "failed"`, so its
  error was lost. The core now sends the `failed` event, with the error
  when the execution has data, before the attention event (test in
  `retry_test.zig`).
* A parked execution, also one that needs attention, keeps its workflow
  version loaded. The module table had 256 entries and the gym filled it.
  Serve now has `--max-modules` (default 1,024) and `--module-store-mb`
  (default 256 MB of virtual memory). A full table or store answers 507 and
  names the limit and the way out: end the old executions or raise the
  limit (README, test in `workflow_test.zig`).
* `--gym-env` kept only 128 `GYM_HOSTS` patterns and dropped the rest
  without a warning. The gym has 367. The patterns now stay as the
  environment string, with no limit (test in `gym.zig`).

## Fuzzing and memory safety

Fifteen fuzz targets (`zig build fuzz`, Zig's built-in fuzzer) cover the
module verifier and interpreter, JSON, HTTP and chunked decoding,
multipart and webhook bodies, URLs and queries, log recovery, admin bodies,
TZif and cron, credential templates, and the core as a state machine with
crashes and replay. Safe builds poison released pool memory (regions,
arenas, connection and large buffers) and check region ownership after each
batch. `ci.sh` runs each target for 3,000 iterations and checks a Debug
`serve` for leaks at shutdown. Each target ran for 10 minutes or more
(`bench/fuzz-long.sh`). On Linux, Valgrind memcheck passes on the unit
tests, the sim and the corpus, and the thread sanitizer reports nothing for
4 shards under load.

Bugs found and fixed, each with a regression test:

| Bug | Found by | Root cause |
|---|---|---|
| A finished execution could run again, and its slot be free and in use | Module fuzzer, poisoned regions | `runReady` marked every ready-list entry parked, also an entry whose execution a later event in the batch had finished |
| An operator retry after `needs_attention` never went out | Pool poisoning | The eviction snapshot was written inside a scratch temp that `effectResult` then released |
| JOIN of a value that is not a fibre id crashed the shard | Module fuzzer | The ids come from a register and were not checked |
| `run` with captures read the execution root as a closure | Module fuzzer (verifier gap) | `run` starts with no closure; the verifier now rejects captures there |
| JSON text with invalid UTF-8 gave invalid JSON out | JSON fuzzer | The decoder kept the bytes; it now gives U+FFFD, as Node.js |
| Webhook text, form and multipart bodies with invalid UTF-8 gave an invalid trigger | Webhook body fuzzer | As above, for request text |
| A request line with no method was accepted | HTTP fuzzer | The parser allowed an empty method |
| `serve` without `--log-dir` read an undefined field at shutdown | Leak check | `create` skips field defaults |

Limits found in the tools: Zig 0.17's fuzzer works on one test of a binary
at a time, so each target runs on its own (`-Dfuzz-filter`); parallel
fuzzers in one cache race on its files; and a saved failing input cannot be
replayed as a seed. Valgrind needs a baseline-CPU build, and rejects the
address hints of Zig's page allocator after an unmap, so the sim runs under
Valgrind without crashes.

## Risks seen in practice

- **Scope.** Native outbound HTTP now has TLS (OpenSSL 3), DNS (c-ares,
  IPv4 and IPv6, TTL cache), chunked and close-delimited bodies up to 16 MB,
  redirects, timeouts and credential injection (`bench/egress-test.sh`).
  HTTP/2, proxies, decompression and TLS session resumption are not built.
  Inbound TLS still needs a proxy.
- **JavaScript fidelity.** It held, but only with care: UTF-16 string
  indexing, lone surrogates (stored as WTF-8), exact `toFixed` rounding,
  `$&` replacement patterns and `ß` upper-casing each needed a fix to match
  Node.js.
- **The fallback host** is one process per connection. To approach native
  rates, the runtime must spread requests over several host connections.
- **Expressions.** A Date subset (spec section 4.5) lifted coverage from
  74.0% to 90.9% of occurrences. A Date is a number at run time, so the
  compiler rejects uses where object identity matters (`WL013`). The
  runtime ports the V8 date parser; 3,600 random dates and strings per
  category match Node.js. The largest gaps now are `$('…')` forms other
  than `.item.json`, `$fromAI` and Luxon (`$now.toFormat`).

## Open questions answered

- *Does the Engine v2 shim separate cleanly enough for the fallback host?*
  Yes. `V1StepExecutor` in `packages/@n8n/node-engine-compatibility` depends
  only on `@n8n/engine`, `n8n-core`, `n8n-workflow` and `uuid`, and takes
  its dependencies through `V1StepExecutorDeps`. Postgres runs through it.
- *Should glue support regular expressions?* Not built; the corpus did not
  need them.

## Next steps

0. n8n integration gaps: the admin API needs one shard; events not yet sent
   are lost in a crash (a `finished` from a replay is not sent again); the
   SDK webhook options have no `webhookId` (dynamic paths then have no id
   segment) and `WebhookEvent` has no `params`; old credential documents
   are kept in memory after a replacement.

1. Resume on a new version (criterion 5): swap a parked execution's module
   when the resume signature matches, and refuse with the changed variable
   otherwise.
2. Wire the projection and run-data adapter into the editor behind a flag
   (criterion 7), and check with builders whether edges that cannot be
   dragged are acceptable.
3. Run all workloads on a dedicated Linux machine with NVMe, with `fsync`
   that reaches the device and with several shards.
4. Path-pruned decoding (W7), several fallback host connections (W4), and
   per-route batch fairness (W8 p99).
5. Fuzz targets for the verifier, JSON decoder, snapshot restore and log
   reader; Callgrind instruction-count gates.
