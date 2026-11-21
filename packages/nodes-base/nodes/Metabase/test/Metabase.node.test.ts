import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';

const baseUrl = 'https://metabase.example.com';
const credentials = {
	metabaseApi: { url: baseUrl, username: 'user', password: 'pass', sessionToken: 'token' },
};

const workflow = (
	parameters: Record<string, string>,
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
			name: 'Metabase',
			type: 'n8n-nodes-base.metabase',
			typeVersion: 1,
			position: [200, 0],
			credentials: { metabaseApi: { id: '1', name: 'Metabase' } },
			parameters,
		},
	],
	connections: { Trigger: { main: [[{ node: 'Metabase', type: 'main', index: 0 }]] } },
});

describe('Metabase Node', () => {
	const harness = new NodeTestHarness();

	const cases: Array<{
		description: string;
		parameters: Record<string, string>;
		method: 'get' | 'post';
		path: string;
	}> = [
		{
			description: 'should get an alert by ID',
			parameters: { resource: 'alerts', operation: 'get', alertId: '42' },
			method: 'get',
			path: '/api/alert/42',
		},
		{
			description: 'should send the alert ID as one path segment',
			parameters: { resource: 'alerts', operation: 'get', alertId: 'a/b' },
			method: 'get',
			path: '/api/alert/a%2Fb',
		},
		{
			description: 'should get a metric by ID',
			parameters: { resource: 'metrics', operation: 'get', metricId: '42' },
			method: 'get',
			path: '/api/metric/42',
		},
		{
			description: 'should send the metric ID as one path segment',
			parameters: { resource: 'metrics', operation: 'get', metricId: 'a/b' },
			method: 'get',
			path: '/api/metric/a%2Fb',
		},
		{
			description: 'should get the fields of a database',
			parameters: { resource: 'databases', operation: 'getFields', databaseId: '42' },
			method: 'get',
			path: '/api/database/42/fields',
		},
		{
			description: 'should send the database ID as one path segment',
			parameters: { resource: 'databases', operation: 'getFields', databaseId: 'a/b' },
			method: 'get',
			path: '/api/database/a%2Fb/fields',
		},
		{
			description: 'should get a question by ID',
			parameters: { resource: 'questions', operation: 'get', questionId: '42' },
			method: 'get',
			path: '/api/card/42',
		},
		{
			description: 'should send the question ID as one path segment',
			parameters: { resource: 'questions', operation: 'get', questionId: 'a/b' },
			method: 'get',
			path: '/api/card/a%2Fb',
		},
		{
			description: 'should get the result data of a question',
			parameters: {
				resource: 'questions',
				operation: 'resultData',
				questionId: '42',
				format: 'json',
			},
			method: 'post',
			path: '/api/card/42/query/json',
		},
		{
			description: 'should send the question ID as one path segment for result data',
			parameters: {
				resource: 'questions',
				operation: 'resultData',
				questionId: 'a/b',
				format: 'json',
			},
			method: 'post',
			path: '/api/card/a%2Fb/query/json',
		},
	];

	for (const { description, parameters, method, path } of cases) {
		harness.setupTest({
			description,
			input: { workflowData: workflow(parameters) },
			output: { nodeData: { Metabase: [[{ json: { id: 1 } }]] } },
			credentials,
			nock: {
				baseUrl,
				mocks: [
					{
						method,
						path,
						statusCode: 200,
						responseBody: method === 'post' ? '[{"id":1}]' : { id: 1 },
					},
				],
			},
		});
	}

	const rejected: Array<[string, Record<string, string>]> = [
		['alert', { resource: 'alerts', operation: 'get', alertId: '..' }],
		['metric', { resource: 'metrics', operation: 'get', metricId: '..' }],
		['database', { resource: 'databases', operation: 'getFields', databaseId: '..' }],
		['question', { resource: 'questions', operation: 'get', questionId: '..' }],
	];

	for (const [name, parameters] of rejected) {
		harness.setupTest({
			description: `should reject a dot segment as the ${name} ID`,
			input: { workflowData: workflow(parameters) },
			output: { nodeData: {}, error: 'Invalid identifier: ".." is not allowed' },
			credentials,
		});
	}

	const resultData = { resource: 'questions', operation: 'resultData', questionId: '42' };

	for (const format of ['csv', 'xlsx']) {
		harness.setupTest({
			description: `should get the result data of a question as ${format}`,
			input: { workflowData: workflow({ ...resultData, format }) },
			output: { nodeData: { Metabase: [[{ json: {} }]] } },
			credentials,
			nock: {
				baseUrl,
				mocks: [
					{
						method: 'post',
						path: `/api/card/42/query/${format}`,
						statusCode: 200,
						responseBody: '[{"id":1}]',
					},
				],
			},
		});
	}

	for (const format of ['..', 'a/../b']) {
		harness.setupTest({
			description: `should reject "${format}" as the result data format`,
			input: {
				workflowData: workflow({ ...resultData, format: `={{ ${JSON.stringify(format)} }}` }),
			},
			output: { nodeData: {}, error: `Invalid identifier: "${format}" is not allowed` },
			credentials,
		});
	}
});
