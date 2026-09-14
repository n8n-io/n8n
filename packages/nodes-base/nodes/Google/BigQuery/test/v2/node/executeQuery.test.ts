import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { googleApiCredentials } from './credentials.fixture';

describe('Test Google BigQuery V2, executeQuery', () => {
	// The harness loads the node from dist via require(), so the real jsonwebtoken
	// signing path runs (a real RSA key is supplied via credentials). The signed
	// assertion is non-deterministic, so match any POST to the token endpoint.
	nock('https://oauth2.googleapis.com')
		.persist()
		.post('/token')
		.reply(200, { access_token: 'token' });

	nock('https://bigquery.googleapis.com/bigquery')
		.post('/v2/projects/test-project/jobs', {
			configuration: {
				query: {
					query: 'SELECT * FROM bigquery_node_dev_test_dataset.test_json;',
					useLegacySql: false,
				},
			},
		})
		.reply(200, {
			jobReference: {
				jobId: 'job_123',
			},
			status: {
				state: 'DONE',
			},
		})
		.get('/v2/projects/test-project/queries/job_123')
		.reply(200)
		.get('/v2/projects/test-project/queries/job_123?maxResults=1000&timeoutMs=10000')
		.reply(200, { rows: [], schema: {} });

	new NodeTestHarness().setupTests({
		workflowFiles: ['executeQuery.workflow.json'],
		credentials: { googleApi: googleApiCredentials },
	});
});
