import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';

const baseUrl = 'https://fake.npm.registry';
const credentials = { npmApi: { accessToken: 'fake-token', registryUrl: baseUrl } };

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
			name: 'Npm',
			type: 'n8n-nodes-base.npm',
			typeVersion: 1,
			position: [200, 0],
			credentials: { npmApi: { id: '1', name: 'Npm' } },
			parameters,
		},
	],
	connections: { Trigger: { main: [[{ node: 'Npm', type: 'main', index: 0 }]] } },
});

const metadata = (packageName: string, packageVersion: string) =>
	workflow({ resource: 'package', operation: 'getMetadata', packageName, packageVersion });

describe('Npm Node request paths', () => {
	const harness = new NodeTestHarness();

	const cases: Array<{
		description: string;
		workflowData: WorkflowTestData['input']['workflowData'];
		path: string;
		items?: Array<{ json: object }>;
	}> = [
		{
			description: 'should send a normal package version',
			workflowData: metadata('n8n', '1.0.0'),
			path: '/n8n/1.0.0',
		},
		{
			description: 'should send the package version as one path segment',
			workflowData: metadata('n8n', 'a/b'),
			path: '/n8n/a%2Fb',
		},
		{
			description: 'should encode a slash in the package version',
			workflowData: metadata('n8n', '1/2'),
			path: '/n8n/1%2F2',
		},
		{
			description: 'should send a scoped package name as one path segment',
			workflowData: metadata('@scope/name', 'latest'),
			path: '/%40scope%2Fname/latest',
		},
		{
			description: 'should send the package name as one path segment for all versions',
			workflowData: workflow({
				resource: 'package',
				operation: 'getVersions',
				packageName: '@scope/name',
			}),
			path: '/%40scope%2Fname',
			items: [],
		},
		{
			description: 'should send the package name as one path segment for dist-tags',
			workflowData: workflow({
				resource: 'distTag',
				operation: 'getMany',
				packageName: '@scope/name',
			}),
			path: '/-/package/%40scope%2Fname/dist-tags',
		},
	];

	for (const { description, workflowData, path, items = [{ json: { time: {} } }] } of cases) {
		harness.setupTest({
			description,
			input: { workflowData },
			output: { nodeData: { Npm: [items] } },
			credentials,
			nock: {
				baseUrl,
				mocks: [{ method: 'get', path, statusCode: 200, responseBody: { time: {} } }],
			},
		});
	}

	harness.setupTest({
		description: 'should reject a dot segment as the package version',
		input: { workflowData: metadata('n8n', '..') },
		output: { nodeData: {}, error: 'Invalid identifier: ".." is not allowed' },
		credentials,
	});
});
