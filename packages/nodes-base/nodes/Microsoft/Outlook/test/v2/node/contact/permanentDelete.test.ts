import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, contact => permanentDelete', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/contacts/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEOAABZf4De-LkrSqpPI8eyjUmAAAFXBCQuAAA=/permanentDelete',
		)
		.reply(204);

	new NodeTestHarness().setupTests({
		workflowFiles: ['permanentDelete.workflow.json'],
	});
});
