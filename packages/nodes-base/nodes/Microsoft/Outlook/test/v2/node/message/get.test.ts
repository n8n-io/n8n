import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, message => get', () => {
	const credentials = {
		microsoftOutlookOAuth2Api: {
			accessToken: 'test-access-token',
			refreshToken: 'test-refresh-token',
		},
	};

	beforeAll(() => {
		const messageId =
			'AAMkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgBGAAAAAAA_iGOFSpJvRJ8V0rRW_J9FBwBZf4De_LkrSqpPI8eyjUmAAAACEDdwAABZf4De_LkrSqpPI8eyjUmAAAFSpKecAAA=';

		nock('https://graph.microsoft.com')
			.get(`/v1.0/me/messages/${messageId}`)
			.query({
				$select:
					'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
			})
			.reply(200, {
				'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/messages/$entity',
				'@odata.etag': 'W/"CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFSpKec"',
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
					{
						emailAddress: {
							name: 'Bob Wilson',
							address: 'bob.wilson@example.com',
						},
					},
				],
				categories: ['Blue category', 'Important'],
				hasAttachments: true,
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['get.workflow.json'],
	});
});
