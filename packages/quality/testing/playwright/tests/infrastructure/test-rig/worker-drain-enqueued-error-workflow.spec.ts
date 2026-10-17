import { expect, test } from '@playwright/test';

import {
	chain,
	excludes,
	FILES,
	hook,
	includes,
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

const GRACE_S = 10;

test.afterEach(async () => await stopAllStacks());

test(
	'worker drain: an error workflow enqueued during the drain stays queued',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	async () => {
		test.setTimeout(300_000);

		const rig = await RigStack.start({
			name: 'enqueued-error-wf',
			workers: 1,
			runners: 'internal',
			scale: 3,
			hooks: [
				{
					point: 'enqueue-before-add',
					file: FILES.scalingService,
					target: 'ScalingService.prototype',
					method: 'addJob',
					detail: { executionId: 'args.0.executionId', workflowId: 'args.0.workflowId' },
				},
			],
		});
		const s = new Scenario('worker-drain-enqueued-error-workflow', rig, test.info().outputPath());

		await s.run(test.info(), async () => {
			await rig.api.signIn();
			const errorWorkflowId = await rig.api.createWorkflow(
				chain('error handler', [nodes.errorTrigger(), nodes.noOp('Handled')]),
				{ activate: 'try' },
			);
			const path = webhookPath('enqueued-error');
			await rig.api.createWorkflow(
				chain(
					'throws on purpose',
					[nodes.webhook(path), nodes.code('Throw', "throw new Error('failing on purpose');")],
					{ errorWorkflow: errorWorkflowId },
				),
			);

			const worker = rig.worker(1);
			const point = hook([worker], 'enqueue-before-add');
			await s.step('armed', async () => await point.arm());
			const hit = point.waitHit(30_000);
			await s.step('webhook', async () => await rig.api.webhook(path));
			const { detail } = await hit;
			s.mark('hit', detail);
			const errorExecutionId = String(detail.executionId);
			expect(String(detail.workflowId), 'paused enqueue is the error workflow').toBe(
				errorWorkflowId,
			);

			const drainWaits = waitForLog([worker], `(execution IDs: ${errorExecutionId})`, 30_000);
			const sigtermAt = await signal(worker, 'SIGTERM');
			s.mark('sigterm');
			await drainWaits;
			s.mark('drain-waits');
			const enqueued = waitForLog([worker], `Enqueued execution ${errorExecutionId} `, 30_000);
			await s.step('released', async () => await point.release(worker));
			const errorJobId = /\(job (\d+)\)/.exec((await enqueued).line)?.[1] ?? '';
			s.mark('enqueued', errorJobId);

			const exit = await waitForExit(worker, (GRACE_S + 15) * 1000);
			s.mark('exited', exit);
			const errorExecution = await rig.db.execution(errorExecutionId);
			const bull = await rig.redis.bull(errorJobId);
			const logs = await s.collectLogs();
			const cancelled = logs['worker-1'].includes(
				`in-process executions that could not finish before shutdown (execution IDs: ${errorExecutionId})`,
			);

			s.set({
				errorExecutionId,
				errorJobId,
				errorExecution,
				bull,
				cancelled,
				exitCode: exit?.exitCode ?? null,
				exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
			});

			expect(errorJobId, 'error workflow enqueued').not.toBe('');
			const failed = s.verify({
				after: [
					['drain cancels the error workflow', cancelled, is(false)],
					['error workflow job waits for another worker', bull.wait, includes(errorJobId)],
					['error workflow execution status', errorExecution.status, is('new')],
				],
				before: [
					['drain cancels the error workflow', cancelled, is(true)],
					['error workflow job removed', bull.wait, excludes(errorJobId)],
					['error workflow job key removed', bull.job?.exists, is(false)],
				],
			});
			expect(failed).toEqual([]);
		});
	},
);
