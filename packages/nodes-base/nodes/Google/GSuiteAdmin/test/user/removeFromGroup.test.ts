import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/removeFromGroup.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should remove user from group', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'delete',
						path: '/directory/v1/groups/01302m922pmp3e4/members/114393134535981252528',
						statusCode: 200,
						responseBody: {},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
