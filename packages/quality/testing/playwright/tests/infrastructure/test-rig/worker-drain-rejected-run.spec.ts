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
	stopAllStacks,
	waitForExit,
	waitForLog,
	webhookPath,
} from '@n8n/test-rig';

const GRACE_S = 5;

test.afterEach(async () => await stopAllStacks());

test(
	'worker drain: a job whose run rejects no longer holds the drain',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	async () => {
		test.setTimeout(300_000);

		const rig = await RigStack.start({
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
		const s = new Scenario('worker-drain-rejected-run', rig, test.info().outputPath());

		await s.run(test.info(), async () => {
			await rig.api.signIn();
			const path = webhookPath('rejected');
			await rig.api.createWorkflow(
				chain('rejected run', [nodes.webhook(path), nodes.noOp('Done')]),
			);

			const worker = rig.worker(1);
			const point = hook([worker], 'run-reject');
			await s.step('armed', async () => await point.arm());
			const hit = point.waitHit(30_000);
			await s.step('webhook', async () => await rig.api.webhook(path));
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

			const failed = s.verify({
				after: [
					['drain waits on the rejected job', s.result.drainWaited, is(false)],
					['shutdown timed out', s.result.shutdownTimedOut, is(false)],
					['worker exit code', exit?.exitCode, is(0)],
					['exit inside the window', s.result.exitAfterSigtermMs, below(GRACE_S * 1000)],
				],
				before: [
					['drain waits on the rejected job', s.result.drainWaited, is(true)],
					['shutdown timed out', s.result.shutdownTimedOut, is(true)],
					['worker exit code', exit?.exitCode, is(1)],
				],
			});
			expect(failed).toEqual([]);
		});
	},
);
