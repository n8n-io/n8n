import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV1, lead => update with custom fields', () => {
	// V1 sends both the custom field (keyed by field key) and the other update
	// fields (e.g. owner_id) in a single PATCH body via addAdditionalFields.
	nock('https://api.pipedrive.com/v1')
		.patch('/leads/aaa11111-bb22-cc33-dd44-ee5555555555', {
			owner_id: 25455458,
			'48f483ac81a7b619c59322931ea839310e987725': 'option_c',
		})
		.reply(200, {
			success: true,
			data: {
				id: 'aaa11111-bb22-cc33-dd44-ee5555555555',
				title: 'Existing Lead',
				owner_id: 25455458,
				creator_id: 25455458,
				label_ids: [],
				value: null,
				expected_close_date: null,
				person_id: null,
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
				cc_email: 'test+lead@pipedrivemail.com',
				'48f483ac81a7b619c59322931ea839310e987725': 'option_c',
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['updateWithCustomFields.workflow.json'],
	});
});
