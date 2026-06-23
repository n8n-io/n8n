import { runScheduleTriggerBenchmark } from './harness';
import { test } from '../../../../fixtures/base';
import { BENCHMARK_MAIN_RESOURCES, OBSERVABILITY_SERVICES } from '../../../../playwright-projects';

const WORKFLOWS = 25;
const MEASUREMENT_SECONDS = 30;
const DRAIN_SECONDS = 10;

test.use({
	capability: {
		services: [...OBSERVABILITY_SERVICES],
		resourceQuota: BENCHMARK_MAIN_RESOURCES,
		env: {
			N8N_LOG_LEVEL: 'error',
			N8N_DIAGNOSTICS_ENABLED: 'false',
			N8N_METRICS: 'true',
			N8N_DISTRIBUTED_SCHEDULER_ENABLED: 'true',
			EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'none',
			TEST_ISOLATION: 'bench-schedule-trigger-sqlite-single-main',
		},
	},
});

test.describe(
	'What is distributed Schedule Trigger throughput on SQLite single-main?',
	{
		tag: '@bench:schedule-trigger',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'schedule-trigger-sqlite-single-main' },
		],
	},
	() => {
		test(`${WORKFLOWS} one-second Schedule Trigger workflows × ${MEASUREMENT_SECONDS}s (SQLite, 1 main)`, async ({
			api,
			services,
		}, testInfo) => {
			await runScheduleTriggerBenchmark({
				api,
				services,
				testInfo,
				workflowCount: WORKFLOWS,
				measurementSeconds: MEASUREMENT_SECONDS,
				drainSeconds: DRAIN_SECONDS,
			});
		});
	},
);
