import { equalityTest, workflowToTests } from '@test/nodes/Helpers';

describe('Microsoft SharePoint Node', () => {
	const workflows = ['nodes/Microsoft/SharePoint/test/item/delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	for (const workflow of workflowTests) {
		workflow.nock = {
			baseUrl: 'https://mydomain.sharepoint.com/_api/v2.0',
			mocks: [
				{
					method: 'delete',
					path: '/sites/site1/lists/list1/items/item1',
					statusCode: 204,
					responseBody: {},
				},
			],
		};

		test(workflow.description, async () => await equalityTest(workflow));
	}
});
