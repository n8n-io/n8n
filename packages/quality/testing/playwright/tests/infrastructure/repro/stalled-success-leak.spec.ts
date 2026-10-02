import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, until, waitForExit } from './harness';
import { chain, nodes, webhookPath } from './workflows';

const GRACE_S = 5;

test('stalled job that succeeded: main settles the execution and shuts down cleanly', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
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
	const s = new Scenario('stalled-success-leak', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const path = webhookPath('stalled-success');
		const marker = `marker-${Date.now()}`;
		await repro.createWorkflow(
			chain('stalled success', [
				nodes.webhook(path, 'lastNode'),
				nodes.code('Reply', `return [{ json: { marker: '${marker}' } }];`),
			]),
		);

		const worker = repro.worker(1);
		const drop = hook([worker], 'lock-renew-drop');
		const complete = hook([worker], 'job-before-complete');
		await s.step('armed', async () => {
			await drop.arm();
			await complete.arm();
		});

		const hit = complete.waitHit(30_000);
		const request = repro.webhookInBackground(path);
		const { detail } = await hit;
		s.mark('hit', detail);
		const jobId = String(detail.jobId);
		const executionId = String(detail.executionId);
		const rowBeforeStall = await repro.execution(executionId);

		await until('lock expired', async () => !(await repro.bullJob(jobId)).lock, 60_000);
		s.mark('lock-expired');
		await until(
			'stall sweep failed the job',
			async () => !(await repro.bull()).active.includes(jobId),
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

		const main = repro.main();
		const sigtermAt = await signal(main, 'SIGTERM');
		s.mark('main-sigterm');
		const exit = await waitForExit(main, (GRACE_S + 15) * 1000);
		s.mark('main-exited', exit);
		const logs = await s.collectLogs();

		s.set({
			jobId,
			executionId,
			rowBeforeStall,
			execution: await repro.execution(executionId),
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
		if (s.variant === 'after') {
			expect.soft(response.status, 'webhook response status').toBe(200);
			expect.soft(response.body, 'webhook response body').toContain(marker);
			expect.soft(s.result.mainTimedOut, 'main shutdown timed out').toBe(false);
			expect.soft(exit?.exitCode, 'main exit code').toBe(0);
		} else {
			expect.soft(response.status, 'webhook never answered').toBe(0);
			expect.soft(s.result.mainTimedOut, 'main shutdown timed out').toBe(true);
			expect.soft(exit?.exitCode, 'main exit code').toBe(1);
		}
	});
});
