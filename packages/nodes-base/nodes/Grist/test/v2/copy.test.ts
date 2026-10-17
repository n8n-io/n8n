import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { baseUrl, credentials } from '../credentials';
import { columnsRequest } from './columns';

describe('Grist Node', () => {
	describe('Copy rows between documents (version 2)', () => {
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['copy.workflow.json'],
			nock: {
				baseUrl,
				mocks: [
					{
						method: 'get',
						path: '/docs/doc1/tables/People/records',
						statusCode: 200,
						responseBody: {
							records: [
								{
									id: 1,
									fields: {
										First: 'Ada',
										Email: 'ada@example.com',
										Sizes: ['L', 'L', 'M', 'XL'],
										Letters: '["C","B","A"]',
										FullName: 'Ada <ada@example.com>',
									},
								},
								{
									id: 2,
									fields: {
										First: 'Alan',
										Email: 'alan@example.com',
										Sizes: null,
										Letters: '',
										FullName: 'Alan <alan@example.com>',
									},
								},
							],
						},
					},
					columnsRequest('doc1'),
					columnsRequest('doc2'),
					// Automatic mapping leaves out `id` and the formula column, and encodes the list again.
					{
						method: 'post',
						path: '/docs/doc2/tables/People/records',
						statusCode: 200,
						requestBody: {
							records: [
								{
									fields: {
										First: 'Ada',
										Email: 'ada@example.com',
										Sizes: ['L', 'L', 'M', 'XL'],
										Letters: '["C","B","A"]',
									},
								},
							],
						},
						responseBody: { records: [{ id: 7 }] },
					},
					{
						method: 'post',
						path: '/docs/doc2/tables/People/records',
						statusCode: 200,
						requestBody: {
							records: [
								{
									fields: { First: 'Alan', Email: 'alan@example.com', Sizes: null, Letters: '' },
								},
							],
						},
						responseBody: { records: [{ id: 8 }] },
					},
				],
			},
		});
	});
});
