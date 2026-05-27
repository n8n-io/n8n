import { runMemoryBaseline } from './memory-baseline';
import { test } from '../../fixtures/base';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			N8N_INSTANCE_AI_MODEL_API_KEY: 'fake-key',
		},
	},
});

runMemoryBaseline({ name: 'instance-ai', owner: 'Instance AI' });
