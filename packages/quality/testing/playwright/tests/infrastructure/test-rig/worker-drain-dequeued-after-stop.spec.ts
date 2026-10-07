import { expect, test } from '@playwright/test';

import {
	chain,
	FILES,
	hook,
	is,
	isNot,
	nodes,
	RigStack,
	Scenario,
	signal,
	waitForExit,
	waitForLog,
	webhookPath,
} from '@n8n/test-rig';

test(
	'worker drain: a job handed to the worker after stop began runs on another worker',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	async () => {
		test.setTimeout(300_000);

		const rig = await RigStack.start({
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
		const s = new Scenario('worker-drain-dequeued-after-stop', rig, test.info().outputPath());

		await s.run(test.info(), async () => {
			await rig.api.signIn();
			const path = webhookPath('after-stop');
			await rig.api.createWorkflow(
				chain('dequeued after stop', [
					nodes.webhook(path),
					nodes.code(
						'Outlasts Grace',
						'await new Promise((resolve) => setTimeout(resolve, 15000));\nreturn [{ json: { ok: true } }];',
					),
				]),
			);

			const workers = rig.workers();
			const job = hook(workers, 'job-before-handler');
			await s.step('armed', async () => await job.arm());
			const hit = job.waitHit(30_000);
			await s.step('webhook', async () => await rig.api.webhook(path));
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
				[
					`for execution ${executionId} after it began to stop`,
					`started execution ${executionId} `,
				],
				30_000,
			);
			await job.release(draining);
			const handledLine = (await handled).line;
			const handedBack = handledLine.includes('after it began to stop');
			s.mark('handler-ran', handedBack ? 'handed-back' : 'started');
			await stop.release(draining);

			const exit = await waitForExit(draining, 60_000);
			s.mark('exited', exit);
			const execution = await rig.db.waitForExecution(executionId, 90_000);
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

			const failed = s.verify({
				after: [
					['handler hands the job back', handedBack, is(true)],
					['job started on the draining worker', s.result.startedOnDraining, is(false)],
					['job started on the other worker', s.result.startedOnOther, is(true)],
					['execution status', execution.status, is('success')],
					['main logs a stalled job', s.result.stallLogged, is(false)],
					['draining worker exit code', exit?.exitCode, is(0)],
				],
				before: [
					['job started on the draining worker', s.result.startedOnDraining, is(true)],
					['job started on the other worker', s.result.startedOnOther, is(false)],
					['execution status', execution.status, isNot('success')],
				],
			});
			expect(failed).toEqual([]);
		});
	},
);
