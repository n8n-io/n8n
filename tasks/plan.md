# Implementation Plan: `n8n-test` workflow-testing PoC

Spec: `.agents/specs/n8n-test-poc.md`. Spike branch off master (suggested:
`ligo-workflow-testing-poc`); never merged.

## Overview

Build `packages/n8n-test`, a throwaway monorepo package exposing
`await runWorkflow(workflowJson, input?)`, which executes a workflow through the
real n8n engine with real `nodes-base` node types, HTTP intercepted by nock, and
demo it as a two-test vitest suite run locally.

## Architecture Decisions

- **Reuse `packages/core/nodes-testing/` wholesale.** `node-test-harness.ts`
  already proves the exact mechanics: `LoadNodesAndCredentials` + `NodeTypes` +
  `CredentialsHelper` (stub), `mock<IWorkflowExecuteAdditionalData>()`, seed the
  start node on `nodeExecutionStack` with `main: [[{ json: input }]]`, run
  `new WorkflowExecute(...).processRunExecutionData(workflow)`, await the
  `workflowExecuteAfter` hook. `runWorkflow` is a ~100-line rearrangement of
  `executeWorkflow` (node-test-harness.ts:199-264), not new machinery.
- **Import the harness components via a tsconfig path alias**, exactly as
  nodes-base does (`"@nodes-testing/*": ["../core/nodes-testing/*"]` in
  `packages/nodes-base/tsconfig.json:8`). No changes to `packages/core`.
- **Result contract:** read `result.data.resultData`; on `error` → throw it
  (throw-mode); otherwise return
  `runData[lastNodeExecuted].at(-1).data.main[0][0].json`.
- **nock, not the SSRF request-helper seam.** Zero engine changes for the PoC;
  the helper seam is the documented production direction (spec, Out of Scope).
- **Demo assets fixed for consistency:** the Notion sample workflow POSTs to
  requestcatcher while the sample test nocks GET `https://test-endpoint.com/test`;
  the packaged `demo/workflow.json` is retargeted so they line up.

## Task List

### Phase 1: Foundation
- [ ] Task 1: Scaffold `packages/n8n-test` (builds; empty vitest suite runs)

### Checkpoint: Foundation
- [ ] `pnpm --filter n8n-test build` and `pnpm --filter n8n-test demo` both exit 0

### Phase 2: Feasibility core (highest risk first)
- [ ] Task 2: `runWorkflow` happy path through the real engine; demo happy-day test green
- [ ] Task 3: Throw-mode errors + network lockdown; demo unhappy-day test green

### Checkpoint: Feasibility proven (the go/no-go moment)
- [ ] Both demo tests green via real `WorkflowExecute` + real node types
- [ ] Un-mocked HTTP fails loudly (`nock.disableNetConnect`)
- [ ] Review with James before polish

### Phase 3: Demo polish
- [ ] Task 4: `input` parameter, demo-day tidy-up, gotchas write-up

### Checkpoint: Complete
- [ ] Demo dry-run from a clean checkout of the spike branch matches the spec's success criteria

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `core/nodes-testing` imports from `packages/core/dist` → needs a built monorepo | Med | Build `n8n-core`/`nodes-base` once up front; document in the package README |
| Full nodes-base load is slow (~30s `beforeAll` in the existing harness) | Med (demo latency) | Accept for PoC; load once per suite; note as a gotcha for the real feature |
| Alias/vitest resolution for `@nodes-testing/*` from a new package | Low | Copy nodes-base's tsconfig-paths setup; fall back to relative imports |
| HTTP Request node's client bypasses nock | Low | The existing harness already nocks this node's traffic; nock 14 covers http/fetch |
| Set node expression needs full expression context | Low | Real engine provides it; proven by harness usage across nodes-base tests |

## Open Questions

- None blocking (spec §Open Questions). Branch name and demo timing are
  James's call.
