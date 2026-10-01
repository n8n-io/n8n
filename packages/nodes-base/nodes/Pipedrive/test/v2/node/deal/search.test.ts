import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, deal => search', () => {
	mockFieldsApi('deal');

	nock('https://api.pipedrive.com/v1')
		.get('/deals/search')
		.query({ term: 'Test Deal', exact_match: true, limit: 2 })
		.reply(200, {
			success: true,
			data: {
				items: [
					{
						result_score: 1.28568,
						item: {
							id: 8,
							type: 'deal',
							title: 'Test Deal',
							value: 199.98,
							currency: 'USD',
							status: 'open',
							visible_to: 3,
							owner: {
								id: 25455458,
							},
							stage: {
								id: 6,
								name: 'Qualified',
							},
							pipeline: {
								id: 2,
							},
							person: {
								id: 10,
								name: 'John Test',
							},
							organization: {
								id: 7,
								name: 'Test Org LLC',
								address: null,
							},
							custom_fields: [],
							notes: ['This is a test note'],
							is_archived: false,
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
