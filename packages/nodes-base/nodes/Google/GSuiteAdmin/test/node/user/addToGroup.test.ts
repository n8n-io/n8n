import { type INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, endpoint: string) => {
	if (method === 'GET' && endpoint.includes('/directory/v1/users/')) {
		return {
			primaryEmail: 'newoneuser@example.com',
		};
	}

	if (method === 'POST' && endpoint.includes('/directory/v1/groups/')) {
		return { added: true };
	}

	return {};
});

describe('Google Workspace Admin - Add User to Group', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/node/user/addToGroup.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					added: true,
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(2);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/directory/v1/users/114393134535981252528',
		);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'POST',
			'/directory/v1/groups/01302m922pmp3e4/members',
			expect.objectContaining({
				email: 'newoneuser@example.com',
				role: 'MEMBER',
			}),
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
