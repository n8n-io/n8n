import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/device/changeStatus.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should change status', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'post',
						path: '/directory/v1/customer/my_customer/devices/chromeos/9140fcff-7ba7-4324-8552-f7de68481b4c/action',
						statusCode: 200,
						requestBody: {
							action: 'reenable',
						},
						responseBody: {
							kind: 'admin#directory#chromeosdeviceAction',
							action: 'reenable',
							status: 'SUCCESS',
						},
					},
				],
			};
			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
