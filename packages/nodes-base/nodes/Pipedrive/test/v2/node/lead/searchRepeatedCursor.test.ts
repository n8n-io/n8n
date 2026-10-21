import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, lead => search stops on a repeated cursor', () => {
	nock('https://api.pipedrive.com/api/v2')
		.get('/leads/search')
		.query({ term: 'Promising', exact_match: false, limit: 100 })
		.reply(200, {
			success: true,
			data: {
				items: [
					{
						result_score: 0.55,
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
			additional_data: { next_cursor: 'page-2' },
		})
		.get('/leads/search')
		.query({ term: 'Promising', exact_match: false, limit: 100, cursor: 'page-2' })
		.reply(200, {
			success: true,
			data: {
				items: [
					{
						result_score: 0.41,
						item: {
							id: '1f0b2c3d-2e16-11f1-91c1-d76c55e1594b',
							type: 'lead',
							title: 'Promising Lead 2',
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
			additional_data: { next_cursor: 'page-2' },
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['searchRepeatedCursor.workflow.json'],
	});
});
