# Quality engineering instructions

Read the repository [AGENTS.md](../../AGENTS.md) first. Use the [quality engineering index](README.md) to find the tool for your task.

| Area | Responsibility | Current location |
| --- | --- | --- |
| Policy | Repository rules and static analysis | [`rules-engine`](policy/rules-engine/), [`code-health`](policy/code-health/) |
| Testing | Test selection, architecture checks, and test orchestration | [`test-impact`](testing/test-impact/), [`janitor`](testing/janitor/), [`playwright`](testing/playwright/) |
| Environments | Test services and deployment stacks | [`containers`](environments/containers/) |
| Efficiency | Speed, memory, load, latency, throughput, capacity, and resource use | [Microbenchmarks](efficiency/microbenchmarks/), [Playwright performance tests](testing/playwright/tests/performance/), [infrastructure benchmarks](testing/playwright/tests/infrastructure/benchmarks/), [benchmark CLI](efficiency/scale/benchmark/) |

## Working rules

- Read the instructions in the owning package before you change its files.
- Keep benchmark methods and results comparable when you move files. Do not change behavior during a path migration.
- Keep existing package names and `pnpm --filter` commands when you move workspaces.
- Update workspace discovery, CI paths, test-impact rules, ownership, documentation, and the lockfile when you move a package. Verify that each moved workspace still runs its intended checks.
- Prefer local efficiency measurements that do not require an n8n Docker image rebuild. State clearly when a benchmark does require an image.
- Put task instructions in focused README files. Keep inherited `AGENTS.md` files short and limited to rules for their area.
