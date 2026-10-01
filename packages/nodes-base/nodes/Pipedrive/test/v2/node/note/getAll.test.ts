import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, note => getAll', () => {
	nock('https://api.pipedrive.com/v1')
		.get('/notes')
		.query({ limit: 2 })
		.reply(200, {
			success: true,
			data: [
				{
					id: 1,
					user_id: 25455458,
					deal_id: 1,
					person_id: 6,
					org_id: 4,
					lead_id: null,
					project_id: null,
					task_id: null,
					content:
						"[Sample] Potential buyer. They're very interested in our solution but can't afford the price. Can we offer them a discount?",
					add_time: '2026-04-01 19:00:39',
					update_time: '2026-04-01 19:00:39',
					active_flag: true,
					pinned_to_deal_flag: false,
					pinned_to_person_flag: false,
					pinned_to_organization_flag: false,
					pinned_to_lead_flag: false,
					pinned_to_project_flag: false,
					pinned_to_task_flag: false,
					last_update_user_id: null,
					organization: {
						name: '[Sample] iTable',
					},
					person: {
						name: '[Sample] Otto Miller',
					},
					deal: {
						title: '[Sample] iTable',
					},
					lead: null,
					user: {
						email: 'kristiyan.nikolov@n8n.io',
						name: 'Kris',
						icon_url: null,
						is_you: true,
					},
				},
				{
					id: 2,
					user_id: 25455458,
					deal_id: 6,
					person_id: 3,
					org_id: null,
					lead_id: null,
					project_id: null,
					task_id: null,
					content:
						'[Sample] We need to add specific services, such as maintenance and support for this customer and to prepare a detailed offer.',
					add_time: '2026-04-01 19:00:39',
					update_time: '2026-04-01 19:00:39',
					active_flag: true,
					pinned_to_deal_flag: false,
					pinned_to_person_flag: false,
					pinned_to_organization_flag: false,
					pinned_to_lead_flag: false,
					pinned_to_project_flag: false,
					pinned_to_task_flag: false,
					last_update_user_id: null,
					organization: null,
					person: {
						name: '[Sample] Githa Watson',
					},
					deal: {
						title: '[Sample] Damone',
					},
					lead: null,
					user: {
						email: 'kristiyan.nikolov@n8n.io',
						name: 'Kris',
						icon_url: null,
						is_you: true,
					},
				},
			],
			additional_data: {
				pagination: {
					start: 0,
					limit: 2,
					more_items_in_collection: true,
					next_start: 2,
				},
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
