import type { WorkflowTestData } from 'n8n-workflow';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Azure Storage Node blob path', () => {
	const { baseUrl } = credentials.azureStorageOAuth2Api;

	describe('sends each part of a blob name as a path segment', () => {
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['blob_delete_nested_name.workflow.json'],
			nock: {
				baseUrl,
				mocks: [
					{
						method: 'delete',
						path: '/mycontainer/my%20folder/my%20blob.txt',
						statusCode: 202,
						responseBody: '',
						responseHeaders: { 'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab' },
					},
				],
			},
		});
	});

	describe('sends a numeric blob name as a path segment', () => {
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['blob_delete_numeric_name.workflow.json'],
			nock: {
				baseUrl,
				mocks: [
					{
						method: 'delete',
						path: '/mycontainer/123',
						statusCode: 202,
						responseBody: '',
						responseHeaders: { 'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab' },
					},
				],
			},
		});
	});

	describe('keeps empty parts of a blob name as empty path segments', () => {
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['blob_delete_repeated_slash_name.workflow.json'],
			nock: {
				baseUrl,
				mocks: [
					{
						method: 'delete',
						path: '/mycontainer/a//b/',
						statusCode: 202,
						responseBody: '',
						responseHeaders: { 'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab' },
					},
				],
			},
		});
	});

	describe('rejects a relative part in a blob name', () => {
		const harness = new NodeTestHarness();
		const testData: WorkflowTestData = {
			description: 'blob_delete_relative_name.workflow',
			input: {
				workflowData: harness.readWorkflowJSON('blob_delete_relative_name.workflow.json'),
			},
			output: { nodeData: {}, error: 'Invalid identifier: ".." is not allowed' },
			credentials,
		};
		harness.setupTest(testData, { credentials });
	});
});
