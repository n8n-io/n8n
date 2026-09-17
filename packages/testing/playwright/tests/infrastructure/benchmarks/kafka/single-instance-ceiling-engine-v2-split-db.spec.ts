import { test } from '../../../../fixtures/base';
import { BENCHMARK_MAIN_RESOURCES, benchConfig } from '../../../../playwright-projects';
import { ENGINE_V2_SPLIT_DB_LAZY_CACHE_BENCHMARK_PROFILE } from '../../../../utils/benchmark';
import { runKafkaBacklogTest } from '../harness/kafka-backlog-harness';

test.use({
	capability: benchConfig(
		`single-instance-ceiling-${ENGINE_V2_SPLIT_DB_LAZY_CACHE_BENCHMARK_PROFILE.isolationSuffix}`,
		{
			kafka: true,
			engine: ENGINE_V2_SPLIT_DB_LAZY_CACHE_BENCHMARK_PROFILE.engineDatabase,
			env: ENGINE_V2_SPLIT_DB_LAZY_CACHE_BENCHMARK_PROFILE.env,
		},
	),
});

test('Kafka trigger + 1 noop, 1KB payload, 10k msgs (engine v2, split DB, VM lazy + cache) @bench:kafka', async ({
	api,
	services,
}, testInfo) => {
	await runKafkaBacklogTest({
		api,
		services,
		testInfo,
		messageCount: 10_000,
		timeoutMs: 600_000,
		resourceSummary: { plan: BENCHMARK_MAIN_RESOURCES },
		minimumCompletionRatio: 0.98,
		dimensions: ENGINE_V2_SPLIT_DB_LAZY_CACHE_BENCHMARK_PROFILE.dimensions,
	});
});
