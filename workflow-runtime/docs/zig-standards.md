# Zig coding standards for wfrt

The runtime follows the "Zig Coding Standards for AI Agents" (Zig 0.17.0). This file
records how each standard applies to this runtime. It is the reference for every
change to `src/`. `ci.sh` checks the rules that a script can check.

| Standard | What it means for this runtime |
|---|---|
| Allocate at startup, never after | One block sized from config. Permanent storage holds slot tables, region pools, module tables and action buffers. Transient storage holds per-batch scratch, including snapshot copies |
| Running out is a limit, not a crash | A full region, pool or buffer sets an execution status or pushes back on new starts |
| Structs hold numbers and handles | Values are 8-byte words. References are 32-bit offsets within an execution's region. Executions, modules and effects are typed `enum(u32)` handles with generations |
| Struct of arrays | Execution, fibre and effect tables are columnar. Hot columns (status, fuel, region handle) are apart from cold ones (ids, timestamps) |
| Deterministic core, thin shell | `src/core` holds the verifier, interpreter, heap, scheduler and codecs. `src/shell` holds the log, sockets, clock and threads. CI rejects `std.Io` or threads in the core |
| I/O is data | Effects, log appends, timers and replies are actions. Results come back as events |
| One core instance per shard | One shard per CPU core. Cross-shard messages are events |
| Batch is the primitive | The core advances a batch of ready executions per call. Log appends and socket writes happen once per batch |
| No recursion, bounded loops | Workflow calls use an explicit frame stack with a depth cap. The snapshot copy uses an explicit work list. Fuel bounds every loop |
| Validate, then process | A module is verified once at load. The interpreter then has no failure paths except limits |
| Labeled switch for state machines | The interpreter's dispatch loop |
| `extern struct`, little-endian | Bytecode, the value format, snapshots, log records and protocol frames, each with a compile-time size check |
| Zero dependencies | Standard library only, with one approved exception: outbound TLS uses OpenSSL 3, DNS uses c-ares, and the shell calls the C library (libc), which both need (decisions of 2026-11-12). All three stay in `src/shell`; `src/main.zig` calls the C library through `src/shell/sys.zig` |

## Decisions against the standards

- **Per-item work in the interpreter.** Bytecode runs one instruction at a time. The batch unit is the ready execution. The operation-count test (`wfrt bench-counts`) asserts that system calls and log appends are equal for 1 and 1,000 executions.
- **Tagged values.** Registers hold mixed kinds, so a value is a tagged 8-byte word. Heap objects can still be grouped by kind inside a region.
- **OpenSSL 3, c-ares and libc.** See the last row of the table. The C structs of c-ares are written by hand in `dns.zig`, with `comptime` checks of their layout on 64-bit targets.

## Lint and the ratchet

`zig build lint` runs the 52 rules of the standards template (`tools/lint*.zig`, names in `lint-rules`) on `src/`
and `tools/`. `zig build lint -- --list-rules` says what each rule prevents.

The runtime was written before the lint, so `lint-ratchet` holds the known findings of each rule (1,455 on
2026-11-16). The rules are:

- A rule without a line in `lint-ratchet` allows no finding. A plain run prints each such finding.
- A rule with a line may have at most that count. `zig build lint -- --rule <name>` lists its findings.
- When a change fixes findings, lower the line in the same change. Lint fails until the line matches.
- Never raise a line, and never add a `lint-allow` comment (`lint-baseline` is 0). Fix the code.
- New files have no findings.
- Generated files (`aot_gen.zig`, `*_tables.zig`) are read but not reported: fix the generator.

Differences from the template, to remove over time:

- No `limits` and `wire` layers yet: limits are flags in `main.zig`, and formats are in `core` and `shell`.
- System calls are allowed in `src/shell/sys.zig` and `src/shell/uring.zig`. Other shell files still call the
  operating system (rule `shell-syscall`), so there is no simulated kernel for the shell yet.
- The core is flat: the rules for subsystem order and table owners have nothing to check.
- No mutation testing and no instruction-count gate yet.

## Checks for each change

- `./ci.sh precommit` passes before each commit (budget 30 s; all Debug tests 10 s; lint and check 10 s): fmt, lint, check (also for Linux), the lint's
  tests, test-debug.
- `zig build check -Dtarget=x86_64-linux-gnu` after each change to `src/`, on macOS too: the engine runs on Linux.
  `check` compiles the program and the unit tests (step `check-tests`) without a binary, so it finds test code
  that does not compile on Linux. It does not run the tests: `bench/linux-tests.sh` runs them on Linux in Docker.
  Run it after a change to the shell (`src/shell`): sockets, files and undefined memory differ from macOS.
- `./ci.sh merge` passes before a merge (budget 300 s): the above, then test-safe, sim, bench-counts, corpus,
  leak check, growth check (`bench/growth-test.sh`: a shard allocates nothing after startup), rules.
  `CI_NO_BUDGET=1` while parallel agents share the machine.
- `./ci.sh nightly`: the above with 20,000 sim seeds, then every fuzz target (3K runs, more than 30 minutes) and
  the long fuzz run. Run it once after the cards of a round are merged.
- Not met yet: the 1 s edit loop (lint takes 4 s because it reads the 228,000 lines of `aot_gen.zig`), the 2 s
  limit for one test (the runner has no time for each test), and a recorded clean build time.
- No allocation after startup on the fast path. A buffer that grows on demand comes from a pool sized at startup, and when the pool is empty the result is a limit, not an allocation.
- No recursion. Use an explicit stack with a cap.
- Every loop has a bound: fuel, a count or a buffer size.
- Assertions state the invariants at function entry and exit.
- New wire or disk formats are `extern struct` with a `comptime` size check.
- Each fix has a regression test, and each new input parser has a fuzz target.
