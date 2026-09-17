import { test } from '../../../../fixtures/base';
import { BENCHMARK_MAIN_RESOURCES, benchConfig } from '../../../../playwright-projects';
import { ENGINE_V2_LAZY_CACHE_BENCHMARK_PROFILE } from '../../../../utils/benchmark';
import { runKafkaBacklogTest } from '../harness/kafka-backlog-harness';

const MESSAGE_COUNT = 10_000;

test.use({
	capability: benchConfig(
		`single-instance-ceiling-${ENGINE_V2_LAZY_CACHE_BENCHMARK_PROFILE.isolationSuffix}`,
		{
			kafka: true,
			engine: ENGINE_V2_LAZY_CACHE_BENCHMARK_PROFILE.engineDatabase,
			env: ENGINE_V2_LAZY_CACHE_BENCHMARK_PROFILE.env,
		},
	),
});

test.describe(
	'How much can execution engine v2 process with lazy expression isolates on a single instance?',
	{
		tag: '@bench:kafka',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{
				type: 'question',
				description: 'single-instance-throughput-ceiling-engine-v2-vm-lazy-cache',
			},
		],
	},
	() => {
		test('Kafka trigger + 1 noop, 1KB payload, 10k msgs (engine v2, VM lazy + compile cache)', async ({
			api,
			services,
		}, testInfo) => {
			await runKafkaBacklogTest({
				api,
				services,
				testInfo,
				messageCount: MESSAGE_COUNT,
				timeoutMs: 600_000,
				resourceSummary: { plan: BENCHMARK_MAIN_RESOURCES },
				minimumCompletionRatio: 0.85,
				dimensions: ENGINE_V2_LAZY_CACHE_BENCHMARK_PROFILE.dimensions,
			});
		});
	},
);
