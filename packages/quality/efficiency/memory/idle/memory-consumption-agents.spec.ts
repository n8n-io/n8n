import { runMemoryBaseline } from './memory-baseline.test.utils';
import { test } from 'n8n-playwright/containers';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			N8N_AI_ANTHROPIC_KEY: 'fake-key',
		},
	},
});

runMemoryBaseline({ name: 'agents', owner: 'Agent' });
