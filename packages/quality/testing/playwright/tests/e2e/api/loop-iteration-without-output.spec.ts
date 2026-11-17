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

test.describe(
	'Loop iteration without output',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should end the loop when the body returns nothing, and not run the done output @engine:v2', async ({
			api,
		}) => {
			const { id: workflowId } = await api.workflows.createWorkflow(workflow);

			const { executionId } = await api.workflows.runManually(workflowId, 'Trigger');
			const execution = await api.workflows.waitForExecutionById(executionId);
			expect(execution.status).toBe('success');

			const runData = runDataOf(execution);
			// Pass one handed over n: 1, and the body returned it. Pass two handed
			// over n: 2, and the filter dropped it. Nothing returned to the loop, so
			// there was no pass three: n: 3 was never handed over.
			expect(runData.Loop).toHaveLength(2);
			expect(items(runData, 'Body', 0)).toEqual([{ n: 1, seen: true }]);
			expect(items(runData, 'Filter', 1)).toEqual([]);
			expect(runData.Body).toHaveLength(1);
			// The loop never ran out of items, so its done output never fired.
			expect(runData).not.toHaveProperty('Done');
		});
	},
);
