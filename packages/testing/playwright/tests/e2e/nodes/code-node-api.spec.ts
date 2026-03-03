import flatted from 'flatted';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { workflow, trigger, node } from '../../../../../@n8n/workflow-sdk/src';
import { test, expect } from '../../../fixtures/base';

const TRIGGER_NAME = 'Manual Trigger';
const ALL_ITEMS_NODE_NAME = 'Code All Items';
const EACH_ITEM_NODE_NAME = 'Code Each Item';

function createCodeNodeWorkflow(): IWorkflowBase {
	const manualTrigger = trigger({
		type: 'n8n-nodes-base.manualTrigger',
		version: 1,
		config: {
			name: TRIGGER_NAME,
			parameters: {},
		},
	});

	const codeAllItems = node({
		type: 'n8n-nodes-base.code',
		version: 1,
		config: {
			name: ALL_ITEMS_NODE_NAME,
			parameters: {
				mode: 'runOnceForAllItems',
				jsCode: 'return [{ json: { value: 1 } }, { json: { value: 2 } }];',
			},
		},
	});

	const codeEachItem = node({
		type: 'n8n-nodes-base.code',
		version: 1,
		config: {
			name: EACH_ITEM_NODE_NAME,
			parameters: {
				mode: 'runOnceForEachItem',
				jsCode: 'return { json: { processed: $json.value * 2 } };',
			},
		},
	});

	const wf = workflow(nanoid(), `Code node test ${nanoid()}`)
		.add(manualTrigger.to(codeAllItems))
		.add(codeAllItems.to(codeEachItem));

	const json = wf.toJSON() as IWorkflowBase;
	json.settings = { executionOrder: 'v1' };

	return json;
}

test.describe(
	'Code node API execution @capability:task-runner',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should execute runOnceForAllItems and runOnceForEachItem code nodes successfully', async ({
			api,
		}) => {
			const { workflowId } = await api.workflows.createWorkflowFromDefinition(
				createCodeNodeWorkflow(),
			);

			await api.workflows.runManually(workflowId, TRIGGER_NAME);

			const execution = await api.workflows.waitForExecution(workflowId, 15_000, 'manual');
			expect(execution.status).toBe('success');

			const fullExecution = await api.workflows.getExecution(execution.id);
			const executionData = flatted.parse(fullExecution.data);

			// Verify runOnceForAllItems node produced correct output
			const allItemsOutput = executionData.resultData.runData[ALL_ITEMS_NODE_NAME];
			expect(allItemsOutput).toBeDefined();
			expect(allItemsOutput[0].data.main[0]).toEqual([
				expect.objectContaining({ json: { value: 1 } }),
				expect.objectContaining({ json: { value: 2 } }),
			]);

			// Verify runOnceForEachItem node processed each item correctly
			const eachItemOutput = executionData.resultData.runData[EACH_ITEM_NODE_NAME];
			expect(eachItemOutput).toBeDefined();
			expect(eachItemOutput[0].data.main[0]).toEqual([
				expect.objectContaining({ json: { processed: 2 } }),
				expect.objectContaining({ json: { processed: 4 } }),
			]);
		});
	},
);
