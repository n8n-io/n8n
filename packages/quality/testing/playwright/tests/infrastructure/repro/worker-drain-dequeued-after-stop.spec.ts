import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, waitForExit, waitForLog } from './harness';
import { chain, nodes, webhookPath } from './workflows';

test('worker drain: a job handed to the worker after stop began runs on another worker', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
		name: 'dequeued-after-stop',
		workers: 2,
		runners: 'internal',
		scale: 6,
		hooks: [
			{
				point: 'job-before-handler',
				file: FILES.bullQueue,
				target: 'prototype',
				method: 'processJob',
				detail: { jobId: 'args.0.id', executionId: 'args.0.data.executionId' },
			},
			{
				point: 'queues-before-pause',
				file: FILES.scalingService,
				target: 'ScalingService.prototype',
				method: 'pauseAllQueues',
			},
		],
	});
	const s = new Scenario('worker-drain-dequeued-after-stop', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const path = webhookPath('after-stop');
		await repro.createWorkflow(
			chain('dequeued after stop', [
				nodes.webhook(path),
				nodes.code(
					'Outlasts Grace',
					'await new Promise((resolve) => setTimeout(resolve, 15000));\nreturn [{ json: { ok: true } }];',
				),
			]),
		);

		const workers = repro.workers();
		const job = hook(workers, 'job-before-handler');
		await s.step('armed', async () => await job.arm());
		const hit = job.waitHit(30_000);
		await s.step('webhook', async () => await repro.webhook(path));
		const { container: draining, detail } = await hit;
		await job.disarm(draining);
		const other = workers.find((w) => w !== draining);
		const executionId = String(detail.executionId);
		const jobId = String(detail.jobId);
		s.mark('job-fetched', detail);

		const stop = hook([draining], 'queues-before-pause');
		await stop.arm();
		const stopBegan = stop.waitHit(30_000);
		const sigtermAt = await signal(draining, 'SIGTERM');
		s.mark('sigterm');
		await stopBegan;
		s.mark('stop-began');

		const handled = waitForLog(
			[draining],
			[`for execution ${executionId} after it began to stop`, `started execution ${executionId} `],
			30_000,
		);
		await job.release(draining);
		const handledLine = (await handled).line;
		const handedBack = handledLine.includes('after it began to stop');
		s.mark('handler-ran', handedBack ? 'handed-back' : 'started');
		await stop.release(draining);

		const exit = await waitForExit(draining, 60_000);
		s.mark('exited', exit);
		const execution = await repro.waitForExecution(executionId, 90_000);
		const logs = await s.collectLogs();
		const drainingName = `worker-${workers.indexOf(draining) + 1}`;
		const otherName = `worker-${workers.indexOf(other!) + 1}`;
		const started = `started execution ${executionId} `;

		s.set({
			executionId,
			jobId,
			handedBack,
			execution,
			startedOnDraining: logs[drainingName].includes(started),
			startedOnOther: logs[otherName].includes(started),
			stallLogged: logs.main.includes('stalled more than maxStalledCount'),
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
		});

		if (s.variant === 'after') {
			expect.soft(handedBack, 'handler hands the job back').toBe(true);
			expect.soft(s.result.startedOnDraining, 'job started on the draining worker').toBe(false);
			expect.soft(s.result.startedOnOther, 'job started on the other worker').toBe(true);
			expect.soft(execution.status, 'execution status').toBe('success');
			expect.soft(s.result.stallLogged, 'main logs a stalled job').toBe(false);
			expect.soft(exit?.exitCode, 'draining worker exit code').toBe(0);
		} else {
			expect.soft(s.result.startedOnDraining, 'job started on the draining worker').toBe(true);
			expect.soft(s.result.startedOnOther, 'job started on the other worker').toBe(false);
			expect.soft(execution.status, 'execution status').not.toBe('success');
		}
	});
});
