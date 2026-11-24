import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeTypes } from '@nodes-testing/node-types';
import type { IDataObject, INodeParameters, WorkflowTestData } from 'n8n-workflow';

import { N8nV2 } from '../../../v2/N8nV2.node';

type Mock = NonNullable<WorkflowTestData['nock']>['mocks'][number];

const baseUrl = 'https://test.app.n8n.cloud/api/v1';
const workflow = { id: 'wf1', name: 'Example workflow' };
const otherWorkflow = { id: 'wf2', name: 'Other workflow' };

const testData = (
	description: string,
	parameters: INodeParameters,
	mocks: Mock[],
	output: IDataObject[],
): WorkflowTestData => ({
	description,
	input: {
		workflowData: {
			nodes: [
				{
					id: 'n8n-node',
					name: 'n8n',
					type: 'n8n-nodes-base.n8n',
					typeVersion: 2,
					position: [0, 0],
					parameters: { resource: 'workflow', ...parameters },
					credentials: { n8nApi: { id: 'n8n-credentials', name: 'n8n account' } },
				},
			],
			connections: {},
		},
	},
	credentials: { n8nApi: { apiKey: 'test-api-key', baseUrl } },
	nock: { baseUrl, mocks },
	output: { nodeData: { n8n: [output.map((json) => ({ json }))] } },
});

describe('N8nV2 workflow operations', () => {
	const harness = new NodeTestHarness();
	const getNodeType = NodeTypes.prototype.getByNameAndVersion;
	const n8nV2 = new N8nV2({
		displayName: 'n8n',
		name: 'n8n',
		group: ['transform'],
		description: 'Handle events and perform actions on your n8n instance',
	});

	beforeEach(() => {
		vi.spyOn(NodeTypes.prototype, 'getByNameAndVersion').mockImplementation(function (
			this: NodeTypes,
			type,
			version,
		) {
			return type === 'n8n-nodes-base.n8n' && version === 2
				? n8nV2
				: getNodeType.call(this, type, version);
		});
	});

	harness.setupTest(
		testData(
			'should send the workflow ID from a workflow URL in the request path',
			{
				operation: 'getWorkflow',
				workflowId: { __rl: true, mode: 'url', value: 'https://test.app.n8n.cloud/workflow/wf1' },
			},
			[{ method: 'get', path: '/workflows/wf1', statusCode: 200, responseBody: workflow }],
			[workflow],
		),
	);

	harness.setupTest(
		testData(
			'should send the JSON fields of a new workflow as objects in the body',
			{
				operation: 'createWorkflow',
				name: 'Example workflow',
				nodes: '[]',
				connections: '{}',
				settings: '{ "executionOrder": "v1" }',
			},
			[
				{
					method: 'post',
					path: '/workflows',
					requestBody: {
						name: 'Example workflow',
						nodes: [],
						connections: {},
						settings: { executionOrder: 'v1' },
					},
					statusCode: 200,
					responseBody: workflow,
				},
			],
			[workflow],
		),
	);

	harness.setupTest(
		testData(
			'should return the workflows of all pages when Return All is on',
			{ operation: 'getWorkflows', returnAll: true },
			[
				{
					method: 'get',
					path: '/workflows',
					statusCode: 200,
					responseBody: { data: [workflow], nextCursor: 'page2' },
				},
				{
					method: 'get',
					path: '/workflows?cursor=page2',
					statusCode: 200,
					responseBody: { data: [otherWorkflow], nextCursor: null },
				},
			],
			[workflow, otherWorkflow],
		),
	);

	harness.setupTest(
		testData(
			'should keep an option in the request of each page when Return All is on',
			{ operation: 'getWorkflows', returnAll: true, options: { active: true } },
			[
				{
					method: 'get',
					path: '/workflows?active=true',
					statusCode: 200,
					responseBody: { data: [workflow], nextCursor: 'page2' },
				},
				{
					method: 'get',
					path: '/workflows?active=true&cursor=page2',
					statusCode: 200,
					responseBody: { data: [otherWorkflow], nextCursor: null },
				},
			],
			[workflow, otherWorkflow],
		),
	);
});
