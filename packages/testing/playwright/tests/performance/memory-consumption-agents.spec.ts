import { runMemoryBaseline } from './memory-baseline';
import { test } from '../../fixtures/base';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			N8N_AI_ANTHROPIC_KEY: 'fake-key',
		},
	},
});

runMemoryBaseline({ name: 'agents', owner: 'AI' });
