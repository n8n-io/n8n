import { expect, test } from '@playwright/test';
import { nanoid } from 'nanoid';

import {
	hook,
	logs,
	recordResult,
	ReproStack,
	signal,
	waitForExit,
	waitForLog,
	writeLogs,
} from './harness';

const SCALE = 6;

const webhookWorkflow = (path: string) => ({
	name: `drain ${path}`,
	nodes: [
		{
			id: 'wh',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			webhookId: path,
			parameters: { httpMethod: 'POST', path, responseMode: 'onReceived' },
		},
		{
			id: 'code',
			name: 'Code',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [200, 0],
			parameters: { jsCode: 'return [{ json: { ok: true } }];' },
		},
	],
	connections: { Webhook: { main: [[{ node: 'Code', type: 'main', index: 0 }]] } },
	settings: { executionOrder: 'v1' },
});

test('worker finishes or hands back a job fetched before SIGTERM', async ({}, testInfo) => {
	test.setTimeout(300_000);
	const image = process.env.TEST_IMAGE_N8N ?? 'n8nio/n8n:local';

	const repro = await ReproStack.start({
		name: 'drain',
		workers: 2,
		runners: 'internal',
		scale: SCALE,
	});

	const result: Record<string, unknown> = {
		scenario: 'worker-drain-fetched-job',
		image,
		scale: SCALE,
		stackStartMs: repro.timings.stackStartMs,
	};
	const scenarioStart = Date.now();

	try {
		await repro.signIn();
		const path = `drain-${nanoid(8)}`;
		await repro.activeWorkflow(webhookWorkflow(path));

		const workers = repro.workers();
		const point = hook(workers, 'job-before-track');
		await point.arm();

		const hit = point.waitHit(30_000);
		const webhook = await repro.webhook(path);
		expect(webhook.status).toBe(200);

		const { container: draining, detail, hitAt } = await hit;
		await point.disarm(draining);
		const other = workers.find((w) => w !== draining);
		const { executionId, jobId } = detail;

		const paused = waitForLog([draining], ['Paused all queues', 'Paused queue'], 15_000).catch(
			() => undefined,
		);
		const stopWatching = new AbortController();
		const drainWaits = waitForLog(
			[draining],
			`(execution IDs: ${executionId})`,
			90_000,
			stopWatching.signal,
		).then(
			() => 'drain-waits' as const,
			() => 'exited' as const,
		);
		const sigtermAt = await signal(draining, 'SIGTERM');
		const exited = waitForExit(draining, 90_000);
		const pausedLog = await paused;
		const anchor = await Promise.race([drainWaits, exited.then(() => 'exited' as const)]);
		stopWatching.abort();
		const releaseRttMs = anchor === 'drain-waits' ? await point.release(draining) : undefined;

		const exit = await exited;
		result.releaseAnchor = anchor;
		const execution = await repro.waitForExecution(executionId, 60_000);
		const bull = await repro.bull(jobId);

		const mainLog = await logs(repro.main());
		const drainingLog = await logs(draining);
		const otherLog = other ? await logs(other) : '';
		const started = `started execution ${executionId} `;

		Object.assign(result, {
			executionId,
			jobId,
			drainingWorker: draining.getName(),
			hitAfterWebhookMs: hitAt - scenarioStart,
			queuesPausedAfterSigtermMs: pausedLog ? pausedLog.at - sigtermAt : null,
			releaseRttMs: releaseRttMs ?? null,
			releaseDelivered: releaseRttMs !== undefined,
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
			execution,
			bull,
			stallLogged: mainLog.includes('stalled more than maxStalledCount'),
			startedOnDraining: drainingLog.includes(started),
			startedOnOther: otherLog.includes(started),
			scenarioMs: Date.now() - scenarioStart,
		});

		const dir = testInfo.outputPath('logs');
		writeLogs(dir, 'main', mainLog);
		writeLogs(dir, 'worker-draining', drainingLog);
		writeLogs(dir, 'worker-other', otherLog);

		expect.soft(result.stallLogged, 'main logs a stalled job').toBe(false);
		expect.soft(execution.stalledError, 'execution failed as stalled').toBe(false);
		expect.soft(execution.status, 'execution status').toBe('success');
		expect.soft(bull.active, 'job left active').not.toContain(jobId);
		expect.soft(bull.job?.lock, 'job lock left behind').not.toBe(true);
		expect.soft(exit?.exitCode, 'draining worker exit code').toBe(0);
	} finally {
		result.passed = testInfo.errors.length === 0;
		recordResult(result);
		await repro.stop();
	}
});
