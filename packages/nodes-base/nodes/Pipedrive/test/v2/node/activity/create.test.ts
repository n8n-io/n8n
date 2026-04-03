import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, activity => create', () => {
	mockFieldsApi('activity');

	nock('https://api.pipedrive.com/api/v2')
		.post('/activities', {
			subject: 'Call client',
			done: false,
			type: 'call',
			deal_id: 8,
			person_id: 10,
			org_id: 7,
		})
		.reply(200, {
			success: true,
			data: {
				id: 10,
				subject: 'Call client',
				type: 'call',
				owner_id: 25455458,
				creator_user_id: 25455458,
				is_deleted: false,
				add_time: '2026-04-01T22:03:27Z',
				update_time: '2026-04-01T22:03:27Z',
				deal_id: 8,
				lead_id: null,
				person_id: 10,
				org_id: 7,
				project_id: null,
				due_date: '2026-04-01',
				due_time: null,
				duration: null,
				done: false,
				busy: false,
				marked_as_done_time: null,
				location: null,
				participants: [
					{
						person_id: 10,
						primary: true,
					},
				],
				conference_meeting_client: null,
				conference_meeting_url: null,
				conference_meeting_id: null,
				public_description: null,
				priority: null,
				note: null,
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.workflow.json'],
	});
});
