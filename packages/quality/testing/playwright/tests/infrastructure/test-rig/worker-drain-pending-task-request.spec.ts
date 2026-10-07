import { expect, test } from '@playwright/test';

import {
	below,
	chain,
	FILES,
	hook,
	is,
	nodes,
	RigStack,
	Scenario,
	signal,
	waitForExit,
	webhookPath,
} from '@n8n/test-rig';

const GRACE_S = 10;

test('worker drain: a task request no runner accepts ends inside the shutdown window', async () => {
	test.setTimeout(300_000);

	const rig = await RigStack.start({
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
	const s = new Scenario('worker-drain-pending-task-request', rig, test.info().outputPath());

	await s.run(test.info(), async () => {
		await rig.api.signIn();
		const path = webhookPath('pending');
		const workflowId = await rig.api.createWorkflow(
			chain('pending request', [
				nodes.webhook(path),
				nodes.code('Code', 'return [{ json: { ok: true } }];'),
			]),
		);

		const runner = rig.runner();
		await s.step('runner-killed', async () => {
			await signal(runner, 'SIGKILL');
			await waitForExit(runner, 30_000);
		});

		const worker = rig.worker(1);
		const point = hook([worker], 'task-requested');
		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await rig.api.webhook(path));
		s.mark('task-requested', (await hit).detail);
		const [executionId] = await rig.db.executionsOf(workflowId);

		const sigtermAt = await signal(worker, 'SIGTERM');
		s.mark('sigterm');
		const exit = await waitForExit(worker, (GRACE_S + 30) * 1000);
		s.mark('exited', exit);
		const execution = await rig.db.waitForExecution(executionId, 15_000);
		const requestTimedOut = await rig.db.executionDataContains(
			executionId,
			'Task request timed out',
		);
		const bull = await rig.redis.bull();
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

		const failed = s.verify({
			after: [
				['worker exit code', exit?.exitCode, is(0)],
				['exit inside the window', s.result.exitAfterSigtermMs, below(GRACE_S * 1000)],
				['shutdown timed out', s.result.shutdownTimedOut, is(false)],
				['execution status', execution.status, is('error')],
				['execution failed on its task request', requestTimedOut, is(true)],
			],
			before: [
				['shutdown timed out', s.result.shutdownTimedOut, is(true)],
				['worker exit code', exit?.exitCode, is(1)],
				['execution failed on its task request', requestTimedOut, is(false)],
			],
		});
		expect(failed).toEqual([]);
	});
});
