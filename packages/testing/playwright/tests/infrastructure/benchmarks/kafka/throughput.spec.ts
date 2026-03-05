import { BASE_PERFORMANCE_PLANS } from 'n8n-containers/performance-plans';

import { registerThroughputTests } from './harness/throughput-harness';

const MESSAGE_COUNT = parseInt(process.env.BENCHMARK_MESSAGES ?? '0', 10);

registerThroughputTests({
	plan: BASE_PERFORMANCE_PLANS.enterprise,
	messageCountOverride: MESSAGE_COUNT || undefined,
	pollIntervalMs: 2000,
});
