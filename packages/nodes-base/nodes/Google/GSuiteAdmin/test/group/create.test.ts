import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/group/create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should create group', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'post',
						path: '/directory/v1/groups',
						statusCode: 200,
						requestBody: {
							email: 'NewOnes22@example.com',
							name: 'Test',
							description: 'test',
						},
						responseBody: {
							kind: 'admin#directory#group',
							id: '03mzq4wv15cepg2',
							etag: '"example"',
							email: 'NewOnes22@example.com',
							name: 'Test',
							description: 'test',
							adminCreated: true,
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
