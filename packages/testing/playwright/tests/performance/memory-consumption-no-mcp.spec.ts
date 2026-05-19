import { runMemoryBaseline } from './memory-baseline';
import { test } from '../../fixtures/base';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			N8N_DISABLED_MODULES: 'mcp,mcp-registry',
		},
	},
});

runMemoryBaseline({ name: 'no-mcp', owner: 'AI' });
