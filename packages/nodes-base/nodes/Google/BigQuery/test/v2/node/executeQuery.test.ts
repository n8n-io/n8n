import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

jest.mock('jsonwebtoken', () => ({
	sign: jest.fn().mockReturnValue('signature'),
}));

describe('Test Google BigQuery V2, executeQuery', () => {
	nock('https://oauth2.googleapis.com')
		.persist()
		.post(
			'/token',
			'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signature',
		)
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
	});
});
