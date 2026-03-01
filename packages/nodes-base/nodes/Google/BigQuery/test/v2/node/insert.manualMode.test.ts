import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

jest.mock('jsonwebtoken', () => ({
	sign: jest.fn().mockReturnValue('signature'),
}));

describe('Test Google BigQuery V2, insert define manually', () => {
	nock('https://oauth2.googleapis.com')
		.persist()
		.post(
			'/token',
			'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signature',
		)
		.reply(200, { access_token: 'token' });

	nock('https://bigquery.googleapis.com/bigquery')
		.get('/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/test_json')
		.reply(200, {
			schema: {
				fields: [
					{ name: 'json', type: 'JSON' },
					{ name: 'name with space', type: 'STRING' },
					{ name: 'active', type: 'BOOLEAN' },
				],
			},
		})
		.post(
			'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/test_json/insertAll',
			{
				rows: [{ json: { active: 'true', json: '{"test": 1}', 'name with space': 'some name' } }],
				traceId: 'trace_id',
			},
		)
		.reply(200, [{ kind: 'bigquery#tableDataInsertAllResponse' }]);

	new NodeTestHarness().setupTests({
		workflowFiles: ['insert.manualMode.workflow.json'],
	});
});
