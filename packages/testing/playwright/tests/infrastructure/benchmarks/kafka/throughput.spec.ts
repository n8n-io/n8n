import { registerThroughputTests } from './harness/throughput-harness';
import {
	BENCHMARK_MAIN_RESOURCES,
	BENCHMARK_WORKER_RESOURCES,
} from '../../../../playwright-projects';

const MESSAGE_COUNT = parseInt(process.env.BENCHMARK_MESSAGES ?? '0', 10);

registerThroughputTests({
	plan: BENCHMARK_MAIN_RESOURCES,
	workerPlan: BENCHMARK_WORKER_RESOURCES,
	messageCountOverride: MESSAGE_COUNT || undefined,
	pollIntervalMs: 2000,
});
