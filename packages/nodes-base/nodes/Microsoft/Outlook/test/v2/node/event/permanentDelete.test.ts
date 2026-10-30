import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, event => permanentDelete', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/calendar/events/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAENAABZf4De-LkrSqpPI8eyjUmAAAFXBFUSAAA=/permanentDelete',
		)
		.reply(204);

	new NodeTestHarness().setupTests({
		workflowFiles: ['permanentDelete.workflow.json'],
	});
});
