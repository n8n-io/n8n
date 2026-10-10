# Efficiency tooling

This area owns resource measurements, microbenchmarks, and load-test tools.
The root `@n8n/efficiency` workspace uses Playwright with shared reporting from `n8n-playwright`.
Its configuration owns the efficiency projects and their scopes. Suites live in folders such as `images/`.

| Tool | Use it to | Guide |
| --- | --- | --- |
| `@n8n/efficiency` | Measure Docker image size and layer waste with Dive | [Image measurements](images/README.md) |
| `@n8n/performance` | Compare code paths without building an n8n Docker image | [Microbenchmarks](microbenchmarks/README.md) |
| `@n8n/n8n-benchmark` | Run load scenarios against an n8n instance | [Benchmark CLI](scale/benchmark/README.md) |

For idle memory, canvas performance, throughput, and local soak tests, use the [Playwright suite map](../testing/playwright/README.md#choose-a-suite). These specs need Playwright fixtures, projects, metrics, or managed containers.

Run image measurements with `pnpm --filter @n8n/efficiency test:images`.
Run browser-free helper tests with `pnpm --filter @n8n/efficiency test:unit`.
The nested microbenchmark and benchmark CLI workspaces keep their own commands and configurations.
