import { expect, test } from '@playwright/test';

import {
	chain,
	excludes,
	FILES,
	hook,
	is,
	nodes,
	RigStack,
	Scenario,
	signal,
	waitForExit,
	waitForLog,
	webhookPath,
} from '@n8n/test-rig';

test(
	'worker drain: job fetched before SIGTERM finishes or goes back to the queue',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	async () => {
		test.setTimeout(300_000);

		const rig = await RigStack.start({
			name: 'fetched-job',
			workers: 2,
			runners: 'internal',
			scale: 6,
			hooks: [
				{
					point: 'job-before-track',
					file: FILES.executionPersistence,
					target: 'ExecutionPersistence.prototype',
					method: 'findSingleExecution',
					scope: {
						file: FILES.jobProcessor,
						target: 'JobProcessor.prototype',
						method: 'processJob',
					},
					detail: { jobId: 'scope.args.0.id', executionId: 'scope.args.0.data.executionId' },
				},
			],
		});
		const s = new Scenario('worker-drain-fetched-job', rig, test.info().outputPath());

		await s.run(test.info(), async () => {
			await rig.api.signIn();
			const path = webhookPath('fetched');
			await rig.api.createWorkflow(
				chain('fetched job', [
					nodes.webhook(path),
					nodes.code('Code', 'return [{ json: { ok: true } }];'),
				]),
			);

			const workers = rig.workers();
			const point = hook(workers, 'job-before-track');
			await s.step('armed', async () => await point.arm());

			const hit = point.waitHit(30_000);
			await s.step('webhook', async () => await rig.api.webhook(path));
			const { container: draining, detail } = await hit;
			s.mark('hit', detail);
			await point.disarm(draining);
			const executionId = String(detail.executionId);
			const jobId = String(detail.jobId);

			const stopWatching = new AbortController();
			const drainWaits = waitForLog(
				[draining],
				`(execution IDs: ${executionId})`,
				90_000,
				stopWatching.signal,
			);
			const sigtermAt = await signal(draining, 'SIGTERM');
			s.mark('sigterm');
			const exited = waitForExit(draining, 90_000);
			const anchor = await s.race('anchor', { 'drain-waits': drainWaits, exited });
			stopWatching.abort();
			if (anchor === 'drain-waits')
				await s.step('released', async () => await point.release(draining));

			const exit = await exited;
			s.mark('exited', exit);
			const execution = await rig.db.waitForExecution(executionId, 90_000);
			const bull = await rig.redis.bull(jobId);
			const logs = await s.collectLogs();

			s.set({
				executionId,
				jobId,
				anchor,
				exitCode: exit?.exitCode ?? null,
				exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
				execution,
				bull,
				stallLogged: logs.main.includes('stalled more than maxStalledCount'),
			});

			const failed = s.verify({
				after: [
					['main logs a stalled job', s.result.stallLogged, is(false)],
					['execution status', execution.status, is('success')],
					['job left active', bull.active, excludes(jobId)],
					['job lock left behind', bull.job?.lock, is(false)],
					['draining worker exit code', exit?.exitCode, is(0)],
				],
				before: [
					['worker exits without waiting for the job', anchor, is('exited')],
					['main logs a stalled job', s.result.stallLogged, is(true)],
					['execution fails as stalled', execution.stalledError, is(true)],
				],
			});
			expect(failed).toEqual([]);
		});
	},
);
