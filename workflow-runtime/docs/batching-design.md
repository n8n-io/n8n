# Node-level batching across executions (design)

Status: design, and a first slice in `src/core/batch.zig`. The slice is not
yet called from `core.zig`. See "Hook into the core".

## The problem

Each execution walks its own path through the interpreter. When 64
executions of one workflow wait at the same Sheets node, the core builds 64
request descriptions, one at a time. Later it decodes 64 responses, one at a
time. The work for each execution is the same, but no step shares anything.

Batching means this: the core gathers the ready executions that wait at the
same node or operation, and does their work in one pass. The pass can share
code paths, key tables and column layouts, and it can use SIMD over the
items of all executions.

## What the core has today

- **The batch is the unit of work.** `core.step` takes the events of a
  batch. It applies them in order, fires the timers, then runs the ready
  list (`runReady`).
- **The ready list is sorted by module.** Executions of one module run one
  after the other, so their bytecode stays in cache.
- **An execution runs until it suspends.** `runOne` runs the interpreter
  until an effect, an idle state, the end, or no fuel. `handleEffect` then
  encodes the effect args as JSON (`encodeJson`) and emits a `dispatch`
  action.
- **Results are events.** `effectResult` decodes the result JSON into the
  execution's region, and marks the execution ready.
- **The replay log holds events.** A replay applies the same events in the
  same order, and so gets the same state.

## Rules

### Determinism

- A batch pass is a pure function of the batch's events and of the state at
  the start of the batch. The pass must not depend on timing, thread
  order, or memory addresses.
- The order of the work inside a pass is the order of the ready list after
  its sort. The sort key is (module, step, execution id). The sort must be
  stable and must not use slot numbers that differ after a restart.
- A pass changes only what the one-by-one path would change, with the same
  values. For example, `encodeRequests` writes the same bytes as
  `json.encode`. The tests compare the two paths.
- Actions go out in the order of the ready list, as today. So a log
  append and a replay see the same sequence.

### Fairness and fuel

- Fuel stays per execution. A batch pass charges each execution for its own
  items, not the average. An execution that runs out of fuel leaves the
  group and goes back on the ready list, as today.
- A group has a size limit (for example 256 executions). This gives a bound
  on the latency that one group adds to the batch.
- A group never waits for more members. The core batches only what is
  ready in this batch. It does not hold an execution back to fill a group.

### Isolation between executions and workflows

Batching must never let data cross between executions or workflows.

- **Owner tags.** Each job in a batch pass carries its owner: the execution
  id and the generation of its slot. Items, credentials, requests and
  results keep this tag through the whole pass. A slot that another
  execution takes in the same batch has another generation, so a stale job
  cannot match it.
- **Scatter by owner, with assertions.** A pass writes each output to the
  job that owns it. After the pass, an assertion checks each output's
  owner tag against its job (`encodeRequests`, `decodeResults`). A
  mismatch stops the shard. It must never deliver data to the wrong
  execution.
- **Own spans in shared buffers.** Each job writes only in its own span of a
  shared scratch buffer. A job's scratch use starts and ends inside the job
  (`decodeResults` asserts that scratch use is the same before and after
  each job). Shared tables hold no execution data. For example, the key
  cache of `encodeRequests` holds only module string constants of the
  group's one module. It is cleared when the module changes.
- **One module for each group.** A group never mixes modules, and so never
  mixes workflows. Credentials stay out of shared tables: the shell adds
  them after dispatch, as today.
- **Tests with unique tokens.** Each execution in a test puts a token in
  its items that is unique to that execution. The test then checks that
  each output has its own token and no token of another execution
  (`batch.zig`, "every request and result reaches its own execution").
  When the hook is in the core, the seeded simulation (`wfrt sim`) and the
  fuzz targets must do the same check: each execution's result must hold
  its own token after a batched pass, including after crashes and replays.

## Where batching pays

The measurements below are from one M5 Pro under load, in one session,
ReleaseSafe (`bench/jsonmix`).

| Work | One by one | Batched or columnar | Gain |
|---|---|---|---|
| Request JSON of a Sheets append, 64 executions of one step (324 B each) | 308 ns | 287 ns | 1.07× |
| Sheets rows to items JSON, 1 row × 6 columns | 616 ns (tree) | 520 ns (columnar) | 1.2× |
| Sheets rows to items JSON, 5 × 8 | 3.1 µs | 1.4 µs | 2.2× |
| Sheets rows to items JSON, 20 × 8 | 11.4 µs | 4.1 µs | 2.8× |
| Sheets rows to items JSON, 200 × 12 | 176 µs | 54 µs | 3.3× |

- **Batching of generic JSON work gives little.** After the SIMD codec,
  the request JSON of one call costs about 0.3 µs. Batching saves only the
  key escapes (7%). The effect round trip costs about 3.6 µs, and 54% of
  it is the interpreter (`docs/floor.md`). Batching does not touch that.
- **Columnar data gives more, and it grows with the row count.** The real
  mix has 1.31 items per node run, so the typical gain is near the 1-row
  figure. The gain is large only for list operations.
- **The large gain needs native library nodes.** When a library node runs
  as native code (the runtime agent's ahead-of-time work), the core can run
  one native function over all executions of a group. Request building
  then becomes one loop over columns of owner-tagged rows. Response mapping
  becomes `columns.fromSheetValues` and `writeItems` for each response,
  with no region trees.

## Plan

1. **Done: the slice.** `src/core/batch.zig` has `encodeRequests` and
   `decodeResults` with owner tags, scatter checks and the isolation
   rules above. `src/core/columns.zig` has the columnar item batch.
2. **Hook into the core** (needs the runtime agent's agreement, because it
   changes `core.zig`):
   - In `runOne`, an effect of kind `http` from a library node does not
     encode at once. It goes into a per-batch list of pending dispatches
     (slot, owner, args, step).
   - After `runReady`, the core sorts the list by (module, step, execution
     id), calls `batch.encodeRequests` for each group, checks the owners,
     and emits the `dispatch` actions in the original order.
   - In `step`, the `effect_ok` events of one batch go into a list.
     `decodeResults` decodes them into their regions before `effectResult`
     resumes each fibre. A `RegionFull` result takes the one-by-one path,
     which grows the region.
   - The `scratch.begin`/`end` pairs of `runOne` must keep the encoded
     payloads until the batch ends. Today `handleEffect` returns `keep` for
     this.
3. **Native library nodes and columns.** The Sheets read and append paths
   use `columns` in native code. Item mapping in a native node reads
   columns, not trees, and makes trees only when user code reads them.
4. **SIMD over executions.** With columns from all executions of a group in
   one batch, the stage-1 scan runs over all response bodies back to back.
   The number and string formatting of request bodies runs over one column
   of all executions.

## Decision: no hook for now

The hook in Plan step 2 is not built. The measurement:

- `encodeRequests` gains only by escaping the keys that are module
  constants once for each group: about 7% of the time of a request encode
  (308 to 287 ns, the table above).
- Request encoding (`json.encode`) is 1.6% of the user CPU of W3 and 2.3%
  of a Google Sheets read (sample profiles, M5 Pro).
- `decodeResults` shares no work between jobs: it is one decode for each job.

So the hook would save 0.1 to 0.2% of the CPU. It would change when the
core builds dispatch actions in `runOne` and `handleEffect`, and keep the
encoded payloads alive after their scratch temps. Plan step 3 (columns in
native Sheets code) is also not built: `columns.fromSheetValues` covers the
`specifyRange` read, but the default read is `detectAutomatically`; it
needs the response body as text, which the core does not keep; and the
real mix has 1.31 items for each node run, where columns gain 1.2 times.

Look at this again only with new data: many items for each node run, or a
native node that reads columns end to end.

## Hook into the core

The slice is not called from the core yet. `core.zig` belongs to the
runtime agent, which is changing `runOne` and the effect path for io_uring
and native library nodes. The hook in step 2 changes the order in which
actions are built inside a batch, so it must land with that work. Until
then, the slice runs in tests and in `bench/jsonmix batch`.
