import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// PokeAPI fetches can be slow; LLM evals take a few seconds each
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});
