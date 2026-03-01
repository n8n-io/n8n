import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Azure Storage Node', () => {
	const { baseUrl } = credentials.azureStorageOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['container_create.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'put',
					path: '/mycontainer?restype=container',
					statusCode: 201,
					requestHeaders: { 'x-ms-blob-public-access': 'blob', 'x-ms-meta-key1': 'value1' },
					responseBody: '',
					responseHeaders: {
						etag: '"0x22769D26D3F3740"',
						'last-modified': 'Thu, 23 Jan 2025 17:53:23 GMT',
						'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
						'x-ms-version': '2025-01-05',
						date: 'Thu, 23 Jan 2025 17:53:23 GMT',
						'x-ms-request-server-encrypted': 'true',
						'x-ms-client-request-id': 'client-request-id-123',
					},
				},
			],
		},
	});
});
