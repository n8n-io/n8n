import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, message => getAll', () => {
	const credentials = {
		microsoftOutlookOAuth2Api: {
			accessToken: 'test-access-token',
			refreshToken: 'test-refresh-token',
		},
	};

	beforeAll(() => {
		nock('https://graph.microsoft.com')
			.get('/v1.0/me/messages')
			.query({
				$select:
					'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
				$top: 50,
			})
			.reply(200, {
				'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/messages',
				value: [
					{
						'@odata.etag': 'W/"CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFSpKec"',
						id: 'AAMkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgBGAAAAAAA_iGOFSpJvRJ8V0rRW_J9FBwBZf4De_LkrSqpPI8eyjUmAAAACEDdwAABZf4De_LkrSqpPI8eyjUmAAAFSpKecAAA=',
						conversationId:
							'AAQkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgAQALc9G-OGBp9Hshu8JZGiSFs=',
						subject: 'Test Email 1',
						bodyPreview: 'This is the first test email body preview',
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
						categories: ['Blue category'],
						hasAttachments: false,
					},
					{
						'@odata.etag': 'W/"CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFSpKed"',
						id: 'AAMkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgBGAAAAAAA_iGOFSpJvRJ8V0rRW_J9FBwBZf4De_LkrSqpPI8eyjUmAAAACEDdwAABZf4De_LkrSqpPI8eyjUmAAAFSpKedAAA=',
						conversationId:
							'AAQkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgAQALc9G-OGBp9Hshu8JZGiSFt=',
						subject: 'Test Email 2',
						bodyPreview: 'This is the second test email body preview',
						from: {
							emailAddress: {
								name: 'Alice Johnson',
								address: 'alice.johnson@example.com',
							},
						},
						toRecipients: [
							{
								emailAddress: {
									name: 'Bob Wilson',
									address: 'bob.wilson@example.com',
								},
							},
						],
						categories: ['Red category'],
						hasAttachments: true,
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
