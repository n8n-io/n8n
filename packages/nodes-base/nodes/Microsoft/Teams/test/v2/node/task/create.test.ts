import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../../v2/transport';

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

microsoftApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'POST') {
		return {
			'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#planner/tasks/$entity',
			'@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBARCc="',
			planId: 'THwgIivuyU26ki8qS7ufcJgAB6zf',
			bucketId: 'CO-ZsX1s4kO7FtO6ZHZdDpgAFL1m',
			title: 'do this',
			orderHint: '8584964728139267910',
			assigneePriority: '',
			percentComplete: 25,
			startDateTime: null,
			createdDateTime: '2024-01-13T08:21:11.5507897Z',
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
			id: 'mYxTKaD9VkqWaBCJE5v4E5gAHcPB',
			createdBy: {
				user: {
					displayName: null,
					id: 'b834447b-6848-4af9-8390-d2259ce46b74',
				},
				application: {
					displayName: null,
					id: '66bdd989-4a29-465d-86fb-d94ed8fd86ed',
				},
			},
			appliedCategories: {},
			assignments: {
				'ba4a422e-bdce-4795-b4b6-579287363f0e': {
					'@odata.type': '#microsoft.graph.plannerAssignment',
					assignedDateTime: '2024-01-13T08:21:11.5507897Z',
					orderHint: '8584964728740986700PZ',
					assignedBy: {
						user: {
							displayName: null,
							id: 'b834447b-6848-4af9-8390-d2259ce46b74',
						},
						application: {
							displayName: null,
							id: '66bdd989-4a29-465d-86fb-d94ed8fd86ed',
						},
					},
				},
			},
		};
	}
});

describe('Test MicrosoftTeamsV2, task => create', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/task/create.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(microsoftApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(microsoftApiRequestSpy).toHaveBeenCalledWith('POST', '/v1.0/planner/tasks', {
			assignments: {
				'ba4a422e-bdce-4795-b4b6-579287363f0e': {
					'@odata.type': 'microsoft.graph.plannerAssignment',
					orderHint: ' !',
				},
			},
			bucketId: 'CO-ZsX1s4kO7FtO6ZHZdDpgAFL1m',
			dueDateTime: '2023-10-30T22:00:00.000Z',
			percentComplete: 25,
			planId: 'THwgIivuyU26ki8qS7ufcJgAB6zf',
			title: 'do this',
		});

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
