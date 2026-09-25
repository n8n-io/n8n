// Stryker uses QuickJS because VM teardown aborts in Stryker workers
// (isolated-vm #464 on Node 22 and 24). The normal suite uses VM and QuickJS.

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
