# eval-pool spike — can `@playwright/test` reproduce the IAI eval lane model?

Spike answering: can Playwright drive the Instance-AI eval **lane model** today — many
concurrent **real** builds packed onto a _bounded, externally-managed_ pool of n8n
instances — while preserving the two invariants the eval CLI's `lane-allocator.ts`
guarantees?

1. **Affinity** — every scenario runs on the instance that built its workflow.
2. **Anti-collision** — the same test case never builds twice at once on one instance
   (the same-prompt-concentration guard), plus a per-instance concurrency cap.

It wraps the **real** eval library (`@n8n/instance-ai/evaluations` → `runWorkflowTestCase`)
**unmodified** — only the runner is swapped. The CLI/library entry points are untouched,
so LangTracer + local-dev keep working.

## Pieces

- `lane-allocator.ts` — the CLI allocator lifted verbatim, exposed as a sync `tryAcquire`
  (cap per lane + never the same key twice on one lane).
- `pool-server.ts` — Playwright workers are separate processes, so the allocator can't be
  shared in memory; it runs behind HTTP and workers poll `/acquire` + `/release`. Every
  interval is logged so teardown can _prove_ the invariants held.
- `fixture.ts` — `runOnPooledInstance(key, fn)`: acquire → run → release (always).
- `pool-affinity.eval.spec.ts` — one Playwright test per case; build + scenarios run on a
  single acquired instance ⇒ affinity by construction. `--repeat-each` forces same-case
  contention; `workers > pool size` forces packing.
- `global-setup.ts` / `global-teardown.ts` — start the sidecar; emit the verdict +
  `eval-pool-report.json`.

## Run

```bash
# 1. boot a bounded pool: N>=2 real n8n instances, each seeded with the eval owner
#    (packages/@n8n/instance-ai/scripts/run-eval-lanes.sh --skip-eval --keep-containers)
# 2. point the harness at them:
cd packages/testing/playwright
export EVAL_POOL_BASE_URLS="http://localhost:6678,http://localhost:6680"
export EVAL_POOL_CAP=4 EVAL_POOL_WORKERS=8 EVAL_POOL_REPEAT=3 EVAL_POOL_MAX_CASES=3
export EVAL_POOL_FILTER="no-http-in-code-node,mock-test-before-credentials,workflow-verification-loop-repro"
export ANTHROPIC_API_KEY=...   # node-side judge
pnpm exec playwright test --config=playwright.eval-pool.config.ts
```

## Proven result (2 lanes, cap 4, 3 cases × repeat 3 = 9 real builds)

```
VERDICT: PASS
builds: 9 across 2 lanes | observed max concurrency: global=6, per-lane=3 (cap=4)
affinity violations: 0 | collision violations: 0 | cap violations: 0
```

6 builds ran concurrently at t0 (3 per instance); same-case repeats were serialized per
instance (the 2nd `mock-test` on a lane started only after the 1st released). 5/9 builds
went build → scenario → verify → PASS end-to-end; 4 first-wave builds failed fast
("no workflow produced") — build-layer flakiness, orthogonal to scheduling.

## NOT covered (the signal/reporting layer)

Reports only `{instanceUrl, caseId}` intervals — it throws away the rich
`WorkflowTestCaseResult`. pass@k aggregation, LangSmith feedback richness, baseline
comparison, and the PR-comment / HTML artifacts are the **next** thing to prove (the
test→reporter "rich-result seam").
