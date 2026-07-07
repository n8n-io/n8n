import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Update User (unsuspend)', () => {
	beforeEach(() => {
		nock.disableNetConnect();

		// Strict body match: the request must contain `suspended: false`,
		// otherwise toggling Suspend off is a no-op and the user stays suspended
		nock('https://www.googleapis.com/admin')
			.put('/directory/v1/users/101071249467630629404', {
				suspended: false,
			})
			.reply(200, {
				kind: 'admin#directory#user',
				id: '101071249467630629404',
				etag: '"example"',
				primaryEmail: 'one@example.com',
				name: {
					givenName: 'test',
					familyName: 'new',
				},
				isAdmin: false,
				isDelegatedAdmin: false,
				lastLoginTime: '1970-01-01T00:00:00.000Z',
				creationTime: '2025-03-26T21:28:53.000Z',
				agreedToTerms: false,
				suspended: false,
				archived: false,
				changePasswordAtNextLogin: false,
				ipWhitelisted: false,
				customerId: 'C0442hnz1',
				orgUnitPath: '/',
				isMailboxSetup: false,
				includeInGlobalAddressList: true,
				recoveryEmail: '',
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['updateUnsuspend.workflow.json'],
	});
});
