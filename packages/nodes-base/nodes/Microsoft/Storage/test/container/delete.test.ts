import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Azure Storage Node', () => {
	const workflows = ['nodes/Microsoft/Storage/test/workflows/container_delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('should delete container', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://myaccount.blob.core.windows.net',
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
			};
			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
