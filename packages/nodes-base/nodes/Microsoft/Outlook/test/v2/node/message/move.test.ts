import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, message => move', () => {
	const messageId =
		'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEJAABZf4De-LkrSqpPI8eyjUmAAAFXBEVwAAA=';

	nock('https://graph.microsoft.com/v1.0/me')
		.matchHeader('Prefer', 'IdType="ImmutableId"')
		.post(`/messages/${messageId}/move`, {
			destinationId:
				'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAFXBAEHAAA=',
		})
		.reply(201, { id: messageId });

	new NodeTestHarness().setupTests({
		workflowFiles: ['move.workflow.json'],
	});
});
