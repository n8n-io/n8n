// Vitest config used by Stryker only — NOT by `pnpm test`, NOT by CI unit runs.
//
// Use QuickJS because isolated-vm aborts during Stryker worker teardown
// (upstream isolated-vm #464, Node 22 and 24). QuickJS covers the shared VM path.

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
					name: 'quickjs-engine',
					env: { N8N_EXPRESSION_ENGINE: 'quickjs' },
				},
			},
		],
	},
});
