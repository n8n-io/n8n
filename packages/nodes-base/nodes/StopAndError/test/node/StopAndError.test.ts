import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeConnectionTypes, type WorkflowTestData } from 'n8n-workflow';

describe('Execute Stop and Error Node', () => {
	const testHarness = new NodeTestHarness();
	const tests: WorkflowTestData[] = [
		{
			description: 'should run stopAndError node',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {},
							id: 'b1dcfb89-3dda-4d18-bdd6-c12d8dee70d2',
							name: 'When clicking "Execute Workflow"',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [820, 400],
						},
						{
							parameters: {
								errorType: 'errorObject',
								errorObject: '{\n"code": 404,\n"message": "error object from node"\n}',
							},
							id: '5dae596a-8956-4149-ba9d-36b6b5e80c4a',
							name: 'Stop and Error1',
							type: 'n8n-nodes-base.stopAndError',
							typeVersion: 1,
							position: [1080, 300],
							continueOnFail: true,
						},
						{
							parameters: {
								errorMessage: 'error message from node 0',
							},
							id: '196ca8fe-994d-46aa-a0ed-bd9beeaa490e',
							name: 'Stop and Error',
							type: 'n8n-nodes-base.stopAndError',
							typeVersion: 1,
							position: [1080, 480],
							continueOnFail: true,
						},
					],
					connections: {
						'When clicking "Execute Workflow"': {
							main: [
								[
									{
										node: 'Stop and Error1',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
									{
										node: 'Stop and Error',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
				nodeExecutionOrder: [
					'When clicking "Execute Workflow"',
					'Stop and Error1',
					'Stop and Error',
				],
				nodeData: {},
				error: 'error message from node 0',
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData);
	}
});
