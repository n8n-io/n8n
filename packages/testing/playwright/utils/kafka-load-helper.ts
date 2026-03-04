/**
 * Kafka load test helpers — consumer-group-lag completion tracking.
 *
 * Use this approach when you need per-message tracking and duration statistics
 * from the REST API. Better for load tests measuring individual execution performance.
 *
 * For sustained throughput measurement with per-interval sampling, use
 * `throughput-helper.ts` instead.
 */
import type { TestInfo } from '@playwright/test';
import type { KafkaHelper } from 'n8n-containers';

import { attachMetric } from './performance-helper';
import type { WorkflowApiHelper } from '../services/workflow-api-helper';

// --- Payload sizes ---

export const PAYLOAD_PROFILES = {
	'1KB': 1024,
	'10KB': 10240,
	'100KB': 102400,
} as const;

export type PayloadSize = keyof typeof PAYLOAD_PROFILES;

export function generatePayload(sizeBytes: number): object {
	const base = { timestamp: Date.now(), index: 0, data: '' };
	const baseSize = JSON.stringify(base).length;
	const paddingSize = Math.max(0, sizeBytes - baseSize);
	return { ...base, data: 'x'.repeat(paddingSize) };
}

// --- Publishing ---

export async function publishAtRate(
	kafka: KafkaHelper,
	topic: string,
	options: {
		ratePerSecond: number;
		durationSeconds: number;
		payloadSize: PayloadSize;
	},
): Promise<{ totalPublished: number; actualDurationMs: number }> {
	const { ratePerSecond, durationSeconds, payloadSize } = options;
	const payload = generatePayload(PAYLOAD_PROFILES[payloadSize]);
	const intervalMs = 1000 / ratePerSecond;
	const totalMessages = ratePerSecond * durationSeconds;
	const startTime = Date.now();

	for (let i = 0; i < totalMessages; i++) {
		const targetTime = startTime + i * intervalMs;
		const now = Date.now();
		if (now < targetTime) {
			await new Promise((resolve) => setTimeout(resolve, targetTime - now));
		}
		await kafka.publish(topic, { ...payload, index: i });
	}

	return { totalPublished: totalMessages, actualDurationMs: Date.now() - startTime };
}

export async function preloadQueue(
	kafka: KafkaHelper,
	topic: string,
	options: {
		messageCount: number;
		payloadSize: PayloadSize;
	},
): Promise<{ totalPublished: number; publishDurationMs: number }> {
	const { messageCount, payloadSize } = options;
	const payload = generatePayload(PAYLOAD_PROFILES[payloadSize]);
	const messages = Array.from({ length: messageCount }, (_, i) => ({
		value: { ...payload, index: i },
	}));

	const startTime = Date.now();
	await kafka.publishBatch(topic, messages, { batchSize: 1000 });

	return { totalPublished: messageCount, publishDurationMs: Date.now() - startTime };
}

// --- Execution metrics ---

export interface ExecutionMetrics {
	totalCompleted: number;
	totalErrors: number;
	durationMs: number;
	throughputPerSecond: number;
	executionDurations: number[];
	avgDurationMs: number;
	p50DurationMs: number;
	p95DurationMs: number;
	p99DurationMs: number;
}

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0;
	const index = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)];
}

/**
 * Waits for all Kafka messages to be consumed by polling consumer group lag.
 * When lag reaches 0, all messages have been consumed and executions triggered.
 * Uses REST API sample for duration statistics.
 */
export async function waitForExecutions(
	workflowApi: WorkflowApiHelper,
	workflowId: string,
	kafkaHelper: KafkaHelper,
	options: {
		expectedCount: number;
		groupId: string;
		topic: string;
		timeoutMs: number;
		pollIntervalMs?: number;
	},
): Promise<ExecutionMetrics> {
	const { expectedCount, groupId, topic, timeoutMs, pollIntervalMs = 2000 } = options;

	const startTime = Date.now();
	const deadline = startTime + timeoutMs;
	let lastLag = -1;

	while (Date.now() < deadline) {
		try {
			const lagInfo = await kafkaHelper.getConsumerGroupLag(groupId, topic);

			if (lagInfo.totalLag !== lastLag) {
				const consumed = expectedCount - lagInfo.totalLag;
				console.log(`[LOAD] Consumed: ${consumed}/${expectedCount} (lag=${lagInfo.totalLag})`);
				lastLag = lagInfo.totalLag;
			}

			if (lagInfo.totalLag === 0) {
				// All messages consumed - wait briefly for last execution to finish
				await new Promise((resolve) => setTimeout(resolve, 3000));
				const durationMs = Date.now() - startTime;
				const durations = await sampleExecutionDurations(workflowApi, workflowId);
				return buildMetrics(expectedCount, 0, durationMs, durations);
			}
		} catch (err) {
			console.log(`[LOAD] Lag check error: ${err instanceof Error ? err.message : String(err)}`);
		}

		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
	}

	// Timeout - return partial results
	const durationMs = Date.now() - startTime;
	let consumed = 0;
	try {
		const lagInfo = await kafkaHelper.getConsumerGroupLag(groupId, topic);
		consumed = expectedCount - lagInfo.totalLag;
	} catch {
		// Fall back to REST API count
		const executions = await workflowApi.getExecutions(workflowId, 100);
		consumed = executions.length;
	}
	const durations = await sampleExecutionDurations(workflowApi, workflowId);
	return buildMetrics(consumed, 0, durationMs, durations);
}

/**
 * Fetches a sample of recent executions to calculate duration statistics.
 * The REST API has a page size limit, but a sample of 100 is sufficient for percentiles.
 */
async function sampleExecutionDurations(
	workflowApi: WorkflowApiHelper,
	workflowId: string,
): Promise<number[]> {
	const executions = await workflowApi.getExecutions(workflowId, 100);
	return executions
		.filter((e) => e.startedAt && e.stoppedAt)
		.map((e) => new Date(e.stoppedAt!).getTime() - new Date(e.startedAt!).getTime())
		.sort((a, b) => a - b);
}

function buildMetrics(
	successCount: number,
	errorCount: number,
	durationMs: number,
	durations: number[],
): ExecutionMetrics {
	const totalCompleted = successCount + errorCount;
	return {
		totalCompleted,
		totalErrors: errorCount,
		durationMs,
		throughputPerSecond: durationMs > 0 ? (totalCompleted / durationMs) * 1000 : 0,
		executionDurations: durations,
		avgDurationMs:
			durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
		p50DurationMs: percentile(durations, 50),
		p95DurationMs: percentile(durations, 95),
		p99DurationMs: percentile(durations, 99),
	};
}

// --- Result reporting ---

export async function attachLoadTestResults(
	testInfo: TestInfo,
	label: string,
	metrics: ExecutionMetrics,
	memory: { heapUsedMB: number; rssMB: number },
): Promise<void> {
	await attachMetric(testInfo, `${label}-executions-completed`, metrics.totalCompleted, 'count');
	await attachMetric(testInfo, `${label}-executions-errors`, metrics.totalErrors, 'count');
	await attachMetric(testInfo, `${label}-throughput`, metrics.throughputPerSecond, 'exec/s');
	await attachMetric(testInfo, `${label}-duration-avg`, metrics.avgDurationMs, 'ms');
	await attachMetric(testInfo, `${label}-duration-p50`, metrics.p50DurationMs, 'ms');
	await attachMetric(testInfo, `${label}-duration-p95`, metrics.p95DurationMs, 'ms');
	await attachMetric(testInfo, `${label}-duration-p99`, metrics.p99DurationMs, 'ms');
	await attachMetric(testInfo, `${label}-memory-heap`, memory.heapUsedMB, 'MB');
	await attachMetric(testInfo, `${label}-memory-rss`, memory.rssMB, 'MB');
	await attachMetric(testInfo, `${label}-total-duration`, metrics.durationMs, 'ms');
}
