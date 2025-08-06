import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, task => get', () => {
	nock('https://graph.microsoft.com')
		.get('/v1.0/planner/tasks/lDrRJ7N_-06p_26iKBtJ6ZgAKffD')
		.reply(200, {
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
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['get.workflow.json'],
	});
});
