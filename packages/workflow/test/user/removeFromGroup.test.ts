import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import type { INodeTypes } from 'n8n-workflow';

import * as transport from '../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (
		method === 'DELETE' &&
		resource === '/directory/v1/groups/01302m922pmp3e4/members/114393134535981252528'
	) {
		return {};
	}
});

describe('Google Workspace Admin - Remove User From Group', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/removeFromGroup.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = { json: { removed: true } };

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([[expectedOutput]]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'DELETE',
			'/directory/v1/groups/01302m922pmp3e4/members/114393134535981252528',
		);
		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
