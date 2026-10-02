# Understand memory results

A leak retains unnecessary state after the operation and its cleanup finish.
A completed capture is evidence collection, not a leak-free verdict.

## Five readings

| Reading | Meaning |
| --- | --- |
| Heap used | JavaScript heap memory currently used |
| Heap total | Heap capacity allocated by V8 |
| External | Native memory associated with JavaScript objects |
| ArrayBuffers | Buffer-like memory; this is part of External |
| RSS | Resident memory for the captured process |

These readings overlap. Do not add them to calculate total memory.
They exclude separate workers, task runners, and the browser.

## Allocation and retention

An allocation profile identifies code that allocates sampled memory.
A heap snapshot identifies reachable objects and the references retaining them.
The allocating function and the retaining owner can differ.

Pyroscope heap profiles do not measure full process RSS.
An aggregate flamegraph total is not a point-in-time memory reading.
Compare the same profile type and equal-duration windows with verified sample coverage.

## Interpret a timeline

| Pattern | Next question |
| --- | --- |
| Heap rises during work and falls afterward | Are allocation peaks or GC costs too high? |
| Post-cleanup heap rises after every equal batch | Which objects or collections remain? |
| Growth occurs initially, then plateaus | Is this lazy initialization or a bounded cache? |
| External memory grows while heap stays stable | Are buffers or native allocations retained? |
| RSS stays high after heap falls | Is native memory, allocator retention, or fragmentation involved? |

GC does not remove reachable objects and does not guarantee that RSS falls.
Background allocations can resume immediately after a checkpoint.
Use several completed batches and a comparable no-action control.
Keep Node version, data, concurrency, and profiling settings consistent when comparing fixes.

## Snapshot limits

Snapshot capture pauses the process and uses additional memory.
Inspect it in a separate diagnostic run.
Retained sizes can overlap, so do not sum every object's retained size.

MemLab's default leak filters focus on browser objects.
Zero default suspects does not establish that a backend has no leaks.
Browser undo history and intentional caches can retain objects correctly.
Inspect the retaining path and the object's expected lifetime before calling it a leak.

## Reference guides

- [Node memory snapshots](https://nodejs.org/en/learn/diagnostics/memory/using-heap-snapshot)
- [Node allocation profiling](https://nodejs.org/en/learn/diagnostics/memory/using-heap-profiler)
- [Pyroscope profile comparison](https://grafana.com/docs/pyroscope/latest/view-and-analyze-profile-data/pyroscope-ui/)
- [MemLab leak filters](https://facebook.github.io/memlab/docs/api/core/src/interfaces/ILeakFilter/)
