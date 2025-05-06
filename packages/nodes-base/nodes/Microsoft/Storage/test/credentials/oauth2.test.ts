import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Azure Storage Node', () => {
	const { baseUrl } = credentials.azureStorageOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['credentials_oauth2.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: '/mycontainer?restype=container',
					statusCode: 200,
					responseBody: '',
					responseHeaders: {
						'content-length': '0',
						'last-modified': 'Tue, 28 Jan 2025 16:40:21 GMT',
						etag: '"0x8DD3FBA74CF3620"',
						server: 'Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0',
						'x-ms-request-id': '49edb268-b01e-0053-6e29-72d574000000',
						'x-ms-version': '2020-10-02',
						'x-ms-lease-status': 'unlocked',
						'x-ms-lease-state': 'available',
						'x-ms-has-immutability-policy': 'false',
						'x-ms-has-legal-hold': 'false',
						date: 'Wed, 29 Jan 2025 08:43:08 GMT',
						'x-ms-meta-key1': 'field1',
						'x-ms-blob-public-access': 'blob',
						'x-ms-lease-duration': 'infinite',
					},
				},
			],
		},
	});
});
