import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, message => createForward', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/messages/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEJAABZf4De-LkrSqpPI8eyjUmAAAFXBEVwAAA=/createForward',
			{
				toRecipients: [{ emailAddress: { address: 'to@mail.com' } }],
				comment: 'Test Comment',
			},
		)
		.reply(200);

	new NodeTestHarness().setupTests({
		workflowFiles: ['createForward.workflow.json'],
	});
});
