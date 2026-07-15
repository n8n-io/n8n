import { NodeTestHarness } from '@nodes-testing/node-test-harness';

// A pasted workflow using the hidden node must load and execute (as a pass-through)
describe('Microsoft Excel (SharePoint) Node', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: ['noop.workflow.json'],
	});
});
