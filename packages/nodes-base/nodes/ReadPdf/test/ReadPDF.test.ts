import { getWorkflowFilenames, initBinaryDataManager, testWorkflows } from '@test/nodes/Helpers';

describe('Test Read PDF Node', () => {
	const workflows = getWorkflowFilenames(__dirname);

	beforeAll(async () => {
		await initBinaryDataManager();
	});

	testWorkflows(workflows);
});
