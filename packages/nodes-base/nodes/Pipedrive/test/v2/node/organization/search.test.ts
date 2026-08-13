import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, organization => search', () => {
	mockFieldsApi('organization');

	nock('https://api.pipedrive.com/v1')
		.get('/organizations/search')
		.query({ term: 'Test Org', exact_match: false, limit: 100 })
		.reply(200, {
			success: true,
			data: {
				items: [
					{
						result_score: 0.35513002,
						item: {
							id: 7,
							type: 'organization',
							name: 'Test Org LLC',
							address: null,
							visible_to: 3,
							owner: {
								id: 25455458,
							},
							custom_fields: [],
							notes: [],
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
