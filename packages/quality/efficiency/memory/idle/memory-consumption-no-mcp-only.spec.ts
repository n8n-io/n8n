import { runMemoryBaseline } from './memory-baseline.test.utils';
import { test } from 'n8n-playwright/containers';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			N8N_DISABLED_MODULES: 'mcp',
		},
	},
});

runMemoryBaseline({ name: 'no-mcp-only', owner: 'Context' });
