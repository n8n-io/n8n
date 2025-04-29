import { getWorkflowFilenames, testWorkflows } from '@test/nodes/Helpers';

describe('Test Read PDF Node', () => {
	const workflows = getWorkflowFilenames(__dirname);

	testWorkflows(workflows);
});
