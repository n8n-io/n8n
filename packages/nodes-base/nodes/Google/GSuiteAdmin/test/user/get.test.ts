import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should get user', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'get',
						path: '/directory/v1/users/112507770188715252026',
						statusCode: 200,
						requestBody: {},
						responseBody: {
							kind: 'admin#directory#user',
							id: '112507770188715252026',
							primaryEmail: 'new@example.com',
							name: {
								givenName: 'New One',
								familyName: 'User',
								fullName: 'New One User',
							},
							isAdmin: false,
							lastLoginTime: '1970-01-01T00:00:00.000Z',
							creationTime: '2024-12-20T20:48:53.000Z',
							suspended: true,
							emails: [
								{
									address: 'new@example.com',
									primary: true,
								},
							],
						},
					},
				],
			};

			nock('https://www.googleapis.com/admin')
				.get('/directory/v1/users/112507770188715252026')
				.query({
					projection: 'basic',
				})
				.reply(200, {
					kind: 'admin#directory#user',
					id: '112507770188715252026',
					primaryEmail: 'new@example.com',
					name: {
						givenName: 'New One',
						familyName: 'User',
						fullName: 'New One User',
					},
					isAdmin: false,
					lastLoginTime: '1970-01-01T00:00:00.000Z',
					creationTime: '2024-12-20T20:48:53.000Z',
					suspended: true,
					emails: [
						{
							address: 'new@example.com',
							primary: true,
						},
					],
				});

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
