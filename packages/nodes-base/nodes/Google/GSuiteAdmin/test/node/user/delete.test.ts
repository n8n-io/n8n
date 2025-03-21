import { type INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (method === 'DELETE' && resource === '/directory/v1/users/101817116922964852528') {
		return {};
	}
});

describe('Google Workspace Admin - Delete User', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/node/user/delete.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([[{ json: { deleted: true } }]]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'DELETE',
			'/directory/v1/users/101817116922964852528',
			{},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
