import { expect, test } from '@playwright/test';

import { FILES, hook, ReproStack, Scenario, signal, waitForExit, waitForLog } from './harness';
import { chain, nodes, webhookPath } from './workflows';

test('worker drain: detached sub-workflow finishes before the worker exits', async ({}, testInfo) => {
	test.setTimeout(300_000);

	const repro = await ReproStack.start({
		name: 'detached-sub',
		workers: 1,
		runners: 'internal',
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
	const s = new Scenario('worker-drain-detached-subworkflow', repro, testInfo.outputPath());

	await s.run(testInfo, async () => {
		await repro.signIn();
		const childId = await repro.createWorkflow(
			chain('detached child', [
				nodes.subWorkflowTrigger(),
				nodes.code('Child Code', 'return [{ json: { child: true } }];'),
			]),
			{ activate: 'try' },
		);
		const path = webhookPath('detached');
		const parentId = await repro.createWorkflow(
			chain('detached parent', [
				nodes.webhook(path),
				nodes.executeWorkflow('Start Child', childId, false),
			]),
		);

		const worker = repro.worker(1);
		const point = hook([worker], 'task-before-request');
		await s.step('armed', async () => await point.arm());

		const hit = point.waitHit(30_000);
		await s.step('webhook', async () => await repro.webhook(path));
		const { detail } = await hit;
		s.mark('hit', detail);
		const childExecutionId = String(detail.executionId);

		const [parentExecutionId] = await repro.executionsOf(parentId);
		const parent = await s.step(
			'parent-done',
			async () => await repro.waitForExecution(parentExecutionId, 30_000),
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
		const child = await repro.waitForExecution(childExecutionId, 30_000);
		const taskTimedOut = await repro.executionDataContains(
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

		expect(parent.status, 'parent execution status').toBe('success');
		if (s.variant === 'after') {
			expect.soft(anchor, 'drain waits for the child').toBe('drain-waits');
			expect.soft(child.status, 'child execution status').toBe('success');
			expect.soft(taskTimedOut, 'child failed on its task request').toBe(false);
			expect.soft(exit?.exitCode, 'worker exit code').toBe(0);
		} else {
			expect.soft(anchor, 'worker stops without waiting for the child').not.toBe('drain-waits');
			expect.soft(child.status, 'child execution status').toBe('error');
			expect.soft(taskTimedOut, 'child failed on its task request').toBe(true);
		}
	});
});
