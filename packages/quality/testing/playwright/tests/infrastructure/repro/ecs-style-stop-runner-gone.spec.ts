import { expect, test } from '@playwright/test';

import {
	FILES,
	hook,
	ReproStack,
	Scenario,
	signal,
	startAgain,
	waitForExit,
	waitForLog,
} from './harness';
import { chain, nodes, webhookPath } from './workflows';

const WORKER_GRACE_S = 25;
const STOP_TIMEOUT_S = 30;

test('ECS-style stop: a node needs a runner after the worker and runner sidecar got SIGTERM', async ({}, testInfo) => {
	test.setTimeout(400_000);

	const repro = await ReproStack.start({
		name: 'ecs-runner-gone',
		workers: 1,
		runners: 'external',
		scale: 6,
		env: {
			N8N_GRACEFUL_SHUTDOWN_TIMEOUT: String(WORKER_GRACE_S),
			N8N_RUNNERS_TASK_REQUEST_TIMEOUT: '60',
		},
		hooks: [
			{
				point: 'node-before-run',
				file: FILES.workflowExecute,
				target: 'WorkflowExecute.prototype',
				method: 'runNode',
				where: [{ path: 'args.1.node.name', equals: 'Next Task' }],
				detail: { executionId: 'args.4.executionId' },
			},
		],
	});
	const s = new Scenario('ecs-style-stop-runner-gone', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const path = webhookPath('ecs-gone');
		await repro.createWorkflow(
			chain('ecs runner gone', [
				nodes.webhook(path),
				nodes.code('First Task', 'return [{ json: { first: true } }];'),
				nodes.code('Next Task', 'return [{ json: { second: true } }];'),
			]),
		);

		const worker = repro.worker(1);
		const runner = repro.runner();
		const point = hook([worker], 'node-before-run');
		await point.arm();
		const hit = point.waitHit(30_000);
		const response = await s.step('webhook', async () => await repro.webhook(path));
		expect(response.status, `webhook response: ${response.body}`).toBe(200);
		const executionId = String((await hit).detail.executionId);
		s.mark('before-next-task', executionId);

		const drainWaits = waitForLog([worker], `(execution IDs: ${executionId})`, 30_000);
		const sigtermAt = Date.now();
		await Promise.all([signal(worker, 'SIGTERM'), signal(runner, 'SIGTERM')]);
		s.mark('sigterm-both');
		const runnerExited = waitForExit(runner, STOP_TIMEOUT_S * 1000);
		await drainWaits;
		s.mark('drain-waits');
		await s.step('released', async () => await point.release(worker));

		const remainingMs = Math.max(1000, STOP_TIMEOUT_S * 1000 - (Date.now() - sigtermAt));
		let workerExit = await waitForExit(worker, remainingMs);
		const killed = !workerExit;
		if (killed) {
			await signal(worker, 'SIGKILL');
			s.mark('worker-sigkill');
			workerExit = await waitForExit(worker, 10_000);
		}
		const runnerExit = await runnerExited;
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
			runnerExitCode: runnerExit?.exitCode ?? null,
			runnerExitAfterSigtermMs: runnerExit ? runnerExit.exitedAt - sigtermAt : null,
			workerKilled: killed,
			workerExitCode: workerExit?.exitCode ?? null,
			workerExitAfterSigtermMs: workerExit && !killed ? workerExit.exitedAt - sigtermAt : null,
			atStop,
			activeAtStop: bullAtStop.active,
			final,
			requestTimedOut: await repro.executionDataContains(executionId, 'Task request timed out'),
			stallLogged: logs.main.includes('stalled more than maxStalledCount'),
			workerShutdownTimedOut: logsAtStop['worker-1'].includes('Shutdown timed out after'),
		});

		if (s.variant === 'after') {
			expect.soft(killed, 'worker still up at the stop timeout').toBe(false);
			expect.soft(workerExit?.exitCode, 'worker exit code').toBe(0);
			expect.soft(bullAtStop.active, 'job left active after the stop').toEqual([]);
			expect.soft(s.result.stallLogged, 'main logs a stalled job').toBe(false);
			expect.soft(final.stalledError, 'execution failed as stalled').toBe(false);
			expect.soft(final.status, 'execution status').not.toBe('crashed');
		} else {
			expect.soft(runnerExit?.exitCode, 'runner exit code on SIGTERM').toBe(143);
			expect.soft(workerExit?.exitCode, 'worker exit code').toBe(1);
			expect.soft(final.status, 'execution status').toBe('crashed');
		}
	});
});
