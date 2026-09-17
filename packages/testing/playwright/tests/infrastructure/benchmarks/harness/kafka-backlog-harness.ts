import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import type { ApiHelpers } from '../../../../services/api-helper';
import {
	getBaselineCounter,
	kafkaDriver,
	resolveMetricQuery,
	waitForThroughput,
	WORKFLOW_SUCCESS_QUERY,
} from '../../../../utils/benchmark';
import type {
	BenchmarkDimensions,
	CompletionCounterReader,
	ExecutionMetrics,
	LoadProfile,
	TriggerSetupContext,
} from '../../../../utils/benchmark';
import { runLoadTest, type ResourceSummary } from './load-harness';

const WARMUP_MESSAGE_COUNT = 50;

interface KafkaLoadOptions {
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	scenario: TriggerSetupContext['scenario'];
	load: LoadProfile;
	timeoutMs: number;
	resourceSummary?: ResourceSummary;
	minimumCompletionRatio?: number;
	variant?: string;
	minTailRateEfficiency?: number;
	requireKeptUpStage?: boolean;
	dimensions?: BenchmarkDimensions;
	counterReader?: CompletionCounterReader;
}

export async function runKafkaLoadTest(options: KafkaLoadOptions): Promise<ExecutionMetrics> {
	const handle = await kafkaDriver.setup({
		api: options.api,
		services: options.services,
		scenario: options.scenario,
	});

	return await runLoadTest({
		handle,
		api: options.api,
		services: options.services,
		testInfo: options.testInfo,
		load: options.load,
		trigger: 'kafka',
		timeoutMs: options.timeoutMs,
		resourceSummary: options.resourceSummary,
		minimumCompletionRatio: options.minimumCompletionRatio,
		variant: options.variant,
		minTailRateEfficiency: options.minTailRateEfficiency,
		requireKeptUpStage: options.requireKeptUpStage,
		dimensions: options.dimensions,
		counterReader: options.counterReader,
		warmUp: async ({ counterReader }) => {
			const metrics = options.services.observability.metrics;
			const metricQuery = resolveMetricQuery(options.testInfo);
			const baselineCounter = await getBaselineCounter(metrics, metricQuery, counterReader);
			const published = await handle.preload(WARMUP_MESSAGE_COUNT);
			const result = await waitForThroughput(metrics, {
				expectedCount: published.totalPublished,
				nodeCount: options.scenario.nodeCount,
				timeoutMs: 60_000,
				baselineValue: baselineCounter,
				metricQuery,
				counterReader,
			});
			if (result.totalCompleted !== published.totalPublished) {
				throw new Error(
					`Kafka warm-up completed ${result.totalCompleted}/${published.totalPublished} executions`,
				);
			}
		},
	});
}

export async function runKafkaBacklogTest(
	options: Omit<KafkaLoadOptions, 'scenario' | 'load'> & {
		messageCount: number;
		engineType?: 'v2';
	},
): Promise<void> {
	const { engineType, ...loadOptions } = options;
	await runKafkaLoadTest({
		...loadOptions,
		counterReader:
			options.dimensions?.execution_engine === 'v1'
				? async () => await options.api.metrics.getCounter(WORKFLOW_SUCCESS_QUERY)
				: undefined,
		scenario: {
			nodeCount: 1,
			payloadSize: '1KB',
			nodeOutputSize: 'noop',
			partitions: 3,
			engineType,
		},
		load: { type: 'preloaded', count: options.messageCount },
	});
}
