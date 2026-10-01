import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, note => update', () => {
	nock('https://api.pipedrive.com/v1')
		.put('/notes/8', {
			content: 'Updated test note',
		})
		.reply(200, {
			success: true,
			data: {
				id: 8,
				user_id: 25455458,
				deal_id: 8,
				person_id: 10,
				org_id: 7,
				lead_id: null,
				project_id: null,
				task_id: null,
				content: 'Updated test note',
				add_time: '2026-04-01 22:03:28',
				update_time: '2026-04-01 22:03:33',
				active_flag: true,
				pinned_to_deal_flag: false,
				pinned_to_person_flag: false,
				pinned_to_organization_flag: false,
				pinned_to_lead_flag: false,
				pinned_to_project_flag: false,
				pinned_to_task_flag: false,
				last_update_user_id: 25455458,
				organization: {
					name: 'Updated Org LLC',
				},
				person: {
					name: 'John Updated',
				},
				deal: {
					title: 'Test Deal',
				},
				lead: null,
				user: {
					email: 'kristiyan.nikolov@n8n.io',
					name: 'Kris',
					icon_url: null,
					is_you: true,
				},
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['update.workflow.json'],
	});
});
