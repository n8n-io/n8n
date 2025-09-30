import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import complete from './fixtures/complete.json';
import models from './fixtures/models.json';
import okProcessed from './fixtures/okProcessed.json';
import okProcessing from './fixtures/okProcessing.json';
import path from 'path';
import { readFileSync } from 'node:fs';

describe('MindeeV2', () => {
	const credentials = {
		mindeeApiKey: {
			apiKey: 'mindeeApiKey',
		},
	};

	const mindeeV2Nock = nock('https://api-v2.mindee.net/v2');
	const fileNock = nock('https://example.com');
	const filePath = path.join(__dirname, 'fixtures/invoice.pdf');
	describe('EnqueueInference', () => {
		beforeAll(() => {
			// File retrieval nock
			const bytes = readFileSync(filePath);
			fileNock.get('/invoice.pdf').reply(200, bytes, {
				'Content-Type': 'application/pdf',
				'Content-Length': bytes.length.toString(),
			});

			// Models retrieval
			mindeeV2Nock.get('/search/models').optionally().reply(200, models);

			// Document upload
			mindeeV2Nock.post('/inferences/enqueue').reply(200, okProcessing);

			// Polling for 3 attempts, then fetching inference
			mindeeV2Nock
				.get('/jobs/12345678-1234-1234-1234-123456789ABC')
				.times(3)
				.reply(200, okProcessing)
				.get('/jobs/12345678-1234-1234-1234-123456789ABC')
				.reply(302, okProcessed, {
					Location: 'https://api-v2.mindee.net/v2/inferences/12345678-1234-1234-1234-123456789ABC',
				});
			mindeeV2Nock.get('/inferences/12345678-1234-1234-1234-123456789ABC').reply(200, complete);
		});
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['workflow.json'],
		});

		afterAll(() => {
			fileNock.done();
			mindeeV2Nock.done();
		});
	});
});
