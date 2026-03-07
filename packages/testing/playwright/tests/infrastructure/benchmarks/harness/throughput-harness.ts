import { expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import type { ApiHelpers } from '../../../../services/api-helper';
import {
	waitForThroughput,
	getBaselineCounter,
	attachThroughputResults,
	collectDiagnostics,
	WORKFLOW_SUCCESS_QUERY,
} from '../../../../utils/benchmark';
import type { TriggerHandle, NodeOutputSize } from '../../../../utils/benchmark';

export interface ThroughputTestOptions {
	handle: TriggerHandle;
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	messageCount: number;
	nodeCount: number;
	nodeOutputSize: NodeOutputSize;
	timeoutMs: number;
	pollIntervalMs?: number;
	plan?: { memory: number; cpu: number };
	workerPlan?: { memory: number; cpu: number };
}

function deriveProfile(
	testInfo: TestInfo,
	plan?: { memory: number; cpu: number },
	workerPlan?: { memory: number; cpu: number },
) {
	const name = testInfo.project.name.replace(':infrastructure', '').replace('benchmark-', '');
	const workers =
		(testInfo.project.use as { containerConfig?: { workers?: number } }).containerConfig?.workers ??
		0;

	const wp = workerPlan ?? plan;
	let resourceSummary = '';
	if (plan && wp) {
		resourceSummary =
			workers > 0
				? `  Mode: queue (1 main + ${workers} workers)\n` +
					`  Main: ${plan.memory}GB RAM, ${plan.cpu} CPU\n` +
					`  Workers: ${wp.memory}GB RAM, ${wp.cpu} CPU each\n` +
					`  Total: ${(plan.memory + wp.memory * workers).toFixed(1)}GB RAM, ${plan.cpu + wp.cpu * workers} CPU`
				: `  Resources: ${plan.memory}GB RAM, ${plan.cpu} CPU`;
	}

	return { name, workers, resourceSummary };
}

/**
 * Runs a single throughput test: preloads messages, activates workflow, measures drain rate.
 *
 * Orchestration: create workflow → preload → baseline → activate → measure throughput → diagnostics → report.
 * Call this inside a `test()` body after setting up the trigger driver.
 */
export async function runThroughputTest(options: ThroughputTestOptions): Promise<void> {
	const {
		handle,
		api,
		services,
		testInfo,
		messageCount,
		nodeCount,
		nodeOutputSize,
		timeoutMs,
		pollIntervalMs,
		plan,
		workerPlan,
	} = options;

	testInfo.setTimeout(timeoutMs + 120_000);

	const profile = deriveProfile(testInfo, plan, workerPlan);
	const obs = services.observability;

	const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
		handle.workflow,
		{ makeUnique: true },
	);

	// Preload queue
	const publishResult = await handle.preload(messageCount);
	console.log(
		`[BENCH-${profile.name}] Preloaded ${publishResult.totalPublished} messages in ${publishResult.publishDurationMs}ms`,
	);

	// Wait for VictoriaMetrics, then record baseline
	await obs.metrics.waitForMetric('n8n_version_info', {
		timeoutMs: 30_000,
		intervalMs: 2000,
		predicate: (results: unknown[]) => results.length > 0,
	});
	const baselineCounter = await getBaselineCounter(obs.metrics, WORKFLOW_SUCCESS_QUERY);

	// Activate and wait for readiness
	await api.workflows.activate(workflowId, createdWorkflow.versionId!);
	await handle.waitForReady({ timeoutMs: 30_000 });

	// Measure throughput
	console.log(
		`[BENCH-${profile.name}] Draining ${messageCount} messages through ${nodeCount}-node (${nodeOutputSize}) workflow (timeout: ${timeoutMs}ms)`,
	);
	const result = await waitForThroughput(obs.metrics, {
		expectedCount: messageCount,
		nodeCount,
		timeoutMs,
		baselineValue: baselineCounter,
		metricQuery: WORKFLOW_SUCCESS_QUERY,
		pollIntervalMs,
	});

	// Attach results
	await attachThroughputResults(testInfo, testInfo.title, result);

	// Diagnostics
	const diagnostics = await collectDiagnostics(obs.metrics, result.durationMs);
	console.log(
		`[DIAG-${profile.name}] ${testInfo.title}\n` +
			`  Event Loop Lag: ${diagnostics.eventLoopLag}\n` +
			`  PG Transactions/s: ${diagnostics.pgTxRate}\n` +
			`  PG Rows Inserted/s: ${diagnostics.pgInsertRate}\n` +
			`  PG Active Connections: ${diagnostics.pgActiveConnections}\n` +
			`  Queue Waiting: ${diagnostics.queueWaiting}\n` +
			`  Queue Active: ${diagnostics.queueActive}\n` +
			`  Queue Completed/s: ${diagnostics.queueCompletedRate}\n` +
			`  Queue Failed/s: ${diagnostics.queueFailedRate}`,
	);

	// Summary
	console.log(
		`[BENCH-${profile.name} RESULT] ${testInfo.title}\n` +
			`  Profile: ${profile.name}\n` +
			`${profile.resourceSummary}\n` +
			`  Nodes: ${nodeCount} (${nodeOutputSize}) | Messages: ${messageCount}\n` +
			`  Completed: ${result.totalCompleted}/${messageCount}\n` +
			`  Throughput: ${result.avgExecPerSec.toFixed(1)} exec/s | ${result.actionsPerSec.toFixed(1)} actions/s\n` +
			`  Peak: ${result.peakExecPerSec.toFixed(1)} exec/s | ${result.peakActionsPerSec.toFixed(1)} actions/s\n` +
			`  Duration: ${(result.durationMs / 1000).toFixed(1)}s`,
	);

	expect(result.totalCompleted).toBeGreaterThan(0);
}
