import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Update User', () => {
	beforeEach(() => {
		nock.disableNetConnect();

		nock('https://www.googleapis.com/admin')
			.put('/directory/v1/users/101071249467630629404', {
				name: {
					givenName: 'test',
					familyName: 'new',
				},
				primaryEmail: 'one@example.com',
				phones: [
					{
						type: 'assistant',
						value: '123',
						primary: true,
					},
				],
				emails: [
					{
						address: 'newone@example.com',
						type: 'home',
					},
				],
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
				emails: [
					{
						address: 'newone@example.com',
						type: 'home',
					},
				],
				phones: [
					{
						value: '123',
						primary: true,
						type: 'assistant',
					},
				],
				aliases: ['new22@example.com'],
				nonEditableAliases: ['new22@example.com.test-google-a.com'],
				customerId: 'C0442hnz1',
				orgUnitPath: '/',
				isMailboxSetup: false,
				includeInGlobalAddressList: true,
				thumbnailPhotoUrl: '//example',
				thumbnailPhotoEtag: '"example"',
				recoveryEmail: '',
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
	});
});
