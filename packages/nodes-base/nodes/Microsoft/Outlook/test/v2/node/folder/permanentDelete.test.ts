import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, folder => permanentDelete', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/mailFolders/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAFXBAEHAAA=/permanentDelete',
		)
		.reply(204);

	new NodeTestHarness().setupTests({
		workflowFiles: ['permanentDelete.workflow.json'],
	});
});
