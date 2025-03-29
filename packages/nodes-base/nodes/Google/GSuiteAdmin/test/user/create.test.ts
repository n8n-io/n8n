import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should create user', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'post',
						path: '/directory/v1/users',
						statusCode: 200,
						responseBody: {
							kind: 'admin#directory#user',
							id: '112507770188715525288',
							etag: '"example"',
							primaryEmail: 'new@example.com',
							name: {
								givenName: 'NewOne',
								familyName: 'User',
							},
							isAdmin: false,
							isDelegatedAdmin: false,
							creationTime: '2024-12-20T20:48:53.000Z',
							customerId: 'C4444hnz2',
							orgUnitPath: '/',
							isMailboxSetup: false,
						},
					},
				],
			};
			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
