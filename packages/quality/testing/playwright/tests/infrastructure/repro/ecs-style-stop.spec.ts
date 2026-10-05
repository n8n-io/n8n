import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, startAgain, waitForExit } from './harness';
import { chain, nodes, webhookPath } from './workflows';

const WORKER_GRACE_S = 25;
const STOP_TIMEOUT_S = 30;

test('ECS-style stop: worker and runner get SIGTERM together, then SIGKILL at the stop timeout', async ({}, testInfo) => {
	test.setTimeout(400_000);

	const repro = await ReproStack.start({
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
	const s = new Scenario('ecs-style-stop', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const path = webhookPath('ecs-stop');
		const workflowId = await repro.createWorkflow(
			chain('ecs stop', [
				nodes.webhook(path),
				nodes.code(
					'Slow Task',
					'await new Promise((resolve) => setTimeout(resolve, 3000));\nreturn [{ json: { first: true } }];',
				),
				nodes.code('Next Task', 'return [{ json: { second: true } }];'),
			]),
		);

		const worker = repro.worker(1);
		const runner = repro.runner();
		const firstTask = hook([worker], 'task-in-flight').waitHit(30_000);
		const response = await s.step('webhook', async () => await repro.webhook(path));
		expect(response.status, `webhook response: ${response.body}`).toBe(200);
		s.mark('first-task-in-flight', (await firstTask).detail);
		const [executionId] = await repro.executionsOf(workflowId);

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
		const atStop = await repro.execution(executionId);
		const bullAtStop = await repro.bull();
		const logsAtStop = await s.collectLogs();

		await s.step('replaced', async () => {
			await startAgain(runner);
			await startAgain(worker);
		});
		const final = await repro.waitForExecution(executionId, 90_000);
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
			requestTimedOut: await repro.executionDataContains(executionId, 'Task request timed out'),
			abortedByShutdown: await repro.executionDataContains(executionId, 'Task aborted because'),
			stallLogged: logs.main.includes('stalled more than maxStalledCount'),
			workerShutdownTimedOut: logsAtStop['worker-1'].includes('Shutdown timed out after'),
		});

		if (s.variant === 'after') {
			expect.soft(killed, 'containers still up at the stop timeout').toEqual([]);
			expect.soft(workerFinal?.exitCode, 'worker exit code').toBe(0);
			expect.soft(s.result.stallLogged, 'main logs a stalled job').toBe(false);
			expect.soft(final.stalledError, 'execution failed as stalled').toBe(false);
			expect.soft(final.status, 'execution status').not.toBe('crashed');
			expect.soft(bullAtStop.active, 'job left active after the stop').toEqual([]);
		} else {
			expect.soft(runnerFinal?.exitCode, 'runner exit code on SIGTERM').toBe(143);
			expect.soft(final.status, 'execution status').toBe('error');
		}
	});
});
