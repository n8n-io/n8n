import { runMemoryBaseline } from './memory-baseline';
import { test } from '../../fixtures/base';

// Emits `memory-*-baseline` series consumed by .github/workflows/ci-pull-requests.yml — do not rename without updating that workflow.
test.use({
	capability: {
		resourceQuota: { memory: 0.75, cpu: 0.5 },
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	},
});

runMemoryBaseline({ name: 'memory', owner: 'Catalysts' });
