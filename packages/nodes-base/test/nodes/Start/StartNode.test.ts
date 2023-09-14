import * as Helpers from '../Helpers';
import type { WorkflowTestData } from '../types';
import { executeWorkflow } from '../ExecuteWorkflow';

describe('Execute Start Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should run start node',
			input: {
				workflowData: {
					nodes: [
						{
							id: 'uuid-1',
							parameters: {},
							name: 'Start',
							type: 'n8n-nodes-base.start',
							typeVersion: 1,
							position: [100, 300],
						},
					],
					connections: {},
				},
			},
			output: {
				nodeExecutionOrder: ['Start'],
				nodeData: {},
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => {
			// execute workflow
			const { result, nodeExecutionOrder } = await executeWorkflow(testData, nodeTypes);
			// Check if the nodes did execute in the correct order
			expect(nodeExecutionOrder).toEqual(testData.output.nodeExecutionOrder);
			// Check if other data has correct value
			expect(result.finished).toEqual(true);
			expect(result.data.executionData!.contextData).toEqual({});
			expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
		});
	}
});
