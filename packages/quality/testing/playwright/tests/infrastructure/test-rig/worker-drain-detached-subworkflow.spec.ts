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
	waitForExit,
	waitForLog,
	webhookPath,
} from '@n8n/test-rig';

const EXTERNAL = process.env.TEST_RIG_RUNNERS === 'external';
const RUNNERS = EXTERNAL ? 'external' : 'internal';
const NAME = EXTERNAL
	? 'worker-drain-detached-subworkflow-external'
	: 'worker-drain-detached-subworkflow';

test('worker drain: detached sub-workflow finishes before the worker exits', async () => {
	test.setTimeout(300_000);

	const rig = await RigStack.start({
		name: 'detached-sub',
		workers: 1,
		runners: RUNNERS,
		scale: 3,
		hooks: [
			{
				point: 'task-before-request',
				file: FILES.taskRequester,
				target: 'TaskRequester.prototype',
				method: 'startTask',
				detail: { executionId: 'args.0.executionId', node: 'args.5.name' },
			},
		],
	});
	const s = new Scenario(NAME, rig, test.info().outputPath());

	await s.run(test.info(), async () => {
		await rig.api.signIn();
		const childId = await rig.api.createWorkflow(
			chain('detached child', [
				nodes.subWorkflowTrigger(),
				nodes.code('Child Code', 'return [{ json: { child: true } }];'),
			]),
			{ activate: 'try' },
		);
		const path = webhookPath('detached');
		const parentId = await rig.api.createWorkflow(
			chain('detached parent', [
				nodes.webhook(path),
				nodes.executeWorkflow('Start Child', childId, false),
			]),
		);

		const worker = rig.worker(1);
		const point = hook([worker], 'task-before-request');
		await s.step('armed', async () => await point.arm());

		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await rig.api.webhook(path));
		const { detail } = await hit;
		s.mark('hit', detail);
		const childExecutionId = String(detail.executionId);

		const [parentExecutionId] = await rig.db.executionsOf(parentId);
		const parent = await s.step(
			'parent-done',
			async () => await rig.db.waitForExecution(parentExecutionId, 30_000),
		);

		const stopWatching = new AbortController();
		const drainWaits = waitForLog(
			[worker],
			`(execution IDs: ${childExecutionId})`,
			60_000,
			stopWatching.signal,
		);
		const stopping = waitForLog([worker], 'Stopping worker...', 60_000, stopWatching.signal);
		const sigtermAt = await signal(worker, 'SIGTERM');
		s.mark('sigterm');
		const exited = waitForExit(worker, 60_000);
		const anchor = await s.race('anchor', { 'drain-waits': drainWaits, stopping, exited });
		stopWatching.abort();
		const releaseRttMs = await s.step('released', async () => await point.release(worker));

		const exit = await exited;
		s.mark('exited', exit);
		const child = await rig.db.waitForExecution(childExecutionId, 30_000);
		const taskTimedOut = await rig.db.executionDataContains(
			childExecutionId,
			'Task request timed out',
		);
		await s.collectLogs();

		s.set({
			parentExecutionId,
			childExecutionId,
			parent,
			child,
			taskTimedOut,
			anchor,
			releaseDelivered: releaseRttMs !== undefined,
			exitCode: exit?.exitCode ?? null,
			exitAfterSigtermMs: exit ? exit.exitedAt - sigtermAt : null,
		});

		const failed = s.verify({
			always: [['parent execution status', parent.status, is('success')]],
			after: [
				['drain waits for the child', anchor, is('drain-waits')],
				['child execution status', child.status, is('success')],
				['child failed on its task request', taskTimedOut, is(false)],
				['worker exit code', exit?.exitCode, is(0)],
			],
			before: [
				['worker stops without waiting for the child', anchor, isNot('drain-waits')],
				['child execution status', child.status, is('error')],
				['child failed on its task request', taskTimedOut, is(true)],
			],
		});
		expect(failed).toEqual([]);
	});
});
