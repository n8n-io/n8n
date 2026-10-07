import { expect, test } from '@playwright/test';

import {
	anything,
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

const EXTERNAL = process.env.TEST_RIG_RUNNERS === 'external';
// The external runner container keeps its own 60 s task timeout, so its window stays below that.
const RUNNERS = EXTERNAL ? 'external' : 'internal';
const WORKERS = EXTERNAL ? 1 : 2;
const NAME = EXTERNAL ? 'worker-drain-long-task-external' : 'worker-drain-long-task';
const GRACE_S = EXTERNAL ? 40 : 60;
// The external runner fails the task itself before the stall check sees it.
const STALLED_BEFORE = EXTERNAL ? anything : is(true);

test('worker drain: a task longer than the shutdown window ends inside it', async () => {
	test.setTimeout(400_000);

	const rig = await RigStack.start({
		name: 'long-task',
		workers: WORKERS,
		runners: RUNNERS,
		scale: 6,
		env: { N8N_GRACEFUL_SHUTDOWN_TIMEOUT: String(GRACE_S), N8N_RUNNERS_TASK_TIMEOUT: '300' },
		hooks: [
			{
				point: 'task-in-flight',
				file: FILES.taskBroker,
				target: 'TaskBroker.prototype',
				method: 'sendTaskSettings',
				kind: 'observe',
				phase: 'after',
				detail: { taskId: 'args.0' },
			},
		],
	});
	const s = new Scenario(NAME, rig, test.info().outputPath());

	await s.run(test.info(), async () => {
		await rig.api.signIn();
		const path = webhookPath('long-task');
		const workflowId = await rig.api.createWorkflow(
			chain('long task', [
				nodes.webhook(path),
				nodes.code('Never Ends', 'await new Promise(() => {});\nreturn [];'),
			]),
		);

		const point = hook(rig.workers(), 'task-in-flight');
		const hit = point.waitHit(30_000);
		const response = await s.step('webhook', async () => await rig.api.webhook(path));
		s.set({ webhook: response });
		expect(response.status, `webhook response: ${response.body}`).toBe(200);
		const { container: draining, detail } = await hit;
		s.mark('task-in-flight', detail);
		const [executionId] = await rig.db.executionsOf(workflowId);

		const sigtermAt = await signal(draining, 'SIGTERM');
		s.mark('sigterm');
		const exit = await waitForExit(draining, (GRACE_S + 60) * 1000);
		s.mark('exited', exit);
		const execution = await rig.db.waitForExecution(executionId, 90_000);
		const abortedByShutdown = await rig.db.executionDataContains(
			executionId,
			'Task aborted because',
		);
		const logs = await s.collectLogs();
		const drainingLog = logs[`worker-${rig.workers().indexOf(draining) + 1}`];

		s.set({
			executionId,
			drainingWorker: draining.getName(),
			execution,
			abortedByShutdown,
			capped: drainingLog.includes('in-flight task timeout(s) to fit the shutdown window'),
			shutdownTimedOut: drainingLog.includes('Shutdown timed out after'),
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
		});

		const failed = s.verify({
			after: [
				['task timeout capped to the window', s.result.capped, is(true)],
				['worker exit code', exit?.exitCode, is(0)],
				['exit inside the window', s.result.exitAfterSigtermMs, below(GRACE_S * 1000)],
				['execution status', execution.status, is('error')],
				['execution aborted by shutdown', abortedByShutdown, is(true)],
				['execution failed as stalled', execution.stalledError, is(false)],
			],
			before: [
				['shutdown timed out', s.result.shutdownTimedOut, is(true)],
				['worker exit code', exit?.exitCode, is(1)],
				['execution failed as stalled', execution.stalledError, STALLED_BEFORE],
			],
		});
		expect(failed).toEqual([]);
	});
});
