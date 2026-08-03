import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, organization => getAll', () => {
	mockFieldsApi('organization');

	nock('https://api.pipedrive.com/api/v2')
		.get('/organizations')
		.query({ limit: 2 })
		.reply(200, {
			success: true,
			data: [
				{
					id: 1,
					name: '[Sample] Phyllis & Cie',
					add_time: '2026-04-01T19:00:37Z',
					update_time: '2026-04-01T19:00:39Z',
					visible_to: 3,
					custom_fields: {
						a033342fdeb029669a0652a64d1ab8150e48d627: null,
					},
					owner_id: 25455458,
					label_ids: [],
					website: null,
					linkedin: null,
					industry: null,
					annual_revenue: null,
					employee_count: null,
					is_deleted: false,
					address: null,
				},
				{
					id: 2,
					name: '[Sample] Lorean',
					add_time: '2026-04-01T19:00:37Z',
					update_time: '2026-04-01T19:00:39Z',
					visible_to: 3,
					custom_fields: {
						a033342fdeb029669a0652a64d1ab8150e48d627: null,
					},
					owner_id: 25455458,
					label_ids: [],
					website: null,
					linkedin: null,
					industry: null,
					annual_revenue: null,
					employee_count: null,
					is_deleted: false,
					address: null,
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
