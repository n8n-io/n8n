import { equalityTest, workflowToTests } from '@test/nodes/Helpers';

describe('Azure Storage Node', () => {
	const workflows = ['nodes/Microsoft/Storage/test/workflows/container_create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should create container', () => {
		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://myaccount.blob.core.windows.net',
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
			};
			test(workflow.description, async () => await equalityTest(workflow));
		}
	});
});
