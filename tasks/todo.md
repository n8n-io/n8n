# Tasks: `n8n-test` PoC — version 2

Spec: `.agents/specs/n8n-test-poc-v2.md` · Plan: `tasks/plan.md` · v1 tasks in git history

## Task 1: `mockNode` + sub-workflow demo

**Description:** Add `mockNode(workflowJson, nodeName, cannedOutput)` returning
a handle with `input()`, plus `clearNodeMocks()`. Implementation per plan: a
`WeakMap` registry, a per-run mock `INodeType` (modelled on
`core/nodes-testing/test-data-node.ts`) served by an `INodeTypes` wrapper, and
node-type rewriting inside `runWorkflow`. Add
`demo/workflow-with-subworkflow.json` (trigger → HTTP → Edit Fields →
Execute Sub-workflow @1.3) and two demo tests: the mocked sub-workflow test
(canned output + `input()` capture) and the honesty test (same workflow
without the mock rejects — sub-workflows cannot run for real in the harness).

**Acceptance criteria:**
- [ ] `workflow with subworkflow mocked` green: canned output surfaces in the
      result and `sub.input()` captures what Edit Fields produced
- [ ] Honesty test green: un-mocked run of the same workflow rejects
- [ ] v1's three tests untouched and green

**Verification:**
- [ ] Tests pass: `pnpm --filter n8n-test demo`
- [ ] Build succeeds: `pnpm --filter n8n-test build`

**Dependencies:** None

**Files likely touched:**
- `packages/n8n-test/src/mock-node.ts`
- `packages/n8n-test/src/run-workflow.ts`
- `packages/n8n-test/src/index.ts`
- `packages/n8n-test/demo/workflow-with-subworkflow.json`
- `packages/n8n-test/demo/workflow.test.ts` (or a new demo test file)

**Estimated scope:** M

## Task 2: Multi-node demo test

**Description:** Demo test `workflow with every dependency mocked`: HTTP node
and sub-workflow node both mocked on the sub-workflow demo JSON, no nock in
the test; assert the real Edit Fields node's output flowed between the mocks
via `sub.input()`, and re-mocking a name replaces the previous override.

**Acceptance criteria:**
- [ ] Test green with zero nock usage
- [ ] `sub.input()` proves the real middle node ran between two mocks

**Verification:**
- [ ] Tests pass: `pnpm --filter n8n-test demo` (6 green)
- [ ] Manual check: lint + typecheck clean

**Dependencies:** Task 1

**Files likely touched:**
- `packages/n8n-test/demo/workflow.test.ts` (or the new demo test file)

**Estimated scope:** S

## Checkpoint: Phase A — 6 tests green, typecheck + lint clean

## Task 3: `bundle` command + npm-runtime validation (go/no-go)

**Description:** Add `pnpm --filter n8n-test bundle`: an esbuild script
(`scripts/bundle.mjs`) producing a self-contained CJS tarball of `n8n-test` —
vendoring the `@nodes-testing/*` sources with their relative `../dist/*`
imports rewritten to `n8n-core/dist/*` via an `onResolve` plugin; externals:
`n8n-core`, `n8n-workflow`, `n8n-nodes-base`, `nock`, `vitest`,
`reflect-metadata`. Validate in a scratch dir outside the monorepo: npm-install
the tarball + released `n8n-core@2.16.x` / `n8n-workflow@2.16.x` /
`n8n-nodes-base@2.15.x` / `nock` / `vitest`, copy the demo tests, run them.
Shim small API gaps inside the bundle; stop and ask if the released engine
diverges structurally.

**Acceptance criteria:**
- [ ] Tarball builds reproducibly from the package dir
- [ ] All 6 demo tests pass in the scratch dir against released npm packages

**Verification:**
- [ ] Manual check: scratch-dir vitest run output attached to the task notes

**Dependencies:** Task 2 (bundles the final API)

**Files likely touched:**
- `packages/n8n-test/scripts/bundle.mjs`
- `packages/n8n-test/package.json`

**Estimated scope:** M

## Task 4: Demo repo with exploded export, Action, release

**Description:** Create a disposable repo under James's GitHub (suggestion:
`n8n-workflow-tests-demo`): exploded `.n8np` layout (`manifest.json`,
`projects/<project>/workflows/*.json` — the two demo workflows, authentic to
the Ligo export format), `tests/*.test.ts` importing those JSONs,
vanilla vitest config + `reflect-metadata`/nock setup, README, and a
`pull_request` GitHub Action (node 22, npm cache) running vitest. Attach the
Task 3 tarball as a GitHub release asset; `package.json` installs it by URL.
First push must show a green run on the default branch.

**Acceptance criteria:**
- [ ] Fresh clone + `npm ci` + `npx vitest run` passes locally
- [ ] Action green on the default branch, wall-clock under ~4 min

**Verification:**
- [ ] Manual check: Actions run URL green

**Dependencies:** Task 3

**Files likely touched:** (new repo, not the monorepo)

**Estimated scope:** M

## Task 5: The demo PR — red → green

**Description:** In the demo repo, raise a PR that breaks a workflow (change
the Edit Fields mapping in the exploded workflow JSON) — the check must fail
with a readable assertion diff. Push a fix commit — the check must go green.
Leave the PR open as the demo artifact.

**Acceptance criteria:**
- [ ] Failing check on the breaking commit, readable diff in the log
- [ ] Green check on the fix commit, each run under ~4 min

**Verification:**
- [ ] Manual check: PR URL with both check runs

**Dependencies:** Task 4

**Files likely touched:** (demo repo)

**Estimated scope:** S

## Checkpoint: Phase B — PR shows red → green in under ~4 minutes

## Task 6: README v2, gotchas, verification fan-out, push

**Description:** README v2 section (`mockNode` usage, bundle command, demo-repo
wiring + links), extend the gotchas with what v2 surfaced (npm-runtime deltas,
mock-node plumbing), run the adversarial verification fan-out over the v2
diff, apply must-fixes, push, and update the draft-PR description with a v2
summary.

**Acceptance criteria:**
- [ ] README covers phase A API and phase B wiring with real links
- [ ] Verification fan-out findings triaged; must-fixes applied
- [ ] Branch pushed; draft PR body updated

**Verification:**
- [ ] Tests pass: `pnpm --filter n8n-test demo`
- [ ] Manual check: draft PR renders the v2 summary

**Dependencies:** Task 5

**Files likely touched:**
- `packages/n8n-test/README.md`
- PR #36120 body

**Estimated scope:** S
