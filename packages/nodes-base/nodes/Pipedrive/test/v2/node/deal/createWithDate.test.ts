import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, deal => create (date-only normalisation)', () => {
	mockFieldsApi('deal');

	nock('https://api.pipedrive.com/api/v2')
		.post('/deals', {
			title: 'Test Deal',
			org_id: 7,
			expected_close_date: '2026-04-13',
		})
		.reply(200, {
			success: true,
			data: {
				id: 9,
				title: 'Test Deal',
				creator_user_id: 25455458,
				value: null,
				person_id: null,
				org_id: 7,
				stage_id: 6,
				currency: 'USD',
				add_time: '2026-04-01T22:03:27Z',
				update_time: null,
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
					test_string: null,
					test_enum: null,
					test_multi: null,
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
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['createWithDate.workflow.json'],
	});
});
