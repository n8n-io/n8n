# The E2E Impact Map (in plain terms)

> Audience: anyone touching the E2E coverage pipeline for the first time.
> TL;DR: the impact map lets a PR run **only the E2E specs that actually exercise
> the code it changed**, instead of the whole suite. This explains how it works,
> why the file can get big, and how we keep it small **without losing accuracy**.

## 1. The problem it solves

Running the full Playwright E2E suite on every PR is slow and expensive. But a PR
that only touches, say, `If.node.ts` doesn't need the 100+ specs that never use an
If node. We want to run **just the affected specs**.

To do that we need to know, for every source file, **which specs exercise it**.
That lookup table is the **impact map**.

## 2. What the map looks like

Conceptually it's "source file → the specs that run it":

```
packages/nodes-base/nodes/If/If.node.ts   →  [ if-node.spec.ts, switch-routing.spec.ts ]
packages/frontend/editor-ui/src/…/NodeView →  [ canvas.spec.ts, ndv.spec.ts, … ]
```

So when a PR changes `If.node.ts`, the selector returns just those specs (`mode:
scoped`). The committed map lives at `.github/test-metrics/e2e-impact-map.json`.

## 3. How it's built

A nightly job runs the whole E2E suite with **V8 code coverage** turned on. For
each spec we record which functions actually ran:

- **Frontend**: the browser's own coverage (`page.coverage`), per spec.
- **Backend**: the n8n server's coverage, captured per spec via a test-only hook
  (`/rest/e2e/coverage/*`). See `backend-v8-coverage.ts` / `emit-spec-backend-lcovs.ts`.

We only record a function if it **actually executed** (`hits > 0`) — code that was
merely loaded but never run is not mapped.

## 4. Why the map can get big — the "hub file" problem

Frontend coverage is naturally **sparse**: one spec touches a small slice of the UI.

Backend coverage is **dense**: executing *any* workflow runs the whole server
request → execution path — the workflow engine, execution services, shared DTOs.
Those "hub" files are touched by **almost every spec**.

So a hub file's row in the map isn't `[2 specs]`, it's `[130 of 148 specs]`. Real
numbers from the current map: the busiest 10% of entries are covered by **107+ of
148 specs**. Store thousands of those as plain number lists and the file balloons.

## 5. How we keep it small — without losing anything

The naive storage is a JSON list of spec numbers per entry: `[0,5,12,…]`. That's
fine when an entry has 2 specs, wasteful when it has 130.

We use a **hybrid encoding** — pick the cheaper representation per entry:

| entry is… | stored as | why |
|---|---|---|
| **sparse** (a few specs) | a number list `[3, 17]` | tiny already |
| **dense** (many specs) | a **bitmask** `"b:AB7…"` | one bit per spec — *constant* size no matter how many specs |

A **bitmask** is just "one checkbox per spec": bit 5 on = spec #5 ran this code.
148 specs = 148 bits = 19 bytes — whether 3 specs or all 148 ran it. For a hub
file that's a huge saving; for a 2-spec file the plain list is smaller, so we keep
the list. Best of both.

This is **lossless** — every spec→file relationship is preserved exactly. Measured
on the real map it cuts the file ~3× with **zero accuracy lost**.

> Analogy: instead of writing out "students 1, 4, 7, 9, 12, … 140 attended"
> (a long list), you tick a class register (one box per student). For a packed
> class the register is far shorter than the list.

## 6. The golden safety rule: fail-open

The map is an **optimisation, never a gate**. If anything is uncertain, we run
**more** tests, never fewer:

- File **not in the map** (new file, or we chose not to store it) → run **all** specs.
- Map missing / stale / unreadable → run **all** specs.
- Either analyzer (static import graph *or* coverage map) errors → run **all** specs.

So the worst case is "ran too many tests," never "skipped a test that should have
run." A change can only ever be **narrowed** by the map — never silently dropped.
This is why we can safely leave hub files out of the map if we ever need to: they'd
just fall back to running everything, which is what they should do anyway.

## 7. Where things live

| Thing | File |
|---|---|
| Committed map | `.github/test-metrics/e2e-impact-map.json` |
| Build + encode the map | `scripts/aggregate-coverage.mjs`, janitor `coverage-map.ts` (`mergeCoverage`, `encodeImpactMap`) |
| Pick specs for a change | `scripts/select-affected-e2e.mjs` → janitor `select-e2e` |
| Backend per-spec capture | `fixtures/backend-v8-coverage.ts`, `scripts/emit-spec-backend-lcovs.ts` |
| Full pipeline notes | `scripts/coverage-workflow.md` |

## Further reading (prior art)

This is a studied field — **Regression Test Selection (RTS)**:

- Yoo & Harrold, *Regression Testing Minimization, Selection and Prioritization: A Survey* (2012) — the overview.
- Ekstazi (Gligoric et al., 2015) & STARTS (Legunsen et al., 2017) — file/class-level selection is nearly as accurate as line-level but far cheaper to store.
- Google (Elbaum et al., 2014) — selecting on the build/dependency graph at scale.
- Meta, *Predictive Test Selection* (2019) — replacing the map with an ML model when maps stop scaling.
- Lemire et al., *Roaring Bitmaps* (2016) — the compact-bitset idea behind §5.
