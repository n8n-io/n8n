import type { WorkflowTestData } from 'n8n-workflow';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Azure Storage Node container path', () => {
	const { baseUrl } = credentials.azureStorageOAuth2Api;

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['container_delete_encoded_name.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'delete',
					path: '/my%2Fcontainer?restype=container',
					statusCode: 202,
					responseBody: '',
					responseHeaders: { 'x-ms-request-id': 'ca3a8907-601e-0050-1929-723410000000' },
				},
			],
		},
	});

	describe('rejects a container named ..', () => {
		const harness = new NodeTestHarness();
		const testData: WorkflowTestData = {
			description: 'container_delete_relative_name.workflow',
			input: {
				workflowData: harness.readWorkflowJSON('container_delete_relative_name.workflow.json'),
			},
			output: { nodeData: {}, error: 'Invalid identifier: ".." is not allowed' },
			credentials,
		};
		harness.setupTest(testData, { credentials });
	});
});
