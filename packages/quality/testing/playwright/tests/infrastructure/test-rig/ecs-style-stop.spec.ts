import { expect, test } from '@playwright/test';

import {
	chain,
	FILES,
	hook,
	is,
	isNot,
	nodes,
	RigStack,
	Scenario,
	signal,
	startAgain,
	waitForExit,
	webhookPath,
} from '@n8n/test-rig';

const WORKER_GRACE_S = 25;
const STOP_TIMEOUT_S = 30;

test('ECS-style stop: worker and runner get SIGTERM together, then SIGKILL at the stop timeout', async () => {
	test.setTimeout(400_000);

	const rig = await RigStack.start({
		name: 'ecs-stop',
		workers: 1,
		runners: 'external',
		scale: 6,
		env: { N8N_GRACEFUL_SHUTDOWN_TIMEOUT: String(WORKER_GRACE_S) },
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
	const s = new Scenario('ecs-style-stop', rig, test.info().outputPath());

	await s.run(test.info(), async () => {
		await rig.api.signIn();
		const path = webhookPath('ecs-stop');
		const workflowId = await rig.api.createWorkflow(
			chain('ecs stop', [
				nodes.webhook(path),
				nodes.code(
					'Slow Task',
					'await new Promise((resolve) => setTimeout(resolve, 3000));\nreturn [{ json: { first: true } }];',
				),
				nodes.code('Next Task', 'return [{ json: { second: true } }];'),
			]),
		);

		const worker = rig.worker(1);
		const runner = rig.runner();
		const firstTask = hook([worker], 'task-in-flight').waitHit(30_000);
		const response = await s.step('webhook', async () => await rig.api.webhook(path));
		expect(response.status, `webhook response: ${response.body}`).toBe(200);
		s.mark('first-task-in-flight', (await firstTask).detail);
		const [executionId] = await rig.db.executionsOf(workflowId);

		const sigtermAt = Date.now();
		await Promise.all([signal(worker, 'SIGTERM'), signal(runner, 'SIGTERM')]);
		s.mark('sigterm-both');

		const [workerExit, runnerExit] = await Promise.all([
			waitForExit(worker, STOP_TIMEOUT_S * 1000),
			waitForExit(runner, STOP_TIMEOUT_S * 1000),
		]);
		const killed: string[] = [];
		if (!workerExit) killed.push('worker');
		if (!runnerExit) killed.push('runner');
		if (killed.length) {
			await Promise.all([
				...(workerExit ? [] : [signal(worker, 'SIGKILL')]),
				...(runnerExit ? [] : [signal(runner, 'SIGKILL')]),
			]);
			s.mark('sigkill', killed);
		}
		const workerFinal = workerExit ?? (await waitForExit(worker, 10_000));
		const runnerFinal = runnerExit ?? (await waitForExit(runner, 10_000));
		const atStop = await rig.db.execution(executionId);
		const bullAtStop = await rig.redis.bull();
		const logsAtStop = await s.collectLogs();

		await s.step('replaced', async () => {
			await startAgain(runner);
			await startAgain(worker);
		});
		const final = await rig.db.waitForExecution(executionId, 90_000);
		const logs = await s.collectLogs();

		s.set({
			executionId,
			killed,
			workerExitCode: workerFinal?.exitCode ?? null,
			workerExitAfterSigtermMs: workerExit ? workerExit.exitedAt - sigtermAt : null,
			runnerExitCode: runnerFinal?.exitCode ?? null,
			runnerExitAfterSigtermMs: runnerExit ? runnerExit.exitedAt - sigtermAt : null,
			atStop,
			activeAtStop: bullAtStop.active,
			final,
			requestTimedOut: await rig.db.executionDataContains(executionId, 'Task request timed out'),
			abortedByShutdown: await rig.db.executionDataContains(executionId, 'Task aborted because'),
			stallLogged: logs.main.includes('stalled more than maxStalledCount'),
			workerShutdownTimedOut: logsAtStop['worker-1'].includes('Shutdown timed out after'),
		});

		const failed = s.verify({
			after: [
				['containers still up at the stop timeout', killed, is([])],
				['worker exit code', workerFinal?.exitCode, is(0)],
				['main logs a stalled job', s.result.stallLogged, is(false)],
				['execution failed as stalled', final.stalledError, is(false)],
				['execution status', final.status, isNot('crashed')],
				['job left active after the stop', bullAtStop.active, is([])],
			],
			before: [
				['runner exit code on SIGTERM', runnerFinal?.exitCode, is(143)],
				['execution status', final.status, is('error')],
			],
		});
		expect(failed).toEqual([]);
	});
});
