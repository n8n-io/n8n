// Vitest config used by Stryker only — NOT by `pnpm test`, NOT by CI unit runs.
//
// Runs the legacy expression engine, not vm/isolated-vm: the vm evaluator
// SIGABRTs in Stryker's worker on teardown (upstream isolated-vm #464, repros on
// Node 22 + 24). Trade-off: vm-only branches in expression.ts go unscored. Swap
// back to N8N_EXPRESSION_ENGINE=vm once #464 is fixed or we pnpm-patch the guard.

import { defineConfig } from 'vitest/config';
import { createBaseInlineConfig } from '@n8n/vitest-config/node';

const { reporters, outputFile, ...sharedTestConfig } = createBaseInlineConfig({
	include: ['test/**/*.test.ts'],
});

export default defineConfig({
	test: {
		reporters,
		outputFile,
		projects: [
			{
				test: {
					...sharedTestConfig,
					name: 'legacy-engine',
				},
			},
		],
	},
});
