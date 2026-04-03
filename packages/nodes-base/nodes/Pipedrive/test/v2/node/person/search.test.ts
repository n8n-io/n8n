import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, person => search', () => {
	mockFieldsApi('person');

	nock('https://api.pipedrive.com/v1')
		.get('/persons/search')
		.query({ term: 'John', exact_match: false, limit: 100 })
		.reply(200, {
			success: true,
			data: {
				items: [
					{
						result_score: 0.489265,
						item: {
							id: 10,
							type: 'person',
							name: 'John Test',
							phones: ['555-0100'],
							emails: ['john@test.com'],
							primary_email: 'john@test.com',
							visible_to: 3,
							owner: {
								id: 25455458,
							},
							organization: {
								id: 7,
								name: 'Test Org LLC',
								address: null,
							},
							custom_fields: [],
							notes: [],
							update_time: '2026-04-01 22:03:28',
						},
					},
					{
						result_score: 0.489265,
						item: {
							id: 9,
							type: 'person',
							name: 'John Updated',
							phones: ['555-0100'],
							emails: ['john@test.com'],
							primary_email: null,
							visible_to: 3,
							owner: {
								id: 25455458,
							},
							organization: null,
							custom_fields: [],
							notes: [],
							update_time: null,
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
