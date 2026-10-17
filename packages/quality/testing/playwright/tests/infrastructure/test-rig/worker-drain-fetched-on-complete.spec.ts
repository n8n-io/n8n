import { expect, test } from '@playwright/test';

import {
	chain,
	FILES,
	hook,
	is,
	nodes,
	RigStack,
	Scenario,
	signal,
	stopAllStacks,
	until,
	waitForExit,
	webhookPath,
} from '@n8n/test-rig';

test.afterEach(async () => await stopAllStacks());

test(
	'worker drain: a job fetched on completing another goes back to the queue',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	async () => {
		test.setTimeout(300_000);

		const rig = await RigStack.start({
			name: 'fetched-on-complete',
			workers: 2,
			runners: 'internal',
			scale: 6,
			env: { N8N_CONCURRENCY_PRODUCTION_LIMIT: '1' },
			hooks: [
				{
					point: 'node-before-run',
					file: FILES.workflowExecute,
					target: 'WorkflowExecute.prototype',
					method: 'runNode',
					where: [{ path: 'args.1.node.name', equals: 'Pause' }],
					detail: { executionId: 'args.4.executionId' },
				},
				{
					point: 'fetch-on-complete',
					file: FILES.bullScripts,
					target: '',
					method: 'moveToCompleted',
					phase: 'after',
					where: [{ path: 'result.1', truthy: true }],
					detail: { completedJobId: 'args.0.id', nextJobId: 'result.1' },
				},
			],
		});
		const s = new Scenario('worker-drain-fetched-on-complete', rig, test.info().outputPath());

		await s.run(test.info(), async () => {
			await rig.api.signIn();
			const path = webhookPath('on-complete');
			const workflowId = await rig.api.createWorkflow(
				chain('fetched on complete', [
					nodes.webhook(path),
					nodes.noOp('Pause'),
					nodes.code('Code', 'return [{ json: { ok: true } }];'),
				]),
			);

			const workers = rig.workers();
			const busy = hook(workers, 'node-before-run');
			await busy.arm();

			const first = busy.waitHit(30_000);
			await rig.api.webhook(path);
			const { container: draining } = await first;
			const other = workers.find((w) => w !== draining)!;
			const second = busy.waitHit(30_000);
			await rig.api.webhook(path);
			await second;
			s.mark('both-workers-busy');

			await rig.api.webhook(path);
			await until(
				'third job waits',
				async () => (await rig.redis.bull()).wait.length === 1,
				30_000,
			);
			s.mark('third-job-waits');

			const fetch = hook([draining], 'fetch-on-complete');
			await fetch.arm();
			const fetched = fetch.waitHit(30_000);
			await busy.release(draining);
			const { detail } = await fetched;
			const jobId = String(detail.nextJobId);
			s.mark('fetched-on-complete', detail);

			const sigtermAt = await signal(draining, 'SIGTERM');
			s.mark('sigterm');
			const exited = waitForExit(draining, 60_000);
			const anchor = await s.race('anchor', {
				'back-in-wait': until(
					'job back in wait',
					async () => (await rig.redis.bull()).wait.includes(jobId),
					60_000,
				),
				exited,
			});
			await busy.release(other);
			await fetch.release(draining);

			const exit = await exited;
			s.mark('exited', exit);
			const executionIds = await rig.db.executionsOf(workflowId);
			const executionId = (await rig.redis.redis('HGET', `bull:jobs:${jobId}`, 'data')).match(
				/"executionId":"(\d+)"/,
			)?.[1];
			const thirdId = executionId ?? executionIds[2];
			const execution = await rig.db.waitForExecution(thirdId, 90_000);
			const logs = await s.collectLogs();
			const started = `started execution ${thirdId} `;

			s.set({
				jobId,
				executionId: thirdId,
				anchor,
				execution,
				startedOnDraining: logs[`worker-${workers.indexOf(draining) + 1}`].includes(started),
				startedOnOther: logs[`worker-${workers.indexOf(other) + 1}`].includes(started),
				stallLogged: logs.main.includes('stalled more than maxStalledCount'),
				exitCode: exit?.exitCode ?? null,
				exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
			});

			const failed = s.verify({
				after: [
					['job goes back to wait before the worker exits', anchor, is('back-in-wait')],
					['execution status', execution.status, is('success')],
					['job started on the other worker', s.result.startedOnOther, is(true)],
					['main logs a stalled job', s.result.stallLogged, is(false)],
					['draining worker exit code', exit?.exitCode, is(0)],
				],
				before: [
					['worker exits with the job still active', anchor, is('exited')],
					['execution fails as stalled', execution.stalledError, is(true)],
				],
			});
			expect(failed).toEqual([]);
		});
	},
);
