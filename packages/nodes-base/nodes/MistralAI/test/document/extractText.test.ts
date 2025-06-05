import { initBinaryDataService, testWorkflows } from '@test/nodes/Helpers';
import nock from 'nock';

beforeAll(async () => {
	await initBinaryDataService();

	nock('https://api.mistral.ai')
		.get('/v1/models')
		.reply(200, {
			models: ['mistral-ocr-2505-completion'],
		});

	nock('https://api.mistral.ai')
		.post('/v1/ocr')
		.reply(200, {
			pages: [
				{
					index: 0,
					markdown: '# LÉ́ON 01. Bonjour !',
					images: [],
					dimensions: {
						dpi: 200,
						height: 2339,
						width: 1654,
					},
				},
				{
					index: 1,
					markdown: '# Test # !',
					images: [],
					dimensions: {
						dpi: 200,
						height: 2339,
						width: 1654,
					},
				},
			],
			model: 'mistral-ocr-2505-completion',
			usage_info: {
				pages_processed: 2,
				doc_size_bytes: 123456,
			},
			extractedText: '# LÉ́ON 01. Bonjour ! Test.',
			pageCount: 2,
		});
});

describe('MistralAI OCR Node Test', () => {
	testWorkflows(['nodes/MistralAI/test/document/extractText.workflow.json']);
});
