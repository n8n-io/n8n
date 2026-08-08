import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, organization => create', () => {
	mockFieldsApi('organization');

	nock('https://api.pipedrive.com/api/v2')
		.post('/organizations', {
			name: 'Test Org LLC',
		})
		.reply(200, {
			success: true,
			data: {
				id: 7,
				name: 'Test Org LLC',
				add_time: '2026-04-01T22:03:26Z',
				update_time: null,
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
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.workflow.json'],
	});
});
