import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, contact => delete', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.delete(
			'/contacts/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEOAABZf4De-LkrSqpPI8eyjUmAAAFXBCQuAAA=',
		)
		.reply(204);

	new NodeTestHarness().setupTests({
		workflowFiles: ['delete.workflow.json'],
	});
});
