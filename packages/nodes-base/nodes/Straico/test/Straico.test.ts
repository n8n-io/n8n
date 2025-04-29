import type { INodeTypes } from 'n8n-workflow';
import nock from 'nock';
import * as transport from '@n8n/client-oauth2/dist/transport';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

describe('Test Straico Node', () => {
	let nodeTypes: INodeTypes;

	beforeAll(async () => {
		nodeTypes = await setup(['n8n-nodes-base.straico']);
		jest.spyOn(transport, 'request').mockImplementation(() => {
			return Promise.resolve({ body: { access_token: 'test' } });
		});
	});

	beforeEach(() => {
		nock.cleanAll();
	});

	afterAll(() => {
		jest.resetAllMocks();
	});

	const tests: WorkflowTestData[] = [
		{
			description: 'should get user info',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {
								resource: 'user',
								operation: 'getInfo',
							},
						},
					],
				},
			},
			output: {
				nodeData: {
					id: '123',
					email: 'test@example.com',
					name: 'Test User',
				},
			},
		},
		{
			description: 'should get models list v0',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {
								resource: 'model',
								operation: 'getListV0',
							},
						},
					],
				},
			},
			output: {
				nodeData: [
					{
						id: 'gpt-4',
						name: 'GPT-4',
					},
					{
						id: 'claude-3',
						name: 'Claude 3',
					},
				],
			},
		},
		{
			description: 'should complete prompt v0',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {
								resource: 'prompt',
								operation: 'completeV0',
								model: 'gpt-4',
								message: 'Hello, how are you?',
								additionalFields: {
									temperature: 0.7,
									max_tokens: 100,
								},
							},
						},
					],
				},
			},
			output: {
				nodeData: {
					completion: 'I am doing well, thank you for asking!',
				},
			},
		},
	];

	const workflow = workflowToTests(tests);

	test.each(tests)('$description', async (testData) => {
		const { description } = testData;

		const scope = nock('https://api.straico.com')
			.persist()
			.get('/v0/user')
			.reply(200, {
				id: '123',
				email: 'test@example.com',
				name: 'Test User',
			})
			.get('/v0/models')
			.reply(200, [
				{
					id: 'gpt-4',
					name: 'GPT-4',
				},
				{
					id: 'claude-3',
					name: 'Claude 3',
				},
			])
			.post('/v0/prompt/completion')
			.reply(200, {
				completion: 'I am doing well, thank you for asking!',
			});

		const result = await executeWorkflow(workflow, nodeTypes);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			expect(resultData).toEqual(testData.output.nodeData);
		});

		scope.done();
	});
});
