import { equalityTest, workflowToTests } from '@test/nodes/Helpers';

describe('Microsoft SharePoint Node', () => {
	const workflows = ['nodes/Microsoft/SharePoint/test/file/download.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	for (const workflow of workflowTests) {
		workflow.nock = {
			baseUrl: 'https://mydomain.sharepoint.com/_api/v2.0',
			mocks: [
				{
					method: 'get',
					path: '/sites/site1/drive/items/item1/content',
					statusCode: 200,
					responseBody: {},
				},
			],
		};

		test(workflow.description, async () => await equalityTest(workflow));
	}
});
