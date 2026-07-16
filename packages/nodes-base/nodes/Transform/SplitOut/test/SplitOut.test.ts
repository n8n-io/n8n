import { NodeTestHarness } from '@nodes-testing/node-test-harness';

describe('Test Split Out Node', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: [
			'workflow.splitOut.json',
			'workflow.splitOutObject.json',
			'workflow.destinationFieldDotNotation.json',
		],
	});
});
