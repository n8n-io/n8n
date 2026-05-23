# Playwright 1.59 / 1.60 + Currents upgrade — decision note

Spike output for [DEVP-180](https://linear.app/n8n/issue/DEVP-180/investigate-playwright-159160-currents-upgrade-for-n8n-test-suite).
Read first if you are picking up the follow-on work.

## TL;DR

- **Decision: upgrade.** Target Playwright `1.60.x` (latest patch at time of bump).
- The upgrade is low-risk for this repo: no removed-API usage in
  `packages/testing/playwright/`, no custom reporter relies on the changed
  `Reporter.onError` signature, and we are only one minor behind.
- Adopt 3 features actively, inherit the rest. See [Adoption plan](#adoption-plan).
- Currents (`@currents/playwright` `^1.15.3`) is the gating dependency — confirm
  a 1.60-compatible Currents release exists *before* bumping the catalog.

## Current state (as of this spike)

| Dep | Pinned version | Where |
| --- | --- | --- |
| `@playwright/test`, `playwright`, `playwright-core` | `1.58.0` | `pnpm-workspace.yaml` catalog `e2e` |
| `@currents/playwright` | `^1.15.3` | catalog `e2e` |
| `eslint-plugin-playwright` | `2.2.2` | catalog `e2e` |
| `playwright` (storybook) | `catalog:e2e` | `packages/frontend/@n8n/storybook` |
| `playwright-core` (mcp-browser) | top-level catalog | `packages/@n8n/mcp-browser` |

Catalog mode is `strict` — a single bump updates every consumer in lockstep.

## Adoption plan

Adopt these three actively (each as a separate, small PR so a regression is
easy to bisect):

1. **`trace: 'retain-on-failure-and-retries'`** (1.59). Replaces `trace: 'on'`
   in `playwright.config.ts:105`. Today we record traces, videos, and
   screenshots for every test on every retry, which is wasteful in CI and
   makes the Currents dashboard noisy. The new mode keeps a trace per retry
   attempt and surfaces them all when an attempt fails — exactly what we need
   to compare a passing vs. failing trace inside one retry chain. Pair with
   `video: 'retain-on-failure'` while we are in there.
2. **`testInfoError.errorContext`** (1.60). No test-code change — Playwright
   attaches the aria snapshot of the failing locator to the error
   automatically. Free signal in HTML report + Currents.
3. **`locator.drop()`** (1.60). Replace the synthetic-event-light `dragTo`
   call sites that are *actually* drop-zone interactions (not connection
   drags) so the test goes through a real `DataTransfer`. Concrete targets:
   - `pages/CanvasPage.ts` — the panel-to-canvas drop in node-add flows
     (currently `dragTo` with `targetPosition`; see callers in
     `tests/e2e/workflows/editor/canvas/actions.spec.ts`).
   - Any future "drop a workflow JSON onto the canvas" test —
     `locator.drop({ files: [...] })` removes the need to script a file picker.
   - Keep `connectNodesByDrag()` (`CanvasPage.ts:1011`) on `dragTo` — that is
     a handle-to-handle pointer drag, not a drop target.

Inherit (no code change, just enjoy):

- CLI debugger for agents (`--debug=cli`). Plugs into the existing
  janitor / TCR Claude flow described in [`AGENTS.md`](../AGENTS.md).
- `await using` for `route`, `addInitScript`, `tracing.startHar()`. Apply
  opportunistically as fixtures get touched.
- `locator.normalize()` — useful next time we run a `selector-purity` cleanup
  sweep with the janitor.
- `page.clearConsoleMessages()` / `clearPageErrors()` and the `filter` option
  on `page.on('console', ...)` — direct fit for
  `tests/dev-server-smoke/dev-server-boots.spec.ts:18-26`, which currently
  hand-rolls a `BENIGN_PATTERNS` filter. Optional follow-up.

Defer:

- `browserContext.setStorageState()` — `TestEntryComposer.withUser()`
  (`composables/TestEntryComposer.ts:101`) creates a fresh `newContext()` per
  user and then logs in via `api.login`. We do not reuse contexts across
  users, so the new API is not a meaningful simplification here.
- `tracing.startHar()` — no current call site requests scoped HAR.
- `expect(page).toMatchAriaSnapshot()` direct-on-page — nice-to-have, only
  worth it once we add a11y snapshot tests.

## Breaking-change grep (done)

Ran in `packages/testing/playwright/` and across the monorepo:

| Removed / changed in 1.60 | Used here? |
| --- | --- |
| `Locator.ariaRef()` | No matches |
| `exposeBinding({ handle })` | No matches |
| `connect({ logger })` | No matches |
| `videosPath` / `videoSize` | No matches |
| `Reporter.onError(workerInfo)` signature change | Not implemented in any reporter — `metrics-reporter.ts`, `benchmark-summary-reporter.ts`, `langsmith-eval.ts` only use `onBegin` / `onTestEnd` / `onEnd` |
| `navigator.platform` emulation bug (1.59 only) | Fixed in later 1.59 patches; if we bump to 1.59.x specifically, pin a patch where this is fixed or set `PLAYWRIGHT_NO_UA_PLATFORM=1`. Going straight to 1.60.x avoids this entirely. |

Conclusion: no code changes required to land the version bump itself. All
adoption work is additive.

## Currents compatibility (must verify before bump)

- We use `@currents/playwright` 1.15.3 — `currentsReporter` and the
  `CurrentsFixtures` / `CurrentsWorkerFixtures` augmentations are wired in
  `playwright.config.ts` and `fixtures/base.ts`. Surface area is small.
- Action item before the catalog bump: confirm Currents publishes a release
  that declares Playwright 1.60.x as a supported peer. If it does not yet,
  hold the upgrade — Currents recording is load-bearing for our flake
  triage and we do not want to silently lose dashboard data.
- This was out of scope for the spike per the ticket and is the only thing
  that can force a delay.

## Suggested sequencing

1. Verify Currents 1.60-compatible release exists (1 quick check, 1 PR if a
   Currents bump is required first).
2. Catalog bump PR: `@playwright/test`, `playwright`, `playwright-core` →
   `1.60.x`. Lockstep update via catalog. Re-run a full Playwright project
   suite and confirm CI artifact sizes do not regress.
3. Adoption PR 1: switch `trace` / `video` modes.
4. Adoption PR 2: migrate the panel-to-canvas drag sites to `locator.drop()`.
5. Optional follow-up: console-error filter cleanup in dev-server smoke.

Each step is independently revertible.
