import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, waitForExit } from './harness';
import { chain, nodes, webhookPath } from './workflows';

const GRACE_S = 10;

test('worker drain: a task request no runner accepts ends inside the shutdown window', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
		name: 'pending-request',
		workers: 1,
		runners: 'external',
		scale: 3,
		env: { N8N_RUNNERS_TASK_REQUEST_TIMEOUT: '60' },
		hooks: [
			{
				point: 'task-requested',
				file: FILES.taskBroker,
				target: 'TaskBroker.prototype',
				method: 'taskRequested',
				kind: 'observe',
				detail: { requestId: 'args.0.requestId', taskType: 'args.0.taskType' },
			},
		],
	});
	const s = new Scenario('worker-drain-pending-task-request', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const path = webhookPath('pending');
		const workflowId = await repro.createWorkflow(
			chain('pending request', [
				nodes.webhook(path),
				nodes.code('Code', 'return [{ json: { ok: true } }];'),
			]),
		);

		const runner = repro.runner();
		await s.step('runner-killed', async () => {
			await signal(runner, 'SIGKILL');
			await waitForExit(runner, 30_000);
		});

		const worker = repro.worker(1);
		const point = hook([worker], 'task-requested');
		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await repro.webhook(path));
		s.mark('task-requested', (await hit).detail);
		const [executionId] = await repro.executionsOf(workflowId);

		const sigtermAt = await signal(worker, 'SIGTERM');
		s.mark('sigterm');
		const exit = await waitForExit(worker, (GRACE_S + 30) * 1000);
		s.mark('exited', exit);
		const execution = await repro.waitForExecution(executionId, 15_000);
		const requestTimedOut = await repro.executionDataContains(
			executionId,
			'Task request timed out',
		);
		const bull = await repro.bull();
		const logs = await s.collectLogs();

		s.set({
			executionId,
			execution,
			requestTimedOut,
			bull,
			shutdownTimedOut: logs['worker-1'].includes('Shutdown timed out after'),
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
		});

		if (s.variant === 'after') {
			expect.soft(exit?.exitCode, 'worker exit code').toBe(0);
			expect
				.soft(Number(s.result.exitAfterSigtermMs), 'exit inside the window')
				.toBeLessThan(GRACE_S * 1000);
			expect.soft(s.result.shutdownTimedOut, 'shutdown timed out').toBe(false);
			expect.soft(execution.status, 'execution status').toBe('error');
			expect.soft(requestTimedOut, 'execution failed on its task request').toBe(true);
		} else {
			expect.soft(s.result.shutdownTimedOut, 'shutdown timed out').toBe(true);
			expect.soft(exit?.exitCode, 'worker exit code').toBe(1);
			expect.soft(requestTimedOut, 'execution failed on its task request').toBe(false);
		}
	});
});
