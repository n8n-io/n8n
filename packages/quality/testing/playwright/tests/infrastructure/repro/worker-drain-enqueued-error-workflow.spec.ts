import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, waitForExit, waitForLog } from './harness';
import { chain, nodes, webhookPath } from './workflows';

const GRACE_S = 10;

test('worker drain: an error workflow enqueued during the drain stays queued', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
		name: 'enqueued-error-wf',
		workers: 1,
		runners: 'internal',
		scale: 3,
		hooks: [
			{
				point: 'enqueue-before-add',
				file: FILES.scalingService,
				target: 'ScalingService.prototype',
				method: 'addJob',
				detail: { executionId: 'args.0.executionId', workflowId: 'args.0.workflowId' },
			},
		],
	});
	const s = new Scenario('worker-drain-enqueued-error-workflow', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const errorWorkflowId = await repro.createWorkflow(
			chain('error handler', [nodes.errorTrigger(), nodes.noOp('Handled')]),
			{ activate: 'try' },
		);
		const path = webhookPath('enqueued-error');
		await repro.createWorkflow(
			chain(
				'throws on purpose',
				[nodes.webhook(path), nodes.code('Throw', "throw new Error('failing on purpose');")],
				{ errorWorkflow: errorWorkflowId },
			),
		);

		const worker = repro.worker(1);
		const point = hook([worker], 'enqueue-before-add');
		await s.step('armed', async () => await point.arm());
		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await repro.webhook(path));
		const { detail } = await hit;
		s.mark('hit', detail);
		const errorExecutionId = String(detail.executionId);
		expect(String(detail.workflowId), 'paused enqueue is the error workflow').toBe(errorWorkflowId);

		const drainWaits = waitForLog([worker], `(execution IDs: ${errorExecutionId})`, 30_000);
		const sigtermAt = await signal(worker, 'SIGTERM');
		s.mark('sigterm');
		await drainWaits;
		s.mark('drain-waits');
		const enqueued = waitForLog([worker], `Enqueued execution ${errorExecutionId} `, 30_000);
		await s.step('released', async () => await point.release(worker));
		const errorJobId = /\(job (\d+)\)/.exec((await enqueued).line)?.[1] ?? '';
		s.mark('enqueued', errorJobId);

		const exit = await waitForExit(worker, (GRACE_S + 15) * 1000);
		s.mark('exited', exit);
		const errorExecution = await repro.execution(errorExecutionId);
		const bull = await repro.bull(errorJobId);
		const logs = await s.collectLogs();
		const cancelled = logs['worker-1'].includes(
			`in-process executions that could not finish before shutdown (execution IDs: ${errorExecutionId})`,
		);

		s.set({
			errorExecutionId,
			errorJobId,
			errorExecution,
			bull,
			cancelled,
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
		});

		expect(errorJobId, 'error workflow enqueued').not.toBe('');
		if (s.variant === 'after') {
			expect.soft(cancelled, 'drain cancels the error workflow').toBe(false);
			expect.soft(bull.wait, 'error workflow job waits for another worker').toContain(errorJobId);
			expect.soft(errorExecution.status, 'error workflow execution status').toBe('new');
		} else {
			expect.soft(cancelled, 'drain cancels the error workflow').toBe(true);
			expect.soft(bull.wait, 'error workflow job removed').not.toContain(errorJobId);
			expect.soft(bull.job?.exists, 'error workflow job key removed').toBe(false);
		}
	});
});
