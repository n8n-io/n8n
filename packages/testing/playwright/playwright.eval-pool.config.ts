// Spike config — does NOT touch the shared playwright.config.ts / projects.
// Reproduces the eval CLI lane model on @playwright/test: workers > pool size,
// --repeat-each to force same-case contention. The instance pool is external
// (EVAL_POOL_BASE_URLS), mirroring how the CLI runs (and avoiding the per-worker
// testcontainer model that broke the earlier Playwright eval attempt).
import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/evals/instance-ai',
	testMatch: /pool-affinity\.eval\.spec\.ts$/,
	fullyParallel: true,
	workers: Number.parseInt(process.env.EVAL_POOL_WORKERS ?? '8', 10),
	repeatEach: Number.parseInt(process.env.EVAL_POOL_REPEAT ?? '3', 10),
	timeout: 600_000,
	retries: 0,
	reporter: [['list']],
	globalSetup: './tests/evals/instance-ai/_pool/global-setup.ts',
	globalTeardown: './tests/evals/instance-ai/_pool/global-teardown.ts',
});
