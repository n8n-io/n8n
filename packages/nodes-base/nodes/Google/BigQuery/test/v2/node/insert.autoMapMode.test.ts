import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

jest.mock('jsonwebtoken', () => ({
	sign: jest.fn().mockReturnValue('signature'),
}));

describe('Test Google BigQuery V2, insert auto map', () => {
	nock('https://oauth2.googleapis.com')
		.persist()
		.post(
			'/token',
			'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signature',
		)
		.reply(200, { access_token: 'token' });

	nock('https://bigquery.googleapis.com/bigquery')
		.get('/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/num_text')
		.reply(200, {
			schema: {
				fields: [
					{ name: 'id', type: 'INT' },
					{ name: 'test', type: 'STRING' },
				],
			},
		})
		.post(
			'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/num_text/insertAll',
			{
				rows: [
					{ json: { id: 1, test: '111' } },
					{ json: { id: 2, test: '222' } },
					{ json: { id: 3, test: '333' } },
				],
				traceId: 'trace_id',
			},
		)
		.reply(200, [
			{ kind: 'bigquery#tableDataInsertAllResponse' },
			{ kind: 'bigquery#tableDataInsertAllResponse' },
			{ kind: 'bigquery#tableDataInsertAllResponse' },
		]);

	new NodeTestHarness().setupTests({
		workflowFiles: ['insert.autoMapMode.workflow.json'],
	});
});
