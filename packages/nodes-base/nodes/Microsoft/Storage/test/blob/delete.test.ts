import { equalityTest, workflowToTests } from '@test/nodes/Helpers';

describe('Azure Storage Node', () => {
	const workflows = ['nodes/Microsoft/Storage/test/workflows/blob_delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should delete blob', () => {
		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://myaccount.blob.core.windows.net',
				mocks: [
					{
						method: 'delete',
						path: '/mycontainer/myblob',
						statusCode: 202,
						responseBody: '',
						responseHeaders: {
							'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
							'x-ms-version': '2025-01-05',
							date: 'Thu, 23 Jan 2025 17:53:23 GMT',
							'x-ms-delete-type-permanent': 'true',
							'x-ms-client-request-id': 'x-ms-client-request-id',
						},
					},
				],
			};
			test(workflow.description, async () => await equalityTest(workflow));
		}
	});
});
