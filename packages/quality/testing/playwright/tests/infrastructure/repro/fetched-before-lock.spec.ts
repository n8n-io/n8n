import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, waitForLog } from './harness';
import { chain, nodes, webhookPath } from './workflows';

test('job moved to active before the worker takes its lock is not failed as stalled', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
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
	const s = new Scenario('fetched-before-lock', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const path = webhookPath('before-lock');
		await repro.createWorkflow(
			chain('before lock', [
				nodes.webhook(path),
				nodes.code('Code', 'return [{ json: { ok: true } }];'),
			]),
		);

		const worker = repro.worker(1);
		const point = hook([worker], 'fetched-before-lock');
		await s.step('armed', async () => await point.arm());
		const hit = point.waitHit(30_000);
		const enqueued = waitForLog([repro.main()], 'Enqueued execution', 30_000);
		await s.step('webhook', async () => await repro.webhook(path));
		const jobId = String((await hit).detail.jobId);
		const executionId = /Enqueued execution (\d+)/.exec((await enqueued).line)?.[1] ?? '';
		s.mark('hit', { jobId, executionId });

		const execution = await s.step(
			'execution-settled',
			async () => await repro.waitForExecution(executionId, 90_000),
		);
		const bull = await repro.bull(jobId);
		await point.release(worker);
		const logs = await s.collectLogs();

		s.set({
			jobId,
			executionId,
			execution,
			bull,
			stallLogged: logs.main.includes('stalled more than maxStalledCount'),
		});

		if (s.variant === 'after') {
			expect.soft(execution.status, 'execution status').toBe('success');
			expect.soft(execution.stalledError, 'execution failed as stalled').toBe(false);
			expect.soft(s.result.stallLogged, 'main logs a stalled job').toBe(false);
		} else {
			expect.soft(execution.stalledError, 'execution failed as stalled').toBe(true);
			expect.soft(s.result.stallLogged, 'main logs a stalled job').toBe(true);
		}
	});
});
