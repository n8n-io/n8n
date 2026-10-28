import flatted from 'flatted';
import type { INode, IRunData, IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';

const node = (
	name: string,
	type: string,
	typeVersion: number,
	parameters: INode['parameters'],
): INode => ({
	id: `${name.toLowerCase()}-id`,
	name,
	type,
	typeVersion,
	position: [0, 0],
	parameters,
});

/** A Set node that adds `field: true` and keeps the rest of the item. */
const marks = (name: string, field: string): INode =>
	node(name, 'n8n-nodes-base.set', 3.4, {
		assignments: {
			assignments: [{ id: `${field}-id`, name: field, value: true, type: 'boolean' }],
		},
		includeOtherFields: true,
		options: {},
	});

/**
 * Trigger -> Loop, one item per pass. The body keeps every item but `n: 2`,
 * then marks it and returns it to the loop. The done output marks the result.
 */
const workflow: Partial<IWorkflowBase> = {
	name: 'Loop iteration without output',
	nodes: [
		node('Trigger', 'n8n-nodes-base.manualTrigger', 1, {}),
		node('Loop', 'n8n-nodes-base.splitInBatches', 3, { batchSize: 1, options: {} }),
		node('Filter', 'n8n-nodes-base.filter', 2.2, {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'skip-second-id',
						leftValue: '={{ $json.n }}',
						rightValue: 2,
						operator: { type: 'number', operation: 'notEquals' },
					},
				],
				combinator: 'and',
			},
			options: {},
		}),
		marks('Body', 'seen'),
		marks('Done', 'done'),
	],
	connections: {
		Trigger: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
		Loop: {
			main: [
				[{ node: 'Done', type: 'main', index: 0 }],
				[{ node: 'Filter', type: 'main', index: 0 }],
			],
		},
		Filter: { main: [[{ node: 'Body', type: 'main', index: 0 }]] },
		Body: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
	},
	pinData: { Trigger: [{ json: { n: 1 } }, { json: { n: 2 } }, { json: { n: 3 } }] },
};

const runDataOf = (execution: { data: string }): IRunData =>
	flatted.parse(execution.data).resultData.runData;

const items = (runData: IRunData, nodeName: string, runIndex: number) =>
	runData[nodeName][runIndex].data?.main[0]?.map((item) => item.json);

/**
 * The two engines answer this differently on purpose. The legacy engine only
 * runs a node that received items, so the loop never gets its next pass. Engine
 * v2 hands over the next pass regardless, since the pass that returned nothing
 * is still a pass.
 */
test.describe(
	'Loop iteration without output',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should run the loop with one pass that returns nothing @engine:v2', async ({ api }) => {
			const { id: workflowId } = await api.workflows.createWorkflow(workflow);

			const { executionId } = await api.workflows.runManually(workflowId, 'Trigger');
			const execution = await api.workflows.waitForExecutionById(executionId);
			expect(execution.status).toBe('success');

			const runData = runDataOf(execution);
			// Pass one handed over n: 1, and the body returned it. Pass two handed
			// over n: 2, and the filter dropped it.
			expect(items(runData, 'Body', 0)).toEqual([{ n: 1, seen: true }]);
			expect(items(runData, 'Filter', 1)).toEqual([]);
		});

		test('should end the loop on the legacy engine, and not run the done output @engine:v1-only', async ({
			api,
		}) => {
			const { id: workflowId } = await api.workflows.createWorkflow(workflow);

			const { executionId } = await api.workflows.runManually(workflowId, 'Trigger');
			const execution = await api.workflows.waitForExecutionById(executionId);
			expect(execution.status).toBe('success');

			const runData = runDataOf(execution);
			// Nothing returned to the loop, so there was no pass three: n: 3 was
			// never handed over, and the loop never ran out of items.
			expect(runData.Loop).toHaveLength(2);
			expect(runData.Body).toHaveLength(1);
			expect(runData).not.toHaveProperty('Done');
		});

		test('should carry on with the next pass on engine v2, and run the done output @engine:v2-only', async ({
			api,
		}) => {
			const { id: workflowId } = await api.workflows.createWorkflow(workflow);

			const { executionId } = await api.workflows.runManually(workflowId, 'Trigger');
			const execution = await api.workflows.waitForExecutionById(executionId);
			expect(execution.status).toBe('success');

			const runData = runDataOf(execution);
			// Pass three handed over n: 3, and pass four found no items left, so the
			// done output fired with what the body returned on passes one and three.
			// The body has no step on pass two, which v1 run data shows as an empty run.
			expect(runData.Loop).toHaveLength(4);
			expect(items(runData, 'Body', 1)).toEqual([]);
			expect(items(runData, 'Body', 2)).toEqual([{ n: 3, seen: true }]);
			expect(items(runData, 'Done', 0)).toEqual([
				{ n: 1, seen: true, done: true },
				{ n: 3, seen: true, done: true },
			]);
		});
	},
);
