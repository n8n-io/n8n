import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import type { ApiHelpers } from '../../../../services/api-helper';
import type { BenchmarkDimensions } from '../../../../utils/benchmark';
import { WORKFLOW_SUCCESS_QUERY } from '../../../../utils/benchmark';
import { setupWebhook } from '../../../../utils/benchmark/webhook-driver';
import { runWebhookThroughputTest } from './webhook-throughput-harness';

export const SINGLE_INSTANCE_WEBHOOK_CONNECTIONS = 5;
export const SINGLE_INSTANCE_WEBHOOK_DURATION_SECONDS = 120;
const SINGLE_INSTANCE_WEBHOOK_DRAIN_TIMEOUT_SECONDS = 120;

export async function runSingleInstanceWebhookBenchmark(options: {
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	baseUrl: string;
	dimensions: BenchmarkDimensions;
	drainTimeoutSeconds?: number;
}): Promise<void> {
	const drainTimeoutSeconds =
		options.drainTimeoutSeconds ?? SINGLE_INSTANCE_WEBHOOK_DRAIN_TIMEOUT_SECONDS;
	const handle = setupWebhook({
		scenario: {
			nodeCount: 1,
			payloadSize: '1KB',
			nodeOutputSize: 'noop',
			responseMode: 'onReceived',
		},
	});

	await runWebhookThroughputTest({
		handle,
		api: options.api,
		services: options.services,
		testInfo: options.testInfo,
		baseUrl: options.baseUrl,
		connections: SINGLE_INSTANCE_WEBHOOK_CONNECTIONS,
		pipelining: 1,
		warmupSeconds: 0,
		durationSeconds: SINGLE_INSTANCE_WEBHOOK_DURATION_SECONDS,
		timeoutMs: (SINGLE_INSTANCE_WEBHOOK_DURATION_SECONDS + drainTimeoutSeconds + 60) * 1000,
		drainTimeoutSeconds,
		maxErrorRatePct: 1,
		minCompletedResponseRatio: drainTimeoutSeconds === 0 ? undefined : 0.95,
		counterReader:
			options.api.options.workflowSettings?.engineType === 'v2'
				? undefined
				: async () => await options.api.metrics.getCounter(WORKFLOW_SUCCESS_QUERY),
		dimensions: options.dimensions,
	});
}
