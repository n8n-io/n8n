import { expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import autocannon from 'autocannon';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import type { ApiHelpers } from '../../../../services/api-helper';
import {
	waitForThroughput,
	getBaselineCounter,
	attachThroughputResults,
	collectDiagnostics,
	attachDiagnostics,
	formatDiagnosticValue,
	resolveMetricQuery,
} from '../../../../utils/benchmark';
import type { NodeOutputSize } from '../../../../utils/benchmark';
import type { WebhookHandle } from '../../../../utils/benchmark/webhook-driver';
import { attachMetric } from '../../../../utils/performance-helper';

export interface WebhookThroughputOptions {
	handle: WebhookHandle;
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	baseUrl: string;
	nodeCount: number;
	nodeOutputSize: NodeOutputSize;
	connections: number;
	durationSeconds: number;
	timeoutMs: number;
	/** PromQL metric to track workflow completions. Defaults to resolveMetricQuery(testInfo). */
	metricQuery?: string;
	plan?: { memory: number; cpu: number };
	workerPlan?: { memory: number; cpu: number };
}

/**
 * Runs a webhook throughput test using autocannon for HTTP load generation
 * and VictoriaMetrics for workflow completion tracking.
 *
 * Phases: create workflow → activate → warm up → autocannon + VictoriaMetrics → report.
 */
export async function runWebhookThroughputTest(options: WebhookThroughputOptions): Promise<void> {
	const {
		handle,
		api,
		services,
		testInfo,
		baseUrl,
		nodeCount,
		nodeOutputSize,
		connections,
		durationSeconds,
		timeoutMs,
	} = options;
	const metricQuery = options.metricQuery ?? resolveMetricQuery(testInfo);

	testInfo.setTimeout(timeoutMs + 120_000);

	const mode = testInfo.project.name.replace(':infrastructure', '').replace('benchmark-', '');
	const obs = services.observability;

	const dimensions: Record<string, string | number> = {
		trigger: 'webhook',
		nodes: nodeCount,
		output: nodeOutputSize,
		connections,
		duration_s: durationSeconds,
		mode,
	};

	// Phase 1: Create + activate workflow
	// createWorkflowFromDefinition overwrites the webhook path and sets webhookId for proper registration
	const { workflowId, createdWorkflow, webhookPath } =
		await api.workflows.createWorkflowFromDefinition(handle.workflow, {
			makeUnique: true,
			webhookPrefix: 'bench',
		});
	await api.workflows.activate(workflowId, createdWorkflow.versionId!);

	const webhookUrl = `${baseUrl}/webhook/${webhookPath}`;

	// Phase 2: Warm up — verify webhook responds (retries for async registration)
	await api.webhooks.trigger(`/webhook/${webhookPath}`, {
		method: 'POST',
		data: handle.payload,
		maxNotFoundRetries: 10,
		notFoundRetryDelayMs: 500,
	});
	console.log(`[WEBHOOK] Warm-up complete, webhook registered at /webhook/${webhookPath}`);

	// Phase 3: Record VictoriaMetrics baseline
	await obs.metrics.waitForMetric('n8n_version_info', {
		timeoutMs: 30_000,
		intervalMs: 2000,
		predicate: (results: unknown[]) => results.length > 0,
	});
	const baselineCounter = await getBaselineCounter(obs.metrics, metricQuery);

	// Phase 4: Run autocannon + VictoriaMetrics measurement in parallel
	console.log(
		`[WEBHOOK] Starting ${connections} connections for ${durationSeconds}s → ${webhookUrl}\n` +
			`  Workflow: ${nodeCount} nodes (${nodeOutputSize})`,
	);

	const [cannonResult, throughputResult] = await Promise.all([
		autocannon({
			url: webhookUrl,
			connections,
			duration: durationSeconds,
			method: 'POST',
			body: JSON.stringify(handle.payload),
			headers: { 'Content-Type': 'application/json' },
		}),
		waitForThroughput(obs.metrics, {
			expectedCount: Infinity,
			nodeCount,
			timeoutMs: (durationSeconds + 30) * 1000,
			baselineValue: baselineCounter,
			metricQuery,
		}),
	]);

	// Phase 5: Collect diagnostics
	const diagnostics = await collectDiagnostics(obs.metrics, throughputResult.durationMs);

	// Phase 6: Attach metrics — VictoriaMetrics throughput + autocannon HTTP stats + diagnostics
	await attachThroughputResults(testInfo, dimensions, throughputResult);
	await attachMetric(testInfo, 'http-latency-p50', cannonResult.latency.p50, 'ms', dimensions);
	await attachMetric(testInfo, 'http-latency-p99', cannonResult.latency.p99, 'ms', dimensions);
	await attachMetric(
		testInfo,
		'http-requests-total',
		cannonResult.requests.total,
		'count',
		dimensions,
	);
	await attachMetric(
		testInfo,
		'http-requests-avg',
		cannonResult.requests.average,
		'req/s',
		dimensions,
	);
	await attachMetric(
		testInfo,
		'http-errors',
		cannonResult.errors + cannonResult.non2xx,
		'count',
		dimensions,
	);
	await attachDiagnostics(testInfo, dimensions, diagnostics);

	// Phase 7: Log summary
	const fmt = formatDiagnosticValue;
	console.log(
		`[DIAG-${mode}] ${testInfo.title}\n` +
			`  Event Loop Lag: ${fmt(diagnostics.eventLoopLag, 's')}\n` +
			`  PG Transactions/s: ${fmt(diagnostics.pgTxRate, ' tx/s')}\n` +
			`  PG Active Connections: ${fmt(diagnostics.pgActiveConnections)}`,
	);

	console.log(
		`[WEBHOOK-${mode} RESULT] ${testInfo.title}\n` +
			`  n8n Throughput: ${throughputResult.avgExecPerSec.toFixed(1)} exec/s | ` +
			`${throughputResult.actionsPerSec.toFixed(1)} actions/s\n` +
			`  Peak: ${throughputResult.peakExecPerSec.toFixed(1)} exec/s | ` +
			`${throughputResult.peakActionsPerSec.toFixed(1)} actions/s\n` +
			`  HTTP: ${cannonResult.requests.average.toFixed(1)} req/s | ` +
			`p50: ${cannonResult.latency.p50}ms | p99: ${cannonResult.latency.p99}ms\n` +
			`  Errors: ${cannonResult.errors} timeouts, ${cannonResult.non2xx} non-2xx\n` +
			`  Duration: ${(throughputResult.durationMs / 1000).toFixed(1)}s`,
	);

	expect(throughputResult.totalCompleted).toBeGreaterThan(0);
}
