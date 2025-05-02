import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Create User', () => {
	beforeEach(() => {
		nock.disableNetConnect();

		nock('https://www.googleapis.com/admin')
			.post('/directory/v1/users')
			.reply(200, {
				kind: 'admin#directory#user',
				id: '112507770188715525288',
				etag: '"example"',
				primaryEmail: 'new@example.com',
				name: {
					givenName: 'NewOne',
					familyName: 'User',
				},
				emails: [
					{
						address: 'test@mail.com',
						type: 'work',
					},
				],
				phones: [
					{
						primary: false,
						type: 'work',
						value: '+1-202-555-0123',
					},
				],
				isAdmin: false,
				isDelegatedAdmin: false,
				creationTime: '2024-12-20T20:48:53.000Z',
				customerId: 'C4444hnz2',
				orgUnitPath: '/',
				isMailboxSetup: false,
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
