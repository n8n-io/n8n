import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
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
