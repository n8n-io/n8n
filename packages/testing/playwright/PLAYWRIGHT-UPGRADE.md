# Playwright upgrade notes

Reference for the Playwright + Currents bump tracked in [DEVP-180](https://linear.app/n8n/issue/DEVP-180).

## Versions

| Package                | Before    | After     |
| ---------------------- | --------- | --------- |
| `@playwright/test`     | `1.58.0`  | `1.60.0`  |
| `playwright`           | `1.58.0`  | `1.60.0`  |
| `playwright-core`      | `1.58.0`  | `1.60.0`  |
| `@currents/playwright` | `^1.15.3` | `^2.1.1`  |

Versions are pinned in `pnpm-workspace.yaml` (top-level `playwright-core` and the `e2e` catalog).

## Adopted features

### `retain-on-failure-and-retries` trace mode (1.59)

`playwright.config.ts` now sets `trace: 'retain-on-failure-and-retries'`. A trace is recorded for **every retry attempt** and all of them are retained when an attempt fails, so a passing trace and a failing trace from the same retry chain can be diffed side-by-side — the single best lever for debugging the flaky specs that this suite has historically chased.

### `testInfoError.errorContext` (1.60)

No code change required. When an `expect(...)` fails, Playwright now attaches the aria snapshot of the asserted locator to `TestError.errorContext`, which shows up automatically in the HTML report and the Currents dashboard. Diagnostic upgrade for free across every failing assertion.

### `locator.drop()` (1.60)

`CanvasPage.dropNodeOnCanvas(nodeType, position?)` uses the new API to dispatch a synthetic `dragenter`/`dragover`/`drop` on the canvas pane with a real `DataTransfer` carrying the `nodesAndConnections` payload that `NodeView.onDragAndDrop` reads. Tests that only need a node on the canvas can skip the NodeCreator dragstart path entirely — see the new "should add a node by dropping a DataTransfer payload on the canvas" spec in `tests/e2e/workflows/editor/canvas/actions.spec.ts`. The pattern also generalises to dropping workflow JSON files when the canvas grows a file-drop handler.

## Breaking changes scanned

A grep across `packages/testing/playwright/` found no usages of the APIs removed in 1.60:

- `Locator.ariaRef()`
- `BrowserContext.exposeBinding({ handle })`
- `browser.connect({ logger })`
- `videosPath` / `videoSize`

Custom reporters (`metrics-reporter.ts`, `benchmark-summary-reporter.ts`, `langsmith-eval.ts`) do not implement `onError(workerInfo)` and are not affected by the 1.60 signature change.

## Follow-ups

Opportunistic adoption deferred to follow-up PRs so this bump stays focused:

1. `browserContext.setStorageState()` (1.59) — swap in for the `withUser()` multi-user isolation path; faster than spinning up a new context.
2. `locator.normalize()` (1.59) — migrate older Page Objects toward the test-id / aria-role discipline that the janitor `selector-purity` rule already enforces.
3. `await using` for `route` / `addInitScript` / `tracing.startHar()` (1.59) — shorten fixture teardown.
4. `page.clearConsoleMessages()` / `clearPageErrors()` + `filter` option (1.59) — useful if we add "no console errors" assertions.
5. `tracing.startHar()` as a disposable HAR (1.60) — scoped network captures around individual workflow-execution assertions.
6. `expect(page).toMatchAriaSnapshot()` directly on page (1.60), `test.abort('reason')` from route handlers (1.60), `getByRole({ description })` (1.60) — niche, adopt as they fit.
7. CLI debugger for agents — `npx playwright test --debug=cli` + `playwright-cli attach <session>` for agent-driven flake repro loops.
