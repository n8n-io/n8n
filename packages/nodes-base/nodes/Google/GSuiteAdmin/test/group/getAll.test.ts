import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/group/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should get many groups', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'get',
						path: '/directory/v1/groups',
						statusCode: 200,
						responseBody: {
							kind: 'admin#directory#groups',
							etag: '"test_etag"',
							groups: [
								{
									kind: 'admin#directory#group',
									id: '01x0gk373c9z46j',
									etag: '"example"',
									email: 'newoness@example.com',
									name: 'NewOness',
									directMembersCount: '1',
									description: 'test',
									adminCreated: true,
									nonEditableAliases: ['NewOness@example.com.test-google-a.com'],
								},
								{
									kind: 'admin#directory#group',
									id: '01tuee742txc3k4',
									etag: '"example"',
									email: 'newonesss@example.com',
									name: 'NewOne3',
									directMembersCount: '0',
									description: 'test',
									adminCreated: true,
									nonEditableAliases: ['NewOnesss@example.com.test-google-a.com'],
								},
							],
						},
					},
				],
			};

			nock('https://www.googleapis.com/admin')
				.get('/directory/v1/groups')
				.query({
					customer: 'my_customer',
					maxResults: '100',
				})
				.reply(200, {
					kind: 'admin#directory#groups',
					etag: '"test_etag"',
					groups: [
						{
							kind: 'admin#directory#group',
							id: '01x0gk373c9z46j',
							etag: '"example"',
							email: 'newoness@example.com',
							name: 'NewOness',
							directMembersCount: '1',
							description: 'test',
							adminCreated: true,
							nonEditableAliases: ['NewOness@example.com.test-google-a.com'],
						},
						{
							kind: 'admin#directory#group',
							id: '01tuee742txc3k4',
							etag: '"example"',
							email: 'newonesss@example.com',
							name: 'NewOne3',
							directMembersCount: '0',
							description: 'test',
							adminCreated: true,
							nonEditableAliases: ['NewOnesss@example.com.test-google-a.com'],
						},
					],
				});

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
