import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, activity => getAll', () => {
	mockFieldsApi('activity');

	nock('https://api.pipedrive.com/api/v2')
		.get('/activities')
		.query({ limit: 2 })
		.reply(200, {
			success: true,
			data: [
				{
					id: 1,
					subject: '[Sample] Final attempt',
					type: 'call',
					owner_id: 25455458,
					creator_user_id: 25455458,
					is_deleted: false,
					add_time: '2026-04-01T19:00:38Z',
					update_time: '2026-04-01T19:00:38Z',
					deal_id: null,
					lead_id: null,
					person_id: 1,
					org_id: null,
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
							person_id: 1,
							primary: true,
						},
					],
					conference_meeting_client: null,
					conference_meeting_url: null,
					conference_meeting_id: null,
					public_description: '[sampledata]',
					priority: null,
					note: null,
				},
				{
					id: 2,
					subject: '[Sample] Context call',
					type: 'call',
					owner_id: 25455458,
					creator_user_id: 25455458,
					is_deleted: false,
					add_time: '2026-04-01T19:00:38Z',
					update_time: '2026-04-01T19:00:38Z',
					deal_id: 2,
					lead_id: null,
					person_id: 7,
					org_id: 3,
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
							person_id: 7,
							primary: true,
						},
					],
					conference_meeting_client: null,
					conference_meeting_url: null,
					conference_meeting_id: null,
					public_description: '[sampledata]',
					priority: null,
					note: null,
				},
			],
			additional_data: {
				next_cursor:
					'eyJmaWVsZCI6ImlkIiwiZmllbGRWYWx1ZSI6Mywic29ydERpcmVjdGlvbiI6ImFzYyIsImlkIjozfQ',
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
