import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Test PipedriveV2, lead => search with an invalid organization ID', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['searchInvalidId.workflow.json'],
	});
});
