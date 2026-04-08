import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, product => get', () => {
	mockFieldsApi('product');

	nock('https://api.pipedrive.com/api/v2')
		.get('/products/3')
		.reply(200, {
			success: true,
			data: {
				id: 3,
				name: 'Test Widget',
				tax: 20,
				add_time: '2026-04-01T22:03:26Z',
				update_time: '2026-04-01T22:03:26Z',
				description: '',
				code: 'TW-001',
				unit: 'piece',
				owner_id: 25455458,
				category: null,
				is_deleted: false,
				is_linkable: true,
				prices: [
					{
						product_id: 3,
						price: 0,
						currency: 'BGN',
						cost: 0,
						direct_cost: 0,
						notes: '',
					},
				],
				custom_fields: {
					'82d101f4704841048e421cc72ddfef37122e8212': null,
				},
				visible_to: 3,
				billing_frequency: 'one-time',
				billing_frequency_cycles: null,
			},
			additional_data: null,
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['get.workflow.json'],
	});
});
