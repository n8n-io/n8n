import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/addToGroup.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should add user to group', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'get',
						path: '/directory/v1/users/114393134535981252528',
						statusCode: 200,
						responseBody: {
							primaryEmail: 'newone@example.com',
						},
					},
					{
						method: 'post',
						path: '/directory/v1/groups/01302m922pmp3e4/members',
						statusCode: 200,
						requestBody: {
							email: 'newone@example.com',
							role: 'MEMBER',
						},
						responseBody: {
							kind: 'admin#directory#member',
							status: 'ACTIVE',
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
