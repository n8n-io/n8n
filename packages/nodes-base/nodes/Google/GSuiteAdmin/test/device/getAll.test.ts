import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/device/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should get many device', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'get',
						path: '/directory/v1/customer/my_customer/devices/chromeos/',
						statusCode: 200,
						responseBody: [
							{
								kind: 'admin#directory#chromeosdevices',
								etag: '"example"',
							},
						],
					},
				],
			};

			nock('https://www.googleapis.com/admin')
				.get('/directory/v1/customer/my_customer/devices/chromeos/')
				.query({
					customer: 'my_customer',
					includeChildOrgunits: false,
					maxResults: 100,
					orderBy: 'notes',
					orgUnitPath: '/admin-google Testing OU/Child OU',
					projection: 'basic',
				})
				.reply(200, [
					{
						kind: 'admin#directory#chromeosdevices',
						etag: '"example"',
					},
				]);

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
