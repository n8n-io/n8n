import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, waitForExit } from './harness';
import { chain, nodes, webhookPath } from './workflows';

const GRACE_S = 60;
const EXTERNAL = process.env.REPRO_RUNNERS === 'external';

test('worker drain: a task longer than the shutdown window ends inside it', async ({}, testInfo) => {
	test.setTimeout(400_000);

	const repro = await ReproStack.start({
		name: 'long-task',
		workers: EXTERNAL ? 1 : 2,
		runners: EXTERNAL ? 'external' : 'internal',
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
	const s = new Scenario(
		EXTERNAL ? 'worker-drain-long-task-external' : 'worker-drain-long-task',
		repro,
		testInfo.outputPath(),
	);

	await s.run(testInfo, async () => {
		await repro.signIn();
		const path = webhookPath('long-task');
		const workflowId = await repro.createWorkflow(
			chain('long task', [
				nodes.webhook(path),
				nodes.code('Never Ends', 'await new Promise(() => {});\nreturn [];'),
			]),
		);

		const point = hook(repro.workers(), 'task-in-flight');
		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await repro.webhook(path));
		const { container: draining, detail } = await hit;
		s.mark('task-in-flight', detail);
		const [executionId] = await repro.executionsOf(workflowId);

		const sigtermAt = await signal(draining, 'SIGTERM');
		s.mark('sigterm');
		const exit = await waitForExit(draining, (GRACE_S + 60) * 1000);
		s.mark('exited', exit);
		const execution = await repro.waitForExecution(executionId, 90_000);
		const abortedByShutdown = await repro.executionDataContains(
			executionId,
			'Task aborted because',
		);
		const logs = await s.collectLogs();
		const drainingLog = logs[`worker-${repro.workers().indexOf(draining) + 1}`];

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

		if (s.variant === 'after') {
			expect.soft(s.result.capped, 'task timeout capped to the window').toBe(true);
			expect.soft(exit?.exitCode, 'worker exit code').toBe(0);
			expect
				.soft(Number(s.result.exitAfterSigtermMs), 'exit inside the window')
				.toBeLessThan(GRACE_S * 1000);
			expect.soft(execution.status, 'execution status').toBe('error');
			expect.soft(abortedByShutdown, 'execution aborted by shutdown').toBe(true);
			expect.soft(execution.stalledError, 'execution failed as stalled').toBe(false);
		} else {
			expect.soft(s.result.shutdownTimedOut, 'shutdown timed out').toBe(true);
			expect.soft(exit?.exitCode, 'worker exit code').toBe(1);
			if (!EXTERNAL) {
				expect.soft(execution.stalledError, 'execution failed as stalled').toBe(true);
			}
		}
	});
});
