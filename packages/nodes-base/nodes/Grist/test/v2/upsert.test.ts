import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { baseUrl, credentials } from '../credentials';
import { columnsRequest } from './columns';

describe('Grist Node', () => {
	describe('Create or update row (version 2)', () => {
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['upsert.workflow.json'],
			nock: {
				baseUrl,
				// The node without a value to match on makes no request.
				mocks: [
					columnsRequest(),
					{
						method: 'put',
						path: '/docs/doc1/tables/People/records?onmany=all',
						statusCode: 200,
						requestBody: {
							records: [
								{
									require: { Email: 'ada@example.com' },
									fields: { First: 'Ada', Sizes: ['L', 'M'] },
								},
							],
						},
						responseBody: { recordIds: [[3, 4]] },
					},
				],
			},
		});
	});
});
