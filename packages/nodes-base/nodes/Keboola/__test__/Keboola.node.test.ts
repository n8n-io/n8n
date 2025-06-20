import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import bucketFixture from './fixtures/bucket.json';
import dataFixture from './fixtures/data.json';
import fileFixture from './fixtures/file.json';
import jobFixture from './fixtures/job.json';
import manifestFixture from './fixtures/manifest.json';
import tableFixture from './fixtures/table.json';
import { KeboolaV1 } from '../V1/KeboolaV1.node';

describe('Keboola Node', () => {
	nock.disableNetConnect();

	describe('extract operation', () => {
		beforeAll(() => {
			nock('https://connection.keboola.com')
				.get('/v2/storage/tables/in.c-my.my-table')
				.reply(200, tableFixture)

				.post('/v2/storage/tables/in.c-my.my-table/export-async')
				.reply(200, jobFixture.inProgress)

				.get('/v2/storage/jobs/123')
				.reply(200, jobFixture.successWithFile)

				.get('/v2/storage/files/42')
				.query({ federationToken: '1' })
				.reply(200, fileFixture);

			nock('https://storage.googleapis.com')
				.get('/my-bucket/manifest.json')
				.query(true)
				.reply(200, manifestFixture)

				.get('/storage/v1/b/my-bucket/o/file1.csv')
				.query(true)
				.reply(200, dataFixture.csvContent);
		});

		afterAll(() => {
			nock.cleanAll();
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['extract.workflow.json'],
			nodeTypes: [KeboolaV1],
			credentials: {
				keboolaApiToken: {
					apiToken: 'mock-token',
					stack: 'https://connection.keboola.com',
				},
			},
		});
	});

	describe('upload operation', () => {
		beforeAll(() => {
			const apiUrl = 'https://connection.keboola.com';

			nock(apiUrl).get('/v2/storage/buckets/out.c-n8n').reply(404, { message: 'Bucket not found' });

			nock(apiUrl).post('/v2/storage/buckets').reply(200, bucketFixture);

			nock(apiUrl)
				.get('/v2/storage/tables/out.c-n8n.my-table')
				.reply(404, { message: 'Table not found' });

			nock('https://import.keboola.com')
				.post('/upload-file')
				.reply(200, { id: 42, name: 'upload.csv' });

			nock(apiUrl)
				.post('/v2/storage/buckets/out.c-n8n/tables-async')
				.reply(200, { id: '123', status: 'waiting' });

			nock(apiUrl)
				.get('/v2/storage/jobs/123')
				.times(2)
				.reply(200, { id: '123', status: 'success', results: {} });
		});

		afterAll(() => {
			nock.cleanAll();
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['upload.workflow.json'],
			nodeTypes: [KeboolaV1],
			credentials: {
				keboolaApiToken: {
					apiToken: 'mock-token',
					stack: 'https://connection.keboola.com',
				},
			},
			inputData: {
				Start: [{ json: { id: '1', name: 'Alice' } }],
			},
			outputData: {
				'Keboola: Upload Data': [{ json: { message: 'Uploaded 1 rows to out.c-n8n.my-table' } }],
			},
		});
	});
});
