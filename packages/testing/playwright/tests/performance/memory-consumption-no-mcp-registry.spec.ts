import { runMemoryBaseline } from './memory-baseline';
import { test } from '../../fixtures/base';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			N8N_DISABLED_MODULES: 'mcp-registry',
		},
	},
});

runMemoryBaseline({ name: 'no-mcp-registry', owner: 'AI' });
