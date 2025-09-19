import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import okProcessing from './fixtures/okProcessing.json';
import okProcessed from './fixtures/okProcessed.json';
import complete from './fixtures/complete.json';

describe('MindeeV2', () => {
	const credentials = {
		mindeeApiKey: {
			apiKey: 'mindeeApiKey',
		},
	};

	const mindeeV2Nock = nock('https://api.mindee.net/v2');

	describe('EnqueueInference', () => {
		beforeAll(() => {
			// Document upload
			mindeeV2Nock.post('/inferences/enqueue', {}).reply(200, okProcessing);

			// Polling for 3 attempts, then fetching inference
			mindeeV2Nock
				.get('jobs/12345678-1234-1234-1234-123456789ABC')
				.times(3)
				.reply(200, okProcessing)
				.get('jobs/12345678-1234-1234-1234-123456789ABC')
				.reply(302, okProcessed, {
					Location: 'https://api.mindee.net/v2/inferences/12345678-1234-1234-1234-123456789ABC',
				});
			mindeeV2Nock.get('inferences/12345678-1234-1234-1234-123456789ABC').reply(200, complete);
		});
		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['workflow.json'],
		});
		afterAll(() => mindeeV2Nock.done());
	});
});
