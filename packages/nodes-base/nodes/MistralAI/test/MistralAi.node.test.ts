import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import path from 'path';

import batchResult from './fixtures/batch.json';
import documentResult from './fixtures/document.json';
import imageResult from './fixtures/image.json';

describe('Mistral AI Node', () => {
	const credentials = {
		mistralCloudApi: {
			apiKey: 'API-KEY',
		},
	};
	const mistralAiNock = nock('https://api.mistral.ai');

	describe('Document -> Extract Text', () => {
		beforeAll(() => {
			// Document by URL
			mistralAiNock
				.post('/v1/ocr', {
					model: 'mistral-ocr-latest',
					document: {
						type: 'document_url',
						document_url: 'https://example.com/document.pdf',
					},
				})
				.reply(200, documentResult);

			// Image by URL
			mistralAiNock
				.post('/v1/ocr', {
					model: 'mistral-ocr-latest',
					document: {
						type: 'image_url',
						image_url: 'https://example.com/image.jpg',
					},
				})
				.reply(200, imageResult);

			// Document from binary
			mistralAiNock
				.post('/v1/ocr', {
					model: 'mistral-ocr-latest',
					document: {
						type: 'document_url',
						document_name: 'sample.pdf',
						document_url: 'data:application/pdf;base64,abcdefgh',
					},
				})
				.reply(200, documentResult);

			// Image from binary
			mistralAiNock
				.post('/v1/ocr', {
					model: 'mistral-ocr-latest',
					document: {
						type: 'image_url',
						image_url: 'data:image/jpeg;base64,abcdefgh',
					},
				})
				.reply(200, imageResult);

			// Batching
			mistralAiNock
				.post(
					'/v1/files',
					(body: string) =>
						body.includes(
							JSON.stringify({
								document: {
									type: 'document_url',
									document_name: 'sample_1.pdf',
									document_url: 'data:application/pdf;base64,abcdefgh',
								},
							}),
						) &&
						body.includes(
							JSON.stringify({
								document: {
									type: 'document_url',
									document_name: 'sample_2.pdf',
									document_url: 'data:application/pdf;base64,aaaaaaaa',
								},
							}),
						),
				)
				.reply(200, { id: 'input-file-1' });
			mistralAiNock
				.post('/v1/files', (body: string) =>
					body.includes(
						JSON.stringify({
							document: {
								type: 'document_url',
								document_name: 'sample_3.pdf',
								document_url: 'data:application/pdf;base64,aaaabbbb',
							},
						}),
					),
				)
				.reply(200, { id: 'input-file-2' });
			mistralAiNock
				.post('/v1/batch/jobs', {
					model: 'mistral-ocr-latest',
					input_files: ['input-file-1'],
					endpoint: '/v1/ocr',
				})
				.reply(200, { id: 'job-1' });
			mistralAiNock
				.post('/v1/batch/jobs', {
					model: 'mistral-ocr-latest',
					input_files: ['input-file-2'],
					endpoint: '/v1/ocr',
				})
				.reply(200, { id: 'job-2' });
			mistralAiNock.get('/v1/batch/jobs/job-1').reply(200, {
				status: 'SUCCESS',
				output_file: 'output-file-1',
			});
			mistralAiNock.get('/v1/batch/jobs/job-2').reply(200, {
				status: 'SUCCESS',
				output_file: 'output-file-2',
			});
			mistralAiNock.get('/v1/files/output-file-1/content').reply(
				200,
				batchResult
					.slice(0, 2)
					.map((item) => JSON.stringify(item))
					.join('\n'),
			);
			mistralAiNock.get('/v1/files/output-file-2/content').reply(200, batchResult[2]);

			// Batching with delete files
			mistralAiNock
				.post(
					'/v1/files',
					(body: string) =>
						body.includes(
							JSON.stringify({
								document: {
									type: 'document_url',
									document_name: 'sample_1.pdf',
									document_url: 'data:application/pdf;base64,abcdefgh',
								},
							}),
						) &&
						body.includes(
							JSON.stringify({
								document: {
									type: 'document_url',
									document_name: 'sample_2.pdf',
									document_url: 'data:application/pdf;base64,aaaaaaaa',
								},
							}),
						),
				)
				.reply(200, { id: 'input-file-1' });
			mistralAiNock
				.post('/v1/files', (body: string) =>
					body.includes(
						JSON.stringify({
							document: {
								type: 'document_url',
								document_name: 'sample_3.pdf',
								document_url: 'data:application/pdf;base64,aaaabbbb',
							},
						}),
					),
				)
				.reply(200, { id: 'input-file-2' });
			mistralAiNock
				.post('/v1/batch/jobs', {
					model: 'mistral-ocr-latest',
					input_files: ['input-file-1'],
					endpoint: '/v1/ocr',
				})
				.reply(200, { id: 'job-1' });
			mistralAiNock
				.post('/v1/batch/jobs', {
					model: 'mistral-ocr-latest',
					input_files: ['input-file-2'],
					endpoint: '/v1/ocr',
				})
				.reply(200, { id: 'job-2' });
			mistralAiNock.get('/v1/batch/jobs/job-1').reply(200, {
				status: 'SUCCESS',
				output_file: 'output-file-1',
			});
			mistralAiNock.get('/v1/batch/jobs/job-2').reply(200, {
				status: 'SUCCESS',
				output_file: 'output-file-2',
			});
			mistralAiNock.delete('/v1/files/input-file-1').reply(200);
			mistralAiNock.delete('/v1/files/input-file-2').reply(200);
			mistralAiNock.get('/v1/files/output-file-1/content').reply(
				200,
				batchResult
					.slice(0, 2)
					.map((item) => JSON.stringify(item))
					.join('\n'),
			);
			mistralAiNock.get('/v1/files/output-file-2/content').reply(200, batchResult[2]);
			mistralAiNock.delete('/v1/files/output-file-1').reply(200);
			mistralAiNock.delete('/v1/files/output-file-2').reply(200);
		});

		afterAll(() => mistralAiNock.done());

		new NodeTestHarness({
			additionalPackagePaths: [path.join(__dirname, '../../../../@n8n/nodes-langchain')],
		}).setupTests({
			credentials,
			workflowFiles: ['workflow.json'],
		});
	});
});
