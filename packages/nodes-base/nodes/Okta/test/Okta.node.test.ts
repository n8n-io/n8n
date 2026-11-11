import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';

const baseUrl = 'https://okta.example.com';
const credentials = { oktaApi: { url: baseUrl, accessToken: 'test-token' } };

const workflow = (
	operation: string,
	userId: string,
	mode = 'id',
): WorkflowTestData['input']['workflowData'] => ({
	nodes: [
		{
			id: '1',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: '2',
			name: 'Okta',
			type: 'n8n-nodes-base.okta',
			typeVersion: 1,
			position: [200, 0],
			credentials: { oktaApi: { id: '1', name: 'Okta' } },
			parameters: {
				resource: 'user',
				operation,
				userId: { __rl: true, mode, value: userId },
				simplify: false,
			},
		},
	],
	connections: { Trigger: { main: [[{ node: 'Okta', type: 'main', index: 0 }]] } },
});

describe('Okta Node', () => {
	const harness = new NodeTestHarness();

	const cases: Array<{
		description: string;
		operation: string;
		method: 'get' | 'delete' | 'post';
		userId: string;
		mode?: string;
		path: string;
		output: object;
	}> = [
		{
			description: 'should get a user by id',
			operation: 'get',
			method: 'get',
			userId: '00u1abcd',
			path: '/api/v1/users/00u1abcd',
			output: { id: '00u1abcd' },
		},
		{
			description: 'should get a user by login',
			operation: 'get',
			method: 'get',
			userId: 'jane@acme.com',
			mode: 'login',
			path: '/api/v1/users/jane%40acme.com',
			output: { id: '00u1abcd' },
		},
		{
			description: 'should encode the user id as one path segment on get',
			operation: 'get',
			method: 'get',
			userId: 'x/../y',
			path: '/api/v1/users/x%2F..%2Fy',
			output: { id: '00u1abcd' },
		},
		{
			description: 'should encode the user id as one path segment on delete',
			operation: 'delete',
			method: 'delete',
			userId: 'a/b/c',
			path: '/api/v1/users/a%2Fb%2Fc',
			output: { success: true },
		},
		{
			description: 'should encode the user id as one path segment on update',
			operation: 'update',
			method: 'post',
			userId: 'a/b',
			path: '/api/v1/users/a%2Fb',
			output: { id: '00u1abcd' },
		},
	];

	for (const { description, operation, method, userId, mode, path, output } of cases) {
		harness.setupTest({
			description,
			input: { workflowData: workflow(operation, userId, mode) },
			output: { nodeData: { Okta: [[{ json: output }]] } },
			credentials,
			nock: {
				baseUrl,
				mocks: [{ method, path, statusCode: 200, responseBody: { id: '00u1abcd' } }],
			},
		});
	}

	harness.setupTest({
		description: 'should reject a dot segment as the user id',
		input: { workflowData: workflow('get', '..') },
		output: { nodeData: {}, error: 'Invalid identifier: ".." is not allowed' },
		credentials,
	});
});
