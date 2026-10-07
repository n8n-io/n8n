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
	waitForLog,
	webhookPath,
} from '@n8n/test-rig';

const WORKER_GRACE_S = 25;
const STOP_TIMEOUT_S = 30;

test(
	'ECS-style stop: a node needs a runner after the worker and runner sidecar got SIGTERM',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	async () => {
		test.setTimeout(400_000);

		const rig = await RigStack.start({
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
		const s = new Scenario('ecs-style-stop-runner-gone', rig, test.info().outputPath());

		await s.run(test.info(), async () => {
			await rig.api.signIn();
			const path = webhookPath('ecs-gone');
			await rig.api.createWorkflow(
				chain('ecs runner gone', [
					nodes.webhook(path),
					nodes.code('First Task', 'return [{ json: { first: true } }];'),
					nodes.code('Next Task', 'return [{ json: { second: true } }];'),
				]),
			);

			const worker = rig.worker(1);
			const runner = rig.runner();
			const point = hook([worker], 'node-before-run');
			await point.arm();
			const hit = point.waitHit(30_000);
			const response = await s.step('webhook', async () => await rig.api.webhook(path));
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
				runnerExitCode: runnerExit?.exitCode ?? null,
				runnerExitAfterSigtermMs: runnerExit ? runnerExit.exitedAt - sigtermAt : null,
				workerKilled: killed,
				workerExitCode: workerExit?.exitCode ?? null,
				workerExitAfterSigtermMs: workerExit && !killed ? workerExit.exitedAt - sigtermAt : null,
				atStop,
				activeAtStop: bullAtStop.active,
				final,
				requestTimedOut: await rig.db.executionDataContains(executionId, 'Task request timed out'),
				stallLogged: logs.main.includes('stalled more than maxStalledCount'),
				workerShutdownTimedOut: logsAtStop['worker-1'].includes('Shutdown timed out after'),
			});

			const failed = s.verify({
				after: [
					['worker still up at the stop timeout', killed, is(false)],
					['worker exit code', workerExit?.exitCode, is(0)],
					['job left active after the stop', bullAtStop.active, is([])],
					['main logs a stalled job', s.result.stallLogged, is(false)],
					['execution failed as stalled', final.stalledError, is(false)],
					['execution status', final.status, isNot('crashed')],
				],
				before: [
					['runner exit code on SIGTERM', runnerExit?.exitCode, is(143)],
					['worker exit code', workerExit?.exitCode, is(1)],
					['execution status', final.status, is('crashed')],
				],
			});
			expect(failed).toEqual([]);
		});
	},
);
