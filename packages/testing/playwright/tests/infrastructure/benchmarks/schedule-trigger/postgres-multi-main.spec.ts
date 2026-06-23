import { runScheduleTriggerBenchmark } from './harness';
import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';

const WORKFLOWS = 50;
const MEASUREMENT_SECONDS = 30;
const DRAIN_SECONDS = 10;

test.use({
	capability: benchConfig('schedule-trigger-postgres-multi-main', {
		mains: 2,
		env: {
			N8N_METRICS: 'true',
			N8N_DISTRIBUTED_SCHEDULER_ENABLED: 'true',
		},
	}),
});

test.describe(
	'What is distributed Schedule Trigger throughput on Postgres multi-main?',
	{
		tag: '@bench:schedule-trigger',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'schedule-trigger-postgres-multi-main' },
		],
	},
	() => {
		test(`${WORKFLOWS} one-second Schedule Trigger workflows × ${MEASUREMENT_SECONDS}s (Postgres, 2 mains)`, async ({
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
