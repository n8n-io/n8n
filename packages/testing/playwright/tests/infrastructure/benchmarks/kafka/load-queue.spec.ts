import { registerLoadTests } from './harness/load-harness';
import { test } from '../../../../fixtures/base';

const WORKER_COUNT = parseInt(process.env.KAFKA_LOAD_WORKERS ?? '1', 10);
const RESOURCE_MEMORY = parseFloat(process.env.KAFKA_LOAD_MEMORY ?? '2');
const RESOURCE_CPU = parseFloat(process.env.KAFKA_LOAD_CPU ?? '2');

test.use({
	capability: {
		services: ['kafka', 'victoriaLogs', 'victoriaMetrics', 'vector'],
		postgres: true,
		workers: WORKER_COUNT,
		resourceQuota: { memory: RESOURCE_MEMORY, cpu: RESOURCE_CPU },
	},
});

const totalContainers = 1 + WORKER_COUNT;
registerLoadTests({
	tags: '@mode:queue @capability:kafka @capability:observability @kafka-load-queue',
	workers: WORKER_COUNT,
	resourceLabel: `${RESOURCE_MEMORY}GB RAM, ${RESOURCE_CPU} CPU per container (${totalContainers} containers = ${(RESOURCE_MEMORY * totalContainers).toFixed(1)}GB total)`,
});
