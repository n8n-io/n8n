import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, lead => update', () => {
	nock('https://api.pipedrive.com/v1')
		.put('/leads/9ce77a10-2e16-11f1-91c1-d76c55e1594b', {
			title: 'Updated Lead',
		})
		.reply(200, {
			success: true,
			data: {
				id: '9ce77a10-2e16-11f1-91c1-d76c55e1594b',
				title: 'Updated Lead',
				owner_id: 25455458,
				creator_id: 25455458,
				label_ids: [],
				value: null,
				expected_close_date: null,
				person_id: 10,
				organization_id: 7,
				is_archived: false,
				archive_time: null,
				source_name: 'API',
				source_deal_id: null,
				origin: 'API',
				origin_id: null,
				channel: null,
				channel_id: null,
				was_seen: false,
				next_activity_id: null,
				add_time: '2026-04-01T22:03:28.177Z',
				update_time: '2026-04-01T22:03:32.984Z',
				visible_to: '3',
				cc_email: 'added-cauliflower+14712380+lead9aeonoweeh1wbg0z8godmoua3@pipedrivemail.com',
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['update.workflow.json'],
	});
});
