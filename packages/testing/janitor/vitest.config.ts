import { defineConfig } from 'vitest/config';

// In CI, many package suites run concurrently under turbo, and an uncapped
// per-suite fork pool (sized to the core count) oversubscribes a small runner
// and flakes timing-sensitive tests. Cap each suite to half the cores in CI;
// off locally, so behaviour is unchanged. Mirrors `@n8n/vitest-config/node`,
// which this standalone config doesn't extend.
const forkPoolOptions =
	process.env.CI === 'true' ? { pool: 'forks' as const, maxWorkers: '50%' } : {};

export default defineConfig({
	test: {
		...forkPoolOptions,
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.ts'],
		// Many suites here are integration tests that spin up a real git repo and
		// a ts-morph Project per case — ~ms locally but 6–15s on loaded CI runners,
		// past vitest's 5s default. Raise the package-wide timeout so these don't
		// flake; fast unit tests finish well under it regardless.
		testTimeout: 30_000,
		hookTimeout: 30_000,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/cli.ts'],
		},
	},
});
