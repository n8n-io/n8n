import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Azure Storage Node', () => {
	const workflows = ['nodes/Microsoft/Storage/test/workflows/blob_get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('should get blob', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://myaccount.blob.core.windows.net',
				mocks: [
					{
						method: 'get',
						path: '/mycontainer/myblob',
						statusCode: 200,
						responseBody: {
							type: 'Buffer',
							data: [
								123, 10, 34, 100, 97, 116, 97, 34, 58, 123, 10, 34, 109, 121, 95, 102, 105, 101,
								108, 100, 95, 49, 34, 58, 34, 118, 97, 108, 117, 101, 34, 44, 10, 34, 109, 121, 95,
								102, 105, 101, 108, 100, 95, 50, 34, 58, 49, 10, 125, 10, 125,
							],
						},
						responseHeaders: {
							'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
							'x-ms-version': '2025-01-05',
							date: 'Thu, 23 Jan 2025 17:53:23 GMT',
							'x-ms-client-request-id': 'x-ms-client-request-id',
							'last-modified': 'last-modified',
							'x-ms-creation-time': 'x-ms-creation-time',
							'x-ms-tag-count': 'x-ms-tag-count',
							'content-type': 'application/json',
							'content-range': 'content-range',
							etag: '"0x22769D26D3F3740"',
							'content-md5': 'content-md5',
							'x-ms-content-crc64': 'x-ms-content-crc64',
							'content-encoding': 'content-encoding',
							'content-language': 'content-language',
							'cache-control': 'cache-control',
							'content-disposition': 'attachment; filename="file.json"',
							'x-ms-blob-sequence-number': 'x-ms-blob-sequence-number',
							'x-ms-blob-type': 'x-ms-blob-type',
							'x-ms-copy-completion-time': 'x-ms-copy-completion-time',
							'x-ms-copy-status-description': 'x-ms-copy-status-description',
							'x-ms-copy-id': 'x-ms-copy-id',
							'x-ms-copy-progress': 'x-ms-copy-progress',
							'x-ms-copy-source': 'x-ms-copy-source',
							'x-ms-copy-status': 'x-ms-copy-status',
							'x-ms-incremental-copy': 'x-ms-incremental-copy',
							'x-ms-lease-duration': 'x-ms-lease-duration',
							'x-ms-lease-state': 'x-ms-lease-state',
							'x-ms-lease-status': 'x-ms-lease-status',
							'accept-ranges': 'accept-ranges',
							'access-control-allow-origin': 'access-control-allow-origin',
							'access-control-expose-headers': 'access-control-expose-headers',
							vary: 'vary',
							'access-control-allow-credentials': 'access-control-allow-credentials',
							'x-ms-blob-committed-block-count': 'x-ms-blob-committed-block-count',
							'x-ms-server-encrypted': 'x-ms-server-encrypted',
							'x-ms-encryption-key-sha256': 'x-ms-encryption-key-sha256',
							'x-ms-encryption-context': 'x-ms-encryption-context',
							'x-ms-encryption-scope': 'x-ms-encryption-scope',
							'x-ms-blob-content-md5': 'x-ms-blob-content-md5',
							'x-ms-last-access-time': 'x-ms-last-access-time',
							'x-ms-blob-sealed': 'x-ms-blob-sealed',
							'x-ms-immutability-policy-until-date': 'x-ms-immutability-policy-until-date',
							'x-ms-immutability-policy-mode': 'x-ms-immutability-policy-mode',
							'x-ms-legal-hold': 'x-ms-legal-hold',
							'x-ms-owner': 'x-ms-owner',
							'x-ms-group': 'x-ms-group',
							'x-ms-permissions': 'x-ms-permissions',
							'x-ms-acl': 'x-ms-acl',
							'x-ms-resource-type': 'x-ms-resource-type',
							'x-ms-meta-key1': 'value1',
						},
					},
				],
			};
			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
