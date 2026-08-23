import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, note => create', () => {
	nock('https://api.pipedrive.com/v1')
		.post('/notes', {
			content: 'This is a test note',
			deal_id: 8,
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
				content: 'This is a test note',
				add_time: '2026-04-01 22:03:28',
				update_time: '2026-04-01 22:03:28',
				active_flag: true,
				pinned_to_deal_flag: false,
				pinned_to_person_flag: false,
				pinned_to_organization_flag: false,
				pinned_to_lead_flag: false,
				pinned_to_project_flag: false,
				pinned_to_task_flag: false,
				last_update_user_id: null,
				organization: {
					name: 'Test Org LLC',
				},
				person: {
					name: 'John Test',
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
		workflowFiles: ['create.workflow.json'],
	});
});
