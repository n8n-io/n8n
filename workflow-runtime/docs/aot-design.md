# Ahead-of-time compilation of modules (design note)

Status: built for library code (`src/core/aot.zig`, `wfrt aot-gen`), with
the compiler changes below. The sections after "Built" are the original note.

## Built

The compiled form works on bytecode, not on TypeScript. A translator from
TypeScript to Zig locals cannot keep the interpreter's model: an instruction
that fails with `RegionFull` runs again after the region grows, and
compaction moves objects. A helper that changes its arguments cannot run
again safely. The prelude array methods are bytecode too, and some helpers
are recursive.

- **Compiled functions.** `wfrt aot-gen <out.zig> <module.wfm>...` writes one
  Zig function for each library or prelude function in the modules
  (`packages/@n8n/workflow-lang/scripts/aot-modules.ts` writes them). The
  function is a labeled `switch` on the program counter, one prong for each
  instruction, so it can start at any instruction. Simple instructions run
  inline with the checks of `fastRun`. Every other instruction runs through
  `interp.stepIn` with its opcode known at compile time: the interpreter's
  own code, with no dispatch. A result that is not a plain `.next` (an
  error, a call, an effect, a fuel charge) goes back to `runFibre` as the
  result of that instruction. So the results, the region bytes and the fuel
  are the same as in the interpreter.
- **Lookup.** At load, each module function gets the index of its compiled
  function when its canonical hash is in the table. The hash covers the
  register counts and every opcode and operand, with the content of
  strings, numbers and natives in place of their indices. The compiled code
  reads those indices from the module's own code.
- **Compiler.** `compile(src, { inlineCallbacks })`, on by default:
  - arrow callbacks of `map`, `filter`, `forEach`, `some`, `every`, `find`,
    `findIndex` and `flatMap` become loops, with the prelude's TypeError for
    a value that is not an array;
  - small helpers (at most 160 syntax nodes, no nested function, not
    recursive, in the same library file) are inlined.
- **Calls.** `call` does not clear the callee's registers: registers above
  `regs_top` are always undefined.

Cost per execution of one node call (`wfrt bench-node`, M5 Pro, median of 3;
cycles):

| Node | Before | After | Change |
|---|---|---|---|
| Google Sheets | 104,800 | 48,700 | −54% |
| Notion | 139,200 | 89,200 | −36% |
| RSS Feed Read | 76,700 | 54,300 | −29% |
| Supabase | 42,800 | 30,300 | −29% |
| Airtable | 24,700 | 18,600 | −25% |
| Google Drive | 17,900 | 14,500 | −19% |
| Gmail | 34,000 | 27,800 | −18% |
| Slack | 16,800 | 14,000 | −17% |
| Google Calendar | 20,500 | 17,200 | −16% |

The table holds 128 functions (35,500 instructions) and adds 3.3 MB to the
binary. Do not keep the generated code's counters in locals: LLVM then
dispatches each `continue` through the jump table in large functions
(+45% cycles on Sheets).

What is left is not interpretation for most nodes: JSON of effects, region
work, and natives (Gmail's base64 of UTF-8 is now one native,
`Base64.encodeUtf8`).

## Why

In the real mix, `wfrt` spends most of its CPU in interpreted code: library
nodes (Sheets, Gmail, Slack, HTTP), converted expressions, and native Code
steps. The floor model (`docs/floor.md`) measured, under load on the M5 Pro:

- **A Google Sheets append through the interpreter:** 32.6 µs per node, against
  0.69 µs for the same work hand-written in Zig (47 times).
- **A glue node with 1 item:** 0.94 µs (64 instructions of about 15 ns each),
  against 0.06 µs hand-written.

This round made the interpreter faster without changing the module format:

- `fastRun` keeps the frame, its code and its registers in locals, and runs
  the simple instructions inline. These are moves, constants, number
  arithmetic and comparisons, jumps, property reads and writes, `newobj`,
  `newarr`, `push`, and array `getelem`.
- Property keys are compared by value first.
- `%` on whole numbers uses an integer remainder.

| Benchmark | Instructions before | After | Change |
|---|---|---|---|
| Object-building loop | 1.04 G | 0.44 G | −58% |
| W1 glue, per execution | 113,000 | 86,000 | −24% |
| Synthetic mix, wfrt per run (all changes of the round) | 2.77 M | 2.04 M | −26% |

The rest of the gap is the cost of the model:

- every value is a boxed 64-bit word in a register window in the region;
- every property access is a linear key search;
- every call pushes a frame in the region.

## Options

1. **Hand-written natives for the hot library operations.** For example,
   `Sheets.rowsToItems`, `Gmail.simplify`, query and header building, and
   item mapping, as `lib.zig` functions that library nodes call through
   `CALLN`. This is the cheapest option, and the gain is local: 10 to 40 times
   on those operations. Each one needs the same equivalence tests as its
   library node. This is the first step.
2. **Superinstructions and inline caches** in the interpreter:
   - fused `getprop`+`jf` and `getprop`+`getprop`;
   - a cache in each `getprop` instruction of the last object's key-array
     identity and slot;
   - calls without a frame push for leaf functions.

   Expected 1.5 to 2 times more on interpreted code. The verifier must accept
   the new opcodes, and the module format gets a version bump.
3. **Ahead-of-time compilation of each module to native code**, at load time
   or at publish time:
   - Translate each bytecode function to a Zig function, built with the Zig
     compiler in a sandboxed build step.
   - Or translate it to machine code with a template JIT. A JIT is ruled out
     for now: no writable and executable memory in the shard.

   The compiled function works on the same region state: register window,
   frames and fibres. A suspension point (`ctx` effect, `await`) becomes a
   state of a `switch` on `pc` at the entry, so snapshots, replay and
   suspension stay exactly as they are. Generated code keeps the safety
   checks of `ReleaseSafe` and the fuel accounting (one decrement per basic
   block, not per instruction).

   Expected gain over the tuned interpreter: about 3 to 5 times on
   interpreted code. Dispatch, register loads and type checks of known types
   go, but boxing and the region layout stay. A further 2 times needs
   unboxed numbers in typed registers and shapes (hidden classes) for
   objects.

   Cost:
   - a native toolchain at publish time;
   - code size and signing, because the code runs in the shard process;
   - a second execution engine that the deterministic simulation and the
     corpus must cover (both engines must give the same bytes).

## Estimate for the real mix

From a `sample` profile of the synthetic native mix, taken partway through
this round (after the fast loop, before the JSON key cache):

| Share of wfrt CPU | Part |
|---|---|
| About 19% | Interpreter dispatch (`runFibre` and `window`, own time) |
| About 19% | JSON (string scan, string creation, copies) |
| About 18% | Log writes, syncs and record checksums |
| About 11% | Socket system calls |
| About 5% | XML and RSS |
| The rest | Natives and the core |

AOT (option 3) on the 19% at 4 times gives about 14% less wfrt CPU per run.
Option 1 on the five hottest library operations also removes interpreter time
and allocations, at a small fraction of the cost. Recommended order: 1, then 2, then 3, if the
interpreter share is still above a third after 1 and 2.
