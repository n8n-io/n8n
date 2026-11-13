import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { googleApiCredentials } from '../../v2/node/credentials.fixture';

describe('Test Google BigQuery V1, record', () => {
	nock('https://oauth2.googleapis.com')
		.persist()
		.post('/token')
		.reply(200, { access_token: 'token' });

	const tablePath = '/v2/projects/test-project/datasets/sales_dataset/tables/orders';

	const bigQuery = nock('https://bigquery.googleapis.com/bigquery')
		.post(`${tablePath}/insertAll`, { traceId: 'trace_id', rows: [{ json: {} }] })
		.reply(200, { kind: 'bigquery#tableDataInsertAllResponse' })
		.get(tablePath)
		.reply(200, { schema: { fields: [{ name: 'id', type: 'STRING' }] } })
		.get(`${tablePath}/data`)
		.query({ maxResults: 2 })
		.reply(200, { rows: [{ f: [{ v: '1' }] }, { f: [{ v: '2' }] }] })
		.get(`${tablePath}/data`)
		.query({ maxResults: 100 })
		.reply(200, { rows: [{ f: [{ v: '1' }] }], pageToken: 'page_2' })
		.get(`${tablePath}/data`)
		.query({ maxResults: 100, pageToken: 'page_2' })
		.reply(200, { rows: [{ f: [{ v: '2' }] }] });

	new NodeTestHarness().setupTests({
		workflowFiles: ['record.workflow.json'],
		credentials: { googleApi: googleApiCredentials },
		customAssertions: () => expect(bigQuery.isDone()).toBe(true),
	});
});
