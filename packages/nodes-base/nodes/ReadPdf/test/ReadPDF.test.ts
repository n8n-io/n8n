import { getWorkflowFilenames, initBinaryDataService, testWorkflows } from '@test/nodes/Helpers';

describe('Test Read PDF Node', () => {
	const workflows = getWorkflowFilenames(__dirname);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	testWorkflows(workflows);
});
