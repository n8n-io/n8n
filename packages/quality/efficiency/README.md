# Efficiency tooling

This area owns tools that measure speed and scale outside the Playwright runner.

| Tool | Use it to | Guide |
| --- | --- | --- |
| `@n8n/memory` | Capture a local process, run a workload, and generate an offline memory report | [Local memory profiling](memory/README.md) |
| `@n8n/performance` | Compare code paths without building an n8n Docker image | [Microbenchmarks](microbenchmarks/README.md) |
| `@n8n/n8n-benchmark` | Run load scenarios against an n8n instance | [Benchmark CLI](scale/benchmark/README.md) |

For idle memory, canvas performance, throughput, and local soak tests, use the [Playwright suite map](../testing/playwright/README.md#choose-a-suite). These specs need Playwright fixtures, projects, metrics, or managed containers.
