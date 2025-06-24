import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import path from 'path';

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
			mistralAiNock
				.post('/v1/ocr', {
					model: 'mistral-ocr-latest',
					document: {
						type: 'document_url',
						document_url: 'https://example.com/document.pdf',
					},
				})
				.reply(200, documentResult);

			mistralAiNock
				.post('/v1/ocr', {
					model: 'mistral-ocr-latest',
					document: {
						type: 'image_url',
						image_url: 'https://example.com/image.jpg',
					},
				})
				.reply(200, imageResult);

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

			mistralAiNock
				.post('/v1/ocr', {
					model: 'mistral-ocr-latest',
					document: {
						type: 'image_url',
						image_url: 'data:image/jpeg;base64,abcdefgh',
					},
				})
				.reply(200, imageResult);
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
