import { expect, test } from '@playwright/test';

import {
	chain,
	FILES,
	hook,
	includes,
	is,
	nodes,
	RigStack,
	Scenario,
	signal,
	until,
	waitForExit,
	webhookPath,
} from '@n8n/test-rig';

const GRACE_S = 5;

test(
	'stalled job that succeeded: main settles the execution and shuts down cleanly',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	async () => {
		test.setTimeout(300_000);

		const rig = await RigStack.start({
			name: 'stalled-success',
			workers: 1,
			runners: 'internal',
			scale: 6,
			hooks: [
				{
					point: 'lock-renew-drop',
					file: FILES.bullScripts,
					target: '',
					method: 'extendLock',
					kind: 'drop',
					returns: 0,
					detail: { jobId: 'args.1' },
				},
				{
					point: 'job-before-complete',
					file: FILES.bullJob,
					target: 'prototype',
					method: 'moveToCompleted',
					detail: { jobId: 'this.id', executionId: 'this.data.executionId' },
				},
			],
		});
		const s = new Scenario('stalled-success-leak', rig, test.info().outputPath());

		await s.run(test.info(), async () => {
			await rig.api.signIn();
			const path = webhookPath('stalled-success');
			const marker = `marker-${Date.now()}`;
			await rig.api.createWorkflow(
				chain('stalled success', [
					nodes.webhook(path, 'lastNode'),
					nodes.code('Reply', `return [{ json: { marker: '${marker}' } }];`),
				]),
			);

			const worker = rig.worker(1);
			const drop = hook([worker], 'lock-renew-drop');
			const complete = hook([worker], 'job-before-complete');
			await s.step('armed', async () => {
				await drop.arm();
				await complete.arm();
			});

			await rig.api.waitForWebhook(path);
			const hit = complete.waitHit(30_000);
			const request = rig.api.webhookInBackground(path);
			const { detail } = await hit;
			s.mark('hit', detail);
			const jobId = String(detail.jobId);
			const executionId = String(detail.executionId);
			const rowBeforeStall = await rig.db.execution(executionId);

			await until('lock expired', async () => !(await rig.redis.bullJob(jobId)).lock, 60_000);
			s.mark('lock-expired');
			await until(
				'stall sweep failed the job',
				async () => !(await rig.redis.bull()).active.includes(jobId),
				60_000,
			);
			s.mark('job-failed-by-sweep');
			await drop.disarm();
			await s.step('released', async () => await complete.release(worker));

			const responded = await Promise.race([
				request.result,
				new Promise<undefined>((r) => setTimeout(() => r(undefined), 20_000)),
			]);
			request.abort();
			const response = responded ?? (await request.result);
			s.mark('webhook-settled', response.status);

			const main = rig.main();
			const sigtermAt = await signal(main, 'SIGTERM');
			s.mark('main-sigterm');
			const exit = await waitForExit(main, (GRACE_S + 15) * 1000);
			s.mark('main-exited', exit);
			const logs = await s.collectLogs();

			s.set({
				jobId,
				executionId,
				rowBeforeStall,
				execution: await rig.db.execution(executionId),
				webhook: {
					status: response.status,
					hasMarker: response.body.includes(marker),
					ms: response.ms,
				},
				mainWaited: logs.main.includes('Waiting for 1 active executions to finish'),
				mainTimedOut: logs.main.includes('Shutdown timed out after'),
				mainExitCode: exit?.exitCode ?? null,
				mainExitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
			});

			expect(rowBeforeStall.status, 'execution succeeded before the stall').toBe('success');
			const failed = s.verify({
				after: [
					['webhook response status', response.status, is(200)],
					['webhook response body', response.body, includes(marker)],
					['main shutdown timed out', s.result.mainTimedOut, is(false)],
					['main exit code', exit?.exitCode, is(0)],
				],
				before: [
					['webhook never answered', response.status, is(0)],
					['main shutdown timed out', s.result.mainTimedOut, is(true)],
					['main exit code', exit?.exitCode, is(1)],
				],
			});
			expect(failed).toEqual([]);
		});
	},
);
