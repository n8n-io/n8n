import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, deal => getAll', () => {
	mockFieldsApi('deal');

	nock('https://api.pipedrive.com/api/v2')
		.get('/deals')
		.query({ limit: 2 })
		.reply(200, {
			success: true,
			data: [
				{
					id: 1,
					title: '[Sample] iTable',
					creator_user_id: 25455458,
					value: 7000.0,
					person_id: 6,
					org_id: 4,
					stage_id: 7,
					currency: 'BGN',
					add_time: '2026-04-01T19:00:38Z',
					update_time: '2026-04-01T19:00:39Z',
					status: 'open',
					probability: null,
					lost_reason: null,
					visible_to: 3,
					close_time: null,
					pipeline_id: 2,
					won_time: null,
					lost_time: null,
					stage_change_time: null,
					local_won_date: null,
					local_lost_date: null,
					local_close_date: null,
					expected_close_date: '2026-04-13',
					custom_fields: {
						f5ed368466cf0477371c6ee076252f49a188848e: null,
						'48233ee3e9d505bbcca8e7e05d9b8df4231021bc': null,
						febf5dbb0f1e95d60876abc4638483291b8ef18b: null,
					},
					owner_id: 25455458,
					label_ids: [],
					is_deleted: false,
					origin: 'API',
					origin_id: null,
					channel: null,
					channel_id: null,
					acv: null,
					arr: null,
					mrr: null,
					is_archived: false,
					archive_time: null,
				},
				{
					id: 2,
					title: '[Sample] Tony Turner',
					creator_user_id: 25455458,
					value: 30000.0,
					person_id: 7,
					org_id: 3,
					stage_id: 6,
					currency: 'BGN',
					add_time: '2026-04-01T19:00:38Z',
					update_time: '2026-04-01T19:00:39Z',
					status: 'open',
					probability: null,
					lost_reason: null,
					visible_to: 3,
					close_time: null,
					pipeline_id: 2,
					won_time: null,
					lost_time: null,
					stage_change_time: null,
					local_won_date: null,
					local_lost_date: null,
					local_close_date: null,
					expected_close_date: '2026-04-04',
					custom_fields: {
						f5ed368466cf0477371c6ee076252f49a188848e: null,
						'48233ee3e9d505bbcca8e7e05d9b8df4231021bc': null,
						febf5dbb0f1e95d60876abc4638483291b8ef18b: null,
					},
					owner_id: 25455458,
					label_ids: [],
					is_deleted: false,
					origin: 'API',
					origin_id: null,
					channel: null,
					channel_id: null,
					acv: null,
					arr: null,
					mrr: null,
					is_archived: false,
					archive_time: null,
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
