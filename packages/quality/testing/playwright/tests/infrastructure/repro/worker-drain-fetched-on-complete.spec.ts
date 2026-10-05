import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, until, waitForExit } from './harness';
import { chain, nodes, webhookPath } from './workflows';

test('worker drain: a job fetched on completing another goes back to the queue', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
		name: 'fetched-on-complete',
		workers: 2,
		runners: 'internal',
		scale: 6,
		env: { N8N_CONCURRENCY_PRODUCTION_LIMIT: '1' },
		hooks: [
			{
				point: 'node-before-run',
				file: FILES.workflowExecute,
				target: 'WorkflowExecute.prototype',
				method: 'runNode',
				where: [{ path: 'args.1.node.name', equals: 'Pause' }],
				detail: { executionId: 'args.4.executionId' },
			},
			{
				point: 'fetch-on-complete',
				file: FILES.bullScripts,
				target: '',
				method: 'moveToCompleted',
				phase: 'after',
				where: [{ path: 'result.1', truthy: true }],
				detail: { completedJobId: 'args.0.id', nextJobId: 'result.1' },
			},
		],
	});
	const s = new Scenario('worker-drain-fetched-on-complete', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const path = webhookPath('on-complete');
		const workflowId = await repro.createWorkflow(
			chain('fetched on complete', [
				nodes.webhook(path),
				nodes.noOp('Pause'),
				nodes.code('Code', 'return [{ json: { ok: true } }];'),
			]),
		);

		const workers = repro.workers();
		const busy = hook(workers, 'node-before-run');
		await busy.arm();

		const first = busy.waitHit(30_000);
		await repro.webhook(path);
		const { container: draining } = await first;
		const other = workers.find((w) => w !== draining)!;
		const second = busy.waitHit(30_000);
		await repro.webhook(path);
		await second;
		s.mark('both-workers-busy');

		await repro.webhook(path);
		await until('third job waits', async () => (await repro.bull()).wait.length === 1, 30_000);
		s.mark('third-job-waits');

		const fetch = hook([draining], 'fetch-on-complete');
		await fetch.arm();
		const fetched = fetch.waitHit(30_000);
		await busy.release(draining);
		const { detail } = await fetched;
		const jobId = String(detail.nextJobId);
		s.mark('fetched-on-complete', detail);

		const sigtermAt = await signal(draining, 'SIGTERM');
		s.mark('sigterm');
		const exited = waitForExit(draining, 60_000);
		const anchor = await s.race('anchor', {
			'back-in-wait': until(
				'job back in wait',
				async () => (await repro.bull()).wait.includes(jobId),
				60_000,
			),
			exited,
		});
		await busy.release(other);
		await fetch.release(draining);

		const exit = await exited;
		s.mark('exited', exit);
		const executionIds = await repro.executionsOf(workflowId);
		const executionId = (await repro.redis('HGET', `bull:jobs:${jobId}`, 'data')).match(
			/"executionId":"(\d+)"/,
		)?.[1];
		const thirdId = executionId ?? executionIds[2];
		const execution = await repro.waitForExecution(thirdId, 90_000);
		const logs = await s.collectLogs();
		const started = `started execution ${thirdId} `;

		s.set({
			jobId,
			executionId: thirdId,
			anchor,
			execution,
			startedOnDraining: logs[`worker-${workers.indexOf(draining) + 1}`].includes(started),
			startedOnOther: logs[`worker-${workers.indexOf(other) + 1}`].includes(started),
			stallLogged: logs.main.includes('stalled more than maxStalledCount'),
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
		});

		if (s.variant === 'after') {
			expect.soft(anchor, 'job goes back to wait before the worker exits').toBe('back-in-wait');
			expect.soft(execution.status, 'execution status').toBe('success');
			expect.soft(s.result.startedOnOther, 'job started on the other worker').toBe(true);
			expect.soft(s.result.stallLogged, 'main logs a stalled job').toBe(false);
			expect.soft(exit?.exitCode, 'draining worker exit code').toBe(0);
		} else {
			expect.soft(anchor, 'worker exits with the job still active').toBe('exited');
			expect.soft(execution.stalledError, 'execution fails as stalled').toBe(true);
		}
	});
});
