# Measure idle memory

Use these baselines to compare idle memory across module configurations.
You need Docker and an n8n test image with the E2E endpoints.
The suite uses `n8nio/n8n:local` by default. Set `TEST_IMAGE_N8N` to use another test image.
Each profile limits n8n to 0.75 GB of memory and 0.5 CPU.

1. Build the test image when you need to measure local product changes:

   ```bash
   pnpm build:docker
   ```

   Reuse an existing test image when product code has not changed.

2. Run the baselines from the repository root:

   ```bash
   pnpm --filter @n8n/efficiency test:memory
   ```

   Select one profile with a spec path:

   ```bash
   pnpm --filter @n8n/efficiency test:memory memory-consumption-cloud.spec.ts
   ```

3. Open the native Playwright report:

   ```bash
   pnpm --filter @n8n/efficiency report
   ```

**Verify:** Each profile passes and attaches five memory measurements.
The suite resets and seeds the database before each worker measures memory.
It requests GC and waits for stable heap readings through the shared `getStableHeap()` helper.
It reports heap used, heap total, RSS, PSS, and non-heap overhead in the existing `MB` series.
Compare results on the same machine with the same image and resource limits.
Repeat measurements before you attribute a difference to a module.

CI runs this suite in `test-e2e-performance-reusable.yml` with Currents project `O9BJaN` and the shared QA metrics reporter.
Keep the metric identifiers unchanged. PR comments consume the `memory`, `instance-ai`, and `agents` baseline series.
