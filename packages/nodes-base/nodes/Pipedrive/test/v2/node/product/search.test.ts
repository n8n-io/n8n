import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, product => search', () => {
	mockFieldsApi('product');

	nock('https://api.pipedrive.com/v1')
		.get('/products/search')
		.query({ term: 'Test Widget', exact_match: false, limit: 100 })
		.reply(200, {
			success: true,
			data: {
				items: [
					{
						result_score: 0.00136,
						item: {
							id: 3,
							type: 'product',
							name: 'Test Widget',
							code: 'TW-001',
							tax: 20,
							visible_to: 3,
							owner: {
								id: 25455458,
							},
							custom_fields: [],
						},
					},
				],
			},
			additional_data: {
				pagination: {
					start: 0,
					limit: 100,
					more_items_in_collection: false,
				},
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['search.workflow.json'],
	});
});
