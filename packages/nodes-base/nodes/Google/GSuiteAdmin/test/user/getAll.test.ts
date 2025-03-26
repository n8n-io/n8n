import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should get all users', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'get',
						path: '/directory/v1/users',
						statusCode: 200,
						responseBody: {
							kind: 'admin#directory#users',
							users: [
								{
									kind: 'admin#directory#user',
									id: '112507770188715252055',
									primaryEmail: 'new@example.com',
									name: {
										givenName: 'New',
										familyName: 'User',
										fullName: 'New User',
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
								{
									kind: 'admin#directory#user',
									id: '222459372679230452528',
									primaryEmail: 'test33@example.com',
									name: {
										givenName: 'New',
										familyName: 'Test',
										fullName: 'New Test',
									},
									isAdmin: true,
									lastLoginTime: '2024-12-19T08:39:56.000Z',
									creationTime: '2024-09-06T11:48:38.000Z',
									suspended: false,
									emails: [
										{
											address: 'test33@example.com',
											primary: true,
										},
									],
								},
							],
						},
					},
				],
			};

			nock('https://www.googleapis.com/admin')
				.get('/directory/v1/users')
				.query({
					projection: 'basic',
					customer: 'my_customer',
					maxResults: '100',
				})
				.reply(200, {
					kind: 'admin#directory#users',
					users: [
						{
							kind: 'admin#directory#user',
							id: '112507770188715252055',
							primaryEmail: 'new@example.com',
							name: {
								givenName: 'New',
								familyName: 'User',
								fullName: 'New User',
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
						{
							kind: 'admin#directory#user',
							id: '222459372679230452528',
							primaryEmail: 'test33@example.com',
							name: {
								givenName: 'New',
								familyName: 'Test',
								fullName: 'New Test',
							},
							isAdmin: true,
							lastLoginTime: '2024-12-19T08:39:56.000Z',
							creationTime: '2024-09-06T11:48:38.000Z',
							suspended: false,
							emails: [
								{
									address: 'test33@example.com',
									primary: true,
								},
							],
						},
					],
				});

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
