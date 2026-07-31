import { defineConfig } from 'vitest/config';
import { createBaseInlineConfig } from '@n8n/vitest-config/node';

// On vitest 3.1.x the multi-config key is `test.workspace` (renamed to
// `test.projects` in 3.2). Each project repeats the shared inline config
// directly — vitest 3.1 workspaces do not auto-inherit from the root.
const sharedTestConfig = createBaseInlineConfig({
	include: ['test/**/*.test.ts'],
	setupFiles: ['./test/setup-vm-evaluator.ts'],
});

export default defineConfig({
	test: {
		workspace: [
			{
				test: {
					...sharedTestConfig,
					name: 'legacy-engine',
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
