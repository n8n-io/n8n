# Quality engineering

Each area owns workspaces. A test stays with its runner, even when it measures another quality concern.

| Area | Owns | Start here |
| --- | --- | --- |
| Policy | Repository rules and static checks | [Policy](policy/README.md) |
| Testing | Test selection, architecture checks, and the Playwright runner | [Testing](testing/README.md) |
| Environments | Services and deployment stacks for tests | [Environments](environments/README.md) |
| Efficiency | Standalone microbenchmark and load-test tools | [Efficiency](efficiency/README.md) |

Use the [Playwright suite map](testing/playwright/README.md#choose-a-suite) to find browser, accessibility, memory, and infrastructure tests. Their specs remain in Playwright because they use its fixtures and projects.
