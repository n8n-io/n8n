import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Azure Storage Node', () => {
	const { baseUrl } = credentials.azureStorageOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['container_delete.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'delete',
					path: '/mycontainer?restype=container',
					statusCode: 202,
					responseBody: '',
					responseHeaders: {
						'content-length': '0',
						server: 'Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0',
						'x-ms-request-id': 'ca3a8907-601e-0050-1929-723410000000',
						'x-ms-version': '2020-10-02',
						date: 'Wed, 29 Jan 2025 08:38:21 GMT',
					},
				},
			],
		},
	});
});
