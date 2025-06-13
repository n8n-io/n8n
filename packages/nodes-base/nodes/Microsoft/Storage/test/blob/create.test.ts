import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Azure Storage Node', () => {
	const { baseUrl } = credentials.azureStorageOAuth2Api;

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['blob_create.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'put',
					path: '/mycontainer/myblob',
					statusCode: 201,
					requestHeaders: {
						'x-ms-access-tier': 'Hot',
						'x-ms-blob-type': 'BlockBlob',
						'x-ms-blob-cache-control': 'no-cache',
						'x-ms-content-crc64': '3EDB64E77CB16A4C',
						'x-ms-blob-content-encoding': 'utf8',
						'x-ms-blob-content-language': 'en-US',
						'x-ms-blob-content-md5': 'b97f46db5f3be7709d942eefe30e5b45',
						'x-ms-blob-content-type': 'application/json',
						'x-ms-encryption-context': 'context',
						'x-ms-encryption-scope': 'encryptionScope',
						'x-ms-expiry-option': 'Absolute',
						'x-ms-blob-content-disposition': 'attachment; filename="file.json"',
						'x-ms-immutability-policy-until-date': 'Wed, 01 Jan 2025 00:00:00 -0500',
						'x-ms-immutability-policy-mode': 'unlocked',
						'x-ms-lease-id': 'leaseId123',
						'x-ms-legal-hold': 'true',
						'x-ms-meta-key1': 'value1',
					},
					responseBody: '',
					responseHeaders: {
						server: 'Azurite-Blob/3.33.0',
						etag: '"0x22769D26D3F3740"',
						'last-modified': 'Thu, 23 Jan 2025 17:53:23 GMT',
						'content-md5': 'aWQGHD8kGQd5ZtEN/S1/aw==',
						'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
						'x-ms-version': '2025-01-05',
						date: 'Thu, 23 Jan 2025 17:53:23 GMT',
						'x-ms-request-server-encrypted': 'true',
						'keep-alive': 'timeout=5',
						'content-length': '0',
						'x-ms-version-id': 'Thu, 23 Jan 2025 17:53:23 GMT',
						'access-control-allow-credentials': 'access-control-allow-credentials',
						'access-control-allow-origin': 'access-control-allow-origin',
						'access-control-expose-headers': 'access-control-expose-headers',
						'x-ms-content-crc64': 'x-ms-content-crc64',
						'x-ms-encryption-key-sha256': 'x-ms-encryption-key-sha256',
						'x-ms-encryption-scope': 'x-ms-encryption-scope',
					},
				},
			],
		},
	});
});
