import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, dealProduct => getAll', () => {
	nock('https://api.pipedrive.com/api/v2')
		.get('/deals/8/products')
		.query({ limit: 2 })
		.reply(200, {
			success: true,
			data: [
				{
					id: 2,
					sum: 199.98,
					tax: 0,
					deal_id: 8,
					name: 'Test Widget',
					product_id: 3,
					product_variation_id: null,
					order_nr: 0,
					add_time: '2026-04-01T22:03:27Z',
					update_time: '2026-04-01T22:03:27Z',
					comments: '',
					currency: 'USD',
					discount: 0,
					quantity: 2,
					item_price: 99.99,
					tax_method: 'inclusive',
					discount_type: 'percentage',
					is_enabled: true,
					billing_frequency: 'one-time',
					billing_frequency_cycles: null,
					billing_start_date: null,
				},
			],
			additional_data: {
				next_cursor: null,
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
