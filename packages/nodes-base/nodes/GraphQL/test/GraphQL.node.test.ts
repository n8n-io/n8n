import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import * as Helpers from '@test/nodes/Helpers';

describe('GraphQL Node', () => {
	const mockResponse = {
		data: {
			nodes: {},
		},
	};

	const tests: WorkflowTestData[] = [
		{
			description: 'should run Request Format JSON',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/GraphQL/test/workflow.json'),
			},
			output: {
				nodeExecutionOrder: ['Start'],
				nodeData: {
					'Fetch Request Format JSON': [
						[
							{
								json: mockResponse,
							},
						],
					],
				},
			},
			nock: {
				baseUrl: 'https://api.n8n.io',
				mocks: [
					{
						method: 'post',
						path: '/graphql',
						statusCode: 200,
						responseBody: mockResponse,
					},
				],
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

	test.each(tests)('$description', async (testData) => {
		const { result } = await executeWorkflow(testData, nodeTypes);
		const resultNodeData = Helpers.getResultNodeData(result, testData);
		resultNodeData.forEach(({ nodeName, resultData }) =>
			expect(resultData).toEqual(testData.output.nodeData[nodeName]),
		);
		expect(result.finished).toEqual(true);
	});
});
