import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, lead => search with filters', () => {
	nock('https://api.pipedrive.com/api/v2')
		.get('/leads/search')
		.query({
			term: 'Promising Lead',
			exact_match: true,
			limit: 5,
			person_id: 10,
			include_fields: 'lead.was_seen',
		})
		.reply(200, {
			success: true,
			data: {
				items: [
					{
						result_score: 1,
						item: {
							id: '9ce77a10-2e16-11f1-91c1-d76c55e1594b',
							type: 'lead',
							title: 'Promising Lead',
							owner: {
								id: 25455458,
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
							phones: [],
							emails: [],
							custom_fields: [],
							notes: [],
							value: null,
							currency: 'USD',
							visible_to: 3,
							is_archived: false,
						},
					},
				],
			},
			additional_data: { next_cursor: null },
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['searchFilters.workflow.json'],
	});
});
