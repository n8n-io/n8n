import { expect, type TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';
import type { IWorkflowBase, INode } from 'n8n-workflow';
import { setTimeout as wait } from 'node:timers/promises';

import type { ApiHelpers } from '../../../../services/api-helper';
import { attachMetric } from '../../../../utils/performance-helper';

const SCHEDULED_METRIC_PREFIX = 'n8n_distributed_scheduler';

export interface ScheduleTriggerBenchmarkOptions {
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	workflowCount: number;
	measurementSeconds: number;
	drainSeconds: number;
}

export interface ScheduleTriggerBenchmarkReport {
	workflowCount: number;
	measurementSeconds: number;
	materialized: number;
	claimed: number;
	succeeded: number;
	failed: number;
	duplicates: number;
	missed: number;
	throughputPerSecond: number;
	schedulingLagP50Seconds: number;
	schedulingLagP95Seconds: number;
	schedulingLagP99Seconds: number;
	handoffLagP50Seconds: number;
	handoffLagP95Seconds: number;
	handoffLagP99Seconds: number;
	queueDepth: number;
	dbWriteVolume: number;
	cpuSecondsPerSecond: number;
	rssMb: number;
	executionsAfterDeactivation: number;
}

export async function runScheduleTriggerBenchmark({
	api,
	services,
	testInfo,
	workflowCount,
	measurementSeconds,
	drainSeconds,
}: ScheduleTriggerBenchmarkOptions) {
	const workflowIds: string[] = [];

	await services.observability.metrics.waitForMetric('n8n_version_info', {
		timeoutMs: 30_000,
		intervalMs: 2000,
		predicate: (results: unknown[]) => results.length > 0,
	});

	const baseline = await readCounters(services);
	for (let index = 0; index < workflowCount; index++) {
		const workflow = await api.workflows.createWorkflow(scheduleWorkflow(index));
		workflowIds.push(workflow.id);
		await api.workflows.activate(workflow.id, workflow.versionId);
	}

	await wait(measurementSeconds * 1000);
	await wait(drainSeconds * 1000);

	const afterMeasurement = await readCounters(services);
	for (const workflowId of workflowIds) {
		await api.workflows.deactivate(workflowId);
	}

	await wait(5000);
	const afterDeactivation = await readCounters(services);
	const report = await buildReport({
		services,
		testInfo,
		workflowCount,
		measurementSeconds,
		baseline,
		afterMeasurement,
		afterDeactivation,
	});

	await testInfo.attach('distributed-schedule-trigger-benchmark-report', {
		body: JSON.stringify(report, null, 2),
		contentType: 'application/json',
	});

	expect(report.duplicates).toBe(0);
	expect(report.executionsAfterDeactivation).toBe(0);
}

function scheduleWorkflow(index: number): Partial<IWorkflowBase> {
	const scheduleNode: INode = {
		id: `schedule-${index}`,
		name: 'Schedule Trigger',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.3,
		position: [0, 0],
		parameters: {
			rule: {
				interval: [{ field: 'seconds', secondsInterval: 1 }],
			},
		},
	};
	const noopNode: INode = {
		id: `noop-${index}`,
		name: 'No Operation',
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [220, 0],
		parameters: {},
	};

	return {
		name: `Distributed Schedule Trigger Benchmark ${index}`,
		active: false,
		settings: { timezone: 'UTC' },
		nodes: [scheduleNode, noopNode],
		connections: {
			[scheduleNode.name]: {
				main: [[{ node: noopNode.name, type: 'main', index: 0 }]],
			},
		},
	};
}

async function buildReport({
	services,
	testInfo,
	workflowCount,
	measurementSeconds,
	baseline,
	afterMeasurement,
	afterDeactivation,
}: {
	services: ServiceHelpers;
	testInfo: TestInfo;
	workflowCount: number;
	measurementSeconds: number;
	baseline: Counters;
	afterMeasurement: Counters;
	afterDeactivation: Counters;
}): Promise<ScheduleTriggerBenchmarkReport> {
	const range = `${measurementSeconds}s`;
	const materialized = afterMeasurement.materialized - baseline.materialized;
	const claimed = afterMeasurement.claimed - baseline.claimed;
	const succeeded = afterMeasurement.succeeded - baseline.succeeded;
	const failed = afterMeasurement.failed - baseline.failed;
	const duplicates = afterMeasurement.duplicates - baseline.duplicates;
	const queueDepth = await readScalar(services, `sum(${SCHEDULED_METRIC_PREFIX}_task_queue_depth)`);
	const report = {
		workflowCount,
		measurementSeconds,
		materialized,
		claimed,
		succeeded,
		failed,
		duplicates,
		missed: Math.max(materialized - succeeded - failed - queueDepth, 0),
		throughputPerSecond: succeeded / measurementSeconds,
		schedulingLagP50Seconds: await readHistogramQuantile(
			services,
			`${SCHEDULED_METRIC_PREFIX}_scheduling_lag_seconds_bucket`,
			0.5,
			range,
		),
		schedulingLagP95Seconds: await readHistogramQuantile(
			services,
			`${SCHEDULED_METRIC_PREFIX}_scheduling_lag_seconds_bucket`,
			0.95,
			range,
		),
		schedulingLagP99Seconds: await readHistogramQuantile(
			services,
			`${SCHEDULED_METRIC_PREFIX}_scheduling_lag_seconds_bucket`,
			0.99,
			range,
		),
		handoffLagP50Seconds: await readHistogramQuantile(
			services,
			`${SCHEDULED_METRIC_PREFIX}_handoff_lag_seconds_bucket`,
			0.5,
			range,
		),
		handoffLagP95Seconds: await readHistogramQuantile(
			services,
			`${SCHEDULED_METRIC_PREFIX}_handoff_lag_seconds_bucket`,
			0.95,
			range,
		),
		handoffLagP99Seconds: await readHistogramQuantile(
			services,
			`${SCHEDULED_METRIC_PREFIX}_handoff_lag_seconds_bucket`,
			0.99,
			range,
		),
		queueDepth,
		dbWriteVolume: await readScalar(
			services,
			`sum(increase(pg_stat_database_xact_commit[${range}]))`,
		),
		cpuSecondsPerSecond: await readScalar(
			services,
			`sum(rate(n8n_process_cpu_seconds_total[${range}]))`,
		),
		rssMb: await readScalar(services, 'sum(n8n_process_resident_memory_bytes) / 1024 / 1024'),
		executionsAfterDeactivation: afterDeactivation.succeeded - afterMeasurement.succeeded,
	};

	for (const [metric, value] of Object.entries(report)) {
		if (typeof value === 'number') {
			await attachMetric(testInfo, `distributed_schedule_trigger_${metric}`, value);
		}
	}

	return report;
}

interface Counters {
	materialized: number;
	claimed: number;
	succeeded: number;
	failed: number;
	duplicates: number;
}

async function readCounters(services: ServiceHelpers): Promise<Counters> {
	const [materialized, claimed, succeeded, failed, duplicates] = await Promise.all([
		readScalar(services, `${SCHEDULED_METRIC_PREFIX}_tasks_materialized_total`),
		readScalar(services, `${SCHEDULED_METRIC_PREFIX}_tasks_claimed_total`),
		readScalar(services, `${SCHEDULED_METRIC_PREFIX}_tasks_completed_total{status="succeeded"}`),
		readScalar(services, `${SCHEDULED_METRIC_PREFIX}_tasks_completed_total{status="failed"}`),
		readScalar(services, `${SCHEDULED_METRIC_PREFIX}_duplicate_tasks_total`),
	]);

	return { materialized, claimed, succeeded, failed, duplicates };
}

async function readHistogramQuantile(
	services: ServiceHelpers,
	metric: string,
	quantile: number,
	range: string,
) {
	return await readScalar(
		services,
		`histogram_quantile(${quantile}, sum(rate(${metric}[${range}])) by (le))`,
	);
}

async function readScalar(services: ServiceHelpers, query: string) {
	const values = await services.observability.metrics.query(query);
	return values[0]?.value ?? 0;
}
