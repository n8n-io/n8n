# Tasks: `n8n-test` workflow-testing PoC

Spec: `.agents/specs/n8n-test-poc.md` · Plan: `tasks/plan.md`

## Task 1: Scaffold `packages/n8n-test`

**Description:** Create the workspace package so it builds and runs an empty
vitest suite. Wires the `@nodes-testing/*` tsconfig path alias (copied from
`packages/nodes-base/tsconfig.json:8`) and workspace deps on `n8n-core`,
`n8n-workflow`, `n8n-nodes-base`, `nock`, `vitest`.

**Acceptance criteria:**
- [x] `pnpm --filter n8n-test build` exits 0
- [x] `pnpm --filter n8n-test demo` runs a placeholder test green
- [x] No other package is modified

**Verification:**
- [x] Build succeeds: `pnpm --filter n8n-test build`
- [x] Tests pass: `pnpm --filter n8n-test demo`

**Dependencies:** None

**Files likely touched:**
- `packages/n8n-test/package.json`
- `packages/n8n-test/tsconfig.json`
- `packages/n8n-test/vitest.config.ts`
- `packages/n8n-test/src/index.ts`

**Estimated scope:** S

## Task 2: `runWorkflow` happy path through the real engine

**Description:** Implement `runWorkflow(workflowJson, input?)` by rearranging
`executeWorkflow` from `packages/core/nodes-testing/node-test-harness.ts:199-264`:
load real node types once (`LoadNodesAndCredentials`/`NodeTypes`), build a
`Workflow`, seed the start node's `nodeExecutionStack` with
`main: [[{ json: input ?? {} }]]`, run `WorkflowExecute.processRunExecutionData`,
await the `workflowExecuteAfter` hook, and return
`runData[lastNodeExecuted].at(-1).data.main[0][0].json`. Add
`demo/workflow.json` (Notion sample retargeted to GET
`https://test-endpoint.com/test`) and the happy-day demo test.

**Acceptance criteria:**
- [x] Happy-day demo test green: nock 200 `{ data: 'Hello world' }` →
      `output['test-output'] === 'Hello world'` via the real Set-node expression
- [x] No mocked execution: real `WorkflowExecute`, real `nodes-base` node types

**Verification:**
- [x] Tests pass: `pnpm --filter n8n-test demo`
- [x] Manual check: temporarily change the nock reply body and watch the
      assertion fail (proves the engine, not a canned value, produced output)

**Dependencies:** Task 1

**Files likely touched:**
- `packages/n8n-test/src/run-workflow.ts`
- `packages/n8n-test/src/index.ts`
- `packages/n8n-test/demo/workflow.json`
- `packages/n8n-test/demo/workflow.test.ts`

**Estimated scope:** M

## Task 3: Throw-mode errors and network lockdown

**Description:** When the run finishes with `result.data.resultData.error`,
`runWorkflow` rejects with that error (n8n default `onError=stopWorkflow`).
Add a vitest setup file calling `nock.disableNetConnect()` (mirroring
`node-test-harness.ts:58`) so un-mocked HTTP fails loudly. Add the unhappy-day
demo test (500 → `await expect(...).rejects.toThrowError()`).

**Acceptance criteria:**
- [x] Unhappy-day demo test green: nock 500 → `runWorkflow` rejects with the
      HTTP Request node's error
- [x] Removing a nock intercept makes the test fail with a blocked-connection
      error, not a real network call

**Verification:**
- [x] Tests pass: `pnpm --filter n8n-test demo` (both tests)
- [x] Manual check: comment out a nock intercept → loud failure

**Dependencies:** Task 2

**Files likely touched:**
- `packages/n8n-test/src/run-workflow.ts`
- `packages/n8n-test/demo/workflow.test.ts`
- `packages/n8n-test/vitest.config.ts` (setup file)

**Estimated scope:** S

## Checkpoint: Feasibility proven — review with James before Task 4

- [x] Both demo tests green through the real engine
- [x] Un-mocked network blocked
- [x] Go/no-go on polish

## Task 4: `input` parameter, demo tidy-up, gotchas write-up

**Description:** Prove the `input` seeding end-to-end (a demo assertion that a
field from `input` flows through), make the demo test file read like the Notion
"Sample test" (it is the artifact on screen), add a short package README with
the demo commands, and write the gotchas list (node-load time, dist-build
requirement, error-mode semantics, SSRF-helper seam as production direction)
into the spike branch/PR description.

**Acceptance criteria:**
- [x] `runWorkflow(workflowJson, { some: 'field' })` demonstrably influences output
- [x] README documents: build prerequisite, `pnpm --filter n8n-test demo`
- [x] Gotchas list exists (branch/PR description)

**Verification:**
- [x] Tests pass: `pnpm --filter n8n-test demo`
- [x] Manual check: demo dry-run from clean checkout following only the README

**Dependencies:** Task 3

**Files likely touched:**
- `packages/n8n-test/demo/workflow.test.ts`
- `packages/n8n-test/demo/workflow.json`
- `packages/n8n-test/README.md`

**Estimated scope:** S
