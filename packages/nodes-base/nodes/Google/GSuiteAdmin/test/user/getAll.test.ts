import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Get All Users', () => {
	beforeEach(() => {
		nock.disableNetConnect();

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
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
