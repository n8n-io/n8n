// Vitest config used by Stryker only — NOT by `pnpm test`, NOT by CI's
// unit-test runs. Runs the single forward-looking `vm-engine` project
// (N8N_EXPRESSION_ENGINE=vm) rather than both engines.
//
// Two reasons:
//   1. Halves Stryker's dry-run cost — only one vitest project loads per
//      Stryker worker, removing concurrent isolated-vm initialisation
//      pressure that occasionally crashes the dry-run on local machines.
//   2. Mutation score reflects test effectiveness against the engine n8n
//      is moving to. Legacy-engine is being phased out; tests that pass
//      only under it shouldn't pad the mutation score.
//
// The default `vitest.config.ts` still runs both projects for `pnpm test`
// and CI — engine-equivalence is asserted there.

import { defineConfig } from 'vitest/config';
import { createBaseInlineConfig } from '@n8n/vitest-config/node';

const { reporters, outputFile, ...sharedTestConfig } = createBaseInlineConfig({
	include: ['test/**/*.test.ts'],
	setupFiles: ['./test/setup-vm-evaluator.ts'],
});

export default defineConfig({
	test: {
		reporters,
		outputFile,
		projects: [
			{
				test: {
					...sharedTestConfig,
					name: 'vm-engine',
					// STRYKER_RUN tells setup-vm-evaluator.ts to skip the
					// isolated-vm disposer on teardown — see that file for why.
					env: { N8N_EXPRESSION_ENGINE: 'vm', STRYKER_RUN: 'true' },
				},
			},
		],
	},
});
