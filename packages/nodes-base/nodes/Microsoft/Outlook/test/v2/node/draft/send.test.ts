import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, draft => send', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/messages/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBDupAAA=/send',
		)
		.reply(200)
		.patch(
			'/messages/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBDupAAA=',
			{ toRecipients: [{ emailAddress: { address: 'michael.k@radency.com' } }] },
		)
		.reply(200);

	new NodeTestHarness().setupTests({
		workflowFiles: ['send.workflow.json'],
	});
});
