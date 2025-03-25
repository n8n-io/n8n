import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (method === 'POST' && resource === '/directory/v1/groups') {
		return {
			kind: 'admin#directory#group',
			id: '01tuee742txc3k4',
			etag: '"Cff-ppPVZc7PJf2fWsHJTl4444MdGbO8iFIk3L4uBwQ/ifaP-fffffb1DYLTXXgQ5XB_77777"',
			email: 'New@example.com',
			name: 'NewOne3',
			description: 'test',
			adminCreated: true,
		};
	}
});

describe('Google Workspace Admin - Create Group', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/group/create.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#group',
					id: '01tuee742txc3k4',
					etag: '"Cff-ppPVZc7PJf2fWsHJTl4444MdGbO8iFIk3L4uBwQ/ifaP-fffffb1DYLTXXgQ5XB_77777"',
					email: 'New@example.com',
					name: 'NewOne3',
					description: 'test',
					adminCreated: true,
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'POST',
			'/directory/v1/groups',
			expect.objectContaining({
				email: 'New@example.com',
				description: 'test',
			}),
		);
		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
