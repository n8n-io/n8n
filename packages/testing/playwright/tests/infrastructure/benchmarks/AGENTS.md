# Infrastructure Benchmark Instructions

Read `README.md` before you change this suite.

## Purpose

These Playwright specs use the worker lifecycle as a benchmark orchestrator.
They create isolated container stacks, generate load, sample completions and
resources, attach structured reports, and render the GitHub job summary. Most
specs do not use a browser.

## Rules

- Give each spec one scaling question.
- Configure topology with `benchConfig()` in the spec.
- Reuse the Kafka or webhook harness. Do not copy orchestration logic into a spec.
- Add an owner and a unique `question` annotation.
- Set `dimensions.variant` when one summary contains multiple rows.
- Keep runtime comparison profiles out of the deployment sizing matrix.
- Treat v2 saturation profiles as measurements. Require progress, not full drain.
- Keep exact completion checks for v1 delivery baselines.
- Record a new comparison axis as a metric dimension.
- Add a shard when a lane would exceed its existing wall-time target.
- Send Slack failure notifications only for scheduled runs.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm janitor
pnpm test:benchmark <changed-spec>
```

Run commands from `packages/testing/playwright`. Build the n8n image first when
the benchmark must include product-code changes.
