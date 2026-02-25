import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Get User', () => {
	beforeEach(() => {
		nock.disableNetConnect();

		nock('https://www.googleapis.com/admin')
			.get('/directory/v1/users/112507770188715252026')
			.query({ projection: 'basic' })
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
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['get.workflow.json'],
	});
});
