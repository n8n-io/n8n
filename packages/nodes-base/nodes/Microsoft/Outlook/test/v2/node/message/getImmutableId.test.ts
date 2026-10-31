import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, message => get with immutable IDs', () => {
	const credentials = {
		microsoftOutlookOAuth2Api: {
			accessToken: 'test-access-token',
			refreshToken: 'test-refresh-token',
		},
	};

	beforeAll(() => {
		const messageId = 'AAkALgAAAAAAHYQDEapmEc2byACqAC-EWg0AZf4De_LkrSqpPI8eyjUmAAAFSpKecAAA=';

		nock('https://graph.microsoft.com')
			.matchHeader('Prefer', 'IdType="ImmutableId"')
			.get(`/v1.0/me/messages/${messageId}`)
			.query({
				$select:
					'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
			})
			.reply(200, {
				'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/messages/$entity',
				id: messageId,
				conversationId:
					'AAQkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgAQALc9G-OGBp9Hshu8JZGiSFs=',
				subject: 'Test Email Subject',
				bodyPreview: 'This is a test email body preview for the get operation',
				from: {
					emailAddress: {
						name: 'John Doe',
						address: 'john.doe@example.com',
					},
				},
				toRecipients: [
					{
						emailAddress: {
							name: 'Jane Smith',
							address: 'jane.smith@example.com',
						},
					},
				],
				categories: [],
				hasAttachments: false,
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getImmutableId.workflow.json'],
	});
});
