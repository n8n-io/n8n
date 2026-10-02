# Run local-only memory benchmarks

These Playwright specs measure memory across Instance AI actions. The `benchmark-memory-instanceai:infrastructure` project starts a container stack with observability services. It does not run in Docker-free local-server mode.

1. Build the n8n image from the repository root when product code changed:

   ```bash
   pnpm build:docker
   ```

2. Set `N8N_AI_OPENAI_API_KEY` in your shell for the default `openai/gpt-4o-mini` model. You can set `N8N_INSTANCE_AI_MODEL` to select another model. Supply the matching provider key.

3. Run the project from the repository root:

   ```bash
   pnpm --filter n8n-playwright exec playwright test --project=benchmark-memory-instanceai:infrastructure
   ```

The [memory harness](harness/memory-harness.ts) measures heap and RSS between phases and can save heap snapshots. Use the [MemLab analysis script](../../../utils/benchmark/run-heap-analysis.ts) to compare saved snapshots.
