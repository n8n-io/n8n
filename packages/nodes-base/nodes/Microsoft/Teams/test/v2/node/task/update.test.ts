import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../../v2/transport';

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

microsoftApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'PATCH') {
		return {};
	}
	if (method === 'GET') {
		return {
			'@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBARCc="',
		};
	}
});

describe('Test MicrosoftTeamsV2, task => update', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/task/update.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(microsoftApiRequestSpy).toHaveBeenCalledTimes(2);
		expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/v1.0/planner/tasks/lDrRJ7N_-06p_26iKBtJ6ZgAKffD',
		);
		expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
			'PATCH',
			'/v1.0/planner/tasks/lDrRJ7N_-06p_26iKBtJ6ZgAKffD',
			{ dueDateTime: '2023-10-24T21:00:00.000Z', percentComplete: 78, title: 'do that' },
			{},
			undefined,
			{ 'If-Match': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBARCc="' },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
