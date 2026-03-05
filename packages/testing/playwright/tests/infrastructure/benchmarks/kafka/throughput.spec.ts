import { registerThroughputTests } from './harness/throughput-harness';

const MESSAGE_COUNT = parseInt(process.env.BENCHMARK_MESSAGES ?? '0', 10);

// Resource profiles matching realistic AWS instance types (see playwright-projects.ts)
const MAIN_PLAN = { memory: 8, cpu: 2 }; // m5.large
const WORKER_PLAN = { memory: 4, cpu: 2 }; // t3.medium

registerThroughputTests({
	plan: MAIN_PLAN,
	workerPlan: WORKER_PLAN,
	messageCountOverride: MESSAGE_COUNT || undefined,
	pollIntervalMs: 2000,
});
