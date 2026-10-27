# Efficiency tooling

This area owns resource measurements, microbenchmarks, and load-test tools.
The root `@n8n/efficiency` workspace uses Playwright with shared reporting from `n8n-playwright`.
Its configuration owns the efficiency projects and their scopes. Suites live in folders such as `images/`.

| Tool | Use it to | Guide |
| --- | --- | --- |
| `@n8n/efficiency` | Measure Docker image size and layer waste with Dive | [Image measurements](images/README.md) |
| `@n8n/efficiency` | Measure idle memory with fixed container profiles | [Idle memory baselines](memory/idle/README.md) |
| `@n8n/memory` | Record a local n8n process's memory and find growing object types | [Local memory profiling](memory/local/README.md) |
| `@n8n/performance` | Compare code paths without building an n8n Docker image | [Microbenchmarks](microbenchmarks/README.md) |
| `@n8n/n8n-benchmark` | Run load scenarios against an n8n instance | [Benchmark CLI](scale/benchmark/README.md) |

For memory retention, canvas performance, throughput, and local soak tests, use the [Playwright suite map](../testing/playwright/README.md#choose-a-suite).

Run image measurements with `pnpm --filter @n8n/efficiency test:images`.
Run idle memory baselines with `pnpm --filter @n8n/efficiency test:memory`.
The nested local memory, microbenchmark, and benchmark CLI workspaces keep their own commands and configurations.
