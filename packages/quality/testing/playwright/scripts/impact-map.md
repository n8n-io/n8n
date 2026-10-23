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

A **bitmask** is just a **row of light switches, one per spec** — flip ON the
switches for the specs that ran this line. With 8 specs, "specs 1, 3 and 6 ran it"
becomes one byte:

```
spec:   7 6 5 4 3 2 1 0
switch: 0 1 0 0 1 0 1 0   →  one byte (0x4A)
```

That one byte covers 8 specs whether 1 or all 8 are on; 148 specs → 148 switches
→ 19 bytes, flat. (We base64 the bytes so they fit in JSON: `"b:Sg…"`.) For a hub
line hit by 130 specs the list would be ~600 chars but the mask is still 19 bytes;
for a 2-spec line the list `[3,17]` is smaller, so we keep the list. Best of both.
Reading it back: check which switches are on → recover the spec numbers. Lossless.

This is **lossless** — every spec→file relationship is preserved exactly. Measured
on the real map it cuts the file ~3× with **zero accuracy lost** (and is why the
map *shrank* even after adding dense backend data).

## 6. New files: sibling fallback (not "run everything")

What about a file that isn't in the map — a brand-new file, or code no spec has
exercised yet? The naive answer is "run all specs," but that's wasteful: a new
file in a well-covered area is almost certainly exercised by the same specs as
its neighbours. So instead we use a **sibling fallback**:

> An unmapped file selects the specs covering its **nearest covered ancestor
> directory**. A new `packages/@n8n/instance-ai/foo.ts` → the `instance-ai`
> specs, not all 172.

Only a file with **no covered ancestor at all** (a genuinely unknown area)
falls all the way back to running everything. This is the single biggest lever
for selection quality, because high-churn packages add new files constantly —
without it, ~3/4 of backend PRs would run the whole suite.

## 7. The golden safety rule: never skip, only narrow

The map is an **optimisation, never a gate**. If anything is genuinely unknown we
run **more** tests, never fewer:

- File not in the map → **sibling fallback** (its directory's specs); only a file
  with no covered ancestor → **all** specs.
- Map missing / stale / unreadable → **all** specs.
- Either analyzer (static import graph *or* coverage map) errors → **all** specs.

So the worst case is "ran too many tests," never "skipped a test that should have
run." (The sibling fallback is a deliberate, sound trade: a new file is assumed
exercised by the specs that exercise its directory — a superset in practice, far
cheaper than the whole suite.)

## 8. Where things live

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
