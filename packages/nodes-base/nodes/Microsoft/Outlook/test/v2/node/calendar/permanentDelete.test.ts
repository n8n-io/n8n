import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, calendar => permanentDelete', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/calendars/AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAFXBBZ_AAA=/permanentDelete',
		)
		.reply(204);

	new NodeTestHarness().setupTests({
		workflowFiles: ['permanentDelete.workflow.json'],
	});
});
