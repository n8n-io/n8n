import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, waitForExit, waitForLog } from './harness';
import { chain, nodes, webhookPath } from './workflows';

const GRACE_S = 10;

test('worker drain: a worker does not wait on the error workflow it enqueued', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
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
	const s = new Scenario('worker-drain-own-error-workflow', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const errorWorkflowId = await repro.createWorkflow(
			chain('error handler', [nodes.errorTrigger(), nodes.noOp('Handled')]),
			{ activate: 'try' },
		);
		const path = webhookPath('own-error');
		await repro.createWorkflow(
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

		const worker = repro.worker(1);
		const point = hook([worker], 'node-before-run');
		await s.step('armed', async () => await point.arm());
		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await repro.webhook(path));
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
		const failing = await repro.execution(failingExecutionId);
		const errorExecution = await repro.execution(errorExecutionId);
		const bull = await repro.bull(errorJobId);
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
		if (s.variant === 'after') {
			expect.soft(exit?.exitCode, 'worker exit code').toBe(0);
			expect
				.soft(Number(s.result.exitAfterSigtermMs), 'exit inside the window')
				.toBeLessThan(GRACE_S * 1000);
			expect.soft(s.result.shutdownTimedOut, 'shutdown timed out').toBe(false);
			expect.soft(bull.wait, 'error workflow job waits for another worker').toContain(errorJobId);
			expect.soft(errorExecution.status, 'error workflow execution status').toBe('new');
		} else {
			expect.soft(s.result.shutdownTimedOut, 'shutdown timed out').toBe(true);
			expect.soft(exit?.exitCode, 'worker exit code').toBe(1);
		}
	});
});
