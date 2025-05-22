import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';

describe('Execute Start Node', () => {
	const testHarness = new NodeTestHarness();
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
				nodeExecutionStack: [],
				nodeData: {},
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData);
	}
});
