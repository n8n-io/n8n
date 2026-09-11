# Implementation Plan: `n8n-test` PoC — version 2

Spec: `.agents/specs/n8n-test-poc-v2.md`. Branch `ligo-workflow-testing-v2`
(off the v1 spike); never merged. v1 plan is in this file's git history.

## Overview

Phase A adds `mockNode` (multi-node, canned output, input capture) to
`packages/n8n-test`, starring an Execute Sub-workflow mock. Phase B builds the
real CI story: a disposable GitHub repo (James's account) holding an exploded
project package export, whose PRs run the workflow tests in under ~4 minutes
against a prebaked `n8n-test` bundle + released npm n8n packages.

## Architecture Decisions

- **Mock mechanism: per-run node-type swap.** `mockNode` writes an entry into a
  module-level `WeakMap<workflowJson, Map<nodeName, entry>>`. `runWorkflow`
  builds, per run, a mock `INodeType` closing over those entries and an
  `INodeTypes` wrapper that serves it for the sentinel type; mocked nodes get
  their `type` rewritten to the sentinel when the `Workflow` is constructed.
  The mock's `execute` records `getInputData()` into the entry (feeding
  `handle.input()`) and returns the canned object as one item. JSON never
  mutates; last `mockNode` per name wins; `clearNodeMocks()` empties the map.
- **Sub-workflow demo is a separate JSON** (`demo/workflow-with-subworkflow.json`,
  trigger → HTTP → Edit Fields → Execute Sub-workflow @1.3) so v1's tests stay
  untouched — and the unmockable-for-real node doubles as the honesty test
  (without `mockNode` the run must reject).
- **Prebake: esbuild bundle, npm runtime.** `n8n-core` has no `exports` map
  (verified: `main` only), so the vendored `core/nodes-testing` sources'
  `../dist/*` imports can be rewritten to `n8n-core/dist/*` deep requires by a
  small esbuild `onResolve` plugin. Bundle externals: `n8n-core`,
  `n8n-workflow`, `n8n-nodes-base`, `nock`, `vitest`, `reflect-metadata`.
  Runtime pins: npm `n8n-core@2.16.x`, `n8n-workflow@2.16.x`,
  `n8n-nodes-base@2.15.x` (current releases).
- **Validate the prebake before building the repo** (risk-first): npm releases
  lag master's engine; if the bundle can't run on them (e.g. a missing
  `createRunExecutionData`, changed `establishExecutionContext` shape), first
  try shimming the gap inside the bundle; if the engine itself diverges, stop
  and ask — that flips the CI strategy (spec's "Ask first" boundary).
- **Demo repo anatomy:** exploded `.n8np` layout (`manifest.json`,
  `projects/<project>/workflows/*.json`) authentic to the Ligo export format,
  `tests/*.test.ts` importing those JSONs, vanilla vitest + `reflect-metadata`
  setup (no DI-container gymnastics outside the monorepo), one `pull_request`
  Action with npm caching.

## Task List

### Phase A: mockNode
- [ ] Task 1: `mockNode` + sub-workflow demo (mock, capture, honesty test)
- [ ] Task 2: Multi-node demo test (HTTP + sub-workflow mocked, nock-free)

### Checkpoint: Phase A
- [ ] `pnpm --filter n8n-test demo` — 6 tests green (3 × v1 untouched + 3 new)
- [ ] Typecheck + lint clean

### Phase B: CI story (risk first)
- [ ] Task 3: `bundle` command + validation against released npm packages (go/no-go)
- [ ] Task 4: Demo repo — exploded export, tests, Action, release asset, first green run
- [ ] Task 5: The demo PR — red on a broken workflow change, green on the fix

### Checkpoint: Phase B
- [ ] PR check red → green in under ~4 minutes end to end

### Phase C: Wrap
- [ ] Task 6: README v2 section, gotchas, verification fan-out, push

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| npm-released engine lags master APIs the bundle relies on | High | Task 3 validates first; shim small gaps in-bundle; stop-and-ask if the engine diverges (CI strategy flip) |
| Mock node type must satisfy engine plumbing (inputs/outputs, versioning) | Med | Mirror `core/nodes-testing/test-data-node.ts`, the in-repo precedent for an in-process node |
| Handle capture across vitest worker/module boundaries | Low | Registry and handles live in one module instance per test file — same-process by construction |
| Demo repo Action flakes on npm install time | Low | `actions/setup-node` npm cache; pin exact versions |

## Open Questions

- None blocking. Demo repo name decided at Task 4 (suggestion:
  `n8n-workflow-tests-demo`).
