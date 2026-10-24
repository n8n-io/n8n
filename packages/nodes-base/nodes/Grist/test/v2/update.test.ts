import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { baseUrl, credentials } from '../credentials';
import { columnsRequest } from './columns';

describe('Grist Node', () => {
	describe('Update row (version 2)', () => {
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['update.workflow.json'],
			nock: {
				baseUrl,
				mocks: [
					columnsRequest(),
					{
						method: 'put',
						path: '/docs/doc1/tables/People/records?noadd=true',
						statusCode: 200,
						// The formula column is left out, and the list gets the Grist list marker.
						requestBody: { records: [{ require: { id: 1 }, fields: { Sizes: ['L', 'S'] } }] },
						responseBody: { recordIds: [[1]] },
					},
					columnsRequest(),
					// Grist answers a match on no row with success and an empty list of IDs.
					{
						method: 'put',
						path: '/docs/doc1/tables/People/records?noadd=true',
						statusCode: 200,
						requestBody: {
							records: [{ require: { Email: 'nobody@example.com' }, fields: { First: 'Nobody' } }],
						},
						responseBody: { recordIds: [[]] },
					},
				],
			},
		});
	});
});
