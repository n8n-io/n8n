import { test } from '../../../../fixtures/base';
import { BENCHMARK_MAIN_RESOURCES, benchConfig } from '../../../../playwright-projects';
import { VM_LAZY_CACHE_BENCHMARK_PROFILE } from '../../../../utils/benchmark';
import { runKafkaBacklogTest } from '../harness/kafka-backlog-harness';

const MESSAGE_COUNT = 20_000;

test.use({
	capability: benchConfig(
		`single-instance-ceiling-${VM_LAZY_CACHE_BENCHMARK_PROFILE.isolationSuffix}`,
		{ kafka: true, env: VM_LAZY_CACHE_BENCHMARK_PROFILE.env },
	),
});

test.describe(
	'How much can we process on a single instance with lazy expression isolates?',
	{
		tag: '@bench:kafka',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'single-instance-throughput-ceiling-vm-lazy-cache' },
		],
	},
	() => {
		test('Kafka trigger + 1 noop, 1KB payload, 20k msgs (VM lazy + compile cache)', async ({
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
				minimumCompletionRatio: 1,
				dimensions: VM_LAZY_CACHE_BENCHMARK_PROFILE.dimensions,
			});
		});
	},
);
