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
		workspace: [
			{
				test: {
					...sharedTestConfig,
					name: 'current-engine',
				},
			},
			{
				test: {
					...sharedTestConfig,
					name: 'vm-engine',
					env: { N8N_EXPRESSION_ENGINE: 'vm' },
				},
			},
		],
	},
});
