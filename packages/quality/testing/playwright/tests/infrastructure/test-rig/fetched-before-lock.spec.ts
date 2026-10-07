import { expect, test } from '@playwright/test';

import {
	chain,
	FILES,
	hook,
	is,
	nodes,
	RigStack,
	Scenario,
	stopAllStacks,
	waitForLog,
	webhookPath,
} from '@n8n/test-rig';

test.afterEach(async () => await stopAllStacks());

test(
	'job moved to active before the worker takes its lock is not failed as stalled',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	async () => {
		test.setTimeout(300_000);

		const rig = await RigStack.start({
			name: 'before-lock',
			workers: 1,
			runners: 'internal',
			scale: 6,
			hooks: [
				{
					point: 'fetched-before-lock',
					file: FILES.bullQueue,
					target: 'prototype',
					method: 'moveToActive',
					where: [{ path: 'args.0', truthy: true }],
					detail: { jobId: 'args.0' },
				},
			],
		});
		const s = new Scenario('fetched-before-lock', rig, test.info().outputPath());

		await s.run(test.info(), async () => {
			await rig.api.signIn();
			const path = webhookPath('before-lock');
			await rig.api.createWorkflow(
				chain('before lock', [
					nodes.webhook(path),
					nodes.code('Code', 'return [{ json: { ok: true } }];'),
				]),
			);

			const worker = rig.worker(1);
			const point = hook([worker], 'fetched-before-lock');
			await s.step('armed', async () => await point.arm());
			const hit = point.waitHit(30_000);
			const enqueued = waitForLog([rig.main()], 'Enqueued execution', 30_000);
			await s.step('webhook', async () => await rig.api.webhook(path));
			const jobId = String((await hit).detail.jobId);
			const executionId = /Enqueued execution (\d+)/.exec((await enqueued).line)?.[1] ?? '';
			s.mark('hit', { jobId, executionId });

			const execution = await s.step(
				'execution-settled',
				async () => await rig.db.waitForExecution(executionId, 90_000),
			);
			const bull = await rig.redis.bull(jobId);
			await point.release(worker);
			const logs = await s.collectLogs();

			s.set({
				jobId,
				executionId,
				execution,
				bull,
				stallLogged: logs.main.includes('stalled more than maxStalledCount'),
			});

			const failed = s.verify({
				after: [
					['execution status', execution.status, is('success')],
					['execution failed as stalled', execution.stalledError, is(false)],
					['main logs a stalled job', s.result.stallLogged, is(false)],
				],
				before: [
					['execution failed as stalled', execution.stalledError, is(true)],
					['main logs a stalled job', s.result.stallLogged, is(true)],
				],
			});
			expect(failed).toEqual([]);
		});
	},
);
