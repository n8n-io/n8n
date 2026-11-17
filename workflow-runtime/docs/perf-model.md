# The performance model

The target is 100,000 workflows each second on one executor core: 10 µs for one workflow, which is 22,500 cycles
at 2.25 GHz. A sampled profile shows which functions are slow. It does not show which memory accesses, which data
layout, or which bytecode cause the time. The performance model answers those questions with counts. The benchmark
machine has no hardware counters, so the runtime counts for itself.

## 1. The instrumented build

`zig build -Drelease=true -Dperf-model=true` sets the build option `perf_model`. `src/core/mem.zig` reads it at
compile time. The core states each read and write of its data structures through `mem.zig`:

| Function | Meaning |
|---|---|
| `mem.rd(probe, structure, site, ptr, len)`, `mem.wr(...)` | A read or a write of `len` bytes |
| `mem.rdSlice`, `mem.wrSlice` | The same for the items of a slice |
| `mem.rdHeader(probe, structure, site, ptr, size)` | One load that reaches a header; its other words cost nothing |
| `mem.load(probe, structure, site, ptr)`, `mem.store(..., ptr, v)` | A load or a store that the layer also does |
| `mem.instr(probe, module, ins, code, regs)` | The interpreter starts one bytecode instruction |
| `mem.bail(probe)` | The fast loop gave its last instruction to the slow path |
| `mem.alloc(probe, structure, size)` | A new object in a region |
| `mem.scan(probe, loop, elems)` | A loop over bytes or values |

`mem.Probe` is `?*perf.Recorder` in the instrumented build and `void` in the normal build. `heap.Region` and
`core.Config` carry it, so there is no global state. In the normal build each function is empty: the code is the
plain load or store. The layer also makes memory access visible in the source, which helps a review of data layout.

Proof for the normal build (2026-11-17, ReleaseSafe, Apple M-series host, base commit against this change):

- `mem.zig` asserts at compile time that `Probe` has no size, and a test checks that `heap.Region` did not grow.
- Instructions for one execution (`/usr/bin/time -l`, difference of 1 and N runs of `wfrt bench-node`):
  w3 18,730 and 18,750; 14-json 100,277 and 100,150; 18-library-http 178,796 and 178,857; 19-library-slack-perplexity
  170,818 and 170,612; 32-luxon-expression 4,461,352 and 4,460,524; a compiled Telegram node 71,095 and 70,816
  (base, then this change). The differences are from -0.4% to +0.1%: the noise of the counter.
- Code size: 14,556 bytes for `interp.runFibre` (the fast loop and the slow path) in both builds, and no core
  function with a stable name differs. Outside the core, `main` and `fixture.benchIn` grew (the new command and
  the clock of the bench runner), and two shell functions moved by 36 and 24 bytes.
- The rule that gives this result: each call of `mem.zig` at a call site is behind `if (mem.enabled)`, because an
  argument with a bounds check or an assertion is real code in a safe build.

The recorder runs the interpreter with `Limits.aot = false`. The compiled form of a function gives the same
results and fuel, but its generated code has no calls to `mem.zig` yet.

## 2. What the recorder holds

`src/core/perf.zig` is pure. The shell allocates its memory once (`perf.Storage`): the tags and ages of the three
cache levels, the TLB entries, and two open-address sets for the lines and pages of one execution.
All counts are one table, `perf.Counts`: an array of `u64` with one range for each group (`perf.Field`).

| Group | Index | Content |
|---|---|---|
| `instr`, `bails`, `op_cycles` | opcode | Instructions, bails, and modelled cycles (compute, memory, loops, branch misses) |
| `native_calls`, `native_cycles` | index of the native's name | Calls of `calln` and `callm`, and the memory cycles in them |
| `reads`, `writes`, `read_bytes`, `write_bytes` | structure | Accesses and bytes |
| `lines`, `st_cycles`, `ws_st` | structure (x level) | Line uses for each cache level, cycles, distinct lines |
| `site_lines`, `site_cycles` | site (x level) | The same for each site |
| `allocs`, `alloc_bytes` | structure | Objects and bytes |
| `loop_calls`, `loop_elems` | loop | Loops over bytes and values |
| `cause` | cause | Cycles for each cause |
| `misc` | - | Branch misses, working set, TLB misses for both page sizes, dependent loads |

The recorder keeps three tables: the current execution, the first execution (cold), and the sum. A report gives
the mean of the executions after the first. Work outside the interpreter belongs to a phase (`mem.phase`):
`batch`, `start`, `run`, `effect_out`, `effect_result`, `finish`, `snapshot`, `other_event` in `core.zig`, and
`shell_batch` in the shard. An instruction ends the phase. The group `phase_count`, `phase_cycles` has them, and
`syscalls` has the system calls that the shell makes for the batch (`mem.syscall`).

Structures: `exec_root`, `fibre_table`, `frames`, `registers`, `obj_header`, `obj_entries`, `arr_header`,
`arr_items`, `str_header`, `str_bytes`, `closure_cell`, `bytes_block`, `module_code`, `const_numbers`,
`const_strings`, `json_in`, `json_out`, `scratch`, and for the core and the shell: `slot_table` (the slot columns,
the free list, the ready list), `exec_index` (the maps by execution id), `module_table`, `region_pool`,
`event_buf`, `action_buf`, `log_buf`, `snapshot`. `core.zig` states them in small functions at its end
(`noteSlotStart`, `noteRun`, `noteResult`, `noteSlotEnd`, `noteRelease`, `noteSnapshot`).

Sites: a site is a place in the code, and it has two properties in `perf.zig`. `dependent`: the address comes from
another load (a pointer hop). `range`: the access is a pass over bytes or values, and a loop cost covers it.

## 3. The CPU profile

The model never reads the CPU of its host. A CPU is a `perf.Profile` value: name, clock, the three cache levels
(bytes and ways), line size, the next-line prefetcher, the TLBs, the costs, the vector width and the feature
flags. `--profile NAME` selects one. To add a CPU, add a `Profile` constant to `perf.profiles` with a source for
each number. The default is `zen2-epyc-7b12`: the benchmark machine (Google Cloud e2-standard-16, AMD EPYC 7B12,
family 17h model 31h, Zen 2, 2,250 MHz constant, the shard alone on one core).

| Field | Value | Source |
|---|---|---|
| L1 data cache | 32 KiB, 8 ways, 64-byte lines | [SOG] 2.6.2; [Fog] table 22.3 |
| L2 cache | 512 KiB, 8 ways | [SOG] 2.6.3; [Fog] table 22.3 |
| L3 cache | 16 MiB, 16 ways, shared by 4 cores | Size: [SOG] 2.6.4 and the machine. Ways: [7cpu]; [Fog] table 22.3 says 16 to 24 |
| Load to use, L1 | 4 cycles (5 with a scaled index) | [SOG] 2.6.2 and 2.12 |
| Load from L2 | 12 cycles ("no less than 12") | [SOG] 2.6.3; [Fog]: 12 |
| Load from L3 | 39 cycles | [SOG] 2.6.4. [Fog] says 40, [7cpu] 38: the model uses the AMD number |
| Load from memory | 188 cycles | [7cpu]: 38 cycles + 66 ns, at 2.25 GHz. Measured on a desktop part: check on the server |
| Independent load, store | 0.5 and 1 cycle | [Fog] 22.16: two reads and one write each cycle |
| Branch miss | 18 cycles | [Fog] 3.13: about 18 measured; [7cpu]: 18. [SOG] 2.8 says 12 to 18, 16 common |
| L1 data TLB | 64 entries, all page sizes | [SOG] 2.7.1. [7cpu] reports a larger effective size for 4 KiB |
| L2 data TLB | 2,048 entries, 16 ways, 4 KiB and 2 MiB | [SOG] 2.7.2 |
| L1 TLB miss, page walk | 7 and 55 cycles | [7cpu], marked uncertain there. Two walkers, a 64-entry PDE cache ([SOG] 2.7.3) |
| Micro-op cache | 4,096 ops | [SOG] 2.9.1; [Fog] 22.5: about half is usable with one thread |
| Vectors | 256 bit, one micro-op | [Fog] 22: Zen 1 splits a 256-bit instruction in two, Zen 2 does not |
| Store forwarding | not modelled | [SOG] 2.12: works when the load is inside the store. [Fog] 22.17: 6 to 7 cycles for a partial overlap |
| PDEP, PEXT | 18 cycles latency, 19 cycles each | [uops]: Zen 2. Zen 3: 3 and 1 |
| One native instruction | 0.35 cycles | An assumption (2.9 instructions each cycle). Not from a source: calibrate it (section 8) |

Sources: [SOG] AMD publication 56305 rev 3.00, "Software Optimization Guide for AMD Family 17h Models 30h and
Greater Processors". [Fog] Agner Fog, "The microarchitecture of Intel, AMD and VIA CPUs", chapters 3.13 and 22.
[7cpu] 7-cpu.com, "Zen2". [uops] uops.info, PDEP and PEXT r64. All were read on 2026-11-17. The model has one
thread with all of L1 and L2; the 3 other cores that share the L3 are not modelled.

## 4. The models

**Cache.** Each level is `sets x ways` tags with the age of the last use; the oldest line of a set goes out. A
miss fills all levels above (an inclusive model, as cachegrind has). The prefetcher: a miss on line X also loads
X+1, and the first use of a prefetched line loads the next. `--no-prefetch` turns it off for a comparison with
cachegrind. An access of N lines is N line uses. The report gives hits for each level by structure and by site.

**TLB.** Two TLB pairs run on the same accesses: one with 4 KiB pages (its cycles are in the total) and one with
2 MiB pages (counted only). The report shows both, and the distinct pages of one execution. The runtime reserves
its arena once, so huge pages are one `madvise` in the shell; the report says what they save for this workload.

**Cost.** Cycles = compute + loads + stores + TLB + branch misses + loops. Compute is `opWork(op)` native
instructions for each bytecode instruction (an estimate from the code: section 8 replaces it with measured
counts) times the cost of one instruction. A direct load in L1 costs 0.5 cycles, a dependent one 4. A miss costs
the latency of its level. A range access costs only its misses: the loop table has the cost for each element.

**Branches.** Dispatch: a table with the opcode that followed the last two opcodes. Conditional jumps: a two-bit
counter for each jump instruction. Type checks inside an instruction are not modelled.

**Data layout.** For each structure the report has bytes read and written, distinct lines, objects and bytes
allocated. `dependent loads` counts pointer hops; the opcode table shows which instructions pay for them.
Version 1 does not record fields. The next step is `mem.field(probe, T, .name, ptr)` with `@offsetOf`, and a
table of field pairs that one instruction reads together: the input for hot and cold splits.

## 5. Vector code and bit operations

`mem.scan` counts the elements of each loop. `perf.loopCost` gives, for each loop, the cycles for one element as
scalar and as vector code, and which form the core has now.

| Loop | Now | 256-bit form | Gain of 256 bit against 128 bit |
|---|---|---|---|
| `utf16_len` (`heap.utf16Len`) | scalar, 1 cycle a byte | compare, mask, `popcnt`: 32 bytes each step | 2x above 64 bytes, none below 32 (most keys) |
| `key_probe` (`ops.objFindValue`) | scalar, 3 cycles a key | compare 4 key handles in one step | 2x for objects with more than 2 keys |
| `json_scan`, `json_emit` | `@Vector(64, u8)` and 16-byte steps | the same source | 2x on the 64-byte blocks: LLVM uses two 256-bit steps for znver2, four 128-bit steps for baseline |
| `str_eql`, `byte_copy`, `value_fill`, `value_copy` | `std.mem.eql`, `@memcpy`, `@memset` | - | The compiler and libc select the width |

The profile has AVX2 and no AVX-512: no proposal may need more than 256 bits. LLVM loop vectorization is off in
Zig 0.17, so a scalar loop stays scalar: write `@Vector` code.

PDEP and PEXT are slow on Zen 2 (table above). Checked on 2026-11-17: the source has no use of them, and a build
for `x86_64-linux-gnu` with `-Dcpu=znver2` has 0 `pdep` and 0 `pext` instructions in 1.3 million lines of
disassembly (it has `tzcnt`, `shlx` and 8,211 lines with `ymm` registers). Do not add a bit-extract trick to the
JSON scanner without the profile flag `fast_pdep_pext`.

The release build has no `-Dcpu`, so Zig uses the CPU of the build host: `znver2` when built on the benchmark
machine, and the generic x86-64 baseline (SSE2 only) in a cross build. Build benchmark binaries with
`-Dcpu=znver2` so that the result does not depend on where the build ran.

## 6. The report

`wfrt perf-model <module.wfm> <fixture.json> [N] [--json] [--gate CASE] [--profile NAME] [--no-prefetch]
[--l1-kb K] [--l2-kb K] [--l3-kb K]`. N is 100 by default. The text report has these parts, in this order:

1. The profile, the caches and the TLBs.
2. SUMMARY: instructions, reads, writes, bytes, dependent loads, branch misses, working set (lines and pages),
   modelled cycles, each for the steady and the first execution. Then the BUDGET line: the modelled cycles against
   22,500.
3. TLB: first-level misses, walks and cycles for 4 KiB and for 2 MiB pages.
4. CYCLES BY CAUSE, then PHASES OUTSIDE THE INTERPRETER and SYSTEM CALLS.
5. INSTRUCTIONS BY OPCODE: count, bails, cycles, share. Then NATIVE CALLS.
6. MEMORY BY STRUCTURE and MEMORY BY SITE: hits for each level, cycles.
7. LOOPS OVER BYTES AND VALUES: calls, elements, form, cycles, and what vector code saves.
8. TOP CANDIDATES: at most 10 changes with the most cycles that each can save, and its layer (converter,
   bytecode compiler, interpreter, runtime, data layout, shell). The savings are upper limits and they overlap.

`--json` gives one object with the same numbers: `steady`, `first`, `tlb`, `phases`, `syscalls`, `causes`, `ops`, `natives`,
`structures`, `sites`, `loops`, `candidates`, and `budget_cycles`.

## 7. What the model cannot see, and the tools that can

- The kernel: the inside of a system call, `fsync` on the device, page faults.
- OpenSSL, c-ares and libc: the inside of `memcpy` and `memset` is one loop cost.
- The compute of a phase is `perf.phaseWork`, a placeholder for each phase until cachegrind gives the count.
  The place of an entry in the table of pending effects is an estimate. Route lookup, timers and static data
  have no calls to `mem.zig` yet, and neither have native functions that walk a slice from `arrItems` or `vm.str`.
- `wfrt perf-model` runs a shard with a batch of one execution: the log write and the sends are not shared, as
  they are in a server batch. Sockets are a count of system calls only (one send for a reply, one send and one
  receive for an effect), and `fsync` has the cost of a system call, not of the device.
- Version 1 has no field-level records, no system calls and no false-sharing table (the plan: one recorder for
  each shard and a shared set of written lines; a line that two shards write is a candidate). A caller of
  `arrItems` or `objEntries` counts as a reader of all the items; a caller of `strBytes` or `vm.str` as a reader
  of the first 64 bytes (`mem.bytes_seen`).

| Tool | Use | Command |
|---|---|---|
| cachegrind (callgrind for the call graph) | Instructions and D1/LL misses for each function, on the benchmark machine | Section 8 |
| `perf stat`, `perf record` | Real cycles, misses, branch misses | Needs a VM type with a PMU: the benchmark VM has none |
| llvm-mca | Port pressure and the dependency chain of one hot function | below |
| DynamoRIO (`drcachesim`), Intel SDE | A full address trace when Valgrind is too slow | - |

Assembly for llvm-mca comes from the release binary (checked with LLVM 21 and Zig 0.17):

```
zig build -Drelease=true -Dnet=false -Dtarget=x86_64-linux-gnu -Dcpu=znver2 --prefix out
llvm-objdump -d --no-show-raw-insn --no-leading-addr --disassemble-symbols=ops.Vm.objFindValue out/bin/wfrt \
  | sed -E -e '1,/>:$/d' -e 's/<[^>]*>//' -e 's/^[[:space:]]*(j[a-z]+|call[a-z]*)[[:space:]]+0x[0-9a-f]+.*/\tnop/' > f.s
llvm-mca -mtriple=x86_64-linux-gnu -mcpu=znver2 -timeline f.s
```

## 8. Validation

The plan, on the benchmark machine (x86-64 Linux), for one module `m.wfm` and fixture `f.json`:

```
zig build -Drelease=true -Dcpu=znver2 --prefix out/normal
zig build -Drelease=true -Dcpu=znver2 -Dperf-model=true --prefix out/perf
for n in 1 1001; do valgrind --tool=cachegrind --cache-sim=yes --D1=32768,8,64 --LL=16777216,16,64 \
  --cachegrind-out-file=cg.$n out/normal/bin/wfrt bench-node --arena-mb 256 m.wfm f.json $n; done
cg_annotate cg.1001 | head -60                      # instructions and misses for each function
out/perf/bin/wfrt perf-model m.wfm f.json 1001 --no-prefetch --l2-kb 32
```

For one execution, (totals of n=1001 minus totals of n=1) / 1000 gives `I refs`, `D refs` (reads and writes),
`D1 misses` and `LLd misses`. Compare them with the model: compute cycles / 0.35 (instructions), SUMMARY reads
and writes, the L2+L3+mem columns (D1 misses; `--l2-kb 32` makes L2 a copy of L1) and the mem column (LL
misses). `bench-node` runs the core without a shard, so the model has `shell_batch`, the log and the system
calls in addition. Then set `opWork` and `phaseWork` from the `Ir` of each function, and the cost of one
instruction from the measured time. A model number more than 20% from cachegrind is a defect of the model.

Done on 2026-11-17 on the development host (Apple M-series, so cycles are not Zen 2 cycles; the counters are
those of `/usr/bin/time -l`). cachegrind did not run there: `mmap` failed under Valgrind in an aarch64 musl
container. Run it on the benchmark machine.

The first version saw only the interpreter, the heap and the JSON codec. For w3 it had 883 cycles for 15
bytecode instructions against 18,750 measured instructions (host counters, with the bench runner), so the phases
of `core.zig` and the shard were added. For 32-luxon-expression it had 1,175,624 cycles against 821,490 on the
host: the cost of a dependent load and the branch model are too high, or the host is faster. The absolute cycles
are not validated. Use the counts and the shares inside the model today.

## 9. The method for one workflow

1. Compile the workflow, write a fixture, and run `wfrt perf-model m.wfm f.json 100`. Read the BUDGET line.
2. Read CYCLES BY CAUSE: is the time in compute, in pointer hops, in misses or in loops?
3. Read INSTRUCTIONS BY OPCODE with the bytecode listing. Instructions that the converter or the bytecode
   compiler can remove come first: `mov`, constant loads, `getprop` chains on one object, calls of small functions.
4. Read the structure and site tables for the data layout: distinct lines against bytes, dependent loads.
5. Take the TOP CANDIDATES list. For each change: the layer, the modelled saving, and the measured saving after
   the change (`bench-node` under cachegrind). Record both in the commit message. Then run the gate.

## 10. The regression gate

`perf-record` has one line for each corpus case: `case instructions reads writes dependent_loads lines`, the
counts of one execution from `wfrt perf-model <module> <fixture> 5 --gate <case>`. `bench/perf-gate.sh` runs each
case and fails when a count is above its record; `--update` writes the record. `lines` has a tolerance of 4,
because the alignment of a buffer can move it. The counts do not use the cost table, so they are the same on each
machine. A change that lowers a count updates the record in the same commit, as with `lint-ratchet` and the cost
record of the node compiler. `ci.sh` does not run the gate yet.

## 11. The durable log record of W3, field by field

Measured by `bench/run.sh` (W3, a request body of 1 KB): 1,209 log bytes for each run. The log holds the inputs
of the core, one record for each batch (`logfmt.zig`). A W3 run has two logged events: the request, and the
result of its HTTP step. The numbers below come from the formats in `logfmt.zig` and `server.zig`
(`requestPayload`, `writeResult`) and from the request that `wfrt load` sends. They add up to the measured value.

| Part | Bytes | Content | A replay needs | n8n's saved execution data needs |
|---|---|---|---|---|
| Batch header | 32 for each batch, about 1 for each run | Magic, length, checksum, event count, `now_ms`, `batch_seq` | All of it: the clock of the batch, the order, the check for a torn record | Nothing |
| Request event, header | 32 | Kind (1), padding (3), `seq` (4, not used), `aux` (4, not used), payload length (4), `exec_id` (8, zero: the core makes the id), `conn` (8) | Kind and length. `conn` names a connection that is gone after a crash: verify before a change | Nothing |
| Request line | 9 | `POST /w3` and a newline | All of it: the route | The method and the path of the trigger item |
| Request headers | 75 | The headers as JSON (`host`, `content-type`, `content-length`) and a newline | Only for a module that reads headers (`triggerHeaders`) | All of it, when the workflow saves data: the trigger item has `headers` |
| Request body | 1,024 | The body bytes | Only the members that the code reads. W3 reads `body.id` | All of it, when the workflow saves data: the trigger item has `body` |
| Padding of the request | 4 | To 8 bytes | Nothing | Nothing |
| Result event, header | 32 | Kind, `seq` (the effect), `aux` (raw-body flag and head length), payload length, `exec_id`, `conn` (not used) | Kind, `seq`, `aux`, length, `exec_id` | Nothing |
| Result payload | 27, and 5 of padding | `{"status":200,"headers":{}}` | The status. The shell already left out the headers and the body: the step flags say that the code reads neither | The whole result. The shell keeps the headers and the body when the execution has `exec_flag_data` (`stepReads`) |

The request event is 1,144 bytes, the result event 64, the batch headers 1. The request body is 84.7% of the
record, the request headers 6.2%, the two event headers 5.3%.

The record must keep every input that changes what the core does: the route, the trigger members and the result
members that the code reads, the clock, and the order of the events. For a workflow that saves execution data it
must also keep the whole trigger item and the whole result of each step, because n8n's saved data must equal
v1. Whether a workflow saves data is known at the start (`save_data` of the module, `exec_flag_data` of the
execution), so the choices below never depend on how a run ends.

Proposal, in order of gain. None of it is done: the record did not change.

1. **Log only the trigger members that the module reads, when the module does not save data.** The compiler
   already proves that W3 never reads the headers (`triggerHeaders: false`). Extend the proof to the body: the
   module lists the member paths that the code reads. The log then holds the request line and a trigger with
   only those members. For W3 that is `{"id":7}`: the request event goes from 1,144 to about 64 bytes, and the
   record from 1,209 to about 130. Conditions: the module does not save data; no step gets the whole trigger (a
   fallback host step, or the trigger passed on as one value); a dynamic read (`body[key]`) keeps the whole
   body; and the replay decodes the logged form to the same trigger value that the first run made.
2. **Leave out the headers JSON under the same condition** (75 bytes). It needs only the module flag that exists.
3. **A short event header.** 16 bytes hold the kind, the payload length and `exec_id`; `seq` and `aux` follow
   only for the kinds that use them; `conn` is not written if a replay does not need it. About 24 bytes for a W3
   run. This is a new log version: do it together with item 1.
4. **One copy of a large body for a module that saves data.** The body then goes to the log and, in the
   `started` action, to the outbox. Check whether one of the two can refer to the other. No gain for W3.

With a module that saves data, a request with a 1 KB body stays at about 1,209 bytes: n8n needs the body.

## 12. The fill of `undefined` memory in a safe release build

A ReleaseSafe build writes 0xAA to each `undefined` variable where it is declared. The model does not see these
writes: they are stack memory without a call to `mem.zig`. A search of the release binary for 0xAA writes
(`objdump -d`, 2026-11-17) found these on or near the path of a run:

| Function | Bytes | When |
|---|---|---|
| `core.step` (`fireTimers`, the deferred timers) | 1,536 | Each batch. Removed: the array is now in scratch, taken at the first deferred timer |
| `core.applyEvent` (`findRoute`, the path segments) | 1,024 | A request that matches no static route |
| `core.webhookTrigger` | 768 and 16,384 | Not checked: read which branches reach them |
| `shard.tickSome` | Two fills, size not read | Not checked |
| `lib.callMethod`, `lib.callNative` | 29 and 4 places | The native that owns the buffer |

To remove one, take the buffer from scratch or from the state, or declare it inside the branch that needs it.
A new `@setRuntimeSafety(false)` is not the fix: the lint line `safety-off` cannot rise.

## 13. The first findings that were acted on (2026-11-17)

Four findings of the model became changes: no 0xAA fill of released regions and scratch in a release build; no
empty entry of the interpreter after the effect of the only fibre; the fibre, the frame and the fuel in locals
on the slow path; and calls, returns and the other slow forms inside the fast loop. The numbers are for one
execution, before and after. The bytecode did not change. `bench-node` is the machine instructions of one
execution (`/usr/bin/time -l`, Apple M-series host); it runs the compiled forms, the model runs the interpreter.

| Case | Reads | Writes | Dependent loads | Modelled cycles | `bench-node` instructions |
|---|---|---|---|---|---|
| w3 | 246 to 201 | 99 to 96 | 90 to 79 | 11,401 to 11,177 | 18,789 to 17,792 |
| 02-loops | 2,099 to 1,592 | 574 to 545 | 755 to 600 | 56,584 to 54,371 | 259,697 to 250,864 |
| 14-json | 1,272 to 996 | 363 to 346 | 523 to 428 | 17,455 to 16,607 | 99,761 to 96,043 |
| 18-library-http | 5,148 to 3,584 | 1,081 to 1,019 | 1,785 to 1,238 | 55,178 to 51,009 | 178,270 to 160,641 |
| 19-library-slack-perplexity | 6,087 to 3,950 | 1,171 to 1,063 | 2,086 to 1,321 | 46,862 to 41,561 | 183,726 to 167,233 |
| 32-luxon-expression | 246,529 to 122,284 | 41,163 to 36,002 | 74,626 to 29,443 | 1,181,618 to 901,206 | 4,452,422 to 4,151,284 |

For w3, 7,500 of the modelled cycles are the system calls of a batch of one, which a server batch shares. After
these changes the interpreter has no bail left, and the reads of the execution root for one w3 run went from 61
to 32: the rest are in `core.zig` (the phases of a run), which is the next place to look.
