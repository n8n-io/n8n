import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, deal => create', () => {
	mockFieldsApi('deal');

	nock('https://api.pipedrive.com/api/v2')
		.post('/deals', {
			title: 'Test Deal',
			org_id: 7,
			person_id: 10,
			value: 5000,
			currency: 'USD',
			status: 'open',
		})
		.reply(200, {
			success: true,
			data: {
				id: 8,
				title: 'Test Deal',
				creator_user_id: 25455458,
				value: 5000.0,
				person_id: 10,
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
				expected_close_date: null,
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
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.workflow.json'],
	});
});
