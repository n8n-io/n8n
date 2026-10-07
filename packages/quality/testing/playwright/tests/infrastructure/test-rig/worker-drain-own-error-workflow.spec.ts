import { expect, test } from '@playwright/test';

import {
	below,
	chain,
	FILES,
	hook,
	includes,
	is,
	nodes,
	RigStack,
	Scenario,
	signal,
	waitForExit,
	waitForLog,
	webhookPath,
} from '@n8n/test-rig';

const GRACE_S = 10;

test('worker drain: a worker does not wait on the error workflow it enqueued', async () => {
	test.setTimeout(300_000);

	const rig = await RigStack.start({
		name: 'own-error-wf',
		workers: 1,
		runners: 'internal',
		scale: 3,
		hooks: [
			{
				point: 'node-before-run',
				file: FILES.workflowExecute,
				target: 'WorkflowExecute.prototype',
				method: 'runNode',
				where: [{ path: 'args.1.node.name', equals: 'Pause' }],
				detail: { executionId: 'args.4.executionId' },
			},
		],
	});
	const s = new Scenario('worker-drain-own-error-workflow', rig, test.info().outputPath());

	await s.run(test.info(), async () => {
		await rig.api.signIn();
		const errorWorkflowId = await rig.api.createWorkflow(
			chain('error handler', [nodes.errorTrigger(), nodes.noOp('Handled')]),
			{ activate: 'try' },
		);
		const path = webhookPath('own-error');
		await rig.api.createWorkflow(
			chain(
				'fails on purpose',
				[
					nodes.webhook(path),
					nodes.noOp('Pause'),
					nodes.stopAndError('Fail', 'failing on purpose'),
				],
				{ errorWorkflow: errorWorkflowId },
			),
		);

		const worker = rig.worker(1);
		const point = hook([worker], 'node-before-run');
		await s.step('armed', async () => await point.arm());
		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await rig.api.webhook(path));
		const failingExecutionId = String((await hit).detail.executionId);
		s.mark('hit', failingExecutionId);

		const drainWaits = waitForLog([worker], `(execution IDs: ${failingExecutionId})`, 30_000);
		const sigtermAt = await signal(worker, 'SIGTERM');
		s.mark('sigterm');
		await drainWaits;
		s.mark('drain-waits');
		const enqueued = waitForLog([worker], 'Enqueued execution', 30_000);
		await s.step('released', async () => await point.release(worker));
		const match = /Enqueued execution (\d+) \(job (\d+)\)/.exec((await enqueued).line);
		const errorExecutionId = match?.[1] ?? '';
		const errorJobId = match?.[2] ?? '';
		s.mark('error-workflow-enqueued', { errorExecutionId, errorJobId });

		const exit = await waitForExit(worker, (GRACE_S + 15) * 1000);
		s.mark('exited', exit);
		const failing = await rig.db.execution(failingExecutionId);
		const errorExecution = await rig.db.execution(errorExecutionId);
		const bull = await rig.redis.bull(errorJobId);
		const logs = await s.collectLogs();

		s.set({
			failingExecutionId,
			errorExecutionId,
			errorJobId,
			failing,
			errorExecution,
			bull,
			shutdownTimedOut: logs['worker-1'].includes('Shutdown timed out after'),
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
		});

		expect(errorExecutionId, 'error workflow enqueued').not.toBe('');
		expect.soft(failing.status, 'failing execution status').toBe('error');
		const failed = s.verify({
			after: [
				['worker exit code', exit?.exitCode, is(0)],
				['exit inside the window', s.result.exitAfterSigtermMs, below(GRACE_S * 1000)],
				['shutdown timed out', s.result.shutdownTimedOut, is(false)],
				['error workflow job waits for another worker', bull.wait, includes(errorJobId)],
				['error workflow execution status', errorExecution.status, is('new')],
			],
			before: [
				['shutdown timed out', s.result.shutdownTimedOut, is(true)],
				['worker exit code', exit?.exitCode, is(1)],
			],
		});
		expect(failed).toEqual([]);
	});
});
