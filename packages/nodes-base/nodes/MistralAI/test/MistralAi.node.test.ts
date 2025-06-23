import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import path from 'path';

import documentByUrlResult from './fixtures/documentByUrl.json';

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
				.reply(200, documentByUrlResult);
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
