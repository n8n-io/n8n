import { registerLoadTests } from './harness/load-harness';
import { test } from '../../../../fixtures/base';

const RESOURCE_MEMORY = parseFloat(process.env.KAFKA_LOAD_MEMORY ?? '2');
const RESOURCE_CPU = parseFloat(process.env.KAFKA_LOAD_CPU ?? '2');

test.use({
	capability: {
		services: ['kafka', 'victoriaLogs', 'victoriaMetrics', 'vector'],
		postgres: true,
		resourceQuota: { memory: RESOURCE_MEMORY, cpu: RESOURCE_CPU },
	},
});

registerLoadTests({
	tags: '@mode:postgres @capability:kafka @capability:observability @kafka-load',
	resourceLabel: `${RESOURCE_MEMORY}GB RAM, ${RESOURCE_CPU} CPU`,
});
