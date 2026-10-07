import flatted from 'flatted';
import type { IConnections, INode, IRunData } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';

const TRIGGER_NAME = 'Trigger';

const node = (name: string, type: string, parameters: INode['parameters'] = {}): INode => ({
	id: `${name.toLowerCase()}-id`,
	name,
	type,
	typeVersion: type === 'n8n-nodes-base.set' ? 3.4 : 1,
	position: [0, 0],
	parameters,
});

/** A Set node that stamps `field` with the time it ran, so a re-run is visible. */
const stamp = (name: string, field: string): INode =>
	node(name, 'n8n-nodes-base.set', {
		assignments: {
			assignments: [
				{ id: `${field}-id`, name: field, value: '={{ $now.toMillis() }}', type: 'number' },
			],
		},
		includeOtherFields: true,
		options: {},
	});

/** A Set node that copies `a` from A's paired item, which it reaches through its direct input. */
const readsA = (name: string): INode =>
	node(name, 'n8n-nodes-base.set', {
		assignments: {
			assignments: [
				{ id: 'fromA-id', name: 'fromA', value: "={{ $('A').item.json.a }}", type: 'number' },
			],
		},
		includeOtherFields: true,
		options: {},
	});

const chain = (...names: string[]): IConnections =>
	Object.fromEntries(
		names
			.slice(0, -1)
			.map((from, i) => [from, { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] }]),
	);

// Trigger -> A -> B -> C, each Set node stamping its own field.
const workflow = (name: string) => ({
	name: `Manual run partial ${name}`,
	nodes: [
		node(TRIGGER_NAME, 'n8n-nodes-base.manualTrigger'),
		stamp('A', 'a'),
		stamp('B', 'b'),
		stamp('C', 'c'),
	],
	connections: chain(TRIGGER_NAME, 'A', 'B', 'C'),
	// Explicit: the editor always sends one, and a partial run reads it.
	pinData: {},
});

// Trigger (pinned to three items) -> Loop -> A -> Loop; Loop's done slot -> After.
const loopWorkflow = (name: string) => ({
	name: `Manual run partial ${name}`,
	nodes: [
		node(TRIGGER_NAME, 'n8n-nodes-base.manualTrigger'),
		{
			...node('Loop', 'n8n-nodes-base.splitInBatches', { batchSize: 1, options: {} }),
			typeVersion: 3,
		},
		stamp('A', 'a'),
		stamp('After', 'after'),
	],
	connections: {
		...chain(TRIGGER_NAME, 'Loop'),
		...chain('A', 'Loop'),
		Loop: {
			main: [[{ node: 'After', type: 'main', index: 0 }], [{ node: 'A', type: 'main', index: 0 }]],
		},
	} satisfies IConnections,
	pinData: { [TRIGGER_NAME]: [{ json: { i: 1 } }, { json: { i: 2 } }, { json: { i: 3 } }] },
});

const runDataOf = (execution: { data: string }): IRunData =>
	flatted.parse(execution.data).resultData.runData;

const firstItem = (runData: IRunData, nodeName: string) =>
	runData[nodeName][0].data?.main[0]?.[0]?.json;

test.describe(
	'Manual run to a node',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should reuse the results before the destination and run nothing after it @engine:v2', async ({
			api,
		}) => {
			const { id: workflowId } = await api.workflows.createWorkflow(workflow('reuse'));

			const first = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const fullRun = runDataOf(await api.workflows.waitForExecutionById(first.executionId));

			const second = await api.workflows.runToNode(workflowId, 'B', { runData: fullRun });
			const execution = await api.workflows.waitForExecutionById(second.executionId);
			expect(execution.status).toBe('success');

			const partialRun = runDataOf(execution);
			// A was not run again: its stamp is the first run's.
			expect(firstItem(partialRun, 'A')).toEqual(firstItem(fullRun, 'A'));
			// B ran again, on top of A's reused output.
			expect(firstItem(partialRun, 'B')?.b).not.toEqual(firstItem(fullRun, 'B')?.b);
			expect(firstItem(partialRun, 'B')?.a).toEqual(firstItem(fullRun, 'A')?.a);
			// C lies after the destination, so it did not run.
			expect(partialRun).not.toHaveProperty('C');
		});

		test('should run to a node past one that has no run data yet @engine:v2', async ({ api }) => {
			const { id: workflowId } = await api.workflows.createWorkflow(workflow('gap'));

			const first = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const { B, ...withoutB } = runDataOf(
				await api.workflows.waitForExecutionById(first.executionId),
			);

			// What the editor sends once B is new: B as a start node, and no run data for it.
			const second = await api.workflows.runToNode(workflowId, 'C', {
				runData: withoutB,
				startNodes: [{ name: 'B', sourceData: null }],
			});
			const execution = await api.workflows.waitForExecutionById(second.executionId);
			expect(execution.status).toBe('success');

			const partialRun = runDataOf(execution);
			// A was reused; B and C ran.
			expect(firstItem(partialRun, 'A')).toEqual(firstItem(withoutB, 'A'));
			expect(firstItem(partialRun, 'B')?.b).not.toEqual(firstItem({ B }, 'B')?.b);
			expect(firstItem(partialRun, 'C')?.a).toEqual(firstItem(withoutB, 'A')?.a);
		});

		test('should run a dirty node again and everything after it @engine:v2', async ({ api }) => {
			const { id: workflowId } = await api.workflows.createWorkflow(workflow('dirty'));

			const first = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const fullRun = runDataOf(await api.workflows.waitForExecutionById(first.executionId));

			const second = await api.workflows.runToNode(workflowId, 'C', {
				runData: fullRun,
				dirtyNodeNames: ['A'],
			});
			const execution = await api.workflows.waitForExecutionById(second.executionId);
			expect(execution.status).toBe('success');

			const partialRun = runDataOf(execution);
			for (const name of ['A', 'B', 'C']) {
				expect(firstItem(partialRun, name)?.[name.toLowerCase()]).not.toEqual(
					firstItem(fullRun, name)?.[name.toLowerCase()],
				);
			}
		});

		test('should use pinned data instead of running the pinned node @engine:v2', async ({
			api,
		}) => {
			const { id: workflowId } = await api.workflows.createWorkflow({
				...workflow('pinned'),
				pinData: { B: [{ json: { b: 'pinned' } }] },
			});

			const { executionId } = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const execution = await api.workflows.waitForExecutionById(executionId);
			expect(execution.status).toBe('success');

			const runData = runDataOf(execution);
			expect(firstItem(runData, 'B')).toEqual({ b: 'pinned' });
			// C ran on the pinned item, not on what B would have produced from A.
			expect(firstItem(runData, 'C')).toEqual({ b: 'pinned', c: expect.any(Number) });
		});

		test('should resolve a paired item through a pinned node @engine:v2', async ({ api }) => {
			const { id: workflowId } = await api.workflows.createWorkflow({
				...workflow('lineage'),
				nodes: [
					node(TRIGGER_NAME, 'n8n-nodes-base.manualTrigger'),
					stamp('A', 'a'),
					stamp('B', 'b'),
					readsA('C'),
				],
				pinData: { B: [{ json: { b: 'pinned' } }] },
			});

			// Up to B: A runs, B is pinned, and C lies after the destination.
			const first = await api.workflows.runToNode(workflowId, 'B');
			const upToB = runDataOf(await api.workflows.waitForExecutionById(first.executionId));
			expect(upToB).not.toHaveProperty('C');

			// To C: A's results are reused and B is pinned, so C's lookup walks the
			// pinned item's lineage back to A's reused output.
			const second = await api.workflows.runToNode(workflowId, 'C', { runData: upToB });
			const execution = await api.workflows.waitForExecutionById(second.executionId);
			expect(execution.status).toBe('success');

			const partialRun = runDataOf(execution);
			expect(firstItem(partialRun, 'C')?.fromA).toEqual(firstItem(upToB, 'A')?.a);
		});

		test('should reuse every pass of a finished loop before the destination @engine:v2', async ({
			api,
		}) => {
			const { id: workflowId } = await api.workflows.createWorkflow(loopWorkflow('loop'));

			const first = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const fullRun = runDataOf(await api.workflows.waitForExecutionById(first.executionId));
			expect(fullRun.A).toHaveLength(3);

			const second = await api.workflows.runToNode(workflowId, 'After', { runData: fullRun });
			const execution = await api.workflows.waitForExecutionById(second.executionId);
			expect(execution.status).toBe('success');

			const partialRun = runDataOf(execution);
			// No pass of the loop ran again: A's three stamps are the first run's.
			const stampsOf = (runData: IRunData) =>
				runData.A.map((run) => run.data?.main[0]?.[0]?.json.a);
			expect(stampsOf(partialRun)).toEqual(stampsOf(fullRun));
			// After ran again, on everything the loop collected.
			expect(firstItem(partialRun, 'After')?.after).not.toEqual(firstItem(fullRun, 'After')?.after);
			expect(partialRun.After[0].data?.main[0]).toHaveLength(3);
		});
	},
);
