import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, waitForExit, waitForLog } from './harness';
import { chain, nodes, webhookPath } from './workflows';

test('worker drain: job fetched before SIGTERM finishes or goes back to the queue', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
		name: 'fetched-job',
		workers: 2,
		runners: 'internal',
		scale: 6,
		hooks: [
			{
				point: 'job-before-track',
				file: FILES.executionPersistence,
				target: 'ExecutionPersistence.prototype',
				method: 'findSingleExecution',
				scope: { file: FILES.jobProcessor, target: 'JobProcessor.prototype', method: 'processJob' },
				detail: { jobId: 'scope.args.0.id', executionId: 'scope.args.0.data.executionId' },
			},
		],
	});
	const s = new Scenario('worker-drain-fetched-job', repro, testInfo.outputPath());

	try {
		await repro.signIn();
		const path = webhookPath('fetched');
		await repro.createWorkflow(
			chain('fetched job', [
				nodes.webhook(path),
				nodes.code('Code', 'return [{ json: { ok: true } }];'),
			]),
		);

		const workers = repro.workers();
		const point = hook(workers, 'job-before-track');
		await s.step('armed', async () => await point.arm());

		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await repro.webhook(path));
		const { container: draining, detail } = await hit;
		s.mark('hit', detail);
		await point.disarm(draining);
		const executionId = String(detail.executionId);
		const jobId = String(detail.jobId);

		const stopWatching = new AbortController();
		const drainWaits = waitForLog(
			[draining],
			`(execution IDs: ${executionId})`,
			90_000,
			stopWatching.signal,
		);
		const sigtermAt = await signal(draining, 'SIGTERM');
		s.mark('sigterm');
		const exited = waitForExit(draining, 90_000);
		const anchor = await s.race('anchor', { 'drain-waits': drainWaits, exited });
		stopWatching.abort();
		if (anchor === 'drain-waits')
			await s.step('released', async () => await point.release(draining));

		const exit = await exited;
		s.mark('exited', exit);
		const execution = await repro.waitForExecution(executionId, 90_000);
		const bull = await repro.bull(jobId);
		const logs = await s.collectLogs();

		s.set({
			executionId,
			jobId,
			anchor,
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
			execution,
			bull,
			stallLogged: logs.main.includes('stalled more than maxStalledCount'),
		});

		if (s.variant === 'after') {
			expect.soft(s.result.stallLogged, 'main logs a stalled job').toBe(false);
			expect.soft(execution.status, 'execution status').toBe('success');
			expect.soft(bull.active, 'job left active').not.toContain(jobId);
			expect.soft(bull.job?.lock, 'job lock left behind').toBe(false);
			expect.soft(exit?.exitCode, 'draining worker exit code').toBe(0);
		} else {
			expect.soft(anchor, 'worker exits without waiting for the job').toBe('exited');
			expect.soft(s.result.stallLogged, 'main logs a stalled job').toBe(true);
			expect.soft(execution.stalledError, 'execution fails as stalled').toBe(true);
		}
	} finally {
		s.finish(testInfo.errors.length === 0);
		await repro.stop();
	}
});
