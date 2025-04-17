import { getWorkflowFilenames, testWorkflows } from '@test/nodes/Helpers';

describe('ExtractFromFile', () => {
	const workflows = getWorkflowFilenames(__dirname);
	testWorkflows(workflows);
});
