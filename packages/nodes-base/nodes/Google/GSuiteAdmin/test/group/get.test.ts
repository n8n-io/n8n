import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/group/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should get group', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'get',
						path: '/directory/v1/groups/01302m922pmp3e4',
						statusCode: 200,
						responseBody: {
							kind: 'admin#directory#group',
							id: '01302m922pmp3e4',
							etag: '"example"',
							email: 'new3@example.com',
							name: 'new2',
							directMembersCount: '2',
							description: 'new1',
							adminCreated: true,
							aliases: ['new2@example.com', 'new@example.com', 'NewOnes@example.com'],
							nonEditableAliases: [
								'NewOnes@example.com.test-google-a.com',
								'new@example.com.test-google-a.com',
								'new2@example.com.test-google-a.com',
								'new3@example.com.test-google-a.com',
							],
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
