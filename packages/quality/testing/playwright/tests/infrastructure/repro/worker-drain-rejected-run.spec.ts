import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, waitForExit, waitForLog } from './harness';
import { chain, nodes, webhookPath } from './workflows';

const GRACE_S = 5;

test('worker drain: a job whose run rejects no longer holds the drain', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
		name: 'rejected-run',
		workers: 1,
		runners: 'internal',
		scale: 6,
		hooks: [
			{
				point: 'run-reject',
				file: FILES.workflowExecute,
				target: 'WorkflowExecute.prototype',
				method: 'processRunExecutionData',
				kind: 'fault',
				phase: 'after',
				preserve: ['cancel'],
				detail: { executionId: 'this.additionalData.executionId' },
			},
		],
	});
	const s = new Scenario('worker-drain-rejected-run', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const path = webhookPath('rejected');
		await repro.createWorkflow(chain('rejected run', [nodes.webhook(path), nodes.noOp('Done')]));

		const worker = repro.worker(1);
		const point = hook([worker], 'run-reject');
		await s.step('armed', async () => await point.arm());
		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await repro.webhook(path));
		const executionId = String((await hit).detail.executionId);
		s.mark('hit', executionId);
		await waitForLog([worker], `Worker errored while running execution ${executionId} `, 30_000);
		s.mark('run-rejected');

		const sigtermAt = await signal(worker, 'SIGTERM');
		s.mark('sigterm');
		const exit = await waitForExit(worker, (GRACE_S + 15) * 1000);
		s.mark('exited', exit);
		const logs = await s.collectLogs();

		s.set({
			executionId,
			drainWaited: logs['worker-1'].includes('Waiting for 1 active executions to finish'),
			shutdownTimedOut: logs['worker-1'].includes('Shutdown timed out after'),
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
		});

		if (s.variant === 'after') {
			expect.soft(s.result.drainWaited, 'drain waits on the rejected job').toBe(false);
			expect.soft(s.result.shutdownTimedOut, 'shutdown timed out').toBe(false);
			expect.soft(exit?.exitCode, 'worker exit code').toBe(0);
			expect
				.soft(Number(s.result.exitAfterSigtermMs), 'exit inside the window')
				.toBeLessThan(GRACE_S * 1000);
		} else {
			expect.soft(s.result.drainWaited, 'drain waits on the rejected job').toBe(true);
			expect.soft(s.result.shutdownTimedOut, 'shutdown timed out').toBe(true);
			expect.soft(exit?.exitCode, 'worker exit code').toBe(1);
		}
	});
});
