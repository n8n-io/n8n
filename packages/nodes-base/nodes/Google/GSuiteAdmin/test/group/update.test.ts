import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/group/update.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should update group', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'put',
						path: '/directory/v1/groups/01302m922p525286',
						statusCode: 200,
						responseBody: {
							kind: 'admin#directory#group',
							id: '01302m922p525286',
							etag: '"example"',
							email: 'new3@example.com',
							name: 'new2',
							description: 'new1',
							adminCreated: true,
							aliases: ['new@example.com', 'NewOnes@example.com', 'new2@example.com'],
							nonEditableAliases: [
								'NewOnes@example.com.test-google-a.com',
								'new@example.com.test-google-a.com',
							],
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
