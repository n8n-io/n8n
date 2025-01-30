import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../../v2/transport';

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

microsoftApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'GET') {
		return {
			'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#planner/tasks/$entity',
			'@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBARCc="',
			planId: 'THwgIivuyU26ki8qS7ufcJgAB6zf',
			bucketId: 'CO-ZsX1s4kO7FtO6ZHZdDpgAFL1m',
			title: 'do this',
			orderHint: '8585032308935758184',
			assigneePriority: '',
			percentComplete: 25,
			startDateTime: null,
			createdDateTime: '2023-10-27T03:06:31.9017623Z',
			dueDateTime: '2023-10-30T22:00:00Z',
			hasDescription: false,
			previewType: 'automatic',
			completedDateTime: null,
			completedBy: null,
			referenceCount: 0,
			checklistItemCount: 0,
			activeChecklistItemCount: 0,
			conversationThreadId: null,
			priority: 5,
			id: 'lDrRJ7N_-06p_26iKBtJ6ZgAKffD',
			createdBy: {
				user: {
					displayName: null,
					id: '11111-2222-3333',
				},
				application: {
					displayName: null,
					id: '11111-2222-3333-44444',
				},
			},
			appliedCategories: {},
			assignments: {
				'ba4a422e-bdce-4795-b4b6-579287363f0e': {
					'@odata.type': '#microsoft.graph.plannerAssignment',
					assignedDateTime: '2023-10-27T03:06:31.9017623Z',
					orderHint: '8585032309536070726PE',
					assignedBy: {
						user: {
							displayName: null,
							id: '11111-2222-3333',
						},
						application: {
							displayName: null,
							id: '11111-2222-3333-44444',
						},
					},
				},
			},
		};
	}
});

describe('Test MicrosoftTeamsV2, task => get', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/task/get.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(microsoftApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/v1.0/planner/tasks/lDrRJ7N_-06p_26iKBtJ6ZgAKffD',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
