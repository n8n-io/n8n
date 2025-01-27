import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../../v2/transport';

const microsoftApiRequestAllItemsSpy = jest.spyOn(transport, 'microsoftApiRequestAllItems');

microsoftApiRequestAllItemsSpy.mockImplementation(async (_, method: string) => {
	if (method === 'GET') {
		return [
			{
				'@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAZCc="',
				planId: 'coJdCqzqNUKULQtTRWDa6pgACTln',
				bucketId: null,
				title: 'tada',
				orderHint: '8585516884147534440',
				assigneePriority: '8585516882706975451',
				percentComplete: 10,
				startDateTime: null,
				createdDateTime: '2022-04-14T06:41:10.7241367Z',
				dueDateTime: '2022-04-24T21:00:00Z',
				hasDescription: false,
				previewType: 'automatic',
				completedDateTime: null,
				completedBy: null,
				referenceCount: 0,
				checklistItemCount: 0,
				activeChecklistItemCount: 0,
				conversationThreadId: null,
				priority: 5,
				id: '1KgwUqOmbU2C9mZWiqxiv5gAPp8Q',
				createdBy: {
					user: {
						displayName: null,
						id: '11111-2222-3333',
					},
				},
				appliedCategories: {},
				assignments: {
					'11111-2222-3333': {
						'@odata.type': '#microsoft.graph.plannerAssignment',
						assignedDateTime: '2022-04-14T06:43:34.7800356Z',
						orderHint: '8585516882406130277PO',
						assignedBy: {
							user: {
								displayName: null,
								id: '11111-2222-3333',
							},
						},
					},
				},
			},
			{
				'@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="',
				planId: 'coJdCqzqNUKULQtTRWDa6pgACTln',
				bucketId: '2avE1BwPmEKp7Lxh0E-EmZgALF72',
				title: '1',
				orderHint: '8585516897613076919P1',
				assigneePriority: '8585516890164965803',
				percentComplete: 0,
				startDateTime: null,
				createdDateTime: '2022-04-14T06:19:44.2011467Z',
				dueDateTime: null,
				hasDescription: false,
				previewType: 'automatic',
				completedDateTime: null,
				completedBy: null,
				referenceCount: 0,
				checklistItemCount: 0,
				activeChecklistItemCount: 0,
				conversationThreadId: null,
				priority: 5,
				id: 'J3MLUgtmJ06YJgenyujiYpgANMF1',
				createdBy: {
					user: {
						displayName: null,
						id: '11111-2222-3333',
					},
				},
				appliedCategories: {},
				assignments: {
					'11111-2222-3333': {
						'@odata.type': '#microsoft.graph.plannerAssignment',
						assignedDateTime: '2022-04-14T06:31:08.9810004Z',
						orderHint: '8585516890765590890Pw',
						assignedBy: {
							user: {
								displayName: null,
								id: '11111-2222-3333',
							},
						},
					},
				},
			},
			{
				'@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAVCc="',
				planId: 'THwgIivuyU26ki8qS7ufcJgAB6zf',
				bucketId: 'CO-ZsX1s4kO7FtO6ZHZdDpgAFL1m',
				title: 'td 54',
				orderHint: '8585034751365009589',
				assigneePriority: '8585034751365009589',
				percentComplete: 0,
				startDateTime: null,
				createdDateTime: '2023-10-24T07:15:48.9766218Z',
				dueDateTime: null,
				hasDescription: true,
				previewType: 'automatic',
				completedDateTime: null,
				completedBy: null,
				referenceCount: 0,
				checklistItemCount: 0,
				activeChecklistItemCount: 0,
				conversationThreadId: null,
				priority: 5,
				id: 'silreUDQskqFYfrO4EObD5gAKt_G',
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
					'11111-2222-3333': {
						'@odata.type': '#microsoft.graph.plannerAssignment',
						assignedDateTime: '2023-10-24T07:15:48.9766218Z',
						orderHint: '8585034751965947109Pc',
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
			},
		];
	}
});

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

microsoftApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'GET') {
		return {
			id: '123456789',
		};
	}
});

describe('Test MicrosoftTeamsV2, task => getAll', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/task/getAll.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(microsoftApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(microsoftApiRequestSpy).toHaveBeenCalledWith('GET', '/v1.0/me');

		expect(microsoftApiRequestAllItemsSpy).toHaveBeenCalledTimes(1);
		expect(microsoftApiRequestAllItemsSpy).toHaveBeenCalledWith(
			'value',
			'GET',
			'/v1.0/users/123456789/planner/tasks',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
