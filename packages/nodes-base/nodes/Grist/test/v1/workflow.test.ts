import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { baseUrl, credentials } from '../credentials';

describe('Grist Node', () => {
	// A workflow saved with version 1 stores plain-string IDs and the inputs that version 2 replaces.
	describe('Version 1 workflow', () => {
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['workflow.json'],
			nock: {
				baseUrl,
				// Version 1 reads no column schema, and returns list cells as Grist stores them.
				mocks: [
					{
						method: 'get',
						path: '/docs/doc1/tables/People/records',
						statusCode: 200,
						responseBody: {
							records: [{ id: 1, fields: { First: 'Ada', Sizes: ['L', 'L', 'M', 'XL'] } }],
						},
					},
					{
						method: 'put',
						path: '/docs/doc1/tables/People/records',
						statusCode: 200,
						requestBody: {
							records: [{ require: { Email: 'ada@example.com' }, fields: { First: 'Countess' } }],
						},
						responseBody: { recordIds: [[1]] },
					},
				],
			},
		});
	});
});
