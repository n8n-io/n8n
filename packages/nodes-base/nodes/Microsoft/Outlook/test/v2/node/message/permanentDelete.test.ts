import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, message => permanentDelete', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/messages/AAMkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgBGAAAAAAA_iGOFSpJvRJ8V0rRW_J9FBwBZf4De_LkrSqpPI8eyjUmAAAACEDdwAABZf4De_LkrSqpPI8eyjUmAAAFSpKecAAA=/permanentDelete',
		)
		.reply(204);

	new NodeTestHarness().setupTests({
		workflowFiles: ['permanentDelete.workflow.json'],
	});
});
